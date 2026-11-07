import React, { useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { AppText as Text } from './AppText';
import { inr } from './kit';

/** The floating "N items · total · View cart" bar of a shop. A store screen publishes it; the host (mounted once, at the root) draws it above everything. */
export interface CartBarData { count: number; total: number; bottom: number; onPress: () => void }

let current: CartBarData | null = null;
const listeners = new Set<() => void>();
export const setCartBar = (d: CartBarData | null) => { current = d; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function CartBarHost() {
  const d = useSyncExternalStore(subscribe, () => current, () => null);
  const insets = useSafeAreaInsets();
  if (!d) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: d.bottom || insets.bottom }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8, paddingHorizontal: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{`${d.count} ${d.count === 1 ? 'item' : 'items'} in cart`}</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{inr(d.total)}</Text>
        </View>
        <Pressable onPress={d.onPress} accessibilityRole="button" accessibilityLabel="View cart"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.gold, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 22 }}>
          <Ionicons name="cart" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>View cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
