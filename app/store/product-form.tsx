import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, uploadRaw } from '../../src/lib/api';
import { goBack } from '../../src/lib/nav';
import { fieldErrors, useGet, useSend } from '../../src/lib/hooks';
import { Scanner, PRODUCT_CODES } from '../../src/ui/Scanner';
import { Select } from '../../src/ui/Select';
import { StorePhotos } from '../../src/ui/StorePhotos';
import { NewProductPhotos, PickedPhoto } from '../../src/ui/ProductExtras';
import { Alert } from '../../src/ui/alert';
import { Button, ErrorBox, Field, Loading, Muted, Row, Screen, Toggle } from '../../src/ui/kit';

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'pack', 'box', 'dozen'];
const DEFAULT_CATEGORIES = ['Grocery', 'Snacks & Fast Food', 'Beverages', 'Dairy', 'Mobile & Tech', 'Home Essentials', 'Personal Care', 'Clothing', 'Medical', 'Hardware', 'Stationery', 'Other'];

/** Add or change one of the store's own products. */
export default function StoreProductForm() {
  const { id, barcode } = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const router = useRouter();
  const existing = useGet<any>('/store/products', { status: 'all' });   // also gives the categories and brands already used
  const [picked, setPicked] = useState<PickedPhoto[]>([]);
  const [f, setF] = useState<Record<string, string>>({ unit: 'pcs', stock_qty: '0', barcode: barcode ?? '' });
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scan, setScan] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  useEffect(() => {
    const p = (existing.data?.products ?? []).find((x: any) => String(x.id) === id); if (!p) return;
    setF({ name: p.name, brand: p.brand ?? '', category: p.category ?? '', unit: p.unit, barcode: p.barcode ?? '', price: p.price, mrp: p.mrp ?? '', cost: p.cost ?? '', stock_qty: String(p.stock_qty), description: p.description ?? '' });
    setActive(p.is_active);
  }, [existing.data, id]);
  const body = () => ({
    name: f.name?.trim(), unit: f.unit || 'pcs', price: f.price, stock_qty: Number(f.stock_qty || 0), is_active: active,
    brand: f.brand?.trim() || null, category: f.category?.trim() || null, barcode: f.barcode?.trim() || null, description: f.description?.trim() || null,
    mrp: f.mrp?.trim() ? f.mrp.trim() : null, cost: f.cost?.trim() ? f.cost.trim() : null,
  });
  const save = useSend<any>(id ? `/store/products/${id}` : '/store/products', { method: id ? 'PUT' : 'POST', invalidate: ['/store/products', '/store/dashboard'], success: 'Product saved', onDone: async (p) => {
    // photos chosen while adding a new product go up as soon as the product exists
    if (!id && picked.length && p?.id) { let failed = 0; for (const ph of picked) { try { await uploadRaw(`/store/products/${p.id}/images`, ph.uri, ph.mime); } catch { failed++; } } if (failed) Alert.alert('Some photos were not added', 'Open the product and add them again.'); }
    goBack(router);
  } });
  const products: any[] = existing.data?.products ?? [];
  const cats = [...new Set([...(existing.data?.categories ?? []), ...DEFAULT_CATEGORIES])].map((v) => ({ value: v as string, label: v as string }));
  const brands = [...new Set(products.map((x) => x.brand).filter(Boolean))].sort().map((v) => ({ value: v as string, label: v as string }));
  const current = products.find((x) => String(x.id) === id);
  async function remove() {
    Alert.alert('Delete product?', 'It will no longer be sold.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await api(`/store/products/${id}`, { method: 'DELETE' }); goBack(router); } catch (e: any) { Alert.alert('Not deleted', e.message); } } }]);
  }
  if (id && existing.isLoading) return <Screen><Loading /></Screen>;
  if (existing.error) return <Screen><ErrorBox error={existing.error} retry={existing.refetch} /></Screen>;
  return (
    <Screen>
      <Field label="Product name" value={f.name ?? ''} onChangeText={set('name')} autoCapitalize="words" error={errors.name} />
      <Row style={{ alignItems: 'flex-end' }}><Field label="Barcode" value={f.barcode ?? ''} onChangeText={set('barcode')} style={{ minWidth: 180 }} error={errors.barcode} /><Button small variant="ghost" title="Scan" onPress={() => setScan(true)} /></Row>
      <Row>
        <Field label="Selling price (INR)" value={f.price ?? ''} onChangeText={set('price')} keyboardType="decimal-pad" style={{ minWidth: 130 }} error={errors.price} />
        <Field label="M.R.P. (INR)" value={f.mrp ?? ''} onChangeText={set('mrp')} keyboardType="decimal-pad" style={{ minWidth: 110 }} error={errors.mrp} />
        <Field label="Cost (INR)" value={f.cost ?? ''} onChangeText={set('cost')} keyboardType="decimal-pad" style={{ minWidth: 110 }} />
      </Row>
      <Muted>The selling price is what the customer pays, taxes included. Cost is private; it is used for your earnings figure.</Muted>
      <Row>
        <Field label="Stock" value={f.stock_qty ?? ''} onChangeText={set('stock_qty')} keyboardType="number-pad" style={{ minWidth: 110 }} />
        <Select label="Unit" value={f.unit} options={UNITS.map((u) => ({ value: u, label: u }))} onChange={(v) => set('unit')(String(v))} style={{ minWidth: 130, flex: 1 }} />
      </Row>
      <Select label="Category" value={f.category || null} options={cats} placeholder="Choose a category" allowNew newLabel="Add a new category" clearLabel="Clear category" onChange={(v) => set('category')(v ? String(v) : '')} />
      <Select label="Brand" value={f.brand || null} options={brands} placeholder={brands.length ? 'Choose a brand' : 'Add a brand'} allowNew newLabel="Add a new brand" clearLabel="Clear brand" onChange={(v) => set('brand')(v ? String(v) : '')} />
      <Field label="Description (optional)" value={f.description ?? ''} onChangeText={set('description')} multiline style={{ minHeight: 60 }} />
      {id ? <StorePhotos productId={Number(id)} images={current?.images ?? []} /> : <NewProductPhotos photos={picked} onChange={setPicked} />}
      <Toggle label="On sale" help="Off hides it from customers and the counter." value={active} onChange={setActive} />
      <Button title={id ? 'Save changes' : 'Add product'} loading={save.isPending} disabled={!f.name?.trim() || !f.price} onPress={() => { setErrors({}); save.mutate(body(), { onError: (e) => setErrors(fieldErrors(e)) }); }} />
      {!!id && <Button variant="danger" title="Delete product" onPress={remove} />}
      <Scanner visible={scan} types={PRODUCT_CODES} title="Scan the product barcode" onClose={() => setScan(false)} onCode={(c) => { setScan(false); set('barcode')(c); }} />
    </Screen>
  );
}
