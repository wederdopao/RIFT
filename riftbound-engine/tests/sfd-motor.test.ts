// Testes do núcleo do Spiritforged no motor (lote motor): Equip, anexar/desanexar, texto de efeito, Weaponmaster,
// Quick-Draw, "fica Mighty", Repeat com várias instâncias e reduções, revelar do topo, pool "só para gear", deckcheck.
// As cartas usadas aqui recebem definições mínimas SÓ PARA O TESTE (os lotes de cartas fazem as de verdade).
// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { registerCard } from '../src/engine/script';
import { checkDeck } from '../src/engine/deckcheck';
import { E } from '../src/cards/helpers';
import type { Obj, P } from '../src/engine/types';
import type { Engine } from '../src/engine/engine';
import { JINX_PRECON } from '../src/decks/origins';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const FURY = RUNE.fury;
const CALM = RUNE.calm;
const ORDER = 'OGN-214';
const MIND = 'OGN-089';
const SKULKER = 'OGN-175'; // 3 de Might, sem texto
const SERGEANT = 'OGN-219'; // 4 de Might, sem texto
const PHANTOM = 'OGN-049'; // 5 de Might, sem texto
const MECH = 'OGN-088'; // 8 de Might, sem texto

// ───────────── definições mínimas (só para os testes) ─────────────
registerCard({ code: 'SFD-009', equipCost: E(0, 'Fury'), equipped: { keywords: { assault: 2 } } }); // Serrated Dirk
registerCard({ code: 'SFD-022', keywords: { quickDraw: true }, equipCost: E(0, 'Fury') }); // Long Sword (+2)
registerCard({ code: 'SFD-030', equipCost: E(1, 'Fury') }); // Skyfall of Areion (+2), Equip [1][Fury]
registerCard({ code: 'UNL-019', equipCost: E(1, 'any') }); // Blighted Battleaxe (+4), Equip [1][A] (efeito omitido)
registerCard({ code: 'SFD-008', keywords: { weaponmaster: true } }); // Sentinel Adept
registerCard({ code: 'SFD-186', keywords: { quickDraw: true, temporary: true }, equipCost: E(0, 'any') }); // Spinning Axe
registerCard({
  code: 'SFD-172', // Sacred Shears: [Deathknell] — Draw 1.
  equipCost: E(0, 'Order'),
  equipped: { triggers: [{ on: 'die', zone: 'self', label: 'Deathknell: comprar 1', resolve: function* (c) { yield* c.g.draw(c.p, 1); } }] },
});
registerCard({
  code: 'SFD-051', // Guardian Angel
  equipCost: E(0, 'Calm'),
  equipped: {
    deathReplacements: [
      {
        label: 'matar o Guardian Angel no lugar; curar, exaurir e chamar de volta',
        applies: (g, self, dying, gear?: Obj) => dying.id === self.id && !!gear && gear.zone === 'board',
        apply: function* (g, self, dying, gear?: Obj) {
          yield* g.killG(gear!);
          self.damage = 0;
          self.exhausted = true;
          g.recall(self);
          return true;
        },
      },
    ],
  },
} as any);
registerCard({
  code: 'SFD-016', // Recurve Bow: When I attack or defend, deal 2 to an enemy unit here.
  equipCost: E(0, 'Fury'),
  equipped: {
    triggers: [
      {
        on: ['attack', 'defend'],
        label: '2 de dano numa unidade inimiga aqui',
        cond: (c, ev) => ev.unit?.id === c.self.id,
        targets: [{ prompt: 'Recurve Bow: unidade inimiga aqui', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) === c.g.bfIndex(c.self) && c.g.bfIndex(o) >= 0 }],
        resolve: function* (c) {
          const u = c.targets[0][0];
          if (u) c.g.dealDamage(u, 2, c.gear); // a fonte do dano é o equipamento ("this", 136.2.d)
        },
      },
    ],
  },
});
registerCard({
  code: 'SFD-042', // Brutalizer: If this was attached to me this turn, I have an additional 2 [Might].
  equipCost: E(0, 'Calm'),
  equipped: { mightMod: (g, gear) => (gear.attachedTurn === g.turn ? 2 : 0) },
});
registerCard({
  code: 'SFD-178', // Blade of the Ruined King: [Equip] — [Order], Kill a friendly unit
  equipCost: E(0, 'Order'),
  equipExtra: {
    label: 'matar uma unidade aliada',
    canPay: (g, gear, p) => g.units().some((u) => u.controller === p),
    pay: function* (c) {
      const g = c.g;
      const us = g.units().filter((u) => u.controller === c.p);
      if (!us.length) return false;
      const [u] = yield* g.chooseObj(c.p, 'Blade: matar qual unidade aliada?', us);
      yield* g.killG(u);
      return true;
    },
  },
});
registerCard({
  code: 'SFD-054', // Jax, Unmatched: Your Equipment everywhere have [Quick-Draw].
  keywords: { deflect: 1 },
  auras: [{ keywordsAnywhere: (g, src, card) => (g.isEquipment(card) && card.controller === src.controller ? { quickDraw: true } : undefined) }],
});
registerCard({
  code: 'SFD-049', // Aphelios (só o gatilho de anexar, para o teste do evento)
  triggers: [
    {
      on: 'attach',
      label: 'contar anexo',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.player === c.p && c.g.isEquipment(ev.obj),
      resolve: function* (c) {
        c.self.data = { ...(c.self.data || {}), attaches: (c.self.data?.attaches || 0) + 1 };
      },
    },
  ],
});
registerCard({
  code: 'SFD-180', // Fiora, Worthy (só o evento 'mighty')
  triggers: [
    {
      on: 'mighty',
      label: 'contar Mighty',
      cond: (c, ev) => ev.unit?.controller === c.p,
      resolve: function* (c) {
        c.self.data = { ...(c.self.data || {}), mighty: [...(c.self.data?.mighty || []), c.ev!.unit.id] };
      },
    },
  ],
});
registerCard({
  code: 'SFD-031', // Desert's Call: [Repeat][2] Play a 2 Sand Soldier unit token.
  repeat: E(2),
  spell: { label: "Desert's Call", resolve: function* (c) { c.g.createToken('TOK-SAND', c.p, { t: 'base', p: c.p }); } },
});
registerCard({ code: 'SFD-211', auras: [{ addCostMod: (g, src, card, p, kind) => (kind === 'repeat' && g.bfs[g.bfOf(src)]?.controller === p ? { energy: 1 } : undefined) }] }); // Marai Spire
registerCard({ code: 'SFD-149', auras: [{ addCostMod: (g, src, card, p) => (p === src.controller ? { either: 1 } : undefined) }] }); // Ezreal, Prodigy
registerCard({ code: 'SFD-002', keywords: { accelerate: true, weaponmaster: true } }); // Armed Assailant (Fury, Accelerate)
registerCard({
  code: 'SFD-018', // Void Hatchling
  beforeReveal: function* (g, self, p) {
    const top = g.pl[p].mainDeck[0];
    if (top && (yield* g.yesNo(p, 'Void Hatchling: reciclar a carta do topo antes de revelar?'))) g.recycleCard(g.objs[top]);
  },
});
registerCard({ code: 'SFD-175', onReveal: function* (g, self, p) { g.addResources(p, 2); } }); // Undertitan
registerCard({ code: 'SFD-189', activated: [{ label: 'Add [A] (só gear)', exhaustSelf: true, isAdd: true, timing: 'reaction', adds: { power: [['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order']], onlyGear: true }, resolve: function* () {} }] }); // Ornn, legenda
registerCard({ code: 'SFD-075', triggers: [{ on: 'activate', label: '+1 (gear)', cond: (c, ev) => ev.player === c.p && c.g.isGear(ev.obj), resolve: function* (c) { c.self.data = { ...(c.self.data || {}), acts: (c.self.data?.acts || 0) + 1 }; } }] }); // Prize of Progress

// ───────────── utilidades ─────────────
function drain(s: Scenario, max = 60) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Distribuir dano')) s.ok([s.d.options[0].id]);
    else break;
  }
}
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));
const logHas = (s: Scenario, t: string) => s.e.log.some((l) => l.text.includes(t));
const runesReady = (e: Engine, p: P) => e.runesOf(p).filter((r) => !r.exhausted).length;
function equipVia(s: Scenario, gear: Obj, unit: Obj) {
  s.pick(`Equipar ${s.e.name(gear)}`);
  if (s.d.prompt.startsWith('Equip:')) s.pickObj(unit);
}

// ───────────── Equip ─────────────
test('Equip: paga o custo, a unidade é alvo, vai para a pilha e anexa; Might Bonus e texto de efeito valem', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const dirk = s.put(0, 'SFD-009', base(0));
  const sword = s.put(0, 'SFD-022', base(0));
  s.runes(0, [FURY, FURY]);
  s.go();
  assert.ok(has(s, 'Equipar Serrated Dirk'));
  equipVia(s, dirk, u);
  assert.ok(logHas(s, 'Na pilha: Serrated Dirk: Equip'), 'o Equip vai para a pilha');
  assert.ok(logHas(s, 'paga 0 de energia + 1 power'));
  drain(s);
  assert.equal(dirk.attachedTo, u.id);
  assert.ok(s.e.isEquipped(u));
  assert.equal(s.e.kw(u).assault, 2, 'Assault 2 do texto de efeito');
  equipVia(s, sword, u);
  drain(s);
  assert.equal(s.e.might(u), 3 + 2, 'Long Sword +2 (Might Bonus)');
  assert.equal(s.e.equipmentOf(u).length, 2, 'uma unidade pode ter vários equipamentos');
  u.role = 'attacker';
  assert.equal(s.e.might(u), 3 + 2 + 2);
  u.role = undefined;
  // anexado: o Equip (texto de regras) fica inativo — não dá para trocar de unidade pagando o Equip (718.2)
  s.put(0, SERGEANT, base(0));
  s.runes(0, [FURY]);
  s.go();
  assert.ok(!has(s, 'Equipar Serrated Dirk'), 'gear anexado não usa o Equip');
});

test('Equip: só no seu turno, fora de showdown, com unidade sua e recursos', () => {
  const s = new Scenario();
  const dirk = s.put(0, 'SFD-009', base(0));
  s.runes(0, [FURY]);
  s.go();
  assert.ok(!has(s, 'Equipar'), 'sem unidade sua não há alvo');
  s.put(1, SKULKER, base(1));
  s.go();
  assert.ok(!has(s, 'Equipar'), 'unidade do oponente não serve');
  s.put(0, SKULKER, base(0));
  s.go();
  assert.ok(has(s, 'Equipar'));
  assert.equal(s.e.canEquip(0, dirk, 'focus'), false, 'sem texto de timing, não em showdown');
  assert.equal(s.e.canEquip(0, dirk, 'priority'), false);
  for (const r of s.e.runesOf(0)) r.exhausted = true;
  s.e.recycleCard(s.e.runesOf(0)[0]);
  s.go();
  assert.ok(!has(s, 'Equipar'), 'sem recursos');
});

test('Equip com custo não de recursos (Blade of the Ruined King): mata uma unidade aliada como custo', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  const fodder = s.put(0, SKULKER, base(0));
  const blade = s.put(0, 'SFD-178', base(0));
  s.runes(0, [ORDER]);
  s.go();
  s.pick('Equipar Blade');
  s.pickObj(u);
  assert.ok(s.d.prompt.startsWith('Blade: matar'), s.d.prompt);
  s.pickObj(fodder);
  drain(s);
  assert.equal(fodder.zone, 'trash');
  assert.equal(blade.attachedTo, u.id);
  assert.equal(s.e.might(u), 4 + 4);
});

// ───────────── o que acontece com o gear ─────────────
test('Unidade sai do tabuleiro num campo: o gear se desanexa ali e a limpeza o chama de volta para a base', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, BF0);
  const dirk = s.put(0, 'SFD-009', base(0));
  s.e.attach(dirk, u, 0);
  assert.equal(s.e.bfIndex(dirk), 0, 'anexado: está no local da unidade (719.3)');
  s.e.moveUnits([u], BF1, 0);
  assert.equal(s.e.bfIndex(dirk), 1, 'move junto com a unidade (719.3.a)');
  const evs: string[] = [];
  const emit = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    evs.push(ev.type);
    emit(ev);
  };
  s.e.runSync(s.e.killG(u));
  assert.equal(dirk.zone, 'board', 'o gear fica no tabuleiro');
  assert.equal(dirk.attachedTo, undefined);
  assert.deepEqual(dirk.loc, BF1, 'fica no último local da unidade (435.4.b)');
  assert.ok(evs.includes('detach'));
  s.e.cleanup();
  assert.deepEqual(dirk.loc, base(0), 'a limpeza chama de volta (457.1)');
});

test('Voltar para a mão: o gear fica na base; o controle do gear não muda', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const sword = s.put(0, 'SFD-022', base(0));
  s.e.attach(sword, u, 0);
  s.e.returnToHand(u);
  assert.equal(sword.zone, 'board');
  assert.equal(sword.attachedTo, undefined);
  assert.deepEqual(sword.loc, base(0));
  assert.equal(sword.controller, 0);
});

test('Troca de controle: a unidade muda de dono e o gear continua anexado e do jogador original (718.5.f)', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, BF0);
  const dirk = s.put(0, 'SFD-009', base(0));
  s.e.attach(dirk, u, 0);
  u.controller = 1; // efeito de tomar o controle (Hostile Takeover)
  s.e.cleanup();
  assert.equal(dirk.attachedTo, u.id);
  assert.equal(dirk.controller, 0);
  assert.equal(s.e.kw(u).assault, 2, 'o texto de efeito continua na unidade');
  assert.equal(s.e.might(u), 3);
  // o gear muda de controle (Akshan): continua anexado; o Might Bonus continua
  const sword = s.put(0, 'SFD-022', base(0));
  s.e.attach(sword, u, 1);
  sword.controller = 1;
  s.e.cleanup();
  assert.equal(sword.attachedTo, u.id);
  assert.equal(s.e.might(u), 5);
});

test('Limpeza 323.7: gear solto na base de outro jogador volta para a base do controlador; anexado fica', () => {
  const s = new Scenario();
  const g1 = s.put(0, 'SFD-009', base(1)); // gear do jogador 0 parado na base do 1
  const u = s.put(1, SKULKER, base(1));
  const g2 = s.put(0, 'SFD-022', base(0));
  s.e.attach(g2, u, 0); // gear do 0 anexado a unidade do 1
  s.e.cleanup();
  assert.deepEqual(g1.loc, base(0));
  assert.equal(g2.attachedTo, u.id);
  assert.deepEqual(s.e.locOf(g2), base(1));
});

test('Anexar: reanexar desanexa da anterior (434.1.f); anexar à mesma não faz nada; detach de gear solto não faz nada', () => {
  const s = new Scenario();
  const a = s.put(0, SKULKER, base(0));
  const b = s.put(0, SERGEANT, BF0);
  const sword = s.put(0, 'SFD-022', base(0));
  assert.equal(s.e.attach(sword, a, 0), true);
  assert.equal(s.e.attach(sword, a, 0), false);
  assert.equal(s.e.attach(sword, b, 0), true);
  assert.deepEqual(s.e.attachedTo(a), []);
  assert.equal(s.e.might(a), 3);
  assert.equal(s.e.might(b), 6);
  assert.equal(s.e.bfIndex(sword), 0);
  assert.equal(s.e.detach(sword, 0), true);
  assert.deepEqual(sword.loc, BF0, 'desanexado no local da unidade (435.4)');
  assert.equal(s.e.detach(sword, 0), false, '435.1.a.1');
  s.e.cleanup();
  assert.deepEqual(sword.loc, base(0));
});

// ───────────── texto de efeito e texto inativo ─────────────
test('Texto de efeito: Deathknell do equipamento (Sacred Shears) dispara quando a unidade morre', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const shears = s.put(0, 'SFD-172', base(0));
  s.e.attach(shears, u, 0);
  const hand = s.e.pl[0].hand.length;
  s.go();
  s.e.kill(u);
  drain(s);
  s.e.runSync(s.e.settle());
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log(10));
  assert.equal(shears.zone, 'board');
});

test('Texto de efeito: Guardian Angel substitui a morte (mata o anjo, cura, exaure e chama de volta)', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, BF0);
  const ga = s.put(0, 'SFD-051', base(0));
  s.e.attach(ga, u, 0);
  u.damage = 9;
  s.e.cleanup();
  assert.equal(u.zone, 'board');
  assert.equal(u.damage, 0);
  assert.equal(u.exhausted, true);
  assert.deepEqual(u.loc, base(0));
  assert.equal(ga.zone, 'trash');
});

test('Texto de efeito: gatilho de ataque do equipamento (Recurve Bow) usa a unidade como "eu" e o gear como "this"', () => {
  const s = new Scenario();
  const u = s.put(0, SERGEANT, base(0));
  const bow = s.put(0, 'SFD-016', base(0));
  s.e.attach(bow, u, 0);
  const foe = s.put(1, SKULKER, BF0);
  s.e.bfs[0].controller = 1;
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais')) s.ok([u.id]);
  s.pick('Campo Vazio A');
  for (let i = 0; i < 20 && !logHas(s, 'Recurve Bow'); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.ok(logHas(s, 'recebe 2 de dano de Recurve Bow'), s.log(20));
  void foe;
});

test('Texto inativo: Spinning Axe anexado não morre pelo Temporary; solto morre', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const axe1 = s.put(0, 'SFD-186', base(0));
  const axe2 = s.put(0, 'SFD-186', base(0));
  s.e.attach(axe1, u, 0);
  assert.equal(s.e.kw(axe1).temporary, true, 'continua com Temporary para referência (722.1)');
  assert.equal(s.e.activeKw(axe1).temporary, undefined);
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  for (let i = 0; i < 6 && s.e.active !== 0; i++) {
    if (s.d.kind === 'action') s.pick('Encerrar o turno');
    drain(s);
  }
  assert.equal(axe1.zone, 'board');
  assert.equal(axe2.zone, 'trash');
});

test('Brutalizer: +2 só no turno em que foi anexado (attachedTurn)', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const br = s.put(0, 'SFD-042', base(0));
  s.e.attach(br, u, 0);
  assert.equal(s.e.might(u), 3 + 1 + 2);
  s.e.turn++;
  assert.equal(s.e.might(u), 3 + 1);
});

// ───────────── Weaponmaster ─────────────
function playAdept(s: Scenario, use: boolean) {
  s.pick('Jogar Sentinel Adept');
  if (s.d.prompt.includes('onde')) s.pick('base');
  if (s.d.prompt.includes('Weaponmaster:') && s.d.kind === 'confirm') s.pick(use ? 'Sim' : 'Não');
}
test('Weaponmaster: pega um equipamento já anexado a outra unidade; o [A] do Equip sai, a energia não', () => {
  const s = new Scenario();
  const other = s.put(0, SERGEANT, base(0));
  const axe = s.put(0, 'UNL-019', base(0)); // Equip [1][A]
  s.e.attach(axe, other, 0);
  const adept = s.put(0, 'SFD-008', 'hand');
  s.runes(0, [FURY, FURY, FURY, FURY]); // 3 para a Adept + 1 de energia do Equip
  s.go();
  playAdept(s, true);
  if (s.d.prompt.startsWith('Weaponmaster: qual')) s.pickObj(axe);
  drain(s);
  assert.equal(axe.attachedTo, adept.id);
  assert.equal(runesReady(s.e, 0), 0, 'pagou 1 de energia');
  assert.equal(s.e.runesOf(0).length, 4, 'nenhuma runa reciclada: o [A] foi descontado');
  assert.equal(s.e.might(other), 4);
});

test('Weaponmaster: [A] a menos tira um power de qualquer domínio (Equip [Fury] e Equip [A] saem de graça; RiftJudge #8841, #10503, #10704); pode recusar', () => {
  const s = new Scenario();
  s.put(0, 'SFD-008', 'hand');
  s.runes(0, [FURY, FURY, FURY]);
  s.go();
  playAdept(s, true);
  drain(s);
  assert.ok(!logHas(s, 'Weaponmaster'), 'sem equipamento, nada');
  // [Fury]: o [A] a menos cobre o power de Fúria (135.2.e.5.a)
  const s2 = new Scenario();
  const dirk = s2.put(0, 'SFD-009', base(0));
  const a2 = s2.put(0, 'SFD-008', 'hand');
  s2.runes(0, [FURY, FURY, FURY, FURY]);
  s2.go();
  playAdept(s2, true);
  drain(s2);
  assert.equal(dirk.attachedTo, a2.id);
  assert.equal(s2.e.runesOf(0).length, 4, 'nenhuma runa reciclada: Equip [Fury] sai de graça');
  // [A]: de graça
  const s3 = new Scenario();
  const spin = s3.put(0, 'SFD-186', base(0));
  const a3 = s3.put(0, 'SFD-008', 'hand');
  s3.runes(0, [FURY, FURY, FURY]);
  s3.go();
  playAdept(s3, true);
  drain(s3);
  assert.equal(spin.attachedTo, a3.id);
  assert.equal(s3.e.runesOf(0).length, 3);
  // recusar
  const s4 = new Scenario();
  const d4 = s4.put(0, 'SFD-009', base(0));
  s4.put(0, 'SFD-008', 'hand');
  s4.runes(0, [FURY, FURY, FURY, FURY]);
  s4.go();
  playAdept(s4, false);
  drain(s4);
  assert.equal(d4.attachedTo, undefined);
});

test('Weaponmaster não reduz custo não de recursos (Blade of the Ruined King ainda mata uma aliada)', () => {
  const s = new Scenario();
  const fodder = s.put(0, SKULKER, base(0));
  const blade = s.put(0, 'SFD-178', base(0));
  const adept = s.put(0, 'SFD-008', 'hand');
  s.runes(0, [FURY, FURY, FURY, ORDER]); // o [Order] sai pelo Weaponmaster; a morte continua (#10704)
  s.go();
  playAdept(s, true);
  assert.ok(s.d.prompt.startsWith('Blade: matar') || s.d.kind === 'priority', s.d.prompt);
  drain(s);
  if (s.d.prompt.startsWith('Blade: matar')) s.pickObj(fodder);
  drain(s);
  assert.equal(fodder.zone, 'trash');
  assert.equal(blade.attachedTo, adept.id);
  assert.equal(s.e.runesOf(0).length, 4, 'o [Order] saiu pelo Weaponmaster: nenhuma runa reciclada');
});

// ───────────── Quick-Draw ─────────────
test('Quick-Draw: ao jogar, anexa a uma unidade sua sem pagar o Equip; sem unidade, fica solto na base', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, BF0);
  const sword = s.put(0, 'SFD-022', 'hand');
  s.runes(0, [FURY, FURY, FURY]); // custo 2 + [Fury]
  s.go();
  s.pick('Jogar Long Sword');
  drain(s);
  assert.equal(sword.attachedTo, u.id);
  assert.equal(s.e.bfIndex(sword), 0);
  assert.equal(s.e.runesOf(0).length, 2, 'só o custo de jogar (1 runa reciclada pelo [Fury])');
  const s2 = new Scenario();
  const sw2 = s2.put(0, 'SFD-022', 'hand');
  s2.runes(0, [FURY, FURY, FURY]);
  s2.go();
  assert.ok(has(s2, 'Jogar Long Sword'), 'pode jogar sem unidades (RiftJudge #438)');
  s2.pick('Jogar Long Sword');
  drain(s2);
  assert.equal(sw2.zone, 'board');
  assert.equal(sw2.attachedTo, undefined);
  assert.deepEqual(sw2.loc, base(0));
});

test('Quick-Draw dá Reaction; Jax, Unmatched dá Quick-Draw aos seus Equipamentos em qualquer zona', () => {
  const s = new Scenario();
  const dirk = s.put(0, 'SFD-009', 'hand');
  assert.equal(s.e.kw(dirk).quickDraw, undefined);
  s.put(0, 'SFD-054', base(0));
  assert.equal(s.e.kw(dirk).quickDraw, true, 'na mão');
  s.runes(0, [FURY]);
  assert.equal(s.e.canPlayCard(0, dirk, 'hand', 'priority'), true, 'Reaction pela Quick-Draw');
  const theirs = s.put(1, 'SFD-009', 'hand');
  assert.equal(s.e.kw(theirs).quickDraw, undefined, 'só os seus');
});

// ───────────── eventos ─────────────
test("Evento 'attach' (\"quando você anexa um Equipamento a mim\") e 'activate' (habilidade ativada de gear)", () => {
  const s = new Scenario();
  const aph = s.put(0, 'SFD-049', base(0));
  const prize = s.put(0, 'SFD-075', base(0));
  const dirk = s.put(0, 'SFD-009', base(0));
  s.runes(0, [FURY]);
  s.go();
  equipVia(s, dirk, aph);
  drain(s);
  assert.equal(aph.data?.attaches, 1);
  assert.equal(prize.data?.acts, 1, 'o Equip é habilidade ativada de gear');
});

test("Evento 'mighty': passar de menos de 5 para 5+ dispara; entrar já com 5 não; de novo depois de perder", () => {
  const s = new Scenario();
  const fiora = s.put(0, 'SFD-180', base(0));
  const big = s.put(0, PHANTOM, base(0)); // já entra com 5
  const u = s.put(0, SERGEANT, base(0)); // 4
  s.e.cleanup();
  s.e.giveMight(u, 1);
  s.go();
  drain(s);
  s.e.runSync(s.e.settle());
  assert.deepEqual(fiora.data?.mighty, [u.id]);
  s.e.giveMight(u, -1);
  s.e.cleanup();
  s.e.giveMight(u, 2);
  s.e.runSync(s.e.settle());
  assert.deepEqual(fiora.data?.mighty, [u.id, u.id]);
  void big;
});

// ───────────── Repeat e reduções de custo adicional ─────────────
test('Repeat: Marai Spire reduz o custo do Repeat; instância extra dada por efeito (grantRepeat) também pode ser paga', () => {
  const s = new Scenario();
  s.e.bfs[0].objId = s.e.newObj('SFD-211', 0, 'battlefieldZone').id;
  s.e.bfs[0].controller = 0;
  s.put(0, 'SFD-031', 'hand'); // Desert's Call: 2 + Calm... (custo do cards.json)
  const card = s.e.objs[s.e.pl[0].hand[s.e.pl[0].hand.length - 1]];
  const pc = s.e.printedCost(card);
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: { energy: 1, power: [] } });
  s.runes(0, Array(pc.energy + 1 + 0 + pc.power.length).fill(CALM));
  s.go();
  s.pick("Jogar Desert's Call");
  assert.ok(s.d.prompt.includes('Repeat (1º') || s.d.prompt.includes('1º Repeat'), s.d.prompt);
  s.pick('Sim'); // Repeat [2] com Marai: [1]
  assert.ok(s.d.prompt.includes('2º Repeat'), s.d.prompt);
  s.pick('Sim'); // Repeat [1] dado por efeito, com Marai: [0]
  drain(s);
  const sand = s.e.units().filter((u) => u.code === 'TOK-SAND');
  assert.equal(sand.length, 3, 'executou 3 vezes');
  assert.equal(runesReady(s.e, 0), 0);
});

test('Ezreal, Prodigy: reduz o Accelerate em [1] ou [A]; o jogador escolhe', () => {
  const s = new Scenario();
  s.put(0, 'SFD-149', base(0));
  const aa = s.put(0, 'SFD-002', 'hand'); // Armed Assailant 6 + [Fury]; Accelerate [1][Fury]
  s.runes(0, [FURY, FURY, FURY, FURY, FURY, FURY, FURY]);
  s.go();
  s.pick('Jogar Armed Assailant');
  if (s.d.prompt.includes('onde')) s.pick('base');
  assert.ok(s.d.prompt.includes('Accelerate'), s.d.prompt);
  s.pick('Sim');
  assert.ok(s.d.prompt.startsWith('Accelerate de'), s.d.prompt);
  const opts = s.d.options.map((o) => o.label);
  assert.ok(opts.includes('0 + [Fury]') && opts.includes('1'), opts.join(' | '));
  s.pick('0 + [Fury]');
  drain(s);
  assert.equal(aa.zone, 'board');
  assert.equal(aa.exhausted, false);
});

// ───────────── revelar do topo ─────────────
test('revealTop: Void Hatchling olha e pode reciclar antes; Undertitan revelado adiciona [2]', () => {
  const s = new Scenario();
  s.put(0, 'SFD-018', base(0));
  const junk = s.put(0, SKULKER, 'deckTop');
  const deck = s.e.pl[0].mainDeck;
  // põe o Undertitan logo abaixo do topo
  const titan = s.e.newObj('SFD-175', 0, 'setAside');
  s.e.toZone(titan, 'mainDeck');
  deck.splice(deck.indexOf(titan.id), 1);
  deck.splice(1, 0, titan.id);
  let out: Obj[] = [];
  s.e.runSync(
    (function* (e: Engine) {
      out = yield* e.revealTop(0, 1);
    })(s.e),
  );
  assert.equal(junk.zone, 'mainDeck');
  assert.equal(deck[deck.length - 1], junk.id, 'reciclada pelo Void Hatchling');
  assert.deepEqual(out.map((o) => o.id), [titan.id]);
  assert.equal(s.e.pl[0].pool.energy, 2);
});

// ───────────── pool "só para gear" (Ornn) ─────────────
test('[Add] "só para jogar gear ou usar habilidades de gear": paga gear e Equip, não paga unidade', () => {
  const s = new Scenario();
  s.e.legendOf(0).code = 'SFD-189';
  const u = s.put(0, SKULKER, base(0));
  const dirk = s.put(0, 'SFD-009', base(0));
  s.go();
  assert.ok(has(s, 'Equipar Serrated Dirk'), 'o [Add] da lenda paga o Equip');
  equipVia(s, dirk, u);
  drain(s);
  assert.equal(dirk.attachedTo, u.id);
  assert.equal(s.e.legendOf(0).exhausted, true);
  const s2 = new Scenario();
  s2.e.legendOf(0).code = 'SFD-189';
  const zero = s2.e.newObj('OGN-175', 0, 'hand');
  s2.e.pl[0].hand.push(zero.id);
  s2.go();
  assert.equal(s2.e.canPlayCard(0, zero, 'hand', 'main'), false, 'unidade: não');
  s2.e.addResources(0, 0, ['any'], false, true);
  assert.equal(s2.e.usablePool(0, false).power.any || 0, 0, 'fora de pagamento de gear não usa');
  assert.equal(s2.e.asPayFor('gear', () => s2.e.usablePool(0, false).power.any), 1);
});

test('[Add] de quantidade variável (Ancient Henge): o pagamento converte energia em [A] quando falta power', () => {
  const s = new Scenario();
  const henge = s.put(0, 'SFD-117', base(0));
  const cap = s.put(0, 'SFD-091', 'hand'); // Buhru Captain: 3 + [Body]
  s.runes(0, [CALM, CALM, CALM, CALM]);
  s.go();
  assert.ok(has(s, 'Jogar Buhru Captain'), 'sem runa de Body, mas o Henge converte 1 de energia');
  s.pick('Jogar Buhru Captain');
  for (let i = 0; i < 5 && s.d.kind !== 'priority' && s.d.kind !== 'action' && cap.zone !== 'board'; i++) s.ok([s.d.options[0].id]);
  assert.equal(cap.zone, 'board');
  assert.equal(henge.exhausted, true);
  assert.equal(runesReady(s.e, 0), 0, '3 + 1 de energia');
  assert.equal(s.e.runesOf(0).length, 4, 'nenhuma runa reciclada');
});

// ───────────── contadores ─────────────
test('powerSpent conta o power do Equip', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const dirk = s.put(0, 'SFD-009', base(0));
  s.runes(0, [FURY]);
  s.go();
  const before = s.e.pl[0].powerSpent?.turn === s.e.turn ? s.e.pl[0].powerSpent.n : 0;
  equipVia(s, dirk, u);
  drain(s);
  assert.equal(s.e.pl[0].powerSpent!.n - before, 1);
});

// ───────────── deckcheck ─────────────
test('Deckcheck: Signature Gear conta como Signature e precisa da tag de campeão da lenda (103.2.d)', () => {
  const base0 = { ...JINX_PRECON, main: JINX_PRECON.main.map(([c, n]) => [c, n] as [string, number]) };
  const ok0 = checkDeck(base0);
  const withAxe = { ...base0, main: [...base0.main, ['SFD-186', 1] as [string, number]] };
  const r = checkDeck(withAxe);
  assert.ok(r.errors.some((x) => x.includes('Spinning Axe') && x.includes('Signature')), r.errors.join(' | '));
  assert.ok(!ok0.errors.some((x) => x.includes('Signature de outro')));
});
