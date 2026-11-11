// Design-drift check: custom UI styles with design-system tokens (var(--...)), never raw colors.
// Raw colors are allowed only in src/ds/ (the vendored design system itself) and on lines that
// build a self-contained printed document (they carry their own styles and ignore the app theme).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..', 'src');
const SKIP_DIR = path.join(ROOT, 'ds') + path.sep;
const PRINT_DOC = /<!doctype html/i; // a printed/exported document, deliberately unthemed
const RAW = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

const problems = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if ((p + path.sep) !== SKIP_DIR) walk(p); continue; }
    if (!/\.(js|css)$/.test(name)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach(function (line, i) {
      if (PRINT_DOC.test(line)) return;
      const m = RAW.exec(line);
      if (m) problems.push(path.relative(ROOT, p) + ':' + (i + 1) + '  ' + m[0] + '  — use a design-system token (var(--...)) instead');
    });
  }
})(ROOT);

if (problems.length) {
  console.log('Raw colors outside the design system:');
  problems.forEach(function (p) { console.log('  ' + p); });
  process.exit(1);
}
console.log('tokens: all custom UI styles with design-system tokens');
