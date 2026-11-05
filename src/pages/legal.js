// Privacy policy and terms. Public pages: no sign-in needed. Plain language; update EFFECTIVE when the words change.
import * as R from 'react';
import { GL } from '../app/gl.js';
const h = R.createElement;
const EFFECTIVE = 'November 5, 2026';
const CONTACT = 'support@benchstake.com';

function Page(p) {
  return h('div', { className: 'gl-legal' },
    h('main', { className: 'gl-legal__body' },
      h('a', { href: '/', className: 'gl-auth__brand gl-legal__brand' }, h(GL.Mark, { size: 28 }), h('span', { className: 'gl-auth__name' }, 'Benchstake')),
      h('h1', { className: 'headline-medium' }, p.title),
      h('p', { className: 'body-small gl-dim' }, 'Effective ' + EFFECTIVE),
      p.sections.map(s => h('section', { key: s[0] }, h('h2', { className: 'title-medium' }, s[0]), s.slice(1).map((t, i) => h('p', { key: i, className: 'body-medium' }, t))))));
}

export function PrivacyPage() {
  return h(Page, { title: 'Privacy policy', sections: [
    ['What Benchstake is', 'Benchstake is estimating and bidding software for heavy civil contractors. This policy explains what information we keep, why, and what you can do about it.'],
    ['What we collect', 'Your account: your name, email address and company name.', 'Your work: the bids, estimates, rates, quotes and other information you or your team enter.', 'Sign-in and technical records: when you sign in, and basic logs that keep the service running and secure.', 'If you choose Continue with Google or Continue with Microsoft, we receive your name, email address and profile picture from that account. We don’t receive your password.'],
    ['How we use it', 'We use your information to sign you in, run Benchstake, save your work, send sign-in codes and team invites, answer support requests, and keep the service secure.', 'We don’t sell your information, and we don’t use it for advertising.'],
    ['Who can see it', 'Your company’s bids and estimates are private to your company. People on your team can see them according to their role.', 'We use service providers to run Benchstake: Supabase for the database and sign-in, Vercel for hosting, and Resend for email. They handle information only so that we can provide the service.', 'We may share information if the law requires it.'],
    ['Keeping and deleting it', 'We keep your information while your account is active. To ask for a copy, a correction or deletion, email ' + CONTACT + '.'],
    ['Security', 'Sign-in uses one-time codes or your Google or Microsoft account, and each company’s data is kept separate. No online service can promise perfect security.'],
    ['Changes', 'If this policy changes, we’ll update this page and the date above.'],
    ['Contact', 'Questions? Email ' + CONTACT + '.']] });
}

export function TermsPage() {
  return h(Page, { title: 'Terms of service', sections: [
    ['Using Benchstake', 'By using Benchstake, you agree to these terms. If you use it for a company, you confirm that you’re allowed to do so.'],
    ['Early testing', 'Benchstake is in testing. Features may change or stop, and there may be errors or downtime. It’s free during testing, and we’ll tell you before any charges start.'],
    ['Your account', 'Keep access to your email and accounts secure. You’re responsible for what happens in your company’s account and for who you invite.'],
    ['Your data', 'Your bids, estimates and rates stay yours. You allow us to store and process them only to provide Benchstake.'],
    ['Check your numbers', 'Benchstake is a tool to help you estimate. You’re responsible for reviewing every number, bid and document before you use or submit it. Benchstake doesn’t guarantee that a bid is accurate, complete or profitable.'],
    ['Fair use', 'Don’t misuse the service, try to reach another company’s data, or use Benchstake to break the law.'],
    ['No warranty', 'Benchstake is provided as is, without warranties of any kind, to the extent the law allows.'],
    ['Limit of liability', 'To the extent the law allows, Benchstake isn’t liable for lost profits, lost bids, lost data, or indirect or consequential damages.'],
    ['Ending use', 'You can stop using Benchstake at any time. We may suspend accounts that misuse the service.'],
    ['Changes and law', 'If these terms change, we’ll update this page and the date above. These terms are governed by the laws of Utah.'],
    ['Contact', 'Questions? Email ' + CONTACT + '.']] });
}
