// Fuzz de cartas: monta decks aleatórios (válidos) puxando um conjunto de cartas e joga partidas com escolhas
// aleatórias, checando as invariantes do motor. Serve para achar exceções e travas em cartas novas.
//
//   npx tsx tests/fuzz.ts --codes OGN-043..OGN-082 --games 40
//   npx tsx tests/fuzz.ts --all --games 100          (todas as cartas do Origins)
//
// Mostra, para cada código pedido, quantas vezes a carta foi jogada/ativada (pelo registro), para saber se
// o fuzz chegou a exercitar a carta.
import '../src/cards';
import cards from '../src/data/cards.json';
import { Game } from '../src/engine/game';
import type { DeckList } from '../src/engine/engine';
import type { P } from '../src/engine/types';
import { Rng } from '../src/engine/rng';
import { isImplemented } from '../src/engine/script';
import { checkDeck, fillExtraLegends } from '../src/engine/deckcheck';
import { AiPlayer } from '../src/ai/ai';
const USE_AI = process.argv.includes('--ai');

type CD = { code: string; name: string; type: string; domains: string[]; tags: string[]; text: string };
const ALL = Object.values(cards as Record<string, CD>).filter((c) => /^(OGN|OGS|SFD|UNL|VEN|RAD)-\d+$/.test(c.code));
const DOMAIN_RUNE: Record<string, string> = {
  Fury: 'OGN-007', Calm: 'OGN-042', Mind: 'OGN-089', Body: 'OGN-126', Chaos: 'OGN-166', Order: 'OGN-214',
};
const isType = (c: CD, t: string) => c.type.toLowerCase().includes(t);
const LEGENDS = ALL.filter((c) => isType(c, 'legend'));
const BFS = ALL.filter((c) => isType(c, 'battlefield'));
const MAINABLE = ALL.filter((c) => !isType(c, 'legend') && !isType(c, 'battlefield') && !isType(c, 'rune') && !isType(c, 'token'));

function parseCodes(spec: string): string[] {
  const out: string[] = [];
  for (const part of spec.split(',')) {
    const m = /^([A-Z]+)-(\d+)\.\.(?:[A-Z]+-)?(\d+)$/.exec(part.trim());
    if (m) {
      for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(`${m[1]}-${String(i).padStart(3, '0')}`);
    } else out.push(part.trim());
  }
  return out.filter((c) => (cards as any)[c]);
}

function buildDeck(rng: Rng, focus: Set<string>): DeckList {
  const focusCards = ALL.filter((c) => focus.has(c.code));
  // lenda: se o foco tem lendas, uma delas; senão uma lenda que cubra um domínio do foco
  const focusLegends = focusCards.filter((c) => isType(c, 'legend'));
  const focusDomains = new Set(focusCards.flatMap((c) => c.domains));
  let legendPool = focusLegends.length ? focusLegends : LEGENDS.filter((l) => l.domains.some((d) => focusDomains.has(d)));
  if (!legendPool.length) legendPool = LEGENDS;
  for (let tries = 0; tries < 50; tries++) {
    const legend = legendPool[rng.int(legendPool.length)];
    const ident = new Set(legend.domains);
    const champs = MAINABLE.filter((c) => isType(c, 'champion') && c.tags.some((t) => legend.tags.includes(t)));
    if (!champs.length) continue;
    const champion = (champs.find((c) => focus.has(c.code) && rng.next() < 0.7) ?? champs[rng.int(champs.length)]).code;
    const legal = MAINABLE.filter(
      (c) => c.domains.every((d) => ident.has(d)) && (!isType(c, 'signature') || c.tags.some((t) => legend.tags.includes(t))),
    );
    const counts: Record<string, number> = { [champion]: 1 };
    let sig = 0;
    const add = (code: string, n: number) => {
      const c = (cards as any)[code] as CD;
      const unique = /\[Unique\]/i.test(c.text);
      const max = unique ? 1 : 3;
      let k = Math.min(n, max - (counts[code] || 0));
      if (isType(c, 'signature')) k = Math.min(k, 3 - sig);
      if (k <= 0) return 0;
      counts[code] = (counts[code] || 0) + k;
      if (isType(c, 'signature')) sig += k;
      return k;
    };
    const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
    // foco primeiro (até 3 de cada), depois o resto em ordem aleatória
    const focusLegal = legal.filter((c) => focus.has(c.code));
    rng.shuffle(focusLegal);
    for (const c of focusLegal) if (total() < 40) add(c.code, Math.min(3, 40 - total()));
    const rest = legal.filter((c) => isImplemented(c.code) || rng.next() < 0.3);
    rng.shuffle(rest);
    for (const c of rest) if (total() < 40) add(c.code, Math.min(1 + rng.int(3), 40 - total()));
    if (total() < 40) continue;
    const main = Object.entries(counts).map(([c, n]) => [c, c === champion ? n - 1 : n] as [string, number]).filter(([, n]) => n > 0);
    const doms = [...ident];
    const runes: [string, number][] = doms.length === 2 ? [[DOMAIN_RUNE[doms[0]], 6], [DOMAIN_RUNE[doms[1]], 6]] : [[DOMAIN_RUNE[doms[0]], 12]];
    const fb = BFS.filter((b) => focus.has(b.code));
    const bfs: string[] = [];
    const pool = [...(fb.length ? fb : BFS)];
    rng.shuffle(pool);
    for (const b of [...pool, ...BFS]) if (bfs.length < 3 && !bfs.includes(b.code)) bfs.push(b.code);
    const deck: DeckList = fillExtraLegends({ name: `fuzz ${legend.name}`, legend: legend.code, champion, main, runes, battlefields: bfs }, (n) => rng.int(n)); // Neeko
    const rep = checkDeck(deck);
    if (rep.errors.length) continue;
    return deck;
  }
  throw new Error('não consegui montar um deck para o foco');
}

function invariants(g: Game) {
  const e = g.engine;
  for (const p of [0, 1] as P[]) {
    const s = e.pl[p];
    for (const o of Object.values(e.objs).filter((x) => x.owner === p && !x.token)) {
      const inArr = (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'] as const).filter((k) => s[k].includes(o.id));
      if (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'].includes(o.zone)) {
        if (inArr.length !== 1 || inArr[0] !== o.zone) throw new Error(`zona incoerente ${o.code} ${o.zone} ${inArr}`);
      } else if (inArr.length) throw new Error(`carta ${o.code} em ${o.zone} mas também em ${inArr}`);
      if (o.zone === 'board' && !o.loc) throw new Error(`sem local ${o.code}`);
    }
    if (s.pool.energy < 0) throw new Error('pool negativo');
  }
  for (const u of e.units()) if (u.damage < 0) throw new Error('dano negativo');
}

function play(seed: number, focus: Set<string>) {
  const rng = new Rng(seed * 7919 + 13);
  const decks: [DeckList, DeckList] = [buildDeck(rng, focus), buildDeck(rng, focus)];
  const g = new Game({ seed, decks, names: ['A', 'B'] });
  let steps = 0;
  let illegal = 0;
  const ais = [new AiPlayer(0), new AiPlayer(1)];
  while (g.current && steps < 5000) {
    const d = g.current;
    let ans: string[];
    if (USE_AI) ans = ais[d.player].decide(g);
    else if (d.kind === 'action') {
      const non = d.options.filter((o) => o.id !== 'end');
      ans = [non.length && rng.next() < 0.85 ? non[rng.int(non.length)].id : 'end'];
    } else if (d.kind === 'priority' || d.kind === 'focus') {
      const non = d.options.filter((o) => o.id !== 'pass');
      ans = [non.length && rng.next() < 0.4 ? non[rng.int(non.length)].id : 'pass'];
    } else {
      const n = d.min + rng.int(d.max - d.min + 1);
      const pool = [...d.options];
      rng.shuffle(pool);
      ans = pool.slice(0, n).map((o) => o.id);
    }
    if (!g.answer(ans) && ++illegal > 400) throw new Error('muitas jogadas ilegais: ' + g.error);
    invariants(g);
    steps++;
  }
  return { g, decks, steps, illegal };
}

const args = process.argv.slice(2);
const opt = (k: string, d = '') => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const focusCodes = args.includes('--all') ? ALL.map((c) => c.code) : parseCodes(opt('--codes', 'OGN-001..OGN-041'));
const focus = new Set(focusCodes);
const games = Number(opt('--games', '30'));
const start = Number(opt('--seed', '1'));
const played: Record<string, number> = {};
let errors = 0;
let noWinner = 0;
for (let s = start; s < start + games; s++) {
  let res: ReturnType<typeof play> | null = null;
  const t0 = Date.now();
  try {
    res = play(s, focus);
    if (Date.now() - t0 > 20000) console.log(`seed ${s}: lenta (${((Date.now() - t0) / 1000).toFixed(0)}s, ${res.steps} passos)`);
    if (res.g.engine.winner === null) noWinner++;
    for (const l of res.g.engine.log) for (const c of focusCodes) {
      const name = (cards as any)[c].name as string;
      if (l.text.includes(name)) played[c] = (played[c] || 0) + 1;
    }
  } catch (err: any) {
    errors++;
    console.log(`seed ${s}: ERRO ${err.message}`);
    console.log(err.stack?.split('\n').slice(1, 7).join('\n'));
    // reproduz para mostrar o fim do registro
    try {
      const rng = new Rng(s * 7919 + 13);
      const d0 = buildDeck(rng, focus);
      console.log('   deck A:', d0.legend, d0.main.map(([c]) => c).join(' '));
    } catch {
      /* nada */
    }
  }
}
console.log(`\n${games} partidas · ${errors} com erro · ${noWinner} sem vencedor`);
const notImpl = focusCodes.filter((c) => !isImplemented(c) && !/rune|token/i.test((cards as any)[c].type));
if (notImpl.length) console.log('sem script:', notImpl.join(' '));
const cold = focusCodes.filter((c) => isImplemented(c) && !played[c]);
if (cold.length) console.log('nunca apareceram no registro:', cold.join(' '));
