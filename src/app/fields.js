/* ===== Benchstake fields: date and time inputs that open real pickers =====
   Both are composed from design-system parts (TextField, IconButton, DatePicker, Menu styling) and keep
   the app's storage formats: dates as 'YYYY-MM-DD', times as 'h:mm AM'. Typing works on a keyboard;
   on touch screens the field itself opens the picker. */
import { GL } from './gl.js';
import { M3 as M } from '../ds/index.js';
import * as R from 'react';
(function () {
  var h = R.createElement, useState = R.useState, useEffect = R.useEffect, useRef = R.useRef;
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function touchScreen() { return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }

  /* ---------- dates ---------- */
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateOf(iso) { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return null; var d = new Date(iso + 'T00:00:00'); return isNaN(d) ? null : d; }
  function showDate(iso) { var d = dateOf(iso); return d ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : ''; }
  function valid(y, m, d) { if (m < 1 || m > 12 || d < 1 || d > 31) return null; var dt = new Date(y, m - 1, d); return dt.getMonth() === m - 1 && dt.getDate() === d ? isoOf(dt) : null; }
  // Accepts 11/12/2026, 11/12/26, 11/12, 11-12-2026, 2026-11-12, Nov 12, Nov 12 2026, 12 Nov 2026
  function parseDate(text) {
    var t = String(text || '').trim().toLowerCase();
    if (!t) return '';
    var y = new Date().getFullYear(), m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return valid(+m[1], +m[2], +m[3]);
    if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2}|\d{4}))?$/))) { var yy = m[3] ? +m[3] : y; if (m[3] && m[3].length === 2) yy += 2000; return valid(yy, +m[1], +m[2]); }
    var mon = null, day = null, yr = null;
    if ((m = t.match(/^([a-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/))) { mon = m[1]; day = +m[2]; yr = m[3]; }
    else if ((m = t.match(/^(\d{1,2})\s+([a-z]{3,9})\.?(?:,?\s+(\d{4}))?$/))) { mon = m[2]; day = +m[1]; yr = m[3]; }
    if (mon) { var mi = MONTHS.indexOf(mon.slice(0, 3)); return mi < 0 ? null : valid(yr ? +yr : y, mi + 1, day); }
    return null;
  }
  GL.parseDate = parseDate;
  GL.showDate = showDate;

  function PickerLayer(p) {
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); p.onClose(); } }
      document.addEventListener('keydown', onKey, true);
      return function () { document.removeEventListener('keydown', onKey, true); };
    }, []);
    return h('div', { className: 'gl-picker-layer', role: 'presentation' },
      h('div', { className: 'm3-scrim', onClick: p.onClose, 'aria-hidden': 'true' }),
      h('div', { className: 'gl-picker', role: 'dialog', 'aria-modal': true, 'aria-label': p.label }, p.children));
  }

  // DateField: label, value ('YYYY-MM-DD' or ''), onChange(iso | '' | null-on-garbage), supportingText, required, className, min
  function DateField(p) {
    var text = useState(showDate(p.value));
    var bad = useState(false);
    var open = useState(false);
    var ref = useRef(null);
    var lastValue = useRef(p.value);
    useEffect(function () { if (p.value !== lastValue.current) { lastValue.current = p.value; text[1](showDate(p.value)); bad[1](false); } }, [p.value]);
    function commit(raw) {
      var iso = parseDate(raw);
      if (iso === null) { bad[1](true); if (p.value) { lastValue.current = ''; p.onChange(''); } return; }
      bad[1](false); lastValue.current = iso; text[1](showDate(iso)); if (iso !== p.value) p.onChange(iso);
    }
    function pick(d) { var iso = d ? isoOf(d) : ''; open[1](false); bad[1](false); lastValue.current = iso; text[1](showDate(iso)); if (iso !== p.value) p.onChange(iso); setTimeout(function () { var el = ref.current && ref.current.querySelector('input'); if (el) el.focus(); }, 0); }
    var touch = touchScreen();
    var today = new Date();
    return h('div', { ref: ref, className: 'gl-datefield' + (p.className ? ' ' + p.className : '') },
      h(M.TextField, { variant: 'outlined', className: 'gl-field', label: p.label, value: text[0], required: p.required, placeholder: 'MM/DD/YYYY', inputMode: 'numeric', autoComplete: 'off',
        readOnly: touch || undefined, onClick: touch ? function () { open[1](true); } : undefined,
        supportingText: bad[0] ? 'Use MM/DD/YYYY, like ' + (today.getMonth() + 1) + '/' + today.getDate() + '/' + today.getFullYear() : p.supportingText, error: bad[0],
        onChange: function (v) { text[1](v); if (bad[0]) bad[1](false); },
        onBlur: function () { commit(text[0]); },
        onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(text[0]); } else if (e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); open[1](true); } },
        trailingIcon: h(M.IconButton, { icon: 'calendar_today', label: 'Choose ' + (p.label || 'date').toLowerCase().replace(/\*$/, ''), size: 's', onClick: function () { open[1](true); } }) }),
      open[0] ? h(PickerLayer, { label: p.label || 'Date', onClose: function () { open[1](false); } },
        h(M.DatePicker, { title: p.label ? p.label.replace(/\*$/, '') : 'Select date', defaultValue: dateOf(p.value) || null, today: today, onCancel: function () { open[1](false); }, onConfirm: function (d) { if (d) pick(d); else open[1](false); } })) : null);
  }
  GL.DateField = DateField;

  /* ---------- times ---------- */
  // '2:00 PM' <-> minutes since midnight
  function minutesOf(s) {
    var m = String(s || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a|p)?\.?m?\.?$/);
    if (!m) return null;
    var hr = +m[1], mn = m[2] ? +m[2] : 0;
    if (mn > 59) return null;
    if (m[3]) { if (hr < 1 || hr > 12) return null; hr = hr % 12 + (m[3] === 'p' ? 12 : 0); }
    else { if (hr > 23) return null; if (hr >= 1 && hr <= 6 && !m[2]) hr += 12; } // a bare "2" means 2 PM on bid day
    return hr * 60 + mn;
  }
  function showTime(mins) { var hr = Math.floor(mins / 60), mn = mins % 60; return (hr % 12 || 12) + ':' + pad(mn) + ' ' + (hr < 12 ? 'AM' : 'PM'); }
  function parseTime(s) { var m = minutesOf(s); return m == null ? null : showTime(m); }
  GL.parseTime = parseTime;

  function TimeList(p) {
    var ref = useRef(null);
    useEffect(function () {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target) && !(p.anchor && p.anchor.contains(e.target))) p.onClose(); }
      function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); p.onClose(); } }
      document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey, true);
      var sel = ref.current && ref.current.querySelector('.is-selected'); if (sel) sel.scrollIntoView({ block: 'center' });
      return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey, true); };
    }, []);
    var r = p.anchor.getBoundingClientRect();
    var below = window.innerHeight - r.bottom > 300 || r.top < 300;
    var style = { position: 'fixed', zIndex: 45, left: Math.max(8, Math.min(r.left, window.innerWidth - 200)), width: Math.max(r.width, 180) };
    if (below) style.top = r.bottom + 4; else style.bottom = window.innerHeight - r.top + 4;
    return h('div', { ref: ref, className: 'gl-timelist', role: 'listbox', 'aria-label': p.label, style: style },
      p.times.map(function (t) { var sel = t === p.value; return h('button', { key: t, type: 'button', role: 'option', 'aria-selected': sel, className: 'gl-timelist__item' + (sel ? ' is-selected' : ''), onClick: function () { p.onPick(t); } }, sel ? h(M.Icon, { name: 'check', size: 18 }) : h('span', { className: 'gl-timelist__gap' }), t); }));
  }

  // TimeField: label, value ('2:00 PM'), onChange(text), className. Every half hour from 6 AM to 6 PM, plus whatever is typed.
  function TimeField(p) {
    var text = useState(p.value || '');
    var bad = useState(false);
    var open = useState(false);
    var ref = useRef(null);
    var lastValue = useRef(p.value);
    useEffect(function () { if (p.value !== lastValue.current) { lastValue.current = p.value; text[1](p.value || ''); bad[1](false); } }, [p.value]);
    function commit(raw) {
      if (!String(raw).trim()) { bad[1](false); lastValue.current = ''; text[1](''); if (p.value) p.onChange(''); return; }
      var t = parseTime(raw);
      if (t === null) { bad[1](true); return; }
      bad[1](false); lastValue.current = t; text[1](t); if (t !== p.value) p.onChange(t);
    }
    function pick(t) { open[1](false); commit(t); var el = ref.current && ref.current.querySelector('input'); if (el) el.focus(); }
    var times = [];
    for (var m = 6 * 60; m <= 18 * 60; m += 30) times.push(showTime(m));
    var cur = parseTime(p.value); if (cur && times.indexOf(cur) < 0) { times.push(cur); times.sort(function (a, b) { return minutesOf(a) - minutesOf(b); }); }
    var touch = touchScreen();
    return h('div', { ref: ref, className: 'gl-timefield' + (p.className ? ' ' + p.className : '') },
      h(M.TextField, { variant: 'outlined', className: 'gl-field', label: p.label, value: text[0], placeholder: '2:00 PM', autoComplete: 'off', required: p.required,
        readOnly: touch || undefined, onClick: touch ? function () { open[1](true); } : undefined,
        supportingText: bad[0] ? 'Use a time like 2:00 PM' : p.supportingText, error: bad[0],
        onChange: function (v) { text[1](v); if (bad[0]) bad[1](false); },
        onBlur: function () { if (!open[0]) commit(text[0]); },
        onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(text[0]); open[1](false); } else if (e.key === 'ArrowDown') { e.preventDefault(); open[1](true); } },
        trailingIcon: h(M.IconButton, { icon: 'schedule', label: 'Choose ' + (p.label || 'time').toLowerCase(), size: 's', onClick: function () { open[1](!open[0]); } }) }),
      open[0] && ref.current ? h(TimeList, { anchor: ref.current, label: p.label || 'Time', times: times, value: cur, onPick: pick, onClose: function () { open[1](false); } }) : null);
  }
  GL.TimeField = TimeField;
})();
