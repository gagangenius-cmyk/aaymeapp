export interface Tier { min_qty: number; price: string | number }

/** Unit price for a quantity: the best quantity-break the buyer qualifies for. Display only: the server recomputes it at checkout. */
export const unitFor = (p: { price: string | number; tiers?: Tier[] }, qty: number): number => {
  const tier = [...(p.tiers ?? [])].filter((t) => qty >= t.min_qty).sort((a, b) => b.min_qty - a.min_qty)[0];
  return Number(tier ? tier.price : p.price);
};

/** Line total including GST, rounded to paise like the server does. */
export const lineWithGst = (unit: number, qty: number, gstRateBps: number): number => Math.round(unit * qty * (1 + gstRateBps / 10000) * 100) / 100;
