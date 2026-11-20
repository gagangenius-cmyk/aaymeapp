import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { colors, radius } from '../../src/lib/theme';
import { AppText as Text } from '../../src/ui/AppText';
import { ProductGrid } from '../../src/ui/ProductTile';
import { Chip, Empty, ErrorBox, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const SORTS: [string, string][] = [['relevance', 'Relevance'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['discount', 'Discount']];
const PRICES: [string, number | undefined, number | undefined][] = [['Any price', undefined, undefined], ['Under ₹100', undefined, 100], ['₹100 – ₹500', 100, 500], ['₹500 – ₹2,000', 500, 2000], ['Over ₹2,000', 2000, undefined]];

/** A category: its sub-categories across the top, then filters (sort, brand, price, in stock) and the products. */
export default function CustomerCategory() {
  const params = useLocalSearchParams<{ name?: string; sub?: string; q?: string }>();
  const [sub, setSub] = useState(params.sub ?? '');
  const [brand, setBrand] = useState('');
  const [sort, setSort] = useState('relevance');
  const [price, setPrice] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [limit, setLimit] = useState(30);
  const [, lo, hi] = PRICES[price];
  const r = useGet<any>('/customer/products', { category: params.name || undefined, q: params.q || undefined, sub_category: sub || undefined, brand: brand || undefined, sort, min_price: lo, max_price: hi, in_stock: inStock ? '1' : undefined, limit });
  const f = r.data?.facets;
  const reset = () => { setBrand(''); setSort('relevance'); setPrice(0); setInStock(false); };
  const filtered = !!brand || sort !== 'relevance' || price !== 0 || inStock;
  return (
    <Screen onRefresh={() => r.refetch()} refreshing={r.isRefetching}>
      <H2>{params.name || 'All products'}</H2>
      {!!f?.sub_categories.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ flexGrow: 0 }}>
          {[{ name: '', products: r.data.total }, ...f.sub_categories].map((c: any) => {
            const on = sub === c.name;
            return (
              <Pressable key={c.name || 'all'} onPress={() => setSub(c.name)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ minWidth: 96, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary + '14' : colors.surface }}>
                <Text numberOfLines={2} style={{ color: on ? colors.primary : colors.text, fontWeight: on ? '800' : '600', fontSize: 13, textAlign: 'center' }}>{c.name || 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Muted>Sort</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {SORTS.map(([k, l]) => <Chip key={k} label={l} active={sort === k} onPress={() => setSort(k)} />)}
      </ScrollView>
      <Muted>Price</Muted>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {PRICES.map(([l], i) => <Chip key={l} label={l} active={price === i} onPress={() => setPrice(i)} />)}
        <Chip label="In stock only" active={inStock} onPress={() => setInStock(!inStock)} />
      </ScrollView>
      {!!f?.brands.length && (<>
        <Muted>Brand</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All brands" active={brand === ''} onPress={() => setBrand('')} />
          {f.brands.map((b: any) => <Chip key={b.name} label={`${b.name} (${b.products})`} active={brand === b.name} onPress={() => setBrand(brand === b.name ? '' : b.name)} />)}
        </ScrollView>
      </>)}
      <Row style={{ justifyContent: 'space-between' }}>
        <Muted>{r.data ? `${r.data.total} ${r.data.total === 1 ? 'product' : 'products'}` : ''}</Muted>
        {filtered && <Pressable onPress={reset} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '700' }}>Clear filters</Text></Pressable>}
      </Row>
      {r.isLoading ? <Loading /> : r.error ? <ErrorBox error={r.error} retry={r.refetch} /> : !r.data.products.length ? <Empty text="No products match these filters" /> : (<>
        <ProductGrid products={r.data.products} />
        {r.data.total > r.data.products.length && <Pressable onPress={() => setLimit(limit + 30)} style={{ alignItems: 'center', padding: 12 }}><Text style={{ color: colors.primary, fontWeight: '800' }}>Show more</Text></Pressable>}
      </>)}
      <View style={{ height: 8 }} />
    </Screen>
  );
}
