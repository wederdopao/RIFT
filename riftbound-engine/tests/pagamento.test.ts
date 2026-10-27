// Pagamento de runas: exaustão alternando as cores (automático) e o modo de pagamento manual ('manualpay').
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { Game } from '../src/engine/game';
import { MANUAL_PAY } from '../src/engine/engine';
import type { Obj, P } from '../src/engine/types';

const SKULKER = 'OGN-175'; // Shipyard Skulker: 3 de energia, sem power
const WURM = 'OGN-011'; // Magma Wurm: 8 de energia + [Fury]
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const dom = (s: Scenario, r: Obj) => s.e.data(r).domains[0];
const ready = (s: Scenario, p: P, d: string) => s.e.runesOf(p).filter((r) => !r.exhausted && dom(s, r) === d).length;

/** Responde a jogada até voltar à decisão raiz (local: a base). */
function finish(s: Scenario, onPay?: (s: Scenario) => boolean) {
  for (let i = 0; i < 20 && s.g.current && !s.d.root; i++) {
    if (onPay?.(s)) continue;
    const base = s.d.options.find((o) => /base/i.test(o.label));
    s.ok([(base ?? s.d.options[0]).id]);
  }
}

test('pagamento automático: a energia exaure runas alternando as cores (as prontas que sobram ficam equilibradas)', () => {
  const s = new Scenario();
  s.runes(0, [...rs(RUNE.fury, 3), ...rs(RUNE.calm, 3)]);
  const u = s.put(0, SKULKER, 'hand');
  s.go();
  s.pick(`play:${u.id}:hand`);
  finish(s);
  assert.equal(u.zone, 'board');
  const f = ready(s, 0, 'Fury');
  const c = ready(s, 0, 'Calm');
  assert.equal(f + c, 3);
  assert.ok(Math.abs(f - c) <= 1, `sobrou ${f} Fúria e ${c} Calma prontas`);
});

test('pagamento automático: tira primeiro do domínio com mais runas prontas; recicla a exaurida antes da pronta', () => {
  const s = new Scenario();
  s.runes(0, [...rs(RUNE.fury, 4), RUNE.calm]);
  s.go();
  const plan = s.e.planPayment(0, { energy: 3, power: [] })!;
  assert.deepEqual(plan.exhaust.map((r) => dom(s, r)).sort(), ['Fury', 'Fury', 'Fury']);
  // 4F+2C, custo 2: as duas de Fúria (sobram 2F+2C); custo 4: alterna depois do empate
  const s2 = new Scenario();
  s2.runes(0, [...rs(RUNE.fury, 4), ...rs(RUNE.calm, 2)]);
  s2.go();
  const p2 = s2.e.planPayment(0, { energy: 2, power: [] })!;
  assert.deepEqual(p2.exhaust.map((r) => dom(s2, r)), ['Fury', 'Fury']);
  const p3 = s2.e.planPayment(0, { energy: 4, power: [] })!;
  assert.deepEqual(p3.exhaust.map((r) => dom(s2, r)).sort(), ['Calm', 'Fury', 'Fury', 'Fury']);
  // com uma Fúria exaurida, o [Fury] recicla a exaurida, e a energia sai alternando
  const s3 = new Scenario();
  s3.runes(0, [...rs(RUNE.fury, 2), ...rs(RUNE.calm, 2)]);
  const ex = s3.put(0, RUNE.fury, { t: 'base', p: 0 }, { ready: false });
  s3.go();
  const p4 = s3.e.planPayment(0, { energy: 2, power: [['Fury']] })!;
  assert.deepEqual(p4.recycle, [ex]);
  assert.deepEqual(p4.exhaust.map((r) => dom(s3, r)).sort(), ['Calm', 'Fury']);
});

function manualScenario() {
  const s = new Scenario();
  s.runes(0, [...rs(RUNE.fury, 5), ...rs(RUNE.calm, 5)]);
  const ex = s.put(0, RUNE.fury, { t: 'base', p: 0 }, { ready: false });
  const w = s.put(0, WURM, 'hand');
  s.go();
  return { s, ex, w };
}

test('pagamento manual: liga pela decisão raiz, pergunta qual runa reciclar e quais exaurir, e paga como escolhido', () => {
  const { s, ex, w } = manualScenario();
  assert.ok(s.d.options.some((o) => o.id === MANUAL_PAY));
  s.ok([MANUAL_PAY]);
  assert.equal(s.e.pl[0].manualPay, true);
  assert.equal(s.d.kind, 'action', 'trocar o modo não passa a vez');
  const fury = s.e.runesOf(0).filter((r) => dom(s, r) === 'Fury' && !r.exhausted);
  const calm = s.e.runesOf(0).filter((r) => dom(s, r) === 'Calm');
  let asked = 0;
  s.pick(`play:${w.id}:hand`);
  finish(s, (s) => {
    if (/^Pagamento manual: qual runa reciclar/.test(s.d.prompt)) {
      asked++;
      assert.ok(s.d.options.some((o) => o.obj === ex.id));
      s.ok([fury[0].id]); // recicla uma PRONTA (escolha do jogador, mesmo podendo a exaurida)
      return true;
    }
    if (/^Pagamento manual: quais runas exaurir/.test(s.d.prompt)) {
      asked++;
      assert.equal(s.d.min, 7, 'a pronta reciclada já paga 1 de energia');
      s.ok([...calm, ...fury.slice(1, 3)].map((r) => r.id));
      return true;
    }
    return false;
  });
  assert.equal(asked, 2, s.log());
  assert.equal(w.zone, 'board');
  assert.equal(fury[0].zone, 'runeDeck', 'reciclou a escolhida');
  assert.equal(ex.zone, 'board');
  assert.ok(calm.every((r) => r.exhausted));
  assert.deepEqual(fury.slice(3).map((r) => r.exhausted), [false, false], 'as Fúrias não escolhidas ficam prontas');
});

test('pagamento manual: sem escolha de verdade, não pergunta; desligado (padrão) não pergunta nada', () => {
  const s = new Scenario();
  s.runes(0, rs(RUNE.fury, 4));
  const u = s.put(0, SKULKER, 'hand');
  s.go();
  s.ok([MANUAL_PAY]);
  s.pick(`play:${u.id}:hand`);
  finish(s, (s) => {
    assert.ok(!/^Pagamento manual/.test(s.d.prompt), 'só uma cor: não há o que escolher');
    return false;
  });
  assert.equal(u.zone, 'board');
  // desligado: a mesma jogada do teste manual não pergunta
  const m = manualScenario();
  m.s.pick(`play:${m.w.id}:hand`);
  finish(m.s, (s) => {
    assert.ok(!/^Pagamento manual/.test(s.d.prompt));
    return false;
  });
  assert.equal(m.ex.zone, 'runeDeck', 'automático recicla a exaurida');
});

test('pagamento manual: replay pelas respostas reproduz o mesmo estado; desfazer volta o modo', () => {
  const { s, w } = manualScenario();
  s.ok([MANUAL_PAY]);
  s.pick(`play:${w.id}:hand`);
  finish(s, (s) => {
    if (/^Pagamento manual: qual runa reciclar/.test(s.d.prompt)) {
      s.ok([s.d.options[s.d.options.length - 1].id]);
      return true;
    }
    if (/^Pagamento manual: quais runas exaurir/.test(s.d.prompt)) {
      s.ok(s.d.options.slice(-s.d.min).map((o) => o.id));
      return true;
    }
    return false;
  });
  // o cenário foi montado à mão, então o replay parte do mesmo cenário montado e reaplica as respostas
  const snap = (e: typeof s.e) => JSON.stringify({ runes: e.runesOf(0).map((r) => [r.id, r.exhausted]), deck: e.pl[0].runeDeck, mp: e.pl[0].manualPay });
  const { s: r } = manualScenario();
  const answers = s.g.answers.slice(r.g.answers.length);
  for (const a of answers) assert.ok(r.g.answer(a), r.g.error || '');
  assert.equal(snap(r.e), snap(s.e));
  // replay de uma partida normal (sem cenário à mão): Game.load refaz o modo ligado
  const g = new Game(s.g.cfg);
  while (g.current && !g.current.root) g.answer([]);
  assert.ok(g.answer([MANUAL_PAY]));
  assert.equal(g.engine.pl[g.current!.player].manualPay, true);
  const g2 = Game.load(g.serialize());
  assert.equal(g2.engine.pl[g2.current!.player].manualPay, true);
  g2.undo();
  assert.ok(!g2.engine.pl[g2.current!.player].manualPay, 'desfazer volta o modo');
});
