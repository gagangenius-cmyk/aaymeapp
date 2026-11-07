import React, { useEffect, useState } from 'react';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

/** Admin: how fast each priority must be answered and resolved (SLA), and the categories customers choose from. */
export default function DeskSettings() {
  const sla = useGet<any>('/support/desk/sla');
  const tickets = useGet<any>('/support/desk/tickets', { status: 'all', limit: 100 });
  const [vals, setVals] = useState<Record<string, { first: string; resolve: string }>>({});
  const [name, setName] = useState('');
  const [prio, setPrio] = useState('normal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (sla.data) setVals(Object.fromEntries(sla.data.sla.map((s: any) => [s.priority, { first: String(s.first_response_minutes), resolve: String(s.resolution_minutes) }])));
  }, [sla.data]);

  const saveSla = useSend<{ priority: string; first_response_minutes: number; resolution_minutes: number }>((b) => `/support/desk/sla/${b.priority}`, { method: 'PUT', invalidate: ['/support/desk/sla'], success: 'SLA saved' });
  const addCat = useSend<any>('/support/desk/categories', { invalidate: ['/support/desk/tickets'], onDone: () => setName(''), success: 'Category added' });
  const patchCat = useSend<{ id: number; name?: string; default_priority?: string; is_active?: boolean }>((b) => `/support/desk/categories/${b.id}`, { method: 'PUT', invalidate: ['/support/desk/tickets'], onDone: () => setEditing(null), success: 'Category updated' });

  // there is no "list categories" endpoint for staff, so the ones in use are read from the tickets that exist
  const cats = [...new Map<number, string>((tickets.data?.tickets ?? []).map((t: any) => [t.category_id, t.category])).entries()];

  if (sla.isLoading) return <Loading />;
  if (sla.error) return <ErrorBox error={sla.error} retry={sla.refetch} />;
  return (
    <Screen>
      <H2>Response targets (SLA)</H2>
      {PRIORITIES.map((p) => {
        const v = vals[p] ?? { first: '', resolve: '' };
        return (
          <Card key={p}>
            <Body style={{ fontWeight: '700' }}>{p}</Body>
            <Row>
              <Field label="First reply (min)" value={v.first} onChangeText={(t) => setVals({ ...vals, [p]: { ...v, first: t } })} keyboardType="number-pad" style={{ minWidth: 130 }} />
              <Field label="Resolve (min)" value={v.resolve} onChangeText={(t) => setVals({ ...vals, [p]: { ...v, resolve: t } })} keyboardType="number-pad" style={{ minWidth: 130 }} />
            </Row>
            <Button small variant="ghost" title="Save" loading={saveSla.isPending} onPress={() => saveSla.mutate({ priority: p, first_response_minutes: Number(v.first), resolution_minutes: Number(v.resolve) })} />
          </Card>
        );
      })}

      <H2>Ticket categories</H2>
      <Card>
        <Field label="New category" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
        <Row>{PRIORITIES.map((p) => <Chip key={p} label={p} active={prio === p} onPress={() => setPrio(p)} />)}</Row>
        <Button small title="Add category" disabled={name.trim().length < 2} loading={addCat.isPending} onPress={() => { setErrors({}); addCat.mutate({ name: name.trim(), default_priority: prio }, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
      </Card>
      <Muted>Categories already used by tickets (tap to rename or change default priority):</Muted>
      <Row>{cats.map(([id, n]) => <Chip key={id} label={n} active={editing?.id === id} onPress={() => { setEditing({ id, name: n }); setEditName(n); }} />)}</Row>
      {editing && (
        <Card>
          <Field label="Name" value={editName} onChangeText={setEditName} autoCapitalize="words" />
          <Row>{PRIORITIES.map((p) => <Chip key={p} label={`default ${p}`} onPress={() => patchCat.mutate({ id: editing.id, default_priority: p })} />)}</Row>
          <Row>
            <Button small title="Rename" disabled={editName.trim().length < 2 || editName === editing.name} onPress={() => patchCat.mutate({ id: editing.id, name: editName.trim() })} />
            <Button small variant="danger" title="Hide from customers" onPress={() => patchCat.mutate({ id: editing.id, is_active: false })} />
            <Button small variant="ghost" title="Close" onPress={() => setEditing(null)} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}
