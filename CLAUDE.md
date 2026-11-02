# Gradeline — notes for agents working in this repo

- Plain JavaScript React 18, no JSX: elements are built with `h(...)` (`React.createElement`). Keep that style; there is no Babel/JSX step beyond Vite's default.
- `src/app/gl.js` exports the shared `GL` namespace; the app modules (`data.js`, `calc.js`, `core.js`, `estimate.js`, `screens.js`) attach to it in import order (see `src/main.js`). `calc.js` holds the estimating engine (`GL.derive`) and the checks; keep business rules there, not in screens.
- Design system: `src/ds/` is vendored from the Gradeline design system artifact (tokens.css, bundle.css, bundle.js). Don't hand-edit those three files; change the design system and re-vendor. Components are on `M3` (`import { M3 } from '../ds/index.js'`). Style custom UI with the CSS variables only (`var(--primary)`, `var(--space-4)`, …), never hex values.
- Two stores with one shape (`doc, ui, stack, index, canUndo, canRedo, api`): `store-local.js` (demo, localStorage) and `store-cloud.js` (Supabase). Screens never talk to Supabase directly; everything goes through `api.update(fn, entry)`, which mutates a draft of the whole doc and persists only the parts that changed.
- Database: `supabase/migrations/0001_init.sql`. Every table is per company (`org_id`) with RLS. Saves of the library and estimates go through the `save_scope` function (version check + history row). Add new migrations as new numbered files; don't edit a migration that has been run.
- Tests: `npm run build && npm test` runs `test/run.js` (Playwright, demo mode, fails on console errors). Add a check there for any new screen or flow. Fonts are stubbed from `test/vendor/` when present.
- Copy: sentence case, no exclamation marks, say what happens ("Price locked at $95.00 / TON").
