import React, { useState } from 'react';
import { SearchScan } from '../../src/ui/SearchScan';
import { useRouter } from 'expo-router';
import { mediaUrl } from '../../src/lib/api';
import { ProductImage } from '../../src/ui/ProductImage';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const FILTERS = [['', 'All'], ['active', 'Active'], ['low', 'Low stock'], ['out', 'Out of stock'], ['hidden', 'Hidden']] as const;

/** The distributor's catalog with stock and approval status. "Select" turns on bulk actions for many products at once. */
export default function Catalog() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const prompt = usePrompt();
  const q = useGet<any>('/catalog', { q: text.trim() || undefined, status: status || undefined, limit: 50 });
  const bulk = useSend<{ ids: number[]; action: string; value?: string | number }>('/catalog/bulk/apply', {
    invalidate: ['/catalog'], onDone: () => { setPicked([]); setSelecting(false); }, success: 'Products updated',
  });
  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const run = (action: string, value?: string | number) => bulk.mutate({ ids: picked, action, ...(value !== undefined ? { value } : {}) });
  const ask = (title: string, label: string, action: string, asNumber: boolean) =>
    prompt.ask({ title, label, minLength: 1, confirmLabel: 'Apply', onSubmit: (v) => run(action, asNumber ? Number(v) : v) });

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Products</H1>
      <Row>
        <Button title="Add product" onPress={() => router.push('/product-form')} />
        <Button variant="ghost" title={selecting ? 'Done' : 'Select'} onPress={() => { setSelecting(!selecting); setPicked([]); }} />
      </Row>
      {selecting && (
        <Card>
          <Muted>{picked.length} selected</Muted>
          <Row>
            <Button small variant="ghost" title="Show" disabled={!picked.length} onPress={() => run('activate')} />
            <Button small variant="ghost" title="Hide" disabled={!picked.length} onPress={() => run('deactivate')} />
            <Button small variant="ghost" title="Price ±%" disabled={!picked.length} onPress={() => ask('Change price', 'Percent (e.g. 5 raises, -5 lowers)', 'price_percent', true)} />
            <Button small variant="ghost" title="Add stock" disabled={!picked.length} onPress={() => ask('Add or remove stock', 'Units (negative removes)', 'stock_add', true)} />
            <Button small variant="danger" title="Delete" disabled={!picked.length} onPress={() => Alert.alert('Delete products?', `${picked.length} products will be removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => run('delete') }])} />
          </Row>
        </Card>
      )}
      <Field label="Search" value={text} onChangeText={setText} placeholder="Name, brand, SKU or barcode" />
      <SearchScan onCode={setText} />
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.data?.summary && <Muted>{q.data.summary.total} products · {q.data.summary.low_stock} low · {q.data.summary.out_of_stock} out of stock</Muted>}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="No products" /> :
        q.data.products.map((p: any) => (
          <Card key={p.id} style={picked.includes(p.id) ? { borderColor: '#0A8F4D' } : undefined}
            onPress={() => (selecting ? toggle(p.id) : router.push({ pathname: '/product-form', params: { id: String(p.id) } }))}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              {selecting && <Chip label={picked.includes(p.id) ? '✓' : '○'} active={picked.includes(p.id)} />}
              <ProductImage uri={mediaUrl(p.image_url)} size={64} />
              <Body style={{ fontWeight: '700', flex: 1 }}>{p.display_name}</Body>
              {p.review_status !== 'approved' && <Chip label={p.review_status === 'pending' ? 'Waiting for approval' : 'Rejected'} tone={p.review_status === 'pending' ? 'warn' : 'danger'} />}
            </Row>
            <Muted>{inr(p.price)}/{p.unit} · GST {p.gst_rate_bps / 100}% · MOQ {p.min_order_qty}</Muted>
            <Muted style={{ color: p.stock_qty <= 0 ? '#D93A55' : undefined }}>Stock {p.stock_qty}{p.reserved_qty ? ` (${p.reserved_qty} reserved)` : ''}{p.is_active ? '' : ' · hidden'}</Muted>
            {p.review_note ? <Muted>Reviewer: {p.review_note}</Muted> : null}
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
