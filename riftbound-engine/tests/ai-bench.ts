// Mede a IA: partidas contra um jogador aleatório e IA contra IA, com tempo por decisão.
import '../src/cards';
import { Game } from '../src/engine/game';
import { JINX_PRECON, LEE_SIN_PRECON } from '../src/decks/origins';
import { AiPlayer, quickPick } from '../src/ai/ai';
import { Rng } from '../src/engine/rng';
import type { P } from '../src/engine/types';

type Kind = 'ai' | 'random' | 'passive';

function play(seed: number, kinds: [Kind, Kind], aiSide: P | null = null, swapDecks = false) {
  const decks = swapDecks ? [LEE_SIN_PRECON, JINX_PRECON] : [JINX_PRECON, LEE_SIN_PRECON];
  const g = new Game({ seed, decks: decks as any, names: ['A', 'B'] });
  const ais = [new AiPlayer(0), new AiPlayer(1)];
  const rng = new Rng(seed + 99);
  let maxMs = 0;
  let totalMs = 0;
  let aiDecisions = 0;
  for (let steps = 0; g.current && steps < 3000; steps++) {
    const d = g.current;
    const k = kinds[d.player];
    let ans: string[];
    if (k === 'ai') {
      const t0 = performance.now();
      ans = ais[d.player].decide(g);
      const dt = performance.now() - t0;
      maxMs = Math.max(maxMs, dt);
      totalMs += dt;
      aiDecisions++;
    } else if (k === 'passive') ans = quickPick(d, g.engine);
    else {
      if (d.kind === 'action') {
        const non = d.options.filter((o) => o.id !== 'end');
        ans = [non.length && rng.next() < 0.8 ? non[rng.int(non.length)].id : 'end'];
      } else if (d.kind === 'priority' || d.kind === 'focus') {
        const non = d.options.filter((o) => o.id !== 'pass');
        ans = [non.length && rng.next() < 0.35 ? non[rng.int(non.length)].id : 'pass'];
      } else {
        const n = d.min + rng.int(d.max - d.min + 1);
        const pool = [...d.options];
        rng.shuffle(pool);
        ans = pool.slice(0, n).map((o) => o.id);
      }
    }
    if (!g.answer(ans)) {
      // resposta ilegal: tenta a política rápida
      if (!g.answer(quickPick(g.current!, g.engine))) g.answer([g.current!.options[0].id]);
    }
  }
  void aiSide;
  return { winner: g.engine.winner, turns: g.engine.turn, pts: g.engine.pl.map((p) => p.points), maxMs, avgMs: totalMs / Math.max(1, aiDecisions) };
}

const n = Number(process.argv[2] || 10);
const mode = process.argv[3] || 'random';
let wins = 0;
let maxMs = 0;
let avg = 0;
for (let s = 1; s <= n; s++) {
  const swap = s % 2 === 0;
  const r = mode === 'self' ? play(s, ['ai', 'ai']) : play(s, ['ai', mode as Kind], 0, swap);
  if (r.winner === 0) wins++;
  maxMs = Math.max(maxMs, r.maxMs);
  avg += r.avgMs;
  console.log(`seed ${s}${swap ? ' (IA com Lee Sin)' : ' (IA com Jinx)'}: vencedor ${r.winner} placar ${r.pts.join('×')} turnos ${r.turns} · decisão média ${r.avgMs.toFixed(0)}ms, pior ${r.maxMs.toFixed(0)}ms`);
}
console.log(`IA (jogador 0) venceu ${wins}/${n} · pior decisão ${maxMs.toFixed(0)}ms · média ${(avg / n).toFixed(0)}ms`);
