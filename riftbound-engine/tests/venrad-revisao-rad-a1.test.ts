// Revisão independente do Radiance, RAD-001..RAD-021: um teste por erro achado.
// Rodar: node --import tsx --test tests/venrad-revisao-rad-a1.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import type { Ctx } from '../src/engine/script';
import { banishTopPlayable } from '../src/cards/radiance/_rad';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5

function pickTargets(s: Scenario, ids: string[]) {
  const opts = s.d.options.filter((o) => ids.includes(o.obj ?? o.id));
  s.ok(opts.map((o) => o.id));
}
/** O oponente com uma Reaction barata e uma runa: recebe prioridade com o spell na pilha. */
function giveReaction(s: Scenario) {
  s.put(1, 'UNL-031', 'hand'); // Combat Experience [Reaction] [1]
  s.runes(1, [RUNE.calm]);
}
function passAll(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}

// ───────────── RAD-007 Rally for War: o campo é alvo e é conferido na resolução ─────────────
test('Rally for War: três Recruits no campo inimigo ocupado escolhido', () => {
  const s = new Scenario();
  s.put(1, UNIT, BF1);
  s.put(0, 'RAD-007', 'hand');
  s.runes(0, rs(RUNE.fury, 4));
  s.go();
  s.pick('Jogar Rally for War');
  passAll(s);
  const rec = s.e.units().filter((u) => u.code === 'TOK-RECRUIT' && u.controller === 0 && s.e.bfIndex(u) === 1);
  assert.equal(rec.length, 3, s.log());
});

test('Rally for War: campo deixou de ser ocupado antes de resolver → alvo ilegal, nenhuma ficha (355.7, 359.3.e)', () => {
  const s = new Scenario();
  const foe = s.put(1, UNIT, BF1);
  giveReaction(s);
  s.put(0, 'RAD-007', 'hand');
  s.runes(0, rs(RUNE.fury, 4));
  s.go();
  s.pick('Jogar Rally for War');
  assert.ok(s.e.chain.length > 0, 'spell na pilha');
  foe.loc = base(1); // em resposta, a unidade inimiga sai do campo (o campo segue do oponente, mas vazio)
  s.go();
  passAll(s);
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-RECRUIT').length, 0, s.log());
});

// ───────────── RAD-006 Scorched Earth: restrição coletiva "um único campo" (355.11.b) ─────────────
test('Scorched Earth: alvo que vai para outro campo — o controlador escolhe qual grupo fica (355.11.b)', () => {
  const s = new Scenario();
  const a = s.put(1, UNIT, BF0);
  const b = s.put(1, UNIT, BF0);
  giveReaction(s);
  s.put(0, 'RAD-006', 'hand');
  s.runes(0, rs(RUNE.fury, 5));
  s.go();
  s.pick('Jogar Scorched Earth');
  if (!s.d.root && s.d.prompt.includes('em qual campo')) s.pick('Campo Vazio A');
  pickTargets(s, [a.id, b.id]);
  assert.ok(s.e.chain.length > 0, 'spell na pilha');
  b.loc = BF1; // em resposta, b vai para o outro campo
  s.go();
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.includes('manter os de qual campo')) s.pick('Campo Vazio B');
    else if (s.d.prompt.includes('quanto dano')) s.ok([s.d.options[s.d.options.length - 1].id]);
    else break;
  }
  assert.equal(b.zone, 'trash', 'b (no campo B) recebe os 5: ' + s.log());
  assert.equal(a.damage, 0, s.log());
});

// ───────────── banir o topo e poder jogar "até o seu próximo Ending Phase" (RAD-012, RAD-015) ─────────────
test('Runeblade Anvil/Akali: a permissão acaba quando o Ending Phase começa e vale só para aquele objeto', () => {
  const s = new Scenario();
  s.runes(0, rs('OGN-089', 4));
  const top = s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const c = { g: s.e, p: 0 as P } as unknown as Ctx;
  banishTopPlayable(c);
  assert.equal(top.zone, 'banish');
  const has = () => s.e.actionOptions(0, 'priority').some((o) => o.id === `play:${top.id}:banished`) || s.e.actionOptions(0, 'main').some((o) => o.id === `play:${top.id}:banished`);
  assert.ok(has(), 'jogável no próprio turno');
  s.e.phase = 'ending';
  assert.ok(!has(), 'no Ending Phase do mesmo turno já não vale');
  s.e.phase = 'main';
  // sai e volta para a zona de banidas: é outro objeto (124.1), sem a permissão
  s.e.toZone(top, 'trash');
  s.e.toZone(top, 'banish');
  assert.ok(!has(), 'outro objeto não herda a permissão');
});

test('Banir o topo durante o próprio Ending Phase: vale até o Ending Phase do seu próximo turno', () => {
  const s = new Scenario();
  const top = s.put(0, 'RAD-054', 'deckTop');
  s.go();
  s.e.phase = 'ending';
  banishTopPlayable({ g: s.e, p: 0 as P } as unknown as Ctx);
  assert.equal(top.data?.playUntil, s.e.turn + 2);
});

// ───────────── RAD-020 Mordekaiser: "exhaust me" emite o evento de exaurir ─────────────
test("Mordekaiser, Twice Slain: a substituição exaure de verdade (evento 'exhaust') e chama de volta", () => {
  const s = new Scenario();
  const m = s.put(0, 'RAD-020', BF0, { ready: true });
  const fodder = s.put(0, 'RAD-054', base(0));
  s.go();
  const seen: string[] = [];
  const orig = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    seen.push(ev.type + ':' + (ev.obj?.id ?? ev.unit?.id ?? ''));
    orig(ev);
  };
  s.e.killAll([m]);
  assert.equal(m.zone, 'board', s.log());
  assert.deepEqual(m.loc, base(0));
  assert.equal(m.exhausted, true);
  assert.equal(fodder.zone, 'trash');
  assert.ok(seen.includes(`exhaust:${m.id}`), seen.join(','));
});
