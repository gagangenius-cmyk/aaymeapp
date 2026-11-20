import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { mediaUrl } from '../lib/api';
import { cartQty, clearCart, setCartQty, useStoreCart } from '../lib/storeCart';
import { colors, radius } from '../lib/theme';
import { Alert } from './alert';
import { AppText as Text } from './AppText';
import { ProductImage } from './ProductImage';
import { Button, inr } from './kit';

/** A product in a grid or a row: photo, price, discount, the store it comes from, and Add / quantity controls for the basket. */
export function ProductTile({ p, width }: { p: any; width?: number }) {
  const router = useRouter();
  const cart = useStoreCart();
  const qty = cartQty(cart.store_id === p.store_id ? cart : { store_id: null, store_name: '', lines: [] }, p.id);
  const store = { id: p.store_id, name: p.store_name ?? 'Store' };
  const line = { ...p, image_url: mediaUrl(p.image_url) };
  const add = (n: number) => {
    if (!setCartQty(store, line, n)) Alert.alert('Start a new basket?', `Your basket has items from ${cart.store_name}. Clear it and add from ${store.name}?`, [
      { text: 'Keep basket', style: 'cancel' }, { text: 'Start new', style: 'destructive', onPress: () => { clearCart(); setCartQty(store, line, n); } }]);
  };
  return (
    <View style={{ width: width ?? '48.5%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 6 }}>
      <Pressable onPress={() => router.push({ pathname: '/customer/store', params: { id: String(p.store_id) } })} style={{ gap: 6 }} accessibilityRole="button" accessibilityLabel={p.name}>
        <ProductImage uri={mediaUrl(p.image_url)} />
        {!!p.brand && <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11.5 }}>{p.brand}</Text>}
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 13.5, fontWeight: '600', minHeight: 36 }}>{p.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{inr(p.price)}</Text>
          {!!p.mrp && Number(p.mrp) > Number(p.price) && <Text style={{ color: colors.muted, fontSize: 11.5, textDecorationLine: 'line-through' }}>{inr(p.mrp)}</Text>}
          {p.discount_pct > 0 && <Text style={{ color: colors.green, fontSize: 11.5, fontWeight: '700' }}>{p.discount_pct}% off</Text>}
        </View>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11 }}>per {p.unit}{p.store_name ? ` · ${p.store_name}` : ''}</Text>
      </Pressable>
      {!p.in_stock ? <Text style={{ color: colors.danger, fontSize: 12.5, fontWeight: '700' }}>Out of stock</Text> : qty > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button small variant="ghost" title="−" onPress={() => add(qty - 1)} /><Text style={{ fontWeight: '800' }}>{qty}</Text><Button small variant="ghost" title="+" onPress={() => add(qty + 1)} />
        </View>
      ) : <Button small title="Add" onPress={() => add(1)} />}
    </View>
  );
}

/** Products laid out two to a row. */
export function ProductGrid({ products }: { products: any[] }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>{products.map((p) => <ProductTile key={`${p.store_id}-${p.id}`} p={p} />)}</View>;
}
