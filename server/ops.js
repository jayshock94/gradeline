// The operations an AI assistant can run on a company's bids, through the MCP endpoint.
// Each op mirrors a dialog in the app and produces the same history entry, so an AI change looks and
// undoes like a person's change. Reads use the same engine (GL.derive) the screens use.
import { GL } from '../src/app/gl.js';
import '../src/app/calc.js';
import { uid } from './store.js';

const money = (v, d) => GL.fmtMoney(v, d);
const r2 = v => Math.round(v * 100) / 100;
const norm = s => String(s == null ? '' : s).trim().toLowerCase();

export function bidDefaults(doc) { return Object.assign({ overhead: 6, profit: 4, bond: 1.2, tax: 0, targetMargin: 9, dueTime: '2:00 PM' }, doc.setup && doc.setup.bidDefaults); }

// ---------- finding things by id or by name ----------
export function findBid(doc, ref) {
  if (!ref) throw new Error('Say which bid: its id or part of its name.');
  const q = norm(ref);
  let hits = doc.bids.filter(b => b.id === ref);
  if (!hits.length) hits = doc.bids.filter(b => norm(b.name) === q);
  if (!hits.length) hits = doc.bids.filter(b => norm(b.name).includes(q));
  if (!hits.length) throw new Error('No bid matches "' + ref + '". Use list_bids to see them.');
  if (hits.length > 1) throw new Error('"' + ref + '" matches ' + hits.length + ' bids: ' + hits.map(b => b.name).join('; ') + '. Use the id.');
  return hits[0];
}
export function findItem(est, ref) {
  const q = norm(ref);
  let hits = est.items.filter(i => i.id === ref || norm(i.code) === q);
  if (!hits.length) hits = est.items.filter(i => norm(i.name) === q);
  if (!hits.length) hits = est.items.filter(i => norm(i.name).includes(q));
  if (!hits.length) throw new Error('No pay item matches "' + ref + '".');
  if (hits.length > 1) throw new Error('"' + ref + '" matches ' + hits.length + ' pay items; use the item code.');
  return hits[0];
}
export function findPackage(est, ref) {
  const q = norm(ref);
  let hits = est.packages.filter(p => p.id === ref || norm(p.name) === q);
  if (!hits.length) hits = est.packages.filter(p => norm(p.name).includes(q));
  if (!hits.length) throw new Error('No quote package matches "' + ref + '". Packages: ' + (est.packages.map(p => p.name).join('; ') || 'none yet'));
  if (hits.length > 1) throw new Error('"' + ref + '" matches ' + hits.length + ' packages; use the id.');
  return hits[0];
}
function findVendor(lib, name) { const q = norm(name); return lib.vendors.find(v => norm(v.name) === q) || lib.vendors.find(v => norm(v.name).includes(q) && q.length >= 4) || null; }
function estimateOf(doc, bid) {
  if (!doc.estimates[bid.id]) throw new Error('"' + bid.name + '" has no estimate yet. Add pay items first (add_pay_items).');
  return doc.estimates[bid.id];
}
function needs(v, what) { if (v == null || v === '' || (typeof v === 'number' && isNaN(v))) throw new Error(what + ' is required.'); return v; }
function num(v, what) { const n = Number(v); if (v == null || v === '' || isNaN(n)) throw new Error(what + ' must be a number.'); return n; }

// ---------- reads ----------
export function listBids(doc) {
  return doc.bids.map(b => {
    const d = doc.estimates[b.id] ? GL.derive(doc, b.id) : null;
    return { id: b.id, name: b.name, owner: b.owner, location: b.location || '', type: b.type, status: b.status, due: b.due, due_time: b.dueTime, estimator: b.estimator || '',
      bid_total: d ? r2(d.totals.bidTotal) : (b.total || null), has_estimate: !!d, checks_failing: d ? d.errors : null };
  });
}

export function bidSummary(doc, ref) {
  const bid = findBid(doc, ref);
  if (!doc.estimates[bid.id]) return { bid: { id: bid.id, name: bid.name, owner: bid.owner, status: bid.status, due: bid.due, due_time: bid.dueTime }, estimate: null, note: 'No estimate yet. Use add_pay_items to start one.' };
  const d = GL.derive(doc, bid.id);
  return {
    bid: { id: bid.id, name: bid.name, owner: bid.owner, location: bid.location || '', type: bid.type, status: bid.status, due: bid.due, due_time: bid.dueTime, estimator: bid.estimator || '' },
    totals: { direct_cost: r2(d.totals.direct), bid_total: r2(d.totals.bidTotal), margin_pct: r2(d.totals.margin), labor: r2(d.totals.labor), equipment: r2(d.totals.equipment), material: r2(d.totals.material), subcontract: r2(d.totals.sub), locked_prices: d.totals.lockedCount },
    markup: Object.assign({}, d.est.markup, { target_margin: d.est.targetMargin }),
    items: d.items.map(it => ({ id: it.id, code: it.code, name: it.name, qty: it.qty, unit: it.unit, unit_cost: r2(it.direct / (it.qty || 1)), unit_price: r2(it.unitPrice), amount: r2(it.ext), locked: !!it.locked,
      tasks: it.tasks.map(t => ({ name: t.name, type: t.type, total: r2(t.total) })), problems: it.problems.map(p => p.msg) })),
    packages: d.packages.map(p => ({ id: p.id, name: p.name, items: p.lines.map(l => l.item ? l.item.code : l.itemId), plug_total: r2(p.plugTotal),
      using: p.selfSelected ? 'self-perform' : p.selected ? (p.selected.vendor ? p.selected.vendor.name : 'a quote') : 'plug',
      quotes: p.quotes.map(q => ({ vendor: q.vendor ? q.vendor.name : 'unknown', status: q.status, total: q.total == null ? null : r2(q.total), lump_sum: q.lump != null, note: q.note || '', quantity_differs: q.qtyIssue ? (q.qtyIssue.itemId + ': quoted ' + q.qtyIssue.quoted + ', bid has ' + q.qtyIssue.bid) : null })) })),
    checks: d.checks.map(c => ({ severity: c.sev, title: c.title, detail: c.detail }))
  };
}

export function librarySummary(doc) {
  const lib = doc.library;
  return {
    crews: lib.crews.map(c => { const r = GL.crewRate(c, lib); return { id: c.id, name: c.name, people: r.people, hours_per_day: r.hours, cost_per_day: r2(r.perDay) }; }),
    labor: lib.labor.map(l => ({ id: l.id, name: l.name, rate_per_hour: r2(GL.laborRate(l)) })),
    equipment: lib.equipment.map(e => ({ id: e.id, name: e.name, rate_per_hour: r2(GL.equipRate(e)) })),
    materials: lib.materials.map(m => ({ id: m.id, name: m.name, unit: m.unit, cost: m.cost })),
    vendors: lib.vendors.map(v => ({ id: v.id, name: v.name, trade: v.trade || '', kind: v.kind || 'sub', contact: v.contact || '', phone: v.phone || '', email: v.email || '' }))
  };
}

// ---------- writes: each returns { entry, say } and mutates the draft ----------
export function createBid(draft, a, who) {
  const name = needs(a.name, 'name'), owner = needs(a.owner, 'owner');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.due || '')) throw new Error('due must be a date like 2026-11-20.');
  const id = uid('B');
  const dd = bidDefaults(draft);
  draft.bids.push({ id, name: String(name).trim(), owner: String(owner).trim(), type: a.type === 'private' ? 'private' : 'public', due: a.due, dueTime: a.due_time || dd.dueTime, estimator: a.estimator || who || '', status: 'draft', location: a.location || '', note: a.note || '' });
  return { entry: { title: 'Created bid ' + name, detail: 'due ' + GL.fmtDate(a.due), icon: 'post_add' }, say: 'Created bid "' + name + '" (id ' + id + '), due ' + a.due + ' at ' + (a.due_time || dd.dueTime) + '. It has no pay items yet.', id };
}

export function addPayItems(draft, a) {
  const bid = findBid(draft, a.bid);
  const items = Array.isArray(a.items) ? a.items : [];
  if (!items.length) throw new Error('items must be a list of { code, name, qty, unit }.');
  let started = false;
  if (!draft.estimates[bid.id]) { draft.estimates[bid.id] = GL.blankEstimate(bidDefaults(draft)); if (bid.status === 'draft') bid.status = 'in-progress'; started = true; }
  const est = draft.estimates[bid.id];
  const added = [];
  items.forEach(it => {
    const name = needs(it.name, 'item name'), qty = num(it.qty, 'qty for ' + name);
    const rec = { id: uid('I'), code: String(it.code || '').trim(), name: String(name).trim(), unit: String(it.unit || 'EA').trim().toUpperCase(), qty };
    est.items.push(rec); added.push(rec);
  });
  return { entry: { title: (started ? 'Started estimate with ' : 'Added ') + added.length + ' pay item' + (added.length === 1 ? '' : 's'), detail: added.map(i => i.code || i.name).slice(0, 6).join(', '), icon: 'content_paste' },
    say: 'Added ' + added.length + ' pay item' + (added.length === 1 ? '' : 's') + ' to "' + bid.name + '". Each needs at least one task (crew, material, sub or other) before it has a price.' };
}

export function setQuantity(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), it = findItem(est, a.item), qty = num(a.qty, 'qty');
  const was = it.qty; it.qty = qty;
  return { entry: { title: 'Changed quantity on ' + (it.code || it.name), detail: GL.fmtNum(was) + ' → ' + GL.fmtNum(qty) + ' ' + it.unit, icon: 'edit' }, say: 'Set ' + (it.code || it.name) + ' to ' + GL.fmtNum(qty) + ' ' + it.unit + ' (was ' + GL.fmtNum(was) + ').' };
}

export function createPackage(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid);
  const name = needs(a.name, 'name');
  const itemRefs = Array.isArray(a.items) ? a.items : [];
  if (!itemRefs.length) throw new Error('items must list the pay items (codes) the sub or supplier will price.');
  const itemIds = itemRefs.map(r => findItem(est, r).id);
  const pid = uid('P');
  const vendorIds = (Array.isArray(a.vendors) ? a.vendors : []).map(vn => { let v = findVendor(draft.library, vn); if (!v) { v = { id: uid('V'), name: String(vn).trim(), trade: name, kind: 'sub', contact: '', email: '', phone: '' }; draft.library.vendors.push(v); } return v.id; });
  est.packages.push({ id: pid, name: String(name).trim(), lines: itemIds.map(id => ({ itemId: id })), sentAt: new Date().toISOString().slice(0, 10), quotes: vendorIds.map(vid => ({ id: uid('Q'), vendorId: vid, status: 'pending' })), selectedQuoteId: null });
  itemIds.forEach(iid => { if (!est.tasks.some(t => t.itemId === iid && t.type === 'sub')) est.tasks.push({ id: uid('T'), itemId: iid, name: String(name).trim() + ' (sub)', type: 'sub', packageId: pid, plug: null }); else est.tasks.forEach(t => { if (t.itemId === iid && t.type === 'sub' && !t.packageId) t.packageId = pid; }); });
  return { entry: { title: 'Added quote package ' + name, detail: itemIds.length + ' pay item' + (itemIds.length === 1 ? '' : 's') + (vendorIds.length ? ', expecting ' + vendorIds.length + ' quote' + (vendorIds.length === 1 ? '' : 's') : ''), icon: 'request_quote' },
    say: 'Added package "' + name + '" (id ' + pid + ') with ' + itemIds.length + ' pay items' + (vendorIds.length ? ', waiting on ' + vendorIds.length + ' quotes' : '') + '. Set a plug on each item until quotes come in.' };
}

export function enterQuote(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), pkg = findPackage(est, a.package);
  const vname = needs(a.vendor, 'vendor');
  let vendor = findVendor(draft.library, vname);
  if (!vendor) { vendor = { id: uid('V'), name: String(vname).trim(), trade: a.trade || pkg.name, kind: a.kind === 'supplier' ? 'supplier' : 'sub', contact: '', email: '', phone: '' }; draft.library.vendors.push(vendor); }
  const rec = { vendorId: vendor.id, status: 'received', receivedAt: new Date().toISOString().slice(0, 10), note: a.note ? String(a.note).trim() : undefined };
  const lineQty = {};
  if (a.lump_sum != null && a.lump_sum !== '') { rec.lump = r2(num(a.lump_sum, 'lump_sum')); rec.unitPrices = undefined; }
  else {
    const prices = Array.isArray(a.unit_prices) ? a.unit_prices : [];
    if (!prices.length) throw new Error('Give unit_prices (a list of { item, unit_price, qty? }) or a lump_sum.');
    rec.unitPrices = {};
    prices.forEach(pr => { const it = findItem(est, pr.item); if (!pkg.lines.some(l => l.itemId === it.id)) throw new Error((it.code || it.name) + ' is not in package "' + pkg.name + '".'); rec.unitPrices[it.id] = r2(num(pr.unit_price, 'unit_price for ' + (it.code || it.name))); if (pr.qty != null && pr.qty !== '') lineQty[it.id] = num(pr.qty, 'qty'); });
  }
  if (Object.keys(lineQty).length) rec.lineQty = lineQty;
  let q = pkg.quotes.find(x => x.vendorId === vendor.id);
  const updated = !!q && q.status === 'received';
  if (!q) { q = { id: uid('Q') }; pkg.quotes.push(q); }
  Object.keys(rec).forEach(k => { if (rec[k] === undefined) delete q[k]; else q[k] = rec[k]; });
  const d = GL.derive(draft, bid.id); const dp = d.packages.find(p => p.id === pkg.id); const dq = dp.quotes.find(x => x.id === q.id);
  const vs = dq.vsPlug != null ? ' (' + (dq.vsPlug <= 0 ? '' : '+') + (dq.vsPlug * 100).toFixed(1) + '% vs plug)' : '';
  return { entry: { title: (updated ? 'Updated' : 'Entered') + ' quote from ' + vendor.name, detail: pkg.name + ' · ' + money(dq.total), icon: 'request_quote' },
    say: (updated ? 'Updated' : 'Entered') + ' the quote from ' + vendor.name + ' on "' + pkg.name + '": ' + money(dq.total) + vs + (dq.qtyIssue ? '. Quantity differs on ' + (est.items.find(i => i.id === dq.qtyIssue.itemId) || {}).code + ': quoted ' + dq.qtyIssue.quoted + ', bid has ' + dq.qtyIssue.bid : '') + '. It is not picked yet; use pick_quote to use it.' };
}

export function pickQuote(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), pkg = findPackage(est, a.package);
  const choice = norm(a.vendor);
  let title, detail;
  if (choice === 'plug' || !choice) { pkg.selectedQuoteId = null; title = 'Cleared the pick for ' + pkg.name; detail = 'back to plug'; }
  else if (choice === 'self' || choice === 'self-perform') { if (!pkg.selfPerform) throw new Error('"' + pkg.name + '" has no self-perform option.'); pkg.selectedQuoteId = 'self'; title = 'Chose self-perform for ' + pkg.name; detail = ''; }
  else {
    const vendor = findVendor(draft.library, a.vendor); if (!vendor) throw new Error('No company matches "' + a.vendor + '".');
    const q = pkg.quotes.find(x => x.vendorId === vendor.id); if (!q || q.status !== 'received') throw new Error(vendor.name + ' has not sent a quote for "' + pkg.name + '" yet.');
    pkg.selectedQuoteId = q.id; title = 'Accepted ' + vendor.name + ' for ' + pkg.name; detail = q.lump != null ? money(q.lump) : '';
  }
  return { entry: { title, detail, icon: 'request_quote' }, say: title + '.' };
}

export function lockPrice(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), it = findItem(est, a.item);
  if (a.unit_price == null || a.unit_price === '') { delete est.locks[it.id]; return { entry: { title: 'Unlocked price on ' + (it.code || it.name), icon: 'lock_open' }, say: 'Unlocked ' + (it.code || it.name) + '; it prices from cost again.' }; }
  const price = r2(num(a.unit_price, 'unit_price'));
  const d = GL.derive(draft, bid.id); const di = d.items.find(x => x.id === it.id);
  if (price * it.qty < di.direct) throw new Error('That is below cost: ' + money(di.direct / (it.qty || 1), 2) + ' / ' + it.unit + '. Benchstake does not lock prices below cost.');
  est.locks[it.id] = price;
  return { entry: { title: 'Locked price on ' + (it.code || it.name), detail: money(price, 2) + ' / ' + it.unit, icon: 'lock' }, say: 'Locked ' + (it.code || it.name) + ' at ' + money(price, 2) + ' / ' + it.unit + '.' };
}

export function setMarkup(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid);
  const changes = [];
  ['overhead', 'profit', 'bond', 'tax'].forEach(k => { if (a[k] != null && a[k] !== '') { const v = num(a[k], k); if (v < 0 || v > 100) throw new Error(k + ' is a percent from 0 to 100.'); changes.push(k + ' ' + est.markup[k] + '% → ' + v + '%'); est.markup[k] = v; } });
  if (a.target_margin != null && a.target_margin !== '') { const v = num(a.target_margin, 'target_margin'); changes.push('target margin ' + est.targetMargin + '% → ' + v + '%'); est.targetMargin = v; }
  if (!changes.length) throw new Error('Nothing to change: give overhead, profit, bond, tax or target_margin.');
  const d = GL.derive(draft, bid.id);
  return { entry: { title: 'Changed markup on ' + bid.name.split(',')[0], detail: changes.join(', '), icon: 'tune' }, say: 'Markup on "' + bid.name + '": ' + changes.join(', ') + '. Bid total is now ' + money(d.totals.bidTotal) + ' at ' + d.totals.margin.toFixed(1) + '% margin.' };
}

// A task is how a pay item gets its cost: a crew at a production rate, a material, a sub (plug or quote package), or other cost.
function findCrew(lib, ref) { const q = norm(ref); const c = lib.crews.find(x => x.id === ref || norm(x.name) === q) || lib.crews.find(x => norm(x.name).includes(q)); if (!c) throw new Error('No crew matches "' + ref + '". Crews: ' + (lib.crews.map(x => x.name).join('; ') || 'none yet')); return c; }
function findMaterial(lib, ref) { const q = norm(ref); const m = lib.materials.find(x => x.id === ref || norm(x.name) === q) || lib.materials.find(x => norm(x.name).includes(q)); if (!m) throw new Error('No material matches "' + ref + '". Materials: ' + (lib.materials.map(x => x.name).join('; ') || 'none yet')); return m; }

export function addTask(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), it = findItem(est, a.item);
  const type = a.type;
  const t = { id: uid('T'), itemId: it.id, name: String(a.name || '').trim(), type };
  let what;
  if (type === 'crew') {
    const c = findCrew(draft.library, needs(a.crew, 'crew'));
    const prod = num(a.production, 'production'); if (!(prod > 0)) throw new Error('production is ' + it.unit + ' per day and must be above 0.');
    t.crewId = c.id; t.production = prod; if (!t.name) t.name = c.name; what = c.name + ' at ' + GL.fmtNum(prod) + ' ' + it.unit + '/day';
  } else if (type === 'material') {
    const m = findMaterial(draft.library, needs(a.material, 'material'));
    t.matId = m.id; t.per = a.per == null || a.per === '' ? 1 : num(a.per, 'per'); if (!t.name) t.name = m.name; what = m.name + ', ' + t.per + ' ' + m.unit + ' per ' + it.unit;
  } else if (type === 'sub') {
    t.packageId = a.package ? findPackage(est, a.package).id : null;
    t.plug = a.plug == null || a.plug === '' ? null : num(a.plug, 'plug');
    if (!t.packageId && t.plug == null) throw new Error('A sub task needs a plug price per ' + it.unit + ' or a quote package.');
    if (!t.name) t.name = 'Subcontract'; what = (t.plug != null ? 'plug ' + money(t.plug, 2) + ' / ' + it.unit : '') + (t.packageId ? (t.plug != null ? ', ' : '') + 'package ' + est.packages.find(p => p.id === t.packageId).name : '');
  } else if (type === 'other') {
    if (a.lump_sum != null && a.lump_sum !== '') { t.amount = num(a.lump_sum, 'lump_sum'); what = money(t.amount) + ' lump sum'; }
    else { t.perUnit = num(a.cost_per_unit, 'cost_per_unit'); what = money(t.perUnit, 2) + ' / ' + it.unit; }
    if (!t.name) t.name = 'Other cost';
  } else throw new Error('type must be crew, material, sub or other.');
  est.tasks.push(t);
  const d = GL.derive(draft, bid.id), di = d.items.find(x => x.id === it.id);
  return { entry: { title: 'Added task ' + t.name + ' to ' + (it.code || it.name), detail: what, icon: 'add_task' },
    say: 'Added "' + t.name + '" (' + what + ') to ' + (it.code ? it.code + ' ' : '') + it.name + '. Item cost ' + money(di.direct) + ', priced at ' + money(di.unitPrice, 2) + ' / ' + it.unit + '. Bid total ' + money(d.totals.bidTotal) + ' at ' + d.totals.margin.toFixed(1) + '% margin.' };
}

export function removeTask(draft, a) {
  const bid = findBid(draft, a.bid), est = estimateOf(draft, bid), it = findItem(est, a.item);
  const mine = est.tasks.filter(t => t.itemId === it.id);
  const q = norm(a.task);
  const hits = mine.filter(t => t.id === a.task || norm(t.name) === q).length ? mine.filter(t => t.id === a.task || norm(t.name) === q) : mine.filter(t => norm(t.name).includes(q));
  if (!hits.length) throw new Error('No task on ' + (it.code || it.name) + ' matches "' + a.task + '". Tasks: ' + (mine.map(t => t.name).join('; ') || 'none'));
  if (hits.length > 1) throw new Error('"' + a.task + '" matches ' + hits.length + ' tasks; be more specific.');
  est.tasks = est.tasks.filter(t => t !== hits[0]);
  return { entry: { title: 'Deleted task ' + hits[0].name, detail: it.code || it.name, icon: 'delete' }, say: 'Removed "' + hits[0].name + '" from ' + (it.code || it.name) + '.' };
}
