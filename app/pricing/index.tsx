import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

const KINDS = [['contract', 'Contract'], ['promotion', 'Promotion'], ['group', 'Group'], ['regional', 'Regional']] as const;
const KIND_HELP: Record<string, string> = {
  contract: 'Special prices for named retailers', promotion: 'Time-limited offer for chosen retailers',
  group: 'A standing price tier for a group of retailers', regional: 'Prices for retailers in certain pincodes',
};

/** Customer-specific pricing: contract, promotion, group and regional price lists. Higher priority wins when lists overlap. */
export default function PriceLists() {
  const router = useRouter();
  const q = useGet<any>('/pricing/lists');
  const [f, setF] = useState({ name: '', kind: 'contract', valid_from: '', valid_to: '', pins: '', priority: '0' });
  const [above, setAbove] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useSend<any>('/pricing/lists', {
    invalidate: ['/pricing/lists'],
    onDone: (l) => { setF({ ...f, name: '' }); router.push({ pathname: '/pricing/[id]', params: { id: String(l.id) } }); },
  });
  const submit = () => {
    setErrors({});
    create.mutate({
      name: f.name.trim(), kind: f.kind, priority: Number(f.priority) || 0, allow_above_standard: above,
      ...(f.valid_from ? { valid_from: f.valid_from } : {}), ...(f.valid_to ? { valid_to: f.valid_to } : {}),
      ...(f.kind === 'regional' ? { pincode_prefixes: f.pins.split(/[,\s]+/).filter(Boolean) } : {}),
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>New price list</H2>
        <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={errors.name} autoCapitalize="words" />
        <Row>{KINDS.map(([k, l]) => <Chip key={k} label={l} active={f.kind === k} onPress={() => setF({ ...f, kind: k })} />)}</Row>
        <Muted>{KIND_HELP[f.kind]}</Muted>
        {f.kind === 'regional' && <Field label="Pincode prefixes (comma separated)" value={f.pins} onChangeText={(v) => setF({ ...f, pins: v })} error={errors.pincode_prefixes} keyboardType="numbers-and-punctuation" />}
        <Row>
          <Field label="Valid from" value={f.valid_from} onChangeText={(v) => setF({ ...f, valid_from: v })} placeholder="YYYY-MM-DD" error={errors.valid_from} style={{ minWidth: 130 }} />
          <Field label="Valid to" value={f.valid_to} onChangeText={(v) => setF({ ...f, valid_to: v })} placeholder="YYYY-MM-DD" error={errors.valid_to} style={{ minWidth: 130 }} />
          <Field label="Priority" value={f.priority} onChangeText={(v) => setF({ ...f, priority: v })} keyboardType="numbers-and-punctuation" style={{ minWidth: 80 }} />
        </Row>
        <Toggle label="Allow prices above standard" value={above} onChange={setAbove} />
        <Button title="Create list" onPress={submit} loading={create.isPending} disabled={f.name.trim().length < 2} />
      </Card>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.lists.length ? <Empty text="No price lists yet" /> :
        q.data.lists.map((l: any) => (
          <Card key={l.id} onPress={() => router.push({ pathname: '/pricing/[id]', params: { id: String(l.id) } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{l.name}</Body><Chip label={l.is_active ? l.kind : 'off'} tone={l.is_active ? 'ok' : undefined} /></Row>
            <Muted>{l.items} products · {l.members} retailers · priority {l.priority}{l.valid_to ? ` · until ${l.valid_to}` : ''}</Muted>
          </Card>
        ))}
    </Screen>
  );
}
