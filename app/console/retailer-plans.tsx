import React, { useState } from 'react';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

const blank = { name: '', days: '30', price: '', description: '', features: '', commission_new: '', commission_renewal: '', commission_upgrade: '' };

/** Admin: the subscription plans retailers can buy (name, price, validity, features) and the default commission distributors earn, plus which kinds of sale pay commission. */
export default function RetailerPlans() {
  const q = useGet<any>('/admin/retailer-plans');
  const [f, setF] = useState<Record<string, string>>(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
  const body = () => ({ name: f.name.trim(), days: Number(f.days), price: f.price.trim(), description: f.description.trim() || null,
    features: f.features.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12), commission_new: num(f.commission_new), commission_renewal: num(f.commission_renewal), commission_upgrade: num(f.commission_upgrade) });
  const reset = () => { setF(blank); setEditing(null); setErrors({}); };
  const save = useSend<any>(editing ? `/admin/retailer-plans/${editing}` : '/admin/retailer-plans', { method: editing ? 'PUT' : 'POST', invalidate: ['/admin/retailer-plans'], success: 'Plan saved', onDone: reset });
  const toggle = useSend<{ id: number; is_active: boolean }>((b) => `/admin/retailer-plans/${b.id}`, { method: 'PUT', invalidate: ['/admin/retailer-plans'], silent: true });
  const sw = useSend<Record<string, boolean>>('/admin/retailer-sales/settings', { method: 'PUT', invalidate: ['/admin/retailer-plans'], silent: true });
  const edit = (p: any) => { setEditing(p.id); setF({ name: p.name, days: String(p.days), price: p.price, description: p.description ?? '', features: (p.features ?? []).join('\n'), commission_new: String(p.commission.new ?? 0), commission_renewal: String(p.commission.renewal ?? 0), commission_upgrade: String(p.commission.upgrade ?? 0) }); };
  const s = q.data?.switches ?? { new: true, renewal: true, upgrade: true };
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>Which sales pay commission</H2>
        <Toggle label="New subscription" value={s.new} onChange={(v) => sw.mutate({ new: v })} />
        <Toggle label="Renewal" value={s.renewal} onChange={(v) => sw.mutate({ renewal: v })} />
        <Toggle label="Upgrade" value={s.upgrade} onChange={(v) => sw.mutate({ upgrade: v })} />
        <Muted>Commission is a percentage of the amount the retailer paid. The rates below are the default for each plan; a distributor can have their own.</Muted>
      </Card>

      <Card>
        <H2>{editing ? 'Edit plan' : 'New plan'}</H2>
        <Field label="Plan name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
        <Row>
          <Field label="Price (INR)" value={f.price} onChangeText={set('price')} keyboardType="decimal-pad" style={{ minWidth: 120 }} error={errors.price} />
          <Field label="Valid for (days)" value={f.days} onChangeText={set('days')} keyboardType="number-pad" style={{ minWidth: 120 }} error={errors.days} />
        </Row>
        <Field label="Short description (optional)" value={f.description} onChangeText={set('description')} />
        <Field label="Features (one per line)" value={f.features} onChangeText={set('features')} multiline style={{ minHeight: 80 }} />
        <Muted>Distributor commission (% of the amount paid)</Muted>
        <Row>
          <Field label="New %" value={f.commission_new} onChangeText={set('commission_new')} keyboardType="decimal-pad" style={{ minWidth: 90 }} />
          <Field label="Renewal %" value={f.commission_renewal} onChangeText={set('commission_renewal')} keyboardType="decimal-pad" style={{ minWidth: 90 }} />
          <Field label="Upgrade %" value={f.commission_upgrade} onChangeText={set('commission_upgrade')} keyboardType="decimal-pad" style={{ minWidth: 90 }} />
        </Row>
        <Row>
          <Button title={editing ? 'Save changes' : 'Add plan'} loading={save.isPending} disabled={!f.name.trim() || !f.price.trim() || !Number(f.days)} onPress={() => { setErrors({}); save.mutate(body(), { onError: (e) => setErrors(fieldErrors(e)) }); }} />
          {editing && <Button variant="ghost" title="Cancel" onPress={reset} />}
        </Row>
      </Card>

      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.plans.length ? <Empty text="No plans yet" /> :
        q.data.plans.map((p: any) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{p.name}</Body><Chip label={p.is_active ? 'On sale' : 'Off'} tone={p.is_active ? 'ok' : 'danger'} /></Row>
            <Muted>{inr(p.price)} · {p.days} days</Muted>
            <Muted>Commission: new {p.commission.new ?? 0}% · renewal {p.commission.renewal ?? 0}% · upgrade {p.commission.upgrade ?? 0}%</Muted>
            <Row>
              <Button small variant="ghost" title="Edit" onPress={() => edit(p)} />
              <Button small variant="ghost" title={p.is_active ? 'Stop selling' : 'Sell again'} onPress={() => toggle.mutate({ id: p.id, is_active: !p.is_active })} />
            </Row>
          </Card>
        ))}
    </Screen>
  );
}
