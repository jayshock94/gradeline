// Emails a team invite through Resend. Runs on the server so the Resend key never reaches the browser.
// Only an owner of the company can send, and only for an invite that is already saved.
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROLE = { owner: 'an owner', estimator: 'an estimator', viewer: 'a viewer' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY, resend = process.env.RESEND_API_KEY;
  if (!url || !anon || !resend) return res.status(500).json({ error: 'Not configured' });
  const auth = req.headers.authorization || '';
  const inviteId = req.body && req.body.inviteId;
  if (!auth.startsWith('Bearer ') || !/^[0-9a-f-]{36}$/i.test(inviteId || '')) return res.status(400).json({ error: 'Bad request' });
  const sb = path => fetch(url + path, { headers: { apikey: anon, Authorization: auth } }).then(r => (r.ok ? r.json() : null));

  const user = await sb('/auth/v1/user');
  if (!user || !user.id) return res.status(401).json({ error: 'Sign in first' });
  const invites = await sb('/rest/v1/invites?id=eq.' + inviteId + '&select=email,role,org_id,expires_at');
  const invite = invites && invites[0];
  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'Invite expired' });
  const member = await sb('/rest/v1/memberships?org_id=eq.' + invite.org_id + '&user_id=eq.' + user.id + '&select=role');
  if (!member || !member[0] || member[0].role !== 'owner') return res.status(403).json({ error: 'Owners only' });
  const orgs = await sb('/rest/v1/organizations?id=eq.' + invite.org_id + '&select=name');
  const company = (orgs && orgs[0] && orgs[0].name) || 'your company';
  const meta = user.user_metadata || {};
  const from = (meta.full_name || meta.name || '').trim() || user.email;
  const first = from.split(/\s+/)[0];
  const role = ROLE[invite.role] || 'a teammate';

  const text = from + ' added you to ' + company + ' on Benchstake as ' + role + '.\n\nTo join, go to https://benchstake.com/app and sign in with this email address (' + invite.email + '). There is no password to set up. This invite lasts 30 days.';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1a1c1e">' +
    '<h2 style="font-weight:600;margin:0 0 12px">Join ' + esc(company) + ' on Benchstake</h2>' +
    '<p style="margin:0 0 16px;line-height:1.5">' + esc(from) + ' added you as ' + esc(role) + '.</p>' +
    '<p style="margin:0 0 16px;line-height:1.5">To join, sign in with this email address: <strong>' + esc(invite.email) + '</strong>. There is no password to set up.</p>' +
    '<p style="margin:0 0 16px"><a href="https://benchstake.com/app" style="display:inline-block;background:#004a9a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:24px">Open Benchstake</a></p>' +
    '<p style="margin:0;line-height:1.5;color:#44474e">This invite lasts 30 days.</p></div>';

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + resend, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Benchstake <no-reply@benchstake.com>', to: [invite.email], subject: first + ' invited you to ' + company + ' on Benchstake', html, text })
  });
  if (!sent.ok) return res.status(502).json({ error: 'Email failed' });
  return res.status(200).json({ ok: true });
}
