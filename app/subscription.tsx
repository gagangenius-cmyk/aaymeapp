import React, { useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../src/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '../src/lib/api';
import { useGet } from '../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Distributor: subscription status and renewal (UPI with UTR, or an online payment link). The admin confirms UPI payments. */
export default function Subscription() {
  const qc = useQueryClient();
  const q = useGet<any>('/subscription');
  const [plan, setPlan] = useState<number | null>(null);
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const s = q.data;

  async function pay(method: 'upi' | 'gateway') {
    setBusy(true);
    try {
      const r = await api('/subscription/checkout', { body: { plan_id: plan, method, ...(method === 'upi' ? { utr: utr.trim() } : {}) }, idempotent: key.current });
      key.current = newKey(); qc.invalidateQueries({ queryKey: ['/subscription'] });
      if (r.checkout_url) Linking.openURL(r.checkout_url); else Alert.alert('Submitted', 'You will be activated once the payment is confirmed.');
    } catch (e: any) { Alert.alert('Could not submit', e.message); } finally { setBusy(false); }
  }

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>Subscription</H2>
        <Body>{s.ends_at ? `Ends ${new Date(s.ends_at).toLocaleDateString()}` : 'Status unavailable'}</Body>
        <Chip label={s.status === 'expired' ? 'Expired' : `${s.days_left} days left`} tone={s.status === 'expired' ? 'danger' : s.status === 'expiring' ? 'warn' : 'ok'} />
      </Card>
      {s.pending && <Card><H2>Payment awaiting confirmation</H2><Muted>{s.pending.plan_name} · {inr(s.pending.amount)} · UTR {s.pending.utr}</Muted></Card>}
      {s.plans.length > 0 && (<>
        <H2>Renew</H2>
        <Row>{s.plans.map((p: any) => <Chip key={p.id} label={`${p.name} · ${p.days}d · ${inr(p.price)}`} active={plan === p.id} onPress={() => setPlan(p.id)} />)}</Row>
        {s.pay_by_upi && (<Card>
          <Muted>Pay to UPI id</Muted><Body selectable style={{ fontWeight: '700' }}>{s.pay_by_upi.upi_id}</Body><Muted>{s.pay_by_upi.payee}</Muted>
          <Field label="UTR" value={utr} onChangeText={setUtr} autoCapitalize="characters" maxLength={30} />
          <Button title="Submit UTR" onPress={() => pay('upi')} loading={busy} disabled={!plan || utr.trim().length < 8} />
        </Card>)}
        {s.pay_by_gateway && <Button variant="ghost" title="Pay online (card / netbanking)" onPress={() => pay('gateway')} loading={busy} disabled={!plan} />}
      </>)}
      {s.history?.length > 0 && (<><H2>History</H2>{s.history.map((h: any) => <Muted key={h.id}>{new Date(h.created_at).toLocaleDateString()} · {h.plan_name} · {inr(h.amount)} · {h.status}</Muted>)}</>)}
    </Screen>
  );
}
