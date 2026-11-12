// Server-side store for one company, used by the MCP endpoint (api/mcp.js).
// Same rules as the app's cloud store (src/app/store-cloud.js): every write goes through save_scope
// (version check + history row, author stamped by the database) or the bids table, as the signed-in
// user, so roles and row security apply exactly as they do in the browser.
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = x => JSON.parse(JSON.stringify(x));
export const uid = prefix => prefix + Math.random().toString(36).slice(2, 10);
export const nowLabel = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function userClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: 'Bearer ' + token } } });
}

// Who is calling, and which company they belong to. Returns null when the token is bad.
export async function whoami(token) {
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const user = await r.json();
  if (!user || !user.id) return null;
  const sb = userClient(token);
  const [{ data: m }, { data: pr }] = await Promise.all([
    sb.from('memberships').select('org_id,role,created_at,organizations(id,name)').eq('user_id', user.id).order('created_at').limit(1),
    sb.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
  ]);
  const mem = m && m[0];
  const meta = user.user_metadata || {};
  const name = (pr && pr.display_name) || meta.full_name || meta.name || (user.email || '').split('@')[0];
  return { user, name, sb, org: mem && mem.organizations ? { id: mem.organizations.id, name: mem.organizations.name, role: mem.role } : null };
}

// The whole company document, plus the row versions the saves must match.
export async function loadDoc(sb, orgId) {
  const [lib, bids, ests] = await Promise.all([
    sb.from('libraries').select('data,version').eq('org_id', orgId).single(),
    sb.from('bids').select('id,data,version').eq('org_id', orgId),
    sb.from('estimates').select('bid_id,doc,version').eq('org_id', orgId)
  ]);
  if (lib.error) throw lib.error; if (bids.error) throw bids.error; if (ests.error) throw ests.error;
  const snap = { library: { data: lib.data.data, version: lib.data.version }, bids: {}, estimates: {} };
  bids.data.forEach(b => { snap.bids[b.id] = { data: b.data, version: b.version }; });
  ests.data.forEach(e => { snap.estimates[e.bid_id] = { doc: e.doc, version: e.version }; });
  return { doc: buildDoc(snap), snap };
}

export function buildDoc(snap) {
  const bids = Object.keys(snap.bids).map(id => ({ id, ...snap.bids[id].data }));
  const estimates = {}; Object.keys(snap.estimates).forEach(k => { estimates[k] = snap.estimates[k].doc; });
  const lib = snap.library.data || {};
  const library = { labor: lib.labor || [], equipment: lib.equipment || [], materials: lib.materials || [], crews: lib.crews || [], vendors: lib.vendors || [] };
  const setup = lib.__setup || {};
  return { bids, library, estimates, setup, currentBidId: null };
}

class Conflict extends Error { constructor(scope) { super('conflict'); this.scope = scope; } }

// Apply `fn(draft)` to a fresh copy of the company document and save whatever changed.
// `entry` is the history line ({ title, detail, icon }); the database adds who made it.
export async function applyUpdate(sb, orgId, user, fn, entry, attempt = 0) {
  const { doc: base, snap } = await loadDoc(sb, orgId);
  const draft = clone(base);
  const result = fn(draft, base);
  if (result === false) return { changed: false };
  const ent = typeof entry === 'function' ? entry(result) : entry;
  const e = Object.assign({ id: uid('e'), when: nowLabel(), icon: 'smart_toy', via: 'ai' }, ent || { title: 'Edited' });
  try {
    if (!same(draft.library, base.library) || !same(draft.setup, base.setup)) {
      const data = { ...snap.library.data, ...draft.library, __setup: draft.setup };
      const v = await saveScope(sb, orgId, 'library', data, e, snap.library.version);
      if (v == null) throw new Conflict('library');
    }
    const next = {}; draft.bids.forEach(b => { const { id, ...data } = b; next[id] = data; });
    const was = {}; base.bids.forEach(b => { const { id, ...data } = b; was[id] = data; });
    const inserts = Object.keys(next).filter(id => !was[id]);
    const updates = Object.keys(next).filter(id => was[id] && !same(was[id], next[id]));
    const deletes = Object.keys(was).filter(id => !next[id]);
    // new bids first: an estimate row points at its bid
    if (inserts.length) { const { error } = await sb.from('bids').insert(inserts.map(id => ({ org_id: orgId, id, data: next[id], updated_by: user.id }))); if (error) throw error; }
    for (const id of Object.keys(draft.estimates)) {
      if (same(draft.estimates[id], base.estimates[id])) continue;
      const cur = snap.estimates[id];
      const v = await saveScope(sb, orgId, 'estimate:' + id, draft.estimates[id], e, cur ? cur.version : 0);
      if (v == null) throw new Conflict('estimate:' + id);
    }
    for (const id of updates) {
      const expected = snap.bids[id].version;
      const { data, error } = await sb.from('bids').update({ data: next[id], version: expected + 1, updated_by: user.id }).eq('org_id', orgId).eq('id', id).eq('version', expected).select('version');
      if (error) throw error;
      if (!data || !data.length) throw new Conflict('bid:' + id);
    }
    if (deletes.length) { const { error } = await sb.from('bids').delete().eq('org_id', orgId).in('id', deletes); if (error) throw error; }
  } catch (err) {
    if (err instanceof Conflict && attempt === 0) return applyUpdate(sb, orgId, user, fn, entry, 1);
    if (err instanceof Conflict) throw new Error('Someone else saved this at the same moment. Nothing was changed; try again.');
    throw err;
  }
  return { changed: true, result, draft };
}

async function saveScope(sb, orgId, scope, docPart, entry, expected) {
  const { data, error } = await sb.rpc('save_scope', { p_org: orgId, p_scope: scope, p_expected: expected, p_doc: docPart, p_entry: entry });
  if (error) {
    if (/not allowed|permission denied|row-level security/i.test(error.message)) throw new Error('This account can view the company but not change it. Ask an owner to make you an estimator.');
    throw error;
  }
  return data;
}
