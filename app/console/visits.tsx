import React, { useState } from 'react';
import { Linking } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const RANGES: [number, string][] = [[7, '7 days'], [30, '30 days'], [90, '90 days']];

/** Admin: every retailer visit an employee punched by scanning the shop's QR, across all distributors. */
export default function VisitHistory() {
  const [days, setDays] = useState(30);
  const [text, setText] = useState('');
  const q = useInfiniteQuery({
    queryKey: ['/admin/visits', days, text.trim()], initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => api<any>('/admin/visits', { query: { days, q: text.trim() || undefined, before: pageParam, limit: 40 } }),
    getNextPageParam: (last) => last.next_before ?? undefined,
  });
  const rows = q.data?.pages.flatMap((p: any) => p.visits) ?? [];
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row>{RANGES.map(([d, l]) => <Chip key={d} label={l} active={days === d} onPress={() => setDays(d)} />)}</Row>
      <Field label="Search shop or employee" value={text} onChangeText={setText} autoCapitalize="none" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !rows.length ? <Empty text="No visits recorded in this period" /> : rows.map((v: any) => (
        <Card key={v.id}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Body style={{ fontWeight: '700', flex: 1 }}>{v.shop_name}</Body>
            {v.distance_m == null ? <Chip label="No location" /> : <Chip label={v.near ? 'At the shop' : `${Math.round(v.distance_m)} m away`} tone={v.near ? 'ok' : 'warn'} />}
          </Row>
          <Muted>{v.employee_name} · {v.distributor_name ?? 'Distributor'}</Muted>
          <Muted>{new Date(v.visited_at).toLocaleString()}</Muted>
          {v.lat != null && v.lng != null && <Button small variant="ghost" title="Where it was scanned" onPress={() => Linking.openURL(`https://maps.google.com/?q=${v.lat},${v.lng}`)} />}
        </Card>
      ))}
      {q.hasNextPage && <Button variant="ghost" title="Load older" loading={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />}
    </Screen>
  );
}
