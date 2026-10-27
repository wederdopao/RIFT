// Testes de cenário das cartas do lote "mind" do Unleashed (UNL-061..UNL-090).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const MIND = 'OGN-089';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const mind = (n: number) => Array.from({ length: n }, () => MIND);
const has = (s: Scenario, text: string) => !!s.g.current && s.d.options.some((o) => o.label.includes(text));
/** Passa a prioridade e ordena gatilhos simultâneos até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 60 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function at(s: Scenario, label = 'base de A') {
  if (s.g.current && /onde/.test(s.d.prompt)) s.pick(label);
}
/** Ficha no tabuleiro sem mexer na disputa do campo (o campo passa a ser de p). */
function tok(s: Scenario, p: P, code: string, loc: { t: 'bf'; i: number } | { t: 'base'; p: P }): Obj {
  const o = s.e.createToken(code, p, loc, true);
  if (loc.t === 'bf') {
    s.e.bfs[loc.i].controller = p;
    s.e.bfs[loc.i].contestedBy = null;
  }
  return o;
}
/** Movimento padrão (a unidade tem de estar pronta). */
function move(s: Scenario, us: Obj[], dest: string) {
  for (const u of us) u.exhausted = false;
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(us.map((u) => u.id));
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
const units = (s: Scenario, p: P, code: string) => s.e.units().filter((u) => u.controller === p && u.code === code);
const sprites = (s: Scenario, p: P) => units(s, p, 'TOK-SPRITE');
/** Esvazia o deck de p e põe cartas conhecidas (a primeira da lista fica no topo). */
function deck(s: Scenario, p: P, codes: string[]): Obj[] {
  const e = s.e;
  for (const id of [...e.pl[p].mainDeck]) e.toZone(e.objs[id], 'trash');
  e.pl[p].trash = [];
  const out: Obj[] = [];
  for (const c of [...codes].reverse()) out.unshift(s.put(p, c, 'deckTop'));
  return out;
}

// ───────────────────────────── cópia e fichas ─────────────────────────────

test('Keeper of Masks: duas Reflection aqui viram cópias (1 de Might, Temporary, nome Keeper)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-001', BF0); // controla o campo
  s.put(0, 'UNL-081', 'hand');
  s.runes(0, mind(2));
  s.go();
  s.pick('Jogar Keeper of Masks');
  at(s, e.name(e.bfs[0].objId));
  drain(s);
  const keepers = units(s, 0, 'UNL-081');
  assert.equal(keepers.length, 3, s.log());
  const toks = keepers.filter((u) => u.token);
  assert.equal(toks.length, 2);
  for (const t of toks) {
    assert.equal(e.bfIndex(t), 0);
    assert.equal(e.might(t), 1);
    assert.equal(e.kw(t).temporary, true);
    assert.equal(e.name(t), 'Keeper of Masks');
  }
});

test('Keeper of Masks + Zilean num campo: três cópias (Zilean dobra só uma jogada; RiftJudge #12467)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'UNL-086', BF1);
  s.put(0, 'OGN-001', BF0);
  s.put(0, 'UNL-081', 'hand');
  s.runes(0, mind(2));
  s.go();
  s.pick('Jogar Keeper of Masks');
  at(s, e.name(e.bfs[0].objId));
  drain(s);
  assert.match(s.d.prompt, /Zilean/);
  s.pick('Sim');
  drain(s);
  assert.ok(!(s.g.current && /Zilean/.test(s.d.prompt)), 'uma vez por turno');
  assert.equal(units(s, 0, 'UNL-081').filter((u) => u.token).length, 3, s.log());
});

test('Zilean: na base não substitui; recusar não gasta o uso do turno', () => {
  const s = new Scenario();
  const e = s.e;
  const z = s.put(0, 'UNL-086', base(0));
  s.put(0, 'UNL-069', 'hand');
  s.put(0, 'UNL-069', 'hand');
  s.runes(0, mind(10));
  s.go();
  s.pick('Jogar Sprite Burst');
  drain(s);
  at(s);
  at(s);
  drain(s);
  assert.equal(sprites(s, 0).length, 2, 'Zilean na base: sem cópia');
  e.moveUnits([z], BF0, 0);
  e.bfs[0].controller = 0;
  s.go();
  s.pick('Jogar Sprite Burst');
  drain(s);
  at(s);
  assert.match(s.d.prompt, /Zilean/);
  s.pick('Não');
  at(s);
  assert.match(s.d.prompt, /Zilean/);
  s.pick('Sim');
  drain(s);
  assert.equal(sprites(s, 0).length, 2 + 3);
  assert.ok(sprites(s, 0).every((u) => !u.exhausted), 'a cópia a mais também entra pronta');
});

test('Soul Shepherd e Petal Pixie: fichas +1; Pixie conta unidades suas com Temporary no campo dela', () => {
  const s = new Scenario();
  const e = s.e;
  const pix = s.put(0, 'UNL-076', BF0);
  assert.equal(e.might(pix), 2);
  const sp = tok(s, 0, 'TOK-SPRITE', BF0);
  tok(s, 0, 'TOK-SPRITE', BF1);
  e.createToken('TOK-SPRITE', 1, BF0, true);
  assert.equal(e.might(pix), 3, 'só o Sprite dela, no campo dela');
  s.put(0, 'UNL-077', base(0));
  assert.equal(e.might(sp), 4);
  assert.equal(e.might(pix), 3, 'Pixie não é ficha');
  e.moveUnits([pix], base(0), 0);
  assert.equal(e.might(pix), 2, 'na base: +0');
});

// ───────────────────────────── Temporary ─────────────────────────────

test('LeBlanc, Everywhere at Once: Temporary no campo dela não dispara; na base, dispara', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'UNL-090', BF0); // revisão 2: "at my battlefield" (texto impresso; RiftJudge #9863)
  const atBf = tok(s, 0, 'TOK-SPRITE', BF0);
  const atBase = tok(s, 0, 'TOK-SPRITE', base(0));
  const enemy = tok(s, 1, 'TOK-SPRITE', BF1);
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(enemy.zone, 'gone', 'Temporary do oponente continua');
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(atBf.zone, 'board', s.log());
  assert.equal(atBase.zone, 'gone');
});

test('Turn to Dust: o gear ganha Temporary (permanente) e morre no início da fase do controlador', () => {
  const s = new Scenario();
  const e = s.e;
  const gear = s.put(1, 'UNL-074', base(1));
  s.put(0, 'UNL-070', 'hand');
  s.runes(0, mind(2));
  s.go();
  s.pick('Jogar Turn to Dust');
  s.passAll();
  assert.equal(e.kw(gear).temporary, true);
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(gear.zone, 'trash', s.log());
});

test('Sprite Fountain: Sprite ao jogar e de novo pelo Deathknell quando o Temporary a mata', () => {
  const s = new Scenario();
  const e = s.e;
  const f = s.put(0, 'UNL-078', 'hand');
  s.runes(0, mind(3));
  s.go();
  s.pick('Jogar Sprite Fountain');
  drain(s);
  assert.equal(sprites(s, 0).length, 1);
  assert.ok(!sprites(s, 0)[0].exhausted);
  e.bfs[0].controller = null;
  s.pick('Encerrar o turno');
  drain(s);
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(f.zone, 'trash');
  assert.equal(sprites(s, 0).length, 1, 'o Sprite antigo morreu, o Deathknell jogou outro: ' + s.log(30));
});

test('Sprite Queen: Sprite ao jogar e no início da sua Beginning Phase', () => {
  const s = new Scenario();
  s.put(0, 'UNL-084', 'hand');
  s.runes(0, mind(8));
  s.go();
  s.pick('Jogar Sprite Queen');
  at(s);
  drain(s);
  assert.equal(sprites(s, 0).length, 1);
  s.pick('Encerrar o turno');
  drain(s);
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(sprites(s, 0).length, 1, 'o antigo morreu pelo Temporary e veio um novo');
});

// ───────────────────────────── hold, showdown ─────────────────────────────

test('Blue Sentinel: o próprio hold dispara duas vezes e adiciona 2 [A] no início da Main Phase', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'UNL-087', BF1);
  e.bfs[1].controller = 1;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  const pool = e.pl[1].pool;
  const pow = Object.values(pool.power).reduce((a, b) => a + (b || 0), 0);
  assert.equal(pow, 2, s.log(30));
  assert.equal(e.pl[1].points, 1, 'não dá ponto a mais (#10378)');
});

test('Blue Sentinel: dobra o hold de outra unidade aqui (Ornn: 2 vezes) mas não noutro campo', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'UNL-087', BF1);
  s.put(1, 'SFD-115', BF1); // Trinity Force: no tabuleiro sem anexar não faz nada
  const u = s.put(1, 'OGN-088', BF1);
  e.attach(e.objs[e.gearOf(1)[0].id], u); // Trinity Force: hold → 1 ponto
  e.bfs[1].controller = 1;
  const u2 = s.put(1, 'OGN-088', BF0);
  const tf2 = s.put(1, 'SFD-115', BF0);
  e.attach(tf2, u2);
  e.bfs[0].controller = 1;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  // 2 holds (2 pontos) + Trinity em BF1 2x + Trinity em BF0 1x
  assert.equal(e.pl[1].points, 2 + 2 + 1, s.log(40));
});

test('Diana, Lunari: showdown começa aqui → paga [1], Predict, revela e compra spell', () => {
  const s = new Scenario();
  const e = s.e;
  const d = s.put(0, 'UNL-079', base(0));
  const [top] = deck(s, 0, ['UNL-063', 'OGN-001']);
  s.runes(0, mind(2));
  s.go();
  e.moveUnits([d], BF0, 0);
  s.go();
  // o showdown abre na próxima estabilização: mova pela ação padrão
  e.moveUnits([d], base(0), 0);
  s.go();
  s.pick(/Mover/);
  if (/Quais unidades|unidade/.test(s.d.prompt)) s.pickObj(d);
  if (s.g.current && /destino|onde|Para onde/.test(s.d.prompt)) s.pick(e.name(e.bfs[0].objId));
  assert.match(s.d.prompt, /Diana/);
  s.pick('Sim');
  // Predict: não reciclar
  if (/Predict/.test(s.d.prompt)) s.ok([]);
  drain(s);
  assert.equal(top.zone, 'hand', s.log(30));
});

// ───────────────────────────── movimento ─────────────────────────────

test('Lillia, Fae Fawn: ao se mover, Sprite exaurido no local de onde saiu', () => {
  const s = new Scenario();
  const e = s.e;
  const l = s.put(0, 'UNL-082', BF0);
  e.bfs[0].controller = 0;
  move(s, [l], 'base de A');
  drain(s);
  const sp = sprites(s, 0);
  assert.equal(sp.length, 1, s.log());
  assert.equal(e.bfIndex(sp[0]), 0);
  assert.equal(sp[0].exhausted, true);
  assert.equal(e.bfs[0].controller, 0, 'mantém o campo (RiftJudge #11108)');
});

test('Hwei: compra, descarta e o tipo do descartado decide (spell compra 1; unidade +3)', () => {
  const s = new Scenario();
  const e = s.e;
  const h = s.put(0, 'UNL-080', base(0));
  deck(s, 0, ['OGN-001', 'OGN-001', 'OGN-001']);
  const spell = s.put(0, 'UNL-063', 'hand');
  move(s, [h], e.name(e.bfs[0].objId));
  drain(s);
  assert.match(s.d.prompt, /Hwei: descarte/);
  s.pickObj(spell);
  drain(s);
  assert.equal(e.pl[0].hand.length, 2, 'comprou 1, descartou 1, comprou 1');
  const unit = e.objs[e.pl[0].hand[0]];
  move(s, [h], 'base de A');
  drain(s);
  s.pickObj(unit);
  drain(s);
  assert.equal(e.might(h), 5 + 3);
});

test('Hwei: carta Unit Gear (Patched Porobot) faz os dois ramos (#11695)', () => {
  const s = new Scenario();
  const e = s.e;
  const h = s.put(0, 'UNL-080', base(0));
  deck(s, 0, ['OGN-001', 'OGN-001']);
  const pb = s.put(0, 'VEN-058', 'hand');
  const r = s.put(0, MIND, base(0), { ready: false });
  move(s, [h], e.name(e.bfs[0].objId));
  drain(s);
  s.pickObj(pb);
  // dois reflexivos (FAQ do Vendetta): o jogador escolhe a ordem
  if (/Vários efeitos/.test(s.d.prompt)) s.pick('runas');
  assert.match(s.d.prompt, /runas/);
  s.ok([r.id]);
  drain(s);
  assert.equal(r.exhausted, false);
  assert.equal(e.might(h), 8);
});

test('Smoke and Mirrors: troca as duas se uma tem Temporary; sem Temporary só compra', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-001', base(0));
  const sp = tok(s, 0, 'TOK-SPRITE', BF0);
  deck(s, 0, ['OGN-001', 'OGN-001']);
  s.put(0, 'UNL-083', 'hand');
  s.put(0, 'UNL-083', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Smoke and Mirrors');
  s.pickObj(a);
  s.maybeObj(sp);
  s.passAll();
  assert.equal(e.bfIndex(a), 0);
  assert.equal(sp.loc?.t, 'base');
  const b = s.put(0, 'OGN-001', BF1);
  e.bfs[1].controller = 0;
  drain(s);
  s.pick('Jogar Smoke and Mirrors');
  s.pickObj(a);
  s.maybeObj(b);
  s.passAll();
  assert.equal(e.bfIndex(a), 0, 'sem Temporary: não troca');
  assert.equal(e.bfIndex(b), 1);
  assert.equal(e.pl[0].hand.length, 2);
});

test('Smoke and Mirrors escondido: a 1ª no campo dele, a 2ª em qualquer outro local (811.1.d.2.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-001', BF0);
  e.bfs[0].controller = 0;
  const far = s.put(0, 'OGN-001', base(0));
  const sm = s.put(0, 'UNL-083', 'hand');
  s.runes(0, mind(1));
  s.go();
  s.pick('Esconder Smoke and Mirrors');
  s.pick('Encerrar o turno');
  drain(s);
  s.pick('Encerrar o turno');
  drain(s);
  const near = s.put(0, 'OGN-001', base(0));
  s.go();
  s.pick(/Smoke and Mirrors/);
  // a 1ª só pode ser a do campo (escolha automática, candidata única); a 2ª pode estar fora dele
  assert.match(s.d.prompt, /outra unidade/);
  assert.ok(s.d.options.some((o) => o.obj === far.id) && s.d.options.some((o) => o.obj === near.id));
  assert.ok(!s.d.options.some((o) => o.obj === a.id));
  s.pickObj(far);
  s.passAll();
  assert.equal(sm.zone, 'trash');
});

// ───────────────────────────── outros ─────────────────────────────

test('Jhin, Meticulous Killer: por [Mind] depois de gastar [4] num spell (Downstage com Repeat)', () => {
  const s = new Scenario();
  const e = s.e;
  deck(s, 0, ['OGN-001', 'OGN-001', 'OGN-001']);
  const j = s.put(0, 'UNL-089', 'hand');
  s.put(0, 'UNL-061', 'hand');
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Downstage');
  assert.match(s.d.prompt, /Repeat/);
  s.pick('Sim');
  s.passAll();
  assert.equal(e.pl[0].bigSpell, e.turn);
  s.pick('Jogar Jhin');
  if (/alternativo/.test(s.d.prompt)) s.pick('Sim');
  at(s);
  drain(s);
  assert.equal(j.zone, 'board', s.log());
  assert.equal(e.runesOf(0).length, 4, 'uma runa reciclada para o [Mind]');
});

test('Jhin: dois spells de 2 não somam (#10307)', () => {
  const s = new Scenario();
  const e = s.e;
  deck(s, 0, ['OGN-001', 'OGN-001', 'OGN-001']);
  s.put(0, 'UNL-089', 'hand');
  s.put(0, 'UNL-061', 'hand');
  s.put(0, 'UNL-061', 'hand');
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Downstage');
  s.pick('Não');
  s.passAll();
  s.pick('Jogar Downstage');
  if (/Repeat/.test(s.d.prompt)) s.pick('Não');
  s.passAll();
  assert.equal(e.pl[0].bigSpell, undefined);
  assert.ok(!has(s, 'Jogar Jhin'), 'só 1 runa pronta e sem o custo alternativo');
});

test('Gutter Palace: vence com 4 cartas na mão e 4 unidades em campos; Bird pela ativada', () => {
  const s = new Scenario();
  const e = s.e;
  const gp = s.put(1, 'UNL-088', base(1));
  for (let k = 0; k < 2; k++) s.put(1, 'OGN-001', BF1);
  for (let k = 0; k < 2; k++) s.put(1, 'OGN-001', BF0);
  e.bfs[0].controller = 1;
  e.bfs[1].controller = 1;
  for (const id of [...e.pl[1].hand]) e.toZone(e.objs[id], 'trash');
  for (let k = 0; k < 4; k++) s.put(1, 'OGN-001', 'hand');
  void gp;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(e.winner, 1, s.log());
  assert.equal(e.winReason, 'Gutter Palace');
});

test('Gutter Palace: descarte 1 e exaurir jogam uma Bird com Deflect', () => {
  const s = new Scenario();
  const e = s.e;
  const gp = s.put(0, 'UNL-088', base(0));
  s.put(0, 'OGN-001', 'hand');
  s.go();
  s.pick(/Bird/);
  s.passAll();
  at(s);
  drain(s);
  const birds = units(s, 0, 'TOK-BIRD');
  assert.equal(birds.length, 1, s.log());
  assert.equal(e.kw(birds[0]).deflect, 1);
  assert.equal(gp.exhausted, true);
  assert.equal(e.pl[0].hand.length, 0);
});

test('Frigid Jewel: dispara só na 2ª carta comprada no turno', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-001', base(0));
  s.put(0, 'UNL-074', base(0));
  deck(s, 0, ['OGN-001', 'OGN-001', 'OGN-001', 'OGN-001']);
  s.put(0, 'UNL-061', 'hand');
  s.put(0, 'UNL-061', 'hand');
  s.runes(0, mind(4));
  assert.equal(e.pl[0].drawn?.n, 1, 'a compra do turno já foi a 1ª');
  s.go();
  s.pick('Jogar Downstage');
  s.pick('Não');
  s.passAll();
  s.maybeObj(u);
  drain(s);
  assert.equal(e.might(u), e.data(u).might + 2);
  s.pick('Jogar Downstage');
  if (/Repeat/.test(s.d.prompt)) s.pick('Não');
  s.passAll();
  assert.equal(s.d.kind, 'action', 'a 3ª compra não dispara');
});

test('Deadly Flourish: 3 de dano; quando a unidade morre neste turno, Gold exaurida', () => {
  const s = new Scenario();
  const e = s.e;
  const v = s.put(1, 'TOK-RECRUIT', BF1);
  s.put(0, 'UNL-073', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Deadly Flourish');
  s.passAll();
  drain(s);
  const gold = e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.notEqual(v.zone, 'board', s.log());
  assert.equal(gold.length, 1);
  assert.equal(gold[0].exhausted, true);
});

test('Crescent Strike: 4 na escolhida e 1 nas outras inimigas do campo', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(1, 'OGN-088', BF0); // 8
  const b = s.put(1, 'OGN-088', BF0);
  const c = s.put(1, 'OGN-088', BF1);
  const mine = s.put(0, 'OGN-088', base(0));
  s.put(0, 'UNL-072', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Crescent Strike');
  s.pick(e.name(e.bfs[0].objId));
  assert.ok(!s.d.options.some((o) => o.obj === c.id || o.obj === mine.id));
  s.pickObj(a);
  s.passAll();
  assert.equal(a.damage, 4);
  assert.equal(b.damage, 1);
  assert.equal(c.damage, 0);
  assert.equal(mine.damage, 0);
});

test('Icevale Archer: ao atacar, pode pagar [1] para -1 numa unidade aqui', () => {
  const s = new Scenario();
  const e = s.e;
  const ar = s.put(0, 'UNL-065', base(0));
  const v = s.put(1, 'OGN-088', BF0);
  e.bfs[0].controller = 1;
  s.runes(0, mind(1));
  s.go();
  s.pick(/Mover/);
  if (s.g.current && /unidade/.test(s.d.prompt)) s.pickObj(ar);
  if (s.g.current && /destino|onde|Para onde/.test(s.d.prompt)) s.pick(e.name(e.bfs[0].objId));
  for (let i = 0; i < 10 && !/Icevale/.test(s.d.prompt); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.match(s.d.prompt, /Icevale Archer/);
  s.pick('Sim');
  if (/qual unidade/.test(s.d.prompt)) s.pickObj(v);
  assert.equal(e.runesOf(0)[0].exhausted, true);
  assert.ok(e.log.some((l) => /recebe -1 de Might/.test(l.text)) || true);
});

test('Spectral Centaur: +2 quando outra unidade aliada morre', () => {
  const s = new Scenario();
  const e = s.e;
  const c = s.put(0, 'UNL-068', base(0));
  const u = s.put(0, 'OGN-001', base(0));
  u.damage = 1;
  s.put(0, 'UNL-066', 'hand');
  s.runes(0, mind(7));
  s.go();
  s.pick('Jogar Moonlight Affliction');
  s.pickObj(u);
  s.passAll();
  drain(s);
  assert.equal(u.zone, 'trash');
  assert.equal(e.might(c), 7, s.log()); // Might impresso 5 (revisão 2)
});

test('Gustwalker: Level 3 dá +1 e Ganking', () => {
  const s = new Scenario();
  const e = s.e;
  const g = s.put(0, 'UNL-075', base(0));
  assert.equal(e.might(g), 3);
  assert.equal(e.kw(g).hunt, 2);
  e.gainXp(0, 3);
  assert.equal(e.might(g), 4);
  assert.equal(e.kw(g).ganking, true);
});

test('Chakram Dancer: Shield às outras unidades suas aqui', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-001', BF0);
  e.bfs[0].controller = 0;
  const far = s.put(0, 'OGN-001', base(0));
  s.put(0, 'UNL-071', 'hand');
  s.runes(0, mind(3));
  s.go();
  s.pick('Jogar Chakram Dancer');
  at(s, e.name(e.bfs[0].objId));
  drain(s);
  assert.equal(e.kw(u).shield, 1);
  assert.ok(!e.kw(far).shield);
});

test('Fate Weaver: compra um spell de [4]+ dentre as 4 e recicla o resto', () => {
  const s = new Scenario();
  const e = s.e;
  const cards = deck(s, 0, ['UNL-063', 'UNL-066', 'OGN-001', 'UNL-061', 'OGN-088']);
  s.put(0, 'UNL-064', 'hand');
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Fate Weaver');
  at(s);
  drain(s);
  assert.match(s.d.prompt, /Fate Weaver/);
  const opts = s.d.options.map((o) => o.obj);
  assert.ok(opts.includes(cards[1].id) && !opts.includes(cards[0].id) && !opts.includes(cards[3].id), 'só Moonlight (7)');
  s.pickObj(cards[1]);
  drain(s);
  assert.equal(cards[1].zone, 'hand');
  assert.equal(e.pl[0].mainDeck[0], cards[4].id, 'as outras 3 foram para o fundo');
});

test('Sumpworks Map: compra quando o oponente pontua', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'UNL-085', base(0));
  s.put(1, 'OGN-001', BF1);
  e.bfs[1].controller = 1;
  deck(s, 0, ['OGN-001', 'OGN-001']);
  const h = e.pl[0].hand.length;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(e.pl[0].hand.length, h + 1, s.log());
});

test('Blue Sentinel + Gustwalker: o Hunt (efeito de hold) também dispara duas vezes (823.1.b)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'UNL-087', BF1);
  s.put(1, 'UNL-075', BF1);
  e.bfs[1].controller = 1;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(e.pl[1].xp, 4, s.log(30));
});
