/* ===== Benchstake estimate workspace: sheet, quotes, bid day, checks, bid form, side pane ===== */
import { GL } from './gl.js';
import { M3 as M } from '../ds/index.js';
import * as R from 'react';
(function () {
  var h = R.createElement, useState = R.useState, useEffect = R.useEffect, useMemo = R.useMemo, useRef = R.useRef;
  var Frag = R.Fragment;
  var money = function (v, d) { return h(M.Money, { value: v, decimals: d || 0 }); };

  /* ---------- Sheet tab ---------- */
  function SheetTab(p) {
    var d = p.d, ui = p.ui, api = p.api, est = d.est;
    var menu = GL.useMenu();
    var view = ui.sheetView || 'all';
    var rows = [];
    d.items.forEach(function (it) {
      var open = ui.expanded[it.id] !== false; // expanded by default
      rows.push({ id: 'item:' + it.id, rowType: 'item', itemId: it.id, depth: 0, hasChildren: true, expanded: open, name: it.code + '  ' + it.name, code: it.code, label: it.name,
        qty: it.qty, unit: it.unit, source: it.tasks.length + ' task' + (it.tasks.length === 1 ? '' : 's'), production: null, days: it.tasks.reduce(function (a, t) { return a + (t.days || 0); }, 0) || null,
        labor: it.labor || null, equipment: it.equipment || null, material: it.material || null, sub: it.sub || null, other: it.other || null, direct: it.direct, unitCost: it.unitCost, unitPrice: it.unitPrice, ext: it.ext,
        locked: it.locked, status: it.status, selected: ui.selectedItemId === it.id, kind: undefined });
      if (open) it.tasks.forEach(function (t) {
        var src = t.type === 'crew' ? t.crewName : t.type === 'material' ? t.matName : t.type === 'sub' ? t.vendorName : (t.amount != null ? 'Lump sum' : 'Per unit');
        rows.push({ id: 'task:' + t.id, rowType: 'task', itemId: it.id, taskId: t.id, depth: 1, name: t.name, qty: t.type === 'material' ? t.matQty : t.qty, unit: t.type === 'material' ? t.matUnit : t.unit, source: src, type: t.type,
          production: t.type === 'crew' ? t.production : null, days: t.days || null, labor: t.labor || null, equipment: t.equipment || null, material: t.material || null, sub: t.sub || null, other: t.other || null,
          direct: t.total, unitCost: it.qty ? t.total / it.qty : 0, unitPrice: null, ext: null, muted: false, plug: t.plug, source_: t.source, per: t.per, perUnit: t.perUnit, amount: t.amount,
          status: t.problems.some(function (x) { return x.sev === 'error'; }) ? 'error' : t.problems.length ? 'warning' : null });
      });
    });
    var costCols = [
      { key: 'labor', header: 'Labor', type: 'money', category: 'labor', placeholder: '–', width: 96, footer: d.totals.labor },
      { key: 'equipment', header: 'Equipment', type: 'money', category: 'equipment', placeholder: '–', width: 96, footer: d.totals.equipment },
      { key: 'material', header: 'Material', type: 'money', category: 'material', placeholder: '–', width: 96, footer: d.totals.material },
      { key: 'sub', header: 'Sub', type: 'money', category: 'sub', placeholder: '–', width: 96, footer: d.totals.sub },
      { key: 'other', header: 'Other', type: 'money', category: 'other', placeholder: '–', width: 88, footer: d.totals.other }
    ];
    var priceCols = [
      { key: 'unitCost', header: 'Unit cost', type: 'money', decimals: 2, width: 92, render: function (r) { return h(M.Money, { value: r.unitCost, decimals: 2, muted: r.rowType !== 'item' }); } },
      { key: 'unitPrice', header: 'Unit price', hint: 'type to lock', type: 'money', decimals: 2, width: 108, editable: function (r) { return r.rowType === 'item'; }, render: function (r) { return r.rowType === 'item' ? h(Frag, null, r.locked ? h(M.Icon, { name: 'lock', size: 14, filled: true, className: 'gl-lockicon', label: 'Locked' }) : null, h(M.Money, { value: r.unitPrice, decimals: 2 })) : ''; } },
      { key: 'ext', header: 'Extended', type: 'money', width: 100, footer: d.totals.bidTotal, render: function (r) { return r.rowType === 'item' ? h(M.Money, { value: r.ext }) : ''; } }
    ];
    var cols = [
      { key: 'name', header: 'Pay item / task', width: 264, sticky: true, footer: d.items.length + ' pay items', render: function (r) {
        if (r.rowType === 'item') return h('span', { className: 'gl-itemcell' }, h('span', { className: 'gl-itemcode' }, r.code), h('span', { className: 'gl-itemname' }, r.label));
        return h('span', { className: 'gl-taskcell' }, r.name, r.status_ ? null : null);
      } },
      { key: 'qty', header: 'Quantity', type: 'number', decimals: 1, width: 92, editable: function (r) { return r.rowType === 'item'; }, render: function (r) { return r.qty == null ? '' : GL.fmtNum(r.qty, r.qty % 1 ? 1 : 0); } },
      { key: 'unit', header: 'Unit', align: 'center', width: 54 },
      { key: 'source', header: 'Crew / source', width: 156, render: function (r) {
        if (r.rowType === 'item') return h('span', { className: 'gl-dim' }, r.source);
        var chip = r.type === 'sub' ? h(M.StatusChip, { status: r.source_ === 'quote' ? 'selected' : r.source_ === 'self' ? 'ok' : 'pending', label: r.source_ === 'quote' ? r.source : r.source_ === 'self' ? 'Self-perform' : 'Plug', icon: r.source_ === 'plug' ? 'edit' : undefined }) : null;
        return chip || h('span', null, h(M.Icon, { name: r.type === 'crew' ? 'groups' : r.type === 'material' ? 'inventory_2' : 'receipt_long', size: 16, className: 'gl-srcicon' }), r.source);
      } },
      { key: 'production', header: 'Production', hint: 'per day', type: 'number', decimals: 0, width: 96, editable: function (r) { return r.rowType === 'task' && r.type === 'crew'; }, render: function (r) {
        if (r.rowType !== 'task') return '';
        if (r.type === 'crew') return GL.fmtNum(r.production, r.production < 10 ? 2 : 0);
        if (r.type === 'sub') return h('span', { className: 'gl-dim' }, r.source_ === 'plug' ? 'plug ' + GL.fmtMoney(r.plug, 2) : GL.fmtMoney(d.tasks[r.taskId].unitSub, 2) + '/' + r.unit);
        if (r.type === 'material') return h('span', { className: 'gl-dim' }, GL.fmtNum(r.per, 3) + ' per ' + d.items.find(function (i) { return i.id === r.itemId; }).unit);
        return h('span', { className: 'gl-dim' }, r.amount != null ? 'lump sum' : GL.fmtMoney(r.perUnit, 2) + '/' + r.unit);
      } },
      view === 'pricing' ? null : { key: 'days', header: 'Crew days', type: 'number', decimals: 1, width: 80, placeholder: '', footer: d.totals.days, render: function (r) { return r.days ? GL.fmtNum(r.days, 1) : ''; } }
    ].filter(Boolean).concat(view === 'pricing' ? [] : costCols).concat([{ key: 'direct', header: 'Cost', type: 'money', width: 104, footer: d.totals.direct }]).concat(view === 'costs' ? [] : priceCols)
      .concat([{ key: 'actions', header: '', width: 40, align: 'center', render: function (r) {
        return h(M.IconButton, { icon: 'more_vert', label: 'Actions for ' + (r.rowType === 'item' ? r.label : r.name), size: 'xs', onClick: function (e) { e.stopPropagation(); openRowMenu(e, r); } });
      } }]);

    function openRowMenu(e, r) {
      var it = d.items.find(function (i) { return i.id === r.itemId; });
      var items;
      if (r.rowType === 'item') {
        items = [
          { icon: 'add_task', label: 'Add task', onClick: function () { p.openDialog({ kind: 'task', itemId: it.id }); } },
          { icon: it.locked ? 'lock_open' : 'lock', label: it.locked ? 'Unlock price' : 'Lock price at ' + GL.fmtMoney(it.unitPrice, 2), onClick: function () { p.toggleLock(it.id); } },
          { icon: 'edit', label: 'Edit item', onClick: function () { p.openDialog({ kind: 'item', itemId: it.id }); } },
          { divider: true },
          { icon: 'delete', label: 'Delete item', onClick: function () { p.deleteItem(it.id); } }
        ];
      } else {
        items = [
          { icon: 'edit', label: 'Edit task', onClick: function () { p.openDialog({ kind: 'task', itemId: it.id, taskId: r.taskId }); } },
          r.type === 'sub' ? { icon: 'request_quote', label: 'Open quotes', onClick: function () { api.ui({ tab: 'quotes' }); } } : null,
          { divider: true },
          { icon: 'delete', label: 'Delete task', onClick: function () { p.deleteTask(r.taskId); } }
        ].filter(Boolean);
      }
      menu.open(e, items, 'Row actions');
    }

    function onEdit(row, col, value) {
      if (col.key === 'unitPrice' && row.rowType === 'item' && (value == null || value === '')) { var cur = d.items.find(function (i) { return i.id === row.itemId; }); if (cur && cur.locked) p.toggleLock(row.itemId); return; }
      if (value == null || value === '' || isNaN(value)) return;
      if (value < 0) { p.toast('Numbers here cannot be negative.'); return; }
      if (row.rowType === 'item' && col.key === 'qty') {
        var it = d.items.find(function (i) { return i.id === row.itemId; });
        api.update(function (doc) { var e = doc.estimates[doc.currentBidId]; var x = e.items.find(function (i) { return i.id === row.itemId; }); x.qty = value; },
          { title: 'Changed quantity on ' + it.code, detail: GL.fmtNum(it.qty) + ' → ' + GL.fmtNum(value) + ' ' + it.unit, icon: 'numbers' });
      } else if (row.rowType === 'item' && col.key === 'unitPrice') {
        var it2 = d.items.find(function (i) { return i.id === row.itemId; });
        value = Math.round(value * 100) / 100;
        api.update(function (doc) { doc.estimates[doc.currentBidId].locks[row.itemId] = value; },
          { title: 'Locked price on ' + it2.code, detail: GL.fmtMoney(it2.unitPrice, 2) + ' → ' + GL.fmtMoney(value, 2) + ' / ' + it2.unit, icon: 'lock' });
        p.toast('Price locked at ' + GL.fmtMoney(value, 2) + ' / ' + it2.unit + '. It stays put when costs change.', 'Undo', api.undo);
      } else if (row.rowType === 'task' && col.key === 'production') {
        var t = d.tasks[row.taskId];
        api.update(function (doc) { var x = doc.estimates[doc.currentBidId].tasks.find(function (k) { return k.id === row.taskId; }); x.production = value; },
          { title: 'Changed production on ' + t.name, detail: GL.fmtNum(t.production, 2) + ' → ' + GL.fmtNum(value, 2) + ' per day', icon: 'speed' });
      }
    }

    return h('div', { className: 'gl-sheet' },
      menu.node,
      h('div', { className: 'gl-toolbar' },
        h('div', { className: 'gl-toolbar__group' },
          h(GL.Tip, { text: 'Undo (Ctrl+Z)' }, h(M.IconButton, { icon: 'undo', label: 'Undo', disabled: !p.canUndo, onClick: api.undo })),
          h(GL.Tip, { text: 'Redo (Ctrl+Shift+Z)' }, h(M.IconButton, { icon: 'redo', label: 'Redo', disabled: !p.canRedo, onClick: api.redo })),
          h(M.Divider, { vertical: true, className: 'gl-toolbar__div' }),
          h(M.Button, { variant: 'tonal', size: 'xs', icon: 'add', onClick: function () { p.openDialog({ kind: 'item' }); } }, 'Pay item'),
          h(M.Button, { variant: 'outlined', size: 'xs', icon: 'upload_file', onClick: function () { p.openDialog({ kind: 'import' }); } }, 'Paste items'),
          h(M.Button, { variant: 'text', size: 'xs', icon: ui.expanded.__all === false ? 'unfold_more' : 'unfold_less', onClick: function () {
            var collapse = ui.expanded.__all !== false; var ex = { __all: !collapse }; d.items.forEach(function (i) { ex[i.id] = !collapse; }); api.ui({ expanded: ex });
          } }, ui.expanded.__all === false ? 'Expand all' : 'Collapse all')),
        h('div', { className: 'gl-toolbar__group' },
          h(M.SegmentedButton, { density: 'dense', label: 'Columns', value: view, onChange: function (v) { api.ui({ sheetView: v }); }, segments: [{ value: 'all', label: 'All' }, { value: 'costs', label: 'Costs' }, { value: 'pricing', label: 'Pricing' }] }))),
      d.errors && d.items.length ? h(M.Banner, { tone: 'error', compact: true, actions: h(M.Button, { variant: 'text', size: 'xs', onClick: function () { api.ui({ tab: 'checks' }); } }, 'Show me') }, d.errors + (d.errors > 1 ? ' checks must clear before this bid can go out.' : ' check must clear before this bid can go out.')) : null,
      h(GL.Grid, { label: 'Estimate sheet', columns: cols, rows: rows, footer: true, density: 'dense',
        empty: { size: 'm', icon: 'post_add', headline: 'No pay items yet', body: 'Paste the owner\'s item list from a spreadsheet, or add pay items one at a time. Each item gets priced with crew, material and sub tasks.', action: h(Frag, null,
          h(M.Button, { icon: 'upload_file', onClick: function () { p.openDialog({ kind: 'import' }); } }, 'Paste items'),
          h(M.Button, { variant: 'outlined', icon: 'add', onClick: function () { p.openDialog({ kind: 'item' }); } }, 'Add pay item')) },
        onToggle: function (r) { api.ui(function (u) { var ex = Object.assign({}, u.expanded); ex[r.itemId] = !r.expanded; return { expanded: ex }; }); },
        onSelect: function (r) { api.ui({ selectedItemId: r.itemId, paneTab: 'summary' }); },
        onEdit: onEdit }),
      h('div', { className: 'gl-sheet__foot body-small' }, 'Underlined numbers can be edited: click one or start typing. Arrow keys move, Enter saves and moves down, Esc cancels. Typing a unit price locks it; clear it to unlock.'));
  }

  /* ---------- Quotes tab ---------- */
  function QuotesTab(p) {
    var d = p.d, api = p.api;
    function pick(pkg, quoteId) {
      var q = pkg.quotes.find(function (x) { return x.id === quoteId; });
      api.update(function (doc) { var e = doc.estimates[doc.currentBidId]; var pk = e.packages.find(function (x) { return x.id === pkg.id; }); pk.selectedQuoteId = quoteId; },
        { title: quoteId === 'self' ? 'Chose self-perform for ' + pkg.name : quoteId ? 'Accepted ' + (q.vendor ? q.vendor.name : 'a quote') + ' for ' + pkg.name : 'Cleared the pick for ' + pkg.name, detail: quoteId === 'self' ? GL.fmtMoney(pkg.selfTotal) : q && q.total != null ? GL.fmtMoney(q.total) : 'back to plug', icon: 'request_quote' });
    }
    function enter(pkg, quoteId, read) { p.openDialog({ kind: 'quote', packageId: pkg.id, quoteId: quoteId || null, read: read || null }); }
    // The same numbers the tab badge and the tiles show, so each one can open exactly the packages it counts
    var waiting = d.packages.filter(function (x) { return x.quotes.some(function (q) { return q.status === 'pending'; }); });
    var unpicked = d.packages.filter(function (x) { return !x.selected && !x.selfSelected; });
    var pendingN = d.packages.reduce(function (a, x) { return a + x.quotes.filter(function (q) { return q.status === 'pending'; }).length; }, 0);
    var receivedN = d.packages.reduce(function (a, x) { return a + x.quotes.filter(function (q) { return q.status === 'received'; }).length; }, 0);
    var filter = p.ui.quoteFilter || 'all';
    if (filter === 'waiting' && !waiting.length) filter = 'all';
    var shown = filter === 'waiting' ? waiting : filter === 'unpicked' ? unpicked : d.packages;
    function setFilter(f) { api.ui({ quoteFilter: f }); }
    var filters = [['all', 'All', d.packages.length], ['waiting', 'Waiting on quotes', waiting.length], ['unpicked', 'Nothing picked', unpicked.length]];
    return h('div', { className: 'gl-quotes' },
      h('div', { className: 'gl-quotes__head' },
        h('div', { className: 'gl-tiles' },
          h(M.StatTile, { size: 's', label: 'Packages', value: String(d.packages.length), supporting: (d.packages.length - unpicked.length) + ' picked' + (unpicked.length ? ', ' + unpicked.length + ' still on plug' : ''), onClick: unpicked.length ? function () { setFilter('unpicked'); } : undefined }),
          h(M.StatTile, { size: 's', label: 'Quotes received', value: String(receivedN), supporting: pendingN ? pendingN + ' still out' : 'all in', tone: pendingN ? 'warning' : 'success', onClick: pendingN ? function () { setFilter('waiting'); } : undefined }),
          h(M.StatTile, { size: 's', label: 'Subcontract total', value: money(d.totals.sub), supporting: (d.totals.direct ? Math.round(d.totals.sub / d.totals.direct * 100) : 0) + '% of direct cost' })),
        h(M.Button, { variant: 'filled', icon: 'add', size: 's', onClick: function () { p.openDialog({ kind: 'package' }); } }, 'New quote package')),
      d.packages.length ? h('div', { className: 'm3-row', role: 'group', 'aria-label': 'Show packages' }, filters.map(function (f) { return h(M.Chip, { key: f[0], variant: 'filter', label: f[1] + (f[0] === 'all' ? '' : ' · ' + f[2]), selected: filter === f[0], disabled: !f[2], onClick: function () { setFilter(f[0]); } }); })) : null,
      shown.length ? shown.map(function (pkg) { return h(PackageCard, { key: pkg.id, pkg: pkg, d: d, pick: pick, enter: enter, highlight: p.focusPackageId === pkg.id }); })
        : d.packages.length ? h(M.EmptyState, { size: 's', icon: 'task_alt', headline: filter === 'unpicked' ? 'Every package has a pick' : 'No packages match', body: 'Show all packages to keep working on quotes.', action: h(M.Button, { variant: 'tonal', onClick: function () { setFilter('all'); } }, 'Show all') })
        : h(M.EmptyState, { icon: 'request_quote', headline: 'No quote packages yet', body: 'Group the pay items a sub or supplier will price, then type in each quote as it comes in by phone or email. Quotes line up side by side against your plug.', action: h(M.Button, { icon: 'add', onClick: function () { p.openDialog({ kind: 'package' }); } }, 'New quote package') }));
  }

  function PackageCard(p) {
    var pkg = p.pkg, d = p.d;
    var received = pkg.quotes.filter(function (q) { return q.status === 'received'; });
    var cols = [{ key: 'label', header: 'Line', width: 260, render: function (r) { return r.kind === 'total' ? 'Package total' : h('span', { className: 'gl-itemcell' }, h('span', { className: 'gl-itemcode' }, r.code), h('span', { className: 'gl-itemname' }, r.label)); } },
      { key: 'qty', header: 'Qty', type: 'number', width: 90, render: function (r) { return r.kind === 'total' ? '' : GL.fmtNum(r.qty) + ' ' + r.unit; } },
      { key: 'plug', header: 'Plug', type: 'money', decimals: 2, width: 96, render: function (r) { return r.kind === 'total' ? GL.fmtMoney(pkg.plugTotal) : r.plug != null ? GL.fmtMoney(r.plug, 2) : h('span', { className: 'gl-dim' }, '–'); } }];
    pkg.quotes.forEach(function (q) {
      var sel = pkg.selectedQuoteId === q.id;
      cols.push({ key: q.id, type: 'money', decimals: 2, width: 170, header: h('span', { className: 'gl-qhead' + (sel ? ' is-selected' : '') }, h('span', { className: 'gl-qhead__name' }, q.vendor ? q.vendor.name : 'Vendor'), h('span', { className: 'gl-qhead__row' }, h(M.StatusChip, { status: sel ? 'selected' : q.status, label: q.lump != null && q.status === 'received' && !sel ? 'Lump sum' : undefined, size: 's' }), h(M.IconButton, { icon: q.status === 'pending' ? 'edit_note' : 'edit', label: (q.status === 'pending' ? 'Enter quote from ' : 'Edit quote from ') + (q.vendor ? q.vendor.name : 'vendor'), size: 'xs', onClick: function () { p.enter(pkg, q.id); } }))),
        render: function (r) {
          if (r.kind === 'total') return q.total != null ? h('span', { className: sel ? 'gl-strong' : '' }, GL.fmtMoney(q.total), q.vsPlug != null ? h('span', { className: 'gl-vs ' + (q.vsPlug <= 0 ? 'is-under' : 'is-over') }, (q.vsPlug <= 0 ? ' ' : ' +') + (q.vsPlug * 100).toFixed(1) + '%') : null) : h('span', { className: 'gl-dim' }, q.status === 'pending' ? 'waiting' : '–');
          var up = q.unitPrices && q.unitPrices[r.itemId];
          if (up == null) return h('span', { className: 'gl-dim' }, q.status === 'received' ? 'no bid' : '–');
          var issue = q.qtyIssue && q.qtyIssue.itemId === r.itemId;
          return h('span', null, GL.fmtMoney(up, 2), issue ? h(M.Icon, { name: 'warning', size: 14, filled: true, className: 'gl-warnicon', label: 'Quantity differs' }) : null);
        } });
    });
    if (pkg.selfTotal != null) {
      var selSelf = pkg.selfSelected;
      cols.push({ key: 'self', type: 'money', width: 150, header: h('span', { className: 'gl-qhead' + (selSelf ? ' is-selected' : '') }, h('span', { className: 'gl-qhead__name' }, 'Self-perform'), h(M.StatusChip, { status: selSelf ? 'selected' : 'ok', label: selSelf ? 'Selected' : 'Our crew', size: 's' })),
        render: function (r) { if (r.kind === 'total') return h('span', { className: selSelf ? 'gl-strong' : '' }, GL.fmtMoney(pkg.selfTotal)); var s = pkg.selfSplit; return s ? GL.fmtMoney(s.labor + s.equipment + s.material, 2) : ''; } });
    }
    var rows = pkg.lines.map(function (l) { var t = d.est.tasks.find(function (x) { return x.packageId === pkg.id && x.itemId === l.itemId; }); return { id: l.itemId, itemId: l.itemId, code: l.item ? l.item.code : '', label: l.item ? l.item.name : '', qty: l.qty, unit: l.unit, plug: t ? t.plug : null }; })
      .concat([{ id: 'total', kind: 'total', label: 'Package total' }]);
    var bestNote = pkg.best && pkg.selected && pkg.best.id !== pkg.selected.id && pkg.selected.total != null ? pkg.best.vendor.name + ' is ' + GL.fmtMoney(pkg.selected.total - pkg.best.total) + ' lower than your pick.' : null;
    var pending = pkg.quotes.filter(function (q) { return q.status === 'pending'; });
    var picked = pkg.selfSelected ? 'Self-perform' : pkg.selected ? (pkg.selected.vendor ? pkg.selected.vendor.name : 'a quote') : null;
    return h('div', { className: 'gl-pkg' + (p.highlight ? ' is-focus' : '') },
      h('div', { className: 'gl-pkg__head' },
        h('div', { className: 'gl-pkg__titles' },
          h('div', { className: 'gl-pkg__titlerow' },
            h('h3', { className: 'gl-pkg__title' }, pkg.name),
            // the chips say what the tab badge and the tiles are counting
            // names up to two vendors; past that the count reads better than a list
            pending.length ? h(M.StatusChip, { status: 'pending', label: 'Waiting on ' + (pending.length > 2 ? pending.length + ' quotes' : pending.map(function (q) { return q.vendor ? q.vendor.name : 'a vendor'; }).join(' and ')), title: pending.map(function (q) { return q.vendor ? q.vendor.name : 'a vendor'; }).join(', ') + ': type the quote in when it arrives' }) : null,
            picked ? null : h(M.StatusChip, { status: 'info', icon: 'radio_button_unchecked', label: 'On plug, nothing picked' })),
          h('div', { className: 'gl-pkg__meta body-small' }, received.length + ' of ' + pkg.quotes.length + ' quote' + (pkg.quotes.length === 1 ? '' : 's') + ' in' + (pkg.best ? ' · low ' + pkg.best.vendor.name + ' ' + GL.fmtMoney(pkg.best.total) : '') + (picked ? ' · using ' + picked : '') + (pkg.sentAt ? ' · started ' + GL.fmtDate(pkg.sentAt) : ''))),
        h('div', { className: 'gl-pkg__actions' },
          h('label', { className: 'm3-btn m3-btn--outlined m3-btn--xs m3-btn--round gl-filebtn', title: 'Read a quote from a PDF or a photo' }, h(M.Icon, { name: 'document_scanner', size: 18 }), ' Quote from file', h('input', { type: 'file', accept: '.pdf,image/*', 'aria-label': 'Read a quote for ' + pkg.name + ' from a PDF or photo', onChange: function (e) { var file = e.target.files && e.target.files[0]; e.target.value = ''; if (file) p.enter(pkg, null, { file: file }); }, style: { position: 'absolute', opacity: 0, width: 1, height: 1 } })),
          h(M.Button, { variant: 'tonal', size: 'xs', icon: 'add', onClick: function () { p.enter(pkg, null); } }, 'Add quote'))),
      bestNote ? h(M.Banner, { tone: 'info', compact: true, actions: h(M.Button, { variant: 'text', size: 'xs', onClick: function () { p.pick(pkg, pkg.best.id); } }, 'Use ' + pkg.best.vendor.name) }, bestNote) : null,
      h(M.DataGrid, { label: 'Quotes for ' + pkg.name, columns: cols, rows: rows, density: 'dense' }),
      h('div', { className: 'gl-pkg__pick' },
        h('span', { className: 'label-medium gl-dim' }, 'Use:'),
        pkg.quotes.filter(function (q) { return q.status === 'received'; }).map(function (q) { return h(M.Chip, { key: q.id, variant: 'filter', label: q.vendor.name + ' · ' + GL.fmtMoney(q.total), selected: pkg.selectedQuoteId === q.id, onClick: function () { p.pick(pkg, pkg.selectedQuoteId === q.id ? null : q.id); } }); }),
        pkg.selfTotal != null ? h(M.Chip, { variant: 'filter', label: 'Self-perform · ' + GL.fmtMoney(pkg.selfTotal), selected: pkg.selfSelected, onClick: function () { p.pick(pkg, pkg.selfSelected ? null : 'self'); } }) : null,
        h(M.Chip, { variant: 'filter', label: 'Plug · ' + GL.fmtMoney(pkg.plugTotal), selected: !pkg.selected && !pkg.selfSelected, onClick: function () { p.pick(pkg, null); } }),
        pkg.quotes.filter(function (q) { return q.note; }).length ? h('span', { className: 'gl-pkg__notes body-small' }, pkg.quotes.filter(function (q) { return q.note; }).map(function (q) { return (q.vendor ? q.vendor.name.split(' ')[0] : '') + ': ' + q.note; }).join(' · ')) : null));
  }

  /* ---------- Bid day tab ---------- */
  function BidDayTab(p) {
    var d = p.d, api = p.api, mk = d.est.markup;
    var target = useState('');
    var due = GL.daysUntil(d.bid.due);
    function setMk(key, v, label) {
      var str = String(v).trim(); if (str === '') return; // an empty box keeps the old rate
      var n = Math.round(Number(str) * 1000) / 1000; if (isNaN(n) || n < 0 || n > 100) { p.toast('Use a percent from 0 to 100.'); return; }
      if (n === mk[key]) return;
      api.update(function (doc) { doc.estimates[doc.currentBidId].markup[key] = n; }, { title: 'Set ' + label + ' to ' + n + '%', detail: 'from ' + mk[key] + '%', icon: 'percent' });
    }
    function balance() {
      var t = Number(String(target[0]).replace(/[$,]/g, '')); if (!(t > 0)) return;
      var unlocked = d.items.filter(function (i) { return !i.locked && i.qty > 0 && i.direct > 0; });
      if (!unlocked.length) { p.toast('Every price is locked; unlock one to balance.'); return; }
      var diff = t - d.totals.bidTotal;
      var fixedExt = d.items.filter(function (i) { return unlocked.indexOf(i) < 0; }).reduce(function (a, i) { return a + i.ext; }, 0);
      // plan A: move it all onto the biggest unlocked item; plan B: spread in proportion to extended amounts
      var big = unlocked.reduce(function (a, i) { return i.ext > a.ext ? i : a; });
      var plan = [{ item: big, unit: Math.round((big.unitPrice + diff / big.qty) * 100) / 100 }];
      var how = 'Moved ' + GL.fmtMoney(diff) + ' onto ' + big.code + ' and locked it';
      if (plan[0].unit <= big.unitCost) {
        var sumExt = unlocked.reduce(function (a, i) { return a + i.ext; }, 0);
        plan = unlocked.map(function (i) { return { item: i, unit: Math.round((i.unitPrice + diff * (i.ext / sumExt) / i.qty) * 100) / 100 }; });
        how = 'Spread ' + GL.fmtMoney(diff) + ' across ' + plan.length + ' items and locked them';
        var bad = plan.filter(function (x) { return x.unit <= x.item.unitCost; });
        if (bad.length) { p.toast('That total would price ' + bad[0].item.code + ' below cost. Pick a higher total.'); return; }
      }
      // close the cents: rounding leaves a few dollars; put the residual on the planned item with the smallest quantity (a lump sum closes it exactly)
      var after = fixedExt + unlocked.reduce(function (a, i) { var pl = plan.find(function (x) { return x.item === i; }); return a + (pl ? pl.unit : i.unitPrice) * i.qty; }, 0);
      var residual = t - after;
      if (Math.abs(residual) >= 0.005) {
        var closer = (unlocked.filter(function (i) { return !plan.some(function (x) { return x.item === i; }); }).concat(plan.map(function (x) { return x.item; }))).reduce(function (a, i) { return i.qty < a.qty ? i : a; });
        var cp = plan.find(function (x) { return x.item === closer; });
        var base = cp ? cp.unit : closer.unitPrice;
        var closed = Math.round((base + residual / closer.qty) * 100) / 100;
        if (closed > closer.unitCost) { if (cp) cp.unit = closed; else plan.push({ item: closer, unit: closed }); }
      }
      api.update(function (doc) { var l = doc.estimates[doc.currentBidId].locks; plan.forEach(function (x) { l[x.item.id] = x.unit; }); }, { title: 'Balanced bid to ' + GL.fmtMoney(t), detail: how, icon: 'balance' });
      p.toast('Bid balanced to ' + GL.fmtMoney(t) + '.', 'Undo', api.undo);
      target[1]('');
    }
    var rows = d.items.map(function (it) { return Object.assign({ id: it.id, itemId: it.id, name: it.name, code: it.code, label: it.name, qty: it.qty, unit: it.unit, unitCost: it.unitCost, unitPrice: it.unitPrice, ext: it.ext, markupPct: it.markupPct, locked: it.locked, status: it.status, selected: p.ui.selectedItemId === it.id }); });
    var cols = [
      { key: 'label', header: 'Pay item', width: 300, render: function (r) { return h('span', { className: 'gl-itemcell' }, h('span', { className: 'gl-itemcode' }, r.code), h('span', { className: 'gl-itemname' }, r.label)); } },
      { key: 'qty', header: 'Qty', type: 'number', width: 100, render: function (r) { return GL.fmtNum(r.qty) + ' ' + r.unit; } },
      { key: 'unitCost', header: 'Unit cost', type: 'money', decimals: 2, width: 110 },
      { key: 'unitPrice', header: 'Unit price', hint: 'type to lock', type: 'money', decimals: 2, width: 120, editable: true },
      { key: 'markupPct', header: 'Markup', type: 'percent', decimals: 1, width: 90, render: function (r) { return h('span', { className: r.markupPct < 0 ? 'gl-neg' : '' }, r.markupPct.toFixed(1) + '%'); } },
      { key: 'ext', header: 'Extended', type: 'money', width: 120, footer: d.totals.bidTotal },
      { key: 'lock', header: 'Lock', align: 'center', width: 64, render: function (r) { return h(M.IconButton, { icon: r.locked ? 'lock' : 'lock_open', label: r.locked ? 'Unlock price' : 'Lock price', size: 'xs', toggle: true, selected: r.locked, onClick: function (e) { e.stopPropagation(); p.toggleLock(r.itemId); } }); } }
    ];
    return h('div', { className: 'gl-bidday' },
      due >= 0 && d.bid.status !== 'submitted' ? h(M.Banner, { tone: due <= 2 ? 'warning' : 'info', compact: true }, 'Bid due ' + (due === 0 ? 'today' : due === 1 ? 'tomorrow' : 'in ' + due + ' days') + ' · ' + GL.fmtDate(d.bid.due) + ' at ' + d.bid.dueTime + '. ' + (d.errors ? d.errors + ' check' + (d.errors > 1 ? 's' : '') + ' must clear first.' : 'Checks are clear.')) : null,
      d.bid.status === 'submitted' ? h(M.Banner, { tone: 'success', compact: true }, 'Submitted ' + GL.fmtDate(d.bid.due) + '. Prices are frozen as submitted; undo to reopen.') : null,
      h('div', { className: 'gl-tiles' },
        h(M.StatTile, { label: 'Direct cost', value: money(d.totals.direct), supporting: GL.fmtNum(d.items.length) + ' items', icon: 'construction' }),
        h(M.StatTile, { label: 'Overhead ' + mk.overhead + '%', value: money(d.totals.overhead) }),
        h(M.StatTile, { label: 'Profit ' + mk.profit + '%', value: money(d.totals.profit) }),
        h(M.StatTile, { label: 'Bond ' + mk.bond + '%', value: money(d.totals.bond) }),
        h(M.StatTile, { label: 'Bid total', value: money(d.totals.bidTotal), tone: 'primary', supporting: d.totals.lockedCount ? d.totals.lockedCount + ' locked' : 'nothing locked', icon: 'request_quote' }),
        h(M.StatTile, { label: 'Margin', value: d.totals.margin.toFixed(1), unit: '%', tone: d.totals.margin < d.est.targetMargin ? 'warning' : 'success', supporting: 'target ' + d.est.targetMargin + '%' })),
      h('div', { className: 'gl-bidday__controls' },
        h('div', { className: 'gl-card' },
          h('div', { className: 'title-medium' }, 'Markup'),
          h('div', { className: 'gl-markup' },
            [['overhead', 'Overhead'], ['profit', 'Profit'], ['bond', 'Bond'], ['tax', 'Tax on materials']].map(function (k) {
              return h(PctField, { key: k[0] + ':' + mk[k[0]], label: k[1], value: mk[k[0]], onCommit: function (v) { setMk(k[0], v, k[1].toLowerCase()); } });
            })),
          h('div', { className: 'body-small gl-dim' }, 'Multiplier ' + d.multiplier.toFixed(4) + ' on cost. Overhead on direct cost, profit on top, bond on the subtotal.')),
        h('div', { className: 'gl-card' },
          h('div', { className: 'title-medium' }, 'Balance to a round total'),
          h('div', { className: 'body-medium gl-dim' }, 'Moves the difference onto the biggest unlocked item and locks it.'),
          h('div', { className: 'm3-row', style: { gap: 8, alignItems: 'flex-start', marginTop: 8 } },
            h(GL.Field, { label: 'Target total', prefix: '$', value: target[0], placeholder: String(Math.round(d.totals.bidTotal / 1000) * 1000), inputMode: 'decimal', onChange: target[1], className: 'gl-field gl-field--money' }),
            h(M.Button, { variant: 'tonal', size: 's', icon: 'balance', onClick: balance, style: { marginTop: 8 } }, 'Balance')))),
      h(M.DataGrid, { label: 'Bid prices', columns: cols, rows: rows, footer: true, density: 'dense', onSelect: function (r) { p.ui.selectedItemId === r.itemId ? null : api.ui({ selectedItemId: r.itemId }); },
        onEdit: function (row, col, value) {
          if (col.key !== 'unitPrice') return;
          var it = d.items.find(function (i) { return i.id === row.itemId; });
          if (value == null || value === '') { if (it.locked) p.toggleLock(row.itemId); return; }
          if (isNaN(value) || value < 0) { p.toast('A unit price cannot be negative.'); return; }
          value = Math.round(value * 100) / 100;
          api.update(function (doc) { doc.estimates[doc.currentBidId].locks[row.itemId] = value; }, { title: 'Locked price on ' + it.code, detail: GL.fmtMoney(it.unitPrice, 2) + ' → ' + GL.fmtMoney(value, 2) + ' / ' + it.unit, icon: 'lock' });
          p.toast('Price locked at ' + GL.fmtMoney(value, 2) + ' / ' + it.unit + '.', 'Undo', api.undo);
        } }),
      h('div', { className: 'gl-bidday__actions' },
        h(M.Button, { variant: 'outlined', icon: 'download', onClick: function () { p.openDialog({ kind: 'export' }); } }, 'Export budget'),
        h(M.Button, { variant: 'tonal', icon: 'description', onClick: function () { api.ui({ tab: 'form', formView: 'form' }); } }, 'Bid form'),
        d.bid.status === 'submitted' ? h(M.Button, { variant: 'filled', icon: 'lock_open', onClick: function () { p.setBidStatus('in-progress'); } }, 'Reopen bid')
          : h(M.Button, { variant: 'filled', icon: 'send', disabled: d.errors > 0, onClick: function () { p.openDialog({ kind: 'submit' }); } }, 'Mark as submitted')));
  }
  // A percent box that saves once: on Enter or when focus leaves. Esc puts the saved value back.
  function PctField(p) {
    var st = useState(String(p.value));
    return h('div', { onBlur: function () { p.onCommit(st[0]); }, onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); p.onCommit(st[0]); } else if (e.key === 'Escape') st[1](String(p.value)); } },
      h(GL.Field, { label: p.label, value: st[0], suffix: '%', inputMode: 'decimal', onChange: st[1], className: 'gl-field gl-field--pct' }));
  }

  /* ---------- Checks tab ---------- */
  function ChecksTab(p) {
    var d = p.d, api = p.api;
    var groups = [['error', 'Must fix'], ['warning', 'Worth a look'], ['ok', 'Passed']];
    var passed = d.checks.filter(function (c) { return c.sev === 'ok'; }).length;
    return h('div', { className: 'gl-checks' },
      h('div', { className: 'gl-tiles' },
        h(M.StatTile, { label: 'Must fix', value: String(d.errors), tone: d.errors ? 'error' : 'success', icon: d.errors ? 'error' : 'check_circle', supporting: d.errors ? 'blocks submission' : 'nothing blocking' }),
        h(M.StatTile, { label: 'Worth a look', value: String(d.warnings), tone: d.warnings ? 'warning' : 'default', icon: 'warning' }),
        h(M.StatTile, { label: 'Passed', value: String(passed), tone: 'default', icon: 'task_alt' })),
      h('p', { className: 'body-medium gl-dim gl-checks__intro' }, 'Checks run after every change. The same flags show on the sheet rows.'),
      groups.map(function (g) {
        var list = d.checks.filter(function (c) { return c.sev === g[0]; });
        if (!list.length) return null;
        return h('div', { key: g[0], className: 'gl-checks__group' },
          h('h3', { className: 'title-small gl-checks__title' }, g[1] + ' · ' + list.length),
          h('ul', { className: 'gl-checks__list' }, list.map(function (c, i) {
            return h('li', { key: i, className: 'gl-check gl-check--' + c.sev },
              h(M.StatusChip, { status: c.sev === 'ok' ? 'ok' : c.sev, label: c.sev === 'ok' ? 'OK' : c.sev === 'error' ? 'Fix' : 'Check' }),
              h('div', { className: 'gl-check__text' }, h('div', { className: 'gl-check__title' }, c.title), h('div', { className: 'gl-check__detail body-small' }, c.detail)),
              c.tab ? h(M.Button, { variant: 'text', size: 'xs', trailingIcon: 'arrow_forward', onClick: function () { api.ui({ tab: c.tab, selectedItemId: c.itemId || null, focusPackageId: c.packageId || null }); } }, 'Go to') : null);
          })));
      }));
  }

  /* ---------- Form tab: bid form, crew plan, budget export ---------- */
  function FormTab(p) {
    var d = p.d, api = p.api, ui = p.ui;
    var view = ui.formView || 'form';
    var today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var body;
    if (view === 'form') {
      body = h('div', { className: 'gl-paper' },
        h('div', { className: 'gl-paper__head' },
          h('div', null, h('div', { className: 'gl-paper__eyebrow' }, 'Schedule of bid items'), h('h2', { className: 'gl-paper__title' }, d.bid.name), h('div', { className: 'gl-paper__meta' }, 'Owner: ' + d.bid.owner + ' · Bids due ' + GL.fmtDate(d.bid.due) + ' at ' + d.bid.dueTime)),
          h('div', { className: 'gl-paper__bidder' }, h('div', null, 'Bidder: ' + (p.company || '') + (p.companyInfo && p.companyInfo.address ? ', ' + p.companyInfo.address : '') + (p.companyInfo && p.companyInfo.phone ? ' · ' + p.companyInfo.phone : '') + (p.companyInfo && p.companyInfo.license ? ' · License ' + p.companyInfo.license : '')), h('div', null, 'Estimator: ' + d.bid.estimator), h('div', null, 'Prepared ' + today))),
        h('table', { className: 'gl-paper__table' },
          h('thead', null, h('tr', null, h('th', null, 'Item'), h('th', null, 'Description'), h('th', { className: 'num' }, 'Quantity'), h('th', null, 'Unit'), h('th', { className: 'num' }, 'Unit price'), h('th', { className: 'num' }, 'Amount'))),
          h('tbody', null, d.items.map(function (it) { return h('tr', { key: it.id }, h('td', null, it.code), h('td', null, it.name), h('td', { className: 'num' }, GL.fmtNum(it.qty)), h('td', null, it.unit), h('td', { className: 'num' }, GL.fmtMoney(it.unitPrice, 2)), h('td', { className: 'num' }, GL.fmtMoney(it.ext, 2))); })),
          h('tfoot', null, h('tr', null, h('td', { colSpan: 5 }, 'Total bid'), h('td', { className: 'num' }, GL.fmtMoney(d.totals.bidTotal, 2))))),
        h('div', { className: 'gl-paper__sig' }, h('div', null, h('div', { className: 'gl-paper__line' }), 'Authorized signature'), h('div', null, h('div', { className: 'gl-paper__line' }), 'Title'), h('div', null, h('div', { className: 'gl-paper__line' }), 'Date')));
    } else if (view === 'crew') {
      var rows = [];
      d.items.forEach(function (it) {
        var crewTasks = it.tasks.filter(function (t) { return t.type === 'crew'; });
        if (!crewTasks.length) return;
        rows.push({ id: it.id, kind: 'group', label: it.code + ' ' + it.name, qty: GL.fmtNum(it.qty) + ' ' + it.unit, crew: '', production: '', days: crewTasks.reduce(function (a, t) { return a + t.days; }, 0), people: '', cost: it.direct });
        crewTasks.forEach(function (t) { rows.push({ id: t.id, label: t.name, qty: '', crew: t.crewName, production: GL.fmtNum(t.production, t.production < 10 ? 2 : 0) + ' ' + t.unit + '/day', days: t.days, people: t.people + ' people', cost: t.labor + t.equipment, depth: 1 }); });
      });
      body = h('div', { 'data-money': ui.showDollarsCrew ? undefined : 'hidden', className: 'gl-crewplan' },
        h('div', { className: 'gl-crewplan__bar' },
          h('div', { className: 'body-medium' }, 'For the superintendent and foremen: what to build, with which crew, how fast. Dollar figures are hidden unless you turn them on.'),
          h(M.Switch, { label: 'Show dollars', checked: !!ui.showDollarsCrew, onChange: function (v) { api.ui({ showDollarsCrew: v }); } })),
        h(GL.Grid, { label: 'Crew plan', density: 'standard', rows: rows, empty: { icon: 'groups', headline: 'No crew work yet', body: 'Crew tasks on the Sheet show up here as a plan for the field: what to build, which crew, how fast.' }, columns: [
          { key: 'label', header: 'Work', width: 320, render: function (r) { return r.kind === 'group' ? r.label : h('span', { style: { paddingLeft: 20 } }, r.label); } },
          { key: 'qty', header: 'Quantity', width: 120 }, { key: 'crew', header: 'Crew', width: 160 }, { key: 'production', header: 'Production', width: 160 },
          { key: 'days', header: 'Crew days', type: 'number', decimals: 1, width: 100 }, { key: 'people', header: 'People', width: 90 },
          { key: 'cost', header: 'Cost', width: 120, align: 'end', render: function (r) { return h(M.Money, { value: r.cost }); } }] }));
    } else {
      var sys = ui.exportSystem || 'qbo';
      var systems = { qbo: 'QuickBooks Online (CSV)', qbd: 'QuickBooks Desktop (IIF)', spectrum: 'Viewpoint Spectrum (CSV)', vista: 'Viewpoint Vista (CSV)', sage: 'Sage 300 CRE (CSV)' };
      body = h('div', { className: 'gl-export' },
        h('div', { className: 'gl-export__bar' },
          h(GL.Select, { label: 'Accounting system', value: sys, options: Object.keys(systems).map(function (k) { return { value: k, label: systems[k] }; }), onChange: function (v) { api.ui({ exportSystem: v }); } }),
          h(M.Button, { variant: 'filled', icon: 'download', onClick: function () { p.openDialog({ kind: 'export' }); } }, 'Download CSV'),
          h('div', { className: 'body-small gl-dim' }, sys === 'qbd' || sys === 'qbo' ? 'QuickBooks gets an estimate: one line per pay item with quantity, unit price and amount. The cost split rides along for job costing.' : 'Phase codes come from the pay item codes; cost types map to ' + systems[sys] + "'s labor, equipment, material, subcontract and other.")),
        h(GL.Grid, { label: 'Budget export preview', density: 'dense', zebra: true, empty: { icon: 'account_balance', headline: 'Nothing to export yet', body: 'Pay items with a price show up here, one row per item, in the layout your accounting system expects.' }, rows: d.items.map(function (it) { return { id: it.id, phase: it.code, desc: it.name, qty: it.qty, unit: it.unit, labor: it.labor || null, equipment: it.equipment || null, material: it.material || null, sub: it.sub || null, other: it.other || null, total: it.direct }; }), footer: true, columns: [
          { key: 'phase', header: sys === 'qbo' || sys === 'qbd' ? 'Item' : 'Phase', width: 90 }, { key: 'desc', header: 'Description', width: 260 }, { key: 'qty', header: 'Qty', type: 'number', decimals: 2, width: 90, render: function (r) { return GL.fmtNum(r.qty, r.qty % 1 ? 2 : 0); } }, { key: 'unit', header: 'UM', width: 60, align: 'center' },
          { key: 'labor', header: sys === 'sage' ? 'L (1)' : 'Labor', type: 'money', category: 'labor', placeholder: '–', footer: d.totals.labor }, { key: 'equipment', header: sys === 'sage' ? 'E (2)' : 'Equipment', type: 'money', category: 'equipment', placeholder: '–', footer: d.totals.equipment },
          { key: 'material', header: sys === 'sage' ? 'M (3)' : 'Material', type: 'money', category: 'material', placeholder: '–', footer: d.totals.material }, { key: 'sub', header: sys === 'sage' ? 'S (4)' : 'Subcontract', type: 'money', category: 'sub', placeholder: '–', footer: d.totals.sub },
          { key: 'other', header: sys === 'sage' ? 'O (5)' : 'Other', type: 'money', category: 'other', placeholder: '–', footer: d.totals.other }, { key: 'total', header: 'Budget', type: 'money', footer: d.totals.direct }] }));
    }
    return h('div', { className: 'gl-form' },
      h('div', { className: 'gl-form__bar' },
        h(M.SegmentedButton, { label: 'Document', value: view, onChange: function (v) { api.ui({ formView: v }); }, segments: [{ value: 'form', label: 'Bid form', icon: 'description' }, { value: 'crew', label: 'Crew plan', icon: 'groups' }, { value: 'export', label: 'Budget export', icon: 'account_balance' }] }),
        view === 'form' ? h(M.Button, { variant: 'tonal', size: 's', icon: 'download', onClick: function () { p.downloadForm(); } }, 'Save bid form') : null),
      view === 'form' && d.errors ? h(M.Banner, { tone: 'warning', compact: true, actions: h(M.Button, { variant: 'text', size: 'xs', onClick: function () { api.ui({ tab: 'checks' }); } }, 'Show checks') }, d.errors + ' check' + (d.errors > 1 ? 's' : '') + ' must clear before this bid goes out. You can still save a draft of the form.') : null,
      body);
  }

  /* ---------- Side pane: summary + history ---------- */
  function SidePane(p) {
    var d = p.d, ui = p.ui, api = p.api;
    var sel = ui.selectedItemId ? d.items.find(function (i) { return i.id === ui.selectedItemId; }) : null;
    var entries = p.stack.map(function (s, i) { return Object.assign({}, s.entry, { current: i === p.index, future: i > p.index }); });
    var tab = ui.paneTab || 'summary';
    return h('aside', { className: 'gl-pane', 'aria-label': 'Estimate summary' },
      h(M.Tabs, { variant: 'secondary', value: tab, onChange: function (v) { api.ui({ paneTab: v }); }, tabs: [{ value: 'summary', label: 'Summary' }, { value: 'history', label: 'History', badge: p.index > 0 ? p.index : undefined }] }),
      tab === 'summary' ? h('div', { className: 'gl-pane__body' },
        h('div', { className: 'gl-pane__tiles' },
          h(M.StatTile, { size: 's', label: 'Bid total', value: money(d.totals.bidTotal), tone: 'primary' }),
          h(M.StatTile, { size: 's', label: 'Margin', value: d.totals.margin.toFixed(1), unit: '%', supporting: 'target ' + d.est.targetMargin + '%' })),
        h(M.CostBar, { label: 'Direct cost', segments: [{ category: 'labor', value: d.totals.labor }, { category: 'equipment', value: d.totals.equipment }, { category: 'material', value: d.totals.material }, { category: 'sub', value: d.totals.sub }, { category: 'other', value: d.totals.other }] }),
        h(M.Divider, null),
        sel ? h('div', { className: 'gl-selected' },
          h('div', { className: 'label-medium gl-dim' }, 'Selected item'),
          h('div', { className: 'title-medium' }, sel.code + ' ' + sel.name),
          h('div', { className: 'body-small gl-dim' }, GL.fmtNum(sel.qty) + ' ' + sel.unit + ' · unit cost ' + GL.fmtMoney(sel.unitCost, 2) + ' · price ' + GL.fmtMoney(sel.unitPrice, 2) + (sel.locked ? ' (locked)' : '')),
          sel.problems.length ? h('ul', { className: 'gl-selected__problems' }, sel.problems.map(function (pr, i) { return h('li', { key: i }, h(M.StatusChip, { status: pr.sev, label: pr.sev === 'error' ? 'Fix' : 'Check' }), ' ', pr.msg); })) : null,
          h('div', { className: 'm3-row', style: { gap: 8, marginTop: 8 } },
            h(M.Button, { variant: 'tonal', size: 'xs', icon: 'add_task', onClick: function () { p.openDialog({ kind: 'task', itemId: sel.id }); } }, 'Add task'),
            h(M.Button, { variant: 'outlined', size: 'xs', icon: sel.locked ? 'lock_open' : 'lock', onClick: function () { p.toggleLock(sel.id); } }, sel.locked ? 'Unlock' : 'Lock price'),
            h(M.IconButton, { icon: 'delete', label: 'Delete item', size: 'xs', onClick: function () { p.deleteItem(sel.id); } })))
          : h('div', { className: 'body-small gl-dim' }, 'Select a row on the sheet to see its tasks and actions here.'),
        h(M.Divider, null),
        h('div', { className: 'gl-pane__facts body-small' },
          h('div', null, h('span', null, 'Crew days'), h('span', null, GL.fmtNum(d.totals.days, 0))),
          h('div', null, h('span', null, 'Sub share'), h('span', null, (d.totals.direct ? Math.round(d.totals.sub / d.totals.direct * 100) : 0) + '%')),
          h('div', null, h('span', null, 'Locked prices'), h('span', null, String(d.totals.lockedCount))),
          h('div', null, h('span', null, 'Checks'), h('span', null, d.errors + ' to fix · ' + d.warnings + ' to look at'))))
      : h('div', { className: 'gl-pane__body' },
        h('div', { className: 'body-small gl-dim gl-pane__hint' }, 'Every change, who made it and when. Click a step to go back to it; make a change there and the later steps are discarded.'),
        h(M.HistoryList, { entries: entries, onJump: function (e, i) { api.jump(i); }, label: 'Estimate history' })));
  }

  GL.SheetTab = SheetTab; GL.QuotesTab = QuotesTab; GL.BidDayTab = BidDayTab; GL.ChecksTab = ChecksTab; GL.FormTab = FormTab; GL.SidePane = SidePane;
})();
