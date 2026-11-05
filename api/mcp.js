// Benchstake MCP server: lets Claude, ChatGPT and other MCP clients read and change a company's bids as
// the signed-in user. Streamable HTTP, stateless (every POST is one JSON-RPC message), OAuth 2.1 through
// Supabase Auth, so the bearer token is an ordinary Supabase user token and row security applies.
import { whoami, applyUpdate, loadDoc, SUPABASE_URL, SUPABASE_ANON } from '../server/store.js';
import * as ops from '../server/ops.js';

const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const SITE = process.env.MCP_PUBLIC_ORIGIN || 'https://benchstake.com';
const RESOURCE = SITE + '/api/mcp';

const pct = { type: 'number', minimum: 0, maximum: 100 };
const TOOLS = [
  { name: 'list_bids', description: 'List the company\'s bids with status, due date, estimator and bid total. Start here to find a bid id.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_bid', description: 'Everything about one bid: pay items with quantities, costs and prices, markup, totals and margin, quote packages with every quote, and the checks that must clear before it goes out.', inputSchema: { type: 'object', properties: { bid: { type: 'string', description: 'Bid id, or part of the bid name' } }, required: ['bid'], additionalProperties: false } },
  { name: 'get_library', description: 'The cost library: crews with their day rate, labor and equipment hourly rates, materials, and the subs and suppliers the company gets quotes from.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'create_bid', description: 'Create a new bid (a job to price). It starts with no pay items; add them with add_pay_items.', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Project name' }, owner: { type: 'string', description: 'Owner or agency, e.g. "UDOT Region 3"' }, due: { type: 'string', description: 'Date bids are opened, YYYY-MM-DD' }, due_time: { type: 'string', description: 'Like "2:00 PM"' }, type: { type: 'string', enum: ['public', 'private'] }, location: { type: 'string' }, estimator: { type: 'string' }, note: { type: 'string' } }, required: ['name', 'owner', 'due'], additionalProperties: false } },
  { name: 'add_pay_items', description: 'Add pay items (the owner\'s schedule of bid items) to a bid. Starts the estimate if the bid has none. Each item needs a task before it has a price.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { code: { type: 'string', description: 'Item number, e.g. 02316' }, name: { type: 'string' }, qty: { type: 'number' }, unit: { type: 'string', description: 'CY, TON, LF, SF, EA, LS…' } }, required: ['name', 'qty', 'unit'] } } }, required: ['bid', 'items'], additionalProperties: false } },
  { name: 'set_quantity', description: 'Change the quantity on a pay item. Every task, quote and total reprices.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, item: { type: 'string', description: 'Item code, id, or name' }, qty: { type: 'number' } }, required: ['bid', 'item', 'qty'], additionalProperties: false } },
  { name: 'add_task', description: 'Give a pay item its cost by adding a task. type "crew": a library crew at a production rate (pay-item units per day). "material": a library material, per = material units per pay-item unit. "sub": a subcontract plug price per unit, or tie it to a quote package. "other": cost_per_unit or lump_sum. Only use numbers the person gave you or that come from a document, never your own guesses.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, item: { type: 'string', description: 'Item code, id, or name' }, type: { type: 'string', enum: ['crew', 'material', 'sub', 'other'] }, name: { type: 'string', description: 'What the task is, e.g. "Trench, lay and backfill"' }, crew: { type: 'string', description: 'crew: crew name from get_library' }, production: { type: 'number', description: 'crew: pay-item units per day' }, material: { type: 'string', description: 'material: name from get_library' }, per: { type: 'number', description: 'material: material units per pay-item unit (default 1)' }, plug: { type: 'number', description: 'sub: price per pay-item unit until a quote is picked' }, package: { type: 'string', description: 'sub: quote package to tie it to' }, cost_per_unit: { type: 'number', description: 'other: cost per pay-item unit' }, lump_sum: { type: 'number', description: 'other: one amount for the item' } }, required: ['bid', 'item', 'type'], additionalProperties: false } },
  { name: 'remove_task', description: 'Remove a task from a pay item.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, item: { type: 'string' }, task: { type: 'string', description: 'Task name or id' } }, required: ['bid', 'item', 'task'], additionalProperties: false } },
  { name: 'create_quote_package', description: 'Group pay items a sub or supplier will price into a quote package, optionally naming the companies you expect quotes from.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, name: { type: 'string', description: 'e.g. "RCP pipe and precast inlets"' }, items: { type: 'array', items: { type: 'string' }, description: 'Item codes' }, vendors: { type: 'array', items: { type: 'string' }, description: 'Company names expected to quote' } }, required: ['bid', 'name', 'items'], additionalProperties: false } },
  { name: 'enter_quote', description: 'Record a real quote that a named sub or supplier sent (from a document or the person). Not for the person\'s own cost numbers; use add_task for those. Records it on a package: unit prices per pay item, or one lump sum. Creates the company in the library if it is new. The quote is not used until pick_quote.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, package: { type: 'string', description: 'Package id or name' }, vendor: { type: 'string', description: 'Company name as it appears on the quote' }, unit_prices: { type: 'array', items: { type: 'object', properties: { item: { type: 'string', description: 'Pay item code' }, unit_price: { type: 'number' }, qty: { type: 'number', description: 'Quantity the vendor quoted, if shown (flags a mismatch with the bid quantity)' } }, required: ['item', 'unit_price'] } }, lump_sum: { type: 'number', description: 'Use instead of unit_prices when the quote is one number for the whole package' }, note: { type: 'string', description: 'Exclusions, validity, conditions' }, kind: { type: 'string', enum: ['sub', 'supplier'] }, trade: { type: 'string' } }, required: ['bid', 'package', 'vendor'], additionalProperties: false } },
  { name: 'pick_quote', description: 'Choose which quote a package uses: a company name, "self" for self-perform, or "plug" to use the plug price.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, package: { type: 'string' }, vendor: { type: 'string' } }, required: ['bid', 'package', 'vendor'], additionalProperties: false } },
  { name: 'lock_price', description: 'Lock a pay item at a unit price (it stays put when costs change). Omit unit_price to unlock. Never locks below cost.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, item: { type: 'string' }, unit_price: { type: 'number' } }, required: ['bid', 'item'], additionalProperties: false } },
  { name: 'set_markup', description: 'Set overhead, profit, bond, material tax (percents) or the target margin on a bid.', inputSchema: { type: 'object', properties: { bid: { type: 'string' }, overhead: pct, profit: pct, bond: pct, tax: pct, target_margin: pct }, required: ['bid'], additionalProperties: false } }
];
const WRITES = { create_bid: ops.createBid, add_pay_items: ops.addPayItems, add_task: ops.addTask, remove_task: ops.removeTask, set_quantity: ops.setQuantity, create_quote_package: ops.createPackage, enter_quote: ops.enterQuote, pick_quote: ops.pickQuote, lock_price: ops.lockPrice, set_markup: ops.setMarkup };

function unauthorized(res, msg) {
  res.setHeader('WWW-Authenticate', 'Bearer resource_metadata="' + SITE + '/.well-known/oauth-protected-resource/api/mcp"');
  return res.status(401).json({ error: 'unauthorized', error_description: msg || 'Sign in to Benchstake to use this connector.' });
}
const text = s => ({ content: [{ type: 'text', text: s }] });
const json = (obj, summary) => ({ content: [{ type: 'text', text: (summary ? summary + '\n\n' : '') + JSON.stringify(obj, null, 1) }], structuredContent: obj });

async function callTool(name, args, me) {
  const a = args || {};
  if (name === 'list_bids') { const { doc } = await loadDoc(me.sb, me.org.id); const bids = ops.listBids(doc); return json({ company: me.org.name, bids }, bids.length + ' bid' + (bids.length === 1 ? '' : 's') + ' at ' + me.org.name + '.'); }
  if (name === 'get_bid') { const { doc } = await loadDoc(me.sb, me.org.id); return json(ops.bidSummary(doc, a.bid)); }
  if (name === 'get_library') { const { doc } = await loadDoc(me.sb, me.org.id); return json(ops.librarySummary(doc)); }
  const op = WRITES[name];
  if (!op) throw new Error('Unknown tool ' + name);
  if (me.org.role === 'viewer') throw new Error('This account is a viewer at ' + me.org.name + ' and cannot change bids. Ask an owner to make it an estimator.');
  const r = await applyUpdate(me.sb, me.org.id, me.user, draft => op(draft, a, me.name), out => out.entry);
  return text(r.result.say);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Mcp-Session-Id, MCP-Protocol-Version, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!SUPABASE_URL || !SUPABASE_ANON) return res.status(500).json({ error: 'Not configured' });
  if (req.method === 'GET') return res.status(405).json({ error: 'This MCP server is stateless: POST JSON-RPC messages here.' });
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return unauthorized(res);
  const me = await whoami(auth.slice(7));
  if (!me) return unauthorized(res, 'That sign-in has expired. Connect again.');

  const msg = req.body;
  if (!msg || typeof msg !== 'object') return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
  if (Array.isArray(msg)) return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Batches are not supported' } });
  if (msg.id === undefined) return res.status(202).end(); // a notification: nothing to answer
  const reply = result => res.status(200).json({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code, message, data) => res.status(200).json({ jsonrpc: '2.0', id: msg.id, error: { code, message, data } });

  try {
    switch (msg.method) {
      case 'initialize': {
        const asked = msg.params && msg.params.protocolVersion;
        return reply({ protocolVersion: PROTOCOLS.includes(asked) ? asked : '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'Benchstake', title: 'Benchstake', version: '1.0.0' },
          instructions: 'Benchstake is estimating and bidding software for heavy civil contractors. You are working as ' + me.name + (me.org ? ' at ' + me.org.name + ' (' + me.org.role + ')' : ', who has not set up a company yet') + '. Money is US dollars. Quantities use the pay item\'s unit (CY, TON, LF, EA). Read with list_bids and get_bid before changing anything, say what you changed, and never guess a unit price: a quote comes from a document or the person. Use each tool for what it is for: a cost the person gives you goes on the pay item with add_task, not into a made-up quote. Never invent a company, vendor or quote. If no tool does what is asked, say so instead of working around it. Every change is recorded in the bid\'s history and can be undone in the app.' });
      }
      case 'ping': return reply({});
      case 'tools/list': return reply({ tools: TOOLS });
      case 'tools/call': {
        if (!me.org) return reply({ ...text('This account has not set up a company yet. Open benchstake.com/app, finish setup, then try again.'), isError: true });
        const name = msg.params && msg.params.name;
        if (!TOOLS.some(t => t.name === name)) return fail(-32602, 'Unknown tool: ' + name);
        try { return reply(await callTool(name, msg.params.arguments, me)); }
        catch (e) { return reply({ ...text(e.message || String(e)), isError: true }); }
      }
      case 'resources/list': return reply({ resources: [] });
      case 'prompts/list': return reply({ prompts: [] });
      default: return fail(-32601, 'Method not found: ' + msg.method);
    }
  } catch (e) {
    return fail(-32603, e.message || 'Server error');
  }
}
