import React, { useState } from 'react';
import { toast } from '../src/ui/Toast';
import { Alert } from '../src/ui/alert';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, H2, inr, Loading, Muted, Row, Screen, Stat } from '../src/ui/kit';

/** Distributor: who owes what, ageing buckets, credit terms and payment reminders. */
export default function Collections() {
  const router = useRouter();
  const q = useGet<any>('/collections/receivables');
  const [terms, setTerms] = useState<Record<number, { limit?: string; days?: string }>>({});
  const remind = useSend<{ id: number }>((b) => `/collections/remind/${b.id}`, { invalidate: ['/collections/receivables'], onDone: () => toast.success('Reminder sent') });
  const save = useSend<{ id: number; credit_limit?: string | null; credit_days?: number }>((b) => `/collections/terms/${b.id}`, { method: 'PUT', invalidate: ['/collections/receivables'], onDone: () => toast.success('Terms saved') });
  const t = q.data?.totals;

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Collections</H1>
      <Button small variant="ghost" title="Payment reconciliation" onPress={() => router.push({ pathname: '/recon', params: { path: '/collections/reconciliation' } })} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Row><Stat label="Total due" value={inr(t.total_due)} tone="warn" /><Stat label="Overdue" value={inr(t.overdue)} tone={Number(t.overdue) ? 'danger' : undefined} /></Row>
        <Row><Stat label="1-30 days" value={inr(t.d1_30)} /><Stat label="31-60" value={inr(t.d31_60)} /></Row>
        <Row><Stat label="61-90" value={inr(t.d61_90)} /><Stat label="90+" value={inr(t.d90_plus)} /></Row>
        {!q.data.retailers.length ? <Empty text="No retailers with dues" /> : q.data.retailers.map((r: any) => {
          const e = terms[r.retailer_id] ?? {};
          return (
            <Card key={r.retailer_id}>
              <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{r.shop_name}</Body>{Number(r.overdue) > 0 && <Chip label={`Overdue ${inr(r.overdue)}`} tone="danger" />}</Row>
              <Muted>{r.phone} · due {inr(r.total_due)} · limit {r.credit_limit == null ? 'none' : inr(r.credit_limit)} · {r.credit_days} days</Muted>
              <Row>
                <Field label="Credit limit" value={e.limit ?? ''} onChangeText={(v) => setTerms({ ...terms, [r.retailer_id]: { ...e, limit: v } })} keyboardType="decimal-pad" style={{ minWidth: 120 }} />
                <Field label="Credit days" value={e.days ?? ''} onChangeText={(v) => setTerms({ ...terms, [r.retailer_id]: { ...e, days: v } })} keyboardType="number-pad" style={{ minWidth: 100 }} />
              </Row>
              <Row>
                <Button small variant="ghost" title="Save terms" disabled={e.limit === undefined && e.days === undefined}
                  onPress={() => save.mutate({ id: r.retailer_id, ...(e.limit !== undefined ? { credit_limit: e.limit.trim() === '' ? null : e.limit.trim() } : {}), ...(e.days ? { credit_days: Number(e.days) } : {}) })} />
                <Button small title="Send reminder" disabled={!r.can_remind || Number(r.total_due) <= 0} onPress={() => remind.mutate({ id: r.retailer_id })} />
              </Row>
              {!r.can_remind && <Muted>Reminded recently (one per 24 hours)</Muted>}
            </Card>
          );
        })}
      </>)}
    </Screen>
  );
}
