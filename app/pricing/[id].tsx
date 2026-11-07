import React, { useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { Alert } from '../../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { api } from '../../src/lib/api';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

/** One price list: who it applies to, and the price (fixed or % off) per product and quantity. */
export default function PriceListDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>(`/pricing/lists/${id}`);
  const products = useGet<any>('/catalog', { limit: 100 });
  const retailers = useGet<any>('/distributor/retailers');
  const hist = useGet<any>(`/pricing/lists/${id}/history`);
  const inv = [`/pricing/lists/${id}`, '/pricing/lists'];
  const [pid, setPid] = useState<number | null>(null);
  const [mode, setMode] = useState<'price' | 'percent_off'>('price');
  const [val, setVal] = useState('');
  const [minQty, setMinQty] = useState('1');
  const [qRetailer, setQRetailer] = useState<number | null>(null);
  const [qProduct, setQProduct] = useState<number | null>(null);
  const [qQty, setQQty] = useState('1');
  const [quote, setQuote] = useState<any>(null);
  const runQuote = () => api('/pricing/quote', { query: { retailer_id: qRetailer!, product_id: qProduct!, qty: Number(qQty) || 1 } }).then(setQuote).catch((e) => Alert.alert('No price', e.message));
  const [pick, setPick] = useState<number[] | null>(null);
  const addItem = useSend<any>(`/pricing/lists/${id}/items`, { invalidate: inv, success: 'Price added', onDone: () => { setVal(''); setPid(null); } });
  const delItem = useSend<{ itemId: number }>((b) => `/pricing/lists/${id}/items/${b.itemId}`, { method: 'DELETE', invalidate: inv });
  const setMembers = useSend<{ retailer_ids: number[] }>(`/pricing/lists/${id}/members`, { method: 'PUT', invalidate: inv, success: 'Members saved', onDone: () => setPick(null) });
  const patch = useSend<any>(`/pricing/lists/${id}`, { method: 'PUT', invalidate: inv });
  const del = useSend<any>(`/pricing/lists/${id}`, { method: 'DELETE', invalidate: ['/pricing/lists'], success: 'Price list deleted', onDone: () => goBack(router) });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const l = q.data;
  const members: number[] = pick ?? l.member_list.map((m: any) => m.id);

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>{l.name}</H2><Chip label={l.kind} /></Row>
        <Muted>Priority {l.priority}{l.valid_from ? ` · from ${l.valid_from}` : ''}{l.valid_to ? ` · to ${l.valid_to}` : ''}{l.pincode_prefixes.length ? ` · pincodes ${l.pincode_prefixes.join(', ')}` : ''}</Muted>
        <Toggle label="Active" value={l.is_active} onChange={(v) => patch.mutate({ is_active: v })} />
        <Toggle label="Allow prices above standard" value={l.allow_above_standard} onChange={(v) => patch.mutate({ allow_above_standard: v })} />
      </Card>

      <H2>Prices</H2>
      {l.item_list.map((i: any) => (
        <Card key={i.id}>
          <Body style={{ fontWeight: '700' }}>{i.name}</Body>
          <Muted>Standard {inr(i.standard_price)}/{i.unit} → {i.price != null ? inr(i.price) : `${i.percent_off}% off`} from {i.min_qty}+</Muted>
          <Button small variant="danger" title="Remove" onPress={() => delItem.mutate({ itemId: i.id })} />
        </Card>
      ))}
      <Card>
        <Muted>Add a price</Muted>
        <Row style={{ maxHeight: 120 }}>{(products.data?.products ?? []).slice(0, 40).map((p: any) => <Chip key={p.id} label={p.display_name} active={pid === p.id} onPress={() => setPid(p.id)} />)}</Row>
        <Row><Chip label="Fixed price" active={mode === 'price'} onPress={() => setMode('price')} /><Chip label="% off" active={mode === 'percent_off'} onPress={() => setMode('percent_off')} /></Row>
        <Row>
          <Field label={mode === 'price' ? 'Price (INR)' : 'Percent off'} value={val} onChangeText={setVal} keyboardType="decimal-pad" style={{ minWidth: 120 }} />
          <Field label="From qty" value={minQty} onChangeText={setMinQty} keyboardType="number-pad" style={{ minWidth: 90 }} />
        </Row>
        <Button small title="Add" disabled={!pid || !val} loading={addItem.isPending} onPress={() => addItem.mutate({ product_id: pid, min_qty: Number(minQty) || 1, ...(mode === 'price' ? { price: val } : { percent_off: Number(val) }) })} />
      </Card>

      {l.kind !== 'regional' && (<>
        <H2>Retailers on this list ({members.length})</H2>
        <Row>{(retailers.data?.retailers ?? []).map((r: any) => (
          <Chip key={r.id} label={r.shop_name} active={members.includes(r.id)} onPress={() => setPick(members.includes(r.id) ? members.filter((x) => x !== r.id) : [...members, r.id])} />
        ))}</Row>
        {pick && <Button small title="Save retailers" loading={setMembers.isPending} onPress={() => setMembers.mutate({ retailer_ids: pick })} />}
      </>)}

      <Card>
        <H2>Preview a price</H2>
        <Muted>See exactly what a retailer would pay today, and which list wins.</Muted>
        <Row>{(retailers.data?.retailers ?? []).map((r: any) => <Chip key={r.id} label={r.shop_name} active={qRetailer === r.id} onPress={() => setQRetailer(r.id)} />)}</Row>
        <Row>{(products.data?.products ?? []).slice(0, 30).map((p: any) => <Chip key={p.id} label={p.display_name} active={qProduct === p.id} onPress={() => setQProduct(p.id)} />)}</Row>
        <Row><Field label="Quantity" value={qQty} onChangeText={setQQty} keyboardType="number-pad" style={{ minWidth: 100 }} /><Button small title="Preview" disabled={!qRetailer || !qProduct} onPress={runQuote} /></Row>
        {quote && (<>
          <Body style={{ fontWeight: '800', fontSize: 18 }}>{inr(quote.unit_price)} each <Muted>(standard {inr(quote.standard_price)})</Muted></Body>
          <Muted>{quote.applied ? `Won by "${quote.applied.name}" (${quote.applied.kind})` : 'No list applies: standard or quantity price'}</Muted>
          {quote.considered.map((c: any, i: number) => <Muted key={i}>{c.winner ? '✓ ' : '· '}{c.list_name ?? c.name ?? 'list'}: {inr(c.unit_price)}</Muted>)}
        </>)}
      </Card>

      <H2>History</H2>
      {hist.data?.entries.slice(0, 10).map((h: any) => <Muted key={h.id}>{new Date(h.at).toLocaleString()} · {h.action}</Muted>)}
      <Button variant="danger" title="Delete list" onPress={() => Alert.alert('Delete price list?', l.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate({}) }])} />
    </Screen>
  );
}
