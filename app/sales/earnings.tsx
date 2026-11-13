import React from 'react';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

const KIND: Record<string, string> = { new: 'New subscriptions', renewal: 'Renewals', upgrade: 'Upgrades' };

/** What the distributor has earned from subscription sales: waiting to be paid, already paid out, and by month. */
export default function Earnings() {
  const q = useGet<any>('/sales/earnings');
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="To receive" value={inr(d.pending)} tone="warn" />
          <Stat label="Paid to you" value={inr(d.settled)} tone="ok" />
        </Row>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Total earned" value={inr(d.total)} />
          <Stat label="Paid sales" value={d.paid_sales} />
        </Row>
        <Muted>Sales value: {inr(d.sales_value)}</Muted>
        {Number(d.to_recover) > 0 && <Card><Body style={{ color: '#D93A55' }}>{inr(d.to_recover)} of commission is to be recovered because those sales were refunded after you were paid.</Body></Card>}
        <H2>By kind of sale</H2>
        {d.by_kind.length ? d.by_kind.map((k: any) => <Row key={k.kind} style={{ justifyContent: 'space-between' }}><Body>{KIND[k.kind]} ({k.sales})</Body><Body style={{ fontWeight: '700' }}>{inr(k.commission)}</Body></Row>) : <Muted>No sales yet.</Muted>}
        <H2>By month</H2>
        {d.by_month.length ? d.by_month.map((m: any) => (
          <Card key={m.month}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{m.month}</Body><Body style={{ fontWeight: '700' }}>{inr(m.commission)}</Body></Row>
            <Muted>{m.sales} {m.sales === 1 ? 'sale' : 'sales'} · {inr(m.amount)}</Muted>
          </Card>
        )) : <Muted>Nothing earned yet.</Muted>}
      </>)}
    </Screen>
  );
}
