import React from 'react';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Sales over the last 30 days: day by day, by channel, and the best-selling products. */
export default function StoreReports() {
  const q = useGet<any>('/store/reports/sales');
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Muted>{d.from} to {d.to}</Muted>
        <H2>By channel</H2>
        <Card>{d.by_channel.length ? d.by_channel.map((c: any) => <Row key={c.channel} style={{ justifyContent: 'space-between' }}><Body>{c.channel === 'counter' ? 'Counter bills' : 'Online orders'} ({c.orders})</Body><Body style={{ fontWeight: '700' }}>{inr(c.total)}</Body></Row>) : <Muted>No sales yet.</Muted>}</Card>
        <H2>Best sellers</H2>
        <Card>{d.top_products.length ? d.top_products.map((p: any) => <Row key={p.name} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ flex: 1 }}>{p.name} × {p.qty}</Body><Body style={{ fontWeight: '700' }}>{inr(p.amount)}</Body></Row>) : <Muted>No sales yet.</Muted>}</Card>
        <H2>Day by day</H2>
        {d.by_day.length ? [...d.by_day].reverse().map((x: any) => <Row key={x.date} style={{ justifyContent: 'space-between' }}><Body>{x.date} · {x.orders} {x.orders === 1 ? 'sale' : 'sales'}</Body><Body style={{ fontWeight: '700' }}>{inr(x.total)}</Body></Row>) : <Muted>No sales yet.</Muted>}
      </>)}
    </Screen>
  );
}
