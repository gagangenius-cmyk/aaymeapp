import React, { useState } from 'react';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

/** Admin: subscription plans. Changing a plan never changes what past payments bought. */
export default function Plans() {
  const q = useGet<any>('/admin/plans');
  const [edit, setEdit] = useState<any | null>(null);
  const [f, setF] = useState({ name: '', days: '30', price: '', description: '' });
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reset = () => { setEdit(null); setF({ name: '', days: '30', price: '', description: '' }); setActive(true); setErrors({}); };
  const save = useSend<any>(edit ? `/admin/plans/${edit.id}` : '/admin/plans', { method: edit ? 'PUT' : 'POST', invalidate: ['/admin/plans'], success: 'Plan saved', onDone: reset });
  const submit = () => { setErrors({}); save.mutate({ name: f.name, days: Number(f.days), price: f.price, ...(f.description ? { description: f.description } : {}), is_active: active }, { onError: (e) => setErrors(fieldErrors(e)) }); };
  const pick = (p: any) => { setEdit(p); setF({ name: p.name, days: String(p.days), price: p.price, description: p.description ?? '' }); setActive(p.is_active); };

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>{edit ? `Edit plan #${edit.id}` : 'New plan'}</H2>
        <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} error={errors.name} />
        <Row>
          <Field label="Days" value={f.days} onChangeText={(v) => setF({ ...f, days: v })} keyboardType="number-pad" error={errors.days} style={{ minWidth: 90 }} />
          <Field label="Price (INR, 0 = free)" value={f.price} onChangeText={(v) => setF({ ...f, price: v })} keyboardType="decimal-pad" error={errors.price} style={{ minWidth: 140 }} />
        </Row>
        <Field label="Description" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} />
        <Toggle label="Offered" value={active} onChange={setActive} />
        <Row><Button small title={edit ? 'Save' : 'Create plan'} onPress={submit} loading={save.isPending} />{edit && <Button small variant="ghost" title="Cancel" onPress={reset} />}</Row>
      </Card>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : q.data.plans.map((p: any) => (
        <Card key={p.id} onPress={() => pick(p)}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{p.name}</Body><Chip label={p.is_active ? 'Offered' : 'Hidden'} tone={p.is_active ? 'ok' : undefined} /></Row>
          <Muted>{p.days} days · {inr(p.price)}{p.description ? ` · ${p.description}` : ''}</Muted>
        </Card>
      ))}
    </Screen>
  );
}
