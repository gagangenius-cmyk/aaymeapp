jest.mock('expo-secure-store', () => ({ getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }));
import fs from 'fs';
import path from 'path';
import { HI_MORE } from '../src/lib/hi-more';

/** Brand and technical names people know in English; they stay as they are in Hindi. */
const KEEP = new Set(['CSV', 'Excel', 'GSTIN', 'HSN', 'IFSC', 'IRN', 'SKU', 'UTR', 'GST %', 'YYYY-MM-DD', 'name@bank', 'company@bank', 'Facebook', 'Instagram', 'WhatsApp', 'YouTube', 'English']);

const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

/** Text the person actually reads, written directly in a screen: titles, labels, headings, hints, empty states, placeholders. */
function staticStrings(): Map<string, string> {
  const out = new Map<string, string>();
  const add = (s: string, file: string) => {
    s = s.trim();
    if (s.length > 1 && s.length < 80 && /[A-Za-z]/.test(s) && !/[{}$<>/]/.test(s)) out.set(s, file);
  };
  const root = path.join(__dirname, '..');
  for (const f of [...walk(path.join(root, 'app')), ...walk(path.join(root, 'src', 'ui'))].filter((f) => f.endsWith('.tsx'))) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\b(?:title|label|text|placeholder)="([^"]+)"/g)) add(m[1], f);
    for (const m of src.matchAll(/<(?:H1|H2|Muted|Body)[^>]*>([^<{}]+)<\/(?:H1|H2|Muted|Body)>/g)) add(m[1], f);
    for (const m of src.matchAll(/(?:title|label): '([^']+)'/g)) add(m[1], f);
  }
  return out;
}

// the first-pass dictionary lives in i18n.tsx (hand-written); read its keys textually so this test needs no native modules
const firstPass = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'i18n.tsx'), 'utf8');
const known = new Set<string>([...Object.keys(HI_MORE), ...[...firstPass.matchAll(/(?:'([^']+)'|\b([A-Za-z]+)): '/g)].map((m) => m[1] ?? m[2])]);

describe('Hindi coverage', () => {
  it('every static screen string has a Hindi translation (or is a name people know in English)', () => {
    const missing = [...staticStrings()].filter(([s]) => !known.has(s) && !KEEP.has(s)).map(([s, f]) => `${s}   (${path.relative(path.join(__dirname, '..'), f)})`);
    expect(missing).toEqual([]);
  });
});
