import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, H1, inr, Loading, Muted, Row, Screen } from './kit';

export const STATUS_TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { placed: 'warn', accepted: undefined, dispatched: undefined, out_for_delivery: undefined, delivered: 'ok', rejected: 'danger', cancelled: 'danger' };
const FILTERS = ['', 'placed', 'accepted', 'dispatched', 'out_for_delivery', 'delivered', 'cancelled'];

/** Orders for whoever is signed in: the API scopes the list (retailer's own, distributor's, or the employee's assigned deliveries). */
export function OrdersScreen({ title = 'Orders' }: { title?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const q = useGet<any>('/orders', { status: status || undefined, limit: 50 });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>{title}</H1>
      <Row>{FILTERS.map((s) => <Chip key={s} label={s ? s.replace(/_/g, ' ') : 'All'} active={status === s} onPress={() => setStatus(s)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.orders.length ? <Empty text="No orders yet" /> :
        q.data.orders.map((o: any) => (
          <Card key={o.id} onPress={() => router.push({ pathname: '/order/[id]', params: { id: String(o.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>#{o.id} · {inr(o.total)}</Body>
              <Chip label={o.status.replace(/_/g, ' ')} tone={STATUS_TONE[o.status]} />
            </Row>
            <Muted>{o.retailer_name} → {o.distributor_name} · {o.item_count} items</Muted>
            <Muted>{new Date(o.created_at).toLocaleString()}{o.is_out_of_hierarchy ? ' · outside network' : ''}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
