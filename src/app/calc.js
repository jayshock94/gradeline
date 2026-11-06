/* ===== Benchstake estimating engine: everything derived from the document ===== */
import { GL } from './gl.js';
// No design-system or browser imports here: the server (api/) runs this same engine.
(function () {
  function byId(list) { var m = {}; (list || []).forEach(function (x) { m[x.id] = x; }); return m; }
  function round2(v) { return Math.round(v * 100) / 100; }

  // Rates: a labor class can be wage + burden %, a machine can be ownership + operating + fuel. Either way `rate` is the hourly cost.
  GL.laborRate = function (l) { return l && l.wage != null ? round2(l.wage * (1 + (l.burden || 0) / 100)) : (l ? Number(l.rate) || 0 : 0); };
  GL.equipRate = function (e) { return e && (e.own != null || e.op != null || e.fuel != null) ? round2((e.own || 0) + (e.op || 0) + (e.fuel || 0)) : (e ? Number(e.rate) || 0 : 0); };
  GL.crewRate = function (crew, lib) {
    var L = byId(lib.labor), E = byId(lib.equipment);
    var laborH = 0, equipH = 0, people = 0;
    (crew.labor || []).forEach(function (p) { var r = L[p[0]]; if (r) { laborH += GL.laborRate(r) * p[1]; people += p[1]; } });
    (crew.equipment || []).forEach(function (p) { var r = E[p[0]]; if (r) equipH += GL.equipRate(r) * p[1]; });
    var hours = crew.hours || 8;
    return { laborPerDay: laborH * hours, equipPerDay: equipH * hours, perDay: (laborH + equipH) * hours, people: people, hours: hours, laborPerHour: laborH, equipPerHour: equipH };
  };

  GL.blankEstimate = function (defaults) { var d = defaults || {}; var n = function (v, f) { return v == null || isNaN(v) ? f : Number(v); }; return { items: [], tasks: [], packages: [], markup: { overhead: n(d.overhead, 6), profit: n(d.profit, 4), bond: n(d.bond, 1.2), tax: n(d.tax, 0) }, targetMargin: n(d.targetMargin, 9), locks: {} }; };
  // Fill in anything an estimate row is missing (older rows, rows written by other tools) so derive never throws on it.
  GL.normalizeEstimate = function (est) {
    var blank = GL.blankEstimate();
    var e = Object.assign(blank, est || {});
    e.items = Array.isArray(e.items) ? e.items : []; e.tasks = Array.isArray(e.tasks) ? e.tasks : []; e.packages = Array.isArray(e.packages) ? e.packages : [];
    e.markup = Object.assign({ overhead: 6, profit: 4, bond: 1.2, tax: 0 }, e.markup || {});
    e.locks = e.locks && typeof e.locks === 'object' ? e.locks : {};
    if (!(e.targetMargin >= 0)) e.targetMargin = 9;
    return e;
  };
  // A local YYYY-MM-DD (toISOString would give tomorrow's date in the evening, US time)
  GL.today = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  GL.validDate = function (s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false; var d = new Date(s + 'T00:00:00'); return !isNaN(d) && d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') === s; };
  // Clock times: the app stores "2:00 PM"; this turns a 24-hour "14:00" into that, or '' when it can't read it
  GL.fmtTime = function (t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim()); if (!m) return /^\d{1,2}:\d{2}\s*[AP]M$/i.test(t || '') ? String(t).trim().toUpperCase() : ''; var hh = Number(m[1]); return ((hh % 12) || 12) + ':' + m[2] + ' ' + (hh >= 12 ? 'PM' : 'AM'); };
  // Short label for a pay item in messages: code plus name, never the code alone ("1" means nothing to a reader)
  GL.itemLabel = function (it, max) { if (!it) return ''; var n = String(it.name || ''); max = max || 32; if (n.length > max) n = n.slice(0, max - 1) + '…'; return it.code ? it.code + ' ' + n : n; };
  // How many crews, tasks and quotes point at a library record (so a delete or a restore never leaves a hole in an estimate)
  GL.usedBy = function (doc, kind, id) {
    var n = 0, lib = doc.library;
    if (kind === 'labor' || kind === 'equipment') (lib.crews || []).forEach(function (c) { (c[kind] || []).forEach(function (x) { if (x[0] === id) n++; }); });
    Object.keys(doc.estimates || {}).forEach(function (k) {
      var e = doc.estimates[k] || {};
      (e.tasks || []).forEach(function (t) { if ((kind === 'crews' && t.crewId === id) || (kind === 'materials' && t.matId === id)) n++; });
      (e.packages || []).forEach(function (pk) {
        if (pk.selfPerform && ((kind === 'crews' && pk.selfPerform.crewId === id) || (kind === 'materials' && pk.selfPerform.matId === id))) n++;
        (pk.quotes || []).forEach(function (q) { if (kind === 'vendors' && q.vendorId === id) n++; });
      });
    });
    return n;
  };
  GL.derive = function (doc, bidId) {
    var est = GL.normalizeEstimate(doc.estimates[bidId || doc.currentBidId]), lib = Object.assign({ crews: [], labor: [], equipment: [], materials: [], vendors: [] }, doc.library || {});
    var items = est.items, tasks = est.tasks, pkgs = est.packages;
    var crews = byId(lib.crews), mats = byId(lib.materials), vendors = byId(lib.vendors), pkgMap = byId(pkgs), itemMap = byId(items);
    var crewRates = {}; lib.crews.forEach(function (c) { crewRates[c.id] = GL.crewRate(c, lib); });
    var mk = est.markup;
    var multiplier = (1 + mk.overhead / 100) * (1 + mk.profit / 100) * (1 + mk.bond / 100);
    var taxF = 1 + (mk.tax || 0) / 100;

    // packages: quote totals
    var dPkgs = pkgs.map(function (p) {
      var lines = p.lines.map(function (l) { var it = itemMap[l.itemId]; return { itemId: l.itemId, item: it, qty: it ? it.qty : 0, unit: it ? it.unit : '' }; });
      var plugTotal = 0;
      lines.forEach(function (l) { var t = tasks.find(function (t) { return t.packageId === p.id && t.itemId === l.itemId; }); if (t) plugTotal += (t.plug || 0) * l.qty; });
      var selfTotal = null, selfSplit = null, lineQty = lines.reduce(function (a, l) { return a + (l.qty || 0); }, 0);
      if (p.selfPerform) {
        var cr = crewRates[p.selfPerform.crewId];
        if (cr && lineQty && p.selfPerform.production) {
          var days = lineQty / p.selfPerform.production;
          var mat = p.selfPerform.matId && mats[p.selfPerform.matId] ? mats[p.selfPerform.matId].cost * (p.selfPerform.per || 0) * lineQty * taxF : 0;
          selfSplit = { labor: days * cr.laborPerDay / lineQty, equipment: days * cr.equipPerDay / lineQty, material: mat / lineQty };
          selfTotal = days * cr.perDay + mat;
        }
      }
      var quotes = p.quotes.map(function (q) {
        var total = null, complete = true, unitPrices = q.unitPrices || {};
        if (q.status === 'received' && q.lump != null) {
          var plugs = lines.map(function (l) { var t = tasks.find(function (t) { return t.packageId === p.id && t.itemId === l.itemId; }); return t && t.plug > 0 ? t.plug : null; });
          var byPlug = lines.length > 0 && plugs.every(function (x) { return x != null; });
          var w = lines.map(function (l, i) { return byPlug ? plugs[i] * l.qty : l.qty; });
          var sw = w.reduce(function (a, x) { return a + x; }, 0) || 1;
          unitPrices = {}; lines.forEach(function (l, i) { if (l.qty) unitPrices[l.itemId] = q.lump * w[i] / sw / l.qty; });
          total = q.lump; q = Object.assign({}, q, { spread: byPlug ? 'plug' : 'qty' });
        } else if (q.status === 'received' && q.unitPrices) {
          total = 0;
          lines.forEach(function (l) { var up = q.unitPrices[l.itemId]; if (up == null) complete = false; else total += up * l.qty; });
        }
        var qtyIssue = null;
        if (q.lineQty) Object.keys(q.lineQty).forEach(function (iid) { var it = itemMap[iid]; if (it && Math.abs(q.lineQty[iid] - it.qty) / (it.qty || 1) > 0.02) qtyIssue = { itemId: iid, quoted: q.lineQty[iid], bid: it.qty, unit: it.unit }; });
        return Object.assign({}, q, { unitPrices: unitPrices, vendor: vendors[q.vendorId] || { id: null, name: q.vendorName || 'Unknown company', contact: '', trade: '' }, total: total, complete: complete, vsPlug: total != null && plugTotal ? (total - plugTotal) / plugTotal : null, qtyIssue: qtyIssue });
      });
      var received = quotes.filter(function (q) { return q.total != null; });
      var lumpByQty = quotes.some(function (q) { return q.spread === 'qty'; });
      var best = received.length ? received.reduce(function (a, q) { return q.total < a.total ? q : a; }) : null;
      var selected = quotes.find(function (q) { return q.id === p.selectedQuoteId; }) || null;
      return Object.assign({}, p, { lines: lines, quotes: quotes, plugTotal: plugTotal, selfTotal: selfTotal, selfSplit: selfSplit, best: best, selected: selected, selfSelected: p.selectedQuoteId === 'self', lumpByQty: lumpByQty });
    });
    var dPkgMap = byId(dPkgs);

    // tasks
    var dTasks = {};
    tasks.forEach(function (t) {
      var it = itemMap[t.itemId]; if (!it) return;
      var qty = t.qtyOverride != null ? t.qtyOverride : it.qty;
      var r = { id: t.id, itemId: t.itemId, name: t.name, type: t.type, qty: qty, unit: t.unit || it.unit, days: 0, labor: 0, equipment: 0, material: 0, sub: 0, other: 0, source: '', vendorName: '', crewName: '', production: t.production, crewId: t.crewId, plug: t.plug, note: t.note, packageId: t.packageId, matId: t.matId, per: t.per, perUnit: t.perUnit, amount: t.amount, problems: [] };
      if (t.type === 'crew') {
        var cr = crewRates[t.crewId]; var crew = crews[t.crewId];
        r.crewName = crew ? crew.name : '';
        if (!crew) r.problems.push({ sev: 'error', msg: 'No crew assigned' });
        else if (!(t.production > 0)) r.problems.push({ sev: 'error', msg: 'Production rate is zero' });
        else { r.days = qty / t.production; r.labor = r.days * cr.laborPerDay; r.equipment = r.days * cr.equipPerDay; r.crewDay = cr.perDay; r.people = cr.people; }
      } else if (t.type === 'material') {
        var m = mats[t.matId];
        if (!m) r.problems.push({ sev: 'error', msg: 'No material picked' });
        else { r.matQty = qty * (t.per || 0); r.material = r.matQty * m.cost * taxF; r.matName = m.name; r.matUnit = m.unit; }
      } else if (t.type === 'sub') {
        var p = dPkgMap[t.packageId];
        var unit = null;
        if (p && p.selfSelected && p.selfSplit) { unit = p.selfSplit.labor + p.selfSplit.equipment + p.selfSplit.material; r.source = 'self'; r.vendorName = 'Self-perform'; }
        else if (p && p.selected && p.selected.total != null && p.selected.unitPrices[t.itemId] != null) { unit = p.selected.unitPrices[t.itemId]; r.source = 'quote'; r.vendorName = p.selected.vendor ? p.selected.vendor.name : ''; }
        else if (t.plug != null) { unit = t.plug; r.source = 'plug'; r.vendorName = 'Plug'; if (p && p.selected && p.selected.status === 'pending') r.problems.push({ sev: 'warning', msg: 'Selected quote not received yet; using plug' }); }
        if (unit == null) r.problems.push({ sev: 'error', msg: 'No quote and no plug' });
        else { r.unitSub = unit; if (r.source === 'self') { r.labor = p.selfSplit.labor * qty; r.equipment = p.selfSplit.equipment * qty; r.material = p.selfSplit.material * qty; } else r.sub = unit * qty; }
        if (p && !p.selected && !p.selfSelected && p.quotes.some(function (q) { return q.total != null; })) r.problems.push({ sev: 'warning', msg: 'Quotes received but none picked' });
      } else { // other
        r.other = t.amount != null ? t.amount : (t.perUnit || 0) * qty;
        if (!(r.other > 0)) r.problems.push({ sev: 'error', msg: 'No amount' });
      }
      r.total = r.labor + r.equipment + r.material + r.sub + r.other;
      dTasks[t.id] = r;
    });

    // items
    var totals = { labor: 0, equipment: 0, material: 0, sub: 0, other: 0, direct: 0, bidTotal: 0 };
    var dItems = items.map(function (it) {
      var ts = tasks.filter(function (t) { return t.itemId === it.id; }).map(function (t) { return dTasks[t.id]; }).filter(Boolean);
      var r = Object.assign({}, it, { tasks: ts, labor: 0, equipment: 0, material: 0, sub: 0, other: 0, direct: 0, problems: [] });
      ts.forEach(function (t) { r.labor += t.labor; r.equipment += t.equipment; r.material += t.material; r.sub += t.sub; r.other += t.other; });
      r.direct = r.labor + r.equipment + r.material + r.sub + r.other;
      r.unitCost = it.qty ? r.direct / it.qty : 0;
      var lock = est.locks[it.id];
      r.locked = lock != null;
      r.unitPrice = r.locked ? round2(lock) : round2(r.unitCost * multiplier);
      r.ext = round2(r.unitPrice * it.qty);
      r.markupPct = r.unitCost ? (r.unitPrice / r.unitCost - 1) * 100 : 0;
      if (!(it.qty > 0)) r.problems.push({ sev: 'error', msg: 'Quantity is zero' });
      if (!ts.length) r.problems.push({ sev: 'error', msg: 'No tasks priced' });
      else if (!(r.direct > 0) && !r.locked) r.problems.push({ sev: 'error', msg: 'No cost: item has no price' });
      if (r.locked && r.unitPrice < r.unitCost) r.problems.push({ sev: 'warning', msg: 'Locked price is below cost' });
      ts.forEach(function (t) { t.problems.forEach(function (p) { r.problems.push({ sev: p.sev, msg: t.name + ': ' + p.msg, taskId: t.id }); }); });
      r.status = r.problems.some(function (p) { return p.sev === 'error'; }) ? 'error' : r.problems.length ? 'warning' : null;
      totals.labor += r.labor; totals.equipment += r.equipment; totals.material += r.material; totals.sub += r.sub; totals.other += r.other; totals.direct += r.direct; totals.bidTotal += r.ext;
      return r;
    });
    totals.markup = totals.bidTotal - totals.direct;
    totals.margin = totals.bidTotal ? totals.markup / totals.bidTotal * 100 : 0;
    totals.overhead = totals.direct * mk.overhead / 100;
    totals.profit = (totals.direct + totals.overhead) * mk.profit / 100;
    totals.bond = (totals.direct + totals.overhead + totals.profit) * mk.bond / 100;
    totals.multiplier = multiplier;
    totals.lockedCount = Object.keys(est.locks).length;
    totals.days = 0; Object.keys(dTasks).forEach(function (k) { totals.days += dTasks[k].days || 0; });

    // checks
    var checks = [];
    var bid = doc.bids.find(function (b) { return b.id === (bidId || doc.currentBidId); }) || {};
    dItems.forEach(function (it) { it.problems.forEach(function (p) { checks.push({ sev: p.sev, title: it.code + ' ' + it.name, detail: p.msg, itemId: it.id, tab: 'sheet' }); }); });
    dPkgs.forEach(function (p) {
      p.quotes.forEach(function (q) {
        if (q.qtyIssue) checks.push({ sev: 'warning', title: p.name, detail: (q.vendor ? q.vendor.name : 'Quote') + ' quoted ' + GL.fmtNum(q.qtyIssue.quoted) + ' ' + q.qtyIssue.unit + ', bid quantity is ' + GL.fmtNum(q.qtyIssue.bid), itemId: q.qtyIssue.itemId, tab: 'quotes', packageId: p.id });
        if (q.status === 'pending') checks.push({ sev: 'warning', title: p.name, detail: (q.vendor ? q.vendor.name : 'A vendor') + ' has not sent a quote yet', tab: 'quotes', packageId: p.id });
      });
      if (p.best && p.selected && p.selected.total != null && p.best.id !== p.selected.id && p.best.complete) checks.push({ sev: 'warning', title: p.name, detail: 'Selected ' + p.selected.vendor.name + ' but ' + p.best.vendor.name + ' is lower by ' + GL.fmtMoney(p.selected.total - p.best.total), tab: 'quotes', packageId: p.id });
    });
    if (!dItems.length) checks.push({ sev: 'error', title: 'No pay items', detail: 'Add the owner\'s item list before this bid can go out.', tab: 'sheet' });
    var mob = dItems.find(function (i) { return /mobiliz/i.test(i.name); });
    if (mob && totals.bidTotal && mob.ext / totals.bidTotal > 0.10) checks.push({ sev: 'error', title: 'Mobilization over 10% of bid', detail: 'Most DOT specs cap mobilization at 10%. It is ' + (mob.ext / totals.bidTotal * 100).toFixed(1) + '%.', itemId: mob.id, tab: 'bidday' });
    if (bid.type === 'public' && !(mk.bond > 0)) checks.push({ sev: 'error', title: 'No bond in markup', detail: 'Public work needs a performance and payment bond. Set the bond rate on Bid day.', tab: 'bidday' });
    if (totals.margin < (est.targetMargin || 0) - 0.05) checks.push({ sev: 'warning', title: 'Margin below target', detail: 'Margin is ' + totals.margin.toFixed(1) + '%, target is ' + est.targetMargin + '%.', tab: 'bidday' });
    var pendingSel = dPkgs.filter(function (p) { return p.selected && p.selected.status === 'pending'; });
    var errors = checks.filter(function (c) { return c.sev === 'error'; }).length, warnings = checks.length - errors;
    var unpriced = dItems.filter(function (i) { return i.problems.some(function (p) { return p.sev === 'error'; }); }).length;
    if (!errors && dItems.length) checks.push({ sev: 'ok', title: 'Every pay item has a price', detail: dItems.length + ' items, ' + Object.keys(dTasks).length + ' tasks priced.' });
    if (totals.lockedCount) checks.push({ sev: 'ok', title: totals.lockedCount + ' price' + (totals.lockedCount > 1 ? 's' : '') + ' locked', detail: 'Locked prices stay put when costs change.' });

    return { est: est, items: dItems, tasks: dTasks, packages: dPkgs, totals: totals, checks: checks, errors: errors, warnings: warnings, unpriced: unpriced, crewRates: crewRates, bid: bid, multiplier: multiplier };
  };

  GL.fmtMoney = function (v, d) { // same output as the design system's Money
    if (v == null || v === '' || isNaN(v)) return '';
    var dec = d == null ? 0 : d, n = Number(v), neg = n < 0;
    var s = '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return neg ? '\u2212' + s : s;
  };
  GL.fmtNum = function (v, d) { if (v == null || isNaN(v)) return ''; return Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d != null ? d : 2 }); };
  GL.daysUntil = function (iso) { var d = new Date(iso + 'T00:00:00'); var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((d - t) / 86400000); };
  GL.fmtDate = function (iso) { if (!iso) return ''; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? String(iso) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  GL.dueStatus = function (bid) {
    if (['won', 'lost', 'no-bid', 'submitted'].indexOf(bid.status) >= 0) return null;
    var n = GL.daysUntil(bid.due);
    if (n < 0) return { status: 'overdue', label: 'Past due' };
    if (n === 0) return { status: 'due-soon', label: 'Due today' + (bid.dueTime ? ' ' + bid.dueTime : '') };
    if (n <= 7) return { status: 'due-soon', label: 'Due in ' + n + ' day' + (n > 1 ? 's' : '') };
    return null;
  };

  GL.initials = function (name) {
    var src = String(name || '').trim() || '?';
    var parts = src.replace(/[._@-]+/g, ' ').split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2)).toUpperCase();
  };

  // Insights computed from the company's own bids and estimates (the demo seed ships a richer static sample).
  GL.insightsFrom = function (bids, estimates, library) {
    var now = new Date(); var months = [], bid = [], won = [];
    var names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = 11; i >= 0; i--) { var d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(names[d.getMonth()]); bid.push(0); won.push(0); }
    var start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    var owners = {};
    (bids || []).forEach(function (b) {
      if (!b.due) return;
      var d = new Date(b.due + 'T00:00:00');
      var idx = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      var decided = ['submitted', 'won', 'lost'].indexOf(b.status) >= 0;
      if (idx >= 0 && idx < 12 && decided) { bid[idx] += 1; if (b.status === 'won') won[idx] += 1; }
      var o = owners[b.owner] || (owners[b.owner] = { owner: b.owner, bid: 0, won: 0, margins: [] });
      if (decided) o.bid += 1; if (b.status === 'won') o.won += 1;
    });
    var byOwner = Object.keys(owners).map(function (k) { var o = owners[k]; return { owner: o.owner, bid: o.bid, won: o.won, margin: 0 }; }).filter(function (o) { return o.bid > 0; }).sort(function (a, b) { return b.bid - a.bid; }).slice(0, 8);
    // unit cost trend: the same item name across estimates
    var items = {};
    Object.keys(estimates || {}).forEach(function (bidId) {
      var est = estimates[bidId]; if (!est || !est.items) return;
      if (!library) return;
      var doc = { estimates: {}, currentBidId: bidId, library: library, bids: bids };
      doc.estimates[bidId] = est;
      var d = GL.derive(doc, bidId);
      d.items.forEach(function (it) { if (!(it.qty > 0) || !(it.direct > 0)) return; var k = it.name.toLowerCase(); var r = items[k] || (items[k] = { item: it.name, unit: it.unit, costs: [] }); r.costs.push(it.unitCost); });
    });
    var unitTrend = Object.keys(items).map(function (k) { var r = items[k]; var c = r.costs; return { item: r.item, unit: r.unit, bids: c.length, avg: c.reduce(function (a, x) { return a + x; }, 0) / c.length, low: Math.min.apply(null, c), high: Math.max.apply(null, c) }; }).filter(function (r) { return r.bids >= 2; }).sort(function (a, b) { return b.bids - a.bids; }).slice(0, 8);
    var lossReview = (bids || []).filter(function (b) { return b.status === 'lost' && b.total && b.lowBid; }).map(function (b) { return { bid: b.name, spread: Math.round((b.total / b.lowBid - 1) * 1000) / 10, note: b.note || '' }; }).slice(0, 6);
    return { months: months, bid: bid, won: won, byOwner: byOwner, unitTrend: unitTrend, lossReview: lossReview, computed: true };
  };

  GL.toCSV = function (rows) {
    return rows.map(function (r) { return r.map(function (c) {
      var s = c == null ? '' : String(c);
      if (typeof c === 'string' && /^[=+\-@\t\r]/.test(s) && isNaN(Number(s))) s = "'" + s;
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(','); }).join('\r\n');
  };
})();
