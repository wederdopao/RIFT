// Testes de cenário das cartas do lote "body" do Spiritforged (SFD-091..SFD-120). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const B = RUNE.body;

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function maybe(s: Scenario, text: string) {
  if (s.g.current && s.d.options.some((o) => o.label.includes(text)) && !s.d.root) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
const logHas = (s: Scenario, t: string | RegExp) =>
  s.e.log.some((l) => (typeof t === 'string' ? l.text.includes(t) : t.test(l.text)));

test('Buhru Captain: ao jogar, escolhe comprar 1 ou receber Buff (ou nada)', () => {
  for (const mode of ['Comprar 1', 'Dar um Buff', 'Nenhum']) {
    const s = new Scenario();
    const cap = s.put(0, 'SFD-091', 'hand');
    s.runes(0, [B, B, B]);
    s.go();
    s.pick('Jogar Buhru Captain');
    maybe(s, 'base de A');
    const hand = s.e.pl[0].hand.length;
    // "você pode" ao pôr na pilha; comprar ou Buff é escolhido na resolução (383.3.a.1, 355.17)
    s.pick(mode === 'Nenhum' ? 'Não' : 'Sim');
    s.passAll();
    if (mode !== 'Nenhum') {
      s.pick(mode);
      s.passAll();
    }
    assert.equal(cap.zone, 'board');
    assert.equal(cap.buffs, mode === 'Dar um Buff' ? 1 : 0, mode);
    assert.equal(s.e.pl[0].hand.length, hand + (mode === 'Comprar 1' ? 1 : 0), mode);
  }
});

test('Sea Monkey: com o custo adicional [1] entra com Buff; sem ele, não', () => {
  for (const pay of [true, false]) {
    const s = new Scenario();
    const m = s.put(0, 'SFD-098', 'hand');
    s.runes(0, [B, B, B]);
    s.go();
    s.pick('Jogar Sea Monkey');
    maybe(s, 'base de A');
    s.pick(pay ? 'Sim' : 'Não');
    s.passAll();
    assert.equal(m.buffs, pay ? 1 : 0);
    assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, pay ? 3 : 2);
  }
});

test('Direwing entra pronta só se você controla outro Dragon', () => {
  for (const dragon of [true, false]) {
    const s = new Scenario();
    if (dragon) s.put(0, 'SFD-101', base(0)); // Fae Dragon
    else s.put(0, 'OGN-136', base(0));
    const d = s.put(0, 'SFD-094', 'hand');
    s.runes(0, [B, B, B, B, B, B, B]);
    s.go();
    s.pick('Jogar Direwing');
    maybe(s, 'base de A');
    s.passAll();
    assert.equal(d.zone, 'board');
    assert.equal(d.exhausted, !dragon);
  }
});

test('Dauntless Vanguard pode ser jogada num campo inimigo ocupado', () => {
  const s = new Scenario();
  s.put(1, 'OGN-136', BF0);
  s.put(0, 'SFD-093', 'hand');
  s.runes(0, [B, B, B, B, B]);
  s.go();
  s.pick('Jogar Dauntless Vanguard');
  assert.ok(s.d.options.some((o) => o.label.includes('Campo Vazio A')), 'campo inimigo ocupado é opção');
  assert.ok(!s.d.options.some((o) => o.label.includes('Campo Vazio B')), 'campo aberto não é');
});

test('Yordle Explorer: carta com 2+ de Power compra 1; com menos, não', () => {
  const s = new Scenario();
  s.put(0, 'SFD-100', base(0));
  s.put(0, 'SFD-097', 'hand'); // Punch First: power 2
  s.put(0, 'SFD-106', 'hand'); // Show of Strength: power 1
  const tgt = s.put(0, 'OGN-136', base(0));
  s.runes(0, [B, B, B, B, B, B]);
  s.go();
  const h0 = s.e.pl[0].hand.length;
  s.pick('Jogar Show of Strength');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, h0 - 1, 'Show of Strength (1 power) não compra pelo Explorer\n' + s.log(10));
  s.pick('Jogar Punch First');
  s.maybeObj(tgt);
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, h0 - 1, 'Punch First (2 power) sai e o Explorer compra 1\n' + s.log(10));
  assert.ok(logHas(s, 'Carta com 2+ de Power'));
  assert.equal(s.e.might(tgt), 7);
});

test('Fae Dragon: Buff em até 4 unidades aliadas; buff gasto gera ficha Gold exaurida', () => {
  const s = new Scenario();
  const us = [0, 1, 2].map(() => s.put(0, 'OGN-136', base(0)));
  s.put(0, 'SFD-101', 'hand');
  s.runes(0, Array(8).fill(B));
  s.go();
  s.pick('Jogar Fae Dragon');
  s.ok([us[0].id, us[1].id]);
  s.passAll();
  assert.equal(us[0].buffs, 1);
  assert.equal(us[1].buffs, 1);
  assert.equal(us[2].buffs, 0);
  // gastar um buff (Sett, Brawler: "gaste meu buff") gera Gold
  const sett = s.put(0, 'OGN-164', base(0));
  sett.buffs = 1;
  s.go();
  s.pick('Sett');
  s.passAll();
  const gold = s.e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.equal(gold.length, 1, s.log(10));
  assert.equal(gold[0].exhausted, true);
});

test('Hexdrinker: Deflect só para a unidade equipada; o gear solto não tem Deflect', () => {
  const s = new Scenario();
  const hex = s.put(0, 'SFD-102', base(0));
  const u = s.put(0, 'OGN-136', base(0));
  assert.equal(s.e.kw(hex).deflect || 0, 0);
  assert.equal(s.e.kw(u).deflect || 0, 0);
  s.e.attach(hex, u);
  assert.equal(s.e.kw(u).deflect, 1);
  assert.equal(s.e.kw(hex).deflect || 0, 0);
  assert.equal(s.e.might(u), 3, '+1 de Might do equipamento');
});

test('Jaull-Fish: custa [2] menos por unidade Mighty sua', () => {
  const s = new Scenario();
  s.put(0, 'OGN-142', base(0)); // 10
  s.put(0, 'OGN-142', base(0)); // 10
  s.put(1, 'OGN-142', base(1)); // inimiga não conta
  const f = s.put(0, 'SFD-103', 'hand');
  const e = s.e;
  assert.equal(e.minCostFor(0, f, 'hand').energy, 3);
});

test('Petricite Monument: unidades aliadas têm Deflect; Temporary morre no início do turno', () => {
  const s = new Scenario();
  const pm = s.put(0, 'SFD-104', base(0));
  const u = s.put(0, 'OGN-136', base(0));
  const v = s.put(1, 'OGN-136', base(1));
  assert.equal(s.e.kw(u).deflect, 1);
  assert.equal(s.e.kw(v).deflect || 0, 0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(pm.zone, 'trash', s.log(20));
});

test('Ruin Runner: inimigos não podem escolhê-la; o dono pode', () => {
  const s = new Scenario();
  const rr = s.put(1, 'SFD-105', base(1));
  const other = s.put(1, 'OGN-136', base(1));
  s.put(0, 'OGN-136', base(0));
  s.put(0, 'SFD-097', 'hand'); // Punch First (qualquer unidade)
  s.runes(0, [B, B, B]);
  s.go();
  s.pick('Jogar Punch First');
  assert.ok(!s.d.options.some((o) => o.obj === rr.id), 'Ruin Runner não é opção para o inimigo');
  assert.ok(s.d.options.some((o) => o.obj === other.id));
  // o próprio controlador pode escolher
  const c = s.e.ctx(rr, 1);
  assert.ok(s.e.targetCandidates(c, { prompt: 'x' }).includes(rr));
});

test('Show of Strength: compra 1 por unidade Mighty sua', () => {
  const s = new Scenario();
  s.put(0, 'OGN-142', base(0));
  s.put(0, 'OGN-142', base(0));
  s.put(0, 'OGN-136', base(0));
  s.put(0, 'SFD-106', 'hand');
  s.runes(0, [B, B, B]);
  s.go();
  const h = s.e.pl[0].hand.length;
  s.pick('Jogar Show of Strength');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, h - 1 + 2);
});

test('Strike Down: a unidade equipada causa dano igual ao Might e solta um equipamento', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', BF0); // 2
  const blade = s.put(0, 'SFD-095', base(0)); // +2
  s.e.attach(blade, u);
  const foe = s.put(1, 'OGN-142', base(1)); // 10
  s.put(0, 'SFD-107', 'hand');
  s.runes(0, [B, B, B, B]);
  s.go();
  s.pick('Jogar Strike Down');
  s.maybeObj(u);
  s.maybeObj(foe);
  s.passAll();
  assert.equal(foe.damage, 4, s.log(10));
  assert.equal(blade.attachedTo, undefined);
  assert.deepEqual(blade.loc, base(0), 'solto num campo, volta para a base na limpeza');
  assert.equal(s.e.might(u), 2);
});

test('Warmog\'s Armor: a unidade equipada que conquista recebe Buff', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', base(0));
  const w = s.put(0, 'SFD-108', base(0));
  s.e.attach(w, u);
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(u.buffs, 1, s.log(10));
});

test('Trinity Force: a unidade equipada no hold marca 1 ponto a mais', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', BF0);
  const tf = s.put(0, 'SFD-115', base(0));
  s.e.attach(tf, u);
  s.go();
  endTurn(s);
  endTurn(s);
  // hold (1) + Trinity Force (1)
  assert.equal(s.e.pl[0].points, 2, s.log(20));
});

test('Boneshiver: a unidade equipada que conquista canaliza 1 runa exaurida', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', base(0));
  const bs = s.put(0, 'SFD-118', base(0));
  s.e.attach(bs, u);
  s.go();
  const r0 = s.e.runesOf(0).length;
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll();
  const runes = s.e.runesOf(0);
  assert.equal(runes.length, r0 + 1, s.log(10));
  assert.ok(runes.some((r) => r.exhausted));
});

test('Fiora, Peerless: um contra um dobra o Might; com dois inimigos, não', () => {
  for (const two of [false, true]) {
    const s = new Scenario();
    const f = s.put(0, 'SFD-110', base(0)); // 3
    s.put(1, 'OGN-142', BF0); // 10
    if (two) s.put(1, 'OGN-136', BF0);
    s.go();
    moveTo(s, [f.id], 'Campo Vazio A');
    s.passAll();
    assert.equal(logHas(s, 'Fiora, Peerless recebe +3 de Might'), !two, s.log(15));
    assert.equal(logHas(s, 'Dano de combate: A 6'), !two);
  }
});

test('Akshan: rouba um gear inimigo (preso), prende nele e o controle volta quando ele sai', () => {
  const s = new Scenario();
  const foe = s.put(1, 'OGN-136', base(1));
  const blade = s.put(1, 'SFD-095', base(1));
  s.e.attach(blade, foe);
  const ak = s.put(0, 'SFD-109', 'hand');
  s.runes(0, Array(7).fill(B));
  s.go();
  s.pick('Jogar Akshan');
  maybe(s, 'base de A');
  s.pick('Sim'); // custo adicional
  // gatilhos: Weaponmaster e o roubo
  for (let i = 0; i < 10 && s.g.current; i++) {
    if (s.d.prompt.startsWith('Vários efeitos')) s.pick('Roubar');
    else if (/Weaponmaster|Equipar um equipamento/.test(s.d.prompt)) s.pick('Não');
    else if (s.d.kind === 'priority') s.pick('Passar');
    else break;
  }
  assert.equal(blade.controller, 0, s.log(15));
  assert.equal(blade.attachedTo, ak.id);
  assert.equal(s.e.might(foe), 2);
  assert.equal(s.e.might(ak), 6);
  // Akshan morre: o controle volta e o gear vai para a base do dono
  s.e.kill(ak);
  s.e.cleanup();
  assert.equal(blade.controller, 1);
  assert.equal(blade.attachedTo, undefined);
  assert.deepEqual(blade.loc, base(1));
});

test('Akshan: preso em outra unidade, o gear continua preso quando o Akshan sai (só o controle volta)', () => {
  const s = new Scenario();
  const ak = s.put(0, 'SFD-109', base(0));
  const mine = s.put(0, 'OGN-136', base(0));
  const g = s.put(1, 'SFD-095', base(1));
  s.e.gainControlUntilLeaves(g, 0, ak);
  g.loc = base(0);
  s.e.attach(g, mine);
  s.e.kill(ak);
  s.e.cleanup();
  assert.equal(g.controller, 1);
  assert.equal(g.attachedTo, mine.id);
  assert.equal(s.e.might(mine), 4);
});

test('Here to Help: joga uma unidade da mão num campo que você controla com custo [3] menor', () => {
  const s = new Scenario();
  s.put(0, 'OGN-136', BF0); // dá o controle do campo A
  const big = s.put(0, 'OGN-142', 'hand'); // Mountain Drake
  s.put(0, 'SFD-111', 'hand');
  const cost = s.e.printedCost(big);
  s.runes(0, Array(2 + Math.max(0, cost.energy - 3)).fill(B).concat(Array(cost.power.length + 1).fill(B)));
  s.go();
  s.pick('Jogar Here to Help');
  s.passAll(1);
  s.pickObj(big);
  s.passAll();
  assert.equal(big.zone, 'board', s.log(15));
  assert.deepEqual(big.loc, BF0);
});

test('Kato the Arm: ao se mover para um campo, dá palavras-chave e Might a outra unidade aliada', () => {
  const s = new Scenario();
  const kato = s.put(0, 'SFD-112', base(0)); // 3, Deflect
  const ally = s.put(0, 'OGN-136', base(0)); // 2
  s.go();
  moveTo(s, [kato.id], 'Campo Vazio A');
  s.maybeObj(ally);
  s.passAll();
  assert.equal(s.e.might(ally), 5, s.log(10));
  assert.equal(s.e.kw(ally).deflect, 1);
});

test('Lucian, Merciless: só a primeira conquista no turno o prepara', () => {
  const s = new Scenario();
  const l = s.put(0, 'SFD-113', base(0));
  s.go();
  moveTo(s, [l.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(l.exhausted, false, s.log(10));
  // move de novo: precisa de Ganking para ir de campo a campo; volta para a base e ... usa o efeito direto
  const ev = { type: 'conquer', player: 0, bf: 1, excess: 0, units: [l.id] } as any;
  l.exhausted = true;
  s.e.emit(ev);
  assert.equal(s.e.pending.length, 0, 'segunda conquista no turno não dispara');
});

test('Marching Orders: dano mútuo e Repeat com alvos diferentes, sem limpeza entre as execuções', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-136', base(0)); // 2 na base
  const a = s.put(1, 'OGN-136', BF0);
  const b = s.put(1, 'OGN-136', BF0);
  s.put(0, 'SFD-114', 'hand');
  s.runes(0, Array(6).fill(B));
  s.go();
  s.pick('Jogar Marching Orders');
  s.maybeObj(mine);
  s.pickObj(a);
  s.pick('Sim'); // Repeat
  s.maybeObj(mine);
  s.pickObj(b);
  s.passAll();
  assert.equal(a.zone, 'trash', s.log(15));
  assert.equal(b.zone, 'trash');
  assert.equal(mine.zone, 'trash', 'a unidade aliada recebe 2 + 2');
});

test('Yone: conquistar campo sem controlador causa dano igual ao Might a uma unidade inimiga numa base', () => {
  const s = new Scenario();
  const y = s.put(0, 'SFD-116', base(0)); // 5
  const foe = s.put(1, 'OGN-142', base(1)); // 10
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(foe.damage, 5, s.log(10));
});

test('Yone: conquistar campo que era do inimigo (combate) não dispara', () => {
  const s = new Scenario();
  const y = s.put(0, 'SFD-116', base(0)); // 5
  s.put(1, 'OGN-136', BF0); // campo de B
  const foe = s.put(1, 'OGN-142', base(1));
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0, s.log(10));
  assert.equal(foe.damage, 0);
});

test('Ancient Henge: paga energia para adicionar o mesmo tanto de power de qualquer domínio', () => {
  const s = new Scenario();
  s.put(0, 'SFD-117', base(0));
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Ancient Henge');
  s.pick('2 de energia');
  assert.equal(s.e.pl[0].pool.power.any, 2);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 2);
});

test('Jax, Unrelenting: ao prender um equipamento nele, pode pagar [1] para comprar 1', () => {
  const s = new Scenario();
  const blade = s.put(0, 'SFD-095', base(0));
  s.put(0, 'SFD-119', 'hand');
  s.runes(0, Array(7).fill(B));
  s.go();
  s.pick('Jogar Jax');
  maybe(s, 'base de A');
  s.pick('Sim'); // Weaponmaster
  s.passAll(1);
  s.maybeObj(blade);
  const h = s.e.pl[0].hand.length;
  for (let i = 0; i < 6 && s.g.current; i++) {
    if (s.d.prompt.includes('Pagar [1] para comprar')) s.pick('Sim');
    else if (s.d.kind === 'priority') s.pick('Passar');
    else break;
  }
  assert.equal(blade.attachedTo !== undefined, true, s.log(15));
  assert.equal(s.e.pl[0].hand.length, h + 1, s.log(15));
});

test('Sivir: conquista depois de ataque com 5+ de excedente causa esse dano a uma unidade inimiga', () => {
  const s = new Scenario();
  const sv = s.put(0, 'SFD-120', base(0)); // 7
  s.put(1, 'OGN-136', BF0); // 2 → excedente 5
  const far = s.put(1, 'OGN-142', base(1)); // 10
  s.go();
  moveTo(s, [sv.id], 'Campo Vazio A');
  for (let i = 0; i < 12 && s.g.current; i++) {
    if (s.d.prompt.includes('Causar o dano excedente')) s.pick('Sim');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Distribuir')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Sivir')) s.pickObj(far);
    else break;
  }
  assert.equal(far.damage, 5, s.log(20));
});
