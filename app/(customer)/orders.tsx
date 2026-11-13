import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, H1, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

export const ORDER_TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { placed: 'warn', accepted: undefined, out_for_delivery: undefined, delivered: 'ok', cancelled: 'danger', rejected: 'danger' };

/** A customer's orders from stores. */
export default function CustomerOrders() {
  const router = useRouter();
  const q = useGet<any>('/customer/orders');
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>My orders</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.orders.length ? <Empty text="No orders yet" /> :
        q.data.orders.map((o: any) => (
          <Card key={o.id} onPress={() => router.push({ pathname: '/customer/order', params: { id: String(o.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{o.id} · {inr(o.total)}</Body><Chip label={o.status.replace(/_/g, ' ')} tone={ORDER_TONE[o.status]} /></Row>
            <Muted>{o.store_name} · {o.item_count} {o.item_count === 1 ? 'item' : 'items'}</Muted>
            <Muted>{new Date(o.created_at).toLocaleString()}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
