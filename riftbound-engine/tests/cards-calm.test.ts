// Testes de cenário das cartas do lote "calm" (OGN-043 a OGN-082). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function maybe(s: Scenario, text: string) {
  if (s.d.options.some((o) => o.label.includes(text)) && !s.d.root) s.pick(text);
}
/** Responde a pergunta "Jogar X onde?" se ela aparecer. */
function where(s: Scenario, text: string) {
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]); // Temporary é gatilho (816.1)
    else break;
  }
}
/** Passa a vez para o jogador 1 e tira as runas que ele canalizou. */
function toP1(s: Scenario) {
  s.go();
  endTurn(s);
  for (const r of s.e.runesOf(1)) s.e.toZone(r, 'runeDeck', { bottom: true });
}
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);

test('Clockwork Keeper: pagando [Calm] a mais, compra 1', () => {
  const s = new Scenario();
  s.runes(0, [...calm(3)]);
  s.put(0, 'OGN-044', 'hand');
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Clockwork Keeper');
  where(s, 'base de A');
  s.pick('Sim');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1\n' + s.log());
  assert.equal(s.e.runesOf(0).length, 2, 'uma runa Calm foi reciclada');
});

test('Clockwork Keeper: sem o custo adicional, não compra', () => {
  const s = new Scenario();
  s.runes(0, [...calm(3)]);
  s.put(0, 'OGN-044', 'hand');
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Clockwork Keeper');
  where(s, 'base de A');
  s.pick('Não');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand - 1);
});

test('Defy anula spell barato; Wind Wall anula qualquer spell', () => {
  const s = new Scenario();
  const target = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker: 3 + 1 power
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.put(1, 'OGN-045', 'hand');
  s.runes(1, [RUNE.calm, RUNE.calm]);
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(target);
  // jogador 0 não tem resposta (passa sozinho); jogador 1 responde com Defy
  assert.equal(s.d.player, 1);
  s.pick('Jogar Defy');
  s.passAll();
  assert.equal(target.damage, 0, 'Void Seeker foi anulado\n' + s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('Void Seeker foi anulado')));
});

test('Wind Wall anula um spell caro (Reinforce)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-062', 'hand');
  s.runes(0, [...calm(5)]);
  s.put(1, 'OGN-064', 'hand');
  s.runes(1, [...calm(5)]);
  s.go();
  s.pick('Jogar Reinforce');
  assert.equal(s.d.player, 1);
  s.pick('Jogar Wind Wall');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('Reinforce foi anulado')), s.log());
  assert.equal(s.d.kind, 'action');
});

test('Defy não pode mirar spell que custa mais de 4 (Reinforce, custo 5)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-062', 'hand');
  s.runes(0, [...calm(5)]);
  s.put(1, 'OGN-045', 'hand');
  s.runes(1, [...calm(2)]);
  s.go();
  s.pick('Jogar Reinforce');
  // P1 não tem alvo para Defy: a pilha resolve direto e o Reinforce pergunta a unidade
  s.passAll();
  assert.match(s.d.prompt, /Reinforce/, s.log());
  assert.equal(s.e.pl[1].hand.length, 1);
});

test('En Garde: +2 se a unidade estiver sozinha, +1 se não', () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-065', BF0);
  const b = s.put(0, 'OGN-052', BF1);
  const c = s.put(0, 'OGN-052', BF1);
  s.put(0, 'OGN-046', 'hand');
  s.put(0, 'OGN-046', 'hand');
  s.runes(0, [...calm(2)]);
  s.go();
  s.pick('Jogar En Garde');
  s.pickObj(a);
  s.passAll();
  assert.equal(s.e.might(a), 6);
  s.pick('Jogar En Garde');
  s.pickObj(b);
  s.passAll();
  assert.equal(s.e.might(b), 3);
  void c;
});

test('Find Your Center: custa 2 a menos com o oponente a 3 pontos da vitória; compra 1 e canaliza 1 exaurida', () => {
  const s = new Scenario();
  s.put(0, 'OGN-047', 'hand');
  s.runes(0, [RUNE.calm]);
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Find Your Center')), 'custa 3: não dá');
  s.e.pl[1].points = 5;
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Find Your Center');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1, comprou 1');
  const runes = s.e.runesOf(0);
  assert.equal(runes.length, 2);
  assert.ok(runes.every((r) => r.exhausted), s.log());
});

test('Meditation: exaurir uma unidade compra 2', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  s.put(0, 'OGN-048', 'hand');
  s.runes(0, [...calm(2)]);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Meditation');
  s.pick('Sim');
  s.passAll();
  assert.equal(u.exhausted, true);
  assert.equal(s.e.pl[0].hand.length, hand - 1 + 2);
});

test('Solari Shieldbearer atordoa; Eclipse Herald se prepara e ganha +1', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF0);
  const herald = s.put(0, 'OGN-059', base(0), { ready: false });
  s.put(0, 'OGN-051', 'hand');
  s.runes(0, [...calm(3)]);
  s.go();
  s.pick('Jogar Solari Shieldbearer');
  where(s, 'base de A');
  s.pickObj(enemy);
  s.passAll();
  assert.equal(enemy.stunned, true);
  assert.equal(herald.exhausted, false, s.log());
  assert.equal(s.e.might(herald), 8);
});

test('Rune Prison atordoa; Block dá Shield 3 e Tank', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF0);
  const mine = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-050', 'hand');
  s.put(0, 'OGN-057', 'hand');
  s.runes(0, [...calm(5)]);
  s.go();
  s.pick('Jogar Rune Prison');
  s.pickObj(enemy);
  s.passAll();
  assert.equal(enemy.stunned, true);
  s.pick('Jogar Block');
  s.pickObj(mine);
  s.passAll();
  const k = s.e.kw(mine);
  assert.equal(k.shield, 4);
  assert.equal(k.tank, true);
});

test('Adaptatron: ao conquistar, mata um gear e ganha Buff', () => {
  const s = new Scenario();
  const ad = s.put(0, 'OGN-056', base(0));
  const gear = s.put(1, 'OGN-060', base(1));
  s.go();
  moveTo(s, [ad.id], 'Campo Vazio A');
  s.passAll();
  s.pick('Sim');
  s.passAll();
  assert.equal(gear.zone, 'trash', s.log());
  assert.equal(ad.buffs, 1);
});

test('Poro Herder: com um Poro, ganha Buff e compra 1', () => {
  const s = new Scenario();
  s.put(0, 'OGN-052', base(0));
  const ph = s.put(0, 'OGN-061', 'hand');
  s.runes(0, [...calm(3), RUNE.calm]);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Poro Herder');
  where(s, 'base de A');
  s.passAll();
  assert.equal(ph.buffs, 1);
  assert.equal(s.e.pl[0].hand.length, hand);
});

test('Poro Herder: sem Poro, nada', () => {
  const s = new Scenario();
  const ph = s.put(0, 'OGN-061', 'hand');
  s.runes(0, [...calm(4)]);
  s.go();
  s.pick('Jogar Poro Herder');
  where(s, 'base de A');
  s.passAll();
  assert.equal(ph.buffs, 0);
});

test('Reinforce: bane uma unidade do topo e a joga com custo 5 menor; recicla o resto', () => {
  const s = new Scenario();
  const drake = s.put(0, 'OGN-142', 'deckTop'); // Mountain Drake, custo 9
  s.put(0, 'OGN-047', 'deckTop');
  s.put(0, 'OGN-024', 'deckTop');
  s.put(0, 'OGN-046', 'deckTop');
  s.put(0, 'OGN-045', 'deckTop');
  s.put(0, 'OGN-062', 'hand');
  s.runes(0, [...calm(9)]);
  s.go();
  const deck = s.e.pl[0].mainDeck.length;
  s.pick('Jogar Reinforce');
  s.passAll();
  s.pickObj(drake);
  where(s, 'base de A');
  s.passAll();
  assert.equal(drake.zone, 'board', s.log());
  assert.equal(s.e.runesOf(0).filter((r) => r.exhausted).length, 9, '5 do Reinforce + 4 do Drake');
  assert.equal(s.e.pl[0].mainDeck.length, deck - 1);
  assert.ok(!s.e.pl[0].mainDeck.slice(0, 4).includes(drake.id));
});

test("Spirit's Refuge: dá Buff e unidades com Buff têm Deflect (sem somar)", () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', base(0));
  const other = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-063', 'hand');
  s.put(0, 'OGN-063', 'hand');
  s.runes(0, [...calm(6)]);
  s.go();
  s.pick("Jogar Spirit's Refuge");
  s.passAll();
  s.maybeObj(u);
  s.passAll();
  assert.equal(u.buffs, 1, s.log());
  assert.equal(s.e.kw(u).deflect, 1);
  assert.equal(s.e.kw(other).deflect || 0, 0);
  s.pick("Jogar Spirit's Refuge");
  s.passAll();
  s.pickObj(u);
  s.passAll();
  assert.equal(s.e.kw(u).deflect, 1, 'duas cópias não somam');
});

test('Ahri, Alluring: segurar (hold) dá 1 ponto a mais', () => {
  const s = new Scenario();
  s.put(0, 'OGN-066', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.pl[0].points, 2, s.log());
});

test('Blitzcrank: puxa uma unidade inimiga para o campo; ao segurar volta para a mão', () => {
  const s = new Scenario();
  s.put(0, 'OGN-052', BF0); // controla o campo A
  const enemy = s.put(1, 'OGN-185', base(1));
  const blitz = s.put(0, 'OGN-067', 'hand');
  s.runes(0, [...calm(6)]);
  s.go();
  s.pick('Jogar Blitzcrank');
  s.pick('Campo Vazio A');
  s.pick('Sim');
  s.passAll(40);
  assert.ok(s.e.log.some((l) => l.text === 'Traveling Merchant → Campo Vazio A.'), 'o inimigo foi puxado\n' + s.log(30));
  assert.equal(enemy.zone, 'trash', 'e morreu atacando o Blitzcrank');
  assert.equal(blitz.zone, 'board');
  // hold no início do próximo turno do jogador 0
  if (s.d.kind === 'action' && s.d.player === 0) endTurn(s);
  endTurn(s);
  assert.equal(blitz.zone, 'hand', s.log(20));
});

test('Caitlyn: [Tap] causa dano igual ao Might; recebe dano de combate por último', () => {
  const s = new Scenario();
  const cait = s.put(0, 'OGN-068', BF0);
  const enemy = s.put(1, 'OGN-052', BF1);
  s.go();
  s.pick('Caitlyn, Patrolling');
  s.pickObj(enemy);
  s.passAll();
  assert.equal(enemy.zone, 'trash', s.log());
  // "dano de combate por último" sem ter a palavra-chave Backline
  assert.equal(s.e.kw(cait).backline, undefined);
  assert.equal(s.e.script(cait).damageLast?.(s.e, cait), true);
});

test('Last Stand: dobra o Might e dá Temporary', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  s.put(0, 'OGN-069', 'hand');
  s.runes(0, [...calm(4)]);
  s.go();
  s.pick('Jogar Last Stand');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 8);
  assert.equal(s.e.kw(u).temporary, true);
  endTurn(s);
  endTurn(s);
  assert.equal(u.zone, 'trash', s.log());
});

test('Mageseeker Warden: oponente só joga unidades na base e efeitos não preparam inimigos', () => {
  const s = new Scenario();
  s.put(0, 'OGN-070', BF0);
  const enemy = s.put(1, 'OGN-052', BF1, { ready: false });
  s.e.bfs[1].controller = 1;
  toP1(s);
  s.runes(1, [...calm(4)]);
  const poro = s.put(1, 'OGN-052', 'hand');
  s.go();
  assert.deepEqual(s.e.unitLocations(1, poro, 'hand', 'main'), [base(1)], 'não pode jogar no campo B');
  s.pick('Jogar Stalwart Poro');
  where(s, 'base de B');
  s.passAll();
  enemy.exhausted = true;
  s.e.ready(enemy);
  assert.equal(enemy.exhausted, true, 'efeito não prepara inimigo do Warden');
});

test('Party Favors: o oponente escolhe Cartas e os dois compram 1', () => {
  const s = new Scenario();
  s.put(0, 'OGN-071', 'hand');
  s.runes(0, [...calm(3)]);
  s.go();
  const h0 = s.e.pl[0].hand.length;
  const h1 = s.e.pl[1].hand.length;
  s.pick('Jogar Party Favors');
  s.passAll();
  assert.equal(s.d.player, 1);
  s.pick('Cartas');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, h0);
  assert.equal(s.e.pl[1].hand.length, h1 + 1);
});

test('Party Favors: Runas — os dois canalizam 1 runa exaurida', () => {
  const s = new Scenario();
  s.put(0, 'OGN-071', 'hand');
  s.runes(0, [...calm(3)]);
  s.go();
  s.pick('Jogar Party Favors');
  s.passAll();
  s.pick('Runas');
  s.passAll();
  assert.equal(s.e.runesOf(1).length, 1);
  assert.equal(s.e.runesOf(1)[0].exhausted, true);
});

test('Solari Shrine: matar uma unidade inimiga atordoada (em combate) permite comprar 1', () => {
  const s = new Scenario();
  const shrine = s.put(0, 'OGN-072', base(0));
  const enemy = s.put(1, 'OGN-052', BF0);
  enemy.stunned = true;
  const atk = s.put(0, 'OGN-065', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(enemy.zone, 'trash');
  s.pick('Sim');
  s.passAll();
  assert.equal(shrine.exhausted, true);
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Solari Shrine: matar com spell uma inimiga atordoada também conta', () => {
  const s = new Scenario();
  s.put(0, 'OGN-072', base(0));
  const enemy = s.put(1, 'OGN-052', BF0);
  enemy.stunned = true;
  s.put(0, 'OGN-024', 'hand');
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Void Seeker');
  s.passAll();
  assert.equal(enemy.zone, 'trash');
  s.pick('Sim');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand - 1 + 1 + 1, 'Void Seeker compra 1 e o Shrine mais 1\n' + s.log());
});

test('Solari Shrine: unidade não atordoada não conta', () => {
  const s = new Scenario();
  s.put(0, 'OGN-072', base(0));
  const enemy = s.put(1, 'OGN-052', BF0);
  const atk = s.put(0, 'OGN-065', base(0));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(enemy.zone, 'trash');
  assert.equal(s.d.kind, 'action', 'nenhuma pergunta do Shrine');
});

test('Sona: no fim do turno, num campo, prepara até 4 runas', () => {
  const s = new Scenario();
  s.put(0, 'OGN-073', BF0);
  s.runes(0, [...calm(5)]);
  for (const r of s.e.runesOf(0)) r.exhausted = true;
  s.go();
  s.pick('Encerrar o turno');
  // 5 exauridas: escolhe 4
  assert.match(s.d.prompt, /Sona/);
  s.ok(s.d.options.slice(0, 4).map((o) => o.id));
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 4, s.log());
});

test('Taric: outras unidades aliadas aqui têm Shield', () => {
  const s = new Scenario();
  const taric = s.put(0, 'OGN-074', BF0);
  const a = s.put(0, 'OGN-065', BF0);
  const b = s.put(0, 'OGN-065', BF1);
  assert.equal(s.e.kw(taric).shield, 1);
  assert.equal(s.e.kw(a).shield, 1);
  assert.equal(s.e.kw(b).shield || 0, 0);
});

test('Tasty Faefolk: Deathknell canaliza 2 exauridas e compra 1', () => {
  const s = new Scenario();
  const f = s.put(0, 'OGN-075', base(0));
  s.put(1, 'OGN-142', BF0);
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [f.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(f.zone, 'trash');
  assert.equal(s.e.runesOf(0).length, 2);
  assert.ok(s.e.runesOf(0).every((r) => r.exhausted));
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

test('Yasuo: ao atacar, causa dano igual ao Might numa unidade inimiga aqui', () => {
  const s = new Scenario();
  const y = s.put(0, 'OGN-076', base(0));
  const big = s.put(1, 'OGN-142', BF0); // 10
  s.go();
  moveTo(s, [y.id], 'Campo Vazio A');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text === 'Mountain Drake recebe 6 de dano de Yasuo, Remorseful.'), s.log());
  assert.equal(big.zone, 'trash', '6 do Yasuo + 6 de combate');
});

test("Zhonya's Hourglass: a unidade aliada não morre, é curada, exaurida e volta para a base", () => {
  const s = new Scenario();
  const z = s.put(0, 'OGN-077', base(0));
  const u = s.put(0, 'OGN-065', BF0);
  s.e.kill(u);
  assert.equal(u.zone, 'board');
  assert.deepEqual(u.loc, base(0));
  assert.equal(u.exhausted, true);
  assert.equal(z.zone, 'trash');
  s.e.kill(u);
  assert.equal(u.zone, 'trash', 'só funciona uma vez');
});

test("Zhonya's Hourglass: salva de dano letal em combate", () => {
  const s = new Scenario();
  const z = s.put(1, 'OGN-077', base(1));
  const def = s.put(1, 'OGN-052', BF0);
  const atk = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(def.zone, 'board', s.log());
  assert.deepEqual(def.loc, base(1));
  assert.equal(def.damage, 0);
  assert.equal(z.zone, 'trash');
  assert.equal(s.e.bfs[0].controller, 0);
});

test('Lee Sin, Ascetic: pode ter vários buffs', () => {
  const s = new Scenario();
  const lee = s.put(0, 'OGN-078', base(0));
  s.go();
  s.pick('Lee Sin, Ascetic');
  s.passAll();
  assert.equal(lee.buffs, 1);
  s.e.buff(lee, 0);
  assert.equal(lee.buffs, 2);
  assert.equal(s.e.might(lee), 7);
});

test('Leona: inimigas atordoadas aqui têm -8 (mínimo 1); entra pronta com oponente perto da vitória', () => {
  const s = new Scenario();
  s.put(0, 'OGN-079', BF0);
  const big = s.put(1, 'OGN-142', BF0);
  const small = s.put(1, 'OGN-052', BF0);
  const far = s.put(1, 'OGN-142', BF1);
  big.stunned = true;
  small.stunned = true;
  far.stunned = true;
  assert.equal(s.e.might(big), 2);
  assert.equal(s.e.might(small), 1, 'mínimo de 1 (não sobe se já for menor? 2 → 1)');
  assert.equal(s.e.might(far), 10);
  s.e.pl[1].points = 5;
  const leona = s.put(0, 'OGN-079', 'hand');
  s.runes(0, [...calm(7)]);
  s.go();
  s.pick('Jogar Leona');
  where(s, 'base de A');
  s.passAll();
  assert.equal(leona.exhausted, false);
});

test('Mystic Reversal: rouba um spell e escolhe novos alvos', () => {
  const s = new Scenario();
  const mine = s.put(1, 'OGN-065', BF0);
  const theirs = s.put(0, 'OGN-065', BF1);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, [...calm(7)]);
  s.go();
  s.pick('Jogar Void Seeker');
  s.pickObj(mine);
  s.pick('Jogar Mystic Reversal');
  s.passAll(2);
  s.pick('Sim');
  s.pickObj(theirs);
  s.passAll();
  assert.equal(mine.damage, 0, s.log());
  assert.equal(theirs.zone, 'trash');
});

test('Seal of Focus: declara a habilidade de Add [Calm] para o pagamento automático', () => {
  // o pagamento automático com Seals vem do motor (lote body); aqui só conferimos a declaração
  const a = getScript('OGN-081')!.activated![0];
  assert.equal(a.isAdd, true);
  assert.equal(a.exhaustSelf, true);
  assert.equal(a.addPower, 'Calm');
});

test('Whiteflame Protector: +8 numa unidade', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-082', 'hand');
  s.runes(0, [...calm(10)]);
  s.go();
  s.pick('Jogar Whiteflame');
  where(s, 'base de A');
  s.pickObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 10);
});
