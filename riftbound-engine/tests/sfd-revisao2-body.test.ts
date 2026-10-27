// Segunda revisão independente do Spiritforged, lote body (SFD-091..SFD-120). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const B = RUNE.body;

test('Strike Down: o equipamento a soltar é alvo escolhido ao jogar (355.10); se sair da unidade, nenhum outro é solto', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-136', BF0); // 2
  const blade = s.put(0, 'SFD-095', base(0)); // +2
  const hex = s.put(0, 'SFD-102', base(0)); // +1
  e.attach(blade, u);
  e.attach(hex, u);
  const foe = s.put(1, 'OGN-142', base(1)); // 10
  s.put(0, 'SFD-107', 'hand');
  s.runes(0, [B, B, B, B]);
  s.put(1, 'SFD-106', 'hand'); // B tem uma Reaction: a pilha para na prioridade dele
  s.runes(1, [B, B, B]);
  s.go();
  s.pick('Jogar Strike Down');
  s.maybeObj(u);
  s.maybeObj(foe);
  // a escolha do equipamento é feita agora, antes de o spell ir para a pilha
  assert.match(s.d.prompt, /soltar qual equipamento/, s.d.prompt);
  assert.deepEqual(s.d.options.map((o) => o.obj).sort(), [blade.id, hex.id].sort());
  s.pickObj(blade);
  assert.equal(s.d.kind, 'priority', s.d.prompt);
  // em resposta, o Doran's Blade sai da unidade (como um Angle Shot): ela continua equipada (Hexdrinker)
  e.detach(blade, 1);
  s.passAll();
  assert.equal(foe.damage, 3, 'a unidade (2 + Hexdrinker 1) causa o dano\n' + s.log(10));
  assert.equal(hex.attachedTo, u.id, 'o Hexdrinker não foi escolhido: continua preso');
});

test('Strike Down roubado por Mystic Reversal: o equipamento oferecido é o da nova unidade escolhida', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-136', BF0);
  const blade = s.put(0, 'SFD-095', base(0));
  e.attach(blade, u);
  const v = s.put(1, 'OGN-136', base(1)); // 2
  const hex = s.put(1, 'SFD-102', base(1)); // +1
  e.attach(hex, v);
  s.put(0, 'SFD-107', 'hand');
  s.runes(0, [B, B, B, B]);
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, Array(7).fill(RUNE.calm));
  s.go();
  s.pick('Jogar Strike Down');
  s.maybeObj(u);
  s.maybeObj(v);
  s.maybeObj(blade);
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  // B refaz as escolhas: a unidade aliada dele (v), o inimigo (u) e o equipamento a soltar (o de v)
  for (let i = 0; i < 12 && s.g.current && s.d.kind !== 'action'; i++) {
    const p = s.d.prompt;
    if (/escolher novo/.test(p)) s.pick('Sim');
    else if (/qual unidade aliada equipada/.test(p)) s.pickObj(v);
    else if (/dano em qual unidade inimiga/.test(p)) s.pickObj(u);
    else if (/soltar qual equipamento/.test(p)) {
      assert.deepEqual(s.d.options.map((o) => o.obj), [hex.id], 'só o equipamento da nova unidade');
      s.pickObj(hex);
    } else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.equal(u.damage, 3, 'v (2 + 1) causa 3 em u\n' + s.log(15));
  assert.equal(hex.attachedTo, undefined, s.log(15));
  assert.equal(blade.attachedTo, u.id);
});

test('Akshan: se ele sai antes de o roubo resolver, o equipamento preso continua na unidade inimiga (718.5.c, 435.2.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const foe = s.put(1, 'OGN-136', BF0);
  const blade = s.put(1, 'SFD-095', base(1));
  e.attach(blade, foe);
  const ak = s.put(0, 'SFD-109', 'hand');
  s.runes(0, Array(7).fill(B));
  s.put(1, 'SFD-106', 'hand'); // B tem uma Reaction: a pilha para na prioridade dele
  s.runes(1, [B, B, B]);
  s.go();
  s.pick('Jogar Akshan');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  s.pick('Sim'); // custo adicional
  for (let i = 0; i < 6 && s.d.kind !== 'priority'; i++) {
    if (s.d.prompt.startsWith('Vários efeitos')) s.pick('Roubar');
    else s.maybeObj(blade);
  }
  assert.equal(s.d.kind, 'priority', s.d.prompt);
  e.returnToHand(ak); // em resposta, o Akshan sai do tabuleiro
  s.passAll();
  assert.equal(blade.controller, 1, s.log(10));
  assert.equal(blade.attachedTo, foe.id, 'nada mandou soltar o equipamento: continua preso\n' + s.log(10));
  assert.equal(e.might(foe), 4);
});
