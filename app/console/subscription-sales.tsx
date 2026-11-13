import React, { useState } from 'react';
import { useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';
import { Body, Button, Card, Chip, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const FILTERS: [string, string][] = [['payment_submitted', 'To confirm'], ['open', 'Waiting for payment'], ['paid', 'Paid'], ['refunded', 'Refunded'], ['rejected', 'Rejected'], ['all', 'All']];
const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { paid: 'ok', awaiting_payment: 'warn', payment_submitted: 'warn', rejected: 'danger', refunded: 'danger', cancelled: 'danger' };

/** Admin: confirm or reject the payment a distributor reports for a retailer subscription, and refund a paid one (which ends the plan and takes the commission back). */
export default function SubscriptionSales() {
  const [status, setStatus] = useState('payment_submitted');
  const q = useGet<any>('/admin/subscription-sales', { status });
  const prompt = usePrompt();
  const inv = ['/admin/subscription-sales'];
  const confirm = useSend<{ id: number }>((b) => `/admin/subscription-sales/${b.id}/confirm`, { invalidate: inv, success: 'Confirmed. The plan is active.' });
  const reject = useSend<{ id: number; note?: string }>((b) => `/admin/subscription-sales/${b.id}/reject`, { invalidate: inv, success: 'Rejected' });
  const refund = useSend<{ id: number; note?: string }>((b) => `/admin/subscription-sales/${b.id}/refund`, { invalidate: inv, success: 'Refunded' });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.sales.length ? <Empty text="Nothing here" /> :
        q.data.sales.map((s: any) => (
          <Card key={s.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{s.id} · {s.shop_name ?? s.retailer_name}</Body><Chip label={s.status.replace(/_/g, ' ')} tone={TONE[s.status]} /></Row>
            <Muted>{s.plan_name} · {s.kind} · {inr(s.amount)}</Muted>
            <Muted>Sold by {s.business_name} · {s.retailer_phone}</Muted>
            {s.reference ? <Muted>{s.method?.toUpperCase()} · {s.reference}</Muted> : <Muted>No payment reference yet</Muted>}
            <Muted>Commission {s.commission_percent}%{s.commission_status !== 'none' ? ` = ${inr(s.commission)} (${s.commission_status})` : ''}{s.clawback ? ' · to be recovered' : ''}</Muted>
            {['awaiting_payment', 'payment_submitted'].includes(s.status) && (
              <Row>
                <Button small title="Confirm payment" loading={confirm.isPending} onPress={() => Alert.alert('Confirm payment?', `${inr(s.amount)} for ${s.shop_name ?? s.retailer_name}. The plan starts and the commission is added.`, [{ text: 'Back', style: 'cancel' }, { text: 'Confirm', onPress: () => confirm.mutate({ id: s.id }) }])} />
                <Button small variant="ghost" title="Reject" onPress={() => prompt.ask({ title: 'Reject payment', label: 'Reason (the distributor will see it)', minLength: 0, confirmLabel: 'Reject', onSubmit: (v) => reject.mutate({ id: s.id, ...(v.trim() ? { note: v.trim() } : {}) }) })} />
              </Row>
            )}
            {s.status === 'paid' && <Button small variant="danger" title="Refund / cancel" onPress={() => prompt.ask({ title: 'Refund this sale', label: 'Reason', minLength: 0, confirmLabel: 'Refund', onSubmit: (v) => refund.mutate({ id: s.id, ...(v.trim() ? { note: v.trim() } : {}) }) })} />}
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
