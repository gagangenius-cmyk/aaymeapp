import React, { useEffect, useState } from 'react';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { currentPlace, describePlace } from '../../src/lib/place';
import { Alert } from '../../src/ui/alert';
import { Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

/** The store's profile and rules: name, address and location, opening hours, delivery, how customers pay, and links. */
export default function StoreSettings() {
  const q = useGet<any>('/store/me');
  const [f, setF] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState({ delivery_enabled: true, accepts_cod: true, accepts_upi: true, is_active: true });
  const [override, setOverride] = useState<0 | 1 | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const s = q.data?.store; if (!s) return;
    setF({ name: s.name ?? '', description: s.description ?? '', phone: s.phone ?? '', address: s.address ?? '', pincode: s.pincode ?? '', opens_at: s.opens_at ?? '', closes_at: s.closes_at ?? '',
      delivery_fee: s.delivery_fee ?? '0', free_delivery_above: s.free_delivery_above ?? '', min_order: s.min_order ?? '0', dmin: s.delivery_minutes ? String(s.delivery_minutes.min) : '', dmax: s.delivery_minutes ? String(s.delivery_minutes.max) : '',
      upi_id: s.upi_id ?? '', upi_payee: s.upi_payee ?? '', whatsapp_url: s.whatsapp_url ?? '', facebook_url: s.facebook_url ?? '', instagram_url: s.instagram_url ?? '', youtube_url: s.youtube_url ?? '' });
    setFlags({ delivery_enabled: s.delivery_enabled, accepts_cod: s.accepts_cod, accepts_upi: s.accepts_upi || !!s.upi_id, is_active: s.is_active });
    setOverride(s.open_override ?? null); if (s.lat != null) setPos({ lat: s.lat, lng: s.lng });
  }, [q.data]);
  const save = useSend<any>('/store/me', { method: 'PUT', invalidate: ['/store/me', '/store/dashboard'], success: 'Store saved' });
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const nul = (v?: string) => (v && v.trim() ? v.trim() : null);
  async function locate() {
    const p = await currentPlace();
    if (!p) return Alert.alert('Location', 'Allow location access to pin your shop.');
    setPos(p); const d = await describePlace(p);
    setF((s) => ({ ...s, address: s.address || d.address, pincode: s.pincode || d.pincode }));
  }
  const submit = () => {
    setErrors({});
    save.mutate({
      name: f.name.trim(), description: nul(f.description), phone: nul(f.phone), address: nul(f.address), pincode: nul(f.pincode), ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      opens_at: nul(f.opens_at), closes_at: nul(f.closes_at), open_override: override,
      delivery_enabled: flags.delivery_enabled, delivery_fee: f.delivery_fee || '0', free_delivery_above: nul(f.free_delivery_above), min_order: f.min_order || '0',
      delivery_minutes_min: f.dmin ? Number(f.dmin) : null, delivery_minutes_max: f.dmax ? Number(f.dmax) : null,
      upi_id: nul(f.upi_id), upi_payee: nul(f.upi_payee), accepts_cod: flags.accepts_cod, accepts_upi: flags.accepts_upi, is_active: flags.is_active,
      whatsapp_url: nul(f.whatsapp_url), facebook_url: nul(f.facebook_url), instagram_url: nul(f.instagram_url), youtube_url: nul(f.youtube_url),
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  return (
    <Screen>
      <Card>
        <H2>Store</H2>
        <Field label="Store name" value={f.name ?? ''} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
        <Field label="About the store" value={f.description ?? ''} onChangeText={set('description')} multiline style={{ minHeight: 60 }} />
        <Field label="Store phone" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
        <Field label="Address" value={f.address ?? ''} onChangeText={set('address')} multiline style={{ minHeight: 56 }} />
        <Field label="Pincode" value={f.pincode ?? ''} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
        <Muted>{pos ? `Shop location saved (${pos.lat}, ${pos.lng}). Customers nearby find you by it.` : 'Pin your shop location so customers nearby can find you.'}</Muted>
        <Button small variant="ghost" title="Use my current location" onPress={locate} />
        <Toggle label="Store switched on" help="Off hides the store from customers." value={flags.is_active} onChange={(v) => setFlags({ ...flags, is_active: v })} />
      </Card>
      <Card>
        <H2>Opening hours</H2>
        <Row><Field label="Opens (HH:MM)" value={f.opens_at ?? ''} onChangeText={set('opens_at')} placeholder="09:00" maxLength={5} style={{ minWidth: 110 }} error={errors.opens_at} /><Field label="Closes (HH:MM)" value={f.closes_at ?? ''} onChangeText={set('closes_at')} placeholder="21:00" maxLength={5} style={{ minWidth: 110 }} error={errors.closes_at} /></Row>
        <Row><Chip label="Follow hours" active={override === null} onPress={() => setOverride(null)} /><Chip label="Open now" active={override === 1} onPress={() => setOverride(1)} /><Chip label="Closed now" active={override === 0} onPress={() => setOverride(0)} /></Row>
      </Card>
      <Card>
        <H2>Delivery</H2>
        <Toggle label="Deliver to customers" value={flags.delivery_enabled} onChange={(v) => setFlags({ ...flags, delivery_enabled: v })} />
        <Row><Field label="Delivery fee (INR)" value={f.delivery_fee ?? ''} onChangeText={set('delivery_fee')} keyboardType="decimal-pad" style={{ minWidth: 120 }} /><Field label="Free above (INR)" value={f.free_delivery_above ?? ''} onChangeText={set('free_delivery_above')} keyboardType="decimal-pad" style={{ minWidth: 120 }} /></Row>
        <Field label="Minimum order (INR)" value={f.min_order ?? ''} onChangeText={set('min_order')} keyboardType="decimal-pad" />
        <Row><Field label="Delivery time, from (min)" value={f.dmin ?? ''} onChangeText={set('dmin')} keyboardType="number-pad" style={{ minWidth: 130 }} /><Field label="to (min)" value={f.dmax ?? ''} onChangeText={set('dmax')} keyboardType="number-pad" style={{ minWidth: 100 }} /></Row>
      </Card>
      <Card>
        <H2>Payments</H2>
        <Toggle label="Cash on delivery" value={flags.accepts_cod} onChange={(v) => setFlags({ ...flags, accepts_cod: v })} />
        <Toggle label="UPI" help="Customers pay straight into your account. The QR on your bills uses it." value={flags.accepts_upi} onChange={(v) => setFlags({ ...flags, accepts_upi: v })} />
        <Field label="Your UPI id" value={f.upi_id ?? ''} onChangeText={set('upi_id')} autoCapitalize="none" placeholder="name@bank" error={errors.upi_id} />
        <Field label="Name on UPI (optional)" value={f.upi_payee ?? ''} onChangeText={set('upi_payee')} />
      </Card>
      <Card>
        <H2>Links</H2>
        <Field label="WhatsApp link" value={f.whatsapp_url ?? ''} onChangeText={set('whatsapp_url')} autoCapitalize="none" placeholder="https://wa.me/91…" />
        <Field label="Facebook link" value={f.facebook_url ?? ''} onChangeText={set('facebook_url')} autoCapitalize="none" />
        <Field label="Instagram link" value={f.instagram_url ?? ''} onChangeText={set('instagram_url')} autoCapitalize="none" />
        <Field label="YouTube link" value={f.youtube_url ?? ''} onChangeText={set('youtube_url')} autoCapitalize="none" />
      </Card>
      <Button title="Save store" onPress={submit} loading={save.isPending} disabled={f.name?.trim().length < 2} />
    </Screen>
  );
}
