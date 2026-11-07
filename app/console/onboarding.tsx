import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';

const FILTERS = [['payment_submitted', 'To confirm'], ['awaiting_payment', 'Awaiting payment'], ['completed', 'Completed'], ['failed', 'Failed'], ['all', 'All']];

/** Admin: onboarding requests from company employees. Confirming a UPI payment creates the distributor and starts its subscription timer. */
export default function AdminOnboarding() {
  const [status, setStatus] = useState('payment_submitted');
  const q = useGet<any>('/admin/onboarding', { status });
  const confirm = useSend<{ id: number }>((b) => `/admin/onboarding/${b.id}/confirm`, { invalidate: ['/admin/onboarding', '/admin/distributors'] });
  const reject = useSend<{ id: number; note: string }>((b) => `/admin/onboarding/${b.id}/reject`, { invalidate: ['/admin/onboarding'] });
  const prompt = usePrompt();
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.requests.length ? <Empty text="Nothing here" /> :
        q.data.requests.map((r: any) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{r.business_name}</Body><Chip label={r.status.replace('_', ' ')} tone={r.status === 'completed' ? 'ok' : r.status === 'failed' ? 'danger' : 'warn'} /></Row>
            <Muted>{r.owner_name} · {r.phone} · by {r.created_by_name}</Muted>
            <Muted>{r.plan_name} {r.days}d · {inr(r.amount)} · {r.method}{r.utr ? ` · UTR ${r.utr}` : ''}</Muted>
            {r.error ? <Muted style={{ color: '#D93A55' }}>{r.error}</Muted> : null}
            {r.status === 'payment_submitted' && r.method === 'upi' && (
              <Row>
                <Button small title="Confirm & create" onPress={() => Alert.alert('Create distributor?', `${inr(r.amount)} · UTR ${r.utr}\nConfirm only after seeing this in the bank account.`, [{ text: 'Back', style: 'cancel' }, { text: 'Create', onPress: () => confirm.mutate({ id: r.id }) }])} />
                <Button small variant="danger" title="Reject" onPress={() => prompt.ask({ title: 'Reject payment', label: 'Reason', minLength: 3, danger: true, confirmLabel: 'Reject', onSubmit: (note) => reject.mutate({ id: r.id, note }) })} />
              </Row>
            )}
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
