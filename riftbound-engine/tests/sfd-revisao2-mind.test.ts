// Revisão independente (2ª rodada) do lote "mind" do Spiritforged (SFD-061..SFD-090): cenários dos erros corrigidos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { P } from '../src/engine/types';

const base = (p: P) => ({ t: 'base', p }) as const;

test('Gearhead + Svellsongur: a cópia do texto não dobra o Might Bonus de novo (FAQ #8493, #11629)', () => {
  const s = new Scenario();
  const e = s.e;
  const gh = s.put(0, 'SFD-068', base(0)); // 3
  const plate = s.put(0, 'SFD-073', base(0)); // Experimental Hexplate: +1
  const sv = s.put(0, 'SFD-059', base(0)); // Svellsongur: +0, copia o texto da unidade
  e.attach(plate, gh);
  assert.equal(e.might(gh), 3 + 2, 'o +1 do Hexplate conta dobrado');
  e.attach(sv, gh);
  assert.equal(e.might(gh), 3 + 2, 'efeitos de dobrar idênticos não se acumulam (3 + 2 = 5)');
  const plate2 = s.put(0, 'SFD-073', base(0));
  e.attach(plate2, gh);
  assert.equal(e.might(gh), 3 + 2 + 2, 'com dois +1, 7 (FAQ #11629)');
  // sem Svellsongur, nada muda
  e.detach(sv);
  assert.equal(e.might(gh), 7);
});

test('Hextech Anomaly ativada à mão: o registro não mostra um "adiciona  ao pool" vazio', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-083', base(0));
  s.runes(0, ['OGN-089', 'OGN-089']);
  s.go();
  s.pick('Hextech Anomaly: Pagar power');
  s.pick('2 power');
  assert.equal(e.pl[0].pool.energy, 2);
  const log = s.log(10);
  assert.ok(!/adiciona {2}ao pool/.test(log), log);
  assert.ok(log.includes('adiciona 2 de energia ao pool'), log);
});
