export interface Tier { min_qty: number; price: string | number }

/** Unit price for a quantity: the best quantity-break the buyer qualifies for. Display only: the server recomputes it at checkout. */
export const unitFor = (p: { price: string | number; tiers?: Tier[] }, qty: number): number => {
  const tier = [...(p.tiers ?? [])].filter((t) => qty >= t.min_qty).sort((a, b) => b.min_qty - a.min_qty)[0];
  return Number(tier ? tier.price : p.price);
};

/** Line total including GST, rounded to paise like the server does. */
export const lineWithGst = (unit: number, qty: number, gstRateBps: number): number => { const base = Math.round(unit * qty * 100); return (base + Math.round((base * gstRateBps) / 10000)) / 100; };

/** The rate with GST included, to the paisa. Distributors enter and retailers see this rate; the invoice splits it into price + GST. */
export const inclusive = (base: string | number, gstRateBps: number): number => lineWithGst(Number(base), 1, gstRateBps);
/** The price before GST for a rate that includes it (what is stored on the product). */
export const exclusive = (rate: string | number, gstRateBps: number): number => {
  const target = Math.round(Number(rate) * 100);
  const guess = Math.round(target / (1 + gstRateBps / 10000));
  // pick the price whose GST-added rate is exactly what was typed; when no whole paisa does that, the closest one
  let best = guess;
  for (const c of [guess, guess - 1, guess + 1, guess - 2, guess + 2]) { if (Math.abs(Math.round(inclusive(c / 100, gstRateBps) * 100) - target) < Math.abs(Math.round(inclusive(best / 100, gstRateBps) * 100) - target)) best = c; }
  return best / 100;
};

/** A product as the shop shows it: price, quantity breaks and discount all include GST; `base_price` keeps the amount before GST. */
export const asShopProduct = (p: any) => {
  const price = inclusive(p.price, p.gst_rate_bps);
  const mrp = p.mrp == null ? null : Number(p.mrp);
  return {
    ...p, base_price: p.price, price: price.toFixed(2),
    tiers: (p.tiers ?? []).map((t: any) => ({ ...t, base_price: t.price, price: inclusive(t.price, p.gst_rate_bps).toFixed(2) })),
    discount_pct: mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0,
  };
};

/** Line total for a shop product (as returned by asShopProduct): quantity break chosen on the price before GST, then GST added exactly as the server does. */
export const lineTotal = (p: any, qty: number): number => {
  const tier = [...(p.tiers ?? [])].filter((t: any) => qty >= t.min_qty).sort((a: any, b: any) => b.min_qty - a.min_qty)[0];
  return lineWithGst(Number(tier ? tier.base_price : p.base_price), qty, p.gst_rate_bps);
};
