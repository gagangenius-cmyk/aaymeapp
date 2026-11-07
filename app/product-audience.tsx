import React, { useState } from 'react';
import { goBack } from '../src/lib/nav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

/**
 * Who can see this product: everyone, only the retailers you created (employees), or the retailers in chosen pincodes.
 * The server applies the limits: an employee can only narrow to retailers they manage.
 */
export default function ProductAudience() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { role } = useAuth();
  const router = useRouter();
  const isEmployee = role === 'employee';
  const current = useGet<any>(`/catalog/${id}/audience`);
  const retailers = useGet<any>('/distributor/retailers', { mine: isEmployee ? '1' : '0' });
  const [mode, setMode] = useState<'all' | 'mine' | 'pincodes'>('all');
  const [pins, setPins] = useState<string[]>([]);
  const [text, setText] = useState('');
  const save = useSend<any>(`/catalog/${id}/audience`, { method: 'PUT', invalidate: [`/catalog/${id}/audience`, '/catalog'], onDone: () => goBack(router), success: 'Visibility saved' });

  // pincodes of the retailers this person can see, as one-tap chips
  const known = [...new Set<string>((retailers.data?.retailers ?? []).map((r: any) => r.pincode).filter(Boolean))].sort();
  const addPin = (p: string) => { if (/^\d{6}$/.test(p) && !pins.includes(p)) setPins([...pins, p]); setText(''); };
  const preview = mode === 'pincodes'
    ? (retailers.data?.retailers ?? []).filter((r: any) => pins.includes(r.pincode)).length
    : mode === 'mine' ? (retailers.data?.retailers ?? []).length : null;

  if (current.isLoading || retailers.isLoading) return <Loading />;
  if (current.error) return <ErrorBox error={current.error} retry={current.refetch} />;
  const limited = current.data.retailers.length;
  const apply = () => save.mutate(mode === 'all' ? { retailer_ids: [] } : mode === 'mine' ? { mine: true } : { pincodes: pins });

  return (
    <Screen>
      <H2>{name ?? `Product #${id}`}</H2>
      <Card><Body>{limited ? `Now visible to ${limited} retailer${limited === 1 ? '' : 's'} only.` : 'Now visible to every retailer you supply.'}</Body></Card>
      <Row>
        <Chip label="Everyone" active={mode === 'all'} onPress={() => setMode('all')} />
        {isEmployee && <Chip label="Only my retailers" active={mode === 'mine'} onPress={() => setMode('mine')} />}
        <Chip label="By pincode" active={mode === 'pincodes'} onPress={() => setMode('pincodes')} />
      </Row>
      {mode === 'pincodes' && (
        <Card>
          <Muted>Choose the pincodes whose retailers may see this product{isEmployee ? ' (among your own retailers)' : ''}.</Muted>
          <Row>{known.map((p) => <Chip key={p} label={p} active={pins.includes(p)} onPress={() => setPins(pins.includes(p) ? pins.filter((x) => x !== p) : [...pins, p])} />)}</Row>
          <Row><Field label="Another pincode" value={text} onChangeText={setText} keyboardType="number-pad" maxLength={6} style={{ minWidth: 140 }} /><Button small variant="ghost" title="Add" disabled={text.length !== 6} onPress={() => addPin(text)} /></Row>
          {pins.filter((p) => !known.includes(p)).map((p) => <Chip key={p} label={`${p} ✕`} onPress={() => setPins(pins.filter((x) => x !== p))} />)}
        </Card>
      )}
      {preview !== null && <Muted>This will reach {preview} retailer{preview === 1 ? '' : 's'} now. Retailers added later are not included automatically.</Muted>}
      <Button title="Save visibility" onPress={apply} loading={save.isPending} disabled={mode === 'pincodes' && !pins.length} />
    </Screen>
  );
}
