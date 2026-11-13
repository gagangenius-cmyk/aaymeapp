import React from 'react';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** The bill: the store, every item, the total and (for UPI) a QR the customer scans to pay straight into the shop's account. */
export default function Bill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>(`/store/pos/bills/${id}`);
  const inv = [`/store/pos/bills/${id}`, '/store/daybook', '/store/dashboard', '/store/products'];
  const paid = useSend<any>(`/store/pos/bills/${id}/paid`, { invalidate: inv, success: 'Marked as paid' });
  const cancel = useSend<any>(`/store/pos/bills/${id}/cancel`, { invalidate: inv, success: 'Bill cancelled' });
  const b = q.data;
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  const text = [`${b.store.name}`, b.store.address ?? '', `Bill ${b.bill_no}`, new Date(b.created_at).toLocaleString(), '',
    ...b.items.map((i: any) => `${i.name} × ${i.qty}  ${inr(i.line_total)}`), '', Number(b.discount) ? `Discount −${inr(b.discount)}` : '', `Total ${inr(b.total)}`, `Paid by ${b.payment_method.toUpperCase()}`].filter((x, i, a) => x || (a[i - 1] && a[i + 1])).join('\n');
  return (
    <Screen>
      <Card style={{ gap: 6 }}>
        <H2>{b.store.name}</H2>
        {!!b.store.address && <Muted>{b.store.address}{b.store.pincode ? `, ${b.store.pincode}` : ''}</Muted>}
        {!!b.store.phone && <Muted>{b.store.phone}</Muted>}
        <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '800' }}>Bill {b.bill_no}</Body>{b.status === 'cancelled' && <Chip label="Cancelled" tone="danger" />}</Row>
        <Muted>{new Date(b.created_at).toLocaleString()}{b.customer_name ? ` · ${b.customer_name}` : ''}</Muted>
        {b.items.map((i: any) => <Row key={i.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ flex: 1 }}>{i.name} × {i.qty}</Body><Body>{inr(i.line_total)}</Body></Row>)}
        <View style={{ height: 1, backgroundColor: '#E1E7EF', marginVertical: 4 }} />
        <Row style={{ justifyContent: 'space-between' }}><Muted>Items</Muted><Body>{inr(b.subtotal)}</Body></Row>
        {Number(b.discount) > 0 && <Row style={{ justifyContent: 'space-between' }}><Muted>Discount</Muted><Body>− {inr(b.discount)}</Body></Row>}
        <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '800' }}>Total</Body><Body style={{ fontWeight: '800', fontSize: 24 }}>{inr(b.total)}</Body></Row>
        <Muted>{b.payment_method.toUpperCase()} · {b.payment_status === 'paid' ? 'paid' : 'payment pending'}</Muted>
      </Card>
      {b.payment_method === 'upi' && !!b.upi_qr_text && b.status !== 'cancelled' && (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Body style={{ fontWeight: '700' }}>Scan to pay {inr(b.total)}</Body>
          <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12 }}><QRCode value={b.upi_qr_text} size={220} /></View>
          <Muted>The money goes straight into your bank account.</Muted>
        </Card>
      )}
      {b.payment_method === 'upi' && !b.upi_qr_text && <Muted style={{ color: '#C77700' }}>Add your UPI id in Store settings to show a payment QR on UPI bills.</Muted>}
      <Row>
        <Button small title="Share bill" onPress={() => Share.share({ message: text })} />
        {b.payment_status !== 'paid' && b.status !== 'cancelled' && <Button small variant="ghost" title="Mark paid" loading={paid.isPending} onPress={() => paid.mutate({})} />}
        {b.status !== 'cancelled' && <Button small variant="danger" title="Cancel bill" onPress={() => Alert.alert('Cancel this bill?', `${b.bill_no} will be cancelled and the stock returned.`, [{ text: 'Back', style: 'cancel' }, { text: 'Cancel bill', style: 'destructive', onPress: () => cancel.mutate({}) }])} />}
      </Row>
      <Button title="New bill" onPress={() => router.replace('/store/pos')} />
    </Screen>
  );
}
