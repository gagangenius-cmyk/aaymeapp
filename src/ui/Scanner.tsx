import React, { useRef, useState } from 'react';
import { AppText as Text } from './AppText';
import { Modal, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../lib/theme';
import { Button } from './kit';

/** EAN-13 / UPC-A / EAN-8 carry a check digit: a half-seen or misread code almost never passes it. Other formats are accepted as read. */
export function validCode(data: string, type?: string): boolean {
  const numeric = /^\d+$/.test(data);
  if (!(type === 'ean13' || type === 'ean8' || type === 'upc_a') || !numeric) return true;
  if (data.length !== ({ ean13: 13, ean8: 8, upc_a: 12 } as Record<string, number>)[type]) return false;
  const d = data.split('').map(Number); const check = d.pop()!;
  const sum = d.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Full-screen camera that reports the first code it reads (barcode or QR), once. */
export function Scanner({ visible, types = ['qr'], title, onCode, onClose }: {
  visible: boolean; types?: ('qr' | 'ean13' | 'ean8' | 'upc_a' | 'upc_e' | 'code128' | 'code39')[]; title: string; onCode: (data: string) => void; onClose: () => void;
}) {
  const [perm, ask] = useCameraPermissions();
  const done = useRef(false);
  const last = useRef<{ data: string; n: number }>({ data: '', n: 0 }); // a code is accepted only once it is read the same way twice in a row
  const [torch, setTorch] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => { done.current = false; last.current = { data: '', n: 0 }; }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!perm?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>Camera access is needed to scan.</Text>
            <Button title="Allow camera" onPress={ask} />
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} facing="back" enableTorch={torch} autofocus="on" barcodeScannerSettings={{ barcodeTypes: types }}
            onBarcodeScanned={(r) => {
              if (done.current) return;
              const data = String(r.data ?? '').trim();
              if (!data || !validCode(data, r.type)) { last.current = { data: '', n: 0 }; return; }
              last.current = last.current.data === data ? { data, n: last.current.n + 1 } : { data, n: 1 };
              if (types.length === 1 && types[0] === 'qr') { /* QR carries its own integrity: one read is enough */ } else if (last.current.n < 2) return;
              done.current = true; onCode(data);
            }} />
        )}
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, backgroundColor: '#0008', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 }}>{title}</Text>
          <Text style={{ color: '#fff', fontSize: 12.5, marginTop: 8, backgroundColor: '#0008', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 }}>Hold steady until the whole barcode is in view</Text>
        </View>
        <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Button variant="ghost" title={torch ? 'Torch off' : 'Torch on'} onPress={() => setTorch(!torch)} /></View>
          <View style={{ flex: 1 }}><Button variant="ghost" title="Close" onPress={onClose} /></View>
        </View>
      </View>
    </Modal>
  );
}

export const PRODUCT_CODES: ('ean13' | 'ean8' | 'upc_a' | 'upc_e' | 'code128' | 'code39')[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'];
