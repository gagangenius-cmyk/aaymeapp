import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { markSeen } from '../../src/ui/NotificationBell';
import { Body, Card, Empty, ErrorBox, Loading, Muted, Screen } from '../../src/ui/kit';

/** Offers from the customer's stores, newest first. Tapping one opens that store. */
export default function CustomerNotifications() {
  const router = useRouter();
  const q = useGet<any>('/customer/notifications');
  const newest = q.data?.items?.[0]?.id as number | undefined;
  useEffect(() => { if (newest) markSeen(newest); }, [newest]);
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.items.length ? <Empty text="No offers from your stores yet" /> :
        q.data.items.map((x: any) => (
          <Card key={x.id} onPress={() => router.push({ pathname: '/customer/store', params: { id: String(x.retailer_id) } })}>
            <Muted>{x.store_name} · {new Date(x.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Muted>
            <Body style={{ fontWeight: '800' }}>{x.title}</Body>
            {!!x.description && <Muted>{x.description}</Muted>}
          </Card>
        ))}
    </Screen>
  );
}
