import React from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { placed: 'warn', delivered: 'ok', cancelled: 'danger', rejected: 'danger' };

/** One order from a store: what was bought, where it is, and cancel while the store has not accepted it. */
export default function CustomerOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useGet<any>(`/customer/orders/${id}`);
  const cancel = useSend<any>(`/customer/orders/${id}/cancel`, { invalidate: [`/customer/orders/${id}`, '/customer/orders'], success: 'Order cancelled' });
  const o = q.data;
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>Order #{o.id}</H2><Chip label={o.status.replace(/_/g, ' ')} tone={TONE[o.status]} /></Row>
        <Muted>{o.store_name}</Muted>
        <Muted>{new Date(o.created_at).toLocaleString()}</Muted>
        <Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(o.total)}</Body>
        <Muted>{o.payment_method === 'cod' ? 'Cash on delivery' : 'UPI'} · {o.payment_status === 'paid' ? 'paid' : 'payment pending'}</Muted>
        {!!o.delivery_address && <Muted>Deliver to: {o.delivery_address}</Muted>}
      </Card>
      <H2>Items</H2>
      {o.items.map((i: any) => <Card key={i.id}><Row style={{ justifyContent: 'space-between' }}><Body style={{ flex: 1 }}>{i.name} × {i.qty}</Body><Body style={{ fontWeight: '700' }}>{inr(i.line_total)}</Body></Row></Card>)}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><Muted>Items</Muted><Body>{inr(o.subtotal)}</Body></Row>
        <Row style={{ justifyContent: 'space-between' }}><Muted>Delivery</Muted><Body>{Number(o.delivery_fee) ? inr(o.delivery_fee) : 'Free'}</Body></Row>
      </Card>
      <Row>
        {!!o.store_phone && <Button small variant="ghost" title="Call the store" onPress={() => Linking.openURL(`tel:${o.store_phone}`)} />}
        {o.status === 'placed' && <Button small variant="danger" title="Cancel order" loading={cancel.isPending} onPress={() => Alert.alert('Cancel this order?', `Order #${o.id}`, [{ text: 'Back', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => cancel.mutate({}) }])} />}
      </Row>
    </Screen>
  );
}
