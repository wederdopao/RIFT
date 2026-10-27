// Histórico de partidas e estatísticas por deck (src/ui/history.ts, src/ui/account.ts), sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage, seedHistory } from '../scripts/histseed';
import '../src/cards';
import { Game } from '../src/engine/game';

test('histórico: grava, abre o replay, conta estatísticas e não duplica', async () => {
  fakeStorage();
  const { acc, hist, mine } = await seedHistory(3);
  const list = hist.list();
  assert.ok(list.length >= 3, `partidas gravadas: ${list.length}`);
  for (const e of list) {
    assert.equal(e.rz, 'd', 'replay compactado');
    const r = await hist.replayOf(e.id);
    assert.ok(r, 'replay abre');
    const g = Game.load(JSON.stringify(r));
    assert.equal(g.engine.winner, e.winner, 'o replay refaz a mesma partida');
    assert.equal(g.engine.turn, e.turns);
    assert.ok(e.decks[e.seat].deck?.startsWith('my:'), 'achou o deck salvo usado');
  }
  // estatísticas: cada partida conta no deck do lado da conta
  const games = mine.reduce((a, m) => a + (acc.getDeck(m.sd.id)!.stats?.g || 0), 0);
  assert.equal(games, list.length);
  for (const m of mine) {
    const d = acc.getDeck(m.sd.id)!;
    if (!d.stats) continue;
    const plays = Object.values(d.stats.cards).reduce((a, x) => a + x.p, 0);
    assert.ok(plays > 0, 'cartas jogadas contadas');
    for (const [c, x] of Object.entries(d.stats.cards)) {
      assert.ok(d.main[c], `carta ${c} é do deck`);
      if (x.p) assert.ok(x.t / x.p >= 1, 'turno médio >= 1');
    }
    const vs = Object.values(d.stats.vs).reduce((a, v) => a + v.g, 0);
    assert.equal(vs, d.stats.g);
    assert.equal(acc.deckRecord(d).g, d.stats.g);
  }
  // a mesma partida de novo não entra outra vez
  const before = JSON.stringify(acc.profile().decks.map((d) => d.stats));
  const e0 = list[0];
  const r0 = (await hist.replayOf(e0.id))!;
  const g0 = Game.load(JSON.stringify(r0));
  hist.recordGame(g0, { mode: 'ai', seat: 0, prefer: [null, null] });
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(hist.list().length, list.length);
  assert.equal(JSON.stringify(acc.profile().decks.map((d) => d.stats)), before);
});

test('histórico: sem espaço, tira replays antigos e não quebra', async () => {
  // a conta e o histórico do teste anterior continuam na memória e precisam caber no aparelho "pequeno"
  const st = fakeStorage(6000);
  const { hist } = await seedHistory(3, 200);
  const list = hist.list();
  assert.ok(list.length >= 1);
  assert.ok(list[0].replay, 'a partida mais nova fica com o replay');
  assert.ok(list.some((e) => e.dropped) || list.length < 6, 'replays (ou partidas) antigos saíram para caber');
  assert.ok(hist.lastNote, 'avisa a falta de espaço');
  const total = Object.entries(st.dump()).reduce((a, [k, v]) => a + k.length + v.length, 0);
  assert.ok(total <= 6000);
});

test('conta: decks antigos (sem campos novos) continuam valendo', async () => {
  fakeStorage();
  const acc = await import('../src/ui/account');
  const { DECKS } = await import('../src/decks/origins');
  const d = acc.fromDeckList(DECKS[0]);
  const old = JSON.parse(JSON.stringify({ ...d, wins: 3, losses: 1 }));
  delete old.cover;
  delete old.stats;
  acc.saveDeck(old);
  assert.ok(acc.validate(old).ok);
  assert.deepEqual(acc.deckRecord(old), { g: 4, w: 3, l: 1, avgTurns: null });
  // primeira partida nova: o placar antigo entra nas estatísticas
  acc.recordMatch('x-1', `my:${old.id}`, { won: true, countWL: true, turns: 12, oppLegend: 'OGN-257', played: [['OGN-001', 3]], dead: [], cards: ['OGN-001'] });
  const r = acc.deckRecord(acc.getDeck(old.id)!);
  assert.deepEqual(r, { g: 5, w: 4, l: 1, avgTurns: 12 });
  assert.equal(acc.matchDeckChoice(DECKS[0], []), `my:${old.id}`);
  // cópia guarda a origem e começa sem estatísticas
  const c = acc.duplicateDeck(acc.getDeck(old.id)!);
  assert.equal(c.origin, old.id);
  assert.equal(c.stats, undefined);
});
