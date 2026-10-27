// Verificação rápida dos campos/lendas VEN-139..166 / RAD-139..167 (só o que é barato de checar).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { P } from '../src/engine/types';

function setBf(s: Scenario, i: number, code: string) {
  const e = s.e;
  const o = e.newObj(code, i as P, 'battlefieldZone');
  e.bfs[i].objId = o.id;
  return o;
}

test('Kinkou Temple: unidade com Tank aqui tem +1 de Might; Packed Amphitheater: campeão +1', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-159');
  const tank = s.put(0, 'OGN-087', { t: 'bf', i: 0 }); // Lecturing Yordle, Might 2, Tank
  s.go();
  assert.equal(s.e.might(tank), 3);
  setBf(s, 0, 'RAD-164');
  s.go();
  assert.equal(s.e.might(tank), 2);
});

test('Heisho ignora Deflect de alvos no campo; Zed fica Empowered ao banir', () => {
  const s = new Scenario();
  setBf(s, 0, 'VEN-158');
  const u = s.put(1, 'OGN-087', { t: 'bf', i: 0 });
  assert.equal(s.e.ignoresDeflect(u), true);
  const z = s.e.newObj('VEN-143', 0, 'legend');
  s.e.legendOf(0).zone = 'gone';
  s.e.pl[0].legend = z.id;
  const c = s.put(0, 'OGN-087', 'trash');
  s.e.toZone(c, 'banish');
  s.go();
  assert.equal(s.e.pending.length, 1, 'Zed: o gatilho de banir foi enfileirado');
  assert.equal(z.empowered, false);
});
