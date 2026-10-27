// Testes de cenário do lote "legends" (lendas e signature spells). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { DOMAINS, type Obj, type P } from '../src/engine/types';
import { isImplemented, registerCard } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';
const ORDER = 'OGN-214';

/** Troca a lenda do jogador. */
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
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
const unitsOf = (s: Scenario, code: string) => s.e.units().filter((u) => u.code === code);

// ───────────── [Add] no pagamento ─────────────

test("Kai'Sa: o [Add] paga o power de um spell que as runas não pagam; não vale para outros custos", () => {
  const s = new Scenario();
  const kai = legend(s, 0, 'OGN-247');
  runes(s, 0, RUNE.calm, 4);
  const tgt = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-252', 'hand'); // Super Mega Death Rocket! (4 + Fury/Chaos)
  s.go();
  const fury = { energy: 0, power: [['Fury' as const]] };
  assert.equal(s.e.canPay(0, fury), false, 'fora de spell a Kai\'Sa não ajuda');
  assert.equal(s.e.canPay(0, fury, true), true, 'para spell ela ajuda');
  s.pick('Jogar Super Mega Death Rocket!');
  s.maybeObj(tgt);
  s.passAll();
  assert.equal(tgt.zone, 'trash', s.log());
  assert.equal(kai.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 4, 'nenhuma runa reciclada');
  assert.ok(s.e.runesOf(0).every((r) => r.exhausted));
});

test("Kai'Sa: preferida a reciclar uma runa quando as runas também pagariam", () => {
  const s = new Scenario();
  const kai = legend(s, 0, 'OGN-247');
  runes(s, 0, RUNE.fury, 5);
  const tgt = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-252', 'hand');
  s.go();
  s.pick('Jogar Super Mega Death Rocket!');
  s.maybeObj(tgt);
  s.passAll();
  assert.equal(kai.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 5, s.log());
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 1);
});

test('Darius: [Add] 1 de energia só com Legion (depois de jogar uma carta no turno)', () => {
  const s = new Scenario();
  const dar = legend(s, 0, 'OGN-253');
  runes(s, 0, RUNE.fury, 4);
  const poro = s.put(1, 'OGN-052', BF0);
  const elder = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker 3 + Fury
  s.put(0, 'OGN-136', 'hand'); // Pit Rookie 2
  s.go();
  assert.equal(s.e.canPay(0, { energy: 5, power: [] }), false, 'sem Legion o Darius não ajuda');
  s.pick('Jogar Pit Rookie');
  s.passAll();
  // sobram 2 runas prontas: com o Darius dá 3 de energia (+ reciclar uma runa para o power)
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 2);
  s.pick('Jogar Void Seeker');
  s.pickObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash', s.log());
  assert.equal(dar.exhausted, true);
  void poro;
});

test('[Add] no formato dos Seals (addPower): gear exaurido paga um pip daquele domínio, também fora de spell', () => {
  // Seal of Strength (master tem o script; aqui um igual, só se ainda não houver)
  if (!isImplemented('OGN-163'))
    registerCard({
      code: 'OGN-163',
      activated: [{ label: 'Exaurir: adicionar 1 Body', exhaustSelf: true, timing: 'reaction', isAdd: true, addPower: ['Body'], resolve: function* () {} }],
    });
  const s = new Scenario();
  const seal = s.put(0, 'OGN-163', base(0));
  runes(s, 0, RUNE.calm, 1);
  const u = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-270', 'hand'); // Showstopper: 1 + Body/Order
  s.go();
  assert.equal(s.e.canPay(0, { energy: 0, power: [['Body']] }), true, 'Seal vale para qualquer custo');
  s.pick('Jogar Showstopper');
  s.pick('Campo Vazio B');
  s.passAll();
  assert.equal(u.buffs, 1, s.log());
  assert.equal(seal.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 1, 'a runa Calm só foi exaurida');
});

// ───────────── signature spells e lendas ─────────────

test('Icathian Rain: seis instruções de 2 de dano, podendo repetir a unidade', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 4);
  runes(s, 0, MIND, 3);
  const elder = s.put(1, 'OGN-065', BF0);
  const poro = s.put(1, 'OGN-052', BF1);
  s.put(0, 'OGN-248', 'hand');
  s.go();
  s.pick('Jogar Icathian Rain');
  for (const u of [elder, elder, poro, elder, poro, poro]) s.pickObj(u);
  s.passAll();
  assert.equal(elder.zone, 'trash', s.log());
  assert.equal(poro.zone, 'trash');
});

test('Volibear: jogar unidade Mighty permite exaurir a lenda para canalizar 1 runa exaurida', () => {
  const s = new Scenario();
  const voli = legend(s, 0, 'OGN-249');
  runes(s, 0, RUNE.fury, 5);
  s.put(0, 'OGN-001', 'hand'); // Blazing Scorcher 5
  s.go();
  s.pick('Jogar Blazing Scorcher');
  s.pick('Sim');
  s.passAll();
  assert.equal(voli.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 6, s.log());
  assert.ok(s.e.runesOf(0).every((r) => r.exhausted));
});

test('Stormbringer: dano igual ao Might da unidade da base em todos os inimigos do campo, e ela vai para lá', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 6);
  const soul = s.put(0, 'OGN-019', base(0)); // Raging Soul 4
  const a = s.put(1, 'OGN-052', BF0);
  const b = s.put(1, 'OGN-065', BF0);
  const c = s.put(1, 'OGN-052', BF1);
  s.put(0, 'OGN-250', 'hand');
  s.go();
  s.pick('Jogar Stormbringer');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(a.zone, 'trash', s.log());
  assert.equal(b.zone, 'trash');
  assert.equal(c.zone, 'board');
  assert.deepEqual(soul.loc, BF0);
});

test('Super Mega Death Rocket!: ao conquistar, descartar 1 devolve a carta do descarte para a mão', () => {
  const s = new Scenario();
  const rocket = s.put(0, 'OGN-252', 'trash');
  const junk = s.put(0, 'OGN-136', 'hand');
  const u = s.put(0, 'OGN-065', base(0));
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll();
  s.pick('Sim');
  s.passAll();
  assert.equal(rocket.zone, 'hand', s.log());
  assert.equal(junk.zone, 'trash');
});

test('Noxian Guillotine: sem Legion mata na próxima vez que a unidade recebe dano; com Legion mata na hora', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 9);
  const elder = s.put(1, 'OGN-065', BF0);
  s.e.buff(elder, 1); // 6 de Might
  s.put(0, 'OGN-254', 'hand');
  s.put(0, 'OGN-024', 'hand'); // Void Seeker: 4 de dano
  s.go();
  s.pick('Jogar Noxian Guillotine');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'board', 'sem Legion não mata na hora');
  s.pick('Jogar Void Seeker');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash', s.log(20));

  const s2 = new Scenario();
  runes(s2, 0, RUNE.fury, 5);
  const poro = s2.put(1, 'OGN-052', BF0);
  s2.put(0, 'OGN-254', 'hand');
  s2.e.pl[0].played.push('outra');
  s2.go();
  s2.pick('Jogar Noxian Guillotine');
  s2.maybeObj(poro);
  s2.passAll();
  assert.equal(poro.zone, 'trash', s2.log());
});

test('Ahri: unidade inimiga que ataca campo controlado recebe -1 de Might no turno', () => {
  const s = new Scenario();
  legend(s, 1, 'OGN-255');
  s.put(1, 'OGN-052', BF0);
  const drake = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [drake.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('Mountain Drake recebe -1 de Might')), s.log(20));
  assert.equal(s.e.might(drake), 9);
});

test('Fox-Fire: mata unidades de um campo com Might total até 4', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 3);
  const poro = s.put(1, 'OGN-052', BF0);
  const rook = s.put(1, 'OGN-136', BF0);
  const elder = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-256', 'hand');
  s.go();
  s.pick('Jogar Fox-Fire');
  s.pick('Campo Vazio A');
  assert.ok(s.d.options.some((o) => o.obj === elder.id), 'Elder (4) cabe sozinho');
  s.pickObj(poro);
  assert.ok(!s.d.options.some((o) => o.obj === elder.id), 'depois do Poro, o Elder não cabe');
  s.pickObj(rook);
  s.passAll();
  assert.equal(poro.zone, 'trash', s.log());
  assert.equal(rook.zone, 'trash');
  assert.equal(elder.zone, 'board');
});

test("Dragon's Rage: move a unidade inimiga e ela troca dano com outra inimiga no destino", () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 5);
  const elder = s.put(1, 'OGN-065', BF1);
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-258', 'hand');
  s.go();
  s.pick("Jogar Dragon's Rage");
  s.pickObj(elder);
  s.pick('Campo Vazio A');
  s.passAll();
  assert.deepEqual(elder.loc, BF0);
  assert.equal(poro.zone, 'trash', s.log());
  assert.equal(elder.zone, 'board');
});

test('Yasuo: [2], exaurir move uma unidade sua da base para um campo', () => {
  const s = new Scenario();
  const yas = legend(s, 0, 'OGN-259');
  runes(s, 0, RUNE.calm, 2);
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Yasuo');
  s.passAll();
  s.pick('Campo Vazio B');
  s.passAll();
  assert.deepEqual(u.loc, BF1, s.log());
  assert.equal(yas.exhausted, true);
});

test('Last Breath: prepara a unidade aliada e ela causa dano igual ao Might a um inimigo num campo', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 3);
  const elder = s.put(0, 'OGN-065', base(0), { ready: false });
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-260', 'hand');
  s.go();
  s.pick('Jogar Last Breath');
  s.passAll();
  assert.equal(elder.exhausted, false);
  assert.equal(poro.zone, 'trash', s.log());
});

test('Leona + Zenith Blade: atordoar um inimigo dá Buff a uma aliada, e a aliada pode ir para o campo', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-261');
  runes(s, 0, RUNE.calm, 3);
  const elder = s.put(0, 'OGN-065', base(0));
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-262', 'hand');
  s.go();
  s.pick('Jogar Zenith Blade');
  s.pickObj(elder); // a aliada que pode ir (alvo ao jogar)
  s.passAll();
  s.pick('Sim'); // mover é decidido na resolução
  s.passAll();
  assert.equal(elder.buffs, 1, s.log(25));
  assert.deepEqual(elder.loc, BF0);
  assert.equal(poro.zone, 'trash', 'Poro atordoado não causa dano e morre');
});

test('Leona: atordoar várias unidades na mesma instrução dispara uma vez; instruções diferentes, duas', () => {
  const s = new Scenario();
  const leo = legend(s, 0, 'OGN-261');
  s.put(0, 'OGN-065', base(0));
  const a = s.put(1, 'OGN-052', BF0);
  const b = s.put(1, 'OGN-052', BF0);
  const batch = ++s.e.stunBatch;
  s.e.stun(a, 0, batch);
  s.e.stun(b, 0, batch);
  assert.equal(s.e.pending.filter((x) => x.sourceId === leo.id).length, 1);
  const c2 = s.put(1, 'OGN-052', BF0);
  s.e.stun(c2, 0); // outra instrução
  assert.equal(s.e.pending.filter((x) => x.sourceId === leo.id).length, 2);
});

test('Teemo, Swift Scout: esconder pagando 1 de energia; [1], exaurir devolve um Teemo à mão', () => {
  const s = new Scenario();
  const tee = legend(s, 0, 'OGN-263');
  s.put(0, 'OGN-185', BF0); // controla o campo A
  const fof = s.put(0, 'OGN-168', 'hand');
  runes(s, 0, RUNE.chaos, 2);
  const teemo = s.put(0, 'OGN-121', base(0));
  s.go();
  s.pick('Esconder Fight or Flight');
  s.pick('1 de energia');
  assert.equal(fof.zone, 'facedown');
  assert.equal(s.e.runesOf(0).length, 2, 'nenhuma runa reciclada');
  s.pick('Teemo, Swift Scout');
  s.passAll();
  assert.equal(teemo.zone, 'hand', s.log());
  assert.equal(tee.exhausted, true);
});

test('Guerilla Warfare: devolve até 2 cartas com Hidden do descarte e libera esconder de graça', () => {
  const s = new Scenario();
  s.put(0, 'OGN-185', BF0);
  const fof = s.put(0, 'OGN-168', 'trash');
  const su = s.put(0, 'OGN-053', 'trash');
  const rook = s.put(0, 'OGN-136', 'trash');
  runes(s, 0, MIND, 2);
  s.put(0, 'OGN-264', 'hand');
  s.go();
  s.pick('Jogar Guerilla Warfare');
  s.passAll();
  assert.ok(!s.d.options.some((o) => o.obj === rook.id), 'Pit Rookie não tem Hidden');
  s.ok([fof.id, su.id]);
  s.passAll();
  assert.equal(fof.zone, 'hand');
  assert.equal(su.zone, 'hand');
  const n = s.e.runesOf(0).length;
  s.pick('Esconder Fight or Flight');
  assert.equal(fof.zone, 'facedown');
  assert.equal(s.e.runesOf(0).length, n, 'esconder saiu de graça');
});

test('Viktor: [1], exaurir joga uma ficha Recruit', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-265');
  runes(s, 0, ORDER, 1);
  s.go();
  s.pick('Viktor');
  s.passAll();
  const r = unitsOf(s, 'TOK-RECRUIT');
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].loc, base(0));
});

test('Siphon Power: +1 para aliadas, -1 (mínimo 1) para inimigas no campo escolhido', () => {
  const s = new Scenario();
  runes(s, 0, ORDER, 4);
  const elder = s.put(1, 'OGN-065', BF0);
  const rec = s.e.createToken('TOK-RECRUIT', 1, BF0);
  const poro = s.put(0, 'OGN-052', BF1);
  s.put(0, 'OGN-266', 'hand');
  s.put(0, 'OGN-266', 'hand');
  s.go();
  s.pick('Jogar Siphon Power');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(s.e.might(elder), 3);
  assert.equal(s.e.might(rec), 1, 'mínimo de 1');
  s.pick('Jogar Siphon Power');
  s.pick('Campo Vazio B');
  s.passAll();
  assert.equal(s.e.might(poro), 3);
});

test('Miss Fortune: exaurir dá Ganking a uma unidade', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-267');
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Miss Fortune');
  s.passAll();
  assert.equal(s.e.kw(u).ganking, true);
});

test('Bullet Time: paga N power para causar N de dano a todos os inimigos de um campo', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 4);
  const elder = s.put(1, 'OGN-065', BF0);
  const poro = s.put(1, 'OGN-052', BF0);
  const rook = s.put(1, 'OGN-136', BF1);
  s.put(0, 'OGN-268', 'hand');
  s.go();
  s.pick('Jogar Bullet Time');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.ok(s.d.options.some((o) => o.label === 'Pagar 4 power'), s.d.options.map((o) => o.label).join('|'));
  s.pick('Pagar 2 power');
  s.passAll();
  assert.equal(poro.zone, 'trash', s.log());
  assert.equal(elder.zone, 'board');
  assert.equal(elder.damage, 2);
  assert.equal(rook.damage, 0);
  assert.equal(s.e.runesOf(0).length, 2);
});

test('Sett: unidade com Buff que morreria gasta o Buff e volta exausta para a base; conquistar prepara o Sett', () => {
  const s = new Scenario();
  const sett = legend(s, 0, 'OGN-269');
  runes(s, 0, RUNE.body, 1);
  const elder = s.put(0, 'OGN-065', BF0);
  s.e.buff(elder, 0);
  elder.damage = 3;
  s.e.kill(elder);
  assert.equal(elder.zone, 'board');
  assert.deepEqual(elder.loc, base(0));
  assert.equal(elder.buffs, 0);
  assert.equal(elder.damage, 0);
  assert.equal(elder.exhausted, true);
  assert.equal(sett.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 0, 'pagou 1 power');
  // sem Buff, morre normalmente
  const poro = s.put(0, 'OGN-052', base(0));
  sett.exhausted = false;
  s.e.kill(poro);
  assert.equal(poro.zone, 'trash');
  // conquistar prepara o Sett
  sett.exhausted = true;
  const u = s.put(0, 'OGN-136', base(0));
  s.go();
  moveTo(s, [u.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(sett.exhausted, false, s.log());
});

test('Showstopper: Buff numa unidade da base e ela vai para um campo', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 1);
  const u = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-270', 'hand');
  s.go();
  s.pick('Jogar Showstopper');
  s.pick('Campo Vazio B');
  s.passAll();
  assert.equal(u.buffs, 1);
  assert.deepEqual(u.loc, BF1, s.log());
});

test('Annie: no fim do turno prepara até 2 runas', () => {
  const s = new Scenario();
  legend(s, 0, 'OGS-017');
  runes(s, 0, RUNE.fury, 3);
  const rs = s.e.runesOf(0);
  for (const r of rs) r.exhausted = true;
  s.go();
  s.pick('Encerrar o turno');
  s.ok([rs[0].id, rs[1].id]);
  s.passAll();
  assert.equal(rs[0].exhausted, false, s.log());
  assert.equal(rs[1].exhausted, false);
  assert.equal(rs[2].exhausted, true);
});

test('Tibbers: ao entrar causa 3 de dano a todas as unidades em campos', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 8);
  const elder = s.put(1, 'OGN-065', BF0);
  const poro = s.put(1, 'OGN-052', BF1);
  const rook = s.put(0, 'OGN-136', base(0));
  s.put(0, 'OGS-018', 'hand');
  s.go();
  s.pick('Jogar Tibbers');
  s.passAll();
  assert.equal(elder.zone, 'board');
  assert.equal(poro.zone, 'trash', s.log());
  assert.equal(rook.damage, 0);
});

test('Master Yi: unidade aliada defendendo sozinha tem +2 de Might', () => {
  const s = new Scenario();
  legend(s, 1, 'OGS-019');
  const poro = s.put(1, 'OGN-052', BF0); // 2 + Shield 1 + 2
  const soul = s.put(0, 'OGN-019', base(0)); // 4
  s.go();
  moveTo(s, [soul.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(soul.zone, 'trash', s.log());
  assert.equal(poro.zone, 'board');
});

test('Highlander: a próxima morte da unidade no turno vira cura, exaustão e volta para a base', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 4);
  const poro = s.put(0, 'OGN-052', BF0);
  s.put(0, 'OGS-020', 'hand');
  s.go();
  s.pick('Jogar Highlander');
  s.passAll();
  s.e.kill(poro);
  assert.equal(poro.zone, 'board');
  assert.deepEqual(poro.loc, base(0));
  assert.equal(poro.exhausted, true);
  s.e.kill(poro);
  assert.equal(poro.zone, 'trash', 'só a próxima morte');
});

test('Lux: jogar um spell de 5+ compra 1', () => {
  const s = new Scenario();
  legend(s, 0, 'OGS-021');
  runes(s, 0, MIND, 8);
  const elder = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGS-022', 'hand'); // Final Spark (8)
  s.go();
  s.pick('Jogar Final Spark');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, 1, s.log());
});

test('Garen: conquistar com 4+ unidades no campo compra 2', () => {
  const s = new Scenario();
  legend(s, 0, 'OGS-023');
  const us = [1, 2, 3, 4].map(() => s.put(0, 'OGN-052', base(0)));
  s.go();
  moveTo(s, us.map((u) => u.id), 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, 2, s.log());
});

test('Decisive Strike: +2 de Might para todas as unidades aliadas', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 5);
  const a = s.put(0, 'OGN-052', base(0));
  const b = s.put(0, 'OGN-065', BF0);
  const e = s.put(1, 'OGN-052', BF1);
  s.put(0, 'OGS-024', 'hand');
  s.go();
  s.pick('Jogar Decisive Strike');
  s.passAll();
  assert.equal(s.e.might(a), 4);
  assert.equal(s.e.might(b), 6);
  assert.equal(s.e.might(e), 2);
  void DOMAINS;
});
