// Revisão independente do lote "legends" do Spiritforged (SFD-181..221): um teste por erro achado e corrigido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { checkDeck } from '../src/engine/deckcheck';
import { JINX_PRECON } from '../src/decks/origins';
import type { Decision, Obj, P } from '../src/engine/types';
import type { DeckList } from '../src/engine/engine';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function legend(s: Scenario, p: P, code: string): Obj {
  const e = s.e;
  e.legendOf(p).zone = 'gone';
  const o = e.newObj(code, p, 'legend');
  e.pl[p].legend = o.id;
  return o;
}
function runes(s: Scenario, p: P, code: string, n: number) {
  s.runes(p, Array.from({ length: n }, () => code));
}
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 80) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      if (!a) return;
      s.ok(a);
    }
  }
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);
const ezrealReady = (s: Scenario) => s.d.options.some((o) => o.label.includes('Exaurir: comprar 1'));

// ───────────── Ezreal, Prodigal Explorer ─────────────

test('Ezreal, Prodigal Explorer: um spell que escolhe duas unidades inimigas já conta duas vezes (RiftJudge #6758)', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-199');
  runes(s, 0, RUNE.chaos, 3);
  const a = s.put(1, 'OGN-142', BF0);
  const b = s.put(1, 'OGN-052', BF1);
  s.put(0, 'SFD-196', 'hand'); // Defiant Dance: +2 numa unidade e -2 em outra
  s.go();
  assert.ok(!ezrealReady(s));
  s.pick('Jogar Defiant Dance');
  s.pickObj(a);
  s.maybeObj(b);
  run(s);
  assert.ok(ezrealReady(s), 'duas unidades inimigas escolhidas pelo mesmo spell');
});

test('Ezreal, Prodigal Explorer: uma unidade inimiga e uma aliada no mesmo spell contam uma vez só', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-199');
  runes(s, 0, RUNE.chaos, 3);
  const foe = s.put(1, 'OGN-142', BF0);
  const mine = s.put(0, 'OGN-052', BF1);
  s.put(0, 'SFD-196', 'hand');
  s.go();
  s.pick('Jogar Defiant Dance');
  s.pickObj(mine);
  s.maybeObj(foe);
  run(s);
  assert.ok(!ezrealReady(s));
});

// ───────────── Renata Glasc, Chem-Baroness ─────────────

test('Renata Glasc: perto da vitória, o jogador pode pagar a energia com Gold em vez de exaurir runa', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-201');
  runes(s, 0, RUNE.chaos, 2);
  const gold = s.e.createToken('TOK-GOLD', 0, base(0), true);
  s.e.pl[0].points = s.e.cfg.victoryScore - 3;
  const tgt = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-169', 'hand'); // Gust: 1 de energia
  s.go();
  const labels = s.e.payChoices(0, { energy: 1, power: [] }, true).map((c) => c.label);
  assert.ok(labels.some((l) => l.includes('Usar 1 Gold')), labels.join(' | '));
  assert.ok(labels.some((l) => l.includes('Exaurir 1 runa') && !l.includes('Gold')), labels.join(' | '));
  s.payChoice = 'Usar 1 Gold';
  s.pick('Jogar Gust');
  s.maybeObj(tgt);
  run(s, yes);
  assert.notEqual(gold.zone, 'board', 'o Gold foi usado (morto)');
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 2, 'nenhuma runa exaurida');
  assert.equal(tgt.zone, 'hand');
});

test('Renata Glasc: longe da vitória o Gold não paga energia e não vira opção de pagamento', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-201');
  runes(s, 0, RUNE.chaos, 2);
  s.e.createToken('TOK-GOLD', 0, base(0), true);
  s.e.pl[0].points = 0;
  s.go();
  const labels = s.e.payChoices(0, { energy: 1, power: [] }, true).map((c) => c.label);
  assert.ok(!labels.some((l) => l.includes('Gold')), labels.join(' | '));
});

// ───────────── fichas de Gold são jogadas (185.2.a) ─────────────

test('Treasure Hoard: o Gold jogado é uma jogada de gear (Pit Crew prepara)', () => {
  const s = new Scenario();
  const e = s.e;
  const hoard = e.newObj('SFD-220', 0, 'battlefieldZone');
  e.bfs[0].objId = hoard.id;
  runes(s, 0, RUNE.chaos, 2);
  const crew = s.put(0, 'OGN-091', base(0), { ready: false });
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([u.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick(e.name(hoard));
  run(s, yes);
  assert.ok(e.gearOf(0).some((g) => g.code === 'TOK-GOLD'), s.log(20));
  assert.equal(crew.exhausted, false, 'Pit Crew: "quando você joga um gear, me prepare"');
});

// ───────────── deckcheck: Signature ─────────────

function deckWith(legendCode: string, champion: string, extra: [string, number][]): DeckList {
  return { ...JINX_PRECON, legend: legendCode, champion, main: [...JINX_PRECON.main.map(([c, n]) => [c, n] as [string, number]), ...extra] };
}

test('Deckcheck: no máximo 3 cartas Signature no total, todas com a tag da lenda (103.2.d.1, 103.2.d.2)', () => {
  const four = checkDeck(deckWith('OGN-251', 'OGN-030', [['OGN-252', 3], ['SFD-186', 1]]));
  assert.ok(four.errors.some((x) => x.includes('4 cartas Signature')), four.errors.join(' | '));
  assert.ok(four.errors.some((x) => x.includes('Spinning Axe') && x.includes('Signature de outro')), four.errors.join(' | '));
  const three = checkDeck(deckWith('OGN-251', 'OGN-030', [['OGN-252', 3]]));
  assert.ok(!three.errors.some((x) => x.includes('Signature')), three.errors.join(' | '));
});

test('Deckcheck: Signature + Unique (825.3.b): três Signatures diferentes do Ornn valem, duas cópias de uma não', () => {
  const ok = checkDeck(deckWith('SFD-189', 'SFD-085', [['SFD-190', 1], ['SFD-191', 1], ['SFD-192', 1]]));
  assert.ok(!ok.errors.some((x) => x.includes('Signature') || x.includes('Unique')), ok.errors.join(' | '));
  const dup = checkDeck(deckWith('SFD-189', 'SFD-085', [['SFD-190', 2], ['SFD-191', 1]]));
  assert.ok(dup.errors.some((x) => x.includes('Forgefire Cape') && x.includes('Unique')), dup.errors.join(' | '));
  assert.ok(!dup.errors.some((x) => x.includes('cartas Signature')), dup.errors.join(' | '));
});
