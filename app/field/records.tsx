import React, { useState } from 'react';
import { Image } from 'react-native';
import { mediaUrl } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const LABEL: Record<string, string> = { branding: 'Branding', expiry_pickup: 'Expired goods taken back', return_pickup: 'Returned goods taken back' };

/** Everyone sees the same field record: the distributor in the office, the salesperson who did it, and the retailer it is about. */
export default function FieldRecords() {
  const [kind, setKind] = useState('');
  const q = useGet<any>('/field/logs', { kind: kind || undefined, limit: 60 });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{[['', 'All'], ['branding', 'Branding'], ['expiry_pickup', 'Expired'], ['return_pickup', 'Returns']].map(([v, l]) => <Chip key={v} label={l} active={kind === v} onPress={() => setKind(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.logs.length ? <Empty text="No records yet" /> :
        q.data.logs.map((l: any) => (
          <Card key={l.id}>
            <Body style={{ fontWeight: '700' }}>{LABEL[l.kind] ?? l.kind}{l.title ? ` · ${l.title}` : ''}</Body>
            <Muted>{l.shop_name} · by {l.employee_name} · {new Date(l.created_at).toLocaleString()}</Muted>
            {l.product_name ? <Muted>{l.product_name} × {l.qty}</Muted> : null}
            {l.note ? <Muted>{l.note}</Muted> : null}
            {l.photo_url ? <Image source={{ uri: mediaUrl(l.photo_url) ?? undefined }} style={{ width: '100%', height: 200, borderRadius: 8 }} resizeMode="cover" /> : null}
          </Card>
        ))}
    </Screen>
  );
}
