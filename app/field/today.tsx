import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../../src/ui/alert';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { useGet } from '../../src/lib/hooks';
import { Scanner } from '../../src/ui/Scanner';
import { Body, Button, Card, Chip, Empty, ErrorBox, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Employee: today's route, with a QR scan that proves you are standing in the shop. */
export default function Today() {
  const qc = useQueryClient();
  const q = useGet<any>('/field/today');
  const mine = useGet<any>('/field/my-visits', { days: 14 });
  const [scan, setScan] = useState(false);

  async function punch(code: string) {
    setScan(false);
    try {
      let coords: { lat?: number; lng?: number } = {};
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.granted) { const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; }
      const r = await api<any>('/field/punch', { body: { code, ...coords } });
      Alert.alert(r.repeated ? 'Already recorded' : 'Visit recorded', `${r.shop_name ?? 'Shop'}${r.distance_m != null ? ` · ${Math.round(r.distance_m)} m from the pinned location` : ''}`);
      qc.invalidateQueries({ queryKey: ['/field/today'] }); qc.invalidateQueries({ queryKey: ['/field/my-visits'] });
    } catch (e: any) { Alert.alert('Visit not recorded', e.message); }
  }

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Button title="Scan shop QR" onPress={() => setScan(true)} />
      <Scanner visible={scan} types={['qr']} title="Scan the retailer's visit QR" onClose={() => setScan(false)} onCode={punch} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.beats.length ? <Empty text={`No route planned for ${DAYS[q.data.weekday] ?? 'today'}`} /> :
        q.data.beats.map((b: any) => (
          <Card key={b.id}>
            <H2>{b.name}</H2>
            {b.retailers.map((r: any) => (
              <Row key={r.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <Body style={{ flex: 1 }}>{r.shop_name}</Body>
                {r.visited_at ? <Chip label="Visited" tone="ok" /> : r.directions_url ? <Button small variant="ghost" title="Directions" onPress={() => Linking.openURL(r.directions_url)} /> : <Muted>No location</Muted>}
              </Row>
            ))}
          </Card>
        ))}
      {!!mine.data?.visits?.length && (<>
        <H2>My recent visits</H2>
        <Card>
          {mine.data.visits.slice(0, 20).map((v: any) => (
            <Row key={v.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <Body style={{ flex: 1 }}>{v.shop_name}</Body>
              <Muted>{new Date(v.visited_at).toLocaleString()}</Muted>
            </Row>
          ))}
        </Card>
      </>)}
    </Screen>
  );
}
