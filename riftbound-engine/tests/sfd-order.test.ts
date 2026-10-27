// Testes de cenário das cartas do lote "order" do Spiritforged (SFD-151 a SFD-180). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const ORDER = 'OGN-214';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const SERGEANT = 'OGN-219'; // Order, 4 de Might
const PORO = 'OGN-210'; // Order, 2 de Might, Assault
const SCOUT = 'OGN-216'; // Order, 1 de Might, custo 2

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
const orders = (s: Scenario, p: P, n: number) => s.runes(p, Array(n).fill(ORDER));
const tokens = (s: Scenario, p: P, code: string) => s.e.board().filter((o) => o.code === code && o.controller === p);
const golds = (s: Scenario, p: P) => tokens(s, p, 'TOK-GOLD');
const recruits = (s: Scenario, p: P) => tokens(s, p, 'TOK-RECRUIT');
const hand = (s: Scenario, p: P) => s.e.pl[p].hand.length;
/** Mata a unidade com Vengeance (OGN-229, "Kill a unit"), uma ação de verdade: os gatilhos de morte resolvem. */
function vengeance(s: Scenario, u: Obj) {
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.maybeObj(u);
  s.passAll();
}

test('Bonds of Strength: +1 em duas aliadas; com Repeat, de novo (neste turno)', () => {
  const s = new Scenario();
  const a = s.put(0, SERGEANT, base(0));
  const b = s.put(0, PORO, base(0));
  s.put(0, 'SFD-151', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Bonds of Strength');
  s.pick('Sim'); // Repeat
  s.passAll();
  assert.equal(s.e.might(a), 6);
  assert.equal(s.e.might(b), 4);
  assert.ok(s.e.effects.some((e) => e.target === a.id && e.until === 'turn'));
});

test('Bonds of Strength: precisa de duas unidades aliadas', () => {
  const s = new Scenario();
  s.put(0, SERGEANT, base(0));
  s.put(0, 'SFD-151', 'hand');
  orders(s, 0, 2);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Bonds of Strength')));
});

test('Eminent Benefactor e Trove Golem: fichas Gold exauridas na base', () => {
  const s = new Scenario();
  s.put(0, 'SFD-174', 'hand');
  orders(s, 0, 10);
  s.go();
  s.pick('Jogar Trove Golem');
  s.passAll();
  assert.equal(golds(s, 0).length, 4);
  assert.ok(golds(s, 0).every((g) => g.exhausted && g.loc?.t === 'base'));
  // Benefactor segura o campo no começo do turno seguinte do dono
  const s2 = new Scenario();
  s2.put(0, 'SFD-152', BF0);
  s2.e.bfs[0].controller = 0;
  s2.go();
  s2.pick('Encerrar o turno');
  s2.passAll();
  s2.pick('Encerrar o turno');
  s2.passAll();
  assert.equal(golds(s2, 0).length, 2, s2.log(20));
  assert.ok(golds(s2, 0).every((g) => g.exhausted));
});

test('Eye of the Herald: equipada, a unidade que se move joga um Recruit no destino', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  const eye = s.put(0, 'SFD-153', base(0));
  orders(s, 0, 1);
  s.go();
  s.pick('Equipar Eye of the Herald');
  s.passAll();
  assert.equal(eye.attachedTo, u.id);
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll();
  const r = recruits(s, 0);
  assert.equal(r.length, 1, s.log(20));
  assert.deepEqual(r[0].loc, BF0);
  // sem a Eye, mover não faz nada
  const v = s.put(0, PORO, base(0));
  s.go();
  moveTo(s, [v.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(recruits(s, 0).length, 1);
});

test('Guards!: Sand Soldier onde escolher; pagar [Order] para prepará-lo na resolução', () => {
  const s = new Scenario();
  s.put(0, 'SFD-154', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Guards!');
  s.passAll();
  assert.match(s.d.prompt, /pagar \[Order\] para preparar/);
  s.pick('Sim');
  const sand = tokens(s, 0, 'TOK-SAND');
  assert.equal(sand.length, 1);
  assert.equal(sand[0].exhausted, false);
  assert.deepEqual(sand[0].loc, base(0));
});

test('Guards! escondida: a ficha vai para o campo onde estava escondida (811.1.d.3)', () => {
  const s = new Scenario();
  s.put(0, PORO, BF0); // controla o campo A
  const gd = s.put(0, 'SFD-154', 'hand');
  orders(s, 0, 1);
  s.go();
  s.pick('Esconder Guards!');
  assert.equal(gd.zone, 'facedown');
  gd.hiddenTurn = s.e.turn - 1;
  s.go();
  s.pick('Jogar Guards! (escondida');
  s.passAll();
  const sand = tokens(s, 0, 'TOK-SAND');
  assert.equal(sand.length, 1);
  assert.deepEqual(sand[0].loc, BF0);
  assert.equal(sand[0].exhausted, true, 'sem runas para pagar [Order]');
});

test('Zaun Punk: matar um gear seu como custo faz o gatilho matar um gear; sem o custo, nada', () => {
  const s = new Scenario();
  const mine = s.put(0, 'SFD-161', base(0));
  const theirs = s.put(1, 'SFD-161', base(1));
  s.put(0, 'SFD-160', 'hand');
  orders(s, 0, 3);
  s.go();
  s.pick('Jogar Zaun Punk');
  s.pick('Sim'); // custo adicional
  s.passAll();
  assert.equal(mine.zone, 'trash');
  assert.equal(theirs.zone, 'trash', s.log(20));

  const s2 = new Scenario();
  const m2 = s2.put(0, 'SFD-161', base(0));
  const t2 = s2.put(1, 'SFD-161', base(1));
  s2.put(0, 'SFD-160', 'hand');
  orders(s2, 0, 3);
  s2.go();
  s2.pick('Jogar Zaun Punk');
  s2.pick('Não');
  s2.passAll();
  assert.equal(m2.zone, 'board');
  assert.equal(t2.zone, 'board');
});

test('Blood Money: inimiga → 1 Gold; aliada → 2 Gold (exauridas)', () => {
  const s = new Scenario();
  const en = s.put(1, PORO, BF0);
  s.put(0, 'SFD-162', 'hand');
  orders(s, 0, 2);
  s.go();
  s.pick('Jogar Blood Money');
  s.passAll();
  assert.equal(en.zone, 'trash');
  assert.equal(golds(s, 0).length, 1);
  assert.ok(golds(s, 0)[0].exhausted);

  const s2 = new Scenario();
  const fr = s2.put(0, PORO, BF1);
  s2.put(1, SERGEANT, BF0); // 4 de Might: não é alvo válido
  s2.put(0, 'SFD-162', 'hand');
  orders(s2, 0, 2);
  s2.go();
  s2.pick('Jogar Blood Money');
  s2.passAll();
  assert.equal(fr.zone, 'trash');
  assert.equal(golds(s2, 0).length, 2);
});

test('Deathgrip: mata uma aliada, dá o Might dela a outra e compra 1', () => {
  const s = new Scenario();
  const a = s.put(0, SERGEANT, base(0));
  const b = s.put(0, PORO, base(0));
  s.put(0, 'SFD-163', 'hand');
  orders(s, 0, 2);
  s.go();
  s.pick('Jogar Deathgrip');
  s.pickObj(a);
  s.passAll();
  assert.equal(a.zone, 'trash');
  assert.equal(s.e.might(b), 6);
  assert.equal(hand(s, 0), 1);
});

test('Deathgrip + Soraka: a morte é substituída, sem bônus, mas compra 1 (RiftJudge #8731)', () => {
  const s = new Scenario();
  const sor = s.put(0, 'SFD-173', base(0)); // 4 de Might
  const x = s.put(0, PORO, base(0)); // 2 < 4
  const y = s.put(0, SCOUT, base(0));
  x.damage = 1;
  s.put(0, 'SFD-163', 'hand');
  orders(s, 0, 2);
  s.go();
  s.pick('Jogar Deathgrip');
  s.pickObj(x);
  s.pickObj(y);
  s.passAll();
  assert.equal(x.zone, 'board');
  assert.equal(x.exhausted, true);
  assert.equal(x.damage, 0);
  assert.equal(s.e.might(y), 1, 'sem bônus');
  assert.equal(hand(s, 0), 1);
  assert.equal(sor.zone, 'board');
});

test('Soraka: só salva quem tem menos Might, no mesmo local; recall cura e exaure', () => {
  const s = new Scenario();
  s.put(0, 'SFD-173', BF0);
  const small = s.put(0, PORO, BF0);
  const big = s.put(0, 'OGN-215', BF0); // 5 de Might
  const far = s.put(0, SCOUT, base(0));
  s.e.kill(small);
  s.e.kill(big);
  s.e.kill(far);
  assert.equal(small.zone, 'board');
  assert.deepEqual(small.loc, base(0));
  assert.equal(small.exhausted, true);
  assert.equal(big.zone, 'trash');
  assert.equal(far.zone, 'trash');
  assert.equal(s.e.script(s.e.objs[s.e.units().find((u) => u.code === 'SFD-173')!.id]).damageLast!(s.e, small), true);
});

test('Drag Under: custa [2] a menos fora da mão', () => {
  const s = new Scenario();
  const d = s.put(0, 'SFD-164', 'hand');
  assert.equal(s.e.minCostFor(0, d, 'hand').energy, 5);
  s.e.toZone(d, 'trash');
  assert.equal(s.e.effectCost(0, d, s.e.printedCost(d)).energy, 3);
  s.e.toZone(d, 'banish');
  assert.equal(s.e.effectCost(0, d, s.e.printedCost(d)).energy, 3);
});

test('Glasc Mixologist: morrendo sozinho no campo, joga do descarte uma unidade barata lá mesmo', () => {
  const s = new Scenario();
  const glasc = s.put(0, 'SFD-165', BF0);
  const poro = s.put(0, PORO, 'trash');
  s.put(0, SERGEANT, 'trash'); // custo 4: não serve
  s.put(0, 'SFD-164', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Drag Under');
  s.passAll();
  assert.equal(glasc.zone, 'trash');
  s.pick('Sim'); // você pode
  s.passAll();
  assert.match(s.d.prompt, /Jogar Daring Poro onde/);
  assert.ok(s.d.options.some((o) => o.label === 'Campo Vazio A'), 'ainda controla o campo (RiftJudge #11226)');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(poro.zone, 'board');
  assert.deepEqual(poro.loc, BF0);
  assert.equal(s.e.bfs[0].controller, 0);
});

test('Rally the Troops: compra 1; as aliadas jogadas no resto do turno (e fichas) ganham Buff', () => {
  const s = new Scenario();
  const before = s.put(0, PORO, base(0));
  s.put(0, 'SFD-166', 'hand');
  s.put(0, PORO, 'hand');
  s.put(0, 'SFD-168', base(0)); // Vanguard Armory
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Rally the Troops');
  s.passAll();
  assert.equal(hand(s, 0), 2);
  s.pick('Jogar Daring Poro');
  s.passAll();
  const poros = s.e.units().filter((u) => u.code === PORO && u.id !== before.id);
  assert.equal(poros[0].buffs, 1);
  assert.equal(before.buffs, 0);
  s.pick('Vanguard Armory: Três fichas Recruit');
  s.passAll();
  assert.equal(recruits(s, 0).length, 3);
  assert.ok(recruits(s, 0).every((r) => r.buffs === 1), s.log(20));
});

test('Unsung Hero: compra 2 só se era Mighty ao morrer', () => {
  const s = new Scenario();
  const u = s.put(0, 'SFD-167', base(0));
  vengeance(s, u);
  assert.equal(u.zone, 'trash');
  assert.equal(hand(s, 0), 0);
  const v = s.put(0, 'SFD-167', base(0));
  s.e.giveMight(v, 3);
  vengeance(s, v);
  assert.equal(hand(s, 0), 2, s.log(10));
});

test('Altar of Memories: aliada morre → exaurir, comprar 1 e pôr uma carta da mão no fundo do deck', () => {
  const s = new Scenario();
  const altar = s.put(0, 'SFD-169', base(0));
  const u = s.put(0, PORO, base(0));
  const keep = s.put(0, SERGEANT, 'hand');
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.maybeObj(u);
  s.passAll();
  assert.match(s.d.prompt, /Altar of Memories/);
  s.pick('Sim');
  s.passAll();
  assert.equal(altar.exhausted, true);
  s.pickObj(keep);
  s.pick('Fundo do deck');
  const deck = s.e.pl[0].mainDeck;
  assert.equal(deck[deck.length - 1], keep.id);
});

test("Rek'Sai: ao atacar revela 2, bane uma unidade e a joga aqui; recicla o resto; Undertitan revelada dá [2]", () => {
  const s = new Scenario();
  s.put(1, PORO, BF0);
  const rek = s.put(0, 'SFD-170', base(0));
  // topo: Undertitan (revelada: +2 de energia) e Sergeant (custo 4)
  const sg = s.put(0, SERGEANT, 'deckTop');
  const ut = s.put(0, 'SFD-175', 'deckTop');
  orders(s, 0, 2);
  s.go();
  moveTo(s, [rek.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !/Revelar/.test(s.d.prompt); i++) s.passAll(1);
  s.pick('Sim');
  s.passAll();
  assert.equal(s.e.pl[0].pool.energy, 2, 'Undertitan revelada adiciona [2]\n' + s.log(20));
  s.pickObj(sg);
  s.pick('(aqui)');
  s.passAll();
  assert.equal(sg.zone, 'board');
  assert.deepEqual(sg.loc, BF0);
  assert.equal(ut.zone, 'mainDeck');
  assert.equal(s.e.pl[0].mainDeck[s.e.pl[0].mainDeck.length - 1], ut.id, 'reciclada no fundo');
});

test('Renata Glasc, Industrialist: suas fichas entram prontas (inclusive Gold "exaurida")', () => {
  const s = new Scenario();
  s.put(0, 'SFD-171', base(0));
  s.put(0, 'SFD-174', 'hand');
  orders(s, 0, 10);
  s.go();
  s.pick('Jogar Trove Golem');
  s.passAll();
  assert.equal(golds(s, 0).length, 4);
  assert.ok(golds(s, 0).every((g) => !g.exhausted));
  // fichas do oponente não
  const t = s.e.createToken('TOK-RECRUIT', 1, base(1));
  assert.equal(t.exhausted, true);
});

test('Sacred Shears: a unidade equipada que morre compra 1 (2 com Karthus); a tesoura sozinha não', () => {
  const s = new Scenario();
  const u = s.put(0, PORO, base(0));
  const sh = s.put(0, 'SFD-172', base(0));
  s.e.attach(sh, u, 0);
  s.go();
  assert.equal(s.e.might(u), 3, '+1 da tesoura');
  vengeance(s, u);
  assert.equal(hand(s, 0), 1, s.log(10));
  assert.equal(sh.zone, 'board');
  assert.equal(sh.attachedTo, undefined);
  // tesoura morre sozinha: nada (Zaun Punk mata um gear)
  s.put(0, 'SFD-160', 'hand');
  orders(s, 0, 3);
  s.go();
  s.pick('Jogar Zaun Punk');
  s.pick('Sim');
  s.passAll();
  assert.equal(sh.zone, 'trash');
  assert.equal(hand(s, 0), 1);
  // com Karthus: duas vezes
  const v = s.put(0, PORO, base(0));
  const sh2 = s.put(0, 'SFD-172', base(0));
  s.e.attach(sh2, v, 0);
  s.put(0, 'OGN-236', base(0));
  vengeance(s, v);
  assert.equal(hand(s, 0), 3, s.log(10));
});

test('Undertitan: +2 neste turno para as outras unidades suas', () => {
  const s = new Scenario();
  const a = s.put(0, PORO, base(0));
  const en = s.put(1, PORO, base(1));
  s.put(0, 'SFD-175', 'hand');
  orders(s, 0, 7);
  s.go();
  s.pick('Jogar Undertitan');
  s.passAll();
  const ut = s.e.units().find((u) => u.code === 'SFD-175')!;
  assert.equal(s.e.might(a), 4);
  assert.equal(s.e.might(en), 2);
  assert.equal(s.e.might(ut), 5);
});

test('Undertitan só adiciona [2] quando revelada (não quando olhada)', () => {
  const s = new Scenario();
  const ut = s.put(0, 'SFD-175', 'deckTop');
  s.e.runSync(s.e.lookAtTop(0, [ut.id]));
  assert.equal(s.e.pl[0].pool.energy, 0);
  s.e.runSync(s.e.revealTop(0, 1));
  assert.equal(s.e.pl[0].pool.energy, 2);
});

test('Xin Zhao, Vigilant: entra pronta com duas outras unidades na base', () => {
  const s = new Scenario();
  s.put(0, PORO, base(0));
  s.put(0, 'SFD-176', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Xin Zhao');
  s.passAll();
  const x1 = s.e.units().find((u) => u.code === 'SFD-176')!;
  assert.equal(x1.exhausted, true);
  assert.equal(s.e.kw(x1).tank, true);
  const s2 = new Scenario();
  s2.put(0, PORO, base(0));
  s2.put(0, SCOUT, base(0));
  s2.put(0, 'SFD-176', 'hand');
  orders(s2, 0, 4);
  s2.go();
  s2.pick('Jogar Xin Zhao');
  s2.passAll();
  assert.equal(s2.e.units().find((u) => u.code === 'SFD-176')!.exhausted, false);
});

test('Azir, Sovereign: ao atacar, move as fichas escolhidas para este campo', () => {
  const s = new Scenario();
  s.put(1, PORO, BF0);
  const az = s.put(0, 'SFD-177', base(0));
  const r1 = s.e.createToken('TOK-RECRUIT', 0, base(0), true);
  const r2 = s.e.createToken('TOK-RECRUIT', 0, base(0), true);
  const notTok = s.put(0, SCOUT, base(0));
  s.go();
  moveTo(s, [az.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !/Mover fichas/.test(s.d.prompt); i++) s.passAll(1);
  s.pick('Sim');
  assert.match(s.d.prompt, /quais fichas/);
  assert.ok(!s.d.options.some((o) => o.obj === notTok.id));
  s.ok([r1.id, r2.id]);
  s.passAll();
  assert.ok([r1, r2].every((r) => r.zone === 'board' && r.loc?.t === 'bf' && r.loc.i === 0) || [r1, r2].every((r) => r.zone !== 'board'), s.log(20));
  assert.ok(s.e.log.some((l) => /Recruit, Recruit → Campo Vazio A/.test(l.text)), s.log(20));
});

test('Blade of the Ruined King: Equip paga [Order] e mata uma aliada; +4', () => {
  const s = new Scenario();
  const u = s.put(0, PORO, base(0));
  const victim = s.put(0, SCOUT, base(0));
  const blade = s.put(0, 'SFD-178', base(0));
  orders(s, 0, 1);
  s.go();
  s.pick('Equipar Blade of the Ruined King');
  s.pickObj(u);
  s.pickObj(victim);
  s.passAll();
  assert.equal(victim.zone, 'trash');
  assert.equal(blade.attachedTo, u.id);
  assert.equal(s.e.might(u), 6);
});

test('Blade of the Ruined King: matar o próprio alvo desfaz a ação (RiftJudge #1747); sem duas aliadas, não dá', () => {
  const s = new Scenario();
  const u = s.put(0, PORO, base(0));
  s.put(0, SCOUT, base(0));
  s.put(0, 'SFD-178', base(0));
  orders(s, 0, 1);
  s.go();
  // dirigido à mão (o desfazer do Game refaz a partida do zero e perderia a mesa montada)
  const e = s.e;
  const blade = e.board().find((o) => o.code === 'SFD-178')!;
  const gen = e.equip(0, blade);
  let r = gen.next(undefined as any);
  assert.match(r.value!.prompt, /anexar Blade/);
  r = gen.next([u.id]);
  assert.match(r.value!.prompt, /matar qual unidade aliada/);
  assert.throws(() => gen.next([u.id]), /Custo não pago/);
  const s2 = new Scenario();
  s2.put(0, PORO, base(0));
  s2.put(0, 'SFD-178', base(0));
  orders(s2, 0, 1);
  s2.go();
  assert.ok(!s2.d.options.some((o) => o.label.includes('Equipar')));
});

test('Corina Veraza: ao se mover para um campo, três Recruits lá', () => {
  const s = new Scenario();
  const c = s.put(0, 'SFD-179', base(0));
  s.go();
  moveTo(s, [c.id], 'Campo Vazio A');
  s.passAll();
  const r = recruits(s, 0);
  assert.equal(r.length, 3);
  assert.ok(r.every((x) => x.loc?.t === 'bf' && x.loc.i === 0));
});

test('Fiora, Worthy: unidade que se torna Mighty pode ser preparada por [Order]; entrar Mighty não conta', () => {
  const s = new Scenario();
  s.put(0, 'SFD-180', base(0));
  const u = s.put(0, SERGEANT, base(0), { ready: false });
  s.put(0, 'SFD-151', 'hand'); // Bonds of Strength: +1 → 5
  const big = s.put(0, 'OGN-215', base(0), { ready: false }); // já entra com 5
  orders(s, 0, 3);
  s.go();
  s.pick('Jogar Bonds of Strength');
  s.ok([u.id, s.e.units().find((x) => x.code === 'SFD-180')!.id]);
  if (s.d.prompt.startsWith('Pagar Repeat')) s.pick('Não');
  s.passAll();
  assert.match(s.d.prompt, /Pagar \[Order\] para preparar/, s.log(20));
  s.pick('Sim');
  s.passAll();
  assert.equal(u.exhausted, false);
  assert.equal(big.exhausted, true, 'entrou já Mighty: não se tornou Mighty');
});

test('Trusty Ramhound: +1 com outra unidade sua no mesmo local', () => {
  const s = new Scenario();
  const r = s.put(0, 'SFD-159', base(0));
  assert.equal(s.e.might(r), 2);
  s.put(1, PORO, base(1));
  assert.equal(s.e.might(r), 2);
  s.put(0, PORO, BF0);
  assert.equal(s.e.might(r), 2);
  s.put(0, PORO, base(0));
  assert.equal(s.e.might(r), 3);
});

test('Sandshifter: mata uma inimiga com 3 de Might ou menos', () => {
  const s = new Scenario();
  const small = s.put(1, PORO, base(1));
  const big = s.put(1, SERGEANT, base(1));
  s.put(0, 'SFD-158', 'hand');
  orders(s, 0, 7);
  s.go();
  s.pick('Jogar Sandshifter');
  s.passAll();
  assert.equal(small.zone, 'trash');
  assert.equal(big.zone, 'board');
});

test('Royal Guard: Sand Soldier aqui', () => {
  const s = new Scenario();
  s.put(0, 'SFD-157', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Royal Guard');
  s.passAll();
  const sand = tokens(s, 0, 'TOK-SAND');
  assert.equal(sand.length, 1);
  assert.deepEqual(sand[0].loc, base(0));
});

test('Honest Broker: Deathknell joga uma Gold exaurida', () => {
  const s = new Scenario();
  const b = s.put(0, 'SFD-155', base(0));
  vengeance(s, b);
  assert.equal(golds(s, 0).length, 1);
  assert.equal(golds(s, 0)[0].exhausted, true);
});

void ({} as Obj);
