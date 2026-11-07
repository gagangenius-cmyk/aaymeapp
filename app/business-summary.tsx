import React, { useState } from 'react';
import { useGet } from '../src/lib/hooks';
import { Body, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from '../src/ui/kit';

const iso = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

/** Distributor: sales, collections and who owes the most, for a chosen period. */
export default function BusinessSummary() {
  const [days, setDays] = useState('30');
  const q = useGet<any>('/reports/summary', { from: iso(Number(days) - 1), to: iso(0) });
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{['7', '30', '90'].map((x) => <Chip key={x} label={`${x} days`} active={days === x} onPress={() => setDays(x)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Row><Stat label="Invoiced" value={inr(d.invoiced)} /><Stat label="Collected" value={inr(d.collected)} tone="ok" /></Row>
        <Row><Stat label="Cash" value={inr(d.collected_cash)} /><Stat label="Online" value={inr(d.collected_online)} /></Row>
        <Stat label="Outstanding with retailers" value={inr(d.outstanding)} tone="warn" />
        <H2>Orders by status</H2>
        <Card>{Object.entries(d.orders).map(([s, v]: any) => (
          <Row key={s} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body>{s.replace(/_/g, ' ')}</Body><Muted>{v.count} · {inr(v.total)}</Muted></Row>
        ))}</Card>
        <H2>Biggest dues</H2>
        {d.top_debtors.length ? d.top_debtors.map((t: any) => <Row key={t.shop_name} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body>{t.shop_name}</Body><Body style={{ color: '#C77700' }}>{inr(t.due)}</Body></Row>) : <Muted>Nobody owes you anything</Muted>}
      </>)}
    </Screen>
  );
}
