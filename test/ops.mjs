// Checks the MCP operations (server/ops.js) against the sample company, no database needed.
import { GL } from '../src/app/gl.js';
import '../src/app/calc.js';
import '../src/app/data.js';
import * as ops from '../server/ops.js';

let fails = 0;
const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
const doc = GL.seed();

const bids = ops.listBids(doc);
check(bids.length >= 5 && bids.some(b => b.name.startsWith('SR-7')), 'list_bids lists the sample bids');
const sum = ops.bidSummary(doc, 'SR-7');
check(sum.items.length > 10 && sum.totals.bid_total > 1000000 && sum.packages.length === 6, 'get_bid returns items, totals and packages for SR-7');
check(sum.packages.some(p => p.quotes.some(q => q.status === 'pending')), 'get_bid shows quotes still out');

// a new bid with pay items, a package, a quote, a pick, a lock and markup
const c = ops.createBid(doc, { name: 'Test job', owner: 'Test owner', due: '2026-12-01' }, 'Maya R.');
check(c.id && doc.bids.some(b => b.id === c.id && b.status === 'draft'), 'create_bid adds a draft bid');
ops.addPayItems(doc, { bid: c.id, items: [{ code: '02316', name: 'Roadway excavation', qty: 1000, unit: 'cy' }, { code: '02741', name: 'HMA', qty: 500, unit: 'TON' }] });
check(doc.estimates[c.id].items.length === 2 && doc.estimates[c.id].items[0].unit === 'CY', 'add_pay_items starts the estimate and uppercases units');
ops.setQuantity(doc, { bid: 'Test job', item: '02316', qty: 1200 });
check(doc.estimates[c.id].items[0].qty === 1200, 'set_quantity by item code');
const pk = ops.createPackage(doc, { bid: c.id, name: 'Paving', items: ['02741'], vendors: ['New Paver LLC'] });
check(doc.estimates[c.id].packages.length === 1 && doc.library.vendors.some(v => v.name === 'New Paver LLC'), 'create_quote_package adds the package and a new vendor');
let threw = null; try { ops.enterQuote(doc, { bid: c.id, package: 'Paving', vendor: 'New Paver LLC', unit_prices: [{ item: '02316', unit_price: 5 }] }); } catch (e) { threw = e.message; }
check(/not in package/.test(threw || ''), 'enter_quote refuses an item outside the package');
const q = ops.enterQuote(doc, { bid: c.id, package: 'Paving', vendor: 'new paver', unit_prices: [{ item: '02741', unit_price: 80, qty: 450 }], note: 'Excludes traffic control' });
check(/\$40,000/.test(q.say) && /Quantity differs/.test(q.say), 'enter_quote totals the quote and flags a quantity mismatch: ' + q.say);
check(doc.library.vendors.filter(v => /paver/i.test(v.name)).length === 1, 'enter_quote matched the existing vendor by name instead of making another');
ops.pickQuote(doc, { bid: c.id, package: 'Paving', vendor: 'New Paver LLC' });
const d1 = GL.derive(doc, c.id);
check(d1.packages[0].selected && d1.packages[0].selected.vendor.name === 'New Paver LLC', 'pick_quote uses the quote');
ops.setMarkup(doc, { bid: c.id, overhead: 8, target_margin: 10 });
check(doc.estimates[c.id].markup.overhead === 8 && doc.estimates[c.id].targetMargin === 10, 'set_markup changes overhead and target');
threw = null; try { ops.lockPrice(doc, { bid: c.id, item: '02741', unit_price: 1 }); } catch (e) { threw = e.message; }
check(/below cost/.test(threw || ''), 'lock_price refuses a price below cost');
ops.lockPrice(doc, { bid: c.id, item: '02741', unit_price: 95 });
check(doc.estimates[c.id].locks[doc.estimates[c.id].items[1].id] === 95, 'lock_price locks at a fair price');
const lump = ops.enterQuote(doc, { bid: c.id, package: 'Paving', vendor: 'Lump Co', lump_sum: 41000 });
check(/\$41,000/.test(lump.say), 'enter_quote accepts a lump sum');
threw = null; try { ops.findBid(doc, 'zzz'); } catch (e) { threw = e.message; }
check(/No bid matches/.test(threw || ''), 'a bad bid name is a clear error');

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
