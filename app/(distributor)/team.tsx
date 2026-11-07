import React from 'react';
import { useRouter } from 'expo-router';
import { toast } from '../../src/ui/Toast';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Delivery / field employees of this distributor, with workload. */
export default function Team() {
  const router = useRouter();
  const q = useGet<any>('/distributor/employees');
  const [handing, setHanding] = React.useState<number | null>(null);
  const handover = useSend<{ id: number; to_employee_id: number | null }>((b) => `/distributor/employees/${b.id}/reassign-all`, { invalidate: ['/distributor/employees', '/orders'], onDone: () => { setHanding(null); toast.success('Deliveries handed over'); } });
  const update = useSend<{ id: number; is_available?: boolean; is_active?: boolean }>((b) => `/distributor/employees/${b.id}`, { method: 'PUT', invalidate: ['/distributor/employees'] });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Team</H1>
      <Button title="Add employee" onPress={() => router.push('/(distributor)/employee-new')} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.employees.length ? <Empty text="No employees yet" /> :
        q.data.employees.map((e: any) => (
          <Card key={e.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>{e.name}</Body>
              <Chip label={!e.is_active ? 'Login off' : e.is_available ? 'Available' : 'On leave'} tone={!e.is_active ? 'danger' : e.is_available ? 'ok' : 'warn'} />
            </Row>
            <Muted>{e.phone} · {e.retailers} retailers · {e.open_orders} open · {e.delivered_today} delivered today</Muted>
            {e.open_orders > 0 && <Button small variant="ghost" title={handing === e.id ? 'Choose who takes over' : `Hand over ${e.open_orders} open deliveries`} onPress={() => setHanding(handing === e.id ? null : e.id)} />}
            {handing === e.id && <Row>{q.data.employees.filter((x: any) => x.id !== e.id && x.is_active && x.is_available).map((x: any) => <Chip key={x.id} label={x.name} onPress={() => handover.mutate({ id: e.id, to_employee_id: x.id })} />)}<Chip label="Leave unassigned" tone="warn" onPress={() => handover.mutate({ id: e.id, to_employee_id: null })} /></Row>}
            <Row>
              <Button small variant="ghost" title={e.is_available ? 'Mark on leave' : 'Mark available'} onPress={() => update.mutate({ id: e.id, is_available: !e.is_available })} />
              <Button small variant="ghost" title={e.is_active ? 'Switch login off' : 'Switch login on'} onPress={() => update.mutate({ id: e.id, is_active: !e.is_active })} />
            </Row>
          </Card>
        ))}
    </Screen>
  );
}
