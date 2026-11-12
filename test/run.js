// End-to-end check of the production build in demo mode (no database needed).
// Usage: npm run build && node test/run.js [--shots]
// Serves dist/ in-process, drives the app with Playwright, fails on any console error.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SHOTS = process.argv.includes('--shots');
const OUT = path.join(__dirname, 'shots');
if (SHOTS) fs.mkdirSync(OUT, { recursive: true });
const vendor = path.join(__dirname, 'vendor');
const localFonts = fs.existsSync(path.join(vendor, 'roboto-latin-wght-normal.woff2'));
const fontCss = `@font-face{font-family:'Roboto';font-style:normal;font-weight:100 900;src:url('https://local.test/__fonts/roboto-latin-wght-normal.woff2') format('woff2')}@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;src:url('https://local.test/__fonts/material-symbols-outlined.woff2') format('woff2')}`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };

function makeXlsx() {
  // a tiny workbook with a header row, built without SheetJS so the test has no extra deps
  return null;
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error('dist/ not found: run `npm run build` first'); process.exit(1); }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
  // console "Failed to load resource" lines carry no URL, so network failures are tracked per request instead
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { const host = new URL(r.url()).hostname; if (!FONT_HOSTS.includes(host)) errors.push('request failed: ' + r.url() + ' ' + (r.failure() ? r.failure().errorText : '')); });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'fonts.googleapis.com' && localFonts) return route.fulfill({ status: 200, contentType: 'text/css', body: fontCss });
    if (FONT_HOSTS.includes(u.hostname)) return route.continue(); // real Google Fonts when no local copies (CI)
    if (u.hostname !== 'local.test') return route.abort();
    if (u.pathname === '/api/read-quote') { // the AI quote reader, stubbed: prices the first two lines of whatever package was sent
      const body = JSON.parse(route.request().postData() || '{}'); const lines = (body.package && body.package.lines) || [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ quote: { vendor: 'Granite Peak Materials', is_quote: true, lines: lines.slice(0, 2).map((l, i) => ({ item_id: l.itemId, unit_price: 70 + i, qty: i === 0 ? Math.round(l.qty * 0.9) : undefined, quoted_as: l.name + ' @ ' + (70 + i), certain: i === 0 })), unmatched: [{ description: 'Mobilization', amount: 2500 }], exclusions: ['Excludes traffic control'], problems: [] } }) });
    }
    if (u.pathname.startsWith('/__fonts/')) return route.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(path.join(vendor, path.basename(u.pathname))) });
    let p = path.join(DIST, u.pathname);
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html'); // SPA fallback, like vercel.json
    return route.fulfill({ status: 200, contentType: types[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
  });
  const shot = async name => { if (SHOTS) { await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, name + '.png') }); } };
  const check = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) errors.push('check: ' + msg); };

  // landing (no database configured in this build)
  await page.goto('https://local.test/', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  check(await page.getByRole('button', { name: 'Try the demo' }).count() === 1, 'landing shows the demo button');
  await shot('00-landing');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.waitForTimeout(400);
  check(page.url().endsWith('/demo'), 'demo route');
  check(await page.locator('.gl-app').count() === 1, 'app mounted in demo mode');
  await shot('01-bids');

  // new bid: the date and time fields are real pickers, and typing still works
  await page.getByRole('button', { name: 'New bid' }).first().click(); await page.waitForTimeout(200);
  const due = page.getByRole('textbox', { name: /Bids due/ });
  await due.click(); await page.keyboard.type('11/20'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  check((await due.inputValue()) === '11/20/' + new Date().getFullYear(), 'typing 11/20 in Bids due fills in the year');
  await due.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('nov 32'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  check((await page.getByText(/Use MM\/DD\/YYYY/).count()) === 1 && (await page.getByRole('button', { name: 'Create' }).isDisabled()), 'a bad date shows how to type one and keeps Create off');
  await page.getByRole('button', { name: 'Choose bids due' }).click(); await page.waitForTimeout(200);
  check((await page.locator('.gl-picker .m3-date').count()) === 1, 'the calendar icon opens the design-system date picker');
  await page.locator('.m3-date__day').nth(20).click(); await page.locator('.gl-picker').getByRole('button', { name: 'OK' }).click(); await page.waitForTimeout(200);
  check(/^\d{1,2}\/21\/\d{4}$/.test(await due.inputValue()), 'picking a day fills the field (' + (await due.inputValue()) + ')');
  await page.getByRole('button', { name: 'Choose time' }).click(); await page.waitForTimeout(150);
  await page.getByRole('option', { name: '10:30 AM' }).click(); await page.waitForTimeout(150);
  check((await page.getByRole('textbox', { name: 'Time' }).inputValue()) === '10:30 AM', 'the clock icon opens a time list and picks 10:30 AM');
  await page.getByRole('textbox', { name: 'Time' }).fill('3pm'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  check((await page.getByRole('textbox', { name: 'Time' }).inputValue()) === '3:00 PM', 'typing 3pm becomes 3:00 PM');
  await shot('01b-newbid');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(150);

  // open the sample bid, edit a quantity, undo, redo
  await page.getByRole('row', { name: /SR-7 Mill/ }).click();
  await page.waitForTimeout(300);
  const total = () => page.locator('.gl-kpi__value').first().innerText();
  const t0 = await total();
  await page.getByRole('button', { name: /^Quantity, / }).nth(3).click();
  await page.keyboard.press('Control+A'); await page.keyboard.type('20000'); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const t1 = await total();
  check(t1 !== t0, 'quantity edit changes the total (' + t0 + ' → ' + t1 + ')');
  await page.locator('.gl-appbar').click({ position: { x: 600, y: 30 } });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  check((await total()) === t0, 'undo restores the total');
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(200);
  check((await total()) === t1, 'redo re-applies it');
  await shot('02-sheet');

  // typing a digit into a cell edits it; it never switches tabs
  await page.getByRole('button', { name: /^Quantity, / }).nth(2).focus();
  await page.keyboard.press('2'); await page.waitForTimeout(150);
  check((await page.locator('.m3-grid__input').count()) === 1 && (await page.locator('.gl-sheet').count()) === 1, 'typing "2" in a quantity cell starts editing instead of switching tabs');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);

  // lock a price by typing it; the row's quantity stays editable
  const qtyCells = await page.getByRole('button', { name: /^Quantity, / }).count();
  await page.getByRole('button', { name: /^Unit price, / }).nth(7).click();
  await page.keyboard.press('Control+A'); await page.keyboard.type('95.126'); await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  check((await page.locator('.m3-grid__lock').count()) === 1, 'typing a unit price locks it');
  check((await page.getByRole('button', { name: /^Quantity, / }).count()) === qtyCells, 'a locked row keeps its quantity editable');
  check((await page.getByText('$95.13').count()) >= 1, 'a typed price is kept to the cent ($95.13)');

  // quotes, checks, bid day
  await page.getByRole('tab', { name: 'Quotes' }).click();
  // the tab badge, the tile and the chips all count the same quotes that are still out
  const badge = await page.getByRole('tab', { name: 'Quotes' }).locator('.m3-badge').innerText();
  const allPkgs = await page.locator('.gl-pkg').count();
  await page.getByRole('button', { name: /Quotes received/ }).click(); await page.waitForTimeout(200);
  const waitingPkgs = await page.locator('.gl-pkg').count();
  const waitingChips = await page.locator('.gl-pkg .m3-status', { hasText: 'Waiting on' }).count();
  check(badge === '2' && waitingPkgs === 2 && waitingChips === 2 && allPkgs > waitingPkgs, 'quotes badge 2 → the tile shows the 2 packages waiting on a quote, each labeled');
  await page.getByRole('button', { name: /^All$/ }).click(); await page.waitForTimeout(150);
  check((await page.locator('.gl-pkg').count()) === allPkgs, 'All brings every package back');
  await page.getByRole('button', { name: /Timp Precast ·/ }).click(); await page.waitForTimeout(200);
  check((await page.getByText(/is \$[\d,]+ lower than your pick/).count()) === 1, 'picking a higher quote shows the cheaper one');
  // a phoned-in quote, typed by hand from a company not in the library
  await page.getByRole('button', { name: 'Add quote' }).first().click();
  await page.getByRole('dialog').getByRole('combobox').first().selectOption('__new');
  await page.getByLabel('Company name').fill('Wasatch Pipe Supply');
  await page.getByRole('dialog').getByLabel('Unit price').first().fill('41.5');
  await page.getByRole('button', { name: 'Save quote' }).click(); await page.waitForTimeout(250);
  check((await page.getByText('Wasatch Pipe Supply').count()) >= 1, 'a quote can be entered by hand, with a new company');
  const plugCells = page.getByRole('button', { name: /^Plug, / });
  check((await plugCells.count()) > 0, 'plug cells on the quotes tab can be edited');
  await plugCells.first().click(); await page.keyboard.press('Control+A'); await page.keyboard.type('123.45'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check((await page.getByText('$123.45').count()) >= 1, 'typing a plug on the quotes tab saves it');
  // a quote read from a file (the AI reader is stubbed above): the dialog fills in and waits for review
  const pdf = path.join(__dirname, 'tmp-quote.pdf'); fs.writeFileSync(pdf, '%PDF-1.4 fake quote');
  await page.locator('.gl-pkg').filter({ hasText: 'HMA 1/2 in. supply' }).locator('input[type=file]').setInputFiles(pdf);
  await page.waitForTimeout(400);
  check((await page.getByRole('dialog').getByText(/Read from tmp-quote\.pdf: 1 of 1 item/).count()) === 1, 'quote from file: the dialog says what it read');
  check((await page.getByRole('dialog').getByRole('combobox').first().inputValue()) !== '__new' && (await page.getByRole('dialog').getByLabel('Unit price').first().inputValue()) === '70', 'quote from file: matched the known vendor and filled the unit price');
  check((await page.getByRole('dialog').getByText(/Quoted 10,080 TON, bid has 11,200/).count()) === 1, 'quote from file: a quantity mismatch is flagged on the line');
  check(/Excludes traffic control.*Not matched: Mobilization/.test(await page.getByRole('dialog').getByRole('textbox', { name: 'Notes and exclusions' }).inputValue()), 'quote from file: exclusions and unmatched lines land in the notes');
  await shot('03b-quote-from-file');
  await page.getByRole('button', { name: 'Save quote' }).click(); await page.waitForTimeout(300);
  check((await page.getByText(/Saved the quote from Granite Peak/).count()) === 1, 'quote from file saves like a typed quote');
  fs.unlinkSync(pdf);
  await shot('03-quotes');
  await page.getByRole('tab', { name: 'Checks' }).click();
  await page.getByRole('button', { name: 'Go to' }).first().click(); await page.waitForTimeout(200);
  check((await page.locator('.m3-grid__tr.is-selected').count()) === 1, 'check "Go to" selects the row');
  await page.getByRole('tab', { name: 'Bid day' }).click();
  // markup saves once, when you leave the box
  const oh = page.getByRole('textbox', { name: 'Overhead' });
  await oh.click(); await page.keyboard.press('Control+A'); await page.keyboard.type('10'); await page.waitForTimeout(100);
  const midTile = await page.getByText('Overhead 10%').count();
  await page.keyboard.press('Tab'); await page.waitForTimeout(200);
  check(midTile === 0 && (await page.getByText('Overhead 10%').count()) === 1, 'markup saves once, when you leave the box');
  await page.getByRole('textbox', { name: 'Overhead' }).fill('6'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  await page.getByLabel('Target total').fill('2300000');
  await page.getByRole('button', { name: 'Balance' }).click(); await page.waitForTimeout(300);
  check((await total()) === '$2,300,000', 'balance hits the target exactly (' + (await total()) + ')');
  await shot('04-bidday');
  // Escape closes a dialog
  await page.getByRole('button', { name: 'Edit bid details' }).click();
  check((await page.getByRole('dialog').count()) === 1, 'edit bid dialog opens');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  check((await page.getByRole('dialog').count()) === 0, 'Escape closes the dialog');
  // a submitted bid is read-only until reopened (set through Edit bid, which warns when checks are open)
  await page.getByRole('button', { name: 'Edit bid details' }).click();
  await page.getByRole('dialog').getByRole('combobox', { name: 'Status' }).selectOption('submitted');
  check((await page.getByRole('dialog').getByText(/not cleared on this bid/).count()) === 1, 'edit bid warns when checks have not cleared');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(250);
  check((await page.getByText(/Marked as submitted [A-Z][a-z]{2} \d+.*read-only/).count()) === 1, 'submitted banner shows the date and says read-only');
  const tSub = await total();
  await page.getByRole('button', { name: /^Unit price, / }).first().click();
  await page.keyboard.press('Control+A'); await page.keyboard.type('1'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check((await total()) === tSub && (await page.getByText('This bid was submitted').count()) >= 1, 'prices cannot change on a submitted bid');
  await page.getByRole('button', { name: 'Reopen bid' }).click(); await page.waitForTimeout(250);
  check((await page.getByRole('button', { name: 'Mark as submitted' }).count()) === 1, 'reopening the bid brings the submit button back');

  // edit bid details
  await page.getByRole('button', { name: 'Edit bid details' }).click();
  await page.getByRole('textbox', { name: /Note/ }).fill('Pipe quotes due Friday.');
  await page.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('dialog').count()) === 0, 'edit bid dialog saves and closes');

  // exports (downloads)
  await page.getByRole('tab', { name: 'Form' }).click();
  const dl1 = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save bid form' }).click();
  const d1 = await dl1; check(/Bid form - .*\.html$/.test(d1.suggestedFilename()), 'bid form downloads as HTML (' + d1.suggestedFilename() + ')');
  await page.getByRole('radio', { name: 'Budget export' }).click();
  await page.getByRole('button', { name: 'Export budget' }).first().click();
  const dl2 = page.waitForEvent('download');
  await page.getByRole('dialog').getByRole('button', { name: 'Download CSV' }).click();
  const d2 = await dl2; const csvPath = await d2.path(); const csv = fs.readFileSync(csvPath, 'utf8');
  check(/QuickBooks Online\.csv$/.test(d2.suggestedFilename()) && csv.startsWith('Customer,Product/Service'), 'QuickBooks Online CSV has the right header');
  await page.getByRole('button', { name: 'Export budget' }).count(); // (bid day button also exists)
  await shot('05-export');

  // paste import on the sheet
  await page.getByRole('tab', { name: 'Sheet' }).click();
  const rowsBefore = await page.locator('.m3-grid__tr').count();
  await page.getByRole('button', { name: 'Paste items' }).click();
  await page.getByLabel('Rows to import').fill('Item\tDescription\tQty\tUnit\n02841\tGuardrail end section\t8\tEA\nSigns and posts\t24\tEA');
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: /Add 2/ }).click(); await page.waitForTimeout(200);
  check((await page.locator('.m3-grid__tr').count()) === rowsBefore + 2, 'pasting with a header row adds 2 items');
  await page.getByRole('button', { name: 'Paste items' }).click();
  await page.getByLabel('Rows to import').fill('Furnish and install 36 IN RCP 1200 LF');
  await page.waitForTimeout(100);
  const preview = await page.getByRole('dialog').innerText();
  check(/Furnish and install 36 IN RCP\t1,200/.test(preview), 'a pipe size in the description is not read as the quantity');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  // "18,400" is a number in the pay item dialog
  await page.getByRole('button', { name: 'Pay item' }).click();
  await page.getByLabel('Description').fill('Comma test');
  await page.getByLabel('Bid quantity').fill('18,400');
  check(!(await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).isDisabled()), 'a quantity typed with a comma is accepted');
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('row', { name: /Comma test/ }).getByText('18,400').count()) === 1, 'the comma quantity lands on the sheet as 18,400');

  // csv file import through the file picker
  const csvFile = path.join(__dirname, 'tmp-items.csv'); fs.writeFileSync(csvFile, 'Code,Description,Qty,Unit\n02843,Guardrail terminal,4,EA\n');
  await page.getByRole('button', { name: 'Paste items' }).click();
  await page.locator('input[type=file]').setInputFiles(csvFile);
  await page.waitForTimeout(200);
  check((await page.getByRole('button', { name: /Add 1 pay item/ }).count()) === 1, 'CSV file import parses 1 item');
  await page.getByRole('button', { name: /Add 1 pay item/ }).click(); await page.waitForTimeout(200);
  fs.unlinkSync(csvFile);

  // new bid: an impossible date is refused
  await page.getByRole('button', { name: 'Bids' }).click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'New bid' }).first().click();
  await page.getByLabel('Project name').fill('Date test');
  await page.getByLabel(/Owner/).fill('UDOT');
  check(await page.getByRole('button', { name: 'Create' }).isDisabled(), 'Create waits for a due date');
  const due2 = page.getByRole('textbox', { name: /Bids due/ });
  await due2.click(); await page.keyboard.type('2026-11-20'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  check(!(await page.getByRole('button', { name: 'Create' }).isDisabled()), 'a date typed in the date field enables Create');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);

  // find a bid, duplicate it, delete the copy
  await page.getByRole('searchbox', { name: 'Find a bid' }).fill('zzzz'); await page.waitForTimeout(200);
  check((await page.getByText('No bids match "zzzz"').count()) === 1, 'a bid search with no hits says so');
  await page.locator('.gl-grid-empty').getByRole('button', { name: 'Clear search' }).click(); await page.waitForTimeout(150);
  await page.getByRole('searchbox', { name: 'Find a bid' }).fill('SR-7'); await page.waitForTimeout(200);
  check((await page.locator('.m3-grid__tr').count()) === 1, 'searching SR-7 leaves one bid');
  await page.getByRole('button', { name: /Actions for SR-7/ }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('dialog').getByText(/Quotes and locked prices start fresh/).count()) === 1, 'duplicate says what copies and what starts fresh');
  const dupDue = page.getByRole('textbox', { name: /Bids due/ });
  await dupDue.click(); await page.keyboard.type('12/05'); await page.keyboard.press('Tab'); await page.waitForTimeout(150);
  await page.getByRole('dialog').getByRole('button', { name: 'Duplicate', exact: true }).click(); await page.waitForTimeout(400);
  check((await page.locator('.gl-estimate__title').innerText()).includes('(copy)'), 'duplicating opens the copy');
  check((await page.locator('.m3-grid__tr').count()) > 10, 'the copy has the pay items');
  check((await page.locator('.m3-grid__lock').count()) === 0, 'locked prices did not copy');
  await page.getByRole('button', { name: 'Bids', exact: true }).click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Actions for SR-7.*\(copy\)/ }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('dialog').getByText(/Its estimate goes with it/).count()) === 1, 'delete asks first and says what goes with it');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete bid' }).click(); await page.waitForTimeout(300);
  check((await page.locator('.m3-grid').getByText(/\(copy\)/).count()) === 0, 'the copy is gone from the list');
  await page.getByRole('searchbox', { name: 'Find a bid' }).fill(''); await page.waitForTimeout(150);

  // library: rates from their parts, a crew built from people and machines
  await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('tab', { name: 'Crews' }).count()) === 1, 'library renders');
  await page.getByRole('searchbox', { name: 'Find in the library' }).fill('zzzz'); await page.waitForTimeout(200);
  check((await page.getByText('No matches for "zzzz"').count()) === 1, 'a library search with no hits says so');
  await page.locator('.gl-grid-empty').getByRole('button', { name: 'Clear search' }).click(); await page.waitForTimeout(150);
  await page.getByRole('tab', { name: 'Equipment' }).click();
  await page.getByRole('button', { name: 'Add machine' }).click();
  await page.getByRole('dialog').getByLabel('Machine').fill('Test roller');
  await page.getByRole('dialog').getByLabel('Ownership').fill('20');
  await page.getByRole('dialog').getByLabel('Operating').fill('10');
  await page.getByRole('dialog').getByLabel('Fuel').fill('5.5');
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('row', { name: /Test roller/ }).getByText('$35.50').count()) === 1, 'a machine rate is ownership + operating + fuel ($35.50)');
  const dozer = page.getByRole('row', { name: /Dozer/ }).first();
  const rateCells = (await dozer.innerText()).match(/\$[\d,]+\.\d\d/g);
  await dozer.getByRole('button', { name: /^Ownership, / }).click();
  await page.keyboard.type('10'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check(rateCells && (await page.getByRole('row', { name: /Dozer/ }).first().innerText()).includes(rateCells[0]), 'typing ownership on a rate-only machine keeps its hourly rate');
  await page.getByRole('tab', { name: 'Labor' }).click();
  await page.getByRole('button', { name: 'Paste from spreadsheet' }).click();
  await page.getByLabel('Rows to import').fill('Classification\tWage\tBurden\nImported foreman\t$40.00\t50%');
  await page.waitForTimeout(100);
  check((await page.getByRole('dialog').getByText('$60.00').count()) === 1, 'pasted burden "50%" is kept (rate $60.00)');
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  await page.getByRole('tab', { name: 'Labor' }).click();
  const rateBefore = await page.getByRole('row').nth(1).innerText();
  await page.getByRole('button', { name: /^Base wage, / }).first().click();
  await page.keyboard.type('40'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const rateMatch = rateBefore.match(/\$[\d,]+\.\d\d/g);
  check(rateMatch && (await page.getByRole('row').nth(1).innerText()).includes(rateMatch[0]), 'adding a base wage keeps the burdened rate (burden worked out)');
  await page.getByRole('tab', { name: 'Crews' }).click();
  await page.getByRole('button', { name: 'Add crew' }).click();
  await page.getByRole('dialog').getByLabel('Crew name').fill('Test crew');
  await page.getByRole('button', { name: 'Add people' }).click();
  await page.getByRole('button', { name: 'Add machine' }).click();
  check((await page.getByText(/Crew day \$[\d,]+ · 1 person/).count()) === 1, 'the crew builder adds up the day rate');
  await page.getByRole('dialog').getByRole('button', { name: 'Add crew' }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('row', { name: /Test crew/ }).count()) === 1, 'a new crew shows in the library');
  await shot('05b-library');
  // settings: bid defaults feed a new estimate, company details print on the form
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click(); await page.waitForTimeout(300);
  check((await page.getByText('Bid defaults').count()) === 1, 'settings screen opens from the account menu');
  check((await page.getByText('https://benchstake.com/api/mcp').count()) === 1, 'settings shows the AI connector address');
  await page.getByRole('textbox', { name: 'Overhead' }).fill('8'); await page.keyboard.press('Tab'); await page.waitForTimeout(250);
  await page.getByRole('textbox', { name: 'Contractor license no.' }).fill('UT 123456-5501'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  await shot('05c-settings');
  await page.getByRole('button', { name: 'Bids', exact: true }).click(); await page.waitForTimeout(200);
  await page.getByRole('row', { name: /Airport Rd/ }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Start blank' }).click(); await page.waitForTimeout(300);
  check((await page.locator('.gl-grid-empty').getByRole('button', { name: 'Paste items' }).count()) === 1, 'an empty sheet shows an empty state with a Paste items action');
  await shot('05d-empty-sheet');
  await page.getByRole('tab', { name: 'Bid day' }).click(); await page.waitForTimeout(200);
  check((await page.getByRole('textbox', { name: 'Overhead' }).inputValue()) === '8', 'a new estimate starts from the overhead default (8%)');
  await page.getByRole('tab', { name: 'Form' }).click(); await page.waitForTimeout(200);
  await page.getByRole('radio', { name: 'Crew plan' }).click(); await page.waitForTimeout(150);
  check((await page.locator('.gl-grid-empty').count()) === 1, 'an empty crew plan shows an empty state');
  await page.getByRole('radio', { name: 'Bid form' }).click(); await page.waitForTimeout(150);
  check((await page.getByText(/License UT 123456-5501/).count()) === 1, 'the bid form prints the license number');
  await page.getByRole('button', { name: 'Insights' }).click(); await page.waitForTimeout(200);
  check((await page.getByText('Bids and wins by month').count()) === 1, 'insights renders');
  // a new screen opens at its top, and the library shows its day rates without scrolling sideways
  await page.evaluate(() => { const c = document.querySelector('.gl-content'); c.scrollTop = c.scrollHeight; });
  const scrolledTo = await page.evaluate(() => document.querySelector('.gl-content').scrollTop);
  await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.waitForTimeout(250);
  check(scrolledTo > 0 && (await page.evaluate(() => document.querySelector('.gl-content').scrollTop)) === 0, 'a new screen opens at its top, not where the last one was scrolled');
  check(await page.evaluate(() => { const g = document.querySelector('.gl-library .m3-grid'); const th = g && [...g.querySelectorAll('.m3-grid__th')].find(x => /Crew\/day/.test(x.textContent)); return !!th && th.getBoundingClientRect().right <= g.getBoundingClientRect().right + 1; }), 'library: the crew day rate is on screen, not cut off');
  await page.getByRole('button', { name: 'Insights' }).click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Account' }).click();
  check((await page.getByRole('menuitem', { name: 'Reset sample data' }).count()) === 1, 'account menu has reset in demo mode');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Theme' }).click();
  await page.getByRole('menuitemcheckbox', { name: 'Dark' }).click(); await page.waitForTimeout(200);
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.gl-app')).backgroundColor) === 'rgb(17, 19, 24)', 'dark theme applies');
  await shot('06-insights-dark');
  await page.setViewportSize({ width: 400, height: 820 }); await page.waitForTimeout(300);
  check((await page.locator('.m3-navbar').count()) === 1, 'phone width shows the bottom navigation bar');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal page scroll at phone width');
  await shot('07-phone');
  // every table on a phone: the page itself never scrolls sideways, and the name column leaves room for the numbers
  const phoneFit = async (sel) => page.evaluate((sel) => { const c = document.querySelector('.gl-content') || document.documentElement; const g = document.querySelector(sel); const th = g && g.querySelector('thead th'); return { over: c.scrollWidth - c.clientWidth, first: th ? th.getBoundingClientRect().width / g.getBoundingClientRect().width : 0, inner: g ? g.scrollHeight - g.clientHeight : -1 }; }, sel);
  await page.locator('.m3-navbar').getByRole('button', { name: 'Library' }).click(); await page.waitForTimeout(300);
  let fit = await phoneFit('.gl-library .m3-grid');
  check(fit.over <= 1 && fit.first > 0 && fit.first < 0.6, 'phone: the library stays inside the screen and its tables scroll on their own');
  await page.locator('.m3-navbar').getByRole('button', { name: 'Bids' }).click(); await page.waitForTimeout(300);
  await page.getByRole('row', { name: /SR-7 Mill/ }).click(); await page.waitForTimeout(400);
  await page.getByRole('tab', { name: /Sheet/ }).click(); await page.waitForTimeout(300);
  await shot('07b-phone-sheet');
  fit = await phoneFit('.gl-sheet > .m3-grid');
  check(fit.over <= 1 && fit.first > 0 && fit.first < 0.6, 'phone: the sheet shows numbers next to the pay item column (' + JSON.stringify(fit) + ')');
  check(fit.inner <= 1, 'phone: the sheet scrolls with the page, not inside a small box');

  // phone: the bid name is whole, all five tabs are on screen, long dialogs keep their buttons in view
  const inView = async loc => { const b = await loc.boundingBox(); const vp = page.viewportSize(); return !!b && b.x >= -1 && b.x + b.width <= vp.width + 1 && b.y >= -1 && b.y + b.height <= vp.height + 1; };
  check(await page.evaluate(() => { const t = document.querySelector('.gl-estimate__title'); return t.scrollWidth <= t.clientWidth + 1 && t.scrollHeight <= t.clientHeight + 1; }), 'phone: the bid name is not cut off');
  check(await inView(page.getByRole('tab', { name: /Form/ })), 'phone: all five estimate tabs are on screen');
  check((await page.locator('.gl-kpi').count()) === 2 && await inView(page.locator('.gl-kpi').nth(1)), 'phone: margin stays in view next to the total');
  await page.getByRole('button', { name: 'Edit bid details' }).click(); await page.waitForTimeout(200);
  check(await inView(page.getByRole('dialog').getByRole('button', { name: 'Save' })), 'phone: a long dialog keeps Save in view');
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Show summary' }).click(); await page.waitForTimeout(200);
  check((await page.locator('.m3-ssheet--modal').count()) === 1, 'phone: the summary opens as a sheet');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  check((await page.locator('.m3-ssheet--modal').count()) === 0, 'Escape closes the summary sheet');
  await page.locator('.m3-navbar').getByRole('button', { name: 'Bids' }).click(); await page.waitForTimeout(300);
  await page.getByRole('row', { name: /Alpine Loop/ }).click(); await page.waitForTimeout(300);
  check(await inView(page.getByRole('button', { name: 'Paste item list' })) && await inView(page.getByRole('button', { name: 'Start blank' })), 'phone: every way to start an estimate is on screen');
  await page.locator('.m3-navbar').getByRole('button', { name: 'Bids' }).click(); await page.waitForTimeout(300);
  await page.getByRole('row', { name: /SR-7 Mill/ }).click(); await page.waitForTimeout(300);

  // open another bid, undo, then edit: the edit stays on the bid on screen and nothing crashes
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Bids' }).click(); await page.waitForTimeout(200);
  await page.getByRole('row', { name: /SR-7 Mill/ }).click(); await page.waitForTimeout(300);
  await page.locator('.gl-appbar').click({ position: { x: 600, y: 30 } });
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200);
  const tBefore = await total();
  await page.getByRole('button', { name: /^Quantity, / }).nth(3).click();
  await page.keyboard.press('Control+A'); await page.keyboard.type('777'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  check((await page.locator('.gl-app').count()) === 1 && (await total()) !== tBefore, 'editing after an undo changes the bid on screen and does not crash');

  // reload keeps the demo state
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(400);
  check((await page.locator('.gl-app').count()) === 1, 'demo state survives a reload');

  // public policy pages Google needs
  await page.goto('https://local.test/privacy', { waitUntil: 'load' }); await page.waitForTimeout(200);
  check((await page.locator('h1').innerText()) === 'Privacy policy', 'privacy page opens without signing in');
  await page.goto('https://local.test/terms', { waitUntil: 'load' }); await page.waitForTimeout(200);
  check((await page.locator('h1').innerText()) === 'Terms of service', 'terms page opens without signing in');

  console.log(errors.length ? '\nFAILURES\n' + errors.join('\n') : '\nall good, no console errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
