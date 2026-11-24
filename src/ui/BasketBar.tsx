import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cartCount, cartTotal, useStoreCart } from '../lib/storeCart';
import { Button, inr } from './kit';

/** The "View basket" button that floats above the tab bar while the basket has something in it. `tabs` is true on screens that have the bottom tabs. */
export function BasketBar({ tabs }: { tabs?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useStoreCart();
  const n = cartCount(cart);
  if (!n) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: (tabs ? 76 : 12) + insets.bottom }}>
      <Button title={`View basket · ${n} ${n === 1 ? 'item' : 'items'} · ${inr(cartTotal(cart))} · ${cart.store_name}`} onPress={() => router.push('/customer/cart')} />
    </View>
  );
}
