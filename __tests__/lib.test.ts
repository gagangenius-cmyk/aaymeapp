import { parseCsv } from '../src/lib/csv';
import { lineWithGst, unitFor } from '../src/lib/pricing';
import { routeForNotification } from '../src/lib/notificationRoutes';

describe('parseCsv', () => {
  it('reads a header and rows, normalising header names', () => {
    expect(parseCsv('Name,Min Order Qty\nRice,5\nDal,10')).toEqual([{ name: 'Rice', min_order_qty: '5' }, { name: 'Dal', min_order_qty: '10' }]);
  });
  it('handles quotes, escaped quotes, commas and newlines inside fields', () => {
    const rows = parseCsv('name,description\n"Salt, fine","He said ""hi""\nsecond line"');
    expect(rows).toEqual([{ name: 'Salt, fine', description: 'He said "hi"\nsecond line' }]);
  });
  it('accepts Windows line endings and skips blank lines', () => {
    expect(parseCsv('name,price\r\nA,1\r\n\r\nB,2\r\n')).toEqual([{ name: 'A', price: '1' }, { name: 'B', price: '2' }]);
  });
  it('drops empty cells and returns [] for an empty file', () => {
    expect(parseCsv('name,sku\nA,')).toEqual([{ name: 'A' }]);
    expect(parseCsv('')).toEqual([]);
  });
});

describe('unitFor', () => {
  const p = { price: '100.00', tiers: [{ min_qty: 11, price: '95.00' }, { min_qty: 51, price: '90.00' }] };
  it('uses the base price below the first break', () => expect(unitFor(p, 10)).toBe(100));
  it('uses the best break reached', () => { expect(unitFor(p, 11)).toBe(95); expect(unitFor(p, 50)).toBe(95); expect(unitFor(p, 51)).toBe(90); });
  it('works with no tiers', () => expect(unitFor({ price: 42 }, 1000)).toBe(42));
});

describe('lineWithGst', () => {
  it('adds GST and rounds to paise', () => {
    expect(lineWithGst(100, 3, 1800)).toBe(354);
    expect(lineWithGst(33.33, 3, 500)).toBe(104.99);
  });
});

describe('routeForNotification', () => {
  it('opens the order or ticket named in the notification', () => {
    expect(routeForNotification({ type: 'order', id: 7 })).toBe('/order/7');
    expect(routeForNotification({ type: 'support', id: 3 })).toBe('/support/3');
  });
  it('ignores unknown or incomplete payloads', () => {
    expect(routeForNotification({ type: 'order' })).toBeNull();
    expect(routeForNotification({ type: 'mystery' })).toBeNull();
    expect(routeForNotification(undefined)).toBeNull();
  });
});
