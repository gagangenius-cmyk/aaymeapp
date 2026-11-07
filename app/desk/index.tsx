import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const STATUS = [['active', 'Active'], ['resolved', 'Resolved'], ['all', 'All']];
const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { urgent: 'danger', high: 'warn', normal: undefined, low: undefined };

/** Support desk (admin, or company employee with the support permission): the queue, urgent first. */
export default function Desk() {
  const router = useRouter();
  const { role } = useAuth();
  const [status, setStatus] = useState('active');
  const [mine, setMine] = useState(false);
  const [overdue, setOverdue] = useState(false);
  const [text, setText] = useState('');
  const q = useGet<any>('/support/desk/tickets', { status, assignee: mine ? 'me' : undefined, overdue: overdue ? '1' : '0', q: text.trim() || undefined });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row><Button small variant="ghost" title="Performance" onPress={() => router.push('/desk/stats')} />{role === 'admin' && <Button small variant="ghost" title="SLA & categories" onPress={() => router.push('/desk/settings')} />}</Row>
      <Field label="Search" value={text} onChangeText={setText} placeholder="Ticket no., subject or shop" />
      <Row>
        {STATUS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}
        <Chip label="Mine" active={mine} onPress={() => setMine(!mine)} />
        <Chip label="Overdue" active={overdue} tone={overdue ? 'danger' : undefined} onPress={() => setOverdue(!overdue)} />
      </Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.tickets.length ? <Empty text="Queue is empty" /> :
        q.data.tickets.map((t: any) => (
          <Card key={t.id} onPress={() => router.push({ pathname: '/desk/[id]', params: { id: String(t.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>#{t.id} {t.subject}</Body><Chip label={t.priority} tone={TONE[t.priority]} /></Row>
            <Muted>{t.requester} ({t.requester_role}) · {t.category} · {t.status.replace(/_/g, ' ')}</Muted>
            <Muted>{t.assignee ? `Assigned to ${t.assignee}` : 'Unassigned'}{t.sla === 'breached' ? ' · SLA breached' : t.sla === 'due_soon' ? ' · due soon' : ''}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
