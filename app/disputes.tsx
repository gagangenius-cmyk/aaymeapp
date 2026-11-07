import React from 'react';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';
import { PromptModal, usePrompt } from '../src/ui/PromptModal';

/** Khata disputes. Retailers raise them from an entry; the distributor either reverses the entry or explains why it stands. */
export default function Disputes() {
  const { role } = useAuth();
  const q = useGet<any>('/ledger/disputes');
  const resolve = useSend<{ id: number; action: 'reverse' | 'reject'; note?: string }>((b) => `/ledger/disputes/${b.id}/resolve`, { invalidate: ['/ledger/disputes', '/ledger/statement'] });
  const prompt = usePrompt();
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.disputes.length ? <Empty text="No disputes" /> :
        q.data.disputes.map((d: any) => (
          <Card key={d.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{d.shop_name ?? d.business_name} · {inr(d.amount)}</Body><Chip label={d.status} tone={d.status === 'open' ? 'warn' : 'ok'} /></Row>
            <Muted>{d.type.replace(/_/g, ' ')} · {new Date(d.entry_at).toLocaleDateString()}</Muted>
            <Muted>Reason: {d.reason}</Muted>
            {d.resolution_note ? <Muted>Answer: {d.resolution_note}</Muted> : null}
            {role === 'distributor' && d.status === 'open' && (
              <Row>
                <Button small title="Reverse entry" onPress={() => resolve.mutate({ id: d.id, action: 'reverse', note: 'Entry reversed' })} />
                <Button small variant="ghost" title="Entry stands" onPress={() => prompt.ask({ title: 'Entry stands', label: 'Explain to the retailer', minLength: 3, onSubmit: (note) => resolve.mutate({ id: d.id, action: 'reject', note }) })} />
              </Row>
            )}
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
