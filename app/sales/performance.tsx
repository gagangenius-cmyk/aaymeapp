import React from 'react';
import { View } from 'react-native';
import { useGet } from '../../src/lib/hooks';
import { colors } from '../../src/lib/theme';
import { Body, Card, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

function Bar({ label, value, shown }: { label: string; value: number | null; shown: string }) {
  if (value === null) return <Muted>{label}: no target set</Muted>;
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}><Muted>{label}</Muted><Muted>{shown} · {value}%</Muted></Row>
      <View style={{ height: 10, borderRadius: 6, backgroundColor: colors.border, overflow: 'hidden' }}><View style={{ width: `${value}%`, height: 10, backgroundColor: value >= 100 ? colors.green : colors.primary }} /></View>
    </View>
  );
}

/** Sales against the monthly target the AAYME team set, month by month, and how many leads turned into sales. */
export default function Performance() {
  const q = useGet<any>('/sales/performance');
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <H2>This month</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Sales" value={d.this_month.sales} tone="ok" />
          <Stat label="Sales value" value={inr(d.this_month.amount)} />
        </Row>
        <Card>
          <Bar label="Sales value" value={d.this_month.amount_progress} shown={`${inr(d.this_month.amount)} of ${inr(d.this_month.target_amount)}`} />
          <Bar label="Number of sales" value={d.this_month.count_progress} shown={`${d.this_month.sales} of ${d.this_month.target_count}`} />
          <Muted>Commission this month: {inr(d.this_month.commission)}</Muted>
        </Card>
        <H2>Leads</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Leads" value={d.leads.total} />
          <Stat label="Became customers" value={`${d.leads.converted} (${d.leads.conversion_percent}%)`} />
        </Row>
        <H2>Earlier months</H2>
        {d.months.filter((m: any) => m.month !== d.this_month.month).map((m: any) => (
          <Card key={m.month}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{m.month}</Body><Body>{m.sales} {m.sales === 1 ? 'sale' : 'sales'} · {inr(m.amount)}</Body></Row>
            <Bar label="Target" value={m.amount_progress} shown={`${inr(m.amount)} of ${inr(m.target_amount)}`} />
          </Card>
        ))}
      </>)}
    </Screen>
  );
}
