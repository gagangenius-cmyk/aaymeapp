import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { fieldErrors, useGet } from '../../src/lib/hooks';
import { cartTotal, clearCart, setCartQty, useStoreCart } from '../../src/lib/storeCart';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, Field, H2, inr, Muted, Row, Screen } from '../../src/ui/kit';

/** The basket: change quantities, give the delivery address, choose cash on delivery or UPI, and place the order. */
export default function Cart() {
  const router = useRouter();
  const qc = useQueryClient();
  const cart = useStoreCart();
  const me = useGet<any>('/customer/me');
  const store = useGet<any>(`/customer/stores/${cart.store_id}`, undefined, !!cart.store_id);
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'cod' | 'upi'>('cod');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);
  useEffect(() => { if (me.data?.address && !address) setAddress(me.data.address); }, [me.data]);  // eslint-disable-line react-hooks/exhaustive-deps
  const s = store.data?.store;
  const subtotal = cartTotal(cart);
  const fee = s && s.delivery_enabled ? (s.free_delivery_above && subtotal >= Number(s.free_delivery_above) ? 0 : Number(s.delivery_fee)) : 0;

  async function place() {
    if (address.trim().length < 3) return Alert.alert('Delivery address', 'Enter the address the order should be delivered to.');
    setBusy(true);
    try {
      const r = await api<any>('/customer/orders', { body: { retailer_id: cart.store_id, items: cart.lines.map((l) => ({ product_id: l.product_id, qty: l.qty })), payment_method: method, address: address.trim(),
        ...(me.data?.lat != null ? { lat: me.data.lat, lng: me.data.lng } : {}), ...(note.trim() ? { note: note.trim() } : {}) } });
      clearCart(); qc.invalidateQueries({ queryKey: ['/customer/orders'] }); setDone(r);
    } catch (e: any) { Alert.alert('Order not placed', e.message); void fieldErrors; } finally { setBusy(false); }
  }

  if (done) return (
    <Screen>
      <Card>
        <H2>Order placed</H2>
        <Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(done.total)}</Body>
        <Muted>{done.payment_method === 'cod' ? 'Pay in cash when it is delivered.' : 'Pay the store on UPI. The store marks the order paid when the money arrives.'}</Muted>
        {!!done.upi_link && <Button title="Pay with a UPI app" onPress={() => Linking.openURL(done.upi_link).catch(() => Alert.alert('UPI', 'No UPI app was found on this phone.'))} />}
      </Card>
      <Button title="Track my order" onPress={() => router.replace({ pathname: '/customer/order', params: { id: String(done.id) } })} />
    </Screen>
  );
  if (!cart.lines.length) return <Screen><Empty text="Your basket is empty" /></Screen>;
  return (
    <Screen>
      <H2>{cart.store_name}</H2>
      {cart.lines.map((l) => (
        <Card key={l.product_id}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Body style={{ flex: 1, fontWeight: '700' }}>{l.name}</Body>
            <Body style={{ fontWeight: '800' }}>{inr(l.price * l.qty)}</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>{inr(l.price)} per {l.unit}</Muted>
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
              <Button small variant="ghost" title="−" onPress={() => setCartQty({ id: cart.store_id!, name: cart.store_name }, { id: l.product_id, name: l.name, price: l.price, unit: l.unit, stock_qty: l.max }, l.qty - 1)} />
              <Body style={{ minWidth: 22, textAlign: 'center', fontWeight: '800' }}>{l.qty}</Body>
              <Button small variant="ghost" title="+" disabled={l.qty >= l.max} onPress={() => setCartQty({ id: cart.store_id!, name: cart.store_name }, { id: l.product_id, name: l.name, price: l.price, unit: l.unit, stock_qty: l.max }, l.qty + 1)} />
            </Row>
          </Row>
        </Card>
      ))}
      <Field label="Delivery address" value={address} onChangeText={setAddress} multiline style={{ minHeight: 60 }} />
      <Field label="Note for the store (optional)" value={note} onChangeText={setNote} />
      <H2>Payment</H2>
      <Row>
        <Chip label="Cash on delivery" active={method === 'cod'} onPress={() => setMethod('cod')} />
        {!!s?.accepts_upi && <Chip label="UPI" active={method === 'upi'} onPress={() => setMethod('upi')} />}
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><Muted>Items</Muted><Body>{inr(subtotal)}</Body></Row>
        <Row style={{ justifyContent: 'space-between' }}><Muted>Delivery</Muted><Body>{fee ? inr(fee) : 'Free'}</Body></Row>
        <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '800' }}>Total</Body><Body style={{ fontWeight: '800', fontSize: 20 }}>{inr(subtotal + fee)}</Body></Row>
        {s && Number(s.min_order) > subtotal && <Muted style={{ color: '#D93A55' }}>The minimum order here is {inr(s.min_order)}.</Muted>}
      </Card>
      <Button title="Place order" onPress={place} loading={busy} disabled={!s || !s.open_now || Number(s.min_order) > subtotal} />
      {s && !s.open_now && <Muted style={{ color: '#D93A55' }}>This store is closed right now.</Muted>}
    </Screen>
  );
}
