import React, { useRef, useState } from 'react';
import { goBack } from '../src/lib/nav';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '../src/lib/api';
import { useGet } from '../src/lib/hooks';
import { Body, Button, Card, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Retailer: ask to return part of a delivered order. */
export default function ReturnNew() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const order = useGet<any>(`/orders/${order_id}`);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey()).current;

  if (order.isLoading) return <Loading />;
  if (order.error) return <ErrorBox error={order.error} retry={order.refetch} />;
  const items = Object.entries(qty).filter(([, q]) => q > 0).map(([product_id, q]) => ({ product_id: Number(product_id), qty: q }));

  async function submit() {
    setBusy(true);
    try {
      await api('/returns', { body: { order_id: Number(order_id), reason: reason.trim(), items }, idempotent: key });
      qc.invalidateQueries({ queryKey: ['/returns'] });
      Alert.alert('Request sent', 'The distributor will review your return.'); goBack(router);
    } catch (e: any) { Alert.alert('Could not send', e.message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <H2>Return from order #{order_id}</H2>
      {order.data.items.map((i: any) => (
        <Card key={i.product_id}>
          <Body>{i.name}</Body><Muted>Delivered: {i.qty}</Muted>
          <Row>
            <Button small variant="ghost" title="−" onPress={() => setQty({ ...qty, [i.product_id]: Math.max(0, (qty[i.product_id] ?? 0) - 1) })} />
            <Body style={{ minWidth: 28, textAlign: 'center' }}>{qty[i.product_id] ?? 0}</Body>
            <Button small variant="ghost" title="+" onPress={() => setQty({ ...qty, [i.product_id]: Math.min(i.qty, (qty[i.product_id] ?? 0) + 1) })} />
          </Row>
        </Card>
      ))}
      <Field label="Reason" value={reason} onChangeText={setReason} multiline style={{ minHeight: 70 }} autoCapitalize="sentences" />
      <Button title="Send return request" onPress={submit} loading={busy} disabled={!items.length || reason.trim().length < 3} />
    </Screen>
  );
}
