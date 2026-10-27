// Testes das cartas do lote "chaos" do Spiritforged (SFD-121..SFD-150).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;
const F = RUNE.fury;

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Responde a pergunta de local ("Jogar X onde?"), se houver. */
function maybe(s: Scenario, text: string) {
  if (!s.d.root && /onde\?/.test(s.d.prompt) && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
/** Esconde uma carta de p num campo que ele controla (escondida num turno anterior). */
function hideAt(s: Scenario, p: P, code: string, i: number): Obj {
  const e = s.e;
  const o = e.newObj(code, p, 'setAside');
  o.zone = 'facedown';
  o.loc = { t: 'bf', i };
  o.hiddenTurn = 0;
  o.controller = p;
  e.bfs[i].facedown.push(o.id);
  if (e.bfs[i].controller === null) e.bfs[i].controller = p;
  return o;
}
const gold = (s: Scenario, p: P) => s.e.gearOf(p).filter((g) => g.code === 'TOK-GOLD');

test('Black Market Broker: jogar uma carta escondida dá um Gold exaurido; jogar da mão não', () => {
  const s = new Scenario();
  s.put(0, 'SFD-121', base(0));
  const u = s.put(0, 'OGN-175', BF0);
  s.put(1, 'OGN-136', BF0); // inimiga no mesmo campo (segunda unidade do Switcheroo)
  hideAt(s, 0, 'SFD-145', 0); // Switcheroo escondido
  s.put(0, 'OGN-169', 'hand'); // Gust da mão
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Switcheroo (escondida');
  s.pickObj(u);
  s.passAll();
  assert.equal(gold(s, 0).length, 1, s.log(30));
  assert.equal(gold(s, 0)[0].exhausted, true);
  assert.deepEqual(gold(s, 0)[0].loc, base(0));
  s.pick('Jogar Gust');
  if (!s.d.root && /Gust/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.match(s.log(8), /Gust/);
  assert.equal(gold(s, 0).length, 1, 'jogar da mão não dá Gold');
});

test('Called Shot: compra a escolhida (evento de compra) e recicla a outra; Repeat olha o novo topo', () => {
  const s = new Scenario();
  const e = s.e;
  const c3 = s.put(0, 'OGN-142', 'deckTop');
  const c2 = s.put(0, 'OGN-065', 'deckTop');
  const c1 = s.put(0, 'OGN-175', 'deckTop');
  s.put(0, 'SFD-122', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Called Shot');
  assert.match(s.d.prompt, /Repeat/);
  s.pick('Sim');
  s.passAll();
  assert.match(s.d.prompt, /Called Shot: qual carta comprar/);
  assert.deepEqual(new Set(s.d.options.map((o) => o.obj)), new Set([c1.id, c2.id]));
  s.pickObj(c2);
  assert.equal(c2.zone, 'hand');
  assert.equal(e.pl[0].mainDeck[e.pl[0].mainDeck.length - 1], c1.id, 'a outra vai para o fundo');
  assert.match(s.d.prompt, /Called Shot/, 'segunda execução');
  assert.ok(s.d.options.some((o) => o.obj === c3.id));
  s.pickObj(c3);
  assert.equal(c3.zone, 'hand');
});

test('Corrupt Enforcer e Draven, Audacious: vencer o combate compra 1 e dá 1 ponto (só a primeira vez no turno)', () => {
  const s = new Scenario();
  const e = s.e;
  const enf = s.put(0, 'SFD-123', base(0));
  const dr = s.put(0, 'SFD-148', base(0));
  s.put(0, 'OGN-175', 'hand'); // para o descarte do Enforcer
  s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  s.go();
  const hand0 = e.pl[0].hand.length;
  moveTo(s, [enf.id, dr.id], 'Campo Vazio A');
  s.passAll(10);
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/descartar/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else if (/primeiro|Qual vai/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else s.passAll(5);
  }
  const log = s.log(60);
  assert.match(log, /Draven, Audacious/, log);
  assert.equal(e.pl[0].points, 2, 'conquista + Draven\n' + log);
  assert.equal(e.pl[0].hand.length, hand0 - 1 + 1, 'descartou 1 (movimento) e comprou 1 (venceu)\n' + log);
  // segunda vitória no mesmo turno não dá ponto
  e.bfs[1].controller = 1;
  s.put(1, 'OGN-136', BF1);
  dr.exhausted = false;
  dr.loc = base(0);
  s.go();
  const pts = e.pl[0].points;
  moveTo(s, [dr.id], 'Campo Vazio B');
  s.passAll(10);
  assert.equal(e.pl[0].points, pts + 1, 'só a conquista\n' + s.log(30));
});

test('Draven, Audacious: morrer em combate dá 1 ponto ao oponente; morrer fora do combate não', () => {
  const s = new Scenario();
  const e = s.e;
  const dr = s.put(0, 'SFD-148', base(0));
  s.put(1, 'OGN-142', BF0); // Mountain Drake 10
  s.go();
  moveTo(s, [dr.id], 'Campo Vazio A');
  s.passAll(10);
  assert.equal(dr.zone, 'trash', s.log(30));
  assert.equal(e.pl[1].points, 1, s.log(30));
  // fora do combate (Void Seeker na base não vale: só em campo) — morte por dano de spell sem combate
  const s2 = new Scenario();
  const dr2 = s2.put(0, 'SFD-148', BF0);
  s2.put(1, 'OGN-024', 'hand');
  s2.runes(1, [F, F, F, F]);
  s2.e.active = 0;
  s2.go();
  dr2.damage = 0;
  s2.e.dealDamage(dr2, 9);
  s2.e.cleanup();
  assert.equal(dr2.zone, 'trash');
  assert.equal(s2.e.pending.length, 0, 'sem gatilho fora do combate');
});

test("Doran's Ring: a unidade equipada conquista → descarta 1 e compra 1; Boots dá Ganking", () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', base(0));
  const ring = s.put(0, 'SFD-124', base(0));
  const boots = s.put(0, 'SFD-133', base(0));
  s.put(0, 'OGN-065', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick("Equipar Doran's Ring");
  s.passAll();
  assert.equal(ring.attachedTo, u.id, s.log());
  assert.equal(e.might(u), 4);
  s.pick('Equipar Boots');
  s.passAll();
  assert.equal(e.kw(u).ganking, true);
  assert.equal(e.might(u), 6);
  const hand = e.pl[0].hand.length;
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll(5);
  assert.match(s.log(6), /Doran's Ring: Descartar 1, depois comprar 1[\s\S]*descarta Wizened Elder[\s\S]*A compra 1/, s.log(20));
  assert.equal(e.pl[0].hand.length, hand);
});

test('Fae Porter: ao ir para um campo, paga [Caos] para levar outra unidade sua junto', () => {
  const s = new Scenario();
  const fp = s.put(0, 'SFD-125', base(0));
  const other = s.put(0, 'OGN-175', base(0), { ready: false });
  s.runes(0, [C]);
  s.go();
  moveTo(s, [fp.id], 'Campo Vazio A');
  assert.match(s.d.prompt, /Pagar \[Caos\]/, s.log());
  s.pick('Sim');
  s.maybeObj(other); // o próprio Fae Porter já está lá: a outra unidade é a única escolha
  s.passAll(5);
  assert.deepEqual(other.loc, BF0, s.log());
  assert.equal(s.e.runesOf(0).length, 0, 'runa reciclada para pagar [Caos]');
});

test('Loyal Pup: quando você defende num campo, pode se mover para lá e defende', () => {
  const s = new Scenario();
  const e = s.e;
  const pup = s.put(1, 'SFD-126', base(1));
  s.put(1, 'OGN-136', BF0);
  const a = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  assert.match(s.d.prompt, /Mover Loyal Pup/, s.log());
  assert.equal(s.d.player, 1);
  s.pick('Sim');
  s.passAll(10);
  assert.match(s.log(40), /Loyal Pup → Campo Vazio A/);
  assert.equal(pup.zone, 'trash', 'defendeu e morreu no combate\n' + s.log(40));
  void e;
});

test('Overzealous Fan: ao defender, mata-se (custo) para mandar um atacante para a base', () => {
  const s = new Scenario();
  const e = s.e;
  const fan = s.put(1, 'SFD-128', BF0);
  const a = s.put(0, 'OGN-142', base(0));
  const b = s.put(0, 'OGN-175', base(0));
  s.go();
  moveTo(s, [a.id, b.id], 'Campo Vazio A');
  assert.match(s.d.prompt, /Matar Overzealous Fan/, s.log());
  s.pick('Sim');
  assert.match(s.d.prompt, /atacante/);
  s.pickObj(a);
  assert.equal(fan.zone, 'trash', 'morreu ao pagar o custo');
  s.passAll(10);
  assert.deepEqual(a.loc, base(0), s.log(30));
  assert.equal(e.bfs[0].controller, 0, 'o outro atacante conquista');
});

test('Temptation: destino escolhido ao jogar (local com outra unidade do mesmo controlador); sem ela na resolução, nada', () => {
  for (const remove of [false, true]) {
    const s = new Scenario();
    const e = s.e;
    const t = s.put(1, 'OGN-175', base(1));
    const friend = s.put(1, 'OGN-136', BF1);
    s.put(1, 'OGN-065', BF0);
    s.put(0, 'SFD-129', 'hand');
    s.runes(0, [C, C]);
    s.put(1, 'OGN-169', 'hand'); // Gust: B recebe prioridade
    s.runes(1, [C]);
    s.go();
    s.pick('Jogar Temptation');
    s.pickObj(t);
    assert.match(s.d.prompt, /para onde/);
    const labels = s.d.options.map((o) => o.label);
    assert.deepEqual(new Set(labels), new Set(['Campo Vazio A', 'Campo Vazio B']));
    s.pick('Campo Vazio B');
    assert.equal(s.d.kind, 'priority');
    if (remove) e.returnToHand(friend);
    s.passAll();
    assert.deepEqual(t.loc, remove ? base(1) : BF1, s.log());
  }
});

test('Hard Bargain com Repeat: o controlador do spell paga [2] duas vezes ou o spell é anulado', () => {
  for (const pay of [2, 1]) {
    const s = new Scenario();
    const e = s.e;
    const tgt = s.put(1, 'OGN-136', BF0);
    s.put(0, 'OGN-169', 'hand'); // Gust
    s.runes(0, [C, C, C, C, C]);
    s.put(1, 'SFD-136', 'hand');
    s.runes(1, [C, C, C, C]);
    s.go();
    s.pick('Jogar Gust');
    s.maybeObj(tgt);
    s.pick('Jogar Hard Bargain');
    assert.match(s.d.prompt, /Repeat/);
    s.pick('Sim');
    s.passAll(2);
    assert.match(s.d.prompt, /Hard Bargain: pagar \[2\]/);
    assert.equal(s.d.player, 0);
    s.pick('Sim');
    if (pay === 2) {
      assert.match(s.d.prompt, /Hard Bargain: pagar \[2\]/);
      s.pick('Sim');
      s.passAll();
      assert.equal(tgt.zone, 'hand', s.log());
    } else {
      s.pick('Não');
      s.passAll();
      assert.equal(tgt.zone, 'board', s.log());
      assert.match(s.log(), /Gust foi anulado/);
    }
    void e;
  }
});

test('Windsinger escondida: devolve só unidade daquele campo com 3 de Might ou menos', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-175', BF0);
  const there = s.put(1, 'OGN-136', BF0);
  s.put(1, 'OGN-136', BF1);
  void mine;
  hideAt(s, 0, 'SFD-138', 0);
  s.go();
  s.pick('Jogar Windsinger (escondida');
  s.passAll(2);
  assert.match(s.d.prompt, /Devolver outra unidade/);
  s.pick('Sim');
  const ids = s.d.options.map((o) => o.obj);
  assert.ok(ids.includes(there.id));
  assert.ok(ids.every((id) => s.e.bfIndex(s.e.objs[id!]) === 0), 'só do campo onde estava escondida');
  s.pickObj(there);
  s.passAll(5);
  assert.equal(there.zone, 'hand', s.log());
});

test('Edge of Night: jogada escondida equipa numa unidade sua daquele campo sem pagar o Equip', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', BF0);
  s.put(0, 'OGN-065', base(0));
  const edge = hideAt(s, 0, 'SFD-139', 0);
  s.go();
  s.pick('Jogar Edge of Night (escondida');
  s.passAll(5);
  assert.equal(edge.attachedTo, u.id, s.log());
  assert.equal(e.might(u), 5);
  assert.equal(e.runesOf(0).length, 0);
});

test('Fizz, Trickster: joga um spell do descarte sem a energia (paga o power) e depois o recicla', () => {
  const s = new Scenario();
  const e = s.e;
  const rw = s.put(0, 'OGN-173', 'trash'); // Ride the Wind: 2 + [Caos]
  s.put(0, 'OGN-024', 'trash'); // Void Seeker: Fury, não é do meu descarte? é, mas custa 3 de energia → vale
  s.put(0, 'SFD-140', 'hand');
  const u = s.put(0, 'OGN-175', base(0), { ready: false });
  s.runes(0, [C, C, C, C]);
  s.go();
  s.pick('Jogar Fizz');
  maybe(s, 'base de A');
  s.passAll(3);
  assert.match(s.d.prompt, /Jogar um spell do seu descarte/);
  s.pick('Sim');
  s.pickObj(rw);
  s.passAll(3);
  assert.match(s.d.prompt, /pagar o power/);
  s.pick('Sim');
  s.pickObj(u);
  if (/para onde/i.test(s.d.prompt)) s.pick('Campo Vazio A');
  s.passAll(5);
  assert.equal(rw.zone, 'mainDeck', 'reciclado\n' + s.log(30));
  assert.equal(e.pl[0].mainDeck[e.pl[0].mainDeck.length - 1], rw.id);
  assert.equal(e.runesOf(0).length, 2, '3+[Caos] do Fizz (1 runa reciclada) + [Caos] do Ride the Wind (outra)');
});

test('Irelia, Graceful: spell que a escolhe custa [1] ou [A] a menos, à escolha', () => {
  const s = new Scenario();
  const e = s.e;
  const ir = s.put(0, 'SFD-141', base(0), { ready: false });
  s.put(0, 'OGN-173', 'hand'); // Ride the Wind 2 + [Caos]
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Ride the Wind');
  s.maybeObj(ir);
  if (/para onde/i.test(s.d.prompt)) s.pick('Campo Vazio A');
  assert.match(s.d.prompt, /descontos do custo/, s.log());
  const labels = s.d.options.map((o) => o.label);
  assert.ok(labels.includes('2') && labels.some((l) => /^1 \+/.test(l)), labels.join(' | '));
  s.pick('2');
  s.passAll();
  assert.deepEqual(ir.loc, BF0, s.log());
  assert.equal(e.runesOf(0).length, 2, 'só exauriu (sem reciclar)');
});

test('Irelia, Graceful: escolher outra unidade não dá desconto', () => {
  const s = new Scenario();
  s.put(0, 'SFD-141', base(0));
  const o = s.put(0, 'OGN-175', base(0), { ready: false });
  s.put(0, 'OGN-173', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Ride the Wind');
  s.pickObj(o);
  if (/para onde/i.test(s.d.prompt)) s.pick('Campo Vazio A');
  assert.notEqual(s.d.prompt.includes('descontos'), true);
  s.passAll();
  assert.equal(s.e.runesOf(0).length, 1, 'pagou 2 + [Caos]');
});

test('Jae Medarda e Spirit Wheel: escolher com spell compra; Wheel paga [1] e exaure', () => {
  const s = new Scenario();
  const e = s.e;
  const jae = s.put(0, 'SFD-142', base(0), { ready: false });
  const wheel = s.put(0, 'SFD-144', base(0));
  s.put(0, 'OGN-173', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  const hand = e.pl[0].hand.length;
  s.pick('Jogar Ride the Wind');
  s.maybeObj(jae);
  if (/para onde/i.test(s.d.prompt)) s.pick('Campo Vazio A');
  // dois gatilhos: ordem
  for (let i = 0; i < 6 && !s.d.root; i++) {
    if (/Vários efeitos/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else if (/Pagar \[1\] e exaurir/.test(s.d.prompt)) s.pick('Sim');
    else s.passAll(3);
  }
  assert.equal(wheel.exhausted, true, s.log(30));
  assert.equal(e.pl[0].hand.length, hand - 1 + 2, 'Jae + Wheel compraram\n' + s.log(30));
  assert.equal(e.runesOf(0).filter((r) => !r.exhausted).length, 0, 'Ride the Wind (2 + [Caos]) + [1] da Wheel');
});

test('Sivir, Mercenary: depois de gastar [A][A] no turno, +2 e Ganking', () => {
  const s = new Scenario();
  const e = s.e;
  const sv = s.put(0, 'SFD-143', base(0));
  assert.equal(e.might(sv), 4);
  e.pl[0].pool.power = { any: 2 };
  assert.equal(e.might(sv), 4, 'ter power no pool não é gastar');
  e.pay(0, { energy: 0, power: [['Chaos']] });
  assert.equal(e.might(sv), 4);
  e.pay(0, { energy: 0, power: [['Fury']] });
  assert.equal(e.might(sv), 6);
  assert.equal(e.kw(sv).ganking, true);
  e.turn++;
  assert.equal(e.might(sv), 4, 'só neste turno');
});

test('Switcheroo: troca o Might atual das duas unidades neste turno (buff fica)', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-136', BF0); // 2
  a.buffs = 1; // 3
  const b = s.put(0, 'OGN-142', BF0); // 10 (sem combate: as duas são minhas)
  s.put(1, 'OGN-175', BF1);
  s.put(0, 'SFD-145', 'hand');
  s.runes(0, [C, C, C, C]);
  s.go();
  s.pick('Jogar Switcheroo');
  s.pickObj(a);
  // a segunda só pode ser a do mesmo campo: escolhida sozinha
  s.passAll();
  assert.equal(e.might(a), 10, s.log());
  assert.equal(e.might(b), 3);
  e.spendBuff(a);
  assert.equal(e.might(a), 9);
});

test('Vex, Cheerless em combate: spells aliados [1][A] a menos (mín. [1]) inclusive Deflect; inimigos [1][A] a mais', () => {
  const s = new Scenario();
  const e = s.e;
  const vex = s.put(0, 'SFD-146', BF0);
  s.put(1, 'OGN-142', BF0);
  const gust = s.put(0, 'OGN-169', 'hand');
  const rw = s.put(1, 'OGN-173', 'hand');
  // simula o combate em andamento
  e.showdown = { bf: 0, combat: true, focus: 0, passes: 0, flipAfterChain: false, attacker: 0, defender: 1, excess: [0, 0] };
  vex.role = 'attacker';
  for (const u of e.unitsAtBf(0, 1)) u.role = 'defender';
  assert.equal(e.inCombat(vex), true);
  // aliado: Ride the Wind seria 2 + [Caos] → 1 + 0
  const mine = e.minCostFor(0, rw, 'hand');
  assert.deepEqual([mine.energy, mine.power.length], [1, 0]);
  // Gust 1 + 0: o mínimo [1] segura a energia
  const g1 = e.minCostFor(0, gust, 'hand');
  assert.deepEqual([g1.energy, g1.power.length], [1, 0]);
  // inimigo: 2+1 → 3 + 2
  const theirs = e.minCostFor(1, rw, 'hand');
  assert.deepEqual([theirs.energy, theirs.power.length], [3, 2]);
  // Deflect entra antes do desconto (FAQ #11173): Gust 1 + [A] do Deflect → 1 + 0
  const withDefl = e.totalCost({ base: e.printedCost(gust), add: { energy: 0, power: [] }, plain: [], post: [], defl: { energy: 0, power: [['Chaos']] } }, 0, gust);
  assert.deepEqual([withDefl.energy, withDefl.power.length], [1, 0]);
  vex.role = undefined;
  e.showdown = null;
  const off = e.minCostFor(0, rw, 'hand');
  assert.deepEqual([off.energy, off.power.length], [2, 1], 'fora do combate, sem efeito');
});

test('Downwell: devolve todas as unidades e gear; fichas somem e cartas escondidas ficam', () => {
  const s = new Scenario();
  const e = s.e;
  const u0 = s.put(0, 'OGN-175', BF0);
  const ring = s.put(0, 'SFD-124', base(0));
  e.attach(ring, u0);
  const u1 = s.put(1, 'OGN-142', BF1);
  const tok = e.createToken('TOK-GOLD', 1, base(1));
  const hid = hideAt(s, 0, 'SFD-145', 0);
  s.put(0, 'SFD-147', 'hand');
  s.runes(0, [C, C, C, C, C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Downwell');
  s.passAll();
  assert.equal(u0.zone, 'hand');
  assert.equal(ring.zone, 'hand');
  assert.equal(u1.zone, 'hand');
  assert.equal(tok.zone, 'gone');
  assert.ok(e.pl[1].hand.includes(u1.id));
  assert.equal(hid.zone === 'facedown' || hid.zone === 'trash', true, 'escondida não volta para a mão');
});

test('Ezreal, Prodigy: Accelerate e Repeat custam [1] ou [A] a menos (escolha); o custo-base não', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-149', base(0));
  s.put(0, 'SFD-131', 'hand'); // Ancient Warmonger 5, Accelerate [1][Caos]
  s.runes(0, [C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Ancient Warmonger');
  maybe(s, 'base de A');
  assert.match(s.d.prompt, /Accelerate/);
  s.pick('Sim');
  assert.match(s.d.prompt, /qual desconto/);
  const labels = s.d.options.map((o) => o.label);
  assert.deepEqual(new Set(labels), new Set(['1', '0 + [Chaos]']), labels.join(' | '));
  s.pick('1');
  s.passAll();
  const w = e.board().find((o) => o.code === 'SFD-131')!;
  assert.equal(w.exhausted, false, 'entrou pronta');
  assert.equal(e.runesOf(0).filter((r) => !r.exhausted).length, 0, '5 + 1 = 6 de energia\n' + s.log());
  assert.equal(e.runesOf(0).length, 6, 'nenhuma runa reciclada');
});

test('Ancient Warmonger: Assault igual ao número de unidades inimigas aqui', () => {
  const s = new Scenario();
  const e = s.e;
  const w = s.put(0, 'SFD-131', BF0);
  s.put(1, 'OGN-175', BF0);
  s.put(1, 'OGN-136', BF0);
  assert.equal(e.kw(w).assault, 2);
  w.role = 'attacker';
  assert.equal(e.might(w), 6);
});

test('Beast Below: sem outra unidade aliada o gatilho não vai para a pilha; com ela, as duas voltam', () => {
  const s = new Scenario();
  const e = s.e;
  const enemy = s.put(1, 'OGN-142', BF1);
  s.put(0, 'SFD-132', 'hand');
  s.runes(0, Array(9).fill(C));
  s.go();
  s.pick('Jogar Beast Below');
  maybe(s, 'base de A');
  s.passAll(3);
  assert.equal(enemy.zone, 'board');
  assert.match(s.log(5), /sem alvo válido/);
  const s2 = new Scenario();
  const fr = s2.put(0, 'OGN-175', base(0));
  const en = s2.put(1, 'OGN-142', BF1);
  s2.put(0, 'SFD-132', 'hand');
  s2.runes(0, Array(9).fill(C));
  s2.go();
  s2.pick('Jogar Beast Below');
  maybe(s2, 'base de A');
  s2.passAll(5);
  assert.equal(fr.zone, 'hand', s2.log());
  assert.equal(en.zone, 'hand');
  void e;
});

test('Last Rites: Equip paga [Caos] e recicla 2 do descarte; ao conquistar joga uma unidade do descarte', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', base(0));
  const lr = s.put(0, 'SFD-150', base(0));
  const t1 = s.put(0, 'OGN-019', 'trash');
  const t2 = s.put(0, 'OGN-065', 'trash');
  const dead = s.put(0, 'OGN-136', 'trash'); // Pit Rookie 2
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Equipar Last Rites');
  s.maybeObj(u);
  assert.match(s.d.prompt, /reciclar quais 2/);
  s.ok([t1.id, t2.id]);
  s.passAll();
  assert.equal(lr.attachedTo, u.id, s.log());
  assert.equal(t1.zone, 'mainDeck');
  assert.equal(e.might(u), 5);
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll(5);
  assert.match(s.d.prompt, /Jogar uma unidade do seu descarte/, s.log(20));
  s.pick('Sim');
  s.maybeObj(dead);
  s.passAll(3);
  assert.match(s.d.prompt, /pagar os custos/);
  s.pick('Sim');
  maybe(s, 'Campo Vazio A');
  for (let i = 0; i < 4 && !s.d.root; i++) {
    if (/buff|Buff/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else s.passAll(3);
  }
  assert.equal(dead.zone, 'board', s.log(20));
});

test('Factory Recall: devolve um gear para a mão do dono (Gold some)', () => {
  const s = new Scenario();
  const ring = s.put(1, 'SFD-124', base(1));
  s.put(0, 'SFD-135', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Factory Recall');
  s.maybeObj(ring);
  s.passAll();
  assert.equal(ring.zone, 'hand');
  assert.ok(s.e.pl[1].hand.includes(ring.id));
});

test('Harpoon Squad e Treasure Hunter: sair de um campo dá +2; mover-se dá Gold exaurido', () => {
  const s = new Scenario();
  const e = s.e;
  const h = s.put(0, 'SFD-137', BF0);
  const t = s.put(0, 'SFD-130', base(0));
  s.go();
  moveTo(s, [h.id], 'base de A');
  s.passAll(3);
  assert.equal(e.might(h), 6);
  moveTo(s, [t.id], 'Campo Vazio B');
  s.passAll(5);
  assert.equal(gold(s, 0).length, 1, s.log());
  assert.equal(gold(s, 0)[0].exhausted, true);
});

test('Last Rites: sem 2 cartas no descarte o Equip não pode ser ativado', () => {
  const s = new Scenario();
  s.put(0, 'OGN-175', base(0));
  s.put(0, 'SFD-150', base(0));
  s.put(0, 'OGN-019', 'trash');
  s.runes(0, [C]);
  s.go();
  assert.ok(!s.d.options.some((o) => /Last Rites: Equip/.test(o.label)), s.d.options.map((o) => o.label).join(' | '));
});

test('Ezreal, Prodigy: Repeat [Caos] do Called Shot sai de graça (desconto de [A]); custo-base cheio', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-149', base(0));
  for (let i = 0; i < 4; i++) s.put(0, 'OGN-175', 'deckTop');
  s.put(0, 'SFD-122', 'hand'); // 0 + [Caos]
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Called Shot');
  assert.match(s.d.prompt, /Repeat/, 'dá para pagar o Repeat com o desconto');
  s.pick('Sim');
  s.passAll();
  for (let i = 0; i < 2; i++) if (/Called Shot: qual/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  assert.equal(e.runesOf(0).length, 0, 'só o [Caos] do custo-base');
  assert.equal(e.pl[0].hand.length, 2, s.log());
});
