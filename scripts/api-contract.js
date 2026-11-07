// Reverse check: every API call the app makes must exist on the backend with the same HTTP method.
// Usage: node scripts/api-contract.js   (API_SRC=path/to/amapi/src to override). Exits 1 on any mismatch.
const fs = require('fs'), path = require('path');
const FE = path.resolve(__dirname, '..');
const BE = process.env.API_SRC || path.resolve(FE, '../amapi/src');
const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);

// ---- backend routes: file -> router variable -> where app.ts (or a parent router) mounts it ----
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
    const [, v, verb, p] = m;
    if (!(v in mount) || (v === 'router' && !isReports)) continue;
    const expand = p.includes('${path}') ? ['/categories', '/brands'].map((x) => p.replace('/${path}', x)) : [p];
    for (const b of mount[v]) for (const e of expand) routes.push({ verb: verb.toUpperCase(), p: (b + (e === '/' ? '' : e)).replace(/\/$/, '') || '/' });
  }
}
for (const x of ['categories', 'brands']) routes.push({ verb: 'PUT', p: `/admin/${x}/:id` });

// ---- frontend calls ----
const CALL = /\b(api|useGet|useSend|useInfiniteGet)(?:<[^>]*>)?\(/g;

/** The text between a call's own parentheses, so a neighbouring call's options are never mistaken for this one's. */
function argsOf(src, openIdx) {
  let depth = 0, quote = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return src.slice(openIdx + 1, i);
  }
  return src.slice(openIdx + 1, openIdx + 400);
}

const calls = [];
for (const f of [...walk(FE + '/app'), ...walk(FE + '/src')].filter((f) => /\.tsx?$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(CALL)) {
    const args = argsOf(src, m.index + m[0].length - 1);
    // first argument is the path: a literal, or an arrow function returning one
    const lit = args.match(/^\s*(?:\(\w+\)\s*=>\s*)?([`'"])(\/[^`'"]*)\1([\s\S]*)$/);
    if (!lit) continue;
    const p = lit[2].split('?')[0].replace(/\$\{[^}]*\}/g, ':p');
    const rest = lit[3];
    const method = (rest.match(/method:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/) || [])[1];
    const verb = method || (m[1] === 'useGet' ? 'GET' : m[1] === 'useSend' ? 'POST' : /\bbody\b/.test(rest) ? 'POST' : 'GET');
    calls.push({ verb, p, file: path.relative(FE, f) });
  }
}

// a computed segment (":p") can stand for any single segment, static or parameter (accept|decline, categories|brands...)
const same = (route, call) => {
  const rs = route.split('/'), cs = call.split('/');
  return rs.length === cs.length && rs.every((seg, i) => seg.startsWith(':') || cs[i] === ':p' || cs[i] === seg);
};
const bad = [];
for (const c of calls) {
  const hits = routes.filter((r) => same(r.p, c.p));
  if (!hits.length) bad.push({ ...c, why: 'no such route on the backend' });
  else if (!hits.some((r) => r.verb === c.verb)) bad.push({ ...c, why: `route exists but only as ${[...new Set(hits.map((r) => r.verb))].join('/')}` });
}
const uniq = [...new Map(bad.map((b) => [`${b.verb} ${b.p} ${b.file}`, b])).values()];
console.log(`app calls checked: ${calls.length} | mismatches: ${uniq.length}`);
for (const b of uniq) console.log(`  ${b.verb.padEnd(6)} ${b.p}   (${b.file}) -> ${b.why}`);
process.exit(uniq.length ? 1 : 0);
