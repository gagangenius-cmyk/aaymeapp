import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { colors, radius } from '../../src/lib/theme';
import { AppText as Text } from '../../src/ui/AppText';
import { Body, Button, Card, ErrorBox, H1, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const TILES: [keyof typeof Ionicons.glyphMap, string, string][] = [
  ['storefront', 'My Store', '/store/settings'], ['cube', 'Products', '/store/products'], ['people', 'Customers', '/store/customers'],
  ['cart', 'Orders', '/store/orders'], ['bicycle', 'Delivery', '/store/orders?delivery=1'], ['wallet', 'Payments', '/store/daybook'],
  ['stats-chart', 'Reports', '/store/reports'], ['megaphone', 'Offers', '/store/offers'], ['settings', 'Settings', '/store/settings'],
  ['barcode', 'Billing', '/store/pos'], ['book', 'Day book', '/store/daybook'], ['qr-code', 'Store QR', '/store/qr'],
];

/** The retailer's online store: the business at a glance, and everything needed to run it. */
export default function StoreHome() {
  const router = useRouter();
  const q = useGet<any>('/store/dashboard');
  const d = q.data;
  const stat = (icon: keyof typeof Ionicons.glyphMap, label: string, value: string | number) => (
    <Card style={{ flex: 1, minWidth: 140, gap: 4 }}>
      <Ionicons name={icon} size={22} color={colors.muted} />
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{value}</Text>
      <Muted>{label}</Muted>
    </Card>
  );
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>My online store</H1>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : (<>
        {!d.live && (
          <Card>
            <H2>Your store is not live yet</H2>
            <Muted>Your online store starts once you have an active AAYME subscription. You can set everything up now. Ask your distributor to sell you a plan.</Muted>
            <Button small title="My AAYME plan" onPress={() => router.push('/my-plan')} />
          </Card>
        )}
        <H2>Business Overview</H2>
        <Row style={{ alignItems: 'stretch' }}>{stat('people', 'Total Customers', d.total_customers)}{stat('bag', 'New Orders', d.new_orders)}</Row>
        <Row style={{ alignItems: 'stretch' }}>{stat('cash', 'Total Sales', inr(d.total_sales))}{stat('wallet', 'Earnings', inr(d.earnings))}</Row>
        <Muted>Today: {d.today_orders} {d.today_orders === 1 ? 'order' : 'orders'} · {inr(d.today_sales)}{d.low_stock ? ` · ${d.low_stock} products running low` : ''}</Muted>

        <H2>My Store Management</H2>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TILES.map(([icon, label, path]) => (
            <Pressable key={label} onPress={() => router.push(path as any)} accessibilityRole="button" accessibilityLabel={label}
              style={{ width: '31%', flexGrow: 1, minWidth: 96, alignItems: 'center', gap: 8, paddingVertical: 16, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={icon} size={28} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Body style={{ color: '#6B7A90', fontSize: 12 }}>Store code: {d.store_code}</Body>
      </>)}
    </Screen>
  );
}
