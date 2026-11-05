// Cloud store: the company's bids, estimates and cost library live in Supabase.
// Same shape as the demo store (doc, ui, stack, index, api), so every screen works unchanged.
//  - One update at a time: updates queue, and each starts from the last committed server state.
//  - Saves are version-checked on the server (save_scope / bids.version). A clash refetches that row and
//    re-applies the change once; a second clash surfaces an error instead of saving over someone.
//  - Every save writes a history row with a snapshot. Undo/redo/jump restore a snapshot as a NEW version
//    (nothing is ever destroyed); a cursor tracks which snapshot is live so repeated undo walks back.
//    Undo only steps back over your own latest change: if someone else saved after you, it stops and says so.
//  - An edit is tied to the bid that was open when it was made, even if it waits in the queue.
//  - Realtime: other people's saves arrive over postgres_changes; presence says who else has the estimate open.
import * as R from 'react';
import { GL } from './gl.js';
import { DEFAULT_UI, clone, nowLabel } from './store-local.js';

const HISTORY_LIMIT = 80;

function uiKey(orgId) { return 'gradeline.ui.' + orgId; }
function loadUi(orgId) { try { const raw = localStorage.getItem(uiKey(orgId)); return raw ? { ...DEFAULT_UI, ...JSON.parse(raw) } : { ...DEFAULT_UI }; } catch (e) { return { ...DEFAULT_UI }; } }
function saveUi(orgId, ui) { try { localStorage.setItem(uiKey(orgId), JSON.stringify(ui)); } catch (e) { /* ignore */ } }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function scopeFor(ui, doc) {
  if (ui.screen === 'library') return 'library';
  if (ui.screen === 'estimate') { const b = ui.bidId || doc.currentBidId; return b ? 'estimate:' + b : null; }
  return null;
}

// The document the screens see, built from the committed server rows (plus the versions they carried).
function buildDoc(c, ui) {
  if (!c.loaded || !c.library) return null;
  const bids = Object.keys(c.bids).map(id => ({ id, ...c.bids[id].data }));
  const estimates = {}; Object.keys(c.estimates).forEach(k => { estimates[k] = c.estimates[k].doc; });
  const lib = c.library.data || {};
  const library = { labor: lib.labor || [], equipment: lib.equipment || [], materials: lib.materials || [], crews: lib.crews || [], vendors: lib.vendors || [] };
  const setup = lib.__setup || { rates: library.labor.length > 0, crews: library.crews.length > 0, vendors: library.vendors.length > 0, accounting: false, firstBid: bids.length > 0 };
  const currentBidId = ui.bidId && c.bids[ui.bidId] ? ui.bidId : (bids[0] ? bids[0].id : null);
  return { bids, library, estimates, currentBidId, setup };
}

function cursorFromRows(rows) {
  const last = rows[rows.length - 1];
  if (last && last.entry && last.entry.restoreOf != null) { const i = rows.findIndex(r => r.version === last.entry.restoreOf); if (i >= 0) return i; }
  return rows.length - 1;
}
const isRestore = r => !!(r.entry && r.entry.restoreOf != null);

export function useCloudStore({ supabase, orgId, user, name, initialUi }) {
  // committed = the latest server state we know (rows + versions). The ref is updated synchronously with the state.
  const committed = R.useRef({ loaded: false, error: null, library: null, bids: {}, estimates: {} });
  const [state, setStateRaw] = R.useState(committed.current);
  const commit = R.useCallback(fn => { const next = typeof fn === 'function' ? fn(committed.current) : fn; committed.current = next; setStateRaw(next); }, []);
  const [ui, setUiState] = R.useState(() => ({ ...loadUi(orgId), ...(initialUi || {}) }));
  const uiRef = R.useRef(ui); uiRef.current = ui;
  const [hist, setHist] = R.useState({ scope: null, rows: [], cursor: -1, loading: false });
  const histRef = R.useRef(hist); histRef.current = hist;
  const [peers, setPeers] = R.useState([]);
  const [notice, setNotice] = R.useState(null);
  const queue = R.useRef(Promise.resolve());

  R.useEffect(() => { saveUi(orgId, ui); }, [orgId, ui]);

  // ---------- loading ----------
  async function fetchEstimate(bidId) {
    const { data, error } = await supabase.from('estimates').select('doc,version').eq('org_id', orgId).eq('bid_id', bidId).maybeSingle();
    if (error) throw error;
    commit(c => { const estimates = { ...c.estimates }; if (data) estimates[bidId] = { doc: data.doc, version: data.version }; else delete estimates[bidId]; return { ...c, estimates }; });
  }
  async function fetchLibrary() {
    const { data, error } = await supabase.from('libraries').select('data,version').eq('org_id', orgId).single();
    if (error) throw error;
    commit(c => ({ ...c, library: { data: data.data, version: data.version } }));
  }
  async function fetchBid(id) {
    const { data, error } = await supabase.from('bids').select('data,version').eq('org_id', orgId).eq('id', id).maybeSingle();
    if (error) throw error;
    commit(c => { const bids = { ...c.bids }; if (data) bids[id] = { data: data.data, version: data.version }; else delete bids[id]; return { ...c, bids }; });
  }
  R.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [lib, bids, ests] = await Promise.all([
          supabase.from('libraries').select('data,version').eq('org_id', orgId).single(),
          supabase.from('bids').select('id,data,version').eq('org_id', orgId),
          supabase.from('estimates').select('bid_id,doc,version').eq('org_id', orgId)
        ]);
        if (lib.error) throw lib.error; if (bids.error) throw bids.error; if (ests.error) throw ests.error;
        if (!alive) return;
        const bmap = {}; bids.data.forEach(b => { bmap[b.id] = { data: b.data, version: b.version }; });
        const emap = {}; ests.data.forEach(e => { emap[e.bid_id] = { doc: e.doc, version: e.version }; });
        commit({ loaded: true, error: null, library: { data: lib.data.data, version: lib.data.version }, bids: bmap, estimates: emap });
      } catch (e) { if (alive) commit(c => ({ ...c, loaded: true, error: e.message || String(e) })); }
    })();
    return () => { alive = false; };
  }, [supabase, orgId]);

  // ---------- live updates from other people ----------
  R.useEffect(() => {
    const ch = supabase.channel('org:' + orgId + ':changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estimates', filter: 'org_id=eq.' + orgId }, payload => {
        if (payload.eventType === 'DELETE') { const old = payload.old || {}; if (old.org_id !== orgId || !old.bid_id) return; commit(c => { const n = { ...c.estimates }; delete n[old.bid_id]; return { ...c, estimates: n }; }); return; }
        const row = payload.new;
        if (!row || !row.bid_id || (payload.errors && payload.errors.length)) { const id = row && row.bid_id; if (id) fetchEstimate(id).catch(() => {}); return; }
        commit(c => { const cur = c.estimates[row.bid_id]; if (cur && cur.version >= row.version) return c; return { ...c, estimates: { ...c.estimates, [row.bid_id]: { doc: row.doc, version: row.version } } }; });
        refreshHistoryIfCurrent('estimate:' + row.bid_id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: 'org_id=eq.' + orgId }, payload => {
        if (payload.eventType === 'DELETE') { const old = payload.old || {}; if (old.org_id !== orgId || !old.id) return; commit(c => { const n = { ...c.bids }; delete n[old.id]; const e = { ...c.estimates }; delete e[old.id]; return { ...c, bids: n, estimates: e }; }); return; }
        const row = payload.new;
        if (!row || !row.id || (payload.errors && payload.errors.length)) { const id = row && row.id; if (id) fetchBid(id).catch(() => {}); return; }
        commit(c => { const cur = c.bids[row.id]; if (cur && cur.version >= row.version) return c; return { ...c, bids: { ...c.bids, [row.id]: { data: row.data, version: row.version } } }; });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'libraries', filter: 'org_id=eq.' + orgId }, payload => {
        const row = payload.new;
        if (!row || (payload.errors && payload.errors.length)) { fetchLibrary().catch(() => {}); return; }
        commit(c => (c.library && c.library.version >= row.version) ? c : { ...c, library: { data: row.data, version: row.version } });
        refreshHistoryIfCurrent('library');
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setNotice('Live updates are off right now. Your saves still work; reload to see what others changed.');
        if (status === 'SUBSCRIBED') setNotice(n => n && n.startsWith('Live updates are off') ? null : n);
      });
    return () => { supabase.removeChannel(ch); };
  }, [supabase, orgId]);

  // ---------- presence on the open estimate ----------
  const bidId = ui.bidId;
  R.useEffect(() => {
    if (!bidId || ui.screen !== 'estimate') { setPeers([]); return; }
    const ch = supabase.channel('org:' + orgId + ':bid:' + bidId, { config: { presence: { key: user.id } } });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState();
      const others = Object.keys(st).filter(k => k !== user.id).map(k => st[k][0]).filter(Boolean);
      setPeers(others.map(o => ({ name: o.name, initials: o.initials })));
    }).subscribe(async status => { if (status === 'SUBSCRIBED') await ch.track({ name, initials: GL.initials(name), user_id: user.id, at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [supabase, orgId, bidId, ui.screen, user.id, name]);

  // ---------- the document the screens see ----------
  const doc = R.useMemo(() => { const d = buildDoc(state, ui); return d ? { ...d, insights: GL.insightsFrom(d.bids, d.estimates, d.library) } : null; }, [state, ui.bidId]);

  // ---------- history for the scope on screen ----------
  const scope = doc ? scopeFor(ui, doc) : null;
  async function fetchHistory(sc) {
    const { data, error } = await supabase.from('history').select('version,entry,user_id,created_at').eq('org_id', orgId).eq('scope', sc).order('version', { ascending: false }).limit(HISTORY_LIMIT);
    if (error) { setNotice('Could not load the history: ' + error.message); return null; }
    return data.reverse();
  }
  function refreshHistoryIfCurrent(sc) { if (histRef.current.scope === sc) fetchHistory(sc).then(rows => { if (rows) setHist(h => h.scope === sc ? { ...h, rows, cursor: cursorFromRows(rows) } : h); }); }
  R.useEffect(() => {
    if (!scope) { setHist({ scope: null, rows: [], cursor: -1, loading: false }); return; }
    let alive = true;
    setHist({ scope, rows: [], cursor: -1, loading: true });
    fetchHistory(scope).then(rows => { if (alive && rows) setHist(h => h.scope === scope ? { ...h, rows, cursor: cursorFromRows(rows), loading: false } : h); });
    return () => { alive = false; };
  }, [scope, orgId]);
  function pushHistory(sc, row) {
    setHist(h => {
      if (h.scope !== sc) return h;
      const rows = h.rows.concat([row]).slice(-HISTORY_LIMIT);
      const cursor = row.entry.restoreOf != null ? Math.max(0, rows.findIndex(r => r.version === row.entry.restoreOf)) : rows.length - 1;
      return { ...h, rows, cursor: cursor >= 0 ? cursor : rows.length - 1 };
    });
  }

  // ---------- saving ----------
  function entryWith(entry) { return Object.assign({ id: GL.uid('e'), who: name || 'You', when: nowLabel(), icon: 'edit' }, entry || { title: 'Edited' }); }
  async function saveScope(sc, docPart, entry, expected) {
    const { data, error } = await supabase.rpc('save_scope', { p_org: orgId, p_scope: sc, p_expected: expected, p_doc: docPart, p_entry: entry });
    if (error) throw error;
    return data; // new version, or null when someone else saved first
  }
  function friendly(err) {
    const m = (err && err.message) || String(err);
    if (/not allowed|permission denied|row-level security/i.test(m)) return 'You can view this company but not change it. Ask an owner to make you an estimator.';
    if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Could not reach the server, so that change may not have saved. Showing the latest saved version.';
    return m;
  }
  class Conflict extends Error { constructor(scope) { super('conflict'); this.scope = scope; } }

  async function runUpdate(fn, entry, attempt, ui0) {
    const snap = committed.current;
    const base = buildDoc(snap, ui0);
    if (!base) return;
    const draft = clone(base);
    if (fn(draft) === false) return;
    const e = entryWith(entry);
    try {
      // library (rates, crews, vendors) and the setup checklist live in one row
      if (!same(draft.library, base.library) || !same(draft.setup, base.setup)) {
        const data = { ...snap.library.data, ...draft.library, __setup: draft.setup };
        const v = await saveScope('library', data, e, snap.library.version);
        if (v == null) throw new Conflict('library');
        commit(c => ({ ...c, library: { data, version: v } }));
        pushHistory('library', { version: v, entry: e, user_id: user.id });
      }
      // estimates: one row per bid
      for (const id of Object.keys(draft.estimates)) {
        if (same(draft.estimates[id], base.estimates[id])) continue;
        const cur = snap.estimates[id];
        const v = await saveScope('estimate:' + id, draft.estimates[id], e, cur ? cur.version : 0);
        if (v == null) throw new Conflict('estimate:' + id);
        const docPart = draft.estimates[id];
        commit(c => ({ ...c, estimates: { ...c.estimates, [id]: { doc: docPart, version: v } } }));
        pushHistory('estimate:' + id, { version: v, entry: e, user_id: user.id });
      }
      // bids: insert / update / delete against the base we started from
      if (!same(draft.bids, base.bids)) {
        const next = {}; draft.bids.forEach(b => { const { id, ...data } = b; next[id] = data; });
        const was = {}; base.bids.forEach(b => { const { id, ...data } = b; was[id] = data; });
        const inserts = Object.keys(next).filter(id => !was[id]);
        const updates = Object.keys(next).filter(id => was[id] && !same(was[id], next[id]));
        const deletes = Object.keys(was).filter(id => !next[id]);
        const versions = {};
        if (inserts.length) {
          const { data, error } = await supabase.from('bids').insert(inserts.map(id => ({ org_id: orgId, id, data: next[id], updated_by: user.id }))).select('id,version');
          if (error) throw error; (data || []).forEach(r => { versions[r.id] = r.version; });
        }
        for (const id of updates) {
          const expected = snap.bids[id] ? snap.bids[id].version : -1;
          const { data, error } = await supabase.from('bids').update({ data: next[id], version: expected + 1, updated_by: user.id }).eq('org_id', orgId).eq('id', id).eq('version', expected).select('version');
          if (error) throw error;
          if (!data || !data.length) throw new Conflict('bid:' + id);
          versions[id] = data[0].version;
        }
        if (deletes.length) { const { error } = await supabase.from('bids').delete().eq('org_id', orgId).in('id', deletes); if (error) throw error; }
        commit(c => {
          const bids = { ...c.bids }; const estimates = { ...c.estimates };
          inserts.concat(updates).forEach(id => { bids[id] = { data: next[id], version: versions[id] != null ? versions[id] : ((bids[id] ? bids[id].version : 0) + 1) }; });
          deletes.forEach(id => { delete bids[id]; delete estimates[id]; });
          return { ...c, bids, estimates };
        });
      }
      if (draft.currentBidId !== base.currentBidId) setUiState(u => ({ ...u, bidId: draft.currentBidId }));
    } catch (err) {
      if (err instanceof Conflict) {
        if (attempt === 0) {
          // someone saved first: take their row, then apply this change on top of it, once
          if (err.scope === 'library') await fetchLibrary(); else if (err.scope.startsWith('estimate:')) await fetchEstimate(err.scope.slice(9)); else await fetchBid(err.scope.slice(4));
          return runUpdate(fn, entry, 1, ui0);
        }
        throw new Error('Someone else saved this at the same moment. Your last change did not go through; try it again.');
      }
      throw err;
    }
  }

  const api = R.useMemo(() => {
    const resync = async () => { try { await Promise.all([fetchLibrary()].concat(uiRef.current.bidId ? [fetchEstimate(uiRef.current.bidId), fetchBid(uiRef.current.bidId)] : [])); } catch (e) { /* keep what we have */ } };
    const enqueue = job => { const p = queue.current.then(job).catch(err => { setNotice(friendly(err)); return resync(); }); queue.current = p; return p; };
    const update = (fn, entry) => { const ui0 = { ...uiRef.current }; return enqueue(() => runUpdate(fn, entry, 0, ui0)); };
    const committedVersion = sc => sc === 'library' ? (committed.current.library && committed.current.library.version) : ((committed.current.estimates[sc.slice(9)] || {}).version);
    // a restore only goes ahead if the history we are looking at is the latest; otherwise refresh it and stop
    async function current(h) {
      const last = h.rows[h.rows.length - 1];
      if (last && last.version === committedVersion(h.scope)) return true;
      const rows = await fetchHistory(h.scope);
      if (rows) setHist(x => x.scope === h.scope ? { ...x, rows, cursor: cursorFromRows(rows) } : x);
      throw new Error('Someone just changed this. The history is up to date now; check it, then try again.');
    }
    async function restore(row, title) {
      const h = histRef.current; if (!h.scope || !row) return;
      await current(h);
      const { data: snapRow, error } = await supabase.from('history').select('snapshot').eq('org_id', orgId).eq('scope', h.scope).eq('version', row.version).single();
      if (error) throw error;
      const snapshot = snapRow.snapshot;
      const e = entryWith({ title, detail: row.entry && row.entry.title ? 'back to: ' + row.entry.title : '', icon: 'history', restoreOf: row.version });
      const v = await saveScope(h.scope, snapshot, e, committedVersion(h.scope) || 0);
      if (v == null) throw new Error('Someone saved at the same moment. Nothing was changed; check the history and try again.');
      if (h.scope === 'library') commit(c => ({ ...c, library: { data: snapshot, version: v } }));
      else { const id = h.scope.slice(9); commit(c => ({ ...c, estimates: { ...c.estimates, [id]: { doc: snapshot, version: v } } })); }
      pushHistory(h.scope, { version: v, entry: e, user_id: user.id });
    }
    const prevStep = h => { for (let i = h.cursor - 1; i >= 0; i--) if (!isRestore(h.rows[i])) return i; return -1; };
    const nextStep = h => { for (let i = h.cursor + 1; i < h.rows.length; i++) if (!isRestore(h.rows[i])) return i; return -1; };
    return {
      update,
      undo: () => enqueue(() => {
        const h = histRef.current; const i = prevStep(h); if (i < 0) return;
        const live = h.rows[h.cursor];
        if (live && live.user_id && live.user_id !== user.id && !isRestore(live)) throw new Error((live.entry && live.entry.who ? live.entry.who : 'Someone else') + ' made the last change, so undo would erase their work. Open History to go back to an earlier version.');
        return restore(h.rows[i], 'Undid ' + ((live && live.entry.title) || 'a change').toLowerCase());
      }),
      redo: () => enqueue(() => { const h = histRef.current; const i = nextStep(h); if (i < 0) return; return restore(h.rows[i], 'Redid ' + (h.rows[i].entry.title || 'a change').toLowerCase()); }),
      jump: visibleIndex => enqueue(() => { const h = histRef.current; const visible = h.rows.filter(r => !isRestore(r)); const row = visible[visibleIndex]; if (!row || h.rows.indexOf(row) === h.cursor) return; return restore(row, 'Went back to an earlier version'); }),
      ui: patch => setUiState(u => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })),
      reset: null,
      clearError: () => setNotice(null)
    };
  }, [orgId, user.id, name]);

  const visible = hist.rows.filter(r => !isRestore(r));
  const liveRow = hist.rows[hist.cursor];
  const index = Math.max(0, visible.indexOf(liveRow));
  const stack = visible.map(r => ({ doc: null, entry: { ...r.entry, id: r.version } }));
  const canUndo = hist.rows.slice(0, hist.cursor).some(r => !isRestore(r));
  const canRedo = hist.rows.slice(hist.cursor + 1).some(r => !isRestore(r));
  return { doc, ui, stack, index, canUndo, canRedo, api, mode: 'cloud', loaded: state.loaded, error: state.error || notice, peers, historyLoading: hist.loading };
}
