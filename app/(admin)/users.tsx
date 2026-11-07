import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const ROLES = [['', 'All'], ['company_employee', 'Company staff'], ['distributor', 'Distributors'], ['employee', 'Dist. employees'], ['retailer', 'Retailers']] as const;

/** Find any account and suspend / restore it. */
export default function Users() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [text, setText] = useState('');
  const q = useGet<any>('/admin/users', { role: role || undefined, q: text.trim() || undefined, limit: 50 });
  const status = useSend<{ id: number; is_active: boolean }>((b) => `/admin/users/${b.id}/status`, { invalidate: ['/admin/users'] });

  const toggle = (u: any) => Alert.alert(u.is_active ? 'Suspend account?' : 'Restore account?', `${u.name} (${u.phone})${u.is_active ? ' will be signed out everywhere.' : ''}`, [
    { text: 'Cancel', style: 'cancel' },
    { text: u.is_active ? 'Suspend' : 'Restore', style: u.is_active ? 'destructive' : 'default', onPress: () => status.mutate({ id: u.id, is_active: !u.is_active }) },
  ]);

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Users</H1>
      <Field label="Search" value={text} onChangeText={setText} placeholder="Name, phone or email" />
      <Row>{ROLES.map(([v, l]) => <Chip key={v} label={l} active={role === v} onPress={() => setRole(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.users.length ? <Empty text="No users match" /> :
        q.data.users.map((u: any) => (
          <Card key={u.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{u.business || u.name}</Body><Chip label={u.role.replace('_', ' ')} /></Row>
            <Muted>{u.name} · {u.phone}</Muted>
            {u.role !== 'admin' && <Button small variant="ghost" title="Edit details" onPress={() => router.push({ pathname: '/console/user-edit', params: { id: String(u.id) } })} />}
            {u.role !== 'admin' && <Button small variant={u.is_active ? 'danger' : 'primary'} title={u.is_active ? 'Suspend' : 'Restore'} onPress={() => toggle(u)} />}
          </Card>
        ))}
    </Screen>
  );
}
