import React, { useState } from 'react';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { ProductHistory } from '../../src/ui/ProductHistory';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';
import { Body, Button, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

const FILTERS = ['pending', 'rejected', 'approved'];

/** Admin: products waiting for approval before retailers can see them, and the switch that makes approval mandatory for everyone. */
export default function AdminProducts() {
  const [status, setStatus] = useState('pending');
  const settings = useGet<any>('/admin/catalog-settings');
  const q = useGet<any>('/admin/product-review', { status });
  const prompt = usePrompt();
  const setApproval = useSend<{ product_approval_required: boolean }>('/admin/catalog-settings', { method: 'PUT', invalidate: ['/admin/catalog-settings'], success: 'Setting saved' });
  const review = useSend<{ id: number; action: 'approve' | 'reject'; note?: string }>((b) => `/admin/products/${b.id}/review`, { invalidate: ['/admin/product-review', '/admin/catalog-settings'] });
  return (
    <Screen onRefresh={() => { q.refetch(); settings.refetch(); }} refreshing={q.isRefetching}>
      {settings.data && (
        <Card>
          <Toggle label="Every new product needs approval" help={`${settings.data.pending_review} waiting for review. When off, products go live as soon as they are saved.`}
            value={settings.data.product_approval_required} onChange={(v) => Alert.alert(v ? 'Require approval?' : 'Turn approval off?', v ? 'New products stay hidden until approved.' : 'New products will go live immediately.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', onPress: () => setApproval.mutate({ product_approval_required: v }) }])} />
        </Card>
      )}
      <Row>{FILTERS.map((s) => <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="Nothing here" /> :
        q.data.products.map((p: any) => (
          <Card key={p.id}>
            <Body style={{ fontWeight: '700' }}>{p.name}</Body>
            <Muted>{p.distributor} · {p.category ?? 'No category'}{p.brand ? ` · ${p.brand}` : ''} · {inr(p.price)}/{p.unit} · GST {p.gst_rate_bps / 100}%</Muted>
            <Row>{p.new_category && <Chip label="New category" tone="warn" />}{p.new_brand && <Chip label="New brand" tone="warn" />}</Row>
            {p.review_note ? <Muted>Note: {p.review_note}</Muted> : null}
            <Row>
              {p.review_status !== 'approved' && <Button small title="Approve" onPress={() => review.mutate({ id: p.id, action: 'approve' })} />}
              {p.review_status !== 'rejected' && <Button small variant="danger" title="Send back" onPress={() => prompt.ask({ title: 'Send back', label: 'What should change?', minLength: 3, danger: true, confirmLabel: 'Send back', onSubmit: (note) => review.mutate({ id: p.id, action: 'reject', note }) })} />}
            </Row>
            <ProductHistory productId={p.id} base="/admin/products" />
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
