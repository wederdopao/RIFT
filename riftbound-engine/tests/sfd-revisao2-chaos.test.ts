// Segunda revisão independente do Spiritforged, lote chaos (SFD-121..SFD-150).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;
const O = 'OGN-214'; // runa de Order

test('Spirit Wheel: dois gatilhos ao mesmo tempo; o segundo (já exaurida) não cobra [1] sem comprar', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-175', base(0));
  const b = s.put(0, 'OGN-136', base(0));
  const wheel = s.put(0, 'SFD-144', base(0));
  s.put(0, 'OGN-206', 'hand'); // Back to Back: escolhe duas unidades aliadas
  s.runes(0, [O, O, O, C, C]);
  s.go();
  const hand = e.pl[0].hand.length;
  s.pick('Jogar Back to Back');
  if (!s.d.root && /duas unidades/.test(s.d.prompt)) s.ok([a.id, b.id]);
  let asked = 0;
  for (let i = 0; i < 12 && !s.d.root; i++) {
    if (/Vários efeitos/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
    else if (/Pagar \[1\] e exaurir/.test(s.d.prompt)) {
      asked++;
      s.pick('Sim');
    } else s.passAll(3);
  }
  assert.equal(wheel.exhausted, true);
  assert.equal(e.pl[0].hand.length, hand - 1 + 1, 'comprou 1 só\n' + s.log(30));
  assert.equal(e.runesOf(0).filter((r) => !r.exhausted).length, 1, 'Back to Back (3) + [1] uma vez só\n' + s.log(30));
  void asked;
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

test('Windsinger escondida: alvo que sai daquele campo (para outro campo) erra o alvo (811.1.d.2; 359.3.e.5)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-175', BF0);
  const x = s.put(1, 'OGN-136', BF0); // 2 de Might
  s.put(1, 'OGN-169', 'hand'); // Gust: B recebe prioridade
  s.runes(1, [C]);
  hideAt(s, 0, 'SFD-138', 0);
  s.go();
  s.pick('Jogar Windsinger (escondida');
  s.passAll(2);
  assert.match(s.d.prompt, /Devolver outra unidade/);
  s.pick('Sim');
  s.maybeObj(x);
  // em resposta, a unidade vai para o outro campo (continua num campo e com 3 de Might ou menos)
  s.e.moveUnits([x], BF1, 1);
  s.passAll();
  assert.equal(x.zone, 'board', 'não está mais no campo onde a Windsinger estava escondida\n' + s.log(20));
  assert.deepEqual(x.loc, BF1);
});

test('Edge of Night escondida: unidade que sai daquele campo antes da resolução não recebe o equipamento (811.1.d.2)', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', BF0);
  s.put(1, 'OGN-169', 'hand');
  s.runes(1, [C]);
  const edge = hideAt(s, 0, 'SFD-139', 0);
  s.go();
  s.pick('Jogar Edge of Night (escondida');
  assert.ok(e.chain.some((it) => /Edge of Night: Equipar/.test(it.label)), s.log(10));
  e.moveUnits([u], base(0), 0);
  s.passAll();
  assert.equal(edge.attachedTo, undefined, s.log(20));
});
