import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Every commission entry (earned and reversed), plus the per-distributor total on outside-network orders. Settled entries belong to a statement. */
export default function CommissionEntries() {
  const [settled, setSettled] = useState<'' | '0' | '1'>('');
  const report = useGet<any>('/admin/commissions');
  const q = useInfiniteQuery({
    queryKey: ['/admin/commission/entries', settled], initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api<any>('/admin/commission/entries', { query: { settled: settled || undefined, before: pageParam, limit: 40 } }),
    getNextPageParam: (l) => l.next_before ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p: any) => p.entries) ?? [];
  return (
    <Screen onRefresh={() => { q.refetch(); report.refetch(); }} refreshing={q.isRefetching}>
      <H2>By distributor</H2>
      {(report.data?.commissions ?? []).map((c: any) => (
        <Card key={c.distributor_id}><Body style={{ fontWeight: '700' }}>{c.business_name}</Body><Muted>{c.orders} orders · gross {inr(c.gross_paise / 100)} · commission {inr(c.commission_paise / 100)}</Muted></Card>
      ))}
      <H2>Entries</H2>
      <Row>{[['', 'All'], ['0', 'Unsettled'], ['1', 'Settled']].map(([v, l]) => <Chip key={v} label={l} active={settled === v} onPress={() => setSettled(v as any)} />)}</Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !rows.length ? <Empty text="No entries" /> : rows.map((e: any) => (
        <Card key={e.id}>
          <Row style={{ justifyContent: 'space-between' }}><Body>{e.business_name} · order #{e.order_id}</Body><Body style={{ fontWeight: '700', color: Number(e.amount) < 0 ? '#22C55E' : undefined }}>{inr(e.amount)}</Body></Row>
          <Muted>{e.kind} · basis {inr(e.basis)} · {e.mode === 'percent' ? `${e.value}%` : `₹${e.value}/unit`}{e.settlement_id ? ` · statement #${e.settlement_id}` : ' · unsettled'}</Muted>
        </Card>
      ))}
      {q.hasNextPage && <Button variant="ghost" title="Load older" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
    </Screen>
  );
}
