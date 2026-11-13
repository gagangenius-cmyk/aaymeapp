import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API, API_URL } from './config';

export type Role = 'admin' | 'company_employee' | 'distributor' | 'employee' | 'retailer' | 'customer';
export interface Session { id: number; role: Role; access_token: string; refresh_token: string }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) { super(message); }
}

// SecureStore is native-only; fall back to localStorage on web.
const store = {
  get: async (k: string) => (Platform.OS === 'web' ? localStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) => (Platform.OS === 'web' ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v)),
  del: async (k: string) => (Platform.OS === 'web' ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

let session: Session | null = null;
let onLogout: () => void = () => {};
export const setLogoutHandler = (fn: () => void) => { onLogout = fn; };
export const getSession = () => session;

export async function loadSession() {
  const raw = await store.get('session');
  session = raw ? JSON.parse(raw) : null;
  return session;
}
export async function saveSession(s: Session | null) {
  session = s;
  if (s) await store.set('session', JSON.stringify(s)); else await store.del('session');
}

const uuid = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// One refresh at a time: refresh tokens rotate, so two parallel refreshes would trip the backend's reuse detection.
let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  if (!session) return false;
  refreshing ??= (async () => {
    try {
      const r = await timedFetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session!.refresh_token }) });
      if (!r.ok) return false;
      const t = await r.json();
      await saveSession({ ...session!, access_token: t.access_token, refresh_token: t.refresh_token });
      return true;
    } catch (e) {
      // offline / timeout is not a rejection: surface it, keep the session, let the user retry
      if (e instanceof ApiError) throw e;
      return false;
    } finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}

interface Opts { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; idempotent?: string | boolean; auth?: boolean }

const TIMEOUT_MS = 30_000; // serverless cold start + schema check can take a few seconds

/** fetch with a deadline, and a readable error when the network is down (instead of "Network request failed"). */
async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  catch (e: any) {
    if (e?.name === 'AbortError') throw new ApiError(0, 'TIMEOUT', 'The server took too long to answer. Check your connection and try again.');
    throw new ApiError(0, 'NETWORK', 'No connection to the server. Check your internet and try again.');
  } finally { clearTimeout(t); }
}

export async function api<T = any>(path: string, o: Opts = {}): Promise<T> {
  const qs = o.query ? '?' + Object.entries(o.query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&') : '';
  const send = () => timedFetch(`${API}${path}${qs}`, {
    method: o.method ?? (o.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(o.auth !== false && session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(o.idempotent ? { 'Idempotency-Key': typeof o.idempotent === 'string' ? o.idempotent : uuid() } : {}),
    },
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  let res = await send();
  if (res.status === 401 && o.auth !== false && session && (await refresh())) res = await send();
  if (res.status === 401 && o.auth !== false && session) { await saveSession(null); onLogout(); }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details);
  return data as T;
}

/** A stable key per form submission: reuse it when the user retries, so a double tap can never create two records. */
export const newKey = uuid;

/** Absolute URL for a server-relative path such as an image ('/api/v1/media/<key>'). */
export const mediaUrl = (p?: string | null) => (p ? (p.startsWith('http') ? p : `${API_URL}${p}`) : null);

/** POST a local file as the raw request body (used for product photos: the API takes the image bytes directly). */
/** The picker can report 'image/jpg', 'image/heic' or nothing at all; the server reads the real format from the bytes, so only the header needs to be one it routes. */
export const imageMime = (m?: string | null) => (m === 'image/png' || m === 'image/webp' ? m : 'image/jpeg');

export async function uploadRaw<T = any>(path: string, uri: string, mime: string): Promise<T> {
  const blob = await (await fetch(uri)).blob();
  // hosted API functions refuse bodies above ~4.5 MB
  if (blob.size > 4_000_000) throw new ApiError(413, 'TOO_LARGE', `That file is ${(blob.size / 1_000_000).toFixed(1)} MB. The limit is 4 MB: choose a smaller file or a lower quality photo.`);
  const send = () => timedFetch(`${API}${path}`, { method: 'POST', headers: { 'Content-Type': mime, ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: blob });
  let res = await send();
  if (res.status === 401 && session && (await refresh())) res = await send();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'ERROR', data?.error?.message ?? `Upload failed (${res.status})`, data?.error?.details);
  return data as T;
}
