import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../../src/ui/alert';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { useAuth } from '../../src/lib/auth';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Distributor: shops on a map list (nearest first), weekly beat plans per employee, and who visited what. */
export default function Field_() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const map = useGet<any>('/field/map', here ?? undefined);
  const beats = useGet<any>('/field/beats', undefined, role === 'distributor');
  const opts = useGet<any>('/field/beats/options', undefined, role === 'distributor');
  const visits = useGet<any>('/field/visits', { days: 7 }, role === 'distributor');
  const [f, setF] = useState({ name: '' });
  const [emp, setEmp] = useState<number | null>(null);
  const [day, setDay] = useState<number>(1);
  const [shops, setShops] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inv = ['/field/beats'];
  const create = useSend<any>('/field/beats', { invalidate: inv, success: 'Beat created', onDone: () => { setF({ name: '' }); setShops([]); } });
  const del = useSend<{ id: number }>((b) => `/field/beats/${b.id}`, { method: 'DELETE', invalidate: inv });
  const reset = useSend<{ id: number }>((b) => `/field/retailers/${b.id}/location/reset`, { invalidate: ['/field/map'] });

  async function locate() {
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return Alert.alert('Location needed');
    const pos = await Location.getCurrentPositionAsync({});
    setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  return (
    <Screen onRefresh={() => { map.refetch(); beats.refetch(); visits.refetch(); qc.invalidateQueries({ queryKey: ['/field'] }); }} refreshing={map.isRefetching}>
      <H2>Shops {map.data ? `(${map.data.located}/${map.data.total} located)` : ''}</H2>
      <Button small variant="ghost" title={here ? 'Nearest first (location on)' : 'Sort by distance from me'} onPress={locate} />
      {map.isLoading ? <Loading /> : map.error ? <ErrorBox error={map.error} retry={map.refetch} /> : !map.data.shops.length ? <Empty text="No shops" /> :
        map.data.shops.slice(0, 40).map((s: any) => (
          <Card key={s.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{s.shop_name}</Body>{s.distance_m != null && <Chip label={s.distance_m < 1000 ? `${Math.round(s.distance_m)} m` : `${(s.distance_m / 1000).toFixed(1)} km`} />}</Row>
            <Muted>{s.located ? 'Location pinned' : 'Not located yet'}</Muted>
            <Row>
              {s.directions_url && <Button small variant="ghost" title="Directions" onPress={() => Linking.openURL(s.directions_url)} />}
              {role === 'distributor' && s.located && <Button small variant="ghost" title="Reset location" onPress={() => Alert.alert('Reset location?', 'The retailer will pin it again from their shop.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', onPress: () => reset.mutate({ id: s.id }) }])} />}
            </Row>
          </Card>
        ))}

      {role === 'distributor' && (<>
        <H2>Beat plans</H2>
        {(beats.data?.beats ?? []).map((b: any) => (
          <Card key={b.id}>
            <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700' }}>{b.name}</Body><Chip label={`${DAYS[b.weekday]} · ${b.employee_name}`} /></Row>
            <Muted>{b.retailers.length} shops: {b.retailers.map((r: any) => r.shop_name).join(', ')}</Muted>
            <Button small variant="danger" title="Delete" onPress={() => del.mutate({ id: b.id })} />
          </Card>
        ))}
        <Card>
          <Muted>New beat plan</Muted>
          <Field label="Name" value={f.name} onChangeText={(v) => setF({ name: v })} error={errors.name} />
          <Row>{DAYS.map((d, i) => <Chip key={d} label={d} active={day === i} onPress={() => setDay(i)} />)}</Row>
          <Muted>Employee</Muted>
          <Row>{(opts.data?.employees ?? []).map((e: any) => <Chip key={e.id} label={e.name} active={emp === e.id} onPress={() => setEmp(e.id)} />)}</Row>
          <Muted>Shops</Muted>
          <Row>{(opts.data?.shops ?? []).map((s: any) => <Chip key={s.id} label={s.shop_name} active={shops.includes(s.id)} onPress={() => setShops(shops.includes(s.id) ? shops.filter((x) => x !== s.id) : [...shops, s.id])} />)}</Row>
          <Button small title="Create beat" loading={create.isPending} disabled={!emp || f.name.trim().length < 2}
            onPress={() => { setErrors({}); create.mutate({ name: f.name.trim(), employee_id: emp, weekday: day, retailer_ids: shops }, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
        </Card>

        <H2>Visits this week</H2>
        {(visits.data?.visits ?? []).slice(0, 30).map((v: any) => (
          <Row key={v.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <Muted style={{ flex: 1 }}>{v.employee_name} → {v.shop_name} · {new Date(v.visited_at).toLocaleString()}</Muted>
            <Chip label={v.distance_m == null ? 'no GPS' : v.near ? 'on site' : `${Math.round(v.distance_m)} m away`} tone={v.near ? 'ok' : 'warn'} />
          </Row>
        ))}
      </>)}
    </Screen>
  );
}
