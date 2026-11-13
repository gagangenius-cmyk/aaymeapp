import React, { useState } from 'react';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { mediaUrl } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const LABEL: Record<string, string> = { branding: 'Branding', expiry_pickup: 'Expired goods taken back', return_pickup: 'Returned goods taken back' };

/** Everyone sees the same field record: the distributor in the office, the salesperson who did it, and the retailer it is about. */
export default function FieldRecords() {
  const [kind, setKind] = useState('');
  const { role } = useAuth();
  const router = useRouter();
  const [find, setFind] = useState('');
  const q = useGet<any>('/field/logs', { kind: kind || undefined, limit: 60 });
  // the shops this person can record something at: a team member's own retailers, or all of the distributor's
  const shops = useGet<any>('/distributor/retailers', { mine: role === 'employee' ? '1' : '0' });
  const t = find.trim().toLowerCase(); const digits = t.replace(/\D/g, '');
  const matches = (shops.data?.retailers ?? []).filter((r: any) => !t || `${r.shop_name ?? ''} ${r.name ?? ''}`.toLowerCase().includes(t) || (digits.length > 0 && String(r.phone ?? '').includes(digits)));
  return (
    <Screen onRefresh={() => { q.refetch(); shops.refetch(); }} refreshing={q.isRefetching}>
      <Card>
        <H2>Record at a shop</H2>
        <Muted>Choose the shop, then add a branding photo, or expired or returned goods you took back.</Muted>
        <Field label="Search retailer" value={find} onChangeText={setFind} placeholder="Shop name, owner name or phone number" />
        {shops.isLoading ? <Loading /> : shops.error ? <ErrorBox error={shops.error} retry={shops.refetch} /> : !matches.length ? <Muted>{(shops.data?.retailers ?? []).length ? 'No retailer matches your search.' : 'No retailers yet.'}</Muted> :
          matches.slice(0, 8).map((r: any) => (
            <Row key={r.id} style={{ justifyContent: 'space-between' }}>
              <Body style={{ flex: 1, fontWeight: '700' }}>{r.shop_name}</Body>
              <Button small variant="ghost" title="Record" onPress={() => router.push({ pathname: '/field/log', params: { retailer_id: String(r.id), name: r.shop_name } })} />
            </Row>
          ))}
        {matches.length > 8 && <Muted>Showing 8 of {matches.length}. Type more of the name or number to narrow it down.</Muted>}
      </Card>
      <H2>Records</H2>
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
