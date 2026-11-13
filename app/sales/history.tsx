import React, { useState } from 'react';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const FILTERS: [string, string][] = [['', 'All'], ['awaiting_payment', 'Waiting for payment'], ['payment_submitted', 'To confirm'], ['paid', 'Paid'], ['rejected', 'Rejected'], ['refunded', 'Refunded']];
const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { paid: 'ok', awaiting_payment: 'warn', payment_submitted: 'warn', rejected: 'danger', refunded: 'danger', cancelled: 'danger' };
const KIND: Record<string, string> = { new: 'New', renewal: 'Renewal', upgrade: 'Upgrade' };
const METHODS: [string, string][] = [['upi', 'UPI'], ['bank', 'Bank transfer'], ['cheque', 'Cheque'], ['cash', 'Cash']];

/** Every subscription sold, with its payment and commission. A sale that has not been paid yet can get its payment reference here. */
export default function SalesHistory() {
  const [status, setStatus] = useState('');
  const [find, setFind] = useState('');
  const [paying, setPaying] = useState<number | null>(null);
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const q = useGet<any>('/sales/history', { status: status || undefined, q: find.trim() || undefined });
  const pay = useSend<{ id: number; method: string; reference?: string }>((b) => `/sales/${b.id}/payment`, { invalidate: ['/sales/history', '/sales/earnings'], success: 'Sent for confirmation', onDone: () => { setPaying(null); setReference(''); } });
  const cancel = useSend<{ id: number }>((b) => `/sales/${b.id}/cancel`, { invalidate: ['/sales/history'], success: 'Cancelled' });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Field label="Search" value={find} onChangeText={setFind} placeholder="Shop name, owner name or phone number" />
      <Row>{FILTERS.map(([v, l]) => <Chip key={v} label={l} active={status === v} onPress={() => setStatus(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.sales.length ? <Empty text="No sales yet" /> :
        q.data.sales.map((s: any) => (
          <Card key={s.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{s.id} · {s.shop_name ?? s.retailer_name}</Body><Chip label={s.status.replace(/_/g, ' ')} tone={TONE[s.status]} /></Row>
            <Muted>{s.plan_name} · {KIND[s.kind]} · {inr(s.amount)}</Muted>
            <Muted>{s.retailer_name} · {s.retailer_phone} · {new Date(s.created_at).toLocaleDateString()}</Muted>
            {s.reference ? <Muted>{s.method?.toUpperCase()} · {s.reference}</Muted> : null}
            {s.commission_status !== 'none' && <Muted>Commission {s.commission_percent}% = {inr(s.commission)} · {s.commission_status === 'accrued' ? 'to receive' : s.commission_status === 'settled' ? 'paid out' : 'taken back'}{s.clawback ? ' (to be recovered)' : ''}</Muted>}
            {s.decision_note ? <Muted style={{ color: '#D93A55' }}>{s.decision_note}</Muted> : null}
            {['awaiting_payment', 'rejected'].includes(s.status) && (paying === s.id ? (<>
              <H2>Payment details</H2>
              <Row>{METHODS.map(([k, l]) => <Chip key={k} label={l} active={method === k} onPress={() => setMethod(k)} />)}</Row>
              {method !== 'cash' && <Field label="Payment reference" value={reference} onChangeText={setReference} autoCapitalize="characters" />}
              <Row>
                <Button small title="Send for confirmation" loading={pay.isPending} disabled={method !== 'cash' && reference.trim().length < 4} onPress={() => pay.mutate({ id: s.id, method, ...(reference.trim() ? { reference: reference.trim() } : {}) })} />
                <Button small variant="ghost" title="Back" onPress={() => setPaying(null)} />
              </Row>
            </>) : (
              <Row>
                <Button small title="Add payment details" onPress={() => { setPaying(s.id); setReference(''); }} />
                <Button small variant="ghost" title="Cancel sale" onPress={() => cancel.mutate({ id: s.id })} />
              </Row>
            ))}
          </Card>
        ))}
    </Screen>
  );
}
