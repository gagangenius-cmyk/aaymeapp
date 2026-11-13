import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { StoreCard } from '../../src/ui/StoreCard';
import { Body, Card, Empty, ErrorBox, Field, H1, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Search stores and products near the customer. */
export default function CustomerSearch() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const [text, setText] = useState(params.q ?? '');
  const t = text.trim();
  const found = useGet<any>('/customer/search', { q: t }, t.length > 0);
  const all = useGet<any>('/customer/stores', undefined, t.length === 0);
  return (
    <Screen>
      <H1>Search</H1>
      <Field label="Search" value={text} onChangeText={setText} placeholder="Products, brands or stores" autoFocus={!params.q} />
      {t.length === 0 ? (all.isLoading ? <Loading /> : all.error ? <ErrorBox error={all.error} retry={all.refetch} /> : !all.data.stores.length ? <Empty text="No stores yet" /> : all.data.stores.map((s: any) => <StoreCard key={s.id} s={s} />))
        : found.isLoading ? <Loading /> : found.error ? <ErrorBox error={found.error} retry={found.refetch} /> : (<>
          {found.data.stores.map((s: any) => <StoreCard key={`s${s.id}`} s={s} />)}
          {found.data.products.map((p: any) => (
            <Card key={`p${p.id}`} onPress={() => router.push({ pathname: '/customer/store', params: { id: String(p.store_id) } })}>
              <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{p.name}</Body><Body style={{ fontWeight: '800' }}>{inr(p.price)}</Body></Row>
              <Muted>{p.store_name}{p.in_stock ? '' : ' · out of stock'}</Muted>
            </Card>
          ))}
          {!found.data.stores.length && !found.data.products.length && <Empty text="Nothing found. Try another word." />}
        </>)}
    </Screen>
  );
}
