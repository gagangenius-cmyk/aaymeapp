import React, { useState } from 'react';
import { Alert } from '../src/ui/alert';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, inr, Loading, Muted, Row, Screen, Toggle } from '../src/ui/kit';

/** Returns: retailer sees their requests; distributor approves (credit note + optional restock) or rejects with a reason. */
export default function Returns() {
  const { role } = useAuth();
  const q = useGet<any>('/returns');
  const [note, setNote] = useState<Record<number, string>>({});
  const [restock, setRestock] = useState(true);
  const resolve = useSend<{ id: number; action: 'approve' | 'reject'; note?: string; restock?: boolean }>((b) => `/returns/${b.id}/resolve`, { invalidate: ['/returns'] });
  const canResolve = role === 'distributor';

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Returns</H1>
      {canResolve && <Toggle label="Put approved items back in stock" value={restock} onChange={setRestock} />}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.returns.length ? <Empty text="No returns" /> :
        q.data.returns.map((r: any) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>Return #{r.id} · order #{r.order_id}</Body>
              <Chip label={r.status} tone={r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'danger' : 'warn'} />
            </Row>
            <Muted>{r.shop_name ?? r.business_name} · {inr(r.total)} · {new Date(r.created_at).toLocaleDateString()}</Muted>
            <Muted>Reason: {r.reason}</Muted>
            {r.items.map((i: any) => <Muted key={i.product_id}>• {i.name} × {i.qty}</Muted>)}
            {r.resolution_note ? <Muted>Distributor: {r.resolution_note}</Muted> : null}
            {canResolve && r.status === 'requested' && (<>
              <Field label="Note (required to reject)" value={note[r.id] ?? ''} onChangeText={(t) => setNote({ ...note, [r.id]: t })} />
              <Row>
                <Button small title="Approve" onPress={() => resolve.mutate({ id: r.id, action: 'approve', restock, note: note[r.id]?.trim() || undefined })} />
                <Button small variant="danger" title="Reject" onPress={() => note[r.id]?.trim() ? resolve.mutate({ id: r.id, action: 'reject', note: note[r.id].trim() }) : Alert.alert('Add a note', 'Say why the return is rejected.')} />
              </Row>
            </>)}
          </Card>
        ))}
    </Screen>
  );
}
