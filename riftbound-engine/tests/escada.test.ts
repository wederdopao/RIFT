// Escada contra a IA (src/decks/ladder.ts, src/ui/ladder.ts): os 5 decks são legais e só têm cartas implementadas,
// cada um joga partidas IA × IA até o fim sem erro, e o progresso (vidas, degraus, hall) anda como deve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/cards';
import { LADDER, LADDER_LIVES } from '../src/decks/ladder';
import { JINX_PRECON, LEE_SIN_PRECON, deckSize } from '../src/decks/origins';
import { checkDeck } from '../src/engine/deckcheck';
import { isImplemented } from '../src/engine/script';
import { kindOf } from '../src/engine/db';
import { Game } from '../src/engine/game';
import type { DeckList } from '../src/engine/engine';
import type { P } from '../src/engine/types';
import { AiPlayer, isAiLevel, quickPick, type AiLevel } from '../src/ai/ai';
import { fakeStorage } from '../scripts/histseed';

test('escada: 5 decks legais no Padrão, só com cartas implementadas, nível subindo e trilhas que existem', () => {
  assert.equal(LADDER.length, 5);
  assert.equal(new Set(LADDER.map((r) => r.id)).size, 5, 'ids diferentes');
  const music = JSON.parse(readFileSync(new URL('../assets/music/index.json', import.meta.url), 'utf8')) as { boards: { id: string }[] };
  const boards = new Set(music.boards.map((b) => b.id));
  const order: AiLevel[] = ['easy', 'normal', 'hard'];
  let prev = 0;
  for (const r of LADDER) {
    const d = r.deck;
    const rep = checkDeck(d);
    assert.deepEqual(rep.errors, [], `${r.id}: ${rep.errors.join('; ')}`);
    assert.deepEqual(rep.banned, [], `${r.id}: banidas ${rep.banned.join(', ')}`);
    assert.equal(deckSize(d), 40, `${r.id}: 40 cartas`);
    assert.equal(d.runes.reduce((a, [, n]) => a + n, 0), 12, `${r.id}: 12 runas`);
    assert.equal(new Set(d.battlefields).size, 3, `${r.id}: 3 campos diferentes`);
    assert.equal(kindOf(d.legend), 'legend');
    for (const c of [d.legend, d.champion, ...d.battlefields, ...d.main.map(([c]) => c)]) assert.ok(isImplemented(c), `${r.id}: ${c} sem script`);
    assert.ok(isAiLevel(r.level));
    const lv = order.indexOf(r.level);
    assert.ok(lv >= prev, `${r.id}: o nível não pode cair (${r.level})`);
    prev = lv;
    assert.ok(boards.has(r.track), `${r.id}: trilha ${r.track} não existe em music/index.json`);
    assert.ok(r.name && r.title && r.quote && r.plan, `${r.id}: nome, apelido, frase e ideia`);
  }
  assert.equal(LADDER[0].level, 'easy');
  assert.equal(LADDER[4].level, 'hard');
  assert.equal(new Set(LADDER.map((r) => r.track)).size, 5, 'uma trilha diferente por degrau');
});

/** Partida IA × IA até o fim, conferindo as zonas a cada passo (como tests/fuzz.ts). */
function aiGame(decks: [DeckList, DeckList], seed: number, levels: [AiLevel, AiLevel]) {
  const g = new Game({ seed, decks, names: ['A', 'B'], firstPlayer: (seed % 2) as P });
  const ais = [new AiPlayer(0, levels[0]), new AiPlayer(1, levels[1])];
  let illegal = 0;
  for (let steps = 0; g.current && steps < 4000; steps++) {
    const ans = ais[g.current.player].decide(g);
    if (!g.answer(ans)) {
      illegal++;
      if (!g.answer(quickPick(g.current!, g.engine))) g.answer([g.current!.options[0].id]);
    }
    const e = g.engine;
    for (const p of [0, 1] as P[]) {
      const s = e.pl[p];
      for (const o of Object.values(e.objs).filter((x) => x.owner === p && !x.token)) {
        const inArr = (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'] as const).filter((k) => s[k].includes(o.id));
        if (['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'].includes(o.zone)) assert.ok(inArr.length === 1 && inArr[0] === o.zone, `zona incoerente ${o.code}`);
        else assert.equal(inArr.length, 0, `${o.code} em ${o.zone} e em ${inArr}`);
      }
      assert.ok(s.pool.energy >= 0, 'pool negativo');
    }
  }
  return { g, illegal };
}

// cada deck da escada contra o próximo e contra um starter, com a IA no nível do degrau (Difícil fica em Normal aqui
// para o teste não demorar: a escolha das jogadas é a mesma máquina, só pensa menos)
for (const [i, r] of LADDER.entries()) {
  test(`escada: ${r.name} joga até o fim, IA × IA, sem erro`, { timeout: 600_000 }, () => {
    const lv: AiLevel = r.level === 'hard' ? 'normal' : r.level;
    const next = LADDER[(i + 1) % LADDER.length].deck;
    const starter = i % 2 ? LEE_SIN_PRECON : JINX_PRECON;
    for (const [k, opp] of [next, starter].entries()) {
      const decks: [DeckList, DeckList] = k ? [opp, r.deck] : [r.deck, opp];
      const { g, illegal } = aiGame(decks, 7100 + i * 10 + k, k ? ['easy', lv] : [lv, 'easy']);
      assert.ok(g.engine.winner !== null, `${r.id} × ${opp.name}: a partida terminou sem vencedor (turno ${g.engine.turn})`);
      assert.ok(illegal < 20, `${r.id}: ${illegal} respostas recusadas da IA`);
    }
  });
}

test('escada: vitória sobe de degrau, derrota gasta vida, sem vidas recomeça, 5 vitórias vão para o hall', async () => {
  fakeStorage();
  const acc = await import('../src/ui/account');
  const lad = await import('../src/ui/ladder');
  lad.ladderStart('pre:0');
  let seed = 1;
  const cfgOf = () => {
    const m = lad.ladderMatch()!;
    assert.ok(m, 'há partida para jogar');
    return { seed: seed++, ladder: m.ladder, aiLevel: m.aiLevel, music: m.music, decks: [JINX_PRECON, m.opp] };
  };
  let run = acc.ladderRun()!;
  assert.equal(run.rung, 0);
  assert.equal(run.lives, LADDER_LIVES);
  assert.equal(lad.ladderMatch()!.aiLevel, LADDER[0].level);
  assert.equal(lad.ladderMatch()!.music, LADDER[0].track);

  // vence o 1º degrau; a mesma partida não conta duas vezes
  const c1 = cfgOf();
  lad.ladderRecord(c1, 0, 0);
  lad.ladderRecord(c1, 0, 0);
  run = acc.ladderRun()!;
  assert.equal(run.rung, 1);
  assert.match(lad.ladderEndButtons(c1) ?? '', /Próximo: Ziggs/);

  // perde o 2º degrau duas vezes: continua nele, com 1 vida
  for (let k = 0; k < 2; k++) lad.ladderRecord(cfgOf(), 1, 0);
  run = acc.ladderRun()!;
  assert.equal(run.rung, 1);
  assert.equal(run.lives, 1);
  // partida de outro degrau (ou de uma escada antiga) não conta
  lad.ladderRecord({ seed: 999, ladder: { rung: 3, started: run.started } } as any, 0, 0);
  lad.ladderRecord({ seed: 998, ladder: { rung: 1, started: run.started - 1 } } as any, 0, 0);
  assert.equal(acc.ladderRun()!.rung, 1);
  // a 3ª derrota acaba com as vidas: volta ao 1º degrau com 3 vidas, mesmo deck
  const c3 = cfgOf();
  lad.ladderRecord(c3, 1, 0);
  run = acc.ladderRun()!;
  assert.equal(run.rung, 0);
  assert.equal(run.lives, LADDER_LIVES);
  assert.equal(run.resets, 1);
  assert.equal(run.losses, 3);
  assert.equal(run.deck, 'pre:0');
  assert.match(lad.ladderEndButtons(c3) ?? '', /Recomeçar/);

  // agora vence os 5
  for (let k = 0; k < 5; k++) lad.ladderRecord(cfgOf(), 0, 0);
  run = acc.ladderRun()!;
  assert.ok(run.done, 'escada vencida');
  assert.equal(lad.ladderMatch(), null, 'nada mais para jogar');
  const hall = acc.ladderHall();
  assert.equal(hall.length, 1);
  assert.equal(hall[0].legend, JINX_PRECON.legend);
  assert.equal(hall[0].losses, 3);
  assert.ok(hall[0].code, 'o código do deck vai junto');
  // depois de vencida, partidas não mexem mais
  lad.ladderRecord({ seed: 5000, ladder: { rung: 4, started: run.started } } as any, 1, 0);
  assert.equal(acc.ladderHall().length, 1);
  // partida sem a marca da escada não é da escada
  assert.equal(lad.ladderEndButtons({ seed: 1 }), null);
});
