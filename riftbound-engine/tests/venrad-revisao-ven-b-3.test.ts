// Revisão independente VEN-126..145 (Ki Barrier .. Nasus, Curator of the Sands). Rodar: npx tsx --test tests/venrad-revisao-ven-b-3.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const R = { mind: 'OGN-089', calm: 'OGN-042', body: 'OGN-126', chaos: 'OGN-166', order: 'OGN-214', fury: 'OGN-007' };

/** Responde decisões até voltar a uma decisão de ação. `h` responde as que quiser; o resto: passar / sim / primeira opção. */
function run(s: Scenario, h: (d: Decision) => string[] | undefined = () => undefined, max = 80) {
  for (let i = 0; i < max && s.g.current; i++) {
    const d = s.d;
    if (d.kind === 'action' && d.root) return;
    const a = h(d);
    if (a) s.ok(a);
    else if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.kind === 'confirm') s.ok(['yes']);
    else s.ok(d.options.slice(0, Math.max(1, d.min)).map((o) => o.id));
  }
}
const objAns = (d: Decision, o: Obj) => {
  const x = d.options.find((y) => y.obj === o.id || y.id === o.id);
  return x ? [x.id] : undefined;
};
function setLegend(s: Scenario, p: P, code: string): Obj {
  const z = s.e.newObj(code, p, 'legend');
  s.e.legendOf(p).zone = 'gone';
  s.e.pl[p].legend = z.id;
  return z;
}
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));

// ───────────── Kayle, Justified (VEN-134) ─────────────

test('Kayle: Disempower tira só um status (FAQ do Vendetta); Lacerate não a mata com 2 restantes', () => {
  const s = new Scenario();
  const e = s.e;
  const k = s.put(1, 'VEN-134', BF0);
  for (let i = 0; i < 3; i++) e.empowerObj(k, 1);
  assert.equal(e.empowerCount(k), 3);
  assert.equal(e.might(k), 9);
  s.put(0, 'VEN-127', 'hand'); // Lacerate
  s.runes(0, rs(R.order, 6)); // 3 a mais: Kayle com 3 status tem [Deflect 3]
  s.go();
  s.pick('Jogar Lacerate');
  run(s, (d) => objAns(d, k));
  assert.equal(k.zone, 'board', s.log(10));
  assert.equal(e.empowerCount(k), 2, 'perdeu um status');
  assert.equal(k.empowered, true);
  assert.equal(e.might(k), 7);
});

test('Kayle: "empower" de outra carta também soma (441.1.c.1) e a habilidade ativa mesmo com 3 (sem efeito)', () => {
  const s = new Scenario();
  const e = s.e;
  const k = s.put(0, 'VEN-134', base(0));
  e.empowerObj(k, 0); // instrução de Empower de fora (sem max)
  e.empowerObj(k, 0);
  assert.equal(e.empowerCount(k), 2);
  e.empowerObj(k, 0);
  assert.equal(e.empowerCount(k), 3);
  assert.equal(e.empowerObj(k, 0), false, 'no máximo: nada acontece');
  s.runes(0, rs(R.body, 3));
  s.go();
  assert.ok(has(s, 'Kayle, Justified: Empower'), 'ainda pode ativar com 3 (FAQ do Vendetta)');
  s.pick('Kayle, Justified: Empower');
  s.passAll();
  assert.equal(e.empowerCount(k), 3);
  // os outros continuam binários
  const u = s.put(0, 'VEN-128', base(0));
  e.empowerObj(u, 0);
  assert.equal(e.empowerObj(u, 0), false);
  e.disempower(u);
  assert.equal(u.empowered, false);
});

// ───────────── Flow (Lacerate, Shuriken Flip, Death Mark) ─────────────

test('Flow: spell jogado do descarte e anulado é banido, não vai para o descarte (FAQ do Vendetta)', () => {
  const s = new Scenario();
  const lac = s.put(0, 'VEN-127', 'trash');
  const foe = s.put(1, 'OGN-087', BF0);
  s.put(1, 'OGN-064', 'hand'); // Wind Wall
  s.runes(0, rs(R.order, 6));
  s.runes(1, rs(R.calm, 5));
  s.go();
  s.pick(/Lacerate.*Flow/);
  run(s, (d) => {
    if (d.player === 1 && (d.kind === 'priority' || d.kind === 'focus') && d.options.some((o) => o.label.includes('Wind Wall'))) return [d.options.find((o) => o.label.includes('Wind Wall'))!.id];
    if (d.player === 1 && d.options.some((o) => o.obj === lac.id)) return objAns(d, lac);
    return objAns(d, foe);
  });
  assert.ok(s.log(20).includes('anulado'), s.log(20));
  assert.equal(foe.zone, 'board');
  assert.equal(lac.zone, 'banish', 'banida: ' + s.log(10));
});

// ───────────── Zed, Master of Shadows (VEN-143) ─────────────

test('Zed: carta sua banida por spell do oponente não o empodera ("when YOU banish")', () => {
  const s = new Scenario();
  const z = setLegend(s, 1, 'VEN-143');
  const mine = s.put(1, 'OGN-087', BF0); // Might 3 ou menos, do dono do Zed (B)
  s.put(0, 'VEN-106', 'hand'); // Wind and Ghosts (A)
  s.runes(0, rs(R.chaos, 4));
  s.go();
  s.pick('Jogar Wind and Ghosts');
  run(s, (d) => objAns(d, mine));
  assert.equal(mine.zone, 'banish', s.log(10));
  assert.equal(z.empowered, false, 'Zed não fica Empowered');
});

test('Zed: dispara mesmo já Empowered (responder desempoderando não perde o gatilho)', () => {
  const s = new Scenario();
  const e = s.e;
  const z = setLegend(s, 0, 'VEN-143');
  z.empowered = true;
  const c = s.put(0, 'OGN-087', 'trash');
  e.toZone(c, 'banish');
  assert.equal(e.pending.length, 1, 'gatilho enfileirado com Zed já Empowered');
});

// ───────────── Glowstone (VEN-133) ─────────────

test('Glowstone: o jogador é escolhido ao ativar; no fim do turno de quem a controla, 5 às unidades dele', () => {
  const s = new Scenario();
  const e = s.e;
  const gs = s.put(0, 'VEN-133', base(0));
  gs.empowered = true;
  const foe = s.put(1, 'OGN-087', BF1);
  s.go();
  s.pick('Desempower, exaurir');
  assert.match(s.d.prompt, /qual jogador/, 'pergunta ao ativar');
  s.pick('B');
  run(s);
  assert.equal(gs.controller, 1);
  assert.deepEqual(gs.loc, base(1));
  // no turno de B, no fim: mata a Glowstone e causa 5 às unidades de B
  e.active = 1;
  const g2 = e.ctx(gs, 1);
  const trig = e.script(gs).triggers![0];
  e.runSync(trig.resolve({ ...g2, p: 1 }));
  e.cleanup();
  assert.equal(gs.zone, 'trash');
  assert.equal(foe.zone, 'trash', '5 de dano na unidade de B');
});

// ───────────── Fallen Feline (VEN-132) ─────────────

test('Fallen Feline: "When you play me, name a spell" é gatilho na pilha; o nome sai na resolução', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'VEN-132', 'hand');
  s.runes(0, rs(R.order, 3));
  s.go();
  s.pick('Jogar Fallen Feline');
  let named = false;
  let sawChainFirst = false;
  run(s, (d) => {
    if (/nomeie uma spell/.test(d.prompt)) {
      sawChainFirst = e.log.some((l) => /Na pilha: .*nomear/.test(l.text));
      named = true;
      return [d.options.find((o) => o.label === 'Wind Wall')!.id];
    }
    if (d.kind === 'choose' && d.options.some((o) => /Campo|Base/i.test(o.label))) return [d.options[0].id];
    return undefined;
  });
  assert.ok(named, s.log(10));
  assert.ok(sawChainFirst, 'o gatilho foi para a pilha antes de nomear: ' + s.log(10));
  const fel = e.units().find((u) => u.code === 'VEN-132')!;
  assert.equal(fel.data?.named, 'Wind Wall');
});

// ───────────── Shuriken Flip (VEN-140) ─────────────

test('Shuriken Flip: a unidade aliada e o destino são escolhidos ao jogar', () => {
  const s = new Scenario();
  const e = s.e;
  const foe = s.put(1, 'VEN-129', BF0); // Sacred Protector, Might 6
  const mine = s.put(0, 'OGN-087', BF1);
  s.put(0, 'VEN-140', 'hand');
  s.runes(0, [R.fury, R.calm]);
  s.go();
  s.pick('Jogar Shuriken Flip');
  let destBeforeChain = false;
  run(s, (d) => {
    if (/para onde/.test(d.prompt)) {
      destBeforeChain = e.chain.length === 0;
      return [d.options.find((o) => o.label.includes('Base'))?.id ?? d.options[0].id];
    }
    if (/mover qual unidade aliada/.test(d.prompt)) return objAns(d, mine);
    if (/2 de dano/.test(d.prompt)) return objAns(d, foe);
    return undefined;
  });
  assert.ok(destBeforeChain, 'destino escolhido antes de ir para a pilha');
  assert.equal(foe.damage, 2, s.log(20));
  assert.deepEqual(mine.loc, base(0));
});

// ───────────── Nasus, Curator of the Sands (VEN-145) ─────────────

test('Nasus: as runas são alvos escolhidos ao pôr o gatilho na pilha', () => {
  const s = new Scenario();
  const e = s.e;
  const n = setLegend(s, 0, 'VEN-145');
  s.put(0, 'VEN-046', base(0)); // Nasus, Ascended: [Empower][8]
  s.runes(0, rs(R.calm, 8));
  s.go();
  s.pick('Nasus, Ascended: Empower');
  let pickedOnFinalize = false;
  run(s, (d) => {
    if (/preparar quais runas/.test(d.prompt)) {
      pickedOnFinalize = !e.log.some((l) => /Resolve: .*preparar até 2 runas/.test(l.text));
      return d.options.filter((o) => e.objs[o.obj!]?.exhausted).slice(0, 2).map((o) => o.id);
    }
    return undefined;
  });
  assert.ok(pickedOnFinalize, 'escolhidas ao finalizar: ' + s.log(15));
  assert.equal(n.exhausted, true);
  assert.equal(e.runesOf(0).filter((r) => !r.exhausted).length, 2, s.log(10));
});
