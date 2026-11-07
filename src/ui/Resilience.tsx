import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import { AppText } from './AppText';
import { Button } from './kit';
import { Logo } from './Logo';

/** Tells react-query when the device is offline (it pauses requests and resumes them on reconnect) and shows a banner. */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected && s.isInternetReachable !== false)));
    return NetInfo.addEventListener((s) => setOffline(!(s.isConnected && s.isInternetReachable !== false)));
  }, []);
  if (!offline) return null;
  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOutDown} pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 92, zIndex: 90, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.warn, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14 }}>
      <Ionicons name="cloud-offline" size={18} color="#1a1200" />
      <AppText style={{ color: '#1a1200', fontWeight: '700', flex: 1 }}>You are offline. Showing saved data; changes will wait for a connection.</AppText>
    </Animated.View>
  );
}

/** Last line of defence: a render crash shows a recovery screen instead of a blank app. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { reportError(error, { componentStack: info.componentStack }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
        <Logo size={72} tagline={false} />
        <AppText style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>Something went wrong</AppText>
        <AppText style={{ color: colors.muted, textAlign: 'center' }}>The app hit an unexpected problem. Your data is safe. Try again.</AppText>
        <Button title="Reload" onPress={() => this.setState({ error: null })} />
      </View>
    );
  }
}

type Sink = (error: Error, context?: Record<string, unknown>) => void;
let sink: Sink = (e, c) => { if (__DEV__) console.warn('[error]', e.message, c ?? ''); };
/** Plug a crash reporter in once (e.g. `setErrorSink((e, c) => Sentry.captureException(e, { extra: c }))`). */
export const setErrorSink = (s: Sink) => { sink = s; };
export const reportError: Sink = (e, c) => { try { sink(e, c); } catch { /* reporting must never crash the app */ } };
