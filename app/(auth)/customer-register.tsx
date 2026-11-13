import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { Link } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { fieldErrors } from '../../src/lib/hooks';
import { currentPlace, describePlace } from '../../src/lib/place';
import { colors } from '../../src/lib/theme';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Field, H1, Muted } from '../../src/ui/kit';

/** The store code a Play Store install carries (from a store's QR code): "aayme_store=CODE" in the install referrer. */
async function installedFromStore(): Promise<string | null> {
  try {
    if (Platform.OS !== 'android') return null;
    const ref = await Application.getInstallReferrerAsync();
    const m = String(ref ?? '').match(/aayme_store(?:=|%3D)([A-Za-z0-9]{4,12})/i);
    return m ? m[1].toUpperCase() : null;
  } catch { return null; }
}

/** Customer sign-up: name, phone, password and location. If the app was installed from a store's QR code, that store gets the new customer and is pinned on top. */
export default function CustomerRegister() {
  const { signIn } = useAuth();
  const [f, setF] = useState<Record<string, string>>({});
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [storeCode, setStoreCode] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => { installedFromStore().then(setStoreCode); }, []);
  async function locate() {
    const p = await currentPlace();
    if (!p) return Alert.alert('Location', 'Allow location access so we can show the stores near you. You can also type your address.');
    setPos(p); const d = await describePlace(p);
    setF((s) => ({ ...s, address: s.address || d.address, pincode: s.pincode || d.pincode }));
  }
  useEffect(() => { locate(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    setErrors({}); setBusy(true);
    try {
      const r = await api<any>('/customer/register', { auth: false, body: {
        name: f.name?.trim(), phone: f.phone, password: f.password, ...(f.email?.trim() ? { email: f.email.trim() } : {}),
        ...(f.address?.trim() ? { address: f.address.trim() } : {}), ...(f.pincode ? { pincode: f.pincode } : {}), ...(pos ? { lat: pos.lat, lng: pos.lng } : {}), ...(storeCode ? { store_code: storeCode } : {}),
      } });
      await signIn({ id: r.id, role: 'customer', access_token: r.access_token, refresh_token: r.refresh_token });
    } catch (e: any) { setErrors({ ...fieldErrors(e), _: e.message }); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
          <H1>Create your account</H1>
          {storeCode && <Card><Body style={{ fontWeight: '700' }}>You are joining a store</Body><Muted>Once you sign up, it is added to your stores and pinned on top of your home page.</Muted></Card>}
          <Field label="Your name" value={f.name ?? ''} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
          <Field label="Mobile number" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
          <Field label="Password (8+ characters)" value={f.password ?? ''} onChangeText={set('password')} secureTextEntry error={errors.password} />
          <Field label="Email (optional, to sign in with a code)" value={f.email ?? ''} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
          <Field label="Address" value={f.address ?? ''} onChangeText={set('address')} multiline style={{ minHeight: 60 }} error={errors.address} />
          <Field label="Pincode" value={f.pincode ?? ''} onChangeText={(v) => set('pincode')(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
          <Muted>{pos ? 'Your location is added.' : 'Your location is not added yet.'}</Muted>
          <Button variant="ghost" title="Use my current location" onPress={locate} />
          {!!errors._ && <Body style={{ color: colors.danger }}>{errors._}</Body>}
          <Button title="Sign up" onPress={submit} loading={busy} disabled={(f.name ?? '').trim().length < 2 || (f.phone ?? '').length !== 10 || (f.password ?? '').length < 8} />
          <Muted>Already have an account?</Muted>
          <Link href="/(auth)/login" style={{ color: colors.cyan, fontWeight: '700' }}>Sign in</Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
