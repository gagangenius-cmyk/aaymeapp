import React, { useState } from 'react';
import { useGet } from '../lib/hooks';
import { KpiHelp } from './KpiHelp';
import { Body, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from './kit';

const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days']] as const;
const isoDay = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

/** KPIs + top lists from GET <base>/analytics. `base` is /admin (everything) or /staff/team (only the distributors mapped to the employee). */
export function AnalyticsView({ base, title }: { base: string; title: React.ReactNode }) {
  const [days, setDays] = useState('30');
  const q = useGet<any>(`${base}/analytics`, { from: isoDay(Number(days) - 1), to: isoDay(0) });
  const k = q.data?.kpis;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {title}
      <Row>{RANGES.map(([v, l]) => <Chip key={v} label={l} active={days === v} onPress={() => setDays(v)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Muted>{q.data.range.distributors_in_scope != null ? `${q.data.range.distributors_in_scope} distributors in scope · ` : ''}{q.data.range.timezone}</Muted>
        <Row><Stat label="Gross sales (delivered)" value={inr(k.gross_sales)} /><Stat label="Net sales" value={inr(k.net_sales)} /></Row>
        <Row><Stat label="Orders" value={k.total_orders} /><Stat label="Pending" value={k.pending_orders} tone={k.pending_orders ? 'warn' : undefined} /></Row>
        <Row><Stat label="Delivered" value={k.delivered_orders} tone="ok" /><Stat label="Cancelled" value={k.cancelled_orders} /></Row>
        <Row><Stat label="Outstanding credit" value={inr(k.outstanding_credit)} tone="warn" /><Stat label="Pending payments" value={inr(k.pending_payments)} /></Row>
        <Row><Stat label="Pending refunds" value={inr(k.pending_refunds)} /><Stat label="Low stock products" value={k.low_stock_products} tone={k.low_stock_products ? 'danger' : undefined} /></Row>
        <Row><Stat label="Active buyers" value={k.active_buyers} /><Stat label="Active distributors" value={k.active_distributors} /></Row>

        <KpiHelp base={base} />
        <H2>Top products</H2>
        {q.data.series.top_products.length ? q.data.series.top_products.map((p: any) => (
          <Card key={p.product_id}><Body>{p.name}</Body><Muted>{p.units} units · {inr(p.revenue)}</Muted></Card>
        )) : <Muted>No sales in this period</Muted>}

        <H2>Distributor performance</H2>
        {q.data.series.distributor_performance.length ? q.data.series.distributor_performance.map((d: any) => (
          <Card key={d.distributor_id}><Body>{d.business_name}</Body><Muted>{d.delivered}/{d.orders} delivered · {inr(d.gmv)}</Muted></Card>
        )) : <Muted>No distributor activity in this period</Muted>}
      </>)}
    </Screen>
  );
}
