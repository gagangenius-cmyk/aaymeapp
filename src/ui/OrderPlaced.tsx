import React, { useEffect, useRef } from 'react';
import { Animated, Linking, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../lib/theme';
import { Alert } from './alert';
import { AppText as Text } from './AppText';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { inr } from './kit';

const GREEN = '#1B9A2E';
const DARK_GREEN = '#0E7A1F';
const CONFETTI: [number, number, string, number][] = [   // left %, top px, colour, tilt
  [6, 40, '#2D9CDB', 25], [14, 110, '#F2C94C', -30], [22, 20, '#EB5757', 40], [30, 90, '#27AE60', -20], [38, 30, '#F2994A', 55], [60, 28, '#9B51E0', -35],
  [68, 100, '#2D9CDB', 20], [76, 36, '#EB5757', -45], [84, 90, '#F2C94C', 30], [92, 24, '#27AE60', -25], [48, 150, '#F2994A', 35], [95, 150, '#2D9CDB', -15], [4, 160, '#9B51E0', 50],
];

const when = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return { time: t, full: `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${t}` };
};

/** Shown after a customer places an order: a clear "done", the order's number, date and total, and where it goes from here. */
export function OrderPlaced({ order, onTrack }: { order: any; onTrack: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start(); }, [pop]);
  const at = when(order.created_at);
  const step = (icon: keyof typeof Ionicons.glyphMap, on: boolean, title: string, sub: string) => (
    <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: on ? GREEN : '#8A8F98', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={22} color="#fff" /></View>
      <Text style={{ color: on ? GREEN : colors.muted, fontWeight: '800', fontSize: 12.5, textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: colors.muted, fontSize: 11.5, textAlign: 'center' }}>{sub}</Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: '#EAF7EC' }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 16, gap: 14 }}>
        {CONFETTI.map(([l, t, c, r], i) => <View key={i} pointerEvents="none" style={{ position: 'absolute', left: `${l}%`, top: t, width: 9, height: 16, borderRadius: 2, backgroundColor: c, transform: [{ rotate: `${r}deg` }] }} />)}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={34} tagline={false} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <NotificationBell />
            <Pressable onPress={() => router.replace('/(customer)')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Home"><Ionicons name="home" size={28} color={colors.primary} /></Pressable>
          </View>
        </View>
        <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Animated.View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#fff', transform: [{ scale: pop }] }}>
            <Ionicons name="checkmark" size={58} color="#fff" />
          </Animated.View>
          <Text style={{ color: DARK_GREEN, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 8 }}>Order Successfully Placed!</Text>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>Thank you for shopping with AAYME</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#CDEFD2', borderRadius: 16, padding: 14 }}>
          <Ionicons name="shield-checkmark" size={32} color={DARK_GREEN} />
          <Text style={{ flex: 1, color: DARK_GREEN, fontSize: 15, fontWeight: '600' }}>Your order has been confirmed and will be processed shortly.</Text>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 70, height: 70, borderRadius: 14, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bag-handle" size={38} color="#fff" /></View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>Order ID : <Text style={{ color: '#1A237E', fontWeight: '800' }}>#{order.bill_no ?? order.id}</Text></Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>Order Date : {at.full}</Text>
              <Text style={{ color: colors.text, fontSize: 14 }}>Total Amount : <Text style={{ color: '#1A237E', fontWeight: '900', fontSize: 22 }}>{inr(order.total)}</Text></Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {step('checkmark', true, 'Order Placed', at.time)}
            {step('cube', true, 'Processing', 'In Progress')}
            {step('bicycle', false, 'Out for Delivery', 'Soon')}
          </View>
        </View>
        <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center' }}>{order.payment_method === 'cod' ? 'Pay in cash when it is delivered.' : 'Pay the store on UPI. The store marks the order paid when the money arrives.'}</Text>
        {!!order.upi_link && (
          <Pressable onPress={() => Linking.openURL(order.upi_link).catch(() => Alert.alert('UPI', 'No UPI app was found on this phone.'))} accessibilityRole="button"
            style={{ backgroundColor: colors.gold, borderRadius: 30, paddingVertical: 14, alignItems: 'center' }}><Text style={{ fontWeight: '800', fontSize: 16, color: colors.text }}>Pay with a UPI app</Text></Pressable>
        )}
        <Pressable onPress={() => router.replace('/(customer)')} accessibilityRole="button" style={{ backgroundColor: GREEN, borderRadius: 30, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Ionicons name="bag-handle" size={22} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>Continue Shopping</Text><Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
        <Pressable onPress={onTrack} accessibilityRole="button" style={{ backgroundColor: '#fff', borderRadius: 30, borderWidth: 2, borderColor: colors.primary, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <Ionicons name="receipt-outline" size={22} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>View My Orders</Text><Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
