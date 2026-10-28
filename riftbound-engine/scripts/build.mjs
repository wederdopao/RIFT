// Gera:
//   dist/index.html            página do artifact (motor, cartas, interface e CSS embutidos)
//   dist/art/<pacote>.json     artes oficiais (webp em base64), em pacotes de até 40 cartas, baixados sob demanda
//   dist/riftbound-mesa.html   versão para abrir direto no navegador, com as artes dos decks embutidas
//   dist/site/                 site para hospedar (index.html + art/ + voice/ + music/), com jogo online
import { build } from 'esbuild';
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
const css = readFileSync('src/ui/style.css', 'utf8');
const page = (inlineArt) => `<title>Riftbound Mesa</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script>window.__RB_ART_INDEX__=${JSON.stringify(index)};${inlineArt ? `window.__RB_ART__=${JSON.stringify(inlineArt)};` : ''}</script>
<script>
${js}
</script>
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
// site para hospedar (Netlify, itch.io, GitHub Pages...): página completa + pasta art/
rmSync('dist/site', { recursive: true, force: true });
mkdirSync('dist/site', { recursive: true });
writeFileSync('dist/site/index.html', full(html));
cpSync('dist/art', 'dist/site/art', { recursive: true });
// vozes dos campeões (scripts/lor_voices.py): o site baixa só as do campeão que fala, quando fala
if (existsSync('assets/voice/index.json')) cpSync('assets/voice', 'dist/site/voice', { recursive: true });
// músicas dos tabuleiros (scripts/lor_music.py): cada uma só baixa quando toca
if (existsSync('assets/music/index.json')) cpSync('assets/music', 'dist/site/music', { recursive: true });
const packSize = Object.keys(packs).map((n) => readFileSync(`dist/art/${n}.json`).length).reduce((a, b) => a + b, 0);
console.log(
  `dist/index.html ${(html.length / 1024).toFixed(0)} KB · ${Object.keys(packs).length} pacotes de arte (${(packSize / 1e6).toFixed(1)} MB, ${files.length} cartas) · offline ${(offline.length / 1e6).toFixed(1)} MB`,
);
