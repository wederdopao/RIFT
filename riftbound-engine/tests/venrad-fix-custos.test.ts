// Rodada 2 do VEN/RAD — frente "motor de custos e recursos": Empower como habilidade ativada, modificadores de power,
// recursos com restrição de uso, custos adicionais, Endless Riches/Sandstone Chimera por ganchos, Mel, Newly Awakened.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';
import { E } from '../src/cards/helpers';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const ORDER = 'OGN-214';

function legend(s: Scenario, p: P, code: string): Obj {
  const e = s.e;
  e.legendOf(p).zone = 'gone';
  const o = e.newObj(code, p, 'legend');
  e.pl[p].legend = o.id;
  return o;
}
function setBf(s: Scenario, i: number, code: string, ctrl: P | null = null) {
  const o = s.e.newObj(code, (ctrl ?? 0) as P, 'battlefieldZone');
  s.e.bfs[i].objId = o.id;
  s.e.bfs[i].controller = ctrl;
  return o;
}
const empAbility = (s: Scenario, o: Obj) => (s.e.script(o).activated || []).find((a) => a.empower)!;
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));

test('Empower é habilidade ativada: vai para a pilha, emite activate e só some depois de Empowered', () => {
  const s = new Scenario();
  const u = s.put(0, 'VEN-030', base(0)); // Serene Ascetic, [Empower][3]
  s.runes(0, rs(RUNE.calm, 3));
  const evs: any[] = [];
  const emit0 = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    if (ev.type === 'activate') evs.push(ev);
    emit0(ev);
  };
  s.go();
  s.pick('Serene Ascetic: Empower — [3]');
  assert.ok(s.e.log.some((l) => l.text === 'Na pilha: Serene Ascetic: Empower — [3].'), 'passou pela pilha');
  assert.equal(evs.length, 1);
  assert.equal(evs[0].energy, 3);
  assert.equal(evs[0].empower, true);
  s.passAll();
  assert.equal(u.empowered, true, s.log());
  assert.ok(!has(s, 'Serene Ascetic: Empower'), 'não ativa de novo (Use only if not Empowered)');
});

test('Empower com custos não de recursos e várias instâncias: Punching Poro (Discard 1), Legion Marauder ([1] ou [Body])', () => {
  const s = new Scenario();
  const poro = s.put(0, 'VEN-007', base(0));
  const leg = s.put(0, 'VEN-074', base(0));
  const card = s.put(0, 'OGN-087', 'hand');
  s.runes(0, [RUNE.body]);
  s.go();
  assert.equal(s.d.options.filter((o) => o.label.startsWith('Legion Marauder: Empower')).length, 2, 'duas instâncias (827.3)');
  s.pick('Punching Poro: Empower — Discard 1');
  if (!s.d.root && s.d.options.some((o) => o.obj === card.id)) s.pickObj(card);
  assert.equal(card.zone, 'trash', 'descartou como custo');
  s.passAll();
  assert.equal(poro.empowered, true);
  s.pick('Legion Marauder: Empower — [Body]');
  s.passAll();
  assert.equal(leg.empowered, true);
});

test('Kayle, Justified: Empower até 3 vezes', () => {
  const s = new Scenario();
  const k = s.put(0, 'VEN-134', base(0));
  s.runes(0, rs(RUNE.body, 9));
  s.go();
  const m0 = s.e.might(k);
  for (let i = 0; i < 3; i++) {
    s.pick('Kayle, Justified: Empower');
    s.passAll();
  }
  assert.equal(s.e.empowerCount(k), 3);
  assert.equal(s.e.might(k), m0 + 6);
  assert.ok(!has(s, 'Kayle, Justified: Empower'));
});

test('Frostcoat Mother: o texto que altera o custo de Empower conta (12 menos 1 por runa)', () => {
  const s = new Scenario();
  const u = s.put(0, 'VEN-032', base(0));
  s.runes(0, rs(RUNE.calm, 6));
  s.go();
  const a = empAbility(s, u);
  assert.equal((a.cost as any)(s.e.ctx(u, 0)).energy, 6);
  s.pick('Frostcoat Mother: Empower');
  s.passAll();
  assert.equal(u.empowered, true);
});

test('Risen Altar: [Empower] das suas unidades aqui custa [1] ou [Rune] a menos (o jogador escolhe)', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-163', 0);
  const u = s.put(0, 'VEN-014', BF0); // Shadow Fiend, [Empower][2][Fury]
  const foe = s.put(1, 'VEN-014', base(1));
  s.runes(0, rs(RUNE.fury, 2));
  s.go();
  const a = empAbility(s, u);
  const opts = s.e.abilityCostOptions(0, u, a, E(2, 'Fury')).map((c) => s.e.costText(c)).sort();
  assert.deepEqual(opts, ['1 + [Fury]', '2']);
  assert.equal(s.e.abilityCostOptions(1, foe, a, E(2, 'Fury')).length, 1, 'não vale fora daqui');
  s.pick('Shadow Fiend: Empower');
  assert.match(s.d.prompt, /descontos/);
  s.pick('2');
  s.passAll();
  assert.equal(u.empowered, true);
  assert.equal(s.e.runesOf(0).length, 2, 'pagou com energia, sem reciclar runa');
});

test('Nasus, Curator of the Sands dispara com habilidade ativada de custo [7]+ (Empower [8] do Nasus, Ascended)', () => {
  const s = new Scenario();
  legend(s, 0, 'VEN-145');
  s.put(0, 'VEN-046', base(0));
  s.runes(0, rs(RUNE.calm, 8));
  s.go();
  s.pick('Nasus, Ascended: Empower');
  assert.match(s.d.prompt, /Nasus/);
  assert.ok(s.d.prompt.includes('preparar até 2 runas'), s.d.prompt);
});

test('Piltovan Forge: só a primeira habilidade ativada de gear aliado no turno custa [1] a menos', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-161', 0);
  const t1 = s.put(0, 'VEN-054', base(0));
  const t2 = s.put(0, 'VEN-054', base(0));
  t1.empowered = t2.empowered = true;
  for (let i = 0; i < 4; i++) s.put(0, 'OGN-087', 'deckTop');
  s.runes(0, [MIND]);
  s.go();
  const draw = (s.e.script(t1).activated || [])[0];
  assert.equal(s.e.abilityCostOptions(0, t1, draw, E(1))[0].energy, 0);
  s.pick('Questionable Tome: Disempower');
  s.passAll();
  assert.equal(s.e.runesOf(0)[0].exhausted, false, 'saiu de graça');
  assert.equal(s.e.abilityCostOptions(0, t2, draw, E(1))[0].energy, 1, 'a segunda paga o custo cheio');
});

test('Renekton, Butcher: a energia só paga unidades e habilidades ativadas de unidades', () => {
  const s = new Scenario();
  legend(s, 0, 'VEN-141');
  const u = s.put(0, 'VEN-030', base(0));
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  s.pick('adicionar 2 de energia');
  assert.equal(s.e.pl[0].pool.energy, 2);
  assert.equal(s.e.usablePool(0, true).energy, 0, 'não paga spell');
  assert.equal(s.e.asPayFor('gear', () => s.e.usablePool(0, false).energy), 0, 'não paga gear');
  assert.equal(s.e.asPayFor('unitAbility', () => s.e.usablePool(0, false).energy), 2);
  s.pick('Serene Ascetic: Empower');
  s.passAll();
  assert.equal(u.empowered, true, s.log());
  assert.equal(s.e.pl[0].pool.energy, 0);
});

test('Iron Revenant: o power só paga jogar unidades ou gear', () => {
  const s = new Scenario();
  legend(s, 0, 'RAD-143');
  s.put(0, 'OGN-087', 'trash');
  s.go();
  s.pick('Banir uma unidade ou gear');
  assert.equal(s.e.pl[0].pool.power.any, 1);
  assert.equal(s.e.usablePool(0, true).power.any || 0, 0, 'não paga spell');
  assert.equal(s.e.asPayFor('unitAbility', () => s.e.usablePool(0, false).power.any || 0), 0, 'nem habilidade');
  assert.equal(s.e.asPayFor('gear', () => s.e.usablePool(0, false).power.any), 1);
  assert.equal(s.e.asPayFor('unit', () => s.e.usablePool(0, false).power.any), 1);
});

test('Astral Heron: a próxima carta custa [2][Rune][Rune] a menos', () => {
  const s = new Scenario();
  s.put(0, 'VEN-044', BF0);
  s.put(0, 'VEN-014', 'hand'); // 2 de energia
  const dragon = s.put(0, 'OGN-234', 'hand'); // [8] + 2 power
  s.runes(0, rs(RUNE.fury, 2));
  s.go();
  s.pick('Jogar Shadow Fiend');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base');
  s.passAll();
  const c = s.e.minCostFor(0, dragon, 'hand');
  assert.equal(c.energy, 6);
  assert.equal(c.power.length, 0, s.log());
});

test('Applied Researchers ([1][Rune] a menos, mínimo [1]), Helm of Suppression ([1][Rune] a mais), Keeper of Law ([2][Order] a menos)', () => {
  const s = new Scenario();
  const ar = s.put(0, 'VEN-055', base(0));
  ar.empowered = true;
  const helm = s.put(1, 'VEN-045', base(1));
  const sanction = s.put(0, 'VEN-035', 'hand'); // [3] + 1 power
  const stup = s.put(0, 'OGN-095', 'hand'); // [1]
  s.go();
  let c = s.e.minCostFor(0, sanction, 'hand');
  assert.deepEqual([c.energy, c.power.length], [3, 0], 'Helm [1] a mais; Researchers [1][Rune] a menos (mín. [1])');
  helm.empowered = true;
  c = s.e.minCostFor(0, sanction, 'hand');
  assert.deepEqual([c.energy, c.power.length], [3, 1], 'Helm Empowered: [1][Rune] a mais; Researchers [1][Rune] a menos');
  helm.zone = 'gone';
  s.e.pl[1].mainDeck.push(helm.id);
  s.e.toZone(helm, 'mainDeck');
  c = s.e.minCostFor(0, sanction, 'hand');
  assert.deepEqual([c.energy, c.power.length], [2, 0]);
  assert.equal(s.e.minCostFor(0, stup, 'hand').energy, 1, 'mínimo de [1]');
  // Keeper of Law
  const k = s.put(0, 'VEN-119', 'hand');
  s.put(0, 'OGN-087', BF0);
  s.put(1, 'OGN-087', BF0);
  s.e.bfs[0].controller = 0;
  c = s.e.minCostFor(0, k, 'hand');
  assert.deepEqual([c.energy, c.power.length], [3, 0]);
});

test('Mystic Vortex: cartas com [Reaction] (inclusive escondidas, de qualquer tipo) custam [Rune] a mais em showdowns aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-160', 0);
  const hid = s.e.newObj('VEN-099', 0, 'setAside'); // Tornado Warrior, unidade com [Hidden]
  hid.zone = 'facedown';
  hid.loc = { t: 'bf', i: 0 };
  assert.equal(s.e.minCostFor(0, hid, 'hidden').power.length, 0);
  s.e.showdown = { bf: 0, combat: false, focus: 0 } as any;
  assert.equal(s.e.minCostFor(0, hid, 'hidden').power.length, 1);
  s.e.showdown = null;
});

test('Orianna, Mechanical Marvel: uma vez por turno, gear custa [1][Rune] a menos', () => {
  const s = new Scenario();
  s.put(0, 'RAD-068', BF0);
  const g1 = s.put(0, 'VEN-018', 'hand'); // [4] + [Fury]
  const g2 = s.put(0, 'VEN-018', 'hand');
  s.runes(0, rs(RUNE.fury, 3));
  s.go();
  s.pick('Jogar Rage Amplifier');
  s.pick('Sim'); // "you may pay [1][Rune] less": opcional (revisão RAD-a4)
  s.passAll();
  assert.equal(g1.zone, 'board', s.log());
  const c2 = s.e.minCostFor(0, g2, 'hand');
  assert.deepEqual([c2.energy, c2.power.length], [4, 1], 'já usou neste turno');
});

test('Boy Who Shattered Time: a próxima unidade custa [2][Rune] a menos e morre no fim do turno', () => {
  const s = new Scenario();
  const boy = legend(s, 0, 'RAD-139');
  boy.empowered = true;
  const dragon = s.put(0, 'OGN-234', 'hand');
  const fiend = s.put(0, 'VEN-014', 'hand');
  s.go();
  s.pick('Disempower em mim');
  s.passAll();
  const c = s.e.minCostFor(0, dragon, 'hand');
  assert.deepEqual([c.energy, c.power.length], [6, 1]);
  s.pick('Jogar Shadow Fiend'); // 2 → 0
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base');
  s.passAll();
  assert.equal(fiend.zone, 'board', s.log());
  s.pick('Encerrar o turno');
  s.passAll();
  assert.equal(fiend.zone, 'trash', s.log());
});

test('Dragon Roost: qualquer jogador paga [Rune][Rune] a mais para jogar um Dragon nesse campo', () => {
  const s = new Scenario();
  setBf(s, 1, 'VEN-157', 1);
  s.put(1, 'OGN-087', { t: 'bf', i: 1 });
  const drake = s.put(0, 'VEN-048', 'hand'); // Cloud Drake [6]
  s.runes(0, rs(MIND, 8));
  s.go();
  s.pick('Jogar Cloud Drake');
  assert.ok(has(s, 'custo adicional'), s.d.options.map((o) => o.label).join(' | '));
  s.pick('custo adicional');
  s.passAll();
  assert.equal(drake.zone, 'board');
  assert.equal(s.e.bfIndex(drake), 1);
  assert.equal(s.e.runesOf(0).length, 6, 'reciclou 2 runas pelo [Rune][Rune]');
});

test('Starry-Eyed Songstress: custo adicional opcional ao jogar um spell (exaurir ela e 3 unidades: [2] a menos)', () => {
  const s = new Scenario();
  const lg = legend(s, 0, 'RAD-151');
  const us = [s.put(0, 'OGN-087', base(0)), s.put(0, 'OGN-087', base(0)), s.put(0, 'OGN-087', base(0))];
  const foe = s.put(1, 'OGN-087', BF0);
  s.put(0, 'OGN-095', 'hand'); // Stupefy [1]
  s.put(0, 'VEN-035', 'hand'); // Sanction [3][Calm]
  s.runes(0, rs(RUNE.calm, 2));
  s.go();
  assert.ok(!has(s, 'Starry-Eyed Songstress:'), 'não é habilidade separada');
  s.pick('Jogar Sanction');
  while (!/Songstress/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  s.pick('Sim');
  for (let i = 0; i < 6 && !s.d.root; i++) {
    if (s.d.prompt.includes('exaurir quais')) s.ok(us.map((u) => u.id));
    else if (s.d.kind === 'priority') s.passAll();
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(lg.exhausted, true);
  assert.ok(us.every((u) => u.exhausted));
  assert.equal(s.e.runesOf(0).length, 1, 'pagou [1] + [Calm]: uma runa exaurida e outra reciclada');
  void foe;
});

test('Endless Riches: pula a compra, joga do descarte e bane o que iria para o descarte (menos do Main Deck)', () => {
  const s = new Scenario();
  const inTrash = s.put(0, 'OGN-095', 'trash');
  const er = s.put(0, 'VEN-022', base(0));
  const inHand = s.put(0, 'OGN-087', 'hand');
  s.put(0, 'OGN-087', 'deckTop'); // comprada pelo Stupefy
  const foe = s.put(1, 'OGN-087', BF0);
  s.runes(0, [MIND]);
  s.go();
  assert.ok(s.e.auraSources().some((src) => (s.e.script(src).auras || []).some((a) => a.skipPhase?.(s.e, src, 0, 'draw'))));
  assert.ok(s.d.options.some((o) => o.id === `play:${inTrash.id}:trash`), 'joga do descarte');
  s.pick(`play:${inTrash.id}:trash`);
  if (!s.d.root && s.d.options.some((o) => o.obj === foe.id)) s.pickObj(foe);
  s.passAll();
  assert.equal(inTrash.zone, 'banish', 'o spell resolvido foi banido em vez de ir para o descarte');
  s.e.toZone(inHand, 'trash');
  assert.equal(inHand.zone, 'banish');
  const top = s.put(0, 'OGN-087', 'deckTop');
  s.e.burn(0, 1);
  assert.equal(top.zone, 'trash', 'do Main Deck vai para o descarte');
  void er;
});

test('Sandstone Chimera: os jogadores só canalizam 1 runa', () => {
  const s = new Scenario();
  s.put(0, 'VEN-036', BF0);
  s.go();
  const before = s.e.runesOf(1).length;
  s.pick('Encerrar o turno');
  s.passAll();
  assert.equal(s.e.active, 1);
  assert.equal(s.e.runesOf(1).length, before + 1, s.log());
});

test('Mel, Newly Awakened (Empowered): seus spells não podem ser anulados e -Might a uma unidade escolhida dá -1 a mais', () => {
  const s = new Scenario();
  const mel = s.put(0, 'VEN-069', base(0));
  mel.empowered = true;
  const foe = s.put(1, 'OGN-234', BF0); // Might 6
  s.put(0, 'OGN-095', 'hand'); // Stupefy: -1 Might (mínimo 1)
  for (let i = 0; i < 2; i++) s.put(0, 'OGN-087', 'deckTop');
  s.runes(0, [MIND]);
  s.go();
  s.pick('Jogar Stupefy');
  if (!s.d.root && s.d.options.some((o) => o.obj === foe.id)) s.pickObj(foe);
  s.passAll();
  assert.equal(s.e.might(foe), 4, s.log());
  // anular: um item de p0 na pilha continua lá
  const item: any = { id: 'x', kind: 'ability', controller: 0, sourceId: mel.id, label: 'teste', ability: { label: 't', resolve: function* () {} }, ctx: s.e.ctx(mel, 0), targetIds: [], targetVers: [] };
  s.e.chain.push(item);
  s.e.counter(item);
  assert.ok(s.e.chain.includes(item), 'não foi anulado');
  mel.empowered = false;
  s.e.counter(item);
  assert.ok(!s.e.chain.includes(item), 'sem Empowered, anula');
});
