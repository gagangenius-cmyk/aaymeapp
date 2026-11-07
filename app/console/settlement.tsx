import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** One commission statement with every order entry it contains, so a payout can be checked line by line before it is paid. */
export default function Settlement() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useGet<any>(`/admin/commission/settlements/${id}`);
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const s = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>#{s.id} · {s.business_name}</H2><Chip label={s.status} tone={s.status === 'paid' ? 'ok' : s.status === 'cancelled' ? 'danger' : 'warn'} /></Row>
        <Muted>{s.period_from} to {s.period_to} · {s.entry_count} entries</Muted>
        <Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(s.amount)}</Body>
        {s.payment_ref ? <Muted>Paid · reference {s.payment_ref}</Muted> : null}
        {s.note ? <Muted>Note: {s.note}</Muted> : null}
      </Card>
      <H2>Entries</H2>
      {s.entries.map((e: any) => (
        <Card key={e.id}>
          <Row style={{ justifyContent: 'space-between' }}><Body>Order #{e.order_id} · {e.kind}</Body><Body style={{ fontWeight: '700', color: Number(e.amount) < 0 ? '#22C55E' : undefined }}>{inr(e.amount)}</Body></Row>
          <Muted>Basis {inr(e.basis)} · {e.mode === 'percent' ? `${e.value}%` : `₹${e.value}/unit`} · {new Date(e.at).toLocaleDateString()}</Muted>
        </Card>
      ))}
    </Screen>
  );
}
