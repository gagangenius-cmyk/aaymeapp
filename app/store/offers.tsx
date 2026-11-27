import React, { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { imageMime, mediaUrl, uploadRaw } from '../../src/lib/api';
import { Alert } from '../../src/ui/alert';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

/** Offers shown to customers as banners on their home page and on your store. */
export default function StoreOffers() {
  const q = useGet<any>('/store/offers');
  const [f, setF] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const [banner, setBanner] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState<number | 'new' | null>(null);
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow access to add a photo.'); return null; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [2, 1], exif: false });
    return res.canceled ? null : res.assets[0];
  };
  const upload = async (id: number, img: ImagePicker.ImagePickerAsset) => {
    try { await uploadRaw(`/store/offers/${id}/image`, img.uri, imageMime(img.mimeType)); }
    catch (e: any) { Alert.alert('Banner not added', e.message); }
    qc.invalidateQueries({ queryKey: ['/store/offers'] });
  };
  const add = useSend<any>('/store/offers', { invalidate: ['/store/offers'], success: 'Offer added', onDone: async (o: any) => { setF({}); if (banner) { setBusy('new'); await upload(o.id, banner); setBanner(null); setBusy(null); } } });
  const change = async (id: number) => { const img = await pick(); if (!img) return; setBusy(id); await upload(id, img); setBusy(null); };
  const upd = useSend<{ id: number; is_active?: boolean }>((b) => `/store/offers/${b.id}`, { method: 'PUT', invalidate: ['/store/offers'], silent: true });
  const del = useSend<{ id: number }>((b) => `/store/offers/${b.id}`, { method: 'DELETE', invalidate: ['/store/offers'], success: 'Offer removed' });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>New offer</H2>
        <Field label="Title" value={f.title ?? ''} onChangeText={(v) => setF({ ...f, title: v })} placeholder="e.g. 10% off on all snacks" />
        <Field label="Details (optional)" value={f.description ?? ''} onChangeText={(v) => setF({ ...f, description: v })} />
        <Row><Field label="Starts (YYYY-MM-DD)" value={f.starts_on ?? ''} onChangeText={(v) => setF({ ...f, starts_on: v })} maxLength={10} style={{ minWidth: 150 }} /><Field label="Ends (YYYY-MM-DD)" value={f.ends_on ?? ''} onChangeText={(v) => setF({ ...f, ends_on: v })} maxLength={10} style={{ minWidth: 150 }} /></Row>
        {!!banner && <Image source={{ uri: banner.uri }} resizeMode="contain" style={{ width: '100%', aspectRatio: 2 }} />}
        <Row><Button small variant="ghost" title={banner ? 'Change banner' : 'Add banner picture'} onPress={async () => { const img = await pick(); if (img) setBanner(img); }} />{!!banner && <Button small variant="ghost" title="Remove picture" onPress={() => setBanner(null)} />}</Row>
        <Muted>A wide picture (2:1), for example 1200 x 600, fills the banner best.</Muted>
        <Button small title="Add offer" loading={add.isPending || busy === 'new'} disabled={(f.title ?? '').trim().length < 2} onPress={() => add.mutate({ title: f.title.trim(), ...(f.description?.trim() ? { description: f.description.trim() } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(f.starts_on ?? '') ? { starts_on: f.starts_on } : {}), ...(/^\d{4}-\d{2}-\d{2}$/.test(f.ends_on ?? '') ? { ends_on: f.ends_on } : {}) })} />
      </Card>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.offers.length ? <Empty text="No offers yet" /> :
        q.data.offers.map((o: any) => (
          <Card key={o.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{o.title}</Body><Chip label={o.is_active ? 'Showing' : 'Hidden'} tone={o.is_active ? 'ok' : 'danger'} /></Row>
            {!!o.description && <Muted>{o.description}</Muted>}
            {!!o.image_url && <View><Image source={{ uri: mediaUrl(o.image_url)! }} resizeMode="contain" style={{ width: '100%', aspectRatio: 2 }} /></View>}
            <Row><Button small variant="ghost" title={o.image_url ? 'Change banner' : 'Add banner picture'} loading={busy === o.id} onPress={() => change(o.id)} /></Row>
            <Row><Button small variant="ghost" title={o.is_active ? 'Hide' : 'Show'} onPress={() => upd.mutate({ id: o.id, is_active: !o.is_active })} /><Button small variant="danger" title="Remove" onPress={() => del.mutate({ id: o.id })} /></Row>
          </Card>
        ))}
    </Screen>
  );
}
