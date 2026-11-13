import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Scanner, PRODUCT_CODES } from '../../src/ui/Scanner';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const FILTERS: [string, string][] = [['all', 'All'], ['active', 'On sale'], ['low', 'Low stock'], ['out', 'Out of stock'], ['hidden', 'Hidden']];

/** The store's products: search (or scan a barcode), filter, add your own, or copy from your distributor's catalogue. */
export default function StoreProducts() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('all');
  const [scan, setScan] = useState(false);
  const q = useGet<any>('/store/products', { q: text.trim() || undefined, status });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>
        <Button title="Add product" onPress={() => router.push('/store/product-form')} />
        <Button variant="ghost" title="From my distributor" onPress={() => router.push('/store/import')} />
      </Row>
      <Row style={{ alignItems: 'flex-end' }}>
        <Field label="Search" value={text} onChangeText={setText} placeholder="Name, brand, SKU or barcode" style={{ minWidth: 200 }} />
        <Button small variant="ghost" title="Scan" onPress={() => setScan(true)} />
      </Row>
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="No products yet. Add your own, or copy some from your distributor." /> :
        q.data.products.map((p: any) => (
          <Card key={p.id} onPress={() => router.push({ pathname: '/store/product-form', params: { id: String(p.id) } })}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ fontWeight: '700', flex: 1 }}>{p.name}</Body><Body style={{ fontWeight: '800' }}>{inr(p.price)}</Body></Row>
            <Muted>{p.category ?? 'No category'}{p.barcode ? ` · ${p.barcode}` : ''}{p.imported ? ' · from distributor' : ''}</Muted>
            <Muted style={{ color: p.stock_qty <= 0 ? '#D93A55' : undefined }}>Stock {p.stock_qty}{p.is_active ? '' : ' · hidden'}{p.cost ? ` · cost ${inr(p.cost)}` : ''}</Muted>
          </Card>
        ))}
      <Scanner visible={scan} types={PRODUCT_CODES} title="Scan a product barcode" onClose={() => setScan(false)} onCode={(c) => { setScan(false); setText(c); }} />
      <H2>{' '}</H2>
    </Screen>
  );
}
