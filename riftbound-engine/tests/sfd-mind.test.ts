// Testes de cenário das cartas do lote "mind" do Spiritforged (SFD-061..SFD-090).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';

const MIND = 'OGN-089';
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const mind = (n: number) => Array.from({ length: n }, () => MIND);
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));
function maybe(s: Scenario, text: string) {
  if (s.g.current && !s.d.root && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
/** Passa a prioridade e ordena gatilhos simultâneos até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** Responde "Jogar X onde?" (só pergunta quando há mais de um local). */
function at(s: Scenario, label = 'base de A') {
  if (s.g.current && /onde\?/.test(s.d.prompt)) s.pick(label);
}
const golds = (s: Scenario, p: P) => s.e.gearOf(p).filter((g) => g.code === 'TOK-GOLD');
const gold = (s: Scenario, p: P, ready = true) => {
  const o = s.e.createToken('TOK-GOLD', p, base(p), ready);
  return o;
};

// ───────────────────────────── Mechs ─────────────────────────────

test('Experimental Hexplate: a unidade equipada é um Mech (Rumble dá +1, Bubble Bot prepara)', () => {
  const s = new Scenario();
  const e = s.e;
  const rumble = s.put(0, 'SFD-089', base(0)); // Rumble, Scrapper: Mech 4 (+1 de si mesmo)
  const u = s.put(0, 'OGN-049', base(0)); // Playful Phantom (5), não é Mech
  const plate = s.put(0, 'SFD-073', base(0));
  assert.equal(e.might(rumble), 5, 'Rumble é Mech e se dá +1');
  assert.equal(e.hasTag(u, 'Mech'), false);
  e.attach(plate, u);
  assert.equal(e.hasTag(u, 'mech'), true, 'tag sem diferenciar maiúsculas');
  assert.equal(e.might(u), 5 + 1 + 1, 'Might Bonus +1 e +1 do Rumble');
  // Bubble Bot (tag "mech" minúscula no banco) prepara outro Mech
  u.exhausted = true;
  s.runes(0, mind(3));
  const bot = s.put(0, 'SFD-062', 'hand');
  s.go();
  s.pick('Jogar Bubble Bot');
  at(s);
  assert.match(s.d.prompt, /Bubble Bot: preparar/);
  assert.ok(!s.d.options.some((o) => o.obj === bot.id), 'outro Mech, não ela mesma');
  s.pickObj(u);
  drain(s);
  assert.equal(u.exhausted, false);
  assert.equal(e.might(bot), 4, 'Bubble Bot 3 + Rumble');
});

test('Gearhead: Equipment anexado dá o dobro do Might Bonus base', () => {
  const s = new Scenario();
  const e = s.e;
  const gh = s.put(0, 'SFD-068', base(0)); // 3
  const atlas = s.put(0, 'SFD-086', base(0)); // +2
  const plate = s.put(0, 'SFD-073', base(0)); // +1
  e.attach(atlas, gh);
  assert.equal(e.might(gh), 3 + 4);
  e.attach(plate, gh);
  assert.equal(e.might(gh), 3 + 4 + 2);
  const other = s.put(0, 'OGN-088', base(0));
  e.attach(atlas, other);
  assert.equal(e.might(other), 8 + 2, 'em outra unidade, o bônus normal');
  assert.equal(e.might(gh), 3 + 2);
});

test('Breakneck Mech: entra pronta com outro Mech; Mechs ganham Deflect e Ganking', () => {
  const s = new Scenario();
  const e = s.e;
  s.runes(0, [...mind(2), ...mind(8)]);
  const bm = s.put(0, 'SFD-071', 'hand');
  s.go();
  s.pick('Jogar Breakneck Mech');
  at(s);
  maybe(s, 'Não'); // Accelerate não existe aqui; nada a perguntar
  drain(s);
  assert.equal(bm.exhausted, true, 'sem outro Mech, entra exaurida');
  // agora com um Mech em jogo
  const s2 = new Scenario();
  const e2 = s2.e;
  const tok = e2.createToken('TOK-MECH', 0, base(0));
  s2.runes(0, mind(10));
  const bm2 = s2.put(0, 'SFD-071', 'hand');
  s2.go();
  s2.pick('Jogar Breakneck Mech');
  at(s2);
  drain(s2);
  assert.equal(bm2.exhausted, false, 'entra pronta');
  assert.equal(e2.kw(tok).deflect, 1);
  assert.equal(e2.kw(tok).ganking, true);
  const notMech = s2.put(0, 'OGN-049', base(0));
  assert.ok(!e2.kw(notMech).ganking);
  assert.equal(e.kw(bm).deflect, 1, 'ela mesma é Mech');
});

test('Forecaster: Mechs têm Vision (fichas de Mech jogadas também predizem)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-065', base(0));
  s.runes(0, mind(3));
  s.put(0, 'SFD-076', 'hand'); // Production Surge: 4 - 2 (Forecaster é Mech) + Mind
  s.go();
  assert.equal(e.energyDiscount(e.objs[e.pl[0].hand[0]], 0), -2, 'custa 2 a menos com um Mech');
  s.pick('Jogar Production Surge');
  drain(s);
  // a ficha de Mech foi jogada: Vision (predict) pergunta se recicla o topo
  assert.match(s.d.prompt, /Predict/);
  s.ok([]);
  drain(s);
  const mechs = e.units().filter((u) => u.code === 'TOK-MECH');
  assert.equal(mechs.length, 1);
  assert.equal(e.pl[0].hand.length, 1, 'comprou 1');
});

// ───────────────────────────── gear e Gold ─────────────────────────────

test('Prize of Progress: Equip e cada Gold usado no pagamento contam como usar habilidade de gear', () => {
  const s = new Scenario();
  const e = s.e;
  const pp = s.put(0, 'SFD-075', base(0)); // 3
  const plate = s.put(0, 'SFD-073', base(0));
  s.runes(0, mind(1));
  s.go();
  s.pick('Equipar Experimental Hexplate');
  s.maybeObj(pp);
  drain(s);
  assert.equal(plate.attachedTo, pp.id);
  assert.equal(e.might(pp), 3 + 1 + 1, 'Might Bonus +1 e +1 do Prize (Equip usado)');
  // dois Golds pagam o power de Premonition (2 + [Mind][Mind][Mind])
  gold(s, 0);
  gold(s, 0);
  s.runes(0, [...mind(1), RUNE.fury]);
  s.put(0, 'SFD-087', 'hand');
  s.go();
  s.payChoice = 'Gold';
  s.pick('Jogar Premonition');
  drain(s);
  assert.equal(golds(s, 0).length, 0);
  assert.equal(e.might(pp), 5 + 2, 'um +1 por Gold usado (FAQ #11964)');
});

test('Chemtech Cask: spell jogado no turno do oponente pode virar um Gold (exaurindo o Cask)', () => {
  const s = new Scenario();
  const e = s.e;
  const cask = s.put(1, 'SFD-063', base(1));
  s.runes(1, mind(4));
  s.put(1, 'SFD-087', 'hand'); // Premonition (Reaction)
  const enemyUnit = s.put(0, 'OGN-088', base(0));
  s.put(0, 'SFD-066', 'hand'); // Frigid Touch (Reaction) do jogador do turno
  s.runes(0, mind(2));
  s.go();
  s.pick('Jogar Frigid Touch');
  s.maybeObj(enemyUnit);
  // B responde com Premonition
  assert.equal(s.d.player, 1);
  s.pick('Jogar Premonition');
  drain(s);
  assert.match(s.d.prompt, /exaurir esta carta/);
  s.pick('Sim');
  drain(s);
  assert.equal(cask.exhausted, true);
  assert.equal(golds(s, 1).length, 1);
  assert.equal(golds(s, 1)[0].exhausted, true, 'Gold entra exaurido');
  assert.equal(golds(s, 0).length, 0, 'o spell do jogador do turno não conta para o Cask de B');
});

test('Card Sharp: o oponente aceita o Gold, e você ganha outro', () => {
  const s = new Scenario();
  s.runes(0, mind(3));
  s.put(0, 'SFD-081', 'hand');
  s.go();
  s.pick('Jogar Card Sharp');
  at(s);
  drain(s);
  assert.equal(s.d.player, 0, 'o jogador do turno decide primeiro (303.2.a)');
  s.pick('Sim');
  assert.equal(s.d.player, 1);
  s.pick('Sim');
  drain(s);
  assert.equal(golds(s, 0).length, 2);
  assert.equal(golds(s, 1).length, 1);
  assert.ok(golds(s, 0).every((g) => g.exhausted));
});

test('Pickpocket: mata um gear de custo até 1 (ficha conta como 0) e joga um Gold', () => {
  const s = new Scenario();
  const enemyGold = gold(s, 1);
  const portal = s.put(1, 'SFD-078', base(1)); // custo 3: não pode
  s.runes(0, mind(3));
  s.put(0, 'SFD-074', 'hand');
  s.go();
  s.pick('Jogar Pickpocket');
  at(s);
  drain(s);
  s.pick('Sim');
  assert.ok(s.d.root || !s.d.options.some((o) => o.obj === portal.id), 'gear de custo 3 fora');
  s.maybeObj(enemyGold);
  drain(s);
  assert.equal(enemyGold.zone, 'gone');
  assert.equal(golds(s, 0).length, 1);
});

test('Hextech Anomaly: paga power e adiciona a mesma quantidade de energia', () => {
  const s = new Scenario();
  const e = s.e;
  const ha = s.put(0, 'SFD-083', base(0));
  s.runes(0, [RUNE.fury, RUNE.calm]);
  s.go();
  s.pick('Hextech Anomaly: Pagar power');
  assert.match(s.d.prompt, /quanto power/);
  s.pick('2 power');
  assert.equal(e.pl[0].pool.energy, 2);
  assert.equal(e.runesOf(0).length, 0, 'as duas runas foram recicladas');
  assert.equal(ha.exhausted, true);
});

test('World Atlas: a unidade equipada, ao segurar o campo, dá dois Golds a quem a controla', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-088', BF1);
  const atlas = s.put(1, 'SFD-086', BF1);
  e.attach(atlas, u);
  assert.equal(e.might(u), 10);
  s.go();
  s.pick('Encerrar o turno');
  drain(s); // turno de B: hold em BF1
  drain(s);
  assert.equal(golds(s, 1).length, 2);
  assert.ok(golds(s, 1).every((g) => g.exhausted));
});

test('World Atlas desanexado não faz nada no hold', () => {
  const s = new Scenario();
  s.put(1, 'OGN-088', BF1);
  s.put(1, 'SFD-086', base(1));
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  drain(s);
  assert.equal(golds(s, 1).length, 0);
});

test('Ornn, Forge God: +1 de Might por gear aliado (fichas e anexados)', () => {
  const s = new Scenario();
  const e = s.e;
  const ornn = s.put(0, 'SFD-085', base(0)); // 4
  assert.equal(e.might(ornn), 4);
  gold(s, 0);
  const atlas = s.put(0, 'SFD-086', base(0));
  e.attach(atlas, ornn);
  assert.equal(e.might(ornn), 4 + 2 + 2);
  gold(s, 1);
  assert.equal(e.might(ornn), 8, 'gear do oponente não conta');
  assert.equal(e.kw(ornn).deflect, 2);
});

test('Dropboarder: com dois ou mais gear, ela se prepara ao ser jogada', () => {
  const s = new Scenario();
  gold(s, 0);
  gold(s, 0);
  s.runes(0, mind(4));
  const d = s.put(0, 'SFD-072', 'hand');
  s.go();
  s.pick('Jogar Dropboarder');
  at(s);
  drain(s);
  assert.equal(d.exhausted, false);
});

// ───────────────────────────── Repeat e Temporal Portal ─────────────────────────────

test('Temporal Portal + Bellows Breath: dois Repeats, três execuções em locais diferentes (FAQ #1263, #1306)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-078', base(0));
  const a = s.put(1, 'OGN-088', BF0);
  const b = s.put(1, 'OGN-088', BF0);
  const c2 = s.put(1, 'OGN-088', BF1);
  const d = s.put(1, 'OGN-088', base(1));
  s.runes(0, mind(9)); // Portal [1] + Bellows (1+M) + Repeat (1+M) + Repeat do Portal (1+M)
  s.put(0, 'SFD-080', 'hand');
  s.go();
  s.pick('Temporal Portal: Dar Repeat');
  drain(s);
  s.pick('Jogar Bellows Breath');
  assert.ok(s.d.options.some((o) => o.obj === c2.id), '1º alvo: qualquer local');
  s.pickObj(a);
  assert.ok(!s.d.options.some((o) => o.obj === c2.id), 'depois, só no mesmo local');
  s.pickObj(b);
  assert.match(s.d.prompt, /^Pagar Repeat \(1º Repeat\) \(1 \+ \[Mind\]\)/);
  s.pick('Sim');
  s.pickObj(c2);
  assert.match(s.d.prompt, /\(2º Repeat\) \(1 \+ \[Mind\]\)/, 'o Repeat do Portal custa o custo impresso');
  s.pick('Sim');
  s.pickObj(d);
  drain(s);
  assert.deepEqual([a, b, c2, d].map((u) => u.damage), [1, 1, 1, 1]);
  assert.equal(e.effects.some((x) => x.grantRepeat), false, 'o efeito do Portal foi usado');
});

test('Rocket Barrage: cada execução escolhe o próprio modo (820.2.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-088', base(1));
  const g1 = s.put(1, 'SFD-078', base(1));
  s.runes(0, mind(10));
  s.put(0, 'SFD-077', 'hand');
  s.go();
  s.pick('Jogar Rocket Barrage');
  s.pick('Matar um gear');
  s.maybeObj(g1);
  s.pick('Sim'); // Repeat
  assert.match(s.d.prompt, /2ª execução/);
  s.pick('Causar 4 de dano');
  s.maybeObj(u);
  drain(s);
  assert.equal(g1.zone, 'trash');
  assert.equal(u.damage, 4);
});

test('Bellows Breath: alvos separados na resolução — escolhe-se o local (355.11.b, FAQ #9352)', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(1, 'OGN-088', BF0);
  const b = s.put(1, 'OGN-088', BF0);
  s.runes(0, mind(2));
  s.runes(1, mind(5));
  s.put(1, 'SFD-087', 'hand'); // B tem uma Reaction: recebe a prioridade antes da resolução
  s.put(0, 'SFD-080', 'hand');
  s.go();
  s.pick('Jogar Bellows Breath');
  s.pickObj(a);
  s.pickObj(b);
  maybe(s, 'Não');
  assert.equal(s.d.player, 1);
  e.recall(b); // antes de resolver, b vai para a base
  drain(s);
  assert.match(s.d.prompt, /não estão mais no mesmo local/);
  s.pick('Campo Vazio A');
  drain(s);
  assert.equal(a.damage, 1);
  assert.equal(b.damage, 0);
});

test('Frostcoat Cub: só dá -2 se o custo adicional foi pago', () => {
  const s = new Scenario();
  const e = s.e;
  const t = s.put(1, 'OGN-088', base(1));
  s.runes(0, mind(4));
  s.put(0, 'SFD-067', 'hand');
  s.go();
  s.pick('Jogar Frostcoat Cub');
  at(s);
  s.pick('Sim');
  drain(s);
  s.pickObj(t);
  drain(s);
  assert.equal(e.might(t), 6);
});

// ───────────────────────────── campeões ─────────────────────────────

test('Jayce: matar um gear seu permite jogar um gear da mão sem pagar energia, uma vez', () => {
  const s = new Scenario();
  const e = s.e;
  const g0 = gold(s, 0, false);
  s.runes(0, mind(4));
  s.put(0, 'SFD-084', 'hand');
  const portal = s.put(0, 'SFD-078', 'hand'); // 3 de energia
  const anomaly = s.put(0, 'SFD-083', 'hand'); // 3 + Mind
  s.go();
  s.pick('Jogar Jayce');
  at(s);
  drain(s);
  s.pick('Sim');
  s.maybeObj(g0);
  drain(s);
  assert.equal(g0.zone, 'gone');
  assert.equal(e.runesOf(0).filter((r) => !r.exhausted).length, 0);
  s.go();
  assert.ok(has(s, 'Jogar Temporal Portal'), 'sem runas prontas, só pela permissão');
  assert.ok(has(s, 'Jogar Hextech Anomaly'), 'o power ainda é pago: runa exaurida pode ser reciclada');
  s.pick('Jogar Temporal Portal');
  drain(s);
  assert.equal(portal.zone, 'board');
  assert.equal(e.runesOf(0).length, 4, 'nada pago');
  s.go();
  assert.ok(!has(s, 'Jogar Hextech Anomaly'), 'a permissão é de um gear só (FAQ #10270)');
  void anomaly;
});

test('Bard, Mercurial: exaurir a lenda; move unidades suas para um campo aberto', () => {
  const s = new Scenario();
  const e = s.e;
  const u1 = s.put(0, 'OGN-088', base(0));
  const u2 = s.put(0, 'OGN-088', base(0));
  s.runes(0, mind(5));
  s.put(0, 'SFD-079', 'hand');
  s.go();
  s.pick('Jogar Bard');
  at(s);
  s.pick('Sim'); // exaurir a lenda
  assert.equal(e.legendOf(0).exhausted, true);
  drain(s);
  s.ok([u1.id, u2.id]);
  s.pick('Campo Vazio B');
  drain(s);
  assert.equal(e.bfIndex(u1), 1);
  assert.equal(e.bfIndex(u2), 1);
});

test('Ezreal, Dashing: ao atacar, dano igual ao Might numa inimiga ali; sem dano de combate', () => {
  const s = new Scenario();
  const e = s.e;
  const ez = s.put(0, 'SFD-082', base(0)); // 3
  const foe = s.put(1, 'OGN-088', BF1); // 8
  e.bfs[1].controller = 1;
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([ez.id]);
  s.pick('Campo Vazio B');
  drain(s);
  if (!s.d.root && s.d.options.some((o) => o.obj === foe.id)) s.pickObj(foe);
  drain(s);
  const log = s.log(60);
  assert.ok(log.includes('Mega-Mech recebe 3 de dano de Ezreal'), log);
  assert.ok(log.includes('Dano de combate: A 0 × 8 B'), 'Ezreal não causa dano de combate');
  assert.equal(foe.zone, 'board', 'o defensor sobrevive (3 de dano, 8 de Might)');
  assert.equal(ez.zone, 'trash');
});

test('Ezreal, Dashing: [Mind] move para a base (Action)', () => {
  const s = new Scenario();
  const e = s.e;
  const ez = s.put(0, 'SFD-082', BF0);
  s.runes(0, mind(1));
  s.go();
  s.pick('Ezreal, Dashing: Mover-me');
  drain(s);
  assert.equal(e.locOf(ez)?.t, 'base');
});

test('Renata Glasc, Mastermind: habilidades só num campo; marcar 1 ponto', () => {
  const s = new Scenario();
  const e = s.e;
  const r = s.put(0, 'SFD-088', base(0));
  s.runes(0, mind(8));
  s.go();
  assert.ok(!has(s, 'Renata Glasc, Mastermind: Comprar'), 'na base não pode usar');
  e.toZone(r, 'trash');
  const r2 = s.put(0, 'SFD-088', BF0);
  s.go();
  assert.ok(has(s, 'Comprar 1'));
  s.pick('Marcar 1 ponto');
  drain(s);
  assert.equal(e.pl[0].points, 1);
  assert.equal(r2.exhausted, true);
});

test('The Zero Drive: a unidade equipada morre e é banida; depois a Zero Drive a joga de graça', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', BF0); // Shipyard Skulker (3)
  const zd = s.put(0, 'SFD-090', BF0);
  e.attach(zd, u);
  assert.equal(e.might(u), 5);
  s.runes(0, mind(4));
  s.go();
  assert.ok(!has(s, 'Banir esta carta'), 'anexada, a habilidade está inativa');
  // B mata a unidade com Wages of Pain no turno dela (Action)... aqui: dano letal direto e uma ação qualquer
  u.damage = 5;
  s.pick('Mover unidades'); // uma ação qualquer: a limpeza mata a unidade (dano letal)
  drain(s);
  assert.equal(u.zone, 'banish', 'Deathknell da Zero Drive bane a unidade');
  assert.equal(zd.attachedTo, undefined);
  s.go();
  s.pick('Banir esta carta');
  drain(s);
  if (s.d.prompt.startsWith('Jogar')) at(s);
  drain(s);
  assert.equal(zd.zone, 'banish');
  assert.equal(u.zone, 'board', 'a unidade volta ignorando o custo');
});

test('The Zero Drive: morrendo junto com a unidade, o Deathknell dela ainda bane a unidade (é da unidade)', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-175', BF0);
  const zd = s.put(0, 'SFD-090', BF0);
  e.attach(zd, u);
  s.put(0, 'OGN-049', base(0)); // para ter uma ação qualquer
  s.go();
  e.killAll([u, zd]);
  s.pick('Mover unidades');
  s.pick('Campo Vazio B');
  drain(s);
  assert.equal(zd.zone, 'trash');
  assert.equal(u.zone, 'banish');
});

test('Cloth Armor: Quick-Draw no turno do oponente (Reaction) e Shield 2 na unidade equipada', () => {
  const s = new Scenario();
  const e = s.e;
  const def = s.put(1, 'OGN-049', BF1); // 5
  e.bfs[1].controller = 1;
  s.runes(1, mind(1));
  const armor = s.put(1, 'SFD-064', 'hand');
  s.runes(0, mind(2));
  s.put(0, 'SFD-066', 'hand'); // Frigid Touch para abrir a pilha
  s.go();
  s.pick('Jogar Frigid Touch');
  s.maybeObj(def);
  assert.equal(s.d.player, 1);
  s.pick('Jogar Cloth Armor');
  drain(s);
  assert.equal(armor.attachedTo, def.id);
  def.role = 'defender';
  assert.equal(e.might(def), 5 - 2 + 2, 'Frigid Touch -2, Shield 2 como defensora');
});

test('Wages of Pain: o Gold é jogado mesmo se o alvo deixou de ser válido', () => {
  const s = new Scenario();
  const e = s.e;
  const t = s.put(1, 'OGN-049', BF0);
  s.runes(1, mind(5));
  s.put(1, 'SFD-087', 'hand');
  s.runes(0, mind(3));
  s.put(0, 'SFD-070', 'hand');
  s.go();
  s.pick('Jogar Wages of Pain');
  s.maybeObj(t);
  assert.equal(s.d.player, 1);
  e.recall(t); // sai do campo: alvo ilegal
  drain(s);
  assert.equal(t.damage, 0);
  assert.equal(golds(s, 0).length, 1);
});

test('Pit Crew prepara quando uma ficha de Gold é jogada (ficha de gear é jogada, FAQ #1938)', () => {
  const s = new Scenario();
  const crew = s.put(0, 'OGN-091', base(0));
  crew.exhausted = true;
  s.runes(0, mind(3));
  s.put(0, 'SFD-081', 'hand');
  s.go();
  s.pick('Jogar Card Sharp');
  at(s);
  drain(s);
  s.pick('Sim');
  s.pick('Não');
  drain(s);
  assert.equal(golds(s, 0).length, 1);
  assert.equal(crew.exhausted, false);
});

test('Aspiring Engineer devolve um gear do descarte; Plundering Poro joga Gold ao conquistar', () => {
  const s = new Scenario();
  const e = s.e;
  const g0 = s.put(0, 'SFD-078', 'trash');
  s.runes(0, mind(3));
  s.put(0, 'SFD-061', 'hand');
  s.go();
  s.pick('Jogar Aspiring Engineer');
  at(s);
  drain(s);
  s.maybeObj(g0);
  drain(s);
  assert.equal(g0.zone, 'hand');
  // Poro conquista um campo vazio
  const poro = s.put(0, 'SFD-069', base(0));
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([poro.id]);
  s.pick('Campo Vazio B');
  drain(s);
  assert.equal(e.bfs[1].controller, 0);
  assert.equal(golds(s, 0).length, 1);
});

test('Mystic Reversal num spell com dois Repeats: as três execuções continuam (novas escolhas em cada uma)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'SFD-078', base(0));
  const a = s.put(1, 'OGN-049', BF0);
  const b = s.put(1, 'OGN-049', BF1);
  const c3 = s.put(1, 'OGN-049', base(1));
  s.runes(0, mind(9));
  s.put(0, 'SFD-080', 'hand');
  s.runes(1, Array.from({ length: 7 }, () => RUNE.calm));
  s.put(1, 'OGN-080', 'hand'); // Mystic Reversal: 4 + [Calm]x3
  s.go();
  s.pick('Temporal Portal: Dar Repeat');
  drain(s);
  s.pick('Jogar Bellows Breath');
  s.pickObj(a);
  s.pick('Sim');
  s.pickObj(b);
  s.pick('Sim');
  s.pickObj(c3);
  assert.equal(s.d.player, 1);
  s.pick('Jogar Mystic Reversal');
  s.maybeObj(e.objs[e.chain[0].cardId!]);
  drain(s);
  let asked = 0;
  for (let i = 0; i < 20 && s.g.current && !s.d.root; i++) {
    if (/escolher novo/.test(s.d.prompt)) {
      asked++;
      s.pick('Não');
    } else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.ok(asked >= 3, `uma pergunta por execução (${asked})`);
  drain(s);
  assert.equal(e.chain.length, 0);
  assert.deepEqual([a, b, c3].map((u) => u.damage), [1, 1, 1]);
});
