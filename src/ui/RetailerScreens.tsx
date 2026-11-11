import React, { useState } from 'react';
import { goBack } from '../lib/nav';
import { Alert } from './alert';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { fieldErrors, useGet, useSend } from '../lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H1, H2, inr, Loading, Muted, Row, Screen } from './kit';

/** Retailers under this distributor. An employee only sees the ones they manage. */
export function RetailerList({ createRoute }: { createRoute: string }) {
  const { role } = useAuth();
  const router = useRouter();
  const q = useGet<any>('/distributor/retailers', { mine: role === 'employee' ? '1' : '0' });
  const [phone, setPhone] = useState('');
  const invite = useSend<{ phone: string }>('/distributor/retailers', { invalidate: ['/distributor/retailers'], onDone: () => { setPhone(''); Alert.alert('Request sent', 'If a retailer with this number exists, they have been asked to accept.'); } });
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [fromEmp, setFromEmp] = useState<number | null>(null);
  const team = useGet<any>('/distributor/employees', undefined, role === 'distributor');
  const members = (team.data?.employees ?? []).filter((e: any) => e.is_active !== 0 && e.is_active !== false);
  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const bulk = useSend<{ retailer_ids?: number[]; from_employee_id?: number; employee_id: number | null }>('/distributor/retailers/bulk-manager', { method: 'PUT', invalidate: ['/distributor/retailers', '/distributor/employees'], onDone: (r: any) => { setPicked([]); setSelecting(false); setFromEmp(null); Alert.alert('Moved', `${r.moved} retailer${r.moved === 1 ? '' : 's'} moved.`); } });
  const cancel = useSend<{ id: number }>((b) => `/distributor/retailers/${b.id}`, { method: 'DELETE', invalidate: ['/distributor/retailers'] });
  return (
    <Screen onRefresh={q.refetch} refreshing={q.isRefetching}>
      <H1>Retailers</H1>
      <Button title="Add new retailer" onPress={() => router.push(createRoute as any)} />
      {role === 'distributor' && (
        <Card>
          <Muted>Already on AAYME? Invite them by phone; they must accept before you can supply them.</Muted>
          <Row><Field label="Retailer phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} style={{ minWidth: 170 }} /><Button small variant="ghost" title="Invite" disabled={phone.length !== 10} loading={invite.isPending} onPress={() => invite.mutate({ phone })} /></Row>
        </Card>
      )}
      {role === 'distributor' && (
        <Row>
          <Button small variant="ghost" title={selecting ? 'Done' : 'Select many'} onPress={() => { setSelecting(!selecting); setPicked([]); setFromEmp(null); }} />
          {selecting && <Button small variant="ghost" title="Select all" onPress={() => setPicked((q.data?.retailers ?? []).map((r: any) => r.id))} />}
        </Row>
      )}
      {selecting && (
        <Card>
          <Muted>{picked.length} selected. Move them under:</Muted>
          <Row>
            <Chip label="Me (distributor)" onPress={() => picked.length && bulk.mutate({ retailer_ids: picked, employee_id: null })} />
            {members.map((e: any) => <Chip key={e.id} label={e.name} onPress={() => picked.length && bulk.mutate({ retailer_ids: picked, employee_id: e.id })} />)}
          </Row>
          <Muted>Or hand over everything one team member looks after:</Muted>
          <Row>{members.map((e: any) => <Chip key={e.id} label={`All of ${e.name}`} active={fromEmp === e.id} onPress={() => setFromEmp(fromEmp === e.id ? null : e.id)} />)}</Row>
          {fromEmp !== null && <Row>
            <Chip label="→ Me (distributor)" onPress={() => bulk.mutate({ from_employee_id: fromEmp, employee_id: null })} />
            {members.filter((e: any) => e.id !== fromEmp).map((e: any) => <Chip key={e.id} label={`→ ${e.name}`} onPress={() => bulk.mutate({ from_employee_id: fromEmp, employee_id: e.id })} />)}
          </Row>}
        </Card>
      )}
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={q.refetch} /> : !q.data.retailers.length ? <Empty text="No retailers yet" /> :
        q.data.retailers.map((r: any) => (
          <Card key={r.id} style={picked.includes(r.id) ? { borderColor: '#2874F0' } : undefined} onPress={() => (selecting ? toggle(r.id) : router.push({ pathname: '/retailer-manage', params: { retailer_id: String(r.id), name: r.shop_name } }))}>
            <Body style={{ fontWeight: '700' }}>{selecting ? (picked.includes(r.id) ? '✓ ' : '○ ') : ''}{r.shop_name}</Body>
            <Muted>{r.name} · {r.phone} · {r.pincode}</Muted>
            <Muted>Managed by {r.managed_by_name ?? 'distributor'} · due {inr(Number(r.balance_due_paise) / 100)}{r.category_names ? ` · ${r.category_names}` : ''}</Muted>
            {!selecting && <Row><Button small title="Collect cash / payment" onPress={() => router.push({ pathname: '/retailer-ledger', params: { retailer_id: String(r.id), name: r.shop_name } })} /></Row>}
          </Card>
        ))}
      {!!q.data?.pending?.length && <><H2>Waiting for retailer to accept</H2>{q.data.pending.map((p: any) => <Row key={p.id} style={{ justifyContent: 'space-between' }}><Muted>{p.phone}</Muted>{role === 'distributor' && <Button small variant="ghost" title="Withdraw" onPress={() => cancel.mutate({ id: p.id })} />}</Row>)}</>}
    </Screen>
  );
}

/**
 * Create a retailer account. A distributor may put the retailer under any of their employees (or themselves);
 * an employee's retailers always sit under that employee (the server forces it).
 */
export function RetailerForm() {
  const { role } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const team = useGet<any>('/distributor/employees', undefined, role === 'distributor');
  const [f, setF] = useState<Record<string, string>>({});
  const [managedBy, setManagedBy] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    setErrors({}); setBusy(true);
    try {
      await api('/distributor/retailer-accounts', {
        body: {
          phone: f.phone, name: f.name, password: f.password, shop_name: f.shop_name, pincode: f.pincode,
          ...(f.email ? { email: f.email } : {}), ...(f.address ? { address: f.address } : {}), ...(f.gst_no ? { gst_no: f.gst_no } : {}),
          ...(managedBy ? { managed_by_id: managedBy } : {}),
        },
      });
      qc.invalidateQueries({ queryKey: ['/distributor/retailers'] });
      goBack(router);
    } catch (e: any) { setErrors({ ...fieldErrors(e), _: e.message }); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Field label="Shop name" value={f.shop_name} onChangeText={set('shop_name')} autoCapitalize="words" error={errors.shop_name} />
      <Field label="Owner name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <Field label="Phone (login id)" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={10} error={errors.phone} />
      <Field label="Pincode" value={f.pincode} onChangeText={set('pincode')} keyboardType="number-pad" maxLength={6} error={errors.pincode} />
      <Field label="Password (8+ characters)" value={f.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
      <Field label="Email (optional)" value={f.email} onChangeText={set('email')} keyboardType="email-address" error={errors.email} />
      <Field label="Address (optional)" value={f.address} onChangeText={set('address')} error={errors.address} />
      <Field label="GSTIN (optional)" value={f.gst_no} onChangeText={set('gst_no')} autoCapitalize="characters" maxLength={15} error={errors.gst_no} />

      {role === 'distributor' && !!team.data?.employees?.length && (<>
        <H2>Place under</H2>
        <Row>
          <Chip label="Me (owner)" active={managedBy === null} onPress={() => setManagedBy(null)} />
          {team.data.employees.filter((e: any) => e.is_active).map((e: any) => <Chip key={e.id} label={e.name} active={managedBy === e.id} onPress={() => setManagedBy(e.id)} />)}
        </Row>
      </>)}


      {!!errors._ && <Body style={{ color: '#D93A55' }}>{errors._}</Body>}
      <Button title="Create retailer" onPress={submit} loading={busy} />
    </Screen>
  );
}
