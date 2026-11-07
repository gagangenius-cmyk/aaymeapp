import React from 'react';
import { useRouter } from 'expo-router';
import { useGet } from '../../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, H1, Loading, Muted, Row, Screen } from '../../src/ui/kit';

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

/** Distributors mapped to this employee, with the subscription timer. */
export default function StaffDistributors() {
  const router = useRouter();
  const q = useGet<any>('/staff/distributors');
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>My distributors</H1>
      {q.data?.can_create && (
        <Row>
          <Button title="Onboard distributor" onPress={() => router.push('/(staff)/onboard')} />
          <Button variant="ghost" title="Payment requests" onPress={() => router.push('/(staff)/onboarding')} />
        </Row>
      )}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.distributors.length ? <Empty text="No distributors yet" /> :
        q.data.distributors.map((d: any) => {
          const left = daysLeft(d.subscription_ends_at);
          return (
            <Card key={d.id} onPress={d.mine && q.data.can_manage ? () => router.push({ pathname: '/(staff)/distributor-edit', params: { id: String(d.id) } }) : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ fontWeight: '700' }}>{d.business_name}</Body>
                <Chip label={!d.is_active ? 'Suspended' : left < 0 ? 'Expired' : `${left}d left`} tone={!d.is_active || left < 0 ? 'danger' : left <= 7 ? 'warn' : 'ok'} />
              </Row>
              <Muted>{d.owner_name} · {d.phone}{d.city ? ` · ${d.city}` : ''}</Muted>
              <Muted>{d.plan_name ?? 'No plan'} · {d.retailers} retailers · {d.orders} orders{d.mine ? '' : ' · (not yours: read-only)'}</Muted>
            </Card>
          );
        })}
    </Screen>
  );
}
