// Testes de cenário das cartas do lote "order" (OGN-206 a OGN-246). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { P } from '../src/engine/types';

const ORDER = 'OGN-214';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const RECRUIT = 'TOK-RECRUIT';

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function maybe(s: Scenario, text: string) {
  if (!s.d.root && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}
const orders = (s: Scenario, p: P, n: number) => s.runes(p, Array(n).fill(ORDER));
const recruits = (s: Scenario, p: P) => s.e.units().filter((u) => u.code === RECRUIT && u.controller === p);

test('Back to Back: +2 em duas unidades aliadas; não dá para jogar com uma só', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-206', 'hand');
  orders(s, 0, 3);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Back to Back')), 'precisa de duas unidades aliadas');
  const b = s.put(0, 'OGN-210', base(0));
  s.go();
  s.put(1, 'OGN-210', base(1));
  s.go();
  s.pick('Jogar Back to Back');
  // só duas aliadas: as duas são escolhidas automaticamente
  s.passAll();
  assert.equal(s.e.might(a), 6);
  assert.equal(s.e.might(b), 4);
});

test('Call to Glory: gastar um Buff ignora o custo; +3 numa unidade', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-219', base(0));
  a.buffs = 1;
  s.put(0, 'OGN-207', 'hand');
  s.go();
  s.pick('Jogar Call to Glory');
  s.pick('Sim');
  s.maybeObj(a);
  s.passAll();
  assert.equal(a.buffs, 0);
  assert.equal(s.e.might(a), 7, '4 + 3');
});

test('Cruel Patron: precisa matar uma unidade aliada para ser jogado', () => {
  const s = new Scenario();
  s.put(0, 'OGN-208', 'hand');
  s.runes(0, Array(4).fill(ORDER));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Cruel Patron')), 'sem unidade para matar');
  const v = s.put(0, 'OGN-210', base(0));
  s.go();
  s.pick('Jogar Cruel Patron');
  s.passAll();
  assert.equal(v.zone, 'trash');
  assert.ok(s.e.units().some((u) => u.code === 'OGN-208'));
});

test('Cull the Weak: cada jogador mata uma das próprias unidades', () => {
  const s = new Scenario();
  const a1 = s.put(0, 'OGN-210', base(0));
  const a2 = s.put(0, 'OGN-219', base(0));
  const b1 = s.put(1, 'OGN-210', base(1));
  const b2 = s.put(1, 'OGN-219', base(1));
  s.put(0, 'OGN-209', 'hand');
  orders(s, 0, 3);
  s.go();
  s.pick('Jogar Cull the Weak');
  s.passAll();
  s.pickObj(a1);
  assert.equal(s.d.player, 1);
  s.pickObj(b2);
  s.passAll();
  assert.equal(a1.zone, 'trash');
  assert.equal(a2.zone, 'board');
  assert.equal(b1.zone, 'board');
  assert.equal(b2.zone, 'trash');
});

test('Faithful Manufactor e Vanguard Captain (Legion): fichas Recruit no mesmo lugar', () => {
  const s = new Scenario();
  s.put(0, 'OGN-210', BF0); // controla o campo A
  s.put(0, 'OGN-211', 'hand');
  s.put(0, 'OGN-218', 'hand');
  orders(s, 0, 8);
  s.go();
  s.pick('Jogar Faithful Manufactor');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(recruits(s, 0).length, 1);
  assert.deepEqual(recruits(s, 0)[0].loc, BF0);
  s.pick('Jogar Vanguard Captain');
  s.pick('base de A');
  s.passAll();
  const r = recruits(s, 0);
  assert.equal(r.length, 3, 'Legion: jogou outra carta antes');
  assert.equal(r.filter((u) => u.loc?.t === 'base').length, 2);
});

test('Vanguard Captain e Trifarian Gloryseeker sem Legion não fazem nada', () => {
  const s = new Scenario();
  s.put(0, 'OGN-218', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Vanguard Captain');
  s.passAll();
  assert.equal(recruits(s, 0).length, 0);
  s.put(0, 'OGN-217', 'hand');
  orders(s, 0, 2);
  s.go();
  s.pick('Jogar Trifarian Gloryseeker');
  s.passAll();
  const t = s.e.units().find((u) => u.code === 'OGN-217')!;
  assert.equal(t.buffs, 1, 'Legion: o Captain foi jogado antes');
});

test('Forge of the Future: Recruit na base; matar recicla até 4 cartas dos descartes', () => {
  const s = new Scenario();
  s.put(0, 'OGN-212', 'hand');
  const t1 = s.put(0, 'OGN-210', 'trash');
  const t2 = s.put(1, 'OGN-219', 'trash');
  orders(s, 0, 2);
  s.go();
  s.pick('Jogar Forge of the Future');
  s.passAll();
  assert.equal(recruits(s, 0).length, 1);
  s.pick('Matar isto');
  s.ok([t1.id, t2.id]);
  s.passAll();
  const forge = Object.values(s.e.objs).find((o) => o.code === 'OGN-212')!;
  assert.equal(forge.zone, 'trash');
  assert.equal(t1.zone, 'mainDeck');
  assert.equal(t2.zone, 'mainDeck');
  assert.equal(s.e.pl[1].mainDeck.at(-1), t2.id, 'volta para o fundo do deck do dono');
});

test('Hidden Blade: mata unidade num campo e o controlador dela compra 2', () => {
  const s = new Scenario();
  const v = s.put(1, 'OGN-219', BF1);
  s.put(0, 'OGN-213', 'hand');
  orders(s, 0, 3);
  s.go();
  const hand1 = s.e.pl[1].hand.length;
  s.pick('Jogar Hidden Blade');
  s.maybeObj(v);
  s.passAll();
  assert.equal(v.zone, 'trash');
  assert.equal(s.e.pl[1].hand.length, hand1 + 2);
});

test('Soaring Scout e Machine Evangel (Deathknell); Karthus faz disparar duas vezes', () => {
  const s = new Scenario();
  const scout = s.put(0, 'OGN-216', base(0));
  const evangel = s.put(0, 'OGN-239', base(0));
  s.put(0, 'OGN-229', 'hand');
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 12);
  s.go();
  const runes = s.e.runesOf(0).length;
  s.pick('Jogar Vengeance');
  s.pickObj(scout);
  s.passAll();
  assert.equal(s.e.runesOf(0).length, runes - 2 + 1, 'pagou 2 (power recicla runa) e canalizou 1');
  assert.ok(s.e.runesOf(0).some((r) => r.exhausted));
  s.put(0, 'OGN-236', base(0)); // Karthus
  s.go();
  s.pick('Jogar Vengeance');
  s.pickObj(evangel);
  s.passAll();
  assert.equal(recruits(s, 0).length, 6, 'Deathknell disparou duas vezes\n' + s.log(20));
});

test('Facebreaker: atordoa uma aliada e uma inimiga no mesmo campo (no combate)', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-219', BF0);
  const atk = s.put(0, 'OGN-215', base(0));
  const other = s.put(0, 'OGN-210', base(0));
  s.put(0, 'OGN-220', 'hand');
  orders(s, 0, 3);
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  assert.equal(s.d.player, 0);
  s.pick('Jogar Facebreaker');
  s.passAll();
  assert.equal(atk.stunned, true);
  assert.equal(def.stunned, true);
  assert.equal(other.stunned, false);
});

test('Imperial Decree: unidade que recebe dano morre (combate)', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-210', BF0); // 2
  const atk = s.put(0, 'OGN-219', base(0)); // 4
  s.put(0, 'OGN-221', 'hand');
  orders(s, 0, 7);
  s.go();
  s.pick('Jogar Imperial Decree');
  s.passAll();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(def.zone, 'trash');
  assert.equal(atk.zone, 'trash', 'recebeu 2 de dano e morreu pelo Decree\n' + s.log(20));
});

test('Noxian Drummer: ao se mover para um campo, Recruit lá', () => {
  const s = new Scenario();
  const d = s.put(0, 'OGN-222', base(0));
  s.go();
  moveTo(s, [d.id], 'Campo Vazio A');
  s.passAll();
  const r = recruits(s, 0);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].loc, BF0);
});

test('Peak Guardian: Buff em si e nas outras aliadas do campo', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-210', BF0);
  const b = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-223', 'hand');
  orders(s, 0, 7);
  s.go();
  s.pick('Jogar Peak Guardian');
  s.pick('Campo Vazio A');
  s.passAll();
  const pg = s.e.units().find((u) => u.code === 'OGN-223')!;
  assert.equal(pg.buffs, 1);
  assert.equal(a.buffs, 1);
  assert.equal(b.buffs, 0);
});

test('Salvage: mata um gear e compra 1; compra mesmo sem gear', () => {
  const s = new Scenario();
  const gear = s.put(1, 'OGN-245', base(1));
  s.put(0, 'OGN-224', 'hand');
  s.put(0, 'OGN-224', 'hand');
  orders(s, 0, 6);
  s.go();
  const h = s.e.pl[0].hand.length;
  s.pick('Jogar Salvage');
  s.pickObj(gear);
  s.passAll();
  s.pick('Sim'); // "você pode" matar: decidido na resolução (355.12)
  assert.equal(gear.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, h - 1 + 1);
  s.pick('Jogar Salvage');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, h, 'jogou a segunda e comprou 1');
});

test('Solari Chief: atordoa; se já estiver atordoada, mata', () => {
  const s = new Scenario();
  const a = s.put(1, 'OGN-219', base(1));
  const b = s.put(1, 'OGN-210', base(1));
  b.stunned = true;
  s.put(0, 'OGN-225', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Solari Chief');
  s.pickObj(b);
  s.passAll();
  assert.equal(b.zone, 'trash');
  assert.equal(a.stunned, false);
});

test('Spectral Matron: joga do descarte uma unidade de até 3 + 1 power, de graça', () => {
  const s = new Scenario();
  const cheap = s.put(0, 'OGN-218', 'trash'); // 3 + 1
  const pricey = s.put(0, 'OGN-215', 'trash'); // 5
  s.put(0, 'OGN-226', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Spectral Matron');
  s.passAll();
  s.pick('Sim'); // "você pode": ao pôr o gatilho na pilha (383.3.a)
  assert.ok(!s.d.options.some((o) => o.obj === pricey.id));
  s.maybeObj(cheap); // alvo no descarte, escolhido ao pôr o gatilho na pilha
  s.passAll();
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(cheap.zone, 'board');
  assert.equal(pricey.zone, 'trash');
});

test('Symbol of the Solari: empate do atacante chama de volta todas as unidades; o campo fica sem controle', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-215', BF0); // 5
  def.stunned = true; // não causa dano: 4 contra 5, as duas sobrevivem (empate)
  const atk = s.put(0, 'OGN-219', base(0)); // 4
  s.put(0, 'OGN-227', base(0));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(atk.zone, 'board');
  assert.equal(def.zone, 'board');
  assert.deepEqual(atk.loc, base(0));
  assert.deepEqual(def.loc, base(1), s.log(10));
  assert.equal(s.e.bfs[0].controller, null);
});

test('Vanguard Helm: aliada com Buff morre → Buff em outra aliada', () => {
  const s = new Scenario();
  s.put(0, 'OGN-228', base(0));
  const a = s.put(0, 'OGN-210', base(0));
  a.buffs = 1;
  const b = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.pickObj(a);
  s.passAll();
  assert.equal(b.buffs, 1, s.log());
});

test('Albus Ferros: gasta Buffs e canaliza uma runa exaurida por Buff', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-210', base(0));
  const b = s.put(0, 'OGN-219', base(0));
  a.buffs = 1;
  b.buffs = 1;
  s.put(0, 'OGN-230', 'hand');
  orders(s, 0, 4);
  s.go();
  s.pick('Jogar Albus Ferros');
  s.passAll();
  s.ok(s.d.options.filter((o) => o.obj === a.id || o.obj === b.id).map((o) => o.id));
  s.passAll();
  assert.equal(s.e.runesOf(0).length, 6);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 6);
});

test('Commander Ledros: cada unidade morta tira 1 [Order] do custo', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-210', base(0));
  const b = s.put(0, 'OGN-219', base(0));
  const c = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-231', 'hand');
  s.runes(0, ['OGN-007', 'OGN-007', 'OGN-007', 'OGN-007', ORDER, ORDER]); // só 2 [Order] para 4: precisa matar 2
  s.go();
  s.pick('Jogar Commander Ledros');
  s.pick('Sim');
  assert.equal(s.d.min, 2, 'mínimo para conseguir pagar');
  s.ok([a.id, b.id]);
  s.passAll();
  const l = s.e.units().find((u) => u.code === 'OGN-231');
  assert.ok(l, s.log());
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
  assert.equal(c.zone, 'board');
  assert.ok(s.e.kw(l!).deflect && s.e.kw(l!).ganking);
});

test('Fiora, Victorious: Mighty dá Deflect, Ganking e Shield; o próprio Shield não a torna Mighty', () => {
  const s = new Scenario();
  const f = s.put(0, 'OGN-232', base(0));
  const e = s.e;
  assert.ok(!e.kw(f).ganking);
  f.role = 'defender';
  assert.equal(e.might(f), 4, 'sem laço: o Shield dela não conta para ficar Mighty');
  f.role = undefined;
  f.buffs = 1;
  assert.ok(e.kw(f).ganking && e.kw(f).deflect && e.kw(f).shield);
  f.role = 'defender';
  assert.equal(e.might(f), 6);
});

test('Grand Strategem: +5 em todas as aliadas', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-210', base(0));
  const b = s.put(0, 'OGN-219', BF0);
  const x = s.put(1, 'OGN-219', base(1));
  s.put(0, 'OGN-233', 'hand');
  orders(s, 0, 9);
  s.go();
  s.pick('Jogar Grand Strategem');
  s.passAll();
  assert.equal(s.e.might(a), 7);
  assert.equal(s.e.might(b), 9);
  assert.equal(s.e.might(x), 4);
});

test('Karma, Channeler: Vision reciclando a carta do topo dá Buff', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-235', 'hand');
  orders(s, 0, 7);
  s.go();
  s.pick('Jogar Karma, Channeler');
  s.passAll();
  // Vision: recicla o topo
  s.ok([s.d.options[0].id]);
  s.passAll();
  if (!s.d.root) s.pickObj(u);
  s.passAll();
  assert.equal(u.buffs, 1, s.log());
});

test("King's Edict: o oponente escolhe uma das unidades dele para morrer", () => {
  const s = new Scenario();
  const a = s.put(1, 'OGN-219', base(1));
  const b = s.put(1, 'OGN-210', base(1));
  const mine = s.put(0, 'OGN-210', base(0));
  s.put(0, 'OGN-237', 'hand');
  orders(s, 0, 8);
  s.go();
  s.pick("Jogar King's Edict");
  s.passAll();
  assert.equal(s.d.player, 1);
  assert.ok(!s.d.options.some((o) => o.obj === mine.id));
  s.pickObj(b);
  s.passAll();
  assert.equal(b.zone, 'trash');
  assert.equal(a.zone, 'board');
});

test('Leona, Determined: ao atacar, atordoa uma inimiga do campo', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-219', BF0);
  const leona = s.put(0, 'OGN-238', base(0));
  s.go();
  moveTo(s, [leona.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text === 'Vanguard Sergeant fica atordoada (Stun).'), s.log(20));
  // Leona 4 contra Sergeant 4 atordoado: Sergeant morre, Leona fica
  assert.equal(def.zone, 'trash');
  assert.equal(leona.zone, 'board');
});

test('Sett, Kingpin: +1 por aliada com Buff no campo dele', () => {
  const s = new Scenario();
  const sett = s.put(0, 'OGN-240', BF0);
  const a = s.put(0, 'OGN-210', BF0);
  const b = s.put(0, 'OGN-210', base(0));
  a.buffs = 1;
  b.buffs = 1;
  assert.equal(s.e.might(sett), 6);
  sett.buffs = 1;
  assert.equal(s.e.might(sett), 8);
});

test('Baited Hook: mata uma aliada e joga do topo uma unidade com Might até +1', () => {
  const s = new Scenario();
  const hook = s.put(0, 'OGN-242', base(0));
  const v = s.put(0, 'OGN-210', base(0)); // 2
  const big = s.put(0, 'OGN-215', 'deckTop'); // 5: não pode
  const ok = s.put(0, 'OGN-211', 'deckTop'); // 2: pode
  orders(s, 0, 2);
  s.go();
  s.pick('Baited Hook');
  s.passAll();
  assert.ok(!s.d.options.some((o) => o.obj === big.id));
  s.pickObj(ok);
  s.passAll();
  assert.equal(v.zone, 'trash');
  assert.equal(ok.zone, 'board');
  assert.equal(big.zone, 'mainDeck');
  assert.equal(hook.exhausted, true);
  assert.ok(s.e.pl[0].mainDeck.slice(-4).includes(big.id), 'o resto foi reciclado');
});

test('Darius, Executioner: Legion o prepara; outras aliadas têm +1 aqui', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-210', base(0));
  const far = s.put(0, 'OGN-210', BF0);
  s.put(0, 'OGN-243', 'hand');
  s.put(0, 'OGN-229', 'hand');
  const t = s.put(1, 'OGN-219', base(1));
  orders(s, 0, 11);
  s.go();
  s.pick('Jogar Vengeance');
  s.pickObj(t);
  s.passAll();
  s.pick('Jogar Darius, Executioner');
  s.pick('base de A');
  s.passAll();
  const d = s.e.units().find((u) => u.code === 'OGN-243')!;
  assert.equal(d.exhausted, false);
  assert.equal(s.e.might(a), 3);
  assert.equal(s.e.might(far), 2);
  assert.equal(s.e.might(d), 6);
});

test('Divine Judgment: cada jogador escolhe 2 de cada entre TODAS em jogo (FAQ #5977); o resto é reciclado', () => {
  const s = new Scenario();
  const mine = [0, 1, 2].map(() => s.put(0, 'OGN-210', base(0)));
  const theirs = [0, 1, 2].map(() => s.put(1, 'OGN-210', base(1)));
  s.put(0, 'OGN-244', 'hand');
  const h = [0, 1, 2].map(() => s.put(0, 'OGN-219', 'hand'));
  orders(s, 0, 9);
  s.go();
  s.pick('Jogar Divine Judgment');
  s.passAll();
  // jogador do turno primeiro: unidades (pode escolher de qualquer jogador)
  assert.ok(s.d.options.some((o) => o.obj === theirs[0].id), 'unidades do oponente também são opção');
  s.ok([mine[0].id, mine[1].id]);
  // runas: as 7 que sobraram depois de pagar; fica com 2
  const runeOpts = s.d.options.map((o) => o.id);
  s.ok(runeOpts.slice(0, 2));
  s.ok([h[0].id, h[1].id]);
  // oponente: unidades e runas (escolhe outras duas runas do jogador 0: ficam 4)
  s.ok([theirs[2].id, theirs[1].id]);
  s.ok(runeOpts.slice(2, 4));
  // runas recicladas juntas: o dono escolhe a ordem no fundo do deck de runas (416.5.a)
  while (s.d.prompt.startsWith('Fundo do deck de runas')) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.equal(mine[2].zone, 'mainDeck');
  assert.equal(theirs[0].zone, 'mainDeck');
  assert.equal(h[2].zone, 'mainDeck');
  assert.equal(s.e.runesOf(0).length, 4);
  assert.equal(s.e.pl[0].hand.length, 2);
});

test('Seal of Unity: entra no pagamento automático como [Order]', () => {
  const s = new Scenario();
  const seal = s.put(0, 'OGN-245', base(0));
  s.put(0, 'OGN-218', 'hand'); // 3 + 1 Order
  s.runes(0, ['OGN-007', 'OGN-007', 'OGN-007']); // só Fury
  s.go();
  s.pick('Jogar Vanguard Captain');
  s.passAll();
  assert.ok(s.e.units().some((u) => u.code === 'OGN-218'), s.log());
  assert.equal(seal.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 3, 'nenhuma runa reciclada');
});

test('Viktor, Leader: Recruit quando outra unidade não-Recruit sua morre (não quando morre junto)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-246', base(0));
  const a = s.put(0, 'OGN-210', base(0));
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.pickObj(a);
  s.passAll();
  assert.equal(recruits(s, 0).length, 1);
  const r = recruits(s, 0)[0];
  s.put(0, 'OGN-229', 'hand');
  orders(s, 0, 6);
  s.go();
  s.pick('Jogar Vengeance');
  s.pickObj(r);
  s.passAll();
  assert.equal(recruits(s, 0).length, 0, 'Recruit não dispara');
});

test('Viktor, Leader: morrendo no mesmo combate que outra aliada, não dispara', () => {
  const s = new Scenario();
  const v = s.put(1, 'OGN-246', BF0); // 4
  const a = s.put(1, 'OGN-210', BF0); // 2
  const atk = s.put(0, 'OGN-215', base(0));
  const atk2 = s.put(0, 'OGN-215', base(0));
  s.go();
  moveTo(s, [atk.id, atk2.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(v.zone, 'trash');
  assert.equal(a.zone, 'trash');
  assert.equal(recruits(s, 1).length, 0, s.log(20));
});
