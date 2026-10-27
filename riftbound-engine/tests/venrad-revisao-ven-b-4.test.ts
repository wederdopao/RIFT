// Revisão independente VEN-146..166 (lendas, assinaturas e campos de batalha do Vendetta): um teste por erro achado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';
import { E } from '../src/cards/helpers';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const ORDER = 'OGN-214';
const YORDLE = 'OGN-087'; // Lecturing Yordle 2 de Might, Tank
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5

function legend(s: Scenario, p: P, code: string): Obj {
  const e = s.e;
  e.legendOf(p).zone = 'gone';
  const o = e.newObj(code, p, 'legend');
  e.pl[p].legend = o.id;
  return o;
}
function setBf(s: Scenario, i: number, code: string, ctrl: P | null = null) {
  const o = s.e.newObj(code, (ctrl ?? 0) as P, 'battlefieldZone');
  s.e.bfs[i].objId = o.id;
  s.e.bfs[i].controller = ctrl;
  return o;
}
function drive<T>(gen: Generator<any, T, string[]>): T {
  let r = gen.next(undefined as any);
  while (!r.done) r = gen.next([r.value.options[0].id]);
  return r.value;
}
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────────────────────── VEN-156 Lightning Rush ─────────────────────────────
test('Lightning Rush: a carta escolhida é comprada (evento de compra) e o resto vai para o descarte', () => {
  const s = new Scenario();
  const cards = [s.put(0, YORDLE, 'deckTop'), s.put(0, YORDLE, 'deckTop'), s.put(0, YORDLE, 'deckTop')];
  s.put(0, 'VEN-156', 'hand');
  s.runes(0, [ORDER]);
  const draws: Obj[] = [];
  const emit0 = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    if (ev.type === 'draw') draws.push(ev.obj!);
    emit0(ev);
  };
  s.go();
  s.pick('Jogar Lightning Rush');
  drain(s);
  s.pickObj(cards[0]);
  drain(s);
  assert.equal(cards[0].zone, 'hand', s.log());
  assert.deepEqual(draws.map((o) => o.id), [cards[0].id], '"draw it" é uma compra');
  assert.equal(cards[1].zone, 'trash');
  assert.equal(cards[2].zone, 'trash');
});

// ───────────────────────────── VEN-148 Shadow Dash ─────────────────────────────
test('Shadow Dash: o destino é escolhido ao jogar (355.4), entre campos onde você tem unidades', () => {
  const s = new Scenario();
  const a = s.put(0, YORDLE, BF0);
  const b = s.put(0, YORDLE, BF0);
  s.put(0, YORDLE, BF1);
  const foe = s.put(1, YORDLE, base(1));
  s.put(0, 'VEN-148', 'hand');
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  s.pick('Jogar Shadow Dash');
  s.maybeObj(foe);
  // destino perguntado ao jogar, antes de pagar e de ir para a pilha
  assert.match(s.d.prompt, /para qual campo/, s.d.prompt);
  assert.deepEqual(s.d.options.map((o) => o.label), [s.e.locName(BF0), s.e.locName(BF1)]);
  assert.ok(!s.e.log.some((l) => l.text.includes('Na pilha: Shadow Dash')));
  s.pick(s.e.locName(BF0));
  drain(s);
  assert.equal(foe.zone === 'board' ? s.e.bfIndex(foe) : 0, 0, s.log());
  assert.equal(s.e.might(a), 3, 'exatamente duas unidades suas lá: +1 cada');
  assert.equal(s.e.might(b), 3);
});

test('Shadow Dash: o local atual da unidade não é destino válido (355.4.a)', () => {
  const s = new Scenario();
  s.put(0, YORDLE, BF1);
  s.put(1, YORDLE, BF1);
  const sd = s.put(0, 'VEN-148', 'hand');
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  assert.ok(!s.d.options.some((o) => o.obj === sd.id || o.label.includes('Jogar Shadow Dash')), 'sem destino possível, sem alvo');
});

// ───────────────────────────── VEN-149 Jayce, Defender of Tomorrow ─────────────────────────────
test('Jayce: "Ready a gear" escolhe o gear ao ativar (qualquer gear); Empowered tem a habilidade de preparar 2', () => {
  const s = new Scenario();
  const jayce = legend(s, 0, 'VEN-149');
  const g1 = s.put(0, 'TOK-GOLD', base(0), { ready: false });
  const g2 = s.put(0, 'TOK-GOLD', base(0), { ready: false });
  const foeGear = s.put(1, 'TOK-GOLD', base(1), { ready: false });
  s.runes(0, rs(MIND, 4));
  s.go();
  assert.ok(!has(s, 'preparar 2 gear'), 'sem Empowered, só a primeira habilidade');
  s.pick('Jayce, Defender of Tomorrow: [1], exaurir: preparar um gear');
  assert.ok(s.d.options.some((o) => o.obj === foeGear.id), 'qualquer gear, também do oponente (355.9.a.1)');
  assert.ok(!s.e.log.some((l) => l.text.includes('paga')), 'alvo antes do custo, ao pôr na pilha');
  s.pickObj(g1);
  drain(s);
  assert.equal(g1.exhausted, false, s.log());
  assert.equal(g2.exhausted, true);
  jayce.exhausted = false;
  jayce.empowered = true;
  g1.exhausted = true;
  s.go();
  s.pick('preparar 2 gear');
  s.ok([g1.id, g2.id]);
  drain(s);
  assert.equal(g1.exhausted, false, s.log());
  assert.equal(g2.exhausted, false);
});

// ───────────────────────────── VEN-150 Acceleration Gate ─────────────────────────────
test('Acceleration Gate: escolhe até 4 unidades, gear e/ou runas ao jogar, de qualquer jogador', () => {
  const s = new Scenario();
  const u = s.put(0, YORDLE, base(0), { ready: false });
  const foe = s.put(1, YORDLE, base(1), { ready: false });
  const foeRune = s.put(1, MIND, base(1), { ready: false });
  s.runes(0, rs(MIND, 4));
  s.put(0, 'VEN-150', 'hand');
  s.go();
  s.pick('Jogar Acceleration Gate');
  assert.match(s.d.prompt, /Acceleration Gate/, s.d.prompt);
  assert.ok(s.d.options.some((o) => o.obj === foe.id), 'unidade inimiga também');
  assert.ok(s.d.options.some((o) => o.obj === foeRune.id), 'runa também');
  assert.equal(s.d.min, 0, '"up to": pode escolher zero (355.13)');
  assert.ok(!s.e.log.some((l) => l.text.includes('paga')), 'escolhas antes de pagar, ao jogar');
  s.ok([u.id, foe.id]);
  drain(s);
  assert.equal(u.exhausted, false, s.log());
  assert.equal(foe.exhausted, false);
});

// ───────────────────────────── VEN-155 Kennen, Heart of the Tempest ─────────────────────────────
test('Kennen: carta jogada por efeito a partir da MÃO não o empodera', () => {
  const s = new Scenario();
  const k = legend(s, 0, 'VEN-155');
  const inHand = s.put(0, YORDLE, 'hand');
  s.go();
  drive(s.e.playFromEffect(0, inHand, E(0)));
  s.go();
  drain(s);
  assert.equal(inHand.zone, 'board');
  assert.equal(k.empowered, false, s.log());
});

test('Kennen: spell jogado do descarte pela Endless Riches (sem Flow) o empodera', () => {
  const s = new Scenario();
  const k = legend(s, 0, 'VEN-155');
  const sp = s.put(0, 'OGN-095', 'trash'); // Stupefy (antes da Endless Riches, que baniria o que vai para o descarte)
  s.put(0, 'VEN-022', base(0));
  const foe = s.put(1, YORDLE, BF0);
  s.put(0, YORDLE, 'deckTop');
  s.runes(0, [MIND]);
  s.go();
  s.pick(`play:${sp.id}:trash`);
  s.maybeObj(foe);
  drain(s);
  assert.equal(k.empowered, true, s.log());
});

test('Kennen: o gatilho vai para a pilha mesmo com ele já Empowered (a condição é só jogar de fora da mão)', () => {
  const s = new Scenario();
  const k = legend(s, 0, 'VEN-155');
  k.empowered = true;
  const sp = s.put(0, 'VEN-156', 'trash'); // Lightning Rush, [Flow][2][Rune]
  for (let i = 0; i < 3; i++) s.put(0, YORDLE, 'deckTop');
  s.runes(0, rs(ORDER, 3));
  s.go();
  s.pick(`play:${sp.id}:flow`);
  drain(s);
  s.ok([s.d.options[0].id]); // compra uma
  drain(s);
  assert.ok(s.e.log.some((l) => l.text.includes('Na pilha: Kennen')), s.log());
  assert.equal(k.empowered, true);
});

// ───────────────────────────── VEN-151/153 Mel e Ambessa ─────────────────────────────
test('Mel, Soul\'s Reflection / Ambessa: "quando você empodera outra coisa" dispara mesmo já Empowered', () => {
  for (const code of ['VEN-151', 'VEN-153']) {
    const s = new Scenario();
    const l = legend(s, 0, code);
    l.empowered = true;
    const u = s.put(0, 'VEN-030', base(0)); // Serene Ascetic, [Empower][3]
    s.runes(0, rs(RUNE.calm, 3));
    s.go();
    s.pick('Serene Ascetic: Empower');
    drain(s);
    assert.equal(u.empowered, true);
    assert.ok(s.e.log.some((x) => x.text.includes(`Na pilha: ${s.e.name(l)}`)), `${code}: gatilho na pilha\n${s.log()}`);
  }
});

// ───────────────────────────── VEN-166 Threshold of the Gray ─────────────────────────────
test('Threshold of the Gray: o [Add] resolve assim que é finalizado, sem ficar na pilha (429.2)', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-166', 1);
  const atk = s.put(0, UNIT, base(0));
  s.put(1, YORDLE, BF0);
  const adds: P[] = [];
  const add0 = s.e.addResources.bind(s.e);
  s.e.addResources = (p: P, ...rest: any[]) => {
    adds.push(p);
    return (add0 as any)(p, ...rest);
  };
  s.go();
  s.pick('Mover unidades');
  s.maybeObj(atk);
  if (!s.d.root && /para onde/i.test(s.d.prompt)) s.pick('Threshold of the Gray');
  for (let i = 0; i < 10 && s.g.current && adds.length < 2; i++) s.ok([s.d.options[0].id]);
  assert.deepEqual(adds.sort(), [0, 1], s.log());
  assert.ok(!s.e.log.some((x) => x.text.includes('Na pilha: Threshold')), 'não passa pela pilha\n' + s.log());
});

// ───────────────────────────── VEN-158 Heisho, Shell of the World ─────────────────────────────
test('Heisho: spell que escolhe algo aqui ignora TODO o Deflect, também de alvos em outro lugar (FAQ do Vendetta)', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-158');
  const here = s.put(1, YORDLE, BF0);
  const away = s.put(1, YORDLE, BF1);
  s.e.giveKw(away, { deflect: 2 }, 'turn');
  s.go();
  assert.equal(s.e.deflectCost([[here.id, away.id]], 0).power.length, 0);
  assert.equal(s.e.deflectCost([[away.id]], 0).power.length, 2, 'sem nada aqui, paga');
});

// ───────────────────────────── VEN-146 Siphoning Strike ─────────────────────────────
test('Siphoning Strike: "quando ela morrer" vale só para o mesmo objeto (se sair e voltar, é outro, 124)', () => {
  const s = new Scenario();
  const foe = s.put(1, UNIT, BF0);
  const sp = s.put(0, 'VEN-146', 'hand');
  s.runes(0, rs(RUNE.calm, 4));
  s.go();
  s.pick('Jogar Siphoning Strike');
  drain(s);
  assert.equal(foe.damage, 4, s.log());
  const d = s.e.delayed.find((x) => x.sourceId === sp.id)!;
  const c = s.e.ctx(sp, 0);
  // morre direto do tabuleiro: dispara
  assert.equal(d.cond!(c, { type: 'die', obj: foe, snap: { ...foe } }), true);
  // voltou para a mão e foi jogada de novo: outro objeto, não dispara
  assert.equal(d.cond!(c, { type: 'die', obj: foe, snap: { ...foe, zoneVersion: foe.zoneVersion + 2 } }), false);
});

test('Siphoning Strike: com 7+ runas causa 7; a unidade morre e canaliza 1 runa exausta', () => {
  const s = new Scenario();
  const foe = s.put(1, UNIT, BF0);
  s.put(0, 'VEN-146', 'hand');
  s.runes(0, rs(RUNE.calm, 7));
  s.go();
  const runes0 = s.e.runesOf(0).length;
  s.pick('Jogar Siphoning Strike');
  drain(s);
  assert.equal(foe.zone, 'trash', s.log());
  assert.equal(s.e.runesOf(0).length, runes0 + 1, s.log());
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 5, '4 pagas + a canalizada exausta');
});

// ───────────────────────────── VEN-160 Mystic Vortex (conferência) ─────────────────────────────
test('Mystic Vortex: spell com [Reaction] na mão custa [Rune] a mais só em showdown aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-160', 0);
  const reb = s.put(0, 'VEN-152', 'hand'); // Rebuttal [1][Rune], [Reaction]
  assert.equal(s.e.minCostFor(0, reb, 'hand').power.length, 1);
  s.e.showdown = { bf: 1, combat: false, focus: 0 } as any;
  assert.equal(s.e.minCostFor(0, reb, 'hand').power.length, 1, 'showdown em outro campo');
  s.e.showdown = { bf: 0, combat: false, focus: 0 } as any;
  assert.equal(s.e.minCostFor(0, reb, 'hand').power.length, 2);
  s.e.showdown = null;
});

// ───────────────────────────── VEN-161 Piltovan Forge (caso sem ruling) ─────────────────────────────
test('Piltovan Forge: usar uma Gold (habilidade ativada de gear) gasta o desconto do turno; o jogador escolhe se usa a Gold', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-161', 0);
  const tome = s.put(0, 'VEN-054', base(0)); // Questionable Tome
  tome.empowered = true;
  const gold = s.put(0, 'TOK-GOLD', base(0));
  s.put(0, 'VEN-148', 'hand'); // Shadow Dash [2][Rune]
  s.put(0, YORDLE, BF0);
  const foe = s.put(1, YORDLE, base(1));
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  const draw = (s.e.script(tome).activated || [])[0];
  assert.equal(s.e.abilityCostOptions(0, tome, draw, E(1))[0].energy, 0, 'ainda é a primeira');
  s.autoPay = false;
  s.pick('Jogar Shadow Dash');
  s.maybeObj(foe);
  if (/para qual campo/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  assert.match(s.d.prompt, /Como pagar/, 'Gold ou runa: escolha do jogador');
  assert.ok(s.d.options.some((o) => o.label.includes('Gold')));
  s.pick('Gold');
  s.autoPay = true;
  assert.equal(gold.zone !== 'board', true, s.log());
  assert.equal(s.e.abilityCostOptions(0, tome, draw, E(1))[0].energy, 1, 'a Gold foi a primeira habilidade de gear do turno');
});
