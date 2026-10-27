// Revisão independente do Spiritforged, lotes body e chaos (SFD-091..SFD-150), e Mystic Reversal com Repeat múltiplo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;
const B = RUNE.body;
const CALM = RUNE.calm;

test('Mystic Reversal: refaz as escolhas de TODAS as execuções de um spell com 2 instâncias de Repeat pagas (FAQ #8801)', () => {
  const s = new Scenario();
  const e = s.e;
  // unidades de B na base; um aliado dele no campo B (destino do Temptation de A)
  const a = [s.put(1, 'OGN-175', base(1)), s.put(1, 'OGN-175', base(1)), s.put(1, 'OGN-175', base(1))];
  s.put(1, 'OGN-136', BF1);
  // unidades de A na base; um aliado dele no campo A (destino depois do roubo)
  const b = [s.put(0, 'OGN-175', base(0)), s.put(0, 'OGN-175', base(0)), s.put(0, 'OGN-175', base(0))];
  s.put(0, 'OGN-065', BF0);
  s.put(0, 'SFD-129', 'hand');
  e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: { energy: 1, power: [] } });
  s.runes(0, [C, C, C, C, C]); // 2 + Repeat [2] + Repeat [1]
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, Array(7).fill(CALM));
  s.go();
  s.pick('Jogar Temptation');
  s.pickObj(a[0]);
  s.pick('Sim'); // 1º Repeat
  s.pickObj(a[1]);
  s.pick('Sim'); // 2º Repeat
  s.pickObj(a[2]);
  for (let i = 0; i < 3; i++) if (/para onde/.test(s.d.prompt)) s.pick('Campo Vazio B');
  const item = e.chain[e.chain.length - 1];
  assert.equal(item.moreRepeats?.length, 1, 'duas instâncias de Repeat pagas');
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  for (let r = 0; r < 3; r++) {
    assert.match(s.d.prompt, new RegExp(`novo\\(s\\) alvo.*\\(${r + 1}ª execução\\)`), s.d.prompt);
    s.pick('Sim');
    s.pickObj(b[r]);
  }
  for (let i = 0; i < 3; i++) if (/para onde/.test(s.d.prompt)) s.pick('Campo Vazio A');
  s.passAll();
  for (const u of b) assert.deepEqual(u.loc, BF0, 'as três execuções usam as novas escolhas\n' + s.log(30));
  for (const u of a) assert.deepEqual(u.loc, base(1));
});

test('Buhru Captain: "você pode" ao pôr na pilha; comprar ou Buff só na resolução (383.3.a.1, 355.17)', () => {
  const s = new Scenario();
  const cap = s.put(0, 'SFD-091', 'hand');
  s.runes(0, [B, B, B]);
  s.put(1, 'SFD-106', 'hand'); // B tem uma Reaction: a pilha para na prioridade
  s.runes(1, [B, B, B]);
  s.go();
  s.pick('Jogar Buhru Captain');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  assert.match(s.d.prompt, /usar a habilidade/);
  assert.deepEqual(s.d.options.map((o) => o.label).sort(), ['Não', 'Sim']);
  s.pick('Sim');
  assert.equal(s.d.kind, 'priority', 'nenhuma escolha de modo ao pôr na pilha: ' + s.d.prompt + ' ' + s.log(5));
  // antes de resolver, o Buhru sai do tabuleiro: na resolução o jogador ainda escolhe comprar
  s.e.returnToHand(cap);
  const hand = s.e.pl[0].hand.length;
  s.passAll();
  assert.match(s.d.prompt, /comprar 1 ou me dar um Buff/);
  s.pick('Comprar 1');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand + 1);
});

test('Fae Porter: não oferece mover a si mesmo nem unidade que já está no campo de destino', () => {
  const s = new Scenario();
  const fp = s.put(0, 'SFD-125', base(0));
  const there = s.put(0, 'OGN-175', BF0);
  const a1 = s.put(0, 'OGN-175', base(0));
  const a2 = s.put(0, 'OGN-136', base(0));
  s.runes(0, [C]);
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([fp.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick('Campo Vazio A');
  s.pick('Sim');
  const ids = s.d.options.map((o) => o.obj ?? o.id);
  assert.ok(!ids.includes(fp.id) && !ids.includes(there.id), s.d.prompt + ' ' + JSON.stringify(s.d.options));
  assert.ok(ids.includes(a1.id) && ids.includes(a2.id));
  s.pickObj(a2);
  s.passAll(5);
  assert.deepEqual(a2.loc, BF0);
  assert.deepEqual(a1.loc, base(0));
});

test('Ruin Runner: alvo que passa a ser inimigo do controlador do spell erra o alvo (758.1)', () => {
  const s = new Scenario();
  const rr = s.put(0, 'SFD-105', base(0));
  s.put(1, 'OGN-175', base(1)); // outra unidade: há outra escolha possível para B
  s.put(0, 'SFD-097', 'hand'); // Punch First
  s.runes(0, [B, B, B]);
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, Array(7).fill(CALM));
  s.go();
  const m0 = s.e.might(rr);
  s.pick('Jogar Punch First');
  s.maybeObj(rr);
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  assert.match(s.d.prompt, /novo\(s\) alvo/);
  s.pick('Não'); // B mantém o Ruin Runner como alvo
  s.passAll();
  assert.equal(s.e.might(rr), m0, 'Ruin Runner não pode ser escolhida por spell inimigo: erra o alvo\n' + s.log(20));
});

/** Esconde uma carta de p num campo que ele controla (escondida num turno anterior). */
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

test('Black Market Broker: spell escondido roubado por Mystic Reversal ainda foi jogado por quem o jogou (FAQ #8801, #8138)', () => {
  const s = new Scenario();
  s.put(0, 'SFD-121', base(0)); // Broker de A
  const u = s.put(0, 'OGN-175', BF0);
  s.put(0, 'OGN-136', BF0);
  hideAt(s, 0, 'SFD-145', 0); // Switcheroo escondido
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, Array(7).fill(CALM));
  s.go();
  s.pick('Jogar Switcheroo (escondida');
  s.pickObj(u);
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  for (let i = 0; i < 4 && /novo|refazer|destino/.test(s.d.prompt); i++) s.pick('Não');
  s.passAll();
  const gold = s.e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.equal(gold.length, 1, 'A jogou o spell escondido: o Broker dele dá o Gold\n' + s.log(20));
});

void BF1;
