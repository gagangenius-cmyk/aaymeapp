import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { useGet } from '../../src/lib/hooks';
import { toast } from '../../src/ui/Toast';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Copy products from a distributor's catalogue into the store. Your cost is what you pay (with GST); your selling price is the cost plus your markup. */
export default function StoreImport() {
  const router = useRouter();
  const qc = useQueryClient();
  const stores = useGet<any>('/retailer/stores');
  const all = [stores.data?.primary_distributor, ...(stores.data?.linked_distributors ?? [])].filter(Boolean);
  const [dist, setDist] = useState<number | null>(null);
  useEffect(() => { if (dist === null && all.length) setDist(all[0].id); }, [all.length]);  // eslint-disable-line react-hooks/exhaustive-deps
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [markup, setMarkup] = useState('10');
  const [stock, setStock] = useState('0');
  const [busy, setBusy] = useState(false);
  const q = useGet<any>('/store/distributor-products', { distributor_id: dist ?? undefined, q: text.trim() || undefined }, dist !== null);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  async function run() {
    setBusy(true);
    try {
      const r = await api<any>('/store/products/import', { body: { distributor_id: dist, product_ids: picked, markup_percent: Number(markup) || 0, stock_qty: Number(stock) || 0 } });
      qc.invalidateQueries({ queryKey: ['/store/products'] }); qc.invalidateQueries({ queryKey: ['/store/distributor-products'] });
      toast.success(`${r.added} added${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}`); setPicked([]); if (r.added && !r.skipped.length) goBack(router);
    } catch (e: any) { Alert.alert('Not added', e.message); } finally { setBusy(false); }
  }
  if (stores.isLoading) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      {all.length > 1 && <Row>{all.map((d: any) => <Chip key={d.id} label={d.business_name} active={dist === d.id} onPress={() => { setDist(d.id); setPicked([]); }} />)}</Row>}
      <Card>
        <H2>Your markup</H2>
        <Row><Field label="Markup on your cost (%)" value={markup} onChangeText={setMarkup} keyboardType="decimal-pad" style={{ minWidth: 150 }} /><Field label="Opening stock" value={stock} onChangeText={setStock} keyboardType="number-pad" style={{ minWidth: 120 }} /></Row>
      </Card>
      <Field label="Search the catalogue" value={text} onChangeText={setText} placeholder="Name, brand or barcode" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="No products found" /> :
        q.data.products.map((p: any) => (
          <Card key={p.id} style={picked.includes(p.id) ? { borderColor: '#2874F0' } : undefined} onPress={p.already_in_store ? undefined : () => toggle(p.id)}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ fontWeight: '700', flex: 1 }}>{picked.includes(p.id) ? '✓ ' : ''}{p.name}</Body>{p.already_in_store ? <Chip label="In your store" tone="ok" /> : <Body style={{ fontWeight: '800' }}>{inr(p.your_cost)}</Body>}</Row>
            <Muted>{p.category ?? ''}{p.brand ? ` · ${p.brand}` : ''} · your cost incl. GST{p.in_stock ? '' : ' · out of stock'}</Muted>
          </Card>
        ))}
      <Button title={`Add ${picked.length || ''} to my store`} loading={busy} disabled={!picked.length} onPress={run} />
    </Screen>
  );
}
