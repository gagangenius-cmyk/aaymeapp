import React from 'react';
import { Alert } from '../src/ui/alert';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Distributor: UPI payments reported by retailers. Confirm only after the money shows in your bank app. */
export default function Payments() {
  const q = useGet<any>('/payments');
  const confirm = useSend<{ id: number }>((b) => `/payments/${b.id}/confirm`, { invalidate: ['/payments', '/collections/receivables'] });
  const reject = useSend<{ id: number }>((b) => `/payments/${b.id}/reject`, { invalidate: ['/payments'] });
  const ask = (p: any) => Alert.alert(`Confirm ${inr(p.amount)}?`, `${p.shop_name} · UTR ${p.utr}\nConfirm only if the money is in your bank account.`, [
    { text: 'Back', style: 'cancel' }, { text: 'Confirm', onPress: () => confirm.mutate({ id: p.id }) },
  ]);
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Payments</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.payments.length ? <Empty text="No payments yet" /> :
        q.data.payments.map((p: any) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>{inr(p.amount)} · {p.shop_name}</Body>
              <Chip label={p.status} tone={p.status === 'confirmed' ? 'ok' : p.status === 'pending' ? 'warn' : 'danger'} />
            </Row>
            <Muted>{p.method.toUpperCase()} · UTR {p.utr} · {new Date(p.created_at).toLocaleString()}</Muted>
            {p.status === 'pending' && p.method === 'upi' && <Row><Button small title="Confirm" onPress={() => ask(p)} /><Button small variant="danger" title="Reject" onPress={() => reject.mutate({ id: p.id })} /></Row>}
            {p.status === 'pending' && p.method === 'gateway' && <Muted>Confirmed automatically by the gateway</Muted>}
          </Card>
        ))}
    </Screen>
  );
}
