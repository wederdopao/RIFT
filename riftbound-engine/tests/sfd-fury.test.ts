// Testes de cenário do lote "fury" do Spiritforged (SFD-001..SFD-030). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
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

test('Against the Odds: +2 por unidade inimiga no campo, contado na resolução', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  s.put(1, 'OGN-019', BF0);
  s.put(1, 'OGN-019', BF0);
  s.put(0, 'SFD-001', 'hand');
  s.runes(0, fury(2));
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !(s.d.kind === 'focus' && s.d.player === 0); i++) s.pick('Passar');
  s.pick('Jogar Against the Odds');
  s.maybeObj(u);
  run(s);
  assert.ok(s.log(60).includes('Wizened Elder recebe +4 de Might neste turno'), s.log(60));
});

test('Blood Rush: Repeat no mesmo alvo soma Assault (807.2) e dura o turno', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  s.put(0, 'SFD-003', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Blood Rush');
  s.maybeObj(u);
  assert.match(s.d.prompt, /Repeat/);
  s.pick('Sim');
  s.maybeObj(u);
  run(s);
  assert.equal(s.e.kw(u).assault, 4, s.log());
});

test('Bushwhack: unidades aliadas entram prontas neste turno e Gold exaurido na base', () => {
  const s = new Scenario();
  s.put(0, 'SFD-004', 'hand');
  const unit = s.put(0, 'OGN-065', 'hand');
  s.runes(0, fury(9));
  s.go();
  s.pick('Jogar Bushwhack');
  run(s);
  const gold = s.e.gearOf(0).find((o) => o.code === 'TOK-GOLD');
  assert.ok(gold, 'ficha Gold criada\n' + s.log());
  assert.equal(gold!.exhausted, true);
  assert.deepEqual(gold!.loc, base(0));
  s.pick('Jogar Wizened Elder');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  run(s, no);
  assert.equal(unit.zone, 'board');
  assert.equal(unit.exhausted, false, 'entra pronta');
});

test('Detonate: mata o gear e o controlador dele compra 2', () => {
  const s = new Scenario();
  const gear = s.put(1, 'SFD-009', base(1));
  s.put(0, 'SFD-005', 'hand');
  s.runes(0, fury(2));
  s.go();
  const h1 = s.e.pl[1].hand.length;
  s.pick('Jogar Detonate');
  s.maybeObj(gear);
  run(s);
  assert.equal(gear.zone, 'trash');
  assert.equal(s.e.pl[1].hand.length, h1 + 2, s.log());
});

test('Void Drone: custa [2] a menos fora da mão', () => {
  const s = new Scenario();
  const inHand = s.put(0, 'SFD-010', 'hand');
  const inTrash = s.put(0, 'SFD-010', 'trash');
  assert.equal(s.e.energyDiscount(inHand, 0), 0);
  assert.equal(s.e.energyDiscount(inTrash, 0), -2);
});

test('Battering Ram: 1 a menos por carta jogada no turno, até o mínimo de 1', () => {
  const s = new Scenario();
  const ram = s.put(0, 'SFD-012', 'hand');
  assert.equal(s.e.energyDiscount(ram, 0), 0);
  const e = s.e;
  e.pl[0].played.push('x1', 'x2');
  assert.equal(e.energyDiscount(ram, 0), -2);
  e.pl[0].played.push('x3', 'x4', 'x5', 'x6', 'x7');
  assert.equal(e.data(ram).energy + e.energyDiscount(ram, 0), 1, 'mínimo de 1');
});

test('Blast Corps Cadet: só causa 2 se o custo adicional foi pago', () => {
  for (const pay of [true, false]) {
    const s = new Scenario();
    const enemy = s.put(1, 'OGN-065', BF0);
    s.put(0, 'SFD-013', 'hand');
    s.runes(0, fury(4));
    s.go();
    s.pick('Jogar Blast Corps Cadet');
    if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
    assert.match(s.d.prompt, /\[1\]\[Fury\]/);
    s.pick(pay ? 'Sim' : 'Não');
    run(s, (d) => (d.options.some((o) => o.obj === enemy.id) ? [d.options.find((o) => o.obj === enemy.id)!.id] : undefined));
    assert.equal(enemy.damage, pay ? 2 : 0, s.log());
  }
});

test('Minotaur Reckoner: unidades não podem se mover para a base', () => {
  const s = new Scenario();
  s.put(1, 'SFD-014', base(1));
  const u = s.put(0, 'OGN-065', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  assert.ok(!s.d.options.some((o) => o.id === 'move'), 'sem destino possível: base bloqueada e sem Ganking');
  s.e.moveUnits([u], base(0), 0);
  assert.deepEqual(u.loc, BF0, 'movimento por efeito também é ignorado');
  s.e.recall(u);
  assert.deepEqual(u.loc, base(0), 'recall não é movimento');
});

test('Perched Grimwyrm: só num campo conquistado neste turno', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  const w = s.put(0, 'SFD-015', 'hand');
  s.runes(0, fury(4));
  s.go();
  assert.ok(!s.d.options.some((o) => o.id === `play:${w.id}:hand`), 'sem campo conquistado: não pode jogar');
  moveTo(s, [u.id], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.bfs[0].controller, 0, s.log());
  assert.ok(s.e.conqueredThisTurn.includes('0-0'));
  s.pick('Jogar Perched Grimwyrm');
  assert.deepEqual(w.loc, BF0, 'só um local possível: o campo conquistado\n' + s.log());
});

test('Recurve Bow: unidade equipada ataca e causa 2 numa unidade inimiga lá', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  const bow = s.put(0, 'SFD-016', base(0));
  s.e.attach(bow, u);
  const enemy = s.put(1, 'OGN-065', BF0);
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A');
  // o gatilho é da unidade equipada: alvo único, escolhido sozinho
  run(s);
  assert.ok(/Recurve Bow/.test(s.log(40)), s.log(40));
  assert.ok(s.log(60).includes(`${s.e.name(enemy)} recebe 2 de dano`), s.log(60));
});

test('Draven, Vanquisher: pagar [Fury] ao atacar; vencer o combate dá Gold exaurido', () => {
  const s = new Scenario();
  const dr = s.put(0, 'SFD-020', base(0));
  s.put(1, 'OGN-019', BF0); // 2 de Might
  s.runes(0, fury(1));
  s.go();
  moveTo(s, [dr.id], 'Campo Vazio A');
  run(s, yes);
  assert.ok(/Draven, Vanquisher recebe \+2/.test(s.log(60)), s.log(60));
  const gold = s.e.gearOf(0).find((o) => o.code === 'TOK-GOLD');
  assert.ok(gold, 'venceu: Gold\n' + s.log(60));
  assert.equal(gold!.exhausted, true);
});

test('Draven, Vanquisher: sem vitória (empate de recall) não dá Gold', () => {
  const s = new Scenario();
  const dr = s.put(0, 'SFD-020', base(0));
  s.put(1, 'OGN-065', BF0);
  s.put(1, 'OGN-065', BF0);
  s.put(1, 'OGN-065', BF0);
  s.go();
  moveTo(s, [dr.id], 'Campo Vazio A');
  run(s, no);
  assert.ok(!s.e.gearOf(0).some((o) => o.code === 'TOK-GOLD'), s.log(40));
});

test('Lucian, Gunslinger: dano igual ao Assault total (com Serrated Dirk)', () => {
  const s = new Scenario();
  const l = s.put(0, 'SFD-028', base(0));
  const dirk = s.put(0, 'SFD-009', base(0));
  s.e.attach(dirk, l);
  const enemy = s.put(1, 'OGN-065', BF0);
  s.go();
  assert.equal(s.e.kw(l).assault, 3);
  moveTo(s, [l.id], 'Campo Vazio A');
  run(s);
  assert.ok(s.log(60).includes(`${s.e.name(enemy)} recebe 3 de dano de Lucian`), s.log(60));
});

test('Rell, Magnetic: ao atacar joga um Equipment da mão de graça e o equipa nela', () => {
  const s = new Scenario();
  const rell = s.put(0, 'SFD-024', base(0));
  const sword = s.put(0, 'SFD-022', 'hand'); // Quick-Draw: depois o gatilho dele também equipa
  s.put(1, 'OGN-019', BF0);
  s.go();
  moveTo(s, [rell.id], 'Campo Vazio A');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.options.some((o) => o.obj === rell.id) ? [d.options.find((o) => o.obj === rell.id)!.id] : undefined));
  assert.equal(sword.zone, 'board', s.log(60));
  assert.equal(sword.attachedTo, rell.id, s.log(60));
  assert.equal(s.e.pl[0].pool.energy, 0);
});

test('Rengar, Pouncing: Reaction num campo que você está atacando', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-019', base(0));
  const r = s.put(0, 'SFD-025', 'hand');
  s.runes(0, fury(4));
  s.put(1, 'OGN-065', BF0);
  s.go();
  moveTo(s, [u.id], 'Campo Vazio A');
  // combate em BF0 com A atacando: no Focus, Rengar pode ir para lá
  for (let i = 0; i < 10 && !(s.d.kind === 'focus' && s.d.player === 0); i++) s.pick('Passar');
  s.pick('Jogar Rengar');
  assert.ok(s.d.options.some((o) => o.label === 'Campo Vazio A'), 'o campo atacado é um local válido');
  s.pick('Campo Vazio A');
  assert.deepEqual(r.loc, BF0);
  assert.equal(r.role, 'attacker', 'ganha a designação de atacante na limpeza (RiftJudge #9610)');
  assert.equal(s.e.might(r), 5, 'Assault 2 como atacante');
  run(s);
  assert.equal(s.e.bfs[0].controller, 0, s.log(60));
});

test('Rek\'Sai, Breacher: unidade jogada de fora da mão ganha Accelerate', () => {
  const s = new Scenario();
  s.put(0, 'SFD-029', base(0));
  const drone = s.put(0, 'SFD-010', 'trash');
  const inHand = s.put(0, 'SFD-010', 'hand');
  s.runes(0, fury(6));
  s.go();
  // da mão: sem pergunta de Accelerate
  s.pick('Jogar Void Drone');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  assert.ok(!/Accelerate/.test(s.d.prompt), 'da mão não tem Accelerate');
  run(s, no);
  assert.equal(inHand.exhausted, true);
  // do descarte (por efeito): Accelerate oferecido
  const e = s.e;
  const gen = e.playFromEffect(0, drone, e.printedCost(drone));
  let r = gen.next(undefined as any);
  const prompts: string[] = [];
  while (!r.done) {
    prompts.push(r.value.prompt);
    const d = r.value;
    r = gen.next(d.kind === 'confirm' ? ['yes'] : [d.options[0].id]);
  }
  assert.ok(prompts.some((p) => /Accelerate/.test(p)), prompts.join(' | '));
  assert.equal(drone.zone, 'board');
  assert.equal(drone.exhausted, false, 'entrou pronta pagando Accelerate');
});

test('Rumble, Hotheaded: conquista recicla outra unidade e joga Mech do descarte com desconto', () => {
  const s = new Scenario();
  const rumble = s.put(0, 'SFD-026', base(0));
  const other = s.put(0, 'OGN-065', base(0)); // Elder: 4 de Might
  const mech = s.put(0, 'SFD-021', 'trash'); // Ferrous Forerunner (Mech) custo 6
  s.runes(0, fury(3));
  s.go();
  assert.equal(s.e.kw(rumble).assault, 1, 'Rumble é Mech: tem Assault');
  moveTo(s, [rumble.id], 'Campo Vazio A');
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (d.prompt.startsWith('Rumble: reciclar')) return [other.id];
    if (/Rumble: jogar qual Mech/.test(d.prompt)) return [mech.id];
    if (/onde\?/.test(d.prompt)) return [d.options.find((o) => o.label === 'Campo Vazio A')!.id];
    if (/Como pagar/.test(d.prompt)) return [d.options[0].id];
    return undefined;
  });
  assert.equal(other.zone, 'mainDeck', s.log(40));
  assert.equal(mech.zone, 'board', s.log(40));
  assert.deepEqual(mech.loc, BF0, 'pode ir para o campo conquistado (RiftJudge #11244)');
  // custo 6 - 4 = [2] + [Fury]: exaure 2 runas e recicla uma delas
  assert.equal(s.e.runesOf(0).length, 2, s.log(40));
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 1, 'sobrou uma runa pronta');
});

test('Skyfall of Areion: a habilidade de hold (Dunebreaker) dispara ao conquistar', () => {
  const s = new Scenario();
  const dune = s.put(0, 'SFD-027', base(0));
  const sky = s.put(0, 'SFD-030', base(0));
  s.e.attach(sky, dune);
  s.go();
  const h = s.e.pl[0].hand.length;
  moveTo(s, [dune.id], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.pl[0].hand.length, h + 2, s.log(30));
  assert.equal(s.e.might(dune), 9, '+2 de Might do Skyfall');
});

test('Skyfall of Areion: sem o equipamento, conquistar não dispara o hold', () => {
  const s = new Scenario();
  const dune = s.put(0, 'SFD-027', base(0));
  s.go();
  const h = s.e.pl[0].hand.length;
  moveTo(s, [dune.id], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.pl[0].hand.length, h, s.log(30));
});

test('Dunebreaker: entra pronta com 2 ou menos cartas na mão', () => {
  for (const extra of [1, 3]) {
    const s = new Scenario();
    const d = s.put(0, 'SFD-027', 'hand');
    for (let k = 0; k < extra; k++) s.put(0, 'OGN-019', 'hand');
    s.runes(0, fury(8));
    s.go();
    s.pick('Jogar Dunebreaker');
    if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
    run(s, no);
    assert.equal(d.exhausted, extra > 2, `com ${extra} na mão`);
  }
});

test('Angle Shot: equipa um Equipment em outra unidade do mesmo controlador, depois desequipa; compra 1', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-065', base(0));
  const b = s.put(0, 'OGN-019', BF0);
  s.e.bfs[0].controller = 0;
  const dirk = s.put(0, 'SFD-009', base(0));
  s.e.attach(dirk, a);
  s.put(0, 'SFD-011', 'hand');
  s.put(0, 'SFD-011', 'hand');
  s.runes(0, fury(4));
  s.go();
  const h = s.e.pl[0].hand.length;
  s.pick('Jogar Angle Shot');
  s.pickObj(b);
  s.maybeObj(dirk);
  run(s, (d) => (d.prompt.startsWith('Angle Shot:') ? ['attach'] : undefined));
  assert.equal(dirk.attachedTo, b.id, s.log());
  assert.deepEqual(s.e.locOf(dirk), BF0);
  assert.equal(s.e.pl[0].hand.length, h - 1 + 1, 'comprou 1');
  s.pick('Jogar Angle Shot');
  s.pickObj(b);
  s.maybeObj(dirk);
  run(s, (d) => (d.prompt.startsWith('Angle Shot:') ? ['detach'] : undefined));
  assert.equal(dirk.attachedTo, undefined, s.log());
  assert.deepEqual(dirk.loc, base(0), 'gear solto no campo volta para a base na limpeza (435.4.a)');
});

test('Piercing Light: segundo alvo é outra unidade (qualquer lugar) e pode ficar vazio', () => {
  const s = new Scenario();
  const x = s.put(1, 'OGN-065', BF0);
  const y = s.put(1, 'OGN-065', base(1));
  s.put(0, 'SFD-023', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Piercing Light');
  s.maybeObj(x);
  assert.ok(!s.d.options.some((o) => o.obj === x.id), 'não pode ser a mesma');
  s.pickObj(y);
  run(s);
  assert.equal(x.damage, 2);
  assert.equal(y.damage, 2, s.log());
});

test('Sudden Storm: 4 de dano numa unidade atacando', () => {
  const s = new Scenario();
  const att = s.put(1, 'OGN-065', BF0);
  const e = s.e;
  e.showdown = { bf: 0, combat: true, focus: 0, passes: 0, flipAfterChain: false, attacker: 1, defender: 0, excess: [0, 0] };
  att.role = 'attacker';
  const st = s.put(0, 'SFD-017', 'hand');
  e.toZone(st, 'chain');
  e.dealDamage(att, 0);
  // resolve o spell direto
  const ab = e.script(st).spell!;
  const c = e.ctx(st, 0);
  c.targets = [[att]];
  e.runSync(ab.resolve(c));
  assert.equal(att.damage, 4);
});

test('Assembly Rig: recicla unidade do descarte como custo e cria Mech 3 na base', () => {
  const s = new Scenario();
  s.put(0, 'SFD-019', base(0));
  const dead = s.put(0, 'OGN-065', 'trash');
  s.runes(0, fury(2));
  s.go();
  s.pick('Assembly Rig');
  run(s, (d) => (d.options.some((o) => o.id === dead.id) ? [dead.id] : undefined));
  assert.equal(dead.zone, 'mainDeck');
  const mech = s.e.units().find((u) => u.code === 'TOK-MECH');
  assert.ok(mech, s.log());
  assert.deepEqual(mech!.loc, base(0));
  assert.equal(s.e.might(mech!), 3);
});

test('Ferrous Forerunner: Deathknell joga duas fichas Mech na base', () => {
  const s = new Scenario();
  const f = s.put(0, 'SFD-021', base(0));
  s.go();
  s.e.kill(f);
  s.e.runSync(s.e.drain());
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-MECH' && u.controller === 0).length, 2, s.log());
});

test('Void Hatchling: antes de revelar, olha o topo e pode reciclá-lo', () => {
  const s = new Scenario();
  s.put(0, 'SFD-018', base(0));
  const top = s.put(0, 'OGN-019', 'deckTop');
  s.go();
  s.e.runSync(s.e.beforeReveal(0, 0)); // resposta padrão: Sim
  const deck = s.e.pl[0].mainDeck;
  assert.equal(deck[deck.length - 1], top.id, 'reciclado para o fundo');
  // sem Hatchling do jogador que revela, nada muda
  const top2 = s.put(1, 'OGN-019', 'deckTop');
  s.e.runSync(s.e.beforeReveal(1, 1));
  assert.equal(s.e.pl[1].mainDeck[0], top2.id);
});

test('Gem Jammer: dá Ganking a uma unidade neste turno', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'SFD-007', 'hand');
  s.runes(0, fury(2));
  s.go();
  s.pick('Jogar Gem Jammer');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  run(s, (d) => (d.options.some((o) => o.obj === u.id) ? [d.options.find((o) => o.obj === u.id)!.id] : undefined));
  assert.equal(s.e.kw(u).ganking, true, s.log());
});

test('Perched Grimwyrm jogada por efeito sem campo conquistado: não é jogada', () => {
  const s = new Scenario();
  const w = s.put(0, 'SFD-015', 'trash');
  s.go();
  s.e.runSync(s.e.playFromEffect(0, w, s.e.printedCost(w)));
  assert.equal(w.zone, 'trash');
});

test('Skyfall of Areion + Reckoner\'s Arena: hold ativa também as habilidades de hold como de conquista', () => {
  const s = new Scenario();
  const e = s.e;
  const arena = e.newObj('OGN-286', 0, 'battlefieldZone');
  e.bfs[0].objId = arena.id;
  const dune = s.put(0, 'SFD-027', BF0);
  const sky = s.put(0, 'SFD-030', base(0));
  e.attach(sky, dune);
  s.go();
  const h = e.pl[0].hand.length;
  // fim do turno de A, turno de B, e no início do próximo turno de A ele segura o campo
  s.pick('Encerrar o turno');
  run(s, () => undefined);
  if (s.d.kind === 'action' && s.d.player === 1) s.pick('Encerrar o turno');
  run(s, (d) => (d.prompt.startsWith('Vários efeitos') ? [d.options[0].id] : undefined));
  // a habilidade de hold do Dunebreaker dispara pelo hold e de novo como habilidade de conquista ativada pelo Arena
  const n = e.log.filter((l) => l.text === 'Resolve: Dunebreaker: Hold: comprar 2.').length;
  assert.equal(n, 2, s.log(80));
  assert.ok(e.pl[0].hand.length >= h + 5);
});

test('Rek\'Sai, Breacher: fichas de unidade jogadas também podem pagar Accelerate (RiftJudge #9414, #9360)', () => {
  const s = new Scenario();
  s.put(0, 'SFD-029', base(0));
  const f = s.put(0, 'SFD-021', base(0));
  s.runes(0, fury(1)); // exaurir e reciclar a mesma runa paga um Accelerate: só uma das duas fichas
  s.go();
  s.e.kill(f);
  const answers: string[] = [];
  const gen = s.e.drain();
  let r = gen.next(undefined as any);
  while (!r.done) {
    const d = r.value;
    if (/Accelerate/.test(d.prompt)) {
      answers.push(d.prompt);
      r = gen.next(['yes']);
    } else r = gen.next([d.options[0].id]);
  }
  const mechs = s.e.units().filter((u) => u.code === 'TOK-MECH');
  assert.equal(mechs.length, 2);
  assert.equal(answers.length, 1, 'a segunda ficha não tem como pagar');
  assert.equal(mechs.filter((m) => !m.exhausted).length, 1);
});
