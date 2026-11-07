import React, { useRef, useState } from 'react';
import { Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api, newKey } from '../../src/lib/api';
import { fieldErrors, useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';
import { PermissionToggles } from '../../src/ui/PermissionToggles';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Onboard a distributor. The account is only created once the subscription fee has arrived (the server enforces this);
 * the subscription timer starts at that moment. In a free/testing period the account is created straight away.
 */
export default function Onboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const meta = useGet<any>('/staff/onboarding/meta');
  const key = useRef(newKey()).current; // same key on retry => never two requests for one tap-tap
  const [f, setF] = useState<Record<string, string>>({});
  const [planId, setPlanId] = useState<number | null>(null);
  const [method, setMethod] = useState<'upi' | 'gateway'>('upi');
  const [cats, setCats] = useState<number[]>([]);
  const [perms, setPerms] = useState<string[]>([]);
  const [review, setReview] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  if (meta.isLoading) return <Loading />;
  if (meta.error) return <ErrorBox error={meta.error} retry={meta.refetch} />;
  const m = meta.data;
  const plan = m.plans.find((p: any) => p.id === planId);
  const free = m.free_mode || (plan && Number(plan.price) === 0);

  async function submit() {
    setErrors({});
    if (!planId) return setErrors({ plan_id: 'Choose a subscription plan' });
    setBusy(true);
    try {
      const body = {
        business_name: f.business_name, name: f.name, phone: f.phone, password: f.password,
        ...(f.email ? { email: f.email } : {}), ...(f.gst_no ? { gst_no: f.gst_no } : {}), ...(f.address ? { address: f.address } : {}),
        ...(f.city ? { city: f.city } : {}), ...(f.pincode ? { pincode: f.pincode } : {}),
        plan_id: planId, method, category_ids: cats,
        permissions: Object.fromEntries(m.grant_catalog.map((g: any) => [g.key, perms.includes(g.key)])),
        ...(m.reviews_products ? { review_required: review } : {}),
      };
      const r = await api('/staff/onboarding', { body, idempotent: key });
      qc.invalidateQueries({ queryKey: ['/staff/distributors'] }); qc.invalidateQueries({ queryKey: ['/staff/onboarding'] });
      setDone(r);
    } catch (e: any) { setErrors(fieldErrors(e)); setErrors((s) => ({ ...s, _: e.message })); } finally { setBusy(false); }
  }

  if (done) {
    const r = done.request;
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Onboarding', headerStyle: { backgroundColor: '#04203F' }, headerTintColor: '#fff' }} />
        <Card>
          <H2>{r.status === 'completed' ? 'Distributor created' : 'Waiting for the subscription fee'}</H2>
          <Body>{r.business_name} · {r.plan_name} ({r.days} days)</Body>
          {r.status === 'completed'
            ? <Muted>The account is live and its {r.days}-day timer has started.</Muted>
            : <Muted>The distributor account is created as soon as the {inr(r.amount)} fee is received. Its timer starts then.</Muted>}
          {r.pay_to && <>
            <Muted>Pay {inr(r.amount)} to UPI id</Muted><Body selectable style={{ fontWeight: '700' }}>{r.pay_to.upi_id}</Body>
            <Button small title="Open UPI app" onPress={() => Linking.openURL(r.pay_to.uri)} />
            <Muted>Then record the UTR from "Payment requests".</Muted>
          </>}
          {done.checkout_url && <Button small title="Open payment link" onPress={() => Linking.openURL(done.checkout_url)} />}
        </Card>
        <Button title="Done" onPress={() => router.replace('/(staff)')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Onboard distributor', headerStyle: { backgroundColor: '#04203F' }, headerTintColor: '#fff' }} />
      <Field label="Business name" value={f.business_name} onChangeText={set('business_name')} autoCapitalize="words" error={errors.business_name} />
      <Field label="Owner name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <Field label="Phone (login id)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
      <Field label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" error={errors.email} />
      <Field label="Initial password" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
      <Field label="GSTIN (optional)" value={f.gst_no} onChangeText={set('gst_no')} autoCapitalize="characters" maxLength={15} error={errors.gst_no} />
      <Field label="Address" value={f.address} onChangeText={set('address')} error={errors.address} />
      <Row>
        <Field label="City" value={f.city} onChangeText={set('city')} error={errors.city} style={{ minWidth: 150 }} />
        <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} style={{ minWidth: 120 }} />
      </Row>

      <H2>Subscription plan</H2>
      <Row>{m.plans.map((p: any) => <Chip key={p.id} active={planId === p.id} onPress={() => setPlanId(p.id)} label={`${p.name} · ${p.days}d · ${inr(p.price)}`} />)}</Row>
      {!!errors.plan_id && <Muted style={{ color: '#D93A55' }}>{errors.plan_id}</Muted>}
      {!free && (
        <Row>
          <Chip label="Pay by UPI" active={method === 'upi'} onPress={() => setMethod('upi')} />
          {m.pay_by_gateway && <Chip label="Payment link" active={method === 'gateway'} onPress={() => setMethod('gateway')} />}
        </Row>
      )}

      <H2>Categories they deal in</H2>
      <Row>{m.categories.filter((c: any) => !c.parent_id).map((c: any) => <Chip key={c.id} label={c.name} active={cats.includes(c.id)} onPress={() => setCats(cats.includes(c.id) ? cats.filter((x) => x !== c.id) : [...cats, c.id])} />)}</Row>
      {!!errors.category_ids && <Muted style={{ color: '#D93A55' }}>{errors.category_ids}</Muted>}

      <H2>Features for this distributor</H2>
      <Muted>Only the features the admin allowed you to hand out are listed.</Muted>
      {m.grant_catalog.length ? <Card><PermissionToggles catalog={m.grant_catalog} value={perms} onChange={setPerms} /></Card> : <Muted>You have no features to hand out.</Muted>}
      {m.reviews_products && <Toggle label="Review their products before retailers see them" help="Products stay hidden until you approve them." value={review} onChange={setReview} />}

      {!!errors._ && <Body style={{ color: '#D93A55' }}>{errors._}</Body>}
      <Button title={free ? 'Create distributor' : 'Create & request fee'} onPress={submit} loading={busy} />
    </Screen>
  );
}
