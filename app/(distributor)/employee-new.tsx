import React, { useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { Stack, useRouter } from 'expo-router';
import { fieldErrors, useSend } from '../../src/lib/hooks';
import { Button, Chip, Field, H2, Row, Screen } from '../../src/ui/kit';

export default function NewEmployee() {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'sales' | 'delivery'>('sales');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const create = useSend<any>('/distributor/employees', { invalidate: ['/distributor/employees'], success: 'Employee created', onDone: () => goBack(router) });
  const submit = () => { setErrors({}); create.mutate({ kind, name: f.name, phone: f.phone, password: f.password, ...(f.email ? { email: f.email } : {}) }, { onError: (e) => setErrors(fieldErrors(e)) }); };
  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New team member', headerStyle: { backgroundColor: '#2874F0' }, headerTintColor: '#fff' }} />
      <H2>Role</H2>
      <Row><Chip label="Sales person" active={kind === 'sales'} onPress={() => setKind('sales')} /><Chip label="Delivery person" active={kind === 'delivery'} onPress={() => setKind('delivery')} /></Row>
      <Field label="Name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <Field label="Phone (login id)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
      <Field label="Email (optional)" value={f.email} onChangeText={set('email')} keyboardType="email-address" error={errors.email} />
      <Field label="Password (8+ characters)" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
      <Button title="Create team member" onPress={submit} loading={create.isPending} />
    </Screen>
  );
}
