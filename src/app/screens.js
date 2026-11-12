/* ===== Benchstake screens: bids, estimate wrapper, library, insights, dialogs, shell ===== */
import { GL } from './gl.js';
import { M3 as M } from '../ds/index.js';
import * as R from 'react';
(function () {
  var h = R.createElement, useState = R.useState, useEffect = R.useEffect, useMemo = R.useMemo, useRef = R.useRef;
  var Frag = R.Fragment;
  var money = function (v, d) { return h(M.Money, { value: v, decimals: d || 0 }); };
  var STATUS_WORD = { draft: 'Draft', open: 'Open', 'in-progress': 'In progress', review: 'In review', submitted: 'Submitted', won: 'Won', lost: 'Lost', 'no-bid': 'No bid' };

  /* ---------- Bids screen ---------- */
  function BidsScreen(p) {
    var doc = p.doc, ui = p.ui, api = p.api;
    var menu = GL.useMenu();
    var filter = ui.bidFilter || 'all';
    var query = (ui.bidQuery || '').trim().toLowerCase();
    var totals = {};
    doc.bids.forEach(function (b) { if (doc.estimates[b.id]) totals[b.id] = GL.derive(doc, b.id).totals.bidTotal; else totals[b.id] = b.total; });
    var open = doc.bids.filter(function (b) { return ['draft', 'open', 'in-progress', 'review'].indexOf(b.status) >= 0; });
    var dueWeek = open.filter(function (b) { var n = GL.daysUntil(b.due); return n >= 0 && n <= 7; });
    var decided = doc.bids.filter(function (b) { return b.status === 'won' || b.status === 'lost'; });
    var won = decided.filter(function (b) { return b.status === 'won'; });
    var thisYear = String(new Date().getFullYear());
    var wonYear = won.filter(function (b) { return (b.due || '').slice(0, 4) === thisYear; });
    var backlog = wonYear.reduce(function (a, b) { return a + (totals[b.id] || 0); }, 0);
    var list = doc.bids.filter(function (b) {
      if (filter === 'all') return true;
      if (filter === 'open') return ['draft', 'open', 'in-progress', 'review'].indexOf(b.status) >= 0;
      if (filter === 'due') return dueWeek.indexOf(b) >= 0;
      return b.status === filter;
    }).filter(function (b) {
      if (!query) return true;
      return [b.name, b.owner, b.location, b.estimator, b.note].join(' ').toLowerCase().indexOf(query) >= 0;
    }).sort(function (a, b) {
      var act = function (x) { return ['draft', 'open', 'in-progress', 'review'].indexOf(x.status) >= 0 ? 0 : 1; };
      if (act(a) !== act(b)) return act(a) - act(b);
      return act(a) === 0 ? (a.due < b.due ? -1 : 1) : (a.due < b.due ? 1 : -1);
    });
    var rows = list.map(function (b) { var ds = GL.dueStatus(b); return { id: b.id, name: b.name, location: b.location, owner: b.owner, type: b.type, due: b.due, dueTime: b.dueTime, dueChip: ds, estimator: b.estimator, total: totals[b.id], status: b.status, live: !!doc.estimates[b.id], selected: ui.bidId === b.id, lowBid: b.lowBid, note: b.note }; });
    var cols = [
      { key: 'name', header: 'Bid', width: 320, render: function (r) { return h('span', { className: 'gl-bidcell' }, h('span', { className: 'gl-bidcell__name' }, r.name, r.live ? h(M.Icon, { name: 'edit_document', size: 16, className: 'gl-livemark', label: 'Has an estimate' }) : null), h('span', { className: 'gl-bidcell__sub body-small' }, [r.location, r.note].filter(Boolean).join(' · '))); } },
      { key: 'owner', header: 'Owner', width: 200, render: function (r) { return h('span', null, r.owner, h('span', { className: 'gl-dim' }, r.type === 'public' ? ' · public' : ' · private')); } },
      { key: 'due', header: 'Due', width: 150, render: function (r) { return h('span', { className: 'gl-duecell' }, h('span', { className: 'gl-duecell__date' }, GL.fmtDate(r.due) + (r.dueTime ? ' · ' + r.dueTime : '')), r.dueChip ? h(M.StatusChip, { status: r.dueChip.status, label: r.dueChip.label }) : null); } },
      { key: 'estimator', header: 'Estimator', width: 110 },
      { key: 'total', header: 'Bid total', type: 'money', width: 130, render: function (r) { return r.total ? h(Frag, null, h(M.Money, { value: r.total }), r.lowBid ? h('span', { className: 'gl-dim body-small' }, ' low ' + GL.fmtMoney(r.lowBid)) : null) : h('span', { className: 'gl-dim' }, 'not priced'); } },
      { key: 'status', header: 'Status', width: 130, render: function (r) { return h(M.StatusChip, { status: r.status }); } },
      { key: 'actions', header: '', width: 48, align: 'center', render: function (r) { return h(M.IconButton, { icon: 'more_vert', label: 'Actions for ' + r.name, size: 'xs', onClick: function (e) { e.stopPropagation(); menu.open(e, [
        { icon: 'edit', label: 'Edit', onClick: function () { p.openDialog({ kind: 'editbid', bidId: r.id }); } },
        { icon: 'content_copy', label: 'Duplicate', onClick: function () { p.openDialog({ kind: 'dupbid', bidId: r.id }); } },
        { divider: true },
        { icon: 'delete', label: 'Delete', onClick: function () { p.openDialog({ kind: 'deletebid', bidId: r.id }); } }], 'Actions'); } }); } }
    ];
    var winRate = decided.length ? Math.round(won.length / decided.length * 100) : 0;
    return h('div', { className: 'gl-screen' },
      menu.node,
      ui.hideSampleNote || !p.demo ? null : h(M.Banner, { tone: 'neutral', compact: true, icon: 'science', onClose: function () { api.ui({ hideSampleNote: true }); } }, 'Sample data for a fictional contractor, Cascade Civil Constructors. Change anything; every change can be undone, and the account menu resets it.'),
      h('div', { className: 'gl-tiles' },
        h(M.StatTile, { label: 'Open bids', value: String(open.length), icon: 'folder_open', supporting: open.filter(function (b) { return b.status === 'in-progress'; }).length + ' in progress', onClick: function () { api.ui({ bidFilter: 'open' }); } }),
        h(M.StatTile, { label: 'Due this week', value: String(dueWeek.length), tone: dueWeek.length ? 'warning' : 'default', icon: 'schedule', supporting: dueWeek.length ? 'next: ' + dueWeek.sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0].name.split(',')[0] : 'nothing due', onClick: function () { api.ui({ bidFilter: 'due' }); } }),
        h(M.StatTile, { label: 'Win rate', value: String(winRate), unit: '%', supporting: won.length + ' of ' + decided.length + ' decided', icon: 'emoji_events', onClick: function () { api.ui({ screen: 'insights' }); } }),
        h(M.StatTile, { label: 'Won this year', value: money(backlog), icon: 'payments', supporting: wonYear.length + ' job' + (wonYear.length === 1 ? '' : 's') })),
      h('div', { className: 'gl-filterbar' },
        h('div', { className: 'm3-row' }, [['all', 'All'], ['open', 'Open'], ['due', 'Due this week'], ['submitted', 'Submitted'], ['won', 'Won'], ['lost', 'Lost']].map(function (f) { return h(M.Chip, { key: f[0], variant: 'filter', label: f[1], selected: filter === f[0], onClick: function () { api.ui({ bidFilter: f[0] }); } }); })),
        h('div', { className: 'm3-row gl-filterbar__right' },
          h(M.Search, { className: 'gl-searchbox', placeholder: 'Find a bid', label: 'Find a bid', value: ui.bidQuery || '', onChange: function (v) { api.ui({ bidQuery: v }); }, trailing: (ui.bidQuery || '') ? h(M.IconButton, { icon: 'close', size: 'xs', label: 'Clear search', onClick: function () { api.ui({ bidQuery: '' }); } }) : null }),
          h(M.Button, { variant: 'filled', icon: 'add', size: 's', onClick: function () { p.openDialog({ kind: 'newbid' }); } }, 'New bid'))),
      h(GL.Grid, { label: 'Bids', columns: cols, rows: rows, density: 'standard', onSelect: function (r) { p.openBid(r.id); },
        empty: { icon: 'post_add', headline: 'No bids yet', body: 'Start with the project name, the owner and the date bids are due. The estimate comes next.', action: h(M.Button, { icon: 'add', onClick: function () { p.openDialog({ kind: 'newbid' }); } }, 'New bid') },
        filtered: { active: filter !== 'all' || !!query, headline: query ? 'No bids match "' + (ui.bidQuery || '').trim() + '"' : 'No ' + ({ open: 'open bids', due: 'bids due this week', submitted: 'submitted bids', won: 'won bids', lost: 'lost bids' }[filter] || 'bids match'), body: query ? 'Check the spelling, try fewer words, or clear the search.' : 'Nothing in this list has that status right now.', onClear: function () { api.ui({ bidFilter: 'all', bidQuery: '' }); }, clearLabel: query ? 'Clear search' : 'Show all bids' } }));
  }

  /* ---------- Estimate screen wrapper ---------- */
  function EstimateScreen(p) {
    var doc = p.doc, ui = p.ui, api = p.api, width = p.width;
    var bidId = ui.bidId || doc.currentBidId;
    var bid = doc.bids.find(function (b) { return b.id === bidId; });
    var contentRef = useRef(null);
    useEffect(function () {
      var el = contentRef.current; if (!el) return;
      el.scrollTop = 0;
      var target = el.querySelector('.gl-pkg.is-focus') || el.querySelector('.m3-grid__tr.is-selected');
      if (target && (ui.focusPackageId || ui.selectedItemId) && target.scrollIntoView) target.scrollIntoView({ block: 'center' });
    }, [ui.tab, bidId, ui.focusPackageId]);
    if (!bid) return h(M.EmptyState, { icon: 'folder_open', headline: 'Pick a bid', body: 'Open a bid from the Bids list to work on its estimate.', action: h(M.Button, { onClick: function () { api.ui({ screen: 'bids' }); } }, 'Go to bids') });
    if (!doc.estimates[bidId]) {
      return h('div', { className: 'gl-screen gl-screen--center' },
        h('div', { className: 'gl-nobid' },
          h(M.StatusChip, { status: bid.status, size: 'm' }),
          h('h2', { className: 'headline-small', style: { margin: '12px 0 4px' } }, bid.name),
          h('div', { className: 'body-medium gl-dim' }, bid.owner + ' · due ' + GL.fmtDate(bid.due) + (bid.dueTime ? ' at ' + bid.dueTime : '') + (bid.total ? ' · ' + GL.fmtMoney(bid.total) : '')),
          bid.lowBid && bid.total ? h('div', { className: 'body-medium gl-dim' }, 'Low bid ' + GL.fmtMoney(bid.lowBid) + ' (' + ((bid.total / bid.lowBid - 1) * 100).toFixed(1) + '% spread)') : null,
          p.demo && ['won', 'lost', 'submitted', 'no-bid'].indexOf(bid.status) >= 0
            ? h(M.EmptyState, { size: 's', icon: 'inventory_2', headline: 'This bid is archived in the sample', body: 'In the real product you would open its estimate, compare it with the actual costs, and copy items into a new bid.' })
            : h(M.EmptyState, { icon: 'post_add', headline: 'No estimate yet', body: 'Start from the owner\'s item list, paste from a spreadsheet, or copy a past bid. You can mix all three.', action: h(Frag, null,
              h(M.Button, { icon: 'upload_file', onClick: function () { p.startEstimate(bidId, 'import'); } }, 'Paste item list'),
              doc.bids.some(function (b) { return b.id !== bidId && doc.estimates[b.id] && doc.estimates[b.id].items && doc.estimates[b.id].items.length; }) ? h(M.Button, { variant: 'tonal', icon: 'content_copy', onClick: function () { p.openDialog({ kind: 'copybid', bidId: bidId }); } }, 'Copy a past bid') : null,
              h(M.Button, { variant: 'outlined', onClick: function () { p.startEstimate(bidId, 'blank'); } }, 'Start blank')) })));
    }
    var d = p.d;
    var tab = ui.tab || 'sheet';
    var tabs = [{ value: 'sheet', label: 'Sheet', icon: 'table_rows' }, { value: 'quotes', label: 'Quotes', icon: 'request_quote', badge: d.packages.reduce(function (a, x) { return a + x.quotes.filter(function (q) { return q.status === 'pending'; }).length; }, 0) || undefined }, { value: 'bidday', label: 'Bid day', icon: 'gavel' }, { value: 'checks', label: 'Checks', icon: 'fact_check', badge: d.errors || undefined }, { value: 'form', label: 'Form', icon: 'description' }];
    var common = { d: d, ui: ui, api: api, demo: p.demo, company: p.company, companyInfo: p.companyInfo, openDialog: p.openDialog, toggleLock: p.toggleLock, deleteItem: p.deleteItem, deleteTask: p.deleteTask, toast: p.toast, canUndo: p.canUndo, canRedo: p.canRedo, setBidStatus: p.setBidStatus, downloadForm: p.downloadForm, focusPackageId: ui.focusPackageId };
    var content = tab === 'sheet' ? h(GL.SheetTab, common) : tab === 'quotes' ? h(GL.QuotesTab, common) : tab === 'bidday' ? h(GL.BidDayTab, common) : tab === 'checks' ? h(GL.ChecksTab, common) : h(GL.FormTab, common);
    var wide = width >= 1200;
    var showPane = wide ? (ui.paneOpen != null ? ui.paneOpen : width >= 1500) : !!ui.paneModal;
    var ds = GL.dueStatus(bid);
    return h('div', { className: 'gl-estimate' + (wide && showPane ? ' has-pane' : '') },
      h('div', { className: 'gl-estimate__main' },
        h('div', { className: 'gl-estimate__head' },
          h('div', { className: 'gl-estimate__titles' },
            h('h1', { className: 'gl-estimate__title' }, bid.name),
            h('div', { className: 'gl-estimate__meta body-small' }, [bid.owner, bid.estimator].filter(Boolean).join(' · ') + ' · ', h(M.StatusChip, { status: bid.status }), ds ? h(M.StatusChip, { status: ds.status, label: ds.label }) : null)),
          h('div', { className: 'gl-estimate__kpis' },
            p.peers && p.peers.length ? h('div', { className: 'gl-peers', title: p.peers.map(function (x) { return x.name; }).join(', ') + ' also here' }, p.peers.slice(0, 3).map(function (x, i) { return h('span', { key: i, className: 'm3-avatar gl-avatar gl-peer' }, x.initials); }), h('span', { className: 'body-small gl-dim' }, p.peers.length === 1 ? p.peers[0].name.split(' ')[0] + ' is here' : p.peers.length + ' others here')) : null,
            h('div', { className: 'gl-kpi gl-kpi--total' }, h('span', { className: 'gl-kpi__label' }, 'Bid total'), h('span', { className: 'gl-kpi__value' }, money(d.totals.bidTotal))),
            h('div', { className: 'gl-kpi' }, h('span', { className: 'gl-kpi__label' }, 'Margin'), h('span', { className: 'gl-kpi__value' }, d.totals.margin.toFixed(1) + '%')),
            h(M.IconButton, { icon: 'edit', label: 'Edit bid details', onClick: function () { p.openDialog({ kind: 'editbid', bidId: bid.id }); } }),
            h(M.IconButton, { icon: showPane ? 'right_panel_close' : 'right_panel_open', label: showPane ? 'Hide summary' : 'Show summary', toggle: true, selected: showPane, onClick: function () { wide ? api.ui({ paneOpen: !showPane }) : api.ui({ paneModal: !showPane }); } }))),
        h(M.Tabs, { tabs: tabs, value: tab, onChange: function (v) { api.ui({ tab: v }); }, label: 'Estimate sections', scrollable: width < 340 }),
        h('div', { ref: contentRef, className: 'gl-estimate__content' + (tab === 'sheet' ? ' gl-estimate__content--fill' : '') }, content)),
      wide && showPane ? h(GL.SidePane, Object.assign({}, common, { stack: p.stack, index: p.index })) : null,
      !wide && showPane ? h(M.SideSheet, { modal: true, headline: 'Summary', onClose: function () { api.ui({ paneModal: false }); } }, h(GL.SidePane, Object.assign({}, common, { stack: p.stack, index: p.index }))) : null);
  }

  /* ---------- Library screen ---------- */
  var SYSTEMS = { qbo: 'QuickBooks Online', qbd: 'QuickBooks Desktop', spectrum: 'Viewpoint Spectrum', vista: 'Viewpoint Vista', sage: 'Sage 300 CRE' };
  GL.SYSTEMS = SYSTEMS;
  var usedBy = GL.usedBy;
  function LibraryScreen(p) {
    var doc = p.doc, ui = p.ui, api = p.api, lib = doc.library;
    var tab = ui.libTab || 'crews';
    var d = p.d;
    var menu = GL.useMenu();
    var q = (ui.libQuery || '').trim().toLowerCase();
    // registers read best in a predictable order, and a search beats scrolling once they grow
    function byName(a, b) { return String(a.name || '').localeCompare(String(b.name || '')); }
    function matches(r) { if (!q) return true; return Object.keys(r).map(function (k) { return r[k]; }).filter(function (v) { return typeof v === 'string'; }).join(' ').toLowerCase().indexOf(q) >= 0; }
    function libFiltered() { return { active: !!q, headline: 'No matches for "' + (ui.libQuery || '').trim() + '"', body: 'Nothing on this tab matches that search.', onClear: function () { api.ui({ libQuery: '' }); }, clearLabel: 'Clear search' }; }
    function remove(kind, rec) {
      var n = usedBy(doc, kind, rec.id);
      if (n) { p.toast(rec.name + ' is used in ' + n + ' place' + (n > 1 ? 's' : '') + '. Change those first, then delete it.'); return; }
      api.update(function (dd) { dd.library[kind] = dd.library[kind].filter(function (x) { return x.id !== rec.id; }); }, { title: 'Deleted ' + rec.name + ' from the library', icon: 'delete' });
      p.toast('Deleted ' + rec.name + '.', 'Undo', api.undo);
    }
    function actions(kind) {
      return { key: 'actions', header: '', width: 40, align: 'center', render: function (r) {
        var rec = lib[kind].find(function (x) { return x.id === r.id; });
        return h(M.IconButton, { icon: 'more_vert', label: 'Actions for ' + r.name, size: 'xs', onClick: function (e) { e.stopPropagation(); menu.open(e, [{ icon: 'edit', label: 'Edit', onClick: function () { p.openDialog({ kind: 'libedit', target: kind, id: r.id }); } }, { divider: true }, { icon: 'delete', label: 'Delete', onClick: function () { remove(kind, rec); } }], 'Actions'); } });
      } };
    }
    // one field on one record; labor and equipment keep `rate` in step with its parts
    function setField(kind, r, key, value) {
      if (value == null || value === '' || isNaN(value)) return;
      if (value < 0) { p.toast('Rates cannot be negative.'); return; }
      var cur = lib[kind].find(function (x) { return x.id === r.id; });
      var names = { wage: 'base wage', burden: 'burden', rate: 'rate', own: 'ownership', op: 'operating cost', fuel: 'fuel', cost: 'cost', hours: 'hours per day' };
      api.update(function (dd) {
        var x = dd.library[kind].find(function (y) { return y.id === r.id; });
        if (kind === 'labor' && key === 'wage' && x.wage == null) x.burden = x.rate && value ? Math.max(0, Math.round((x.rate / value - 1) * 10000) / 100) : 0; // keep today's rate
        if (kind === 'equipment' && (key === 'own' || key === 'op' || key === 'fuel') && x.own == null && x.op == null && x.fuel == null) { x.own = 0; x.op = 0; x.fuel = 0; var rest = key === 'op' ? 'own' : 'op'; x[rest] = Math.max(0, Math.round(((Number(x.rate) || 0) - value) * 100) / 100); } // keep today's rate
        x[key] = value;
        if (kind === 'labor') x.rate = GL.laborRate(x);
        if (kind === 'equipment') x.rate = GL.equipRate(x);
      }, { title: 'Changed ' + cur.name + ' ' + (names[key] || key), detail: key === 'burden' ? (cur.burden || 0) + '% → ' + value + '%' : GL.fmtMoney(cur[key] != null ? cur[key] : 0, 2) + ' → ' + GL.fmtMoney(value, 2), icon: 'price_change' });
      var rateBefore = kind === 'labor' ? GL.laborRate(cur) : kind === 'equipment' ? GL.equipRate(cur) : null;
      var probe = Object.assign({}, cur); if (kind === 'labor' && key === 'wage' && probe.wage == null) probe.burden = probe.rate && value ? Math.max(0, Math.round((probe.rate / value - 1) * 10000) / 100) : 0; if (kind === 'equipment' && (key === 'own' || key === 'op' || key === 'fuel') && probe.own == null && probe.op == null && probe.fuel == null) { probe.own = 0; probe.op = 0; probe.fuel = 0; probe[key === 'op' ? 'own' : 'op'] = Math.max(0, (Number(probe.rate) || 0) - value); } probe[key] = value;
      var rateAfter = kind === 'labor' ? GL.laborRate(probe) : kind === 'equipment' ? GL.equipRate(probe) : null;
      p.toast(rateBefore != null && Math.abs(rateAfter - rateBefore) < 0.005 ? cur.name + ' updated. Its hourly rate stays at ' + GL.fmtMoney(rateBefore, 2) + '.' : cur.name + ' updated. Every estimate that uses it re-priced.', 'Undo', api.undo);
    }
    function libEmptyActions(kind, addLabel) {
      return h(Frag, null,
        h(M.Button, { icon: 'add', onClick: function () { p.openDialog({ kind: 'libedit', target: kind }); } }, addLabel),
        h(M.Button, { variant: 'outlined', icon: 'upload_file', onClick: function () { p.openDialog({ kind: 'import', target: kind }); } }, 'Paste from spreadsheet'));
    }
    var money2 = function (key, header, hint, editable) { return { key: key, header: header, hint: hint, type: 'money', decimals: 2, width: 120, editable: editable, placeholder: '–' }; };
    var grids = {
      crews: h(GL.Grid, { label: 'Crews', density: 'standard', filtered: libFiltered(), rows: lib.crews.slice().sort(byName).map(function (c) { var r = d.crewRates[c.id] || GL.crewRate(c, lib); return { id: c.id, name: c.name, makeup: c.labor.map(function (x) { var l = lib.labor.find(function (y) { return y.id === x[0]; }); return x[1] + ' ' + (l ? l.name.toLowerCase() : '?'); }).join(', '), iron: c.equipment.map(function (x) { var e = lib.equipment.find(function (y) { return y.id === x[0]; }); return x[1] + ' ' + (e ? e.name : '?'); }).join(', '), hours: c.hours || 8, laborDay: r.laborPerDay, equipDay: r.equipPerDay, perDay: r.perDay }; }).filter(matches), columns: [
        { key: 'name', header: 'Crew', width: 150 }, { key: 'makeup', header: 'People', width: 160 }, { key: 'iron', header: 'Equipment', width: 176 },
        { key: 'hours', header: 'Hours/day', type: 'number', width: 80, editable: true }, { key: 'laborDay', header: 'Labor/day', type: 'money', category: 'labor', width: 92 }, { key: 'equipDay', header: 'Equip/day', type: 'money', category: 'equipment', width: 92 }, { key: 'perDay', header: 'Crew/day', type: 'money', width: 92 }, actions('crews')],
        empty: { icon: 'groups', headline: 'No crews yet', body: 'A crew is people plus machines. Add one and the day rate adds up as you build it.', action: h(M.Button, { icon: 'add', onClick: function () { p.openDialog({ kind: 'libedit', target: 'crews' }); } }, 'Add crew') },
        onEdit: function (row, col, value) { if (!(value > 0) || value > 24) { p.toast('Hours per day go from 1 to 24.'); return; } api.update(function (dd) { dd.library.crews.find(function (c) { return c.id === row.id; }).hours = value; }, { title: 'Set ' + row.name + ' to ' + value + ' hours/day', icon: 'schedule' }); } }),
      labor: h(GL.Grid, { label: 'Labor rates', density: 'standard', filtered: libFiltered(), rows: lib.labor.slice().sort(byName).map(function (l) { var rate = GL.laborRate(l); return { id: l.id, name: l.name, wage: l.wage, burden: l.wage != null ? l.burden || 0 : null, rate: rate, day: rate * 8, built: l.wage != null }; }).filter(matches), columns: [
        { key: 'name', header: 'Classification', width: 220 },
        money2('wage', 'Base wage', 'per hour', true),
        { key: 'burden', header: 'Burden', hint: 'taxes, insurance, fringe', type: 'percent', decimals: 1, width: 130, placeholder: '–', editable: function (r) { return r.built; } },
        money2('rate', 'Burdened rate', 'per hour', function (r) { return !r.built; }),
        { key: 'day', header: '8-hour day', type: 'money', width: 110 }, actions('labor')],
        empty: { icon: 'engineering', headline: 'No labor classes yet', body: 'Operators, laborers, foremen: a base wage plus burden, or just the burdened rate.', action: libEmptyActions('labor', 'Add labor class') },
        onEdit: function (row, col, value) { setField('labor', row, col.key, value); } }),
      equipment: h(GL.Grid, { label: 'Equipment rates', density: 'standard', filtered: libFiltered(), rows: lib.equipment.slice().sort(byName).map(function (e) { var rate = GL.equipRate(e); var built = e.own != null || e.op != null || e.fuel != null; return { id: e.id, name: e.name, own: built ? e.own || 0 : null, op: built ? e.op || 0 : null, fuel: built ? e.fuel || 0 : null, rate: rate, day: rate * 8, built: built }; }).filter(matches), columns: [
        { key: 'name', header: 'Machine', width: 220 },
        money2('own', 'Ownership', 'per hour', true), money2('op', 'Operating', 'repairs, wear', true), money2('fuel', 'Fuel', 'per hour', true),
        money2('rate', 'Hourly rate', 'total', function (r) { return !r.built; }),
        { key: 'day', header: '8-hour day', type: 'money', width: 110 }, actions('equipment')],
        empty: { icon: 'agriculture', headline: 'No machines yet', body: 'Ownership, operating and fuel per hour, or just the hourly rate.', action: libEmptyActions('equipment', 'Add machine') },
        onEdit: function (row, col, value) { setField('equipment', row, col.key, value); } }),
      materials: h(GL.Grid, { label: 'Materials', density: 'standard', filtered: libFiltered(), rows: lib.materials.slice().sort(byName).map(function (m) { return { id: m.id, name: m.name, unit: m.unit, cost: m.cost }; }).filter(matches), columns: [{ key: 'name', header: 'Material', width: 260 }, { key: 'unit', header: 'Unit', width: 80, align: 'center' }, { key: 'cost', header: 'Cost', type: 'money', decimals: 2, width: 120, editable: true }, actions('materials')],
        empty: { icon: 'inventory_2', headline: 'No materials yet', body: 'Pipe, base, asphalt: a cost per unit that tasks and quotes can use.', action: libEmptyActions('materials', 'Add material') },
        onEdit: function (row, col, value) { setField('materials', row, 'cost', value); } }),
      vendors: h(GL.Grid, { label: 'Subs and suppliers', density: 'standard', filtered: libFiltered(), rows: lib.vendors.slice().sort(byName).map(function (v) { return { id: v.id, name: v.name, trade: v.trade, kind: v.kind, contact: v.contact, email: v.email, phone: v.phone }; }).filter(matches), columns: [{ key: 'name', header: 'Company', width: 190 }, { key: 'trade', header: 'Trade', width: 150 }, { key: 'kind', header: 'Type', width: 80, render: function (r) { return r.kind === 'supplier' ? 'Supplier' : 'Sub'; } }, { key: 'contact', header: 'Contact', width: 130 }, { key: 'phone', header: 'Phone', width: 120 }, { key: 'email', header: 'Email', width: 200 }, actions('vendors')],
        empty: { icon: 'storefront', headline: 'No subs or suppliers yet', body: 'The companies you get prices from. Their quotes line up side by side on each bid.', action: libEmptyActions('vendors', 'Add company') } })
    };
    var anyEstimate = Object.keys(doc.estimates).some(function (k) { return doc.estimates[k] && doc.estimates[k].items && doc.estimates[k].items.length; });
    var acct = doc.setup && typeof doc.setup.accounting === 'string' ? doc.setup.accounting : null;
    var steps = [
      { label: 'Enter your labor and equipment rates', detail: 'Wage plus burden, or ownership, operating and fuel. Paste them from your spreadsheet', state: lib.labor.length && lib.equipment.length ? 'done' : 'current' },
      { label: 'Build your crews', detail: 'People and machines per crew; the day rate adds up as you go', state: lib.crews.length ? 'done' : lib.labor.length ? 'current' : 'todo' },
      { label: 'Add your subs and suppliers', detail: 'So their quotes line up side by side', state: lib.vendors.length ? 'done' : 'todo' },
      { label: 'Pick your accounting export', detail: acct ? SYSTEMS[acct] : 'QuickBooks Online or Desktop, Spectrum, Vista or Sage', state: acct || (p.demo && doc.setup && doc.setup.accounting) ? 'done' : 'current', action: h(M.Button, { variant: 'tonal', size: 'xs', onClick: function (e) { menu.open(e, Object.keys(SYSTEMS).map(function (k) { return { label: SYSTEMS[k], selected: acct === k, onClick: function () { api.update(function (dd) { dd.setup = Object.assign({}, dd.setup, { accounting: k }); }, { title: 'Set the accounting export to ' + SYSTEMS[k], icon: 'account_balance' }); p.toast('Budget exports default to ' + SYSTEMS[k] + '.'); } }; }), 'Accounting export'); } }, acct ? 'Change' : 'Choose') },
      { label: 'Bid your first job', detail: 'Paste the owner\'s item list or start blank', state: anyEstimate ? 'done' : 'todo' }
    ];
    var allDone = steps.every(function (s) { return s.state === 'done'; });
    var bar = { crews: 'A crew is people plus machines. Change a rate on the Labor or Equipment tab and every crew and estimate follows.', vendors: 'The companies you get prices from. Their quotes go in on each bid\'s Quotes tab.', labor: 'Enter a base wage and burden, or just the burdened rate. Estimates re-price right away; undo if you did not mean it.', equipment: 'Enter ownership, operating and fuel per hour, or just the hourly rate. Estimates re-price right away.', materials: 'Click a cost to change it. Estimates re-price right away; undo if you did not mean it.' }[tab];
    return h('div', { className: 'gl-screen gl-library' },
      menu.node,
      h('div', { className: 'gl-library__main' },
        h(M.Tabs, { variant: 'secondary', value: tab, onChange: function (v) { api.ui({ libTab: v, libQuery: '' }); }, tabs: [{ value: 'crews', label: 'Crews' }, { value: 'labor', label: 'Labor' }, { value: 'equipment', label: 'Equipment' }, { value: 'materials', label: 'Materials' }, { value: 'vendors', label: 'Subs & suppliers' }], scrollable: p.width < 760 }),
        h('div', { className: 'gl-library__bar' },
          h('div', { className: 'body-medium gl-dim' }, bar),
          h('div', { className: 'm3-row' },
            h(M.Search, { className: 'gl-searchbox', placeholder: { crews: 'Find a crew', labor: 'Find a classification', equipment: 'Find a machine', materials: 'Find a material', vendors: 'Find a company' }[tab], label: 'Find in the library', value: ui.libQuery || '', onChange: function (v) { api.ui({ libQuery: v }); }, trailing: (ui.libQuery || '') ? h(M.IconButton, { icon: 'close', size: 'xs', label: 'Clear search', onClick: function () { api.ui({ libQuery: '' }); } }) : null }),
            tab === 'crews' ? null : h(M.Button, { variant: 'outlined', size: 'xs', icon: 'upload_file', onClick: function () { p.openDialog({ kind: 'import', target: tab }); } }, 'Paste from spreadsheet'),
            h(M.Button, { variant: 'tonal', size: 'xs', icon: 'add', onClick: function () { p.openDialog({ kind: 'libedit', target: tab }); } }, { crews: 'Add crew', labor: 'Add labor class', equipment: 'Add machine', materials: 'Add material', vendors: 'Add company' }[tab]))),
        grids[tab]),
      allDone ? null : h('aside', { className: 'gl-library__side' },
        h('div', { className: 'gl-card' }, h(M.SetupSteps, { headline: 'Set up Benchstake', steps: steps }))));
  }

  /* ---------- Insights screen ---------- */
  function InsightsScreen(p) {
    var doc = p.doc, ins = doc.insights;
    var totalBid = ins.bid.reduce(function (a, b) { return a + b; }, 0), totalWon = ins.won.reduce(function (a, b) { return a + b; }, 0);
    var max = Math.max.apply(null, ins.bid.concat([1]));
    var computed = !!ins.computed;
    if (computed && !totalBid) return h('div', { className: 'gl-screen' }, h(M.EmptyState, { icon: 'insights', headline: 'Nothing to show yet', body: 'Win rate, bids by month, unit cost trends and loss reviews fill in as bids are marked submitted, won or lost.' }));
    var W = 640, H = 200, pad = 28, bw = (W - pad * 2) / ins.months.length;
    var chart = h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'gl-chart', role: 'img', 'aria-label': 'Bids submitted and won per month for the last 12 months' },
      [0, 0.5, 1].map(function (f, i) { var y = H - 24 - f * (H - 48); return h('g', { key: i }, h('line', { x1: pad, x2: W - pad, y1: y, y2: y, className: 'gl-chart__grid' }), h('text', { x: pad - 6, y: y + 4, className: 'gl-chart__tick', textAnchor: 'end' }, Math.round(f * max))); }),
      ins.months.map(function (m, i) {
        var x = pad + i * bw + 6, hb = ins.bid[i] / max * (H - 48), hw = ins.won[i] / max * (H - 48);
        return h('g', { key: m },
          h('rect', { x: x, y: H - 24 - hb, width: bw - 12, height: hb, className: 'gl-chart__bid', rx: 3 }),
          h('rect', { x: x, y: H - 24 - hw, width: bw - 12, height: hw, className: 'gl-chart__won', rx: 3 }),
          h('text', { x: x + (bw - 12) / 2, y: H - 8, className: 'gl-chart__tick', textAnchor: 'middle' }, m));
      }));
    return h('div', { className: 'gl-screen' },
      h('div', { className: 'gl-tiles' },
        h(M.StatTile, { label: 'Win rate, 12 months', value: String(totalBid ? Math.round(totalWon / totalBid * 100) : 0), unit: '%', delta: computed ? undefined : 3, deltaUnit: ' pts', deltaDecimals: 0, deltaLabel: 'vs prior year', icon: 'emoji_events' }),
        h(M.StatTile, { label: 'Bids submitted', value: String(totalBid), spark: ins.bid, supporting: 'last 12 months' }),
        h(M.StatTile, { label: 'Jobs won', value: String(totalWon), spark: ins.won }),
        computed ? h(M.StatTile, { label: 'Decided by owner', value: String(ins.byOwner.length), supporting: 'owners with a result' }) : h(M.StatTile, { label: 'Avg margin on won work', value: '9.4', unit: '%', supporting: 'target 9%', tone: 'success' })),
      h('div', { className: 'gl-insights' },
        h(GL.Section, { title: 'Bids and wins by month', subtitle: 'Last 12 months, from your own bids.' },
          chart,
          h('div', { className: 'gl-legend body-small' }, h('span', null, h('i', { className: 'gl-legend__sw gl-legend__sw--bid' }), 'Submitted'), h('span', null, h('i', { className: 'gl-legend__sw gl-legend__sw--won' }), 'Won'))),
        h(GL.Section, { title: 'By owner' },
          h(GL.Grid, { label: 'Results by owner', density: 'standard', rows: ins.byOwner.map(function (o) { return { id: o.owner, owner: o.owner, bid: o.bid, won: o.won, rate: o.won / o.bid * 100, margin: o.margin }; }), columns: [
            { key: 'owner', header: 'Owner', width: 150 }, { key: 'bid', header: 'Bid', type: 'number', width: 60 }, { key: 'won', header: 'Won', type: 'number', width: 60 }, { key: 'rate', header: 'Win rate', type: 'percent', decimals: 0, width: 80 }].concat(computed ? [] : [{ key: 'margin', header: 'Avg margin', type: 'percent', decimals: 1, width: 96 }]), empty: { icon: 'emoji_events', headline: 'No decided bids yet', body: 'Mark bids won or lost on the Bids list and each owner shows up here with a win rate.' } })),
        h(GL.Section, { title: 'Unit cost trend', subtitle: 'Your own bids, so the next estimate starts from what you actually priced.' },
          h(GL.Grid, { label: 'Unit cost trend', density: 'standard', rows: ins.unitTrend.map(function (u) { return { id: u.item, item: u.item, unit: u.unit, bids: u.bids, avg: u.avg, low: u.low, high: u.high }; }), columns: [
            { key: 'item', header: 'Item', width: 150 }, { key: 'unit', header: 'Unit', width: 44, align: 'center' }, { key: 'bids', header: 'Bids', type: 'number', width: 44 }, { key: 'avg', header: 'Avg cost', type: 'money', decimals: 2, width: 80 }, { key: 'low', header: 'Low', type: 'money', decimals: 2, width: 64 }, { key: 'high', header: 'High', type: 'money', decimals: 2, width: 64 }], empty: { icon: 'trending_up', headline: 'No trend yet', body: 'Shows once the same pay item is priced in two or more estimates.' } })),
        h(GL.Section, { title: 'Why we lost' },
          ins.lossReview.length ? h('ul', { className: 'gl-losses' }, ins.lossReview.map(function (l) { return h('li', { key: l.bid }, h('div', { className: 'gl-losses__head' }, h('span', { className: 'title-small' }, l.bid), h(M.StatusChip, { status: 'lost', label: '+' + l.spread + '% over low' })), h('div', { className: 'body-small gl-dim' }, l.note)); })) : h('div', { className: 'body-small gl-dim' }, 'Add the low bid to a lost bid and it shows up here with the spread.'))));
  }

  /* ---------- Settings screen ---------- */
  // Company details and bid defaults live in doc.setup (saved with the library, so the whole team shares them).
  // Theme and field mode are per device, so they stay in ui.
  GL.MCP_URL = (typeof window !== 'undefined' && /^https?:\/\/(localhost|127\.)/.test(window.location.origin) ? window.location.origin : 'https://benchstake.com') + '/api/mcp';
  var BID_DEFAULTS = { overhead: 6, profit: 4, bond: 1.2, tax: 0, targetMargin: 9, dueTime: '2:00 PM' };
  GL.bidDefaults = function (doc) { return Object.assign({}, BID_DEFAULTS, doc.setup && doc.setup.bidDefaults); };
  GL.companyInfo = function (doc) { return Object.assign({ address: '', phone: '', license: '' }, doc.setup && doc.setup.company); };

  // A text field that saves when you leave it (blur or Enter), like the markup fields on Bid day
  function SaveOnBlurField(p) {
    var st = useState(p.value == null ? '' : String(p.value));
    useEffect(function () { st[1](p.value == null ? '' : String(p.value)); }, [p.value]);
    function commit() { if (st[0] !== (p.value == null ? '' : String(p.value))) p.onCommit(st[0]); }
    return h('div', { onBlur: commit, onKeyDown: function (e) { if (e.key === 'Enter' && !p.multiline) { e.preventDefault(); commit(); } else if (e.key === 'Escape') st[1](p.value == null ? '' : String(p.value)); } },
      h(GL.Field, { label: p.label, value: st[0], suffix: p.suffix, prefix: p.prefix, inputMode: p.inputMode, supportingText: p.supportingText, placeholder: p.placeholder, multiline: p.multiline, onChange: st[1], className: p.className || 'gl-field', disabled: p.disabled }));
  }

  function SettingsScreen(p) {
    var doc = p.doc, ui = p.ui, api = p.api, session = p.session || {};
    var defaults = GL.bidDefaults(doc), company = GL.companyInfo(doc);
    var acct = doc.setup && typeof doc.setup.accounting === 'string' ? doc.setup.accounting : '';
    function setDefault(key, raw, label, pct) {
      var v = pct ? Number(String(raw).replace(/[%,\s]/g, '')) : raw;
      if (pct && (isNaN(v) || v < 0 || v > 100)) { p.toast(label + ' is a percent from 0 to 100.'); return; }
      if (!pct) { v = GL.parseTime(raw) || BID_DEFAULTS.dueTime; }
      api.update(function (dd) { dd.setup = Object.assign({}, dd.setup, { bidDefaults: Object.assign({}, dd.setup && dd.setup.bidDefaults, (function () { var o = {}; o[key] = v; return o; })()) }); },
        { title: 'Changed the default ' + label.toLowerCase() + ' for new bids', detail: pct ? defaults[key] + '% → ' + v + '%' : defaults[key] + ' → ' + v, icon: 'tune' });
      p.toast(label + ' default saved. Existing bids keep their own numbers.');
    }
    function setCompany(key, raw, label) {
      api.update(function (dd) { dd.setup = Object.assign({}, dd.setup, { company: Object.assign({}, dd.setup && dd.setup.company, (function () { var o = {}; o[key] = raw.trim(); return o; })()) }); },
        { title: 'Changed the company ' + label.toLowerCase(), icon: 'business' });
      p.toast(label + ' saved. It prints on the bid form.');
    }
    var pct = function (key, label, hint) { return h(SaveOnBlurField, { label: label, value: defaults[key], suffix: '%', inputMode: 'decimal', supportingText: hint, className: 'gl-field gl-field--pct', onCommit: function (v) { setDefault(key, v, label, true); } }); };
    var themes = [{ value: 'system', label: 'System', icon: 'contrast' }, { value: 'light', label: 'Light', icon: 'light_mode' }, { value: 'dark', label: 'Dark', icon: 'dark_mode' }, { value: 'sunlight', label: 'Sunlight', icon: 'wb_sunny' }];
    return h('div', { className: 'gl-screen gl-settings' },
      h(GL.Section, { title: 'Company', subtitle: 'Printed on the bid form and the crew plan.' },
        p.demo
          ? h(GL.Field, { label: 'Company name', value: p.company, disabled: true, supportingText: 'The sample company. Sign in to name your own.' })
          : session.companyPanel || null,
        h('div', { className: 'gl-settings__grid' },
          h(SaveOnBlurField, { label: 'Address', value: company.address, placeholder: '1200 S Main St, Spanish Fork, UT 84660', onCommit: function (v) { setCompany('address', v, 'Address'); } }),
          h(SaveOnBlurField, { label: 'Phone', value: company.phone, inputMode: 'tel', onCommit: function (v) { setCompany('phone', v, 'Phone'); } }),
          h(SaveOnBlurField, { label: 'Contractor license no.', value: company.license, supportingText: 'Most public bid forms ask for it', onCommit: function (v) { setCompany('license', v, 'License number'); } }))),
      h(GL.Section, { title: 'Team', subtitle: 'Owners manage the team and the company. Estimators change anything in bids, estimates and the library. Viewers can look but not change.' },
        p.demo
          ? h('div', { className: 'gl-settings__note' }, h(M.Icon, { name: 'group', size: 24 }), h('div', null, h('div', { className: 'title-small' }, 'Bid with your team'), h('div', { className: 'body-medium gl-dim' }, 'Sign in, set up your company, and invite estimators by email. Everyone sees the same bids, and two people can work on one estimate at once.')))
          : session.teamPanel || null),
      h(GL.Section, { title: 'Bid defaults', subtitle: 'What a new estimate starts with. Change them on Bid day for any one bid; bids you already have keep their own numbers.' },
        h('div', { className: 'gl-settings__grid' },
          pct('overhead', 'Overhead', 'Office, trucks, insurance'), pct('profit', 'Profit', 'On top of overhead'), pct('bond', 'Bond', 'Performance and payment'), pct('tax', 'Material tax', 'Sales tax on materials'),
          pct('targetMargin', 'Target margin', 'Checks warn below this'),
          h(GL.TimeField, { label: 'Bids usually due at', value: defaults.dueTime, onChange: function (v) { if (v) setDefault('dueTime', v, 'Bid time', false); } }))),
      h(GL.Section, { title: 'Exports', subtitle: 'Where the budget export goes. Each bid can still pick another system.' },
        h(GL.Select, { label: 'Accounting system', value: acct, placeholder: 'Choose a system', options: Object.keys(SYSTEMS).map(function (k) { return { value: k, label: SYSTEMS[k] }; }), onChange: function (k) { if (!k) return; api.update(function (dd) { dd.setup = Object.assign({}, dd.setup, { accounting: k }); }, { title: 'Set the accounting export to ' + SYSTEMS[k], icon: 'account_balance' }); p.toast('Budget exports default to ' + SYSTEMS[k] + '.'); } })),
      h(GL.Section, { title: 'Connected AI', subtitle: 'Let Claude, ChatGPT or another AI app read and change your bids as you. Every change it makes shows in the history with your name and can be undone.' },
        h('div', { className: 'gl-settings__note' }, h(M.Icon, { name: 'smart_toy', size: 24 }),
          h('div', { className: 'gl-settings__notebody' },
            h('div', { className: 'title-small' }, 'Add Benchstake as a connector'),
            h('ol', { className: 'body-medium gl-settings__steps' },
              h('li', null, 'In Claude, open Customize › Connectors and choose Add custom connector. In ChatGPT or another app, look for connectors or MCP servers.'),
              h('li', null, 'Paste this address: ', h('code', { className: 'gl-code' }, GL.MCP_URL), h(M.IconButton, { icon: 'content_copy', label: 'Copy the connector address', size: 'xs', onClick: function () { if (navigator.clipboard) navigator.clipboard.writeText(GL.MCP_URL).then(function () { p.toast('Copied.'); }); } })),
              h('li', null, 'When it asks you to sign in, use your Benchstake email and tap Allow.')),
            h('div', { className: 'body-small gl-dim' }, 'Then ask things like "what quotes are still out on SR-7?", or drop in a sub\'s PDF and say "enter this quote on the pipe package."'))),
        p.demo ? h('div', { className: 'body-small gl-dim' }, 'Sign in to connect an AI app to your own company; the sample company can\'t be connected.') : session.aiPanel || null),
      h(GL.Section, { title: 'Appearance', subtitle: 'Saved on this device.' },
        h('div', { className: 'gl-settings__row' },
          h('div', { className: 'gl-settings__label' }, h('div', { className: 'title-small' }, 'Theme'), h('div', { className: 'body-small gl-dim' }, 'Sunlight is a high-contrast look for tablets outdoors.')),
          h(M.SegmentedButton, { label: 'Theme', value: ui.theme || 'system', onChange: function (v) { api.ui({ theme: v }); }, segments: themes })),
        h('div', { className: 'gl-settings__row' },
          h('div', { className: 'gl-settings__label' }, h('div', { className: 'title-small' }, 'Field mode'), h('div', { className: 'body-small gl-dim' }, 'Hides every dollar amount, for a phone or tablet on site. The eye in the top bar does the same.')),
          h(M.Switch, { label: 'Hide dollars', checked: !!ui.fieldMode, onChange: function (v) { api.ui({ fieldMode: v }); } }))),
      h(GL.Section, { title: 'Account' },
        h('div', { className: 'gl-settings__row' },
          h('div', { className: 'body-medium' }, h('span', { className: 'm3-avatar gl-avatar', style: { marginRight: 8, verticalAlign: 'middle' } }, session.initials || 'MR'), (session.name || 'Maya R.'), session.email ? h('span', { className: 'gl-dim' }, ' · ' + session.email) : h('span', { className: 'gl-dim' }, ' · sample sign-in')),
          h('div', { className: 'm3-row' },
            api.reset ? h(M.Button, { variant: 'outlined', icon: 'restart_alt', onClick: function () { api.reset(); p.toast('Sample data reset.'); } }, 'Reset sample data') : null,
            session.onSignOut ? h(M.Button, { variant: 'outlined', icon: 'logout', onClick: session.onSignOut }, 'Sign out') : null)),
        h('div', { className: 'body-small gl-dim' }, h('a', { href: '/privacy', className: 'gl-link', target: '_blank', rel: 'noopener' }, 'Privacy'), ' · ', h('a', { href: '/terms', className: 'gl-link', target: '_blank', rel: 'noopener' }, 'Terms'), ' · ', h('a', { href: 'mailto:support@benchstake.com', className: 'gl-link' }, 'support@benchstake.com'))));
  }

  /* ---------- Dialogs ---------- */
  function NewBidDialog(p) {
    var b = p.bid;
    var base = { name: b ? b.name : '', owner: b ? b.owner : '', type: b ? b.type : 'public', due: b ? b.due : '', dueTime: b ? b.dueTime || p.defaultTime : p.defaultTime, estimator: b ? b.estimator || '' : (p.defaultEstimator || ''), status: b ? b.status : 'draft', location: b ? b.location || '' : '', note: b ? b.note || '' : '', total: b && b.total != null ? String(b.total) : '', lowBid: b && b.lowBid != null ? String(b.lowBid) : '' };
    var f = useState(p.initial ? Object.assign(base, p.initial) : base);
    var v = f[0];
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    var dateOk = GL.validDate(v.due);
    var ok = v.name.trim() && v.owner.trim() && dateOk;
    var errors = (p.d && p.d.errors) || 0;
    var statuses = Object.keys(STATUS_WORD).map(function (k) { return { value: k, label: STATUS_WORD[k] }; });
    var decided = v.status === 'won' || v.status === 'lost' || v.status === 'submitted';
    return h(M.Dialog, { headline: p.headline || (b ? 'Edit bid' : 'New bid'), icon: p.headlineIcon || (b ? 'edit' : 'post_add'), onClose: p.onClose, className: 'gl-dialog--wide', actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () {
        var out = { name: v.name.trim(), owner: v.owner.trim(), type: v.type, due: v.due, dueTime: v.dueTime.trim() || p.defaultTime, estimator: v.estimator.trim(), status: v.status, location: v.location.trim(), note: v.note.trim() };
        out.total = v.total !== '' && !isNaN(GL.toNum(v.total)) ? GL.toNum(v.total) : undefined;
        out.lowBid = v.lowBid !== '' && !isNaN(GL.toNum(v.lowBid)) ? GL.toNum(v.lowBid) : undefined;
        p.onSave(out);
      } }, b ? 'Save' : (p.cta || 'Create'))) },
      h('div', { className: 'gl-dialog__form' },
        p.notice ? h(M.Banner, { tone: 'info', compact: true }, p.notice) : null,
        h(GL.Field, { label: 'Project name', value: v.name, onChange: function (x) { set('name', x); }, required: true }),
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Field, { label: 'Owner / agency', value: v.owner, onChange: function (x) { set('owner', x); }, required: true }),
          h(GL.Field, { label: 'Location', value: v.location, onChange: function (x) { set('location', x); } })),
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Select, { label: 'Work type', value: v.type, options: [{ value: 'public', label: 'Public (unit price)' }, { value: 'private', label: 'Private' }], onChange: function (x) { set('type', x); } }),
          h(GL.Field, { label: 'Estimator', value: v.estimator, onChange: function (x) { set('estimator', x); }, className: 'gl-field gl-field--short' }),
          b ? h(GL.Select, { label: 'Status', value: v.status, options: statuses, onChange: function (x) { set('status', x); } }) : null),
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.DateField, { label: 'Bids due', value: v.due, supportingText: 'Date the owner opens bids', onChange: function (x) { set('due', x); }, required: true }),
          h(GL.TimeField, { label: 'Time', value: v.dueTime, onChange: function (x) { set('dueTime', x); } })),
        b && v.status === 'submitted' && errors ? h(M.Banner, { tone: 'warning', compact: true }, errors + ' check' + (errors > 1 ? 's have' : ' has') + ' not cleared on this bid. Marking it submitted here skips them.') : null,
        b && decided ? h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Field, { label: 'Bid total (as submitted)', prefix: '$', value: v.total, inputMode: 'decimal', onChange: function (x) { set('total', x); }, supportingText: p.hasEstimate ? 'Leave blank to use the estimate' : '' }),
          v.status === 'lost' ? h(GL.Field, { label: 'Low bid', prefix: '$', value: v.lowBid, inputMode: 'decimal', onChange: function (x) { set('lowBid', x); }, supportingText: 'Shows the spread on Insights' }) : null) : null,
        b ? h(GL.Field, { label: 'Note', value: v.note, onChange: function (x) { set('note', x); }, placeholder: 'What to remember about this one' }) : null));
  }

  function ItemDialog(p) {
    var it = p.item || { code: '', name: '', unit: 'LF', qty: '' };
    var f = useState({ code: it.code, name: it.name, unit: it.unit, qty: it.qty === '' ? '' : String(it.qty) });
    var v = f[0];
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    var qtyN = GL.toNum(v.qty), qtyBad = v.qty !== '' && (isNaN(qtyN) || qtyN < 0);
    var ok = v.name.trim() && v.qty !== '' && !qtyBad;
    return h(M.Dialog, { headline: p.item ? 'Edit pay item' : 'Add pay item', onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () { p.onSave({ code: v.code.trim(), name: v.name.trim(), unit: v.unit.trim().toUpperCase() || 'EA', qty: qtyN }); } }, p.item ? 'Save' : 'Add')) },
      h('div', { className: 'gl-dialog__form' },
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Field, { label: 'Item code', value: v.code, onChange: function (x) { set('code', x); }, className: 'gl-field gl-field--short' }),
          h(GL.Field, { label: 'Unit', value: v.unit, onChange: function (x) { set('unit', x); }, className: 'gl-field gl-field--short', supportingText: 'CY, TON, LF, SY, EA, LS, AC' })),
        h(GL.Field, { label: 'Description', value: v.name, onChange: function (x) { set('name', x); }, required: true }),
        h(GL.Field, { label: 'Bid quantity', value: v.qty, inputMode: 'decimal', onChange: function (x) { set('qty', x); }, required: true, error: qtyBad, supportingText: qtyBad ? 'Enter a number of zero or more' : '' })));
  }

  function TaskDialog(p) {
    var lib = p.doc.library, est = p.doc.estimates[p.doc.currentBidId];
    var t = p.task || { name: '', type: 'crew', crewId: lib.crews[0] && lib.crews[0].id, production: '', matId: lib.materials[0] && lib.materials[0].id, per: '1', packageId: est.packages[0] && est.packages[0].id, plug: '', amount: '', perUnit: '' };
    var f = useState({ name: t.name || '', type: t.type, crewId: t.crewId || (lib.crews[0] && lib.crews[0].id), production: t.production != null ? String(t.production) : '', matId: t.matId || (lib.materials[0] && lib.materials[0].id), per: t.per != null ? String(t.per) : '1', packageId: t.packageId || '', plug: t.plug != null ? String(t.plug) : '', amount: t.amount != null ? String(t.amount) : '', perUnit: t.perUnit != null ? String(t.perUnit) : '', otherMode: t.amount != null ? 'lump' : 'per' });
    var v = f[0];
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    var item = est.items.find(function (i) { return i.id === p.itemId; });
    var N = GL.toNum;
    var crewPicked = !!lib.crews.find(function (c) { return c.id === v.crewId; }), matPicked = !!lib.materials.find(function (m) { return m.id === v.matId; });
    var ok = v.name.trim() && (v.type === 'crew' ? crewPicked && N(v.production) > 0 : v.type === 'material' ? matPicked && N(v.per) >= 0 : v.type === 'sub' ? ((v.plug !== '' && N(v.plug) >= 0) || v.packageId) : (v.otherMode === 'lump' ? N(v.amount) > 0 : N(v.perUnit) > 0));
    var crewRate = v.type === 'crew' && crewPicked ? GL.crewRate(lib.crews.find(function (c) { return c.id === v.crewId; }), lib) : null;
    var goLibrary = function (tab) { return h(M.Banner, { tone: 'info', compact: true, actions: h(M.Button, { variant: 'text', size: 'xs', onClick: function () { p.onClose(); p.goLibrary(tab); } }, 'Open the library') }, tab === 'crews' ? 'No crews yet. Build one in the library first: people and machines, and the day rate adds up.' : 'No materials yet. Add them in the library first.'); };
    return h(M.Dialog, { headline: (p.task ? 'Edit task' : 'Add task') + (item ? ' · ' + GL.itemLabel(item, 24) : ''), onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () {
        var out = { name: v.name.trim(), type: v.type };
        if (v.type === 'crew') { out.crewId = v.crewId; out.production = N(v.production); }
        else if (v.type === 'material') { out.matId = v.matId; out.per = N(v.per); }
        else if (v.type === 'sub') { out.packageId = v.packageId || null; out.plug = v.plug === '' ? null : N(v.plug); }
        else if (v.otherMode === 'lump') out.amount = N(v.amount); else out.perUnit = N(v.perUnit);
        p.onSave(out);
      } }, p.task ? 'Save' : 'Add')) },
      h('div', { className: 'gl-dialog__form' },
        h(M.SegmentedButton, { label: 'Task type', value: v.type, onChange: function (x) { set('type', x); }, segments: [{ value: 'crew', label: 'Crew', icon: 'groups' }, { value: 'material', label: 'Material', icon: 'inventory_2' }, { value: 'sub', label: 'Sub / supplier', icon: 'request_quote' }, { value: 'other', label: 'Other', icon: 'receipt_long' }] }),
        h(GL.Field, { label: 'Task', value: v.name, onChange: function (x) { set('name', x); }, required: true, placeholder: v.type === 'crew' ? 'Excavate and haul' : v.type === 'material' ? 'Base material' : v.type === 'sub' ? 'Pipe supply' : 'Dump fees' }),
        v.type === 'crew' ? (lib.crews.length ? h(Frag, null,
          h(GL.Select, { label: 'Crew', value: v.crewId, options: lib.crews.map(function (c) { return { value: c.id, label: c.name }; }), onChange: function (x) { set('crewId', x); }, supporting: crewRate ? GL.fmtMoney(crewRate.perDay) + ' per ' + crewRate.hours + '-hour day, ' + GL.peopleWord(crewRate.people) : '' }),
          h(GL.Field, { label: 'Production', value: v.production, inputMode: 'decimal', suffix: (item ? item.unit : 'units') + ' / day', onChange: function (x) { set('production', x); }, required: true, supportingText: item && N(v.production) > 0 && crewRate ? GL.fmtNum(item.qty / N(v.production), 1) + ' crew days · ' + GL.fmtMoney(item.qty / N(v.production) * crewRate.perDay) : 'How much the crew finishes in a day' })) : goLibrary('crews')) : null,
        v.type === 'material' ? (lib.materials.length ? h(Frag, null,
          h(GL.Select, { label: 'Material', value: v.matId, options: lib.materials.map(function (m) { return { value: m.id, label: m.name + ' · ' + GL.fmtMoney(m.cost, 2) + '/' + m.unit }; }), onChange: function (x) { set('matId', x); } }),
          h(GL.Field, { label: 'Quantity per ' + (item ? item.unit : 'unit'), value: v.per, inputMode: 'decimal', onChange: function (x) { set('per', x); }, supportingText: 'Conversion from bid units to material units; waste included' })) : goLibrary('materials')) : null,
        v.type === 'sub' ? h(Frag, null,
          h(GL.Select, { label: 'Quote package', value: v.packageId, placeholder: 'No package (plug only)', options: est.packages.map(function (k) { return { value: k.id, label: k.name }; }), onChange: function (x) { set('packageId', x); } }),
          h(GL.Field, { label: 'Plug', value: v.plug, prefix: '$', suffix: '/ ' + (item ? item.unit : 'unit'), inputMode: 'decimal', onChange: function (x) { set('plug', x); }, supportingText: 'Used until a quote is picked' })) : null,
        v.type === 'other' ? h(Frag, null,
          h(M.SegmentedButton, { density: 'dense', label: 'Amount', value: v.otherMode, onChange: function (x) { set('otherMode', x); }, segments: [{ value: 'per', label: 'Per unit' }, { value: 'lump', label: 'Lump sum' }] }),
          v.otherMode === 'lump' ? h(GL.Field, { label: 'Lump sum', prefix: '$', value: v.amount, inputMode: 'decimal', onChange: function (x) { set('amount', x); } }) : h(GL.Field, { label: 'Cost per ' + (item ? item.unit : 'unit'), prefix: '$', value: v.perUnit, inputMode: 'decimal', onChange: function (x) { set('perUnit', x); } })) : null));
  }

  /* ---------- Paste and file import ---------- */
  var UNIT_RE = /^(CY|SY|SF|LF|TON|TONS|EA|EACH|LS|LUMP|AC|ACRE|GAL|HR|DAY|DAYS|MO|WK|LB|LBS|CF|MI|STA|M|M2|M3|KG|L|MGAL|CWT|SQ|VF|LNFT|SQYD|CUYD)$/i;
  function isNum(s) { return s != null && /^\(?-?\$?[\d,]*\.?\d+%?\)?$/.test(String(s).trim()); }
  function toNum(s) { return Number(String(s).replace(/[$,()%\s]/g, '')); }
  GL.toNum = function (s) { if (s == null) return NaN; var t = String(s).trim(); if (t === '' || !isNum(t)) return NaN; return toNum(t); };
  function isUnit(s) { return s != null && (UNIT_RE.test(String(s).trim()) || /^[A-Z]{1,4}\.?$/.test(String(s).trim())); }
  function csvSplit(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  function splitLine(l) {
    if (l.indexOf('\t') >= 0) return l.split('\t');
    if (l.indexOf(',') >= 0 && (l.indexOf('"') >= 0 || l.split(',').length >= 3)) return csvSplit(l);
    if (/\S\s{2,}\S/.test(l)) return l.split(/\s{2,}/);
    return null; // single spaces only: handled word by word
  }
  var HEADS = {
    code: /^(item|item ?(no|#|number|code)|code|no\.?|number|bid item|pay item)$/i, name: /^(description|desc|name|item description|classification|class|machine|equipment|material|company|vendor)$/i,
    qty: /^(qty|quantity|quan|est\.? ?qty|estimated quantity|bid qty)$/i, unit: /^(unit|units|um|uom|u\/m)$/i,
    wage: /^(wage|base wage|base rate|base|straight time|st rate)$/i, burden: /^(burden|burden ?%|burden percent|fringe|fringe ?%)$/i, rate: /^(rate|hourly|hourly rate|burdened rate|cost|total|price|unit cost)$/i,
    own: /^(own|ownership|owning|owner ?ship cost)$/i, op: /^(op|operating|operating cost|maint|maintenance|repair|repairs)$/i, fuel: /^(fuel|fuel cost)$/i,
    trade: /^(trade|scope)$/i, contact: /^(contact|name of contact|estimator)$/i, email: /^(email|e-mail)$/i, phone: /^(phone|tel|telephone|cell)$/i
  };
  function headerMap(parts) {
    var map = {}, hits = 0;
    parts.forEach(function (s, i) { var t = String(s).trim().replace(/[:*]+$/, ''); Object.keys(HEADS).forEach(function (k) { if (map[k] == null && HEADS[k].test(t)) { map[k] = i; hits++; } }); });
    return hits >= 2 ? map : null;
  }
  // Returns { rows, skipped, dupes }. Items: code, name, qty, unit. Rates: name plus whichever of wage, burden, rate, own, op, fuel, unit were given.
  GL.parsePaste = function (text, target, existingCodes) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, ''); }).filter(function (l) { return l.trim(); });
    var rows = [], skipped = [], map = null;
    lines.forEach(function (l, li) {
      var parts = splitLine(l);
      if (li === 0 || !map) { var hm = parts ? headerMap(parts) : null; if (hm) { map = hm; return; } }
      if (target === 'items') {
        var code = '', name = '', qty = NaN, unit = 'EA';
        var fits = map && parts && map.qty != null && parts.length > Math.max(map.qty, map.name != null ? map.name : 0) && isNum(parts[map.qty]);
        if (fits) {
          code = map.code != null ? String(parts[map.code] || '').trim() : '';
          name = String(map.name != null ? parts[map.name] || '' : '').trim();
          qty = toNum(parts[map.qty]); unit = map.unit != null && String(parts[map.unit] || '').trim() ? String(parts[map.unit]).trim().toUpperCase() : 'EA';
          if (!name && code && map.name == null) { name = code; code = ''; }
        } else {
          var tok = parts ? parts.map(function (s) { return s.trim(); }).filter(Boolean) : l.trim().split(/\s+/);
          var qi = -1;
          for (var i = tok.length - 2; i >= 1; i--) { if (isNum(tok[i]) && isUnit(tok[i + 1])) { qi = i; break; } } // quantity and unit sit at the end; "36 IN RCP" earlier is a size
          if (qi < 0 && isNum(tok[tok.length - 1]) && tok.length >= 2) qi = tok.length - 1;
          if (qi >= 1) {
            qty = toNum(tok[qi]); if (tok[qi + 1] && isUnit(tok[qi + 1])) unit = tok[qi + 1].replace(/\.$/, '').toUpperCase();
            var head = tok.slice(0, qi);
            if (head.length >= 2 && /\d/.test(head[0]) && /^[0-9A-Z][0-9A-Z.\-]*$/i.test(head[0]) && !(isNum(head[0]) && isUnit(head[1]))) code = head.shift();
            name = head.join(' ');
          }
        }
        if (!name || isNaN(qty)) { skipped.push(l.trim()); return; }
        rows.push({ code: code, name: name, qty: qty, unit: unit });
      } else {
        var cells = parts ? parts.map(function (s) { return s.trim(); }) : null;
        var rec = {};
        if (map && cells) {
          ['wage', 'burden', 'rate', 'own', 'op', 'fuel'].forEach(function (k) { if (map[k] != null && isNum(cells[map[k]])) rec[k] = toNum(String(cells[map[k]]).replace('%', '')); });
          ['unit', 'trade', 'contact', 'email', 'phone'].forEach(function (k) { if (map[k] != null && cells[map[k]]) rec[k] = cells[map[k]]; });
          rec.name = map.name != null ? cells[map.name] : cells.filter(function (c) { return c && !isNum(c); })[0];
          if (target === 'vendors' && rec.name) { rows.push(rec); return; }
        } else if (target === 'vendors') {
          var vc = cells || l.split(/\s{2,}/);
          if (vc[0]) { rows.push({ name: vc[0], trade: vc[1] || '', contact: vc[2] || '', email: vc[3] || '', phone: vc[4] || '' }); return; }
        } else {
          var t2 = cells ? cells.filter(Boolean) : l.trim().split(/\s+/);
          var last = t2[t2.length - 1];
          if (isNum(last)) {
            rec.rate = toNum(last);
            var nm = t2.slice(0, -1).join(' ');
            var um = nm.match(/\s(TON|CY|LF|SY|EA|GAL|AC|LS)$/i); if (um) { rec.unit = um[1].toUpperCase(); nm = nm.slice(0, um.index); }
            rec.name = nm;
          }
        }
        var hasNumber = ['wage', 'rate', 'own', 'op', 'fuel'].some(function (k) { return rec[k] != null && !isNaN(rec[k]); });
        if (!rec.name || !hasNumber) { skipped.push(l.trim()); return; }
        rows.push(rec);
      }
    });
    var seen = {}, dupes = [];
    (existingCodes || []).forEach(function (c) { if (c) seen[c] = true; });
    if (target === 'items') rows.forEach(function (r) { if (r.code && seen[r.code]) dupes.push(r.code); if (r.code) seen[r.code] = true; });
    return { rows: rows, skipped: skipped, dupes: dupes };
  };
  function ImportDialog(p) {
    var target = p.target === 'items' || !p.target ? 'items' : p.target;
    var sample = target === 'items' ? 'Item\tDescription\tQty\tUnit\n02316\tRoadway excavation\t18400\tCY\n02721\tUntreated base course\t9800\tTON' : target === 'labor' ? 'Classification\tWage\tBurden\nForeman\t42.50\t38\nOperator\t38.00\t38' : target === 'equipment' ? 'Machine\tOwnership\tOperating\tFuel\nDozer D6\t62\t28\t31\nExcavator 336\t78\t32\t36' : target === 'materials' ? 'Material\tUnit\tCost\nReady-mix 4000 psi\tCY\t168\nTack coat\tGAL\t3.20' : 'Company\tTrade\tContact\tEmail\tPhone';
    var txt = useState('');
    var existing = target === 'items' && p.items ? p.items.map(function (i) { return i.code; }) : [];
    var res = GL.parsePaste(txt[0], target, existing);
    var parsed = res.rows;
    var label = { items: 'pay items', labor: 'labor classes', equipment: 'machines', materials: 'materials', vendors: 'companies' }[target];
    var fileErr = useState(null);
    var fileName = useState('');
    function onFile(e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      fileErr[1](null); fileName[1](file.name);
      GL.readSpreadsheet(file).then(function (text) { txt[1](text); }, function (err) { fileErr[1]('Could not read that file: ' + (err && err.message ? err.message : err)); });
      e.target.value = '';
    }
    var cols = target === 'items' ? [{ key: 'code', header: 'Code', width: 90 }, { key: 'name', header: 'Description', width: 260 }, { key: 'qty', header: 'Qty', type: 'number', decimals: 2, width: 100 }, { key: 'unit', header: 'Unit', width: 70, align: 'center' }]
      : target === 'vendors' ? [{ key: 'name', header: 'Company', width: 200 }, { key: 'trade', header: 'Trade', width: 140 }, { key: 'contact', header: 'Contact', width: 130 }, { key: 'email', header: 'Email', width: 180 }]
      : [{ key: 'name', header: 'Name', width: 220 }].concat(target === 'labor' ? [{ key: 'wage', header: 'Wage', type: 'money', decimals: 2, width: 90, placeholder: '–' }, { key: 'burden', header: 'Burden %', type: 'number', decimals: 1, width: 90, placeholder: '–' }]
        : target === 'equipment' ? [{ key: 'own', header: 'Own', type: 'money', decimals: 2, width: 80, placeholder: '–' }, { key: 'op', header: 'Operating', type: 'money', decimals: 2, width: 90, placeholder: '–' }, { key: 'fuel', header: 'Fuel', type: 'money', decimals: 2, width: 80, placeholder: '–' }]
        : [{ key: 'unit', header: 'Unit', width: 70, align: 'center' }]).concat([{ key: 'rate', header: target === 'materials' ? 'Cost' : 'Rate', type: 'money', decimals: 2, width: 100, placeholder: '–' }]);
    var previewRows = parsed.map(function (r, i) { var o = Object.assign({ id: i }, r); if (target === 'labor' && r.wage != null) o.rate = GL.laborRate(r); if (target === 'equipment' && (r.own != null || r.op != null || r.fuel != null)) o.rate = GL.equipRate(r); return o; });
    return h(M.Dialog, { headline: 'Import ' + label + ' from a spreadsheet', icon: 'content_paste', onClose: p.onClose, className: 'gl-dialog--wide', actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !parsed.length, onClick: function () { p.onImport(parsed, target); } }, 'Add ' + (parsed.length || '') + ' ' + (parsed.length === 1 ? { items: 'pay item', labor: 'labor class', equipment: 'machine', materials: 'material', vendors: 'company' }[target] : label))) },
      h('div', { className: 'gl-dialog__form' },
        h('div', { className: 'body-medium' }, target === 'items' ? 'Choose an Excel or CSV file, or copy the rows from Excel or the owner\'s PDF and paste them below. A header row (Item, Description, Qty, Unit) lines the columns up; without one, each line needs a description, a quantity and a unit.' : 'Choose an Excel or CSV file, or copy the rows from your spreadsheet and paste them below. A header row lines the columns up' + (target === 'labor' ? ' (Classification, Wage, Burden, or Rate)' : target === 'equipment' ? ' (Machine, Ownership, Operating, Fuel, or Rate)' : target === 'materials' ? ' (Material, Unit, Cost)' : ' (Company, Trade, Contact, Email, Phone)') + '.'),
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h('label', { className: 'm3-btn m3-btn--tonal m3-btn--s m3-btn--round gl-filebtn' }, h(M.Icon, { name: 'upload_file', size: 20 }), ' Choose file (.xlsx, .csv)', h('input', { type: 'file', accept: '.xlsx,.xls,.csv,.txt', onChange: onFile, style: { position: 'absolute', opacity: 0, width: 1, height: 1 } })),
          fileName[0] ? h('span', { className: 'body-small gl-dim' }, fileName[0]) : null),
        fileErr[0] ? h(M.Banner, { tone: 'error', compact: true }, fileErr[0]) : null,
        h('textarea', { className: 'gl-textarea', rows: 7, value: txt[0], placeholder: sample, 'aria-label': 'Rows to import', onChange: function (e) { txt[1](e.target.value); } }),
        txt[0] && !parsed.length ? h(M.Banner, { tone: 'warning', compact: true }, 'Nothing read yet. Each line needs a name and a number' + (target === 'items' ? ' and a unit' : '') + ', or add a header row.') : null,
        res.skipped.length && parsed.length ? h(M.Banner, { tone: 'warning', compact: true }, res.skipped.length + ' line' + (res.skipped.length > 1 ? 's' : '') + ' skipped: ' + res.skipped.slice(0, 3).map(function (s) { return '"' + (s.length > 40 ? s.slice(0, 40) + '…' : s) + '"'; }).join(', ') + (res.skipped.length > 3 ? ' and more' : '') + '.') : null,
        res.dupes.length ? h(M.Banner, { tone: 'warning', compact: true }, 'Item code' + (res.dupes.length > 1 ? 's ' : ' ') + res.dupes.slice(0, 5).join(', ') + (res.dupes.length > 1 ? ' appear' : ' appears') + ' twice. Check them after adding.') : null,
        parsed.length ? h(M.DataGrid, { label: 'Preview', density: 'dense', rows: previewRows, columns: cols }) : null));
  }

  /* ---------- Copy a past bid ---------- */
  function CopyBidDialog(p) {
    var opts = p.doc.bids.filter(function (b) { return b.id !== p.bidId && p.doc.estimates[b.id] && p.doc.estimates[b.id].items && p.doc.estimates[b.id].items.length; })
      .map(function (b) { return { value: b.id, label: b.name + ' · ' + p.doc.estimates[b.id].items.length + ' items' }; });
    var sel = useState(opts[0] ? opts[0].value : '');
    return h(M.Dialog, { headline: 'Copy a past bid', icon: 'content_copy', onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !sel[0], onClick: function () { p.onCopy(sel[0]); } }, 'Copy items')) },
      h('div', { className: 'gl-dialog__form' },
        opts.length ? h(GL.Select, { label: 'Copy pay items and tasks from', value: sel[0], options: opts, onChange: sel[1] }) : h('div', { className: 'body-medium' }, 'No other bid has an estimate yet.'),
        h('div', { className: 'body-small gl-dim' }, 'Quantities, crews and production rates come across. Quotes and locked prices do not; set them for this bid.')));
  }

  /* ---------- Quote packages and quotes ---------- */
  function PackageDialog(p) {
    var est = p.doc.estimates[p.doc.currentBidId], lib = p.doc.library;
    var f = useState({ name: '', itemIds: [], vendorIds: [] });
    var v = f[0];
    function toggle(k, id) { var o = Object.assign({}, v); o[k] = v[k].indexOf(id) >= 0 ? v[k].filter(function (x) { return x !== id; }) : v[k].concat([id]); f[1](o); }
    var ok = v.name.trim() && v.itemIds.length;
    var inPkg = {}; est.packages.forEach(function (pk) { pk.lines.forEach(function (l) { inPkg[l.itemId] = pk.name; }); });
    return h(M.Dialog, { headline: 'New quote package', icon: 'request_quote', onClose: p.onClose, className: 'gl-dialog--wide', actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () { p.onSave(v); } }, 'Create package')) },
      h('div', { className: 'gl-dialog__form' },
        h(GL.Field, { label: 'Package name', value: v.name, onChange: function (x) { f[1](Object.assign({}, v, { name: x })); }, placeholder: 'Guardrail', required: true }),
        h('div', { className: 'label-medium gl-dim' }, 'Pay items in this package'),
        est.items.length ? h('div', { className: 'gl-checklist' }, est.items.map(function (it) { return h(M.Checkbox, { key: it.id, label: (it.code ? it.code + ' ' : '') + it.name + ' · ' + GL.fmtNum(it.qty) + ' ' + it.unit + (inPkg[it.id] ? ' · already in ' + inPkg[it.id] : ''), disabled: !!inPkg[it.id], checked: v.itemIds.indexOf(it.id) >= 0, onChange: function () { toggle('itemIds', it.id); } }); })) : h('div', { className: 'body-small gl-dim' }, 'Add pay items first.'),
        h('div', { className: 'label-medium gl-dim' }, 'Expecting quotes from (optional)'),
        lib.vendors.length ? h('div', { className: 'gl-checklist' }, lib.vendors.map(function (vd) { return h(M.Checkbox, { key: vd.id, label: vd.name + (vd.trade ? ' · ' + vd.trade : ''), checked: v.vendorIds.indexOf(vd.id) >= 0, onChange: function () { toggle('vendorIds', vd.id); } }); })) : h('div', { className: 'body-small gl-dim' }, 'No subs or suppliers in the library yet. You can add a company when you enter its quote.'),
        h('div', { className: 'body-small gl-dim' }, 'Each pay item gets a sub task priced at your plug until you pick a quote. Enter quotes as they come in by phone or email.')));
  }

  function QuoteDialog(p) {
    var pkg = p.pkg, q = p.quote, lib = p.doc.library;
    var NEW = '__new';
    var init = { vendorId: q ? q.vendorId || NEW : (lib.vendors.length ? '' : NEW), newName: q && !q.vendorId ? q.vendorName || '' : '', newTrade: '', mode: q && q.lump != null ? 'lump' : 'unit', lump: q && q.lump != null ? String(q.lump) : '', prices: {}, lineQty: q && q.lineQty ? q.lineQty : {}, note: q && q.note ? q.note : '' };
    pkg.lines.forEach(function (l) { var up = q && q.lump == null && q.unitPrices ? q.unitPrices[l.itemId] : null; init.prices[l.itemId] = up != null ? String(up) : ''; });
    var f = useState(init);
    var v = f[0];
    var fRef = useRef(v); fRef.current = v;
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    function setPrice(id, val) { var pr = Object.assign({}, v.prices); pr[id] = val; set('prices', pr); }
    // Reading a quote document (PDF, photo or pasted text) fills the fields in; nothing saves until Save quote.
    var reading = useState(p.read ? 'busy' : null);
    var readNote = useState(null);
    var pasteOpen = useState(false), pasteText = useState('');
    var uncertain = useState({});
    async function readFrom(opts) {
      reading[1]('busy'); readNote[1](null);
      try {
        var token = p.getToken ? await p.getToken() : null;
        var r = await p.readQuote(Object.assign({ pkg: pkg, vendors: lib.vendors, token: token }, opts));
        var cur = fRef.current, o = Object.assign({}, cur, { prices: Object.assign({}, cur.prices), lineQty: Object.assign({}, cur.lineQty) });
        var vname = (r.vendor || '').trim(); var known = vname ? lib.vendors.find(function (x) { return x.name.toLowerCase() === vname.toLowerCase(); }) : null;
        if (known) o.vendorId = known.id; else if (vname) { o.vendorId = NEW; o.newName = vname; }
        var unc = {};
        if (r.lines && r.lines.length) { o.mode = 'unit'; r.lines.forEach(function (l) { o.prices[l.item_id] = String(l.unit_price); if (l.qty != null) o.lineQty[l.item_id] = l.qty; if (l.certain === false) unc[l.item_id] = l.quoted_as || 'check this one'; }); }
        else if (r.lump_sum != null) { o.mode = 'lump'; o.lump = String(r.lump_sum); }
        var notes = [].concat(r.exclusions || []).concat((r.unmatched || []).map(function (u) { return 'Not matched: ' + u.description + (u.unit_price != null ? ' @ ' + GL.fmtMoney(u.unit_price, 2) : u.amount != null ? ' ' + GL.fmtMoney(u.amount) : ''); }));
        if (notes.length) o.note = (o.note ? o.note + ' · ' : '') + notes.join(' · ');
        f[1](o); uncertain[1](unc);
        var priced = (r.lines || []).length, probs = (r.problems || []);
        var qtyOff = pkg.lines.some(function (l) { return o.lineQty[l.itemId] != null && Math.abs(o.lineQty[l.itemId] - l.qty) / (l.qty || 1) > 0.02; });
        readNote[1]({ tone: !r.is_quote ? 'warning' : probs.length || Object.keys(unc).length || qtyOff ? 'warning' : 'success',
          text: !r.is_quote ? 'That does not look like a price quote. Check what came through before saving.'
            : 'Read from ' + (opts.file ? opts.file.name : 'the pasted text') + ': ' + (r.lump_sum != null && !priced ? 'one lump sum' : priced + ' of ' + pkg.lines.length + ' item' + (pkg.lines.length === 1 ? '' : 's') + ' priced') + (r.unmatched && r.unmatched.length ? ', ' + r.unmatched.length + ' line' + (r.unmatched.length === 1 ? '' : 's') + ' not matched (in the notes)' : '') + '. Check the numbers against the quote before saving.' + (probs.length ? ' ' + probs.join(' ') : '') });
      } catch (e) { readNote[1]({ tone: 'error', text: e.message || 'Could not read that.' }); }
      reading[1](null);
    }
    useEffect(function () { if (p.read) readFrom(p.read); }, []);
    function onFile(e) { var file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) readFrom({ file: file }); }
    var N = GL.toNum;
    var total = v.mode === 'lump' ? N(v.lump) || 0 : pkg.lines.reduce(function (a, l) { var n = N(v.prices[l.itemId]); return a + (!isNaN(n) ? n * l.qty : 0); }, 0);
    var filled = pkg.lines.filter(function (l) { return !isNaN(N(v.prices[l.itemId])); }).length;
    var badPrice = pkg.lines.some(function (l) { return v.prices[l.itemId] !== '' && (isNaN(N(v.prices[l.itemId])) || N(v.prices[l.itemId]) < 0); });
    var vendorOk = v.vendorId === NEW ? !!v.newName.trim() : !!v.vendorId;
    var ok = vendorOk && (v.mode === 'lump' ? N(v.lump) > 0 : filled > 0) && !(v.mode === 'unit' && badPrice);
    var allPlugged = pkg.lines.length > 0 && pkg.lines.every(function (l) { var t = p.doc.estimates[p.doc.currentBidId].tasks.find(function (x) { return x.packageId === pkg.id && x.itemId === l.itemId; }); return t && t.plug > 0; });
    var options = lib.vendors.map(function (x) { return { value: x.id, label: x.name + (x.trade ? ' · ' + x.trade : '') }; }).concat([{ value: NEW, label: 'A company not in the library…' }]);
    return h(M.Dialog, { headline: (q ? 'Quote from ' + (q.vendor ? q.vendor.name : 'vendor') : 'Add quote') + ' · ' + pkg.name, icon: 'request_quote', onClose: p.onClose, className: 'gl-dialog--wide', actions: h(Frag, null,
        q ? h(M.Button, { variant: 'text', icon: 'delete', onClick: p.onDelete, style: { marginRight: 'auto' } }, 'Remove quote') : null,
        h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'),
        h(M.Button, { disabled: !ok, onClick: function () {
          var out = { vendorId: v.vendorId === NEW ? null : v.vendorId, newVendor: v.vendorId === NEW ? { name: v.newName.trim(), trade: v.newTrade.trim() } : null, note: v.note.trim() };
          if (v.mode === 'lump') { out.lump = Math.round(N(v.lump) * 100) / 100; out.unitPrices = null; out.lineQty = null; }
          else { out.lump = null; out.unitPrices = {}; out.lineQty = {}; pkg.lines.forEach(function (l) { var n = N(v.prices[l.itemId]); if (!isNaN(n)) { out.unitPrices[l.itemId] = n; if (v.lineQty[l.itemId] != null) out.lineQty[l.itemId] = v.lineQty[l.itemId]; } }); if (!Object.keys(out.lineQty).length) out.lineQty = null; }
          p.onSave(out);
        } }, 'Save quote')) },
      h('div', { className: 'gl-dialog__form' },
        p.readQuote ? h('div', { className: 'gl-readquote' },
          reading[0] ? h('div', { className: 'gl-readquote__busy' }, h(M.LoadingIndicator, { label: 'Reading the quote' }), h('span', { className: 'body-medium' }, 'Reading the quote…')) : h('div', { className: 'm3-row' },
            h('label', { className: 'm3-btn m3-btn--tonal m3-btn--xs m3-btn--round gl-filebtn' }, h(M.Icon, { name: 'document_scanner', size: 18 }), ' Read from PDF or photo', h('input', { type: 'file', accept: '.pdf,image/*', onChange: onFile, style: { position: 'absolute', opacity: 0, width: 1, height: 1 }, 'aria-label': 'Read a quote from a PDF or photo' })),
            h(M.Button, { variant: 'text', size: 'xs', icon: 'content_paste', onClick: function () { pasteOpen[1](!pasteOpen[0]); } }, 'Paste an email'),
            h('span', { className: 'body-small gl-dim' }, 'The AI reads the document; you check the numbers; Benchstake prices the bid.')),
          pasteOpen[0] && !reading[0] ? h('div', { className: 'gl-readquote__paste' },
            h(GL.Field, { label: 'Quote text', value: pasteText[0], onChange: pasteText[1], multiline: true, placeholder: 'Paste the email or the quote text here' }),
            h(M.Button, { variant: 'tonal', size: 'xs', disabled: !pasteText[0].trim(), onClick: function () { pasteOpen[1](false); readFrom({ text: pasteText[0] }); } }, 'Read it')) : null,
          readNote[0] ? h(M.Banner, { tone: readNote[0].tone, compact: true, onClose: function () { readNote[1](null); } }, readNote[0].text) : null) : null,
        h('div', { className: 'm3-row', style: { gap: 12, alignItems: 'flex-start' } },
          h(GL.Select, { label: 'Company', value: v.vendorId, placeholder: lib.vendors.length ? 'Choose a company' : undefined, options: options, onChange: function (x) { set('vendorId', x); } }),
          v.vendorId === NEW ? h(GL.Field, { label: 'Company name', value: v.newName, onChange: function (x) { set('newName', x); }, required: true }) : null,
          v.vendorId === NEW ? h(GL.Field, { label: 'Trade', value: v.newTrade, onChange: function (x) { set('newTrade', x); }, placeholder: 'Guardrail', className: 'gl-field gl-field--short' }) : null),
        h(M.SegmentedButton, { density: 'dense', label: 'Quoted as', value: v.mode, onChange: function (x) { set('mode', x); }, segments: [{ value: 'unit', label: 'Unit prices' }, { value: 'lump', label: 'Lump sum' }] }),
        v.mode === 'unit' ? h('div', { className: 'gl-quotelines' }, pkg.lines.map(function (l) {
          var n = N(v.prices[l.itemId]);
          return h('div', { key: l.itemId, className: 'gl-quoteline' },
            h('span', { className: 'gl-quoteline__name body-medium' }, (l.item && l.item.code ? l.item.code + ' ' : '') + (l.item ? l.item.name : ''), h('span', { className: 'gl-dim body-small' }, ' · ' + GL.fmtNum(l.qty) + ' ' + l.unit)),
            h(GL.Field, { label: 'Unit price', prefix: '$', suffix: '/ ' + l.unit, value: v.prices[l.itemId], inputMode: 'decimal', onChange: function (x) { setPrice(l.itemId, x); }, className: 'gl-field gl-field--money', error: !!uncertain[0][l.itemId], supportingText: uncertain[0][l.itemId] ? 'Check: ' + uncertain[0][l.itemId] : (v.lineQty[l.itemId] != null && Math.abs(v.lineQty[l.itemId] - l.qty) / (l.qty || 1) > 0.02 ? 'Quoted ' + GL.fmtNum(v.lineQty[l.itemId]) + ' ' + l.unit + ', bid has ' + GL.fmtNum(l.qty) : undefined) }),
            h('span', { className: 'gl-quoteline__ext body-medium' }, !isNaN(n) ? GL.fmtMoney(n * l.qty) : h('span', { className: 'gl-dim' }, v.prices[l.itemId] !== '' ? 'not a number' : 'no price')));
        })) : h(GL.Field, { label: 'Lump sum for the package', prefix: '$', value: v.lump, inputMode: 'decimal', onChange: function (x) { set('lump', x); }, supportingText: allPlugged ? 'Spread over the pay items in proportion to your plugs, so each item gets a unit price.' : 'Spread over the pay items by quantity, because not every item has a plug yet. Set a plug on each item to split by your prices.', className: 'gl-field gl-field--money' }),
        h(GL.Field, { label: 'Notes and exclusions', value: v.note, onChange: function (x) { set('note', x); }, placeholder: 'Excludes traffic control. Good for 30 days.' }),
        h('div', { className: 'title-small' }, 'Quote total ' + GL.fmtMoney(total) + (pkg.plugTotal ? ' · plug ' + GL.fmtMoney(pkg.plugTotal) : '') + (v.mode === 'unit' && filled < pkg.lines.length ? ' · ' + (pkg.lines.length - filled) + ' item' + (pkg.lines.length - filled > 1 ? 's' : '') + ' not priced' : ''))));
  }

  /* ---------- Library records ---------- */
  function CrewDialog(p) {
    var lib = p.doc.library, c = p.crew;
    var f = useState({ name: c ? c.name : '', hours: c ? String(c.hours || 8) : '8', labor: c ? c.labor.map(function (x) { return { id: x[0], n: String(x[1]) }; }) : [], equipment: c ? c.equipment.map(function (x) { return { id: x[0], n: String(x[1]) }; }) : [] });
    var v = f[0];
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    function setRow(kind, i, k, val) { var list = v[kind].slice(); list[i] = Object.assign({}, list[i]); list[i][k] = val; set(kind, list); }
    function addRow(kind) { var src = lib[kind]; if (!src.length) return; set(kind, v[kind].concat([{ id: src[0].id, n: '1' }])); }
    function delRow(kind, i) { set(kind, v[kind].filter(function (_, j) { return j !== i; })); }
    var out = { name: v.name.trim(), hours: Number(v.hours) || 8, labor: v.labor.filter(function (r) { return Number(r.n) > 0; }).map(function (r) { return [r.id, Number(r.n)]; }), equipment: v.equipment.filter(function (r) { return Number(r.n) > 0; }).map(function (r) { return [r.id, Number(r.n)]; }) };
    var rate = GL.crewRate(out, lib);
    var ok = out.name && (out.labor.length || out.equipment.length) && Number(v.hours) > 0 && Number(v.hours) <= 24;
    function rowsOf(kind, label, empty) {
      var src = lib[kind];
      return h('div', { className: 'gl-crewrows' },
        h('div', { className: 'label-medium gl-dim' }, label),
        v[kind].map(function (r, i) { var rec = src.find(function (x) { return x.id === r.id; }); var each = kind === 'labor' ? GL.laborRate(rec) : GL.equipRate(rec);
          return h('div', { key: i, className: 'gl-crewrow' },
            h(GL.Field, { label: 'How many', value: r.n, inputMode: 'decimal', onChange: function (x) { setRow(kind, i, 'n', x); }, className: 'gl-field gl-field--count' }),
            h(GL.Select, { label: kind === 'labor' ? 'Classification' : 'Machine', value: r.id, options: src.map(function (x) { return { value: x.id, label: x.name }; }), onChange: function (x) { setRow(kind, i, 'id', x); } }),
            h('span', { className: 'body-small gl-dim gl-crewrow__rate' }, GL.fmtMoney(each, 2) + '/hr'),
            h(M.IconButton, { icon: 'close', label: 'Remove ' + (rec ? rec.name : 'row'), size: 'xs', onClick: function () { delRow(kind, i); } })); }),
        src.length ? h(M.Button, { variant: 'text', size: 'xs', icon: 'add', onClick: function () { addRow(kind); } }, kind === 'labor' ? 'Add people' : 'Add machine') : h('div', { className: 'body-small gl-dim' }, empty));
    }
    return h(M.Dialog, { headline: c ? 'Edit crew' : 'Add crew', icon: 'groups', onClose: p.onClose, className: 'gl-dialog--wide', actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () { p.onSave(out); } }, c ? 'Save' : 'Add crew')) },
      h('div', { className: 'gl-dialog__form' },
        h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Field, { label: 'Crew name', value: v.name, onChange: function (x) { set('name', x); }, required: true, placeholder: 'Paving crew' }),
          h(GL.Field, { label: 'Hours per day', value: v.hours, inputMode: 'decimal', onChange: function (x) { set('hours', x); }, error: v.hours !== '' && !(Number(v.hours) > 0 && Number(v.hours) <= 24), supportingText: '1 to 24', className: 'gl-field gl-field--short' })),
        rowsOf('labor', 'People', 'Add labor classes on the Labor tab first.'),
        rowsOf('equipment', 'Machines', 'Add machines on the Equipment tab first.'),
        h('div', { className: 'gl-crewtotal' },
          h('span', null, 'Labor ', h('b', null, GL.fmtMoney(rate.laborPerDay))), h('span', null, 'Equipment ', h('b', null, GL.fmtMoney(rate.equipPerDay))), h('span', { className: 'title-small' }, 'Crew day ' + GL.fmtMoney(rate.perDay) + ' · ' + GL.peopleWord(rate.people)))));
  }

  function LibEditDialog(p) {
    var kind = p.target, r = p.record;
    var f = useState({ name: r ? r.name || '' : '', wage: r && r.wage != null ? String(r.wage) : '', burden: r && r.burden != null ? String(r.burden) : '', rate: r && r.rate != null ? String(r.rate) : '', own: r && r.own != null ? String(r.own) : '', op: r && r.op != null ? String(r.op) : '', fuel: r && r.fuel != null ? String(r.fuel) : '', unit: r ? r.unit || '' : '', cost: r && r.cost != null ? String(r.cost) : '', trade: r ? r.trade || '' : '', kind: r ? r.kind || 'sub' : 'sub', contact: r ? r.contact || '' : '', email: r ? r.email || '' : '', phone: r ? r.phone || '' : '' });
    var v = f[0];
    function set(k, val) { var o = Object.assign({}, v); o[k] = val; f[1](o); }
    var num = function (s) { return s === '' ? null : GL.toNum(s); };
    var bad = function (s) { return s !== '' && (isNaN(GL.toNum(s)) || GL.toNum(s) < 0); };
    var out = { name: v.name.trim() }, ok = !!out.name, preview = '';
    if (kind === 'labor') {
      if (v.wage !== '') { out.wage = num(v.wage); out.burden = num(v.burden) || 0; out.rate = GL.laborRate(out); } else { out.rate = num(v.rate); out.wage = null; out.burden = null; }
      ok = ok && !bad(v.wage) && !bad(v.burden) && !bad(v.rate) && out.rate > 0; preview = out.rate > 0 ? GL.fmtMoney(out.rate, 2) + ' an hour, ' + GL.fmtMoney(out.rate * 8) + ' for 8 hours' : '';
    } else if (kind === 'equipment') {
      var parts = v.own !== '' || v.op !== '' || v.fuel !== '';
      if (parts) { out.own = num(v.own) || 0; out.op = num(v.op) || 0; out.fuel = num(v.fuel) || 0; out.rate = GL.equipRate(out); } else { out.rate = num(v.rate); out.own = null; out.op = null; out.fuel = null; }
      ok = ok && !bad(v.own) && !bad(v.op) && !bad(v.fuel) && !bad(v.rate) && out.rate > 0; preview = out.rate > 0 ? GL.fmtMoney(out.rate, 2) + ' an hour, ' + GL.fmtMoney(out.rate * 8) + ' for 8 hours' : '';
    } else if (kind === 'materials') {
      out.unit = v.unit.trim().toUpperCase() || 'EA'; out.cost = num(v.cost); ok = ok && !bad(v.cost) && out.cost != null;
    } else {
      out.trade = v.trade.trim(); out.kind = v.kind; out.contact = v.contact.trim(); out.email = v.email.trim(); out.phone = v.phone.trim();
    }
    var titles = { labor: 'labor class', equipment: 'machine', materials: 'material', vendors: 'company' };
    return h(M.Dialog, { headline: (r ? 'Edit ' : 'Add ') + titles[kind], onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: !ok, onClick: function () { p.onSave(out); } }, r ? 'Save' : 'Add')) },
      h('div', { className: 'gl-dialog__form' },
        h(GL.Field, { label: kind === 'labor' ? 'Classification' : kind === 'equipment' ? 'Machine' : kind === 'materials' ? 'Material' : 'Company', value: v.name, onChange: function (x) { set('name', x); }, required: true }),
        kind === 'labor' ? h(Frag, null,
          h('div', { className: 'm3-row', style: { gap: 12 } },
            h(GL.Field, { label: 'Base wage', prefix: '$', suffix: '/ hr', value: v.wage, inputMode: 'decimal', onChange: function (x) { set('wage', x); }, className: 'gl-field gl-field--money' }),
            h(GL.Field, { label: 'Burden', suffix: '%', value: v.burden, inputMode: 'decimal', onChange: function (x) { set('burden', x); }, supportingText: 'Payroll taxes, insurance, fringe', className: 'gl-field gl-field--pct' })),
          v.wage === '' ? h(GL.Field, { label: 'Or the burdened rate', prefix: '$', suffix: '/ hr', value: v.rate, inputMode: 'decimal', onChange: function (x) { set('rate', x); }, className: 'gl-field gl-field--money' }) : null) : null,
        kind === 'equipment' ? h(Frag, null,
          h('div', { className: 'm3-row', style: { gap: 12 } },
            h(GL.Field, { label: 'Ownership', prefix: '$', suffix: '/ hr', value: v.own, inputMode: 'decimal', onChange: function (x) { set('own', x); }, className: 'gl-field gl-field--money' }),
            h(GL.Field, { label: 'Operating', prefix: '$', suffix: '/ hr', value: v.op, inputMode: 'decimal', onChange: function (x) { set('op', x); }, supportingText: 'Repairs, tires, wear', className: 'gl-field gl-field--money' }),
            h(GL.Field, { label: 'Fuel', prefix: '$', suffix: '/ hr', value: v.fuel, inputMode: 'decimal', onChange: function (x) { set('fuel', x); }, className: 'gl-field gl-field--money' })),
          v.own === '' && v.op === '' && v.fuel === '' ? h(GL.Field, { label: 'Or the hourly rate', prefix: '$', suffix: '/ hr', value: v.rate, inputMode: 'decimal', onChange: function (x) { set('rate', x); }, className: 'gl-field gl-field--money' }) : null) : null,
        kind === 'materials' ? h('div', { className: 'm3-row', style: { gap: 12 } },
          h(GL.Field, { label: 'Unit', value: v.unit, onChange: function (x) { set('unit', x); }, placeholder: 'TON', className: 'gl-field gl-field--short' }),
          h(GL.Field, { label: 'Cost', prefix: '$', value: v.cost, inputMode: 'decimal', onChange: function (x) { set('cost', x); }, className: 'gl-field gl-field--money' })) : null,
        kind === 'vendors' ? h(Frag, null,
          h('div', { className: 'm3-row', style: { gap: 12 } },
            h(GL.Field, { label: 'Trade', value: v.trade, onChange: function (x) { set('trade', x); }, placeholder: 'Striping' }),
            h(GL.Select, { label: 'Type', value: v.kind, options: [{ value: 'sub', label: 'Subcontractor' }, { value: 'supplier', label: 'Supplier' }], onChange: function (x) { set('kind', x); } })),
          h('div', { className: 'm3-row', style: { gap: 12 } },
            h(GL.Field, { label: 'Contact', value: v.contact, onChange: function (x) { set('contact', x); } }),
            h(GL.Field, { label: 'Phone', value: v.phone, onChange: function (x) { set('phone', x); }, inputMode: 'tel' })),
          h(GL.Field, { label: 'Email', value: v.email, onChange: function (x) { set('email', x); }, inputMode: 'email' })) : null,
        preview ? h('div', { className: 'title-small' }, preview) : null));
  }

  function ExportDialog(p) {
    var sys = useState(p.ui.exportSystem || p.defaultSystem || 'qbo');
    var systems = { qbo: 'QuickBooks Online (CSV)', qbd: 'QuickBooks Desktop (IIF)', spectrum: 'Viewpoint Spectrum (CSV)', vista: 'Viewpoint Vista (CSV)', sage: 'Sage 300 CRE (CSV)' };
    var busy = useState(false);
    return h(M.Dialog, { headline: 'Export budget', icon: 'account_balance', onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { icon: 'download', disabled: busy[0] || !p.canDownload, onClick: function () { busy[1](true); p.onExport(sys[0]).then(function () { busy[1](false); }); } }, sys[0] === 'qbd' ? 'Download IIF' : 'Download CSV')) },
      h('div', { className: 'gl-dialog__form' },
        h(GL.Select, { label: 'Accounting system', value: sys[0], options: Object.keys(systems).map(function (k) { return { value: k, label: systems[k] }; }), onChange: function (x) { sys[1](x); p.api.ui({ exportSystem: x }); } }),
        h('div', { className: 'body-medium' }, sys[0] === 'qbd' ? 'An IIF file with one Estimate transaction and a line per pay item (quantity, unit price, amount). In QuickBooks Desktop: File › Utilities › Import › IIF Files.' : sys[0] === 'qbo' ? 'A CSV with a line per pay item (product/service, quantity, rate, amount) plus the cost split. Import it as an estimate, or hand it to your bookkeeper.' : 'One row per pay item with labor, equipment, material, subcontract and other, mapped to ' + systems[sys[0]] + '\'s cost types.'),
        p.canDownload ? null : h(M.Banner, { tone: 'warning', compact: true }, 'Downloads are not available in this view.')));
  }

  function SubmitDialog(p) {
    return h(M.Dialog, { headline: 'Mark this bid as submitted?', icon: 'send', onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Not yet'), h(M.Button, { icon: 'check', onClick: p.onSubmit }, 'Mark submitted')) },
      h('div', { className: 'gl-dialog__form' },
        h('div', { className: 'body-medium' }, 'Total ' + GL.fmtMoney(p.total, 2) + ' at ' + p.margin.toFixed(1) + '% margin. The bid moves to Submitted on the Bids list. ' + (p.cloud ? 'You can reopen it from Bid day.' : 'You can undo this like anything else.'))));
  }

  /* Invite a teammate. Owners only; the session supplies onSend, which saves the invite and emails it. */
  function InviteDialog(p) {
    var email = useState(''), role = useState('estimator'), busy = useState(false), err = useState(null);
    async function send(e) {
      e.preventDefault(); if (busy[0]) return;
      busy[1](true); err[1](null);
      var r = await p.onSend(email[0], role[0]);
      busy[1](false);
      if (r.error) err[1](r.error); else p.onSent(r);
    }
    return h(M.Dialog, { headline: 'Invite someone', icon: 'person_add', onClose: p.onClose, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: p.onClose }, 'Cancel'), h(M.Button, { disabled: busy[0], onClick: send }, busy[0] ? 'Sending…' : 'Send invite')) },
      h('form', { className: 'gl-dialog__form', onSubmit: send, noValidate: true },
        h(M.TextField, { variant: 'outlined', label: 'Their email', type: 'email', value: email[0], onChange: email[1], autoCapitalize: 'none', spellCheck: false, autoFocus: true, className: 'gl-field' }),
        h(GL.Select, { label: 'Role', value: role[0], options: [{ value: 'estimator', label: 'Estimator' }, { value: 'viewer', label: 'Viewer' }], onChange: role[1] }),
        h('div', { className: 'body-small gl-dim' }, role[0] === 'viewer' ? 'Viewers can look at bids but can’t change them.' : 'Estimators can build and change bids.'),
        err[0] ? h(M.Banner, { tone: 'error', compact: true }, err[0]) : null));
  }

  /* ---------- App shell ---------- */
  // App: the signed-in workspace. `store` comes from the local (demo) or cloud adapter; `session` carries who is here.
  function App(p) {
    var store = p.store, session = p.session || {};
    var doc = store.doc, ui = store.ui, api = store.api;
    var cloud = store.mode === 'cloud', viewer = session.role === 'viewer';
    var company = session.orgName || 'Cascade Civil Constructors, Inc. (sample)';
    if (viewer) {
      var ro = function () { toast('You can view this company but not change it. Ask an owner to make you an estimator.'); return Promise.resolve(); };
      api = Object.assign({}, api, { update: ro, undo: ro, redo: ro, jump: ro });
    }
    var width = GL.useWidth();
    var d = useMemo(function () { return GL.derive(doc, ui.bidId || doc.currentBidId); }, [doc, ui.bidId]);
    var dialog = useState(null);
    var snack = useState(null);
    var menu = GL.useMenu();
    var canDl = [true];

    function toast(msg, action, onAction) { snack[1]({ id: Date.now(), msg: msg, action: action, onAction: onAction }); }
    useEffect(function () { if (!snack[0]) return; var t = setTimeout(function () { snack[1](null); }, 6000); return function () { clearTimeout(t); }; }, [snack[0]]);

    // keyboard
    useEffect(function () {
      function onKey(e) {
        var tag = (e.target.tagName || '').toLowerCase();
        var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') { if (typing) return; e.preventDefault(); if (e.shiftKey) api.redo(); else api.undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { if (typing) return; e.preventDefault(); api.redo(); return; }
        if (dialog[0] && e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); dialog[1](null); return; }
        if (!dialog[0] && e.key === 'Escape' && !e.defaultPrevented && ui.paneModal && ui.screen === 'estimate' && !document.querySelector('[role="menu"]')) { e.preventDefault(); api.ui({ paneModal: false }); return; }
        if (typing || dialog[0] || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target.closest && e.target.closest('.m3-grid, [role="menu"], [role="dialog"]') && /^[1-5lL]$/.test(e.key)) return;
        if (e.key === '?') { e.preventDefault(); dialog[1]({ kind: 'shortcuts' }); }
        else if (e.key.toLowerCase() === 'l' && ui.selectedItemId && ui.screen === 'estimate') { toggleLock(ui.selectedItemId); }
        else if (/^[1-5]$/.test(e.key) && ui.screen === 'estimate') { api.ui({ tab: ['sheet', 'quotes', 'bidday', 'checks', 'form'][Number(e.key) - 1] }); }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, [ui.selectedItemId, ui.screen, ui.paneModal, dialog[0], d]);

    // a new screen starts at its top, not wherever the last one was scrolled to
    var mainRef = useRef(null);
    useEffect(function () { if (mainRef.current) mainRef.current.scrollTop = 0; }, [ui.screen, ui.bidId]);

    /* ----- document actions ----- */
    function curEst(doc) { return doc.estimates[doc.currentBidId]; }
    function toggleLock(itemId) {
      var it = d.items.find(function (i) { return i.id === itemId; }); if (!it) return;
      if (d.bid.status === 'submitted') { toast('This bid was submitted. Reopen it from Bid day to change prices.'); return; }
      api.update(function (doc) { var e = curEst(doc); if (e.locks[itemId] != null) delete e.locks[itemId]; else e.locks[itemId] = it.unitPrice; },
        { title: (it.locked ? 'Unlocked' : 'Locked') + ' price on ' + GL.itemLabel(it), detail: GL.fmtMoney(it.unitPrice, 2) + ' / ' + it.unit, icon: it.locked ? 'lock_open' : 'lock' });
      toast((it.locked ? 'Unlocked ' : 'Locked ') + GL.itemLabel(it) + ' at ' + GL.fmtMoney(it.unitPrice, 2) + ' / ' + it.unit + '.', 'Undo', api.undo);
    }
    function deleteItem(itemId) {
      var it = d.items.find(function (i) { return i.id === itemId; }); if (!it) return;
      api.update(function (doc) { var e = curEst(doc); e.items = e.items.filter(function (i) { return i.id !== itemId; }); e.tasks = e.tasks.filter(function (t) { return t.itemId !== itemId; }); delete e.locks[itemId]; e.packages.forEach(function (p) { p.lines = p.lines.filter(function (l) { return l.itemId !== itemId; }); }); },
        { title: 'Deleted ' + it.code + ' ' + it.name, detail: it.tasks.length + ' task' + (it.tasks.length === 1 ? '' : 's') + ' removed with it', icon: 'delete' });
      api.ui({ selectedItemId: null });
      toast('Deleted ' + GL.itemLabel(it) + '.', 'Undo', api.undo);
    }
    function deleteTask(taskId) {
      var t = d.tasks[taskId]; if (!t) return;
      api.update(function (doc) { var e = curEst(doc); e.tasks = e.tasks.filter(function (x) { return x.id !== taskId; }); }, { title: 'Deleted task ' + t.name, detail: GL.fmtMoney(t.total), icon: 'delete' });
      toast('Deleted task.', 'Undo', api.undo);
    }
    function setBidStatus(status) {
      var bid = d.bid;
      api.update(function (doc) { var b = doc.bids.find(function (x) { return x.id === bid.id; }); b.status = status; if (status === 'submitted') { b.submittedAt = GL.today(); if (b.total == null) b.total = Math.round(d.totals.bidTotal * 100) / 100; } else if (status === 'in-progress') { delete b.submittedAt; delete b.total; } }, { title: 'Marked ' + bid.name.split(',')[0] + ' as ' + (STATUS_WORD[status] || status).toLowerCase(), detail: status === 'submitted' ? GL.fmtMoney(d.totals.bidTotal, 2) : '', icon: status === 'submitted' ? 'send' : 'lock_open' });
    }
    function openBid(id) {
      api.ui({ bidId: id, screen: 'estimate', tab: 'sheet', selectedItemId: null });
    }
    function startEstimate(bidId, how, srcId) {
      var srcBid = srcId ? doc.bids.find(function (b) { return b.id === srcId; }) : null;
      api.update(function (doc) {
        var e = GL.blankEstimate(GL.bidDefaults(doc));
        if (how === 'copy') { var src = doc.estimates[srcId]; if (src) { e.items = JSON.parse(JSON.stringify(src.items)); e.tasks = JSON.parse(JSON.stringify(src.tasks)).map(function (t) { if (t.type === 'sub') { t.packageId = null; } return t; }); e.markup = Object.assign({}, src.markup); e.targetMargin = src.targetMargin; } }
        doc.estimates[bidId] = e; doc.currentBidId = bidId;
        var b = doc.bids.find(function (x) { return x.id === bidId; }); if (b.status === 'draft') b.status = 'in-progress';
      }, { title: 'Started estimate for ' + doc.bids.find(function (b) { return b.id === bidId; }).name.split(',')[0], detail: how === 'copy' ? 'copied items and tasks from ' + (srcBid ? srcBid.name.split(',')[0] : 'a past bid') : how === 'blank' ? 'blank sheet' : 'from pasted item list', icon: 'post_add' });
      api.ui({ bidId: bidId, tab: 'sheet' });
      if (how === 'import') dialog[1]({ kind: 'import', target: 'items' });
    }
    function downloadForm() {
      var ci = GL.companyInfo(doc);
      var rows = d.items.map(function (it) { return '<tr><td>' + esc(it.code) + '</td><td>' + esc(it.name) + '</td><td class="n">' + GL.fmtNum(it.qty) + '</td><td>' + esc(it.unit) + '</td><td class="n">' + GL.fmtMoney(it.unitPrice, 2) + '</td><td class="n">' + GL.fmtMoney(it.ext, 2) + '</td></tr>'; }).join('');
      var html = '<!doctype html><html><head><meta charset="utf-8"><title>Bid form - ' + esc(d.bid.name) + '</title><style>body{font:14px/1.4 Roboto,Arial,sans-serif;margin:40px;color:#111}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ccc;padding:6px 8px;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}tfoot td{font-weight:bold;border-top:2px solid #111}.sig{display:flex;gap:40px;margin-top:48px}.sig div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:12px}</style></head><body><div style="font-size:12px;letter-spacing:.5px;text-transform:uppercase;color:#555">Schedule of bid items</div><h1>' + esc(d.bid.name) + '</h1><div>Owner: ' + esc(d.bid.owner) + ' &middot; Bids due ' + GL.fmtDate(d.bid.due) + ' at ' + esc(d.bid.dueTime) + '</div><div>Bidder: ' + esc(company) + (ci.address ? ', ' + esc(ci.address) : '') + (ci.phone ? ' &middot; ' + esc(ci.phone) : '') + (ci.license ? ' &middot; License ' + esc(ci.license) : '') + ' &middot; Estimator: ' + esc(d.bid.estimator || '') + '</div><table><thead><tr><th>Item</th><th>Description</th><th class="n">Quantity</th><th>Unit</th><th class="n">Unit price</th><th class="n">Amount</th></tr></thead><tbody>' + rows + '</tbody><tfoot><tr><td colspan="5">Total bid</td><td class="n">' + GL.fmtMoney(d.totals.bidTotal, 2) + '</td></tr></tfoot></table><div class="sig"><div>Authorized signature</div><div>Title</div><div>Date</div></div></body></html>';
      return saveFile('Bid form - ' + d.bid.name.replace(/[^\w ,.-]+/g, '') + '.html', html);
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function saveFile(name, data) {
      try {
        var blob = data instanceof Blob ? data : new Blob([data], { type: /\.csv$/i.test(name) ? 'text/csv' : /\.iif$/i.test(name) ? 'text/plain' : 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        toast('Saved ' + name + '.');
      } catch (e) { toast('Could not save the file.'); }
      return Promise.resolve();
    }
    function exportBudget(sys) {
      var safe = d.bid.name.replace(/[^\w ,.-]+/g, '');
      var job = d.bid.name;
      if (sys === 'qbd') {
        // QuickBooks Desktop IIF: one ESTIMATE transaction, one split line per pay item (amounts on splits are negative by convention).
        var today = new Date(); var date = (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear();
        var docnum = (d.bid.id || 'GL').toString().slice(-8).toUpperCase();
        var t = function (s) { return String(s == null ? '' : s).replace(/[\t\r\n]/g, ' '); };
        var lines = ['!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO', '!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO\tQNTY\tPRICE\tINVITEM', '!ENDTRNS'];
        var cust = t(d.bid.owner || job);
        lines.push(['TRNS', '', 'ESTIMATE', date, 'Estimates', cust, r2(d.totals.bidTotal), docnum, t(job)].join('\t'));
        d.items.forEach(function (it) { lines.push(['SPL', '', 'ESTIMATE', date, 'Construction Income', cust, -r2(it.ext), docnum, t(it.name), -it.qty, r2(it.unitPrice), t(it.code || it.name)].join('\t')); });
        lines.push('ENDTRNS');
        return saveFile('Estimate - ' + safe + '.iif', lines.join('\r\n') + '\r\n').then(function () { dialog[1](null); });
      }
      if (sys === 'qbo') {
        // QuickBooks Online: a line-per-item CSV in the shape QBO's import and most add-ons accept (Customer, Product/Service, Description, Qty, Rate, Amount), plus the cost split for job costing.
        var hdrQ = ['Customer', 'Product/Service', 'Description', 'Qty', 'Unit', 'Rate', 'Amount', 'Labor cost', 'Equipment cost', 'Material cost', 'Subcontract cost', 'Other cost', 'Total cost'];
        var rowsQ = [hdrQ].concat(d.items.map(function (it) { return [job, it.code || it.name, it.name, it.qty, it.unit, r2(it.unitPrice), r2(it.ext), r2(it.labor), r2(it.equipment), r2(it.material), r2(it.sub), r2(it.other), r2(it.direct)]; }));
        return saveFile('Estimate - ' + safe + ' - QuickBooks Online.csv', GL.toCSV(rowsQ)).then(function () { dialog[1](null); });
      }
      var hdr = sys === 'sage' ? ['Job', 'Phase', 'Description', 'Qty', 'UM', 'L (1)', 'E (2)', 'M (3)', 'S (4)', 'O (5)', 'Total'] : ['Job', 'Phase', 'Description', 'Qty', 'UM', 'Labor', 'Equipment', 'Material', 'Subcontract', 'Other', 'Budget'];
      var rows = [hdr].concat(d.items.map(function (it) { return [job, it.code, it.name, it.qty, it.unit, r2(it.labor), r2(it.equipment), r2(it.material), r2(it.sub), r2(it.other), r2(it.direct)]; }));
      return saveFile('Budget - ' + safe + ' - ' + sys + '.csv', GL.toCSV(rows)).then(function () { dialog[1](null); });
    }
    function r2(v) { return Math.round(v * 100) / 100; }
    function libRecord(target, r) {
      var rec = { id: GL.uid({ labor: 'L', equipment: 'E', materials: 'M', vendors: 'V' }[target] || 'X'), name: r.name };
      if (target === 'materials') { rec.unit = (r.unit || 'EA').toUpperCase(); rec.cost = r.rate; }
      else if (target === 'labor') { if (r.wage != null) { rec.wage = r.wage; rec.burden = r.burden || 0; } rec.rate = r.wage != null ? GL.laborRate(rec) : r.rate; }
      else if (target === 'equipment') { if (r.own != null || r.op != null || r.fuel != null) { rec.own = r.own || 0; rec.op = r.op || 0; rec.fuel = r.fuel || 0; } rec.rate = rec.own != null ? GL.equipRate(rec) : r.rate; }
      else if (target === 'vendors') { rec.trade = r.trade || ''; rec.kind = 'sub'; rec.contact = r.contact || ''; rec.email = r.email || ''; rec.phone = r.phone || ''; }
      return rec;
    }

    /* ----- dialogs ----- */
    var dlg = dialog[0], dlgNode = null;
    if (dlg) {
      var close = function () { dialog[1](null); };
      if (dlg.kind === 'shortcuts') dlgNode = h(GL.ShortcutsDialog, { onClose: close });
      else if (dlg.kind === 'newbid') dlgNode = h(NewBidDialog, { onClose: close, defaultEstimator: session.name || '', defaultTime: GL.bidDefaults(doc).dueTime, onSave: function (v) {
        var id = GL.uid('B');
        api.update(function (doc) { doc.bids.push(Object.assign({ id: id }, v, { status: 'draft' })); }, { title: 'Created bid ' + v.name, detail: 'due ' + GL.fmtDate(v.due), icon: 'post_add' });
        close(); api.ui({ bidId: id, screen: 'estimate', tab: 'sheet' });
      } });
      else if (dlg.kind === 'editbid') { var eb = doc.bids.find(function (b) { return b.id === dlg.bidId; });
        dlgNode = h(NewBidDialog, { bid: eb, hasEstimate: !!doc.estimates[dlg.bidId], defaultTime: GL.bidDefaults(doc).dueTime, d: dlg.bidId === (ui.bidId || doc.currentBidId) ? d : null, onClose: close, onSave: function (v) {
          api.update(function (d2) { var x = d2.bids.find(function (b) { return b.id === dlg.bidId; }); Object.keys(v).forEach(function (k) { if (v[k] === undefined) delete x[k]; else x[k] = v[k]; }); if (v.status === 'submitted' && !x.submittedAt) x.submittedAt = GL.today(); if (v.status !== 'submitted' && v.status !== 'won' && v.status !== 'lost') delete x.submittedAt; }, { title: 'Edited bid ' + v.name, detail: STATUS_WORD[v.status] || '', icon: 'edit' });
          close();
        } }); }
      else if (dlg.kind === 'item') { var editing = dlg.itemId ? d.est.items.find(function (i) { return i.id === dlg.itemId; }) : null;
        dlgNode = h(ItemDialog, { item: editing, onClose: close, onSave: function (v) {
          if (editing) api.update(function (doc) { var x = curEst(doc).items.find(function (i) { return i.id === dlg.itemId; }); Object.assign(x, v); }, { title: 'Edited ' + v.code + ' ' + v.name, icon: 'edit' });
          else { var id = GL.uid('I'); api.update(function (doc) { curEst(doc).items.push(Object.assign({ id: id }, v)); }, { title: 'Added ' + (v.code ? v.code + ' ' : '') + v.name, detail: GL.fmtNum(v.qty) + ' ' + v.unit, icon: 'add' }); api.ui({ selectedItemId: id }); }
          close();
        } }); }
      else if (dlg.kind === 'task') { var et = dlg.taskId ? d.est.tasks.find(function (t) { return t.id === dlg.taskId; }) : null;
        dlgNode = h(TaskDialog, { doc: doc, itemId: dlg.itemId, task: et, onClose: close, goLibrary: function (tab) { api.ui({ screen: 'library', libTab: tab }); }, onSave: function (v) {
          var item = d.items.find(function (i) { return i.id === dlg.itemId; });
          if (et) api.update(function (doc) { var e = curEst(doc); var idx = e.tasks.findIndex(function (t) { return t.id === dlg.taskId; }); e.tasks[idx] = Object.assign({ id: dlg.taskId, itemId: dlg.itemId }, v); }, { title: 'Edited task ' + v.name, detail: item.code, icon: 'edit' });
          else api.update(function (doc) { curEst(doc).tasks.push(Object.assign({ id: GL.uid('T'), itemId: dlg.itemId }, v)); }, { title: 'Added task ' + v.name + ' to ' + item.code, icon: 'add_task' });
          api.ui(function (u) { var ex = Object.assign({}, u.expanded); ex[dlg.itemId] = true; return { expanded: ex }; });
          close();
        } }); }
      else if (dlg.kind === 'import') dlgNode = h(ImportDialog, { target: dlg.target || 'items', items: d.est.items, onClose: close, onImport: function (rows, target) {
        if (target === 'items') { api.update(function (doc) { var e = curEst(doc); rows.forEach(function (r) { e.items.push({ id: GL.uid('I'), code: r.code, name: r.name, unit: r.unit, qty: r.qty }); }); }, { title: 'Pasted ' + rows.length + ' pay items', detail: 'from the clipboard', icon: 'content_paste' }); toast('Added ' + rows.length + ' pay items. Each needs at least one task.'); }
        else { api.update(function (doc) { rows.forEach(function (r) { doc.library[target].push(libRecord(target, r)); }); }, { title: 'Pasted ' + rows.length + ' ' + (target === 'vendors' ? 'companies' : target + ' rates'), icon: 'content_paste' }); toast('Added ' + rows.length + ' to the library.'); }
        close();
      } });
      else if (dlg.kind === 'libedit') { var tgt = dlg.target, rec0 = dlg.id ? doc.library[tgt].find(function (x) { return x.id === dlg.id; }) : null;
        var saveRec = function (v) {
          var word = { crews: 'crew', labor: 'labor class', equipment: 'machine', materials: 'material', vendors: 'company' }[tgt];
          if (rec0) api.update(function (dd) { var x = dd.library[tgt].find(function (y) { return y.id === rec0.id; }); Object.keys(v).forEach(function (k) { if (v[k] == null) delete x[k]; else x[k] = v[k]; }); }, { title: 'Edited ' + word + ' ' + v.name, icon: 'edit' });
          else api.update(function (dd) { var x = { id: GL.uid({ crews: 'C', labor: 'L', equipment: 'E', materials: 'M', vendors: 'V' }[tgt]) }; Object.keys(v).forEach(function (k) { if (v[k] != null) x[k] = v[k]; }); dd.library[tgt].push(x); }, { title: 'Added ' + word + ' ' + v.name, icon: 'add' });
          toast((rec0 ? 'Saved ' : 'Added ') + v.name + '.'); close();
        };
        dlgNode = tgt === 'crews' ? h(CrewDialog, { doc: doc, crew: rec0, onClose: close, onSave: saveRec }) : h(LibEditDialog, { target: tgt, record: rec0, onClose: close, onSave: saveRec }); }
      else if (dlg.kind === 'copybid') dlgNode = h(CopyBidDialog, { doc: doc, bidId: dlg.bidId, onClose: close, onCopy: function (src) { close(); startEstimate(dlg.bidId, 'copy', src); } });
      else if (dlg.kind === 'dupbid') { var srcB = doc.bids.find(function (b) { return b.id === dlg.bidId; });
        if (srcB) { var srcHasEst = !!(doc.estimates[srcB.id] && doc.estimates[srcB.id].items && doc.estimates[srcB.id].items.length);
          dlgNode = h(NewBidDialog, { onClose: close, headline: 'Duplicate bid', headlineIcon: 'content_copy', cta: 'Duplicate', defaultTime: GL.bidDefaults(doc).dueTime,
            initial: { name: srcB.name + ' (copy)', owner: srcB.owner, type: srcB.type, location: srcB.location || '', estimator: session.name || srcB.estimator || '', note: srcB.note || '', due: '' },
            notice: srcHasEst ? 'Pay items, tasks and markup copy from ' + srcB.name.split(',')[0] + '. Quotes and locked prices start fresh.' : srcB.name.split(',')[0] + ' has no estimate, so only the bid details copy over.',
            onSave: function (v) {
              var id = GL.uid('B');
              api.update(function (doc) {
                doc.bids.push(Object.assign({ id: id }, v, { status: srcHasEst ? 'in-progress' : 'draft' }));
                if (srcHasEst) { var src = doc.estimates[srcB.id]; var e = GL.blankEstimate(GL.bidDefaults(doc)); e.items = JSON.parse(JSON.stringify(src.items)); e.tasks = JSON.parse(JSON.stringify(src.tasks)).map(function (t) { if (t.type === 'sub') t.packageId = null; return t; }); e.markup = Object.assign({}, src.markup); e.targetMargin = src.targetMargin; doc.estimates[id] = e; doc.currentBidId = id; }
              }, { title: 'Duplicated ' + srcB.name.split(',')[0] + ' as ' + v.name.split(',')[0], detail: srcHasEst ? 'items, tasks and markup copied' : 'bid details copied', icon: 'content_copy' });
              close(); api.ui({ bidId: id, screen: 'estimate', tab: 'sheet', selectedItemId: null });
              toast(srcHasEst ? 'Duplicated. Quantities, crews and markup came across; quotes and locked prices start fresh.' : 'Duplicated the bid. It has no estimate yet.');
            } }); } }
      else if (dlg.kind === 'deletebid') { var db = doc.bids.find(function (b) { return b.id === dlg.bidId; });
        if (db) { var dEst = doc.estimates[db.id]; var nItems = dEst && dEst.items ? dEst.items.length : 0;
          dlgNode = h(M.Dialog, { headline: 'Delete ' + db.name.split(',')[0] + '?', icon: 'delete', onClose: close, actions: h(Frag, null, h(M.Button, { variant: 'text', onClick: close }, 'Cancel'), h(M.Button, { icon: 'delete', onClick: function () {
              api.update(function (dd) { dd.bids = dd.bids.filter(function (b) { return b.id !== dlg.bidId; }); delete dd.estimates[dlg.bidId]; if (dd.currentBidId === dlg.bidId) dd.currentBidId = dd.bids[0] ? dd.bids[0].id : null; }, { title: 'Deleted ' + db.name, detail: nItems ? 'its estimate went with it (' + nItems + ' pay item' + (nItems === 1 ? '' : 's') + ')' : '', icon: 'delete' });
              if ((ui.bidId || doc.currentBidId) === dlg.bidId) api.ui({ bidId: null, screen: 'bids' });
              close(); if (cloud) toast('Deleted ' + db.name.split(',')[0] + '.'); else toast('Deleted ' + db.name.split(',')[0] + '.', 'Undo', api.undo);
            } }, 'Delete bid')) },
            h('div', { className: 'gl-dialog__form' },
              h('div', { className: 'body-medium' }, nItems ? 'Its estimate goes with it: ' + nItems + ' pay item' + (nItems === 1 ? '' : 's') + ' with their tasks and quotes.' + (cloud ? ' The change is recorded in the history.' : ' Undo brings it all back.') : 'This bid has no estimate yet.' + (cloud ? '' : ' Undo brings it back.')))); } }
      else if (dlg.kind === 'package') dlgNode = h(PackageDialog, { doc: doc, onClose: close, onSave: function (v) {
        var pid = GL.uid('P');
        api.update(function (doc) { var e = curEst(doc); e.packages.push({ id: pid, name: v.name.trim(), lines: v.itemIds.map(function (id) { return { itemId: id }; }), sentAt: GL.today(), quotes: v.vendorIds.map(function (vid) { return { id: GL.uid('Q'), vendorId: vid, status: 'pending' }; }), selectedQuoteId: null });
          v.itemIds.forEach(function (iid) { if (!e.tasks.some(function (t) { return t.itemId === iid && t.type === 'sub'; })) e.tasks.push({ id: GL.uid('T'), itemId: iid, name: v.name.trim() + ' (sub)', type: 'sub', packageId: pid, plug: null }); else e.tasks.forEach(function (t) { if (t.itemId === iid && t.type === 'sub' && !t.packageId) t.packageId = pid; }); }); },
          { title: 'Added quote package ' + v.name.trim(), detail: v.itemIds.length + ' pay item' + (v.itemIds.length === 1 ? '' : 's') + (v.vendorIds.length ? ', expecting ' + v.vendorIds.length + ' quote' + (v.vendorIds.length === 1 ? '' : 's') : ''), icon: 'request_quote' });
        toast('Added ' + v.name.trim() + '. Set a plug on each item until quotes come in.'); close();
      } });
      else if (dlg.kind === 'quote') { var qpkg = d.packages.find(function (x) { return x.id === dlg.packageId; }); var qq = qpkg && dlg.quoteId ? qpkg.quotes.find(function (x) { return x.id === dlg.quoteId; }) : null;
        if (qpkg) dlgNode = h(QuoteDialog, { doc: doc, pkg: qpkg, quote: qq, onClose: close, read: dlg.read || null, readQuote: GL.readQuote, getToken: session.getToken || null,
          onDelete: function () { api.update(function (doc) { var pk = curEst(doc).packages.find(function (x) { return x.id === qpkg.id; }); pk.quotes = pk.quotes.filter(function (x) { return x.id !== qq.id; }); if (pk.selectedQuoteId === qq.id) pk.selectedQuoteId = null; }, { title: 'Removed quote from ' + (qq.vendor ? qq.vendor.name : 'a vendor'), detail: qpkg.name, icon: 'delete' }); toast('Removed the quote.', 'Undo', api.undo); close(); },
          onSave: function (v) {
            var vid = v.vendorId, vname = v.newVendor ? v.newVendor.name : (doc.library.vendors.find(function (x) { return x.id === vid; }) || {}).name;
            if (v.newVendor) { var known = doc.library.vendors.find(function (x) { return x.name.toLowerCase() === v.newVendor.name.toLowerCase(); }); vid = known ? known.id : GL.uid('V'); }
            api.update(function (doc) {
              if (v.newVendor && !doc.library.vendors.some(function (x) { return x.id === vid; })) doc.library.vendors.push({ id: vid, name: v.newVendor.name, trade: v.newVendor.trade || qpkg.name, kind: 'sub', contact: '', email: '' });
              var pk = curEst(doc).packages.find(function (x) { return x.id === qpkg.id; });
              var rec = { vendorId: vid, status: 'received', unitPrices: v.unitPrices, lump: v.lump, lineQty: v.lineQty, note: v.note, receivedAt: GL.today() };
              var ex = qq ? pk.quotes.find(function (x) { return x.id === qq.id; }) : pk.quotes.find(function (x) { return x.vendorId === vid && x.status === 'pending'; });
              if (ex) { Object.keys(rec).forEach(function (k) { if (rec[k] == null) delete ex[k]; else ex[k] = rec[k]; }); }
              else { var nq = { id: GL.uid('Q') }; Object.keys(rec).forEach(function (k) { if (rec[k] != null) nq[k] = rec[k]; }); pk.quotes.push(nq); }
            }, { title: (qq ? 'Updated' : 'Entered') + ' quote from ' + vname, detail: qpkg.name, icon: 'request_quote' });
            toast('Saved the quote from ' + vname + '. Pick it under the package to use it.'); close();
          } }); }
      else if (dlg.kind === 'invite') dlgNode = h(InviteDialog, { onClose: close, onSend: session.onInvite, onSent: function (r) { close(); toast(r.emailed ? 'Invite sent to ' + r.email + '.' : 'Invite saved, but the email didn’t send. Ask ' + r.email + ' to sign in at benchstake.com/app with that address.'); } });
      else if (dlg.kind === 'export') dlgNode = h(ExportDialog, { ui: ui, api: api, defaultSystem: doc.setup && typeof doc.setup.accounting === 'string' ? doc.setup.accounting : null, canDownload: canDl[0], onClose: close, onExport: exportBudget });
      else if (dlg.kind === 'submit') dlgNode = h(SubmitDialog, { total: d.totals.bidTotal, margin: d.totals.margin, onClose: close, onSubmit: function () { setBidStatus('submitted'); close(); if (cloud) toast('Marked as submitted. Reopen it from Bid day if anything changes.'); else toast('Marked as submitted.', 'Undo', api.undo); }, cloud: cloud });
    }

    /* ----- shell ----- */
    var screen = ui.screen || 'bids';
    var navItems = [{ icon: 'folder_open', label: 'Bids', value: 'bids' }, { icon: 'table_rows', label: 'Estimate', value: 'estimate' }, { icon: 'library_books', label: 'Library', value: 'library' }, { icon: 'insights', label: 'Insights', value: 'insights' }];
    var compact = width < 840;
    var titles = { bids: 'Bids', estimate: 'Estimate', library: 'Cost library', insights: 'Insights', settings: 'Settings' };
    var common = { doc: doc, ui: ui, api: api, d: d, width: width, peers: session.peers, demo: !cloud, company: company, companyInfo: GL.companyInfo(doc), openDialog: function (x) { dialog[1](x); }, toast: toast, toggleLock: toggleLock, deleteItem: deleteItem, deleteTask: deleteTask, canUndo: store.canUndo, canRedo: store.canRedo, setBidStatus: setBidStatus, openBid: openBid, startEstimate: startEstimate, downloadForm: downloadForm, stack: store.stack, index: store.index };
    var content = screen === 'bids' ? h(BidsScreen, common) : screen === 'estimate' ? h(EstimateScreen, common) : screen === 'library' ? h(LibraryScreen, common) : screen === 'settings' ? h(SettingsScreen, Object.assign({}, common, { session: session })) : h(InsightsScreen, common);
    /* first-run notices: joined a company, this is a sample bid, bring your team */
    var curBid = doc.bids.find(function (b) { return b.id === doc.currentBidId; });
    var onSample = screen === 'estimate' && curBid && curBid.sample;
    function deleteSample() {
      var id = curBid.id, name = curBid.name;
      api.ui({ screen: 'bids', bidId: null });
      api.update(function (dd) { dd.bids = dd.bids.filter(function (b) { return b.id !== id; }); delete dd.estimates[id]; if (dd.currentBidId === id) dd.currentBidId = dd.bids[0] ? dd.bids[0].id : null; }, { title: 'Deleted ' + name, icon: 'delete' });
      toast('Deleted the sample bid.');
    }
    var ROLE_WORD = { owner: 'an owner', estimator: 'an estimator', viewer: 'a viewer' };
    var notices = [
      session.joined ? h(M.Banner, { key: 'joined', tone: 'success', headline: 'You joined ' + session.orgName, onClose: session.onDismissJoined }, 'You’re ' + (ROLE_WORD[session.role] || 'on the team') + '.') : null,
      onSample && !ui.sampleNoticeDone ? h(M.Banner, { key: 'sample', tone: 'info', headline: 'This is a sample bid', onClose: function () { api.ui({ sampleNoticeDone: true }); }, actions: h(M.Button, { variant: 'text', size: 'xs', onClick: deleteSample }, 'Delete sample') }, 'Change any quantity and watch the total move. Nothing here is real.') : null,
      onSample && session.onInvite && store.canUndo && !ui.invitePromptDone ? h('div', { key: 'invite', className: 'gl-invitecard' },
        h('div', { className: 'gl-invitecard__text' }, h('div', { className: 'title-small' }, 'Bid with your team?'), h('div', { className: 'body-medium gl-dim' }, 'Invite an estimator to work on bids with you.')),
        h('div', { className: 'gl-invitecard__actions' },
          h(M.Button, { variant: 'text', size: 'xs', onClick: function () { api.ui({ invitePromptDone: true }); } }, 'Not now'),
          h(M.Button, { variant: 'tonal', size: 'xs', onClick: function () { api.ui({ invitePromptDone: true }); dialog[1]({ kind: 'invite' }); } }, 'Invite someone'))) : null
    ].filter(Boolean);
    var themeIcon = { system: 'contrast', light: 'light_mode', dark: 'dark_mode', sunlight: 'wb_sunny' }[ui.theme || 'system'];
    return h('div', { className: 'gl-app' + (compact ? ' is-compact' : ''), 'data-theme': ui.theme && ui.theme !== 'system' ? ui.theme : undefined, 'data-money': ui.fieldMode ? 'hidden' : undefined },
      menu.node,
      compact ? null : h(M.NavigationRail, { items: navItems, value: screen, onChange: function (v) { api.ui({ screen: v }); }, expanded: ui.railExpanded !== false && width >= 1100, onMenu: width >= 1100 ? function () { api.ui({ railExpanded: ui.railExpanded === false }); } : undefined, fab: 'add', fabLabel: 'New bid', onFab: function () { dialog[1]({ kind: 'newbid' }); }, label: 'Main', className: 'gl-rail' }),
      h('div', { className: 'gl-main' },
        h(M.TopAppBar, { className: 'gl-appbar', title: h('span', { className: 'gl-appbar__title' }, h(GL.Mark, null), h('span', { className: 'gl-appbar__brand' }, 'Benchstake'), h('span', { className: 'gl-appbar__sep' }, '/'), h('span', { className: 'gl-appbar__screen' }, titles[screen])),
          actions: h(Frag, null,
            session.onInvite ? (compact ? h(M.IconButton, { icon: 'person_add', label: 'Invite someone', onClick: function () { dialog[1]({ kind: 'invite' }); } }) : h(M.Button, { variant: 'tonal', size: 'xs', onClick: function () { dialog[1]({ kind: 'invite' }); } }, 'Invite')) : null,
            h(GL.Tip, { text: ui.fieldMode ? 'Show dollars' : 'Hide dollars (field mode)' }, h(M.IconButton, { icon: ui.fieldMode ? 'visibility_off' : 'visibility', label: ui.fieldMode ? 'Show dollars' : 'Hide dollars', toggle: true, selected: !!ui.fieldMode, onClick: function () { api.ui({ fieldMode: !ui.fieldMode }); toast(ui.fieldMode ? 'Dollars shown.' : 'Field mode: every amount is hidden until you turn it back on.'); } })),
            h(GL.Tip, { text: 'Theme' }, h(M.IconButton, { icon: themeIcon, label: 'Theme', onClick: function (e) { menu.open(e, [['system', 'Match system', 'contrast'], ['light', 'Light', 'light_mode'], ['dark', 'Dark', 'dark_mode'], ['sunlight', 'Sunlight (outdoor tablet)', 'wb_sunny']].map(function (t) { return { label: t[1], icon: t[2], selected: (ui.theme || 'system') === t[0], onClick: function () { api.ui({ theme: t[0] }); } }; }), 'Theme'); } })),
            compact ? null : h(GL.Tip, { text: 'Keyboard shortcuts (?)' }, h(M.IconButton, { icon: 'keyboard', label: 'Keyboard shortcuts', onClick: function () { dialog[1]({ kind: 'shortcuts' }); } })),
            h(M.IconButton, { icon: h('span', { className: 'm3-avatar gl-avatar' }, session.initials || 'MR'), label: 'Account', onClick: function (e) { menu.open(e, [
              { label: h('span', { className: 'gl-who' }, h('span', { className: 'gl-who__name' }, session.name || 'Maya R.'), h('span', { className: 'gl-who__org' }, session.orgName || 'Sample company')), icon: 'person', disabled: true },
              { label: 'Settings', icon: 'settings', onClick: function () { api.ui({ screen: 'settings' }); } },
              { divider: true },
              api.reset ? { label: 'Reset sample data', icon: 'restart_alt', onClick: function () { api.reset(); toast('Sample data reset.'); } } : null,
              session.onSignOut ? { label: 'Sign out', icon: 'logout', onClick: session.onSignOut } : null].filter(Boolean), 'Account'); } })) }),
        notices.length ? h('div', { className: 'gl-notices' }, notices) : null,
        h('main', { ref: mainRef, className: 'gl-content' }, content),
        compact ? h(M.NavigationBar, { items: navItems, value: screen, onChange: function (v) { api.ui({ screen: v }); }, label: 'Main', className: 'gl-navbar' }) : null),
      dlgNode,
      snack[0] ? h('div', { className: 'gl-snack' + (compact ? ' is-compact' : '') }, h(M.Snackbar, { message: snack[0].msg, action: snack[0].action, onAction: function () { if (snack[0].onAction) snack[0].onAction(); snack[1](null); }, onClose: function () { snack[1](null); } })) : null);
  }

  GL.App = App;
})();
