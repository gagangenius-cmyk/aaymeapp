import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Products listed by this employee's distributors wait here; approved ones become visible to retailers. */
export default function ProductReview() {
  const q = useGet<any>('/staff/product-review', { status: 'pending' });
  const [note, setNote] = useState<Record<number, string>>({});
  const review = useSend<{ id: number; action: 'approve' | 'reject'; note?: string }>((b) => `/staff/products/${b.id}/review`, { invalidate: ['/staff/product-review'] });

  const reject = (id: number) => {
    if (!note[id]?.trim()) return Alert.alert('Add a note', 'Tell the distributor what to change.');
    review.mutate({ id, action: 'reject', note: note[id].trim() });
  };

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Products to review</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="Nothing waiting for review" /> :
        q.data.products.map((p: any) => (
          <Card key={p.id}>
            <Body style={{ fontWeight: '700' }}>{p.name}</Body>
            <Muted>{p.distributor} · {p.category ?? 'No category'}{p.brand ? ` · ${p.brand}` : ''} · {inr(p.price)}/{p.unit} · GST {p.gst_rate_bps / 100}%</Muted>
            <Row>{p.new_category && <Chip label="New category" tone="warn" />}{p.new_brand && <Chip label="New brand" tone="warn" />}</Row>
            <Field label="Note (needed to send back)" value={note[p.id] ?? ''} onChangeText={(t) => setNote({ ...note, [p.id]: t })} />
            <Row><Button small title="Approve" onPress={() => review.mutate({ id: p.id, action: 'approve' })} /><Button small variant="danger" title="Send back" onPress={() => reject(p.id)} /></Row>
          </Card>
        ))}
    </Screen>
  );
}
