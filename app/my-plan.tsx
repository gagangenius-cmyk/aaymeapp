import React from 'react';
import { useGet } from '../src/lib/hooks';
import { Body, Card, ErrorBox, H2, inr, Loading, Muted, Row, Chip, Screen } from '../src/ui/kit';

/** A retailer's own AAYME subscription: which plan is running, when it ends, and the plans they have had. */
export default function MyPlan() {
  const q = useGet<any>('/retailer/subscription');
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}><H2>{d.active ? d.current.plan_name : 'No active plan'}</H2><Chip label={d.active ? 'Active' : 'Not active'} tone={d.active ? 'ok' : 'warn'} /></Row>
          {d.active ? <Muted>Ends {new Date(d.current.ends_at).toLocaleDateString()} · {d.current.days_left} {d.current.days_left === 1 ? 'day' : 'days'} left</Muted>
            : <Muted>Ask your AAYME distributor to sell you a subscription. Once the payment is confirmed your online store starts.</Muted>}
        </Card>
        <H2>My plans</H2>
        {d.history.length ? d.history.map((h: any) => (
          <Card key={h.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{h.plan_name}</Body><Body>{inr(h.price)}</Body></Row>
            <Muted>{new Date(h.starts_at).toLocaleDateString()} to {new Date(h.ends_at).toLocaleDateString()}{h.status === 'cancelled' ? ' · cancelled' : ''}</Muted>
          </Card>
        )) : <Muted>No plans yet.</Muted>}
      </>)}
    </Screen>
  );
}
