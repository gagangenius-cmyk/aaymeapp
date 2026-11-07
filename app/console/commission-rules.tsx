import React, { useState } from 'react';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Alert } from '../../src/ui/alert';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

/**
 * Admin: commission rules. The most specific rule wins (product > category > distributor > everyone); higher priority breaks ties.
 * A rule is switched off, never erased: past orders keep the rule they were priced with.
 */
export default function CommissionRules() {
  const q = useGet<any>('/admin/commission/rules');
  const dists = useGet<any>('/admin/distributors');
  const [edit, setEdit] = useState<any | null>(null);
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [dist, setDist] = useState<number | null>(null);
  const [priority, setPriority] = useState('0');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => { setEdit(null); setMode('percent'); setValue(''); setDist(null); setPriority('0'); setFrom(''); setTo(''); setNote(''); setActive(true); setErrors({}); };
  const save = useSend<any>(edit ? `/admin/commission/rules/${edit.id}` : '/admin/commission/rules', { method: edit ? 'PUT' : 'POST', invalidate: ['/admin/commission/rules'], onDone: reset, success: 'Rule saved' });
  const off = useSend<{ id: number }>((b) => `/admin/commission/rules/${b.id}`, { method: 'DELETE', invalidate: ['/admin/commission/rules'], success: 'Rule switched off' });

  const pick = (r: any) => {
    setEdit(r); setMode(r.mode === 'percent' ? 'percent' : 'fixed'); setValue(String(r.percent ?? r.fixed_per_unit ?? '')); setDist(r.distributor_id);
    setPriority(String(r.priority)); setFrom(r.valid_from ?? ''); setTo(r.valid_to ?? ''); setNote(r.note ?? ''); setActive(r.is_active);
  };
  const submit = () => {
    setErrors({});
    save.mutate({
      ...(mode === 'percent' ? { percent: Number(value) } : { fixed_per_unit: value }),
      distributor_id: dist, priority: Number(priority) || 0, valid_from: from || null, valid_to: to || null, note: note || null, is_active: active,
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>{edit ? `Edit rule #${edit.id}` : 'New rule'}</H2>
        <Muted>Applies to</Muted>
        <Row><Chip label="Every distributor" active={dist === null} onPress={() => setDist(null)} />{(dists.data?.distributors ?? []).map((d: any) => <Chip key={d.id} label={d.business_name} active={dist === d.id} onPress={() => setDist(d.id)} />)}</Row>
        <Row><Chip label="Percent of sale" active={mode === 'percent'} onPress={() => setMode('percent')} /><Chip label="Fixed per unit" active={mode === 'fixed'} onPress={() => setMode('fixed')} /></Row>
        <Field label={mode === 'percent' ? 'Percent (0-50)' : 'Amount per unit (INR)'} value={value} onChangeText={setValue} keyboardType="decimal-pad" error={errors.percent ?? errors.fixed_per_unit} />
        <Row>
          <Field label="Priority" value={priority} onChangeText={setPriority} keyboardType="numbers-and-punctuation" style={{ minWidth: 90 }} />
          <Field label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ minWidth: 130 }} error={errors.valid_from} />
          <Field label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ minWidth: 130 }} error={errors.valid_to} />
        </Row>
        <Field label="Note" value={note} onChangeText={setNote} />
        <Toggle label="Active" value={active} onChange={setActive} />
        <Row><Button small title={edit ? 'Save rule' : 'Create rule'} onPress={submit} loading={save.isPending} disabled={!value} />{edit && <Button small variant="ghost" title="Cancel" onPress={reset} />}</Row>
      </Card>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.rules.length ? <Empty text="No custom rules: each distributor's default rate applies." /> :
        q.data.rules.map((r: any) => (
          <Card key={r.id} onPress={() => pick(r)}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{r.business_name ?? 'Every distributor'}</Body><Chip label={r.is_active ? 'Active' : 'Off'} tone={r.is_active ? 'ok' : undefined} /></Row>
            <Muted>{r.percent != null ? `${r.percent}%` : `₹${r.fixed_per_unit} per unit`} · priority {r.priority}{r.category ? ` · ${r.category}` : ''}{r.product ? ` · ${r.product}` : ''}</Muted>
            <Muted>{r.valid_from ? `from ${r.valid_from} ` : ''}{r.valid_to ? `to ${r.valid_to}` : ''}{r.note ? ` · ${r.note}` : ''}</Muted>
            {r.is_active && <Button small variant="danger" title="Switch off" onPress={() => Alert.alert('Switch off this rule?', 'Past orders keep the rule they were priced with.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Switch off', style: 'destructive', onPress: () => off.mutate({ id: r.id }) }])} />}
          </Card>
        ))}
    </Screen>
  );
}
