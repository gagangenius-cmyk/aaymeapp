import { useSyncExternalStore } from 'react';

/** The customer's basket. It belongs to one store: adding from another store starts a new basket. Kept in memory for the session. */
export interface CartLine { product_id: number; name: string; price: number; unit: string; image_url?: string | null; qty: number; max: number }
export interface Cart { store_id: number | null; store_name: string; lines: CartLine[] }

let cart: Cart = { store_id: null, store_name: '', lines: [] };
const subs = new Set<() => void>();
const set = (c: Cart) => { cart = c; subs.forEach((f) => f()); };

export const useStoreCart = (): Cart => useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => cart, () => cart);
export const cartCount = (c: Cart) => c.lines.reduce((n, l) => n + l.qty, 0);
export const cartTotal = (c: Cart) => c.lines.reduce((t, l) => t + l.price * l.qty, 0);
export const cartQty = (c: Cart, id: number) => c.lines.find((l) => l.product_id === id)?.qty ?? 0;

/** Sets the quantity of a product (0 removes it). Returns false if the basket holds another store's products. */
export function setCartQty(store: { id: number; name: string }, p: { id: number; name: string; price: number | string; unit: string; image_url?: string | null; stock_qty?: number }, qty: number): boolean {
  if (cart.store_id !== null && cart.store_id !== store.id && cart.lines.length) return false;
  const lines = cart.lines.filter((l) => l.product_id !== p.id);
  const max = p.stock_qty ?? 99;
  if (qty > 0) lines.push({ product_id: p.id, name: p.name, price: Number(p.price), unit: p.unit, image_url: p.image_url ?? null, qty: Math.min(qty, max || 99), max: max || 99 });
  set({ store_id: lines.length ? store.id : null, store_name: lines.length ? store.name : '', lines });
  return true;
}
export const clearCart = () => set({ store_id: null, store_name: '', lines: [] });
