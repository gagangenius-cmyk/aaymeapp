import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';
import { AppText } from './AppText';
import { Button } from './kit';
import { Logo } from './Logo';

const KEY = 'applock';
const GRACE_MS = 30_000; // quick app switches do not ask again

export const appLock = {
  enabled: async () => Platform.OS !== 'web' && (await SecureStore.getItemAsync(KEY)) === '1',
  available: async () => Platform.OS !== 'web' && (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync()),
  /** Turning it on proves you can unlock first, so you cannot lock yourself out. */
  async enable() {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on app lock' });
    if (r.success) await SecureStore.setItemAsync(KEY, '1');
    return r.success;
  },
  disable: () => SecureStore.deleteItemAsync(KEY),
};

/** Covers the app with the logo until the person unlocks (fingerprint / face / device PIN) after the app was in the background. */
export function AppLockGate() {
  const { session } = useAuth();
  const [locked, setLocked] = useState(false);
  const left = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock AAYME', fallbackLabel: 'Use PIN' });
    if (r.success) setLocked(false);
  }, []);

  useEffect(() => {
    if (!session) { setLocked(false); return; }
    // lock on cold start too
    appLock.enabled().then((on) => { if (on) { setLocked(true); unlock(); } });
    const sub = AppState.addEventListener('change', async (s) => {
      if (s === 'background' || s === 'inactive') { left.current ??= Date.now(); return; }
      const away = left.current ? Date.now() - left.current : 0; left.current = null;
      if (s === 'active' && away > GRACE_MS && (await appLock.enabled())) { setLocked(true); unlock(); }
    });
    return () => sub.remove();
  }, [session?.id, unlock]);

  if (!locked) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(250)} style={{ position: 'absolute', inset: 0, zIndex: 999, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 }}>
      <Logo size={96} />
      <View style={{ gap: 6, alignItems: 'center' }}><AppText style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>AAYME is locked</AppText><AppText style={{ color: colors.muted }}>Unlock to continue</AppText></View>
      <Button title="Unlock" onPress={unlock} />
    </Animated.View>
  );
}
