/* Gradeline design system runtime (generated from the Gradeline design system artifact; edit there, then re-vendor). */
/* @ds-bundle: {"format":4,"namespace":"M3","components":[{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"FAB"},{"name":"ExtendedFAB"},{"name":"FABMenu"},{"name":"SegmentedButton"},{"name":"ButtonGroup"},{"name":"SplitButton"},{"name":"Badge"},{"name":"LoadingIndicator"},{"name":"ProgressIndicator"},{"name":"Snackbar"},{"name":"Tooltip"},{"name":"BottomSheet"},{"name":"Card"},{"name":"Carousel"},{"name":"Dialog"},{"name":"Divider"},{"name":"List"},{"name":"ListItem"},{"name":"SideSheet"},{"name":"TopAppBar"},{"name":"NavigationBar"},{"name":"NavigationDrawer"},{"name":"NavigationRail"},{"name":"Tabs"},{"name":"Toolbar"},{"name":"Checkbox"},{"name":"Chip"},{"name":"DatePicker"},{"name":"Menu"},{"name":"Radio"},{"name":"Slider"},{"name":"Switch"},{"name":"TimePicker"},{"name":"TextField"},{"name":"Search"},{"name":"Delta"},{"name":"Money"},{"name":"StatusChip"},{"name":"Banner"},{"name":"Kbd"},{"name":"StatTile"},{"name":"CostBar"},{"name":"HistoryList"},{"name":"SetupSteps"},{"name":"EmptyState"},{"name":"DataGrid"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useRef = React.useRef;
  var useId = React.useId || function () { var r = useRef('m3-' + Math.random().toString(36).slice(2, 8)); return r.current; };

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(' ');
  }
  function omit(o, keys) {
    var r = {};
    for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k) && keys.indexOf(k) < 0) r[k] = o[k]; }
    return r;
  }
  // controlled-or-uncontrolled value
  function useControl(value, def, onChange) {
    var s = useState(def);
    var isCtl = value !== undefined;
    var cur = isCtl ? value : s[0];
    function set(v) { if (!isCtl) s[1](v); if (onChange) onChange(v); }
    return [cur, set];
  }
  function iconNode(icon, extra) {
    if (icon == null || icon === false) return null;
    if (typeof icon === 'string') return h(Icon, Object.assign({ name: icon }, extra || {}));
    return icon;
  }
  // a string that looks like a Material Symbols name renders as an icon; anything else as text
  function iconOrText(v, extra) {
    if (typeof v === 'string' && !/^[a-z][a-z0-9_]*$/.test(v)) return h('span', { className: 'm3-li__meta' }, v);
    return iconNode(v, extra);
  }

  /* ---------------- Icon ---------------- */
  function Icon(p) {
    var size = p.size || 24;
    var style = Object.assign({ fontSize: size + 'px', width: size + 'px', height: size + 'px',
      fontVariationSettings: "'FILL' " + (p.filled ? 1 : 0) + ", 'wght' " + (p.weight || 400) + ", 'GRAD' 0, 'opsz' " + Math.min(48, Math.max(20, size)) }, p.style || {});
    return h('span', { className: cx('m3-icon', p.className), style: style, 'aria-hidden': p.label ? undefined : 'true', 'aria-label': p.label, role: p.label ? 'img' : undefined }, p.name);
  }

  /* ---------------- Buttons ---------------- */
  var BTN_ICON = { xs: 20, s: 20, m: 24, l: 32, xl: 40 };
  function Button(p) {
    var variant = p.variant || 'filled', size = p.size || 's', shape = p.shape || 'round';
    var rest = omit(p, ['variant', 'size', 'shape', 'icon', 'trailingIcon', 'children', 'className', 'selected', 'toggle', 'type']);
    var isz = BTN_ICON[size] || 20;
    return h('button', Object.assign({ type: p.type || 'button' }, rest, {
      className: cx('m3-btn', 'm3-btn--' + variant, 'm3-btn--' + size, 'm3-btn--' + shape, p.toggle && 'm3-btn--toggle', p.toggle && p.selected && 'is-selected', p.className),
      'aria-pressed': p.toggle ? !!p.selected : undefined
    }), iconNode(p.icon, { size: isz }), p.children != null ? h('span', { className: 'm3-btn__label' }, p.children) : null, iconNode(p.trailingIcon, { size: isz }));
  }

  var ICONBTN_ICON = { xs: 20, s: 24, m: 24, l: 32, xl: 40 };
  function IconButton(p) {
    var variant = p.variant || 'standard', size = p.size || 's', width = p.width || 'default', shape = p.shape || 'round';
    var rest = omit(p, ['variant', 'size', 'width', 'shape', 'icon', 'selected', 'toggle', 'className', 'label', 'type']);
    return h('button', Object.assign({ type: p.type || 'button', 'aria-label': p.label }, rest, {
      className: cx('m3-iconbtn', 'm3-iconbtn--' + variant, 'm3-iconbtn--' + size, 'm3-iconbtn--w-' + width, 'm3-iconbtn--' + shape, p.toggle && 'm3-iconbtn--toggle', p.toggle && p.selected && 'is-selected', p.className),
      'aria-pressed': p.toggle ? !!p.selected : undefined
    }), iconNode(p.icon, { size: ICONBTN_ICON[size] || 24, filled: p.toggle && p.selected }));
  }

  var FAB_ICON = { small: 24, fab: 24, medium: 28, large: 36 };
  function FAB(p) {
    var size = p.size || 'fab', color = p.color || 'primary-container';
    var rest = omit(p, ['size', 'color', 'icon', 'className', 'label', 'lowered']);
    return h('button', Object.assign({ type: 'button', 'aria-label': p.label }, rest, {
      className: cx('m3-fab', 'm3-fab--' + size, 'm3-fab--' + color, p.lowered && 'm3-fab--lowered', p.className)
    }), iconNode(p.icon, { size: FAB_ICON[size] || 24 }));
  }

  function ExtendedFAB(p) {
    var size = p.size || 'small', color = p.color || 'primary-container';
    var rest = omit(p, ['size', 'color', 'icon', 'className', 'label', 'children']);
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('m3-efab', 'm3-efab--' + size, 'm3-fab--' + color, p.className)
    }), iconNode(p.icon, { size: size === 'large' ? 36 : size === 'medium' ? 28 : 24 }), h('span', { className: 'm3-efab__label' }, p.label || p.children));
  }

  function FABMenu(p) {
    var color = p.color || 'primary';
    var st = useControl(p.open, !!p.defaultOpen, p.onOpenChange);
    var open = st[0], setOpen = st[1];
    var items = p.items || [];
    return h('div', { className: cx('m3-fabmenu', 'm3-fabmenu--' + color, open && 'is-open', p.className) },
      open ? h('div', { className: 'm3-fabmenu__list', role: 'menu' }, items.map(function (it, i) {
        return h('button', { key: i, type: 'button', role: 'menuitem', className: 'm3-fabmenu__item', onClick: function () { if (it.onClick) it.onClick(); if (p.onSelect) p.onSelect(it, i); } },
          iconNode(it.icon, { size: 24 }), h('span', null, it.label));
      })) : null,
      open
        ? h('button', { type: 'button', className: 'm3-fabmenu__close', 'aria-label': 'Close menu', 'aria-expanded': true, onClick: function () { setOpen(false); } }, h(Icon, { name: 'close', size: 20 }))
        : h(FAB, { icon: p.icon || 'add', color: color + '-container', label: p.label || 'Open menu', 'aria-expanded': false, onClick: function () { setOpen(true); } })
    );
  }

  function SegmentedButton(p) {
    var segs = p.segments || [];
    var multi = !!p.multiSelect;
    var st = useControl(p.value, p.defaultValue !== undefined ? p.defaultValue : (multi ? [] : (segs[0] && segs[0].value)), p.onChange);
    var val = st[0], set = st[1];
    function isSel(v) { return multi ? (val || []).indexOf(v) >= 0 : val === v; }
    function toggle(v) {
      if (multi) { var a = (val || []).slice(); var i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); set(a); }
      else set(v);
    }
    return h('div', { className: cx('m3-segmented', p.density && 'm3-segmented--dense', p.className), role: multi ? 'group' : 'radiogroup', 'aria-label': p.label },
      segs.map(function (s) {
        var sel = isSel(s.value);
        return h('button', { key: s.value, type: 'button', disabled: s.disabled, role: multi ? undefined : 'radio', 'aria-checked': multi ? undefined : sel, 'aria-pressed': multi ? sel : undefined,
          className: cx('m3-segmented__seg', sel && 'is-selected'), onClick: function () { toggle(s.value); } },
          sel ? h(Icon, { name: 'check', size: 18 }) : iconNode(s.icon, { size: 18 }),
          s.label != null ? h('span', null, s.label) : null);
      }));
  }

  function ButtonGroup(p) {
    var variant = p.variant || 'standard';
    return h('div', { className: cx('m3-btngroup', 'm3-btngroup--' + variant, 'm3-btngroup--' + (p.size || 's'), p.className), role: 'group', 'aria-label': p.label }, p.children);
  }

  function SplitButton(p) {
    var variant = p.variant || 'filled', size = p.size || 's';
    var st = useControl(p.open, false, p.onOpenChange);
    return h('div', { className: cx('m3-split', 'm3-split--' + variant, 'm3-split--' + size, st[0] && 'is-open', p.className) },
      h('button', { type: 'button', className: 'm3-split__lead', onClick: p.onClick, disabled: p.disabled },
        iconNode(p.icon, { size: BTN_ICON[size] || 20 }), h('span', null, p.label)),
      h('button', { type: 'button', className: 'm3-split__trail', 'aria-label': p.menuLabel || 'More options', 'aria-expanded': !!st[0], disabled: p.disabled, onClick: function () { st[1](!st[0]); } },
        h(Icon, { name: 'keyboard_arrow_down', size: BTN_ICON[size] || 20, className: 'm3-split__chev' })));
  }

  /* ---------------- Communication ---------------- */
  function Badge(p) {
    var v = p.value;
    var text = null;
    if (v !== undefined && v !== null && v !== '') {
      var max = p.max || 999;
      text = (typeof v === 'number' && v > max) ? (max + '+') : String(v);
    }
    var badge = h('span', { className: cx('m3-badge', text == null ? 'm3-badge--small' : 'm3-badge--large', !p.children && p.className), 'aria-label': p.label }, text);
    if (!p.children) return badge;
    return h('span', { className: cx('m3-badge-anchor', p.className) }, p.children, badge);
  }

  function LoadingIndicator(p) {
    return h('span', { className: cx('m3-loading', p.contained && 'm3-loading--contained', p.className), role: 'progressbar', 'aria-label': p.label || 'Loading', style: p.size ? { width: p.size, height: p.size } : undefined },
      h('span', { className: 'm3-loading__shape' }));
  }

  function ProgressIndicator(p) {
    var type = p.type || 'linear';
    var det = typeof p.value === 'number';
    var v = det ? Math.max(0, Math.min(1, p.value)) : 0;
    var aria = { role: 'progressbar', 'aria-label': p.label, 'aria-valuemin': det ? 0 : undefined, 'aria-valuemax': det ? 100 : undefined, 'aria-valuenow': det ? Math.round(v * 100) : undefined };
    if (type === 'circular') {
      var r = 18, c = 2 * Math.PI * r;
      var gap = 4 / c; // 4px gap between active and track
      return h('span', Object.assign({ className: cx('m3-cprog', !det && 'is-indeterminate', p.className) }, aria),
        h('svg', { viewBox: '0 0 48 48', width: 48, height: 48 },
          det && v < 1 ? h('circle', { className: 'm3-cprog__track', cx: 24, cy: 24, r: r, strokeDasharray: Math.max(0, c * (1 - v - 2 * gap)) + ' ' + c, strokeDashoffset: -c * (v + gap), transform: 'rotate(-90 24 24)' }) : null,
          h('circle', { className: 'm3-cprog__active', cx: 24, cy: 24, r: r, strokeDasharray: det ? (c * v) + ' ' + c : (c * 0.3) + ' ' + c, transform: 'rotate(-90 24 24)' })));
    }
    return h('span', Object.assign({ className: cx('m3-lprog', !det && 'is-indeterminate', p.className) }, aria),
      det ? h(React.Fragment, null,
        v > 0 ? h('span', { className: 'm3-lprog__active', style: { width: v < 1 ? 'calc(' + (v * 100) + '% - 2px)' : '100%' } }) : null,
        v < 1 ? h('span', { className: 'm3-lprog__track', style: { left: v > 0 ? 'calc(' + (v * 100) + '% + 2px)' : '0px' } }) : null,
        v < 1 ? h('span', { className: 'm3-lprog__stop' }) : null)
        : h(React.Fragment, null, h('span', { className: 'm3-lprog__bar m3-lprog__bar--1' }), h('span', { className: 'm3-lprog__bar m3-lprog__bar--2' })));
  }

  function Snackbar(p) {
    return h('div', { className: cx('m3-snackbar', p.longerAction && 'm3-snackbar--stacked', p.className), role: 'status' },
      h('div', { className: 'm3-snackbar__msg' }, p.message),
      (p.action || p.onClose) ? h('div', { className: 'm3-snackbar__actions' },
        p.action ? h('button', { type: 'button', className: 'm3-snackbar__action', onClick: p.onAction }, p.action) : null,
        p.onClose ? h('button', { type: 'button', className: 'm3-snackbar__close', 'aria-label': 'Dismiss', onClick: p.onClose }, h(Icon, { name: 'close', size: 24 })) : null) : null);
  }

  function Tooltip(p) {
    var hov = useState(false);
    var id = useId();
    var open = p.open !== undefined ? p.open : hov[0];
    var rich = !!(p.title || p.actions);
    var tip = h('span', { id: id, role: 'tooltip', className: cx('m3-tooltip', rich ? 'm3-tooltip--rich' : 'm3-tooltip--plain', 'm3-tooltip--' + (p.placement || 'bottom'), open && 'is-open') },
      rich && p.title ? h('span', { className: 'm3-tooltip__title' }, p.title) : null,
      h('span', { className: 'm3-tooltip__text' }, p.text),
      rich && p.actions ? h('span', { className: 'm3-tooltip__actions' }, p.actions) : null);
    return h('span', { className: cx('m3-tooltip-anchor', p.className), 'aria-describedby': id,
      onMouseEnter: function () { hov[1](true); }, onMouseLeave: function () { hov[1](false); },
      onFocus: function () { hov[1](true); }, onBlur: function () { hov[1](false); } }, p.children, tip);
  }

  /* ---------------- Containment ---------------- */
  function Scrim(p) { return h('div', { className: 'm3-scrim', onClick: p.onClick, 'aria-hidden': 'true' }); }

  function BottomSheet(p) {
    if (p.open === false) return null;
    var modal = p.modal !== false;
    var sheet = h('section', { className: cx('m3-bsheet', modal && 'm3-bsheet--modal', p.inline && 'is-inline', p.className), role: modal ? 'dialog' : 'region', 'aria-modal': modal && !p.inline ? true : undefined, 'aria-label': p.label },
      p.dragHandle !== false ? h('div', { className: 'm3-bsheet__handle', 'aria-hidden': 'true' }) : null,
      h('div', { className: 'm3-bsheet__body' }, p.children));
    if (!modal || p.inline) return sheet;
    return h(React.Fragment, null, h(Scrim, { onClick: p.onClose }), sheet);
  }

  function Card(p) {
    var variant = p.variant || 'elevated';
    var rest = omit(p, ['variant', 'className', 'children', 'onClick', 'disabled']);
    var Tag = p.onClick ? 'button' : 'div';
    return h(Tag, Object.assign({}, rest, { type: p.onClick ? 'button' : undefined, onClick: p.onClick, disabled: p.onClick ? p.disabled : undefined, className: cx('m3-card', 'm3-card--' + variant, p.onClick && 'm3-card--interactive', p.className) }), p.children);
  }

  function Carousel(p) {
    var layout = p.layout || 'multi-browse';
    var items = p.items || [];
    return h('div', { className: cx('m3-carousel', 'm3-carousel--' + layout, p.className), role: 'list', 'aria-label': p.label, style: p.height ? { height: p.height } : undefined },
      items.map(function (it, i) {
        var tone = it.tone || ['primary-container', 'secondary-container', 'tertiary-container'][i % 3];
        return h('div', { key: i, role: 'listitem', className: cx('m3-carousel__item', 'm3-carousel__item--' + (it.size || (layout === 'hero' ? (i === 0 ? 'large' : 'small') : (i === 0 ? 'large' : i === 1 ? 'medium' : 'small')))),
          style: Object.assign({ background: 'var(--' + tone + ')', color: 'var(--on-' + tone + ')' }, it.src ? { backgroundImage: 'url(' + it.src + ')' } : {}) },
          it.label ? h('span', { className: 'm3-carousel__label' }, it.label) : null);
      }));
  }

  function Dialog(p) {
    var id = useId();
    if (p.open === false) return null;
    var box = h('div', { className: cx('m3-dialog', p.icon && 'm3-dialog--icon', p.inline && 'is-inline', p.className), role: 'dialog', 'aria-modal': p.inline ? undefined : true, 'aria-labelledby': p.headline ? id : undefined },
      iconNode(p.icon, { size: 24, className: 'm3-dialog__icon' }),
      p.headline ? h('h2', { id: id, className: 'm3-dialog__headline' }, p.headline) : null,
      h('div', { className: 'm3-dialog__content' }, p.children),
      p.actions ? h('div', { className: 'm3-dialog__actions' }, p.actions) : null);
    if (p.inline) return box;
    return h('div', { className: 'm3-dialog-layer' }, h(Scrim, { onClick: p.onClose }), box);
  }

  function Divider(p) {
    return h('hr', { className: cx('m3-divider', p.vertical && 'm3-divider--vertical', p.inset && 'm3-divider--inset-' + p.inset, p.className), 'aria-orientation': p.vertical ? 'vertical' : undefined });
  }

  function List(p) {
    return h('ul', { className: cx('m3-list', p.className), role: 'list', 'aria-label': p.label }, p.children);
  }

  function ListItem(p) {
    var lines = p.supporting ? (p.lines || (String(p.supporting).length > 48 ? 3 : 2)) : 1;
    if (p.overline && lines < 2) lines = 2;
    var inner = h(React.Fragment, null,
      p.leading != null ? h('span', { className: 'm3-li__leading' }, iconNode(p.leading, { size: 24 })) : null,
      h('span', { className: 'm3-li__text' },
        p.overline ? h('span', { className: 'm3-li__overline' }, p.overline) : null,
        h('span', { className: 'm3-li__headline' }, p.headline),
        p.supporting ? h('span', { className: 'm3-li__supporting' }, p.supporting) : null),
      p.trailing != null ? h('span', { className: 'm3-li__trailing' }, iconOrText(p.trailing, { size: 24 })) : null);
    var cls = cx('m3-li', 'm3-li--' + lines, p.selected && 'is-selected', p.disabled && 'is-disabled', p.className);
    if (p.onClick) return h('li', { className: 'm3-li-wrap' }, h('button', { type: 'button', className: cls, onClick: p.onClick, disabled: p.disabled, 'aria-current': p.selected ? 'true' : undefined }, inner));
    return h('li', { className: cls }, inner);
  }

  function SideSheet(p) {
    if (p.open === false) return null;
    var modal = !!p.modal;
    var sheet = h('aside', { className: cx('m3-ssheet', modal && 'm3-ssheet--modal', p.inline && 'is-inline', p.className), role: modal ? 'dialog' : 'complementary', 'aria-label': p.headline },
      h('header', { className: 'm3-ssheet__head' },
        p.onBack ? h(IconButton, { icon: 'arrow_back', label: 'Back', onClick: p.onBack }) : null,
        h('h2', { className: 'm3-ssheet__title' }, p.headline),
        p.onClose ? h(IconButton, { icon: 'close', label: 'Close', onClick: p.onClose }) : null),
      h('div', { className: 'm3-ssheet__body' }, p.children),
      p.actions ? h('footer', { className: 'm3-ssheet__actions' }, p.actions) : null);
    if (!modal || p.inline) return sheet;
    return h(React.Fragment, null, h(Scrim, { onClick: p.onClose }), sheet);
  }

  /* ---------------- Navigation ---------------- */
  function TopAppBar(p) {
    var variant = p.variant || 'small';
    var nav = p.navIcon ? (typeof p.navIcon === 'string' ? h(IconButton, { icon: p.navIcon, label: p.navLabel || 'Navigate', onClick: p.onNav }) : p.navIcon) : null;
    var actions = p.actions ? h('div', { className: 'm3-appbar__actions' }, p.actions) : null;
    var title = h('div', { className: 'm3-appbar__titles' },
      h('h1', { className: 'm3-appbar__title' }, p.title),
      p.subtitle ? h('div', { className: 'm3-appbar__subtitle' }, p.subtitle) : null);
    if (variant === 'medium' || variant === 'large') {
      return h('header', { className: cx('m3-appbar', 'm3-appbar--' + variant, p.subtitle && 'has-subtitle', p.scrolled && 'is-scrolled', p.className) },
        h('div', { className: 'm3-appbar__row' }, nav, h('span', { className: 'm3-appbar__spacer' }), actions),
        title);
    }
    return h('header', { className: cx('m3-appbar', 'm3-appbar--' + variant, p.scrolled && 'is-scrolled', p.className) },
      h('div', { className: 'm3-appbar__row' }, nav, title, actions));
  }

  function navItemsState(p) {
    var items = p.items || [];
    return useControl(p.value, p.defaultValue !== undefined ? p.defaultValue : (items[0] && (items[0].value !== undefined ? items[0].value : 0)), p.onChange);
  }
  function itemVal(it, i) { return it.value !== undefined ? it.value : i; }

  function NavigationBar(p) {
    var st = navItemsState(p);
    return h('nav', { className: cx('m3-navbar', p.horizontal && 'm3-navbar--horizontal', p.className), 'aria-label': p.label || 'Main' },
      (p.items || []).map(function (it, i) {
        var v = itemVal(it, i), sel = st[0] === v;
        var ic = h(Icon, { name: it.icon, size: 24, filled: sel });
        return h('button', { key: i, type: 'button', className: cx('m3-navbar__item', sel && 'is-active'), 'aria-current': sel ? 'page' : undefined, onClick: function () { st[1](v); } },
          h('span', { className: 'm3-navbar__indicator' }, it.badge !== undefined ? h(Badge, { value: it.badge === true ? undefined : it.badge }, ic) : ic, p.horizontal ? h('span', { className: 'm3-navbar__label' }, it.label) : null),
          p.horizontal ? null : h('span', { className: 'm3-navbar__label' }, it.label));
      }));
  }

  function NavigationDrawer(p) {
    var st = navItemsState(p);
    var drawer = h('nav', { className: cx('m3-drawer', p.modal && 'm3-drawer--modal', p.inline && 'is-inline', p.className), 'aria-label': p.label || 'Main' },
      p.headline ? h('div', { className: 'm3-drawer__headline' }, p.headline) : null,
      (p.items || []).map(function (it, i) {
        if (it.section) return h('div', { key: i, className: 'm3-drawer__section' }, it.section);
        if (it.divider) return h(Divider, { key: i, inset: 'both' });
        var v = itemVal(it, i), sel = st[0] === v;
        return h('button', { key: i, type: 'button', className: cx('m3-drawer__item', sel && 'is-active'), 'aria-current': sel ? 'page' : undefined, onClick: function () { st[1](v); } },
          it.icon ? h(Icon, { name: it.icon, size: 24, filled: sel }) : null,
          h('span', { className: 'm3-drawer__label' }, it.label),
          it.badge != null ? h('span', { className: 'm3-drawer__badge' }, it.badge) : null);
      }));
    if (!p.modal || p.inline) return drawer;
    return h(React.Fragment, null, h(Scrim, { onClick: p.onClose }), drawer);
  }

  function NavigationRail(p) {
    var st = navItemsState(p);
    var expanded = !!p.expanded;
    return h('nav', { className: cx('m3-rail', expanded && 'm3-rail--expanded', p.className), 'aria-label': p.label || 'Main' },
      h('div', { className: 'm3-rail__top' },
        p.onMenu ? h(IconButton, { icon: expanded ? 'menu_open' : 'menu', label: expanded ? 'Collapse navigation' : 'Expand navigation', onClick: p.onMenu }) : null,
        p.fab ? (expanded && p.fabLabel ? h(ExtendedFAB, { icon: p.fab, label: p.fabLabel, color: 'primary-container', onClick: p.onFab }) : h(FAB, { icon: p.fab, size: 'fab', color: 'primary-container', label: p.fabLabel, onClick: p.onFab })) : null),
      h('div', { className: 'm3-rail__items' },
        (p.items || []).map(function (it, i) {
          var v = itemVal(it, i), sel = st[0] === v;
          var ic = h(Icon, { name: it.icon, size: 24, filled: sel });
          return h('button', { key: i, type: 'button', className: cx('m3-rail__item', sel && 'is-active'), 'aria-current': sel ? 'page' : undefined, onClick: function () { st[1](v); } },
            h('span', { className: 'm3-rail__indicator' }, it.badge !== undefined ? h(Badge, { value: it.badge === true ? undefined : it.badge }, ic) : ic, expanded ? h('span', { className: 'm3-rail__label' }, it.label) : null),
            expanded ? null : h('span', { className: 'm3-rail__label' }, it.label));
        })));
  }

  function Tabs(p) {
    var variant = p.variant || 'primary';
    var tabs = p.tabs || [];
    var st = useControl(p.value, p.defaultValue !== undefined ? p.defaultValue : (tabs[0] && itemVal(tabs[0], 0)), p.onChange);
    var hasIconAndLabel = variant === 'primary' && tabs.some(function (t) { return t.icon && t.label; });
    return h('div', { className: cx('m3-tabs', 'm3-tabs--' + variant, hasIconAndLabel && 'm3-tabs--tall', p.scrollable && 'm3-tabs--scroll', p.className), role: 'tablist', 'aria-label': p.label },
      tabs.map(function (t, i) {
        var v = itemVal(t, i), sel = st[0] === v;
        return h('button', { key: i, type: 'button', role: 'tab', 'aria-selected': sel, tabIndex: sel ? 0 : -1, className: cx('m3-tabs__tab', sel && 'is-active'), onClick: function () { st[1](v); } },
          h('span', { className: 'm3-tabs__content' },
            t.icon ? (t.badge !== undefined ? h(Badge, { value: t.badge === true ? undefined : t.badge }, h(Icon, { name: t.icon, size: 24, filled: sel })) : h(Icon, { name: t.icon, size: 24, filled: sel })) : null,
            t.label ? h('span', { className: 'm3-tabs__label' }, t.label) : null,
            variant === 'primary' ? h('span', { className: 'm3-tabs__indicator' }) : null),
          variant === 'secondary' ? h('span', { className: 'm3-tabs__indicator' }) : null);
      }));
  }

  function Toolbar(p) {
    var variant = p.variant || 'floating', color = p.color || 'standard';
    return h('div', { className: cx('m3-toolbar', 'm3-toolbar--' + variant, 'm3-toolbar--' + color, p.vertical && 'm3-toolbar--vertical', p.className), role: 'toolbar', 'aria-label': p.label },
      h('div', { className: 'm3-toolbar__items' }, p.children),
      p.fab ? h('div', { className: 'm3-toolbar__fab' }, p.fab) : null);
  }

  /* ---------------- Selection ---------------- */
  function Checkbox(p) {
    var st = useControl(p.checked, !!p.defaultChecked, p.onChange);
    var on = st[0], ind = !!p.indeterminate;
    var box = h('span', { className: cx('m3-checkbox', (on || ind) && 'is-checked', p.error && 'is-error', p.disabled && 'is-disabled') },
      h('input', { type: 'checkbox', className: 'm3-checkbox__input', checked: !!on, disabled: p.disabled, 'aria-invalid': p.error || undefined, 'aria-label': p.label ? undefined : p['aria-label'],
        ref: function (el) { if (el) el.indeterminate = ind; }, onChange: function (e) { st[1](e.target.checked); } }),
      h('span', { className: 'm3-checkbox__box', 'aria-hidden': 'true' },
        ind ? h('span', { className: 'm3-checkbox__dash' }) : on ? h('svg', { viewBox: '0 0 18 18', className: 'm3-checkbox__mark' }, h('path', { d: 'M4 9.4l3.2 3.2L14 5.8', fill: 'none', strokeWidth: 2 })) : null));
    if (!p.label) return box;
    return h('label', { className: cx('m3-control-label', p.disabled && 'is-disabled', p.className) }, box, h('span', null, p.label));
  }

  function Radio(p) {
    var box = h('span', { className: cx('m3-radio', p.checked && 'is-checked', p.disabled && 'is-disabled') },
      h('input', { type: 'radio', className: 'm3-radio__input', name: p.name, value: p.value, checked: !!p.checked, disabled: p.disabled, 'aria-label': p.label ? undefined : p['aria-label'],
        onChange: function (e) { if (p.onChange) p.onChange(p.value, e); } }),
      h('span', { className: 'm3-radio__ring', 'aria-hidden': 'true' }, h('span', { className: 'm3-radio__dot' })));
    if (!p.label) return box;
    return h('label', { className: cx('m3-control-label', p.disabled && 'is-disabled', p.className) }, box, h('span', null, p.label));
  }

  function Switch(p) {
    var st = useControl(p.checked, !!p.defaultChecked, p.onChange);
    var on = st[0];
    var sw = h('span', { className: cx('m3-switch', on && 'is-checked', p.icons && 'has-icons', p.disabled && 'is-disabled') },
      h('input', { type: 'checkbox', role: 'switch', className: 'm3-switch__input', checked: !!on, disabled: p.disabled, 'aria-checked': !!on, 'aria-label': p.label ? undefined : p['aria-label'], onChange: function (e) { st[1](e.target.checked); } }),
      h('span', { className: 'm3-switch__track', 'aria-hidden': 'true' },
        h('span', { className: 'm3-switch__handle' }, p.icons ? h(Icon, { name: on ? 'check' : 'close', size: 16 }) : null)));
    if (!p.label) return sw;
    return h('label', { className: cx('m3-control-label', 'm3-control-label--switch', p.disabled && 'is-disabled', p.className) }, h('span', null, p.label), sw);
  }

  function Chip(p) {
    var variant = p.variant || 'assist';
    var sel = variant === 'filter' && !!p.selected;
    var lead = sel ? h(Icon, { name: 'check', size: 18 }) : (p.avatar ? h('span', { className: 'm3-chip__avatar' }, p.avatar) : iconNode(p.icon, { size: 18 }));
    var cls = cx('m3-chip', 'm3-chip--' + variant, p.elevated && 'm3-chip--elevated', sel && 'is-selected', (lead) && 'has-leading', p.onRemove && 'has-trailing', p.avatar && 'has-avatar', p.className);
    var label = h('span', { className: 'm3-chip__label' }, p.label);
    if (variant === 'input') {
      return h('span', { className: cls },
        h('button', { type: 'button', className: 'm3-chip__action', onClick: p.onClick, disabled: p.disabled }, lead, label),
        p.onRemove ? h('button', { type: 'button', className: 'm3-chip__remove', 'aria-label': 'Remove ' + p.label, onClick: p.onRemove, disabled: p.disabled }, h(Icon, { name: 'close', size: 18 })) : null);
    }
    return h('button', { type: 'button', className: cls, onClick: p.onClick, disabled: p.disabled, 'aria-pressed': variant === 'filter' ? sel : undefined },
      lead, label, variant === 'filter' && p.dropdown ? h(Icon, { name: 'arrow_drop_down', size: 18 }) : null);
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  function DatePicker(p) {
    var today = p.today || new Date();
    var st = useControl(p.value, p.defaultValue || null, p.onChange);
    var sel = st[0];
    var base = sel || today;
    var ms = useState(new Date(base.getFullYear(), base.getMonth(), 1));
    var month = ms[0];
    var variant = p.variant || 'modal';
    var first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    var days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    var cells = [];
    for (var i = 0; i < first; i++) cells.push(null);
    for (var d = 1; d <= days; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    function shift(n) { ms[1](new Date(month.getFullYear(), month.getMonth() + n, 1)); }
    var head = variant === 'modal' ? h('div', { className: 'm3-date__header' },
      h('div', { className: 'm3-date__supporting' }, p.title || 'Select date'),
      h('div', { className: 'm3-date__headline' }, sel ? (DOW[sel.getDay()] + ', ' + MON3[sel.getMonth()] + ' ' + sel.getDate()) : 'Enter date'),
      h(Divider, null)) : null;
    return h('div', { className: cx('m3-date', 'm3-date--' + variant, p.className), role: 'group', 'aria-label': p.title || 'Date picker' },
      head,
      h('div', { className: 'm3-date__nav' },
        h('button', { type: 'button', className: 'm3-date__month-btn' }, MONTHS[month.getMonth()] + ' ' + month.getFullYear(), h(Icon, { name: 'arrow_drop_down', size: 18 })),
        h('span', { style: { flex: 1 } }),
        h(IconButton, { icon: 'chevron_left', label: 'Previous month', onClick: function () { shift(-1); } }),
        h(IconButton, { icon: 'chevron_right', label: 'Next month', onClick: function () { shift(1); } })),
      h('div', { className: 'm3-date__grid', role: 'grid' },
        DOW.map(function (w) { return h('span', { key: w, className: 'm3-date__dow', 'aria-label': w }, w[0]); }),
        cells.map(function (c, i) {
          if (!c) return h('span', { key: 'e' + i });
          var isSel = sameDay(c, sel), isToday = sameDay(c, today);
          return h('button', { key: i, type: 'button', role: 'gridcell', 'aria-selected': isSel, className: cx('m3-date__day', isSel && 'is-selected', isToday && 'is-today'), onClick: function () { st[1](c); } }, c.getDate());
        })),
      p.actions !== false ? h('div', { className: 'm3-date__actions' },
        h(Button, { variant: 'text', onClick: p.onCancel }, 'Cancel'),
        h(Button, { variant: 'text', onClick: function () { if (p.onConfirm) p.onConfirm(sel); } }, 'OK')) : null);
  }

  function Menu(p) {
    var items = p.items || [];
    return h('div', { className: cx('m3-menu', p.className), role: 'menu', 'aria-label': p.label },
      items.map(function (it, i) {
        if (it.divider) return h(Divider, { key: i, className: 'm3-menu__divider' });
        return h('button', { key: i, type: 'button', role: it.selected !== undefined ? 'menuitemcheckbox' : 'menuitem', 'aria-checked': it.selected !== undefined ? !!it.selected : undefined, disabled: it.disabled,
          className: cx('m3-menu__item', it.selected && 'is-selected'), onClick: function () { if (it.onClick) it.onClick(); if (p.onSelect) p.onSelect(it, i); } },
          it.icon ? h(Icon, { name: it.selected ? 'check' : it.icon, size: 24 }) : null,
          h('span', { className: 'm3-menu__label' }, it.label),
          it.trailing ? h('span', { className: 'm3-menu__trailing' }, typeof it.trailing === 'string' && /^[a-z_]+$/.test(it.trailing) ? h(Icon, { name: it.trailing, size: 24 }) : it.trailing) : null);
      }));
  }

  function Slider(p) {
    var min = p.min != null ? p.min : 0, max = p.max != null ? p.max : 100, step = p.step || 1;
    var st = useControl(p.value, p.defaultValue != null ? p.defaultValue : min + (max - min) / 2, p.onChange);
    var v = st[0];
    var ref = useRef(null);
    var drag = useState(false);
    var pct = (v - min) / (max - min);
    function setFromX(x) {
      var r = ref.current.getBoundingClientRect();
      var t = Math.max(0, Math.min(1, (x - r.left) / r.width));
      var nv = Math.round((min + t * (max - min)) / step) * step;
      nv = Math.max(min, Math.min(max, +nv.toFixed(6)));
      if (nv !== v) st[1](nv);
    }
    function down(e) { if (p.disabled) return; drag[1](true); setFromX(e.clientX); e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); }
    function move(e) { if (drag[0]) setFromX(e.clientX); }
    function up() { drag[1](false); }
    function key(e) {
      var d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') d = step;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') d = -step;
      if (e.key === 'Home') { st[1](min); e.preventDefault(); return; }
      if (e.key === 'End') { st[1](max); e.preventDefault(); return; }
      if (d) { e.preventDefault(); st[1](Math.max(min, Math.min(max, +(v + d).toFixed(6)))); }
    }
    var stops = [];
    if (p.stops) { var n = Math.round((max - min) / step); for (var i = 0; i <= n; i++) stops.push(i / n); }
    return h('div', { className: cx('m3-slider', 'm3-slider--' + (p.size || 'xs'), drag[0] && 'is-dragging', p.disabled && 'is-disabled', p.className),
      ref: ref, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, style: { '--m3-slider-pct': pct } },
      h('span', { className: 'm3-slider__active' }),
      h('span', { className: 'm3-slider__inactive' }),
      stops.map(function (s, i) { return h('span', { key: i, className: cx('m3-slider__stop', s <= pct && 'is-on'), style: { left: 'clamp(6px, ' + (s * 100) + '%, calc(100% - 6px))' } }); }),
      !p.stops ? h('span', { className: 'm3-slider__end' }) : null,
      h('span', { className: 'm3-slider__handle', role: 'slider', tabIndex: p.disabled ? -1 : 0, 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': v, 'aria-label': p.label, 'aria-disabled': p.disabled || undefined, onKeyDown: key },
        p.showValue !== false ? h('span', { className: 'm3-slider__value' }, p.format ? p.format(v) : v) : null));
  }

  function TimePicker(p) {
    var hour = p.hour != null ? p.hour : 7, minute = p.minute != null ? p.minute : 0;
    var st = useControl(p.period, p.defaultPeriod || 'AM', p.onPeriodChange);
    var field = useState(p.field || 'hour');
    var f = field[0];
    var sel = f === 'hour' ? (hour % 12 || 12) : minute;
    var angle = f === 'hour' ? ((hour % 12) / 12) * 360 : (minute / 60) * 360;
    var R = 100, C = 128;
    var nums = [];
    for (var i = 0; i < 12; i++) {
      var val = f === 'hour' ? (i === 0 ? 12 : i) : i * 5;
      var a = (i / 12) * 2 * Math.PI;
      nums.push({ v: val, x: C + R * Math.sin(a), y: C - R * Math.cos(a) });
    }
    var hx = C + R * Math.sin(angle * Math.PI / 180), hy = C - R * Math.cos(angle * Math.PI / 180);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return h('div', { className: cx('m3-time', p.className), role: 'group', 'aria-label': p.title || 'Time picker' },
      h('div', { className: 'm3-time__supporting' }, p.title || 'Select time'),
      h('div', { className: 'm3-time__inputs' },
        h('button', { type: 'button', className: cx('m3-time__field', f === 'hour' && 'is-active'), onClick: function () { field[1]('hour'); } }, pad(hour % 12 || 12)),
        h('span', { className: 'm3-time__colon' }, ':'),
        h('button', { type: 'button', className: cx('m3-time__field', f === 'minute' && 'is-active'), onClick: function () { field[1]('minute'); } }, pad(minute)),
        h('div', { className: 'm3-time__period', role: 'radiogroup', 'aria-label': 'AM or PM' },
          ['AM', 'PM'].map(function (pp) { return h('button', { key: pp, type: 'button', role: 'radio', 'aria-checked': st[0] === pp, className: cx('m3-time__pbtn', st[0] === pp && 'is-selected'), onClick: function () { st[1](pp); } }, pp); }))),
      h('div', { className: 'm3-time__dial', 'aria-hidden': 'true' },
        h('svg', { viewBox: '0 0 256 256', width: 256, height: 256 },
          h('circle', { cx: C, cy: C, r: 4, className: 'm3-time__center' }),
          h('line', { x1: C, y1: C, x2: hx, y2: hy, className: 'm3-time__hand' }),
          h('circle', { cx: hx, cy: hy, r: 24, className: 'm3-time__knob' }),
          nums.map(function (n) {
            var on = n.v === sel;
            return h('text', { key: n.v, x: n.x, y: n.y, className: cx('m3-time__num', on && 'is-on'), textAnchor: 'middle', dominantBaseline: 'central' }, f === 'minute' ? pad(n.v) : n.v);
          }))),
      p.actions !== false ? h('div', { className: 'm3-time__actions' },
        h(IconButton, { icon: 'keyboard', label: 'Switch to text input' }),
        h('span', { style: { flex: 1 } }),
        h(Button, { variant: 'text', onClick: p.onCancel }, 'Cancel'),
        h(Button, { variant: 'text', onClick: p.onConfirm }, 'OK')) : null);
  }

  /* ---------------- Text inputs ---------------- */
  function TextField(p) {
    var variant = p.variant || 'filled';
    var id = useId();
    var st = useControl(p.value, p.defaultValue || '', p.onChange);
    var foc = useState(false);
    var val = st[0];
    var populated = (val !== '' && val != null) || !!p.prefix || !!p.placeholder && foc[0];
    var floated = foc[0] || populated;
    var Tag = p.multiline ? 'textarea' : 'input';
    var supportId = id + '-s';
    var rest = omit(p, ['variant', 'label', 'value', 'defaultValue', 'onChange', 'supportingText', 'error', 'leadingIcon', 'trailingIcon', 'prefix', 'suffix', 'className', 'multiline', 'counter', 'maxLength', 'disabled', 'placeholder', 'required']);
    return h('div', { className: cx('m3-field', 'm3-field--' + variant, floated && 'is-floated', foc[0] && 'is-focused', p.error && 'is-error', p.disabled && 'is-disabled', p.leadingIcon && 'has-leading', p.trailingIcon && 'has-trailing', p.multiline && 'is-multiline', !p.label && 'no-label', p.className) },
      h('div', { className: 'm3-field__box' },
        p.leadingIcon ? h('span', { className: 'm3-field__lead' }, iconNode(p.leadingIcon, { size: 24 })) : null,
        h('div', { className: 'm3-field__main' },
          p.label ? h('label', { htmlFor: id, className: 'm3-field__label' }, p.label, p.required ? '*' : null) : null,
          h('div', { className: 'm3-field__row' },
            p.prefix && floated ? h('span', { className: 'm3-field__affix' }, p.prefix) : null,
            h(Tag, Object.assign({}, rest, { id: id, className: 'm3-field__input', value: val, disabled: p.disabled, required: p.required, maxLength: p.maxLength, placeholder: floated ? p.placeholder : undefined,
              'aria-invalid': p.error || undefined, 'aria-describedby': p.supportingText ? supportId : undefined,
              onChange: function (e) { st[1](e.target.value); }, onFocus: function (e) { foc[1](true); if (p.onFocus) p.onFocus(e); }, onBlur: function (e) { foc[1](false); if (p.onBlur) p.onBlur(e); } })),
            p.suffix && floated ? h('span', { className: 'm3-field__affix' }, p.suffix) : null)),
        p.trailingIcon || p.error ? h('span', { className: 'm3-field__trail' }, p.error && !p.trailingIcon ? h(Icon, { name: 'error', size: 24, filled: true }) : iconNode(p.trailingIcon, { size: 24 })) : null,
        variant === 'outlined' ? h('span', { className: 'm3-field__outline', 'aria-hidden': 'true' }) : h('span', { className: 'm3-field__indicator', 'aria-hidden': 'true' })),
      (p.supportingText || p.maxLength) ? h('div', { className: 'm3-field__support', id: supportId },
        h('span', null, p.supportingText),
        p.maxLength && p.counter !== false ? h('span', null, String(val || '').length + '/' + p.maxLength) : null) : null);
  }

  function Search(p) {
    var st = useControl(p.value, p.defaultValue || '', p.onChange);
    return h('div', { className: cx('m3-search', p.className), role: 'search' },
      p.leading !== undefined ? iconNode(p.leading, { size: 24 }) : h(Icon, { name: 'search', size: 24, className: 'm3-search__lead' }),
      h('input', { className: 'm3-search__input', type: 'search', placeholder: p.placeholder || 'Search', 'aria-label': p.label || p.placeholder || 'Search', value: st[0],
        onChange: function (e) { st[1](e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && p.onSubmit) p.onSubmit(st[0]); } }),
      p.trailing ? h('span', { className: 'm3-search__trail' }, p.trailing) : null);
  }

  /* ---------------- Delta (fintech extension) ---------------- */
  function Delta(p) {
    var v = Number(p.value) || 0;
    var dir = v > 0 ? 'gain' : v < 0 ? 'loss' : 'neutral';
    if (p.invert && dir !== 'neutral') dir = dir === 'gain' ? 'loss' : 'gain';
    var abs = Math.abs(v);
    var txt = p.format ? p.format(abs) : abs.toLocaleString(undefined, { minimumFractionDigits: p.decimals != null ? p.decimals : 2, maximumFractionDigits: p.decimals != null ? p.decimals : 2 }) + (p.unit != null ? p.unit : '%');
    var sign = v > 0 ? '+' : v < 0 ? '\u2212' : '';
    var icon = v > 0 ? 'arrow_upward' : v < 0 ? 'arrow_downward' : 'remove';
    var word = v > 0 ? 'up' : v < 0 ? 'down' : 'unchanged';
    return h('span', { className: cx('m3-delta', 'm3-delta--' + dir, 'm3-delta--' + (p.variant || 'text'), p.className), 'aria-label': (p.label ? p.label + ' ' : '') + word + ' ' + txt },
      p.showIcon !== false ? h(Icon, { name: icon, size: p.variant === 'pill' ? 16 : 18 }) : null,
      h('span', { 'aria-hidden': 'true' }, sign + txt));
  }

  /* ================= Gradeline extensions (estimating) ================= */
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;

  function fmtNumber(v, decimals) {
    if (v == null || v === '' || isNaN(v)) return '';
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtMoney(v, decimals) {
    if (v == null || v === '' || isNaN(v)) return '';
    var d = decimals == null ? 0 : decimals;
    var n = Number(v), neg = n < 0;
    var s = '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return neg ? '−' + s : s;
  }

  /* ---------------- Money ---------------- */
  function Money(p) {
    var d = p.decimals == null ? 0 : p.decimals;
    var n = Number(p.value) || 0;
    var txt;
    if (p.negative === 'parens' && n < 0) txt = '(' + fmtMoney(Math.abs(n), d) + ')';
    else txt = fmtMoney(n, d);
    var hidden = !!p.hidden;
    return h('span', { className: cx('m3-money', hidden && 'is-hidden', p.muted && 'is-muted', p.strong && 'is-strong', n < 0 && 'is-negative', p.className),
      'aria-label': hidden ? 'Amount hidden' : undefined },
      h('span', { className: 'm3-money__value' }, txt),
      h('span', { className: 'm3-money__mask', 'aria-hidden': 'true' }, h(Icon, { name: 'lock', size: 14 }), '••••'));
  }

  /* ---------------- StatusChip ---------------- */
  var STATUS = {
    'draft':       { tone: 'neutral',   icon: 'edit',             word: 'Draft' },
    'open':        { tone: 'secondary', icon: 'folder_open',      word: 'Open' },
    'in-progress': { tone: 'secondary', icon: 'autorenew',        word: 'In progress' },
    'review':      { tone: 'info',      icon: 'fact_check',       word: 'In review' },
    'submitted':   { tone: 'info',      icon: 'send',             word: 'Submitted' },
    'won':         { tone: 'success',   icon: 'emoji_events',     word: 'Won' },
    'lost':        { tone: 'loss',      icon: 'cancel',           word: 'Lost' },
    'no-bid':      { tone: 'neutral',   icon: 'block',            word: 'No bid' },
    'due-soon':    { tone: 'warning',   icon: 'schedule',         word: 'Due soon' },
    'overdue':     { tone: 'error',     icon: 'event_busy',       word: 'Overdue' },
    'locked':      { tone: 'tertiary',  icon: 'lock',             word: 'Locked' },
    'received':    { tone: 'success',   icon: 'mark_email_read',  word: 'Received' },
    'pending':     { tone: 'warning',   icon: 'hourglass_top',    word: 'Pending' },
    'declined':    { tone: 'neutral',   icon: 'block',            word: 'Declined' },
    'selected':    { tone: 'secondary', icon: 'check',            word: 'Selected' },
    'error':       { tone: 'error',     icon: 'error',            word: 'Error' },
    'warning':     { tone: 'warning',   icon: 'warning',          word: 'Warning' },
    'ok':          { tone: 'success',   icon: 'check_circle',     word: 'OK' },
    'info':        { tone: 'info',      icon: 'info',             word: 'Info' }
  };
  function StatusChip(p) {
    var s = STATUS[p.status] || STATUS.info;
    var size = p.size || 's';
    var inner = [
      p.icon !== false ? h(Icon, { key: 'i', name: p.icon || s.icon, size: size === 'm' ? 18 : 16, filled: s.tone === 'error' || s.tone === 'success' || p.status === 'locked' }) : null,
      h('span', { key: 'l', className: 'm3-status__label' }, p.label || s.word)
    ];
    var cls = cx('m3-status', 'm3-status--' + s.tone, 'm3-status--' + size, p.className);
    if (p.onClick) return h('button', { type: 'button', className: cls, onClick: p.onClick, title: p.title }, inner);
    return h('span', { className: cls, title: p.title }, inner);
  }

  /* ---------------- Banner ---------------- */
  var BANNER_ICON = { info: 'info', warning: 'warning', error: 'error', success: 'check_circle', neutral: 'notes' };
  function Banner(p) {
    var tone = p.tone || 'info';
    return h('div', { className: cx('m3-banner', 'm3-banner--' + tone, p.compact && 'm3-banner--compact', p.className), role: tone === 'error' || tone === 'warning' ? 'alert' : 'status' },
      p.icon !== false ? h(Icon, { name: p.icon || BANNER_ICON[tone], size: 24, filled: tone !== 'neutral', className: 'm3-banner__icon' }) : null,
      h('div', { className: 'm3-banner__text' },
        p.headline ? h('div', { className: 'm3-banner__headline' }, p.headline) : null,
        p.children ? h('div', { className: 'm3-banner__body' }, p.children) : null),
      p.actions ? h('div', { className: 'm3-banner__actions' }, p.actions) : null,
      p.onClose ? h(IconButton, { icon: 'close', label: 'Dismiss', size: 's', onClick: p.onClose }) : null);
  }

  /* ---------------- Kbd ---------------- */
  function Kbd(p) {
    var keys = Array.isArray(p.keys) ? p.keys : String(p.keys || '').split('+').map(function (k) { return k.trim(); });
    var out = [];
    keys.forEach(function (k, i) {
      if (i) out.push(h('span', { key: 's' + i, className: 'm3-kbd__plus', 'aria-hidden': 'true' }, '+'));
      out.push(h('kbd', { key: k + i, className: 'm3-kbd__key' }, k));
    });
    return h('span', { className: cx('m3-kbd', p.className), 'aria-label': keys.join(' ') }, out);
  }

  /* ---------------- StatTile ---------------- */
  function StatTile(p) {
    var size = p.size || 'm';
    var tone = p.tone || 'default';
    var body = h(React.Fragment, null,
      h('div', { className: 'm3-stat__head' },
        p.icon ? h(Icon, { name: p.icon, size: 20, className: 'm3-stat__icon' }) : null,
        h('span', { className: 'm3-stat__label' }, p.label)),
      h('div', { className: 'm3-stat__value' }, p.value, p.unit ? h('span', { className: 'm3-stat__unit' }, p.unit) : null),
      (p.delta != null || p.supporting || p.spark) ? h('div', { className: 'm3-stat__foot' },
        p.delta != null ? h(Delta, { value: p.delta, unit: p.deltaUnit, decimals: p.deltaDecimals, format: p.deltaFormat, invert: p.invert, label: p.deltaLabel || p.label }) : null,
        p.supporting ? h('span', { className: 'm3-stat__supporting' }, p.supporting) : null,
        p.spark ? h('span', { className: 'm3-stat__spark', 'aria-hidden': 'true' }, (function () {
          var max = Math.max.apply(null, p.spark.concat([1]));
          return p.spark.map(function (v, i) { return h('i', { key: i, style: { height: Math.max(2, Math.round(v / max * 20)) + 'px' } }); });
        })()) : null) : null);
    var cls = cx('m3-stat', 'm3-stat--' + size, 'm3-stat--' + tone, p.onClick && 'is-interactive', p.className);
    if (p.onClick) return h('button', { type: 'button', className: cls, onClick: p.onClick }, body);
    return h('div', { className: cls }, body);
  }

  /* ---------------- CostBar ---------------- */
  var COST_WORD = { labor: 'Labor', equipment: 'Equipment', material: 'Material', sub: 'Subcontract', other: 'Other' };
  function CostBar(p) {
    var segs = (p.segments || []).filter(function (s) { return s && Number(s.value) > 0; });
    var total = p.total != null ? Number(p.total) : segs.reduce(function (a, s) { return a + Number(s.value); }, 0);
    var fmt = p.format || function (v) { return fmtMoney(v, 0); };
    var desc = segs.map(function (s) { return (s.label || COST_WORD[s.category] || s.category) + ' ' + fmt(s.value) + ' (' + (total ? Math.round(Number(s.value) / total * 100) : 0) + '%)'; }).join(', ');
    var legend = p.legend === false ? null : h('ul', { className: cx('m3-costbar__legend', p.legend === 'inline' && 'is-inline') },
      segs.map(function (s, i) {
        var pct = total ? Number(s.value) / total * 100 : 0;
        return h('li', { key: i, className: 'm3-costbar__item' },
          h('i', { className: 'm3-costbar__swatch', style: { background: 'var(--cost-' + s.category + ')' } }),
          h('span', { className: 'm3-costbar__name' }, s.label || COST_WORD[s.category] || s.category),
          h('span', { className: 'm3-costbar__amt' }, fmt(s.value)),
          h('span', { className: 'm3-costbar__pct' }, (pct < 1 && pct > 0 ? '<1' : Math.round(pct)) + '%'));
      }));
    return h('div', { className: cx('m3-costbar', 'm3-costbar--' + (p.height || 12), p.className) },
      h('div', { className: 'm3-costbar__track', role: 'img', 'aria-label': (p.label ? p.label + ': ' : '') + (desc || 'no costs yet') },
        segs.map(function (s, i) {
          return h('span', { key: i, className: 'm3-costbar__seg', style: { flexGrow: Number(s.value), background: 'var(--cost-' + s.category + ')' }, title: (s.label || COST_WORD[s.category]) + ' ' + fmt(s.value) });
        })),
      legend);
  }

  /* ---------------- HistoryList ---------------- */
  function HistoryList(p) {
    var entries = p.entries || [];
    return h('ol', { className: cx('m3-history', p.className), 'aria-label': p.label || 'History' },
      entries.map(function (e, i) {
        var cls = cx('m3-history__item', e.current && 'is-current', e.future && 'is-future');
        var body = h(React.Fragment, null,
          h('span', { className: 'm3-history__dot', 'aria-hidden': 'true' }, e.icon ? h(Icon, { name: e.icon, size: 14 }) : null),
          h('span', { className: 'm3-history__text' },
            h('span', { className: 'm3-history__title' }, e.title, e.current ? h('span', { className: 'm3-history__now' }, 'Now') : null),
            e.detail ? h('span', { className: 'm3-history__detail' }, e.detail) : null,
            (e.who || e.when) ? h('span', { className: 'm3-history__meta' }, [e.who, e.when].filter(Boolean).join(' · ')) : null));
        if (p.onJump) return h('li', { key: e.id || i, className: cls }, h('button', { type: 'button', className: 'm3-history__btn', 'aria-current': e.current ? 'step' : undefined, onClick: function () { p.onJump(e, i); } }, body));
        return h('li', { key: e.id || i, className: cls }, h('div', { className: 'm3-history__btn' }, body));
      }));
  }

  /* ---------------- SetupSteps ---------------- */
  function SetupSteps(p) {
    var steps = p.steps || [];
    var done = steps.filter(function (s) { return s.state === 'done'; }).length;
    return h('div', { className: cx('m3-steps', p.orientation === 'horizontal' && 'm3-steps--horizontal', p.className) },
      p.headline !== false ? h('div', { className: 'm3-steps__head' },
        h('span', { className: 'm3-steps__headline' }, p.headline || 'Setup'),
        h('span', { className: 'm3-steps__count' }, done + ' of ' + steps.length + ' done')) : null,
      h('ol', { className: 'm3-steps__list' }, steps.map(function (s, i) {
        var state = s.state || 'todo';
        var icon = state === 'done' ? 'check' : state === 'current' ? 'arrow_forward' : null;
        var inner = h(React.Fragment, null,
          h('span', { className: 'm3-steps__marker', 'aria-hidden': 'true' }, icon ? h(Icon, { name: icon, size: 16, weight: 600 }) : String(i + 1)),
          h('span', { className: 'm3-steps__text' },
            h('span', { className: 'm3-steps__label' }, s.label),
            s.detail ? h('span', { className: 'm3-steps__detail' }, s.detail) : null),
          s.action && state !== 'done' ? h('span', { className: 'm3-steps__action' }, s.action) : null);
        var cls = cx('m3-steps__item', 'is-' + state);
        if (p.onSelect) return h('li', { key: i, className: cls }, h('button', { type: 'button', className: 'm3-steps__btn', 'aria-current': state === 'current' ? 'step' : undefined, onClick: function () { p.onSelect(s, i); } }, inner));
        return h('li', { key: i, className: cls }, h('div', { className: 'm3-steps__btn' }, inner));
      })));
  }

  /* ---------------- EmptyState ---------------- */
  function EmptyState(p) {
    return h('div', { className: cx('m3-empty', 'm3-empty--' + (p.size || 'm'), p.className) },
      h('span', { className: 'm3-empty__shape', 'aria-hidden': 'true' }, h(Icon, { name: p.icon || 'inbox', size: p.size === 's' ? 28 : 40 })),
      h('h3', { className: 'm3-empty__headline' }, p.headline),
      p.body ? h('p', { className: 'm3-empty__body' }, p.body) : null,
      p.action ? h('div', { className: 'm3-empty__action' }, p.action) : null);
  }

  /* ---------------- DataGrid (dense, tree, inline edit) ---------------- */
  function parseNum(s) {
    var t = String(s).replace(/[$,\s%]/g, '').replace('−', '-');
    if (t === '' || t === '-') return null;
    var n = Number(t);
    return isNaN(n) ? NaN : n;
  }
  function cellText(row, col) {
    var v = row[col.key];
    if (col.render) return col.render(row, col);
    if (v == null || v === '') return col.placeholder != null ? h('span', { className: 'm3-grid__placeholder' }, col.placeholder) : '';
    switch (col.type) {
      case 'money': return h(Money, { value: v, decimals: col.decimals == null ? 0 : col.decimals });
      case 'number': return fmtNumber(v, col.decimals == null ? 0 : col.decimals);
      case 'percent': return fmtNumber(v, col.decimals == null ? 1 : col.decimals) + '%';
      default: return v;
    }
  }
  function EditCell(p) {
    var col = p.col, row = p.row;
    var st = useState(null); // null = not editing, string = draft
    var ref = useRef(null);
    var done = useRef(false);
    var editing = st[0] !== null;
    var numeric = col.type === 'money' || col.type === 'number' || col.type === 'percent';
    useEffect(function () { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);
    function start(seed) {
      var v = row[col.key];
      done.current = false;
      st[1](seed != null ? seed : (v == null ? '' : String(v)));
    }
    function commit(move) {
      if (!editing || done.current) return;
      done.current = true;
      var raw = st[0];
      var val = numeric ? parseNum(raw) : raw;
      st[1](null);
      if (numeric && isNaN(val)) return; // reject garbage
      if (p.onEdit && String(val) !== String(row[col.key] == null ? '' : row[col.key])) p.onEdit(row, col, val);
      if (move && p.onMove) p.onMove(move);
    }
    if (editing) {
      return h('input', { ref: ref, className: cx('m3-grid__input', numeric && 'is-numeric'), value: st[0], 'aria-label': col.header + ' for ' + (row.name || row.id),
        inputMode: numeric ? 'decimal' : undefined,
        onChange: function (e) { st[1](e.target.value); },
        onBlur: function () { commit(); },
        onKeyDown: function (e) {
          if (e.key === 'Enter') { e.preventDefault(); commit('down'); }
          else if (e.key === 'Tab') { e.preventDefault(); commit(e.shiftKey ? 'prev' : 'next'); }
          else if (e.key === 'Escape') { st[1](null); }
        } });
    }
    var raw = row[col.key];
    var said = raw == null || raw === '' ? 'empty' : numeric ? (col.type === 'money' ? '$' : '') + fmtNumber(raw, col.decimals == null ? (col.type === 'money' ? 0 : 1) : col.decimals) + (col.type === 'percent' ? '%' : '') : String(raw);
    var rowName = row.label || row.name || '';
    return h('button', { type: 'button', className: cx('m3-grid__editbtn', numeric && 'is-numeric'), onClick: start, 'aria-label': col.header + ', ' + said + (rowName ? ', ' + rowName : '') + '. Press Enter to edit',
      onKeyDown: function (e) {
        var arrows = { ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'next', ArrowLeft: 'prev' };
        if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); e.stopPropagation(); start(); }
        else if (arrows[e.key] && !e.altKey && !e.ctrlKey && !e.metaKey && p.onMove) { e.preventDefault(); e.stopPropagation(); p.onMove(arrows[e.key]); }
        else if (/^[0-9.\-$]$/.test(e.key) && numeric && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); e.stopPropagation(); start(e.key === '$' ? '' : e.key); }
      } },
      h('span', { className: 'm3-grid__editval' }, cellText(row, col)),
      h(Icon, { name: 'edit', size: 14, className: 'm3-grid__editicon' }));
  }
  function DataGrid(p) {
    var cols = p.columns || [], rows = p.rows || [];
    var density = p.density || 'dense';
    var tableRef = useRef(null);
    function isEditable(col, row) {
      if (row.kind === 'group' || row.kind === 'total') return false; // locked rows stay editable; the column decides
      return typeof col.editable === 'function' ? col.editable(row) : !!col.editable;
    }
    function move(dir, r, c) {
      var tbl = tableRef.current; if (!tbl) return;
      var btns = Array.prototype.slice.call(tbl.querySelectorAll('.m3-grid__editbtn'));
      var cur = tbl.querySelector('[data-r="' + r + '"][data-c="' + c + '"] .m3-grid__editbtn');
      var i = btns.indexOf(cur);
      var target = null;
      if (dir === 'next') target = btns[i + 1]; else if (dir === 'prev') target = btns[i - 1];
      else if (dir === 'down') { for (var k = r + 1; k < rows.length; k++) { var el = tbl.querySelector('[data-r="' + k + '"][data-c="' + c + '"] .m3-grid__editbtn'); if (el) { target = el; break; } } }
      else if (dir === 'up') { for (var k2 = r - 1; k2 >= 0; k2--) { var el2 = tbl.querySelector('[data-r="' + k2 + '"][data-c="' + c + '"] .m3-grid__editbtn'); if (el2) { target = el2; break; } } }
      if (target) target.focus();
    }
    var hasTree = rows.some(function (r) { return r.hasChildren || r.depth; });
    var footer = p.footer && cols.some(function (c) { return c.footer != null; });
    var totalW = cols.reduce(function (a, c) { return a + (parseInt(c.width, 10) || 120); }, 0);
    return h('div', { className: cx('m3-grid', 'm3-grid--' + density, p.zebra && 'm3-grid--zebra', p.className) },
      h('table', { ref: tableRef, role: 'grid', 'aria-label': p.label, 'aria-rowcount': rows.length, style: { minWidth: totalW + 'px', tableLayout: 'fixed' } },
        h('thead', null, h('tr', null, cols.map(function (c, ci) {
          return h('th', { key: c.key, scope: 'col', className: cx('m3-grid__th', 'is-' + (c.align || (c.type === 'money' || c.type === 'number' || c.type === 'percent' ? 'end' : 'start')), c.category && 'm3-grid__th--' + c.category, c.sticky && 'is-sticky'), style: { width: c.width, minWidth: c.minWidth || c.width } },
            c.category ? h('i', { className: 'm3-grid__cat', 'aria-hidden': 'true' }) : null,
            c.header, c.hint ? h('span', { className: 'm3-grid__hint' }, c.hint) : null);
        }))),
        h('tbody', null, rows.length ? rows.map(function (r, ri) {
          var rowCls = cx('m3-grid__tr', r.kind && 'is-' + r.kind, r.selected && 'is-selected', r.locked && 'is-locked', r.muted && 'is-muted', r.status && 'has-' + r.status, p.onSelect && 'is-clickable');
          return h('tr', { key: r.id != null ? r.id : ri, className: rowCls, 'aria-selected': r.selected ? true : undefined, 'data-depth': r.depth || 0,
            tabIndex: p.onSelect ? 0 : undefined,
            onKeyDown: p.onSelect ? function (e) { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onSelect(r); } } : undefined,
            onClick: p.onSelect ? function (e) { if (e.target.closest('button,input,a')) return; p.onSelect(r); } : undefined },
            cols.map(function (c, ci) {
              var editable = isEditable(c, r);
              var align = c.align || (c.type === 'money' || c.type === 'number' || c.type === 'percent' ? 'end' : 'start');
              var content;
              if (editable) content = h(EditCell, { row: r, col: c, onEdit: p.onEdit, onMove: function (dir) { move(dir, ri, ci); } });
              else content = cellText(r, c);
              var first = ci === 0;
              return h('td', { key: c.key, role: 'gridcell', 'data-r': ri, 'data-c': ci, className: cx('m3-grid__td', 'is-' + align, first && hasTree && 'is-tree', c.sticky && 'is-sticky', editable && 'is-editable', c.category && 'm3-grid__td--' + c.category),
                style: first && hasTree ? { paddingLeft: (12 + (r.depth || 0) * 20) + 'px' } : undefined },
                first && hasTree ? (r.hasChildren
                  ? h('button', { type: 'button', className: 'm3-grid__toggle', 'aria-expanded': !!r.expanded, 'aria-label': (r.expanded ? 'Collapse ' : 'Expand ') + (r.name || ''), onClick: function (e) { e.stopPropagation(); if (p.onToggle) p.onToggle(r); } }, h(Icon, { name: r.expanded ? 'expand_more' : 'chevron_right', size: 20 }))
                  : h('span', { className: 'm3-grid__toggle is-leaf', 'aria-hidden': 'true' })) : null,
                first && r.locked ? h(Icon, { name: 'lock', size: 16, className: 'm3-grid__lock', label: 'Locked' }) : null,
                first && r.status === 'error' ? h(Icon, { name: 'error', size: 16, filled: true, className: 'm3-grid__flag m3-grid__flag--error', label: 'Has an error' }) : null,
                first && r.status === 'warning' ? h(Icon, { name: 'warning', size: 16, filled: true, className: 'm3-grid__flag m3-grid__flag--warning', label: 'Needs attention' }) : null,
                content);
            }));
        }) : h('tr', null, h('td', { className: 'm3-grid__empty', colSpan: cols.length }, p.emptyText || 'Nothing here yet'))),
        footer ? h('tfoot', null, h('tr', { className: 'm3-grid__tr is-total' }, cols.map(function (c, ci) {
          var v = typeof c.footer === 'function' ? c.footer(rows) : c.footer;
          var align = c.align || (c.type === 'money' || c.type === 'number' || c.type === 'percent' ? 'end' : 'start');
          return h('td', { key: c.key, className: cx('m3-grid__td', 'is-' + align, c.sticky && 'is-sticky') }, v == null ? '' : (typeof v === 'number' ? (c.type === 'money' ? h(Money, { value: v, decimals: c.decimals == null ? 0 : c.decimals }) : c.type === 'percent' ? fmtNumber(v, 1) + '%' : fmtNumber(v, c.decimals == null ? 0 : c.decimals)) : v));
        }))) : null));
  }

  var M3 = {
    Icon: Icon, Button: Button, IconButton: IconButton, FAB: FAB, ExtendedFAB: ExtendedFAB, FABMenu: FABMenu,
    SegmentedButton: SegmentedButton, ButtonGroup: ButtonGroup, SplitButton: SplitButton,
    Badge: Badge, LoadingIndicator: LoadingIndicator, ProgressIndicator: ProgressIndicator, Snackbar: Snackbar, Tooltip: Tooltip,
    BottomSheet: BottomSheet, Card: Card, Carousel: Carousel, Dialog: Dialog, Divider: Divider, List: List, ListItem: ListItem, SideSheet: SideSheet,
    TopAppBar: TopAppBar, NavigationBar: NavigationBar, NavigationDrawer: NavigationDrawer, NavigationRail: NavigationRail, Tabs: Tabs, Toolbar: Toolbar,
    Checkbox: Checkbox, Chip: Chip, DatePicker: DatePicker, Menu: Menu, Radio: Radio, Slider: Slider, Switch: Switch, TimePicker: TimePicker,
    TextField: TextField, Search: Search, Delta: Delta,
    Money: Money, StatusChip: StatusChip, Banner: Banner, Kbd: Kbd, StatTile: StatTile, CostBar: CostBar, HistoryList: HistoryList, SetupSteps: SetupSteps, EmptyState: EmptyState, DataGrid: DataGrid,
    fmtMoney: fmtMoney, fmtNumber: fmtNumber
  };
  window.M3 = Object.assign(window.M3 || {}, M3);
})();

export const M3 = window.M3;
