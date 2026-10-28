// Service worker do site (o build troca __VERSAO__ pelo hash da página e __JS__ pelos arquivos de js/ desta versão). Faz a mesa abrir na hora a partir da segunda
// visita, mesmo sem internet:
//  - página (index.html): sai do cache na hora e é conferida na rede ao mesmo tempo; se mudou, avisa a página
//    ("nova versão") e a próxima abertura já vem nova;
//  - js/ (nome com hash, nunca muda), fonts/: do cache, para sempre;
//  - art/, art-hd/ e mats/: do cache na hora, conferidas na rede em segundo plano (uma carta com arte nova se corrige sozinha);
//  - voice/ e music/ ficam de fora: o <audio> pede pedaços (Range) e o cache do navegador já cuida delas.
const VERSAO = 'fd06a9966bae'; // muda a cada build: é o que faz o navegador trocar de service worker
const JS = ["app-RTGF3QBA.js","c-Y6MRID7F.js","c-KGNFAV5Y.js"];
const PAGE = 'rb-page';
const STATIC = 'rb-static';
const MEDIA = 'rb-media';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(PAGE)
      .then((c) => c.add(new Request('./', { cache: 'reload' })))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // os js/ de versões antigas não servem mais
      const c = await caches.open(STATIC);
      for (const r of await c.keys()) if (r.url.includes('/js/') && !JS.some((f) => r.url.endsWith('/js/' + f))) await c.delete(r);
      await self.clients.claim();
    })(),
  );
});

async function page(req) {
  const cache = await caches.open(PAGE);
  const hit = await cache.match('./');
  let changed = false;
  // o texto da versão guardada sai antes: a resposta `hit` vai para a página e não dá para clonar depois
  const oldText = hit ? hit.clone().text() : Promise.resolve('');
  // (um pedido de navegação não aceita opções: busca pelo endereço)
  const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    .then(async (res) => {
      if (res.ok && res.type === 'basic') {
        const fresh = res.clone();
        const old = await oldText;
        const text = await res.clone().text();
        await cache.put('./', fresh);
        // a página que abriu do cache é a velha: ela pergunta ("check") e ouve que há versão nova
        if (hit && old !== text) changed = true;
      }
      return res;
    })
    .catch(() => hit);
  lastCheck = net.then(() => changed, () => false);
  return hit || net;
}
let lastCheck = Promise.resolve(false);
self.addEventListener('message', (e) => {
  if (e.data?.rb !== 'check') return;
  e.waitUntil(lastCheck.then((changed) => changed && e.source?.postMessage({ rb: 'nova-versao' })));
});

async function cacheFirst(req, name, revalidate) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    if (revalidate) net.catch(() => {});
    return hit;
  }
  return net;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (req.mode === 'navigate' && (path === '' || path === 'index.html')) return e.respondWith(page(req));
  if (path.startsWith('js/') || path.startsWith('fonts/')) return e.respondWith(cacheFirst(req, STATIC, false));
  if (path.startsWith('art/') || path.startsWith('art-hd/') || path.startsWith('mats/')) return e.respondWith(cacheFirst(req, MEDIA, true));
});
