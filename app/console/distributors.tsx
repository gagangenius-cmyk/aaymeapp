import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

/** Admin: every distributor with its subscription timer, and hand-over to another company employee. */
export default function AdminDistributors() {
  const router = useRouter();
  const q = useGet<any>('/admin/distributors');
  const staff = useGet<any>('/admin/staff');
  const [moving, setMoving] = useState<number | null>(null);
  const move = useSend<{ id: number; employee_id: number }>((b) => `/admin/distributors/${b.id}/employee`, { method: 'PUT', invalidate: ['/admin/distributors'], success: 'Moved', onDone: () => setMoving(null) });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.distributors.length ? <Empty text="No distributors" /> :
        q.data.distributors.map((d: any) => {
          const left = daysLeft(d.subscription_ends_at);
          return (
            <Card key={d.id}>
              <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{d.business_name}</Body><Chip label={!d.is_active ? 'Suspended' : left < 0 ? 'Expired' : `${left}d left`} tone={!d.is_active || left < 0 ? 'danger' : left <= 7 ? 'warn' : 'ok'} /></Row>
              <Muted>{d.owner_name} · {d.phone} · {d.retailers} retailers · {d.orders} orders</Muted>
              <Muted>Managed by {d.created_by_name ?? 'nobody'}</Muted>
              <Button small title="Features, days & commission" onPress={() => router.push({ pathname: '/console/distributor-admin', params: { id: String(d.id) } })} />
              <Button small variant="ghost" title={moving === d.id ? 'Choose an employee below' : 'Move to another employee'} onPress={() => setMoving(moving === d.id ? null : d.id)} />
              {moving === d.id && <Row>{(staff.data?.staff ?? []).filter((s: any) => s.is_active && s.id !== d.created_by).map((s: any) => <Chip key={s.id} label={s.name} onPress={() => move.mutate({ id: d.id, employee_id: s.id })} />)}</Row>}
            </Card>
          );
        })}
    </Screen>
  );
}
