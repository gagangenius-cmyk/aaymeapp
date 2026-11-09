import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, uploadRaw } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { fieldErrors } from '../../src/lib/hooks';
import { toast } from '../../src/ui/Toast';
import { Alert } from '../../src/ui/alert';
import { Button, Chip, Field, H2, Muted, Row, Screen } from '../../src/ui/kit';

const KINDS = [['branding', 'Branding (poster, flex, board)'], ['expiry_pickup', 'Expired goods taken back'], ['return_pickup', 'Returned goods taken back']] as const;

/** Salesperson / delivery person: record what was done at a shop, with a photo. The distributor and the retailer see the same record. */
export default function FieldLog() {
  const { retailer_id, name } = useLocalSearchParams<{ retailer_id: string; name?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('branding');
  const [f, setF] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function pick(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', fromCamera ? 'Allow the camera to take a photo.' : 'Allow access to your photos.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false };
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled && r.assets[0]) setPhoto({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' });
  }

  async function save() {
    setErrors({}); setBusy(true);
    try {
      const body: Record<string, unknown> = { retailer_id: Number(retailer_id), kind, ...(f.title?.trim() ? { title: f.title.trim() } : {}), ...(f.note?.trim() ? { note: f.note.trim() } : {}) };
      if (kind !== 'branding') { body.product_name = f.product_name?.trim(); body.qty = Number(f.qty); }
      const r = await api<{ id: number }>('/field/logs', { body });
      if (photo) { try { await uploadRaw(`/field/logs/${r.id}/photo`, photo.uri, photo.mime); } catch (e: any) { toast.info(`Saved, but the photo could not be uploaded: ${e.message}`); } }
      qc.invalidateQueries({ queryKey: ['/field/logs'] });
      toast.success('Recorded');
      goBack(router);
    } catch (e: any) { setErrors(fieldErrors(e)); Alert.alert('Not saved', e.message); } finally { setBusy(false); }
  }

  const needsProduct = kind !== 'branding';
  return (
    <Screen>
      <H2>{name ?? `Shop #${retailer_id}`}</H2>
      <Row>{KINDS.map(([k, l]) => <Chip key={k} label={l} active={kind === k} onPress={() => setKind(k)} />)}</Row>
      <Field label={kind === 'branding' ? 'What was put up? (e.g. Flex board 4x2)' : 'Reason (e.g. expired, damaged)'} value={f.title ?? ''} onChangeText={set('title')} error={errors.title} />
      {needsProduct && <Row>
        <Field label="Product" value={f.product_name ?? ''} onChangeText={set('product_name')} style={{ minWidth: 180 }} error={errors.product_name} />
        <Field label="Quantity" value={f.qty ?? ''} onChangeText={set('qty')} keyboardType="number-pad" style={{ minWidth: 100 }} error={errors.qty} />
      </Row>}
      <Field label="Note (optional)" value={f.note ?? ''} onChangeText={set('note')} multiline style={{ minHeight: 60 }} />
      {photo ? <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 220, borderRadius: 8 }} resizeMode="cover" /> : <Muted>Add a photo so the office can see the work.</Muted>}
      <Row>
        <Button small variant="ghost" title="Take photo" onPress={() => pick(true)} />
        <Button small variant="ghost" title="Choose photo" onPress={() => pick(false)} />
        {photo && <Button small variant="ghost" title="Remove" onPress={() => setPhoto(null)} />}
      </Row>
      <Button title="Save record" onPress={save} loading={busy} disabled={needsProduct && (!f.product_name?.trim() || !Number(f.qty))} />
    </Screen>
  );
}
