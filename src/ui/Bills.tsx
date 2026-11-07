import React from 'react';
import { useGet } from '../lib/hooks';
import { Body, Card, Chip, H2, inr, Muted, Row } from './kit';

const TONE: Record<string, 'ok' | 'warn' | 'danger' | undefined> = { paid: 'ok', open: 'warn', partial: 'warn', overdue: 'danger', cancelled: undefined };

/** Bill by bill: what was invoiced, what has been paid against it, and what is still due (oldest payments clear the oldest bills first). */
export function Bills({ query }: { query: { distributor_id?: number; retailer_id?: number } }) {
  const q = useGet<any>('/ledger/invoices', { ...query, status: 'all' }, !!(query.distributor_id || query.retailer_id));
  if (!q.data) return null;
  const t = q.data.totals;
  return (<>
    <H2>Bills</H2>
    <Card>
      <Row style={{ justifyContent: 'space-between' }}><Muted>Invoiced</Muted><Body>{inr(t.invoiced)}</Body></Row>
      <Row style={{ justifyContent: 'space-between' }}><Muted>Received</Muted><Body>{inr(t.received)}</Body></Row>
      <Row style={{ justifyContent: 'space-between' }}><Muted>Outstanding</Muted><Body style={{ color: '#C77700', fontWeight: '700' }}>{inr(t.outstanding)}</Body></Row>
      {Number(t.advance) > 0 && <Row style={{ justifyContent: 'space-between' }}><Muted>Advance paid</Muted><Body>{inr(t.advance)}</Body></Row>}
    </Card>
    {q.data.invoices.map((b: any) => {
      const late = b.days_overdue > 0 && b.status !== 'paid';
      return (
        <Card key={b.entry_id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ fontWeight: '700' }}>{b.invoice_no ?? `Order #${b.order_id}`}</Body>
            <Chip label={late ? `overdue ${b.days_overdue}d` : b.status} tone={late ? 'danger' : TONE[b.status]} />
          </Row>
          <Muted>{new Date(b.date).toLocaleDateString()}{b.due_date ? ` · due ${new Date(b.due_date).toLocaleDateString()}` : ''}</Muted>
          <Muted>Amount {inr(b.amount)} · paid {inr(b.paid)} · due {inr(b.outstanding)}</Muted>
        </Card>
      );
    })}
  </>);
}
