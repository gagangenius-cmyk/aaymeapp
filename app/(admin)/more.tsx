import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { H2, MenuLink } from '../../src/ui/kit';

/** Everything the admin runs beyond the main tabs. Badges show work waiting. */
export default function AdminMore() {
  const router = useRouter();
  const ob = useGet<any>('/admin/onboarding', { status: 'payment_submitted' });
  const sp = useGet<any>('/admin/subscription-payments', { status: 'pending' });
  const go = (p: string) => () => router.push(p as any);
  return (
    <AccountScreen>
      <H2>Money</H2>
      <MenuLink icon="person-add" label="Onboarding payments" badge={ob.data?.requests?.length} onPress={go('/console/onboarding')} />
      <MenuLink icon="card" label="Subscription payments" badge={sp.data?.payments?.length} onPress={go('/console/sub-payments')} />
      <MenuLink icon="pricetags" label="Subscription plans" onPress={go('/console/plans')} />
      <MenuLink icon="cash" label="Commission & settlements" onPress={go('/console/commission')} />
      <MenuLink icon="git-compare" label="Reconciliation" onPress={go('/console/reconciliation')} />
      <MenuLink icon="settings" label="Company UPI & payout rules" onPress={go('/console/settings')} />
      <H2>People & catalog</H2>
      <MenuLink icon="business" label="Distributors" onPress={go('/console/distributors')} />
      <MenuLink icon="shield-checkmark" label="Permission roles" onPress={go('/console/roles')} />
      <MenuLink icon="checkmark-done" label="Product approvals" onPress={go('/console/products')} />
      <MenuLink icon="albums" label="Categories & brands" onPress={go('/console/taxonomy')} />
      <H2>Oversight</H2>
      <MenuLink icon="download" label="Export reports (CSV / Excel)" onPress={() => router.push({ pathname: '/reports-export', params: { base: '/admin' } })} />
      <MenuLink icon="cube" label="Stock vs ledger check" onPress={() => router.push({ pathname: '/recon', params: { path: '/admin/inventory/reconciliation' } })} />
      <MenuLink icon="list" label="Audit trail" onPress={go('/console/audit')} />
      <MenuLink icon="qr-code" label="Visit history (QR scans)" onPress={go('/console/visits')} />
      <MenuLink icon="headset" label="Support desk" onPress={go('/desk')} />
      <MenuLink icon="lock-closed" label="Security & sessions" onPress={go('/security')} />
    </AccountScreen>
  );
}
