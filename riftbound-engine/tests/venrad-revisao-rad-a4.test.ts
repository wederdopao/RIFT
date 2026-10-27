// Revisão independente do Radiance, intervalo RAD-064..RAD-084. Rodar: node --import tsx --test tests/venrad-revisao-rad-a4.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';
import type { Gen } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const run = (g: Gen<any>) => {
  for (let r = g.next(); !r.done; r = g.next()) throw new Error('decisão inesperada');
};
/** Responde perguntas/passa até a mesa assentar; `yes` = resposta a perguntas Sim/Não. */
function settle(s: Scenario, yes = true, max = 20) {
  for (let i = 0; i < max && s.g.current; i++) {
    if (s.d.options.some((o) => o.label === 'Sim') && s.d.options.some((o) => o.label === 'Não')) s.pick(yes ? 'Sim' : 'Não');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}

test('Scrutinizing Scope: unit gear tem os dois tipos — palpite "Unidade" acerta e a carta é reciclada', () => {
  const s = new Scenario();
  s.put(0, 'RAD-064', base(0));
  s.runes(0, rs(MIND, 1));
  const poro = s.put(0, 'VEN-058', 'deckTop'); // Patched Porobot (Unit Gear)
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  s.pick('[1], exaurir');
  for (let i = 0; i < 6 && s.g.current; i++) {
    if (s.d.prompt.includes('adivinhe')) s.pick('Unidade');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.equal(poro.zone, 'mainDeck', s.log());
  assert.equal(s.e.pl[0].mainDeck[s.e.pl[0].mainDeck.length - 1], poro.id, 'reciclada para o fundo');
  assert.equal(s.e.pl[0].hand.length, hand0);
});

test('Seraphine, Inspiring: recusar o "você pode" não gasta o uma vez por turno; um gatilho por exaustão simultânea', () => {
  const s = new Scenario();
  const sera = s.put(0, 'RAD-065', base(0));
  const us = [sera, s.put(0, 'RAD-054', base(0)), s.put(0, 'RAD-054', base(0))];
  for (let k = 0; k < 4; k++) s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  let asks = 0;
  const move = (to: string, answer: boolean) => {
    s.pick('Mover unidades');
    if (s.d.prompt.startsWith('Quais unidades')) s.ok(us.map((u) => u.id));
    if (s.d.prompt.startsWith('Para onde')) s.pick(to);
    for (let i = 0; i < 10 && s.g.current; i++) {
      if (s.d.options.some((o) => o.label === 'Sim')) {
        asks++;
        s.pick(answer ? 'Sim' : 'Não');
      } else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
      else break;
    }
  };
  move('Campo Vazio A', false);
  assert.equal(asks, 1, 'uma pergunta por exaustão simultânea: ' + s.log());
  assert.equal(s.e.pl[0].hand.length, hand0);
  for (const u of us) u.exhausted = false;
  s.go();
  move('base', true);
  assert.equal(asks, 2, s.log());
  assert.equal(s.e.pl[0].hand.length, hand0 + 1, 'recusa anterior não contou: ' + s.log());
});

test('Orianna, Mechanical Marvel: o desconto é opcional — recusar no 1º gear deixa usar no 2º', () => {
  const s = new Scenario();
  s.put(0, 'RAD-068', BF0);
  const g1 = s.put(0, 'VEN-018', 'hand'); // [4] + [Fury]
  const g2 = s.put(0, 'VEN-018', 'hand');
  s.runes(0, rs(RUNE.fury, 8));
  s.go();
  s.pick('Jogar Rage Amplifier');
  assert.ok(s.d.prompt.includes('[1][Rune] a menos'), 'pergunta: ' + s.d.prompt);
  s.pick('Não');
  settle(s);
  assert.equal(g1.zone, 'board', s.log());
  const paid = () => [...s.e.log].reverse().find((l) => /paga /.test(l.text))?.text || '';
  assert.match(paid(), /paga 4 de energia \+ 1 power/, 'pagou [4][Fury] cheio');
  s.go();
  s.pick('Jogar Rage Amplifier');
  s.pick('Sim');
  settle(s);
  assert.equal(g2.zone, 'board', s.log());
  assert.match(paid(), /paga 3 de energia(?! \+)/, 'pagou [3] (sem o pip): ' + s.log());
});

test('Zero Point Inflection: uma compra de várias cartas dispara uma vez; resolve mesmo fora do tabuleiro', () => {
  const s = new Scenario();
  const zpi = s.put(0, 'RAD-069', base(0));
  while (s.e.pl[0].hand.length < 9) s.put(0, 'RAD-054', 'hand');
  for (let k = 0; k < 5; k++) s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const pend0 = s.e.pending.length;
  run(s.e.draw(0, 3)); // 9 → 12: só a 1ª carta (10 na mão) dispara
  const mine = s.e.pending.slice(pend0).filter((x) => x.sourceId === zpi.id);
  assert.equal(mine.length, 1, 'um gatilho por ação de comprar');
  s.e.toZone(zpi, 'trash'); // sai do tabuleiro antes de resolver
  const pts = s.e.pl[1].points;
  run(mine[0].ability.resolve(s.e.ctx(zpi, 0, { ev: mine[0].ev })));
  assert.equal(s.e.pl[0].hand.length, 0, 'a mão foi descartada');
  assert.equal(s.e.pl[1].points, pts + 1, 'o oponente marca 1 ponto');
});

test('Zero Point Inflection: "when you play a card" vale para ela mesma', () => {
  const s = new Scenario();
  s.runes(0, rs(MIND, 11));
  const zpi = s.put(0, 'RAD-069', 'hand');
  for (let k = 0; k < 4; k++) s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const hand0 = s.e.pl[0].hand.length - 1;
  s.pick('Jogar Zero Point Inflection');
  settle(s);
  assert.equal(zpi.zone, 'board', s.log(40));
  assert.equal(s.e.pl[0].hand.length, hand0 + 2, s.log());
});

test('Armored Tusker: fora do tabuleiro na resolução, o Shield é nulo e não há dano', () => {
  const s = new Scenario();
  const tusk = s.put(0, 'RAD-078', BF0);
  const foe = s.put(1, 'RAD-054', BF1);
  s.go();
  const t = s.e.script(tusk).triggers![0];
  const c = s.e.ctx(tusk, 0, { targets: [[foe]] });
  s.e.toZone(tusk, 'trash');
  run(t.resolve(c));
  assert.equal(foe.damage || 0, 0);
  const tusk2 = s.put(0, 'RAD-078', BF0);
  run(t.resolve(s.e.ctx(tusk2, 0, { targets: [[foe]] })));
  assert.equal(foe.damage, 3, 'no tabuleiro: dano igual ao Shield 3');
});

test('Elnuk Herd (errata): pode dar +3 a si mesma quando é a única unidade aliada', () => {
  const s = new Scenario();
  s.runes(0, rs(RUNE.body, 6));
  const elnuk = s.put(0, 'RAD-081', 'hand');
  s.go();
  s.pick('Jogar Elnuk Herd');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base');
  for (let i = 0; i < 8 && s.g.current; i++) {
    if (s.d.options.some((o) => o.obj === elnuk.id || o.id === elnuk.id)) s.pickObj(elnuk);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.equal(elnuk.zone, 'board');
  assert.equal(s.e.might(elnuk), 8, s.log());
});

test('Primordial Roar: o Might da unidade mostrada é lido na resolução (atual; nulo se saiu)', () => {
  const s = new Scenario();
  const ally = s.put(0, 'RAD-054', base(0)); // 3 de Might
  const foe = s.put(1, 'RAD-077', BF1); // Wrath of the Freljord, 7 de Might
  const roar = s.put(0, 'RAD-082', 'hand');
  s.go();
  const sp = s.e.script(roar).spell!;
  const info = { code: ally.code, might: 3, energy: 3, power: 0, fromHand: false, id: ally.id, ver: ally.zoneVersion };
  s.e.giveMight(ally, 2); // +2 em resposta
  run(sp.resolve(s.e.ctx(roar, 0, { targets: [[foe]], data: { showOff: info } })));
  assert.equal(foe.damage, 5, 'Might atual (5), não o da jogada (3)');
  s.e.toZone(ally, 'trash');
  run(sp.resolve(s.e.ctx(roar, 0, { targets: [[foe]], data: { showOff: info } })));
  assert.equal(foe.damage, 5, 'unidade mostrada saiu: sem dano');
});

test('Cataclysm: campo escolhido deixou de ser inimigo ocupado na resolução — a unidade não se move', () => {
  const s = new Scenario();
  const u = s.put(0, 'RAD-054', base(0));
  const foe = s.put(1, 'RAD-054', BF1);
  const cat = s.put(0, 'RAD-084', 'hand');
  s.go();
  const sp = s.e.script(cat).spell!;
  s.e.toZone(foe, 'trash'); // o campo esvaziou antes de resolver
  run(sp.resolve(s.e.ctx(cat, 0, { targets: [[u]], data: { dest: 1 } })));
  assert.deepEqual(u.loc, base(0));
  assert.ok(s.e.effects.some((e) => e.flag === 'cantPlaySpells' && e.player === 1), 'a primeira frase vale');
  const foe2 = s.put(1, 'RAD-054', BF1);
  run(sp.resolve(s.e.ctx(cat, 0, { targets: [[u]], data: { dest: 1 } })));
  assert.deepEqual(u.loc, BF1);
  void foe2;
});

test('Orianna, Mechanical Marvel: com o desconto opcional, o gear continua jogável só com [3]', () => {
  const s = new Scenario();
  s.put(0, 'RAD-068', BF0);
  const g1 = s.put(0, 'VEN-018', 'hand'); // [4] + [Fury]
  for (const r of s.e.runesOf(0)) s.e.toZone(r, 'runeDeck', { bottom: true });
  s.runes(0, rs(RUNE.fury, 3));
  s.go();
  s.pick('Jogar Rage Amplifier');
  s.pick('Sim');
  settle(s);
  assert.equal(g1.zone, 'board', s.log());
});
