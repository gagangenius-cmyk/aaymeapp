import React, { useState } from 'react';
import { Linking } from 'react-native';
import { Alert } from '../../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { useGet, useSend } from '../../src/lib/hooks';
import { STATUS_TONE } from '../../src/ui/OrdersScreen';
import { Body, Button, Card, Chip, ErrorBox, H2, inr, Loading, Muted, Row, Screen } from '../../src/ui/kit';

type Action = { to: string; label: string; danger?: boolean };

/** What each role may do next, mirroring the server's state machine (the server still enforces it). */
const NEXT: Record<string, Record<string, Action[]>> = {
  placed: { distributor: [{ to: 'accepted', label: 'Accept all' }, { to: 'rejected', label: 'Reject', danger: true }], retailer: [{ to: 'cancelled', label: 'Cancel order', danger: true }] },
  accepted: { distributor: [{ to: 'dispatched', label: 'Mark dispatched' }, { to: 'cancelled', label: 'Cancel', danger: true }], employee: [{ to: 'dispatched', label: 'Mark dispatched' }] },
  dispatched: { distributor: [{ to: 'out_for_delivery', label: 'Out for delivery' }], employee: [{ to: 'out_for_delivery', label: 'Out for delivery' }] },
  out_for_delivery: { distributor: [{ to: 'delivered', label: 'Mark delivered' }], employee: [{ to: 'delivered', label: 'Mark delivered' }] },
};

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useAuth();
  const router = useRouter();
  const q = useGet<any>(`/orders/${id}`);
  const team = useGet<any>('/distributor/employees', undefined, role === 'distributor');
  const inv = [`/orders/${id}`, '/orders', '/distributor/deliveries'];
  const move = useSend<{ to: string; items?: { product_id: number; qty: number }[] }>(`/orders/${id}/transition`, { invalidate: inv });
  const assign = useSend<{ employee_id: number }>(`/orders/${id}/assign`, { invalidate: inv });
  const [adjusting, setAdjusting] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const o = q.data;

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const actions = NEXT[o.status]?.[role as string] ?? [];
  const confirm = (a: Action) => Alert.alert(a.label, `Order #${o.id}`, [
    { text: 'Back', style: 'cancel' }, { text: 'Confirm', style: a.danger ? 'destructive' : 'default', onPress: () => move.mutate({ to: a.to }) },
  ]);
  // a short-lived signed link: the invoice page opens in the browser, which has no login
  const openInvoice = () => api<{ url: string }>(`/orders/${o.id}/invoice-link`).then((r) => Linking.openURL(r.url)).catch((e) => Alert.alert('Invoice', e.message));

  const startAdjust = () => { setQty(Object.fromEntries(o.items.map((i: any) => [i.product_id, i.qty]))); setAdjusting(true); };
  const acceptAdjusted = () => {
    const items = o.items.map((i: any) => ({ product_id: i.product_id, qty: Math.min(i.qty, Math.max(0, qty[i.product_id] ?? i.qty)) }));
    if (items.every((i: any) => i.qty === 0)) return Alert.alert('Nothing to ship', 'To refuse the whole order, reject it instead.');
    move.mutate({ to: 'accepted', items }, { onSuccess: () => setAdjusting(false) });
  };
  const canAssign = role === 'distributor' && ['accepted', 'dispatched', 'out_for_delivery'].includes(o.status);
  const cod = o.payment_method === 'cod';

  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><H2>Order #{o.id}</H2><Chip label={o.status.replace(/_/g, ' ')} tone={STATUS_TONE[o.status]} /></Row>
        <Muted>{o.retailer_name} → {o.distributor_name}</Muted>
        <Row>
          <Chip label={cod ? 'Cash on delivery' : 'Khata (credit)'} tone={cod ? 'warn' : undefined} />
          {o.is_out_of_hierarchy && <Chip label="Outside network" />}
          {o.invoice_no ? <Chip label={`Invoice ${o.invoice_no}`} /> : null}
        </Row>
        <Body style={{ fontWeight: '800', fontSize: 20 }}>{inr(o.total)}</Body>
        {o.is_adjusted && <Muted>Quantities were adjusted when accepting.</Muted>}
        {cod && o.status !== 'delivered' && role !== 'retailer' && <Muted style={{ color: '#C77700' }}>Collect {inr(o.total)} in cash on delivery.</Muted>}
      </Card>

      {!adjusting && !!actions.length && (
        <Row>
          {actions.map((a) => <Button key={a.to} small variant={a.danger ? 'danger' : 'primary'} title={a.label} loading={move.isPending} onPress={() => confirm(a)} />)}
          {o.status === 'placed' && role === 'distributor' && <Button small variant="ghost" title="Accept less…" onPress={startAdjust} />}
        </Row>
      )}

      {canAssign && (
        <Card>
          <Muted>Delivery person{o.assigned_employee_id ? '' : ' (none yet)'}</Muted>
          <Row>{(team.data?.employees ?? []).filter((e: any) => e.is_active).map((e: any) => (
            <Chip key={e.id} label={`${e.name}${e.is_available ? '' : ' (leave)'} · ${e.open_orders} open`} active={o.assigned_employee_id === e.id} onPress={() => assign.mutate({ employee_id: e.id })} />
          ))}</Row>
        </Card>
      )}

      <Row>
        {role === 'retailer' && o.status === 'delivered' && <Button small variant="ghost" title="Return items" onPress={() => router.push({ pathname: '/return-new', params: { order_id: String(o.id) } })} />}
        {(role === 'retailer' || role === 'distributor') && <Button small variant="ghost" title="Get help" onPress={() => router.push({ pathname: '/support/new', params: { order_id: String(o.id) } })} />}
        {role === 'distributor' && o.invoice_no && <Button small variant="ghost" title="GST e-invoice" onPress={() => router.push({ pathname: '/einvoice', params: { order_id: String(o.id) } })} />}
        {o.invoice_no && <Button small variant="ghost" title="Invoice" onPress={openInvoice} />}
      </Row>

      <H2>Items</H2>
      {o.items.map((i: any) => (
        <Card key={i.product_id}>
          <Body>{i.name}</Body>
          <Muted>{i.qty}{i.ordered_qty !== i.qty ? ` of ${i.ordered_qty}` : ''} × {inr(i.unit_price)} · GST {i.gst_rate_bps / 100}%{i.price_list ? ` · ${i.price_list}` : ''}</Muted>
          {i.standard_unit_price != null && Number(i.standard_unit_price) !== Number(i.unit_price) && <Muted>Standard price {inr(i.standard_unit_price)}</Muted>}
          {adjusting ? (
            <Row>
              <Button small variant="ghost" title="−" onPress={() => setQty({ ...qty, [i.product_id]: Math.max(0, (qty[i.product_id] ?? i.qty) - 1) })} />
              <Body style={{ minWidth: 40, textAlign: 'center' }}>{qty[i.product_id] ?? i.qty}</Body>
              <Button small variant="ghost" title="+" onPress={() => setQty({ ...qty, [i.product_id]: Math.min(i.qty, (qty[i.product_id] ?? i.qty) + 1) })} />
              <Muted>ship of {i.qty}</Muted>
            </Row>
          ) : <Body style={{ fontWeight: '700' }}>{inr(i.line_total)}</Body>}
        </Card>
      ))}
      {adjusting && <Row><Button title="Accept with these quantities" onPress={acceptAdjusted} loading={move.isPending} /><Button variant="ghost" title="Cancel" onPress={() => setAdjusting(false)} /></Row>}

      <H2>History</H2>
      {o.events.map((e: any, n: number) => <Muted key={n}>{new Date(e.created_at).toLocaleString()} · {e.to_status.replace(/_/g, ' ')}</Muted>)}
    </Screen>
  );
}
