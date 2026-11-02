// Local store: the demo mode. Everything lives in this browser (localStorage) with full undo history.
import * as R from 'react';
import { GL } from './gl.js';

const STORE_KEY = 'gradeline.demo.v' + GL.VERSION;
const MAX_HISTORY = 80;

export const DEFAULT_UI = { screen: 'bids', tab: 'sheet', theme: 'system', fieldMode: false, railExpanded: false, selectedItemId: null, expanded: {}, sheetView: 'pricing', paneTab: 'summary', formView: 'form', libTab: 'crews', bidFilter: 'all', showDollarsCrew: false };

export function clone(o) { return JSON.parse(JSON.stringify(o)); }
export function nowLabel() { return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.stack && s.stack.length ? s : null;
  } catch (e) { return null; }
}
function save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable: in memory only */ } }

function fresh() {
  const doc = GL.seed();
  return { stack: [{ doc, entry: { id: GL.uid('e'), title: 'Opened sample estimate', detail: 'SR-7 Mill & overlay, 15 pay items', who: 'Sample', when: nowLabel(), icon: 'folder_open' } }], index: 0, ui: { ...DEFAULT_UI } };
}

export function useLocalStore() {
  const init = R.useMemo(() => load() || fresh(), []);
  const [s, set] = R.useState(init);
  R.useEffect(() => { save(s); }, [s]);
  const doc = s.stack[s.index].doc;
  const api = R.useMemo(() => ({
    update(fn, entry) {
      set(prev => {
        const draft = clone(prev.stack[prev.index].doc);
        if (fn(draft) === false) return prev;
        const e = Object.assign({ id: GL.uid('e'), who: 'You', when: nowLabel(), icon: 'edit' }, entry || { title: 'Edited' });
        let stack = prev.stack.slice(0, prev.index + 1).concat([{ doc: draft, entry: e }]);
        if (stack.length > MAX_HISTORY) stack = stack.slice(stack.length - MAX_HISTORY);
        return { ...prev, stack, index: stack.length - 1 };
      });
    },
    undo() { set(p => p.index > 0 ? { ...p, index: p.index - 1 } : p); },
    redo() { set(p => p.index < p.stack.length - 1 ? { ...p, index: p.index + 1 } : p); },
    jump(i) { set(p => ({ ...p, index: Math.max(0, Math.min(p.stack.length - 1, i)) })); },
    ui(patch) { set(p => ({ ...p, ui: { ...p.ui, ...(typeof patch === 'function' ? patch(p.ui) : patch) } })); },
    reset() { set(fresh()); }
  }), []);
  return { doc, ui: s.ui, stack: s.stack, index: s.index, canUndo: s.index > 0, canRedo: s.index < s.stack.length - 1, api, mode: 'demo' };
}
