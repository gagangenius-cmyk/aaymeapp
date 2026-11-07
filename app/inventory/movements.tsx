import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Body, Button, Card, Empty, ErrorBox, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** The stock ledger: every change to stock, with who and why. Newest first. */
export default function Movements() {
  const q = useInfiniteQuery({
    queryKey: ['/inventory/movements'], initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api<any>('/inventory/movements', { query: { before: pageParam, limit: 40 } }),
    getNextPageParam: (l) => l.next_before ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p: any) => p.movements) ?? [];
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !rows.length ? <Empty text="No movements" /> : rows.map((m: any) => (
        <Card key={m.id}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{m.product}</Body><Body style={{ color: Number(m.delta) < 0 ? '#D93A55' : '#22C55E', fontWeight: '800' }}>{Number(m.delta) > 0 ? '+' : ''}{m.delta}</Body></Row>
          <Muted>{String(m.reason ?? '').replace(/_/g, ' ')}{m.bucket === 'damaged' ? ' (damaged)' : ''} · balance {m.balance_after}{m.warehouse ? ` · ${m.warehouse}` : ''}{m.actor ? ` · ${m.actor}` : ''}{m.note ? ` · ${m.note}` : ''} · {new Date(m.created_at).toLocaleString()}</Muted>
        </Card>
      ))}
      {q.hasNextPage && <Button variant="ghost" title="Load older" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
    </Screen>
  );
}
