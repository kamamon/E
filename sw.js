// オフラインでも開けるようにするサービスワーカー（ネット優先・つながらない時はキャッシュ。実写の映像は一度見たら保存）
const V = 'immersefit-v9', CLIPS = 'immersefit-clips-v1';
const SCN = ['hit', 'hit2', 'punch', 'push', 'pull', 'lift', 'stir', 'wipe', 'clap', 'throw', 'squat', 'knee', 'kick', 'stomp', 'jump', 'step', 'finale', 'registry', 'index'].map(n => `./js/scenes/${n}.js`);
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', ...['main', 'store', 'music', 'voice', 'cam', 'stage', 'kit', 'sfx', 'figure', 'backcoach', 'imgcoach', 'figdata', 'types', 'motions', 'exercise', 'motion', 'moves', 'run', 'real', 'clips', 'photo', 'photos', 'hits', 'sfxui', 'mine', 'mineui', 'minereg', 'zip', 'hitworker'].map(n => `./js/${n}.js`), ...SCN, ...['hit', 'recoil', 'earcock', 'ear', 'lift', 'cock', 'rise', 'swing', 'dn30', 'dn45', 'dn70'].map(n => `./coach/chop-${n}.jpg`)];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== CLIPS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.host);
  if (url.origin !== location.origin && !font) return;
  // 実写の映像：キャッシュにあればそれを使う（ファイル名が変わらない限り中身も同じ）
  if (/\/(clips|photos)\/[^/]+\.(mp4|jpg)$/.test(url.pathname) && !req.headers.get('range')) {
    e.respondWith(caches.open(CLIPS).then(async c => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }));
    return;
  }
  e.respondWith(caches.open(V).then(async c => {
    if (font) { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); c.put(req, r.clone()); return r; }
    try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
    catch (err) { return (await c.match(req)) || (await c.match('./index.html')); }
  }));
});
