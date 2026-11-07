import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';
import { PromptModal, usePrompt } from '../../src/ui/PromptModal';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Admin: commission earned on outside-network orders, settlement statements, and payout (with a real payment reference). */
export default function Commission() {
  const router = useRouter();
  const sum = useGet<any>('/admin/commission/summary');
  const set = useGet<any>('/admin/commission/settlements');
  const rules = useGet<any>('/admin/commission/rules');
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const inv = ['/admin/commission/summary', '/admin/commission/settlements'];
  const create = useSend<{ distributor_id: number; from: string; to: string }>('/admin/commission/settlements', { invalidate: inv });
  const approve = useSend<{ id: number }>((b) => `/admin/commission/settlements/${b.id}/approve`, { invalidate: inv });
  const pay = useSend<{ id: number; reference: string }>((b) => `/admin/commission/settlements/${b.id}/pay`, { invalidate: inv });
  const cancel = useSend<{ id: number; note: string }>((b) => `/admin/commission/settlements/${b.id}/cancel`, { invalidate: inv });
  const prompt = usePrompt();

  return (
    <Screen onRefresh={() => { sum.refetch(); set.refetch(); rules.refetch(); }} refreshing={sum.isRefetching}>
      <Row><Button small variant="ghost" title="All entries" onPress={() => router.push('/console/commission-entries')} /></Row>
      <Button small variant="ghost" title="Manage commission rules" onPress={() => router.push('/console/commission-rules')} />
      {sum.isLoading ? <Loading /> : sum.error ? <ErrorBox error={sum.error} retry={sum.refetch} /> : (<>
        <Row><Stat label="Unsettled" value={inr(sum.data.unsettled_total)} tone="warn" /><Stat label="Awaiting payment" value={inr(sum.data.awaiting_payment)} /></Row>
        <H2>Prepare statement</H2>
        <Row><Field label="From" value={from} onChangeText={setFrom} style={{ minWidth: 130 }} /><Field label="To" value={to} onChangeText={setTo} style={{ minWidth: 130 }} /></Row>
        {!sum.data.unsettled.length ? <Empty text="No unsettled commission" /> : sum.data.unsettled.map((u: any) => (
          <Card key={u.distributor_id}>
            <Body style={{ fontWeight: '700' }}>{u.business_name}</Body>
            <Muted>{u.entries} entries · earned {inr(u.earned)} · reversed {inr(u.reversed)} · net {inr(u.net)}</Muted>
            <Button small title="Create statement" onPress={() => create.mutate({ distributor_id: u.distributor_id, from, to })} />
          </Card>
        ))}
      </>)}

      <H2>Settlements</H2>
      {set.data?.dual_control && <Muted>Two-person rule is on: a different admin must mark payments paid.</Muted>}
      {set.data?.settlements.map((s: any) => (
        <Card key={s.id} onPress={() => router.push({ pathname: '/console/settlement', params: { id: String(s.id) } })}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>#{s.id} {s.business_name}</Body><Chip label={s.status} tone={s.status === 'paid' ? 'ok' : s.status === 'cancelled' ? 'danger' : 'warn'} /></Row>
          <Muted>{s.period_from} to {s.period_to} · {s.entry_count} entries · {inr(s.amount)}{s.payment_ref ? ` · ref ${s.payment_ref}` : ''}</Muted>
          <Row>
            {s.status === 'draft' && <Button small title="Approve" onPress={() => Alert.alert('Approve statement?', `${inr(s.amount)} for ${s.business_name}`, [{ text: 'Back', style: 'cancel' }, { text: 'Approve', onPress: () => approve.mutate({ id: s.id }) }])} />}
            {s.status === 'approved' && <Button small title="Mark paid" onPress={() => prompt.ask({ title: 'Mark as paid', label: 'Bank / UPI payment reference', minLength: 3, confirmLabel: 'Mark paid', onSubmit: (reference) => pay.mutate({ id: s.id, reference }) })} />}
            {(s.status === 'draft' || s.status === 'approved') && <Button small variant="danger" title="Cancel" onPress={() => prompt.ask({ title: 'Cancel statement', label: 'Reason', minLength: 3, danger: true, confirmLabel: 'Cancel statement', onSubmit: (note) => cancel.mutate({ id: s.id, note }) })} />}
          </Row>
        </Card>
      ))}

      <H2>Rules</H2>
      {rules.data?.rules.length ? rules.data.rules.map((r: any) => <Card key={r.id}><Body>{r.scope ?? `Rule #${r.id}`}</Body><Muted>{JSON.stringify(r).slice(0, 160)}</Muted></Card>) : <Muted>No custom rules: each distributor's default rate applies.</Muted>}
      <PromptModal {...prompt.props} />
    </Screen>
  );
}
