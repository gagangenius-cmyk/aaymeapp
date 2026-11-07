import React from 'react';
import { AnalyticsView } from '../../src/ui/AnalyticsView';
import { useGet } from '../../src/lib/hooks';
import { Card, H1, H2, inr, Muted, Row, Stat, Body } from '../../src/ui/kit';

const ROLE_LABEL: Record<string, string> = { retailer: 'Retailers', distributor: 'Distributors', employee: 'Distributor employees', company_employee: 'Company employees', admin: 'Admins' };

/** Platform health: live counters first, then the sales analytics for a chosen period. */
function Health() {
  const s = useGet<any>('/admin/stats');
  const monthly = useGet<any>('/admin/metrics/monthly', { months: 6 });
  const d = s.data;
  if (!d) return null;
  const rows: any[] = monthly.data?.months ?? [];
  return (<>
    <Row>
      <Stat label="GTV (all time)" value={inr(d.gmv)} />
      <Stat label="GTV this month" value={inr(d.gtv_month)} />
    </Row>
    <Row>
      <Stat label="Devices registered" value={d.devices?.total ?? 0} />
      <Stat label="New devices (30d)" value={d.devices?.last_30d ?? 0} />
    </Row>
    <Row>
      <Stat label="Receivables" value={inr(d.receivables)} tone="warn" />
      <Stat label="Orders (24h)" value={d.orders_today} />
    </Row>
    <Row>
      <Stat label="Subscriptions expiring (7d)" value={d.subscriptions_expiring_7d} tone={d.subscriptions_expiring_7d ? 'warn' : undefined} />
      <Stat label="Failed logins (24h)" value={d.failed_logins_24h} tone={d.failed_logins_24h > 20 ? 'danger' : undefined} />
    </Row>
    <H2>People</H2>
    <Card>{Object.entries(d.users).map(([role, v]: any) => (
      <Row key={role} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body>{ROLE_LABEL[role] ?? role}</Body><Muted>{v.count}{v.inactive ? `  (${v.inactive} suspended)` : ''}</Muted></Row>
    ))}</Card>
    {d.push_24h && Object.keys(d.push_24h).length > 0 && <Muted>Push (24h): {Object.entries(d.push_24h).map(([k, v]) => `${k} ${v}`).join(' · ')}</Muted>}
    {rows.length > 0 && (<>
      <H2>Growth by month</H2>
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted style={{ flex: 1.1 }}>Month</Muted><Muted style={{ flex: 1.6, textAlign: 'right' }}>GTV</Muted><Muted style={{ flex: 0.9, textAlign: 'right' }}>Orders</Muted><Muted style={{ flex: 1, textAlign: 'right' }}>Devices</Muted></Row>
        {rows.map((m) => (
          <Row key={m.month} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Body style={{ flex: 1.1 }}>{m.month}</Body><Body style={{ flex: 1.6, textAlign: 'right' }}>{inr(m.gtv)}</Body><Body style={{ flex: 0.9, textAlign: 'right' }}>{m.orders}</Body><Body style={{ flex: 1, textAlign: 'right' }}>{m.devices}</Body></Row>
        ))}
      </Card>
      <Muted>Devices are phones that registered for notifications, the closest figure the server has to installs. Store download counts are in Google Play Console.</Muted>
    </>)}
    <H2>Sales</H2>
  </>);
}

export default function AdminDashboard() {
  return <AnalyticsView base="/admin" title={<><H1>Dashboard</H1><Health /></>} />;
}
