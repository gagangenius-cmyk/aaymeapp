import React, { useState } from 'react';
import { Alert } from '../../src/ui/alert';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

type Item = { id: number; name: string; status: string; parent_id: number | null; products: number };

/** Admin: the shared category (with sub-categories) and brand lists. Distributors can suggest new ones; they wait here as "pending" until approved. */
export default function Taxonomy() {
  const [kind, setKind] = useState<'categories' | 'brands'>('categories');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);          // for a new category: null = top level
  const [editing, setEditing] = useState<{ id: number; name: string; parent_id: number | null } | null>(null);
  const q = useGet<any>(`/admin/${kind}`);
  const inv = [`/admin/${kind}`];
  const isCat = kind === 'categories';
  const add = useSend<any>(`/admin/${kind}`, { invalidate: inv, onDone: () => { setName(''); }, success: isCat ? 'Category added' : 'Brand added' });
  const [merging, setMerging] = useState<number | null>(null);
  const merge = useSend<{ id: number; into_id: number }>((b) => `/admin/${kind}/${b.id}/merge`, { invalidate: inv, onDone: () => setMerging(null), success: 'Merged' });
  const upd = useSend<{ id: number; status?: string; name?: string; parent_id?: number | null }>((b) => `/admin/${kind}/${b.id}`, { method: 'PUT', invalidate: inv });
  const save = useSend<{ id: number; name: string; parent_id?: number | null }>((b) => `/admin/${kind}/${b.id}`, { method: 'PUT', invalidate: inv, onDone: () => setEditing(null), success: isCat ? 'Category updated' : 'Brand updated' });

  const items: Item[] = q.data?.items ?? [];
  const byId = new Map(items.map((i) => [i.id, i]));
  // top-level categories first, each followed by its sub-categories (brands are a flat list)
  const ordered: { item: Item; depth: number }[] = [];
  if (isCat) {
    const walk = (parent: number | null, depth: number) => items.filter((i) => (i.parent_id ?? null) === parent).forEach((i) => { ordered.push({ item: i, depth }); if (depth < 6) walk(i.id, depth + 1); });
    walk(null, 0);
    items.filter((i) => i.parent_id && !byId.has(i.parent_id) && !ordered.some((o) => o.item.id === i.id)).forEach((i) => ordered.push({ item: i, depth: 0 }));
  } else items.forEach((i) => ordered.push({ item: i, depth: 0 }));
  const active = items.filter((i) => i.status !== 'retired');
  // a category can be placed under any active one except itself and its own sub-categories
  const descendants = (id: number): Set<number> => { const out = new Set<number>([id]); for (let grew = true; grew;) { grew = false; for (const i of items) if (i.parent_id && out.has(i.parent_id) && !out.has(i.id)) { out.add(i.id); grew = true; } } return out; };

  const submit = () => add.mutate(isCat ? { name: name.trim(), ...(parentId ? { parent_id: parentId } : {}) } : { name: name.trim() });

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Row><Chip label="Categories" active={isCat} onPress={() => { setKind('categories'); setEditing(null); setMerging(null); }} /><Chip label="Brands" active={!isCat} onPress={() => { setKind('brands'); setEditing(null); setMerging(null); }} /></Row>
      <Row><Field label={`New ${isCat ? 'category' : 'brand'}`} value={name} onChangeText={setName} style={{ minWidth: 200 }} autoCapitalize="words" /><Button small title="Add" disabled={!name.trim()} loading={add.isPending} onPress={submit} /></Row>
      {isCat && !!active.length && (
        <>
          <Muted>Add under (leave as top level for a main category):</Muted>
          <Row>
            <Chip label="Top level" active={parentId === null} onPress={() => setParentId(null)} />
            {active.map((c) => <Chip key={c.id} label={c.name} active={parentId === c.id} onPress={() => setParentId(c.id)} />)}
          </Row>
        </>
      )}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !items.length ? <Empty text="Nothing yet" /> :
        ordered.map(({ item: i, depth }) => (
          <Card key={i.id} style={depth ? { marginLeft: Math.min(depth, 4) * 16 } : undefined}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flexShrink: 1 }}>{depth ? '↳ ' : ''}{i.name}</Body><Chip label={i.status} tone={i.status === 'active' ? 'ok' : i.status === 'pending' ? 'warn' : 'danger'} /></Row>
            <Muted>{i.products} products</Muted>
            {editing?.id === i.id ? (
              <>
                <Field label="Name" value={editing.name} onChangeText={(v) => setEditing({ ...editing, name: v })} autoCapitalize="words" />
                {isCat && (
                  <>
                    <Muted>Place under:</Muted>
                    <Row>
                      <Chip label="Top level" active={editing.parent_id === null} onPress={() => setEditing({ ...editing, parent_id: null })} />
                      {active.filter((c) => !descendants(i.id).has(c.id)).map((c) => <Chip key={c.id} label={c.name} active={editing.parent_id === c.id} onPress={() => setEditing({ ...editing, parent_id: c.id })} />)}
                    </Row>
                  </>
                )}
                <Row>
                  <Button small title="Save" disabled={!editing.name.trim()} loading={save.isPending} onPress={() => save.mutate({ id: i.id, name: editing.name.trim(), ...(isCat ? { parent_id: editing.parent_id } : {}) })} />
                  <Button small variant="ghost" title="Cancel" onPress={() => setEditing(null)} />
                </Row>
              </>
            ) : (
              <Row>
                {i.status === 'pending' && <Button small title="Approve" onPress={() => upd.mutate({ id: i.id, status: 'active' })} />}
                {i.status !== 'retired' && <Button small variant="ghost" title="Edit" onPress={() => setEditing({ id: i.id, name: i.name, parent_id: i.parent_id ?? null })} />}
                {i.status !== 'retired' && <Button small variant="danger" title="Retire" onPress={() => Alert.alert('Retire?', `${i.name} will no longer be offered.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Retire', style: 'destructive', onPress: () => upd.mutate({ id: i.id, status: 'retired' }) }])} />}
                {i.status !== 'retired' && <Button small variant="ghost" title={merging === i.id ? 'Pick the one to keep' : 'Merge into…'} onPress={() => setMerging(merging === i.id ? null : i.id)} />}
                {i.status === 'retired' && <Button small variant="ghost" title="Restore" onPress={() => upd.mutate({ id: i.id, status: 'active' })} />}
              </Row>
            )}
            {merging === i.id && <Row>{items.filter((o) => o.id !== i.id && o.status === 'active').map((o) => <Chip key={o.id} label={`→ ${o.name}`} onPress={() => Alert.alert('Merge?', `All products using "${i.name}" move to "${o.name}".`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Merge', onPress: () => merge.mutate({ id: i.id, into_id: o.id }) }])} />)}</Row>}
          </Card>
        ))}
    </Screen>
  );
}
