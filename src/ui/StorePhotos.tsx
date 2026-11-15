import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { api, imageMime, mediaUrl, uploadRaw } from '../lib/api';
import { colors } from '../lib/theme';
import { Alert } from './alert';
import { Button, H2, Muted, Row } from './kit';

/** Up to 5 photos of a store product: take one with the camera or choose from the gallery. The first photo is the cover customers see; tap a photo to make it the cover or delete it. */
export function StorePhotos({ productId, images }: { productId: number; images: { id: number; url: string }[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['/store/products'] });

  async function add(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow access to add a photo.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1], exif: false };
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    setBusy(true);
    try { await uploadRaw(`/store/products/${productId}/images`, r.assets[0].uri, imageMime(r.assets[0].mimeType)); refresh(); }
    catch (e: any) { Alert.alert('Photo not added', e.message); } finally { setBusy(false); }
  }
  const act = (img: { id: number }, i: number) => Alert.alert('Photo', undefined, [
    ...(i > 0 ? [{ text: 'Make cover', onPress: () => api(`/store/products/${productId}/images/${img.id}/cover`, { method: 'POST', body: {} }).then(refresh).catch((e) => Alert.alert('Failed', e.message)) }] : []),
    { text: 'Delete', style: 'destructive' as const, onPress: () => api(`/store/products/${productId}/images/${img.id}`, { method: 'DELETE' }).then(refresh).catch((e) => Alert.alert('Failed', e.message)) },
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  return (
    <View style={{ gap: 8 }}>
      <H2>{`Photos (${images.length}/5)`}</H2>
      <Row>
        {images.map((img, i) => (
          <Pressable key={img.id} onPress={() => act(img, i)} accessibilityRole="button" accessibilityLabel={`Photo ${i + 1}`}>
            <Image source={{ uri: mediaUrl(img.url)! }} style={{ width: 84, height: 84, borderRadius: 12, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? colors.primary : colors.border }} />
          </Pressable>
        ))}
      </Row>
      {images.length < 5 && <Row><Button small variant="ghost" title="Take photo" onPress={() => add(true)} loading={busy} /><Button small variant="ghost" title="From gallery" onPress={() => add(false)} loading={busy} /></Row>}
      <Muted>The first photo is the cover customers see.</Muted>
    </View>
  );
}
