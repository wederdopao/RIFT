// Revisão independente do Radiance, intervalo RAD-043..RAD-063: um teste por erro achado (e algumas confirmações).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5 (Fury)

/** Passa a prioridade e ordena gatilhos simultâneos até chegar numa decisão que não é de passar. */
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function where(s: Scenario, label = 'base') {
  if (s.d.prompt.includes('onde?')) s.pick(label);
}
function move(s: Scenario, u: { id: string }, label: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([u.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick(label);
}

// ───────────────────────────── RAD-059 Supernova ─────────────────────────────
test('Supernova: com o alvo ilegal na resolução, ainda compra 2 (359.3.e.5)', () => {
  const s = new Scenario();
  const foe = s.put(1, UNIT, BF0);
  s.put(0, 'RAD-059', 'hand');
  s.runes(0, rs(MIND, 10));
  for (let k = 0; k < 3; k++) s.put(0, UNIT, 'deckTop');
  s.put(1, 'RAD-048', 'hand'); // High Note (Reaction) na mão de B: a pilha para na prioridade
  s.runes(1, rs(MIND, 3));
  s.go();
  s.pick('Jogar Supernova');
  s.maybeObj(foe);
  const before = s.e.pl[0].hand.length;
  s.e.returnToHand(foe); // o alvo sai do tabuleiro antes de o spell resolver
  s.go();
  drain(s);
  assert.equal(s.e.pl[0].hand.length, before + 2, s.log());
});

// ───────────────────────────── RAD-043 Riven, Broken Blade ─────────────────────────────
test('Riven: pode escolher "gastar meu buff para me preparar" sem buff; o buff é gasto na resolução', () => {
  const s = new Scenario();
  const r = s.put(0, 'RAD-043', BF0);
  s.put(1, 'RAD-048', 'hand'); // High Note (Reaction) na mão de B: a pilha para na prioridade
  s.runes(1, rs(MIND, 3));
  s.go();
  move(s, r, 'base');
  assert.ok(s.d.options.some((o) => o.label.includes('me preparar')), s.d.prompt + ' ' + s.d.options.map((o) => o.label).join('|'));
  s.pick('me preparar');
  r.buffs = 1; // ganha um buff antes de o gatilho resolver
  drain(s);
  assert.equal(r.exhausted, false, s.log());
  assert.equal(r.buffs, 0, s.log());
});

test('Riven: ao sair e voltar ao tabuleiro é outro objeto; os modos do turno recomeçam (124.1)', () => {
  const s = new Scenario();
  const r = s.put(0, 'RAD-043', BF0);
  s.go();
  move(s, r, 'base'); // sem buff e sem inimigos, "Buff em mim" é o único modo útil... os três são oferecidos
  s.pick('Dar Buff');
  drain(s);
  assert.equal(r.buffs, 1, s.log());
  s.e.returnToHand(r);
  s.e.putOnBoard(r, BF0, true);
  s.go();
  move(s, r, 'base');
  assert.ok(s.d.options.some((o) => o.label.includes('Dar Buff')), s.d.prompt + ' ' + s.d.options.map((o) => o.label).join('|'));
});

// ───────────────────────────── RAD-044 Hunting Blind ─────────────────────────────
test('Hunting Blind: o movimento com custo aplicado (Gravity Field) pergunta se paga (204.4.c)', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0); // A controla o campo 0
  s.put(1, 'RAD-062', BF0); // Gravity Field do oponente ainda no campo
  s.e.bfs[0].controller = 0;
  const foe = s.put(1, UNIT, base(1));
  s.put(0, 'RAD-044', 'hand');
  s.runes(0, rs(RUNE.calm, 8));
  s.go();
  s.pick('Jogar Hunting Blind');
  where(s, 'Campo Vazio A');
  if (/Mover uma unidade inimiga/.test(s.d.prompt)) s.pick('Sim');
  s.maybeObj(foe);
  drain(s);
  assert.match(s.d.prompt, /custo aplicado/, s.log());
  s.pick('Não');
  drain(s);
  assert.equal(foe.loc?.t, 'base', s.log());
});

// ───────────────────────────── RAD-057 Piltovan Guidebot (confirmação) ─────────────────────────────
test('Piltovan Guidebot: dispara com a própria jogada (383.2.c.1) e o Might base vira 4', () => {
  const s = new Scenario();
  const gb = s.put(0, 'RAD-057', 'hand');
  s.runes(0, rs(MIND, 4));
  s.go();
  s.pick('Jogar Piltovan Guidebot');
  where(s);
  drain(s);
  if (s.d.prompt.includes('Guidebot')) s.pick('Sim');
  drain(s);
  assert.equal(s.e.might(gb), 4, s.log());
});

// ───────────────────────────── RAD-052 Resource Extractor ─────────────────────────────
test('Resource Extractor: se sai do tabuleiro antes de o gatilho resolver, não joga Gold (359.3.f.2)', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0);
  const ex = s.put(0, 'RAD-052', BF0);
  s.e.bfs[0].controller = 0;
  s.put(1, 'RAD-048', 'hand'); // High Note (Reaction) na mão de B: a pilha para na prioridade
  s.runes(1, rs(MIND, 3));
  s.go();
  s.pick('Encerrar o turno');
  for (let i = 0; i < 10 && !/Resource Extractor|Gold/.test(s.e.chain.map((x) => x.label).join()); i++) drain(s);
  assert.ok(s.e.chain.some((x) => /Gold/.test(x.label)), s.log());
  s.e.toZone(ex, 'trash'); // a fonte sai antes de resolver
  s.go();
  drain(s);
  assert.equal(s.e.board().filter((o) => o.code === 'TOK-GOLD').length, 0, s.log());
});

test('Resource Extractor: controlando o campo no fim do turno, joga uma Gold exausta', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0);
  s.put(0, 'RAD-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  const gold = s.e.board().filter((o) => o.code === 'TOK-GOLD' && o.controller === 0);
  assert.equal(gold.length, 1, s.log());
  assert.equal(gold[0].exhausted, true);
});

// ───────────────────────────── RAD-063 Kai'Sa, Rebel (confirmação) ─────────────────────────────
test("Kai'Sa, Rebel: no showdown dela, um spell sem Reaction pode ser jogado como Reaction", () => {
  const s = new Scenario();
  const k = s.put(0, 'RAD-063', base(0));
  s.put(1, UNIT, BF0);
  s.put(0, 'RAD-059', 'hand'); // Supernova: spell sem palavra-chave de timing
  s.runes(0, rs(MIND, 10));
  s.put(1, 'RAD-048', 'hand');
  s.runes(1, rs(MIND, 3));
  s.go();
  move(s, k, 'Campo Vazio A');
  let seen = false;
  for (let i = 0; i < 30 && s.g.current && !seen; i++) {
    if (s.d.options.some((o) => o.label.includes('Jogar Supernova'))) seen = true;
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.options.length) s.ok([s.d.options[0].id]);
  }
  assert.ok(seen, s.log());
  assert.ok(s.e.showdown, 'durante o showdown');
});

// ───────────────────────────── RAD-045 K'Sante, Dauntless (confirmação) ─────────────────────────────
test("K'Sante: ao atacar, dobra o Shield de uma unidade sua aqui neste turno", () => {
  const s = new Scenario();
  const k = s.put(0, 'RAD-045', base(0));
  s.put(1, 'VEN-117', BF0); // Disciple of Shen 1/1
  s.go();
  move(s, k, 'Campo Vazio A');
  for (let i = 0; i < 10 && s.g.current && (s.e.kw(k).shield || 0) < 2; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.options.some((o) => o.obj === k.id)) s.pickObj(k);
    else break;
  }
  assert.equal(s.e.kw(k).shield, 2, s.log());
});
