// Reads a sub or supplier quote (PDF, photo, or pasted text) into unit prices for one quote package.
// The AI only reads the document; it never prices anything. The app shows the result for review before
// anything is saved. Needs ANTHROPIC_API_KEY in Vercel. Request body (JSON):
//   { file: { name, type, data (base64) } | text: "...", package: { name, lines: [{ itemId, code, name, qty, unit }] }, vendors: ["Granite Peak Materials", …] }
const MAX_BYTES = 3 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB, and base64 adds a third
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

const TOOL = {
  name: 'record_quote',
  description: 'Record what the quote document says, line by line, matched to the bid\'s pay items where the match is clear.',
  input_schema: {
    type: 'object',
    properties: {
      vendor: { type: 'string', description: 'The company that sent the quote, as written on it' },
      vendor_contact: { type: 'string', description: 'Person, phone or email on the quote, if any' },
      quote_date: { type: 'string', description: 'Date on the quote, YYYY-MM-DD, if shown' },
      lines: { type: 'array', description: 'Quote lines that match a pay item in the package', items: { type: 'object', properties: {
        item_id: { type: 'string', description: 'The itemId of the matching pay item from the package list' },
        unit_price: { type: 'number', description: 'Price per unit, in the pay item\'s unit. Convert if the quote uses another unit and the conversion is certain.' },
        qty: { type: 'number', description: 'Quantity shown on the quote for this line, if shown' },
        quoted_as: { type: 'string', description: 'The line as written on the quote (description, qty, unit, price)' },
        certain: { type: 'boolean', description: 'false if the match or the unit conversion is a guess' } }, required: ['item_id', 'unit_price', 'quoted_as', 'certain'] } },
      unmatched: { type: 'array', description: 'Quote lines that do not clearly match any pay item in the package', items: { type: 'object', properties: { description: { type: 'string' }, qty: { type: 'number' }, unit: { type: 'string' }, unit_price: { type: 'number' }, amount: { type: 'number' } }, required: ['description'] } },
      lump_sum: { type: 'number', description: 'Only when the quote gives one total for the whole scope with no per-item prices' },
      total: { type: 'number', description: 'The total printed on the quote, if any' },
      exclusions: { type: 'array', items: { type: 'string' }, description: 'Exclusions, conditions, validity, terms worth knowing on bid day' },
      is_quote: { type: 'boolean', description: 'false if this document is not a price quote at all' },
      problems: { type: 'array', items: { type: 'string' }, description: 'Anything the estimator should check: unreadable numbers, ambiguous units, prices that look off' }
    },
    required: ['vendor', 'lines', 'unmatched', 'exclusions', 'is_quote', 'problems']
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'Quote reading is not switched on for this site yet (no AI key configured).' });
  const body = req.body || {};
  const pkg = body.package;
  if (!pkg || !Array.isArray(pkg.lines) || !pkg.lines.length) return res.status(400).json({ error: 'The package has no pay items.' });
  const content = [];
  if (body.file && body.file.data) {
    const type = String(body.file.type || '');
    const bytes = Math.floor(String(body.file.data).length * 3 / 4);
    if (bytes > MAX_BYTES) return res.status(413).json({ error: 'That file is over 3 MB. Try a smaller scan or a photo of the page.' });
    if (type === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.file.data }, title: body.file.name || 'quote.pdf' });
    else if (/^image\/(png|jpeg|gif|webp)$/.test(type)) content.push({ type: 'image', source: { type: 'base64', media_type: type, data: body.file.data } });
    else return res.status(415).json({ error: 'Use a PDF or a photo (JPG, PNG). For an email, paste the text instead.' });
  } else if (body.text && String(body.text).trim()) {
    content.push({ type: 'text', text: 'QUOTE TEXT:\n' + String(body.text).slice(0, 40000) });
  } else return res.status(400).json({ error: 'Send a file or some text.' });

  const lines = pkg.lines.map(l => '- itemId ' + l.itemId + ': ' + (l.code ? l.code + ' ' : '') + l.name + ' — bid quantity ' + l.qty + ' ' + l.unit).join('\n');
  const vendors = (body.vendors || []).slice(0, 200).join('; ');
  content.push({ type: 'text', text: 'This is a quote from a subcontractor or supplier for a heavy civil bid. The quote package is "' + pkg.name + '" and covers these pay items:\n' + lines +
    '\n\nKnown companies in our library (match the vendor name to one of these if it is clearly the same company, otherwise use the name on the quote): ' + (vendors || '(none yet)') +
    '\n\nRead the document and record it with the record_quote tool. Rules: unit_price must be per the pay item\'s unit (e.g. if we bid in TON and they quote per ton, copy it; if they quote per CY for a TON item, do not convert unless the document states the conversion, mark certain=false instead). Put a line under "unmatched" when you are not sure which pay item it belongs to, or when it is an add-on like mobilization, traffic control or testing. Never invent a price. If a number is unreadable, leave the line out and say so in problems.' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4000, temperature: 0, tools: [TOOL], tool_choice: { type: 'tool', name: 'record_quote' }, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    const quota = r.status === 429 || /credit|quota|billing/i.test(detail);
    return res.status(502).json({ error: quota ? 'The AI service is busy or out of credit. Type the quote in for now.' : 'The AI service could not read that file (' + r.status + ').' });
  }
  const out = await r.json();
  const call = (out.content || []).find(c => c.type === 'tool_use' && c.name === 'record_quote');
  if (!call || !call.input) return res.status(502).json({ error: 'The AI did not return a quote. Try again, or type it in.' });
  const q = call.input;
  const valid = new Set(pkg.lines.map(l => l.itemId));
  const kept = [], dropped = [];
  (q.lines || []).forEach(l => { if (valid.has(l.item_id) && typeof l.unit_price === 'number' && l.unit_price >= 0) kept.push(l); else dropped.push(l); });
  dropped.forEach(l => { (q.unmatched = q.unmatched || []).push({ description: l.quoted_as || 'a line', unit_price: l.unit_price }); });
  q.lines = kept;
  return res.status(200).json({ quote: q, model: MODEL, usage: out.usage || null });
}
