// Testes do lote "legends" do Spiritforged (SFD-181..221): lendas, signatures e campos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';
const ORDER = 'OGN-214';

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
function setBf(s: Scenario, i: number, code: string) {
  const e = s.e;
  const o = e.newObj(code, i as P, 'battlefieldZone');
  e.bfs[i].objId = o.id;
  e.script(o).bfSetup?.(e, o);
  return o;
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
function endTurn(s: Scenario, other?: (d: Decision) => string[] | undefined) {
  s.pick('Encerrar o turno');
  run(s, other);
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);
const no = (d: Decision) => (d.kind === 'confirm' ? ['no'] : undefined);
function moveTo(s: Scenario, units: Obj[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(units.map((u) => u.id));
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Prende um gear numa unidade direto (montagem de cenário). */
function attach(s: Scenario, gear: Obj, u: Obj) {
  s.e.attach(gear, u);
}

// ───────────── lendas ─────────────

test('Rumble, Mechanized Menace: as Mechs do controlador têm Shield', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-181');
  const mech = s.e.createToken('TOK-MECH', 0, base(0));
  const foeMech = s.e.createToken('TOK-MECH', 1, base(1));
  assert.equal(s.e.kw(mech).shield, 1);
  assert.equal(s.e.kw(foeMech).shield, undefined);
  mech.role = 'defender';
  assert.equal(s.e.might(mech), 4);
});

test('Lucian, Purifier: cada Equipamento seu preso dá Assault 1', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-183');
  const u = s.put(0, 'OGN-065', base(0));
  const a = s.put(0, 'SFD-190', base(0));
  const b = s.put(0, 'SFD-191', base(0));
  assert.equal(s.e.kw(u).assault, undefined);
  attach(s, a, u);
  attach(s, b, u);
  assert.equal(s.e.kw(u).assault, 2);
  // Equipamento do oponente não conta
  const foe = s.put(1, 'SFD-186', base(1));
  attach(s, foe, u);
  assert.equal(s.e.kw(u).assault, 2);
});

test('Draven, Glorious Executioner: vencer o combate (defendendo) compra 1 antes de estabelecer controle', () => {
  const s = new Scenario();
  legend(s, 1, 'SFD-185');
  const drake = s.put(1, 'OGN-142', BF0); // 10, defende
  const poro = s.put(0, 'OGN-052', base(0)); // 2
  s.go();
  const hand = s.e.pl[1].hand.length;
  moveTo(s, [poro], 'Campo Vazio A');
  run(s);
  assert.equal(poro.zone, 'trash');
  assert.equal(drake.zone, 'board');
  assert.equal(s.e.pl[1].hand.length, hand + 1, s.log(20));
});

test('Draven, Glorious Executioner: atacante vence, a compra vem antes da conquista (regra 466.4)', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-185');
  s.put(1, 'OGN-052', BF0);
  const drake = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [drake], 'Campo Vazio A');
  run(s);
  const iDraw = s.e.log.findIndex((l) => l.text.startsWith('A compra 1'));
  const iPoint = s.e.log.findIndex((l) => l.text.includes('ganha 1 ponto'));
  assert.ok(iDraw >= 0 && iPoint > iDraw, s.log(20));
});

test('Draven, Glorious Executioner: empate com recall de atacantes não é vitória', () => {
  const s = new Scenario();
  legend(s, 1, 'SFD-185');
  s.put(1, 'OGN-142', BF0); // 10
  const drake = s.put(0, 'OGN-142', base(0)); // 10: os dois morrem
  s.go();
  const hand = s.e.pl[1].hand.length;
  moveTo(s, [drake], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.pl[1].hand.length, hand, 'ninguém sobrou: sem resultado');
});

test("Rek'Sai, Void Burrower: exaure, revela 2, bane uma e a joga pagando o custo; o resto é reciclado", () => {
  const s = new Scenario();
  const rek = legend(s, 0, 'SFD-187');
  runes(s, 0, RUNE.calm, 4);
  const elder = s.put(0, 'OGN-065', 'deckTop'); // 4 de energia: dá para pagar
  const poro = s.put(0, 'OGN-052', 'deckTop'); // topo
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], 'Campo Vazio A');
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (d.prompt.startsWith("Rek'Sai: banir")) return [elder.id];
    if (d.prompt.startsWith('Jogar Wizened Elder onde')) return [d.options[0].id];
    return undefined;
  });
  assert.equal(rek.exhausted, true);
  assert.equal(elder.zone, 'board', s.log(30));
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 0, 'pagou 4');
  assert.equal(poro.zone, 'mainDeck');
  assert.equal(s.e.pl[0].mainDeck[s.e.pl[0].mainDeck.length - 1], poro.id, 'reciclada no fundo');
});

test("Rek'Sai, Void Burrower: sem recursos para pagar, a carta banida fica banida", () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-187');
  const elder = s.put(0, 'OGN-065', 'deckTop');
  s.put(0, 'OGN-052', 'deckTop');
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], 'Campo Vazio A');
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (d.prompt.startsWith("Rek'Sai: banir")) return [elder.id];
    return undefined;
  });
  assert.equal(elder.zone, 'banish', s.log(20));
});

test('Void Rush: joga a banida com [2] de desconto e compra a outra', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 4);
  runes(s, 0, ORDER, 1);
  const elder = s.put(0, 'OGN-065', 'deckTop'); // 4 → 2
  const poro = s.put(0, 'OGN-052', 'deckTop');
  s.put(0, 'SFD-188', 'hand');
  s.go();
  s.pick('Jogar Void Rush');
  run(s, (d) => {
    if (d.prompt.startsWith('Void Rush: banir')) return [elder.id];
    if (d.prompt.startsWith('Jogar Wizened Elder onde')) return [d.options[0].id];
    return undefined;
  });
  assert.equal(elder.zone, 'board', s.log(20));
  assert.equal(poro.zone, 'hand');
});

test('Ornn, Fire Below the Mountain: o power serve para gear, não para spell', () => {
  const s = new Scenario();
  const ornn = legend(s, 0, 'SFD-189');
  runes(s, 0, RUNE.calm, 4);
  s.put(0, 'SFD-190', 'hand'); // Forgefire Cape: 4 + 2 power (Calm/Mind)
  s.put(0, 'SFD-198', 'hand'); // Arise!: 6 + 1 power — não dá
  s.go();
  // 4 runas Calm: 4 de energia, mas o Cape pede 2 power: sem o Ornn faltaria
  assert.ok(s.d.options.some((o) => o.label.includes('Jogar Forgefire Cape')), 'Ornn ajuda a pagar gear: ' + s.d.options.map((o) => o.label).join('|'));
  // o power do Ornn não paga spells
  assert.equal(s.e.canPay(0, { energy: 0, power: [['Fury']] }, true), false);
  assert.equal(s.e.asPayFor('gear', () => s.e.canPay(0, { energy: 0, power: [['Fury']] })), true);
  s.pick('Jogar Forgefire Cape');
  run(s, (d) => (d.prompt.startsWith('Como pagar') ? [d.options[0].id] : undefined));
  assert.equal(ornn.exhausted, true);
});

test('Ornn: ativado à mão, o power fica na parte "só para gear" do pool', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-189');
  s.go();
  s.pick('Exaurir: adicionar 1 power (só para gear)');
  assert.equal(s.e.pl[0].pool.power.any, 1);
  assert.equal(s.e.pl[0].pool.only?.find((x) => x.uses.includes('gearAbility'))?.power.any, 1);
  assert.equal(s.e.usablePool(0, true).power.any, 0, 'não paga spell');
  assert.equal(s.e.asPayFor('gear', () => s.e.usablePool(0, false).power.any), 1);
});

test('Jax, Grandmaster at Arms: prende Equipamento solto ([1]) e muda Equipamento preso de unidade', () => {
  const s = new Scenario();
  const jax = legend(s, 0, 'SFD-193');
  runes(s, 0, RUNE.calm, 1);
  const cape = s.put(0, 'SFD-190', base(0));
  const a = s.put(0, 'OGN-065', base(0));
  const b = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('[1], exaurir: prender um Equipamento solto seu');
  s.maybeObj(cape);
  s.pickObj(a);
  run(s);
  assert.equal(cape.attachedTo, a.id, s.log());
  assert.equal(s.e.might(a), 7);
  jax.exhausted = false;
  s.go();
  s.pick('Exaurir: mudar um Equipamento preso seu de unidade');
  s.maybeObj(cape);
  s.pickObj(b);
  run(s);
  assert.equal(cape.attachedTo, b.id);
});

test('Irelia, Blade Dancer: escolher uma unidade aliada com um spell → exaurir e pagar 1 power para prepará-la', () => {
  const s = new Scenario();
  const ire = legend(s, 0, 'SFD-195');
  runes(s, 0, RUNE.calm, 2);
  const u = s.put(0, 'OGN-065', BF0, { ready: false });
  const v = s.put(1, 'OGN-052', BF1);
  s.put(0, 'SFD-196', 'hand'); // Defiant Dance (1 + 1 power)
  s.go();
  s.pick('Jogar Defiant Dance');
  s.pickObj(u);
  s.maybeObj(v);
  run(s, yes);
  assert.equal(ire.exhausted, true);
  assert.equal(u.exhausted, false, s.log(20));
  assert.equal(s.e.might(u), 6);
  assert.equal(s.e.might(v), 0);
});

test('Irelia, Blade Dancer: quando você conquista, pode pagar [1] para prepará-la', () => {
  const s = new Scenario();
  const ire = legend(s, 0, 'SFD-195');
  ire.exhausted = true;
  runes(s, 0, RUNE.calm, 1);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], 'Campo Vazio A');
  run(s, yes);
  assert.equal(ire.exhausted, false, s.log(20));
});

test('Azir: Sand Soldiers têm Weaponmaster; a habilidade só vale se você jogou um Equipamento no turno', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-197');
  runes(s, 0, RUNE.calm, 6);
  const t = s.e.createToken('TOK-SAND', 0, base(0));
  assert.equal(s.e.kw(t).weaponmaster, true);
  assert.equal(s.e.pending.filter((x) => x.label === 'Weaponmaster').length, 1, 'ficha jogada dispara Weaponmaster');
  s.e.pending = [];
  s.put(0, 'SFD-190', 'hand');
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('jogar uma ficha Sand Soldier')));
  s.pick('Jogar Forgefire Cape');
  run(s);
  s.pick('[1], exaurir: jogar uma ficha Sand Soldier na base');
  run(s, no);
  assert.equal(s.e.units().filter((u) => s.e.name(u) === 'Sand Soldier').length, 2);
});

test('Ezreal, Prodigal Explorer: libera depois de escolher inimigos duas vezes com spells/unidades', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-199');
  runes(s, 0, RUNE.chaos, 4);
  const foe = s.put(1, 'OGN-142', BF0);
  s.put(0, 'OGN-169', 'hand'); // Gust
  s.put(0, 'SFD-196', 'hand'); // Defiant Dance
  const mine = s.put(0, 'OGN-052', BF1);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Exaurir: comprar 1')));
  s.pick('Jogar Defiant Dance');
  s.pickObj(mine);
  s.maybeObj(foe);
  run(s);
  assert.ok(!s.d.options.some((o) => o.label.includes('Exaurir: comprar 1')), 'só uma vez');
  s.e.pl[0].chooseLog!.push({ turn: s.e.turn, src: 'unit', enemy: true });
  s.go();
  assert.ok(s.d.options.some((o) => o.label.includes('Exaurir: comprar 1')));
  // habilidade de gear não conta
  s.e.pl[0].chooseLog = [{ turn: s.e.turn, src: 'gear', enemy: true }, { turn: s.e.turn, src: 'spell', enemy: true }];
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Exaurir: comprar 1')));
});

test('Renata Glasc, Chem-Baroness: segurar dá Gold exaurido; perto da vitória o Gold adiciona [1] a mais', () => {
  const s = new Scenario();
  const ren = legend(s, 0, 'SFD-201');
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  endTurn(s);
  endTurn(s, yes);
  assert.equal(ren.exhausted, true, s.log(30));
  const gold = s.e.gearOf(0).find((g) => g.code === 'TOK-GOLD')!;
  assert.ok(gold && gold.exhausted, 'Gold exaurido');
  // perto da vitória: um Gold pronto paga 1 de energia + 1 power
  gold.exhausted = false;
  for (const r of s.e.runesOf(0)) s.e.toZone(r, 'runeDeck');
  assert.equal(s.e.canPay(0, { energy: 1, power: [['Fury']] }), false);
  s.e.pl[0].points = 5;
  assert.equal(s.e.canPay(0, { energy: 1, power: [['Fury']] }), true);
  assert.equal(s.e.canPay(0, { energy: 2, power: [['Fury']] }), false);
});

test('Sivir, Battle Mistress: reciclar runa → Gold; várias inimigas morrendo juntas preparam uma vez', () => {
  const s = new Scenario();
  const siv = legend(s, 0, 'SFD-203');
  runes(s, 0, RUNE.chaos, 2);
  s.put(0, 'OGN-169', 'hand'); // Gust: 1 de energia
  const tgt = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Gust');
  s.maybeObj(tgt);
  run(s, yes);
  // Gust só custa energia: não recicla
  assert.equal(siv.exhausted, false);
  // pagar power reciclando uma runa
  s.e.pending = [];
  s.e.runSync(s.e.payG(0, { energy: 0, power: [['Chaos']] }));
  assert.equal(s.e.pending.filter((x) => x.sourceId === siv.id).length, 1);
  s.e.pending = [];
  // mortes simultâneas
  siv.exhausted = true;
  const a = s.put(1, 'OGN-052', BF1);
  const b = s.put(1, 'OGN-052', BF1);
  s.e.killAll([a, b]);
  assert.equal(s.e.pending.filter((x) => x.sourceId === siv.id).length, 1, 'uma vez por lote');
});

test('Fiora, Grand Duelist: unidade sua que fica Mighty → exaurir para canalizar 1 runa exaurida', () => {
  const s = new Scenario();
  const fio = legend(s, 0, 'SFD-205');
  runes(s, 0, RUNE.calm, 2);
  const elder = s.put(0, 'OGN-065', base(0)); // 4
  s.put(0, 'SFD-196', 'hand');
  const other = s.put(1, 'OGN-052', base(1));
  s.e.cleanup();
  s.go();
  const before = s.e.runesOf(0).length;
  s.pick('Jogar Defiant Dance');
  s.pickObj(elder);
  s.maybeObj(other);
  run(s, yes);
  assert.equal(fio.exhausted, true, s.log(20));
  // pagou 1 power reciclando uma runa e canalizou 1 exaurida
  assert.equal(s.e.runesOf(0).length, before);
  assert.ok(s.e.log.some((l) => l.text.includes('canaliza 1 runa(s) exauridas')), s.log(20));
});

test('Fiora, Grand Duelist: unidade que entra com 5+ não "fica" Mighty (RiftJudge #9442)', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-205');
  runes(s, 0, RUNE.fury, 5);
  s.put(0, 'OGN-001', 'hand'); // Blazing Scorcher 5
  s.go();
  s.pick('Jogar Blazing Scorcher');
  run(s, (d) => (d.kind === 'confirm' ? ['no'] : d.prompt.startsWith('Jogar Blazing') ? [d.options[0].id] : undefined));
  assert.ok(!s.e.log.some((l) => l.text.includes('Canalizar')), s.log());
  assert.equal(s.e.pending.length, 0);
});

test('Hostile Takeover: assume o controle, prepara, conquista; no fim do turno o controle volta e a unidade vai à base', () => {
  const s = new Scenario();
  runes(s, 0, MIND, 5);
  runes(s, 0, ORDER, 2);
  const foe = s.put(1, 'OGN-052', BF0, { ready: false });
  s.put(0, 'SFD-202', 'hand');
  s.go();
  s.pick('Jogar Hostile Takeover');
  s.maybeObj(foe);
  run(s);
  assert.equal(foe.controller, 0);
  assert.equal(foe.exhausted, false);
  assert.equal(s.e.bfs[0].controller, 0, s.log(20));
  assert.equal(s.e.pl[0].points, 1);
  endTurn(s);
  assert.equal(foe.controller, 1, s.log(20));
  assert.deepEqual(foe.loc, base(1));
});

test('Riposte: anula o spell e dá +Might igual ao custo impresso', () => {
  const s = new Scenario();
  runes(s, 1, RUNE.body, 2);
  runes(s, 1, ORDER, 2);
  const mine = s.put(1, 'OGN-052', base(1));
  runes(s, 0, RUNE.fury, 4);
  const tgt = s.put(1, 'OGN-065', BF0);
  const vs = s.put(0, 'OGN-024', 'hand'); // Void Seeker: 3 de energia
  s.put(1, 'SFD-206', 'hand');
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(tgt);
  // B responde com Riposte
  assert.equal(s.d.player, 1);
  s.pick('Jogar Riposte');
  s.pickObj(mine);
  s.maybeObj(vs);
  run(s);
  assert.equal(tgt.damage, 0);
  assert.equal(vs.zone, 'trash');
  assert.equal(s.e.might(mine), 5, s.log(20));
});

test('Arcane Shift: bane a unidade aliada, o dono a joga de graça; 3 de dano; o spell é banido', () => {
  const s = new Scenario();
  runes(s, 0, MIND, 3);
  runes(s, 0, RUNE.chaos, 1);
  const mine = s.put(0, 'OGN-065', BF1, { ready: false });
  mine.damage = 2;
  const foe = s.put(1, 'OGN-065', BF0);
  const sp = s.put(0, 'SFD-200', 'hand');
  s.go();
  s.pick('Jogar Arcane Shift');
  s.maybeObj(mine);
  s.maybeObj(foe);
  run(s, (d) => (d.prompt.startsWith('Jogar Wizened Elder onde') ? [d.options[0].id] : undefined));
  assert.equal(mine.zone, 'board');
  assert.equal(mine.damage, 0, 'objeto novo');
  assert.equal(foe.damage, 3);
  assert.equal(sp.zone, 'banish');
});

test('Counter Strike: previne o próximo dano inteiro e compra 1', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 2);
  runes(s, 0, RUNE.body, 1);
  const u = s.put(0, 'OGN-065', BF0);
  s.put(0, 'SFD-194', 'hand');
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Counter Strike');
  s.maybeObj(u);
  run(s);
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1');
  s.e.dealDamage(u, 10);
  assert.equal(u.damage, 0);
  s.e.dealDamage(u, 1);
  assert.equal(u.damage, 1, 'só a próxima vez');
});

test('Danger Zone com Repeat: +2 nas Mechs; Marai Spire tira [1] do Repeat', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-211');
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-052', BF0);
  runes(s, 0, RUNE.fury, 3);
  const mech = s.e.createToken('TOK-MECH', 0, base(0));
  s.put(0, 'SFD-182', 'hand');
  s.go();
  s.pick('Jogar Danger Zone');
  assert.ok(/Pagar Repeat/.test(s.d.prompt), s.d.prompt);
  s.pick('Sim');
  run(s);
  assert.equal(s.e.might(mech), 5);
});

test('Spinning Axe: Temporary só enquanto solto', () => {
  const s = new Scenario();
  const axe = s.put(0, 'SFD-186', base(0));
  const u = s.put(0, 'OGN-065', base(0));
  assert.equal(s.e.kw(axe).temporary, true);
  attach(s, axe, u);
  assert.ok(!s.e.activeKw(axe).temporary, "preso: Temporary inativo (722.2)");
  assert.equal(s.e.might(u), 7);
});

test('Forgefire Cape: quando a unidade equipada ataca, 2 em todas as inimigas aqui', () => {
  const s = new Scenario();
  const cape = s.put(0, 'SFD-190', base(0));
  const u = s.put(0, 'OGN-142', base(0));
  attach(s, cape, u);
  const a = s.put(1, 'OGN-065', BF0);
  const b = s.put(1, 'OGN-142', BF0);
  s.go();
  moveTo(s, [u], 'Campo Vazio A');
  run(s);
  assert.ok(s.e.log.some((l) => l.text.includes('recebe 2 de dano de Mountain Drake')), s.log(30));
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
});

test("Rabadon's Deathcrown: spells do controlador da unidade equipada causam +3", () => {
  const s = new Scenario();
  const crown = s.put(0, 'SFD-191', base(0));
  const u = s.put(0, 'OGN-052', base(0));
  attach(s, crown, u);
  runes(s, 0, RUNE.fury, 4);
  const foe = s.put(1, 'OGN-142', BF0);
  s.put(0, 'OGN-024', 'hand');
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(foe);
  run(s);
  assert.equal(foe.damage, 7, s.log());
});

test("Shurelya's Requiem: ao jogar prepara as suas unidades; preso, as suas unidades no local têm Ganking", () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 6);
  const u = s.put(0, 'OGN-065', BF0, { ready: false });
  const v = s.put(0, 'OGN-052', BF0, { ready: false });
  const w = s.put(0, 'OGN-052', base(0), { ready: false });
  s.put(0, 'SFD-192', 'hand');
  s.go();
  s.pick("Jogar Shurelya's Requiem");
  run(s);
  assert.equal(u.exhausted || v.exhausted || w.exhausted, false, s.log());
  const req = s.e.gearOf(0).find((g) => g.code === 'SFD-192')!;
  attach(s, req, u);
  assert.equal(s.e.kw(u).ganking, true);
  assert.equal(s.e.kw(v).ganking, true);
  assert.equal(s.e.kw(w).ganking, undefined);
});

test('Arise!: uma ficha por Equipamento; prepara até duas', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 7);
  s.put(0, 'SFD-190', base(0));
  s.put(0, 'SFD-191', base(0));
  s.put(0, 'SFD-186', base(0));
  s.put(0, 'SFD-198', 'hand');
  s.go();
  s.pick('Jogar Arise!');
  let readied = 0;
  run(s, (d) => {
    if (d.prompt.startsWith('Arise!: onde')) return [d.options[0].id];
    if (d.prompt.startsWith('Arise!: preparar')) {
      readied = 2;
      return d.options.slice(0, 2).map((o) => o.id);
    }
    if (d.kind === 'confirm') return ['no']; // Weaponmaster
    return undefined;
  });
  const sands = s.e.units().filter((u) => s.e.name(u) === 'Sand Soldier');
  assert.equal(sands.length, 3);
  assert.equal(readied, 2);
  assert.equal(sands.filter((u) => !u.exhausted).length, 2, s.log(20));
});

// ───────────── campos ─────────────

test("Emperor's Dais: pagar [1] e devolver uma unidade daqui → Sand Soldier aqui", () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-207');
  runes(s, 0, RUNE.calm, 1);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], "Emperor's Dais");
  run(s, yes);
  assert.equal(u.zone, 'hand', s.log(20));
  const sand = s.e.units().find((x) => s.e.name(x) === 'Sand Soldier');
  assert.ok(sand && sand.loc?.t === 'bf' && sand.loc.i === 0);
});

test('Forge of the Fluft: a lenda aliada ganha "[Tap]: prender um Equipamento"', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-208');
  const u = s.put(0, 'OGN-052', BF0);
  const cape = s.put(0, 'SFD-190', base(0));
  s.go();
  const leg = s.e.legendOf(0);
  s.pick('Exaurir: prender um Equipamento seu numa unidade sua');
  s.maybeObj(cape);
  s.maybeObj(u);
  run(s);
  assert.equal(cape.attachedTo, u.id);
  assert.equal(leg.exhausted, true);
  // o oponente (sem controlar o campo) não tem a habilidade
  assert.equal(s.e.actionOptions(1, 'main').some((o) => o.label.includes('prender um Equipamento')), false);
});

test('Forgotten Monument: ninguém pontua aqui antes do 3º turno; sem conquista nem gatilhos', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-209');
  const u = s.put(0, 'OGN-142', base(0));
  s.e.pl[0].turns = 2;
  s.go();
  moveTo(s, [u], 'Forgotten Monument');
  run(s);
  assert.equal(s.e.bfs[0].controller, 0, 'ganha o controle');
  assert.equal(s.e.pl[0].points, 0, s.log());
  s.e.pl[0].turns = 3;
  s.e.scored = [];
  s.e.bfs[0].controller = null;
  s.e.runSync(s.e.establishControl(0, 0, 0));
  assert.equal(s.e.pl[0].points, 1);
});

test('Hall of Legends: pagar [1] na conquista prepara a lenda', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-210');
  runes(s, 0, RUNE.calm, 1);
  const leg = s.e.legendOf(0);
  leg.exhausted = true;
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], 'Hall of Legends');
  run(s, yes);
  assert.equal(leg.exhausted, false, s.log());
});

test("Ornn's Forge: o primeiro gear (não ficha) do turno custa [1] a menos", () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-213');
  s.put(0, 'OGN-052', BF0);
  const cape = s.put(0, 'SFD-190', 'hand');
  const mask = s.put(0, 'OGN-060', 'hand');
  assert.equal(s.e.energyDiscount(cape, 0), -1);
  s.e.pl[0].played.push(mask.id);
  assert.equal(s.e.energyDiscount(cape, 0), 0);
  assert.equal(s.e.energyDiscount(cape, 1), 0, 'só quem controla o campo');
});

test('Power Nexus: segurar aqui → pagar 4 power para marcar 1 ponto', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-214');
  runes(s, 0, RUNE.calm, 4);
  s.put(0, 'OGN-052', BF0);
  s.go();
  endTurn(s);
  endTurn(s, yes);
  assert.equal(s.e.pl[0].points, 2, s.log(20));
});

test('Ravenbloom Conservatory: ao defender aqui, spell do topo vai para a mão; senão recicla', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-215');
  s.put(1, 'OGN-142', BF0); // B controla e defende
  const sp = s.put(1, 'OGN-024', 'deckTop');
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  moveTo(s, [u], 'Ravenbloom Conservatory');
  run(s);
  assert.equal(sp.zone, 'hand', s.log(20));
});

test('Rockfall Path: unidades não podem ser jogadas aqui (nem fichas)', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-216');
  s.put(0, 'OGN-052', BF0);
  const p = s.put(0, 'OGN-065', 'hand');
  const locs = s.e.unitLocations(0, p, 'hand', 'main');
  assert.ok(!locs.some((l) => l.t === 'bf' && l.i === 0));
  const t = s.e.createToken('TOK-SAND', 0, BF0);
  assert.equal(t.zone, 'gone');
});

test('Seat of Power: compra 1 por outro campo que você controla', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-217');
  s.put(0, 'OGN-052', BF1);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [u], 'Seat of Power');
  run(s);
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Sunken Temple: conquistar com unidade Mighty → pagar [1] para comprar 1', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-218');
  runes(s, 0, RUNE.calm, 1);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [u], 'Sunken Temple');
  run(s, yes);
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('The Papertree: segurar aqui → cada jogador canaliza 1 runa exaurida', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-219');
  s.put(0, 'OGN-052', BF0);
  s.go();
  endTurn(s);
  const r1 = s.e.runesOf(1).length;
  const r0 = s.e.runesOf(0).length;
  endTurn(s);
  // turno de A: canaliza 2 normalmente + 1 da Papertree; B ganha 1 exaurida
  assert.equal(s.e.runesOf(1).length, r1 + 1, s.log(20));
  assert.equal(s.e.runesOf(0).length, r0 + 3);
});

test('Treasure Hoard: pagar [1] na conquista → Gold exaurido', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-220');
  runes(s, 0, RUNE.calm, 1);
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [u], 'Treasure Hoard');
  run(s, yes);
  const gold = s.e.gearOf(0).find((g) => g.code === 'TOK-GOLD');
  assert.ok(gold && gold.exhausted, s.log());
});

test('Veiled Temple: prepara um gear aliado e pode soltar o Equipamento', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-221');
  const u = s.put(0, 'OGN-142', base(0));
  const cape = s.put(0, 'SFD-190', base(0), { ready: false });
  attach(s, cape, u);
  s.go();
  moveTo(s, [u], 'Veiled Temple');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.prompt.startsWith('Veiled Temple: preparar') ? [cape.id] : undefined));
  assert.equal(cape.exhausted, false);
  assert.equal(cape.attachedTo, undefined, s.log());
  assert.deepEqual(cape.loc, base(0), 'solto num campo, volta para a base na limpeza');
});

test('Minefield: conquistar aqui põe as 2 do topo no descarte', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-212');
  const u = s.put(0, 'OGN-142', base(0));
  const trash = s.e.pl[0].trash.length;
  s.go();
  moveTo(s, [u], 'Minefield');
  run(s);
  assert.equal(s.e.pl[0].trash.length, trash + 2);
});

test('Relentless Pursuit: move, prende um Equipamento e, ao conquistar, pode voltar para a base', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 3);
  const u = s.put(0, 'OGN-142', base(0));
  const cape = s.put(0, 'SFD-190', base(0));
  s.put(0, 'SFD-184', 'hand');
  s.go();
  s.pick('Jogar Relentless Pursuit');
  s.maybeObj(u);
  s.pickObj(cape);
  s.pick('Campo Vazio A');
  run(s, yes);
  assert.equal(cape.attachedTo, u.id);
  assert.equal(s.e.pl[0].points, 1, s.log(20));
  assert.deepEqual(u.loc, base(0), 'voltou para a base');
});

test('On the Hunt: prepara as suas unidades', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 1);
  runes(s, 0, RUNE.chaos, 2);
  const u = s.put(0, 'OGN-142', base(0), { ready: false });
  s.put(0, 'SFD-204', 'hand');
  s.go();
  s.pick('Jogar On the Hunt');
  run(s);
  assert.equal(u.exhausted, false);
});

test('Marai Spire: o Repeat custa [1] a menos só para quem controla o campo', () => {
  const s = new Scenario();
  setBf(s, 0, 'SFD-211');
  s.e.bfs[0].controller = 0;
  const dz = s.put(0, 'SFD-182', 'hand');
  const rep = s.e.script(dz).repeat!;
  assert.deepEqual(s.e.addCostVariants(0, dz, 'repeat', rep).map((c) => [c.energy, c.power.length]), [[0, 1]]);
  assert.deepEqual(s.e.addCostVariants(1, dz, 'repeat', rep).map((c) => [c.energy, c.power.length]), [[1, 1]]);
});
