import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, H1, H2, inr, Muted, MenuLink, Row, Screen, Stat } from '../../src/ui/kit';

/** Distributor: sell AAYME subscriptions to retailers and earn commission. */
export default function SalesHub() {
  const router = useRouter();
  const e = useGet<any>('/sales/earnings');
  const go = (p: string) => () => router.push(p as any);
  return (
    <Screen onRefresh={e.refetch} refreshing={e.isRefetching}>
      <H1>Subscription sales</H1>
      <Muted>Sell an AAYME subscription to a retailer. When the payment is confirmed the retailer's online store starts and your commission is added.</Muted>
      <Row style={{ alignItems: 'stretch' }}>
        <Stat label="Commission to receive" value={inr(e.data?.pending ?? 0)} tone="ok" />
        <Stat label="Paid sales" value={e.data?.paid_sales ?? 0} />
      </Row>
      {!!e.data?.open_sales && <Body style={{ color: '#C77700' }}>{e.data.open_sales} {e.data.open_sales === 1 ? 'sale is' : 'sales are'} waiting for payment.</Body>}
      <H2>What do you want to do?</H2>
      <MenuLink icon="people" label="Retailer leads" onPress={go('/sales/leads')} />
      <MenuLink icon="pricetags" label="Subscription plans" onPress={go('/sales/plans')} />
      <MenuLink icon="bag-add" label="Sell subscription" onPress={go('/sales/sell')} />
      <MenuLink icon="wallet" label="My earnings" onPress={go('/sales/earnings')} />
      <MenuLink icon="clipboard" label="Sales history" onPress={go('/sales/history')} />
      <MenuLink icon="trending-up" label="Performance" onPress={go('/sales/performance')} />
    </Screen>
  );
}
