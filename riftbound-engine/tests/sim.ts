// Joga partidas completas com escolhas aleatórias e verifica invariantes do motor.
import '../src/cards';
import { Game } from '../src/engine/game';
import { JINX_PRECON, LEE_SIN_PRECON } from '../src/decks/origins';
import type { P } from '../src/engine/types';
import { Rng } from '../src/engine/rng';

function checkInvariants(g: Game) {
  const e = g.engine;
  for (const p of [0, 1] as P[]) {
    const s = e.pl[p];
    const objs = Object.values(e.objs).filter((o) => o.owner === p && !o.token);
    // cada carta está em exatamente um lugar coerente
    for (const o of objs) {
      const inArr = (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'] as const).filter((k) => s[k].includes(o.id));
      if (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'].includes(o.zone)) {
        if (inArr.length !== 1 || inArr[0] !== o.zone) throw new Error(`zona incoerente ${o.code} ${o.zone} ${inArr}`);
      } else if (inArr.length) throw new Error(`carta ${o.code} em ${o.zone} mas também em ${inArr}`);
      if (o.zone === 'board' && !o.loc) throw new Error(`sem local ${o.code}`);
      if (o.zone === 'chain' && !e.resolving && !e.chain.some((it) => it.cardId === o.id)) throw new Error(`carta perdida no chain ${o.code}`);
    }
    const main = objs.filter((o) => !['rune', 'legend', 'battlefield'].includes(e.kind(o)));
    if (main.length !== 40) throw new Error(`jogador ${p} tem ${main.length} cartas principais`);
    const runes = objs.filter((o) => e.kind(o) === 'rune');
    if (runes.length !== 12) throw new Error(`jogador ${p} tem ${runes.length} runas`);
    if (s.pool.energy < 0) throw new Error('pool negativo');
  }
  for (const u of e.units()) if (u.damage < 0) throw new Error('dano negativo');
}

export function playRandom(seed: number, verbose = false) {
  const rng = new Rng(seed * 7919 + 13);
  const g = new Game({ seed, decks: [JINX_PRECON, LEE_SIN_PRECON], names: ['Jinx', 'Lee Sin'] });
  let steps = 0;
  let illegal = 0;
  while (g.current && steps < 6000) {
    const d = g.current;
    let ans: string[];
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
    const ok = g.answer(ans);
    if (!ok) {
      illegal++;
      if (illegal > 200) throw new Error('muitas jogadas ilegais: ' + g.error);
      if (verbose) console.log('ilegal:', g.error);
    }
    checkInvariants(g);
    steps++;
  }
  return { winner: g.engine.winner, turns: g.engine.turn, steps, illegal, points: g.engine.pl.map((p) => p.points), g };
}

if (process.argv[1]?.endsWith('sim.ts')) {
  const n = Number(process.argv[2] || 50);
  const res = { 0: 0, 1: 0, none: 0 } as any;
  let turns = 0;
  for (let s = 1; s <= n; s++) {
    try {
      const r = playRandom(s);
      res[r.winner ?? 'none']++;
      turns += r.turns;
      if (r.winner === null) console.log(`seed ${s}: sem vencedor após ${r.steps} passos, turno ${r.turns}, pontos ${r.points}`);
    } catch (err: any) {
      console.log(`seed ${s}: ERRO`, err.stack?.split('\n').slice(0, 6).join('\n'));
      res.none++;
    }
  }
  console.log('resultado', res, 'turnos médios', (turns / n).toFixed(1));
}
