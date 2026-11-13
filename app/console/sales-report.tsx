import React from 'react';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';
import { Body, Button, Card, Empty, ErrorBox, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Admin: distributor-wise subscription sales and commission. Pay out what is owed, and open a distributor's own rates and monthly target. */
export default function SalesReport() {
  const router = useRouter();
  const q = useGet<any>('/admin/retailer-sales/report');
  const prompt = usePrompt();
  const payout = useSend<{ distributor_id: number; reference: string }>('/admin/subscription-sales/payouts', { invalidate: ['/admin/retailer-sales/report'], success: 'Commission paid out' });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.distributors.length ? <Empty text="No subscription sales yet" /> :
        q.data.distributors.map((d: any) => (
          <Card key={d.distributor_id}>
            <Body style={{ fontWeight: '700' }}>{d.business_name}</Body>
            <Muted>{d.phone}</Muted>
            <Muted>{d.paid_sales} paid · {inr(d.amount)} · new {d.new}, renewal {d.renewal}, upgrade {d.upgrade}</Muted>
            {d.refunded > 0 && <Muted>{d.refunded} refunded ({inr(d.refunded_amount)})</Muted>}
            {d.open_sales > 0 && <Muted>{d.open_sales} waiting for payment</Muted>}
            <Muted>Commission: to pay {inr(d.commission_pending)} · paid {inr(d.commission_settled)}{Number(d.to_recover) > 0 ? ` · to recover ${inr(d.to_recover)}` : ''}</Muted>
            <Row>
              {Number(d.commission_pending) > 0 && <Button small title={`Pay ${inr(d.commission_pending)}`} onPress={() => prompt.ask({ title: 'Pay out commission', label: 'Payment reference (UTR / transfer id)', minLength: 2, confirmLabel: 'Mark as paid', onSubmit: (v) => payout.mutate({ distributor_id: d.distributor_id, reference: v.trim() }) })} />}
              <Button small variant="ghost" title="Rates & target" onPress={() => router.push({ pathname: '/console/sales-setup', params: { id: String(d.distributor_id), name: d.business_name } })} />
            </Row>
          </Card>
        ))}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
