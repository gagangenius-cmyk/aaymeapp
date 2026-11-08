import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Card, Chip, Empty, ErrorBox, Field, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Employee: the distributor's products. Tap one to choose who can see it (everyone, only your retailers, or chosen pincodes). */
export default function EmployeeProducts() {
  const router = useRouter();
  const [text, setText] = useState('');
  const q = useGet<any>('/catalog', { q: text.trim() || undefined, limit: 50 });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Products</H1>
      <Field label="Search" value={text} onChangeText={setText} placeholder="Name, brand, SKU or barcode" />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.products.length ? <Empty text="No products" /> :
        q.data.products.map((p: any) => (
          <Card key={p.id} onPress={() => router.push({ pathname: '/product-audience', params: { id: String(p.id), name: p.display_name } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{p.display_name}</Body>{p.private_to > 0 && <Chip label={`Limited to ${p.private_to}`} tone="warn" />}</Row>
            <Muted>Stock {p.stock_qty} · {p.is_active ? 'visible' : 'hidden'}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
