import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, ErrorBox, H1, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

/** A team member's own dashboard: deliveries, their shops and what those owe, orders from those shops, what they collected, visits made. */
export default function EmployeeDashboard() {
  const router = useRouter();
  const q = useGet<any>('/distributor/me/dashboard');
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>My dashboard</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Muted>{d.name} · {d.kind === 'delivery' ? 'Delivery person' : 'Sales person'}</Muted>

        <H2>Deliveries</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="To deliver" value={d.deliveries.open} tone={d.deliveries.open ? 'warn' : undefined} />
          <Stat label="Due today" value={d.deliveries.due_today} />
        </Row>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Delivered today" value={d.deliveries.delivered_today} tone="ok" />
          <Stat label="Delivered this month" value={d.deliveries.delivered_month} />
        </Row>
        <Muted>Still to deliver: {inr(d.deliveries.open_value)} · delivered this month: {inr(d.deliveries.delivered_month_value)}</Muted>
        <Button small variant="ghost" title="Open my deliveries" onPress={() => router.push('/(employee)')} />

        <H2>Cash and payments I collected</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Today" value={inr(d.collections.today.total)} tone="ok" />
          <Stat label="This month" value={inr(d.collections.month.total)} />
        </Row>
        <Card>
          <Muted>Today: cash {inr(d.collections.today.cash)} · UPI {inr(d.collections.today.upi)} · {d.collections.today.count} {d.collections.today.count === 1 ? 'collection' : 'collections'}</Muted>
          <Muted>This month: cash {inr(d.collections.month.cash)} · UPI {inr(d.collections.month.upi)} · {d.collections.month.count} {d.collections.month.count === 1 ? 'collection' : 'collections'}</Muted>
        </Card>

        <H2>My retailers</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Retailers" value={d.retailers.count} />
          <Stat label="They owe" value={inr(d.retailers.due)} tone={Number(d.retailers.due) > 0 ? 'warn' : undefined} />
        </Row>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Orders today" value={d.sales.today_orders} />
          <Stat label="Orders this month" value={d.sales.month_orders} />
        </Row>
        <Muted>Order value today: {inr(d.sales.today_value)} · this month: {inr(d.sales.month_value)}</Muted>
        <Button small variant="ghost" title="Open my retailers" onPress={() => router.push('/(employee)/retailers')} />

        <H2>Visits</H2>
        <Row style={{ alignItems: 'stretch' }}>
          <Stat label="Visits today" value={d.visits.today} />
          <Stat label="Visits this month" value={d.visits.month} />
        </Row>
        <Body style={{ color: '#6B7A90', fontSize: 12 }}>Today and this month are counted in Indian time.</Body>
      </>)}
    </Screen>
  );
}
