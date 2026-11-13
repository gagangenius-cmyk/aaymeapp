import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const monthNow = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 7);

/** Admin: one distributor's own commission rates (for all plans, or one plan) and their sales target for a month. Empty rates mean "use the plan's default". */
export default function SalesSetup() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const setup = useGet<any>(`/admin/distributors/${id}/sales-setup`);
  const plans = useGet<any>('/admin/retailer-plans');
  const [rates, setRates] = useState<Record<string, { new: string; renewal: string; upgrade: string }>>({});
  const [month, setMonth] = useState(monthNow());
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  useEffect(() => {
    if (!setup.data) return;
    const m: Record<string, any> = {};
    for (const r of setup.data.rates) m[String(r.plan_id ?? 0)] = { new: r.new == null ? '' : String(r.new), renewal: r.renewal == null ? '' : String(r.renewal), upgrade: r.upgrade == null ? '' : String(r.upgrade) };
    setRates(m);
  }, [setup.data]);
  useEffect(() => { const t = setup.data?.targets.find((x: any) => x.month === month); setAmount(t ? t.target_amount : ''); setCount(t ? String(t.target_count) : ''); }, [setup.data, month]);
  const saveRate = useSend<any>(`/admin/distributors/${id}/commission-rates`, { method: 'PUT', invalidate: [`/admin/distributors/${id}/sales-setup`], success: 'Rates saved' });
  const saveTarget = useSend<any>(`/admin/distributors/${id}/targets`, { method: 'PUT', invalidate: [`/admin/distributors/${id}/sales-setup`], success: 'Target saved' });
  const val = (k: string) => rates[k] ?? { new: '', renewal: '', upgrade: '' };
  const put = (k: string, field: 'new' | 'renewal' | 'upgrade') => (v: string) => setRates((r) => ({ ...r, [k]: { ...val(k), [field]: v } }));
  const n = (v: string) => (v.trim() === '' ? null : Number(v));
  const block = (key: string, title: string, planId: number | null) => (
    <Card key={key}>
      <Body style={{ fontWeight: '700' }}>{title}</Body>
      <Row>
        <Field label="New %" value={val(key).new} onChangeText={put(key, 'new')} keyboardType="decimal-pad" style={{ minWidth: 90 }} placeholder="default" />
        <Field label="Renewal %" value={val(key).renewal} onChangeText={put(key, 'renewal')} keyboardType="decimal-pad" style={{ minWidth: 90 }} placeholder="default" />
        <Field label="Upgrade %" value={val(key).upgrade} onChangeText={put(key, 'upgrade')} keyboardType="decimal-pad" style={{ minWidth: 90 }} placeholder="default" />
      </Row>
      <Button small title="Save" loading={saveRate.isPending} onPress={() => saveRate.mutate({ plan_id: planId, new: n(val(key).new), renewal: n(val(key).renewal), upgrade: n(val(key).upgrade) })} />
    </Card>
  );
  return (
    <Screen>
      <H2>{name ?? 'Distributor'}</H2>
      {setup.isLoading || plans.isLoading ? <Loading /> : setup.error ? <ErrorBox error={setup.error} retry={setup.refetch} /> : (<>
        <Muted>Commission rates for this distributor. Leave a rate empty to use the plan's default. A rate for one plan wins over the "All plans" rate.</Muted>
        {block('0', 'All plans', null)}
        {(plans.data?.plans ?? []).map((p: any) => block(String(p.id), p.name, p.id))}
        <H2>Monthly target</H2>
        <Card>
          <Field label="Month (YYYY-MM)" value={month} onChangeText={setMonth} maxLength={7} />
          <Row>
            <Field label="Sales value (INR)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ minWidth: 130 }} />
            <Field label="Number of sales" value={count} onChangeText={setCount} keyboardType="number-pad" style={{ minWidth: 110 }} />
          </Row>
          <Button small title="Save target" loading={saveTarget.isPending} disabled={!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)} onPress={() => saveTarget.mutate({ month, target_amount: amount.trim() || '0', target_count: Number(count) || 0 })} />
        </Card>
      </>)}
    </Screen>
  );
}
