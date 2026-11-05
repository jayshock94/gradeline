// Checks the server functions without a network: the MCP endpoint's protocol handling and the quote
// reader's request/response shaping, with Supabase and the AI service stubbed.
process.env.VITE_SUPABASE_URL = 'https://stub.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon';
process.env.ANTHROPIC_API_KEY = 'test-key';
const mcp = (await import('../api/mcp.js')).default;
const readQuote = (await import('../api/read-quote.js')).default;
const meta = (await import('../api/oauth-metadata.js')).default;

let fails = 0;
const check = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
function res() { const r = { headers: {}, code: 200, body: null, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, end() { return r; } }; return r; }
const realFetch = globalThis.fetch;

// --- resource metadata
let r = res(); meta({ method: 'GET', headers: {} }, r);
check(r.code === 200 && r.body.authorization_servers[0] === 'https://stub.supabase.co/auth/v1' && r.body.resource === 'https://benchstake.com/api/mcp', 'protected-resource metadata points at Supabase Auth');

// --- MCP without a token: 401 + WWW-Authenticate so the client starts OAuth
r = res(); await mcp({ method: 'POST', headers: {}, body: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} } }, r);
check(r.code === 401 && /resource_metadata=/.test(r.headers['WWW-Authenticate']), 'no token → 401 with resource_metadata challenge');

// --- MCP with a token: Supabase stubbed
globalThis.fetch = async (url, opts) => {
  if (/auth\/v1\/user/.test(url)) return { ok: true, json: async () => ({ id: 'u1', email: 'maya@example.com', user_metadata: { full_name: 'Maya R.' } }) };
  if (/rest\/v1\/memberships/.test(url)) return new Response(JSON.stringify([{ org_id: 'o1', role: 'estimator', created_at: '2026-01-01', organizations: { id: 'o1', name: 'Cascade Civil' } }]), { status: 200, headers: { 'content-type': 'application/json' } });
  if (/rest\/v1\/profiles/.test(url)) return new Response(JSON.stringify({ display_name: 'Maya R.' }), { status: 200, headers: { 'content-type': 'application/json' } });
  throw new Error('unexpected fetch ' + url);
};
const call = async (method, params, id = 1) => { const rr = res(); await mcp({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { jsonrpc: '2.0', id, method, params } }, rr); return rr; };
r = await call('initialize', { protocolVersion: '2025-06-18' });
check(r.code === 200 && r.body.result.protocolVersion === '2025-06-18' && /Maya R\. at Cascade Civil/.test(r.body.result.instructions), 'initialize answers with the protocol version and who is signed in');
r = await call('tools/list', {});
check(r.code === 200 && r.body.result.tools.length === 11 && r.body.result.tools.every(t => t.inputSchema), 'tools/list lists 11 tools with schemas');
r = res(); await mcp({ method: 'POST', headers: { authorization: 'Bearer tok' }, body: { jsonrpc: '2.0', method: 'notifications/initialized' } }, r);
check(r.code === 202, 'a notification gets 202 and no body');
r = await call('tools/call', { name: 'nope', arguments: {} });
check(r.body.error && r.body.error.code === -32602, 'an unknown tool is a JSON-RPC error');
r = await call('bogus', {});
check(r.body.error && r.body.error.code === -32601, 'an unknown method is Method not found');

// --- quote reader: shapes the request, filters the AI's answer
let sent = null;
globalThis.fetch = async (url, opts) => {
  sent = JSON.parse(opts.body);
  return { ok: true, json: async () => ({ content: [{ type: 'tool_use', name: 'record_quote', input: { vendor: 'Granite Peak Materials', is_quote: true, lines: [{ item_id: 'I1', unit_price: 76.5, qty: 11000, quoted_as: 'HMA PG 64-28 11,000 TN @ 76.50', certain: true }, { item_id: 'ZZZ', unit_price: 5, quoted_as: 'stray', certain: true }], unmatched: [{ description: 'Mobilization', amount: 2500 }], exclusions: ['Excludes traffic control'], problems: [] } }], usage: { input_tokens: 10, output_tokens: 5 } }) };
};
const pkg = { name: 'HMA supply', lines: [{ itemId: 'I1', code: '02742', name: 'HMA 1/2 in', qty: 11200, unit: 'TON' }] };
r = res(); await readQuote({ method: 'POST', body: { file: { name: 'granite.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4 fake').toString('base64') }, package: pkg, vendors: ['Granite Peak Materials'] } }, r);
check(r.code === 200 && r.body.quote.lines.length === 1 && r.body.quote.lines[0].item_id === 'I1', 'a PDF quote comes back with only lines that match real pay items');
check(r.body.quote.unmatched.length === 2, 'a line pointing at an unknown item moves to unmatched');
check(sent.tools[0].name === 'record_quote' && sent.tool_choice.name === 'record_quote' && sent.messages[0].content[0].type === 'document' && /itemId I1: 02742 HMA/.test(sent.messages[0].content[1].text), 'the AI request carries the PDF, the package lines and a forced tool call');
r = res(); await readQuote({ method: 'POST', body: { text: 'HMA $76.50/ton', package: pkg } }, r);
check(r.code === 200 && sent.messages[0].content[0].type === 'text', 'pasted text is sent as text');
r = res(); await readQuote({ method: 'POST', body: { file: { name: 'q.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: 'AAAA' }, package: pkg } }, r);
check(r.code === 415, 'a Word file is refused with a clear message');
r = res(); await readQuote({ method: 'POST', body: { file: { name: 'big.pdf', type: 'application/pdf', data: 'A'.repeat(4.2 * 1024 * 1024) }, package: pkg } }, r);
check(r.code === 413, 'a file over 3 MB is refused');
delete process.env.ANTHROPIC_API_KEY;
r = res(); await readQuote({ method: 'POST', body: { text: 'x', package: pkg } }, r);
check(r.code === 503 && /not switched on/.test(r.body.error), 'without a key the reader says it is not switched on');
globalThis.fetch = realFetch;

console.log(fails ? '\n' + fails + ' FAILED' : '\nall good');
process.exit(fails ? 1 : 0);
