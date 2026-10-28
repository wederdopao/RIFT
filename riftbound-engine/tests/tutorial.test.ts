// Tutorial "Aprender a jogar": o roteiro inteiro roda pelo motor (decks em ordem fixa, oponente por roteiro) e cada
// passo aceita só a jogada dele.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/cards';
import { Game } from '../src/engine/game';
import { C, STEPS, advance, card, oppAnswer, tutorialConfig } from '../src/ui/tutorial-script';

function run(opts: { wrong?: boolean } = {}) {
  const g = new Game(tutorialConfig());
  const e = () => g.engine;
  let i = 0;
  const seen: string[] = [];
  const at: Record<string, { pts: number[]; turn: number }> = {};
  for (let k = 0; k < 400 && g.current && e().winner === null; k++) {
    const d = g.current;
    if (d.player === 1) {
      assert.ok(g.answer(oppAnswer(d, e())), `oponente: ${d.prompt} ${g.error}`);
      continue;
    }
    i = advance(i, e(), d);
    const s = STEPS[i];
    if (!seen.includes(s.id)) {
      seen.push(s.id);
      at[s.id] = { pts: e().pl.map((p) => p.points), turn: e().turn };
    }
    if (s.kind === 'info' || s.kind === 'read') {
      i++;
      continue;
    }
    if (d.kind === 'mulligan') {
      assert.ok(g.answer([]));
      continue;
    }
    if (s.kind === 'watch') {
      assert.ok(d.options.some((o) => o.id === 'pass'), `passo ${s.id}: decisão sua inesperada: ${d.prompt}`);
      assert.ok(g.answer(['pass']));
      continue;
    }
    assert.equal(s.kind, 'act', `passo ${s.id} com decisão sua: ${d.prompt}`);
    const ans = s.solve?.(d, e()) ?? (d.min === 0 ? [] : [d.options[0].id]);
    if (opts.wrong && d.root) {
      // qualquer outra opção raiz é recusada pelo passo
      for (const o of d.options) if (o.id !== ans[0]) assert.ok(s.allow!(d, [o.id], e()), `passo ${s.id} aceitou ${o.id}`);
    }
    assert.equal(s.allow?.(d, ans, e()) ?? null, null, `passo ${s.id} recusou a própria solução ${ans}`);
    assert.ok(g.answer(ans), `passo ${s.id}: ${d.prompt} → ${ans}: ${g.error}\n${e().log.slice(-14).map((l) => l.text).join("\n")}`);
  }
  i = advance(i, e(), g.current);
  return { g, e: e(), i, seen, at };
}

test('tutorial: o roteiro vai do começo à vitória passando por todos os passos', () => {
  const { e, i, seen, at } = run({ wrong: true });
  assert.equal(e.winner, 0);
  assert.equal(e.pl[0].points, 9); // segura os dois campos no turno 7
  assert.equal(STEPS[i].id, 'win');
  for (const s of STEPS) if (s.kind !== 'watch' && s.kind !== 'end') assert.ok(seen.includes(s.id), `passo não visto: ${s.id}`);
  assert.deepEqual(at.goal.pts, [4, 4]);
  assert.deepEqual(at.conquer.pts, [5, 4]);
  assert.deepEqual(at.hold.pts, [6, 5]);
  assert.deepEqual(at.result.pts, [7, 5]);
  assert.equal(at.result.turn, 5);
  // o combate: o Animus morreu, o Laurent sobreviveu e conquistou
  assert.equal(card(e, 1, C.animus)!.zone, 'trash');
  assert.equal(card(e, 0, C.laurent)!.zone, 'board');
  assert.ok(e.log.some((l) => /Dano de combate: Você 5 × 4 Oponente/.test(l.text)), 'dano 5 × 4');
  assert.ok(e.log.some((l) => /segura \(hold\)/.test(l.text) && /→ [89]/.test(l.text)), 'vitória por hold');
});

test('tutorial: o primeiro turno paga exaurindo as duas runas e reciclando a de Body', () => {
  const g = new Game(tutorialConfig());
  g.answer([]);
  g.answer([]);
  const e = g.engine;
  assert.deepEqual(e.runesOf(0).map((r) => r.code).sort(), ['OGN-042', 'OGN-126']);
  const sv = card(e, 0, C.survivor)!;
  assert.ok(g.answer([`play:${sv.id}:hand`]), g.error ?? '');
  assert.equal(sv.zone, 'board');
  const rs = e.runesOf(0);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].code, 'OGN-042');
  assert.ok(rs[0].exhausted);
});
