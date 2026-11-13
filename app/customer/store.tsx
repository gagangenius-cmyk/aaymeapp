import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { cartCount, cartQty, cartTotal, setCartQty, useStoreCart } from '../../src/lib/storeCart';
import { colors } from '../../src/lib/theme';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const SOCIAL: [string, keyof typeof Ionicons.glyphMap, string][] = [['whatsapp_url', 'logo-whatsapp', '#25D366'], ['facebook_url', 'logo-facebook', '#1877F2'], ['instagram_url', 'logo-instagram', '#E1306C'], ['youtube_url', 'logo-youtube', '#FF0000']];

/** A store's full profile and menu: details, offers, categories and products, with a basket. */
export default function CustomerStore() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cart = useStoreCart();
  const [category, setCategory] = useState('');
  const [text, setText] = useState('');
  const view = useGet<any>(`/customer/stores/${id}`);
  const products = useGet<any>(`/customer/stores/${id}/products`, { category: category || undefined, q: text.trim() || undefined });
  const s = view.data?.store;
  const add = (p: any, qty: number) => {
    if (!setCartQty({ id: s.id, name: s.name }, p, qty)) Alert.alert('Start a new basket?', `Your basket has items from ${cart.store_name}. Clear it and add from ${s.name}?`, [
      { text: 'Keep basket', style: 'cancel' }, { text: 'Start new', style: 'destructive', onPress: () => { setCartQty({ id: -1, name: '' }, { id: -1, name: '', price: 0, unit: '' }, 0); setCartQty({ id: s.id, name: s.name }, p, qty); } }]);
  };
  if (view.isLoading) return <Screen><Loading /></Screen>;
  if (view.error) return <Screen><ErrorBox error={view.error} retry={view.refetch} /></Screen>;
  const count = cart.store_id === s.id ? cartCount(cart) : 0;
  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => { view.refetch(); products.refetch(); }} refreshing={view.isRefetching}>
        <Card>
          <H2>{s.name}</H2>
          {!!s.description && <Body>{s.description}</Body>}
          {!!s.address && <Muted>{s.address}{s.pincode ? `, ${s.pincode}` : ''}</Muted>}
          <Row>
            {s.distance_km != null && <Chip label={`${s.distance_km} km`} />}
            {s.delivery_minutes && <Chip label={`${s.delivery_minutes.min}-${s.delivery_minutes.max} min`} />}
            <Chip label={s.open_now ? 'Open now' : 'Closed'} tone={s.open_now ? 'ok' : 'danger'} />
            {s.opens_at && s.closes_at && <Chip label={`${s.opens_at} - ${s.closes_at}`} />}
          </Row>
          <Muted>{s.delivery_enabled ? `Delivery ${Number(s.delivery_fee) ? inr(s.delivery_fee) : 'free'}${s.free_delivery_above ? ` · free above ${inr(s.free_delivery_above)}` : ''}${Number(s.min_order) ? ` · minimum order ${inr(s.min_order)}` : ''}` : 'No delivery from this store'}</Muted>
          <Row style={{ gap: 16 }}>
            {!!s.phone && <Pressable hitSlop={8} onPress={() => Linking.openURL(`tel:${s.phone}`)} accessibilityLabel="Call the store"><Ionicons name="call" size={24} color={colors.primary} /></Pressable>}
            {SOCIAL.filter(([k]) => !!s[k]).map(([k, icon, color]) => <Pressable key={k} hitSlop={8} onPress={() => Linking.openURL(s[k]).catch(() => {})}><Ionicons name={icon} size={24} color={color} /></Pressable>)}
          </Row>
        </Card>

        {view.data.offers.map((o: any) => <Card key={o.id}><Body style={{ fontWeight: '800', color: colors.primary }}>{o.title}</Body>{!!o.description && <Muted>{o.description}</Muted>}</Card>)}

        <Field label="Search in this store" value={text} onChangeText={setText} placeholder="Product or brand" />
        <Row>
          <Chip label="All" active={category === ''} onPress={() => setCategory('')} />
          {view.data.categories.map((c: any) => <Chip key={c.name} label={c.name} active={category === c.name} onPress={() => setCategory(c.name)} />)}
        </Row>
        {products.isLoading ? <Loading /> : products.error ? <ErrorBox error={products.error} retry={products.refetch} /> : !products.data.products.length ? <Empty text="No products found" /> :
          products.data.products.map((p: any) => {
            const qty = cartQty(cart.store_id === s.id ? cart : { store_id: null, store_name: '', lines: [] }, p.id);
            return (
              <Card key={p.id}>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    {!!p.brand && <Muted>{p.brand}</Muted>}
                    <Body style={{ fontWeight: '700' }}>{p.name}</Body>
                    <Row style={{ gap: 8 }}><Body style={{ fontWeight: '800' }}>{inr(p.price)}</Body>{!!p.mrp && Number(p.mrp) > Number(p.price) && <Muted style={{ textDecorationLine: 'line-through' }}>{inr(p.mrp)}</Muted>}{p.discount_pct > 0 && <Muted style={{ color: colors.green }}>{p.discount_pct}% off</Muted>}</Row>
                    <Muted>per {p.unit}{p.in_stock && p.stock_qty <= 5 ? ` · only ${p.stock_qty} left` : ''}</Muted>
                  </View>
                  {!p.in_stock ? <Chip label="Out of stock" tone="danger" /> : qty > 0 ? (
                    <Row style={{ gap: 6, flexWrap: 'nowrap' }}><Button small variant="ghost" title="−" onPress={() => add(p, qty - 1)} /><Body style={{ minWidth: 22, textAlign: 'center', fontWeight: '800' }}>{qty}</Body><Button small variant="ghost" title="+" onPress={() => add(p, qty + 1)} /></Row>
                  ) : <Button small title="Add" onPress={() => add(p, 1)} />}
                </Row>
              </Card>
            );
          })}
        {count > 0 && <View style={{ height: 70 }} />}
      </Screen>
      {count > 0 && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
          <Button title={`View basket · ${count} ${count === 1 ? 'item' : 'items'} · ${inr(cartTotal(cart))}`} onPress={() => router.push('/customer/cart')} />
        </View>
      )}
    </View>
  );
}
