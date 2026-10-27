// Revisão independente (2ª) do lote calm do Spiritforged (SFD-031 a SFD-060). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);

test('Svellsongur: copia a substituição de Void Hatchling — cada instância olha o topo antes de revelar (370.2)', () => {
  const s = new Scenario();
  const vh = s.put(0, 'SFD-018', base(0)); // Void Hatchling: "se você fosse revelar... olhe o topo, pode reciclar"
  const sv = s.put(0, 'SFD-059', base(0));
  s.e.attach(sv, vh);
  const smith = s.put(0, 'SFD-041', base(0)); // Apprentice Smith: ao mover, revela o topo
  const gear = s.put(0, 'SFD-052', 'deckTop');
  const b = s.put(0, 'OGN-065', 'deckTop');
  const a = s.put(0, 'OGN-052', 'deckTop'); // topo: a, b, gear
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([smith.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick('Campo Vazio A');
  s.passAll();
  // 1ª instância (impressa): olha a; recicla
  assert.ok(s.d.prompt.includes('Void Hatchling') && s.d.prompt.includes(s.e.name(a)), s.d.prompt);
  s.pick('Sim');
  // 2ª instância (cópia do Svellsongur): olha b; recicla
  assert.ok(s.d.prompt.includes('Void Hatchling') && s.d.prompt.includes(s.e.name(b)), s.d.prompt + '\n' + s.log());
  s.pick('Sim');
  s.passAll();
  // revela o gear e o Apprentice Smith o compra
  assert.equal(gear.zone, 'hand', s.log());
  const deck = s.e.pl[0].mainDeck;
  assert.ok(deck.indexOf(a.id) >= deck.length - 2 && deck.indexOf(b.id) >= deck.length - 2, 'recicladas para o fundo');
});

test('Not So Fast: anula spell inimigo cuja execução extra de um 2º Repeat escolhe uma unidade aliada (820.3)', () => {
  const s = new Scenario();
  const own = s.put(0, 'OGN-052', base(0));
  const mine = s.put(1, 'OGN-065', BF0); // aliada de B
  s.put(0, 'SFD-078', base(0)); // Temporal Portal: o próximo spell ganha Repeat igual ao custo
  s.put(0, 'SFD-034', 'hand'); // Feral Strength: [Repeat][2], +2 de Might a uma unidade
  s.runes(0, calm(8));
  s.put(1, 'SFD-045', 'hand');
  s.runes(1, calm(3));
  s.go();
  s.pick('Temporal Portal');
  s.passAll();
  s.pick('Jogar Feral Strength');
  s.pickObj(own); // execução normal: unidade de A
  s.pick('Sim'); // Repeat impresso
  s.pickObj(own);
  s.pick('Sim'); // 2º Repeat (Temporal Portal)
  s.pickObj(mine); // só a 3ª execução escolhe a unidade de B
  assert.equal(s.d.player, 1, s.d.prompt + '\n' + s.log(30));
  s.pick('Jogar Not So Fast');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('Feral Strength foi anulado')), s.log(20));
  assert.equal(s.e.might(mine), s.e.data(mine).might, 'nenhuma execução aconteceu');
  assert.equal(s.e.might(own), s.e.data(own).might);
});

test("Sterak's Gage (Quick-Draw): a unidade é alvo, escolhida ao pôr o gatilho na pilha — Irelia, Fervent ganha +1 (RiftJudge #3886, #10749)", () => {
  const s = new Scenario();
  const ir = s.put(0, 'SFD-057', base(0));
  s.put(0, 'OGN-052', base(0));
  const sg = s.put(0, 'SFD-056', 'hand');
  s.runes(0, calm(5));
  s.go();
  s.pick("Jogar Sterak's Gage");
  for (let i = 0; i < 6 && !s.d.prompt.startsWith('Quick-Draw'); i++) s.pick('Passar');
  assert.ok(s.d.prompt.startsWith('Quick-Draw'), s.d.prompt);
  assert.ok(s.e.chain.every((it) => !it.label.includes('Quick-Draw')), 'escolhe antes de ir para a pilha');
  s.pickObj(ir);
  if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
  s.passAll();
  assert.equal(sg.attachedTo, ir.id, s.log());
  assert.equal(s.e.might(ir), 4 + 3 + 1, 'Might Bonus +3 e +1 por ser escolhida');
});

test('Quick-Draw: se a unidade escolhida sai antes de o gatilho resolver, o gatilho erra o alvo e o gear fica solto', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-052', base(0));
  const b = s.put(0, 'OGN-065', base(0));
  const sg = s.put(0, 'SFD-056', 'hand');
  s.runes(0, calm(5));
  s.put(1, 'SFD-034', 'hand'); // B tem uma Reaction (para ter a vez de responder)
  s.runes(1, calm(2));
  s.go();
  s.pick("Jogar Sterak's Gage");
  for (let i = 0; i < 6 && !s.d.prompt.startsWith('Quick-Draw'); i++) s.pick('Passar');
  s.pickObj(a);
  assert.ok(s.e.chain.some((it) => it.label.includes('Quick-Draw') && it.targetIds.flat().includes(a.id)), 'alvo escolhido na pilha');
  s.e.kill(a); // a unidade sai em resposta
  s.go();
  s.passAll();
  assert.equal(sg.zone, 'board');
  assert.equal(sg.attachedTo, undefined, 'não escolhe outra unidade ao resolver\n' + s.log());
  assert.equal(b.attached, undefined);
});
