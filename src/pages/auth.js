// Sign-in, first-run company setup, and the company/team settings page.
import * as R from 'react';
import { GL } from '../app/gl.js';
import { M3 as M } from '../ds/index.js';
import { initialsOf } from '../lib/supabase.js';

const h = R.createElement, useState = R.useState, useEffect = R.useEffect, Frag = R.Fragment;

function Brand(p) {
  return h('div', { className: 'gl-auth__brand' }, h(GL.Mark, { size: 36 }), h('span', { className: 'gl-auth__name' }, 'Gradeline'), p.tag ? h('span', { className: 'gl-auth__tag' }, p.tag) : null);
}

/* ---------- Sign in ---------- */
export function LoginPage(p) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const redirect = window.location.origin + '/app';
  // show Google only when it is switched on in Supabase (Authentication › Providers)
  const [googleOn, setGoogleOn] = useState(false);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(url + '/auth/v1/settings', { headers: { apikey: key } }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.external && j.external.google) setGoogleOn(true); }).catch(() => {});
  }, []);
  async function google() {
    setBusy(true); setErr(null);
    const { error } = await p.supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } });
    if (error) { setErr(error.message); setBusy(false); }
  }
  async function magic(e) {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) { setErr('Enter your work email.'); return; }
    setBusy(true); setErr(null);
    const { error } = await p.supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }
  return h('div', { className: 'gl-auth' },
    h('div', { className: 'gl-auth__card' },
      h(Brand, { tag: 'Estimating and bidding for heavy civil' }),
      sent ? h(Frag, null,
        h('h1', { className: 'headline-small' }, 'Check your email'),
        h('p', { className: 'body-medium' }, 'We sent a sign-in link to ', h('strong', null, email), '. Open it on this device and you are in. The link works once and expires in an hour.'),
        h(M.Button, { variant: 'text', onClick: () => setSent(false) }, 'Use a different email'))
      : h(Frag, null,
        h('h1', { className: 'headline-small' }, 'Sign in'),
        h('p', { className: 'body-medium gl-dim' }, googleOn ? 'No passwords. Use your Google account, or get a one-time link by email.' : 'No passwords. Enter your email and we send you a one-time sign-in link.'),
        googleOn ? h(M.Button, { variant: 'filled', size: 'm', icon: 'login', disabled: busy, onClick: google, className: 'gl-auth__google' }, 'Continue with Google') : null,
        googleOn ? h('div', { className: 'gl-auth__or' }, h('span', null, 'or')) : null,
        h('form', { onSubmit: magic, className: 'gl-auth__form' },
          h(M.TextField, { variant: 'outlined', label: 'Work email', type: 'email', value: email, onChange: setEmail, autoComplete: 'email', className: 'gl-auth__field', required: true }),
          h(M.Button, { variant: googleOn ? 'tonal' : 'filled', size: 'm', icon: 'mail', disabled: busy, type: 'submit' }, busy ? 'Sending…' : 'Email me a sign-in link')),
        err ? h(M.Banner, { tone: 'error', compact: true }, err) : null,
        h(M.Divider, null),
        h('p', { className: 'body-small gl-dim' }, 'Just looking? ', h('a', { href: '/demo', className: 'gl-link' }, 'Open the demo'), ' with a sample company. Nothing to sign up for.'))));
}

/* ---------- First run: create the company ---------- */
export function OnboardingPage(p) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('starter');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function create() {
    if (!name.trim()) { setErr('Give your company a name.'); return; }
    setBusy(true); setErr(null);
    const seed = GL.seed();
    let library = { labor: [], equipment: [], materials: [], crews: [], vendors: [] }, bids = [], estimates = [];
    if (start === 'starter') library = seed.library;
    if (start === 'sample') { library = seed.library; bids = seed.bids.map(b => { const { id, ...data } = b; return { id, data }; }); estimates = Object.keys(seed.estimates).map(k => ({ bid_id: k, doc: seed.estimates[k] })); }
    library = { ...library, __setup: { rates: library.labor.length > 0, crews: library.crews.length > 0, vendors: library.vendors.length > 0, accounting: false, firstBid: bids.length > 0 } };
    const { data, error } = await p.supabase.rpc('create_organization', { p_name: name.trim(), p_library: library, p_bids: bids, p_estimates: estimates });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    p.onCreated(data, name.trim());
  }
  const opts = [
    { id: 'starter', title: 'Starter rates', body: 'Typical labor classes, machines, materials and crews to edit into yours. No bids.' },
    { id: 'sample', title: 'Sample company', body: 'Starter rates plus nine sample bids and one priced estimate, so you can see everything working. Delete them whenever.' },
    { id: 'empty', title: 'Empty', body: 'Nothing but your name. Paste your rates in from a spreadsheet.' }
  ];
  return h('div', { className: 'gl-auth' },
    h('div', { className: 'gl-auth__card gl-auth__card--wide' },
      h(Brand, null),
      h('h1', { className: 'headline-small' }, 'Set up your company'),
      h('p', { className: 'body-medium gl-dim' }, 'Signed in as ' + (p.email || 'you') + '. Your company is the private space your bids, estimates and cost library live in. You can invite your team afterwards.'),
      h(M.TextField, { variant: 'outlined', label: 'Company name', value: name, onChange: setName, className: 'gl-auth__field', required: true, placeholder: 'Cascade Civil Constructors' }),
      h('div', { className: 'label-medium gl-dim', style: { marginTop: 8 } }, 'Start with'),
      h('div', { className: 'gl-choice' }, opts.map(o => h('button', { key: o.id, type: 'button', className: 'gl-choice__opt' + (start === o.id ? ' is-selected' : ''), onClick: () => setStart(o.id), 'aria-pressed': start === o.id },
        h('span', { className: 'gl-choice__title' }, start === o.id ? h(M.Icon, { name: 'check_circle', size: 18, filled: true }) : h(M.Icon, { name: 'radio_button_unchecked', size: 18 }), o.title),
        h('span', { className: 'gl-choice__body body-small' }, o.body)))),
      err ? h(M.Banner, { tone: 'error', compact: true }, err) : null,
      h('div', { className: 'gl-auth__actions' },
        h(M.Button, { variant: 'text', onClick: p.onSignOut }, 'Sign out'),
        h(M.Button, { variant: 'filled', size: 'm', icon: 'arrow_forward', disabled: busy, onClick: create }, busy ? 'Creating…' : 'Create company'))));
}

/* ---------- Company and team settings ---------- */
export function SettingsPage(p) {
  const { supabase, org, user } = p;
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('estimator');
  const [orgName, setOrgName] = useState(org.name);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const me = members.find(m => m.user_id === user.id);
  const isOwner = me && me.role === 'owner';

  async function load() {
    const [m, i] = await Promise.all([
      supabase.from('memberships').select('user_id,role,created_at').eq('org_id', org.id),
      supabase.from('invites').select('id,email,role,created_at').eq('org_id', org.id)
    ]);
    if (m.data) {
      setMembers(m.data);
      const ids = m.data.map(x => x.user_id);
      const pr = await supabase.from('profiles').select('user_id,display_name,email').in('user_id', ids);
      const map = {}; (pr.data || []).forEach(x => { map[x.user_id] = x; }); setProfiles(map);
    }
    if (i.data) setInvites(i.data);
  }
  useEffect(() => { load(); }, [org.id]);

  async function invite(e) {
    e.preventDefault(); setErr(null); setMsg(null);
    if (!/.+@.+\..+/.test(email)) { setErr('Enter an email address.'); return; }
    const { error } = await supabase.from('invites').insert({ org_id: org.id, email: email.trim().toLowerCase(), role, invited_by: user.id });
    if (error) { setErr(error.code === '23505' ? 'That email is already invited.' : error.message); return; }
    setMsg(email.trim() + ' can sign in with that email (Google or a sign-in link) and will land in ' + org.name + '.');
    setEmail(''); load();
  }
  async function cancelInvite(id) { const { error } = await supabase.from('invites').delete().eq('id', id); if (error) setErr(error.message); load(); }
  async function remove(userId) { const { error } = await supabase.from('memberships').delete().eq('org_id', org.id).eq('user_id', userId); if (error) setErr(error.message); load(); }
  async function setMemberRole(userId, r) { const { error } = await supabase.from('memberships').update({ role: r }).eq('org_id', org.id).eq('user_id', userId); if (error) setErr(error.message); load(); }
  async function rename() { const { error } = await supabase.from('organizations').update({ name: orgName.trim() }).eq('id', org.id); if (error) setErr(error.message); else { setMsg('Company renamed.'); p.onOrgChanged && p.onOrgChanged({ ...org, name: orgName.trim() }); } }

  const roleOpts = [{ value: 'owner', label: 'Owner' }, { value: 'estimator', label: 'Estimator' }, { value: 'viewer', label: 'Viewer (read only)' }];
  return h('div', { className: 'gl-screen gl-settings' },
    h('div', { className: 'gl-settings__head' },
      h(M.IconButton, { icon: 'arrow_back', label: 'Back to the app', onClick: p.onBack }),
      h('h1', { className: 'headline-small', style: { margin: 0 } }, 'Company and team')),
    h(GL.Section, { title: 'Company' },
      h('div', { className: 'm3-row', style: { gap: 12, alignItems: 'flex-start' } },
        h(M.TextField, { variant: 'outlined', label: 'Company name', value: orgName, onChange: setOrgName, disabled: !isOwner, className: 'gl-field' }),
        isOwner ? h(M.Button, { variant: 'tonal', onClick: rename, disabled: !orgName.trim() || orgName.trim() === org.name, style: { marginTop: 8 } }, 'Rename') : null)),
    h(GL.Section, { title: 'People', subtitle: 'Owners manage the team and billing. Estimators change anything. Viewers can look but not change.' },
      h(M.DataGrid, { label: 'Team', density: 'standard', rows: members.map(m => ({ id: m.user_id, name: (profiles[m.user_id] && (profiles[m.user_id].display_name || profiles[m.user_id].email)) || (m.user_id === user.id ? 'You' : 'Member'), email: profiles[m.user_id] ? profiles[m.user_id].email : '', role: m.role, me: m.user_id === user.id })), columns: [
        { key: 'name', header: 'Name', width: 220, render: r => h('span', null, r.name, r.me ? h('span', { className: 'gl-dim' }, ' (you)') : null) },
        { key: 'email', header: 'Email', width: 260 },
        { key: 'role', header: 'Role', width: 200, render: r => isOwner && !r.me ? h(GL.Select, { value: r.role, options: roleOpts, onChange: v => setMemberRole(r.id, v), className: 'gl-select--dense' }) : roleOpts.find(o => o.value === r.role).label },
        { key: 'actions', header: '', width: 60, align: 'center', render: r => isOwner && !r.me ? h(M.IconButton, { icon: 'person_remove', label: 'Remove ' + r.name, size: 'xs', onClick: () => remove(r.id) }) : '' }] }),
      isOwner ? h('form', { onSubmit: invite, className: 'gl-invite' },
        h(M.TextField, { variant: 'outlined', label: 'Invite by email', type: 'email', value: email, onChange: setEmail, className: 'gl-field', placeholder: 'name@company.com' }),
        h(GL.Select, { label: 'Role', value: role, options: roleOpts, onChange: setRole }),
        h(M.Button, { variant: 'filled', icon: 'person_add', type: 'submit', style: { marginTop: 20 } }, 'Invite')) : null,
      invites.length ? h('div', { className: 'gl-invites' },
        h('div', { className: 'label-medium gl-dim' }, 'Invited, not signed in yet'),
        invites.map(i => h('div', { key: i.id, className: 'gl-invites__row body-medium' }, h('span', null, i.email), h(M.StatusChip, { status: 'pending', label: roleOpts.find(o => o.value === i.role).label }), isOwner ? h(M.IconButton, { icon: 'close', label: 'Cancel invite', size: 'xs', onClick: () => cancelInvite(i.id) }) : null))) : null,
      msg ? h(M.Banner, { tone: 'success', compact: true, onClose: () => setMsg(null) }, msg) : null,
      err ? h(M.Banner, { tone: 'error', compact: true, onClose: () => setErr(null) }, err) : null),
    h(GL.Section, { title: 'You' },
      h('div', { className: 'body-medium' }, h('span', { className: 'm3-avatar gl-avatar', style: { marginRight: 8, verticalAlign: 'middle' } }, initialsOf(p.name, user.email)), p.name, h('span', { className: 'gl-dim' }, ' · ' + user.email)),
      h(M.Button, { variant: 'outlined', icon: 'logout', onClick: p.onSignOut }, 'Sign out')));
}
