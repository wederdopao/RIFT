// Caça de bugs "texto/dados × motor": o motor ou um script deduzindo algo do texto/dados da carta em vez da regra,
// ou aplicando um efeito ao objeto errado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Distribuir dano')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────── "carta com [Hidden]" = carta que TEM Hidden, não carta cujo texto cita [Hidden] ─────────
// Ember Monk ("When you play a card from [hidden]"), Noxus Saboteur ("Your opponents' [HIDDEN] cards...") e a própria
// Ava Achiever citam [Hidden] no texto sem ter a palavra-chave.

test('Guerilla Warfare: só cartas que têm Hidden podem voltar do descarte (não Ember Monk nem Noxus Saboteur)', () => {
  const s = new Scenario();
  s.runes(0, [RUNE.chaos, RUNE.chaos, MIND]);
  const block = s.put(0, 'OGN-057', 'trash'); // Block: Hidden
  const monk = s.put(0, 'OGN-167', 'trash'); // Ember Monk: cita [hidden]
  const sab = s.put(0, 'OGN-018', 'trash'); // Noxus Saboteur: cita [HIDDEN]
  const ava = s.put(0, 'OGN-107', 'trash'); // Ava Achiever: cita [Hidden]
  s.put(0, 'OGN-264', 'hand');
  s.go();
  s.pick('Jogar Guerilla Warfare');
  const ids = s.d.options.map((o) => o.obj ?? o.id);
  assert.ok(ids.includes(block.id), 'Block (Hidden) é alvo válido');
  for (const o of [monk, sab, ava]) assert.ok(!ids.includes(o.id), `${s.e.name(o)} não tem Hidden`);
});

test('Ava Achiever: Ember Monk na mão não é "carta com Hidden"', () => {
  const s = new Scenario();
  const ava = s.put(0, 'OGN-107', base(0));
  s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-167', 'hand'); // Ember Monk
  s.runes(0, [MIND]);
  s.go();
  moveTo(s, [ava.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Ava Achiever'); i++) s.pick('Passar');
  s.pick('Sim');
  drain(s);
  assert.ok(s.e.log.some((l) => l.text.includes('nenhuma carta com Hidden')), s.log(20));
  assert.equal(s.e.units().some((u) => u.code === 'OGN-167'), false, 'Ember Monk não foi jogada de graça');
});

test('Teemo, Strategist: Ember Monk e Noxus Saboteur revelados não contam como cartas com Hidden', () => {
  const s = new Scenario();
  s.put(1, 'OGN-121', BF0);
  const atk = s.put(0, 'OGN-088', base(0)); // Mega-Mech 8
  s.put(1, 'OGN-167', 'deckTop');
  s.put(1, 'OGN-018', 'deckTop');
  s.put(1, 'OGN-057', 'deckTop'); // Block: Hidden
  s.put(1, 'OGN-107', 'deckTop');
  s.put(1, 'OGN-088', 'deckTop');
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  drain(s);
  assert.ok(s.e.log.some((l) => l.text.includes('1 com Hidden')), s.log(30));
});

// ───────── Heimerdinger: "[Tap] abilities of friendly legends" inclui as que a lenda TEM, não só as impressas ─────────
test('Heimerdinger + Forge of the Fluft: tem o "[Tap]: prender um Equipamento" que o campo dá à lenda', () => {
  const s = new Scenario();
  const forge = s.e.newObj('SFD-208', 0, 'battlefieldZone');
  s.e.bfs[0].objId = forge.id;
  const u = s.put(0, 'OGN-052', BF0); // A controla o campo
  const heim = s.put(0, 'OGN-111', base(0));
  const cape = s.put(0, 'SFD-190', base(0));
  s.e.legendOf(0).exhausted = true; // a lenda não pode usar; o Heimerdinger pode
  s.go();
  const opt = s.d.options.find((o) => o.label.startsWith('Heimerdinger') && o.label.includes('prender um Equipamento'));
  assert.ok(opt, s.d.options.map((o) => o.label).join(' | '));
  s.ok([opt.id]);
  s.maybeObj(cape);
  s.maybeObj(u);
  drain(s);
  assert.equal(cape.attachedTo, u.id, s.log(10));
  assert.equal(heim.exhausted, true, 'exaure o Heimerdinger, não a lenda nem o campo');
});

// ───────── "Other friendly units enter ready" é sobre unidades: não muda fichas de gear ─────────
test('Magma Wurm: as fichas Gold que o efeito manda jogar exauridas entram exauridas (Gold é gear, não unidade)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-011', base(0)); // Magma Wurm
  s.put(0, 'SFD-174', 'hand'); // Trove Golem: "play four Gold gear tokens exhausted"
  s.runes(0, Array(8).fill('OGN-214'));
  s.go();
  s.pick('Jogar Trove Golem');
  if (s.d.options.some((o) => o.label.includes('base de A'))) s.pick('base de A');
  drain(s);
  const golem = s.e.units().find((u) => u.code === 'SFD-174')!;
  assert.equal(golem.exhausted, false, 'a unidade entra pronta pelo Magma Wurm');
  const golds = s.e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.equal(golds.length, 4, s.log(20));
  assert.ok(golds.every((g) => g.exhausted), 'as Gold entram exauridas');
});
