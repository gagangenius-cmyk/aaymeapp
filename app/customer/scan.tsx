import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { Alert } from '../../src/ui/alert';
import { Scanner } from '../../src/ui/Scanner';
import { Body, Button, Card, Field, H2, Muted, Screen } from '../../src/ui/kit';

/** Scan any AAYME store's QR code: the store opens with its full menu, and the customer is added to its customer list. */
export default function ScanStore() {
  const router = useRouter();
  const [scan, setScan] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  async function open(text: string) {
    setScan(false); setBusy(true);
    try {
      const r = await api<any>('/customer/scan', { body: { code: text } });
      router.replace({ pathname: '/customer/store', params: { id: String(r.store.id) } });
    } catch (e: any) { Alert.alert('Store not opened', e.message, [{ text: 'OK', onPress: () => setScan(false) }]); } finally { setBusy(false); }
  }
  return (
    <Screen>
      <Card>
        <H2>Open a store</H2>
        <Muted>Point the camera at the QR code on a store's counter or bill. You can also type the store code.</Muted>
        <Button title="Scan the QR code" onPress={() => setScan(true)} />
      </Card>
      <Field label="Store code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. 7A3F9C21" />
      <Button variant="ghost" title="Open store" loading={busy} disabled={code.trim().length < 4} onPress={() => open(code.trim())} />
      <Body style={{ color: '#6B7A90', fontSize: 12 }}>Once you open a store, it is added to your stores.</Body>
      <Scanner visible={scan} types={['qr']} title="Scan the store's QR code" onCode={open} onClose={() => { setScan(false); goBack(router); }} />
    </Screen>
  );
}
