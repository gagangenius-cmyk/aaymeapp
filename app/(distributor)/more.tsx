import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { Card, Chip, Muted, Row, H2, MenuLink } from '../../src/ui/kit';

/** Account, subscription, and every distributor tool that does not have its own tab. */
export default function More() {
  const router = useRouter();
  const sub = useGet<any>('/subscription');
  const pending = useGet<any>('/payments');
  const chat = useGet<any>('/chat/conversations');
  const toConfirm = (pending.data?.payments ?? []).filter((p: any) => p.status === 'pending' && p.method === 'upi').length;
  const unread = (chat.data?.conversations ?? []).reduce((n: number, c: any) => n + c.unread, 0);
  const s = sub.data;
  const go = (p: string) => () => router.push(p as any);
  return (
    <AccountScreen>
      {s && <Card onPress={go('/subscription')}><H2>Subscription</H2><Row><Chip label={s.status === 'expired' ? 'Expired' : `${s.days_left} days left`} tone={s.status === 'expired' ? 'danger' : s.status === 'expiring' ? 'warn' : 'ok'} /></Row><Muted>{s.plan_name} · ends {new Date(s.ends_at).toLocaleDateString()}</Muted></Card>}
      <MenuLink icon="stats-chart" label="Business summary" onPress={go('/business-summary')} />
      <MenuLink icon="business" label="Business profile, UPI & store links" onPress={go('/business-profile')} />
      <MenuLink icon="cash" label="Payments to confirm" badge={toConfirm} onPress={go('/payments')} />
      <MenuLink icon="wallet" label="Collections & dues" onPress={go('/collections')} />
      <MenuLink icon="return-down-back" label="Returns" onPress={go('/returns')} />
      <MenuLink icon="pricetags" label="Price lists (special pricing)" onPress={go('/pricing')} />
      <MenuLink icon="cube" label="Inventory & warehouses" onPress={go('/inventory')} />
      <MenuLink icon="hourglass" label="Expiring stock" onPress={go('/expiring')} />
      <MenuLink icon="person-add" label="Add a retailer" onPress={go('/(distributor)/retailer-new')} />
      <MenuLink icon="cloud-upload" label="Import products (CSV)" onPress={go('/import')} />
      <MenuLink icon="alert-circle" label="Khata disputes" onPress={go('/disputes')} />
      <MenuLink icon="map" label="Field: shops, beats & visits" onPress={go('/field')} />
      <MenuLink icon="images" label="Field records & photos" onPress={go('/field/records')} />
      <MenuLink icon="trending-up" label="Platform commission" onPress={go('/commission')} />
      <MenuLink icon="megaphone" label="Send offers to retailers" onPress={go('/(distributor)/offers')} />
      <MenuLink icon="chatbubbles" label="Chat with retailers" badge={unread} onPress={go('/chat')} />
      <MenuLink icon="help-buoy" label="Support" onPress={go('/support')} />
    </AccountScreen>
  );
}
