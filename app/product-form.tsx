import React, { useEffect, useState } from 'react';
import { goBack } from '../src/lib/nav';
import { toast } from '../src/ui/Toast';
import { Alert } from '../src/ui/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, uploadRaw } from '../src/lib/api';
import { fieldErrors, useGet, useSend } from '../src/lib/hooks';
import { Scanner, PRODUCT_CODES } from '../src/ui/Scanner';
import { ProductHistory } from '../src/ui/ProductHistory';
import { NewProductPhotos, PickedPhoto, ProductAudience, ProductBatches, ProductPhotos } from '../src/ui/ProductExtras';
import { exclusive, inclusive } from '../src/lib/pricing';
import { Button, Chip, Field, H2, Muted, Row, Screen, Toggle } from '../src/ui/kit';

const GST = [0, 0.25, 3, 5, 12, 18, 28];
const UNITS = ['pcs', 'kg', 'g', 'ltr', 'box', 'carton', 'pack'];

/** Create or edit a product, adjust stock, and manage quantity-break prices. Money is typed as plain rupees. */
export default function ProductForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const detail = useGet<any>(`/catalog/${id}`, undefined, !!id);
  // the server wraps the product: { product, stock_history, batches, price_history }
  const existing = { ...detail, data: detail.data?.product ?? detail.data };
  const tax = useGet<any>('/catalog/taxonomy');
  const [f, setF] = useState<Record<string, string>>({ unit: 'pcs', min_order_qty: '1', low_stock_threshold: '10', stock_qty: '0' });
  const [gst, setGst] = useState(0);
  const [incl, setIncl] = useState(true);   // the rate is typed with GST included; the price before GST is worked out and shown below it
  const [active, setActive] = useState(true);
  const [catId, setCatId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [tiers, setTiers] = useState<{ min_qty: string; price: string }[]>([]);
  const [stockDelta, setStockDelta] = useState('');
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);   // free-form specification table (Material: Cotton ...)
  const [scan, setScan] = useState(false);
  const [importImgs, setImportImgs] = useState<string[]>([]);   // a photo found by the barcode lookup, attached when the product is saved
  const [picked, setPicked] = useState<PickedPhoto[]>([]);          // photos chosen before the product exists; uploaded right after it is saved
  const [scanBrand, setScanBrand] = useState('');                    // brand / category read from the barcode that are not in the distributor's lists yet
  const [scanCategory, setScanCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  // categories as a tree: main categories first; once one is chosen, its sub-categories appear on the next row
  const cats: any[] = tax.data?.categories ?? [];
  const byCatId = new Map<number, any>(cats.map((c) => [c.id, c]));
  const kids = (parent: number | null) => cats.filter((c) => (c.parent_id && byCatId.has(c.parent_id) ? c.parent_id : null) === parent);
  const chain: number[] = [];
  for (let n: any = catId !== null ? byCatId.get(catId) : null, hops = 0; n && hops < 8; n = n.parent_id ? byCatId.get(n.parent_id) : null, hops++) chain.unshift(n.id);
  const levels: any[][] = [kids(null)];
  for (const id of chain) { const k = kids(id); if (k.length) levels.push(k); }
  const [newSub, setNewSub] = useState('');
  const addSub = useSend<{ name: string; parent_id: number }, any>('/catalog/categories', { invalidate: ['/catalog/taxonomy'], onDone: (c) => { setNewSub(''); setCatId(c.id); toast.success('Sub-category added'); } });

  /** After a scan: fill the empty fields from what is known about this barcode, never overwriting what was already typed. */
  const onScanned = async (code: string) => {
    setScan(false); set('barcode')(code);
    try {
      const r = await api<any>('/catalog/barcode-info', { query: { barcode: code } });
      if (r.source === 'own') {
        if (String(r.existing.id) === id) return;
        Alert.alert('Already in your catalogue', `${r.existing.name} uses this barcode.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Open it', onPress: () => router.replace({ pathname: '/product-form', params: { id: String(r.existing.id) } }) }]);
        return;
      }
      const g = r.suggestion; setImportImgs(g?.image_urls?.length ? g.image_urls : g?.image_url ? [g.image_url] : []); if (!g) { toast.info('No details found for this barcode. Enter them by hand.'); return; }
      setF((x) => ({ ...x, name: x.name || g.name || '', mrp: x.mrp || (g.mrp ?? ''), hsn: x.hsn || g.hsn || '', description: x.description || g.description || '', unit: g.unit && UNITS.includes(g.unit) && (x.unit === 'pcs' || !x.unit) ? g.unit : x.unit }));
      setF((x) => ({ ...x, highlights: x.highlights || (g.highlights ?? []).join('\n'), manufacturer: x.manufacturer || g.manufacturer || '', country_of_origin: x.country_of_origin || g.country_of_origin || '' }));
      if (g.pack_size) {
        // "500 g", "1.5 kg", "250 ml", "1 l": fill the variant label and the weight (grams; millilitres counted as grams)
        const m = String(g.pack_size).trim().match(/^([\d.,]+)\s*(kg|g|gm|gms|l|ltr|ml)\b/i);
        const grams = m ? Math.round(Number(m[1].replace(',', '.')) * ({ kg: 1000, l: 1000, ltr: 1000 } as Record<string, number>)[m[2].toLowerCase()] || Number(m[1].replace(',', '.')) * 1) : null;
        setF((x) => ({ ...x, variant_label: x.variant_label || String(g.pack_size), weight_g: x.weight_g || (grams ? String(grams) : '') }));
      }
      if (g.pack_size) setSpecs((cur) => (cur.some((r) => r.key.toLowerCase() === 'pack size') ? cur : [...cur, { key: 'Pack size', value: g.pack_size }]));
      if (g.gst_rate_bps != null && GST.includes(g.gst_rate_bps / 100)) setGst(g.gst_rate_bps / 100);
      const byName = (list: any[] | undefined, n?: string | null) => (n ? list?.find((i) => i.name.toLowerCase() === n.toLowerCase()) : undefined);
      const c = byName(tax.data?.categories, g.category); if (c && catId === null) setCatId(c.id); else if (!c && g.category) setScanCategory(g.category);
      const b = byName(tax.data?.brands, g.brand); if (b && brandId === null) setBrandId(b.id); else if (!b && g.brand) setScanBrand(g.brand);
      toast.success(`Details filled in${g.image_urls?.length ? ` with ${g.image_urls.length} photo${g.image_urls.length > 1 ? 's' : ''}` : ''}. Enter your price and save.`);
    } catch { toast.info('Could not look up this barcode right now. Enter the details by hand.'); }
  };

  useEffect(() => {
    const p = existing.data; if (!p) return;
    setF({ name: p.name, sku: p.sku ?? '', barcode: p.barcode ?? '', description: p.description ?? '', price: inclusive(p.price, p.gst_rate_bps).toFixed(2), mrp: p.mrp ?? '', unit: p.unit, hsn: p.hsn ?? '',
      min_order_qty: String(p.min_order_qty), low_stock_threshold: String(p.low_stock_threshold), variant_group: p.variant_group ?? '', variant_label: p.variant_label ?? '',
      highlights: (p.highlights ?? []).join('\n'), tags: (p.tags ?? []).join(', '), manufacturer: p.manufacturer ?? '', country_of_origin: p.country_of_origin ?? '',
      weight_g: p.weight_g == null ? '' : String(p.weight_g), length_cm: p.length_cm == null ? '' : String(p.length_cm), width_cm: p.width_cm == null ? '' : String(p.width_cm), height_cm: p.height_cm == null ? '' : String(p.height_cm),
      shelf_life_days: p.shelf_life_days == null ? '' : String(p.shelf_life_days), warranty_months: p.warranty_months == null ? '' : String(p.warranty_months), return_days: p.return_days == null ? '' : String(p.return_days) });
    setSpecs(p.specs ?? []);
    setGst(p.gst_rate_bps / 100); setActive(p.is_active); setCatId(p.category_id); setBrandId(p.brand_id);
    setTiers((p.tiers ?? []).map((t: any) => ({ min_qty: String(t.min_qty), price: inclusive(t.price, p.gst_rate_bps).toFixed(2) })));
    setIncl(true);
  }, [existing.data?.id]);

  const save = useSend<any>(id ? `/catalog/${id}` : '/catalog', { method: id ? 'PATCH' : 'POST', invalidate: ['/catalog', `/catalog/${id}`], success: 'Product saved', onDone: (p) => {
    if (p?.review_status === 'pending') toast.info('Waiting for company approval. Retailers will see this product once it is approved.');
    const pid = id ?? p?.id;
    if (!pid || (!importImgs.length && !picked.length)) { goBack(router); return; }
    (async () => {
      let failed = 0;
      for (const ph of picked) { try { await uploadRaw(`/catalog/${pid}/images`, ph.uri, ph.mime); } catch { try { await uploadRaw(`/catalog/${pid}/images`, ph.uri, ph.mime); } catch { failed++; } } }
      for (const url of importImgs) await api(`/catalog/${pid}/images/import`, { body: { url } }).catch(() => {});
      if (failed) toast.info(`${failed} photo${failed > 1 ? 's' : ''} could not be uploaded. Add ${failed > 1 ? 'them' : 'it'} again from the product page.`);
    })().finally(() => goBack(router));
  } });
  const stock = useSend<any>(`/catalog/${id}/stock`, { invalidate: ['/catalog', `/catalog/${id}`], onDone: () => { setStockDelta(''); toast.success('Stock updated'); } });
  const dup = useSend<any>(`/catalog/${id}/duplicate`, { invalidate: ['/catalog'], onDone: (p) => { toast.success('Copy created (hidden, no stock)'); router.replace({ pathname: '/product-form', params: { id: String(p.id) } }); } });
  const del = useSend<any>(`/catalog/${id}`, { method: 'DELETE', invalidate: ['/catalog'], success: 'Product deleted', onDone: () => goBack(router) });

  /** Listing details for the online shop. Blank numbers are sent as null when editing, so a cleared field really clears. */
  const details = () => {
    const num = (k: string, int = true) => { const v = f[k]?.trim(); return v ? (int ? Math.round(Number(v)) : Number(v)) : id ? null : undefined; };
    const text = (k: string) => (f[k]?.trim() ? f[k].trim() : id ? null : undefined);
    return {
      highlights: (f.highlights ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 8),
      tags: (f.tags ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10),
      specs: specs.filter((r) => r.key.trim() && r.value.trim()).map((r) => ({ key: r.key.trim(), value: r.value.trim() })),
      manufacturer: text('manufacturer'), country_of_origin: text('country_of_origin'),
      weight_g: num('weight_g'), length_cm: num('length_cm', false), width_cm: num('width_cm', false), height_cm: num('height_cm', false),
      shelf_life_days: num('shelf_life_days'), warranty_months: num('warranty_months'), return_days: num('return_days'),
    };
  };

  /** What is stored: the price before GST. In rate-with-GST mode it is worked out from the typed rate. */
  const base = (v: string) => (incl && v ? exclusive(v, Math.round(gst * 100)).toFixed(2) : v);
  const switchMode = (toIncl: boolean) => {
    if (toIncl === incl) return;
    const bps = Math.round(gst * 100);
    const conv = (v: string) => (v ? (toIncl ? inclusive(v, bps) : exclusive(v, bps)).toFixed(2) : v);
    setF((x) => ({ ...x, price: conv(x.price) })); setTiers((t) => t.map((r) => ({ ...r, price: conv(r.price) }))); setIncl(toIncl);
  };
  const submit = () => {
    setErrors({});
    const opt = (k: string) => (f[k]?.trim() ? { [k]: f[k].trim() } : {});
    save.mutate({
      name: f.name?.trim(), price: base(f.price), unit: f.unit, gst_rate_bps: Math.round(gst * 100), min_order_qty: Number(f.min_order_qty), low_stock_threshold: Number(f.low_stock_threshold), is_active: active,
      ...opt('sku'), ...opt('barcode'), ...opt('description'), ...opt('hsn'), ...opt('variant_group'), ...opt('variant_label'),
      ...(f.mrp?.trim() ? { mrp: f.mrp.trim() } : id ? { mrp: null } : {}),
      ...(catId ? { category_id: catId } : scanCategory ? { category: scanCategory } : {}), ...(brandId ? { brand_id: brandId } : scanBrand ? { brand: scanBrand } : {}),
      tiers: tiers.filter((t) => t.min_qty && t.price).map((t) => ({ min_qty: Number(t.min_qty), price: base(t.price) })),
      ...details(),
      ...(id ? {} : { stock_qty: Number(f.stock_qty || 0) }),
    }, { onError: (e) => setErrors(fieldErrors(e)) });
  };

  return (
    <Screen>
      <Field label="Product name" value={f.name} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <Row>
        <Field label={incl ? 'Rate (incl. GST)' : 'Price (excl. GST)'} value={f.price} onChangeText={set('price')} keyboardType="decimal-pad" error={errors.price} style={{ minWidth: 140 }} />
        <Field label="MRP (optional)" value={f.mrp} onChangeText={set('mrp')} keyboardType="decimal-pad" error={errors.mrp} style={{ minWidth: 140 }} />
      </Row>
      <Row><Chip label="Rate includes GST" active={incl} onPress={() => switchMode(true)} /><Chip label="Price before GST" active={!incl} onPress={() => switchMode(false)} /></Row>
      {!!Number(f.price) && <Muted>{incl ? `Shops see ₹${inclusive(exclusive(f.price, Math.round(gst * 100)), Math.round(gst * 100)).toFixed(2)}: ₹${exclusive(f.price, Math.round(gst * 100)).toFixed(2)} + ${gst}% GST. The invoice shows the split.` : `Shops will see ₹${inclusive(f.price, Math.round(gst * 100)).toFixed(2)} (₹${Number(f.price).toFixed(2)} + ${gst}% GST).`}</Muted>}
      <H2>Unit</H2><Row>{UNITS.map((u) => <Chip key={u} label={u} active={f.unit === u} onPress={() => set('unit')(u)} />)}</Row>
      <H2>GST %</H2><Row>{GST.map((g) => <Chip key={g} label={`${g}%`} active={gst === g} onPress={() => setGst(g)} />)}</Row>
      {!!errors.gst_rate_bps && <Muted>{errors.gst_rate_bps}</Muted>}
      <Row>
        <Field label="Min order qty" value={f.min_order_qty} onChangeText={set('min_order_qty')} keyboardType="number-pad" style={{ minWidth: 110 }} />
        <Field label="Low stock alert at" value={f.low_stock_threshold} onChangeText={set('low_stock_threshold')} keyboardType="number-pad" style={{ minWidth: 110 }} />
        {!id && <Field label="Opening stock" value={f.stock_qty} onChangeText={set('stock_qty')} keyboardType="number-pad" style={{ minWidth: 110 }} />}
      </Row>
      <Row>
        <Field label="SKU" value={f.sku} onChangeText={set('sku')} autoCapitalize="characters" error={errors.sku} style={{ minWidth: 140 }} />
        <Field label="Barcode" value={f.barcode} onChangeText={set('barcode')} error={errors.barcode} style={{ minWidth: 140 }} />
        <Button small variant="ghost" title="Scan" onPress={() => setScan(true)} />
        <Field label="HSN" value={f.hsn} onChangeText={set('hsn')} keyboardType="number-pad" error={errors.hsn} style={{ minWidth: 110 }} />
      </Row>
      <Row>
        <Field label="Variant group (e.g. Rice)" value={f.variant_group} onChangeText={set('variant_group')} style={{ minWidth: 150 }} />
        <Field label="Variant (e.g. 5 kg)" value={f.variant_label} onChangeText={set('variant_label')} style={{ minWidth: 120 }} />
      </Row>
      <Field label="Description" value={f.description} onChangeText={set('description')} multiline style={{ minHeight: 60 }} autoCapitalize="sentences" />

      {!!cats.length && (<>
        <H2>Category</H2>
        <Row>{levels[0].map((c: any) => <Chip key={c.id} label={c.name} active={chain.includes(c.id)} onPress={() => setCatId(c.id)} />)}</Row>
        {catId !== null && (<>
          <H2>Sub-category</H2>
          <Muted>{levels.length > 1 ? `Choose the sub-category of ${byCatId.get(chain[0])?.name ?? 'this category'} so the product is saved in the right place.` : `No sub-categories under ${byCatId.get(chain[0])?.name ?? 'this category'} yet. Add one below, or save in this category.`}</Muted>
          {levels.slice(1).map((lvl, n) => <Row key={n}>{lvl.map((c: any) => <Chip key={c.id} label={c.name} active={chain.includes(c.id)} onPress={() => setCatId(c.id)} />)}</Row>)}
          {chain.length > 1 && <Muted>Saved in: {chain.map((id) => byCatId.get(id)?.name).filter(Boolean).join(' › ')}</Muted>}
          <Row>
            <Field label={`New sub-category under ${byCatId.get(catId)?.name ?? 'this category'}`} value={newSub} onChangeText={setNewSub} autoCapitalize="words" style={{ minWidth: 200 }} />
            <Button small variant="ghost" title="Add" disabled={!newSub.trim()} loading={addSub.isPending} onPress={() => addSub.mutate({ name: newSub.trim(), parent_id: catId })} />
          </Row>
        </>)}
      </>)}
      <Row>
        <Field label="Brand name" value={scanBrand} onChangeText={(v) => { setScanBrand(v); if (v) setBrandId(null); }} autoCapitalize="words" style={{ minWidth: 150 }} />
        <Field label="Category name" value={scanCategory} onChangeText={(v) => { setScanCategory(v); if (v) setCatId(null); }} autoCapitalize="words" style={{ minWidth: 150 }} />
      </Row>
      {!!tax.data?.brands?.length && (<><H2>Brand</H2><Row>{tax.data.brands.map((b: any) => <Chip key={b.id} label={b.name} active={brandId === b.id} onPress={() => setBrandId(b.id)} />)}</Row></>)}

      <H2>Quantity prices</H2>
      <Muted>Each break must be cheaper than the one before.</Muted>
      {tiers.map((t, n) => (
        <Row key={n}>
          <Field label="From qty" value={t.min_qty} onChangeText={(v) => setTiers(tiers.map((x, i) => (i === n ? { ...x, min_qty: v } : x)))} keyboardType="number-pad" style={{ minWidth: 100 }} />
          <Field label="Price" value={t.price} onChangeText={(v) => setTiers(tiers.map((x, i) => (i === n ? { ...x, price: v } : x)))} keyboardType="decimal-pad" style={{ minWidth: 100 }} />
          <Button small variant="ghost" title="Remove" onPress={() => setTiers(tiers.filter((_, i) => i !== n))} />
        </Row>
      ))}
      {tiers.length < 5 && <Button small variant="ghost" title="Add quantity price" onPress={() => setTiers([...tiers, { min_qty: '', price: '' }])} />}
      {!!errors.tiers && <Muted>{errors.tiers}</Muted>}
      <Scanner visible={scan} types={PRODUCT_CODES} title="Scan the product barcode" onClose={() => setScan(false)} onCode={onScanned} />
      <H2>Product page details</H2>
      <Muted>What shoppers see on the product page: bullet points, specifications, size and delivery details.</Muted>
      <Field label="Highlights (one per line, up to 8)" value={f.highlights ?? ''} onChangeText={set('highlights')} multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <Muted>Specifications</Muted>
      {specs.map((r, n) => (
        <Row key={n} style={{ flexWrap: 'nowrap' }}>
          <Field label="Name" value={r.key} onChangeText={(v) => setSpecs(specs.map((x, i) => (i === n ? { ...x, key: v } : x)))} style={{ minWidth: 110 }} />
          <Field label="Value" value={r.value} onChangeText={(v) => setSpecs(specs.map((x, i) => (i === n ? { ...x, value: v } : x)))} style={{ minWidth: 130 }} />
          <Button small variant="ghost" title="Remove" onPress={() => setSpecs(specs.filter((_, i) => i !== n))} />
        </Row>
      ))}
      {specs.length < 20 && <Button small variant="ghost" title="Add specification" onPress={() => setSpecs([...specs, { key: '', value: '' }])} />}
      <Row>
        <Field label="Manufacturer / brand owner" value={f.manufacturer ?? ''} onChangeText={set('manufacturer')} style={{ minWidth: 180 }} />
        <Field label="Country of origin" value={f.country_of_origin ?? ''} onChangeText={set('country_of_origin')} style={{ minWidth: 140 }} />
      </Row>
      <Row>
        <Field label="Weight (g)" value={f.weight_g ?? ''} onChangeText={set('weight_g')} keyboardType="number-pad" style={{ minWidth: 100 }} />
        <Field label="Length (cm)" value={f.length_cm ?? ''} onChangeText={set('length_cm')} keyboardType="decimal-pad" style={{ minWidth: 100 }} />
        <Field label="Width (cm)" value={f.width_cm ?? ''} onChangeText={set('width_cm')} keyboardType="decimal-pad" style={{ minWidth: 100 }} />
        <Field label="Height (cm)" value={f.height_cm ?? ''} onChangeText={set('height_cm')} keyboardType="decimal-pad" style={{ minWidth: 100 }} />
      </Row>
      <Row>
        <Field label="Shelf life (days)" value={f.shelf_life_days ?? ''} onChangeText={set('shelf_life_days')} keyboardType="number-pad" style={{ minWidth: 110 }} />
        <Field label="Warranty (months)" value={f.warranty_months ?? ''} onChangeText={set('warranty_months')} keyboardType="number-pad" style={{ minWidth: 110 }} />
        <Field label="Return window (days)" value={f.return_days ?? ''} onChangeText={set('return_days')} keyboardType="number-pad" style={{ minWidth: 110 }} />
      </Row>
      <Field label="Search tags (comma separated)" value={f.tags ?? ''} onChangeText={set('tags')} autoCapitalize="none" />
      {!id && <NewProductPhotos photos={picked} onChange={setPicked} found={importImgs.slice(0, 5 - picked.length)} />}
      <Toggle label="Visible to retailers" value={active} onChange={setActive} />
      <Button title={id ? 'Save changes' : 'Add product'} onPress={submit} loading={save.isPending} />

      {id && existing.data && (<>
        <ProductPhotos productId={Number(id)} images={existing.data.images ?? []} />
        <ProductBatches productId={Number(id)} />
        <ProductAudience productId={Number(id)} />
        <H2>Stock · {existing.data.stock_qty} on hand</H2>
        <Row>
          <Field label="Add (+) or remove (−)" value={stockDelta} onChangeText={setStockDelta} keyboardType="numbers-and-punctuation" style={{ minWidth: 150 }} />
          <Button small title="Update stock" disabled={!Number(stockDelta)} loading={stock.isPending} onPress={() => stock.mutate({ delta: Number(stockDelta), note: 'Adjusted in app' })} />
        </Row>
        <ProductHistory productId={Number(id)} />
        <Button variant="ghost" title="Duplicate this product" loading={dup.isPending} onPress={() => dup.mutate({})} />
        <Button variant="danger" title="Delete product" onPress={() => Alert.alert('Delete product?', 'It will be removed from your catalog.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate({}) }])} />
      </>)}
    </Screen>
  );
}
