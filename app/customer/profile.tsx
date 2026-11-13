import React, { useEffect, useState } from 'react';
import { api } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { useGet } from '../../src/lib/hooks';
import { currentPlace, describePlace } from '../../src/lib/place';
import { toast } from '../../src/ui/Toast';
import { Alert } from '../../src/ui/alert';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, ErrorBox, Field, Loading, Muted, Screen } from '../../src/ui/kit';

/** The customer's name, delivery address and location. */
export default function CustomerProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useGet<any>('/customer/me');
  const [f, setF] = useState<Record<string, string>>({});
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) { setF({ name: q.data.name ?? '', address: q.data.address ?? '', pincode: q.data.pincode ?? '' }); if (q.data.lat != null) setPos({ lat: q.data.lat, lng: q.data.lng }); } }, [q.data]);
  async function locate() {
    const p = await currentPlace();
    if (!p) return Alert.alert('Location', 'Allow location access to use your current position.');
    setPos(p); const d = await describePlace(p);
    setF((s) => ({ ...s, address: d.address || s.address, pincode: d.pincode || s.pincode }));
  }
  async function save() {
    setBusy(true);
    try { await api('/customer/me', { method: 'PUT', body: { name: f.name.trim(), ...(f.address?.trim() ? { address: f.address.trim() } : {}), ...(f.pincode ? { pincode: f.pincode } : {}), ...(pos ? { lat: pos.lat, lng: pos.lng } : {}) } }); qc.invalidateQueries({ queryKey: ['/customer/me'] }); qc.invalidateQueries({ queryKey: ['/customer/home'] }); toast.success('Saved'); goBack(router); }
    catch (e: any) { Alert.alert('Not saved', e.message); } finally { setBusy(false); }
  }
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  return (
    <Screen>
      <Field label="Name" value={f.name ?? ''} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" />
      <Field label="Delivery address" value={f.address ?? ''} onChangeText={(v) => setF({ ...f, address: v })} multiline style={{ minHeight: 60 }} />
      <Field label="Pincode" value={f.pincode ?? ''} onChangeText={(v) => setF({ ...f, pincode: v.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={6} />
      <Muted>{pos ? `Location saved (${pos.lat}, ${pos.lng})` : 'No location saved yet'}</Muted>
      <Button variant="ghost" title="Use my current location" onPress={locate} />
      <Button title="Save" onPress={save} loading={busy} disabled={(f.name ?? '').trim().length < 2} />
    </Screen>
  );
}
