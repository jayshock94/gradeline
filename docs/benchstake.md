# Benchstake

Estimating and bidding software for heavy civil contractors: excavation, grading, paving, underground utilities and site work.

Live at **https://benchstake.com**. There is a demo with a sample company at **https://benchstake.com/demo**, no sign-in needed.

## Who it's for

Small and mid-size dirt and road contractors who bid unit-price and lump-sum work. Most bid today in their own Excel spreadsheet. The bigger tools (B2W Estimate from Trimble, HCSS HeavyBid) cost $150 to $333 per user each month and take weeks to learn.

The first customer is a small Utah contractor who prices crews by the hour, builds equipment rates from ownership, operating and fuel costs, adds burden on top of labor wages, and uses QuickBooks.

## The problem

A spreadsheet bid works until it doesn't:

- One wrong cell reprices the whole job, and nobody notices until after the bid is in.
- Sub and supplier quotes arrive by phone and email on bid day and get typed in a hurry.
- There's no history. You can't see who changed a number or go back to how the bid looked an hour ago.
- Two people can't work on the same bid at once.
- Past jobs don't teach the next one anything, because every bid is a fresh copy.

## What Benchstake does

**Estimate from the owner's item list.** Paste or upload the pay items (item number, description, quantity, unit). Each item is priced with one or more tasks:

- **Crew tasks:** pick a crew and a production rate (for example 1,150 CY a day). Benchstake works out the crew days and the labor and equipment cost.
- **Material tasks:** a material and how much of it each unit takes.
- **Sub and supplier tasks:** priced at a plug until a real quote is picked.
- **Other:** a lump sum or a cost per unit.

**A cost library built the way contractors already figure it.**

- Labor: base wage plus burden %.
- Equipment: ownership plus operating plus fuel, per hour.
- Crews: people and machines, with the day rate adding up as you build them.
- Materials, subs and suppliers.

Change a rate once and every crew and estimate that uses it reprices.

**Quotes side by side.** Group pay items into a quote package and type in each quote as it comes in, as unit prices or one lump sum. Benchstake lines them up against your plug, points out when a cheaper quote is sitting there unpicked, and flags quoted quantities that don't match yours.

**Bid day.** Set overhead, profit, bond and material tax. Type a unit price to lock it. Type a round target total and Benchstake balances the bid to the exact dollar, without pricing anything below cost.

**Checks before it goes out.** Checks run after every change: items with no price, zero quantities, a missing bond on public work, mobilization over 10% of the bid, a picked quote that hasn't arrived, margin below target. "Go to" jumps straight to the problem.

**Undo and history for everyone.** Every change is recorded in plain words ("Changed quantity on 02316, 18,400 → 20,000 CY") with who made it and when. Undo walks back your own changes. History lets anyone go back to an earlier version.

**Work together.** Several people can be in the same estimate. Changes show up live for everyone, and you can see who else has the bid open.

**Paperwork out.**

- Bid form, with your company name, ready to print or attach.
- Crew plan for the superintendent and foremen, with the dollars hidden.
- Budget export to QuickBooks Online (CSV), QuickBooks Desktop (IIF), Viewpoint Spectrum, Viewpoint Vista and Sage 300 CRE.

**Made for the field and the office.** It works on a phone, a tablet or a laptop. Themes include light, dark and a high-contrast "sunlight" mode for outdoor tablets, plus a field mode that hides every dollar amount.

## How it compares with B2W Estimate

| | Benchstake | B2W Estimate |
|---|---|---|
| Setup | An afternoon: paste rates and an item list | Weeks of setup and training |
| Where it runs | Any browser, phone to desktop | Windows desktop software |
| Rates | Wage + burden, ownership + operating + fuel | Same idea, more fields |
| Quotes | Typed in or entered by phone, side by side with plugs | Full RFQ and quote module |
| History | Plain-language undo and history for everyone | Limited |
| Price | To be set; aimed well below $150 per user a month | About $150 per user a month |

## Sign-in and accounts

- **Sign-in:** one page for new and returning people, with no passwords. Enter your email and type the code Benchstake emails you. Google and Microsoft buttons appear once those are switched on in Supabase.
- **First run:** a new person gives their name and company name, then lands in a sample bid they can change or delete.
- **Companies:** every company's bids, estimates and library are private to that company.
- **Roles:** owners manage the team and the company name, estimators can change anything in bids and estimates, and viewers can only look.
- **Invites:** an owner invites people with the Invite button or from Account › Company and team. An invite lasts 30 days, and only someone who signs in with that exact email can accept it. Invite emails go out from `api/send-invite.js`, which needs `RESEND_API_KEY` set in Vercel.

## Status

- Live on benchstake.com with the first company set up.
- Tested end to end with two people editing one estimate at once, plus automated checks on every change to the code.
- Not built yet: DOT (state transportation department) bid formats, sending quote requests to subs by email, a full keyboard-driven spreadsheet grid, and per-cost-type markup.

## Behind the scenes

- **App:** React, hosted on Vercel.
- **Database and sign-in:** Supabase.
- **Sign-in emails:** Resend, sent from no-reply@benchstake.com.
- **Code:** github.com/jayshock94/gradeline. The repo keeps the old working name, Gradeline.
- **Design:** the Gradeline design system, built on Material 3 with colors for each cost type (labor blue, equipment orange, material teal, sub violet).
