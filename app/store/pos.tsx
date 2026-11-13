import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { toast } from '../../src/ui/Toast';
import { Alert } from '../../src/ui/alert';
import { Scanner, PRODUCT_CODES } from '../../src/ui/Scanner';
import { Body, Button, Card, Chip, Empty, Field, H2, inr, Muted, Row, Screen } from '../../src/ui/kit';

interface Line { product: any; qty: number }
const MODES: [string, string][] = [['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']];

/** Make a bill at the counter: scan the items one by one, check the basket, choose Cash, Card or UPI, and save. The bill has every item, the total and a UPI QR for the customer. */
export default function Pos() {
  const router = useRouter();
  const qc = useQueryClient();
  const [lines, setLines] = useState<Line[]>([]);
  const [scan, setScan] = useState(false);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const find = useGet<any>('/store/products', { q: text.trim(), status: 'active', limit: 8 }, text.trim().length >= 2);
  const total = lines.reduce((t, l) => t + Number(l.product.price) * l.qty, 0);
  const off = Math.min(Number(discount) || 0, total);

  const add = (p: any) => setLines((ls) => { const i = ls.findIndex((l) => l.product.id === p.id); if (i >= 0) { const n = [...ls]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; } return [...ls, { product: p, qty: 1 }]; });
  const setQty = (id: number, qty: number) => setLines((ls) => ls.flatMap((l) => (l.product.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty }])));

  async function scanned(code: string) {
    setScan(false);
    try { add(await api<any>(`/store/products/by-barcode/${encodeURIComponent(code)}`)); }
    catch { Alert.alert('Not in your store', `No product with barcode ${code}.`, [{ text: 'Back', style: 'cancel' }, { text: 'Add it', onPress: () => router.push({ pathname: '/store/product-form', params: { barcode: code } }) }]); }
  }
  async function save() {
    setBusy(true);
    try {
      const bill = await api<any>('/store/pos/bills', { body: { items: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })), payment_mode: mode, ...(off ? { discount: String(off) } : {}),
        ...(name.trim() ? { customer_name: name.trim() } : {}), ...(phone.length === 10 ? { customer_phone: phone } : {}), paid: mode !== 'upi' } });
      qc.invalidateQueries({ queryKey: ['/store/dashboard'] }); qc.invalidateQueries({ queryKey: ['/store/daybook'] }); qc.invalidateQueries({ queryKey: ['/store/products'] });
      toast.success(`Bill ${bill.bill_no} saved`); router.replace({ pathname: '/store/bill', params: { id: String(bill.id) } });
    } catch (e: any) { Alert.alert('Bill not saved', e.message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Row><Button title="Scan an item" onPress={() => setScan(true)} /><Button variant="ghost" title="Day book" onPress={() => router.push('/store/daybook')} /></Row>
      <Field label="Or search by name" value={text} onChangeText={setText} placeholder="Type at least 2 letters" />
      {text.trim().length >= 2 && (find.data?.products ?? []).map((p: any) => (
        <Card key={p.id} onPress={() => { add(p); setText(''); }}><Row style={{ justifyContent: 'space-between' }}><Body style={{ flex: 1, fontWeight: '700' }}>{p.name}</Body><Body>{inr(p.price)}</Body></Row><Muted>Stock {p.stock_qty}</Muted></Card>
      ))}

      <H2>Items in this bill</H2>
      {!lines.length ? <Empty text="Scan the first item" /> : lines.map((l) => (
        <Card key={l.product.id}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ flex: 1, fontWeight: '700' }}>{l.product.name}</Body><Body style={{ fontWeight: '800' }}>{inr(Number(l.product.price) * l.qty)}</Body></Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>{inr(l.product.price)} each</Muted>
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}><Button small variant="ghost" title="−" onPress={() => setQty(l.product.id, l.qty - 1)} /><Body style={{ minWidth: 24, textAlign: 'center', fontWeight: '800' }}>{l.qty}</Body><Button small variant="ghost" title="+" disabled={l.qty >= l.product.stock_qty} onPress={() => setQty(l.product.id, l.qty + 1)} /></Row>
          </Row>
        </Card>
      ))}

      {!!lines.length && (<>
        <Field label="Discount (INR, optional)" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" />
        <H2>Payment</H2>
        <Row>{MODES.map(([k, l]) => <Chip key={k} label={l} active={mode === k} onPress={() => setMode(k)} />)}</Row>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}><Muted>Items</Muted><Body>{inr(total)}</Body></Row>
          {off > 0 && <Row style={{ justifyContent: 'space-between' }}><Muted>Discount</Muted><Body>− {inr(off)}</Body></Row>}
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '800' }}>Total</Body><Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(total - off)}</Body></Row>
        </Card>
        <Row><Field label="Customer name (optional)" value={name} onChangeText={setName} autoCapitalize="words" style={{ minWidth: 160 }} /><Field label="Mobile (optional)" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, ''))} keyboardType="phone-pad" maxLength={10} style={{ minWidth: 140 }} /></Row>
        <Button title="Save and make the bill" onPress={save} loading={busy} />
        <Button variant="ghost" title="Clear" onPress={() => setLines([])} />
      </>)}
      <Scanner visible={scan} types={PRODUCT_CODES} title="Scan an item" onClose={() => setScan(false)} onCode={scanned} />
    </Screen>
  );
}
