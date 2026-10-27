// Revisão independente do lote mind do Unleashed (UNL-061..UNL-090): um teste por erro achado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const MIND = 'OGN-089';
const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const mind = (n: number) => Array.from({ length: n }, () => MIND);
/** Passa a prioridade e ordena gatilhos simultâneos até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 60 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** O oponente tem uma [Reaction] e runas: recebe a prioridade (o motor não passa sozinho por ele). */
function canReact(s: Scenario) {
  s.put(1, 'UNL-061', 'hand');
  s.runes(1, mind(2));
}
/** Esvazia o deck de p e põe cartas conhecidas (a primeira da lista fica no topo). */
function deck(s: Scenario, p: P, codes: string[]): Obj[] {
  const e = s.e;
  for (const id of [...e.pl[p].mainDeck]) e.toZone(e.objs[id], 'trash');
  e.pl[p].trash = [];
  const out: Obj[] = [];
  for (const c of [...codes].reverse()) out.unshift(s.put(p, c, 'deckTop'));
  return out;
}
/** Movimento padrão (a unidade tem de estar pronta). */
function move(s: Scenario, us: Obj[], dest: string) {
  for (const u of us) u.exhausted = false;
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(us.map((u) => u.id));
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}

// ───────────────────────────── Eclipse ─────────────────────────────
// Erro: com o alvo ilegal o spell não resolvia e o [Predict] se perdia. Regra 359.3.e.1/359.3.e.5 (exemplo do Void Seeker:
// "Void Seeker's controller still draws 1").
test('Eclipse: alvo ilegal na resolução — o Predict acontece mesmo assim (359.3.e.5)', () => {
  const s = new Scenario();
  const e = s.e;
  const v = s.put(1, 'OGN-001', BF0);
  deck(s, 0, ['OGN-001', 'OGN-001']);
  s.put(0, 'UNL-063', 'hand');
  s.runes(0, mind(3));
  canReact(s);
  s.go();
  s.pick('Jogar Eclipse');
  s.maybeObj(v);
  e.toZone(v, 'hand'); // em resposta, a unidade sai do tabuleiro
  s.go();
  s.passAll();
  assert.match(s.d.prompt, /Predict/, s.log());
});

// ───────────────────────────── Smoke and Mirrors ─────────────────────────────
// Erro: com os dois alvos ilegais o spell não resolvia e o "Compre 1" se perdia (359.3.e.5).
test('Smoke and Mirrors: as duas unidades saem do tabuleiro — ainda compra 1 (359.3.e.5)', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-001', base(0));
  const sp = e.createToken('TOK-SPRITE', 0, BF0, true);
  e.bfs[0].controller = 0;
  deck(s, 0, ['OGN-001', 'OGN-001']);
  s.put(0, 'UNL-083', 'hand');
  s.runes(0, mind(2));
  canReact(s);
  s.go();
  s.pick('Jogar Smoke and Mirrors');
  s.pickObj(a);
  s.maybeObj(sp);
  e.toZone(a, 'hand');
  e.toZone(sp, 'trash');
  s.go();
  const before = e.pl[0].hand.length;
  s.passAll();
  assert.equal(e.pl[0].hand.length, before + 1, s.log());
});

// ───────────────────────────── Crescent Strike ─────────────────────────────
// Erro: oferecia campos sem unidade inimiga, escolha que torna a escolha seguinte ilegal (355.16).
test('Crescent Strike: só oferece campos com unidade inimiga (355.16)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'OGN-001', BF0);
  s.put(1, 'OGN-001', BF0);
  s.put(0, 'OGN-001', { t: 'bf', i: 1 });
  s.put(0, 'UNL-072', 'hand');
  s.runes(0, mind(4));
  s.go();
  s.pick('Jogar Crescent Strike');
  // com um só campo válido a escolha é automática; se perguntar, o campo sem inimigos não pode estar entre as opções
  if (/campo de batalha/.test(s.d.prompt)) assert.ok(!s.d.options.some((o) => o.label.includes(e.name(e.bfs[1].objId))), s.d.options.map((o) => o.label).join('|'));
  assert.match(s.d.prompt, /4 de dano/);
});

// ───────────────────────────── Keeper of Masks ─────────────────────────────
// Erro: "Then do this: They become copies of me" (errata de 03/04/2026) é um gatilho reflexivo (387.1) que vai para a
// pilha depois de as fichas entrarem; o script copiava na mesma resolução (FAQ oficial do Unleashed, Zilean/Deceiver:
// "the copy effect resolves after the Reflection tokens have already resolved").
test('Keeper of Masks: "Então faça isto" vai para a pilha; se o Keeper sai antes, as Reflection não copiam', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-001', BF0);
  const k = s.put(0, 'UNL-081', 'hand');
  s.runes(0, mind(2));
  canReact(s);
  s.go();
  s.pick('Jogar Keeper of Masks');
  if (s.g.current && /onde/.test(s.d.prompt)) s.pick(e.name(e.bfs[0].objId));
  for (let i = 0; i < 10 && !e.chain.some((x) => /se tornam cópias/.test(x.label)); i++) {
    if (s.d.kind === 'priority') s.pick('Passar');
    else break;
  }
  const refl = e.units().filter((u) => u.code === 'TOK-REFLECTION');
  assert.equal(refl.length, 2, s.log() + ' | ' + s.d.kind + ' ' + s.d.prompt);
  assert.ok(e.chain.some((x) => /se tornam cópias/.test(x.label)), 'o reflexivo está na pilha');
  assert.ok(refl.every((t) => e.name(t) === 'Reflection'), 'antes do reflexivo, ainda são Reflection');
  e.toZone(k, 'hand'); // em resposta, o Keeper sai do tabuleiro
  s.go();
  drain(s);
  assert.ok(refl.every((t) => t.zone === 'board' && e.name(t) === 'Reflection' && e.might(t) === 0), s.log());
});

// ───────────────────────────── Hwei, Brooding Painter ─────────────────────────────
// Erro: "do the following based on the discarded card's type" são gatilhos reflexivos (387.1.b), um por tipo, que vão
// para a pilha na ordem que o jogador escolher; as runas são escolhidas (alvos) ao finalizar o reflexivo, e qualquer
// runa pode ser escolhida (FAQ oficial do Vendetta, Hwei + Patched Porobot).
// mudou (microdetalhes UNL): um reflexivo que cria vários itens cria todos em ordem (388.2), e itens não simultâneos vão
// para a pilha na ordem de adição (337.1.b): o do Gear (impresso antes) vai primeiro, sem pergunta de ordem.
test('Hwei: descartar Unit Gear põe dois reflexivos na pilha, na ordem impressa; runa pronta pode ser alvo', () => {
  const s = new Scenario();
  const e = s.e;
  const h = s.put(0, 'UNL-080', base(0));
  deck(s, 0, ['OGN-001', 'OGN-001']);
  const pb = s.put(0, 'VEN-058', 'hand');
  const ex = s.put(0, MIND, base(0), { ready: false });
  const rd = s.put(0, MIND, base(0), { ready: true });
  canReact(s);
  move(s, [h], e.name(e.bfs[0].objId));
  drain(s);
  s.pickObj(pb);
  assert.match(s.d.prompt, /runas/, 'o reflexivo do Gear é finalizado primeiro, sem pergunta de ordem');
  assert.ok(s.d.options.some((o) => o.obj === rd.id), 'runa pronta também é alvo válido');
  s.ok([ex.id, rd.id]);
  assert.equal(e.chain.length >= 2, true, 'os dois reflexivos estão na pilha');
  drain(s);
  assert.equal(ex.exhausted, false);
  assert.equal(e.might(h), 8);
});

// ═════════════════════ revisão 2 (independente) ═════════════════════
const BF1 = { t: 'bf', i: 1 } as const;
/** Ficha no tabuleiro sem mexer na disputa do campo (o campo passa a ser de p). */
function tok(s: Scenario, p: P, code: string, loc: { t: 'bf'; i: number } | { t: 'base'; p: P }): Obj {
  const o = s.e.createToken(code, p, loc, true);
  if (loc.t === 'bf') {
    s.e.bfs[loc.i].controller = p;
    s.e.bfs[loc.i].contestedBy = null;
  }
  return o;
}

// ───────────────────────────── LeBlanc, Everywhere at Once ─────────────────────────────
// Erro: bloqueava o Temporary das suas unidades em QUALQUER campo (e mesmo com ela na base). O texto impresso (arte
// UNL-090), o catálogo oficial da Riot e a resposta verificada do RiftJudge #9863 dizem "at my battlefield".
test('LeBlanc, Everywhere at Once: só o Temporary no campo DELA não dispara; noutro campo e na base, dispara', () => {
  const s = new Scenario();
  const e = s.e;
  const lb = s.put(0, 'UNL-090', BF0);
  e.bfs[0].controller = 0;
  const here = tok(s, 0, 'TOK-SPRITE', BF0);
  const other = tok(s, 0, 'TOK-SPRITE', BF1);
  const atBase = tok(s, 0, 'TOK-SPRITE', base(0));
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(here.zone, 'board', 'no campo da LeBlanc o Temporary não dispara');
  assert.equal(other.zone, 'gone', 'noutro campo dispara: ' + s.log());
  assert.equal(atBase.zone, 'gone');
  assert.equal(lb.zone, 'board');
});
test('LeBlanc, Everywhere at Once na base: não tem campo, não bloqueia nada', () => {
  const s = new Scenario();
  s.put(0, 'UNL-090', base(0));
  const sp = tok(s, 0, 'TOK-SPRITE', BF0);
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  s.pick('Encerrar o turno');
  drain(s);
  assert.equal(sp.zone, 'gone', s.log());
});

// ───────────────────────────── Diana, Lunari ─────────────────────────────
// Erro: quando o showdown que começa abre um combate, o gatilho da Diana (efeito de início de showdown, 464.2.b) era
// posto na pilha junto com os gatilhos de ataque/defesa (464.2.e), na ordem atacante → defensor: com a Diana do
// defensor, ela ficava por cima e resolvia antes do ataque. Ela já está na pilha antes das designações e resolve por
// último (334.1, 340.1; riftboundfaq.com/cards/diana-lunari #trigger-resolution-order).
test('Diana, Lunari: num combate que abre, o gatilho dela fica abaixo dos gatilhos de ataque (resolve por último)', () => {
  const s = new Scenario();
  const e = s.e;
  const ar = s.put(0, 'UNL-065', base(0));
  const d = s.put(1, 'UNL-079', BF0);
  e.bfs[0].controller = 1;
  deck(s, 1, ['UNL-063', 'OGN-001']);
  s.runes(0, mind(1));
  s.runes(1, mind(1));
  move(s, [ar], e.name(e.bfs[0].objId));
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (/Icevale Archer|Diana/.test(s.d.prompt) && s.d.options.some((o) => o.label === 'Sim')) s.pick('Sim');
    else if (/qual unidade/.test(s.d.prompt)) s.pickObj(d);
    else if (/Predict/.test(s.d.prompt)) s.ok([]);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
  const res = e.log.map((l) => l.text).filter((t) => t.startsWith('Resolve: '));
  const iD = res.findIndex((t) => /Diana/.test(t));
  const iA = res.findIndex((t) => /Icevale/.test(t));
  assert.ok(iD >= 0 && iA >= 0, s.log(30));
  assert.ok(iA < iD, 'o ataque resolve antes da Diana: ' + res.join(' | '));
});

// ───────────────────────────── Spectral Centaur ─────────────────────────────
// Erro de dados: Might 6 e sem a tag Spirit. Arte UNL-068 e catálogo oficial da Riot: Might 5, Shadow Isles + Spirit.
test('Spectral Centaur: Might impresso 5 e tag Spirit', () => {
  const s = new Scenario();
  const e = s.e;
  const c = s.put(0, 'UNL-068', base(0));
  assert.equal(e.might(c), 5);
  assert.ok(e.hasTag(c, 'Spirit'));
  assert.ok(e.hasTag(c, 'Shadow Isles'));
});
