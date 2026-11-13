import React, { useState } from 'react';
import { Alert } from '../src/ui/alert';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../src/lib/api';
import { parseCsv } from '../src/lib/csv';
import { exclusive } from '../src/lib/pricing';
import { Body, Button, Card, Chip, H2, Muted, Row, Screen, Toggle } from '../src/ui/kit';

const COLUMNS = ['sku', 'name', 'category', 'brand', 'description', 'mrp', 'price', 'cost', 'stock', 'unit', 'hsn', 'gst', 'barcode', 'weight_g', 'min_order_qty', 'low_stock_threshold', 'status', 'image_url', 'other_image_urls'];
const CHUNK = 500, CHUNK_WITH_PHOTOS = 20, MAX_ROWS = 5000;   // photos are downloaded while importing, so those files go in smaller parts
/** Other names for the same column (a spreadsheet made with longer headings works as it is). */
const ALIAS: Record<string, string> = {
  product_sku: 'sku', product_name: 'name', selling_price: 'price', retail_price: 'price', rate: 'price', purchase_price: 'cost', stock_quantity: 'stock', quantity: 'stock', qty: 'stock',
  main_image_url: 'image_url', photo_link: 'image_url', photo_url: 'image_url', image: 'image_url', image_link: 'image_url', photo: 'image_url', other_images: 'other_image_urls', other_photo_links: 'other_image_urls', other_image_url: 'other_image_urls',
  hsn_code: 'hsn', gst_rate: 'gst', 'gst_%': 'gst', weight: 'weight_g', product_status: 'status', moq: 'min_order_qty', minimum_order_quantity: 'min_order_qty',
};
/** Rename headings, drop "%" and thousands commas from numbers, and turn the status column into the server's "active" flag. */
function normalise(raw: Record<string, string>, includesGst: boolean) {
  const r: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) r[ALIAS[k] ?? k] = v;
  if (r.gst) r.gst = r.gst.replace('%', '').trim();
  for (const k of ['price', 'mrp', 'cost', 'stock']) if (r[k]) r[k] = r[k].replace(/[₹,\s]/g, '');
  if (r.status) { r.active = r.status; delete r.status; }
  // a rate that includes GST is turned into the price before GST that the catalogue stores
  if (includesGst && r.price && r.gst && Number(r.gst) > 0 && Number.isFinite(Number(r.price))) r.price = exclusive(r.price, Math.round(Number(r.gst) * 100)).toFixed(2);
  return r;
}

/** Bulk-add or update products from a CSV file. Good rows are saved; bad rows are listed by row number so you can fix and re-import them. */
export default function Import() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [file, setFile] = useState('');
  const [upsert, setUpsert] = useState(true);
  const [allOrNothing, setAllOrNothing] = useState(false);
  const [includesGst, setIncludesGst] = useState(true);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function pick() {
    const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
    if (r.canceled) return;
    try {
      const text = await FileSystem.readAsStringAsync(r.assets[0].uri);
      const parsed = parseCsv(text.replace(/^﻿/, ''));
      if (!parsed.length) return Alert.alert('Empty file', 'No data rows found.');
      if (parsed.length > MAX_ROWS) return Alert.alert('Too many rows', `Import at most ${MAX_ROWS} rows at a time.`);
      setRows(parsed); setFile(r.assets[0].name); setResult(null);
    } catch (e: any) { Alert.alert('Could not read file', e.message); }
  }

  async function template() {
    const uri = `${FileSystem.cacheDirectory}aayme-products-template.csv`;
    await FileSystem.writeAsStringAsync(uri, `${COLUMNS.join(',')}\nRICE5,Basmati Rice 5kg,Grocery,India Gate,Long grain rice,450.00,420.00,380.00,100,pack,1006,5,,5000,1,10,Active,https://example.com/rice-front.jpg,https://example.com/rice-back.jpg|https://example.com/rice-side.jpg\nAY002,USB Cable,Accessories,,,299.00,149.00,,250,pcs,8544,18,,,1,10,Active,https://example.com/usb-cable.jpg,\n`);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Product import template' });
  }

  async function run() {
    setBusy(true); setResult(null);
    try {
      const all = rows.map((r) => normalise(r, includesGst));
      const size = all.some((r) => r.image_url || r.other_image_urls) ? CHUNK_WITH_PHOTOS : CHUNK;
      const total = { created: 0, updated: 0, errors: [] as { row: number; message: string }[] };
      for (let i = 0; i < all.length; i += size) {
        setProgress(`${Math.min(i + size, all.length)} / ${all.length}`);
        try {
          const r = await api<any>('/catalog/import/rows', { body: { rows: all.slice(i, i + size), upsert, all_or_nothing: allOrNothing } });
          total.created += r.created; total.updated += r.updated; total.errors.push(...(r.errors ?? []).map((e: any) => ({ ...e, row: e.row + i })));
        } catch (e: any) {
          total.errors.push({ row: i + 1, message: `Rows ${i + 1} to ${Math.min(i + size, all.length)} were not saved: ${e.message}` });
          if (allOrNothing) break;
        }
      }
      setResult(total);
    } catch (e: any) { Alert.alert('Import failed', e.message); } finally { setBusy(false); setProgress(''); }
  }

  async function errorReport() {
    const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const uri = `${FileSystem.cacheDirectory}aayme-import-errors.csv`;
    const line = (e: any) => { const r = rows[e.row - 1] ?? {}; return [e.row, q(r.sku ?? r.product_sku ?? ''), q(r.name ?? r.product_name ?? ''), q(e.message)].join(','); };
    await FileSystem.writeAsStringAsync(uri, 'row,sku,name,error'+'\n'+result.errors.map(line).join('\n')+'\n');
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Import error report' });
  }

  return (
    <Screen>
      <Card>
        <H2>1. Get the template</H2>
        <Muted>Columns: {COLUMNS.join(', ')}. Only name and price are required. Photo links go in image_url (the main photo) and other_image_urls (more photos, separated by |): they must be https links to JPEG, PNG or WebP pictures. Headings like Product SKU, Product Name, Selling Price, Stock Quantity, HSN Code and GST Rate also work.</Muted>
        <Button small variant="ghost" title="Download template" onPress={template} />
      </Card>
      <Card>
        <H2>2. Choose your CSV</H2>
        <Button variant="ghost" title={file ? `${file} · ${rows.length} rows` : 'Pick a .csv file'} onPress={pick} />
        <Toggle label="Prices include GST" help="On: the price you wrote is the final rate with GST, and the price before GST is worked out. Off: the price is before GST." value={includesGst} onChange={setIncludesGst} />
        <Toggle label="Update products with the same SKU" help="Otherwise a repeated SKU is reported as an error." value={upsert} onChange={setUpsert} />
        <Toggle label="All or nothing" help="Save nothing if any row has an error." value={allOrNothing} onChange={setAllOrNothing} />
      </Card>
      <Button title={busy && progress ? `Importing ${progress}` : `Import ${rows.length || ''} rows`} onPress={run} loading={busy} disabled={!rows.length} />
      {result && (<Card>
        <H2>Result</H2>
        <Row>{Object.entries(result).filter(([, v]) => typeof v === 'number').map(([k, v]) => <Chip key={k} label={`${k.replace(/_/g, ' ')}: ${v}`} tone={k === 'created' || k === 'updated' ? 'ok' : undefined} />)}</Row>
        {(result.errors ?? []).slice(0, 30).map((e: any) => <Body key={e.row} style={{ color: '#D93A55', fontSize: 13 }}>Row {e.row}: {e.message}</Body>)}
        {(result.errors ?? []).length > 0 && <Button small variant="ghost" title="Share error report (CSV)" onPress={errorReport} />}
      </Card>)}
    </Screen>
  );
}
