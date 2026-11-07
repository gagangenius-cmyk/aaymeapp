import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Company employees the admin has created, with what each may do. */
export default function StaffList() {
  const router = useRouter();
  const q = useGet<any>('/admin/staff');
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Company employees</H1>
      <Button title="Add employee" onPress={() => router.push('/(admin)/staff-form')} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.staff.length ? <Empty text="No company employees yet" /> :
        q.data.staff.map((s: any) => (
          <Card key={s.id} onPress={() => router.push({ pathname: '/(admin)/staff-form', params: { id: String(s.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>{s.name}</Body>
              <Chip label={s.is_active ? 'Active' : 'Suspended'} tone={s.is_active ? 'ok' : 'danger'} />
            </Row>
            <Muted>{s.phone}{s.email ? ` · ${s.email}` : ''}</Muted>
            <Muted>{s.actions.length} actions · can hand out {s.grantable.length} distributor features · {s.distributors_created} distributors created</Muted>
          </Card>
        ))}
    </Screen>
  );
}
