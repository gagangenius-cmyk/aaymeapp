const fs = require('fs'), path = require('path');
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : [];
const FE = path.resolve(__dirname, '..'); const BE = process.env.API_SRC || path.resolve(FE, '../amapi/src');
// ---- mount points (from app.ts and nested routers) ----
const mount = {
  authRouter: ['/auth'], distributorRouter: ['/distributor'], catalogRouter: ['/catalog'], retailerRouter: ['/retailer'], invoiceRouter: [''], orderRouter: ['/orders'],
  accountRouter: ['/me'], reportsRouter: ['/reports'], ledgerRouter: ['/ledger'], paymentWebhookRouter: ['/payments/webhook'], paymentRouter: ['/payments'], mediaRouter: ['/media'],
  subscriptionRouter: ['/subscription'], announcementRouter: ['/announcements'], complianceRouter: ['/compliance'], returnsRouter: ['/returns'], collectionsRouter: ['/collections'],
  chatRouter: ['/chat'], deviceRouter: ['/devices'], adminRouter: ['/admin'], staffRouter: ['/staff'], inventoryRouter: ['/inventory'], pricingRouter: ['/pricing'],
  distributorCommissionRouter: ['/commission'], supportRouter: ['/support'], fieldRouter: ['/field'], deskRouter: ['/support/desk'], staffOnboardingRouter: ['/staff/onboarding'],
  adminOnboardingRouter: ['/admin'], adminCatalogRouter: ['/admin'], adminCommissionRouter: ['/admin'], router: ['/admin', '/staff/team'],
};
const routes = [];
for (const f of walk(BE + '/modules').filter((f) => f.endsWith('.ts'))) {
  const src = fs.readFileSync(f, 'utf8');
  const isReports = /admin\.reports\.routes/.test(f);
  for (const m of src.matchAll(/\b(\w+)\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]*)[`'"]/g)) {
    let [, v, verb, p] = m;
    if (!(v in mount)) continue;
    if (v === 'router' && !isReports) continue;
    const bases = mount[v];
    const expand = p.includes('${path}') ? ['/categories', '/brands'].map((x) => p.replace('/${path}', x)) : [p];
    for (const b of bases) for (const e of expand) routes.push({ verb: verb.toUpperCase(), full: ('/api/v1' + b + (e === '/' ? '' : e)).replace(/\/$/, '') || '/', file: path.relative(BE, f) });
  }
}
// taxonomy routes are declared in a helper with PUT /:id as well
for (const x of ['categories', 'brands']) routes.push({ verb: 'PUT', full: `/api/v1/admin/${x}/:id`, file: 'catalog/admin.catalog.routes.ts' });
const uniq = new Map(routes.map((r) => [r.verb + ' ' + r.full, r])); const be = [...uniq.values()];

// ---- frontend paths ----
const lits = new Set();
for (const f of [...walk(FE + '/app'), ...walk(FE + '/src')].filter((f) => /\.(tsx?|ts)$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/[`'"](\/[A-Za-z0-9_\-\/${}.:]*)[`'"]/g)) {
    let s = m[1];
    if (s.startsWith('/(') || s.startsWith('/console') || s.startsWith('/field') && !s.includes('field/')) {}
    s = s.replace(/\$\{[^}]*\}/g, ':p').split('?')[0];
    if (s === '/admin/:p' || s === '/admin/:p/:p') continue;
    lits.add(s);
  }
  for (const m of src.matchAll(/`\$\{base\}(\/[^`]*)`/g)) for (const b of ['/admin', '/staff/team']) lits.add((b + m[1]).replace(/\$\{[^}]*\}/g, ':p'));
}
// dynamic builders the regex cannot see
for (const x of ['transfers', 'damaged', 'damaged/recover', 'damaged/write-off']) lits.add('/inventory/' + x);
for (const x of ['categories', 'brands']) { lits.add('/admin/' + x); lits.add('/admin/' + x + '/:p'); }
lits.add('/compliance/orders/:p/einvoice'); lits.add('/compliance/orders/:p/einvoice/generate'); lits.add('/compliance/orders/:p/einvoice/irn');
lits.add('/compliance/orders/:p/eway'); lits.add('/compliance/orders/:p/eway/record');
lits.add('/orders/:p/invoice-link');

// confirmed by hand: built from a base variable in the screen code
for (const p of ['assign', 'messages', 'resolve', 'reopen']) lits.add('/support/desk/tickets/:p/' + p);   // app/desk/[id].tsx  (base = /support/desk/tickets/${id})
for (const p of ['/admin/products/:p/versions', '/catalog/:p/versions', '/inventory/warehouses/:p', '/support/tickets/:p/attachments', '/support/tickets/:p/attachments/:p']) lits.add(p); // components with computed paths (ProductHistory base, optional chaining, \${API} prefix)
lits.add('/auth/refresh');                                                                       // src/lib/api.ts (uses ${API}/auth/refresh)
for (const b of ['/admin', '/staff/team']) { lits.add(b + '/reports/:p/download'); lits.add(b + '/reports/catalogue'); }  // app/reports-export.tsx
const feList = [...lits];
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toRe = (p) => new RegExp('^' + p.split('/').map((seg) => (seg.startsWith(':') ? '[^/]+' : esc(seg))).join('/') + '$');
const used = (r) => { const rel = r.full.replace('/api/v1', ''); const re = toRe(rel); return feList.some((l) => re.test(l) || toRe(l).test(rel.replace(/:[A-Za-z_]+/g, ':p'))); };
const missing = be.filter((r) => !used(r));
// intentionally not driven by the app
const SKIP = [/webhook/, /\/media\/:key/, /statement\.csv/, /price-list\.csv/, /\/orders\/:id\/invoice$/, /2fa/, /\/auth\/logout$/];
console.log('backend routes:', be.length, '| used by the app:', be.length - missing.length);
console.log('\n--- not referenced by the app ---');
for (const r of missing.sort((a, b) => a.full.localeCompare(b.full))) console.log((SKIP.some((s) => s.test(r.full)) ? '[by design] ' : '[GAP]       ') + r.verb.padEnd(6) + r.full.replace('/api/v1', ''));
