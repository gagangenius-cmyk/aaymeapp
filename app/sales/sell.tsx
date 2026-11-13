import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { fieldErrors, useGet } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const METHODS: [string, string][] = [['upi', 'UPI'], ['bank', 'Bank transfer'], ['cheque', 'Cheque'], ['cash', 'Cash']];

/** Sell a subscription: pick the plan, the retailer (existing or new), and how the retailer pays. The admin confirms the payment, then the plan starts. */
export default function Sell() {
  const p = useLocalSearchParams<{ plan_id?: string; lead_id?: string; name?: string; phone?: string; shop_name?: string; pincode?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const plans = useGet<any>('/sales/plans');
  const mine = useGet<any>('/distributor/retailers', { mine: '0' });
  const [planId, setPlanId] = useState<number | null>(p.plan_id ? Number(p.plan_id) : null);
  const [existing, setExisting] = useState<number | null>(null);
  const [find, setFind] = useState('');
  const [f, setF] = useState<Record<string, string>>({ name: p.name ?? '', phone: p.phone ?? '', shop_name: p.shop_name ?? '', pincode: p.pincode ?? '' });
  const [method, setMethod] = useState<string>('upi');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const plan = (plans.data?.plans ?? []).find((x: any) => x.id === planId);
  const t = find.trim().toLowerCase(); const digits = t.replace(/\D/g, '');
  const shops = (mine.data?.retailers ?? []).filter((r: any) => !t || `${r.shop_name ?? ''} ${r.name ?? ''}`.toLowerCase().includes(t) || (digits.length > 0 && String(r.phone ?? '').includes(digits))).slice(0, 6);
  const chosen = (mine.data?.retailers ?? []).find((r: any) => r.id === existing);

  async function submit() {
    if (!planId) return Alert.alert('Choose a plan', 'Pick the plan the retailer is buying.');
    if (!existing && (!f.name?.trim() || !f.shop_name?.trim() || f.phone?.length !== 10 || f.pincode?.length !== 6)) return Alert.alert('Retailer details', 'Enter the retailer name, shop name, 10-digit phone and 6-digit pincode, or choose an existing retailer.');
    setErrors({}); setBusy(true);
    try {
      const body: any = { plan_id: planId, ...((method === 'cash' || reference.trim()) ? { method } : {}), ...(reference.trim() ? { reference: reference.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}), ...(p.lead_id ? { lead_id: Number(p.lead_id) } : {}) };
      if (existing) body.retailer_id = existing; else body.retailer = { name: f.name.trim(), phone: f.phone, shop_name: f.shop_name.trim(), pincode: f.pincode, ...(f.password ? { password: f.password } : {}) };
      setResult(await api('/sales/sell', { body }));
      qc.invalidateQueries({ queryKey: ['/sales/history'] }); qc.invalidateQueries({ queryKey: ['/sales/earnings'] }); qc.invalidateQueries({ queryKey: ['/sales/leads'] }); qc.invalidateQueries({ queryKey: ['/distributor/retailers'] });
    } catch (e: any) { setErrors(fieldErrors(e)); Alert.alert('Not saved', e.message); } finally { setBusy(false); }
  }

  if (result) {
    const kindLabel = result.kind === 'new' ? 'New subscription' : result.kind === 'renewal' ? 'Renewal' : 'Upgrade';
    return (
      <Screen>
        <Card>
          <H2>{result.status === 'payment_submitted' ? 'Sent for confirmation' : 'Waiting for payment'}</H2>
          <Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(result.amount)}</Body>
          <Muted>{kindLabel}{result.retailer_created ? ' · retailer account created' : ''}</Muted>
          {result.status === 'awaiting_payment' && <>
            <Muted>The retailer pays {result.pay_to?.payee ?? 'AAYME'}{result.pay_to?.upi_id ? ` on UPI ${result.pay_to.upi_id}` : ''}. After paying, add the payment reference in Sales history.</Muted>
            {!!result.upi_link && <Button title="Open UPI app to pay" onPress={() => Linking.openURL(result.upi_link).catch(() => Alert.alert('UPI', 'No UPI app was found on this phone.'))} />}
          </>}
          {result.status === 'payment_submitted' && <Muted>The AAYME team will confirm the payment. Then the retailer's online store starts and your commission is added.</Muted>}
        </Card>
        <Button title="Sales history" onPress={() => router.replace('/sales/history')} />
        <Button variant="ghost" title="Sell another" onPress={() => { setResult(null); setReference(''); setNote(''); setExisting(null); setF({ name: '', phone: '', shop_name: '', pincode: '' }); }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H2>1. Plan</H2>
      {plans.isLoading ? <Loading /> : plans.error ? <ErrorBox error={plans.error} retry={plans.refetch} /> : (
        <Row>{(plans.data?.plans ?? []).map((x: any) => <Chip key={x.id} label={`${x.name} · ${inr(x.price)}`} active={planId === x.id} onPress={() => setPlanId(x.id)} />)}</Row>
      )}
      {plan && <Muted>{plan.days} days. You earn {plan.my_commission.new}% on a new subscription. A renewal or upgrade may pay differently.</Muted>}

      <H2>2. Retailer</H2>
      <Row>
        <Chip label="New retailer" active={!existing} onPress={() => setExisting(null)} />
        <Chip label="Existing retailer" active={!!existing} onPress={() => setExisting(chosen?.id ?? (mine.data?.retailers?.[0]?.id ?? null))} />
      </Row>
      {existing ? (<>
        <Field label="Search retailer" value={find} onChangeText={setFind} placeholder="Shop name, owner name or phone number" />
        {shops.map((r: any) => <Chip key={r.id} label={`${r.shop_name} · ${r.phone}`} active={existing === r.id} onPress={() => setExisting(r.id)} />)}
      </>) : (<>
        <Field label="Shop name" value={f.shop_name} onChangeText={set('shop_name')} autoCapitalize="words" error={errors['retailer.shop_name']} />
        <Field label="Retailer name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors['retailer.name']} />
        <Field label="Mobile number (login id)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors['retailer.phone']} />
        <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors['retailer.pincode']} />
        <Field label="Password for the retailer (8+ characters)" value={f.password ?? ''} onChangeText={set('password')} secureTextEntry />
      </>)}

      <H2>3. Payment</H2>
      <Row>{METHODS.map(([k, l]) => <Chip key={k} label={l} active={method === k} onPress={() => setMethod(k)} />)}</Row>
      {method !== 'cash' && <Field label="Payment reference (UPI UTR, bank reference or cheque number)" value={reference} onChangeText={setReference} autoCapitalize="characters" />}
      <Muted>Leave the reference empty if the retailer has not paid yet; you can add it later in Sales history.</Muted>
      <Field label="Note (optional)" value={note} onChangeText={setNote} />
      <Button title="Create sale" onPress={submit} loading={busy} />
    </Screen>
  );
}
