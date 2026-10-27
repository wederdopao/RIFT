// Testes de cenário das cartas do lote "mind" (OGN-083..OGN-123).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const MIND = 'OGN-089';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const mind = (n: number) => Array.from({ length: n }, () => MIND);

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function maybe(s: Scenario, text: string) {
  if (s.d.options.some((o) => o.label.includes(text)) && !s.d.root) s.pick(text);
}
/** Passa a prioridade e ordena gatilhos simultâneos (o primeiro da lista) até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  drain(s);
}
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));

test('Eager Apprentice: spells custam 1 a menos enquanto ela está num campo, até o mínimo de 1', () => {
  const s = new Scenario();
  const ap = s.put(0, 'OGN-084', BF0);
  const comet = s.put(0, 'OGN-085', 'hand'); // 5
  const stup = s.put(0, 'OGN-095', 'hand'); // 1
  const consult = s.put(0, 'OGN-083', 'hand'); // 4
  const yordle = s.put(0, 'OGN-087', 'hand'); // unidade: não muda
  const e = s.e;
  assert.equal(e.energyDiscount(comet, 0), -1);
  assert.equal(e.energyDiscount(stup, 0), 0, 'custo 1 não cai abaixo de 1');
  assert.equal(e.energyDiscount(yordle, 0), 0);
  // duas Aprendizes: 4 → 3 → 2; um spell de 2 só cai para 1
  s.put(0, 'OGN-084', BF0);
  assert.equal(e.energyDiscount(consult, 0), -2);
  const two = s.put(0, 'OGN-093', 'hand'); // Smoke Screen 2
  assert.equal(e.energyDiscount(two, 0), -1);
  // na base não vale
  e.recall(ap);
  assert.equal(e.energyDiscount(comet, 0), -1, 'só a segunda Aprendiz (no campo) reduz');
  assert.equal(e.energyDiscount(comet, 1), 0, 'não vale para o oponente');
});

test('Energy Conduit: exaurir adiciona 1 de energia ao pool, que paga um spell', () => {
  const s = new Scenario();
  const cond = s.put(0, 'OGN-098', base(0));
  const target = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-095', 'hand'); // Stupefy (1)
  s.go();
  assert.ok(has(s, 'Jogar Stupefy'), 'o Conduit entra no pagamento (429.3); aqui é ativado à mão antes');
  s.pick('Energy Conduit: Exaurir');
  assert.equal(s.e.pl[0].pool.energy, 1);
  assert.equal(cond.exhausted, true);
  assert.equal(s.e.chain.length, 0, 'Add não usa a pilha');
  s.pick('Jogar Stupefy');
  s.maybeObj(target);
  s.passAll();
  assert.equal(s.e.pl[0].pool.energy, 0);
  assert.equal(s.e.might(target), 7);
});

test('Seal of Insight: adiciona 1 power Mind que paga o pip de Mind', () => {
  const s = new Scenario();
  s.put(0, 'OGN-120', base(0));
  const target = s.put(1, 'OGN-088', BF0);
  s.runes(0, [RUNE.fury, RUNE.fury]);
  s.put(0, 'OGN-093', 'hand'); // Smoke Screen: 2 + Mind
  s.go();
  assert.ok(has(s, 'Jogar Smoke Screen'), 'o pagamento automático já conta o Seal');
  s.pick('Seal of Insight'); // também dá para ativar à mão
  assert.equal(s.e.pl[0].pool.power.Mind, 1);
  s.pick('Jogar Smoke Screen');
  s.maybeObj(target);
  s.passAll();
  assert.equal(s.e.might(target), 4, '8 - 4');
  assert.equal(s.e.runesOf(0).length, 2, 'nenhuma runa reciclada');
});

test('Malzahar: matar um aliado e exaurir adiciona 2 power de qualquer domínio', () => {
  const s = new Scenario();
  const mz = s.put(0, 'OGN-113', base(0));
  const fodder = s.put(0, 'OGN-096', base(0)); // Watchful Sentry: Deathknell compra 1
  s.go();
  s.pick('Malzahar, Fanatic: Matar');
  s.pickObj(fodder);
  assert.equal(fodder.zone, 'trash');
  assert.equal(mz.exhausted, true);
  assert.equal(s.e.pl[0].pool.power.any, 2);
  s.passAll(); // Deathknell do Sentry
  assert.equal(s.e.pl[0].hand.length, 1);
});

test('Heimerdinger: usa a habilidade de exaurir de um gear aliado, exaurindo a si mesmo', () => {
  const s = new Scenario();
  const heim = s.put(0, 'OGN-111', base(0));
  const orb = s.put(0, 'OGN-090', base(0));
  const enemy = s.put(1, 'OGN-088', BF0);
  s.go();
  s.pick('(de Orb of Regret)');
  s.maybeObj(enemy);
  s.passAll();
  assert.equal(heim.exhausted, true);
  assert.equal(orb.exhausted, false);
  assert.equal(s.e.might(enemy), 7);
  assert.ok(has(s, 'Orb of Regret: Exaurir'), 'o Orb ainda pode ser usado');
  assert.ok(!has(s, '(de Orb of Regret)'), 'Heimerdinger já está exaurido');
});

test('Time Warp: o jogador joga um turno adicional e a carta é banida', () => {
  const s = new Scenario();
  const tw = s.put(0, 'OGN-122', 'hand');
  s.runes(0, mind(10));
  s.go();
  s.pick('Jogar Time Warp');
  s.passAll();
  assert.equal(tw.zone, 'banish');
  const t = s.e.turn;
  endTurn(s);
  assert.equal(s.e.active, 0, 'turno adicional');
  assert.equal(s.e.turn, t + 1);
  endTurn(s);
  assert.equal(s.e.active, 1, 'depois volta a alternar');
});

test("Kai'Sa: ao conquistar joga um spell do descarte sem pagar a energia e depois o recicla", () => {
  const s = new Scenario();
  s.e.pl[0].points = 6;
  const kai = s.put(0, 'OGN-112', base(0));
  const comet = s.put(0, 'OGN-085', 'trash'); // energia 5 < 6
  const elder = s.put(1, 'OGN-065', BF1);
  s.go();
  moveTo(s, [kai.id], 'Campo Vazio A');
  // "você pode" e o alvo (spell no descarte) são decididos ao pôr o gatilho na pilha
  for (let i = 0; i < 10 && !s.d.prompt.startsWith("Kai'Sa"); i++) s.pick('Passar');
  s.pick('Sim');
  s.passAll();
  s.pickObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'trash', s.log(20));
  assert.equal(comet.zone, 'mainDeck', 'reciclado');
  assert.equal(s.e.pl[0].mainDeck[s.e.pl[0].mainDeck.length - 1], comet.id, 'no fundo do deck');
  assert.equal(s.e.pl[0].points, 7);
});

test("Kai'Sa: spell com custo de energia igual ou maior que os pontos não é opção", () => {
  const s = new Scenario();
  s.e.pl[0].points = 4; // a conquista leva a 5 antes de o gatilho resolver
  const kai = s.put(0, 'OGN-112', base(0));
  s.put(0, 'OGN-085', 'trash'); // 5, não é < 5
  s.put(1, 'OGN-065', BF1);
  s.go();
  moveTo(s, [kai.id], 'Campo Vazio A');
  if (s.d.prompt.startsWith("Kai'Sa")) s.pick('Sim'); // sem alvo válido: o gatilho sai da pilha (regra 402.4)
  drain(s);
  assert.equal(s.e.pl[0].points, 5);
  assert.ok(!s.e.log.some((l) => l.text.includes('joga Falling Comet')));
  assert.equal(s.d.kind, 'action');
});

test('Portal Rescue: bane a unidade e o dono a joga de novo na base (dispara o "quando você me joga")', () => {
  const s = new Scenario();
  const y = s.put(0, 'OGN-087', BF0, { ready: false });
  s.put(0, 'OGN-102', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Portal Rescue');
  s.maybeObj(y);
  s.passAll();
  assert.equal(y.zone, 'board');
  assert.deepEqual(y.loc, base(0));
  assert.equal(s.e.pl[0].hand.length, 1, 'Lecturing Yordle comprou 1 de novo');
});

test('Promising Future: cada jogador bane uma das 5 do topo e a joga sem pagar energia, começando pelo oponente', () => {
  const s = new Scenario();
  const yordle = s.put(0, 'OGN-087', 'deckTop');
  const sentry = s.put(1, 'OGN-096', 'deckTop');
  s.put(0, 'OGN-115', 'hand');
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Promising Future');
  s.passAll();
  assert.match(s.d.prompt, /Promising Future: banir/);
  assert.equal(s.d.player, 0);
  s.pickObj(yordle);
  assert.equal(s.d.player, 1);
  s.pickObj(sentry);
  s.passAll();
  assert.equal(sentry.zone, 'board', s.log(20));
  assert.equal(sentry.controller, 1);
  assert.equal(yordle.zone, 'board');
  const iS = s.e.log.findIndex((l) => l.text.includes('joga Watchful Sentry'));
  const iY = s.e.log.findIndex((l) => l.text.includes('joga Lecturing Yordle'));
  assert.ok(iS >= 0 && iS < iY, 'o oponente joga primeiro');
  assert.equal(s.e.pl[0].hand.length, 1, 'Yordle comprou 1');
});

test('Ava Achiever: ao atacar paga Mind para jogar da mão uma unidade com Hidden ali mesmo', () => {
  const s = new Scenario();
  const ava = s.put(0, 'OGN-107', base(0));
  const def = s.put(1, 'OGN-088', BF0); // Mega-Mech 8
  const fae = s.put(0, 'OGN-097', 'hand');
  s.runes(0, [MIND]);
  s.go();
  moveTo(s, [ava.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Ava Achiever'); i++) s.pick('Passar');
  s.pick('Sim');
  s.passAll(1);
  // o gatilho da Fae (-2 numa unidade)
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Blastcone'); i++) s.pick('Passar');
  s.pickObj(def);
  assert.equal(fae.zone, 'board');
  assert.deepEqual(fae.loc, BF0, 'a unidade entra no campo da Ava');
  assert.equal(s.e.runesOf(0).length, 0, 'pagou o Mind');
  s.passAll();
});

test('Teemo: ao defender causa 1 de dano por carta com Hidden entre as 5 do topo e recicla as 5', () => {
  const s = new Scenario();
  const teemo = s.put(1, 'OGN-121', BF0);
  const atk = s.put(0, 'OGN-088', base(0)); // Mega-Mech 8
  const top = [
    s.put(1, 'OGN-088', 'deckTop'),
    s.put(1, 'OGN-097', 'deckTop'), // Hidden
    s.put(1, 'OGN-088', 'deckTop'),
    s.put(1, 'OGN-094', 'deckTop'), // Hidden
    s.put(1, 'OGN-087', 'deckTop'),
  ];
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('2 com Hidden')), s.log(30));
  assert.ok(s.e.log.some((l) => l.text === 'Mega-Mech recebe 2 de dano de Teemo, Strategist.'), s.log(30));
  const deck = s.e.pl[1].mainDeck;
  for (const o of top) assert.ok(deck.indexOf(o.id) >= deck.length - 5, 'reveladas foram para o fundo');
  void teemo;
});

test('Dr. Mundo: Might cresce com o descarte; no início do turno recicla 3 do descarte', () => {
  const s = new Scenario();
  const mundo = s.put(0, 'OGN-109', base(0));
  for (let i = 0; i < 4; i++) s.put(0, 'OGN-088', 'trash');
  assert.equal(s.e.might(mundo), 10);
  s.go();
  endTurn(s);
  s.pick('Encerrar o turno');
  drain(s);
  assert.match(s.d.prompt, /Dr\. Mundo: reciclar quais 3/);
  s.ok(s.d.options.slice(0, 3).map((o) => o.id));
  for (let i = 0; i < 10 && s.d.kind !== 'action'; i++) s.pick('Passar');
  assert.equal(s.e.pl[0].trash.length, 1);
  assert.equal(s.e.might(mundo), 7);
});

test('Wraith of Echoes: só a primeira morte de unidade aliada no turno compra 1; Singularity em até duas unidades', () => {
  const s = new Scenario();
  s.put(0, 'OGN-118', base(0));
  const a = s.put(0, 'OGN-096', base(0)); // Sentry: Deathknell compra 1
  const b = s.put(0, 'OGN-087', base(0));
  s.put(0, 'OGN-105', 'hand');
  s.runes(0, mind(6));
  s.go();
  s.pick('Jogar Singularity');
  s.ok([a.id, b.id]);
  drain(s);
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
  // Sentry 1 + Wraith 1 (só uma vez)
  assert.equal(s.e.pl[0].hand.length, 2, s.log(20));
});

test('Convergent Mutation: aumenta o Might de uma unidade até o de outra unidade aliada', () => {
  const s = new Scenario();
  const small = s.put(0, 'OGN-087', base(0)); // 2
  s.put(0, 'OGN-088', base(0)); // 8
  s.put(0, 'OGN-108', 'hand');
  s.runes(0, mind(2));
  s.go();
  s.pick('Jogar Convergent Mutation');
  s.pickObj(small);
  s.passAll();
  assert.equal(s.e.might(small), 8);
});

test('Ekko: Deathknell recicla Ekko e prepara as runas', () => {
  const s = new Scenario();
  const ekko = s.put(0, 'OGN-110', BF0);
  s.put(0, 'OGN-085', 'hand'); // Falling Comet: 6 de dano
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Falling Comet');
  s.maybeObj(ekko);
  s.passAll(2);
  assert.equal(ekko.zone, 'trash');
  assert.ok(s.e.runesOf(0).every((r) => r.exhausted));
  s.pick('Sim');
  s.passAll();
  assert.equal(ekko.zone, 'mainDeck');
  assert.ok(s.e.runesOf(0).every((r) => !r.exhausted), s.log(15));
});

test('Thousand-Tailed Watcher: -3 de Might nas unidades inimigas, até o mínimo de 1', () => {
  const s = new Scenario();
  const big = s.put(1, 'OGN-088', BF0);
  const small = s.put(1, 'OGN-087', base(1));
  const mine = s.put(0, 'OGN-087', base(0));
  s.put(0, 'OGN-116', 'hand');
  s.runes(0, mind(7));
  s.go();
  s.pick('Jogar Thousand-Tailed Watcher');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(s.e.might(big), 5);
  assert.equal(s.e.might(small), 1);
  assert.equal(s.e.might(mine), 2);
});

test('Viktor: jogar uma carta no turno do oponente cria um Recruit na base', () => {
  const s = new Scenario();
  s.put(0, 'OGN-117', base(0));
  s.go();
  endTurn(s);
  const e = s.e;
  for (const r of e.runesOf(1)) e.toZone(r, 'runeDeck', { bottom: true });
  for (const r of e.runesOf(0)) e.toZone(r, 'runeDeck', { bottom: true });
  s.runes(1, [RUNE.calm]);
  s.runes(0, [MIND]);
  const lee = s.put(1, 'OGN-087', base(1));
  s.put(0, 'OGN-095', 'hand'); // Stupefy
  s.go();
  s.pick('Lee Sin, Blind Monk');
  s.maybeObj(lee);
  assert.equal(s.d.player, 0);
  s.pick('Jogar Stupefy');
  s.maybeObj(lee);
  s.passAll();
  const recruits = e.units().filter((u) => u.code === 'TOK-RECRUIT' && u.controller === 0);
  assert.equal(recruits.length, 1, s.log(20));
  assert.deepEqual(recruits[0].loc, base(0));
});

test('Gemcraft Seer: as outras unidades aliadas têm Vision', () => {
  const s = new Scenario();
  const seer = s.put(0, 'OGN-100', base(0));
  const ally = s.put(0, 'OGN-088', base(0));
  const foe = s.put(1, 'OGN-088', base(1));
  assert.equal(s.e.kw(seer).vision, 1);
  assert.equal(s.e.kw(ally).vision, 1);
  assert.equal(s.e.kw(foe).vision, undefined);
  // jogar uma unidade com o Seer em jogo dispara Vision
  s.put(0, 'OGN-087', 'hand');
  s.runes(0, mind(3));
  s.go();
  s.pick('Jogar Lecturing Yordle');
  maybe(s, 'base de A');
  let sawVision = false;
  for (let i = 0; i < 10 && s.d.kind !== 'action'; i++) {
    if (s.d.prompt.startsWith('Predict')) {
      sawVision = true;
      s.ok([]);
    } else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else s.pick('Passar');
  }
  assert.ok(sawVision);
});

test('Garbage Grabber: recicla 3 do descarte, paga 1 e exaure para comprar 1', () => {
  const s = new Scenario();
  const gg = s.put(0, 'OGN-099', base(0));
  s.runes(0, [MIND]);
  s.go();
  assert.ok(!has(s, 'Garbage Grabber'), 'precisa de 3 cartas no descarte');
  for (let i = 0; i < 3; i++) s.put(0, 'OGN-088', 'trash');
  s.go();
  s.pick('Garbage Grabber');
  s.passAll();
  assert.equal(gg.exhausted, true);
  assert.equal(s.e.pl[0].trash.length, 0);
  assert.equal(s.e.pl[0].hand.length, 1);
});

test('Retreat: devolve a unidade aliada e o dono canaliza 1 runa exaurida', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-088', BF0);
  s.put(0, 'OGN-104', 'hand');
  s.runes(0, [MIND]);
  s.go();
  s.pick('Jogar Retreat');
  s.maybeObj(u);
  s.passAll();
  assert.equal(u.zone, 'hand');
  assert.equal(s.e.runesOf(0).length, 2);
  assert.ok(s.e.runesOf(0).every((r) => r.exhausted));
});

test('Sprite Mother: cria um Sprite 3 pronto com Temporary no mesmo lugar', () => {
  const s = new Scenario();
  s.put(0, 'OGN-106', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Sprite Mother');
  maybe(s, 'base de A');
  s.passAll();
  const sp = s.e.units().find((u) => u.code === 'TOK-SPRITE')!;
  assert.ok(sp);
  assert.equal(sp.exhausted, false);
  assert.deepEqual(sp.loc, base(0));
  assert.equal(s.e.might(sp), 3);
  assert.ok(s.e.kw(sp).temporary);
});

test('Unchecked Power: exaure as unidades aliadas e causa 12 em todas as unidades nos campos', () => {
  const s = new Scenario();
  const home = s.put(0, 'OGN-087', base(0));
  const mineBf = s.put(0, 'OGN-088', BF0);
  const foeBf = s.put(1, 'OGN-088', BF1);
  const foeBase = s.put(1, 'OGN-088', base(1));
  s.put(0, 'OGN-123', 'hand');
  s.runes(0, mind(7));
  s.go();
  s.pick('Jogar Unchecked Power');
  s.passAll();
  assert.equal(home.exhausted, true);
  assert.equal(home.zone, 'board');
  assert.equal(mineBf.zone, 'trash');
  assert.equal(foeBf.zone, 'trash');
  assert.equal(foeBase.zone, 'board');
});

test('Blastcone Fae jogada de Hidden só mira unidades daquele campo; Mushroom Pouch compra com carta escondida', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-088', BF0);
  const foeOther = s.put(1, 'OGN-088', BF1);
  const fae = s.put(0, 'OGN-097', 'hand');
  s.put(0, 'OGN-101', base(0));
  s.runes(0, [MIND]);
  s.go();
  s.pick('Esconder Blastcone Fae');
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.active, 0);
  assert.equal(s.e.pl[0].hand.length, 3, 'Jinx (lenda) + Mushroom Pouch + compra normal\n' + s.log(30));
  s.pick('Jogar Blastcone Fae'); // de Hidden: entra no campo onde estava escondida
  for (let i = 0; i < 5 && !s.d.prompt.startsWith('Blastcone'); i++) s.pick('Passar');
  assert.ok(!s.d.options.some((o) => o.obj === foeOther.id), 'unidade de outro campo não é alvo');
  s.pickObj(mine);
  s.passAll();
  assert.equal(fae.zone, 'board');
  assert.equal(s.e.might(mine), 6);
});

test('Riptide Rex: 6 de dano numa unidade inimiga num campo', () => {
  const s = new Scenario();
  const foe = s.put(1, 'OGN-087', BF0);
  s.put(1, 'OGN-087', base(1));
  s.put(0, 'OGN-092', 'hand');
  s.runes(0, mind(6));
  s.go();
  s.pick('Jogar Riptide Rex');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(foe.zone, 'trash');
});

test('Ravenbloom Student ganha +1 ao você jogar um spell; Pit Crew se prepara ao você jogar um gear', () => {
  const s = new Scenario();
  const rb = s.put(0, 'OGN-103', base(0));
  const crew = s.put(0, 'OGN-091', base(0), { ready: false });
  s.put(0, 'OGN-114', 'hand'); // Progress Day
  s.put(0, 'OGN-090', 'hand'); // Orb of Regret
  s.runes(0, mind(8));
  s.go();
  s.pick('Jogar Progress Day');
  drain(s);
  assert.equal(s.e.might(rb), 3);
  assert.equal(s.e.pl[0].hand.length, 5, 'comprou 4');
  assert.equal(crew.exhausted, true);
  s.pick('Jogar Orb of Regret');
  drain(s);
  assert.equal(crew.exhausted, false);
  assert.equal(s.e.might(rb), 3, 'gear não é spell');
});

test('Sprite Call: o Sprite pronto entra na base ou num campo seu', () => {
  const s = new Scenario();
  s.put(0, 'OGN-088', BF0);
  s.put(0, 'OGN-094', 'hand');
  s.runes(0, mind(3));
  s.go();
  s.pick('Jogar Sprite Call');
  drain(s);
  assert.match(s.d.prompt, /Sprite Call: jogar o Sprite onde/);
  s.pick('Campo Vazio A');
  drain(s);
  const sp = s.e.units().find((u) => u.code === 'TOK-SPRITE')!;
  assert.deepEqual(sp.loc, BF0);
  assert.equal(sp.exhausted, false);
});
