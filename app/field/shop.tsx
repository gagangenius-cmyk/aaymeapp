import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../../src/ui/alert';
import * as Location from 'expo-location';
import QRCode from 'react-native-qrcode-svg';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, H2, Loading, Muted, Screen } from '../../src/ui/kit';

/** Retailer: pin your shop on the map once (standing in the shop), and show a short-lived QR for visiting staff to scan. */
export default function ShopField() {
  const qc = useQueryClient();
  const loc = useGet<any>('/field/shop-location');
  const [code, setCode] = useState<{ code: string; expires_in: number } | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = () => api<any>('/field/visit-code').then((c) => { setCode(c); setLeft(c.expires_in); }).catch((e) => Alert.alert('QR not available', e.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (code && left === 0) load(); }, [left]); // refresh automatically when it expires

  async function pin() {
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return Alert.alert('Location needed', 'Allow location while using the app to mark your shop.');
    setBusy(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await api('/field/shop-location', { method: 'PUT', body: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      qc.invalidateQueries({ queryKey: ['/field/shop-location'] });
    } catch (e: any) { Alert.alert('Not saved', e.message); } finally { setBusy(false); }
  }

  if (loc.isLoading) return <Loading />;
  if (loc.error) return <ErrorBox error={loc.error} retry={loc.refetch} />;
  return (
    <Screen>
      <Card>
        <H2>Shop location</H2>
        {loc.data.locked
          ? (<><Chip label="Saved" tone="ok" /><Muted>{loc.data.lat.toFixed(5)}, {loc.data.lng.toFixed(5)}</Muted>
            <Button small variant="ghost" title="Open in Maps" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.data.lat},${loc.data.lng}`)} />
            <Muted>It cannot be changed by you. If it is wrong, ask your distributor to reset it.</Muted></>)
          : (<><Muted>Stand inside your shop, then save. This can be done once.</Muted><Button title="Save my shop location" onPress={pin} loading={busy} /></>)}
      </Card>
      <Card style={{ alignItems: 'center' }}>
        <H2>Visit QR</H2>
        <Muted>Show this to the distributor's staff when they visit. It changes every few minutes.</Muted>
        {code ? <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12 }}><QRCode value={code.code} size={220} /></View> : <Loading />}
        <Body>Refreshes in {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Body>
      </Card>
    </Screen>
  );
}
