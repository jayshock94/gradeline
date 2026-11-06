// Reads an .xlsx/.xls/.csv file into tab-separated text that the paste parser already understands.
import { GL } from '../app/gl.js';

GL.readSpreadsheet = async function (file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return await file.text();
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // Percent-formatted cells come through as "38%" (not 0.38); everything else as its raw value.
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const rows = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v == null) { row.push(''); continue; }
      if (typeof cell.v === 'number' && /%/.test(cell.z || '')) row.push(String(Math.round(cell.v * 10000) / 100) + '%');
      else if (cell.t === 'd' && cell.v instanceof Date) row.push(cell.v.toISOString().slice(0, 10));
      else row.push(String(cell.v));
    }
    rows.push(row);
  }
  return rows.map(r => r.join('\t')).filter(l => l.replace(/\t/g, '').trim()).join('\n');
};
