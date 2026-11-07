import React from 'react';
import { Linking } from 'react-native';
import { useGet } from '../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from '../src/ui/kit';

/** Distributor: platform commission on orders from retailers outside your own network, and the statements to pay. */
export default function DistributorCommission() {
  const q = useGet<any>('/commission');
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row><Stat label="Accruing" value={inr(d.accruing.amount)} /><Stat label="To pay" value={inr(d.payable)} tone={Number(d.payable) > 0 ? 'warn' : undefined} /></Row>
      {d.pay_to && <Card><Muted>Pay approved statements to</Muted><Body selectable style={{ fontWeight: '700' }}>{d.pay_to.upi_id}</Body><Muted>{d.pay_to.payee}</Muted>
        <Button small variant="ghost" title="Open UPI app" onPress={() => Linking.openURL(`upi://pay?pa=${encodeURIComponent(d.pay_to.upi_id)}&pn=${encodeURIComponent(d.pay_to.payee ?? 'AAYME')}&am=${d.payable}&cu=INR`)} /></Card>}
      <H2>Statements</H2>
      {d.settlements.length ? d.settlements.map((s: any) => (
        <Card key={s.id}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{s.id} · {inr(s.amount)}</Body><Chip label={s.status} tone={s.status === 'paid' ? 'ok' : s.status === 'cancelled' ? 'danger' : 'warn'} /></Row>
          <Muted>{s.period_from} to {s.period_to} · {s.entry_count} orders{s.payment_ref ? ` · ref ${s.payment_ref}` : ''}</Muted>
        </Card>
      )) : <Muted>No statements yet</Muted>}
      <H2>Recent entries</H2>
      {d.recent_entries.map((e: any) => (
        <Row key={e.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>Order #{e.order_id} · {e.kind}</Muted><Body style={{ color: Number(e.amount) < 0 ? '#22C55E' : undefined }}>{inr(e.amount)}</Body></Row>
      ))}
    </Screen>
  );
}
