import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { open: 'warn', in_progress: undefined, waiting_customer: 'danger', resolved: 'ok', closed: undefined };

export default function SupportList() {
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const q = useGet<any>('/support/tickets', { status });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Support</H1>
      <Button title="New ticket" onPress={() => router.push('/support/new')} />
      <Row>{[['all', 'All'], ['open', 'Open'], ['done', 'Resolved']].map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.tickets.length ? <Empty text="No tickets" /> :
        q.data.tickets.map((t: any) => (
          <Card key={t.id} onPress={() => router.push({ pathname: '/support/[id]', params: { id: String(t.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>#{t.id} {t.subject}</Body><Chip label={t.status.replace(/_/g, ' ')} tone={TONE[t.status]} /></Row>
            <Muted>{t.category} · {new Date(t.last_activity_at).toLocaleString()}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
