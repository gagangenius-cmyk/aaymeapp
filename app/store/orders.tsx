import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const FILTERS: [string, string][] = [['open', 'Open'], ['placed', 'New'], ['accepted', 'Accepted'], ['out_for_delivery', 'On the way'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['', 'All']];
const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { placed: 'warn', delivered: 'ok', cancelled: 'danger', rejected: 'danger' };

/** Online orders from customers: accept, send out, deliver, and mark paid. */
export default function StoreOrders() {
  const params = useLocalSearchParams<{ delivery?: string }>();
  const [status, setStatus] = useState(params.delivery ? 'out_for_delivery' : 'open');
  const [open, setOpen] = useState<number | null>(null);
  const q = useGet<any>('/store/orders', { status: status || undefined, channel: 'online' });
  const detail = useGet<any>(`/store/orders/${open}`, undefined, open !== null);
  const inv = ['/store/orders', '/store/dashboard', `/store/orders/${open}`, '/store/daybook'];
  const move = useSend<{ id: number; to: string }>((b) => `/store/orders/${b.id}/transition`, { invalidate: inv, success: 'Order updated' });
  const paid = useSend<{ id: number }>((b) => `/store/orders/${b.id}/mark-paid`, { invalidate: inv, success: 'Marked as paid' });
  const ask = (id: number, to: string, label: string) => Alert.alert(label, `Order #${id}`, [{ text: 'Back', style: 'cancel' }, { text: label, onPress: () => move.mutate({ id, to }) }]);
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.orders.length ? <Empty text="No orders here" /> :
        q.data.orders.map((o: any) => (
          <Card key={o.id} onPress={() => setOpen(open === o.id ? null : o.id)}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{o.id} · {inr(o.total)}</Body><Chip label={o.status.replace(/_/g, ' ')} tone={TONE[o.status]} /></Row>
            <Muted>{o.customer_name} · {o.customer_phone} · {o.item_count} {o.item_count === 1 ? 'item' : 'items'}</Muted>
            <Muted>{o.payment_method === 'cod' ? 'Cash on delivery' : 'UPI'} · {o.payment_status === 'paid' ? 'paid' : 'payment pending'} · {new Date(o.created_at).toLocaleString()}</Muted>
            {open === o.id && detail.data && (<>
              <H2>Items</H2>
              {detail.data.items.map((i: any) => <Row key={i.id} style={{ justifyContent: 'space-between' }}><Body style={{ flex: 1 }}>{i.name} × {i.qty}</Body><Body>{inr(i.line_total)}</Body></Row>)}
              {!!detail.data.delivery_address && <Muted>Deliver to: {detail.data.delivery_address}</Muted>}
              {!!detail.data.note && <Muted>Note: {detail.data.note}</Muted>}
              <Row>
                {!!o.customer_phone && <Button small variant="ghost" title="Call" onPress={() => Linking.openURL(`tel:${o.customer_phone}`)} />}
                {o.status === 'placed' && <><Button small title="Accept" onPress={() => ask(o.id, 'accepted', 'Accept')} /><Button small variant="danger" title="Reject" onPress={() => ask(o.id, 'rejected', 'Reject')} /></>}
                {o.status === 'accepted' && <Button small title="Out for delivery" onPress={() => ask(o.id, 'out_for_delivery', 'Out for delivery')} />}
                {['accepted', 'out_for_delivery'].includes(o.status) && <Button small title="Delivered" onPress={() => ask(o.id, 'delivered', 'Delivered')} />}
                {['placed', 'accepted', 'out_for_delivery'].includes(o.status) && <Button small variant="ghost" title="Cancel" onPress={() => ask(o.id, 'cancelled', 'Cancel order')} />}
                {o.payment_status !== 'paid' && !['cancelled', 'rejected'].includes(o.status) && <Button small variant="ghost" title="Mark paid" onPress={() => paid.mutate({ id: o.id })} />}
              </Row>
            </>)}
          </Card>
        ))}
    </Screen>
  );
}
