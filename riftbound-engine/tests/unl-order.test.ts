// Testes de cenário das cartas do lote "order" do Unleashed (UNL-151 a UNL-180). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const ORDER = 'OGN-214';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const SERGEANT = 'OGN-219'; // Order, 4 de Might, sem tag
const PORO = 'OGN-210'; // Daring Poro: Order, 2 de Might, custo 2, Poro
const SCOUT = 'OGN-216'; // Soaring Scout: Order, 1 de Might, custo 2, Bird
const BIG = 'OGN-215'; // 5 de Might

const orders = (s: Scenario, p: P, n: number) => s.runes(p, Array(n).fill(ORDER));
const tokens = (s: Scenario, p: P, code: string) => s.e.board().filter((o) => o.code === code && o.controller === p);
const hand = (s: Scenario, p: P) => s.e.pl[p].hand.length;
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Passa a pilha e resolve a ordem de gatilhos simultâneos (primeira opção) até parar numa decisão de verdade. */
function drainAll(s: Scenario) {
  for (let k = 0; k < 40 && s.g.current; k++) {
    if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}
/** Encerra o turno de quem está jogando e o do oponente (volta ao jogador 0 no turno seguinte). */
function roundTrip(s: Scenario) {
  s.pick('Encerrar o turno');
  drainAll(s);
  s.pick('Encerrar o turno');
  drainAll(s);
}
/** Joga a carta e, se perguntar onde, escolhe o local pelo rótulo. */
function play(s: Scenario, name: string, where?: string) {
  s.pick(`Jogar ${name}`);
  if (where && s.d.prompt.startsWith(`Jogar ${name} onde`)) s.pick(where);
}
/** Mata a unidade com Vengeance (OGN-229, "Kill a unit"): uma ação de verdade, os gatilhos de morte resolvem. */
function vengeance(s: Scenario, u: Obj) {
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.maybeObj(u);
  s.passAll();
}

test('Bandle Soldier: entra pronta com 3+ XP (Level 3), exaurida com menos', () => {
  const s = new Scenario();
  s.e.pl[0].xp = 3;
  const a = s.put(0, 'UNL-151', 'hand');
  orders(s, 0, 5);
  s.go();
  play(s, 'Bandle Soldier', 'base');
  assert.equal(a.zone, 'board');
  assert.equal(a.exhausted, false);
  const s2 = new Scenario();
  s2.e.pl[0].xp = 2;
  const b = s2.put(0, 'UNL-151', 'hand');
  orders(s2, 0, 5);
  s2.go();
  play(s2, 'Bandle Soldier', 'base');
  assert.equal(b.exhausted, true);
});

test('Black Rose Dignitary e Carrion Dredger: Deathknell canaliza runa exaurida / joga ficha Bird com Deflect na base', () => {
  const s = new Scenario();
  const br = s.put(0, 'UNL-152', base(0));
  const cd = s.put(0, 'UNL-153', base(0));
  vengeance(s, br); // Vengeance: 4 runas exauridas + 2 recicladas
  assert.equal(br.zone, 'trash');
  const runes = s.e.runesOf(0);
  assert.equal(runes.length, 5);
  assert.match(s.log(10), /A canaliza 1 runa\(s\) exauridas/);
  vengeance(s, cd);
  const birds = tokens(s, 0, 'TOK-BIRD');
  assert.equal(birds.length, 1);
  assert.deepEqual(birds[0].loc, base(0));
  assert.equal(s.e.kw(birds[0]).deflect, 1);
});

test('Crimson Pigeons: +2 só atacando junto com outra unidade', () => {
  const s = new Scenario();
  const pig = s.put(0, 'UNL-154', BF0);
  const pal = s.put(0, SERGEANT, BF0);
  const en = s.put(1, BIG, BF0);
  assert.equal(s.e.might(pig), 3);
  pig.role = 'attacker';
  assert.equal(s.e.might(pig), 3, 'atacando sozinha');
  en.role = 'defender';
  assert.equal(s.e.might(pig), 3, 'defensora não conta');
  pal.role = 'attacker';
  assert.equal(s.e.might(pig), 5);
  // no combate de verdade: Pigeons (3+2) + Poro (2+1 Assault) = 8 matam um 7 (Rift Herald defendendo)
  const s2 = new Scenario();
  const p2 = s2.put(0, 'UNL-154', base(0));
  const q2 = s2.put(0, PORO, base(0));
  const d2 = s2.put(1, 'UNL-179', BF0);
  s2.go();
  moveTo(s2, [p2.id, q2.id], 'Campo Vazio A');
  s2.passAll();
  assert.equal(d2.zone, 'trash', s2.log(20));
});

test('Heroic Charge: aliada sem inimiga no local não é opção; +1 e atordoa a inimiga do local', () => {
  const s = new Scenario();
  const a = s.put(0, PORO, BF0);
  const lonely = s.put(0, SERGEANT, base(0));
  const e = s.put(1, SERGEANT, BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'UNL-155', 'hand');
  orders(s, 0, 3);
  s.go();
  play(s, 'Heroic Charge');
  // só a aliada com inimiga no local é candidata (escolha automática), e a única inimiga também
  assert.ok(!s.d.options?.some((o) => o.obj === lonely.id) || s.d.kind === 'priority');
  s.maybeObj(a);
  s.maybeObj(e);
  s.passAll();
  assert.equal(s.e.might(a), 3);
  assert.equal(e.stunned, true);
  assert.equal(s.e.might(lonely), 4);
});

test('Loyal Poro: compra 1 se não morreu sozinha; sozinha, nada', () => {
  const s = new Scenario();
  const lp = s.put(0, 'UNL-156', BF0);
  s.put(0, SERGEANT, BF0);
  vengeance(s, lp);
  assert.equal(hand(s, 0), 1, s.log(20));
  const s2 = new Scenario();
  const lp2 = s2.put(0, 'UNL-156', BF0);
  s2.put(0, SERGEANT, base(0));
  vengeance(s2, lp2);
  assert.equal(hand(s2, 0), 0);
});

test('Scrutinizing Sergeant: 1 XP por unidade aliada (contando ele)', () => {
  const s = new Scenario();
  s.put(0, PORO, base(0));
  s.put(0, PORO, BF0);
  s.put(1, PORO, BF1);
  s.put(0, 'UNL-157', 'hand');
  orders(s, 0, 6);
  s.go();
  play(s, 'Scrutinizing Sergeant', 'base');
  s.passAll();
  assert.equal(s.e.pl[0].xp, 3);
});

test("Shepherd's Heirloom: ganha 1 XP ao jogar; Equip gasta 1 XP e dá +2", () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  const h = s.put(0, 'UNL-158', 'hand');
  orders(s, 0, 2);
  s.go();
  play(s, "Shepherd's Heirloom");
  s.passAll();
  assert.equal(s.e.pl[0].xp, 1);
  s.pick("Equipar Shepherd's Heirloom");
  s.maybeObj(u);
  s.passAll();
  assert.equal(h.attachedTo, u.id);
  assert.equal(s.e.pl[0].xp, 0);
  assert.equal(s.e.might(u), 6);
  // sem XP, não dá para equipar
  const s2 = new Scenario();
  s2.put(0, SERGEANT, base(0));
  s2.put(0, 'UNL-158', base(0));
  s2.go();
  assert.ok(!s2.d.options.some((o) => o.label.startsWith('Equipar')));
});

test('Soul Harvest: só unidade em campo com 3 ou menos de Might', () => {
  const s = new Scenario();
  const small = s.put(1, PORO, BF0);
  s.put(1, SERGEANT, BF1);
  s.put(1, PORO, base(1));
  s.put(0, 'UNL-159', 'hand');
  orders(s, 0, 3);
  s.go();
  play(s, 'Soul Harvest');
  s.maybeObj(small);
  s.passAll();
  assert.equal(small.zone, 'trash');
});

test('Ultrasoft Poro: só num campo; [Tap] joga duas fichas Bird com Deflect', () => {
  const s = new Scenario();
  s.put(0, 'UNL-160', base(0));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Jogar duas fichas Bird')));
  const s2 = new Scenario();
  const up = s2.put(0, 'UNL-160', BF0);
  s2.e.bfs[0].controller = 0;
  s2.go();
  s2.pick('Jogar duas fichas Bird');
  s2.passAll();
  for (let k = 0; k < 2; k++) if (s2.d.prompt.startsWith('Ultrasoft Poro: onde')) s2.pick('base');
  s2.passAll();
  assert.equal(up.exhausted, true);
  assert.equal(tokens(s2, 0, 'TOK-BIRD').length, 2);
});

test('Divining Shells: Vision ao jogar; [Action] mate isto, [Tap]: +2 de Might', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  const sh = s.put(0, 'UNL-161', base(0));
  s.go();
  s.pick('+2 de Might');
  s.maybeObj(u);
  s.passAll();
  assert.equal(sh.zone, 'trash');
  assert.equal(s.e.might(u), 6);
});

test('Enthralling Protector: gastar 2 XP dá Buff; Hunt dá XP ao conquistar', () => {
  const s = new Scenario();
  const ep = s.put(0, 'UNL-162', base(0));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Gastar 2 XP')));
  s.e.pl[0].xp = 2;
  s.go();
  s.pick('Gastar 2 XP');
  s.passAll();
  assert.equal(ep.buffs, 1);
  assert.equal(s.e.pl[0].xp, 0);
  moveTo(s, [ep.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.pl[0].xp, 1, s.log(20));
});

test('Mageseeker Investigator: oponente paga [A] por unidade além da primeira para mover várias para o campo dele', () => {
  const s = new Scenario();
  s.put(1, 'UNL-163', BF0);
  const a = s.put(0, PORO, base(0));
  const b = s.put(0, PORO, base(0));
  const c = s.put(0, PORO, base(0));
  s.go();
  // sem runas: mover 2 para o campo A não é opção; para o B, sim
  s.pick('Mover unidades');
  s.ok([a.id, b.id]);
  // o único destino possível (B) é escolhido sozinho
  assert.deepEqual(a.loc, BF1);
  const s1 = new Scenario();
  s1.put(1, 'UNL-163', BF0);
  const a1 = s1.put(0, PORO, base(0));
  const b1 = s1.put(0, PORO, base(0));
  const c1 = s1.put(0, PORO, base(0));
  orders(s1, 0, 2);
  s1.go();
  moveTo(s1, [a1.id, b1.id, c1.id], 'Campo Vazio A');
  assert.match(s1.d.prompt, /exige pagar 0 \+ \[qualquer, qualquer\]/);
  s1.pick('Sim');
  assert.match(s1.log(30), /Daring Poro, Daring Poro, Daring Poro → Campo Vazio A/);
  assert.equal(s1.e.runesOf(0).length, 0, 'as duas runas recicladas para pagar o power');
  void c;
  // uma unidade só: sem custo
  const s2 = new Scenario();
  s2.put(1, 'UNL-163', BF0);
  const d = s2.put(0, PORO, base(0));
  s2.go();
  moveTo(s2, [d.id], 'Campo Vazio A');
  assert.match(s2.log(30), /Daring Poro → Campo Vazio A/);
});

test('Safety Inspector: cada jogador mata uma unidade; pagando 3 XP, só o oponente', () => {
  const s = new Scenario();
  const mine = s.put(0, PORO, base(0));
  const theirs = s.put(1, PORO, base(1));
  s.put(0, 'UNL-164', 'hand');
  orders(s, 0, 6);
  s.go();
  play(s, 'Safety Inspector', 'base');
  s.passAll();
  assert.match(s.d.prompt, /Safety Inspector: qual unidade sua/);
  s.pickObj(mine);
  s.passAll();
  assert.equal(mine.zone, 'trash');
  assert.equal(theirs.zone, 'trash');
  const s2 = new Scenario();
  s2.e.pl[0].xp = 3;
  const m2 = s2.put(0, PORO, base(0));
  const t2 = s2.put(1, PORO, base(1));
  s2.put(0, 'UNL-164', 'hand');
  orders(s2, 0, 6);
  s2.go();
  play(s2, 'Safety Inspector', 'base');
  s2.pick('Sim'); // 3 XP
  s2.passAll();
  assert.equal(s2.e.pl[0].xp, 0);
  assert.equal(m2.zone, 'board');
  assert.equal(t2.zone, 'trash');
});

test("Shadow's Call: dá Temporary e compra 2; a unidade morre no início do turno seguinte do dono", () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  s.put(0, 'UNL-165', 'hand');
  for (let k = 0; k < 5; k++) s.put(0, PORO, 'deckTop');
  orders(s, 0, 2);
  s.go();
  play(s, "Shadow's Call");
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.kw(u).temporary, true);
  assert.equal(hand(s, 0), 2);
  roundTrip(s);
  assert.equal(u.zone, 'trash', s.log(20));
});

test('Stalking Wolf: precisa matar um Bird/Cat/Dog/Poro seu; com Ambush entra no campo do Poro mesmo ele morrendo', () => {
  const s = new Scenario();
  s.put(0, SERGEANT, base(0));
  s.put(0, 'UNL-166', 'hand');
  orders(s, 0, 5);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Stalking Wolf')));
  const s2 = new Scenario();
  const poro = s2.put(0, PORO, BF0);
  s2.e.bfs[0].controller = null;
  const w = s2.put(0, 'UNL-166', 'hand');
  orders(s2, 0, 5);
  s2.go();
  play(s2, 'Stalking Wolf', 'Campo Vazio A');
  s2.maybeObj(poro);
  s2.passAll();
  assert.equal(poro.zone, 'trash');
  assert.deepEqual(w.loc, BF0);
});

test('Starhound: devolve um Bird/Cat/Dog/Poro do descarte para a mão', () => {
  const s = new Scenario();
  const p = s.put(0, PORO, 'trash');
  s.put(0, SERGEANT, 'trash');
  s.put(0, 'UNL-167', 'hand');
  orders(s, 0, 6);
  s.go();
  play(s, 'Starhound', 'base');
  s.passAll();
  assert.equal(p.zone, 'hand');
});

test('Undying Loyalty: custa [2] a menos escolhendo um Poro; joga do descarte ignorando o custo', () => {
  const s = new Scenario();
  const p = s.put(0, PORO, 'trash');
  s.put(0, 'UNL-153', 'trash'); // Carrion Dredger: custo 2, sem tag
  s.put(0, 'UNL-168', 'hand');
  orders(s, 0, 1); // só o [Order]: dá para jogar só com o desconto
  s.go();
  play(s, 'Undying Loyalty');
  // sem energia, só o Poro é escolha pagável (o Dredger custaria [2])
  s.maybeObj(p);
  s.passAll();
  if (s.d.prompt.startsWith('Jogar Daring Poro onde')) s.pick('base');
  s.passAll();
  assert.equal(p.zone, 'board');
  assert.match(s.log(20), /A paga 0 de energia \+ 1 power/);
  // sem tag: custo cheio
  const s2 = new Scenario();
  const dr = s2.put(0, 'UNL-153', 'trash');
  const ul = s2.put(0, 'UNL-168', 'hand');
  orders(s2, 0, 1);
  s2.go();
  assert.ok(!s2.d.options.some((o) => o.label.includes('Undying Loyalty')));
  orders(s2, 0, 2);
  s2.go();
  play(s2, 'Undying Loyalty');
  s2.maybeObj(dr);
  s2.passAll();
  if (s2.d.prompt.startsWith('Jogar Carrion Dredger onde')) s2.pick('base');
  s2.passAll();
  assert.equal(dr.zone, 'board');
  assert.equal(ul.zone, 'trash');
  assert.match(s2.log(20), /A paga 2 de energia \+ 1 power/);
});

test('Ashe, Focused: bane uma carta da mão do oponente; volta quando ele segura um campo', () => {
  const s = new Scenario();
  const x = s.put(1, SERGEANT, 'hand');
  s.put(1, PORO, 'hand');
  s.put(0, 'UNL-169', 'hand');
  orders(s, 0, 6);
  s.go();
  play(s, 'Ashe, Focused', 'base');
  s.passAll();
  s.pickObj(x);
  assert.equal(x.zone, 'banish');
  // o oponente controla o campo B e segura no início do turno dele
  s.put(1, PORO, BF1);
  s.e.bfs[1].controller = 1;
  s.go();
  s.pick('Encerrar o turno');
  s.passAll();
  assert.equal(x.zone, 'hand', s.log(20));
});

test('Atakhan: matar uma aliada reduz o custo pelo custo dela; ao atacar, o defensor mata uma unidade dele lá', () => {
  const s = new Scenario();
  const fod = s.put(0, 'UNL-164', base(0)); // Safety Inspector: 5 energia + 1 power
  const at = s.put(0, 'UNL-170', 'hand');
  orders(s, 0, 7); // 10-5 = 5 de energia, 3-1 = 2 power: 7 runas
  s.go();
  play(s, 'Atakhan', 'base');
  s.pick('Sim');
  s.maybeObj(fod);
  s.passAll();
  assert.equal(fod.zone, 'trash');
  assert.equal(at.zone, 'board', s.log(20));
  // ataque
  const s2 = new Scenario();
  const a2 = s2.put(0, 'UNL-170', base(0));
  const d1 = s2.put(1, PORO, BF0);
  const d2 = s2.put(1, PORO, BF0);
  s2.go();
  moveTo(s2, [a2.id], 'Campo Vazio A');
  s2.passAll();
  if (s2.d.prompt.startsWith('Atakhan: qual unidade sua')) s2.pickObj(d1);
  s2.passAll();
  assert.equal(d1.zone, 'trash');
  assert.equal(d2.zone, 'trash'); // morre no combate (7 contra 2)
});

test('Galio, Indefatigable: não causa dano de combate', () => {
  const s = new Scenario();
  const g = s.put(0, 'UNL-171', base(0));
  const e = s.put(1, PORO, BF0);
  s.go();
  moveTo(s, [g.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(e.zone, 'board');
  assert.equal(s.e.combatMight(g), 0);
});

test('LeBlanc, Fragmented: compra 1; morrendo na sua Beginning Phase (Temporary), compra 2', () => {
  const s = new Scenario();
  const lb = s.put(0, 'UNL-172', base(0));
  vengeance(s, lb);
  assert.equal(hand(s, 0), 1);
  const s2 = new Scenario();
  const lb2 = s2.put(0, 'UNL-172', base(0));
  for (let k = 0; k < 6; k++) s2.put(0, PORO, 'deckTop');
  s2.e.addEffect({ target: lb2.id, kw: { temporary: true }, until: 'perm' });
  s2.go();
  roundTrip(s2);
  assert.equal(lb2.zone, 'trash');
  assert.match(s2.log(20), /Resolve: LeBlanc, Fragmented: Deathknell[^\n]*\nA compra 2\./);
});

test('Sacrifice: precisa de unidade Mighty sua; compra 2 e canaliza 1 exaurida', () => {
  const s = new Scenario();
  s.put(0, SERGEANT, base(0));
  s.put(0, 'UNL-173', 'hand');
  orders(s, 0, 1);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Sacrifice')));
  const big = s.put(0, BIG, base(0));
  s.go();
  play(s, 'Sacrifice');
  s.maybeObj(big);
  s.passAll();
  assert.equal(big.zone, 'trash');
  assert.equal(hand(s, 0), 2);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 2);
});

test('Shard of Undoing: a primeira morte aliada na sua Beginning Phase faz o oponente matar uma unidade (uma vez)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-174', base(0));
  const t1 = s.put(0, PORO, base(0));
  const t2 = s.put(0, PORO, base(0));
  s.e.addEffect({ target: t1.id, kw: { temporary: true }, until: 'perm' });
  s.e.addEffect({ target: t2.id, kw: { temporary: true }, until: 'perm' });
  const e1 = s.put(1, PORO, base(1));
  const e2 = s.put(1, PORO, base(1));
  s.go();
  s.pick('Encerrar o turno');
  drainAll(s);
  s.pick('Encerrar o turno');
  for (let k = 0; k < 10; k++) {
    drainAll(s);
    if (s.d.prompt.startsWith('Shard of Undoing')) s.pickObj(e1);
    else break;
  }
  assert.equal(t1.zone, 'trash');
  assert.equal(t2.zone, 'trash');
  const dead = [e1, e2].filter((x) => x.zone === 'trash').length;
  assert.equal(dead, 1, s.log(30));
});

test('Tactical Retreat: a próxima morte vira cura, exaurir e recall', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, BF0);
  s.put(0, 'UNL-175', 'hand');
  orders(s, 0, 2);
  s.go();
  play(s, 'Tactical Retreat');
  s.maybeObj(u);
  s.passAll();
  vengeance(s, u);
  assert.equal(u.zone, 'board');
  assert.deepEqual(u.loc, base(0));
  assert.equal(u.exhausted, true);
});

test('Vi, Peacekeeper: atordoa uma inimiga aqui ao atacar', () => {
  const s = new Scenario();
  const vi = s.put(0, 'UNL-176', base(0));
  const e = s.put(1, SERGEANT, BF0);
  s.go();
  moveTo(s, [vi.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(e.stunned || e.zone === 'trash', true);
  assert.equal(e.zone, 'trash'); // 5 contra 0 (atordoada)
  assert.equal(vi.zone, 'board');
});

test('Ivern: ganha a tag escolhida; conquista dá 1 ponto com Bird, Cat, Dog e Poro entre as suas unidades', () => {
  const s = new Scenario();
  s.put(0, SCOUT, base(0)); // Bird
  s.put(0, 'UNL-166', base(0)); // Dog
  s.put(0, PORO, base(0)); // Poro
  const iv = s.put(0, 'UNL-177', 'hand');
  orders(s, 0, 6);
  s.go();
  play(s, 'Ivern, Friend to all', 'base');
  s.pick('Cat');
  s.passAll();
  assert.equal(s.e.hasTag(iv, 'Cat'), true);
  iv.exhausted = false;
  s.go();
  moveTo(s, [iv.id], 'Campo Vazio A');
  s.passAll();
  // 1 da conquista + 1 do Ivern
  assert.equal(s.e.pl[0].points, 2, s.log(20));
});

test('Poppy, Defender of the Meek: gastar 3 XP reduz [3]', () => {
  const s = new Scenario();
  s.e.pl[0].xp = 3;
  const pp = s.put(0, 'UNL-178', 'hand');
  orders(s, 0, 4); // 6-3 = 3 de energia + 1 power
  s.go();
  play(s, 'Poppy, Defender of the Meek', 'base');
  s.pick('Sim');
  s.passAll();
  assert.equal(pp.zone, 'board');
  assert.equal(s.e.pl[0].xp, 0);
  assert.equal(s.e.kw(pp).tank, true);
});

test('Rift Herald: ao ir para um campo, compra uma unidade do topo; Deathknell joga unidade da mão ignorando a energia', () => {
  const s = new Scenario();
  const rh = s.put(0, 'UNL-179', base(0));
  const top = s.put(0, SERGEANT, 'deckTop');
  s.go();
  moveTo(s, [rh.id], 'Campo Vazio A');
  s.passAll();
  if (s.d.prompt.startsWith('Rift Herald: revelar')) s.pickObj(top);
  s.passAll();
  assert.equal(top.zone, 'hand', s.log(20));
  vengeance(s, rh);
  if (s.d.prompt.startsWith('Rift Herald: jogar')) s.pickObj(top);
  s.passAll();
  assert.equal(top.zone, 'board', s.log(20));
  assert.deepEqual(top.loc, base(0));
});

test('The Ruination: mata todas as unidades', () => {
  const s = new Scenario();
  const a = s.put(0, SERGEANT, base(0));
  const b = s.put(1, SERGEANT, BF0);
  s.put(0, 'UNL-180', 'hand');
  orders(s, 0, 12);
  s.go();
  play(s, 'The Ruination');
  s.passAll();
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
});
