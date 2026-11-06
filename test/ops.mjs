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
const c = ops.createBid(doc, { name: 'Test job', owner: 'Test owner', due: '2026-12-01', due_time: '14:00' }, 'Maya R.');
check(c.id && doc.bids.some(b => b.id === c.id && b.status === 'draft'), 'create_bid adds a draft bid');
check(doc.bids.find(b => b.id === c.id).dueTime === '2:00 PM', 'create_bid turns a 24-hour due time into the app\'s format');
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

// tasks give an item its cost
const sw = ops.createBid(doc, { name: 'Sewer test', owner: 'City', due: '2026-11-19' }, 'Jay');
ops.addPayItems(doc, { bid: sw.id, items: [{ code: '1', name: '8 in sewer line', qty: 1756, unit: 'LF' }] });
const other = ops.addTask(doc, { bid: sw.id, item: '1', type: 'other', name: 'Sewer line, all in', cost_per_unit: 5.45 });
const ds = GL.derive(doc, sw.id);
check(Math.abs(ds.totals.direct - 9570.2) < 0.01 && ds.totals.bidTotal > ds.totals.direct, 'add_task other at $5.45/LF costs $9,570.20 and prices the item: ' + other.say);
const crewName = doc.library.crews[0].name;
ops.addTask(doc, { bid: sw.id, item: '1', type: 'crew', crew: crewName.slice(0, 6), production: 300 });
check(doc.estimates[sw.id].tasks.length === 2, 'add_task crew finds the crew by part of its name');
threw = null; try { ops.addTask(doc, { bid: sw.id, item: '1', type: 'sub' }); } catch (e) { threw = e.message; }
check(/plug price/.test(threw || ''), 'a sub task without a plug or package is refused');
ops.removeTask(doc, { bid: sw.id, item: '1', task: crewName });
check(doc.estimates[sw.id].tasks.length === 1, 'remove_task removes it');

// editing and cleaning up
ops.updateBid(doc, { bid: sw.id, status: 'submitted' });
check(doc.bids.find(b => b.id === sw.id).submittedAt === GL.today(), 'update_bid stamps the submitted date, like the app');
ops.updateBid(doc, { bid: sw.id, status: 'in-progress' });
check(doc.bids.find(b => b.id === sw.id).submittedAt === undefined, 'reopening a bid clears the submitted date');
ops.updateBid(doc, { bid: sw.id, status: 'lost', low_bid: 9800 });
check(doc.bids.find(b => b.id === sw.id).status === 'lost' && doc.bids.find(b => b.id === sw.id).lowBid === 9800, 'update_bid marks a bid lost with the low bid');
ops.updateTask(doc, { bid: sw.id, item: '1', task: 'Sewer line', cost_per_unit: 6 });
check(Math.abs(GL.derive(doc, sw.id).totals.direct - 10536) < 0.01, 'update_task changes the cost per unit');
ops.createPackage(doc, { bid: sw.id, name: 'Fake sub', items: ['1'], vendors: ['Test Sewer Sub'] });
ops.enterQuote(doc, { bid: sw.id, package: 'Fake sub', vendor: 'Test Sewer Sub', unit_prices: [{ item: '1', unit_price: 5.45 }] });
threw = null; try { ops.deleteLibraryRecord(doc, { kind: 'vendor', record: 'Test Sewer Sub' }); } catch (e) { threw = e.message; }
check(/used in/.test(threw || ''), 'a vendor with a quote cannot be deleted yet');
ops.deletePackage(doc, { bid: sw.id, package: 'Fake sub' });
check(!doc.estimates[sw.id].packages.length && doc.estimates[sw.id].tasks.length === 1, 'delete_quote_package removes the package and the sub task it made, keeps the real task');
ops.deleteLibraryRecord(doc, { kind: 'vendor', record: 'Test Sewer Sub' });
check(!doc.library.vendors.some(v => v.name === 'Test Sewer Sub'), 'then the fake vendor can be deleted');
ops.saveLibraryRecord(doc, { kind: 'labor', name: 'Pipe layer', fields: { wage: 30, burden: 40 } });
check(doc.library.labor.find(l => l.name === 'Pipe layer').rate === 42, 'save_library_record adds a labor class at wage + burden ($42/hr)');
threw = null; try { ops.saveLibraryRecord(doc, { kind: 'crew', name: 'Pipe crew', fields: { people: [{ name: 'Pipe layer', count: 3 }] } }); } catch (e) { threw = e.message; }
check(/already has/.test(threw || ''), 'adding a record with a name already in the library is refused (no duplicates)');
ops.saveLibraryRecord(doc, { kind: 'crew', name: 'Sewer crew', fields: { people: [{ name: 'Pipe layer', count: 3 }] } });
check(doc.library.crews.find(c => c.name === 'Sewer crew').labor[0][1] === 3, 'save_library_record builds a crew from people');
ops.saveLibraryRecord(doc, { kind: 'material', name: '8 in PVC', fields: { unit: 'lf', cost: 4.1 } });
ops.saveLibraryRecord(doc, { kind: 'material', record: '8 in PVC', fields: { cost: 4.25 } });
check(doc.library.materials.find(m => m.name === '8 in PVC').cost === 4.25, 'save_library_record edits an existing record');
ops.updatePayItem(doc, { bid: sw.id, item: '1', qty: 1800, name: '8 in PVC sewer' });
check(doc.estimates[sw.id].items[0].qty === 1800, 'update_pay_item changes quantity and description');
ops.deletePayItem(doc, { bid: sw.id, item: '1' });
check(!doc.estimates[sw.id].items.length && !doc.estimates[sw.id].tasks.length, 'delete_pay_item removes the item and its tasks');
ops.deleteBid(doc, { bid: sw.id });
check(!doc.bids.some(b => b.id === sw.id) && !doc.estimates[sw.id], 'delete_bid removes the bid and its estimate');

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
