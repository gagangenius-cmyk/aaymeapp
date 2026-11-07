import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Alert } from './alert';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { api, mediaUrl, uploadRaw } from '../lib/api';
import { useGet, useSend } from '../lib/hooks';
import { colors } from '../lib/theme';
import { Button, Card, Chip, Field, H2, Muted, Row } from './kit';

/** Up to 5 photos per product (server limit). The first is the cover; tap a photo for more actions. */
export function ProductPhotos({ productId, images }: { productId: number; images: { id: number; url: string }[] }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: [`/catalog/${productId}`] }); qc.invalidateQueries({ queryKey: ['/catalog'] }); };

  async function add(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow access to add a photo.');
    // the server accepts up to 1.5 MB: let the picker shrink the photo for us
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1], exif: false };
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    setBusy(true);
    try { await uploadRaw(`/catalog/${productId}/images`, r.assets[0].uri, r.assets[0].mimeType ?? 'image/jpeg'); refresh(); }
    catch (e: any) { Alert.alert('Photo not added', e.message); } finally { setBusy(false); }
  }
  const act = (img: { id: number }, i: number) => Alert.alert('Photo', undefined, [
    ...(i > 0 ? [{ text: 'Make cover', onPress: () => api(`/catalog/${productId}/images/${img.id}/cover`, { method: 'POST', body: {} }).then(refresh).catch((e) => Alert.alert('Failed', e.message)) }] : []),
    { text: 'Delete', style: 'destructive' as const, onPress: () => api(`/catalog/${productId}/images/${img.id}`, { method: 'DELETE' }).then(refresh).catch((e) => Alert.alert('Failed', e.message)) },
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  return (
    <View style={{ gap: 8 }}>
      <H2>Photos ({images.length}/5)</H2>
      <Row>
        {images.map((img, i) => (
          <Pressable key={img.id} onPress={() => act(img, i)}>
            <Image source={{ uri: mediaUrl(img.url)! }} style={{ width: 84, height: 84, borderRadius: 12, borderWidth: i === 0 ? 2 : 1, borderColor: i === 0 ? colors.cyan : colors.border }} />
          </Pressable>
        ))}
      </Row>
      {images.length < 5 && <Row><Button small variant="ghost" title="Take photo" onPress={() => add(true)} loading={busy} /><Button small variant="ghost" title="From gallery" onPress={() => add(false)} loading={busy} /></Row>}
    </View>
  );
}

export interface PickedPhoto { uri: string; mime: string }

/** Photos chosen while adding a NEW product. They are held on the phone and uploaded as soon as the product is saved. */
export function NewProductPhotos({ photos, onChange, found }: { photos: PickedPhoto[]; onChange: (p: PickedPhoto[]) => void; found?: string[] }) {
  const foundN = found?.length ?? 0;
  const max = 5 - foundN;
  async function add(fromCamera: boolean) {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow access to add a photo.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1], exif: false };
    const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    onChange([...photos, { uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' }].slice(0, max));
  }
  return (
    <View style={{ gap: 8 }}>
      <H2>Photos ({photos.length + foundN}/5)</H2>
      <Row>
        {(found ?? []).map((u) => <Image key={u} source={{ uri: u }} style={{ width: 84, height: 84, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' }} resizeMode="contain" accessibilityLabel="Photo found for this barcode" />)}
        {photos.map((ph, i) => (
          <Pressable key={ph.uri} onPress={() => Alert.alert('Photo', undefined, [{ text: 'Remove', style: 'destructive', onPress: () => onChange(photos.filter((_, j) => j !== i)) }, { text: 'Cancel', style: 'cancel' }])}>
            <Image source={{ uri: ph.uri }} style={{ width: 84, height: 84, borderRadius: 12, borderWidth: i === 0 && !foundN ? 2 : 1, borderColor: i === 0 && !foundN ? colors.cyan : colors.border }} />
          </Pressable>
        ))}
      </Row>
      {photos.length < max && <Row><Button small variant="ghost" title="Take photo" onPress={() => add(true)} /><Button small variant="ghost" title="From gallery" onPress={() => add(false)} /></Row>}
      <Muted>Photos are uploaded when you tap Add product. The first one is the cover.</Muted>
    </View>
  );
}

/** Batch numbers and expiry dates. Stock moves with each batch; orders draw from the earliest expiry first (FEFO). */
export function ProductBatches({ productId }: { productId: number }) {
  const q = useGet<any>(`/catalog/${productId}/batches`);
  const [f, setF] = useState({ batch_no: '', qty: '', expiry_date: '' });
  const inv = [`/catalog/${productId}/batches`, `/catalog/${productId}`, '/catalog'];
  const add = useSend<any>(`/catalog/${productId}/batches`, { invalidate: inv, success: 'Batch added', onDone: () => setF({ batch_no: '', qty: '', expiry_date: '' }) });
  const off = useSend<{ id: number }>((b) => `/catalog/${productId}/batches/${b.id}/write-off`, { invalidate: inv });
  return (
    <View style={{ gap: 8 }}>
      <H2>Batches & expiry</H2>
      {q.data?.batches.map((b: any) => (
        <Card key={b.id}>
          <Row style={{ justifyContent: 'space-between' }}><Muted>Batch {b.batch_no}</Muted>{b.expired && <Chip label="Expired" tone="danger" />}</Row>
          <Muted>{b.qty_remaining} of {b.qty_received} left{b.expiry_date ? ` · expires ${b.expiry_date}` : ''}</Muted>
          {b.qty_remaining > 0 && <Button small variant="danger" title="Write off remaining" onPress={() => Alert.alert('Write off?', `${b.qty_remaining} units of batch ${b.batch_no} leave stock.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Write off', style: 'destructive', onPress: () => off.mutate({ id: b.id }) }])} />}
        </Card>
      ))}
      <Row>
        <Field label="Batch no." value={f.batch_no} onChangeText={(v) => setF({ ...f, batch_no: v })} style={{ minWidth: 110 }} />
        <Field label="Qty" value={f.qty} onChangeText={(v) => setF({ ...f, qty: v })} keyboardType="number-pad" style={{ minWidth: 80 }} />
        <Field label="Expiry" value={f.expiry_date} onChangeText={(v) => setF({ ...f, expiry_date: v })} placeholder="YYYY-MM-DD" style={{ minWidth: 120 }} />
      </Row>
      <Button small variant="ghost" title="Receive batch" disabled={!f.batch_no || !Number(f.qty)} loading={add.isPending}
        onPress={() => add.mutate({ batch_no: f.batch_no.trim(), qty: Number(f.qty), ...(f.expiry_date ? { expiry_date: f.expiry_date } : {}) })} />
    </View>
  );
}

/** Private products: choose which retailers may see and buy this product. Empty = visible to everyone. */
export function ProductAudience({ productId }: { productId: number }) {
  const router = useRouter();
  const q = useGet<any>(`/catalog/${productId}/audience`);
  const retailers = useGet<any>('/distributor/retailers');
  const [pick, setPick] = useState<number[] | null>(null);
  const chosen: number[] = pick ?? (q.data?.retailers ?? []).map((r: any) => r.id);
  const save = useSend<{ retailer_ids: number[] }>(`/catalog/${productId}/audience`, { method: 'PUT', invalidate: [`/catalog/${productId}/audience`, '/catalog'], onDone: () => setPick(null), success: 'Audience saved' });
  return (
    <View style={{ gap: 8 }}>
      <H2>Who can buy this?</H2>
      <Button small variant="ghost" title="Limit by pincode…" onPress={() => router.push({ pathname: '/product-audience', params: { id: String(productId) } })} />
      <Muted>{chosen.length ? `Only the ${chosen.length} chosen retailer${chosen.length === 1 ? '' : 's'} can see it.` : 'Every retailer you supply can see it.'}</Muted>
      <Row>{(retailers.data?.retailers ?? []).map((r: any) => (
        <Chip key={r.id} label={r.shop_name} active={chosen.includes(r.id)} onPress={() => setPick(chosen.includes(r.id) ? chosen.filter((x) => x !== r.id) : [...chosen, r.id])} />
      ))}</Row>
      {pick && <Row><Button small title="Save" loading={save.isPending} onPress={() => save.mutate({ retailer_ids: pick })} /><Button small variant="ghost" title="Cancel" onPress={() => setPick(null)} />{chosen.length > 0 && <Button small variant="ghost" title="Make public" onPress={() => save.mutate({ retailer_ids: [] })} />}</Row>}
    </View>
  );
}
