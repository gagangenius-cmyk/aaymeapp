import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const STATUSES = ['new', 'contacted', 'interested', 'converted', 'lost'] as const;
const LABEL: Record<string, string> = { new: 'New', contacted: 'Contacted', interested: 'Interested', converted: 'Converted', lost: 'Lost' };

/** Retailers a distributor is working on, before they buy a subscription. */
export default function Leads() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [find, setFind] = useState('');
  const [f, setF] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const q = useGet<any>('/sales/leads', { status: status || undefined, q: find.trim() || undefined });
  const add = useSend<any>('/sales/leads', { invalidate: ['/sales/leads'], success: 'Lead added', onDone: () => { setF({}); setErrors({}); } });
  const upd = useSend<{ id: number; status?: string }>((b) => `/sales/leads/${b.id}`, { method: 'PUT', invalidate: ['/sales/leads'], silent: true });
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>Add a lead</H2>
        <Field label="Retailer name" value={f.name ?? ''} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
        <Field label="Mobile number" value={f.phone ?? ''} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
        <Field label="Shop name (optional)" value={f.shop_name ?? ''} onChangeText={set('shop_name')} autoCapitalize="words" />
        <Field label="City (optional)" value={f.city ?? ''} onChangeText={set('city')} autoCapitalize="words" />
        <Field label="Note (optional)" value={f.note ?? ''} onChangeText={set('note')} />
        <Button title="Save lead" loading={add.isPending} disabled={!f.name?.trim() || f.phone?.length !== 10}
          onPress={() => add.mutate({ name: f.name.trim(), phone: f.phone, ...(f.shop_name?.trim() ? { shop_name: f.shop_name.trim() } : {}), ...(f.city?.trim() ? { city: f.city.trim() } : {}), ...(f.note?.trim() ? { note: f.note.trim() } : {}) }, { onError: (e) => setErrors(fieldErrors(e)) })} />
      </Card>

      <Field label="Search leads" value={find} onChangeText={setFind} placeholder="Name, shop name or phone number" />
      <Row>
        <Chip label={`All`} active={status === ''} onPress={() => setStatus('')} />
        {STATUSES.map((s) => <Chip key={s} label={`${LABEL[s]}${q.data?.counts?.[s] ? ` (${q.data.counts[s]})` : ''}`} active={status === s} onPress={() => setStatus(s)} />)}
      </Row>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.leads.length ? <Empty text="No leads yet" /> :
        q.data.leads.map((l: any) => (
          <Card key={l.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{l.shop_name || l.name}</Body><Chip label={LABEL[l.status]} tone={l.status === 'converted' ? 'ok' : l.status === 'lost' ? 'danger' : undefined} /></Row>
            <Muted>{l.name} · {l.phone}{l.city ? ` · ${l.city}` : ''}</Muted>
            {l.note ? <Muted>{l.note}</Muted> : null}
            {l.status !== 'converted' && (
              <Row>
                {STATUSES.filter((s) => s !== 'converted' && s !== l.status).map((s) => <Chip key={s} label={LABEL[s]} onPress={() => upd.mutate({ id: l.id, status: s })} />)}
                <Button small title="Sell subscription" onPress={() => router.push({ pathname: '/sales/sell', params: { lead_id: String(l.id), name: l.name, phone: l.phone, shop_name: l.shop_name ?? '', pincode: l.pincode ?? '' } })} />
              </Row>
            )}
          </Card>
        ))}
    </Screen>
  );
}
