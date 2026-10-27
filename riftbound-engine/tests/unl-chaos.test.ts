// Testes das cartas do lote "chaos" do Unleashed (UNL-121..UNL-150).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Responde a pergunta de local ("Jogar X onde?"), se houver. */
function maybe(s: Scenario, text: string) {
  if (!s.d.root && /onde\?/.test(s.d.prompt) && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
function hideAt(s: Scenario, p: P, code: string, i: number): Obj {
  const e = s.e;
  const o = e.newObj(code, p, 'setAside');
  o.zone = 'facedown';
  o.loc = { t: 'bf', i };
  o.hiddenTurn = 0;
  o.controller = p;
  e.bfs[i].facedown.push(o.id);
  if (e.bfs[i].controller === null) e.bfs[i].controller = p;
  return o;
}
/** Responde "não" a perguntas de sim/não e passa a prioridade até voltar à decisão de ação. */
function settle(s: Scenario, yes = false) {
  for (let i = 0; i < 30 && !s.d.root; i++) {
    if (s.d.kind === 'confirm') s.pick(yes ? 'Sim' : 'Não');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
}

test('Crescent Guardian: o custo [Caos] só aparece depois de jogar um spell no turno; pago, entra pronta', () => {
  const s = new Scenario();
  const e = s.e;
  const g1 = s.put(0, 'UNL-122', 'hand');
  s.runes(0, [C, C, C, C, C, C, C, C, C, C, C, C, C, C]);
  s.put(0, 'UNL-125', 'hand'); // Lunar Boon (spell)
  s.go();
  // sem spell no turno: não pergunta
  s.pick('Jogar Crescent Guardian');
  maybe(s, 'base');
  assert.ok(!/Caos/.test(s.d.prompt), s.d.prompt);
  assert.equal(g1.zone, 'board');
  assert.equal(g1.exhausted, true);
  s.pick('Jogar Lunar Boon');
  settle(s);
  const g2 = s.put(0, 'UNL-122', 'hand');
  s.go();
  s.pick('Jogar Crescent Guardian');
  maybe(s, 'base');
  assert.match(s.d.prompt, /Caos/);
  s.pick('Sim');
  settle(s);
  const g = [g2, ...e.units().filter((u) => u.code === 'UNL-122')].find((u) => u.zone === 'board' && u.id !== g1.id)!;
  assert.equal(g.exhausted, false, s.log(20));
});

test('Isolate: move a inimiga para a base; compra só se sobrar uma inimiga sozinha lá', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(1, 'OGN-175', BF0);
  const b = s.put(1, 'OGN-175', BF0);
  s.put(0, 'UNL-124', 'hand');
  s.put(0, 'UNL-124', 'hand');
  s.runes(0, [C, C, C, C]);
  s.go();
  const hand = e.pl[0].hand.length;
  s.pick('Jogar Isolate');
  s.pickObj(a);
  settle(s);
  assert.deepEqual(a.loc, base(1));
  assert.equal(e.pl[0].hand.length, hand - 1 + 1, 'sobrou uma sozinha: compra 1');
  s.pick('Jogar Isolate');
  s.maybeObj(b);
  settle(s);
  assert.deepEqual(b.loc, base(1));
  assert.equal(e.pl[0].hand.length, hand - 1, 'ninguém sobrou: não compra');
});

test('Megatusk: gastar 3 XP dá Ganking às suas unidades aqui; sem 3 XP a habilidade não aparece', () => {
  const s = new Scenario();
  const e = s.e;
  const m = s.put(0, 'UNL-126', BF0);
  const r = s.put(0, 'OGN-175', BF0);
  const other = s.put(0, 'OGN-175', base(0));
  e.pl[0].xp = 2;
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Gastar 3 XP')));
  e.pl[0].xp = 4;
  s.go();
  s.pick('Gastar 3 XP');
  settle(s);
  assert.equal(e.pl[0].xp, 1);
  assert.ok(e.kw(m).ganking && e.kw(r).ganking);
  assert.ok(!e.kw(other).ganking);
});

test('Mister Root: mover-se para um campo dá 2 XP', () => {
  const s = new Scenario();
  const e = s.e;
  const m = s.put(0, 'UNL-127', base(0));
  s.go();
  moveTo(s, [m.id], 'Campo Vazio A');
  settle(s);
  assert.equal(e.pl[0].xp, 2, s.log(20));
});

test('Star-Crossed: devolve uma aliada e uma inimiga para a mão', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-175', base(0));
  const b = s.put(1, 'OGN-175', base(1));
  s.put(0, 'UNL-128', 'hand');
  s.runes(0, [C, C, C, C]);
  s.go();
  s.pick('Jogar Star-Crossed');
  s.maybeObj(a);
  s.maybeObj(b);
  settle(s);
  assert.equal(a.zone, 'hand');
  assert.equal(b.zone, 'hand');
  assert.ok(e.pl[1].hand.includes(b.id));
});

test('Vicious Snapjaws: aliada morre dá 1 XP; morrendo junto, não', () => {
  const s = new Scenario();
  const e = s.e;
  const sn = s.put(0, 'UNL-129', base(0));
  const a = s.put(0, 'OGN-175', base(0));
  const mover = s.put(0, 'OGN-175', base(0));
  const mover2 = s.put(0, 'OGN-175', base(0));
  a.damage = 9; // morre na limpeza depois da próxima ação
  s.go();
  moveTo(s, [mover.id], 'Campo Vazio A');
  settle(s);
  assert.equal(a.zone, 'trash');
  assert.equal(e.pl[0].xp, 1, s.log(20));
  const b = s.put(0, 'OGN-175', base(0));
  b.damage = 9;
  sn.damage = 9;
  s.go();
  moveTo(s, [mover2.id], 'Campo Vazio B');
  settle(s);
  assert.equal(sn.zone, 'trash');
  assert.equal(e.pl[0].xp, 1, 'morreu junto: não dispara (383.2.c.2)');
});

test('Walking Roost: o oponente joga uma ficha Bird com Deflect', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'UNL-130', 'hand');
  s.runes(0, [C, C, C, C, C]);
  s.go();
  s.pick('Jogar Walking Roost');
  maybe(s, 'base');
  settle(s);
  const birds = e.units().filter((u) => u.code === 'TOK-BIRD');
  assert.equal(birds.length, 1, s.log(20));
  assert.equal(birds[0].controller, 1);
  assert.equal(e.kw(birds[0]).deflect, 1);
});

test('Abandon: anula o spell, devolve para a mão do dono e faz Predict; o spell anulado não resolve', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-175', BF0);
  const gust = s.put(0, 'OGN-169', 'hand');
  s.runes(0, [C]);
  const ab = s.put(1, 'UNL-131', 'hand');
  s.runes(1, [C, C]);
  s.go();
  s.pick('Jogar Gust');
  s.maybeObj(u);
  // prioridade do oponente
  assert.equal(s.d.player, 1);
  s.pick('Jogar Abandon');
  s.maybeObj(gust);
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/Predict/.test(s.d.prompt)) s.ok([]);
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(gust.zone, 'hand');
  assert.ok(e.pl[0].hand.includes(gust.id));
  assert.equal(u.zone, 'board', 'Gust não resolveu');
  assert.equal(ab.zone, 'trash');
  assert.match(s.log(20), /Predict/);
});

test('Angler Beast: devolve todas as unidades com 2 de Might ou menos', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'TOK-RECRUIT', base(0));
  a.token = true;
  const b = s.put(1, 'OGN-136', BF0);
  const c = s.put(1, 'OGN-175', BF0);
  s.put(0, 'UNL-132', 'hand');
  s.runes(0, [C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Angler Beast');
  maybe(s, 'base');
  settle(s);
  assert.equal(a.zone, 'gone');
  assert.equal(b.zone, 'hand');
  assert.equal(c.zone, 'board');
  assert.equal(e.units().filter((u) => u.code === 'UNL-132').length, 1);
});

test('Blast Cone: ao jogar move uma inimiga; ao mover, pode exaurir para atordoá-la', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-175', BF0);
  const cone = s.put(0, 'UNL-133', 'hand');
  s.runes(0, [C, C, C, C, C]);
  s.go();
  s.pick('Jogar Blast Cone');
  assert.match(s.d.prompt, /Mover uma unidade inimiga/);
  s.pick('Sim');
  s.maybeObj(u);
  s.pick(`base de B`);
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/Exaurir Blast Cone/.test(s.d.prompt)) s.pick('Sim');
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.deepEqual(u.loc, base(1));
  assert.equal(u.stunned, true, s.log(20));
  assert.equal(cone.exhausted, true);
});

test('Existential Dread: com Repeat na mesma atacante, atordoa e depois devolve para a mão', () => {
  const s = new Scenario();
  const e = s.e;
  const att = s.put(0, 'OGN-175', base(0));
  s.put(1, 'OGN-175', BF0);
  s.put(1, 'UNL-134', 'hand');
  s.runes(1, [C, C, C, C]);
  s.go();
  moveTo(s, [att.id], 'Campo Vazio A');
  for (let i = 0; i < 20 && att.zone === 'board'; i++) {
    const d = s.d;
    if (d.player === 1 && d.options.some((o) => o.label.includes('Jogar Existential Dread'))) {
      s.pick('Jogar Existential Dread');
      s.maybeObj(att);
      if (/Repeat/.test(s.d.prompt)) s.pick('Sim');
      s.maybeObj(att);
    } else if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else s.ok([d.options[0].id]);
  }
  assert.equal(att.zone, 'hand', s.log(30));
  assert.match(s.log(30), /atordoada/);
});

test('Insightful Investigator: paga 2 XP, escolhe a carta; o oponente a descarta e compra 1', () => {
  const s = new Scenario();
  const e = s.e;
  const x = s.put(1, 'OGN-142', 'hand');
  s.put(1, 'OGN-175', 'hand');
  e.pl[0].xp = 3;
  s.put(0, 'UNL-135', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  const h1 = e.pl[1].hand.length;
  s.pick('Jogar Insightful Investigator');
  maybe(s, 'base');
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/pagar 2 XP/.test(s.d.prompt)) s.pick('Sim');
    else if (/descarta qual/.test(s.d.prompt)) s.pickObj(x);
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(x.zone, 'trash');
  assert.equal(e.pl[1].hand.length, h1);
  assert.equal(e.pl[0].xp, 1);
  assert.match(s.log(20), /revela a mão/);
});

test("Scryer's Bloom: entra exaurido; matar, [1], exaurir: Predict 2, compra 1 e ganha 1 XP", () => {
  const s = new Scenario();
  const e = s.e;
  const sb = s.put(0, 'UNL-136', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick("Jogar Scryer's Bloom");
  settle(s);
  assert.equal(sb.zone, 'board');
  assert.equal(sb.exhausted, true);
  sb.exhausted = false;
  s.go();
  const h = e.pl[0].hand.length;
  s.pick('Predict 2');
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/Predict/.test(s.d.prompt)) s.ok([]);
    else if (/Topo do deck/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(sb.zone, 'trash');
  assert.equal(e.pl[0].hand.length, h + 1);
  assert.equal(e.pl[0].xp, 1);
});

test('Sinister Poro: ao atacar, pagar [1] move uma inimiga dali para a base dela', () => {
  const s = new Scenario();
  const e = s.e;
  const poro = s.put(0, 'UNL-137', base(0));
  const en = s.put(1, 'OGN-175', BF0);
  s.runes(0, [C]);
  s.go();
  moveTo(s, [poro.id], 'Campo Vazio A');
  for (let i = 0; i < 20 && !s.d.root; i++) {
    if (/Pagar \[1\] para mover/.test(s.d.prompt)) s.pick('Sim');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.deepEqual(en.loc, base(1), s.log(30));
  assert.equal(e.bfs[0].controller, 0, 'sem defensor: conquista');
});

test('The List: nomeia uma tag ao ser jogada; [Tap] dá -2 de Might só a unidades com a tag', () => {
  const s = new Scenario();
  const e = s.e;
  const pir = s.put(1, 'OGN-175', BF0); // Bilgewater/Pirate
  const drake = s.put(1, 'OGN-142', BF0); // Dragon
  const list = s.put(0, 'UNL-138', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar The List');
  assert.match(s.d.prompt, /nomeie uma tag/);
  assert.ok(s.d.options.some((o) => o.label === 'Miss Fortune'));
  s.pick('Pirate');
  settle(s);
  assert.equal(list.zone, 'board');
  s.pick('-2 de Might');
  assert.ok(!s.d.options.some((o) => o.obj === drake.id), 'Dragon não tem a tag');
  s.maybeObj(pir);
  settle(s);
  assert.equal(e.might(pir), 1);
  assert.equal(list.exhausted, true);
});

test('Bone Skewer: o oponente revela a mão e joga a unidade escolhida no campo, de graça; depois ela é atordoada', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-175', BF0);
  const drake = s.put(1, 'OGN-142', 'hand');
  s.put(0, 'UNL-139', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Bone Skewer');
  s.pick('Campo Vazio B');
  for (let i = 0; i < 20 && !s.d.root; i++) {
    if (/Bone Skewer: escolha uma unidade/.test(s.d.prompt)) s.pickObj(drake);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.kind === 'confirm') s.pick('Não');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(drake.zone, 'board', s.log(30));
  assert.deepEqual(drake.loc, BF1);
  assert.equal(drake.controller, 1);
  assert.equal(drake.stunned, true);
  assert.equal(e.runesOf(1).length, 0, 'sem pagar nada');
  assert.match(s.log(40), /revela a mão/);
});

test('Conscription: sem o custo, só inimiga com 3 de Might ou menos; com 5 XP, qualquer uma; toma, exaure e chama de volta', () => {
  const s = new Scenario();
  const e = s.e;
  const small = s.put(1, 'OGN-175', BF0);
  const big = s.put(1, 'OGN-142', BF1);
  s.put(0, 'UNL-140', 'hand');
  s.put(0, 'UNL-140', 'hand');
  s.runes(0, Array(14).fill(C));
  s.go();
  s.pick('Jogar Conscription');
  assert.ok(!s.d.options.some((o) => o.obj === big.id));
  s.maybeObj(small);
  settle(s);
  assert.equal(small.controller, 0);
  assert.deepEqual(small.loc, base(0));
  assert.equal(small.exhausted, true);
  e.pl[0].xp = 5;
  s.go();
  s.pick('Jogar Conscription');
  assert.match(s.d.prompt, /5 XP/);
  s.pick('Sim');
  s.maybeObj(big);
  settle(s);
  assert.equal(big.controller, 0, s.log(20));
  assert.deepEqual(big.loc, base(0));
  assert.equal(e.pl[0].xp, 0);
});

test('Evelynn, Entrancing: jogada escondida no seu turno puxa uma inimiga de outro local para o campo dela', () => {
  const s = new Scenario();
  const e = s.e;
  const ev = hideAt(s, 0, 'UNL-141', 0);
  const far = s.put(1, 'TOK-RECRUIT', base(1));
  s.go();
  s.pick('Jogar Evelynn, Entrancing (escondida');
  assert.match(s.d.prompt, /Mover uma unidade inimiga/);
  s.pick('Sim');
  s.maybeObj(far);
  for (let i = 0; i < 20 && !s.d.root; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(ev.zone, 'board');
  assert.match(s.log(40), /Recruit → Campo Vazio A/);
  assert.notEqual(far.zone, 'board', 'puxada para o combate com a Evelynn, morre');
  assert.equal(e.kw(ev).backline, true);
});

test('Heedless Resurrection: mata uma aliada como custo e joga do descarte uma unidade que custe no máximo o mesmo, de graça', () => {
  const s = new Scenario();
  const e = s.e;
  const victim = s.put(0, 'OGN-175', base(0)); // custo 3
  const cheap = s.put(0, 'OGN-136', 'trash'); // custo 2
  const pricey = s.put(0, 'OGN-142', 'trash'); // custo 9
  s.put(0, 'UNL-142', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Heedless Resurrection');
  assert.ok(!s.d.options.some((o) => o.obj === pricey.id), 'nenhuma aliada cobre o custo 9 (355.16)');
  assert.ok(!s.d.options.some((o) => o.obj === victim.id));
  s.maybeObj(cheap);
  for (let i = 0; i < 20 && !s.d.root; i++) {
    if (/onde\?/.test(s.d.prompt)) s.pick('base');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(victim.zone, 'trash');
  assert.equal(cheap.zone, 'board', s.log(30));
  assert.equal(e.runesOf(0).length, 2, 'só o custo do spell: 2 exauridas e 1 reciclada');
});

test("Kha'Zix, Mutating Horror: ao atacar uma inimiga sozinha, +2 de Might e 2 XP; contra duas, nada", () => {
  const s = new Scenario();
  const e = s.e;
  const k = s.put(0, 'UNL-143', base(0));
  s.put(1, 'OGN-142', BF0);
  s.go();
  moveTo(s, [k.id], 'Campo Vazio A');
  for (let i = 0; i < 6 && !s.d.root && e.pl[0].xp === 0; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(e.pl[0].xp, 2, s.log(30));
  const s2 = new Scenario();
  const k2 = s2.put(0, 'UNL-143', base(0));
  s2.put(1, 'OGN-142', BF0);
  s2.put(1, 'OGN-175', BF0);
  s2.go();
  moveTo(s2, [k2.id], 'Campo Vazio A');
  settle(s2);
  assert.equal(s2.e.pl[0].xp, 0);
});

test('Maduli: [Caos] o move para um campo inimigo ocupado se o Might dele for maior; efeitos não o preparam', () => {
  const s = new Scenario();
  const e = s.e;
  const m = s.put(0, 'UNL-144', base(0), { ready: false });
  s.put(1, 'OGN-175', BF0); // 3
  s.runes(0, [C, C]);
  s.go();
  s.pick('mover-me para um campo inimigo');
  if (!s.d.root && /qual campo/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  for (let i = 0; i < 4 && s.d.kind === 'priority'; i++) s.pick('Passar');
  assert.deepEqual(m.loc, BF0, s.log(20));
  e.ready(m);
  assert.equal(m.exhausted, true, 'efeitos não a preparam');
});

test('Maduli: o despertar não a prepara', () => {
  const s = new Scenario();
  const e = s.e;
  const m = s.put(1, 'UNL-144', base(1), { ready: false });
  s.go();
  s.pick('Encerrar o turno');
  settle(s);
  assert.equal(e.active, 1);
  assert.equal(m.exhausted, true);
});

test('Pyke, Returned: uma vez por turno, inimiga morre com ele num campo: Gold exaurido', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'UNL-145', BF0);
  const a = s.put(1, 'OGN-175', BF1);
  const b = s.put(1, 'OGN-175', BF1);
  const m1 = s.put(0, 'OGN-175', base(0));
  const m2 = s.put(0, 'OGN-175', base(0));
  a.damage = 9;
  s.go();
  moveTo(s, [m1.id], 'Campo Vazio A');
  settle(s);
  const gold = () => e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.equal(gold().length, 1, s.log(20));
  assert.equal(gold()[0].exhausted, true);
  b.damage = 9;
  s.go();
  moveTo(s, [m2.id], 'Campo Vazio A');
  settle(s);
  assert.equal(b.zone, 'trash');
  assert.equal(gold().length, 1, 'só uma vez por turno');
});

test('Syndra, Transcendent: num showdown, seus spells têm Repeat [2][Caos]; fora dele, não', () => {
  const s = new Scenario();
  const e = s.e;
  const sy = s.put(0, 'UNL-146', base(0));
  const lb = s.put(0, 'UNL-125', 'hand');
  s.runes(0, Array(12).fill(C));
  s.go();
  assert.deepEqual(e.repeatCostsFor(0, lb), []);
  s.put(1, 'OGN-175', BF0);
  moveTo(s, [sy.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !(s.d.player === 0 && s.d.options.some((o) => o.label.includes('Jogar Lunar Boon'))); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  s.pick('Jogar Lunar Boon');
  assert.match(s.d.prompt, /Repeat \(2 \+ \[Chaos\]\)/);
});

test('Baron Nashor: cria o Baron Pit e entra lá; outras aliadas +2; dá para mover de outro campo para o Pit', () => {
  const s = new Scenario();
  const e = s.e;
  const ally = s.put(0, 'OGN-175', BF0);
  s.put(0, 'UNL-147', 'hand');
  s.runes(0, Array(13).fill(C));
  s.go();
  s.pick('Jogar Baron Nashor');
  maybe(s, 'base');
  settle(s);
  assert.equal(e.bfs.length, 3);
  const baron = e.units().find((u) => u.code === 'UNL-147')!;
  assert.deepEqual(baron.loc, { t: 'bf', i: 2 }, s.log(20));
  assert.equal(e.name(e.bfs[2].objId), 'Baron Pit');
  assert.equal(e.might(ally), 5);
  assert.equal(e.might(baron), 12);
  assert.ok(e.moveDests([ally]).some((l) => l.t === 'bf' && l.i === 2), 'do Campo A para o Pit sem Ganking');
  assert.ok(!e.moveDests([ally]).some((l) => l.t === 'bf' && l.i === 1));
  assert.ok(e.untargetableBy(baron, 1));
});

test('Cursed Sarcophagus: bane as unidades do seu descarte; [Tap] joga uma delas pagando o custo', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-136', 'trash');
  const other = s.put(1, 'OGN-175', 'trash');
  s.put(0, 'UNL-148', 'hand');
  s.runes(0, Array(7).fill(C));
  s.go();
  s.pick('Jogar Cursed Sarcophagus');
  settle(s);
  assert.equal(u.zone, 'banish');
  assert.equal(other.zone, 'trash');
  s.pick('jogar uma unidade banida');
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (/onde\?/.test(s.d.prompt)) s.pick('base');
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(u.zone, 'board', s.log(20));
});

test('Diana, No Longer Human: +2 de Might quando você joga um spell', () => {
  const s = new Scenario();
  const e = s.e;
  const d = s.put(0, 'UNL-149', base(0));
  s.put(0, 'UNL-125', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Lunar Boon');
  settle(s);
  assert.equal(e.might(d), 5);
});

test('Vex, Apathetic: a unidade jogada pelo oponente é atordoada e ele não pode movê-la neste turno (nem por efeito)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'UNL-150', BF1);
  const u = s.put(0, 'OGN-175', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Shipyard Skulker');
  maybe(s, 'base');
  settle(s);
  assert.equal(u.stunned, true);
  u.exhausted = false;
  assert.ok(!e.movableUnits(0).includes(u));
  e.moveUnits([u], BF0, 0);
  assert.deepEqual(u.loc, base(0), 'nem por efeito do oponente');
  e.moveUnits([u], BF0, 1);
  assert.deepEqual(u.loc, BF0, 'a Vex só proíbe quem jogou');
});

test('Bewitching Spirit: o jogador escolhido descarta 1', () => {
  const s = new Scenario();
  const x = s.put(1, 'OGN-142', 'hand');
  s.put(0, 'UNL-121', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Bewitching Spirit');
  maybe(s, 'base');
  s.pick('B');
  settle(s);
  assert.equal(x.zone, 'trash');
});

test('Asplayed (355.1): Ivern jogado pelo Bone Skewer (ignorando todos os custos) ainda escolhe a tag', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-175', BF0);
  const ivern = s.put(1, 'UNL-177', 'hand');
  s.put(0, 'UNL-139', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Bone Skewer');
  s.pick('Campo Vazio B');
  let asked = false;
  for (let i = 0; i < 20 && !s.d.root; i++) {
    if (/Bone Skewer: escolha uma unidade/.test(s.d.prompt)) s.pickObj(ivern);
    else if (/qual tag ele ganha/.test(s.d.prompt)) {
      asked = true;
      s.pick('Poro');
    } else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.kind === 'confirm') s.pick('Não');
    else s.ok([s.d.options[0].id]);
  }
  assert.ok(asked, 'a escolha "ao jogar" aconteceu mesmo sem custos');
  assert.equal(ivern.zone, 'board', s.log(30));
  assert.ok(e.hasTag(ivern, 'Poro'));
});
