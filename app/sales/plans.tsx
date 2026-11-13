import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** The plans a retailer can buy, and what this distributor earns on each kind of sale. */
export default function SalesPlans() {
  const router = useRouter();
  const q = useGet<any>('/sales/plans');
  const sw = q.data?.switches ?? { new: true, renewal: true, upgrade: true };
  const earn = (label: string, kind: 'new' | 'renewal' | 'upgrade', plan: any) => (sw[kind] ? `${label} ${plan.my_commission[kind] ?? 0}%` : `${label} —`);
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Muted>A retailer buys a plan to run their own online store. Tell the retailer about the plan, then tap Sell.</Muted>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.plans.length ? <Empty text="No plans are available yet" /> :
        q.data.plans.map((p: any) => (
          <Card key={p.id}>
            <Row style={{ justifyContent: 'space-between' }}><H2>{p.name}</H2><Chip label={`${p.days} days`} /></Row>
            <Body style={{ fontWeight: '800', fontSize: 22 }}>{inr(p.price)}</Body>
            {p.description ? <Muted>{p.description}</Muted> : null}
            {p.features.map((f: string) => <Body key={f}>• {f}</Body>)}
            <Muted>You earn: {earn('New', 'new', p)} · {earn('Renewal', 'renewal', p)} · {earn('Upgrade', 'upgrade', p)}</Muted>
            <Button small title="Sell this plan" onPress={() => router.push({ pathname: '/sales/sell', params: { plan_id: String(p.id) } })} />
          </Card>
        ))}
    </Screen>
  );
}
