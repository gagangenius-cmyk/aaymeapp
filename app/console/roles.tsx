import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';
import { PermissionToggles } from '../../src/ui/PermissionToggles';

/** Admin: reusable permission roles for company employees. Assign a role in the employee form instead of ticking each power. */
export default function Roles() {
  const q = useGet<any>('/admin/roles');
  const [edit, setEdit] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [grantable, setGrantable] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const reset = () => { setEdit(null); setName(''); setDesc(''); setActions([]); setGrantable([]); setErrors({}); };
  const save = useSend<any>(edit ? `/admin/roles/${edit.id}` : '/admin/roles', { method: edit ? 'PUT' : 'POST', invalidate: ['/admin/roles', '/admin/staff'], success: 'Role saved', onDone: reset });
  const del = useSend<{ id: number }>((b) => `/admin/roles/${b.id}`, { method: 'DELETE', invalidate: ['/admin/roles'] });
  const pick = (r: any) => { if (r.is_system) return Alert.alert('Built-in role', 'Built-in roles cannot be changed. Create a copy instead.'); setEdit(r); setName(r.name); setDesc(r.description ?? ''); setActions(r.actions); setGrantable(r.grantable); };

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <H2>{edit ? `Edit role` : 'New role'}</H2>
        <Field label="Name" value={name} onChangeText={setName} error={errors.name} />
        <Field label="Description" value={desc} onChangeText={setDesc} />
        <Muted>Can do</Muted><PermissionToggles catalog={q.data.action_catalog} value={actions} onChange={setActions} />
        <Muted>Can hand out to distributors</Muted><PermissionToggles catalog={q.data.grant_catalog} value={grantable} onChange={setGrantable} />
        <Row>
          <Button small title={edit ? 'Save role' : 'Create role'} loading={save.isPending} onPress={() => { setErrors({}); save.mutate({ name, description: desc || null, actions, grantable }, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
          {edit && <Button small variant="ghost" title="Cancel" onPress={reset} />}
        </Row>
      </Card>
      {q.data.roles.map((r: any) => (
        <Card key={r.id} onPress={() => pick(r)}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{r.name}</Body>{r.is_system && <Chip label="Built-in" />}</Row>
          <Muted>{r.description ?? ''} {r.actions.length} actions · {r.grantable.length} grantable · {r.members} members</Muted>
          {!r.is_system && <Button small variant="danger" title="Delete" onPress={() => Alert.alert('Delete role?', r.name, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate({ id: r.id }) }])} />}
        </Card>
      ))}
    </Screen>
  );
}
