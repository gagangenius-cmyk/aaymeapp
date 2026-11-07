import React, { useState } from 'react';
import { toast } from '../src/ui/Toast';
import { Share } from 'react-native';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams } from 'expo-router';
import { useGet, useSend, fieldErrors } from '../src/lib/hooks';
import { Body, Button, Card, Chip, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

/** GST compliance for one order: e-invoice readiness (what is missing), IRN, and e-way bill details. */
export default function EInvoice() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const base = `/compliance/orders/${order_id}`;
  const q = useGet<any>(`${base}/einvoice`);
  const [irn, setIrn] = useState({ irn: '', ack_no: '', ack_date: '' });
  const [vehicle, setVehicle] = useState('');
  const [km, setKm] = useState('');
  const eway = useGet<any>(`${base}/eway`, { vehicle_no: vehicle || undefined, distance: km || undefined });
  const [ewayNo, setEwayNo] = useState({ no: '', until: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inv = [`${base}/einvoice`, `${base}/eway`];
  const gen = useSend<any>(`${base}/einvoice/generate`, { invalidate: inv, onDone: () => toast.success('IRN generated') });
  const rec = useSend<any>(`${base}/einvoice/irn`, { invalidate: inv, onDone: () => toast.success('IRN recorded') });
  const ew = useSend<any>(`${base}/eway/record`, { invalidate: inv, onDone: () => toast.success('E-way bill recorded') });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} retry={q.refetch} />;
  const d = q.data;
  return (
    <Screen onRefresh={() => { q.refetch(); eway.refetch(); }} refreshing={q.isRefetching}>
      <Card>
        <H2>E-invoice · order #{order_id}</H2>
        <Chip label={d.irn ? 'IRN issued' : d.ready ? 'Ready to submit' : 'Missing details'} tone={d.irn ? 'ok' : d.ready ? 'warn' : 'danger'} />
        {d.irn ? <><Muted>IRN</Muted><Body selectable>{d.irn}</Body></> : null}
        {d.errors?.map((e: string, i: number) => <Body key={i} style={{ color: '#D93A55', fontSize: 13 }}>• {e}</Body>)}
        {d.warnings?.map((e: string, i: number) => <Muted key={i}>⚠ {e}</Muted>)}
        {!d.irn && d.ready && (<Row>
          {d.can_submit && <Button small title="Generate IRN" loading={gen.isPending} onPress={() => gen.mutate({})} />}
          <Button small variant="ghost" title="Share JSON for the portal" onPress={() => Share.share({ message: JSON.stringify(d.payload, null, 2) })} />
        </Row>)}
      </Card>
      {!d.irn && (<Card>
        <H2>Record an IRN from the portal</H2>
        <Field label="IRN (64 hex characters)" value={irn.irn} onChangeText={(v) => setIrn({ ...irn, irn: v })} error={errors.irn} />
        <Row><Field label="Ack no." value={irn.ack_no} onChangeText={(v) => setIrn({ ...irn, ack_no: v })} style={{ minWidth: 120 }} error={errors.ack_no} /><Field label="Ack date" value={irn.ack_date} onChangeText={(v) => setIrn({ ...irn, ack_date: v })} placeholder="YYYY-MM-DD" style={{ minWidth: 130 }} error={errors.ack_date} /></Row>
        <Button small title="Save IRN" loading={rec.isPending} onPress={() => { setErrors({}); rec.mutate(irn, { onError: (e) => setErrors(fieldErrors(e)) }); }} />
      </Card>)}

      <Card>
        <H2>E-way bill</H2>
        {eway.data && <Muted>{eway.data.required ? `Required (invoice above ₹${eway.data.threshold})` : 'Not required for this value'}</Muted>}
        <Row><Field label="Vehicle no." value={vehicle} onChangeText={setVehicle} autoCapitalize="characters" style={{ minWidth: 140 }} /><Field label="Distance (km)" value={km} onChangeText={setKm} keyboardType="number-pad" style={{ minWidth: 110 }} /></Row>
        {eway.data?.errors?.map((e: string, i: number) => <Body key={i} style={{ color: '#D93A55', fontSize: 13 }}>• {e}</Body>)}
        {eway.data?.ready && <Button small variant="ghost" title="Share JSON" onPress={() => Share.share({ message: JSON.stringify(eway.data.payload, null, 2) })} />}
        {eway.data?.eway_bill_no ? <Muted>Recorded: {eway.data.eway_bill_no}</Muted> : (<>
          <Row><Field label="Bill no. (12 digits)" value={ewayNo.no} onChangeText={(v) => setEwayNo({ ...ewayNo, no: v })} keyboardType="number-pad" maxLength={12} style={{ minWidth: 160 }} /><Field label="Valid until" value={ewayNo.until} onChangeText={(v) => setEwayNo({ ...ewayNo, until: v })} placeholder="YYYY-MM-DD" style={{ minWidth: 130 }} /></Row>
          <Button small title="Record e-way bill" loading={ew.isPending} disabled={ewayNo.no.length !== 12 || !ewayNo.until} onPress={() => ew.mutate({ eway_bill_no: ewayNo.no, valid_until: ewayNo.until })} />
        </>)}
      </Card>
    </Screen>
  );
}
