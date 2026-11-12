// Checks the cloud store (src/app/store-cloud.js) in a real browser against a stand-in database.
// The demo-mode end-to-end test never reaches this code, so the saves a signed-in company makes are checked here:
// what gets written, and in what order. Usage: node test/store.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0;
const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(base + 'test/store-harness.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.storeTest === 'function', null, { timeout: 20000 });
  const r = await page.evaluate(() => window.storeTest());
  check(!r.duplicateError && r.duplicateLog.join(', ') === 'insert bid Bcopy, save estimate Bcopy', 'duplicate saves the new bid, then its estimate (' + (r.duplicateError || r.duplicateLog.join(', ')) + ')');
  check(r.copyOnScreen && r.copyOpen, 'the copy shows up with its estimate and opens');
  check(!r.editError && r.editLog.join(', ') === 'save estimate Bcopy, update bid Bcopy', 'the copy takes edits afterwards (' + (r.editError || r.editLog.join(', ')) + ')');
  check(!r.deleteError && r.deleteLog.join(', ') === 'delete bid Bcopy' && r.goneFromScreen, 'deleting a bid removes it and its estimate (' + (r.deleteError || r.deleteLog.join(', ')) + ')');
  check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
} catch (e) { check(false, 'cloud store test ran: ' + e.message + (errors.length ? ' | ' + errors.join(' | ') : '')); }
await browser.close();
await server.close();
console.log(fails ? '\n' + fails + ' FAILED' : '\nall cloud store checks pass');
process.exit(fails ? 1 : 0);
