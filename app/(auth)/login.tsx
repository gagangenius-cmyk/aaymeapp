import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/lib/theme';
import { Logo } from '../../src/ui/Logo';
import Animated, { FadeInDown, LinearTransition, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Body, Button, Field, Muted } from '../../src/ui/kit';

/** The logo breathes very slightly: a calm sign that the app is alive. */
function FloatingLogo() {
  const y = useSharedValue(0);
  useEffect(() => { y.value = withRepeat(withSequence(withTiming(-6, { duration: 1800 }), withTiming(0, { duration: 1800 })), -1, false); }, [y]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View entering={ZoomIn.duration(600).springify().damping(14)} style={[{ alignItems: 'center', marginBottom: 16 }, st]}><Logo size={110} /></Animated.View>;
}

export default function Login() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needCode, setNeedCode] = useState(false); // admin / company-employee second factor, or the emailed sign-in code
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const finish = (r: any) => signIn({ id: r.id, role: r.role, access_token: r.access_token, refresh_token: r.refresh_token });
  const fail = (e: unknown) => setMsg({ text: (e as Error).message });

  async function submitPassword() {
    setBusy(true); setMsg(null);
    try {
      finish(await api('/auth/login', { auth: false, body: { phone: identifier.trim(), password, ...(code ? { totp: code } : {}) } }));
    } catch (e) {
      // the server emails a code and asks for it: show the code box rather than an error
      if (e instanceof ApiError && e.code === 'TOTP_REQUIRED') { setNeedCode(true); setMsg({ text: e.message, ok: true }); } else fail(e);
    } finally { setBusy(false); }
  }

  async function requestOtp() {
    setBusy(true); setMsg(null);
    try {
      await api('/auth/otp/request', { auth: false, body: { identifier: identifier.trim(), purpose: 'login' } });
      setNeedCode(true); setMsg({ text: 'If the account has an email, a 6-digit code was sent to it.', ok: true });
    } catch (e) { fail(e); } finally { setBusy(false); }
  }

  async function verifyOtp() {
    setBusy(true); setMsg(null);
    try { finish(await api('/auth/otp/verify', { auth: false, body: { identifier: identifier.trim(), purpose: 'login', code } })); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }

  const primary = mode === 'password' ? submitPassword : needCode ? verifyOtp : requestOtp;
  const primaryTitle = mode === 'password' ? (needCode ? 'Verify & sign in' : 'Sign in') : needCode ? 'Verify code' : 'Email me a code';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient pointerEvents="none" colors={['#2874F022', '#F1F3F600']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 14, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <FloatingLogo />
          <Animated.View entering={FadeInDown.delay(150).duration(450)} layout={LinearTransition.springify()} style={{ gap: 14 }}>
          <Field label={mode === 'password' ? 'Phone' : 'Email or phone'} value={identifier} onChangeText={setIdentifier} keyboardType={mode === 'password' ? 'phone-pad' : 'default'} placeholder={mode === 'password' ? '10-digit mobile number' : 'you@company.com'} />
          {mode === 'password' && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" />}
          {needCode && <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />}
          {msg && <Body style={{ color: msg.ok ? colors.cyan : colors.danger, fontSize: 13 }}>{msg.text}</Body>}
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(450)} style={{ gap: 14 }}>
          <Button title={primaryTitle} onPress={primary} loading={busy} />
          <Button variant="ghost" title={mode === 'password' ? 'Use an emailed code instead' : 'Use password instead'} onPress={() => { setMode(mode === 'password' ? 'otp' : 'password'); setNeedCode(false); setCode(''); setMsg(null); }} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(380).duration(450)} style={{ alignItems: 'center', marginTop: 8 }}>
            <Muted>New retailer or distributor?</Muted>
            <Link href="/(auth)/register" style={{ color: colors.cyan, fontWeight: '700', marginTop: 4 }}>Create an account</Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
