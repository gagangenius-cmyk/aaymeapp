import React, { useEffect, useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { toast } from '../../src/ui/Toast';
import { Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Admin: correct anyone's details (a wrong phone, GSTIN, shop name) or set them a new password. Passwords can never be read, only replaced. */
export default function UserEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>(`/admin/users/${id}/profile`);
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  useEffect(() => {
    const p = q.data; if (!p) return;
    setF({ name: p.name ?? '', phone: p.phone ?? '', email: p.email ?? '', business_name: p.business_name ?? '', shop_name: p.shop_name ?? '', gst_no: p.gst_no ?? '', address: p.address ?? '', city: p.city ?? '', pincode: p.pincode ?? '', password: '' });
  }, [q.data?.id]);
  const save = useSend<any>(`/admin/users/${id}/profile`, { method: 'PUT', invalidate: [`/admin/users/${id}/profile`, '/admin/users'], onDone: () => goBack(router), success: 'Profile saved' });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const p = q.data;
  const submit = () => {
    setErrors({});
    // only send what changed: the server rejects fields that do not apply to this role
    const body: Record<string, unknown> = {};
    const same = (k: string, cur: unknown) => (f[k] ?? '') === String(cur ?? '');
    if (!same('name', p.name)) body.name = f.name;
    if (!same('phone', p.phone)) body.phone = f.phone;
    if (!same('email', p.email)) body.email = f.email || null;
    if (p.role === 'distributor') { if (!same('business_name', p.business_name)) body.business_name = f.business_name; if (!same('city', p.city)) body.city = f.city || null; }
    if (p.role === 'retailer' && !same('shop_name', p.shop_name)) body.shop_name = f.shop_name;
    if (p.role === 'distributor' || p.role === 'retailer') {
      if (!same('gst_no', p.gst_no)) body.gst_no = f.gst_no || null;
      if (!same('address', p.address)) body.address = f.address || null;
      if (!same('pincode', p.pincode)) body.pincode = f.pincode;
    }
    if (f.password) body.password = f.password;
    if (!Object.keys(body).length) return toast.info('Nothing was changed');
    save.mutate(body, { onError: (e) => setErrors(fieldErrors(e)) });
  };
  return (
    <Screen>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>{p.name}</H2><Chip label={String(p.role).replace('_', ' ')} /></Row>
        {p.works_for ? <Muted>Works for {p.works_for}</Muted> : null}
        <Muted>{p.is_active ? 'Active' : 'Suspended'}</Muted>
      </Card>
      <Field label="Name" value={f.name} onChangeText={set('name')} error={errors.name} autoCapitalize="words" />
      <Field label="Phone" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
      <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" error={errors.email} />
      {p.role === 'distributor' && <Field label="Business name" value={f.business_name} onChangeText={set('business_name')} error={errors.business_name} />}
      {p.role === 'retailer' && <Field label="Shop name" value={f.shop_name} onChangeText={set('shop_name')} error={errors.shop_name} />}
      {(p.role === 'distributor' || p.role === 'retailer') && (<>
        <Field label="GSTIN" value={f.gst_no} onChangeText={set('gst_no')} autoCapitalize="characters" maxLength={15} error={errors.gst_no} />
        <Field label="Address" value={f.address} onChangeText={set('address')} error={errors.address} />
        {p.role === 'distributor' && <Field label="City" value={f.city} onChangeText={set('city')} error={errors.city} />}
        <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
      </>)}
      <Field label="New password (leave empty to keep)" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
      <Muted>A new password signs the person out everywhere.</Muted>
      <Button title="Save changes" onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
