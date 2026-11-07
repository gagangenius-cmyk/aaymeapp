import React, { useEffect, useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../../src/ui/kit';
import { PermissionToggles } from '../../src/ui/PermissionToggles';

/** Admin: a distributor's feature switches, extra subscription days, and the platform commission rate on its outside-network orders. */
export default function DistributorAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>('/admin/distributors');
  const d = q.data?.distributors.find((x: any) => String(x.id) === id);
  const [perms, setPerms] = useState<string[]>([]);
  const [extend, setExtend] = useState(0);
  const [rate, setRate] = useState('');
  useEffect(() => { if (d) { setPerms(Object.entries(d.permissions).filter(([, v]) => v).map(([k]) => k)); setRate(String(d.commission_rate_bps / 100)); } }, [d?.id]);
  const save = useSend<any>(`/distributor/${id}/admin`, { method: 'PUT', invalidate: ['/admin/distributors'], onDone: () => goBack(router), success: 'Distributor updated' });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  if (!d) return <ErrorBox error={new Error('Distributor not found')} />;
  const catalog = q.data.permission_catalog as { key: string; label: string; help?: string }[];
  const bps = Math.round(Number(rate) * 100);
  const submit = () => save.mutate({
    permissions: Object.fromEntries(catalog.map((c) => [c.key, perms.includes(c.key)])),
    ...(extend ? { extend_days: extend } : {}),
    ...(Number.isFinite(bps) && bps !== d.commission_rate_bps ? { commission_rate_bps: bps } : {}),
  });
  return (
    <Screen>
      <Card><H2>{d.business_name}</H2><Muted>{d.owner_name} · {d.phone}</Muted><Muted>Subscription ends {new Date(d.subscription_ends_at).toLocaleDateString()}</Muted></Card>
      <H2>Features</H2>
      <Card><PermissionToggles catalog={catalog} value={perms} onChange={setPerms} /></Card>
      <H2>Extend subscription</H2>
      <Row>{[0, 7, 30, 90, 365].map((n) => <Chip key={n} label={n ? `+${n} days` : 'None'} active={extend === n} onPress={() => setExtend(n)} />)}</Row>
      <Field label="Commission on outside-network orders (%)" value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Button title="Save" onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
