// Testes de cenário do lote "battlefields" (campos OGN-275..298 e Proving Grounds OGS-001..016).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { registerCard } from '../src/engine/script';
import { Game } from '../src/engine/game';
import { JINX_PRECON, LEE_SIN_PRECON } from '../src/decks/origins';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const ORDER = 'OGN-214';

// Ficha de teste com "quando eu conquisto, compre 1" (só neste processo de teste) para o Reckoner's Arena.
registerCard({
  code: 'TOK-MECH',
  triggers: [
    {
      on: 'conquer',
      label: 'Comprar 1 (teste)',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});

/** Troca o campo i por uma carta de campo (e roda o ajuste de entrada dele). */
function setBf(s: Scenario, i: number, code: string) {
  const e = s.e;
  const o = e.newObj(code, i as P, 'battlefieldZone');
  e.bfs[i].objId = o.id;
  e.script(o).bfSetup?.(e, o);
  return o;
}
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Avança passando a prioridade/Focus; `other` responde as demais decisões (undefined = parar). */
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 40) {
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
function endTurn(s: Scenario, other?: (d: Decision) => string[] | undefined) {
  s.pick('Encerrar o turno');
  run(s, other);
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);

// ───────────────────────────── campos ─────────────────────────────

test("Altar to Unity: segurar o campo joga uma ficha Recruit na base", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-275');
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  const rec = s.e.units().filter((u) => u.code === 'TOK-RECRUIT' && u.controller === 0);
  assert.equal(rec.length, 1, s.log(20));
  assert.deepEqual(rec[0].loc, base(0));
});

test("Aspirant's Climb: a partida passa a pedir 9 pontos", () => {
  const g = new Game({
    seed: 3,
    decks: [{ ...JINX_PRECON, battlefields: ['OGN-276'] }, LEE_SIN_PRECON],
    names: ['A', 'B'],
    firstPlayer: 0,
  });
  const e = g.engine;
  assert.equal(e.cfg.victoryScore, 9);
  e.pl[0].points = 8;
  e.cleanup();
  assert.equal(e.winner, null, '8 pontos não vencem');
  e.pl[0].points = 9;
  e.cleanup();
  assert.equal(e.winner, 0);
});

test('Back-Alley Bar: unidade que sai daqui ganha +1 de Might neste turno', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-277');
  const u = s.put(0, 'OGN-136', BF0); // Pit Rookie 2
  s.go();
  moveTo(s, [u.id], 'base de A');
  run(s);
  assert.equal(s.e.might(u), 3, s.log());
});

test('Bandle Tree: dá para esconder duas cartas aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-278');
  assert.equal(s.e.bfs[0].capacity, 2);
  s.put(0, 'OGN-142', BF0);
  const a = s.put(0, 'OGN-168', 'hand'); // Fight or Flight (Hidden)
  const b = s.put(0, 'OGN-053', 'hand'); // Stand United (Hidden)
  s.runes(0, [RUNE.chaos, RUNE.chaos]);
  s.go();
  s.pick('Esconder Fight or Flight');
  s.pick('Esconder Stand United');
  assert.equal(a.zone, 'facedown');
  assert.equal(b.zone, 'facedown');
});

test('Fortified Position: quem defende aqui dá Shield 2 a uma unidade', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-279');
  const poro = s.put(1, 'OGN-052', BF0); // Stalwart Poro 2, Shield 1
  const soul = s.put(0, 'OGN-019', base(0)); // Raging Soul 4
  s.go();
  moveTo(s, [soul.id], 'Fortified Position');
  run(s, (d) => (d.prompt.startsWith('Fortified Position') ? [poro.id] : undefined));
  // Poro defendendo: 2 + 1 + 2 = 5 contra 4
  assert.equal(poro.zone, 'board', s.log(25));
  assert.equal(soul.zone, 'trash');
  assert.equal(s.e.bfs[0].controller, 1);
});

test('Hallowed Tomb: segurar devolve a campeã escolhida do descarte para a zona de campeão', () => {
  const s = new Scenario();
  const e = s.e;
  const champ = e.objs[e.pl[0].champion!];
  setBf(s, 0, 'OGN-281');
  e.toZone(champ, 'trash');
  assert.equal(e.pl[0].champion, null);
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  endTurn(s, yes);
  run(s, yes);
  assert.equal(champ.zone, 'champion', s.log(20));
  assert.equal(e.pl[0].champion, champ.id);
  assert.ok(!e.pl[0].trash.includes(champ.id));
});

test('Navori Fighting Pit: segurar dá Buff a uma unidade aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-283');
  const u = s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(u.buffs, 1, s.log(20));
});

test('Obelisk of Power: cada jogador canaliza 1 runa a mais só na primeira Beginning Phase', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-284');
  s.go();
  endTurn(s); // turno 2: primeiro turno do jogador 1
  assert.equal(s.e.runesOf(1).length, 1 + 3, 'Obelisk + 3 do primeiro canal de quem joga em segundo\n' + s.log(20));
  endTurn(s); // turno 3: jogador 0 (já teve a primeira Beginning Phase)
  assert.equal(s.e.runesOf(0).length, 2);
});

test("The Arena's Greatest: 1 ponto na primeira Beginning Phase de cada jogador", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-290');
  s.go();
  endTurn(s);
  assert.equal(s.e.pl[1].points, 1, s.log(20));
  endTurn(s);
  assert.equal(s.e.pl[0].points, 0);
});

test("Reckoner's Arena: segurar ativa as habilidades de conquista das unidades aqui", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-286');
  s.put(0, 'TOK-MECH', BF0);
  for (let i = 0; i < 3; i++) s.put(0, 'OGN-142', 'hand'); // mão cheia: a lenda (Jinx) não compra
  s.go();
  endTurn(s);
  const hand = s.e.pl[0].hand.length;
  endTurn(s);
  // +1 da compra do turno, +1 da habilidade de conquista ativada
  assert.equal(s.e.pl[0].hand.length, hand + 2, s.log(30));
  assert.ok(s.e.log.some((l) => l.text.includes('1 habilidade(s) de conquista ativada(s)')));
});

test('Sigil of the Storm: conquistar recicla uma das suas runas', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-287');
  s.runes(0, [RUNE.fury, RUNE.calm, RUNE.body]);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u.id], 'Sigil of the Storm');
  run(s, (d) => (d.prompt.startsWith('Sigil of the Storm') ? [d.options[0].id] : undefined));
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.runesOf(0).length, 2, s.log());
});

test('Startipped Peak: segurar pode canalizar 1 runa exaurida', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-288');
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  endTurn(s, yes);
  run(s, yes);
  const runes = s.e.runesOf(0);
  assert.equal(runes.length, 3, '1 do Startipped + 2 do canal\n' + s.log(20));
  assert.equal(runes.filter((r) => r.exhausted).length, 1);
});

test('The Candlelit Sanctum: olha 2, recicla as que quiser, reordena as outras', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-291');
  const rookie = s.put(0, 'OGN-136', 'deckTop');
  const poro = s.put(0, 'OGN-052', 'deckTop'); // topo: Poro, Rookie
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u.id], 'Candlelit Sanctum');
  run(s, (d) => {
    if (d.prompt.includes('quais cartas do topo reciclar')) return [];
    if (d.prompt.includes('fica no topo')) return [rookie.id];
    return undefined;
  });
  const deck = s.e.pl[0].mainDeck;
  assert.deepEqual(deck.slice(0, 2), [rookie.id, poro.id], s.log());
});

test('The Candlelit Sanctum: reciclar uma manda ela para o fundo', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-291');
  const rookie = s.put(0, 'OGN-136', 'deckTop');
  const poro = s.put(0, 'OGN-052', 'deckTop');
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u.id], 'Candlelit Sanctum');
  run(s, (d) => (d.prompt.includes('quais cartas do topo reciclar') ? [poro.id] : undefined));
  const deck = s.e.pl[0].mainDeck;
  assert.equal(deck[0], rookie.id);
  assert.equal(deck[deck.length - 1], poro.id);
});

test('The Dreaming Tree: escolher uma unidade sua aqui com spell compra 1, só a primeira vez no turno', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-292');
  s.put(0, 'OGN-142', BF0);
  s.put(0, 'OGN-058', 'hand'); // Discipline: +2 e compra 1
  s.put(0, 'OGN-058', 'hand');
  s.runes(0, [RUNE.calm, RUNE.calm, RUNE.calm, RUNE.calm]);
  s.go();
  s.pick('Jogar Discipline');
  run(s);
  assert.equal(s.e.pl[0].hand.length, 1 + 1 + 1, 'Discipline + Dreaming Tree\n' + s.log());
  s.pick('Jogar Discipline');
  run(s);
  assert.equal(s.e.pl[0].hand.length, 3, 'segunda vez no turno: só a compra do Discipline');
});

test('The Grand Plaza: segurar com 7 unidades aqui vence a partida', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-293');
  for (let i = 0; i < 7; i++) s.put(0, 'OGN-136', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.winner, 0, s.log());
  assert.equal(s.e.winReason, 'The Grand Plaza');
});

test('The Grand Plaza: com 6 unidades não vence', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-293');
  for (let i = 0; i < 6; i++) s.put(0, 'OGN-136', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.winner, null);
});

test('Trifarian War Camp: +1 de Might só para quem está aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-294');
  const a = s.put(0, 'OGN-136', BF0);
  const b = s.put(0, 'OGN-136', base(0));
  assert.equal(s.e.might(a), 3);
  assert.equal(s.e.might(b), 2);
});

test("Vilemaw's Lair: não dá para mover daqui para a base (nem por efeito)", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-295');
  const u = s.put(0, 'OGN-136', BF0);
  s.put(0, 'OGS-011', 'hand'); // Flash
  s.runes(0, [RUNE.chaos, RUNE.chaos]);
  s.go();
  assert.ok(!s.d.options.some((o) => o.id === 'move'), 'sem destino para o movimento padrão');
  s.pick('Jogar Flash');
  s.pickObj(u);
  run(s);
  assert.deepEqual(u.loc, BF0, 'o movimento do Flash é ignorado\n' + s.log());
});

test('Windswept Hillock: unidades aqui têm Ganking', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-297');
  const a = s.put(0, 'OGN-136', BF0);
  const b = s.put(0, 'OGN-136', base(0));
  assert.equal(!!s.e.kw(a).ganking, true);
  assert.equal(!!s.e.kw(b).ganking, false);
  assert.ok(s.e.moveDests([a]).some((l) => l.t === 'bf' && l.i === 1));
});

test('Void Gate: spells causam 1 a mais a unidades aqui (e só aqui)', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-296');
  const here = s.put(1, 'OGN-065', BF0); // Wizened Elder 4
  const there = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGS-003', 'hand'); // Incinerate
  s.put(0, 'OGS-003', 'hand');
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Incinerate');
  s.pickObj(here);
  run(s);
  assert.equal(here.damage, 3, s.log());
  s.pick('Jogar Incinerate');
  s.pickObj(there);
  run(s);
  assert.equal(there.damage, 2);
});

// ───────────────────────────── Proving Grounds ─────────────────────────────

test('Annie, Fiery: seus spells causam 1 a mais; dano das unidades (Gentlemen\'s Duel) não', () => {
  const s = new Scenario();
  s.put(0, 'OGS-001', base(0));
  const elder = s.put(1, 'OGN-065', BF1);
  const rookie = s.put(0, 'OGN-136', base(0));
  const drake = s.put(1, 'OGN-142', { t: 'bf', i: 1 });
  s.put(0, 'OGS-003', 'hand'); // Incinerate
  s.put(0, 'OGS-008', 'hand'); // Gentlemen's Duel
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.body, RUNE.body, RUNE.body, RUNE.body, RUNE.body, RUNE.body, RUNE.body]);
  s.go();
  s.pick('Jogar Incinerate');
  s.pickObj(elder);
  run(s);
  assert.equal(elder.damage, 3, s.log());
  s.pick("Jogar Gentlemen's Duel");
  s.pickObj(rookie);
  s.pickObj(drake);
  run(s);
  // Rookie 2 + 3 = 5 causa 5 ao Drake (10); o Drake causa 10 e mata o Rookie
  assert.equal(drake.damage, 5, s.log());
  assert.equal(rookie.zone, 'trash');
});

test("Gentlemen's Duel: +3 e troca de dano pelo Might", () => {
  const s = new Scenario();
  const rookie = s.put(0, 'OGN-136', base(0));
  const elder = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGS-008', 'hand');
  s.runes(0, Array(7).fill(RUNE.body));
  s.go();
  s.pick("Jogar Gentlemen's Duel");
  s.maybeObj(rookie);
  s.maybeObj(elder);
  run(s);
  assert.equal(elder.zone, 'trash', '5 de dano no Elder (4)\n' + s.log());
  assert.equal(rookie.zone, 'board');
  assert.equal(rookie.damage, 4);
});

test('Firestorm: 3 em cada unidade inimiga do campo escolhido; Lux, Illuminated ganha +3', () => {
  const s = new Scenario();
  const lux = s.put(0, 'OGS-006', base(0)); // Lux, Illuminated 5
  const elder = s.put(1, 'OGN-065', BF0);
  const poro = s.put(1, 'OGN-052', BF0);
  const far = s.put(1, 'OGN-136', BF1);
  s.put(0, 'OGS-002', 'hand');
  s.runes(0, Array(7).fill(RUNE.fury));
  s.go();
  s.pick('Jogar Firestorm');
  s.pick('Campo Vazio A');
  run(s);
  assert.equal(elder.damage, 3, s.log());
  assert.equal(poro.zone, 'trash');
  assert.equal(far.damage, 0);
  assert.equal(s.e.might(lux), 8, 'spell de 6: +3 na Lux');
});

test('Lux, Illuminated: spell barato não dá o bônus', () => {
  const s = new Scenario();
  const lux = s.put(0, 'OGS-006', base(0));
  const elder = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGS-003', 'hand');
  s.runes(0, [RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Incinerate');
  s.maybeObj(elder);
  run(s);
  assert.equal(elder.damage, 2);
  assert.equal(s.e.might(lux), 5);
});

test('Master Yi, Meditative: +4 com 8 runas ou mais', () => {
  const s = new Scenario();
  const yi = s.put(0, 'OGS-004', base(0));
  s.runes(0, Array(7).fill(RUNE.calm));
  assert.equal(s.e.might(yi), 4);
  s.runes(0, [RUNE.calm]);
  assert.equal(s.e.might(yi), 8);
});

test('Annie, Stubborn: ao jogar, devolve um spell do descarte para a mão', () => {
  const s = new Scenario();
  const spell = s.put(0, 'OGS-003', 'trash');
  const unit = s.put(0, 'OGN-136', 'trash');
  s.put(0, 'OGS-010', 'hand');
  s.runes(0, Array(5).fill(RUNE.chaos));
  s.go();
  s.pick('Jogar Annie, Stubborn');
  run(s, (d) => (d.prompt.includes('onde') ? [d.options[0].id] : undefined));
  assert.equal(spell.zone, 'hand', s.log());
  assert.equal(unit.zone, 'trash');
});

test('Flash: até 2 unidades suas voltam para a base', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-136', BF0);
  const b = s.put(0, 'OGN-142', BF0);
  s.put(0, 'OGS-011', 'hand');
  s.runes(0, [RUNE.chaos, RUNE.chaos]);
  s.go();
  s.pick('Jogar Flash');
  s.ok([a.id, b.id]);
  run(s);
  assert.deepEqual(a.loc, base(0));
  assert.deepEqual(b.loc, base(0));
});

test('Blast of Power: mata uma unidade num campo', () => {
  const s = new Scenario();
  const t = s.put(1, 'OGN-142', BF1);
  s.put(1, 'OGN-136', base(1));
  s.put(0, 'OGS-012', 'hand');
  s.runes(0, Array(7).fill(ORDER));
  s.go();
  s.pick('Jogar Blast of Power');
  s.maybeObj(t);
  run(s);
  assert.equal(t.zone, 'trash', s.log());
});

test('Garen, Commander: outras unidades aliadas no mesmo lugar têm +1', () => {
  const s = new Scenario();
  const garen = s.put(0, 'OGS-013', BF0);
  const a = s.put(0, 'OGN-136', BF0);
  const b = s.put(0, 'OGN-136', base(0));
  assert.equal(s.e.might(garen), 5);
  assert.equal(s.e.might(a), 3);
  assert.equal(s.e.might(b), 2);
});

test('Lux, Crownguard: exaurir adiciona 2 de energia na hora, sem pilha', () => {
  const s = new Scenario();
  const lux = s.put(0, 'OGS-014', base(0));
  const elder = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGS-003', 'hand'); // Incinerate (2)
  s.go();
  // a Lux entra no pagamento de spells (429.3); aqui ela é ativada à mão antes
  assert.ok(s.d.options.some((o) => o.label === 'Jogar Incinerate'), 'a Lux paga o spell');
  s.pick('Lux, Crownguard: Adicionar');
  assert.equal(s.e.chain.length, 0);
  assert.equal(lux.exhausted, true);
  assert.equal(s.e.pl[0].pool.energy, 2);
  s.pick('Jogar Incinerate');
  s.maybeObj(elder);
  run(s);
  assert.equal(elder.damage, 2, s.log());
  assert.equal(s.e.pl[0].pool.energy, 0);
});

test('Recruit the Vanguard: quatro fichas Recruit, na base ou em campos seus', () => {
  const s = new Scenario();
  s.put(0, 'OGN-142', BF0);
  s.put(0, 'OGS-015', 'hand');
  s.runes(0, Array(7).fill(ORDER));
  s.go();
  s.pick('Jogar Recruit the Vanguard');
  let k = 0;
  run(s, (d) => (d.prompt.startsWith('Recruit the Vanguard') ? [d.options[k++ < 3 ? 0 : 1].id] : undefined));
  const rec = s.e.units().filter((u) => u.code === 'TOK-RECRUIT');
  assert.equal(rec.length, 4, s.log());
  assert.equal(rec.filter((u) => u.loc?.t === 'base').length, 3);
  assert.equal(rec.filter((u) => u.loc?.t === 'bf').length, 1);
});

test('Master Yi, Honed e Vanguard Attendant entram prontos', () => {
  const s = new Scenario();
  s.put(0, 'OGS-016', 'hand');
  s.runes(0, Array(7).fill(ORDER));
  s.go();
  s.pick('Jogar Vanguard Attendant');
  run(s, (d) => (d.prompt.includes('onde') ? [d.options[0].id] : undefined));
  const u = s.e.units().find((x) => x.code === 'OGS-016')!;
  assert.equal(u.exhausted, false);
});
