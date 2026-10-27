// Testes de cenário das cartas do lote "fury" (OGN-001..041). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const fury = (n: number) => Array.from({ length: n }, () => RUNE.fury);

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}

test('Cleave dá Assault 3 neste turno', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-185', base(0));
  s.put(0, 'OGN-004', 'hand');
  s.runes(0, fury(1));
  s.go();
  s.pick('Jogar Cleave');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.kw(u).assault, 3);
  endTurn(s);
  assert.equal(s.e.kw(u).assault, undefined, 'acaba no fim do turno');
});

test('Disintegrate: compra 1 só se o dano matar', () => {
  const s = new Scenario();
  const poro = s.put(1, 'OGN-052', BF0); // 2
  const elder = s.put(1, 'OGN-065', BF1); // 4
  s.put(0, 'OGN-005', 'hand');
  s.put(0, 'OGN-005', 'hand');
  s.runes(0, fury(8));
  s.go();
  s.pick('Jogar Disintegrate');
  s.pickObj(poro);
  s.passAll();
  assert.equal(poro.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, 2, 'sobrou 1 Disintegrate + comprou 1\n' + s.log());
  s.pick('Jogar Disintegrate');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'board');
  assert.equal(s.e.pl[0].hand.length, 1, 'não matou: não compra');
});

test('Hextech Ray causa 3; Ravenborn Tome dá +1 à próxima spell', () => {
  const s = new Scenario();
  const elder = s.put(1, 'OGN-065', BF0); // 4
  const tome = s.put(0, 'OGN-032', base(0));
  s.put(0, 'OGN-009', 'hand');
  s.put(0, 'OGN-009', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Ravenborn Tome');
  s.passAll();
  assert.equal(tome.exhausted, true);
  s.pick('Jogar Hextech Ray');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash', '3 + 1 de Bonus Damage mata o Elder (4)\n' + s.log());
  // o bônus foi consumido
  const elder2 = s.put(1, 'OGN-065', BF0);
  s.go();
  s.pick('Jogar Hextech Ray');
  s.maybeObj(elder2);
  s.passAll();
  assert.equal(elder2.zone, 'board');
  assert.equal(elder2.damage, 3);
});

test('Noxus Hopeful custa 2 a menos com Legion; Sky Splitter desconta a maior Might', () => {
  const s = new Scenario();
  const hop = s.put(0, 'OGN-012', 'hand');
  const sky = s.put(0, 'OGN-014', 'hand');
  s.put(0, 'OGN-013', 'hand'); // Pouty Poro
  s.runes(0, fury(4));
  s.go();
  assert.equal(s.e.minCostFor(0, hop, 'hand').energy, 4);
  assert.equal(s.e.minCostFor(0, sky, 'hand').energy, 8);
  s.pick('Jogar Pouty Poro');
  s.passAll();
  assert.equal(s.e.minCostFor(0, hop, 'hand').energy, 2, 'Legion');
  assert.equal(s.e.minCostFor(0, sky, 'hand').energy, 6, 'Pouty Poro tem 2 de Might');
  s.put(0, 'OGN-142', base(0)); // Mountain Drake 10
  assert.equal(s.e.minCostFor(0, sky, 'hand').energy, 0);
});

test('Pouty Poro tem Deflect', () => {
  const s = new Scenario();
  const p = s.put(0, 'OGN-013', base(0));
  assert.equal(s.e.kw(p).deflect, 1);
});

test('Captain Farron dá Assault só às outras unidades aliadas no mesmo lugar', () => {
  const s = new Scenario();
  const far = s.put(0, 'OGN-015', BF0);
  const a = s.put(0, 'OGN-185', BF0);
  const b = s.put(0, 'OGN-185', base(0));
  const en = s.put(1, 'OGN-065', BF0);
  assert.equal(s.e.kw(a).assault, 1);
  assert.equal(s.e.kw(b).assault, undefined);
  assert.equal(s.e.kw(far).assault, undefined);
  assert.equal(s.e.kw(en).assault, undefined);
});

test('Dangerous Duo: Legion dá +2 a uma unidade; sem Legion não faz nada', () => {
  const s = new Scenario();
  s.put(0, 'OGN-016', 'hand');
  s.runes(0, fury(3));
  s.go();
  s.pick('Jogar Dangerous Duo');
  s.passAll();
  const duo = s.e.units().find((u) => u.code === 'OGN-016')!;
  assert.equal(s.e.might(duo), 3, 'sem Legion');

  const t = new Scenario();
  t.put(0, 'OGN-013', 'hand');
  t.put(0, 'OGN-016', 'hand');
  t.runes(0, fury(5));
  t.go();
  t.pick('Jogar Pouty Poro');
  t.passAll();
  t.pick('Jogar Dangerous Duo');
  const duo2 = t.e.units().find((u) => u.code === 'OGN-016')!;
  t.pickObj(duo2);
  t.passAll();
  assert.equal(t.e.might(duo2), 5, t.log());
});

test('Iron Ballista entra exaurido; exaurir causa 2 a uma unidade num campo', () => {
  const s = new Scenario();
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-017', 'hand');
  s.runes(0, fury(3));
  s.go();
  s.pick('Jogar Iron Ballista');
  s.passAll();
  const bal = s.e.board().find((o) => o.code === 'OGN-017')!;
  assert.equal(bal.exhausted, true);
  assert.ok(!s.d.options.some((o) => o.label.startsWith('Iron Ballista')), 'exaurido: sem habilidade');
  s.e.ready(bal);
  s.go();
  s.pick('Iron Ballista');
  s.maybeObj(poro);
  s.passAll();
  assert.equal(poro.zone, 'trash');
});

test('Noxus Saboteur impede o oponente de jogar cartas escondidas no campo dele', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'OGN-185', BF0);
  const fof = e.newObj('OGN-168', 1, 'setAside'); // Fight or Flight (Hidden)
  e.toZone(fof, 'hand');
  e.pl[1].hand = e.pl[1].hand.filter((id) => id !== fof.id);
  fof.zone = 'facedown';
  fof.loc = BF0;
  fof.hiddenTurn = 0;
  e.bfs[0].facedown.push(fof.id);
  assert.equal(e.canPlayCard(1, fof, 'hidden', 'focus'), true);
  const sab = s.put(0, 'OGN-018', BF1);
  assert.equal(e.canPlayCard(1, fof, 'hidden', 'focus'), true, 'Saboteur em outro campo');
  e.putOnBoard(sab, BF0, true);
  assert.equal(e.canPlayCard(1, fof, 'hidden', 'focus'), false, 'Saboteur no mesmo campo');
});

test('Scrapyard Champion: Legion descarta 2 e compra 2', () => {
  const s = new Scenario();
  s.put(0, 'OGN-013', 'hand');
  s.put(0, 'OGN-020', 'hand');
  const a = s.put(0, 'OGN-185', 'hand');
  const b = s.put(0, 'OGN-185', 'hand');
  s.runes(0, fury(8));
  s.go();
  s.pick('Jogar Pouty Poro');
  s.passAll();
  s.pick('Jogar Scrapyard Champion');
  s.passAll();
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, 2);
});

test('Sun Disc (Legion): a próxima unidade entra pronta', () => {
  const s = new Scenario();
  const disc = s.put(0, 'OGN-021', base(0));
  const p1 = s.put(0, 'OGN-013', 'hand');
  const p2 = s.put(0, 'OGN-013', 'hand');
  const p3 = s.put(0, 'OGN-013', 'hand');
  s.runes(0, fury(6));
  s.go();
  // mudou (UNL): sem Legion a habilidade dependente fica inativa e não pode ser ativada (727, 812; RiftJudge #9805)
  assert.ok(!s.d.options.some((o) => o.label.startsWith('Sun Disc')), 'sem Legion a habilidade está inativa');
  s.pick('Jogar Pouty Poro');
  s.passAll();
  assert.equal(p1.exhausted, true);
  s.pick('Sun Disc');
  s.passAll();
  assert.equal(disc.exhausted, true);
  s.pickObj(p2);
  s.passAll();
  assert.equal(p2.exhausted, false, 'entrou pronta\n' + s.log());
  s.pickObj(p3);
  s.passAll();
  assert.equal(p3.exhausted, true, 'só a próxima');
});

test('Thermo Beam mata todo gear', () => {
  const s = new Scenario();
  const g0 = s.put(0, 'OGN-032', base(0));
  const g1 = s.put(1, 'OGN-017', base(1));
  s.put(0, 'OGN-022', 'hand');
  s.runes(0, fury(5));
  s.go();
  s.pick('Jogar Thermo Beam');
  s.passAll();
  assert.equal(g0.zone, 'trash');
  assert.equal(g1.zone, 'trash');
});

test('Unlicensed Armory: paga [Fury] e a unidade volta para a base em vez de morrer', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-185', BF0);
  const arm = s.put(0, 'OGN-023', base(0));
  const junk = s.put(0, 'OGN-013', 'hand');
  s.runes(0, [RUNE.fury]);
  s.go();
  s.pick('Unlicensed Armory');
  s.maybeObj(u);
  s.passAll();
  assert.equal(arm.exhausted, true);
  assert.equal(junk.zone, 'trash', 'descartou 1');
  s.e.dealDamage(u, 5);
  s.e.cleanup();
  assert.equal(u.zone, 'board', s.log());
  assert.deepEqual(u.loc, base(0));
  assert.equal(u.exhausted, true);
  assert.equal(u.damage, 0);
  assert.equal(s.e.runesOf(0).length, 0, 'a runa de Fury foi usada');
  // só da próxima vez
  s.e.dealDamage(u, 5);
  s.e.cleanup();
  assert.equal(u.zone, 'trash');
});

test('Unlicensed Armory: sem [Fury] para pagar, a unidade morre', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-185', BF0);
  s.put(0, 'OGN-023', base(0));
  s.put(0, 'OGN-013', 'hand');
  s.go();
  s.pick('Unlicensed Armory');
  s.passAll();
  s.e.dealDamage(u, 5);
  s.e.cleanup();
  assert.equal(u.zone, 'trash');
});

test('Blind Fury: bane o topo do deck do oponente e joga sob seu controle, de graça', () => {
  const s = new Scenario();
  const top = s.put(1, 'OGN-065', 'deckTop'); // Wizened Elder
  s.put(0, 'OGN-025', 'hand');
  s.runes(0, fury(6));
  s.go();
  s.pick('Jogar Blind Fury');
  s.passAll();
  assert.equal(top.zone, 'board', s.log());
  assert.equal(top.controller, 0);
  assert.equal(top.owner, 1);
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 2, 'Elder não foi pago');
});

test('Blind Fury: um spell revelado é jogado (com alvos) e vai para o descarte do dono', () => {
  const s = new Scenario();
  const elder = s.put(1, 'OGN-065', BF0);
  const top = s.put(1, 'OGN-024', 'deckTop'); // Void Seeker: 4 numa unidade num campo, compre 1
  s.put(0, 'OGN-025', 'hand');
  s.runes(0, fury(6));
  s.go();
  s.pick('Jogar Blind Fury');
  s.passAll();
  if (!s.d.root) s.pickObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash', s.log());
  assert.equal(top.zone, 'trash');
  assert.ok(s.e.pl[1].trash.includes(top.id));
  assert.equal(s.e.pl[0].hand.length, 1, 'quem comprou foi quem jogou');
});

test('Brynhir Thundersong: o oponente não pode jogar cartas neste turno', () => {
  const s = new Scenario();
  const disc = s.put(1, 'OGN-058', 'hand'); // Discipline (Reaction)
  s.runes(1, [RUNE.calm, RUNE.calm]);
  s.put(1, 'OGN-185', base(1));
  s.put(0, 'OGN-026', 'hand');
  s.runes(0, fury(6));
  s.go();
  assert.equal(s.e.canPlayCard(1, disc, 'hand', 'priority'), true);
  s.pick('Jogar Brynhir Thundersong');
  s.passAll();
  assert.equal(s.e.canPlayCard(1, disc, 'hand', 'priority'), false);
  assert.equal(s.e.canPlayCard(0, s.put(0, 'OGN-009', 'hand'), 'hand', 'main'), false, 'sem runas, mas o bloqueio é só do oponente');
  endTurn(s);
  assert.equal(s.e.canPlayCard(1, disc, 'hand', 'main'), true, 'acabou no fim do turno');
});

test('Darius, Trifarian: segunda carta do turno dá +2 e prepara', () => {
  const s = new Scenario();
  const d = s.put(0, 'OGN-027', base(0), { ready: false });
  s.put(0, 'OGN-013', 'hand');
  s.put(0, 'OGN-009', 'hand');
  s.put(0, 'OGN-013', 'hand');
  const el = s.put(1, 'OGN-065', BF0);
  s.runes(0, fury(8));
  s.go();
  s.pick('Jogar Pouty Poro');
  s.passAll();
  assert.equal(s.e.might(d), 5);
  assert.equal(d.exhausted, true);
  s.pick('Jogar Hextech Ray'); // spell: o gatilho resolve antes do spell
  s.maybeObj(el);
  s.passAll();
  assert.equal(s.e.might(d), 7, s.log());
  assert.equal(d.exhausted, false);
  s.pick('Jogar Pouty Poro');
  s.passAll();
  assert.equal(s.e.might(d), 7, 'só na segunda');
});

test('Draven, Showboat soma os seus pontos à Might', () => {
  const s = new Scenario();
  const d = s.put(0, 'OGN-028', base(0));
  assert.equal(s.e.might(d), 3);
  s.e.pl[0].points = 4;
  assert.equal(s.e.might(d), 7);
});

test('Falling Star: 3 + 3, podendo ser na mesma unidade', () => {
  const s = new Scenario();
  const el = s.put(1, 'OGN-065', BF0);
  const poro = s.put(1, 'OGN-052', base(1));
  s.put(0, 'OGN-029', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Falling Star');
  s.pickObj(el);
  s.pickObj(el);
  s.passAll();
  assert.equal(el.zone, 'trash');
  assert.equal(poro.zone, 'board');
});

test('Raging Firebrand: a próxima spell custa 5 a menos (só a próxima)', () => {
  const s = new Scenario();
  const d1 = s.put(0, 'OGN-005', 'hand');
  const d2 = s.put(0, 'OGN-005', 'hand');
  s.put(0, 'OGN-031', 'hand');
  s.put(1, 'OGN-065', BF0);
  s.runes(0, fury(7));
  s.go();
  s.pick('Jogar Raging Firebrand');
  s.passAll();
  assert.equal(s.e.minCostFor(0, d1, 'hand').energy, 0);
  s.pickObj(d1);
  s.passAll();
  assert.equal(s.e.minCostFor(0, d2, 'hand').energy, 4);
});

test('Shakedown: o controlador escolhe entre deixar comprar 2 ou levar 6', () => {
  const s = new Scenario();
  const el = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-033', 'hand');
  s.put(0, 'OGN-033', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Shakedown');
  s.maybeObj(el);
  s.passAll();
  s.pick('Sim', 1);
  s.passAll();
  assert.equal(el.zone, 'board');
  assert.equal(s.e.pl[0].hand.length, 3, '1 Shakedown + 2 compradas');
  s.pick('Jogar Shakedown');
  s.maybeObj(el);
  s.passAll();
  s.pick('Não', 1);
  s.passAll();
  assert.equal(el.zone, 'trash');
});

test('Tryndamere: 5+ de dano excedente ao conquistar dá 1 ponto extra', () => {
  const s = new Scenario();
  s.put(1, 'OGN-052', BF0); // Poro 2 (+1 Shield defendendo)
  const t = s.put(0, 'OGN-034', base(0));
  s.go();
  moveTo(s, [t.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[0].points, 2, '8 - 3 = 5 de excedente\n' + s.log());

  const s2 = new Scenario();
  s2.put(1, 'OGN-065', BF0); // Elder 4
  const t2 = s2.put(0, 'OGN-034', base(0));
  s2.go();
  moveTo(s2, [t2.id], 'Campo Vazio A');
  s2.passAll();
  assert.equal(s2.e.pl[0].points, 1, '8 - 4 = 4: sem ponto extra');
});

test('Vayne, Hunter: entra pronta se o oponente controla um campo; ao conquistar pode voltar à mão por 1', () => {
  const s = new Scenario();
  s.put(1, 'OGN-185', BF1);
  s.put(0, 'OGN-035', 'hand');
  s.runes(0, fury(6));
  s.go();
  s.pick('Jogar Vayne, Hunter');
  s.passAll();
  const v = s.e.units().find((u) => u.code === 'OGN-035')!;
  assert.equal(v.exhausted, false);
  moveTo(s, [v.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0);
  s.pick('Sim');
  s.passAll();
  assert.equal(v.zone, 'hand', s.log());
});

test('Vayne, Hunter: sem campo do oponente, entra exausta', () => {
  const s = new Scenario();
  s.put(0, 'OGN-035', 'hand');
  s.runes(0, fury(5));
  s.go();
  s.pick('Jogar Vayne, Hunter');
  s.passAll();
  const v = s.e.units().find((u) => u.code === 'OGN-035')!;
  assert.equal(v.exhausted, true);
});

test('Immortal Phoenix: matar uma unidade com spell permite jogá-la do descarte por 1 + Fury', () => {
  const s = new Scenario();
  const ph = s.put(0, 'OGN-037', 'trash');
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-009', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Hextech Ray');
  s.maybeObj(poro);
  s.passAll();
  assert.equal(poro.zone, 'trash');
  s.pick('Sim');
  s.passAll();
  assert.equal(ph.zone, 'board', s.log());
  assert.equal(s.e.kw(ph).assault, 2);
});

test('Immortal Phoenix: morte em combate não ativa', () => {
  const s = new Scenario();
  const ph = s.put(0, 'OGN-037', 'trash');
  s.put(1, 'OGN-052', BF0);
  const d = s.put(0, 'OGN-142', base(0));
  s.runes(0, fury(4));
  s.go();
  moveTo(s, [d.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(ph.zone, 'trash');
  assert.equal(s.d.kind, 'action');
});

test('Kadregrin: compra 1 por unidade Mighty sua (inclusive ele)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-001', base(0)); // Blazing Scorcher 5
  s.put(0, 'OGN-185', base(0));
  s.put(0, 'OGN-038', 'hand');
  s.runes(0, fury(9));
  s.go();
  s.pick('Jogar Kadregrin');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, 2, s.log());
});

test("Kai'Sa: compra 1 ao conquistar", () => {
  const s = new Scenario();
  const k = s.put(0, 'OGN-039', base(0));
  s.go();
  moveTo(s, [k.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, 1);
  assert.equal(s.e.pl[0].points, 1);
});

test('Seal of Rage: [Tap] Reaction [Add] [Fury] no formato do pagamento automático', () => {
  const sc = getScript('OGN-040')!;
  const a = sc.activated![0];
  assert.equal(a.isAdd, true);
  assert.equal(a.exhaustSelf, true);
  assert.equal(a.addPower, 'Fury');
});

// O pagamento com Seals vem do motor do lote body (junção no merge); antes disso o teste é pulado.
test('Seal of Rage paga o [Fury] no lugar de uma runa', (t) => {
  const s = new Scenario();
  const seal = s.put(0, 'OGN-040', base(0));
  if (!s.e.canPay(0, { energy: 0, power: [['Fury']] })) return t.skip('motor ainda sem pagamento com Seals');
  const el = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-009', 'hand');
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Jogar Hextech Ray');
  s.maybeObj(el);
  s.passAll();
  assert.equal(el.damage, 3);
  assert.equal(seal.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 1, 'a runa de Chaos só foi exaurida');
});

test('Volibear, Furious: ao atacar divide 5 de dano entre unidades inimigas aqui', () => {
  const s = new Scenario();
  const a = s.put(1, 'OGN-052', BF0);
  const b = s.put(1, 'OGN-065', BF0);
  const v = s.put(0, 'OGN-041', base(0));
  assert.equal(s.e.kw(v).deflect, 2);
  s.go();
  moveTo(s, [v.id], 'Campo Vazio A');
  assert.match(s.d.prompt, /dividir 5/);
  s.ok([a.id, b.id]);
  s.passAll();
  assert.match(s.d.prompt, /quanto dano/);
  s.pick('1');
  s.passAll();
  assert.equal(b.zone, 'trash', 'Elder levou 4 do Volibear antes do dano de combate');
  assert.ok(s.e.log.some((l) => l.text === 'Stalwart Poro recebe 1 de dano de Volibear, Furious.'), s.log(30));
  assert.equal(s.e.bfs[0].controller, 0, s.log(30));
});
