import React, { useState } from 'react';
import { useGet } from '../../src/lib/hooks';
import { Card, Chip, ErrorBox, H2, Loading, Muted, Row, Screen, Body } from '../../src/ui/kit';

const label = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const isMoneyKey = (k: string) => /amount|total|due|balance|paid|value/.test(k) && !/count|days/.test(k);

/** Renders the reconciliation report generically: money that does not add up (unconfirmed payments, ledger drift) needs a human. */
function Section({ name, value }: { name: string; value: any }) {
  if (Array.isArray(value)) {
    return (<><H2>{label(name)} ({value.length})</H2>{value.length ? value.slice(0, 50).map((r, i) => (
      <Card key={i}>{Object.entries(r).map(([k, v]) => <Muted key={k}>{label(k)}: {String(v)}</Muted>)}</Card>
    )) : <Muted>Nothing to review</Muted>}</>);
  }
  if (value && typeof value === 'object') {
    return (<Card><H2>{label(name)}</H2>{Object.entries(value).map(([k, v]) => <Row key={k} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>{label(k)}</Muted><Body>{isMoneyKey(k) && !isNaN(Number(v)) ? `₹${v}` : String(v)}</Body></Row>)}</Card>);
  }
  return <Row style={{ justifyContent: 'space-between' }}><Muted>{label(name)}</Muted><Body>{String(value)}</Body></Row>;
}

export default function Reconciliation() {
  const [days, setDays] = useState('30');
  const q = useGet<any>('/admin/reconciliation', { days });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{['7', '30', '90'].map((d) => <Chip key={d} label={`${d} days`} active={days === d} onPress={() => setDays(d)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : Object.entries(q.data).map(([k, v]) => <Section key={k} name={k} value={v} />)}
    </Screen>
  );
}
