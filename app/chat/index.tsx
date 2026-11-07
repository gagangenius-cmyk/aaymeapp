import React from 'react';
import { AppText as Text } from '../../src/ui/AppText';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';
import { colors } from '../../src/lib/theme';


/** Conversations between a retailer and each connected distributor. */
export default function ChatList() {
  const { role } = useAuth();
  const router = useRouter();
  const q = useGet<any>('/chat/conversations');
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Chat</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.conversations.length ? <Empty text="No conversations yet" /> :
        q.data.conversations.map((c: any) => (
          <Card key={`${c.distributor_id}-${c.retailer_id}`} onPress={() => router.push({ pathname: '/chat/thread', params: { distributor_id: String(c.distributor_id), retailer_id: String(c.retailer_id), name: role === 'retailer' ? c.business_name : c.shop_name } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700' }}>{role === 'retailer' ? c.business_name : c.shop_name}</Body>
              {c.unread > 0 && <Text style={{ color: '#fff', backgroundColor: colors.blue, borderRadius: 99, paddingHorizontal: 8, overflow: 'hidden' }}>{c.unread}</Text>}
            </Row>
            <Muted>{c.last_body ?? 'No messages yet'}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
