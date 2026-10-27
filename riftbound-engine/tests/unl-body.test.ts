// Testes de cenário das cartas do lote "body" do Unleashed (UNL-091..UNL-120). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const B = RUNE.body;
const A = 'Campo Vazio A';

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function maybe(s: Scenario, text: string) {
  if (s.g.current && !s.d.root && /onde|para qual|para onde/.test(s.d.prompt) && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
/** Passa pilha/showdown e distribui dano pela 1ª opção; `on` responde perguntas pelo trecho do enunciado. */
function drive(s: Scenario, on: Record<string, string> = {}, max = 40) {
  for (let i = 0; i < max && s.g.current && !s.d.root; i++) {
    const k = Object.keys(on).find((x) => s.d.prompt.includes(x));
    if (k) s.pick(on[k]);
    else if (s.d.prompt.startsWith('Distribuir dano') || s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
  for (let i = 0; i < max && s.g.current; i++) {
    const k = Object.keys(on).find((x) => s.d.prompt.includes(x));
    if (k && !s.d.root) s.pick(on[k]);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Distribuir dano') || s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  drive(s);
}
const logHas = (s: Scenario, t: string | RegExp) => s.e.log.some((l) => (typeof t === 'string' ? l.text.includes(t) : t.test(l.text)));

test('Concentrate: custa [2] a menos com 6+ XP e [4] a menos com 11+ (não somam)', () => {
  for (const [xp, runes] of [
    [0, 5],
    [6, 3],
    [11, 1],
  ] as const) {
    const s = new Scenario();
    s.e.pl[0].xp = xp;
    s.put(0, 'UNL-091', 'hand');
    s.runes(0, Array(runes).fill(B));
    s.go();
    const h = s.e.pl[0].hand.length;
    s.pick('Jogar Concentrate');
    drive(s);
    assert.equal(s.e.pl[0].hand.length, h - 1 + 2, `XP ${xp}`);
    assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, runes, `XP ${xp}`);
  }
  // com 6 XP e só 2 runas não dá para jogar
  const s = new Scenario();
  s.e.pl[0].xp = 6;
  s.put(0, 'UNL-091', 'hand');
  s.runes(0, [B, B]);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Concentrate')));
});

test('Demacian Diplomat ganha 1 XP; Kinkou Initiate compra só com 5+ de Might nas outras unidades', () => {
  const s = new Scenario();
  s.put(0, 'UNL-092', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Demacian Diplomat');
  maybe(s, 'base de A');
  drive(s);
  assert.equal(s.e.pl[0].xp, 1);
  for (const big of [false, true]) {
    const t = new Scenario();
    t.put(0, big ? 'OGN-142' : 'OGN-136', base(0));
    t.put(0, 'UNL-097', 'hand');
    t.runes(0, [B, B, B]);
    t.go();
    const h = t.e.pl[0].hand.length;
    t.pick('Jogar Kinkou Initiate');
    maybe(t, 'base de A');
    drive(t);
    assert.equal(t.e.pl[0].hand.length, h - 1 + (big ? 1 : 0), `big=${big}`);
  }
});

test('Gemhand Hunter e Targonian Visionary: Level pelo XP do controlador; Hunt ao conquistar', () => {
  const s = new Scenario();
  const gh = s.put(0, 'UNL-094', base(0));
  const tv = s.put(0, 'UNL-098', base(0));
  assert.equal(s.e.might(gh), 2);
  s.e.pl[0].xp = 6;
  assert.equal(s.e.might(gh), 3);
  assert.equal(s.e.might(tv), 6);
  s.e.pl[0].xp = 11;
  assert.equal(s.e.might(tv), 10);
  s.e.pl[0].xp = 0;
  s.go();
  moveTo(s, [gh.id], A);
  drive(s);
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.pl[0].xp, 1, s.log(10));
});

test("Hunter's Machete: a unidade equipada ganha Hunt e +2 de Might", () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', base(0));
  const m = s.put(0, 'UNL-096', base(0));
  s.e.attach(m, u);
  assert.equal(s.e.might(u), 4);
  assert.equal(s.e.kw(u).hunt, 1);
  s.go();
  moveTo(s, [u.id], A);
  drive(s);
  assert.equal(s.e.pl[0].xp, 1, s.log(10));
});

test('Grim Resolve: +3 neste turno; ganhar 2 XP quando ela vence um combate', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', base(0)); // 2
  s.put(1, 'OGN-136', BF0); // 2
  s.put(0, 'UNL-095', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Grim Resolve');
  s.maybeObj(u);
  drive(s);
  assert.equal(s.e.might(u), 5);
  assert.equal(s.e.pl[0].xp, 0);
  moveTo(s, [u.id], A);
  drive(s);
  assert.equal(s.e.bfs[0].controller, 0, s.log(15));
  assert.equal(s.e.pl[0].xp, 2, s.log(15));
});

test('Call to Battle: minha unidade vai para um campo meu; o oponente escolhe uma unidade dele para ir junto', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-136', base(0));
  s.put(0, 'OGN-136', BF0); // controlo o campo A
  const foe1 = s.put(1, 'OGN-136', base(1));
  const foe2 = s.put(1, 'OGN-142', base(1));
  s.put(0, 'UNL-101', 'hand');
  s.runes(0, [B, B, B]);
  s.go();
  s.pick('Jogar Call to Battle');
  // a unidade que já está no campo A (o único campo meu) não pode ser escolhida: a da base é escolhida sozinha, e o
  // destino também; ninguém tem resposta e o oponente escolhe a unidade dele na resolução
  assert.equal(s.d.player, 1, s.d.prompt);
  assert.ok(s.d.prompt.includes('Call to Battle'));
  s.pickObj(foe2);
  assert.deepEqual(mine.loc, BF0);
  assert.deepEqual(foe2.loc, BF0);
  assert.deepEqual(foe1.loc, base(1));
});

test('Crowd Favorite: gastar 2 XP dá Buff; sem XP não aparece', () => {
  const s = new Scenario();
  const cf = s.put(0, 'UNL-102', base(0));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Gastar 2 XP')));
  s.e.pl[0].xp = 3;
  s.go();
  s.pick('Gastar 2 XP');
  drive(s);
  assert.equal(cf.buffs, 1);
  assert.equal(s.e.pl[0].xp, 1);
});

test('Disposal Order: recicla até 3 cartas do descarte do oponente, ou compra 1', () => {
  const s = new Scenario();
  const t1 = s.put(1, 'OGN-136', 'trash');
  const t2 = s.put(1, 'OGN-142', 'trash');
  s.put(0, 'OGN-136', 'trash');
  s.put(0, 'UNL-103', 'hand');
  s.put(0, 'UNL-103', 'hand');
  s.runes(0, [B, B, B, B]);
  s.go();
  s.pick('Jogar Disposal Order');
  s.pick('Escolher até 3');
  assert.ok(s.d.options.every((o) => s.e.objs[o.id].owner === 1), 'só descarte do oponente');
  s.ok([t1.id, t2.id]);
  drive(s);
  assert.equal(t1.zone, 'mainDeck');
  assert.equal(t2.zone, 'mainDeck');
  assert.equal(s.e.pl[1].mainDeck.slice(-2).sort().join(), [t1.id, t2.id].sort().join(), 'fundo do deck do dono');
  const h = s.e.pl[0].hand.length;
  s.pick('Jogar Disposal Order');
  s.pick('Comprar 1');
  drive(s);
  assert.equal(s.e.pl[0].hand.length, h - 1 + 1);
});

test('Gentle Gemdragon: ao entrar, prepara até 2 runas (as usadas para pagar); outro Dragon também dispara', () => {
  const s = new Scenario();
  s.put(0, 'UNL-104', 'hand');
  s.runes(0, Array(8).fill(B));
  s.go();
  s.pick('Jogar Gentle Gemdragon');
  maybe(s, 'base de A');
  const ex = s.e.runesOf(0).filter((r) => r.exhausted);
  assert.equal(ex.length, 8);
  assert.match(s.d.prompt, /preparar quais runas/);
  s.ok([ex[0].id, ex[1].id]);
  drive(s);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 6);
  // outro Dragon (Elder Dragon tem a tag) jogado depois também dispara
  const t = new Scenario();
  t.put(0, 'UNL-104', base(0));
  t.put(0, 'UNL-118', 'hand');
  t.runes(0, Array(16).fill(B));
  t.go();
  t.pick('Jogar Elder Dragon');
  maybe(t, 'base de A');
  drive(t, { 'preparar quais runas': 'Body' }); // escolhe uma runa
  assert.ok(logHas(t, 'prepara 1 runa'), t.log(15));
});

test('Imposing Challenger: ao se mover, pode mover uma inimiga aqui com menos Might para outro campo', () => {
  const s = new Scenario();
  const ic = s.put(0, 'UNL-105', base(0)); // 5
  const small = s.put(1, 'OGN-136', BF0); // 2
  const big = s.put(1, 'OGN-142', BF0); // 10
  s.go();
  moveTo(s, [ic.id], A);
  assert.match(s.d.prompt, /Imposing Challenger/);
  s.pick('Sim');
  assert.ok(!s.d.options.some((o) => o.obj === big.id), 'a de Might maior não é opção');
  s.maybeObj(small);
  maybe(s, 'Campo Vazio B');
  drive(s);
  assert.deepEqual(small.loc, BF1, s.log(15));
});

test('Repulse: anula o spell inimigo que escolhe só a minha unidade; não se escolhe outra aliada também', () => {
  // A joga Challenge (uma aliada dele + uma unidade de B): B responde com Repulse escolhendo a unidade dele
  {
    const s = new Scenario();
    const a = s.put(0, 'OGN-142', BF1);
    const b = s.put(1, 'OGN-136', BF0);
    s.put(0, 'OGN-128', 'hand');
    s.runes(0, [B, B, B]);
    s.put(1, 'UNL-106', 'hand');
    s.runes(1, [B, B]);
    s.go();
    s.pick('Jogar Challenge');
    s.maybeObj(a);
    s.maybeObj(b);
    assert.equal(s.d.player, 1); // A não tem resposta: a prioridade passa sozinha
    s.pick('Jogar Repulse');
    s.maybeObj(b);
    drive(s);
    assert.equal(b.zone, 'board', s.log(15));
    assert.equal(b.damage, 0);
    assert.ok(logHas(s, 'Challenge foi anulado'), s.log(15));
  }
  // A joga Clash of Giants escolhendo duas unidades de B: Repulse não tem alvo (escolhe outra aliada também)
  {
    const s = new Scenario();
    const b1 = s.put(1, 'OGN-136', BF0);
    const b2 = s.put(1, 'OGN-142', BF0);
    s.put(0, 'UNL-110', 'hand');
    s.runes(0, Array(8).fill(B));
    s.put(1, 'UNL-106', 'hand');
    s.runes(1, [B, B]);
    s.go();
    s.pick('Jogar Clash of Giants');
    s.pickObj(b1);
    s.maybeObj(b2);
    assert.ok(!(s.d.player === 1 && s.d.options.some((o) => o.label.includes('Repulse'))), 'Repulse não pode ser jogada');
    drive(s);
    assert.equal(b1.zone, 'trash', s.log(15));
    assert.equal(b2.damage, 2);
  }
});

test('Stare Down: move para a base as inimigas com menos Might que a escolhida e ganha 1 XP', () => {
  const s = new Scenario();
  const mine = s.put(0, 'UNL-105', base(0)); // 5
  const small = s.put(1, 'OGN-136', BF0); // 2
  const big = s.put(1, 'OGN-142', BF0); // 10
  s.put(0, 'UNL-107', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Jogar Stare Down');
  s.maybeObj(mine);
  s.pick(A);
  drive(s);
  assert.deepEqual(small.loc, base(1));
  assert.deepEqual(big.loc, BF0);
  assert.equal(s.e.pl[0].xp, 1);
});

test('Wily Newtfish: depois de ganhar XP neste turno tem +1 e Ganking', () => {
  const s = new Scenario();
  const n = s.put(0, 'UNL-108', BF0);
  s.put(0, 'UNL-092', 'hand');
  s.runes(0, [B, B]);
  s.go();
  assert.equal(s.e.might(n), 4);
  assert.ok(!s.e.kw(n).ganking);
  s.pick('Jogar Demacian Diplomat');
  maybe(s, 'base de A');
  drive(s);
  assert.equal(s.e.might(n), 5);
  assert.ok(s.e.kw(n).ganking);
  endTurn(s);
  assert.equal(s.e.might(n), 4, 'no turno seguinte não vale mais');
});

test('Blood Rose: pagar [1] ao jogar unidade dá 1 XP; gastar 3 XP e exaurir prepara uma unidade', () => {
  const s = new Scenario();
  s.put(0, 'UNL-109', base(0));
  const ex = s.put(0, 'OGN-142', base(0), { ready: false });
  s.put(0, 'OGN-136', 'hand');
  s.runes(0, [B, B, B]);
  s.go();
  s.pick('Jogar Pit Rookie');
  maybe(s, 'base de A');
  drive(s, { 'Pagar [1] para ganhar 1 XP': 'Sim' });
  assert.equal(s.e.pl[0].xp, 1);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 3);
  assert.ok(!s.d.options.some((o) => o.label.includes('Gastar 3 XP')));
  s.e.pl[0].xp = 3;
  s.go();
  s.pick('Gastar 3 XP');
  s.pickObj(ex);
  drive(s);
  assert.equal(ex.exhausted, false);
  assert.equal(s.e.pl[0].xp, 0);
});

test('Clash of Giants: duas unidades quaisquer causam dano igual ao Might uma à outra', () => {
  const s = new Scenario();
  const a = s.put(1, 'OGN-136', BF0);
  const b = s.put(1, 'UNL-105', BF1);
  s.put(0, 'UNL-110', 'hand');
  s.runes(0, Array(8).fill(B));
  s.go();
  s.pick('Jogar Clash of Giants');
  s.pickObj(a);
  s.maybeObj(b);
  drive(s);
  assert.equal(a.zone, 'trash');
  assert.equal(b.damage, 2);
});

test('Determined Sentry não pode se mover para a base', () => {
  const s = new Scenario();
  const d = s.put(0, 'UNL-111', BF0);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label === 'Mover unidades'), 'sem destino possível');
  s.e.moveUnits([d], base(0), 0);
  assert.deepEqual(d.loc, BF0);
});

test('Irresistible Faefolk: ao ir para um campo, puxa uma unidade inimiga; eu sou o atacante', () => {
  const s = new Scenario();
  const f = s.put(0, 'UNL-112', base(0));
  const foe = s.put(1, 'OGN-136', base(1));
  s.go();
  moveTo(s, [f.id], A);
  s.pick('Sim');
  s.maybeObj(foe);
  drive(s);
  assert.ok(logHas(s, 'Pit Rookie → Campo Vazio A'), s.log(15));
  assert.ok(logHas(s, 'Combate em Campo Vazio A: A ataca'), s.log(15));
});

test('Master Yi, Tempered: Level 6 dá Deflect e Ganking', () => {
  const s = new Scenario();
  const y = s.put(0, 'UNL-113', BF0);
  assert.ok(!s.e.kw(y).deflect && !s.e.kw(y).ganking);
  assert.equal(s.e.kw(y).hunt, 2);
  s.e.pl[0].xp = 6;
  assert.equal(s.e.kw(y).deflect, 1);
  assert.ok(s.e.kw(y).ganking);
});

test('Nidalee, Cat Form: compra ao vencer o combate', () => {
  const s = new Scenario();
  const n = s.put(0, 'UNL-114', base(0)); // 4
  s.put(1, 'OGN-136', BF0);
  s.go();
  const h = s.e.pl[0].hand.length;
  moveTo(s, [n.id], A);
  drive(s);
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.pl[0].hand.length, h + 1, s.log(15));
});

test('Nilah: ganha 1 XP a cada movimento; tem Ganking', () => {
  const s = new Scenario();
  const n = s.put(0, 'UNL-115', base(0));
  s.go();
  moveTo(s, [n.id], A);
  drive(s);
  assert.equal(s.e.pl[0].xp, 1, s.log(10));
  n.exhausted = false;
  s.go();
  moveTo(s, [n.id], 'Campo Vazio B');
  drive(s);
  assert.equal(s.e.pl[0].xp, 2);
});

test('Poppy, Paragon: oponente a 3 pontos da vitória → entra pronta e ganha 3 XP; senão, nada', () => {
  for (const pts of [4, 5]) {
    const s = new Scenario();
    s.e.pl[1].points = pts;
    const p = s.put(0, 'UNL-116', 'hand');
    s.runes(0, Array(5).fill(B));
    s.go();
    s.pick('Jogar Poppy');
    maybe(s, 'base de A');
    drive(s);
    assert.equal(s.e.pl[0].xp, pts >= 5 ? 3 : 0, `pts ${pts}`);
    assert.equal(p.exhausted, pts < 5, `pts ${pts}`);
  }
});

test('Arachnoid Horror: ela e as unidades aliadas podem ser jogadas num campo com uma inimiga sozinha', () => {
  const s = new Scenario();
  s.put(1, 'OGN-136', BF0); // sozinha
  s.put(1, 'OGN-136', BF1);
  s.put(1, 'OGN-136', BF1); // duas: não estão sozinhas
  s.put(0, 'UNL-117', 'hand');
  s.runes(0, Array(10).fill(B));
  s.go();
  s.pick('Jogar Arachnoid Horror');
  assert.ok(s.d.options.some((o) => o.label === A));
  assert.ok(!s.d.options.some((o) => o.label === 'Campo Vazio B'));
  // com ela no tabuleiro, outra unidade também pode ir para um campo assim
  const t = new Scenario();
  t.put(0, 'UNL-117', base(0));
  t.put(1, 'OGN-136', BF0);
  t.put(0, 'OGN-136', 'hand');
  t.runes(0, [B, B]);
  t.go();
  t.pick('Jogar Pit Rookie');
  assert.ok(t.d.options.some((o) => o.label === A), 'aliada pode ir para o campo da inimiga sozinha');
  t.pick(A);
  drive(t);
  assert.ok(logHas(t, 'Combate em Campo Vazio A'), t.log(10));
});

test('Elder Dragon: 1 de dano por local ao entrar mata inimigas; o dano das suas unidades não é afetado', () => {
  const s = new Scenario();
  const big = s.put(1, 'OGN-142', BF0); // 10
  const other = s.put(1, 'OGN-142', BF0);
  const atBase = s.put(1, 'OGN-142', base(1));
  const mine = s.put(0, 'OGN-142', base(0));
  s.put(0, 'UNL-118', 'hand');
  s.runes(0, Array(16).fill(B));
  s.go();
  s.pick('Jogar Elder Dragon');
  maybe(s, 'base de A');
  for (let i = 0; i < 6 && !s.d.root && s.d.kind === 'choose'; i++) {
    if (s.d.options.some((o) => o.obj === atBase.id)) s.pickObj(atBase);
    else if (s.d.options.some((o) => o.obj === big.id)) {
      assert.equal(s.d.max, 1);
      s.pickObj(big);
    } else s.ok([]);
  }
  drive(s);
  assert.equal(big.zone, 'trash', s.log(15));
  assert.equal(atBase.zone, 'trash');
  assert.equal(other.zone, 'board');
  // o dano de B nas minhas unidades segue a regra normal
  s.e.dealDamage(mine, 1, other);
  s.e.cleanup();
  assert.equal(mine.zone, 'board');
});

test('Elder Dragon: no combate, 1 de dano já é letal para cada inimiga (atribuição)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-118', base(0));
  const u = s.put(0, 'OGN-136', base(0)); // 2 de Might
  const e1 = s.put(1, 'OGN-142', BF0);
  const e2 = s.put(1, 'OGN-142', BF0);
  s.go();
  moveTo(s, [u.id], A);
  drive(s);
  assert.equal(e1.zone, 'trash', s.log(20));
  assert.equal(e2.zone, 'trash', s.log(20));
});

test("Kha'Zix, Evolving Hunter: ao atacar, pode gastar 3 XP para causar dano igual ao Might a uma inimiga aqui", () => {
  for (const xp of [3, 2]) {
    const s = new Scenario();
    s.e.pl[0].xp = xp;
    const k = s.put(0, 'UNL-119', base(0)); // 5
    const foe = s.put(1, 'OGN-142', BF0); // 10
    s.go();
    moveTo(s, [k.id], A);
    if (xp >= 3) {
      assert.match(s.d.prompt, /gastar 3 XP/);
      s.pick('Sim');
      s.maybeObj(foe);
    }
    drive(s);
    assert.equal(s.e.pl[0].xp, xp >= 3 ? 0 : 2, `xp ${xp}`);
    assert.equal(logHas(s, "Mountain Drake recebe 5 de dano de Kha'Zix"), xp >= 3, s.log(15));
  }
});

test('Rengar, Trophy Hunter: Ambush num campo com inimigas mesmo sem unidades minhas, inclusive como Reaction', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-142', BF1);
  const foe = s.put(1, 'OGN-136', BF0);
  s.put(0, 'UNL-120', 'hand');
  s.put(0, 'OGN-128', 'hand');
  s.runes(0, Array(9).fill(B));
  s.go();
  // como Reaction, respondendo a um spell meu na pilha
  s.pick('Jogar Challenge');
  s.maybeObj(mine);
  s.maybeObj(foe);
  assert.equal(s.d.kind, 'priority');
  s.pick('Jogar Rengar');
  const labels = s.d.options.map((o) => o.label);
  assert.ok(labels.includes(A), 'campo com inimiga');
  assert.ok(labels.includes('Campo Vazio B'), 'campo onde tenho unidade (Ambush normal)');
  assert.ok(!labels.some((l) => l.startsWith('base')), 'base não (sem Reaction lá)');
});

test('Dragonsoul Sage: [Tap] adiciona [1] (Reaction, sem pilha)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-093', base(0));
  s.go();
  s.pick('Exaurir: adicionar 1 de energia');
  assert.equal(s.e.pl[0].pool.energy, 1);
});

