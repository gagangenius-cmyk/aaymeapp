import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Offers and schemes from the retailer's distributors. New ones are highlighted, then marked seen. */
export default function RetailerOffers() {
  const router = useRouter();
  const q = useGet<any>('/announcements');
  // opening the list marks what is shown as seen (clears the badge); the highlight stays for this visit
  useEffect(() => { if (q.data?.unread) api('/announcements/seen', { method: 'POST', body: {} }).catch(() => {}); }, [q.data?.unread]);
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Offers</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.offers.length ? <Empty text="No offers right now" /> :
        q.data.offers.map((a: any) => (
          <Card key={a.id} style={a.unread ? { borderColor: '#2874F0' } : undefined} onPress={a.connected ? () => router.push({ pathname: '/store/[id]', params: { id: String(a.distributor_id) } }) : undefined}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{a.title}</Body>{a.unread && <Chip label="New" tone="ok" />}</Row>
            <Body>{a.body}</Body>
            {a.product_name ? <Muted>On: {a.product_name}</Muted> : null}
            <Muted>{a.distributor_name} · {a.valid_until ? `valid until ${String(a.valid_until).slice(0, 10)}` : new Date(a.created_at).toLocaleDateString()}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
