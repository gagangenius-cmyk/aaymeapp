import React from 'react';
import { Alert } from './alert';
import { useGet, useSend } from '../lib/hooks';
import { Body, Button, Card, Chip, H2, inr, Muted, Row } from './kit';

const WHEN: Record<string, string> = { order: 'when ordered', accepted: 'when accepted', dispatched: 'when dispatched', delivered: 'on delivery' };
const TONE: Record<string, 'ok' | 'warn' | undefined> = { paid: 'ok', due: 'warn', upcoming: undefined };
const METHODS: { label: string; value: 'upi' | 'bank' | 'cheque' | 'cash' }[] = [
  { label: 'UPI', value: 'upi' }, { label: 'Bank transfer', value: 'bank' }, { label: 'Cheque', value: 'cheque' }, { label: 'Cash', value: 'cash' },
];

/**
 * Staged payments on one order ("30% advance, 70% on delivery"). The distributor sets the schedule and marks parts paid;
 * the retailer sees where they stand. It tracks the agreed schedule: the money itself is still recorded in Khata / Payments.
 */
export function PaymentSchedule({ orderId, role, status }: { orderId: number; role: string; status: string }) {
  const path = `/orders/${orderId}/milestones`;
  const q = useGet<any>(path);
  const isDist = role === 'distributor';
  const closed = status === 'rejected' || status === 'cancelled';
  const inv = [path];
  const setPlan = useSend<{ milestones: any[] }>(path, { method: 'PUT', invalidate: inv, success: 'Payment schedule saved' });
  const markPaid = useSend<{ seq: number; method: string }>((b) => `${path}/${b.seq}/paid`, { invalidate: inv, success: 'Marked as paid' });
  const undo = useSend<{ seq: number }>((b) => `${path}/${b.seq}/paid`, { method: 'DELETE', invalidate: inv, success: 'Back to pending' });

  const d = q.data;
  if (!d || closed) return null;
  const has = d.milestones.length > 0;
  const anyPaid = d.milestones.some((m: any) => m.status === 'paid');
  if (!has && !isDist) return null;                      // nothing agreed: retailers and staff see no empty card

  const pay = (seq: number, label: string, amount: string) => Alert.alert(`${label}: ${inr(amount)}`, 'How was it paid?', [
    ...METHODS.map((m) => ({ text: m.label, onPress: () => markPaid.mutate({ seq, method: m.value }) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  return (
    <>
      <H2>Payment schedule</H2>
      {has && (
        <Card>
          {d.milestones.map((m: any) => (
            <Row key={m.seq} style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
              <Row style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <Body style={{ fontWeight: '700' }}>{m.label} · {inr(m.amount)}</Body>
                <Muted>{`${m.percent}% · due ${WHEN[m.due_event]}${m.status === 'paid' && m.method ? ` · paid by ${m.method}` : ''}`}</Muted>
              </Row>
              <Row style={{ flexWrap: 'nowrap', gap: 6 }}>
                <Chip label={m.status === 'paid' ? 'Paid' : m.status === 'due' ? 'Due' : 'Upcoming'} tone={TONE[m.status]} />
                {isDist && m.status !== 'paid' && <Button small title="Mark paid" onPress={() => pay(m.seq, m.label, m.amount)} loading={markPaid.isPending} />}
                {isDist && m.status === 'paid' && <Button small variant="ghost" title="Undo" onPress={() => undo.mutate({ seq: m.seq })} loading={undo.isPending} />}
              </Row>
            </Row>
          ))}
          <Muted>{`Paid ${inr(d.paid)} of ${inr(d.total)} · ${inr(d.remaining)} to go`}</Muted>
        </Card>
      )}
      {isDist && !anyPaid && (
        <Card>
          <Muted>{has ? 'Change the schedule' : 'Split this order into staged payments'}</Muted>
          <Row>
            {d.presets.map((p: any) => <Button key={p.name} small variant="ghost" title={p.name} loading={setPlan.isPending} onPress={() => setPlan.mutate({ milestones: p.milestones })} />)}
          </Row>
        </Card>
      )}
    </>
  );
}
