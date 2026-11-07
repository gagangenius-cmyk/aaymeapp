import React, { useEffect, useState } from 'react';
import { goBack } from '../../src/lib/nav';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useGet, useSend } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, H2, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';
import { PermissionToggles } from '../../src/ui/PermissionToggles';

/** Change a distributor this employee onboarded: feature switches (only grantable ones), extra days, on/off. */
export default function DistributorEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useGet<any>('/staff/distributors');
  const d = q.data?.distributors.find((x: any) => String(x.id) === id);
  const [perms, setPerms] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [review, setReview] = useState(false);
  const [extend, setExtend] = useState(0);

  useEffect(() => { if (d) { setPerms(Object.entries(d.permissions).filter(([, v]) => v).map(([k]) => k)); setActive(d.is_active); } }, [d?.id]);
  const save = useSend<any>(`/staff/distributors/${id}`, { method: 'PUT', invalidate: ['/staff/distributors'], success: 'Distributor updated', onDone: () => goBack(router) });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  if (!d) return <ErrorBox error={new Error('Distributor not found')} />;
  const grantable = q.data.grant_catalog as { key: string; label: string; help?: string }[];
  const grantKeys = grantable.map((g) => g.key);

  const submit = () => save.mutate({
    // only send switches this employee may change: the server rejects the rest
    permissions: Object.fromEntries(grantKeys.map((k) => [k, perms.includes(k)])),
    is_active: active, ...(extend ? { extend_days: extend } : {}), review_required: review,
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: d.business_name, headerStyle: { backgroundColor: '#2874F0' }, headerTintColor: '#fff' }} />
      <Card><Body>{d.owner_name} · {d.phone}</Body><Muted>Subscription ends {new Date(d.subscription_ends_at).toLocaleDateString()}</Muted></Card>
      <Toggle label="Account active" value={active} onChange={setActive} />
      <H2>Features</H2>
      <Card><PermissionToggles catalog={grantable} value={perms} onChange={setPerms} /></Card>
      <Toggle label="Products need my review first" value={review} onChange={setReview} />
      <H2>Extend subscription</H2>
      <Row>{[0, 30, 90, 365].map((n) => <Chip key={n} label={n ? `+${n} days` : 'None'} active={extend === n} onPress={() => setExtend(n)} />)}</Row>
      <Button title="Save" onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
