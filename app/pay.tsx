import React, { useRef, useState } from 'react';
import { goBack } from '../src/lib/nav';
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, newKey } from '../src/lib/api';
import { useGet } from '../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Pay a distributor: UPI (then enter the UTR for them to confirm) or the gateway's hosted page. Money reaches the khata only after confirmation. */
export default function Pay() {
  const { distributor_id, due } = useLocalSearchParams<{ distributor_id: string; due?: string }>();
  const id = Number(distributor_id);
  const router = useRouter();
  const qc = useQueryClient();
  const methods = useGet<any>('/payments/methods');
  const [amount, setAmount] = useState(due && Number(due) > 0 ? Number(due).toFixed(2) : '');
  const [utr, setUtr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const key = useRef(newKey());
  const info = useGet<any>(`/payments/pay-info/${id}`, { amount: amount || undefined });
  const history = useGet<any>('/payments');

  const finish = () => { key.current = newKey(); qc.invalidateQueries({ queryKey: ['/payments'] }); qc.invalidateQueries({ queryKey: ['/retailer/distributors'] }); };

  async function reportUpi() {
    setBusy(true); setErr('');
    try { await api('/payments', { body: { distributor_id: id, amount, utr: utr.trim() }, idempotent: key.current }); finish(); setUtr(''); goBack(router); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function gateway() {
    setBusy(true); setErr('');
    try { const r = await api('/payments/gateway/link', { body: { distributor_id: id, amount }, idempotent: key.current }); finish(); if (r.checkout_url) Linking.openURL(r.checkout_url); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  const mine = (history.data?.payments ?? []).filter((p: any) => p.distributor_id === id).slice(0, 8);
  return (
    <Screen>
      <Field label="Amount (INR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      {info.isLoading ? <Loading /> : info.error ? <ErrorBox error={info.error} retry={info.refetch} /> : (
        <Card>
          <H2>Pay by UPI</H2>
          <Muted>Pay to</Muted><Body selectable style={{ fontWeight: '700' }}>{info.data.upi_id}</Body>
          <Muted>{info.data.account_name ?? info.data.payee}</Muted>
          <Button small variant="ghost" title="Open UPI app" disabled={!amount} onPress={() => Linking.openURL(info.data.upi_uri)} />
          <Field label="UTR / reference number" value={utr} onChangeText={setUtr} autoCapitalize="characters" maxLength={30} placeholder="8-30 letters or digits" />
          <Muted>The distributor confirms it after seeing the money; only then your khata updates.</Muted>
          <Button title="I have paid: submit UTR" onPress={reportUpi} loading={busy} disabled={!amount || utr.trim().length < 8} />
        </Card>
      )}
      {methods.data?.gateway && <Card><H2>Card / netbanking</H2><Button variant="ghost" title="Pay online" onPress={gateway} loading={busy} disabled={!amount} /></Card>}
      {!!err && <Body style={{ color: '#D93A55' }}>{err}</Body>}
      {mine.length > 0 && <><H2>Your recent payments</H2>{mine.map((p: any) => (
        <Row key={p.id} style={{ justifyContent: 'space-between' }}><Muted>{new Date(p.created_at).toLocaleDateString()} · {p.utr}</Muted><Chip label={`${inr(p.amount)} · ${p.status}`} tone={p.status === 'confirmed' ? 'ok' : p.status === 'pending' ? 'warn' : 'danger'} /></Row>
      ))}</>}
    </Screen>
  );
}
