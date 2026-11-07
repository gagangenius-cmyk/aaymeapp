import React, { useState } from 'react';
import { Alert } from '../src/ui/alert';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../src/lib/api';
import { parseCsv } from '../src/lib/csv';
import { Body, Button, Card, Chip, H2, Muted, Row, Screen, Toggle } from '../src/ui/kit';

const COLUMNS = ['name', 'price', 'sku', 'category', 'brand', 'unit', 'mrp', 'stock', 'gst', 'hsn', 'min_order_qty', 'low_stock_threshold', 'barcode', 'description'];

/** Bulk-add or update products from a CSV file. Good rows are saved; bad rows are listed by row number so you can fix and re-import them. */
export default function Import() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [file, setFile] = useState('');
  const [upsert, setUpsert] = useState(true);
  const [allOrNothing, setAllOrNothing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    try {
      const text = await FileSystem.readAsStringAsync(r.assets[0].uri);
      const parsed = parseCsv(text.replace(/^﻿/, ''));
      if (!parsed.length) return Alert.alert('Empty file', 'No data rows found.');
      if (parsed.length > 500) return Alert.alert('Too many rows', 'Import at most 500 rows at a time.');
      setRows(parsed); setFile(r.assets[0].name); setResult(null);
    } catch (e: any) { Alert.alert('Could not read file', e.message); }
  }

  async function template() {
    const uri = `${FileSystem.cacheDirectory}aayme-products-template.csv`;
    await FileSystem.writeAsStringAsync(uri, `${COLUMNS.join(',')}\nBasmati Rice 5kg,420.00,RICE5,Grocery,India Gate,pack,450.00,100,5,1006,1,10,,Long grain rice\n`);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Product import template' });
  }

  async function run() {
    setBusy(true);
    try { setResult(await api('/catalog/import/rows', { body: { rows, upsert, all_or_nothing: allOrNothing } })); }
    catch (e: any) { Alert.alert('Import failed', e.message); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Card>
        <H2>1. Get the template</H2>
        <Muted>Columns: {COLUMNS.join(', ')}. Only name and price are required.</Muted>
        <Button small variant="ghost" title="Download template" onPress={template} />
      </Card>
      <Card>
        <H2>2. Choose your CSV</H2>
        <Button variant="ghost" title={file ? `${file} · ${rows.length} rows` : 'Pick a .csv file'} onPress={pick} />
        <Toggle label="Update products with the same SKU" help="Otherwise a repeated SKU is reported as an error." value={upsert} onChange={setUpsert} />
        <Toggle label="All or nothing" help="Save nothing if any row has an error." value={allOrNothing} onChange={setAllOrNothing} />
      </Card>
      <Button title={`Import ${rows.length || ''} rows`} onPress={run} loading={busy} disabled={!rows.length} />
      {result && (<Card>
        <H2>Result</H2>
        <Row>{Object.entries(result).filter(([, v]) => typeof v === 'number').map(([k, v]) => <Chip key={k} label={`${k.replace(/_/g, ' ')}: ${v}`} tone={k === 'created' || k === 'updated' ? 'ok' : undefined} />)}</Row>
        {(result.errors ?? []).slice(0, 30).map((e: any) => <Body key={e.row} style={{ color: '#D93A55', fontSize: 13 }}>Row {e.row}: {e.message}</Body>)}
      </Card>)}
    </Screen>
  );
}
