import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useGet } from '../src/lib/hooks';
import { Chip, ErrorBox, Loading, Row, Screen } from '../src/ui/kit';
import { ReportView } from '../src/ui/ReportView';

/** Money-check reports. `path` picks which one: /collections/reconciliation (distributor), /inventory/reconciliation (stock vs ledger), /admin/reconciliation. Anything unmatched needs a human. */
export default function Recon() {
  const { path = '/collections/reconciliation' } = useLocalSearchParams<{ path?: string }>();
  const [days, setDays] = useState('30');
  const noRange = path.includes('inventory');
  const q = useGet<any>(path, noRange ? undefined : { days });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {!noRange && <Row>{['7', '30', '90'].map((d) => <Chip key={d} label={`${d} days`} active={days === d} onPress={() => setDays(d)} />)}</Row>}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : <ReportView data={q.data} />}
    </Screen>
  );
}
