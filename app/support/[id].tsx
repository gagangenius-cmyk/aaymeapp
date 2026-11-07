import React, { useState } from 'react';
import { toast } from '../../src/ui/Toast';
import { View } from 'react-native';
import { Alert } from '../../src/ui/alert';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../../src/lib/theme';
import { useGet, useSend } from '../../src/lib/hooks';
import { TicketFiles } from '../../src/ui/TicketFiles';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

export default function Ticket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useGet<any>(`/support/tickets/${id}`);
  const [text, setText] = useState('');
  const inv = [`/support/tickets/${id}`, '/support/tickets'];
  const reply = useSend<{ body: string }>(`/support/tickets/${id}/messages`, { invalidate: inv, onDone: () => setText('') });
  const close = useSend<any>(`/support/tickets/${id}/close`, { invalidate: inv });
  const rate = useSend<{ rating: number }>(`/support/tickets/${id}/rate`, { invalidate: inv, onDone: () => toast.success('Thanks for rating') });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const t = q.data.ticket;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>#{t.id} {t.subject}</H2><Chip label={t.status.replace(/_/g, ' ')} /></Row>
        <Muted>{t.category} · priority {t.priority}{t.order_id ? ` · order #${t.order_id}` : ''}</Muted>
        {t.resolution_note ? <Muted>Resolution: {t.resolution_note}</Muted> : null}
      </Card>
      {q.data.messages.map((m: any) => (
        <View key={m.id} style={{ alignSelf: m.side === 'customer' ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: m.side === 'customer' ? colors.blue + '55' : colors.surface2, borderRadius: 14, padding: 10, gap: 2 }}>
          <Muted>{m.author ?? m.side} · {new Date(m.at).toLocaleString()}</Muted><Body>{m.body}</Body>
        </View>
      ))}
      <TicketFiles ticketId={t.id} attachments={q.data.attachments ?? []} canAdd={t.can_reply} refreshKeys={[`/support/tickets/${id}`]} />
      {t.can_reply && (<>
        <Field label="Reply" value={text} onChangeText={setText} multiline autoCapitalize="sentences" />
        <Button title="Send" onPress={() => reply.mutate({ body: text.trim() })} loading={reply.isPending} disabled={text.trim().length < 1} />
      </>)}
      {t.can_close && <Button variant="ghost" title="Close ticket" onPress={() => close.mutate({})} />}
      {t.can_rate && <Row><Muted>Rate:</Muted>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={`${n}★`} onPress={() => rate.mutate({ rating: n })} />)}</Row>}
    </Screen>
  );
}
