// Testes do núcleo do Unleashed no motor (lote motor): XP (ganhar, gastar como custo, persistência), Hunt como gatilho,
// Level/Legion dependentes, Ambush (822.3 e "I can [Ambush]"), cópia, substituir/trocar de volta, criar campo, nomear,
// gatilhos que disparam a mais (Red Brambleback). As cartas usadas aqui recebem definições mínimas SÓ PARA O TESTE
// (os lotes de cartas fazem as de verdade).
// Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { registerCard, type TriggerDef } from '../src/engine/script';
import { xpCost, xpEquipExtra, xpOptionalCost } from '../src/cards/helpers';
import type { Decision, Gen, Obj, P } from '../src/engine/types';
import type { Engine } from '../src/engine/engine';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const ORDER = 'OGN-214';
const SKULKER = 'OGN-175'; // 3 de Might, sem texto
const PORO = 'OGN-052'; // Stalwart Poro, tag Poro

// ───────────── definições mínimas (só para os testes) ─────────────
registerCard({ code: 'UNL-047', keywords: { hunt: 2 }, kwMod: (g, o) => (g.levelReached(o, 3) ? { deflect: 1 } : undefined), mightMod: (g, o) => (g.levelReached(o, 3) ? 1 : 0) }); // Mosstomper
registerCard({ code: 'UNL-016', keywords: { hunt: 2 }, mightMod: (g, o) => (g.levelReached(o, 3) ? 1 : 0), entersReady: (g, o) => g.levelReached(o, 3) }); // Scorchclaw
registerCard({ code: 'UNL-096', equipped: { keywords: { hunt: 1 } } }); // Hunter's Machete (Equip omitido)
registerCard({
  code: 'UNL-029', // Red Brambleback: "Your conquer effects for conquering here trigger an additional time."
  auras: [{ triggerExtra: (g, src, ev, _from, ctrl) => (ev.type === 'conquer' && ev.bf === g.bfIndex(src) && ctrl === src.controller ? 1 : 0) }],
});
const WUJU_DRAW: TriggerDef = {
  on: 'play',
  label: 'Level 6: comprar 1',
  cond: (c, ev) => ev.obj?.id === c.self.id && c.g.levelReached(c.self, 6), // avaliado ao disparar (727.1.c.1)
  resolve: function* (c) {
    yield* c.g.draw(c.p, 1);
  },
};
registerCard({ code: 'UNL-040', keywords: { hunt: 1 }, triggers: [WUJU_DRAW] }); // Wuju Apprentice
registerCard({
  code: 'UNL-049', // Honeyfruit: [Level 6][Reaction][Tap]: [Add] [1][A] (só a parte de Level)
  activated: [{ label: 'Level 6: adicionar 1', timing: 'reaction', exhaustSelf: true, condition: (g, self) => g.levelReached(self, 6), resolve: function* () {} }],
});
registerCard({
  code: 'UNL-102', // Crowd Favorite: Spend 2 XP: [Buff] me.
  keywords: { hunt: 1 },
  activated: [{ ...xpCost(2), label: 'Gastar 2 XP: buff em mim', resolve: function* (c) { c.g.buff(c.self, c.p); } }],
});
registerCard({ code: 'UNL-164', optionalCosts: [xpOptionalCost(3, 'paidXp')] }); // Safety Inspector (só o custo)
registerCard({ code: 'UNL-158', equipExtra: xpEquipExtra(1) }); // Shepherd's Heirloom: [Equip] — Spend 1 XP
registerCard({
  code: 'UNL-119', // Kha'Zix, Evolving Hunter: When I attack, you may spend 3 XP to deal damage equal to my Might...
  triggers: [{ on: 'attack', ...xpCost(3), optional: 'gastar 3 XP para causar dano?', label: 'Gastar 3 XP: dano', cond: (c, ev) => ev.unit?.id === c.self.id, resolve: function* () {} }],
});
registerCard({
  code: 'UNL-067', // Ruined Rex: [Deathknell] (efeito omitido)
  triggers: [{ on: 'die', zone: 'self', label: 'Deathknell do Ruined Rex', resolve: function* () {} }],
});
registerCard({
  code: 'UNL-120', // Rengar, Trophy Hunter: I can [Ambush] to a battlefield where there are enemy units.
  keywords: { ambush: true },
  ambushBfs: (g, _self, p) => g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i).some((u) => u.controller !== p)),
});
// Stalking Wolf: "As an additional cost to play me, kill a Bird, Cat, Dog, or Poro you control. You may [Ambush] me to its
// battlefield, even if you don't have other units there."
const PETS = ['Bird', 'Cat', 'Dog', 'Poro'];
function* killPet(c: any): Gen<boolean> {
  const g: Engine = c.g;
  const pets = g.units().filter((u) => u.controller === c.p && PETS.some((t) => g.hasTag(u, t)));
  if (!pets.length) return false;
  const [id] = pets.length > 1 ? yield* g.ask(c.p, 'choose', 'Matar qual?', pets.map((u) => ({ id: u.id, label: g.name(u), obj: u.id }))) : [pets[0].id];
  c.data.killedBf = g.bfIndex(g.objs[id]);
  yield* g.killG(g.objs[id]);
  return true;
}
registerCard({
  code: 'UNL-166',
  keywords: { ambush: true },
  mandatoryCost: { label: 'matar um Bird, Cat, Dog ou Poro seu', canPay: (g, _s, p) => g.units().some((u) => u.controller === p && PETS.some((t) => g.hasTag(u, t))), pay: killPet },
  ambushBfs: (g, _self, p, c) => (c ? (c.data.killedBf >= 0 ? [c.data.killedBf] : []) : g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i, p).some((u) => PETS.some((t) => g.hasTag(u, t))))),
});
// SÓ PARA TESTE: a Poppy recebe o mesmo custo de matar, mas sem a permissão extra de Ambush (para checar a 822.3)
registerCard({ code: 'UNL-178', keywords: { ambush: true, tank: true }, mandatoryCost: { label: 'matar (teste)', canPay: () => true, pay: killPet } });

// ───────────── utilidades ─────────────
function drain<T>(gen: Gen<T>, answer: (d: Decision) => string[] = (d) => [d.options[0].id]): T {
  let r = gen.next(undefined as any);
  while (!r.done) r = gen.next(answer(r.value));
  return r.value;
}
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 60) {
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
function resolvePending(s: Scenario, k: number) {
  const it = s.e.pending[k];
  drain(it.ability.resolve(s.e.ctx(s.e.objs[it.sourceId], it.controller, { ev: it.ev })));
}
const huntPending = (s: Scenario, u: Obj) => s.e.pending.filter((x) => x.sourceId === u.id && x.label.startsWith('Hunt'));

// ───────────── XP ─────────────
test('XP: ganhar emite gainXp e conta no turno; gastar reduz; a XP não zera de um turno para o outro (728-733)', () => {
  const s = new Scenario();
  const e = s.e;
  let seen = 0;
  e.addDelayed({ controller: 0, sourceId: e.legendOf(0).id, on: 'gainXp', cond: (_c, ev) => ev.player === 0 && ev.amount === 3, ability: { label: 'x', resolve: function* () {} }, once: true });
  e.gainXp(0, 3);
  seen = e.pending.filter((x) => x.label === 'x').length;
  e.pending = [];
  assert.equal(seen, 1, 'evento gainXp');
  assert.equal(e.xp(0), 3);
  assert.equal(e.gainedXpThisTurn(0), 3);
  assert.equal(e.gainedXpThisTurn(1), 0);
  assert.equal(e.canSpendXp(0, 4), false);
  assert.equal(e.spendXp(0, 4), false, 'sem XP suficiente não gasta nada');
  assert.equal(e.xp(0), 3);
  assert.equal(e.spendXp(0, 2), true);
  assert.equal(e.xp(0), 1);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(e.xp(0), 1, 'a XP continua de um turno para o outro');
  assert.equal(e.gainedXpThisTurn(0), 0, '"ganhou XP neste turno" é por turno');
});

test('XP como custo de habilidade ativada (Crowd Favorite: Spend 2 XP): só aparece com XP suficiente e gasta ao ativar', () => {
  const s = new Scenario();
  const cf = s.put(0, 'UNL-102', base(0));
  s.e.gainXp(0, 1);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Gastar 2 XP')), 'com 1 XP não pode ativar');
  s.e.gainXp(0, 1);
  s.go();
  s.pick('Gastar 2 XP');
  s.passAll();
  assert.equal(s.e.xp(0), 0);
  assert.equal(cf.buffs, 1, s.log());
});

test('XP como custo adicional opcional (Safety Inspector) e como custo de Equip (Shepherd\'s Heirloom)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-164', 'hand');
  s.runes(0, Array.from({ length: 6 }, () => ORDER));
  s.e.gainXp(0, 3);
  s.go();
  s.pick('Jogar Safety Inspector');
  run(s, (d) => (d.prompt.includes('onde?') ? [d.options.find((o) => o.label.startsWith('base'))!.id] : d.prompt.includes('Gastar 3 XP') ? ['yes'] : undefined));
  if (s.d.prompt.includes('onde?')) s.pick('base de A');
  if (s.d.prompt.includes('Gastar 3 XP')) s.pick('Sim');
  s.passAll();
  const insp = s.e.units().find((u) => u.code === 'UNL-164')!;
  assert.ok(insp, s.log());
  assert.equal(s.e.xp(0), 0, 'gastou 3 XP');
  assert.equal(insp.data?.paidXp, true);
  // Equip — Spend 1 XP
  const gear = s.put(0, 'UNL-158', base(0));
  assert.equal(s.e.canEquip(0, gear, 'main'), false, 'sem XP não dá para equipar');
  s.e.gainXp(0, 1);
  assert.equal(s.e.canEquip(0, gear, 'main'), true);
});

test('Gatilho com "você pode gastar XP" (custo base, 383.3.b): sem XP não vai para a pilha nem pergunta', () => {
  const s = new Scenario();
  const kz = s.put(0, 'UNL-119', BF0);
  const t = s.e.script(kz).triggers![0];
  const ev = { type: 'attack' as const, unit: kz, player: 0 };
  const g1 = s.e.finalizeAbility(0, kz, t, 'trigger', ev);
  const r1 = g1.next(undefined as any);
  assert.equal(r1.done, true, 'sem 3 XP: nada a perguntar');
  assert.equal(r1.value, false);
  s.e.gainXp(0, 3);
  const g2 = s.e.finalizeAbility(0, kz, t, 'trigger', ev);
  const r2 = g2.next(undefined as any);
  assert.equal(r2.done, false);
  assert.equal((r2.value as Decision).kind, 'confirm', 'com XP pergunta o "você pode"');
  const r3 = g2.next(['yes']);
  assert.equal(r3.done, true);
  assert.equal(s.e.xp(0), 0, 'o XP é gasto ao pôr na pilha');
  assert.equal(s.e.chain.length, 1);
});

// ───────────── Hunt ─────────────
test('Hunt é gatilho (823.1): no hold vai para a pilha e só então dá a XP', () => {
  const s = new Scenario();
  s.put(0, 'UNL-047', BF0); // Mosstomper, Hunt 2
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.xp(0), 2, s.log(30));
  assert.ok(s.e.log.some((l) => l.text.includes('Na pilha: Mosstomper: Hunt 2')), 'Hunt passou pela pilha');
});

test('Hunt: na conquista e no hold, instâncias somadas (823.2; Hunter\'s Machete); última informação se a unidade sai', () => {
  const s = new Scenario();
  const e = s.e;
  const moss = s.put(0, 'UNL-047', BF0);
  const mach = s.put(0, 'UNL-096', BF0);
  assert.ok(e.attach(mach, moss));
  e.emit({ type: 'conquer', player: 0, bf: 0, excess: 0, units: [moss.id] });
  const hs = huntPending(s, moss);
  assert.equal(hs.length, 1, 'um gatilho só');
  assert.equal(hs[0].label, 'Hunt 3: ganhar 3 XP');
  assert.equal(e.xp(0), 0, 'nada antes de resolver');
  // a unidade sai antes de resolver: usa o Hunt de quando disparou
  e.toZone(moss, 'trash');
  resolvePending(s, e.pending.indexOf(hs[0]));
  assert.equal(e.xp(0), 3);
  e.pending = [];
  // unidade sem Hunt não dispara; o evento-espelho do Skyfall (aliasOf) também não
  const sk = s.put(0, SKULKER, BF0);
  const moss2 = s.put(0, 'UNL-047', BF0);
  e.emit({ type: 'hold', player: 0, bf: 0, excess: 0, units: [sk.id, moss2.id] });
  assert.equal(e.pending.filter((x) => x.label.startsWith('Hunt')).length, 1);
  e.pending = [];
  e.emit({ type: 'conquer', player: 0, bf: 0, excess: 0, units: [moss2.id], only: [moss2.id], aliasOf: 'hold' });
  assert.equal(e.pending.length, 0, 'Hunt já disparou pelo evento original');
});

test('Aura.triggerExtra (Red Brambleback): efeitos de conquista aqui disparam uma vez a mais, Hunt incluído (823.1.b)', () => {
  const s = new Scenario();
  const e = s.e;
  const moss = s.put(0, 'UNL-047', BF0);
  const bram = s.put(0, 'UNL-029', BF0);
  e.emit({ type: 'conquer', player: 0, bf: 0, excess: 0, units: [moss.id, bram.id] });
  assert.equal(huntPending(s, moss).length, 2, 'Hunt duas vezes');
  e.pending = [];
  e.emit({ type: 'hold', player: 0, bf: 0, excess: 0, units: [moss.id, bram.id] });
  assert.equal(huntPending(s, moss).length, 1, 'hold não é dobrado pelo Brambleback');
  e.pending = [];
  const moss1 = s.put(0, 'UNL-047', BF1);
  e.emit({ type: 'conquer', player: 0, bf: 1, excess: 0, units: [moss1.id] });
  assert.equal(huntPending(s, moss1).length, 1, 'só "aqui"');
});

// ───────────── Level e Legion ─────────────
test('Level (824): o texto fica inativo até ter N XP; vale a XP do controlador atual (824.1.c.1)', () => {
  const s = new Scenario();
  const e = s.e;
  const sc = s.put(0, 'UNL-016', base(0)); // Scorchclaw 3
  e.gainXp(0, 2);
  assert.equal(e.might(sc), 3);
  e.gainXp(0, 1);
  assert.equal(e.might(sc), 4, 'Level 3 ativo');
  e.spendXp(0, 1);
  assert.equal(e.might(sc), 3, 'inativo assim que cai abaixo (824.1.d)');
  e.gainXp(1, 5);
  sc.controller = 1;
  assert.equal(e.might(sc), 4, 'XP do novo controlador');
  const moss = s.put(1, 'UNL-047', base(1));
  assert.equal(e.kw(moss).deflect, 1, 'palavra-chave dependente');
});

test('Level em gatilho: checado quando dispara (727.1.c.1), não de novo na resolução', () => {
  const s = new Scenario();
  const e = s.e;
  const w = s.put(0, 'UNL-040', base(0));
  e.gainXp(0, 5);
  e.emit({ type: 'play', obj: w, player: 0, loc: base(0) });
  assert.equal(e.pending.filter((x) => x.label === 'Level 6: comprar 1').length, 0, 'com 5 XP não dispara');
  e.pending = [];
  e.gainXp(0, 1);
  e.emit({ type: 'play', obj: w, player: 0, loc: base(0) });
  const k = e.pending.findIndex((x) => x.label === 'Level 6: comprar 1');
  assert.ok(k >= 0, 'com 6 XP dispara');
  e.spendXp(0, 6);
  const hand = e.pl[0].hand.length;
  resolvePending(s, k);
  assert.equal(e.pl[0].hand.length, hand + 1, 'resolve mesmo com a XP gasta depois');
});

test('Level em habilidade ativada (Honeyfruit): só pode ser ativada com a condição (727.1.c.3)', () => {
  const s = new Scenario();
  const hf = s.put(0, 'UNL-049', base(0));
  const a = s.e.script(hf).activated![0];
  assert.equal(s.e.canActivate(0, hf, a, 'main'), false);
  s.e.gainXp(0, 6);
  assert.equal(s.e.canActivate(0, hf, a, 'main'), true);
});

// ───────────── Ambush ─────────────
test('Ambush: campos onde você tem unidades; "I can [Ambush] to..." (Rengar, Trophy Hunter) acrescenta campos (822.1.d)', () => {
  const s = new Scenario();
  const e = s.e;
  const r = s.put(0, 'UNL-120', 'hand');
  assert.deepEqual(e.unitLocations(0, r, 'hand', 'priority'), [], 'sem unidades em campo nenhum');
  e.bfs[1].controller = 1;
  s.put(1, SKULKER, BF1);
  assert.deepEqual(e.unitLocations(0, r, 'hand', 'priority'), [BF1], 'campo com unidade inimiga');
  const inf = s.put(0, 'UNL-002', 'hand'); // Inferna: Ambush normal
  assert.deepEqual(e.unitLocations(0, inf, 'hand', 'priority'), []);
  s.put(0, SKULKER, BF0);
  assert.deepEqual(e.unitLocations(0, inf, 'hand', 'priority'), [BF0]);
});

test('Ambush 822.3: se o custo tira a última unidade sua do campo, a jogada é desfeita; com a permissão da carta (Stalking Wolf), vale', () => {
  // ilegal: Poppy (com o custo de teste) mata o Poro, único aliado no campo do oponente
  const s = new Scenario();
  s.e.bfs[1].controller = 1;
  s.put(1, SKULKER, BF1);
  s.put(0, PORO, BF1);
  s.put(0, 'UNL-178', 'hand');
  s.runes(0, Array.from({ length: 7 }, () => ORDER));
  s.go();
  s.pick('Jogar Poppy');
  let err = '';
  try {
    s.pick('Campo Vazio B');
  } catch (x: any) {
    err = String(x.message);
  }
  assert.match(err + (s.g.error || ''), /Ambush/, 'jogada desfeita (822.3)');

  // legal: Stalking Wolf pode [Ambush] ao campo da unidade morta
  const s2 = new Scenario();
  s2.e.bfs[1].controller = 1;
  s2.put(1, SKULKER, BF1);
  const poro = s2.put(0, PORO, BF1);
  s2.put(0, 'UNL-166', 'hand');
  s2.runes(0, Array.from({ length: 6 }, () => ORDER));
  s2.go();
  s2.pick('Jogar Stalking Wolf');
  s2.pick('Campo Vazio B');
  s2.passAll();
  const wolf = s2.e.units().find((u) => u.code === 'UNL-166');
  assert.ok(wolf, s2.log());
  assert.equal(s2.e.bfIndex(wolf!), 1);
  assert.equal(poro.zone, 'trash');
});

// ───────────── cópia ─────────────
test('Cópia (477.1.b): traços impressos (nome, Might impresso, texto), sem buffs; cópia de cópia copia o original', () => {
  const s = new Scenario();
  const e = s.e;
  const rex = s.put(1, 'UNL-067', BF1);
  e.buff(rex, 1);
  e.giveMight(rex, 3);
  const refl = e.createToken('TOK-REFLECTION', 0, base(0));
  assert.equal(e.might(refl), 0);
  assert.ok(e.becomeCopy(refl, rex));
  assert.equal(e.name(refl), 'Ruined Rex');
  assert.equal(e.might(refl), 6, 'Might impresso, sem o buff nem o +3 (RiftJudge #9410, #10239)');
  assert.equal(refl.token, true, 'continua ficha');
  assert.equal(refl.buffs, 0);
  const refl2 = e.createToken('TOK-REFLECTION', 0, base(0));
  e.becomeCopy(refl2, refl);
  assert.equal(refl2.code, 'UNL-067', 'cópia de cópia = cópia do original');
  // a ficha copiada morre: o Deathknell copiado dispara (olhar para trás)
  drain(e.killG(refl));
  assert.ok(e.pending.some((x) => x.sourceId === refl.id && x.label === 'Deathknell do Ruined Rex'), 'Deathknell da cópia');
  e.pending = [];
  // carta (não ficha) que vira cópia volta ao impresso ao sair do tabuleiro, mas os gatilhos de morte olham para trás
  const sk = s.put(0, SKULKER, base(0));
  e.becomeCopy(sk, rex);
  assert.equal(e.name(sk), 'Ruined Rex');
  drain(e.killG(sk));
  assert.equal(sk.code, SKULKER);
  assert.equal(sk.printed, undefined);
  assert.ok(e.pending.some((x) => x.sourceId === sk.id && x.label === 'Deathknell do Ruined Rex'));
});

// ───────────── substituir / criar ─────────────
test("Substituir (438): o campo vira Brush (mesmo objeto, controle e unidades); o original vai ao banimento como substituído; trocar de volta", () => {
  const s = new Scenario();
  const e = s.e;
  const bf = e.newObj('OGN-276', 0, 'battlefieldZone'); // Aspirant's Climb
  e.bfs[0].objId = bf.id;
  e.script(bf).bfSetup!(e, bf);
  assert.equal(e.cfg.victoryScore, 9);
  const cat = s.put(0, 'UNL-036', BF0); // Mutated Mouser (Cat), 1
  const sk = s.put(0, SKULKER, BF0);
  const ver = bf.zoneVersion;
  e.replaceWith(bf, 'TOK-BRUSH', 0);
  assert.equal(e.bfObj(0).id, bf.id, 'mesmo objeto (438.1.a)');
  assert.equal(bf.zoneVersion, ver);
  assert.equal(e.name(bf), 'Brush');
  assert.equal(e.bfs[0].controller, 0, 'controle herdado');
  assert.equal(e.cfg.victoryScore, 8, 'o Aspirant\'s Climb deixou de valer');
  assert.equal(e.might(cat), 2, 'Brush: Cat +1');
  assert.equal(e.might(sk), 3);
  const orig = e.replacedCards(bf);
  assert.equal(orig.length, 1);
  assert.equal(orig[0].code, 'OGN-276');
  assert.ok(e.isReplaced(orig[0]) && e.pl[0].banish.includes(orig[0].id), 'no banimento, substituído (438.5.a)');
  // "When you score here, you may replace this with the battlefield it replaced"
  e.emit({ type: 'hold', player: 0, bf: 0, excess: 0, units: [cat.id, sk.id] });
  assert.ok(e.pending.some((x) => x.sourceId === bf.id && x.label.startsWith('Trocar de volta')));
  e.pending = [];
  drain(e.swapBackG(0, bf));
  assert.equal(bf.code, 'OGN-276');
  assert.equal(bf.token, false);
  assert.equal(orig[0].zone, 'gone');
  assert.ok(!e.pl[0].banish.includes(orig[0].id));
  assert.equal(e.cfg.victoryScore, 9);
  assert.equal(e.might(cat), 1);
  assert.equal(drain(e.swapBackG(0, bf)), undefined, 'nada mais a trocar (438.7.c)');
});

test('Criar campo (439; Baron Pit): campo novo sem controlador; unidades podem ir para lá de qualquer campo', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, SKULKER, BF0);
  assert.ok(!e.moveDests([u]).some((l) => l.t === 'bf'), 'sem Ganking, não vai de campo a campo');
  const i = e.createBattlefield('TOK-BARONPIT', 0);
  assert.equal(i, 2);
  assert.equal(e.bfs[2].controller, null);
  const d = e.moveDests([u]);
  assert.ok(d.some((l) => l.t === 'bf' && l.i === 2), 'pode ir para o Baron Pit');
  assert.ok(!d.some((l) => l.t === 'bf' && l.i === 1));
});

// ───────────── nomear, tags, buff ─────────────
test('Nomear (759-763): tag da lista oficial (sem duplicar), carta sem fichas, tipo', () => {
  const s = new Scenario();
  const e = s.e;
  const g1 = e.nameTagG(0, 'Nomeie uma tag');
  const d1 = g1.next(undefined as any).value as Decision;
  const labels = d1.options.map((o) => o.label);
  assert.ok(labels.includes('Poro') && labels.includes('Miss Fortune') && labels.includes('Bird'));
  assert.ok(!labels.includes('Miss'));
  assert.equal(new Set(labels.map((x) => x.toLowerCase())).size, labels.length, 'sem duplicadas');
  assert.equal(g1.next(['Poro']).value, 'Poro');
  const g2 = e.nameCardG(0, 'Nomeie uma carta');
  const d2 = g2.next(undefined as any).value as Decision;
  assert.ok(d2.options.some((o) => o.label === 'Ruined Rex'));
  assert.ok(!d2.options.some((o) => o.label === 'Reflection'), 'fichas não (762.2)');
  assert.equal(g2.next(['Ruined Rex']).value, 'Ruined Rex');
  const g3 = e.nameTypeG(0, 'Nomeie um tipo');
  g3.next(undefined as any);
  assert.equal(g3.next(['gear']).value, 'gear');
});

test('giveTag: a tag vale enquanto o objeto está no tabuleiro; buff devolve se buffou (426.1.c)', () => {
  const s = new Scenario();
  const e = s.e;
  const sk = s.put(0, SKULKER, base(0));
  assert.equal(e.hasTag(sk, 'Dog'), false);
  e.giveTag(sk, 'Dog');
  assert.equal(e.hasTag(sk, 'dog'), true);
  assert.equal(e.buff(sk, 0), true);
  assert.equal(e.buff(sk, 0), false, 'já tinha buff');
  e.toZone(sk, 'hand');
  assert.equal(e.hasTag(sk, 'Dog'), false);
});
