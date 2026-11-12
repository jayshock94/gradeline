/* ===== Benchstake app core: store with undo history, shell, shared widgets ===== */
import { GL } from './gl.js';
import { M3 as M } from '../ds/index.js';
import * as R from 'react';
(function () {
  var h = R.createElement, useState = R.useState, useEffect = R.useEffect, useMemo = R.useMemo, useRef = R.useRef, useCallback = R.useCallback;
  var Frag = R.Fragment;
  GL.h = h;

  function uid(prefix) { return prefix + Math.random().toString(36).slice(2, 10); }
  GL.uid = uid;

  /* ---------- small shared widgets ---------- */
  function useWidth() {
    var st = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(function () { function f() { st[1](window.innerWidth); } window.addEventListener('resize', f); return function () { window.removeEventListener('resize', f); }; }, []);
    return st[0];
  }
  GL.useWidth = useWidth;

  function Select(p) {
    var id = R.useId ? R.useId() : uid('sel');
    return h('label', { className: 'gl-select' + (p.className ? ' ' + p.className : ''), htmlFor: id },
      p.label ? h('span', { className: 'gl-select__label' }, p.label) : null,
      h('span', { className: 'gl-select__box' },
        h('select', { id: id, value: p.value == null ? '' : p.value, onChange: function (e) { p.onChange(e.target.value); }, disabled: p.disabled },
          p.placeholder ? h('option', { value: '' }, p.placeholder) : null,
          (p.options || []).map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); })),
        h(M.Icon, { name: 'arrow_drop_down', size: 24 })),
      p.supporting ? h('span', { className: 'gl-select__support' }, p.supporting) : null);
  }
  GL.Select = Select;

  function Field(p) { return h(M.TextField, Object.assign({ variant: 'outlined', className: 'gl-field' }, p)); }
  GL.Field = Field;

  // Anchored menu: renders an M3.Menu in a fixed layer at the trigger
  function MenuLayer(p) {
    var ref = useRef(null);
    useEffect(function () {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) p.onClose(); }
      function onKey(e) { if (e.key === 'Escape') p.onClose(); }
      // pointerdown, not mousedown: a finger that starts scrolling the page behind the menu closes it too (a swipe sends no mouse events)
      document.addEventListener('pointerdown', onDoc); document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey); };
    }, []);
    var x = p.at.x, y = p.at.y;
    var style = { position: 'fixed', zIndex: 40, top: Math.min(y, window.innerHeight - 320), left: Math.min(x, window.innerWidth - 300) };
    if (p.at.right) { style.left = 'auto'; style.right = Math.max(8, window.innerWidth - p.at.right); }
    return h('div', { ref: ref, style: style }, h(M.Menu, { items: p.items.map(function (it) { return it.divider ? it : Object.assign({}, it, { onClick: function () { p.onClose(); if (it.onClick) it.onClick(); } }); }), label: p.label }));
  }
  function useMenu() {
    var st = useState(null);
    return {
      open: function (e, items, label) {
        var r = e.currentTarget.getBoundingClientRect();
        st[1]({ at: { x: r.left, y: r.bottom + 4, right: r.right }, items: items, label: label });
      },
      close: function () { st[1](null); },
      node: st[0] ? h(MenuLayer, { at: st[0].at, items: st[0].items, label: st[0].label, onClose: function () { st[1](null); } }) : null
    };
  }
  GL.useMenu = useMenu;

  // Grid: a DataGrid that shows a real empty state when there are no rows.
  // `asList`: draw it as a DataList (phones). `onListSelect(row)`: what a tap on a list row does when the table itself has no row click.
  // `empty`: { icon, headline, body, action } for "nothing here yet"; `filtered`: { headline, onClear } when a filter or search hid every row.
  function Grid(p) {
    var rows = p.rows || [];
    // on a narrow screen the same columns draw a list (each column's `role` says where it goes); tapping a row opens the record
    if (rows.length || (!p.empty && !p.filtered)) return p.asList ? h(M.DataList, { label: p.label, columns: p.columns, rows: rows, onSelect: p.onListSelect || p.onSelect, className: p.className }) : h(M.DataGrid, p);
    var f = p.filtered, e = p.empty || {};
    var inner = f && f.active
      ? h(M.EmptyState, { size: 's', icon: 'filter_alt_off', headline: f.headline || 'No matches', body: f.body || 'Nothing here matches that filter.', action: f.onClear ? h(M.Button, { variant: 'tonal', size: 's', onClick: f.onClear }, f.clearLabel || 'Show all') : null })
      : h(M.EmptyState, { size: e.size || 's', icon: e.icon || 'inbox', headline: e.headline || 'Nothing here yet', body: e.body, action: e.action });
    return h('div', { className: 'gl-grid-empty' + (p.className ? ' ' + p.className : ''), role: 'status', 'aria-label': p.label }, inner);
  }
  GL.Grid = Grid;

  function Section(p) {
    return h('section', { className: 'gl-section' + (p.className ? ' ' + p.className : '') },
      (p.title || p.actions) ? h('div', { className: 'gl-section__head' },
        h('div', null, p.title ? h('h2', { className: 'gl-section__title' }, p.title) : null, p.subtitle ? h('div', { className: 'gl-section__sub' }, p.subtitle) : null),
        p.actions ? h('div', { className: 'gl-section__actions' }, p.actions) : null) : null,
      p.children);
  }
  GL.Section = Section;

  function Mark(p) { // Benchstake mark: a stepped grade line in a rounded square
    var s = p.size || 28;
    return h('svg', { width: s, height: s, viewBox: '0 0 28 28', 'aria-hidden': 'true', className: 'gl-mark' },
      h('rect', { x: 0, y: 0, width: 28, height: 28, rx: 8, fill: 'var(--primary-container)' }),
      h('path', { d: 'M5 21h5l3-5h3l3-5h4', fill: 'none', stroke: 'var(--on-primary-container)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }));
  }
  GL.Mark = Mark;

  // A tooltip names an icon on hover. A touch screen has no hover: the tip would open on the tap and hang there, so it is left out.
  function noHover() { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches; }
  function Tip(p) { return noHover() ? p.children : h(M.Tooltip, { text: p.text, placement: p.placement || 'bottom' }, p.children); }
  GL.Tip = Tip;

  /* ---------- shortcuts dialog ---------- */
  function ShortcutsDialog(p) {
    var rows = [['Undo', 'Ctrl+Z'], ['Redo', 'Ctrl+Shift+Z'], ['Edit the focused cell', 'Enter'], ['Commit and move down', 'Enter'], ['Commit and move across', 'Tab'], ['Cancel an edit', 'Esc'], ['Lock or unlock the selected price', 'L'], ['Go to Sheet / Quotes / Bid day / Checks / Form', '1 … 5'], ['This list', '?']];
    return h(M.Dialog, { headline: 'Keyboard shortcuts', icon: 'keyboard', onClose: p.onClose, actions: h(M.Button, { variant: 'text', onClick: p.onClose }, 'Close') },
      h('table', { className: 'gl-shortcuts' }, h('tbody', null, rows.map(function (r, i) { return h('tr', { key: i }, h('td', null, r[0]), h('td', null, h(M.Kbd, { keys: r[1] }))); }))));
  }
  GL.ShortcutsDialog = ShortcutsDialog;
})();
