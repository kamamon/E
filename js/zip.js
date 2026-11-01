/* =========================================================================
   IMMERSE FIT — zip.js
   小さな zip の書き出しと読み込み（自分の画像を GitHub Pages に置く・別の端末に移すため）。
   書き出しは無圧縮（写真はもともと圧縮されているので十分）。読み込みは圧縮された zip も開けます。
   ========================================================================= */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function dosTime(d) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
const bytesOf = async d => d instanceof Uint8Array ? d : typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(await d.arrayBuffer());

// files: [{ name: 'photos/custom.json', data: Uint8Array | Blob | 文字列 }] → Blob
export async function zipWrite(files) {
  const enc = new TextEncoder(), parts = [], cen = [], dt = dosTime(new Date()); let off = 0;
  for (const f of files) {
    const data = await bytesOf(f.data), nm = enc.encode(f.name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dt.time, true); lh.setUint16(12, dt.date, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dt.time, true); ch.setUint16(14, dt.date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cen.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const csize = cen.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// Blob → Map(名前 → Uint8Array)
export async function zipRead(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip ファイルではないようです');
  const n = dv.getUint16(e + 10, true), out = new Map(); let p = dv.getUint32(e + 16, true);
  for (let k = 0; k < n; k++) {
    if (p + 46 > buf.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = decodeName(buf.subarray(p + 46, p + 46 + nl), flags); p += 46 + nl + xl + cl;
    if (!name || name.endsWith('/') || /(^|\/)__MACOSX\//.test(name)) continue;
    const d0 = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = buf.subarray(d0, d0 + csize);
    if (method === 0) out.set(name, raw); else if (method === 8) out.set(name, await inflate(raw));
  }
  return out;
}
function decodeName(u8, flags) {
  if (flags & 0x800) return new TextDecoder().decode(u8);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch (e) { /* Windows の日本語の名前 */ }
  try { return new TextDecoder('shift_jis').decode(u8); } catch (e) { return new TextDecoder().decode(u8); }
}
async function inflate(raw) {
  if (typeof DecompressionStream === 'undefined') throw new Error('この端末では圧縮された zip を開けません');
  const s = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
