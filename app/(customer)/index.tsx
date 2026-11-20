import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { currentPlace, Place } from '../../src/lib/place';
import { colors, radius } from '../../src/lib/theme';
import { AppText as Text } from '../../src/ui/AppText';
import { ProductTile } from '../../src/ui/ProductTile';
import { StoreCard } from '../../src/ui/StoreCard';
import { Button, Empty, ErrorBox, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const ICON: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/mobile|phone|tech|electr/i, 'phone-portrait'], [/grocer|food|kirana|daily/i, 'basket'], [/home|clean|house/i, 'home'], [/snack|fast|bakery|sweet/i, 'fast-food'],
  [/cloth|garment|fashion/i, 'shirt'], [/medic|pharma|health/i, 'medkit'], [/wood|ply|hardware|tool/i, 'hammer'], [/beauty|cosmetic|personal/i, 'sparkles'],
];
const iconFor = (name: string): keyof typeof Ionicons.glyphMap => ICON.find(([r]) => r.test(name))?.[1] ?? 'pricetag';
const TINT = ['#FFF1E0', '#E6F4EA', '#E7F0FD', '#FDECEF', '#F1E8FD'];

/** The customer's home: search, offers as banners, shop by category, and the stores nearby (the store they joined first is pinned on top). */
export default function CustomerHome() {
  const router = useRouter();
  const qc = useQueryClient();
  const [place, setPlace] = useState<Place | null>(null);
  const [text, setText] = useState('');
  const q = useGet<any>('/customer/home', place ? { lat: place.lat, lng: place.lng } : undefined);
  // where the customer is right now (best effort); the saved address is used when the phone cannot say
  useEffect(() => { currentPlace().then((p) => { if (p) { setPlace(p); api('/customer/me', { method: 'PUT', body: { lat: p.lat, lng: p.lng } }).catch(() => {}); } }); }, []);
  const cat = useGet<any>('/customer/catalog', place ? { lat: place.lat, lng: place.lng } : undefined);
  const d = q.data;
  const open = (name: string, sub?: string) => router.push({ pathname: '/customer/category', params: sub ? { name, sub } : { name } });
  const search = (v?: string) => router.push({ pathname: '/(customer)/search', params: { q: v ?? text } });
  return (
    <Screen onRefresh={() => { qc.invalidateQueries({ queryKey: ['/customer/home'] }); qc.invalidateQueries({ queryKey: ['/customer/catalog'] }); }} refreshing={q.isRefetching}>
      <Row style={{ flexWrap: 'nowrap', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, minHeight: 46 }}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput value={text} onChangeText={setText} onSubmitEditing={() => search()} returnKeyType="search" placeholder="Search products, stores…" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 8 }} />
        </View>
        <Pressable onPress={() => router.push('/customer/scan')} accessibilityRole="button" accessibilityLabel="Scan a store QR" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="qr-code" size={22} color={colors.primary} />
        </Pressable>
      </Row>

      {!!cat.data?.categories.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 22, paddingHorizontal: 4 }} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ alignItems: 'center', gap: 4, paddingBottom: 8, borderBottomWidth: 3, borderBottomColor: colors.primary }}>
            <Ionicons name="bag-handle" size={24} color={colors.primary} /><Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>For You</Text>
          </View>
          {cat.data.categories.map((c: any) => (
            <Pressable key={c.name} onPress={() => open(c.name)} accessibilityRole="button" accessibilityLabel={c.name} style={{ alignItems: 'center', gap: 4, paddingBottom: 8 }}>
              <Ionicons name={iconFor(c.name)} size={24} color={colors.text} /><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, maxWidth: 84 }}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        {!!d.banners.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ flexGrow: 0 }}>
            {d.banners.map((b: any, i: number) => (
              <Pressable key={b.id} onPress={() => router.push({ pathname: '/customer/store', params: { id: String(b.retailer_id) } })} style={{ width: 300, borderRadius: radius.md, padding: 18, gap: 6, backgroundColor: ['#7A1F2B', '#0B3D6B', '#1E5B3A'][i % 3] }}>
                <Text style={{ color: '#FFFFFFB3', fontSize: 12, fontWeight: '700' }}>{b.store_name}</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }} numberOfLines={2}>{b.title}</Text>
                {!!b.description && <Text style={{ color: '#FFFFFFCC', fontSize: 13 }} numberOfLines={2}>{b.description}</Text>}
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 }}><Text style={{ color: '#7A1F2B', fontWeight: '800', fontSize: 13 }}>Order now</Text></View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {!!cat.data?.categories.length && (<>
          <Row style={{ justifyContent: 'space-between' }}><H2>Shop by Category</H2><Pressable onPress={() => router.push('/customer/category')}><Text style={{ color: colors.primary, fontWeight: '700' }}>View All ›</Text></Pressable></Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
            {cat.data.categories.slice(0, 12).map((c: any, i: number) => (
              <Pressable key={c.name} onPress={() => open(c.name)} accessibilityRole="button" accessibilityLabel={c.name} style={{ width: '25%', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 62, height: 62, borderRadius: 18, backgroundColor: TINT[i % TINT.length], alignItems: 'center', justifyContent: 'center' }}><Ionicons name={iconFor(c.name)} size={28} color={colors.primary} /></View>
                <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, textAlign: 'center' }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
          {cat.data.rails.filter((r: any) => r.products.length).map((r: any) => {
            const subs = cat.data.categories.find((c: any) => c.name === r.category)?.sub_categories ?? [];
            return (
              <View key={r.category} style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}><H2>{r.category}</H2><Pressable onPress={() => open(r.category)}><Text style={{ color: colors.primary, fontWeight: '700' }}>See all ›</Text></Pressable></Row>
                {!!subs.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>{subs.slice(0, 10).map((x: any) => <Pressable key={x.name} onPress={() => open(r.category, x.name)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.text, fontSize: 12.5 }}>{x.name}</Text></Pressable>)}</ScrollView>}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ flexGrow: 0 }}>{r.products.map((p: any) => <ProductTile key={`${p.store_id}-${p.id}`} p={p} width={156} />)}</ScrollView>
              </View>
            );
          })}
        </>)}

        {d.pinned_store && <StoreCard s={d.pinned_store} pinned />}
        <H2>Nearby Stores</H2>
        {!d.nearby_stores.length && !d.pinned_store ? <Empty text="No stores near you yet. Scan a store's QR code to open it." /> : d.nearby_stores.map((s: any) => <StoreCard key={s.id} s={s} />)}
        {!place && <Muted>Allow location to see the stores closest to you.</Muted>}
        <Button variant="ghost" title="Scan a store QR code" onPress={() => router.push('/customer/scan')} />
      </>)}
    </Screen>
  );
}
