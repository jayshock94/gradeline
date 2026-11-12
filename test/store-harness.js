// Loaded in a real browser by test/store.mjs: mounts the cloud store against a stand-in database that
// keeps the one rule that matters here (an estimate row needs its bid row) and records every write in order.
import * as R from 'react';
import { createRoot } from 'react-dom/client';
import { GL } from '../src/app/gl.js';
import '../src/app/data.js';
import '../src/app/calc.js';
import '../src/app/core.js';
import { useCloudStore } from '../src/app/store-cloud.js';

function fakeSupabase(db) {
  const ok = data => ({ data, error: null }), fail = message => ({ data: null, error: { message } });
  function run(q) {
    if (q.table === 'libraries') return ok({ data: db.library.data, version: db.library.version });
    if (q.table === 'history') return ok([]);
    if (q.table === 'estimates') {
      if (q.filters.bid_id) { const e = db.estimates[q.filters.bid_id]; return ok(e ? { doc: e.doc, version: e.version } : null); }
      return ok(Object.keys(db.estimates).map(id => ({ bid_id: id, doc: db.estimates[id].doc, version: db.estimates[id].version })));
    }
    if (q.table === 'bids') {
      if (q.op === 'insert') { for (const r of q.rows) { if (db.bids[r.id]) return fail('duplicate key value violates unique constraint "bids_pkey"'); db.bids[r.id] = { data: r.data, version: 1 }; db.log.push('insert bid ' + r.id); } return ok(q.rows.map(r => ({ id: r.id, version: 1 }))); }
      if (q.op === 'update') { const b = db.bids[q.filters.id]; if (!b || b.version !== q.filters.version) return ok([]); b.data = q.values.data; b.version = q.values.version; db.log.push('update bid ' + q.filters.id); return ok([{ version: b.version }]); }
      if (q.op === 'delete') { q.inValues.forEach(id => { delete db.bids[id]; delete db.estimates[id]; db.log.push('delete bid ' + id); }); return ok(null); }
      if (q.filters.id) { const b = db.bids[q.filters.id]; return ok(b ? { data: b.data, version: b.version } : null); }
      return ok(Object.keys(db.bids).map(id => ({ id, data: db.bids[id].data, version: db.bids[id].version })));
    }
    return fail('unexpected table ' + q.table);
  }
  const channel = () => { const ch = { on() { return ch; }, subscribe() { return ch; }, presenceState() { return {}; }, track: async () => {} }; return ch; };
  return {
    from(table) {
      const q = { table, op: 'select', filters: {} };
      const b = { select() { return b; }, insert(rows) { q.op = 'insert'; q.rows = rows; return b; }, update(values) { q.op = 'update'; q.values = values; return b; }, delete() { q.op = 'delete'; return b; },
        eq(k, v) { q.filters[k] = v; return b; }, in(k, v) { q.inValues = v; return b; }, order() { return b; }, limit() { return b; }, single() { return b; }, maybeSingle() { return b; },
        then(res, rej) { return Promise.resolve().then(() => run(q)).then(res, rej); } };
      return b;
    },
    async rpc(fn, a) {
      if (fn !== 'save_scope') return fail('unknown function ' + fn);
      if (a.p_scope === 'library') { if (db.library.version !== a.p_expected) return ok(null); db.library = { data: a.p_doc, version: db.library.version + 1 }; db.log.push('save library'); return ok(db.library.version); }
      const bid = a.p_scope.slice(9), cur = db.estimates[bid];
      if (!db.bids[bid]) return fail('insert or update on table "estimates" violates foreign key constraint');
      if (cur && cur.version !== a.p_expected) return ok(null);
      db.estimates[bid] = { doc: a.p_doc, version: cur ? cur.version + 1 : 1 }; db.log.push('save estimate ' + bid);
      return ok(db.estimates[bid].version);
    },
    channel, removeChannel() {}
  };
}

const seed = GL.seed();
const db = { log: [], library: { data: { ...seed.library, __setup: seed.setup || {} }, version: 1 }, bids: {}, estimates: {} };
seed.bids.forEach(b => { const { id, ...data } = b; db.bids[id] = { data, version: 1 }; });
Object.keys(seed.estimates).forEach(id => { db.estimates[id] = { doc: seed.estimates[id], version: 1 }; });

let store = null;
const sb = fakeSupabase(db); // one client for the life of the page, as in the app
function Probe() { store = useCloudStore({ supabase: sb, orgId: 'o1', user: { id: 'u1' }, name: 'Maya R.' }); return null; }
createRoot(document.getElementById('root')).render(R.createElement(Probe));

const until = async (cond, what) => { for (let i = 0; i < 200; i++) { if (cond()) return; await new Promise(r => setTimeout(r, 10)); } throw new Error('timed out waiting for ' + what); };

window.storeTest = async () => {
  await until(() => store && store.loaded && store.doc, 'the company to load');
  const out = {};
  const srcId = Object.keys(db.estimates)[0];
  // Duplicate: a new bid and its estimate in one change
  db.log.length = 0;
  await store.api.update(doc => {
    doc.bids.push({ id: 'Bcopy', name: 'Copy', owner: 'UDOT', due: '2026-12-01', dueTime: '2:00 PM', status: 'in-progress' });
    doc.estimates.Bcopy = JSON.parse(JSON.stringify(doc.estimates[srcId])); doc.currentBidId = 'Bcopy';
  }, { title: 'Duplicated' });
  out.duplicateLog = db.log.slice();
  out.duplicateError = store.error || null;
  await until(() => store.doc.bids.some(b => b.id === 'Bcopy') || store.error, 'the copy to show');
  out.copyOnScreen = store.doc.bids.some(b => b.id === 'Bcopy') && !!store.doc.estimates.Bcopy;
  out.copyOpen = store.ui.bidId === 'Bcopy';
  // an ordinary edit on the copy still saves (versions line up after the insert)
  db.log.length = 0;
  await store.api.update(doc => { doc.estimates.Bcopy.items[0].qty += 1; }, { title: 'Edited' });
  await store.api.update(doc => { doc.bids.find(b => b.id === 'Bcopy').note = 'hello'; }, { title: 'Edited bid' });
  out.editLog = db.log.slice(); out.editError = store.error || null;
  // Delete: the bid goes, and its estimate with it
  db.log.length = 0;
  await store.api.update(doc => { doc.bids = doc.bids.filter(b => b.id !== 'Bcopy'); delete doc.estimates.Bcopy; }, { title: 'Deleted' });
  await until(() => !store.doc.bids.some(b => b.id === 'Bcopy') || store.error, 'the copy to go');
  out.deleteLog = db.log.slice(); out.deleteError = store.error || null;
  out.goneFromScreen = !store.doc.bids.some(b => b.id === 'Bcopy') && !store.doc.estimates.Bcopy;
  return out;
};
