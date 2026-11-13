import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { AccountScreen } from '../../src/ui/AccountScreen';
import { MenuLink } from '../../src/ui/kit';

export default function RetailerAccount() {
  const router = useRouter();
  const chat = useGet<any>('/chat/conversations');
  const unread = (chat.data?.conversations ?? []).reduce((n: number, c: any) => n + c.unread, 0);
  const go = (p: string) => () => router.push(p as any);
  return (
    <AccountScreen>
      <MenuLink icon="storefront" label="My online store" onPress={go('/store')} />
      <MenuLink icon="barcode" label="Counter billing" onPress={go('/store/pos')} />
      <MenuLink icon="ribbon" label="My AAYME plan" onPress={go('/my-plan')} />
      <MenuLink icon="chatbubbles" label="Chat with distributors" badge={unread} onPress={go('/chat')} />
      <MenuLink icon="location" label="Shop location & visit QR" onPress={go('/field/shop')} />
      <MenuLink icon="images" label="Visit records & photos" onPress={go('/field/records')} />
      <MenuLink icon="alert-circle" label="My khata disputes" onPress={go('/disputes')} />
      <MenuLink icon="return-down-back" label="My returns" onPress={go('/returns')} />
      <MenuLink icon="help-buoy" label="Support" onPress={go('/support')} />
    </AccountScreen>
  );
}
