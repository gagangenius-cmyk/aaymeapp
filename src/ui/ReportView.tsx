import React from 'react';
import { Body, Card, H2, Muted, Row } from './kit';

const label = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isMoneyKey = (k: string) => /amount|total|due|balance|paid|value|revenue|sales/.test(k) && !/count|days|pct|rate/.test(k);

/** Renders any report object the API returns: sections for lists, key/value cards for totals. Used for reconciliations whose shape grows with the backend. */
export function ReportView({ data }: { data: Record<string, any> }) {
  return <>{Object.entries(data).map(([k, v]) => <Section key={k} name={k} value={v} />)}</>;
}

function Section({ name, value }: { name: string; value: any }) {
  if (Array.isArray(value)) {
    return (<><H2>{label(name)} ({value.length})</H2>{value.length ? value.slice(0, 50).map((r, i) => (
      <Card key={i}>{Object.entries(r).map(([k, v]) => <Muted key={k}>{label(k)}: {String(v)}</Muted>)}</Card>
    )) : <Muted>Nothing to review</Muted>}</>);
  }
  if (value && typeof value === 'object') {
    return (<Card><H2>{label(name)}</H2>{Object.entries(value).map(([k, v]) => (
      <Row key={k} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>{label(k)}</Muted><Body>{isMoneyKey(k) && !isNaN(Number(v)) ? `₹${v}` : String(v)}</Body></Row>
    ))}</Card>);
  }
  return <Row style={{ justifyContent: 'space-between' }}><Muted>{label(name)}</Muted><Body>{String(value)}</Body></Row>;
}
