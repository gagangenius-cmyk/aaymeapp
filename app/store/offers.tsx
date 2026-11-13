import React, { useState } from 'react';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Offers shown to customers as banners on their home page and on your store. */
export default function StoreOffers() {
  const q = useGet<any>('/store/offers');
  const [f, setF] = useState<Record<string, string>>({});
  const add = useSend<any>('/store/offers', { invalidate: ['/store/offers'], success: 'Offer added', onDone: () => setF({}) });
  const upd = useSend<{ id: number; is_active?: boolean }>((b) => `/store/offers/${b.id}`, { method: 'PUT', invalidate: ['/store/offers'], silent: true });
  const del = useSend<{ id: number }>((b) => `/store/offers/${b.id}`, { method: 'DELETE', invalidate: ['/store/offers'], success: 'Offer removed' });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>New offer</H2>
        <Field label="Title" value={f.title ?? ''} onChangeText={(v) => setF({ ...f, title: v })} placeholder="e.g. 10% off on all snacks" />
        <Field label="Details (optional)" value={f.description ?? ''} onChangeText={(v) => setF({ ...f, description: v })} />
        <Row><Field label="Starts (YYYY-MM-DD)" value={f.starts_on ?? ''} onChangeText={(v) => setF({ ...f, starts_on: v })} maxLength={10} style={{ minWidth: 150 }} /><Field label="Ends (YYYY-MM-DD)" value={f.ends_on ?? ''} onChangeText={(v) => setF({ ...f, ends_on: v })} maxLength={10} style={{ minWidth: 150 }} /></Row>
        <Button small title="Add offer" loading={add.isPending} disabled={(f.title ?? '').trim().length < 2} onPress={() => add.mutate({ title: f.title.trim(), ...(f.description?.trim() ? { description: f.description.trim() } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(f.starts_on ?? '') ? { starts_on: f.starts_on } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(f.ends_on ?? '') ? { ends_on: f.ends_on } : {}) })} />
      </Card>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.offers.length ? <Empty text="No offers yet" /> :
        q.data.offers.map((o: any) => (
          <Card key={o.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{o.title}</Body><Chip label={o.is_active ? 'Showing' : 'Hidden'} tone={o.is_active ? 'ok' : 'danger'} /></Row>
            {!!o.description && <Muted>{o.description}</Muted>}
            <Row><Button small variant="ghost" title={o.is_active ? 'Hide' : 'Show'} onPress={() => upd.mutate({ id: o.id, is_active: !o.is_active })} /><Button small variant="danger" title="Remove" onPress={() => del.mutate({ id: o.id })} /></Row>
          </Card>
        ))}
    </Screen>
  );
}
