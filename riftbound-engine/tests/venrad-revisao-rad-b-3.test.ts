// Revisão independente do Radiance, RAD-127..RAD-146: um teste por correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const R = { mind: 'OGN-089', calm: 'OGN-042', body: 'OGN-126', chaos: 'OGN-166', order: 'OGN-214', fury: 'OGN-007' };
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5

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
const pickBy = (d: Decision, re: RegExp) => {
  const o = d.options.find((x) => re.test(x.label));
  return o ? [o.id] : undefined;
};
const objOpt = (d: Decision, o: Obj) => {
  const x = d.options.find((y) => y.obj === o.id || y.id === o.id);
  return x ? [x.id] : undefined;
};
function setLegend(s: Scenario, p: P, code: string): Obj {
  const z = s.e.newObj(code, p, 'legend');
  s.e.legendOf(p).zone = 'gone';
  s.e.pl[p].legend = z.id;
  return z;
}

// ───────────────────────────── RAD-129 Trifarian Captain ─────────────────────────────
test('Trifarian Captain: olha (não revela) as 4 do topo; só a escolhida é revelada e comprada (evento de compra)', () => {
  const s = new Scenario();
  const titan = s.put(0, 'SFD-175', 'deckTop'); // Undertitan: "As I'm revealed from your deck, [Add] [2]"
  const cheap = s.put(0, 'OGN-087', 'deckTop'); // unidade de custo 2
  s.put(0, 'RAD-129', 'hand');
  s.runes(0, rs(R.order, 2));
  s.go();
  const drawn0 = s.e.pl[0].drawn?.turn === s.e.turn ? s.e.pl[0].drawn.n : 0;
  s.pick('Jogar Trifarian Captain');
  run(s, (d) => (/Trifarian Captain: revelar e comprar/.test(d.prompt) ? objOpt(d, cheap) : /onde\?/.test(d.prompt) ? pickBy(d, /base/) : undefined));
  assert.equal(cheap.zone, 'hand', s.log());
  assert.equal(s.e.pl[0].drawn?.n, drawn0 + 1, 'comprar conta como compra');
  // a Undertitan só foi olhada: não foi revelada, então não adicionou [2]
  assert.equal(s.e.pl[0].pool.energy, 0, s.log());
  assert.equal(titan.zone, 'mainDeck');
});

// ───────────────────────────── RAD-135 Remember the Fallen ─────────────────────────────
test('Remember the Fallen: "ignoring their costs" zera só o custo base; o custo adicional obrigatório continua (356.1.b.1)', () => {
  const s = new Scenario();
  const qm = s.put(0, 'SFD-044', 'trash'); // Legion Quartermaster: custo adicional "devolva um gear aliado à mão"
  const gear = s.put(0, 'OGN-228', base(0)); // Vanguard Helm
  s.put(0, 'RAD-135', 'hand');
  s.runes(0, rs(R.order, 10));
  s.go();
  s.pick('Jogar Remember the Fallen');
  run(s, (d) => (/Remember the Fallen: jogar qual/.test(d.prompt) ? (qm.zone === 'trash' ? objOpt(d, qm) : []) : /onde\?/.test(d.prompt) ? pickBy(d, /base/) : undefined));
  assert.equal(qm.zone, 'board', s.log(25));
  assert.equal(gear.zone, 'hand', 'pagou o custo adicional: ' + s.log(25));
});

// ───────────────────────────── RAD-136 Dockside Lock-Up ─────────────────────────────
function lockUpScenario() {
  const s = new Scenario();
  const prisoner = s.put(0, 'OGN-087', BF0);
  s.put(0, UNIT, BF0);
  const lock = s.put(0, 'RAD-136', 'hand');
  s.runes(0, rs(R.order, 8));
  s.go();
  s.pick('Jogar Dockside Lock-Up');
  run(s, (d) => (/onde\?/.test(d.prompt) ? pickBy(d, /Campo/) : /banir qual/.test(d.prompt) ? objOpt(d, prisoner) : undefined));
  assert.equal(prisoner.zone, 'banish', s.log());
  return { s, lock, prisoner };
}
test('Dockside Lock-Up: "kill this" é o custo do gatilho de hold (383.3.b), pago ao finalizar; recusar não mata nem joga', () => {
  const { s, lock, prisoner } = lockUpScenario();
  let asked = false;
  const h = (d: Decision) => {
    if (/Dockside Lock-Up: pagar o custo/.test(d.prompt)) {
      asked = true;
      return pickBy(d, /Não/);
    }
    return undefined;
  };
  s.pick('Encerrar o turno');
  run(s, h);
  s.pick('Encerrar o turno');
  run(s, h);
  assert.ok(asked, 'perguntou ao finalizar: ' + s.log(30));
  assert.equal(lock.zone, 'board');
  assert.equal(prisoner.zone, 'banish');
});
test('Dockside Lock-Up: pagando (matar), joga a carta banida; um Lock-Up jogado de novo não lembra a carta do anterior', () => {
  const { s, lock, prisoner } = lockUpScenario();
  s.pick('Encerrar o turno');
  run(s);
  s.pick('Encerrar o turno');
  run(s, (d) => (/onde\?/.test(d.prompt) ? pickBy(d, /base/) : undefined));
  assert.equal(lock.zone, 'trash', s.log(30));
  assert.equal(prisoner.zone, 'board', s.log(30));
  // a mesma carta volta ao tabuleiro (objeto novo) sem banir nada: não guarda a carta antiga
  const other = s.put(1, UNIT, 'trash');
  s.e.toZone(other, 'banish');
  lock.data = { ...(lock.data || {}), banished: other.id, banishedVer: other.zoneVersion };
  s.e.toZone(lock, 'hand');
  s.e.putOnBoard(lock, BF0, true);
  const n = s.e.pending.length;
  s.e.emit({ type: 'hold', player: 0, bf: 0, units: [] });
  assert.equal(s.e.pending.length, n, 'sem carta banida por este objeto, o gatilho não dispara');
});

// ───────────────────────────── RAD-139 Boy Who Shattered Time ─────────────────────────────
test('Boy Who Shattered Time: ficha de unidade jogada consome o desconto e também ganha "Kill me at end of turn"', () => {
  const s = new Scenario();
  const ekko = setLegend(s, 0, 'RAD-139');
  s.e.empowerObj(ekko, 0);
  s.go();
  s.pick(/Disempower em mim/);
  run(s);
  assert.equal(ekko.empowered, false, s.log());
  // ficha de unidade também é "jogar uma unidade" (185.2.a): é a próxima unidade
  const tok = s.e.runSync(s.e.playTokenG('TOK-RECRUIT', 0, base(0)));
  const later = s.put(0, UNIT, 'hand');
  assert.equal(s.e.effects.some((e) => e.nextPlay === 'unit' && e.player === 0), false, 'desconto consumido pela ficha');
  s.pick('Encerrar o turno');
  run(s);
  assert.notEqual(tok.zone, 'board', 'a ficha morre no fim do turno: ' + s.log(20));
  assert.equal(later.zone, 'hand');
});

// ───────────────────────────── RAD-140 Chronobreak ─────────────────────────────
test('Chronobreak: o dono escolhe entre o mesmo local e a base dele', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-087', BF0);
  s.put(0, 'RAD-140', 'hand');
  s.runes(0, [...rs(R.fury, 2), R.mind]);
  s.go();
  s.pick('Jogar Chronobreak');
  let asked = false;
  run(s, (d) => {
    if (/quanto Power pagar/.test(d.prompt)) return pickBy(d, /^1$/);
    if (/jogar .* de volta onde/.test(d.prompt)) {
      asked = true;
      return pickBy(d, /base/);
    }
    return undefined;
  });
  assert.ok(asked, s.log(20));
  assert.equal(u.zone, 'board');
  assert.equal(u.loc?.t, 'base', s.log(20));
});

// ───────────────────────────── RAD-144 Realm of Death ─────────────────────────────
test('Realm of Death: com a unidade inimiga fora do tabuleiro, a aliada ainda ganha +2 (359.3.e.5)', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-087', BF0);
  const spell = s.put(0, 'RAD-144', 'trash');
  s.go();
  const m0 = s.e.might(mine);
  // resolução com só o alvo aliado ainda legal (o inimigo saiu antes de resolver)
  s.e.runSync(getScript('RAD-144')!.spell!.resolve({ g: s.e, self: spell, p: 0, targets: [[], [mine]], data: {}, rep: 0 }));
  assert.equal(s.e.might(mine), m0 + 2, s.log(20));
  assert.equal(mine.damage, 0);
});

// ───────────────────────────── RAD-145 Lady of Clockwork ─────────────────────────────
test('Lady of Clockwork: o gear anterior deixa de ser unidade ao finalizar o gatilho (antes de resolver)', () => {
  const s = new Scenario();
  const lady = setLegend(s, 0, 'RAD-145');
  const haven = s.put(0, 'OGN-143', base(0));
  const helm = s.put(0, 'OGN-228', base(0));
  s.e.makeUnitGear(haven, lady);
  s.runes(0, [R.calm]);
  s.go();
  assert.ok(s.e.isUnit(haven));
  s.pick('Encerrar o turno');
  run(s);
  s.pick('Encerrar o turno');
  run(s, (d) => (/Lady of Clockwork: qual gear/.test(d.prompt) ? objOpt(d, helm) : undefined));
  const log = s.e.log.map((l) => l.text);
  const stop = log.findIndex((t) => /Pirate's Haven deixa de ser unidade/.test(t));
  const onChain = log.findIndex((t) => /^Na pilha: .*Lady of Clockwork/.test(t));
  assert.ok(stop >= 0 && onChain > stop, 'deixa de ser unidade ao finalizar, antes de ir para a pilha: ' + s.log(20));
  assert.ok(s.e.isUnit(helm));
  assert.equal(s.e.isUnit(haven), false);
});

test('Lady of Clockwork: gear com Deploy que vira unidade num campo que você não controla deixa o campo disputado', () => {
  const s = new Scenario();
  const lady = setLegend(s, 0, 'RAD-145');
  const ball = s.put(0, 'RAD-146', BF0);
  s.e.bfs[0].controller = 1;
  s.e.bfs[0].contestedBy = null;
  s.e.makeUnitGear(ball, lady);
  assert.equal(s.e.bfs[0].contestedBy, 0);
});

// ───────────────────────────── unit gear: gatilhos de morte olham para trás ─────────────────────────────
test('Unit gear por efeito que morre é visto como unidade pelo gatilho "outra unidade aliada morre" (323.4, 428.1.a.1.b)', () => {
  const s = new Scenario();
  const lady = setLegend(s, 0, 'RAD-145');
  s.put(0, 'UNL-129', base(0)); // Vicious Snapjaws: "When another friendly unit dies, gain 1 XP"
  const helm = s.put(0, 'OGN-228', base(0));
  s.e.makeUnitGear(helm, lady);
  s.go();
  const n = s.e.pending.length;
  s.e.runSync(s.e.killG(helm));
  assert.equal(s.e.pending.length, n + 1, 'Snapjaws dispara');
  assert.equal(s.e.isUnit(helm), false, 'no descarte não é unidade');
});
