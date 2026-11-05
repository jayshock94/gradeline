# Benchstake

Live at https://benchstake.com (the repo and some internal names still say gradeline).

Estimating and bidding for heavy civil contractors. Pay items, crews and production rates, sub and supplier quotes side by side, bid-day markup with locked prices, checks that run as you type, full undo with a shared history, a bid form and a QuickBooks export.

Built on the Gradeline design system (the design system artifact keeps that name) (a fork of a Material 3 system), so every screen stays on brand.

## What is in the box

| Folder | What |
|---|---|
| `src/app/` | The app: data model (`calc.js`), screens, the estimate workspace, the two stores (`store-local.js` for the demo, `store-cloud.js` for signed-in companies) |
| `src/pages/` | Sign-in, first-run company setup, and the company-name and team panels the Settings screen embeds |
| `src/ds/` | The design system runtime (tokens, components), vendored from the Gradeline design system |
| `supabase/migrations/` | The database: tables, security rules, live updates, onboarding and save functions |
| `api/` | Vercel functions: invite email, the MCP server, quote reading, OAuth metadata |
| `server/` | Code the MCP server shares with the app: the company store and the operations an AI can run |
| `test/run.js` | End-to-end check of the production build in demo mode (`test/ops.mjs` and `test/api.mjs` cover the server side) |

Two ways to run it:

- **Demo** (`/demo`): a sample company in your browser. No account, nothing to set up.
- **Cloud** (`/app`): sign in with an emailed code (or Google or Microsoft once they are switched on), set up your company, invite your team. Everything saves to Supabase, two people can work on one estimate at once, and every change is in a shared history you can undo or jump back to.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173  (demo works right away; /app needs the env vars below)
npm run build && npm test   # production build + headless browser checks
```

## Set up the cloud version (about 20 minutes, all free tiers)

### 1. Supabase (database and sign-in)

1. Go to supabase.com, create a project called `gradeline` (pick the region closest to you; save the database password somewhere).
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order (`0001_init.sql`, then `0002_tighten.sql`). Together they create every table, the security rules and the functions.
3. **Authentication › Providers › Email**: leave it on, and leave **Confirm email** on. The app signs people in with emailed links (magic links), which Supabase sends for you; invites only work for confirmed email addresses.
4. **Authentication › Providers › Google**: turn it on. It needs a Google OAuth client:
   - In Google Cloud Console, create a project, go to **APIs & Services › Credentials › Create credentials › OAuth client ID**, type **Web application**.
   - Authorized redirect URI: the **Callback URL** Supabase shows on the Google provider page (it looks like `https://xxxx.supabase.co/auth/v1/callback`).
   - Copy the client ID and secret into the Supabase Google provider page and save.
5. **Authentication › URL Configuration**: set **Site URL** to your Vercel address (for example `https://gradeline.vercel.app`) and add these **Redirect URLs**: `https://gradeline.vercel.app/app`, `http://localhost:5173/app`.
6. **Project Settings › API**: copy the **Project URL** and the **anon public** key. Those are the two env vars.

### 2. Vercel (hosting)

1. On vercel.com, **Add New › Project › Import** this GitHub repo. Framework preset: **Vite**. Keep the defaults.
2. **Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the values from step 1.6, `RESEND_API_KEY` for invite emails, and `ANTHROPIC_API_KEY` for reading quotes from files.
3. Deploy. Every push to `main` deploys again on its own.

### 3. First sign-in

Open the site, **Sign in**, give your name and company name, and you land in a sample bid, then **Account › Settings › Team** to invite people by email. An invited person signs in with that same email and lands in your company.

## Roles

- **Owner**: everything, plus the team and the company name.
- **Estimator**: change anything in bids, estimates and the library.
- **Viewer**: read only.

## How saving works

Each company's cost library is one document; each bid has one estimate document. Saves go through one server function (`save_scope`) that checks the version: if someone else saved first, the app refetches and applies your change on top. Estimates, the library and history can't be written any other way, and the server records who made each change. Every save writes a history row with a snapshot, which is what undo, redo and "jump back" use, for everyone, and it survives reloads. Undo only steps back over your own latest change; to go back past someone else's, use History. Live updates come over Supabase Realtime; presence shows who else has the estimate open.

## Exports

- **Bid form**: HTML, prints from the browser.
- **QuickBooks Online**: CSV, one line per pay item with product/service, quantity, rate and amount, plus the cost split.
- **QuickBooks Desktop**: IIF with one Estimate transaction (File › Utilities › Import › IIF Files).
- **Spectrum, Vista, Sage 300 CRE**: CSV budget by phase and cost type.

The QuickBooks files follow the documented formats but have not yet been run through a live QuickBooks company. First real import is the test.

## AI

Two ways in, both optional:

- **Quote from file.** On a quote package, *Quote from file* reads a sub's PDF, photo or pasted email into the quote dialog for review (`api/read-quote.js`, Anthropic API). Needs `ANTHROPIC_API_KEY` in Vercel (and optionally `ANTHROPIC_MODEL`). Without the key the button explains it is switched off. The AI only reads the document; prices are saved only when the person taps Save quote.
- **MCP connector.** `https://benchstake.com/api/mcp` is an MCP server (`api/mcp.js`, tools in `server/ops.js`). People add it to Claude, ChatGPT or any MCP client as a custom connector and sign in with their Benchstake account; every call runs as that user, so roles and row security apply, and every change lands in the history like a change made in the app. Sign-in uses Supabase Auth as the OAuth 2.1 server:
  1. Supabase dashboard › **Authentication › OAuth Server**: enable it, set the authorization path to `/oauth/consent`, and allow dynamic client registration (that is how Claude and ChatGPT register themselves).
  2. **Authentication › URL Configuration**: Site URL must be `https://benchstake.com` (the consent page lives at Site URL + `/oauth/consent`).
  3. `/.well-known/oauth-protected-resource` (served by `api/oauth-metadata.js` through `vercel.json`) tells clients where to sign in. Set `MCP_PUBLIC_ORIGIN` if the site ever moves.

## Design system

The runtime in `src/ds/` is generated from the Gradeline design system artifact. To change colors, type or components, change the design system and re-vendor `tokens.css`, `bundle.css` and `bundle.js`; don't hand-edit them here.
