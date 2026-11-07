import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const AREAS = [['', 'All'], ['auth', 'Sign-ins'], ['admin', 'Admin'], ['catalog', 'Catalog'], ['ledger', 'Ledger'], ['onboarding', 'Onboarding'], ['commission', 'Commission']];

/** Admin: append-only activity trail, newest first, with paging. */
export default function Audit() {
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['/admin/audit', action, actor], initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api<any>('/admin/audit', { query: { action: action || undefined, actor_id: actor || undefined, before: pageParam, limit: 40 } }),
    getNextPageParam: (last) => last.next_before ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p: any) => p.entries) ?? [];
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{AREAS.map(([v, l]) => <Chip key={v} label={l} active={action === v} onPress={() => setAction(v)} />)}</Row>
      <Field label="Actor id (optional)" value={actor} onChangeText={setActor} keyboardType="number-pad" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !rows.length ? <Empty text="No activity" /> : rows.map((e: any) => (
        <Card key={e.id}>
          <Body style={{ fontWeight: '700' }}>{e.action}</Body>
          <Muted>{e.actor_name ?? 'system'}{e.actor_role ? ` (${e.actor_role})` : ''} · {e.entity} {e.entity_id ?? ''} · {new Date(e.created_at).toLocaleString()}</Muted>
          {e.meta ? <Muted numberOfLines={3}>{JSON.stringify(e.meta)}</Muted> : null}
        </Card>
      ))}
      {q.hasNextPage && <Button variant="ghost" title="Load older" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
    </Screen>
  );
}
