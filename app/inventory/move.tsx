import React, { useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { Alert } from '../../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Button, Card, Chip, Field, H2, Muted, Row, Screen } from '../../src/ui/kit';

type Kind = 'transfer' | 'damaged' | 'damaged/recover' | 'damaged/write-off';
const KINDS: [Kind, string, string][] = [
  ['transfer', 'Transfer', 'Move stock between warehouses'],
  ['damaged', 'Mark damaged', 'Take sellable units out of stock'],
  ['damaged/recover', 'Recover', 'Put repaired units back'],
  ['damaged/write-off', 'Write off', 'Remove damaged units for good'],
];

/** Transfer a product between warehouses, or move units in and out of the damaged bucket. */
export default function StockMove() {
  const { product_id, name } = useLocalSearchParams<{ product_id: string; name?: string }>();
  const router = useRouter();
  const whs = useGet<any>('/inventory/warehouses');
  const [kind, setKind] = useState<Kind>('transfer');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [from, setFrom] = useState<number | null>(null);
  const [to, setTo] = useState<number | null>(null);
  const send = useSend<any>(`/inventory/${kind === 'transfer' ? 'transfers' : kind}`, { invalidate: ['/inventory/positions', '/inventory/summary'], onDone: () => { Alert.alert('Done'); goBack(router); } });
  const list: any[] = whs.data?.warehouses ?? [];
  const submit = () => send.mutate({
    product_id: Number(product_id), qty: Number(qty), ...(note ? { note } : {}),
    ...(kind === 'transfer' ? { from_warehouse_id: from, to_warehouse_id: to } : from ? { warehouse_id: from } : {}),
  });
  return (
    <Screen>
      <H2>{name ?? `Product #${product_id}`}</H2>
      <Row>{KINDS.map(([k, l]) => <Chip key={k} label={l} active={kind === k} onPress={() => setKind(k)} />)}</Row>
      <Muted>{KINDS.find((k) => k[0] === kind)![2]}</Muted>
      <Card>
        <Muted>{kind === 'transfer' ? 'From' : 'Warehouse (default if none chosen)'}</Muted>
        <Row>{list.map((w) => <Chip key={w.id} label={w.name} active={from === w.id} onPress={() => setFrom(w.id)} />)}</Row>
        {kind === 'transfer' && (<><Muted>To</Muted><Row>{list.filter((w) => w.id !== from).map((w) => <Chip key={w.id} label={w.name} active={to === w.id} onPress={() => setTo(w.id)} />)}</Row></>)}
      </Card>
      <Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
      <Field label="Note (optional)" value={note} onChangeText={setNote} />
      <Button title="Apply" onPress={submit} loading={send.isPending} disabled={!Number(qty) || (kind === 'transfer' && (!from || !to))} />
    </Screen>
  );
}
