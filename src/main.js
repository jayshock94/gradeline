// Benchstake entry: routing, sign-in gate, and the choice between the demo store and the cloud store.
import * as R from 'react';
import { createRoot } from 'react-dom/client';
import { M3 as M } from './ds/index.js';
import { GL } from './app/gl.js';
import './app/data.js';
import './app/calc.js';
import './app/core.js';
import './app/fields.js';
import './app/ai.js';
import './app/estimate.js';
import './app/screens.js';
import './lib/spreadsheet.js';
import './app/app.css';
import { supabase, cloudEnabled, displayName, initialsOf } from './lib/supabase.js';
import { useLocalStore } from './app/store-local.js';
import { useCloudStore } from './app/store-cloud.js';
import { PrivacyPage, TermsPage } from './pages/legal.js';
import { LoginPage, OnboardingPage, CompanyNamePanel, TeamPanel, ConsentPage, ConnectedAiPanel, createInvite } from './pages/auth.js';

const h = R.createElement, useState = R.useState, useEffect = R.useEffect;

function usePath() {
  // a Site URL saved with a trailing slash makes links like //oauth/consent; treat repeated slashes as one
  const clean = () => window.location.pathname.replace(/\/{2,}/g, '/');
  const [path, setPath] = useState(clean);
  useEffect(() => { const f = () => setPath(clean()); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  return [path, p => { window.history.pushState({}, '', p); setPath(p); }];
}

function Redirect(p) { useEffect(() => { p.navigate(p.to); }, []); return null; }
function Centered(p) { return h('div', { className: 'gl-center' }, p.children); }

function DemoApp() {
  const store = useLocalStore();
  return h(GL.App, { store, session: { name: 'Maya R.', initials: 'MR', orgName: 'Cascade Civil Constructors, Inc. (sample)' } });
}

function CloudApp(p) {
  const { user, org, name } = p;
  const store = useCloudStore({ supabase, orgId: org.id, user, name, initialUi: p.firstBid ? { screen: 'estimate', tab: 'sheet', bidId: p.firstBid } : p.settings ? { screen: 'settings' } : null });
  if (store.error && !store.doc) return h(Centered, null, h(M.Banner, { tone: 'error', headline: 'Could not load your company' }, store.error));
  if (!store.loaded || !store.doc) return h(Centered, null, h(M.LoadingIndicator, { label: 'Loading your bids' }));
  return h(R.Fragment, null,
    h(GL.App, { store, session: { name, initials: initialsOf(name, user.email), orgName: org.name, role: org.role, onSignOut: p.onSignOut, peers: store.peers, email: user.email,
      companyPanel: h(CompanyNamePanel, { supabase, org, onOrgChanged: p.onOrgChanged }), teamPanel: h(TeamPanel, { supabase, org, user }), aiPanel: h(ConnectedAiPanel, { supabase }), getToken: async () => { const { data } = await supabase.auth.getSession(); return data.session ? data.session.access_token : null; }, joined: p.joined, onDismissJoined: p.onDismissJoined, onInvite: org.role === 'owner' ? (email, role) => createInvite(supabase, org, user, email, role) : null } }),
    store.error ? h('div', { className: 'gl-snack' }, h(M.Snackbar, { message: store.error, onClose: store.api.clearError })) : null);
}

function Root() {
  const [path, navigate] = usePath();
  const [auth, setAuth] = useState({ ready: !cloudEnabled, user: null });
  const [org, setOrg] = useState(undefined); // undefined = unknown, null = none yet
  const [orgError, setOrgError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [firstBid, setFirstBid] = useState(null); // the sample bid to open right after setup
  const [joined, setJoined] = useState(false); // this sign-in accepted an invite

  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setAuth({ ready: true, user: data.session ? data.session.user : null }); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (alive) setAuth({ ready: true, user: session ? session.user : null }); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // after sign-in: keep a profile row, accept invites, find the company
  const user = auth.user;
  useEffect(() => {
    if (!user) { setOrg(undefined); return; }
    setOrgError(null);
    let alive = true;
    (async () => {
      await supabase.from('profiles').upsert({ user_id: user.id, display_name: displayName(user), email: user.email }, { onConflict: 'user_id' });
      const accepted = await supabase.rpc('accept_invites');
      const { data, error } = await supabase.from('memberships').select('org_id,role,created_at,organizations(id,name)').eq('user_id', user.id).order('created_at').limit(1);
      if (!alive) return;
      if (error) { setOrgError(error.message); return; }
      const m = data && data[0];
      if (m && accepted.data > 0 && Date.now() - new Date(m.created_at).getTime() < 600000) setJoined(true);
      setOrg(m && m.organizations ? { id: m.organizations.id, name: m.organizations.name, role: m.role } : null);
    })();
    return () => { alive = false; };
  }, [user && user.id, retry]);

  async function signOut() { await supabase.auth.signOut(); navigate('/'); }

  if (path === '/privacy') return h(PrivacyPage);
  if (path === '/terms') return h(TermsPage);
  if (path === '/demo' || path.startsWith('/demo/')) return h(DemoApp);
  if (!cloudEnabled) {
    if (path.startsWith('/app')) return h(Centered, null, h('div', { className: 'gl-auth__card' }, h('h1', { className: 'headline-small' }, 'Not connected yet'), h('p', { className: 'body-medium' }, 'This build has no database configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY). The demo works without one.'), h(M.Button, { onClick: () => navigate('/demo') }, 'Open the demo')));
    return h(Landing, { navigate, demoOnly: true });
  }
  const consent = path === '/oauth/consent'; // an AI app asking to connect (see pages/auth.js ConsentPage)
  if (!auth.ready) return h(Centered, null, h(M.LoadingIndicator, { label: 'Signing in' }));
  if (!user) return path.startsWith('/app') || consent ? h(LoginPage, { supabase }) : h(Landing, { navigate });
  if (!path.startsWith('/app') && !consent) return h(Redirect, { to: '/app', navigate });
  if (orgError) return h(Centered, null, h('div', { className: 'gl-auth__card' }, h(M.Banner, { tone: 'error', headline: 'Could not reach your company' }, orgError), h('div', { className: 'gl-auth__actions' }, h(M.Button, { variant: 'text', onClick: signOut }, 'Sign out'), h(M.Button, { onClick: () => setRetry(r => r + 1) }, 'Try again'))));
  if (org === undefined) return h(Centered, null, h(M.LoadingIndicator, { label: 'Finding your company' }));
  if (org === null) return h(OnboardingPage, { supabase, user, email: user.email, onSignOut: signOut, onCreated: (id, name, bidId) => { setFirstBid(bidId); setOrg({ id, name: name || 'Your company', role: 'owner' }); } });
  const name = displayName(user);
  if (consent) return h(ConsentPage, { supabase, org, user, name, onSignOut: signOut });
  return h(CloudApp, { user, org, name, firstBid, joined, settings: path === '/app/settings', onDismissJoined: () => setJoined(false), onSignOut: signOut, onOrgChanged: setOrg });
}

function Landing(p) {
  return h('div', { className: 'gl-auth gl-landing' },
    h('div', { className: 'gl-auth__card gl-auth__card--wide' },
      h('div', { className: 'gl-auth__brand' }, h(GL.Mark, { size: 36 }), h('span', { className: 'gl-auth__name' }, 'Benchstake')),
      h('h1', { className: 'headline-medium', style: { margin: '8px 0 4px' } }, 'Estimating and bidding for heavy civil, built for bid day.'),
      h('p', { className: 'body-large gl-dim' }, 'Crews, production rates and sub quotes in one sheet. Full undo. Checks that run as you type. A bid form and a budget export when you are done.'),
      h('div', { className: 'gl-auth__actions', style: { justifyContent: 'flex-start' } },
        p.demoOnly ? null : h(M.Button, { variant: 'filled', size: 'm', onClick: () => p.navigate('/app') }, 'Get started'),
        h(M.Button, { variant: p.demoOnly ? 'filled' : 'tonal', size: 'm', icon: 'play_arrow', onClick: () => p.navigate('/demo') }, 'Try the demo')),
      h('p', { className: 'body-small gl-dim' }, h('a', { href: '/privacy', className: 'gl-link' }, 'Privacy'), ' · ', h('a', { href: '/terms', className: 'gl-link' }, 'Terms'))));
}

createRoot(document.getElementById('root')).render(h(Root));
