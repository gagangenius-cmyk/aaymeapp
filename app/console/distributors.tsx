import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, ErrorBox, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

/** Admin: every distributor with its subscription timer, and hand-over to another company employee. */
export default function AdminDistributors() {
  const router = useRouter();
  const q = useGet<any>('/admin/distributors');
  const staff = useGet<any>('/admin/staff');
  const [moving, setMoving] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [fromEmp, setFromEmp] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const bulk = useSend<{ distributor_ids?: number[]; from_employee_id?: number; employee_id: number }>('/admin/distributors/bulk-employee', { method: 'PUT', invalidate: ['/admin/distributors'], onDone: (r: any) => { setPicked([]); setSelecting(false); Alert.alert('Moved', `${r.moved} distributor${r.moved === 1 ? '' : 's'} now managed by ${r.employee}.`); } });
  const activeStaff = (staff.data?.staff ?? []).filter((s: any) => s.is_active);
  const move = useSend<{ id: number; employee_id: number }>((b) => `/admin/distributors/${b.id}/employee`, { method: 'PUT', invalidate: ['/admin/distributors'], success: 'Moved', onDone: () => setMoving(null) });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>
        <Button small variant="ghost" title={selecting ? 'Done' : 'Select many'} onPress={() => { setSelecting(!selecting); setPicked([]); }} />
        {selecting && <Button small variant="ghost" title="Select all" onPress={() => setPicked((q.data?.distributors ?? []).map((d: any) => d.id))} />}
      </Row>
      {selecting && (
        <Card>
          <Muted>{picked.length} selected. Move them to:</Muted>
          <Row>{activeStaff.map((s: any) => <Chip key={s.id} label={s.name} onPress={() => picked.length && bulk.mutate({ distributor_ids: picked, employee_id: s.id })} />)}</Row>
          <Muted>Or move everything one employee looks after to another:</Muted>
          <Row>{activeStaff.map((s: any) => <Chip key={s.id} label={`All of ${s.name}`} active={fromEmp === s.id} onPress={() => setFromEmp(fromEmp === s.id ? null : s.id)} />)}</Row>
          {fromEmp !== null && <Row>{activeStaff.filter((s: any) => s.id !== fromEmp).map((s: any) => <Chip key={s.id} label={`→ ${s.name}`} onPress={() => bulk.mutate({ from_employee_id: fromEmp, employee_id: s.id })} />)}</Row>}
        </Card>
      )}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.distributors.length ? <Empty text="No distributors" /> :
        q.data.distributors.map((d: any) => {
          const left = daysLeft(d.subscription_ends_at);
          return (
            <Card key={d.id} style={picked.includes(d.id) ? { borderColor: '#2874F0' } : undefined} onPress={selecting ? () => toggle(d.id) : undefined}>
              <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{selecting ? (picked.includes(d.id) ? '✓ ' : '○ ') : ''}{d.business_name}</Body><Chip label={!d.is_active ? 'Suspended' : left < 0 ? 'Expired' : `${left}d left`} tone={!d.is_active || left < 0 ? 'danger' : left <= 7 ? 'warn' : 'ok'} /></Row>
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
