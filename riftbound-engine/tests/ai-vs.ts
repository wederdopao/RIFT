// IA nova contra IA antiga (cópia congelada em tests/ai-old.ts): N partidas com decks variados (os dois precons e
// decks aleatórios montados com perfil aggro / ramp / meio-termo), alternando quem começa e quem fica com cada deck.
//
//   npx tsx tests/ai-vs.ts 40              (40 partidas; múltiplos de 4 cobrem as 4 combinações de cada par de decks)
//   npx tsx tests/ai-vs.ts 40 --shard 0/2  (metade das partidas; rode 0/2 e 1/2 em paralelo e some)
//   npx tsx tests/ai-vs.ts 40 --old new    (nova contra ela mesma: sanidade, deve dar ~50%)
//   npx tsx tests/ai-vs.ts 96 --only 90    (só a partida 90, com o registro e as decisões)
//   npx tsx tests/ai-vs.ts 96 --level hard (nível da nova: easy | normal | hard; padrão normal)
//   npx tsx tests/ai-vs.ts 96 --tune gearPerCost=2,normal.turnK=0   (muda pesos/nível da nova, para afinar)
//   npx tsx tests/ai-vs.ts 96 --mirror     (espelho: os dois lados com o mesmo deck — mede só a habilidade)
//   npx tsx tests/ai-vs.ts 96 --classic    (decks como antes: sem forçar lendas de Vendetta/Radiance)
// Por padrão, metade dos decks aleatórios usa lenda de Vendetta ou Radiance e prefere cartas desses sets (Empower, Flow,
// Deploy, Bomb, Show Off, unit gear...).
import '../src/cards';
import cards from '../src/data/cards.json';
import { Game } from '../src/engine/game';
import type { DeckList } from '../src/engine/engine';
import type { P } from '../src/engine/types';
import { Rng } from '../src/engine/rng';
import { isImplemented } from '../src/engine/script';
import { checkDeck, fillExtraLegends } from '../src/engine/deckcheck';
import { JINX_PRECON, LEE_SIN_PRECON } from '../src/decks/origins';
import { AiPlayer as NewAi, quickPick, isAiLevel, tuneAi, type AiLevel } from '../src/ai/ai';
import { AiPlayer as OldAi } from './ai-old';

type CD = { code: string; name: string; type: string; domains: string[]; tags: string[]; text: string; energy: number };
const ALL = Object.values(cards as Record<string, CD>).filter((c) => /^(OGN|OGS|SFD|UNL|VEN|RAD)-\d+$/.test(c.code));
const RUNE: Record<string, string> = { Fury: 'OGN-007', Calm: 'OGN-042', Mind: 'OGN-089', Body: 'OGN-126', Chaos: 'OGN-166', Order: 'OGN-214' };
const isType = (c: CD, t: string) => c.type.toLowerCase().includes(t);
const LEGENDS = ALL.filter((c) => isType(c, 'legend'));
const BFS = ALL.filter((c) => isType(c, 'battlefield'));
const MAIN = ALL.filter((c) => isImplemented(c.code) && !isType(c, 'legend') && !isType(c, 'battlefield') && !isType(c, 'rune') && !isType(c, 'token'));
const RAMP_RE = /channel|ready (?:up to )?(?:\d+|a|an|one|two) runes?|\[add\]/i;

/** Deck aleatório legal com um perfil: aggro (curva baixa), ramp (aceleração + finalizadores) ou meio-termo. */
const NEWSET = /^(VEN|RAD)-/;
const NEW_LEGENDS = LEGENDS.filter((c) => NEWSET.test(c.code));
function buildDeck(rng: Rng, style: 'aggro' | 'ramp' | 'mid', venrad = false): DeckList {
  for (let tries = 0; tries < 80; tries++) {
    const legends = venrad ? NEW_LEGENDS : LEGENDS;
    const legend = legends[rng.int(legends.length)];
    const ident = new Set(legend.domains);
    const champs = MAIN.filter((c) => isType(c, 'champion') && c.tags.some((t) => legend.tags.includes(t)));
    if (!champs.length) continue;
    const champion = champs[rng.int(champs.length)].code;
    const legal = MAIN.filter((c) => c.domains.every((d) => ident.has(d)) && (!isType(c, 'signature') || c.tags.some((t) => legend.tags.includes(t))));
    const want = (c: CD) =>
      style === 'aggro' ? c.energy <= 3 : style === 'ramp' ? (RAMP_RE.test(c.text) && c.energy <= 5) || c.energy >= 7 || rng.next() < 0.3 : true;
    let pool = legal.filter(want);
    if (pool.length < 10) continue;
    rng.shuffle(pool);
    // Vendetta/Radiance: as cartas desses sets primeiro (o resto completa)
    if (venrad) pool = [...pool.filter((c) => NEWSET.test(c.code)), ...pool.filter((c) => !NEWSET.test(c.code))];
    const counts: Record<string, number> = { [champion]: 1 };
    let sig = 0;
    const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
    for (const c of [...pool, ...legal]) {
      if (total() >= 40) break;
      const max = /\[Unique\]/i.test(c.text) ? 1 : 3;
      let k = Math.min(max - (counts[c.code] || 0), 40 - total());
      if (isType(c, 'signature')) k = Math.min(k, 3 - sig);
      if (k <= 0) continue;
      counts[c.code] = (counts[c.code] || 0) + k;
      if (isType(c, 'signature')) sig += k;
    }
    if (total() < 40) continue;
    const main = Object.entries(counts).map(([c, n]) => [c, c === champion ? n - 1 : n] as [string, number]).filter(([, n]) => n > 0);
    const doms = [...ident];
    const runes: [string, number][] = doms.length === 2 ? [[RUNE[doms[0]], 6], [RUNE[doms[1]], 6]] : [[RUNE[doms[0]], 12]];
    const bfs: string[] = [];
    const bp = [...BFS];
    rng.shuffle(bp);
    for (const b of bp) if (bfs.length < 3 && isImplemented(b.code)) bfs.push(b.code);
    const deck: DeckList = fillExtraLegends({ name: `${style} ${legend.name}`, legend: legend.code, champion, main, runes, battlefields: bfs }, (n) => rng.int(n)); // Neeko
    if (checkDeck(deck).errors.length) continue;
    return deck;
  }
  throw new Error('não consegui montar o deck');
}

function deckPair(i: number): [DeckList, DeckList] {
  if (i % 4 === 0) return [JINX_PRECON, LEE_SIN_PRECON];
  const rng = new Rng(i * 7717 + 3);
  const styles = ['aggro', 'ramp', 'mid'] as const;
  const vr = !classic;
  const pair: [DeckList, DeckList] = [buildDeck(rng, styles[i % 3], vr && i % 2 === 1), buildDeck(rng, styles[(i + 1) % 3], vr && i % 4 === 2)];
  // espelho: os dois com o mesmo deck (tira a vantagem do deck; cada partida mede só quem joga melhor)
  if (mirror) return i % 4 === 0 ? [JINX_PRECON, JINX_PRECON] : [pair[(i >> 1) % 2], pair[(i >> 1) % 2]];
  return pair;
}

const args = process.argv.slice(2);
const classic = args.includes('--classic');
const mirror = args.includes('--mirror');
const levelArg = args.includes('--level') ? args[args.indexOf('--level') + 1] : 'normal';
if (!isAiLevel(levelArg)) throw new Error('--level: easy | normal | hard');
const level: AiLevel = levelArg;
if (args.includes('--tune')) tuneAi(args[args.indexOf('--tune') + 1]); // ex.: --tune turnK=0 ou normal.depth=3,kw=0.5
const n = Number(args[0] || 20);
const shardArg = args.includes('--shard') ? args[args.indexOf('--shard') + 1] : '0/1';
const [shard, shards] = shardArg.split('/').map(Number);
const oldIsNew = args.includes('--old') && args[args.indexOf('--old') + 1] === 'new';
const only = args.includes('--only') ? Number(args[args.indexOf('--only') + 1]) : null; // uma partida, com o registro

let newWins = 0;
let oldWins = 0;
let draws = 0;
let newMs = 0;
let newN = 0;
let newMax = 0;
const byKind: Record<string, { n: number; ms: number; max: number }> = {};
for (let k = 0; k < n; k++) {
  if (only !== null ? k !== only : k % shards !== shard) continue;
  const pairIdx = Math.floor(k / 4);
  const decks = deckPair(pairIdx);
  const newSide = (k % 2) as P; // a nova fica com o deck A ou B
  const first = (Math.floor(k / 2) % 2) as P; // e começa ou não
  const seed = 1000 + pairIdx;
  const g = new Game({ seed, decks, names: ['A', 'B'], firstPlayer: first });
  const ais = [0, 1].map((p) => (p === newSide || oldIsNew ? new NewAi(p as P, p === newSide ? level : 'normal') : new OldAi(p as P)));
  const t0 = Date.now();
  let shown = 0;
  for (let steps = 0; g.current && steps < 4000; steps++) {
    const d = g.current;
    if (only !== null) for (; shown < g.engine.log.length; shown++) console.log(g.engine.log[shown].text);
    const ts = performance.now();
    const ans = ais[d.player].decide(g);
    const dt = performance.now() - ts;
    if (d.player === newSide) {
      newMs += dt;
      newN++;
      newMax = Math.max(newMax, dt);
      const k = (byKind[d.kind] ||= { n: 0, ms: 0, max: 0 });
      k.n++;
      k.ms += dt;
      k.max = Math.max(k.max, dt);
      if (dt > 3000) console.log(`   decisão lenta (${(dt / 1000).toFixed(1)}s, ${g.answers.length} respostas): [${d.kind}] ${d.prompt.slice(0, 60)}`);
    }
    if (only !== null && !((d.kind === 'action' && ans[0] === 'end') || ((d.kind === 'priority' || d.kind === 'focus') && ans[0] === 'pass')))
      console.log(`      >> ${'AB'[d.player]}${d.player === newSide ? ' (nova)' : ''} [${d.kind}] ${d.prompt.slice(0, 60)} -> ${ans.map((id) => d.options.find((o) => o.id === id)?.label ?? id).join(' + ')}`);
    if (!g.answer(ans) && !g.answer(quickPick(g.current!, g.engine))) g.answer([g.current!.options[0].id]);
  }
  const w = g.engine.winner;
  if (w === newSide) newWins++;
  else if (w === null) draws++;
  else oldWins++;
  console.log(
    `partida ${k} (${decks[0].name} × ${decks[1].name}; nova = ${'AB'[newSide]}, começa ${'AB'[first]}): ${w === null ? 'sem vencedor' : w === newSide ? 'NOVA' : 'antiga'} · placar ${g.engine.pl.map((p) => p.points).join('×')} · turnos ${g.engine.turn} · ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}
const played = newWins + oldWins + draws;
console.log(
  `\nnova ${newWins} × ${oldWins} antiga (${draws} sem vencedor) em ${played} · nova vence ${((100 * newWins) / Math.max(1, newWins + oldWins)).toFixed(0)}% · decisão da nova: média ${(newMs / Math.max(1, newN)).toFixed(0)}ms, pior ${newMax.toFixed(0)}ms`,
);
console.log(
  'por tipo: ' +
    Object.entries(byKind)
      .map(([k, v]) => `${k} ${v.n}× média ${(v.ms / v.n).toFixed(0)}ms pior ${v.max.toFixed(0)}ms`)
      .join(' · '),
);
