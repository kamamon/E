// IMMERSE FIT のビルド（任意）: 1ファイル版のプレビュー dist/preview.html を作ります
// 使い方: npm install → npm run build
import { build } from 'esbuild';
import fs from 'node:fs';

const r = await build({ entryPoints: ['js/main.js'], bundle: true, format: 'esm', minify: true, write: false, logLevel: 'warning', charset: 'utf8' });
const code = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// 効果音を作る Worker（1ファイル版では文字列で埋めこみ、Blob から起動）
const w = await build({ entryPoints: ['js/hitworker.js'], bundle: true, format: 'iife', minify: true, write: false, logLevel: 'warning', charset: 'utf8' });
const hitw = JSON.stringify(w.outputFiles[0].text).replace(/<\//g, '<\\/');
const html = fs.readFileSync('index.html', 'utf8');
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].replace('<script type="module" src="js/main.js"></script>', '');
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const out = `<title>IMMERSE FIT</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
${style}
${body}
<script>window.__ARTIFACT__ = true; window.__HITW = ${hitw};</script>
<script type="module">
${code}
</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/preview.html', out);
// 実写の映像（プレビューといっしょに置く）
fs.rmSync('dist/clips', { recursive: true, force: true }); fs.mkdirSync('dist/clips', { recursive: true });
let n = 0, kb = 0; if (fs.existsSync('clips')) for (const f of fs.readdirSync('clips')) if (f.endsWith('.mp4')) { fs.copyFileSync('clips/' + f, 'dist/clips/' + f); n++; kb += fs.statSync('clips/' + f).size / 1024; }
console.log('dist/clips', n, 'files', (kb / 1024).toFixed(1) + 'MB');
fs.rmSync('dist/photos', { recursive: true, force: true }); fs.mkdirSync('dist/photos', { recursive: true });
let np = 0, kp = 0; if (fs.existsSync('photos')) for (const f of fs.readdirSync('photos')) if (/\.(jpg|webp)$/.test(f)) { fs.copyFileSync('photos/' + f, 'dist/photos/' + f); np++; kp += fs.statSync('photos/' + f).size / 1024; }
// 自分の画像をサイトに置いているとき（photos/custom.json と photos/custom/）
if (fs.existsSync('photos/custom.json')) { fs.copyFileSync('photos/custom.json', 'dist/photos/custom.json'); if (fs.existsSync('photos/custom')) fs.cpSync('photos/custom', 'dist/photos/custom', { recursive: true }); console.log('dist/photos/custom.json（自分の画像）'); }
console.log('dist/photos', np, 'files', (kp / 1024).toFixed(1) + 'MB');
// お手本の3D人形の画像
fs.rmSync('dist/coach', { recursive: true, force: true }); fs.mkdirSync('dist/coach', { recursive: true });
let nc = 0; if (fs.existsSync('coach')) for (const f of fs.readdirSync('coach')) if (/\.(jpg|webp)$/.test(f)) { fs.copyFileSync('coach/' + f, 'dist/coach/' + f); nc++; }
console.log('dist/coach', nc, 'files');
console.log('dist/preview.html', (out.length / 1024).toFixed(0) + 'KB');
