import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';

const FILTERS = ['pending', 'confirmed', 'rejected', 'all'];

/** Admin: distributor subscription renewals paid by UPI. Confirm only after checking the UTR in the company bank account. */
export default function SubPayments() {
  const [status, setStatus] = useState('pending');
  const q = useGet<any>('/admin/subscription-payments', { status });
  const confirm = useSend<{ id: number }>((b) => `/admin/subscription-payments/${b.id}/confirm`, { invalidate: ['/admin/subscription-payments'] });
  const reject = useSend<{ id: number; note?: string }>((b) => `/admin/subscription-payments/${b.id}/reject`, { invalidate: ['/admin/subscription-payments'] });
  const prompt = usePrompt();
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{FILTERS.map((s) => <Chip key={s} label={s} active={status === s} onPress={() => setStatus(s)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.payments.length ? <Empty text="Nothing here" /> :
        q.data.payments.map((p: any) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{p.business_name}</Body><Chip label={p.status} tone={p.status === 'confirmed' ? 'ok' : p.status === 'pending' ? 'warn' : 'danger'} /></Row>
            <Muted>{p.plan_name} · {p.days} days · {inr(p.amount)} · {p.method.toUpperCase()}</Muted>
            <Muted>UTR {p.utr ?? '-'} · {new Date(p.created_at).toLocaleString()}</Muted>
            {p.status === 'pending' && p.method === 'upi' && (
              <Row>
                <Button small title="Confirm" onPress={() => Alert.alert('Confirm payment?', `${inr(p.amount)} · UTR ${p.utr}\nThis extends ${p.business_name} by ${p.days} days.`, [{ text: 'Back', style: 'cancel' }, { text: 'Confirm', onPress: () => confirm.mutate({ id: p.id }) }])} />
                <Button small variant="danger" title="Not found" onPress={() => prompt.ask({ title: 'Reject payment', label: 'Reason (sent to the distributor)', danger: true, confirmLabel: 'Reject', onSubmit: (note) => reject.mutate({ id: p.id, note }) })} />
              </Row>
            )}
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
