// Testes de exatidão das cartas OGN-165..OGN-246 (Caos e Ordem): escolhas na hora certa, quem escolhe, gatilhos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;
const O = 'OGN-214';
const F = RUNE.fury;

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Responde a pergunta de local ("Jogar X onde?"), se houver. */
function maybe(s: Scenario, text: string) {
  if (!s.d.root && /onde\?/.test(s.d.prompt) && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
/** Põe uma runa no topo do deck de runas do jogador. */
function topRune(s: Scenario, p: P, code: string) {
  const r = s.e.newObj(code, p, 'setAside');
  s.e.toZone(r, 'runeDeck');
  return r;
}

test('Ride the Wind: o destino é escolhido ao jogar, antes de o spell ir para a pilha', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-019', base(0), { ready: false });
  s.put(0, 'OGN-173', 'hand');
  s.runes(0, [C, C, C]);
  s.put(1, 'OGN-169', 'hand'); // Gust: dá prioridade ao oponente
  s.runes(1, [C]);
  s.put(1, 'OGN-136', BF0); // alvo possível para o Gust
  s.go();
  s.pick('Jogar Ride the Wind');
  assert.match(s.d.prompt, /para onde/, 'destino perguntado ao jogar');
  assert.equal(s.e.chain.length, 0);
  s.pick('Campo Vazio B');
  assert.equal(s.d.kind, 'priority', 'o spell está na pilha esperando resposta');
  assert.equal(s.d.player, 1);
  assert.deepEqual(u.loc, base(0), 'ainda não resolveu');
  s.pick('Passar');
  s.passAll();
  assert.deepEqual(u.loc, BF1, s.log());
  assert.equal(u.exhausted, false);
});

test('Twisted Fate (Fury): efeito reflexivo escolhe o alvo ao ir para a pilha, com Deflect opcional', () => {
  for (const pay of [true, false]) {
    const s = new Scenario();
    const e = s.e;
    const tf = s.put(0, 'OGN-200', base(0));
    const ledros = s.put(1, 'OGN-231', BF0); // Deflect, 8
    s.put(1, 'OGN-142', BF0); // Mountain Drake 10
    topRune(s, 0, F);
    s.runes(0, [C]);
    s.go();
    moveTo(s, [tf.id], 'Campo Vazio A');
    s.passAll(2);
    assert.match(s.d.prompt, /Fury/, 'alvo do reflexivo escolhido ao finalizar\n' + s.log());
    s.pickObj(ledros);
    assert.match(s.d.prompt, /pagar Deflect/);
    const runes = e.runesOf(0).length;
    s.pick(pay ? 'Sim' : 'Não');
    s.passAll(6);
    const log = s.log(40);
    if (pay) {
      assert.match(log, /Commander Ledros recebe 2 de dano/);
      assert.match(log, /Mountain Drake recebe 1 de dano/);
    } else {
      assert.doesNotMatch(log, /Commander Ledros recebe 2/);
      assert.doesNotMatch(log, /Mountain Drake recebe 1 de dano/, 'gatilho inteiro sai da pilha');
      assert.equal(e.runesOf(0).length, runes);
    }
  }
});

test('Twisted Fate (Order): atordoa uma unidade inimiga em qualquer lugar', () => {
  const s = new Scenario();
  const tf = s.put(0, 'OGN-200', base(0));
  s.put(1, 'OGN-136', BF0); // defensor
  const far = s.put(1, 'OGN-065', base(1));
  topRune(s, 0, O);
  s.go();
  moveTo(s, [tf.id], 'Campo Vazio A');
  s.passAll(2);
  s.pickObj(far);
  s.passAll(6);
  assert.equal(far.stunned, true, s.log());
});

test('Nocturne: Stacked Deck olha o topo; banido e jogado, as outras duas seguem no efeito', () => {
  const s = new Scenario();
  const y = s.put(0, 'OGN-175', 'deckTop');
  const x = s.put(0, 'OGN-176', 'deckTop');
  const noc = s.put(0, 'OGN-194', 'deckTop');
  s.put(0, 'OGN-183', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Stacked Deck');
  s.passAll();
  assert.match(s.d.prompt, /Nocturne/);
  s.pick('Sim');
  s.pick('Sim');
  maybe(s, 'base de A');
  assert.match(s.d.prompt, /Stacked Deck/);
  assert.deepEqual(new Set(s.d.options.map((o) => o.obj)), new Set([x.id, y.id]));
  s.pickObj(x);
  s.passAll();
  assert.equal(noc.zone, 'board', s.log());
  assert.equal(x.zone, 'hand');
});

test('Karma: reciclar várias cartas numa ação dispara uma vez; reciclar só para o deck do oponente não dispara', () => {
  const s = new Scenario();
  const e = s.e;
  const karma = s.put(0, 'OGN-235', base(0));
  const other = s.put(0, 'OGN-219', base(0));
  s.put(0, 'OGN-175', 'deckTop');
  s.put(0, 'OGN-176', 'deckTop');
  s.put(0, 'OGN-019', 'deckTop');
  s.put(0, 'OGN-183', 'hand'); // Stacked Deck
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Stacked Deck');
  s.passAll();
  s.ok([s.d.options[0].id]);
  // um gatilho só (duas cartas recicladas na mesma ação)
  assert.match(s.d.prompt, /Karma: Buff/, s.log());
  s.pickObj(other);
  s.passAll();
  assert.equal(other.buffs, 1);
  assert.equal(karma.buffs, 0);
  assert.equal(e.pending.length, 0);
  // Forge of the Future: recicla cartas do descarte do oponente → vão para o deck dele: o Karma não dispara
  const forge = s.put(0, 'OGN-212', base(0));
  const t1 = s.put(1, 'OGN-019', 'trash');
  const t2 = s.put(1, 'OGN-065', 'trash');
  s.go();
  s.pick('Forge of the Future: Matar');
  s.ok([t1.id, t2.id]);
  s.passAll();
  assert.equal(forge.zone, 'trash');
  assert.equal(t1.zone, 'mainDeck');
  assert.equal(karma.buffs, 0, 'nenhuma carta foi para o deck do controlador do Karma\n' + s.log());
  assert.equal(s.g.current?.kind, 'action');
});

test('Karma do oponente não dispara quando eu reciclo cartas dele (quem recicla é quem foi instruído)', () => {
  const s = new Scenario();
  const k1 = s.put(1, 'OGN-235', base(1));
  s.put(0, 'OGN-212', base(0));
  const t1 = s.put(1, 'OGN-019', 'trash');
  s.go();
  s.pick('Forge of the Future: Matar');
  s.ok([t1.id]);
  s.passAll();
  assert.equal(t1.zone, 'mainDeck');
  assert.equal(k1.buffs, 0, s.log());
});

test('Stealthy Pursuer: decide na resolução; se a unidade saiu do tabuleiro, não vai', () => {
  const s = new Scenario();
  const pursuer = s.put(0, 'OGN-177', base(0));
  const a = s.put(0, 'OGN-136', base(0)); // Pit Rookie 2
  s.put(1, 'OGN-169', 'hand'); // Gust
  s.runes(1, [C]);
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  // o gatilho está na pilha; o oponente responde devolvendo a unidade
  assert.equal(s.d.kind, 'priority');
  s.pick('Jogar Gust');
  s.maybeObj(a);
  s.passAll();
  assert.equal(a.zone, 'hand');
  assert.deepEqual(pursuer.loc, base(0), 'não há para onde ir\n' + s.log());
  assert.equal(s.g.current?.kind, 'action');
});

test('Stealthy Pursuer: pode recusar na resolução', () => {
  const s = new Scenario();
  const pursuer = s.put(0, 'OGN-177', base(0));
  const a = s.put(0, 'OGN-136', base(0));
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  s.passAll();
  assert.match(s.d.prompt, /Stealthy Pursuer/);
  s.pick('Não');
  s.passAll();
  assert.deepEqual(pursuer.loc, base(0));
});

test('Acceptable Losses jogado no turno do oponente: o jogador do turno escolhe primeiro (303.2.a)', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-136', base(0));
  const g0a = s.put(0, 'OGN-182', base(0));
  s.put(0, 'OGN-184', base(0));
  const g1a = s.put(1, 'OGN-182', base(1));
  s.put(1, 'OGN-184', base(1));
  s.put(1, 'OGN-179', 'hand');
  s.runes(1, [C]);
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A'); // showdown no campo vazio: o oponente ganha o Focus
  for (let i = 0; i < 5 && !(s.d.player === 1 && s.d.options.some((o) => o.label.includes('Acceptable'))); i++) s.pick('Passar');
  s.pick('Jogar Acceptable Losses');
  s.passAll();
  assert.equal(s.d.player, 0, 'jogador do turno primeiro\n' + s.log());
  s.pickObj(g0a);
  assert.equal(s.d.player, 1);
  s.pickObj(g1a);
  s.passAll();
  assert.equal(g0a.zone, 'trash');
  assert.equal(g1a.zone, 'trash');
});

test('Soulgorger joga Cruel Patron do descarte: o custo adicional (matar uma aliada) continua', () => {
  const s = new Scenario();
  const victim = s.put(0, 'OGN-219', base(0));
  const patron = s.put(0, 'OGN-208', 'trash');
  s.put(0, 'OGN-196', 'hand');
  s.runes(0, Array(10).fill(C));
  s.go();
  s.pick('Jogar Soulgorger');
  maybe(s, 'base de A');
  s.passAll();
  s.pick('Sim');
  s.maybeObj(patron);
  s.passAll();
  maybe(s, 'base de A');
  assert.match(s.d.prompt, /Cruel Patron: matar/, s.log());
  s.pickObj(victim);
  s.passAll();
  assert.equal(victim.zone, 'trash');
  assert.equal(patron.zone, 'board');
});

test('Soulgorger: a unidade jogada do descarte pode pagar Accelerate (FAQ #467)', () => {
  const s = new Scenario();
  const rg = s.put(0, 'OGN-010', 'trash'); // Legion Rearguard (Accelerate)
  s.put(0, 'OGN-196', 'hand');
  s.runes(0, [...Array(10).fill(C), F]);
  s.go();
  s.pick('Jogar Soulgorger');
  maybe(s, 'base de A');
  s.passAll();
  s.pick('Sim');
  s.maybeObj(rg);
  s.passAll();
  maybe(s, 'base de A');
  assert.match(s.d.prompt, /Accelerate/);
  s.pick('Sim');
  s.passAll();
  assert.equal(rg.zone, 'board');
  assert.equal(rg.exhausted, false);
});

test('Spectral Matron: alvo no descarte escolhido ao pôr o gatilho na pilha; só até [3] e [Rune]', () => {
  const s = new Scenario();
  const cheap = s.put(0, 'OGN-136', 'trash'); // 2
  s.put(0, 'OGN-176', 'trash'); // 3
  const pricey = s.put(0, 'OGN-215', 'trash'); // 5
  s.put(0, 'OGN-226', 'hand');
  s.runes(0, Array(6).fill(O));
  s.put(1, 'OGN-169', 'hand'); // o oponente tem uma Reaction: a pilha para
  s.runes(1, [C]);
  s.put(1, 'OGN-136', BF1); // alvo possível para o Gust
  s.go();
  s.pick('Jogar Spectral Matron');
  maybe(s, 'base de A');
  s.passAll(1);
  s.pick('Sim');
  assert.equal(s.d.options.length, 2);
  assert.ok(!s.d.options.some((o) => o.obj === pricey.id));
  s.pickObj(cheap);
  assert.equal(s.d.kind, 'priority', 'gatilho na pilha com o alvo já escolhido');
  assert.equal(s.e.chain[s.e.chain.length - 1].targetIds[0][0], cheap.id);
  s.pick('Passar');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(cheap.zone, 'board', s.log());
});

test('Salvage: o gear é escolhido ao jogar e matar é opcional na resolução; compra 1 de qualquer jeito', () => {
  const s = new Scenario();
  const gear = s.put(1, 'OGN-245', base(1));
  s.put(0, 'OGN-224', 'hand');
  s.runes(0, [O, O, O]);
  s.go();
  const h = s.e.pl[0].hand.length;
  s.pick('Jogar Salvage');
  s.pickObj(gear);
  s.passAll();
  assert.match(s.d.prompt, /Salvage: matar/);
  s.pick('Não');
  assert.equal(gear.zone, 'board');
  assert.equal(s.e.pl[0].hand.length, h, 'jogou 1 e comprou 1');
});

test('Facebreaker: se os alvos ficam em campos diferentes, o controlador escolhe qual atordoar (355.11.b)', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-019', BF0);
  const b = s.put(1, 'OGN-136', BF0); // Pit Rookie 2: o Gust do oponente tem alvo
  s.put(0, 'OGN-220', 'hand');
  s.runes(0, [O, O]);
  s.put(1, 'OGN-169', 'hand');
  s.runes(1, [C]);
  s.go();
  s.pick('Jogar Facebreaker');
  assert.equal(s.d.kind, 'priority');
  b.loc = BF1; // a unidade inimiga vai para outro campo antes da resolução
  s.pick('Passar');
  assert.match(s.d.prompt, /campos diferentes/, s.log());
  s.pickObj(b);
  s.passAll();
  assert.equal(b.stunned, true);
  assert.equal(a.stunned, false);
});

test('Faithful Manufactor: se sai do tabuleiro antes do gatilho resolver, não há "aqui" e não joga ficha', () => {
  const s = new Scenario();
  s.put(0, 'OGN-019', BF0); // controla o campo A
  const m = s.put(0, 'OGN-211', 'hand');
  s.runes(0, [O, O, O]);
  s.put(1, 'OGN-169', 'hand'); // Gust
  s.runes(1, [C]);
  s.go();
  s.pick('Jogar Faithful Manufactor');
  s.pick('Campo Vazio A');
  assert.equal(s.d.kind, 'priority');
  s.pick('Jogar Gust');
  s.maybeObj(m);
  s.passAll();
  assert.equal(m.zone, 'hand');
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-RECRUIT').length, 0, s.log());
});

test('Commander Ledros: morte substituída (Zhonya) não reduz o custo', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-019', base(0));
  const b = s.put(0, 'OGN-065', base(0));
  s.put(0, 'OGN-077', base(0)); // Zhonya's Hourglass
  s.put(0, 'OGN-231', 'hand');
  s.runes(0, Array(6).fill(O));
  s.go();
  s.pick('Jogar Commander Ledros');
  s.pick('Sim');
  s.ok([a.id, b.id]);
  // mortes simultâneas: o controlador do Zhonya escolhe qual salvar (regra 373; RiftJudge #10615)
  if (s.d.prompt.startsWith('Unidades vão morrer')) s.ok([s.d.options[0].id]);
  s.passAll();
  const killed = [a, b].filter((u) => u.zone === 'trash').length;
  assert.equal(killed, 1, s.log());
  // 6 de energia (exaurir 6) + 3 [Order] (reciclar 3): sobram 3 runas
  assert.equal(s.e.runesOf(0).length, 3, s.log());
});

test('Seal of Discord ativado à mão adiciona [Chaos] ao pool', () => {
  const s = new Scenario();
  s.put(0, 'OGN-204', base(0));
  s.go();
  s.pick('Seal of Discord: Adicionar');
  assert.equal(s.e.pl[0].pool.power.Chaos, 1);
});

test('Tideturner jogado de Hidden escolhe livremente (811.1.d.2)', () => {
  const s = new Scenario();
  const e = s.e;
  const tt = s.put(0, 'OGN-199', BF0);
  const home = s.put(0, 'OGN-019', base(0));
  const spec = (getScript('OGN-199')!.onPlay![0].targets as any)[0];
  const c = e.ctx(tt, 0, { hiddenBf: 0 });
  assert.ok(e.targetCandidates(c, spec).includes(home));
});

test("King's Edict: o oponente escolhe uma unidade que quem jogou não controla", () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-019', base(0));
  const x = s.put(1, 'OGN-019', base(1));
  const y = s.put(1, 'OGN-065', base(1));
  s.put(0, 'OGN-237', 'hand');
  s.runes(0, Array(8).fill(O));
  s.go();
  s.pick("Jogar King's Edict");
  s.passAll();
  assert.equal(s.d.player, 1);
  assert.ok(!s.d.options.some((o) => o.obj === mine.id));
  s.pickObj(y);
  s.passAll();
  assert.equal(y.zone, 'trash');
  assert.equal(x.zone, 'board');
  assert.equal(mine.zone, 'board');
});

test('Albus Ferros: unidade com vários buffs (Lee Sin, Ascetic) pode gastar cada um', () => {
  const s = new Scenario();
  const lee = s.put(0, 'OGN-078', base(0));
  lee.buffs = 2;
  s.put(0, 'OGN-230', 'hand');
  s.runes(0, Array(4).fill(O));
  s.go();
  s.pick('Jogar Albus Ferros');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(s.d.options.length, 2);
  s.ok(s.d.options.map((o) => o.id));
  s.passAll();
  assert.equal(lee.buffs, 0);
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 6, '4 pagas + 2 canalizadas exauridas');
});

test('Karma: Burn Out recicla o descarte para o deck (431.2.b) e dispara o Karma', () => {
  const s = new Scenario();
  const e = s.e;
  const karma = s.put(0, 'OGN-235', base(0));
  for (const id of [...e.pl[0].mainDeck]) e.toZone(e.objs[id], 'trash');
  s.put(0, 'OGN-224', 'hand'); // Salvage: compra 1 com o deck vazio
  s.runes(0, [O, O, O]);
  s.go();
  s.pick('Jogar Salvage');
  s.passAll();
  s.passAll();
  assert.equal(karma.buffs, 1, s.log());
  assert.equal(e.pl[1].points, 1);
});

test('Noxian Drummer: "aqui" é o local dele na resolução; se saiu do tabuleiro, não há ficha', () => {
  const s = new Scenario();
  const d = s.put(0, 'OGN-222', base(0));
  s.put(1, 'OGN-169', 'hand'); // Gust (Drummer tem 3)
  s.runes(1, [C]);
  s.go();
  moveTo(s, [d.id], 'Campo Vazio A');
  assert.equal(s.d.kind, 'priority');
  s.pick('Jogar Gust');
  s.maybeObj(d);
  s.passAll();
  assert.equal(d.zone, 'hand');
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-RECRUIT').length, 0, s.log());
});
