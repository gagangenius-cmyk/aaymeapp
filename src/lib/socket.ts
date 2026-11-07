import { io, Socket } from 'socket.io-client';
import { QueryClient } from '@tanstack/react-query';
import { API_URL } from './config';
import { getSession } from './api';

let socket: Socket | null = null;
let connected = false;
export const isSocketConnected = () => connected;

/**
 * Live chat. Opens one connection per signed-in user, authenticated with the current access token. The server closes it when
 * that token expires, so each reconnect reads the latest token. Events just refresh the cached queries: screens stay simple.
 */
export function startSocket(qc: QueryClient) {
  stopSocket();
  if (process.env.EXPO_PUBLIC_REALTIME === 'off') return; // set to off when the API runs on a serverless host
  socket = io(API_URL, {
    transports: ['websocket'], reconnection: true, reconnectionAttempts: 4, reconnectionDelay: 1500, reconnectionDelayMax: 15_000, timeout: 8000,
    auth: (cb) => cb({ token: getSession()?.access_token ?? '' }),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['/chat/messages'] });
    qc.invalidateQueries({ queryKey: ['/chat/conversations'] });
  };
  // after the last failed attempt the app simply keeps polling (chat still works, just a few seconds slower)
  socket.io.on('reconnect_failed', () => { connected = false; });
  socket.on('connect', () => { connected = true; refresh(); });
  socket.on('disconnect', () => { connected = false; });
  socket.on('message:new', refresh);
  socket.on('message:read', () => qc.invalidateQueries({ queryKey: ['/chat/messages'] }));
}

export function stopSocket() {
  socket?.removeAllListeners(); socket?.disconnect(); socket = null; connected = false;
}
