import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { fieldErrors } from '../../src/lib/hooks';
import { colors } from '../../src/lib/theme';
import { LogoMark } from '../../src/ui/Logo';
import { Body, Button, Chip, Field, H1, Muted, Row } from '../../src/ui/kit';

export default function Register() {
  const { signIn } = useAuth();
  const [role, setRole] = useState<'retailer' | 'distributor'>('retailer');
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    setBusy(true); setErrors({}); setMsg('');
    const common = { role, phone: f.phone, email: f.email, name: f.name, password: f.password, ...(f.gst_no ? { gst_no: f.gst_no } : {}) };
    const body = role === 'retailer'
      ? { ...common, shop_name: f.shop_name, pincode: f.pincode, ...(f.address ? { address: f.address } : {}) }
      : { ...common, business_name: f.business_name };
    try {
      const r = await api('/auth/register', { auth: false, body });
      await signIn({ id: r.id, role, access_token: r.access_token, refresh_token: r.refresh_token });
    } catch (e: any) { setErrors(fieldErrors(e)); setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center' }}><LogoMark size={64} /></View>
        <H1>Create account</H1>
        <Row><Chip label="Retailer" active={role === 'retailer'} onPress={() => setRole('retailer')} /><Chip label="Distributor" active={role === 'distributor'} onPress={() => setRole('distributor')} /></Row>
        <Field label="Your name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
        <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
        <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" error={errors.email} />
        <Field label="Password (8+ characters)" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
        {role === 'retailer' ? (<>
          <Field label="Shop name" value={f.shop_name} onChangeText={set('shop_name')} autoCapitalize="words" error={errors.shop_name} />
          <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
          <Field label="Address (optional)" value={f.address} onChangeText={set('address')} error={errors.address} />
        </>) : (
          <Field label="Business name" value={f.business_name} onChangeText={set('business_name')} autoCapitalize="words" error={errors.business_name} />
        )}
        <Field label="GSTIN (optional)" value={f.gst_no} onChangeText={set('gst_no')} autoCapitalize="characters" maxLength={15} error={errors.gst_no} />
        {!!msg && !Object.keys(errors).length && <Body style={{ color: colors.danger }}>{msg}</Body>}
        <Button title="Register" onPress={submit} loading={busy} />
        <View style={{ alignItems: 'center' }}><Muted>Already registered?</Muted><Link href="/(auth)/login" style={{ color: colors.cyan, fontWeight: '700', marginTop: 4 }}>Sign in</Link></View>
      </ScrollView>
    </SafeAreaView>
  );
}
