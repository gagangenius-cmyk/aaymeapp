// Read-only check of the live API: can a retailer see what a distributor lists, and is product review off by default?
// Usage (PowerShell):  $env:ADMIN_PHONE='98xxxxxxxx'; $env:ADMIN_PASSWORD='...'; node scripts/live-check.js
// It only reads (GET) and signs in; it creates and changes nothing.
const API = process.env.API_URL || 'https://amapi-sage.vercel.app';
const phone = process.env.ADMIN_PHONE, password = process.env.ADMIN_PASSWORD;
if (!phone || !password) { console.error('Set ADMIN_PHONE and ADMIN_PASSWORD first.'); process.exit(1); }

const call = async (path, token, init = {}) => {
  const r = await fetch(`${API}/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

(async () => {
  const login = await call('/auth/login', null, { method: 'POST', body: JSON.stringify({ phone, password }) });
  const token = login.body.token || login.body.accessToken || login.body.access_token;
  console.log('login:', login.status, token ? 'ok' : JSON.stringify(login.body).slice(0, 200));
  if (!token) return;

  const pending = await call('/admin/products/review?status=pending&limit=200', token);
  const list = pending.body.items || pending.body.products || pending.body;
  console.log('products still waiting for approval:', Array.isArray(list) ? list.length : `(status ${pending.status})`);

  const ds = await call('/admin/distributors', token);
  const rows = ds.body.items || ds.body.distributors || ds.body;
  if (Array.isArray(rows)) {
    const gated = rows.filter((d) => d.review_required);
    console.log('distributors:', rows.length, '| with approval gate ON:', gated.length, gated.length ? '(migration 026 not applied yet)' : '(OK)');
  } else console.log('distributors: status', ds.status);

  const bi = await call('/catalog/barcode-info?code=8901030865275', token);
  console.log('barcode-info route:', bi.status, bi.body.source ?? '');
})();
