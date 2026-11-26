import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Select } from '../../src/ui/Select';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const RELATIONS = ['Self', 'Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'];
const KINDS: [string, string][] = [['birthday', 'Birthday'], ['anniversary', 'Anniversary'], ['other', 'Other']];

/** The dates of one customer and their family: birthdays, anniversaries, anything the retailer wants to wish them on. */
export default function CustomerOccasions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>(`/store/customers/${id}/occasions`);
  const [f, setF] = useState<Record<string, any>>({ kind: 'birthday', relation: 'Self' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useSend<any>(`/store/customers/${id}/occasions`, { invalidate: [`/store/customers/${id}/occasions`, '/store/occasions/upcoming'], success: 'Date saved', onDone: () => setF({ kind: 'birthday', relation: 'Self' }) });
  const [name, setName] = useState<string | null>(null);
  const rename = useSend<{ name: string }>(`/store/customers/${id}`, { method: 'PUT', invalidate: [`/store/customers/${id}/occasions`, '/store/customers'], success: 'Customer saved', onDone: () => setName(null) });
  const del = useSend<{ id: number }>((b) => `/store/occasions/${b.id}`, { method: 'DELETE', invalidate: [`/store/customers/${id}/occasions`, '/store/occasions/upcoming'], success: 'Removed' });
  const set = (k: string) => (v: any) => setF((s) => ({ ...s, [k]: v }));
  const days = f.month ? new Date(2024, f.month, 0).getDate() : 31;
  const save = () => {
    setErrors({});
    add.mutate({ person_name: (f.person_name ?? '').trim() || q.data?.customer.name, relation: f.relation && f.relation !== 'Other' ? f.relation : null, kind: f.kind, label: f.kind === 'other' ? (f.label ?? '').trim() || null : null,
      month: f.month, day: f.day, birth_year: f.year ? Number(f.year) : null }, { onError: (e) => setErrors(fieldErrors(e)) });
  };
  if (q.isLoading) return <Screen><Loading /></Screen>;
  if (q.error) return <Screen><ErrorBox error={q.error} retry={q.refetch} /></Screen>;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>Customer details</H2>
        <Field label="Name" value={name ?? q.data.customer.name} onChangeText={setName} autoCapitalize="words" />
        <Muted>{q.data.customer.phone}</Muted>
        {name !== null && name.trim() !== q.data.customer.name && <Button small title="Save name" loading={rename.isPending} disabled={name.trim().length < 2} onPress={() => rename.mutate({ name: name.trim() })} />}
      </Card>
      <Muted>Save the birthdays and anniversaries of this customer and their family. You will get a reminder before each one, to send a wish and an offer.</Muted>
      <Card>
        <H2>Add a date</H2>
        <Row>{KINDS.map(([k, l]) => <Chip key={k} label={l} active={f.kind === k} onPress={() => set('kind')(k)} />)}</Row>
        <Select label="Whose date is it?" value={f.relation} options={RELATIONS.map((r) => ({ value: r, label: r }))} onChange={(v) => set('relation')(v ? String(v) : 'Self')} />
        <Field label="Name of the person" value={f.person_name ?? ''} onChangeText={set('person_name')} autoCapitalize="words" placeholder={q.data.customer.name} error={errors.person_name} />
        {f.kind === 'other' && <Field label="What is the occasion?" value={f.label ?? ''} onChangeText={set('label')} placeholder="e.g. Shop opening" />}
        <Row style={{ flexWrap: 'nowrap' }}>
          <Select style={{ flex: 1 }} label="Month" value={f.month} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} onChange={(v) => set('month')(v ? Number(v) : undefined)} />
          <Select style={{ flex: 1 }} label="Day" value={f.day} options={Array.from({ length: days }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} onChange={(v) => set('day')(v ? Number(v) : undefined)} />
        </Row>
        <Field label={f.kind === 'anniversary' ? 'Year of marriage (optional)' : 'Year of birth (optional)'} value={f.year ?? ''} onChangeText={set('year')} keyboardType="number-pad" maxLength={4} placeholder="e.g. 2018" />
        <Button title="Save date" onPress={save} loading={add.isPending} disabled={!f.month || !f.day} />
      </Card>
      {!q.data.occasions.length ? <Empty text="No dates saved yet" /> : q.data.occasions.map((o: any) => (
        <Card key={o.id}>
          <Body style={{ fontWeight: '800' }}>{o.person_name}{o.relation ? ` (${o.relation})` : ''}</Body>
          <Muted>{o.kind === 'other' ? o.label || 'Special day' : o.kind === 'birthday' ? 'Birthday' : 'Anniversary'} · {o.day} {MONTHS[o.month - 1]}{o.birth_year ? ` ${o.birth_year}` : ''} · {o.days_until === 0 ? 'today' : `in ${o.days_until} days`}</Muted>
          <Row>
            {o.days_until <= 60 && <Button small title={o.wished ? 'Wish again' : 'Send wish'} variant="ghost" onPress={() => router.push({ pathname: '/store/wish', params: { id: String(o.id) } })} />}
            <Button small variant="danger" title="Remove" onPress={() => Alert.alert('Remove this date?', `${o.person_name}`, [{ text: 'Keep', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => del.mutate({ id: o.id }) }])} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
