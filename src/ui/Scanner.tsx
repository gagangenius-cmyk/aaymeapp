import React, { useRef, useState } from 'react';
import { AppText as Text } from './AppText';
import { Modal, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../lib/theme';
import { Button } from './kit';

/** Full-screen camera that reports the first code it reads (barcode or QR), once. */
export function Scanner({ visible, types = ['qr'], title, onCode, onClose }: {
  visible: boolean; types?: ('qr' | 'ean13' | 'ean8' | 'upc_a' | 'upc_e' | 'code128' | 'code39')[]; title: string; onCode: (data: string) => void; onClose: () => void;
}) {
  const [perm, ask] = useCameraPermissions();
  const done = useRef(false);
  const [torch, setTorch] = useState(false);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => { done.current = false; }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {!perm?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
            <Text style={{ color: colors.text, textAlign: 'center' }}>Camera access is needed to scan.</Text>
            <Button title="Allow camera" onPress={ask} />
          </View>
        ) : (
          <CameraView style={{ flex: 1 }} facing="back" enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: types }}
            onBarcodeScanned={(r) => { if (done.current) return; done.current = true; onCode(r.data); }} />
        )}
        <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, backgroundColor: '#0008', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 }}>{title}</Text>
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
