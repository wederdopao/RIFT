// Testes de cenário das cartas do lote "calm" do Spiritforged (SFD-031 a SFD-060). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function where(s: Scenario, text: string) {
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}
const sand = (s: Scenario, p: P) => s.e.units().filter((u) => u.code === 'TOK-SAND' && u.controller === p);
/** Equipa o gear (ação Equip) na unidade. */
function equip(s: Scenario, gear: Obj, unit: Obj) {
  s.pick(`Equipar ${s.e.name(gear)}`);
  s.maybeObj(unit);
}

test("Desert's Call: com Repeat, joga duas fichas Sand Soldier 2", () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'SFD-031', 'hand');
  s.go();
  s.pick("Jogar Desert's Call");
  s.pick('Sim'); // Repeat
  s.passAll();
  assert.equal(sand(s, 0).length, 2, s.log());
  assert.equal(s.e.might(sand(s, 0)[0]), 2);
});

test('Disarming Rake: ao jogar, pode matar um gear (de qualquer jogador)', () => {
  const s = new Scenario();
  const gear = s.put(1, 'SFD-052', base(1));
  s.runes(0, calm(4));
  s.put(0, 'SFD-032', 'hand');
  s.go();
  s.pick('Jogar Disarming Rake');
  where(s, 'base de A');
  s.pick('Sim');
  s.maybeObj(gear);
  s.passAll();
  assert.equal(gear.zone, 'trash', s.log());
});

test("Doran's Shield: Equip [Calm] dá Tank e +1 de Might", () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-052', base(0));
  const sh = s.put(0, 'SFD-033', base(0));
  s.runes(0, calm(1));
  s.go();
  equip(s, sh, u);
  s.passAll();
  assert.equal(sh.attachedTo, u.id, s.log());
  assert.equal(s.e.kw(u).tank, true);
  assert.equal(s.e.might(u), 3);
});

test('Feral Strength: Repeat dá +2 a outra unidade (alvo próprio da repetição)', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-052', base(0));
  const b = s.put(0, 'OGN-065', base(0));
  s.runes(0, calm(4));
  s.put(0, 'SFD-034', 'hand');
  s.go();
  s.pick('Jogar Feral Strength');
  s.pickObj(a);
  s.pick('Sim');
  s.pickObj(b);
  s.passAll();
  assert.equal(s.e.might(a), 4, s.log());
  assert.equal(s.e.might(b), 6);
});

test('Guardian of the Passage: ao segurar, devolve uma unidade do descarte para a mão', () => {
  const s = new Scenario();
  s.put(0, 'SFD-035', BF0);
  const dead = s.put(0, 'OGN-065', 'trash');
  s.go();
  endTurn(s);
  endTurn(s);
  s.pick('Sim');
  s.maybeObj(dead);
  s.passAll();
  assert.equal(dead.zone, 'hand', s.log());
});

test('Lonely Poro: Deathknell compra 1 se morreu sozinho', () => {
  const s = new Scenario();
  const poro = s.put(0, 'SFD-036', base(0));
  s.put(0, 'OGN-052', base(0)); // outra unidade aliada, mas fica na base
  s.put(1, 'OGN-142', BF0); // Mountain Drake 10
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [poro.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(poro.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Lonely Poro: morrendo junto com outra unidade aliada aqui, não está sozinho (FAQ #10890)', () => {
  const s = new Scenario();
  const poro = s.put(0, 'SFD-036', base(0));
  const other = s.put(0, 'OGN-052', base(0));
  s.put(1, 'OGN-142', BF0);
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [poro.id, other.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(poro.zone, 'trash');
  assert.equal(other.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, hand, s.log());
});

test('Ribbon Dancer: ao mover para um campo, dá +1 a outra unidade aliada', () => {
  const s = new Scenario();
  const rd = s.put(0, 'SFD-038', base(0));
  const other = s.put(0, 'OGN-052', base(0));
  s.go();
  moveTo(s, [rd.id], 'Campo Vazio A');
  s.maybeObj(other);
  s.passAll();
  assert.equal(s.e.might(other), 3, s.log());
  assert.equal(s.e.might(rd), 3);
});

test('Royal Entourage: exaure a lenda do oponente', () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'SFD-039', 'hand');
  s.go();
  const leg = s.e.legendOf(1);
  s.pick('Jogar Royal Entourage');
  where(s, 'base de A');
  s.pickObj(leg);
  s.passAll();
  s.pick('Exaurir');
  s.passAll();
  assert.equal(leg.exhausted, true, s.log());
});

test('Thwonk!: só mira unidade atacante; atordoa o atacante no combate', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-052', BF0);
  const atk = s.put(0, 'OGN-065', base(0));
  s.put(1, 'SFD-040', 'hand');
  s.runes(1, calm(2));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  // P0 tem o Focus (passa sozinho, sem opções); P1 joga Thwonk!
  if (s.d.player === 0) s.pick('Passar');
  s.pick('Jogar Thwonk!', 1);
  if (s.d.prompt.includes('Repeat')) s.pick('Não');
  s.maybeObj(atk);
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('Wizened Elder fica atordoada')), s.log(30));
  assert.equal(def.zone, 'board', 'atacante atordoado não causa dano\n' + s.log(30));
});

test('Apprentice Smith: ao mover, gear no topo vai para a mão; outra carta é reciclada', () => {
  const s = new Scenario();
  const smith = s.put(0, 'SFD-041', base(0));
  const g1 = s.put(0, 'SFD-052', 'deckTop');
  s.go();
  moveTo(s, [smith.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(g1.zone, 'hand', s.log());
  // de volta: carta não-gear no topo é reciclada
  const u = s.put(0, 'OGN-052', 'deckTop');
  smith.exhausted = false;
  s.go();
  moveTo(s, [smith.id], 'base de A');
  s.passAll();
  assert.equal(u.zone, 'mainDeck');
  const deck = s.e.pl[0].mainDeck;
  assert.equal(deck[deck.length - 1], u.id, 'foi para o fundo');
});

test('Brutalizer: +3 no turno em que foi anexado, +1 depois', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-052', base(0));
  const br = s.put(0, 'SFD-042', base(0));
  s.runes(0, calm(1));
  s.go();
  equip(s, br, u);
  s.passAll();
  assert.equal(s.e.might(u), 5, s.log());
  s.e.turn++;
  assert.equal(s.e.might(u), 3);
});

test("Emperor's Divide: move unidades aliadas de um campo para a base", () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-052', BF0);
  const b = s.put(0, 'OGN-065', BF0);
  const c = s.put(0, 'OGN-185', BF1);
  s.runes(0, calm(2));
  s.put(0, 'SFD-043', 'hand');
  s.go();
  s.pick("Jogar Emperor's Divide");
  s.pick('Campo Vazio A');
  s.ok([a.id, b.id]);
  s.passAll();
  assert.deepEqual(a.loc, base(0), s.log());
  assert.deepEqual(b.loc, base(0));
  assert.deepEqual(c.loc, BF1, 'unidades de outro campo ficam');
});

test('Legion Quartermaster: precisa devolver um gear seu à mão para ser jogado', () => {
  const s = new Scenario();
  s.runes(0, calm(3));
  const lq = s.put(0, 'SFD-044', 'hand');
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Legion Quartermaster')), 'sem gear não dá para jogar');
  const gear = s.put(0, 'SFD-052', base(0));
  s.go();
  s.pick('Jogar Legion Quartermaster');
  where(s, 'base de A');
  s.passAll();
  assert.equal(gear.zone, 'hand', s.log());
  assert.equal(lq.zone, 'board');
});

test('Not So Fast: anula um spell inimigo que escolhe uma unidade aliada', () => {
  const s = new Scenario();
  const mine = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.put(1, 'SFD-045', 'hand');
  s.runes(1, calm(3));
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(mine);
  assert.equal(s.d.player, 1);
  s.pick('Jogar Not So Fast');
  s.passAll();
  assert.equal(mine.damage, 0, s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('Void Seeker foi anulado')));
});

test('Not So Fast: anula uma habilidade inimiga (gatilho) que escolhe uma unidade aliada', () => {
  const s = new Scenario();
  s.put(0, 'OGN-052', BF0); // A controla o campo A
  const mine = s.put(1, 'OGN-065', base(1));
  s.put(0, 'OGN-067', 'hand'); // Blitzcrank: move uma unidade inimiga para cá
  s.runes(0, calm(6));
  s.put(1, 'SFD-045', 'hand');
  s.runes(1, calm(3));
  s.go();
  s.pick('Jogar Blitzcrank');
  s.pick('Campo Vazio A');
  s.pick('Sim');
  s.maybeObj(mine);
  assert.equal(s.d.player, 1, s.d.prompt);
  s.pick('Jogar Not So Fast');
  s.maybeObj(s.e.units()[0]); // (só há um candidato: a habilidade)
  s.passAll();
  assert.deepEqual(mine.loc, base(1), 'a habilidade foi anulada\n' + s.log(20));
  assert.ok(s.e.log.some((l) => l.text.includes('foi anulado')));
});

test('Not So Fast: não pode mirar spell que escolhe só unidade inimiga', () => {
  const s = new Scenario();
  const theirs = s.put(0, 'OGN-065', BF0);
  s.put(0, 'OGN-024', 'hand');
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.put(1, 'SFD-045', 'hand');
  s.runes(1, calm(3));
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(theirs);
  s.passAll();
  assert.equal(theirs.zone, 'trash', s.log());
});

test('Poro Snax: compra 1 ao jogar; [1][Calm], exaurir, matar: compra 1', () => {
  const s = new Scenario();
  s.runes(0, calm(3));
  const snax = s.put(0, 'SFD-046', 'hand');
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Poro Snax');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1');
  s.pick('Poro Snax: [1]');
  s.passAll();
  assert.equal(snax.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Simian Ancestor: quando você lhe dá um Buff, prepara-se', () => {
  const s = new Scenario();
  const sim = s.put(0, 'SFD-047', base(0), { ready: false });
  s.put(0, 'OGN-063', 'hand'); // Spirit's Refuge: ao jogar, dá Buff a uma unidade aliada
  s.runes(0, calm(3));
  s.go();
  s.pick("Jogar Spirit's Refuge");
  s.passAll();
  s.maybeObj(sim);
  s.passAll();
  assert.equal(sim.buffs, 1, s.log());
  assert.equal(sim.exhausted, false, s.log());
});

test('Stellacorn Herder: ao mover, compra 1', () => {
  const s = new Scenario();
  const h = s.put(0, 'SFD-048', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [h.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Aphelios: cada anexar escolhe um modo ainda não escolhido no turno', () => {
  const s = new Scenario();
  const aph = s.put(0, 'SFD-049', base(0));
  const sh = s.put(0, 'SFD-033', base(0));
  const br = s.put(0, 'SFD-042', base(0));
  s.runes(0, calm(5));
  s.go();
  equip(s, sh, aph);
  s.passAll();
  const runes = s.e.runesOf(0).length;
  s.pick('Canalizar');
  s.passAll();
  assert.equal(s.e.runesOf(0).length, runes + 1, s.log());
  equip(s, br, aph);
  s.passAll();
  assert.ok(!s.d.options.some((o) => o.label.includes('Canalizar')), 'modo já escolhido neste turno');
  s.pick('Buff');
  s.maybeObj(aph);
  s.passAll();
  assert.equal(aph.buffs, 1, s.log());
});

test('Aphelios + Svellsongur: anexar o Svellsongur dispara uma vez; o próximo dispara duas, com modos próprios', () => {
  const s = new Scenario();
  const aph = s.put(0, 'SFD-049', base(0));
  const sv = s.put(0, 'SFD-059', base(0));
  const sh = s.put(0, 'SFD-033', base(0));
  s.runes(0, calm(4));
  s.go();
  equip(s, sv, aph);
  s.passAll();
  s.pick('Canalizar');
  s.passAll();
  assert.equal(s.d.kind, 'action', 'só uma instância disparou\n' + s.log());
  equip(s, sh, aph);
  s.passAll();
  // duas instâncias: escolher a ordem
  if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
  // 1ª instância: já escolheu Canalizar neste turno → só Preparar/Buff; 2ª instância: pode Canalizar
  const opts = () => s.d.options.map((o) => o.label).join('|');
  const first = opts();
  s.pick(first.includes('Canalizar') ? 'Canalizar' : 'Buff');
  s.maybeObj(aph);
  const second = opts();
  assert.notEqual(first.includes('Canalizar'), second.includes('Canalizar'), `${first} / ${second}`);
  s.pick(second.includes('Canalizar') ? 'Canalizar' : 'Buff');
  s.maybeObj(aph);
  s.passAll();
  assert.equal(aph.buffs, 1, s.log());
});

test('Azir, Ascendant: troca de lugar com uma unidade sua e pega um Equipment dela; uma vez por turno', () => {
  const s = new Scenario();
  const azir = s.put(0, 'SFD-050', base(0));
  const u = s.put(0, 'OGN-052', BF0);
  const sh = s.put(0, 'SFD-033', BF0);
  s.e.attach(sh, u);
  s.runes(0, calm(2));
  s.go();
  s.pick('Azir, Ascendant: [Calm]');
  s.pickObj(u);
  s.passAll();
  s.pickObj(sh);
  s.passAll();
  assert.deepEqual(azir.loc, BF0, s.log());
  assert.deepEqual(u.loc, base(0));
  assert.equal(sh.attachedTo, azir.id);
  assert.equal(s.e.kw(azir).tank, true);
  assert.ok(!s.d.options.some((o) => o.label.includes('Azir, Ascendant: [Calm]')), 'só uma vez por turno');
});

test('Guardian Angel: a unidade não morre; o Guardian Angel morre e ela volta curada e exausta; outros equipamentos ficam', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  const ga = s.put(0, 'SFD-051', BF0);
  const sh = s.put(0, 'SFD-033', BF0);
  s.e.attach(ga, u);
  s.e.attach(sh, u);
  u.damage = 2;
  s.e.kill(u);
  assert.equal(u.zone, 'board');
  assert.deepEqual(u.loc, base(0));
  assert.equal(u.exhausted, true);
  assert.equal(u.damage, 0);
  assert.equal(ga.zone, 'trash');
  assert.equal(sh.attachedTo, u.id);
  s.e.kill(u);
  assert.equal(u.zone, 'trash', 'sem Guardian Angel, morre');
});

test('Guardian Angel: com dois, só um é usado (FAQ #9026)', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  const g1 = s.put(0, 'SFD-051', BF0);
  const g2 = s.put(0, 'SFD-051', BF0);
  s.e.attach(g1, u);
  s.e.attach(g2, u);
  s.e.kill(u);
  assert.equal(u.zone, 'board');
  assert.equal([g1, g2].filter((x) => x.zone === 'trash').length, 1);
});

test('Heart of Dark Ice: exaurir dá +3 a uma unidade', () => {
  const s = new Scenario();
  const u = s.put(1, 'OGN-052', BF0);
  const h = s.put(0, 'SFD-052', base(0));
  s.go();
  s.pick('Heart of Dark Ice');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 5, s.log());
  assert.equal(h.exhausted, true);
});

test('Janna, Savior: cura as suas unidades aqui e manda até uma inimiga daqui para a base', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-065', BF0);
  mine.damage = 3;
  const enemy = s.put(1, 'OGN-052', BF0);
  s.runes(0, calm(4));
  s.put(0, 'SFD-053', 'hand');
  s.go();
  s.pick('Jogar Janna');
  s.pick('Campo Vazio A');
  s.pickObj(enemy);
  s.passAll();
  assert.equal(mine.damage, 0, s.log());
  assert.deepEqual(enemy.loc, base(1));
});

test('Jax, Unmatched: os seus Equipment na mão têm Quick-Draw (Reaction e anexar ao jogar)', () => {
  const s = new Scenario();
  const jax = s.put(0, 'SFD-054', base(0));
  const sh = s.put(0, 'SFD-033', 'hand');
  const other = s.put(1, 'SFD-033', 'hand');
  assert.equal(s.e.kw(sh).quickDraw, true);
  assert.equal(s.e.kw(other).quickDraw, undefined, 'só os seus');
  s.runes(0, calm(1));
  s.go();
  s.pick("Jogar Doran's Shield");
  s.maybeObj(jax);
  s.passAll();
  assert.equal(sh.attachedTo, jax.id, s.log());
  assert.equal(s.e.kw(jax).deflect, 1);
});

test('Needlessly Large Yordle: custa [2][Calm] a menos por ponto ganho segurando neste turno', () => {
  const s = new Scenario();
  const y = s.put(0, 'SFD-055', 'hand');
  assert.deepEqual(s.e.minCostFor(0, y, 'hand'), { energy: 10, power: [['Calm'], ['Calm'], ['Calm']] });
  s.e.pl[0].holdPoints = 2;
  assert.deepEqual(s.e.minCostFor(0, y, 'hand'), { energy: 6, power: [['Calm']] });
  s.e.pl[0].holdPoints = 0;
  assert.equal(s.e.minCostFor(0, y, 'hand').energy, 10);
});

test('Needlessly Large Yordle: segurar um campo conta o ponto ganho', () => {
  const s = new Scenario();
  s.put(0, 'OGN-052', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.pl[0].holdPoints, 1, s.log());
});

test("Sterak's Gage: Quick-Draw anexa ao jogar e pode ser jogado como Reaction", () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-052', base(0));
  const sg = s.put(0, 'SFD-056', 'hand');
  s.runes(0, calm(5));
  s.go();
  s.pick("Jogar Sterak's Gage");
  s.maybeObj(u);
  s.passAll();
  assert.equal(sg.attachedTo, u.id, s.log());
  assert.equal(s.e.might(u), 5);
  assert.equal(s.e.kw(sg).reaction, undefined);
  assert.ok(s.e.timingOk(0, sg, s.e.kw(sg), 'priority', false));
});

test('Irelia, Fervent: +1 quando você a escolhe e quando você a prepara', () => {
  const s = new Scenario();
  const ir = s.put(0, 'SFD-057', base(0), { ready: false });
  const h = s.put(0, 'SFD-052', base(0));
  s.go();
  s.pick('Heart of Dark Ice');
  s.maybeObj(ir);
  s.passAll();
  assert.equal(s.e.might(ir), 4 + 3 + 1, s.log());
  assert.equal(h.exhausted, true);
  // o oponente preparando não conta (preparar no despertar está no teste seguinte)
  ir.exhausted = true;
  s.e.ready(ir, 1);
  assert.equal(s.e.pending.length, 0, 'o oponente preparar não dispara');
});

test('Irelia, Fervent: preparada no despertar ganha +1 (FAQ #236)', () => {
  const s = new Scenario();
  const ir = s.put(0, 'SFD-057', base(0), { ready: false });
  s.go();
  endTurn(s);
  endTurn(s);
  if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.equal(s.e.might(ir), 5, s.log());
});

test('Ornn, Blacksmith: ao jogar, olha 4 do topo, compra um gear e recicla o resto', () => {
  const s = new Scenario();
  s.runes(0, calm(6));
  s.put(0, 'SFD-058', 'hand');
  const a = s.put(0, 'OGN-052', 'deckTop');
  const gear = s.put(0, 'SFD-052', 'deckTop');
  const b = s.put(0, 'OGN-065', 'deckTop');
  const c = s.put(0, 'OGN-185', 'deckTop');
  s.go();
  s.pick('Jogar Ornn');
  where(s, 'base de A');
  s.passAll();
  s.pickObj(gear);
  s.passAll();
  assert.equal(gear.zone, 'hand', s.log());
  const deck = s.e.pl[0].mainDeck;
  for (const o of [a, b, c]) assert.ok(deck.indexOf(o.id) >= deck.length - 3, 'reciclada para o fundo');
});

test('Svellsongur: copia o texto impresso — Deflect soma e gatilhos disparam duas vezes', () => {
  const s = new Scenario();
  const h = s.put(0, 'SFD-048', base(0)); // Stellacorn Herder: ao mover, compra 1
  const sv = s.put(0, 'SFD-059', base(0));
  const ir = s.put(0, 'SFD-057', base(0));
  const sv2 = s.put(0, 'SFD-059', base(0));
  s.e.attach(sv, h);
  s.e.attach(sv2, ir);
  assert.equal(s.e.kw(ir).deflect, 2, 'Deflect 1 + cópia');
  assert.equal(s.e.kw(sv2).deflect, undefined, 'o Svellsongur não ganha nada (FAQ #7465)');
  s.go();
  s.passAll();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [h.id], 'Campo Vazio A');
  if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand + 2, s.log());
});

test('Svellsongur: Deathknell copiado dispara duas vezes (olha para trás)', () => {
  const s = new Scenario();
  const poro = s.put(0, 'SFD-036', base(0));
  const sv = s.put(0, 'SFD-059', base(0));
  s.e.attach(sv, poro);
  s.put(1, 'OGN-142', BF0);
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [poro.id], 'Campo Vazio A');
  s.passAll();
  if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.equal(poro.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, hand + 2, s.log());
  assert.equal(sv.zone, 'board');
  assert.equal(sv.attachedTo, undefined);
});

test('Svellsongur: habilidade ativada copiada tem o próprio "uma vez por turno" (Azir)', () => {
  const s = new Scenario();
  const azir = s.put(0, 'SFD-050', base(0));
  const sv = s.put(0, 'SFD-059', base(0));
  const u = s.put(0, 'OGN-052', BF0);
  s.e.attach(sv, azir);
  s.runes(0, calm(2));
  s.go();
  const acts = () => s.d.options.filter((o) => o.label.includes('[Calm]: trocar de lugar'));
  assert.equal(acts().length, 2);
  s.ok([acts()[0].id]);
  s.pickObj(u);
  s.passAll();
  assert.equal(acts().length, 1, 'a cópia ainda pode ser usada');
  assert.ok(acts()[0].label.includes('Svellsongur'), acts()[0].label);
});

test('Tianna Crownguard: num campo, o oponente não ganha pontos; o hold dele ainda dispara', () => {
  const s = new Scenario();
  s.put(1, 'SFD-060', BF1);
  s.put(0, 'SFD-058', BF0); // Ornn: "quando eu seguro" ainda dispara
  s.put(0, 'SFD-052', 'deckTop');
  s.go();
  endTurn(s);
  endTurn(s);
  s.passAll();
  assert.equal(s.e.pl[0].points, 0, s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('não pode ganhar pontos')));
  assert.ok(s.e.scored.includes('0-0'), 'o campo foi pontuado mesmo assim (FAQ #9615)');
  assert.ok(s.d.prompt.includes('Ornn') || s.e.log.some((l) => l.text.includes('Ornn')), s.d.prompt);
});

test('Tianna Crownguard: na base não impede pontos', () => {
  const s = new Scenario();
  s.put(1, 'SFD-060', base(1));
  s.put(0, 'OGN-052', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.pl[0].points, 1, s.log());
});
