// Gera:
//   dist/index.html            página do artifact (motor, cartas, interface e CSS embutidos)
//   dist/art/<pacote>.json     artes oficiais (webp em base64), em pacotes de até 40 cartas, baixados sob demanda
//   dist/riftbound-mesa.html   versão para abrir direto no navegador, com as artes dos decks embutidas
//   dist/site/                 site para hospedar (index.html + art/<código>.webp + voice/ + music/ + mats/), com jogo online
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, cpSync, existsSync } from 'node:fs';

// ── artes ──
const ART_DIR = 'assets/art';
const PACK = 40;
const files = readdirSync(ART_DIR).filter((f) => f.endsWith('.webp')).sort();
const bySet = new Map();
for (const f of files) {
  const code = f.replace(/\.webp$/, '');
  const set = code.split('-')[0];
  if (!bySet.has(set)) bySet.set(set, []);
  bySet.get(set).push(code);
}
const index = {};
const packs = {};
for (const [set, codes] of bySet) {
  for (let i = 0; i < codes.length; i += PACK) {
    const name = `${set}-${i / PACK + 1}`;
    packs[name] = {};
    for (const c of codes.slice(i, i + PACK)) {
      index[c] = name;
      packs[name][c] = readFileSync(`${ART_DIR}/${c}.webp`).toString('base64');
    }
  }
}
rmSync('dist/art', { recursive: true, force: true });
mkdirSync('dist/art', { recursive: true });
for (const [name, pack] of Object.entries(packs)) writeFileSync(`dist/art/${name}.json`, JSON.stringify(pack));

// ── código ──
const res = await build({
  entryPoints: ['src/ui/main.ts'],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  loader: { '.json': 'json' },
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// zoom das telas grandes (fim do style.css: `html { zoom; --zf }`): no Chrome as unidades da tela (vh, vw) não
// descontam o zoom, e a mesa, medida nelas, sairia grande demais (a barra de ação cobria a base). Cada uma vira
// "dividida por --zf" (1 sem zoom); fora de @media, onde a tela é medida como está.
const css = readFileSync('src/ui/style.css', 'utf8')
  .split('\n')
  .map((l) => (l.trimStart().startsWith('@media') ? l.replace(/\{.*$/, (b) => b.replace(/(\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g, 'calc($1$2 / var(--zf, 1))')) : l.replace(/(\d*\.?\d+)(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/g, 'calc($1$2 / var(--zf, 1))')))
  .join('\n');
// fontes: no site, servidas do próprio endereço (scripts/fonts.py; sem conexões extras ao Google na abertura); no
// artifact e na versão offline, do Google Fonts
const googleFonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap">`;
const localFonts = existsSync('assets/fonts/fonts.css');
/** `siteJs`: no site o código vai em js/ (arquivo com hash, guardado pelo navegador; o online baixa à parte) */
const page = (inlineArt, artFiles = false, siteJs = '', siteDeps = []) => `<title>Riftbound Mesa</title>
<meta name="claude:viewport-fit-sides" content="cover">
${siteJs ? `${[siteJs, ...siteDeps].map((f) => `<link rel="modulepreload" href="${f}">`).join('\n')}
${localFonts ? ['barlow-400', 'barlow-condensed-600'].map((f) => `<link rel="preload" href="fonts/${f}.woff2" as="font" type="font/woff2" crossorigin>`).join('\n') : googleFonts}` : googleFonts}
<style>
${siteJs && localFonts ? readFileSync('assets/fonts/fonts.css', 'utf8') : ''}${css}
</style>
<div id="app"></div>
<script>window.__RB_ART_INDEX__=${JSON.stringify(index)};${inlineArt ? `window.__RB_ART__=${JSON.stringify(inlineArt)};` : ''}${artFiles ? `window.__RB_ART_FILES__=true;${existsSync('assets/art-hd') ? 'window.__RB_ART_HD__=true;' : ''}` : ''}</script>
${siteJs ? `<script type="module" src="${siteJs}"></script>` : `<script>
${js}
</script>`}
`;
const full = (h) =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${h.replace('<div id="app"></div>', '</head><body><div id="app"></div>')}</body></html>`;
const html = page(null);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);

// versão offline: embute os pacotes do Origins, Proving Grounds, Spiritforged, Unleashed e das fichas
const offlinePacks = Object.fromEntries(Object.entries(packs).filter(([n]) => /^(OGN|OGS|SFD|UNL|VEN|RAD|TOK)-/.test(n)));
const offline = page(offlinePacks);
writeFileSync('dist/riftbound-mesa.html', full(offline));
// site para hospedar (Netlify, itch.io, GitHub Pages...): página completa + pasta art/ com um webp por carta (cada carta
// baixa só a própria imagem, que o navegador guarda; os pacotes em base64 ficam para o artifact e a versão offline)
rmSync('dist/site', { recursive: true, force: true });
mkdirSync('dist/site', { recursive: true });
const siteRes = await build({
  entryPoints: { app: 'src/ui/main.ts' },
  bundle: true,
  format: 'esm',
  splitting: true,
  minify: true,
  outdir: 'dist/site/js',
  entryNames: '[name]-[hash]',
  chunkNames: 'c-[hash]',
  target: 'es2020',
  loader: { '.json': 'json' },
  legalComments: 'none',
  metafile: true,
});
const siteJsFiles = Object.keys(siteRes.metafile.outputs).map((f) => f.replace(/^dist\/site\/js\//, ''));
const appJs = siteJsFiles.find((f) => f.startsWith('app-'));
// o que o app importa logo de saída (não o online, que vem por import dinâmico) também é pré-carregado
const appDeps = siteRes.metafile.outputs[`dist/site/js/${appJs}`].imports.filter((i) => i.kind === 'import-statement').map((i) => i.path.replace(/^dist\/site\//, ''));
const sitePage = full(page(null, true, `js/${appJs}`, appDeps));
writeFileSync('dist/site/index.html', sitePage);
if (localFonts) cpSync('assets/fonts', 'dist/site/fonts', { recursive: true, filter: (f) => !f.endsWith('.css') });
// service worker (abre na hora a partir da segunda visita) e cabeçalhos de cache do Netlify
const versao = createHash('sha1').update(sitePage).digest('hex').slice(0, 12);
writeFileSync('dist/site/sw.js', readFileSync('src/sw.js', 'utf8').replace("'__VERSAO__'", `'${versao}'`).replace('= __JS__;', `= ${JSON.stringify(siteJsFiles)};`));
writeFileSync('dist/site/_headers', readFileSync('src/netlify-headers.txt', 'utf8'));
cpSync(ART_DIR, 'dist/site/art', { recursive: true });
// artes em alta (scripts/art_hd.py): só quando a carta aparece grande (ampliada, prévia, mão, deckbuilder)
const artHd = existsSync('assets/art-hd');
if (artHd) cpSync('assets/art-hd', 'dist/site/art-hd', { recursive: true });
// vozes dos campeões (scripts/lor_voices.py): o site baixa só as do campeão que fala, quando fala
if (existsSync('assets/voice/index.json')) cpSync('assets/voice', 'dist/site/voice', { recursive: true });
// músicas dos tabuleiros (scripts/lor_music.py): cada uma só baixa quando toca
if (existsSync('assets/music/index.json')) cpSync('assets/music', 'dist/site/music', { recursive: true });
// tapetes da mesa (scripts/lor_mats.py): ilustrações dos tabuleiros do LoR, só baixam quando escolhidas
if (existsSync('assets/mats/index.json')) cpSync('assets/mats', 'dist/site/mats', { recursive: true });
const packSize = Object.keys(packs).map((n) => readFileSync(`dist/art/${n}.json`).length).reduce((a, b) => a + b, 0);
console.log(
  `site: index ${(sitePage.length / 1024).toFixed(0)} KB + js/${appJs} ${(readFileSync(`dist/site/js/${appJs}`).length / 1024).toFixed(0)} KB · dist/index.html ${(html.length / 1024).toFixed(0)} KB · ${Object.keys(packs).length} pacotes de arte (${(packSize / 1e6).toFixed(1)} MB, ${files.length} cartas) · offline ${(offline.length / 1e6).toFixed(1)} MB`,
);
