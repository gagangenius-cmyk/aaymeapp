import React, { useState } from 'react';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const STATES: [string, string][] = [['active', 'Active'], ['expiring', 'Ending in 7 days'], ['expired', 'Expired'], ['all', 'All']];

/** Admin: when each retailer's subscription started and when it ends. */
export default function RetailerSubscriptions() {
  const [state, setState] = useState('active');
  const q = useGet<any>('/admin/retailer-subscriptions', { state });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{STATES.map(([v, l]) => <Chip key={v} label={l} active={state === v} onPress={() => setState(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.subscriptions.length ? <Empty text="Nothing here" /> :
        q.data.subscriptions.map((s: any) => (
          <Card key={s.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{s.shop_name ?? s.retailer_name}</Body><Chip label={s.active ? 'Active' : s.status === 'cancelled' ? 'Cancelled' : 'Expired'} tone={s.active ? 'ok' : 'danger'} /></Row>
            <Muted>{s.plan_name} · {inr(s.price)} · {s.phone}</Muted>
            <Muted>{new Date(s.starts_at).toLocaleDateString()} to {new Date(s.ends_at).toLocaleDateString()}{s.sold_by ? ` · sold by ${s.sold_by}` : ''}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
