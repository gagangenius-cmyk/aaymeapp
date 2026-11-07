import React from 'react';
import { useGet } from '../src/lib/hooks';
import { Body, Card, Empty, ErrorBox, inr, Loading, Muted, Screen } from '../src/ui/kit';

/** Company employee: commission earned on outside-network orders, per distributor. */
export default function StaffCommissions() {
  const q = useGet<any>('/staff/commissions');
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.commissions.length ? <Empty text="No commission yet" /> :
        q.data.commissions.map((c: any) => (
          <Card key={c.distributor_id}><Body style={{ fontWeight: '700' }}>{c.business_name}</Body><Muted>{c.orders} orders · gross {inr(c.gross_paise / 100)} · commission {inr(c.commission_paise / 100)}</Muted></Card>
        ))}
    </Screen>
  );
}
