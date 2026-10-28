// Revisão independente RAD-001..084 (coordenação): erros achados fora dos lotes a1..a4. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';

const BF0 = { t: 'bf', i: 0 } as const;

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// Core Rules, ficha Bomb: "[Deploy] [Deathknell] — Deal 2 to an enemy unit here and kill all other Bombs you control
// here." O Deathknell é palavra-chave: "Friendly [Deathknell] effects here trigger an additional time" (RAD-017) o dobra.
test('Detonation Amplifier: o Deathknell da Bomb aqui dispara duas vezes (4 de dano)', () => {
  const s = new Scenario();
  s.put(0, 'RAD-017', BF0);
  const bomb = s.e.createToken('TOK-BOMB', 0, BF0);
  const foe = s.put(1, 'SFD-101', BF0); // 7 de Might
  s.go();
  s.e.killAll([bomb]);
  s.e.runSync(s.e.drain());
  drain(s);
  assert.equal(foe.damage, 4, s.log());
});

test('Bomb sem Detonation Amplifier: 2 de dano e mata as outras Bombs suas aqui', () => {
  const s = new Scenario();
  const bomb = s.e.createToken('TOK-BOMB', 0, BF0);
  const other = s.e.createToken('TOK-BOMB', 0, BF0);
  const foe = s.put(1, 'SFD-101', BF0);
  s.go();
  s.e.killAll([bomb]);
  s.e.runSync(s.e.drain());
  drain(s);
  assert.equal(other.zone === 'board', false, s.log());
  assert.equal(foe.damage, 4, s.log()); // as duas Bombs explodem: 2 + 2
});
