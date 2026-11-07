import React, { useEffect, useState } from 'react';
import { Alert } from '../src/ui/alert';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { API } from '../src/lib/config';
import { getSession } from '../src/lib/api';
import { useGet, useSend } from '../src/lib/hooks';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, Loading, Muted, Row, Screen } from '../src/ui/kit';

const iso = (offset: number) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

/** Build and download CSV / Excel reports. `base` is /admin (everything) or /staff/team (only your distributors). Jobs run on the server; this screen waits for them. */
export default function ReportsExport() {
  const { base = '/admin' } = useLocalSearchParams<{ base?: string }>();
  const cat = useGet<any>(`${base}/reports/catalogue`);
  const jobs = useGet<any>(`${base}/reports`);
  const [type, setType] = useState('');
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [from, setFrom] = useState(iso(29));
  const [to, setTo] = useState(iso(0));
  const [busyId, setBusyId] = useState<number | null>(null);
  const create = useSend<any>(`${base}/reports`, { invalidate: [`${base}/reports`] });

  // keep checking while something is still being prepared
  const working = (jobs.data?.jobs ?? []).some((j: any) => j.status === 'queued' || j.status === 'running');
  useEffect(() => { if (!working) return; const t = setInterval(() => jobs.refetch(), 3000); return () => clearInterval(t); }, [working]);

  async function download(j: any) {
    setBusyId(j.id);
    try {
      const uri = `${FileSystem.cacheDirectory}${String(j.file_name ?? `report-${j.id}.${j.format}`).replace(/[^\w.\-]/g, '_')}`;
      const r = await FileSystem.downloadAsync(`${API}${base}/reports/${j.id}/download`, uri, { headers: { Authorization: `Bearer ${getSession()?.access_token}` } });
      if (r.status !== 200) throw new Error('The file is not available. Request the report again.');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(r.uri, { mimeType: j.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' });
    } catch (e: any) { Alert.alert('Download failed', e.message); } finally { setBusyId(null); }
  }

  if (cat.isLoading) return <Loading />;
  if (cat.error) return <ErrorBox error={cat.error} retry={cat.refetch} />;
  const sel = cat.data.reports.find((r: any) => r.type === type);
  return (
    <Screen onRefresh={jobs.refetch} refreshing={jobs.isRefetching}>
      <H2>Choose a report</H2>
      {cat.data.reports.map((r: any) => (
        <Card key={r.type} onPress={() => setType(r.type)} style={type === r.type ? { borderColor: '#0A8F4D' } : undefined}>
          <Body style={{ fontWeight: '700' }}>{r.title}</Body><Muted>{r.description}</Muted>
        </Card>
      ))}
      {sel && (<Card>
        <Row><Chip label="CSV" active={format === 'csv'} onPress={() => setFormat('csv')} /><Chip label="Excel" active={format === 'xlsx'} onPress={() => setFormat('xlsx')} /></Row>
        {sel.uses_range && <Row><Field label="From" value={from} onChangeText={setFrom} style={{ minWidth: 130 }} /><Field label="To" value={to} onChangeText={setTo} style={{ minWidth: 130 }} /></Row>}
        <Button title={`Build "${sel.title}"`} loading={create.isPending} onPress={() => create.mutate({ type, format, ...(sel.uses_range ? { from, to } : {}) })} />
      </Card>)}

      <H2>Your reports</H2>
      {!jobs.data?.jobs?.length ? <Empty text="No reports yet" /> : jobs.data.jobs.map((j: any) => (
        <Card key={j.id}>
          <Row style={{ justifyContent: 'space-between' }}><Body style={{ fontWeight: '700', flex: 1 }}>{j.title ?? j.type}</Body><Chip label={j.status} tone={j.status === 'done' ? 'ok' : j.status === 'failed' ? 'danger' : 'warn'} /></Row>
          <Muted>{String(j.format).toUpperCase()} · {new Date(j.created_at).toLocaleString()}{j.row_count != null ? ` · ${j.row_count} rows` : ''}</Muted>
          {j.error ? <Muted style={{ color: '#D93A55' }}>{j.error}</Muted> : null}
          {j.status === 'done' && <Button small variant="ghost" title="Download & share" loading={busyId === j.id} onPress={() => download(j)} />}
        </Card>
      ))}
    </Screen>
  );
}
