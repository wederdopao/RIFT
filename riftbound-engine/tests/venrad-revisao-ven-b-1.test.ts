// Revisão independente do Vendetta, VEN-084..VEN-104: um teste por erro achado. Rodar: npx tsx --test <este arquivo>
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';
import { E } from '../src/cards/helpers';

const BF0 = { t: 'bf', i: 0 } as const;
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
/** Carta escondida (Hidden) de p no campo 0, escondida num turno anterior. */
function hideAt(s: Scenario, p: P, code: string): Obj {
  const e = s.e;
  const o = e.newObj(code, p, 'setAside');
  o.zone = 'facedown';
  o.loc = BF0;
  o.hiddenTurn = 0;
  e.bfs[0].facedown.push(o.id);
  return o;
}
const onChain = (s: Scenario, txt: RegExp) => s.e.chain.some((it) => txt.test(it.label));

// ───────────── VEN-085 Decree of Strength ─────────────
test('Decree of Strength: quem recicla é o oponente ("They recycle that card"): o Karma dele dispara', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'OGN-235', base(1)); // Karma, Channeler (de B)
  const mind = s.put(1, 'OGN-083', 'hand'); // Consult the Past (Mind)
  s.put(0, 'VEN-085', 'hand');
  s.runes(0, rs(R.body, 1));
  s.go();
  s.pick('Jogar Decree of Strength');
  run(s);
  assert.equal(mind.zone, 'mainDeck', s.log(15));
  assert.ok(/Karma|Buff/.test(s.log(15)) && e.units().some((u) => u.controller === 1 && u.buffs > 0), 'Karma de B dá Buff: ' + s.log(15));
});

// ───────────── VEN-095 Shadow Order Disciple ─────────────
/** Espia `metodo` do motor: anota, a cada chamada, o rótulo do item da pilha que está resolvendo (ou '' fora da resolução). */
function spy(s: Scenario, metodo: 'burn' | 'banishObj'): string[] {
  const e = s.e as any;
  const calls: string[] = [];
  const orig = e[metodo].bind(e);
  e[metodo] = (...args: any[]) => {
    calls.push(e.resolving > 0 ? e.resolvingItem?.label ?? '?' : '');
    return orig(...args);
  };
  return calls;
}

test('Shadow Order Disciple: o Burn 1 é custo do gatilho, pago ao pô-lo na pilha (204.3.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const d = s.put(0, 'VEN-095', base(0));
  s.go();
  const trash0 = e.pl[0].trash.length;
  const calls = spy(s, 'burn');
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([d.id]);
  s.pick(e.name(e.bfs[0].objId));
  run(s);
  assert.equal(e.pl[0].trash.length, trash0 + 1, s.log(10));
  assert.deepEqual(calls, [''], 'Burn pago ao finalizar, não na resolução: ' + JSON.stringify(calls));
  assert.equal(e.might(d), 3);
});

// ───────────── VEN-101 Gust Monk ─────────────
test('Gust Monk: banir a carta do descarte é custo do gatilho, pago ao pô-lo na pilha (204.3.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const junk = s.put(1, 'OGN-001', 'trash');
  const monk = s.put(0, 'VEN-101', 'hand');
  s.runes(0, rs(R.chaos, 3));
  s.go();
  const calls = spy(s, 'banishObj');
  s.pick('Jogar Gust Monk');
  run(s, (d) => {
    if (d.prompt.includes('onde?')) return [d.options.find((o) => o.label.includes('base'))!.id];
    if (d.options.some((o) => o.obj === junk.id)) return [d.options.find((o) => o.obj === junk.id)!.id];
    if (d.options.some((o) => o.obj === monk.id)) return [d.options.find((o) => o.obj === monk.id)!.id];
    return undefined;
  });
  assert.equal(junk.zone, 'banish', s.log(10));
  assert.deepEqual(calls, [''], 'banida ao finalizar, não na resolução: ' + JSON.stringify(calls));
  assert.equal(e.kw(monk).assault, 2, s.log(10));
});

test('Gust Monk: sem carta em nenhum descarte, o gatilho não vai para a pilha (custo impagável)', () => {
  const s = new Scenario();
  const e = s.e;
  for (const p of [0, 1] as P[]) for (const id of [...e.pl[p].trash]) e.toZone(e.objs[id], 'mainDeck');
  const monk = s.put(0, 'VEN-101', 'hand');
  s.runes(0, rs(R.chaos, 3));
  s.go();
  s.pick('Jogar Gust Monk');
  run(s, (d) => (d.prompt.includes('onde?') ? [d.options.find((o) => o.label.includes('base'))!.id] : undefined));
  assert.equal(monk.zone, 'board');
  assert.ok(!/Na pilha: Gust Monk: /.test(s.log(10)), s.log(10));
  assert.ok(!e.kw(monk).assault);
});

// ───────────── VEN-091 Corrupted Dragon ─────────────
test('Corrupted Dragon: as unidades inimigas movidas são alvos (355.10, 355.12): Ruin Runner não pode ser escolhida', () => {
  const s = new Scenario();
  const e = s.e;
  const dragon = s.put(0, 'VEN-091', base(0));
  const runner = s.put(1, 'SFD-105', BF0); // Ruin Runner 5: não pode ser escolhida por inimigos
  const small = s.put(1, 'OGN-054', BF0); // Sunlit Guardian 3
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([dragon.id]);
  s.pick(e.name(e.bfs[0].objId));
  let offered: string[] = [];
  run(s, (d) => {
    if (/Corrupted Dragon/.test(d.prompt) && d.kind !== 'confirm') {
      offered = d.options.map((o) => o.obj || o.id);
      return d.options.filter((o) => o.obj).map((o) => o.id);
    }
    return undefined;
  });
  assert.ok(offered.includes(small.id), 'Sunlit Guardian oferecida: ' + s.log(15));
  assert.ok(!offered.includes(runner.id), 'Ruin Runner não pode ser escolhida');
  assert.deepEqual(small.loc, base(1), s.log(15));
});

// ───────────── VEN-098 Stagazer ─────────────
test('Stagazer: spell com [Flow] dado por efeito (Kennen) também custa [2] a menos ao ser jogado do descarte', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'VEN-098', base(0));
  const own = s.put(0, 'VEN-100', 'trash'); // Up from the Deep, [Flow][3]
  const sp = s.put(0, 'OGN-083', 'trash'); // Consult the Past (sem Flow impresso)
  e.grantFlow(sp, E(4));
  assert.equal(e.minCostFor(0, own, 'flow').energy, 1, 'Flow impresso: 3 - 2');
  assert.equal(e.minCostFor(0, sp, 'flow').energy, 2, 'Flow dado: 4 - 2');
  // jogando de verdade: com uma runa só, o Up from the Deep sai do descarte por [1]
  s.runes(0, [R.chaos]);
  s.go();
  const opt = s.d.options.find((o) => o.id === `play:${own.id}:flow`);
  assert.ok(opt, 'oferece o Flow por [1]');
  s.ok([opt!.id]);
  run(s);
  assert.equal(own.zone, 'banish', s.log(10));
  assert.equal(e.units().filter((u) => u.code === 'TOK-TENTACLE').length, 2, s.log(10));
});

// ───────────── VEN-099 Tornado Warrior ─────────────
test('Tornado Warrior: "something here" pode ser algo já Empowered; o "Disempower it at end of turn" vale do mesmo jeito', () => {
  const s = new Scenario();
  const e = s.e;
  const enemy = s.put(0, 'VEN-093', BF0); // Kinkou Lifeblade, já Empowered
  e.empowerObj(enemy, 0);
  const tw = hideAt(s, 0, 'VEN-099');
  s.go();
  const play = s.d.options.find((o) => o.obj === tw.id || o.id.includes(tw.id));
  assert.ok(play, 'pode jogar a Tornado Warrior escondida: ' + s.d.options.map((o) => o.label).join(' | '));
  s.ok([play!.id]);
  let offered = false;
  run(s, (d) => {
    if (/Tornado Warrior: empower/.test(d.prompt) && d.options.some((o) => o.obj === enemy.id)) {
      offered = true;
      return [d.options.find((o) => o.obj === enemy.id)!.id];
    }
    return undefined;
  });
  assert.equal(tw.zone, 'board', s.log(10));
  assert.ok(offered, 'Kinkou (já Empowered) é escolha válida: ' + s.log(10));
  assert.equal(enemy.empowered, true);
  s.pick('Encerrar o turno');
  run(s);
  assert.equal(enemy.empowered, false, 'desempowered no fim do turno: ' + s.log(15));
});
