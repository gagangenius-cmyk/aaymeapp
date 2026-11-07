import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { startSocket, stopSocket } from './socket';
import { registerForPush, unregisterPush, routeForNotification } from './push';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { api, loadSession, saveSession, setLogoutHandler, Role, Session } from './api';

interface AuthCtx { ready: boolean; session: Session | null; role: Role | null; signIn: (s: Session) => Promise<void>; signOut: () => Promise<void> }
const Ctx = createContext<AuthCtx>(null!);
/** True once the person is signed in AND standing on a screen that belongs to their role. Data hooks stay idle until then, so a protected screen never fires requests while signed out or in the wrong area. */
export const AccessContext = createContext<boolean>(true);
export const useAccess = () => useContext(AccessContext);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setLogoutHandler(() => setSession(null));
    loadSession().then(setSession).finally(() => setReady(true));
  }, []);

  const qc = useQueryClient();
  // live chat connection for as long as someone is signed in
  useEffect(() => { if (session) startSocket(qc); else stopSocket(); return stopSocket; }, [session?.id, qc]);
  // register for push whenever someone is signed in; open the right screen when a notification is tapped
  useEffect(() => { if (session) registerForPush(); }, [session?.id]);
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => { const to = routeForNotification(r.notification.request.content.data); if (to) router.push(to as any); });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (s: Session) => { await saveSession(s); setSession(s); }, []);
  const signOut = useCallback(async () => {
    await unregisterPush();
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* signing out locally matters most */ }
    await saveSession(null); setSession(null);
  }, []);

  return <Ctx.Provider value={{ ready, session, role: session?.role ?? null, signIn, signOut }}>{children}</Ctx.Provider>;
}

/** Where each role lands. */
export const homeFor = (r: Role) => ({ admin: '/(admin)', company_employee: '/(staff)', distributor: '/(distributor)', employee: '/(employee)', retailer: '/(retailer)' }[r]);
