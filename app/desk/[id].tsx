import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/lib/auth';
import { colors } from '../../src/lib/theme';
import { useGet, useSend } from '../../src/lib/hooks';
import { TicketFiles } from '../../src/ui/TicketFiles';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/** One ticket from the agent's side: reply, internal note, take, set priority, resolve, reopen. */
export default function DeskTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const q = useGet<any>(`/support/desk/tickets/${id}`);
  const agents = useGet<any>('/support/desk/agents', undefined, session?.role === 'admin');
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [wait, setWait] = useState(false);
  const inv = [`/support/desk/tickets/${id}`, '/support/desk/tickets'];
  const base = `/support/desk/tickets/${id}`;
  const reply = useSend<any>(`${base}/messages`, { invalidate: inv, onDone: () => setText('') });
  const assign = useSend<{ assignee_id: number | null }>(`${base}/assign`, { invalidate: inv });
  const patch = useSend<any>(base, { method: 'PUT', invalidate: inv });
  const resolve = useSend<{ note: string }>(`${base}/resolve`, { invalidate: inv });
  const reopen = useSend<any>(`${base}/reopen`, { invalidate: inv });
  const prompt = usePrompt();

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const t = q.data.ticket; const done = t.status === 'resolved' || t.status === 'closed';
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>#{t.id} {t.subject}</H2>
        <Muted>{t.requester} ({t.requester_role}) · {t.category}{t.order_id ? ` · order #${t.order_id}` : ''}</Muted>
        <Row><Chip label={t.status.replace(/_/g, ' ')} /><Chip label={`SLA: ${String(t.sla).replace('_', ' ')}`} tone={t.sla === 'breached' ? 'danger' : t.sla === 'due_soon' ? 'warn' : 'ok'} /></Row>
        <Muted>Assigned: {t.assignee ?? 'nobody'}</Muted>
        {!done && <Row>{PRIORITIES.map((p) => <Chip key={p} label={p} active={t.priority === p} onPress={() => patch.mutate({ priority: p })} />)}</Row>}
        <Row>
          {t.assignee_id !== session?.id && !done && <Button small variant="ghost" title="Take it" onPress={() => assign.mutate({ assignee_id: session!.id })} />}
          {t.assignee_id && !done && <Button small variant="ghost" title="Return to queue" onPress={() => assign.mutate({ assignee_id: null })} />}
          {done ? <Button small variant="ghost" title="Reopen" onPress={() => reopen.mutate({})} /> : <Button small title="Resolve" onPress={() => prompt.ask({ title: 'Resolve ticket', label: 'What was done? (the customer sees this)', minLength: 3, confirmLabel: 'Resolve', onSubmit: (note) => resolve.mutate({ note }) })} />}
        </Row>
        {session?.role === 'admin' && !done && <Row>{(agents.data?.agents ?? []).map((a: any) => <Chip key={a.id} label={`→ ${a.name}`} onPress={() => assign.mutate({ assignee_id: a.id })} />)}</Row>}
      </Card>
      {q.data.messages.map((m: any) => (
        <View key={m.id} style={{ alignSelf: m.side === 'staff' ? 'flex-end' : 'flex-start', maxWidth: '88%', borderRadius: 14, padding: 10, gap: 2, backgroundColor: m.kind === 'internal' ? '#FFF1CC' : m.side === 'staff' ? colors.blue + '55' : colors.surface2 }}>
          <Muted>{m.kind === 'internal' ? 'Internal · ' : ''}{m.author ?? m.side} · {new Date(m.at).toLocaleString()}</Muted><Body>{m.body}</Body>
        </View>
      ))}
      <TicketFiles ticketId={t.id} attachments={q.data.attachments ?? []} canAdd={!done} refreshKeys={[`/support/desk/tickets/${id}`]} />
      {!done && (<>
        <Field label={internal ? 'Internal note (customer cannot see)' : 'Reply to customer'} value={text} onChangeText={setText} multiline autoCapitalize="sentences" />
        <Toggle label="Internal note" value={internal} onChange={setInternal} />
        {!internal && <Toggle label="Waiting for customer" value={wait} onChange={setWait} />}
        <Button title={internal ? 'Add note' : 'Send reply'} loading={reply.isPending} disabled={!text.trim()} onPress={() => reply.mutate({ body: text.trim(), internal, wait_for_customer: wait && !internal })} />
      </>)}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
