/* ===== Benchstake AI helpers: read a quote document into the quote dialog =====
   The AI reads; Benchstake prices. Nothing here saves anything: the result goes into the Quote dialog for review. */
import { GL } from './gl.js';
(function () {
  function readAsDataUrl(file) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { no(new Error('Could not read the file.')); }; r.readAsDataURL(file); }); }
  // Photos from a phone are 3 to 8 MB; a 2000px JPEG reads just as well and fits the upload limit.
  function shrinkImage(file) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 2000, s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] });
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(null); };
      img.src = url;
    });
  }
  // file: a File (PDF or image), or null with `text`. pkg: a derived package. Returns the server's { quote } or throws with a plain message.
  GL.readQuote = async function (opts) {
    var body = { package: { name: opts.pkg.name, lines: opts.pkg.lines.map(function (l) { return { itemId: l.itemId, code: l.item ? l.item.code : '', name: l.item ? l.item.name : '', qty: l.qty, unit: l.unit }; }) }, vendors: (opts.vendors || []).map(function (v) { return v.name; }) };
    if (opts.file) {
      var f = opts.file;
      if (/^image\//.test(f.type) && f.type !== 'image/gif') { var small = f.size > 1200000 || !/^image\/(png|jpeg|webp)$/.test(f.type) ? await shrinkImage(f) : null; body.file = small || { name: f.name, type: f.type, data: (await readAsDataUrl(f)).split(',')[1] }; }
      else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) { if (f.size > 3 * 1024 * 1024) throw new Error('That PDF is over 3 MB. Print it to a smaller PDF, or take a photo of the page.'); body.file = { name: f.name, type: 'application/pdf', data: (await readAsDataUrl(f)).split(',')[1] }; }
      else throw new Error('Use a PDF or a photo. For an email, paste the text instead.');
    } else body.text = opts.text || '';
    var headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    var r = await fetch('/api/read-quote', { method: 'POST', headers: headers, body: JSON.stringify(body) });
    var j = null; try { j = await r.json(); } catch (e) { /* not json */ }
    if (!r.ok) throw new Error((j && j.error) || 'Could not read the quote (' + r.status + ').');
    return j.quote;
  };
})();
