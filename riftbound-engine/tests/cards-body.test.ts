// Testes de cenário das cartas do lote "body" (OGN-124..OGN-164). Rodar: npm test
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
  if (s.d.options.some((o) => o.label.includes(text)) && !s.d.root) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]); // ordem dos gatilhos
    else break;
  }
}
const logHas = (s: Scenario, t: string | RegExp) =>
  s.e.log.some((l) => (typeof t === 'string' ? l.text.includes(t) : t.test(l.text)));

test('Arena Bar: exaure para dar Buff a uma unidade aliada exaurida', () => {
  const s = new Scenario();
  const bar = s.put(0, 'OGN-124', base(0));
  const tired = s.put(0, 'OGN-136', base(0), { ready: false });
  s.put(0, 'OGN-142', base(0)); // pronta: não é alvo
  s.go();
  s.pick('Arena Bar');
  s.passAll();
  assert.equal(tired.buffs, 1);
  assert.equal(bar.exhausted, true);
});

test('Cannon Barrage: 2 de dano em cada unidade inimiga em combate', () => {
  const s = new Scenario();
  const poro = s.put(1, 'OGN-052', BF0);
  const a1 = s.put(0, 'OGN-136', base(0));
  const a2 = s.put(0, 'OGN-136', base(0));
  const bystander = s.put(0, 'OGN-142', BF1);
  s.put(1, 'OGN-127', 'hand');
  s.runes(1, [B, B]);
  s.go();
  moveTo(s, [a1.id, a2.id], 'Campo Vazio A');
  for (let i = 0; i < 5 && s.d.player !== 1; i++) s.pick('Passar');
  s.pick('Jogar Cannon Barrage');
  s.passAll();
  assert.equal(a1.zone, 'trash', s.log(25));
  assert.equal(a2.zone, 'trash');
  assert.equal(poro.zone, 'board');
  assert.equal(bystander.zone, 'board');
  assert.ok(!logHas(s, 'Mountain Drake recebe'), 'unidade fora do combate não leva dano');
});

test('Confront: unidades jogadas depois neste turno entram prontas; compra 1', () => {
  const s = new Scenario();
  s.put(0, 'OGN-129', 'hand');
  const rook = s.put(0, 'OGN-136', 'hand');
  s.runes(0, [B, B, B, B]);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Confront');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1');
  s.pick('Jogar Pit Rookie');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(rook.zone, 'board');
  assert.equal(rook.exhausted, false);
});

test('Crackshot Corsair: ao atacar causa 1 a uma unidade inimiga aqui; Dune Drake ganha +2 se houver inimigo pronto', () => {
  const s = new Scenario();
  s.put(1, 'OGN-142', BF0); // Mountain Drake pronta
  const cc = s.put(0, 'OGN-130', base(0));
  const dd = s.put(0, 'OGN-131', base(0));
  s.go();
  moveTo(s, [cc.id, dd.id], 'Campo Vazio A');
  for (let i = 0; i < 6 && !logHas(s, 'Dune Drake recebe +2'); i++) {
    if (s.d.kind === 'choose' && !s.d.prompt.startsWith('Distribuir')) s.ok([s.d.options[0].id]);
    else s.passAll(1);
  }
  assert.ok(logHas(s, 'Mountain Drake recebe 1 de dano de Crackshot Corsair'), s.log(30));
  assert.ok(logHas(s, 'Dune Drake recebe +2'), s.log(30));
});

test('Dune Drake: sem unidade inimiga pronta não ganha +2', () => {
  const s = new Scenario();
  s.put(1, 'OGN-052', BF0, { ready: false });
  const dd = s.put(0, 'OGN-131', base(0));
  s.go();
  moveTo(s, [dd.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(!logHas(s, 'Dune Drake recebe +2'), s.log(20));
  assert.ok(logHas(s, 'nenhuma unidade inimiga pronta'));
});

test('Flurry of Blades: 1 de dano em todas as unidades em campos (não nas bases)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-133', 'hand');
  s.runes(0, [B]);
  const mine = s.put(0, 'OGN-136', BF0);
  const theirs = s.put(1, 'OGN-136', BF1);
  const home = s.put(0, 'OGN-136', base(0));
  s.go();
  s.pick('Jogar Flurry of Blades');
  s.passAll();
  assert.equal(mine.damage, 1);
  assert.equal(theirs.damage, 1);
  assert.equal(home.damage, 0);
});

test('Mobilize e Catalyst of Aeons: canalizam runas exauridas; se não conseguem, compram', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-134', 'hand');
  s.put(0, 'OGN-138', 'hand');
  s.runes(0, [B, B, B, B, B, B]);
  // deixa só 1 runa no deck de runas
  for (const id of e.pl[0].runeDeck.slice(1)) e.toZone(e.objs[id], 'setAside');
  s.go();
  const r0 = e.runesOf(0).length;
  const h0 = e.pl[0].hand.length;
  s.pick('Jogar Catalyst of Aeons');
  s.passAll();
  assert.equal(e.runesOf(0).length, r0 + 1, 'canalizou só 1');
  assert.equal(e.pl[0].hand.length, h0 - 1 + 1, 'e comprou 1');
  assert.ok(e.runesOf(0).some((r) => r.exhausted && r.enteredTurn === e.turn));
  s.pick('Jogar Mobilize');
  s.passAll();
  assert.equal(e.pl[0].hand.length, h0, 'sem runas no deck: comprou 1');
});

test('Cithria of Cloudfield: ganha Buff quando você joga outra unidade', () => {
  const s = new Scenario();
  const ci = s.put(0, 'OGN-139', base(0));
  s.put(0, 'OGN-136', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Pit Rookie');
  maybe(s, 'base de A');
  s.passAll(5);
  if (s.d.kind === 'choose') s.pickObj(ci); // Pit Rookie dá Buff em outra unidade
  s.passAll();
  assert.equal(ci.buffs, 1, s.log());
});

test('Herald of Scales: Dragões custam 2 a menos, até o mínimo de 1', () => {
  const s = new Scenario();
  const e = s.e;
  const dune = s.put(0, 'OGN-131', 'hand'); // Dragon, 5
  const mtn = s.put(0, 'OGN-142', 'hand'); // Dragon, 9
  const rook = s.put(0, 'OGN-136', 'hand'); // não é Dragon
  assert.equal(e.minCostFor(0, dune, 'hand').energy, 5);
  s.put(0, 'OGN-140', base(0));
  assert.equal(e.minCostFor(0, dune, 'hand').energy, 3);
  assert.equal(e.minCostFor(0, mtn, 'hand').energy, 7);
  assert.equal(e.minCostFor(0, rook, 'hand').energy, 2);
  assert.equal(e.minCostFor(1, dune, 'hand').energy, 5, 'só os seus Dragões');
});

test('Kinkou Monk: Buff em até duas outras unidades aliadas', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-136', base(0));
  const b = s.put(0, 'OGN-136', base(0));
  const c = s.put(0, 'OGN-136', base(0));
  s.put(0, 'OGN-141', 'hand');
  s.runes(0, [B, B, B, B, B]);
  s.go();
  s.pick('Jogar Kinkou Monk');
  assert.match(s.d.prompt, /Kinkou Monk/);
  assert.equal(s.d.min, 0);
  assert.equal(s.d.max, 2);
  s.ok([a.id, c.id]);
  s.passAll();
  assert.equal(a.buffs, 1);
  assert.equal(b.buffs, 0);
  assert.equal(c.buffs, 1);
});

test("Pirate's Haven: +1 de Might ao preparar unidade aliada (efeito e Awaken)", () => {
  const s = new Scenario();
  s.put(0, 'OGN-143', base(0));
  const u = s.put(0, 'OGN-136', base(0), { ready: false });
  const v = s.put(0, 'OGN-136', base(0), { ready: false });
  s.put(0, 'OGN-146', 'hand'); // Wallop
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Wallop');
  s.pickObj(u);
  s.passAll();
  assert.equal(u.exhausted, false);
  assert.equal(s.e.might(u), 3, '2 + 1 do Haven');
  assert.equal(s.e.might(v), 2);
  endTurn(s);
  endTurn(s); // Awaken do jogador 0 prepara v
  assert.equal(s.e.active, 0);
  assert.equal(v.exhausted, false);
  assert.equal(s.e.might(v), 3, s.log(20));
  assert.equal(s.e.might(u), 2, 'u já estava pronta: preparar algo pronto não dispara');
});

test('Spoils of War: custa 2 a menos se uma unidade inimiga morreu neste turno', () => {
  const s = new Scenario();
  const e = s.e;
  const sp = s.put(0, 'OGN-144', 'hand');
  const enemy = s.put(1, 'OGN-136', BF1);
  const mine = s.put(0, 'OGN-136', BF0);
  s.runes(0, [B, B, B]);
  s.go();
  assert.ok(!s.d.options.some((o) => o.obj === sp.id), '4 + Body: não dá com 3 runas');
  e.kill(mine);
  s.go();
  assert.ok(!s.d.options.some((o) => o.obj === sp.id), 'unidade aliada morrer não conta');
  e.kill(enemy);
  s.go();
  const h = e.pl[0].hand.length;
  s.pick('Jogar Spoils of War');
  s.passAll();
  assert.equal(e.pl[0].hand.length, h - 1 + 2);
  endTurn(s);
  assert.equal(e.pl[1].unitDeaths, 0, 'zera no turno seguinte');
});

test('Unyielding Spirit: previne dano de spells/habilidades, mas não o de Challenge nem o de combate', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-145', 'hand');
  s.put(0, 'OGN-133', 'hand'); // Flurry of Blades
  s.put(0, 'OGN-128', 'hand'); // Challenge
  s.runes(0, [B, B, B, B, B, B]);
  const mine = s.put(0, 'OGN-142', BF0); // 10
  const theirs = s.put(1, 'OGN-065', BF1); // Wizened Elder 4
  s.go();
  s.pick('Jogar Unyielding Spirit');
  s.passAll();
  s.pick('Jogar Flurry of Blades');
  s.passAll();
  assert.equal(mine.damage, 0);
  assert.equal(theirs.damage, 0);
  assert.ok(logHas(s, 'é prevenido'));
  s.pick('Jogar Challenge');
  s.maybeObj(mine);
  s.maybeObj(theirs);
  s.passAll();
  assert.equal(theirs.zone, 'trash', 'Challenge: dano das unidades não é prevenido\n' + s.log(20));
  assert.equal(mine.damage, 4);
});

test('Wallop: gastar um Buff deixa o spell de graça; prepara uma unidade', () => {
  const s = new Scenario();
  const buffed = s.put(0, 'OGN-136', base(0));
  buffed.buffs = 1;
  const tired = s.put(0, 'OGN-142', base(0), { ready: false });
  s.put(0, 'OGN-146', 'hand');
  s.go(); // sem runas
  s.pick('Jogar Wallop');
  s.pick('Sim');
  s.pickObj(tired);
  s.passAll();
  assert.equal(buffed.buffs, 0);
  assert.equal(tired.exhausted, false);
});

test('Anivia, Primal: ao atacar causa 3 a todas as unidades inimigas aqui', () => {
  const s = new Scenario();
  const a = s.put(1, 'OGN-136', BF0);
  const b = s.put(1, 'OGN-052', BF0);
  const far = s.put(1, 'OGN-136', BF1);
  const an = s.put(0, 'OGN-148', base(0));
  s.go();
  moveTo(s, [an.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(logHas(s, 'Pit Rookie recebe 3 de dano de Anivia, Primal'), s.log(25));
  assert.ok(logHas(s, 'Stalwart Poro recebe 3 de dano de Anivia, Primal'));
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
  assert.equal(far.damage, 0);
});

test('Carnivorous Snapvine: troca dano com uma unidade inimiga num campo', () => {
  const s = new Scenario();
  const elder = s.put(1, 'OGN-065', BF1); // 4
  s.put(1, 'OGN-136', base(1)); // na base: não é alvo
  s.put(0, 'OGN-149', 'hand');
  s.runes(0, [B, B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Carnivorous Snapvine');
  maybe(s, 'base de A');
  s.passAll();
  const snap = s.e.units().find((u) => u.code === 'OGN-149')!;
  assert.equal(elder.zone, 'trash', s.log());
  assert.equal(snap.damage, 4);
});

test('Kraken Hunter: cada Buff gasto tira 1 Body do custo', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-136', base(0));
  const b = s.put(0, 'OGN-136', base(0));
  a.buffs = 1;
  b.buffs = 1;
  s.put(0, 'OGN-150', 'hand');
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury]); // 3 de energia e nenhum Body
  s.go();
  s.pick('Jogar Kraken Hunter');
  maybe(s, 'base de A');
  s.pick('Sim');
  s.ok([a.id, b.id]);
  s.passAll();
  const k = s.e.units().find((u) => u.code === 'OGN-150');
  assert.ok(k, s.log());
  assert.equal(a.buffs + b.buffs, 0);
  assert.equal(s.e.runesOf(0).length, 3, 'nenhuma runa reciclada');
});

test('Overt Operation: gasta Buffs para preparar e depois dá Buff a todas as aliadas', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-136', base(0), { ready: false });
  a.buffs = 1;
  const b = s.put(0, 'OGN-136', base(0), { ready: false });
  const enemy = s.put(1, 'OGN-136', base(1));
  s.put(0, 'OGN-153', 'hand');
  s.runes(0, [B, B, B, B, B]);
  s.go();
  s.pick('Jogar Overt Operation');
  s.passAll(3);
  assert.match(s.d.prompt, /Overt Operation/);
  s.ok([a.id]);
  s.passAll();
  assert.equal(a.exhausted, false);
  assert.equal(a.buffs, 1);
  assert.equal(b.exhausted, true);
  assert.equal(b.buffs, 1);
  assert.equal(enemy.buffs, 0);
});

test('Qiyana, Victorious: ao conquistar, compra 1 ou canaliza 1 runa exaurida', () => {
  const s = new Scenario();
  const q = s.put(0, 'OGN-155', base(0));
  s.go();
  const r0 = s.e.runesOf(0).length;
  moveTo(s, [q.id], 'Campo Vazio A');
  s.passAll(3);
  s.pick('Canalizar');
  s.passAll();
  assert.equal(s.e.runesOf(0).length, r0 + 1, s.log());
  assert.ok(s.e.runesOf(0)[0].exhausted || s.e.runesOf(0).every((r) => r.exhausted));
  assert.equal(s.e.kw(q).deflect, 1);
});

test('Sabotage: revela a mão do oponente e recicla uma carta que não é unidade', () => {
  const s = new Scenario();
  const e = s.e;
  const unit = s.put(1, 'OGN-136', 'hand');
  const spell = s.put(1, 'OGN-154', 'hand');
  s.put(0, 'OGN-156', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Sabotage');
  s.passAll();
  assert.equal(unit.zone, 'hand');
  assert.equal(spell.zone, 'mainDeck');
  assert.equal(e.pl[1].mainDeck[e.pl[1].mainDeck.length - 1], spell.id, 'vai para o fundo');
  assert.ok(logHas(s, 'revela a mão'));
});

test('Volibear, Imposing: compra quando o oponente move para outro campo (uma vez por movimento)', () => {
  const s = new Scenario();
  s.put(1, 'OGN-158', BF1);
  const a = s.put(0, 'OGN-136', base(0));
  const b = s.put(0, 'OGN-136', base(0));
  s.go();
  const h = s.e.pl[1].hand.length;
  moveTo(s, [a.id, b.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[1].hand.length, h + 1, s.log());
  assert.equal(s.e.kw(s.e.units().find((u) => u.code === 'OGN-158')!).shield, 3);
});

test('Volibear, Imposing: mover para o campo dele não compra', () => {
  const s = new Scenario();
  s.put(1, 'OGN-158', BF1);
  const a = s.put(0, 'OGN-142', base(0));
  s.go();
  const h = s.e.pl[1].hand.length;
  moveTo(s, [a.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(s.e.pl[1].hand.length, h, s.log());
});

test('Warwick, Hunter: entra pronto; ao atacar mata as unidades inimigas com dano aqui', () => {
  const s = new Scenario();
  const hurt = s.put(1, 'OGN-142', BF0);
  const fresh = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-159', 'hand');
  s.runes(0, [B, B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Warwick, Hunter');
  maybe(s, 'base de A');
  s.passAll();
  const w = s.e.units().find((u) => u.code === 'OGN-159')!;
  assert.equal(w.exhausted, false, 'entra pronto');
  hurt.damage = 1;
  s.go();
  moveTo(s, [w.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(logHas(s, /Mountain Drake morre\./), s.log(25));
  assert.ok(!s.e.log.some((l) => l.text === 'Wizened Elder morre.'), 'Elder não tinha dano antes do ataque');
  void fresh;
});

test('Dazzling Aurora: no fim do turno revela até uma unidade, bane e joga de graça; recicla o resto', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-160', base(0));
  const unit = s.put(0, 'OGN-142', 'deckTop');
  const spell = s.put(0, 'OGN-154', 'deckTop'); // fica por cima
  s.go();
  s.pick('Encerrar o turno');
  for (let i = 0; i < 10 && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(unit.zone, 'board', s.log(20));
  assert.equal(unit.controller, 0);
  assert.equal(spell.zone, 'mainDeck');
  assert.equal(e.pl[0].mainDeck[e.pl[0].mainDeck.length - 1], spell.id);
  assert.ok(logHas(s, 'Dazzling Aurora revela: Primal Strength, Mountain Drake'));
});

test('Deadbloom Predator: pode ser jogado num campo inimigo ocupado (e começa combate)', () => {
  const s = new Scenario();
  const poro = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-161', 'hand');
  s.runes(0, [B, B, B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Deadbloom Predator');
  assert.ok(s.d.options.some((o) => o.label === 'Campo Vazio A'), s.d.options.map((o) => o.label).join('|'));
  assert.ok(!s.d.options.some((o) => o.label === 'Campo Vazio B'), 'campo vazio não controlado não vale');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(poro.zone, 'trash', s.log(25));
  assert.equal(s.e.bfs[0].controller, 0);
});

test('Miss Fortune, Captain: na primeira vez que se move no turno, prepara outra coisa exaurida', () => {
  const s = new Scenario();
  const mf = s.put(0, 'OGN-162', base(0));
  const tired = s.put(0, 'OGN-142', base(0), { ready: false });
  const tired2 = s.put(0, 'OGN-142', base(0), { ready: false });
  s.go();
  moveTo(s, [mf.id], 'Campo Vazio A');
  // "você pode" decidido ao pôr na pilha; o alvo é escolhido nessa hora (regras 383.3.a e 402.2)
  assert.match(s.d.prompt, /Miss Fortune/);
  s.pick('Sim');
  s.pickObj(tired);
  s.passAll();
  assert.equal(tired.exhausted, false);
  // segundo movimento no mesmo turno (Ganking): não dispara
  s.e.ready(mf);
  s.go();
  moveTo(s, [mf.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(tired2.exhausted, true, s.log(20));
  assert.equal(s.e.kw(mf).ganking, true);
});

test('Seal of Strength: o pagamento automático exaure o Seal para pagar 1 Body', () => {
  const s = new Scenario();
  const seal = s.put(0, 'OGN-163', base(0));
  s.put(0, 'OGN-145', 'hand'); // Unyielding Spirit: 1 + Body
  s.runes(0, [RUNE.fury]);
  s.go();
  s.pick('Jogar Unyielding Spirit');
  s.passAll();
  assert.equal(seal.exhausted, true);
  assert.equal(s.e.runesOf(0).length, 1, 'a runa de Fury não foi reciclada');
  assert.ok(logHas(s, 'Neste turno, o dano causado por spells'));
});

test('Sett, Brawler: Buff ao ser jogado; gastar o Buff dá +4 neste turno; Buff de novo ao conquistar', () => {
  const s = new Scenario();
  s.put(0, 'OGN-164', 'hand');
  s.runes(0, [B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Sett, Brawler');
  maybe(s, 'base de A');
  s.passAll();
  const sett = s.e.units().find((u) => u.code === 'OGN-164')!;
  assert.equal(sett.buffs, 1);
  assert.equal(s.e.might(sett), 5);
  s.pick('Sett, Brawler: Gastar meu Buff');
  s.passAll();
  assert.equal(sett.buffs, 0);
  assert.equal(s.e.might(sett), 8);
  s.e.ready(sett);
  s.go();
  moveTo(s, [sett.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(sett.buffs, 1, s.log(20));
});
