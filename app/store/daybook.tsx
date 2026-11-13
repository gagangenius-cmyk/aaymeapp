import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const shift = (d: string, n: number) => new Date(new Date(d + 'T00:00:00Z').getTime() + n * 86400_000).toISOString().slice(0, 10);
const MODE: Record<string, string> = { cash: 'Cash', card: 'Card', upi: 'UPI', cod: 'Cash on delivery' };

/** The whole day's account book: sales by how they were paid, what has come in, and every bill and order. */
export default function DayBook() {
  const router = useRouter();
  const [date, setDate] = useState(todayIst());
  const q = useGet<any>('/store/daybook', { date });
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button small variant="ghost" title="‹ Previous" onPress={() => setDate(shift(date, -1))} />
        <Body style={{ fontWeight: '800' }}>{date === todayIst() ? `Today · ${date}` : date}</Body>
        <Button small variant="ghost" title="Next ›" disabled={date >= todayIst()} onPress={() => setDate(shift(date, 1))} />
      </Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Row style={{ alignItems: 'stretch' }}><Stat label="Total sales" value={inr(d.total_sales)} /><Stat label="Collected" value={inr(d.collected)} tone="ok" /></Row>
        <Row style={{ alignItems: 'stretch' }}><Stat label="Still to collect" value={inr(d.pending)} tone={Number(d.pending) > 0 ? 'warn' : undefined} /><Stat label="Bills · online orders" value={`${d.bills} · ${d.online_orders}`} /></Row>
        <H2>By payment</H2>
        <Card>{Object.entries(d.by_mode).map(([k, v]: any) => <Row key={k} style={{ justifyContent: 'space-between' }}><Body>{MODE[k]} ({v.count})</Body><Body style={{ fontWeight: '700' }}>{inr(v.amount)}</Body></Row>)}</Card>
        {d.cancelled > 0 && <Muted>{d.cancelled} cancelled and left out of the totals.</Muted>}
        <H2>Bills and orders</H2>
        {!d.orders.length ? <Muted>Nothing on this day.</Muted> : d.orders.map((o: any) => (
          <Card key={o.id} onPress={() => (o.channel === 'counter' ? router.push({ pathname: '/store/bill', params: { id: String(o.id) } }) : router.push('/store/orders'))}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{o.channel === 'counter' ? o.bill_no : `Online #${o.id}`} · {inr(o.total)}</Body><Chip label={o.status === 'delivered' && o.channel === 'counter' ? MODE[o.payment_method] : o.status.replace(/_/g, ' ')} tone={['cancelled', 'rejected'].includes(o.status) ? 'danger' : o.payment_status === 'paid' ? 'ok' : 'warn'} /></Row>
            <Muted>{new Date(o.created_at).toLocaleTimeString()} · {o.item_count} {o.item_count === 1 ? 'item' : 'items'}{o.customer_name ? ` · ${o.customer_name}` : ''} · {o.payment_status === 'paid' ? 'paid' : 'payment pending'}</Muted>
          </Card>
        ))}
      </>)}
    </Screen>
  );
}
