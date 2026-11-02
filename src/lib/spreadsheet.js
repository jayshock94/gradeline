// Reads an .xlsx/.xls/.csv file into tab-separated text that the paste parser already understands.
import { GL } from '../app/gl.js';

GL.readSpreadsheet = async function (file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return await file.text();
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return rows.map(r => r.map(c => (c == null ? '' : String(c))).join('\t')).filter(l => l.replace(/\t/g, '').trim()).join('\n');
};
