import React, { useState } from 'react';
import { useGet } from '../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** Batches that are expired or about to expire, soonest first. */
export default function Expiring() {
  const [days, setDays] = useState('30');
  const q = useGet<any>('/catalog/expiring', { days });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{['7', '30', '60', '90'].map((d) => <Chip key={d} label={`${d} days`} active={days === d} onPress={() => setDays(d)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.batches.length ? <Empty text="Nothing expiring in this window" /> :
        q.data.batches.map((b: any) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{b.name}</Body><Chip label={b.expired ? 'Expired' : `${b.days_left}d left`} tone={b.expired ? 'danger' : b.days_left <= 7 ? 'warn' : undefined} /></Row>
            <Muted>Batch {b.batch_no} · {b.qty} units · expires {b.expiry_date}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
