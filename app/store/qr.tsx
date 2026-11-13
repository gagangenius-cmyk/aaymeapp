import React from 'react';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, ErrorBox, H2, Loading, Muted, Screen } from '../../src/ui/kit';

/** The store's QR code. A new customer who scans it goes to the Play Store; after installing and signing up they are added to this store and it is pinned on their home page. Someone who already has the app opens the store straight away. */
export default function StoreQr() {
  const q = useGet<any>('/store/me');
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  const s = q.data.store;
  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: 12 }}>
        <H2>{s.name}</H2>
        <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12 }}><QRCode value={q.data.qr_text} size={240} /></View>
        <Body style={{ fontWeight: '800', fontSize: 20, letterSpacing: 2 }}>{q.data.store_code}</Body>
        <Muted>Show this at your counter, print it on your bills and boards.</Muted>
      </Card>
      <Card>
        <Muted>New customers: scan it, install AAYME, sign up with their details and location, and your store opens first for them. Existing AAYME customers: scan it inside the app to open your store.</Muted>
      </Card>
      <Button title="Share" onPress={() => Share.share({ message: `Shop at ${s.name} on AAYME: ${q.data.qr_text}` })} />
    </Screen>
  );
}
