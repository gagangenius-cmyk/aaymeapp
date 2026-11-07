import React, { useEffect, useState } from 'react';
import { toast } from '../src/ui/Toast';
import { Alert } from '../src/ui/alert';
import { fieldErrors, useGet, useSend } from '../src/lib/hooks';
import { Button, Card, ErrorBox, Field, H2, Loading, Muted, Screen } from '../src/ui/kit';

const SOCIAL = [['whatsapp', 'WhatsApp (10-digit number or link)'], ['facebook', 'Facebook page link'], ['instagram', 'Instagram link'], ['youtube', 'YouTube link'], ['maps', 'Google Maps link']] as const;

/** Distributor: business details, how retailers pay you (UPI / bank), the pincodes you serve, and the social links shown on your store. */
export default function BusinessProfile() {
  const q = useGet<any>('/distributor/me');
  const pins = useGet<any>('/distributor/pincodes');
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pinText, setPinText] = useState('');
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const p = q.data; if (!p) return;
    const b = p.bank_account_details ?? {}; const s = p.social_links ?? {};
    setF({ business_name: p.business_name ?? '', gst_no: p.gst_no ?? '', address: p.address ?? '', city: p.city ?? '', pincode: p.pincode ?? '',
      upi_id: b.upi_id ?? '', account_name: b.account_name ?? '', account_no: b.account_no ?? '', ifsc: b.ifsc ?? '',
      ...Object.fromEntries(SOCIAL.map(([k]) => [k, s[k] ?? ''])) });
  }, [q.data?.business_name, q.data?.social_links]);
  useEffect(() => { if (pins.data) setPinText(pins.data.pincodes.join(', ')); }, [pins.data]);

  const save = useSend<any>('/distributor/me', { method: 'PUT', invalidate: ['/distributor/me'], onDone: () => toast.success('Saved') });
  const savePins = useSend<any>('/distributor/pincodes', { method: 'PUT', invalidate: ['/distributor/pincodes'], onDone: () => toast.success('Pincodes saved') });

  const submit = () => {
    setErrors({});
    const text = (k: string) => f[k]?.trim();
    const bank = { ...(text('upi_id') ? { upi_id: text('upi_id') } : {}), ...(text('account_no') ? { account_name: text('account_name'), account_no: text('account_no'), ifsc: text('ifsc') } : {}) };
    save.mutate({
      business_name: text('business_name'), ...(text('gst_no') ? { gst_no: text('gst_no') } : {}),
      ...(text('address') ? { address: text('address') } : {}), ...(text('city') ? { city: text('city') } : {}), ...(text('pincode') ? { pincode: text('pincode') } : {}),
      ...(Object.keys(bank).length ? { bank_account_details: bank } : {}),
      // an empty string removes that link on the server
      social_links: Object.fromEntries(SOCIAL.map(([k]) => [k, f[k] ?? ''])),
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  return (
    <Screen>
      <Card>
        <H2>Business</H2>
        <Field label="Business name" value={f.business_name} onChangeText={set('business_name')} error={errors.business_name} autoCapitalize="words" />
        <Field label="GSTIN" value={f.gst_no} onChangeText={set('gst_no')} autoCapitalize="characters" maxLength={15} error={errors.gst_no} />
        <Field label="Address" value={f.address} onChangeText={set('address')} error={errors.address} />
        <Field label="City" value={f.city} onChangeText={set('city')} error={errors.city} />
        <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
        <Muted>The address, GSTIN and pincode print on your GST invoices.</Muted>
      </Card>
      <Card>
        <H2>How retailers pay you</H2>
        <Field label="UPI id" value={f.upi_id} onChangeText={set('upi_id')} placeholder="name@bank" error={errors['bank_account_details.upi_id'] ?? errors.bank_account_details} />
        <Field label="Account holder" value={f.account_name} onChangeText={set('account_name')} />
        <Field label="Account number" value={f.account_no} onChangeText={set('account_no')} keyboardType="number-pad" />
        <Field label="IFSC" value={f.ifsc} onChangeText={set('ifsc')} autoCapitalize="characters" maxLength={11} />
        <Muted>A UPI id alone is enough. Bank details need name, number and IFSC together.</Muted>
      </Card>
      <Card>
        <H2>Links on your store</H2>
        {SOCIAL.map(([k, l]) => <Field key={k} label={l} value={f[k]} onChangeText={set(k)} keyboardType="url" />)}
        <Muted>Only links to the real site are accepted. Clear a field to remove its link.</Muted>
      </Card>
      <Button title="Save" onPress={submit} loading={save.isPending} />

      <Card>
        <H2>Pincodes you serve</H2>
        <Muted>Retailers in these pincodes can find your store (needs "Sell by pincode" switched on).</Muted>
        <Field label="Pincodes (comma separated)" value={pinText} onChangeText={setPinText} keyboardType="numbers-and-punctuation" multiline />
        <Button small variant="ghost" title="Save pincodes" loading={savePins.isPending} onPress={() => savePins.mutate({ pincodes: pinText.split(/[,\s]+/).filter(Boolean) })} />
      </Card>
    </Screen>
  );
}
