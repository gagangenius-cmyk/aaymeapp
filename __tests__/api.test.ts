import { api, ApiError, loadSession, saveSession } from '../src/lib/api';

jest.mock('expo-secure-store', () => {
  const m: Record<string, string> = {};
  return { getItemAsync: async (k: string) => m[k] ?? null, setItemAsync: async (k: string, v: string) => { m[k] = v; }, deleteItemAsync: async (k: string) => { delete m[k]; } };
});

const json = (status: number, body: unknown) => ({ status, ok: status < 400, json: async () => body }) as any;
const session = { id: 1, role: 'retailer' as const, access_token: 'a1', refresh_token: 'r1' };

beforeEach(async () => { (globalThis as any).fetch = jest.fn(); await saveSession(null); });

it('sends the bearer token and an idempotency key on writes', async () => {
  await saveSession(session);
  (fetch as jest.Mock).mockResolvedValueOnce(json(201, { ok: true }));
  await api('/orders', { body: { x: 1 }, idempotent: 'key-1' });
  const [, init] = (fetch as jest.Mock).mock.calls[0];
  expect(init.headers.Authorization).toBe('Bearer a1');
  expect(init.headers['Idempotency-Key']).toBe('key-1');
  expect(init.method).toBe('POST');
});

it('turns the server error envelope into an ApiError', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(json(409, { error: { code: 'OUT_OF_STOCK', message: 'Insufficient stock', details: { available: 2 } } }));
  await expect(api('/orders', { body: {}, auth: false })).rejects.toMatchObject({ status: 409, code: 'OUT_OF_STOCK', message: 'Insufficient stock', details: { available: 2 } });
});

it('refreshes an expired token once and retries the request', async () => {
  await saveSession(session);
  (fetch as jest.Mock)
    .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'expired' } }))
    .mockResolvedValueOnce(json(200, { access_token: 'a2', refresh_token: 'r2' }))
    .mockResolvedValueOnce(json(200, { fine: true }));
  await expect(api('/orders')).resolves.toEqual({ fine: true });
  expect((fetch as jest.Mock).mock.calls[2][1].headers.Authorization).toBe('Bearer a2');
  expect((await loadSession())?.refresh_token).toBe('r2');
});

it('signs out when the refresh is refused', async () => {
  await saveSession(session);
  (fetch as jest.Mock).mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } }));
  await expect(api('/orders')).rejects.toBeInstanceOf(ApiError);
  expect(await loadSession()).toBeNull();
});

it('reports a dead network without signing the user out', async () => {
  await saveSession(session);
  (fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
  await expect(api('/orders')).rejects.toMatchObject({ code: 'NETWORK' });
  expect((await loadSession())?.access_token).toBe('a1');
});
