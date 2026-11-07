import React, { useEffect, useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend, fieldErrors } from '../../src/lib/hooks';
import { Button, Card, ErrorBox, Field, H2, Loading, Muted, Screen, Toggle } from '../../src/ui/kit';
import { PermissionToggles } from '../../src/ui/PermissionToggles';

/**
 * Create or edit a company employee.
 *  - "Actions" are what the employee may do (create distributors, review products...).
 *  - "Grantable" are the distributor features (COD, online payments...) the employee may switch on for distributors they create.
 */
export default function StaffForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const list = useGet<any>('/admin/staff');
  const existing = id ? list.data?.staff.find((s: any) => String(s.id) === id) : null;

  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [actions, setActions] = useState<string[]>([]);
  const [grantable, setGrantable] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existing) { setF((s) => ({ ...s, name: existing.name, phone: existing.phone, email: existing.email ?? '' })); setActions(existing.actions); setGrantable(existing.grantable); setActive(existing.is_active); }
  }, [existing?.id]);

  const save = useSend<any>(id ? `/admin/staff/${id}` : '/admin/staff', { method: id ? 'PUT' : 'POST', invalidate: ['/admin/staff'], success: 'Employee saved', onDone: () => goBack(router) });
  const submit = () => {
    setErrors({});
    const body = id
      ? { name: f.name, is_active: active, actions, grantable, ...(f.password ? { password: f.password } : {}) }
      : { name: f.name, phone: f.phone, ...(f.email ? { email: f.email } : {}), password: f.password, actions, grantable };
    save.mutate(body, { onError: (e) => setErrors(fieldErrors(e)) });
  };

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorBox error={list.error} retry={list.refetch} />;
  const { action_catalog, grant_catalog } = list.data;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: id ? 'Edit employee' : 'New company employee', headerStyle: { backgroundColor: '#2874F0' }, headerTintColor: '#fff' }} />
      <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" error={errors.name} />
      {!id && <Field label="Phone (login id)" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" maxLength={10} error={errors.phone} />}
      {!id && <Field label="Email (for sign-in codes)" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" error={errors.email} />}
      <Field label={id ? 'New password (leave empty to keep)' : 'Password (8+ characters)'} value={f.password} onChangeText={(v) => setF({ ...f, password: v })} secureTextEntry error={errors.password} />
      {id && <Toggle label="Account active" value={active} onChange={setActive} />}

      <H2>What this employee can do</H2>
      <Card><PermissionToggles catalog={action_catalog} value={actions} onChange={setActions} /></Card>

      <H2>Distributor features they can hand out</H2>
      <Muted>When this employee onboards a distributor, they can only switch on the features ticked here (e.g. Cash on delivery, Online payments).</Muted>
      <Card><PermissionToggles catalog={grant_catalog} value={grantable} onChange={setGrantable} /></Card>

      <Button title={id ? 'Save changes' : 'Create employee'} onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
