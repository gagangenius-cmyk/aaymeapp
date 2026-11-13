import React from 'react';
import { useRouter } from 'expo-router';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { MenuLink } from '../../src/ui/kit';

export default function CustomerAccount() {
  const router = useRouter();
  const go = (p: string) => () => router.push(p as any);
  return (
    <AccountScreen>
      <MenuLink icon="qr-code" label="Scan a store QR code" onPress={go('/customer/scan')} />
      <MenuLink icon="location" label="My address & location" onPress={go('/customer/profile')} />
      <MenuLink icon="shield-checkmark" label="Security & privacy" onPress={go('/security')} />
    </AccountScreen>
  );
}
