import React, { useState } from 'react';
import { SearchScan } from '../../src/ui/SearchScan';
import { useRouter } from 'expo-router';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row, Screen, Stat } from '../../src/ui/kit';

/** Stock control: totals and valuation, per-product positions, warehouses. */
export default function Inventory() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [low, setLow] = useState(false);
  const [wh, setWh] = useState<number | null>(null);
  const sum = useGet<any>('/inventory/summary');
  const pos = useGet<any>('/inventory/positions', { q: text.trim() || undefined, low: low ? '1' : undefined, warehouse_id: wh ?? undefined, limit: 50 });
  const whs = useGet<any>('/inventory/warehouses');
  const [wname, setWname] = useState('');
  const [editWh, setEditWh] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const patchWh = useSend<any>(`/inventory/warehouses/${editWh?.id}`, { method: 'PUT', invalidate: ['/inventory/warehouses', '/inventory/positions'], onDone: () => setEditWh(null), success: 'Warehouse updated' });
  const addWh = useSend<any>('/inventory/warehouses', { invalidate: ['/inventory/warehouses'], success: 'Warehouse added', onDone: () => setWname('') });
  const s = sum.data;
  return (
    <Screen onRefresh={() => { sum.refetch(); pos.refetch(); whs.refetch(); }} refreshing={sum.isRefetching}>
      {sum.isLoading ? <Loading /> : sum.error ? <ErrorBox error={sum.error} retry={sum.refetch} /> : (<>
        <Row><Stat label="On hand" value={s.on_hand} /><Stat label="Available" value={s.available} tone="ok" /></Row>
        <Row><Stat label="Reserved (placed)" value={s.reserved} /><Stat label="In transit" value={s.in_transit} /></Row>
        <Row><Stat label="Damaged" value={s.damaged} tone={s.damaged ? 'warn' : undefined} /><Stat label="Low / out" value={`${s.low_stock_products} / ${s.out_of_stock_products}`} tone={s.low_stock_products ? 'danger' : undefined} /></Row>
        {s.valuation && <Muted>Stock value: {inr(s.valuation.at_selling_price)} at selling price · {inr(s.valuation.at_cost)} at cost{s.valuation.complete ? '' : ` (${s.valuation.products_without_cost} products have no cost price)`}</Muted>}
      </>)}

      <H2>Warehouses</H2>
      <Row>
        <Chip label="All" active={wh === null} onPress={() => setWh(null)} />
        {(whs.data?.warehouses ?? []).map((w: any) => <Chip key={w.id} label={`${w.name}${w.is_default ? ' ★' : ''}${w.is_active ? '' : ' (off)'} · ${w.units}`} active={wh === w.id} onPress={() => { setWh(w.id); setEditWh(w); setEditName(w.name); }} />)}
      </Row>
      {editWh && (
        <Card>
          <Muted>Edit warehouse</Muted>
          <Field label="Name" value={editName} onChangeText={setEditName} />
          <Row>
            <Button small title="Rename" disabled={editName.trim().length < 2 || editName === editWh.name} loading={patchWh.isPending} onPress={() => patchWh.mutate({ name: editName.trim() })} />
            {!editWh.is_default && editWh.is_active && <Button small variant="ghost" title="Make default" onPress={() => patchWh.mutate({ is_default: true })} />}
            {!editWh.is_default && <Button small variant="ghost" title={editWh.is_active ? 'Deactivate' : 'Reactivate'} onPress={() => patchWh.mutate({ is_active: !editWh.is_active })} />}
            <Button small variant="ghost" title="Close" onPress={() => setEditWh(null)} />
          </Row>
        </Card>
      )}
      <Row><Field label="New warehouse" value={wname} onChangeText={setWname} style={{ minWidth: 200 }} /><Button small title="Add" disabled={wname.trim().length < 2} loading={addWh.isPending} onPress={() => addWh.mutate({ name: wname.trim() })} /></Row>

      <H2>Stock by product</H2>
      <Field label="Search" value={text} onChangeText={setText} placeholder="Name, SKU or barcode" />
      <SearchScan onCode={setText} />
      <Row><Chip label="Low stock only" active={low} onPress={() => setLow(!low)} /><Button small variant="ghost" title="Movements" onPress={() => router.push('/inventory/movements')} /><Button small variant="ghost" title="Stock check" onPress={() => router.push({ pathname: '/recon', params: { path: '/inventory/reconciliation' } })} /></Row>
      {pos.isLoading ? <Loading /> : pos.error ? <ErrorBox error={pos.error} retry={pos.refetch} /> : !pos.data.positions.length ? <Empty text="No products" /> :
        pos.data.positions.map((p: any) => (
          <Card key={p.product_id} onPress={() => router.push({ pathname: '/inventory/move', params: { product_id: String(p.product_id), name: p.name } })}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{p.name}</Body>{p.low && <Chip label={p.on_hand <= 0 ? 'Out' : 'Low'} tone="danger" />}</Row>
            <Muted>On hand {p.on_hand} · available {p.available} · reserved {p.reserved} · committed {p.committed} · in transit {p.in_transit} · damaged {p.damaged}</Muted>
            {p.warehouses.length > 1 && <Muted>{p.warehouses.map((w: any) => `${w.name}: ${w.qty}`).join(' · ')}</Muted>}
          </Card>
        ))}
    </Screen>
  );
}
