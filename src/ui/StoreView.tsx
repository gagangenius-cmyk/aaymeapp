import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppText as Text } from './AppText';
import { Linking, Modal, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { Alert } from './alert';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { api, mediaUrl, newKey } from '../lib/api';
import { ProductImage } from './ProductImage';
import { setCartBar } from './CartBar';
import { SearchBar } from './SearchBar';
import { TabInsetContext } from './tabInset';
import { tr } from '../lib/i18n';
import { useGet, useSend } from '../lib/hooks';
import { asShopProduct, lineTotal, unitFor } from '../lib/pricing';
import { colors, radius } from '../lib/theme';
import { Body, Button, Card, Chip, Empty, ErrorBox, Field, H2, inr, Loading, Muted, Row } from './kit';

const SOCIAL: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  whatsapp: { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
  facebook: { icon: 'logo-facebook', label: 'Facebook', color: '#1877F2' },
  instagram: { icon: 'logo-instagram', label: 'Instagram', color: '#E1306C' },
  youtube: { icon: 'logo-youtube', label: 'YouTube', color: '#FF0000' },
  maps: { icon: 'location', label: 'Location', color: colors.cyan },
};

/** One distributor's store as the retailer sees it: profile, social links, products, cart and checkout. */
export function StoreView({ id, query, onQuery }: { id: number; query?: string; onQuery?: (v: string) => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const profile = useGet<any>(`/retailer/stores/${id}`);
  const [ownText, setOwnText] = useState('');
  const text = query ?? ownText; const setText = onQuery ?? setOwnText;
  const [category, setCategory] = useState('');
  const raw = useGet<any>(`/retailer/stores/${id}/products`, { q: text.trim() || undefined, category: category || undefined, limit: 100 });
  // every price the shopper sees includes GST (the invoice shows the split)
  const shown = React.useMemo(() => (raw.data ? { ...raw.data, products: (raw.data.products ?? []).map(asShopProduct) } : raw.data), [raw.data]);
  const products = { ...raw, data: shown } as typeof raw;
  const makePrimary = useSend<{ distributor_id: number }>('/retailer/primary', { method: 'PUT', invalidate: ['/retailer/stores', `/retailer/stores/${id}`], success: 'Now your main distributor' });
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cod, setCod] = useState(false);
  const [plainBill, setPlainBill] = useState(false);   // a shopkeeper without GST can ask for a plain bill instead of a GST bill
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const inset = useContext(TabInsetContext);
  const safeBottom = useSafeAreaInsets().bottom;
  const orderKey = useRef(newKey()); // one key per checkout: a double tap or retry returns the same order instead of a second one

  const lines = (products.data?.products ?? []).filter((p: any) => cart[p.id] > 0);
  // prices already include GST, so the cart total is simply rate x quantity (the invoice shows the split)
  const total = lines.reduce((s: number, p: any) => s + lineTotal(p, cart[p.id]), 0);
  const savings = lines.reduce((s: number, p: any) => s + (p.mrp && Number(p.mrp) > unitFor(p, cart[p.id]) ? (Number(p.mrp) - unitFor(p, cart[p.id])) * cart[p.id] : 0), 0);
  const subtotal = total;
  const setQty = (p: any, qty: number) => setCart((c) => ({ ...c, [p.id]: Math.max(0, qty) }));

  const deals = text.trim() || category ? [] : (products.data?.products ?? []).filter((p: any) => p.discount_pct > 0 && (p.available_qty ?? p.stock_qty) > 0).slice(0, 10);
  const itemCount = lines.length;
  // a scanned barcode (digits only, or an exact barcode match) that finds one product opens its full page straight away
  const scannedFor = useRef('');
  useEffect(() => {
    const t = text.trim(); const list = products.data?.products ?? [];
    if (!/^[A-Za-z0-9-]{4,40}$/.test(t) || products.isFetching || scannedFor.current === t) return;
    const hit = list.filter((x: any) => x.barcode === t);
    if (hit.length === 1) { scannedFor.current = t; setDetailId(hit[0].id); }
  }, [text, products.data, products.isFetching]);
  useFocusEffect(useCallback(() => {
    setCartBar(itemCount > 0 ? { count: itemCount, total, bottom: inset, onPress: () => setCartOpen(true) } : null);
    return () => setCartBar(null);
  }, [itemCount, total, inset]));

  async function placeOrder() {
    setBusy(true);
    try {
      const r = await api('/orders', { body: { distributor_id: id, payment_method: cod ? 'cod' : 'credit', bill_type: plainBill ? 'plain' : 'gst', items: lines.map((p: any) => ({ product_id: p.id, qty: cart[p.id] })) }, idempotent: orderKey.current });
      setCart({}); setCartOpen(false); orderKey.current = newKey();
      qc.invalidateQueries({ queryKey: ['/orders'] }); qc.invalidateQueries({ queryKey: ['/retailer/stores'] });
      router.push({ pathname: '/order/[id]', params: { id: String(r.order.id) } });
    } catch (e: any) { Alert.alert('Order not placed', e.message); } finally { setBusy(false); }
  }

  if (profile.isLoading) return <Loading />;
  if (profile.error) return <ErrorBox error={profile.error} retry={profile.refetch} />;
  const s = profile.data;
  const links = Object.entries(s.social_links ?? {}).filter(([k, v]) => SOCIAL[k] && v);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{String(s.business_name ?? '?').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: '800' }}>{s.business_name}</Text>
          {s.city ? <Muted>{s.city}</Muted> : null}
        </View>
        {s.is_pinned ? <Chip label="Your distributor" tone="ok" /> : <Button small variant="ghost" title="Make my main distributor" loading={makePrimary.isPending} onPress={() => makePrimary.mutate({ distributor_id: id })} />}
      </View>
      {s.balance_due_paise > 0 && <Muted style={{ color: colors.warn }}>You owe {inr(s.balance_due_paise / 100)}{s.credit_limit ? ` · limit ${inr(s.credit_limit)}` : ''}</Muted>}
      {links.length > 0 && (
        <Row>
          {links.map(([k, url]) => (
            <Pressable key={k} onPress={() => Linking.openURL(String(url))} accessibilityLabel={SOCIAL[k].label} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={SOCIAL[k].icon} size={18} color={SOCIAL[k].color} />
            </Pressable>
          ))}
        </Row>
      )}

      {!onQuery && <SearchBar value={text} onChange={setText} />}
      {!text.trim() && !category && (
        <View style={{ backgroundColor: colors.navy, borderRadius: radius.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>WHOLESALE PRICES</Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{deals.length ? `Up to ${Math.max(...deals.map((d: any) => d.discount_pct))}% off` : 'Stock up & save'}</Text>
            <Text style={{ color: '#FFFFFFB3', fontSize: 12.5 }}>Buy more, pay less. Pay on Khata or cash on delivery.</Text>
          </View>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pricetags" size={30} color={colors.gold} /></View>
        </View>
      )}
      {!!products.data?.categories?.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 8 }} style={{ flexGrow: 0 }}>
          {['', ...products.data.categories].map((c: string) => {
            const on = category === c;
            return (
              <Pressable key={c || 'all'} onPress={() => setCategory(c)} accessibilityRole="button" accessibilityLabel={c || 'All'} style={{ alignItems: 'center', width: 68, gap: 6 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: on ? colors.primary : colors.surface, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  {c ? <Text style={{ color: on ? '#fff' : colors.primary, fontSize: 22, fontWeight: '800' }}>{c.trim().charAt(0).toUpperCase()}</Text> : <Ionicons name="grid" size={22} color={on ? '#fff' : colors.primary} />}
                </View>
                <Text numberOfLines={1} style={{ color: on ? colors.primary : colors.text, fontSize: 11.5, fontWeight: on ? '800' : '600' }}>{c || 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {deals.length > 0 && (
        <>
          <H2>Best deals</H2>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }} style={{ flexGrow: 0 }}>
            {deals.map((p: any) => (
              <Pressable key={p.id} onPress={() => setDetailId(p.id)} style={{ width: 140, backgroundColor: colors.surface, borderRadius: 4, borderWidth: 1, borderColor: colors.border, padding: 8, gap: 4 }}>
                <View>
                  <ProductImage uri={mediaUrl(p.image_url)} />
                  <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.green, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800' }}>{`${p.discount_pct}% OFF`}</Text></View>
                </View>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{p.display_name}</Text>
                <Row style={{ gap: 6, flexWrap: 'nowrap' }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{inr(p.price)}</Text><Muted style={{ textDecorationLine: 'line-through', fontSize: 11 }}>{inr(p.mrp)}</Muted></Row>
                <Text style={{ color: colors.green, fontSize: 11.5, fontWeight: '700' }}>{`↓${p.discount_pct}% off`}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <H2>All products</H2>
        </>
      )}
      {products.isLoading ? <Loading /> : products.error ? <ErrorBox error={products.error} retry={products.refetch} /> : !products.data.products.length ? <Empty text={text.trim() || category ? 'No products match your search' : 'No products are visible to you from this distributor yet. They may be waiting for approval or not shared with your shop. Ask the distributor to check.'} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
          {products.data.products.map((p: any) => (
            <ProductCard key={p.id} p={p} qty={cart[p.id] ?? 0} onOpen={() => setDetailId(p.id)} onQty={(n) => setQty(p, n)} />
          ))}
        </View>
      )}
      {lines.length > 0 && <View style={{ height: 76 }} />}

      <DetailSheet p={(products.data?.products ?? []).find((x: any) => x.id === detailId)} qty={cart[detailId ?? 0] ?? 0} onClose={() => setDetailId(null)} onQty={(p, n) => setQty(p, n)} onGoCart={() => setCartOpen(true)} />

      <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setCartOpen(false)} />
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '90%', padding: 16, paddingBottom: 16 + safeBottom, gap: 12 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <H2>Your cart</H2>
              <Pressable onPress={() => setCartOpen(false)} hitSlop={10}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
            </Row>
            <ScrollView contentContainerStyle={{ gap: 10 }}>
              {lines.map((p: any) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 8 }}>
                  <ProductImage uri={mediaUrl(p.image_url)} size={56} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{p.display_name}</Text>
                    <Muted>{inr(lineTotal(p, cart[p.id]))}</Muted>
                  </View>
                  <View style={{ width: 96 }}><Stepper p={p} qty={cart[p.id]} max={p.available_qty ?? p.stock_qty} onChange={(n) => setQty(p, n)} /></View>
                </View>
              ))}
            </ScrollView>
            <Row>
              <Chip label="Khata (credit)" active={!cod} onPress={() => setCod(false)} />
              {s.accepts_cod && <Chip label="Cash on delivery" active={cod} onPress={() => setCod(true)} />}
            </Row>
            <Row>
              <Chip label="GST bill" active={!plainBill} onPress={() => { setPlainBill(false); orderKey.current = newKey(); }} />
              <Chip label="Plain bill (no GST)" active={plainBill} onPress={() => { setPlainBill(true); orderKey.current = newKey(); }} />
            </Row>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 }}>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 }}>PRICE DETAILS</Text>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>{`Price (${lines.length} ${lines.length === 1 ? 'item' : 'items'})`}</Muted><Body>{inr(subtotal)}</Body></Row>
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}><Muted>GST</Muted><Body>Included in price</Body></Row>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Total amount</Text>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{inr(total)}</Text>
              </Row>
            </View>
            {savings > 0 && <Text style={{ color: colors.green, fontWeight: '700', fontSize: 13.5 }}>{`You will save ${inr(savings)} on this order`}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                {savings > 0 && <Muted style={{ textDecorationLine: 'line-through', fontSize: 12 }}>{inr(total + savings)}</Muted>}
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{inr(total)}</Text>
              </View>
              <View style={{ flex: 1.2 }}><Button title="PLACE ORDER" onPress={placeOrder} loading={busy} disabled={!lines.length} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** ADD turns into a − qty + stepper once the product is in the cart. */
function Stepper({ p, qty, max, onChange }: { p: any; qty: number; max: number; onChange: (n: number) => void }) {
  if (qty <= 0) {
    return (
      <Pressable onPress={() => onChange(p.min_order_qty)} accessibilityRole="button" accessibilityLabel="ADD"
        style={{ borderWidth: 1.5, borderColor: colors.primary, borderRadius: 4, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.surface }}>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13, letterSpacing: 0.6 }}>ADD</Text>
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary, borderRadius: 4 }}>
      <Pressable hitSlop={6} onPress={() => onChange(qty <= p.min_order_qty ? 0 : qty - 1)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Ionicons name="remove" size={18} color="#fff" /></Pressable>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{qty}</Text>
      <Pressable hitSlop={6} onPress={() => onChange(Math.min(qty + 1, max))} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Ionicons name="add" size={18} color="#fff" /></Pressable>
    </View>
  );
}

function ProductCard({ p, qty, onOpen, onQty }: { p: any; qty: number; onOpen: () => void; onQty: (n: number) => void }) {
  const max = p.available_qty ?? p.stock_qty; const out = max <= 0;
  const hasMrp = p.mrp && Number(p.mrp) > Number(p.price);
  const low = !out && max <= 10;
  return (
    <View style={{ width: '48.5%' }}>
      <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 6, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 6 }}>
        <Pressable onPress={onOpen} style={{ gap: 5 }}>
          <View>
            <ProductImage uri={mediaUrl(p.image_url)} style={{ backgroundColor: colors.surface }} />
            {out && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#000000B3', paddingVertical: 4, alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Out of stock</Text></View>}
          </View>
          {!!p.brand && <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{p.brand}</Text>}
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: 13.5, minHeight: 36 }}>{p.display_name}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{inr(p.price)}</Text>
          {(p.discount_pct > 0 || hasMrp) && (
            <Row style={{ gap: 6, flexWrap: 'nowrap' }}>
              {p.discount_pct > 0 && <Text style={{ color: colors.green, fontSize: 13, fontWeight: '800' }}>{`↓${p.discount_pct}%`}</Text>}
              {hasMrp ? <Muted numberOfLines={1} style={{ textDecorationLine: 'line-through', fontSize: 12.5, flexShrink: 1 }}>{inr(p.mrp)}</Muted> : null}
            </Row>
          )}
          <Muted numberOfLines={1} style={{ fontSize: 11.5 }}>{`/${p.unit} · MOQ ${p.min_order_qty}`}</Muted>
          {low ? <Text style={{ color: colors.warn, fontSize: 12, fontWeight: '700' }}>{`Only ${max} left`}</Text> : null}
        </Pressable>
        {out ? null : <Stepper p={p} qty={qty} max={max} onChange={onQty} />}
      </View>
    </View>
  );
}

/** Product page: swipeable photos, price, description and quantity breaks. */
function DetailSheet({ p, qty, onClose, onQty, onGoCart }: { p: any; qty: number; onClose: () => void; onQty: (p: any, n: number) => void; onGoCart: () => void }) {
  const { width } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  if (!p) return null;
  const max = p.available_qty ?? p.stock_qty; const out = max <= 0;
  const imgs: { id: number; url: string }[] = p.images?.length ? p.images : [{ id: 0, url: '' }];
  const hasMrp = p.mrp && Number(p.mrp) > Number(p.price);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' }}>
        <Pressable style={{ height: 40 }} onPress={onClose} />
        <View style={{ flex: 1, backgroundColor: colors.bg, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' }}>
          <ScrollView>
            <View>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
                {imgs.map((im) => <View key={im.id} style={{ width, padding: 16 }}><ProductImage uri={mediaUrl(im.url || null)} /></View>)}
              </ScrollView>
              {imgs.length > 1 && <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 4 }}>{imgs.map((im, i) => <View key={im.id} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? colors.primary : colors.border }} />)}</View>}
              <Pressable onPress={onClose} hitSlop={10} style={{ position: 'absolute', top: 12, right: 12, backgroundColor: colors.surface, borderRadius: 99, padding: 6 }}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{p.display_name}</Text>
              {!!p.brand && <Muted>{p.brand}</Muted>}
              <Row style={{ gap: 10, flexWrap: 'nowrap' }}>
                {p.discount_pct > 0 && <Text style={{ color: colors.green, fontSize: 18, fontWeight: '800' }}>{`↓${p.discount_pct}%`}</Text>}
                {hasMrp ? <Muted style={{ textDecorationLine: 'line-through', fontSize: 15 }}>{inr(p.mrp)}</Muted> : null}
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{inr(p.price)}</Text>
              </Row>
              <Muted>{`/${p.unit} · ₹${Number(p.base_price).toFixed(2)} + ${p.gst_rate_bps / 100}% GST · MOQ ${p.min_order_qty}`}</Muted>
              {p.price_note ? <Muted style={{ color: colors.green }}>{p.price_note}</Muted> : null}
              {p.tiers?.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 4 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>Buy more, pay less</Text>
                  {p.tiers.map((t: any) => <Muted key={t.min_qty}>{`${t.min_qty}+ at ${inr(t.price)}`}</Muted>)}
                </View>
              )}
              {p.highlights?.length > 0 && <View style={{ gap: 4 }}>{p.highlights.map((h: string) => <Row key={h} style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Text style={{ color: colors.primary }}>•</Text><Body style={{ flex: 1 }}>{h}</Body></Row>)}</View>}
              {!!p.description && <><Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>About this product</Text><Body>{p.description}</Body></>}
              {(() => {
                const rows: [string, string][] = [
                  ...(p.specs ?? []).map((r: any): [string, string] => [r.key, r.value]),
                  ...(p.manufacturer ? [['Manufacturer', p.manufacturer] as [string, string]] : []),
                  ...(p.country_of_origin ? [['Country of origin', p.country_of_origin] as [string, string]] : []),
                  ...(p.weight_g ? [['Weight', `${p.weight_g} g`] as [string, string]] : []),
                  ...(p.length_cm && p.width_cm && p.height_cm ? [['Size (L×W×H)', `${p.length_cm} × ${p.width_cm} × ${p.height_cm} cm`] as [string, string]] : []),
                  ...(p.shelf_life_days ? [['Shelf life', `${p.shelf_life_days} days`] as [string, string]] : []),
                  ...(p.warranty_months ? [['Warranty', `${p.warranty_months} months`] as [string, string]] : []),
                  ...(p.return_days ? [['Returns', `${p.return_days} days`] as [string, string]] : []),
                  ...(p.hsn ? [['HSN', p.hsn] as [string, string]] : []),
                ];
                return rows.length ? (
                  <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4, overflow: 'hidden' }}>
                    <Text style={{ color: colors.text, fontWeight: '700', padding: 12, paddingBottom: 6 }}>Specifications</Text>
                    {rows.map(([k, v]) => <Row key={k} style={{ flexWrap: 'nowrap', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border }}><Muted style={{ width: 120 }}>{k}</Muted><Body style={{ flex: 1 }}>{v}</Body></Row>)}
                  </View>
                ) : null;
              })()}
            </View>
          </ScrollView>
          <View style={{ padding: 12, paddingBottom: 12 + safe.bottom, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
            {out ? <Chip label="Out of stock" tone="danger" /> : qty > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}><Stepper p={p} qty={qty} max={max} onChange={(n) => onQty(p, n)} /></View>
                <Pressable onPress={() => { onClose(); onGoCart(); }} accessibilityRole="button" accessibilityLabel="Go to cart" style={{ flex: 1, backgroundColor: colors.cta, borderRadius: 4, paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.4 }}>GO TO CART</Text></Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => onQty(p, p.min_order_qty)} accessibilityRole="button" accessibilityLabel="Add to cart" style={{ flex: 1, backgroundColor: colors.gold, borderRadius: 4, paddingVertical: 13, alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, letterSpacing: 0.4 }}>ADD TO CART</Text></Pressable>
                <Pressable onPress={() => { onQty(p, p.min_order_qty); onClose(); onGoCart(); }} accessibilityRole="button" accessibilityLabel="Buy now" style={{ flex: 1, backgroundColor: colors.cta, borderRadius: 4, paddingVertical: 13, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.4 }}>BUY NOW</Text></Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
