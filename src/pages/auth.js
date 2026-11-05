// Sign-in, first-run company setup, and the company/team settings page.
import * as R from 'react';
import { GL } from '../app/gl.js';
import { M3 as M } from '../ds/index.js';
import { initialsOf } from '../lib/supabase.js';

const h = R.createElement, useState = R.useState, useEffect = R.useEffect, Frag = R.Fragment;

function Brand(p) {
  return h('div', { className: 'gl-auth__brand' }, h(GL.Mark, { size: 36 }), h('span', { className: 'gl-auth__name' }, 'Benchstake'), p.tag ? h('span', { className: 'gl-auth__tag' }, p.tag) : null);
}

/* ---------- Shared helpers ---------- */
// How many digits the emailed code has. Set in Supabase (Authentication › Email › Email OTP Length). The box accepts 6 to 10 either way.
const CODE_DIGITS = 6;
const FREE_MAIL = ['gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'comcast.net', 'centurylink.net', 'xmission.com'];
const MAIL_TYPOS = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'iclod.com': 'icloud.com' };
const TRADE_WORDS = /(sitework|earthwork|earthworks|excavating|excavation|paving|grading|construction|contractors|contracting|utilities|civil|concrete)/g;

function cleanEmail(v) { return (v || '').trim().toLowerCase(); }
function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
function typoFix(v) { const [who, domain] = v.split('@'); return MAIL_TYPOS[domain] ? who + '@' + MAIL_TYPOS[domain] : null; }
export function guessCompany(email) {
  const domain = (cleanEmail(email).split('@')[1] || '');
  if (!domain || FREE_MAIL.indexOf(domain) >= 0) return '';
  return domain.split('.')[0].replace(/[-_]+/g, ' ').replace(TRADE_WORDS, ' $1 ').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
// Google refuses its sign-in inside apps' built-in browsers, so don't offer a button that will fail there.
function inAppBrowser() { return /\bwv\b|FBAN|FBAV|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|GSA\//.test(navigator.userAgent || ''); }

/* ---------- Sign in ---------- */
export function LoginPage(p) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [wait, setWait] = useState(0);
  const redirect = window.location.origin + '/app';
  // Google and Microsoft buttons show only when they are switched on in Supabase (Authentication › Providers)
  const [providers, setProviders] = useState({ google: false, azure: false });
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(url + '/auth/v1/settings', { headers: { apikey: key } }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.external) setProviders({ google: !!j.external.google && !inAppBrowser(), azure: !!j.external.azure }); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!sent || wait <= 0) return undefined;
    const t = setTimeout(() => setWait(w => Math.max(0, w - 1)), 1000);
    return () => clearTimeout(t);
  }, [sent, wait]);
  async function oauth(provider) {
    setBusy(true); setErr(null);
    const { error } = await p.supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirect, scopes: provider === 'azure' ? 'email' : undefined } });
    if (error) { setErr('That sign-in didn’t work. Try again, or use your email.'); setBusy(false); }
  }
  async function sendCode(address) {
    setBusy(true); setErr(null);
    const { error } = await p.supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) {
      const secs = (error.message.match(/after (\d+) seconds?/i) || [])[1];
      if (secs) { setWait(+secs); setSent(true); setErr('A code was just sent. Use that one, or request a new one when the timer ends.'); }
      else setErr(/rate limit/i.test(error.message) ? 'Too many emails in a short time. Wait a minute, then try again.' : 'We couldn’t send your code. Try again in a minute.');
    } else { setSent(true); setCode(''); setWait(60); }
  }
  function submitEmail(e) {
    e.preventDefault();
    const address = cleanEmail(email);
    setSuggestion(null);
    if (!validEmail(address)) { setErr('That doesn’t look like an email address. Check for typos.'); return; }
    setEmail(address);
    const fix = typoFix(address);
    if (fix) { setErr(null); setSuggestion(fix); return; }
    sendCode(address);
  }
  async function verify(token) {
    if (busy) return;
    if (!/^\d{6,10}$/.test(token)) { setErr('Enter the code from the email. It’s all numbers.'); return; }
    setBusy(true); setErr(null);
    const { error } = await p.supabase.auth.verifyOtp({ email: cleanEmail(email), token, type: 'email' });
    setBusy(false);
    if (error) setErr(/expired|invalid/i.test(error.message) ? 'That code didn’t work. Check the newest email from Benchstake, or send a new code.' : 'We couldn’t sign you in. Try again.');
  }
  // a pasted or autofilled code signs in by itself; a typed one signs in at full length once the length is set above
  function changeCode(v) {
    const digits = v.replace(/\D/g, '');
    const jumped = digits.length - code.length >= 4;
    setCode(digits); setErr(null);
    if ((jumped && digits.length >= 6) || (CODE_DIGITS && digits.length === CODE_DIGITS)) verify(digits);
  }
  const anyProvider = providers.google || providers.azure;
  return h('div', { className: 'gl-auth' },
    h('div', { className: 'gl-auth__card' },
      h(Brand, null),
      sent ? h(Frag, null,
        h('h1', { className: 'headline-small' }, 'Check your email'),
        h('p', { className: 'body-medium' }, 'We sent a code to ', h('strong', null, email), '. You can open the email on any device.'),
        h('form', { onSubmit: e => { e.preventDefault(); verify(code); }, className: 'gl-auth__form' },
          h(M.TextField, { variant: 'outlined', label: 'Code from the email', value: code, onChange: changeCode, inputMode: 'numeric', autoComplete: 'one-time-code', className: 'gl-auth__field', required: true }),
          h(M.Button, { variant: 'filled', size: 'm', disabled: busy, type: 'submit' }, busy ? 'Signing in…' : 'Continue')),
        err ? h(M.Banner, { tone: 'error', compact: true }, err) : null,
        h('div', { className: 'gl-auth__links' },
          h(M.Button, { variant: 'text', disabled: busy || wait > 0, onClick: () => sendCode(cleanEmail(email)) }, wait > 0 ? 'Resend code in 0:' + String(wait).padStart(2, '0') : 'Resend code'),
          h(M.Button, { variant: 'text', onClick: () => { setSent(false); setErr(null); setCode(''); } }, 'Wrong email? Change it')),
        wait === 0 ? h('p', { className: 'body-small gl-dim' }, 'Didn’t get it? Check spam or junk, or search your inbox for “Benchstake.” Company email can take a few minutes.') : null)
      : h(Frag, null,
        h('h1', { className: 'headline-small' }, 'Welcome to Benchstake'),
        h('p', { className: 'body-medium gl-dim' }, 'New or returning, start here. No password.'),
        providers.google ? h(M.Button, { variant: 'outlined', size: 'm', disabled: busy, onClick: () => oauth('google'), className: 'gl-auth__google' }, 'Continue with Google') : null,
        providers.azure ? h(M.Button, { variant: 'outlined', size: 'm', disabled: busy, onClick: () => oauth('azure'), className: 'gl-auth__google' }, 'Continue with Microsoft') : null,
        anyProvider ? h('div', { className: 'gl-auth__or' }, h('span', null, 'or use your email')) : null,
        h('form', { onSubmit: submitEmail, className: 'gl-auth__form', noValidate: true },
          h(M.TextField, { variant: 'outlined', label: 'Email', type: 'email', value: email, onChange: v => { setEmail(v); setErr(null); setSuggestion(null); }, autoComplete: 'email', autoCapitalize: 'none', spellCheck: false, className: 'gl-auth__field', required: true }),
          suggestion ? h('div', { className: 'gl-suggest body-medium' }, h('span', null, 'Did you mean ' + suggestion + '?'), h('button', { type: 'button', className: 'gl-link gl-linkbtn', onClick: () => { setEmail(suggestion); setSuggestion(null); } }, 'Yes, use that')) : null,
          h(M.Button, { variant: 'filled', size: 'm', disabled: busy, type: 'submit' }, busy ? 'Sending…' : 'Email me a code')),
        err ? h(M.Banner, { tone: 'error', compact: true }, err) : null,
        h('p', { className: 'body-small gl-dim' }, 'Just looking? ', h('a', { href: '/demo', className: 'gl-link' }, 'Try the demo'), ', no account needed.'))));
}

/* ---------- First run: name, company, then straight into a sample bid ---------- */
export function OnboardingPage(p) {
  const meta = (p.user && p.user.user_metadata) || {};
  const [name, setName] = useState(meta.full_name || meta.name || '');
  const [company, setCompany] = useState(() => guessCompany(p.email));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function create(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Enter your name.'); return; }
    if (!company.trim()) { setErr('Enter your company name.'); return; }
    setBusy(true); setErr(null);
    const seed = GL.seed();
    const sample = seed.bids.find(b => seed.estimates[b.id]);
    const { id: sampleId, ...sampleData } = sample;
    const library = { ...seed.library, __setup: { rates: true, crews: true, vendors: true, accounting: false, firstBid: true } };
    const { data, error } = await p.supabase.rpc('create_organization', { p_name: company.trim(), p_library: library,
      p_bids: [{ id: sampleId, data: { ...sampleData, name: 'Sample: ' + sampleData.name, sample: true } }],
      p_estimates: [{ bid_id: sampleId, doc: seed.estimates[sampleId] }] });
    if (error) { setBusy(false); setErr('We couldn’t set up your company. Try again.'); return; }
    await p.supabase.auth.updateUser({ data: { full_name: name.trim() } });
    await p.supabase.from('profiles').upsert({ user_id: p.user.id, display_name: name.trim(), email: p.user.email }, { onConflict: 'user_id' });
    setBusy(false);
    p.onCreated(data, company.trim(), sampleId);
  }
  return h('div', { className: 'gl-auth' },
    h('div', { className: 'gl-auth__card' },
      h(Brand, null),
      h('h1', { className: 'headline-small' }, 'Two quick questions'),
      h('p', { className: 'body-medium gl-dim' }, 'Then you’re in, with a sample bid to look around.'),
      h('form', { onSubmit: create, className: 'gl-auth__form', noValidate: true },
        h(M.TextField, { variant: 'outlined', label: 'Your name', value: name, onChange: setName, autoComplete: 'name', className: 'gl-auth__field', required: true }),
        h(M.TextField, { variant: 'outlined', label: 'Company name', value: company, onChange: setCompany, autoComplete: 'organization', className: 'gl-auth__field', required: true }),
        h(M.Button, { variant: 'filled', size: 'm', disabled: busy, type: 'submit' }, busy ? 'Opening…' : 'Open my sample bid')),
      err ? h(M.Banner, { tone: 'error', compact: true }, err) : null,
      h('p', { className: 'body-small gl-dim' }, 'Were you invited? ', h('button', { type: 'button', className: 'gl-link gl-linkbtn', onClick: p.onSignOut }, 'Sign out'), ' and use the email address your invite went to.')));
}

/* ---------- Invites: save the invite, then email it from the server ---------- */
export async function emailInvite(supabase, inviteId) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session && data.session.access_token;
    const res = await fetch('/api/send-invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ inviteId }) });
    return res.ok;
  } catch (e) { return false; }
}
export async function createInvite(supabase, org, user, address, role) {
  const email = cleanEmail(address);
  if (!validEmail(email)) return { error: 'Enter their email address.' };
  const { data, error } = await supabase.from('invites').insert({ org_id: org.id, email, role, invited_by: user.id }).select('id').single();
  if (error) return { error: error.code === '23505' ? 'That email is already invited.' : 'We couldn’t save that invite. Try again.' };
  const emailed = await emailInvite(supabase, data.id);
  return { email, emailed };
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
    const r = await createInvite(supabase, org, user, email, role);
    if (r.error) { setErr(r.error); return; }
    setMsg(r.emailed ? 'Invite sent to ' + r.email + '.' : 'Invite saved, but the email didn’t send. Ask ' + r.email + ' to sign in at benchstake.com/app with that address.');
    setEmail(''); load();
  }
  async function resendInvite(id, address) { setErr(null); setMsg(null); const ok = await emailInvite(supabase, id); if (ok) setMsg('Invite sent again to ' + address + '.'); else setErr('The email didn’t send. Ask ' + address + ' to sign in at benchstake.com/app with that address.'); }
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
        invites.map(i => h('div', { key: i.id, className: 'gl-invites__row body-medium' }, h('span', null, i.email), h(M.StatusChip, { status: 'pending', label: roleOpts.find(o => o.value === i.role).label }), isOwner ? h(M.IconButton, { icon: 'send', label: 'Send invite again', size: 'xs', onClick: () => resendInvite(i.id, i.email) }) : null, isOwner ? h(M.IconButton, { icon: 'close', label: 'Cancel invite', size: 'xs', onClick: () => cancelInvite(i.id) }) : null))) : null,
      msg ? h(M.Banner, { tone: 'success', compact: true, onClose: () => setMsg(null) }, msg) : null,
      err ? h(M.Banner, { tone: 'error', compact: true, onClose: () => setErr(null) }, err) : null),
    h(GL.Section, { title: 'You' },
      h('div', { className: 'body-medium' }, h('span', { className: 'm3-avatar gl-avatar', style: { marginRight: 8, verticalAlign: 'middle' } }, initialsOf(p.name, user.email)), p.name, h('span', { className: 'gl-dim' }, ' · ' + user.email)),
      h(M.Button, { variant: 'outlined', icon: 'logout', onClick: p.onSignOut }, 'Sign out')));
}
