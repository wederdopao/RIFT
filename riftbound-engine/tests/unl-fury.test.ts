// Testes de cenário do lote "fury" do Unleashed (UNL-001..UNL-030). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const F = RUNE.fury;
const fury = (n: number) => Array.from({ length: n }, () => F);

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Avança passando a prioridade/Focus; `other` responde as demais decisões (undefined = parar). */
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 60) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      if (!a) return;
      s.ok(a);
    }
  }
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);
const no = (d: Decision) => (d.kind === 'confirm' ? ['no'] : undefined);
function where(s: Scenario, text: string) {
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick(text);
}
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

test('Smite: a unidade que morreria é banida (sem ir ao descarte)', () => {
  const s = new Scenario();
  const u = s.put(1, 'UNL-001', BF0); // 3 de Might
  s.put(0, 'UNL-007', 'hand');
  s.runes(0, fury(3));
  s.go();
  s.pick('Jogar Smite');
  s.maybeObj(u);
  run(s);
  assert.equal(u.zone, 'banish', s.log());
});

test('Smite: a substituição dura o turno (morte posterior também vira banimento)', () => {
  const s = new Scenario();
  const u = s.put(1, 'OGN-065', BF0); // 4 de Might: sobrevive aos 3
  s.put(0, 'UNL-007', 'hand');
  const a = s.put(0, 'UNL-003', base(0)); // 2 de Might
  s.runes(0, fury(3));
  s.go();
  s.pick('Jogar Smite');
  s.maybeObj(u);
  run(s);
  assert.equal(u.zone, 'board', s.log());
  moveTo(s, [a.id], 'Campo Vazio A'); // morre no combate, ainda neste turno
  run(s);
  assert.equal(u.zone, 'banish', s.log());
  assert.ok(!s.e.pl[1].trash.includes(u.id));
});

test('Smite × Zhonya: quem controla a unidade escolhe a ordem (372)', () => {
  const s = new Scenario();
  const u = s.put(1, 'UNL-001', BF0);
  const z = s.put(1, 'OGN-077', base(1));
  s.put(0, 'UNL-007', 'hand');
  s.runes(0, fury(3));
  s.go();
  s.pick('Jogar Smite');
  s.maybeObj(u);
  run(s, (d) => {
    if (/substituição se aplica primeiro/.test(d.prompt)) {
      assert.equal(d.player, 1);
      return [d.options.find((o) => !/banida/.test(o.label))!.id];
    }
    return yes(d);
  });
  assert.equal(u.zone, 'board', s.log());
  assert.deepEqual(u.loc, base(1));
  assert.equal(z.zone, 'trash');
});

test('Lotus Trap: dano dobrado; no combate o letal conta a duplicação', () => {
  const s = new Scenario();
  const u = s.put(1, 'UNL-001', BF0); // 3 de Might
  s.put(0, 'UNL-013', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Lotus Trap');
  s.maybeObj(u);
  run(s);
  assert.equal(s.e.lethalNeed(u), 2);
  s.e.dealDamage(u, 1);
  assert.equal(u.damage, 2);
});

test('Lotus Trap: atacante de 2 mata defensor de 3 com dano dobrado', () => {
  const s = new Scenario();
  const d = s.put(1, 'UNL-001', BF0);
  const a = s.put(0, 'UNL-003', base(0)); // 2 de Might
  s.put(0, 'UNL-013', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Lotus Trap');
  s.maybeObj(d);
  run(s);
  moveTo(s, [a.id], 'Campo Vazio A');
  run(s);
  assert.equal(d.zone, 'trash', s.log(40));
});

test('Dancing Grenade: o controlador da unidade atingida joga de novo por [A] com dano crescente', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-065', base(0)); // 4
  const theirs = s.put(1, 'OGN-065', base(1)); // 4
  const card = s.put(0, 'UNL-020', 'hand');
  s.runes(0, fury(4));
  s.runes(1, fury(1));
  s.go();
  s.pick('Jogar Dancing Grenade');
  s.pickObj(theirs);
  let asked = 0;
  run(s, (d) => {
    if (/de novo/.test(d.prompt)) {
      asked++;
      // B joga de volta (contra a minha unidade); depois eu recuso
      return [d.player === 1 ? 'yes' : 'no'];
    }
    if (/2 de dano em qual/.test(d.prompt)) return [d.options.find((o) => o.obj === mine.id)!.id];
    return undefined;
  });
  assert.equal(asked, 2, s.log(30));
  assert.equal(theirs.damage, 2);
  assert.equal(mine.damage, 3, s.log(30));
  assert.equal(card.zone, 'trash');
  assert.equal(card.owner, 0);
});

test('Square Up: Repeat pago descartando 1; Assault soma no mesmo alvo', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  s.put(0, 'UNL-017', 'hand');
  const other = s.put(0, 'UNL-006', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Square Up');
  s.maybeObj(u);
  assert.match(s.d.prompt, /Repeat \(descartar 1\)/);
  s.pick('Sim');
  s.maybeObj(u);
  run(s);
  assert.equal(other.zone, 'trash');
  assert.equal(s.e.kw(u).assault, 8, s.log());
});

test('Prepared Neophyte e Revna: spell de [4] dá +4 e prepara a Revna', () => {
  const s = new Scenario();
  const neo = s.put(0, 'UNL-004', base(0));
  const revna = s.put(0, 'UNL-005', base(0), { ready: false });
  s.put(0, 'UNL-017', 'hand');
  s.runes(0, fury(4));
  s.go();
  assert.equal(s.e.might(neo), 1);
  s.pick('Jogar Square Up');
  s.maybeObj(neo);
  run(s);
  assert.equal(s.e.might(neo), 5);
  assert.equal(revna.exhausted, false, s.log());
});

test('Red Brambleback: os próprios efeitos de conquista disparam uma vez a mais', () => {
  const s = new Scenario();
  const rb = s.put(0, 'UNL-029', base(0));
  const other = s.put(0, 'OGN-065', base(0));
  s.go();
  moveTo(s, [rb.id], 'Campo Vazio A');
  let buffs = 0;
  run(s, (d) => {
    if (/dar Buff/.test(d.prompt)) return [d.options.find((o) => o.obj === (buffs++ === 0 ? rb.id : other.id))!.id];
    if (/primeiro/.test(d.prompt)) return [d.options[0].id];
    return undefined;
  });
  assert.equal((s.log().match(/Resolve: Red Brambleback: Buff/g) || []).length, 2, s.log());
  assert.equal(rb.buffs, 1);
  assert.equal(other.buffs, 1);
});

test('Jhin, Murderous Artist: mover adiciona [1][A] na hora, sem pilha', () => {
  const s = new Scenario();
  const j = s.put(0, 'UNL-022', base(0));
  s.go();
  moveTo(s, [j.id], 'Campo Vazio A');
  run(s);
  const pool = s.e.pl[0].pool;
  assert.equal(pool.energy, 1);
  assert.equal(pool.power.any, 1);
  assert.ok(!s.log(20).includes('Na pilha: Jhin'), s.log(20));
});

test('Katarina, Reckless: esconder a prepara; jogar de face para baixo causa 2 a um inimigo', () => {
  const s = new Scenario();
  const k = s.put(0, 'UNL-023', base(0), { ready: false });
  s.put(0, 'UNL-024', BF0); // controla o campo
  s.put(0, 'UNL-003', 'hand');
  const enemy = s.put(1, 'OGN-065', base(1));
  s.runes(0, fury(1));
  s.go();
  s.pick('Esconder Mischievous Marai');
  run(s);
  assert.equal(k.exhausted, false, s.log());
  const fd = s.e.bfs[0].facedown.map((id) => s.e.objs[id])[0];
  fd.hiddenTurn = 0;
  s.go();
  s.pick('Jogar Mischievous Marai');
  run(s, (d) => {
    if (/Katarina/.test(d.prompt)) return [d.options.find((o) => o.obj === enemy.id)!.id];
    if (/primeiro/.test(d.prompt)) return [d.options[0].id];
    return undefined;
  });
  assert.equal(enemy.damage, 2, s.log());
});

test('Undying Legion: do descarte por [3][Fury] só com Legion', () => {
  const s = new Scenario();
  const ul = s.put(0, 'UNL-025', 'trash');
  s.put(0, 'UNL-010', 'hand');
  s.put(0, 'OGN-065', base(0));
  s.runes(0, fury(5));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Jogar Undying Legion')));
  s.pick('Jogar Vault Breaker');
  run(s, (d) => (d.prompt.includes('Vault Breaker') ? [d.options[0].id] : undefined));
  s.pick('Jogar Undying Legion (do descarte)');
  where(s, 'base');
  run(s);
  assert.equal(ul.zone, 'board', s.log());
});

test('Blighted Battleaxe: sem conquistar, desanexa e causa 4 no fim do turno', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0)); // 4 (+4 do machado)
  const ax = s.put(0, 'UNL-019', base(0));
  s.runes(0, fury(2));
  s.go();
  s.pick('Equipar Blighted Battleaxe');
  s.maybeObj(u);
  run(s);
  assert.equal(ax.attachedTo, u.id);
  assert.equal(s.e.might(u), 8);
  s.pick('Encerrar o turno');
  for (let i = 0; i < 10 && s.d.player === 0 && (s.d.kind === 'priority'); i++) s.pick('Passar');
  assert.equal(ax.attachedTo, undefined, s.log());
  assert.equal(u.zone, 'trash'); // sem o +4 do machado fica com 4 de Might: os 4 de dano são letais
});

test('Blighted Battleaxe: a unidade que conquistou não sofre o efeito', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  const ax = s.put(0, 'UNL-019', base(0));
  s.runes(0, fury(2));
  s.go();
  s.pick('Equipar Blighted Battleaxe');
  s.maybeObj(u);
  run(s);
  moveTo(s, [u.id], 'Campo Vazio A');
  run(s);
  assert.ok(s.e.unitConqueredThisTurn(u));
  s.pick('Encerrar o turno');
  assert.equal(ax.attachedTo, u.id, s.log());
});

test('Pyke: custo adicional pago entra pronto e com +2', () => {
  const s = new Scenario();
  const p = s.put(0, 'UNL-028', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Pyke');
  where(s, 'base');
  run(s, yes);
  assert.equal(p.exhausted, false);
  assert.equal(s.e.might(p), 4, s.log());
});

test('Fresh Beans: jogar unidade num showdown permite exaurir para comprar', () => {
  const s = new Scenario();
  const fb = s.put(0, 'UNL-011', base(0));
  const a = s.put(0, 'OGN-065', base(0));
  s.put(0, 'UNL-002', 'hand'); // Inferna (Ambush)
  s.put(1, 'OGN-065', BF0);
  s.runes(0, fury(2));
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  moveTo(s, [a.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !(s.d.kind === 'focus' && s.d.player === 0); i++) s.pick('Passar');
  s.pick('Jogar Inferna');
  where(s, 'Campo Vazio A');
  run(s, yes, 3);
  assert.equal(fb.exhausted, true, s.log());
  assert.equal(s.e.pl[0].hand.length, hand0, s.log()); // jogou 1, comprou 1
});

test('Scorchclaw: com 3 XP entra pronta e tem +1', () => {
  const s = new Scenario();
  const sc = s.put(0, 'UNL-016', 'hand');
  s.e.pl[0].xp = 3;
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Scorchclaw');
  where(s, 'base');
  run(s);
  assert.equal(sc.exhausted, false);
  assert.equal(s.e.might(sc), 4);
});

test('Grim Apothecary: opcional; devolve uma unidade aliada num campo', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  s.put(0, 'UNL-021', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Grim Apothecary');
  where(s, 'base');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : /devolver qual/.test(d.prompt) ? [d.options.find((o) => o.obj === u.id)!.id] : undefined));
  assert.equal(u.zone, 'hand', s.log());
});

test('Yeti Brawler: 3+ de excedente na conquista dá dois Gold exauridos', () => {
  const s = new Scenario();
  const y = s.put(0, 'UNL-018', base(0)); // 6
  s.put(1, 'UNL-003', BF0); // 2
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  run(s);
  const gold = s.e.gearOf(0).filter((g) => g.code === 'TOK-GOLD');
  assert.equal(gold.length, 2, s.log(40));
  assert.ok(gold.every((g) => g.exhausted));
});

test('Vi, Hotheaded: dobra o Might (duas vezes = x4)', () => {
  const s = new Scenario();
  const vi = s.put(0, 'UNL-030', base(0));
  s.runes(0, fury(6));
  s.go();
  s.pick('Vi, Hotheaded: Dobrar');
  run(s);
  assert.equal(s.e.might(vi), 6);
  s.pick('Vi, Hotheaded: Dobrar');
  run(s);
  assert.equal(s.e.might(vi), 12);
});

test('Monster Harpoon: 4 de dano se você controla carta escondida', () => {
  const s = new Scenario();
  const u = s.put(1, 'OGN-065', BF0);
  hideAt(s, 0, 'UNL-013', 1);
  s.put(0, 'UNL-014', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Monster Harpoon');
  s.maybeObj(u);
  run(s);
  assert.equal(u.zone, 'trash', s.log());
});
