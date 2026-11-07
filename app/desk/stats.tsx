import React, { useState } from 'react';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, ErrorBox, H2, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

const iso = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
const mins = (m: number | null) => (m == null ? '-' : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const pct = (v: number | null) => (v == null ? '-' : `${v}%`);

/** Support performance: volume, response and resolution times against SLA, customer ratings, and per-agent results. */
export default function DeskStats() {
  const [days, setDays] = useState('30');
  const q = useGet<any>('/support/desk/stats', { from: iso(Number(days) - 1), to: iso(0) });
  const d = q.data;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{['7', '30', '90'].map((x) => <Chip key={x} label={`${x} days`} active={days === x} onPress={() => setDays(x)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        <Row><Stat label="Created" value={d.created} /><Stat label="Resolved" value={d.resolved} tone="ok" /></Row>
        <Row><Stat label="Open now" value={d.open_now} /><Stat label="Unassigned" value={d.unassigned_now} tone={d.unassigned_now ? 'warn' : undefined} /></Row>
        <Row><Stat label="Past SLA now" value={d.breached_now} tone={d.breached_now ? 'danger' : undefined} /><Stat label="Escalated" value={d.escalated_now} tone={d.escalated_now ? 'warn' : undefined} /></Row>
        <Row><Stat label="Avg first reply" value={mins(d.avg_first_response_minutes)} /><Stat label="Avg resolution" value={mins(d.avg_resolution_minutes)} /></Row>
        <Row><Stat label="Replied in target" value={pct(d.first_response_within_target_pct)} /><Stat label="Resolved in target" value={pct(d.resolved_within_target_pct)} /></Row>
        <Card><Muted>Customer satisfaction</Muted><Body style={{ fontWeight: '800', fontSize: 20 }}>{d.satisfaction ? `${d.satisfaction.average} / 5  (${d.satisfaction.responses} ratings)` : 'No ratings yet'}</Body></Card>
        <H2>By category</H2>
        {d.by_category.map((c: any) => <Row key={c.category} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body>{c.category}</Body><Muted>{c.tickets}</Muted></Row>)}
        <H2>By agent</H2>
        {d.by_agent.length ? d.by_agent.map((a: any) => <Card key={a.agent_id}><Body style={{ fontWeight: '700' }}>{a.name}</Body><Muted>{a.resolved} resolved · avg {mins(a.avg_resolution_minutes)}</Muted></Card>) : <Muted>No resolved tickets in this period</Muted>}
      </>)}
    </Screen>
  );
}
