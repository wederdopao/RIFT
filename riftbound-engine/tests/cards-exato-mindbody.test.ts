// Testes de exatidão das cartas OGN-083..OGN-164 (Mente e Corpo): comportamentos corrigidos para seguir o texto e as
// regras ao pé da letra. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Gen, Obj, P } from '../src/engine/types';

const MIND = 'OGN-089';
const B = RUNE.body;
const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const mind = (n: number) => Array.from({ length: n }, () => MIND);

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Passa a prioridade e ordena gatilhos simultâneos até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Distribuir dano')) s.ok([s.d.options[0].id]);
    else break;
  }
}
const has = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));
const logHas = (s: Scenario, t: string) => s.e.log.some((l) => l.text.includes(t));
/** Roda um gerador do motor fora do Game, respondendo sempre a primeira opção. */
function run<T>(gen: Gen<T>): T {
  let r = gen.next(undefined as any);
  while (!r.done) r = gen.next([r.value.options[0].id]);
  return r.value;
}
const tokens = (s: Scenario, code: string) => s.e.units().filter((u) => u.code === code);

// ───────────────────────── Convergent Mutation ─────────────────────────
test('Convergent Mutation: as duas unidades são alvos escolhidos ao jogar; sem duas aliadas não dá para jogar', () => {
  const s = new Scenario();
  const small = s.put(0, 'OGN-087', base(0)); // 2
  s.put(0, 'OGN-108', 'hand');
  s.runes(0, mind(2));
  s.go();
  assert.ok(!has(s, 'Jogar Convergent Mutation'), 'só uma unidade aliada (FAQ riftjudge #8123)');
  const mid = s.put(0, 'OGN-136', base(0)); // 2
  const big = s.put(0, 'OGN-088', base(0)); // 8
  s.go();
  s.pick('Jogar Convergent Mutation');
  assert.match(s.d.prompt, /aumentar o Might/);
  s.pickObj(small);
  assert.match(s.d.prompt, /outra unidade/);
  assert.ok(!s.d.options.some((o) => o.obj === small.id), 'a mesma unidade não pode ser a outra');
  assert.ok(s.d.options.some((o) => o.obj === mid.id));
  s.pickObj(big);
  s.passAll();
  assert.equal(s.e.might(small), 8);
  s.e.giveMight(big, 3);
  assert.equal(s.e.might(small), 8, 'o aumento é calculado uma vez (FAQ riftjudge #5181)');
});

// ───────────────────────── Wraith of Echoes ─────────────────────────
test('Wraith of Echoes: uma unidade aliada morta antes de o Wraith entrar já gasta "a primeira vez" do turno', () => {
  const s = new Scenario();
  const early = s.put(0, 'OGN-088', base(0));
  s.e.kill(early); // primeira morte aliada do turno, sem Wraith em jogo
  s.put(0, 'OGN-118', base(0));
  const y = s.put(0, 'OGN-087', BF0);
  s.put(0, 'OGN-085', 'hand'); // Falling Comet: 6
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Falling Comet');
  s.maybeObj(y);
  drain(s);
  assert.equal(y.zone, 'trash');
  assert.equal(s.e.pl[0].hand.length, 0, 'não é a primeira vez no turno: não compra');
});

test('Wraith of Echoes: mortes simultâneas (Warwick mata duas) disparam uma vez só (regra 383.1.b)', () => {
  const s = new Scenario();
  s.put(1, 'OGN-118', base(1));
  const a = s.put(1, 'OGN-088', BF0);
  const b = s.put(1, 'OGN-088', BF0);
  a.damage = 1;
  b.damage = 1;
  const ww = s.put(0, 'OGN-159', base(0));
  s.go();
  const h = s.e.pl[1].hand.length;
  moveTo(s, [ww.id], 'Campo Vazio A');
  drain(s);
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash');
  assert.equal(s.e.pl[1].hand.length, h + 1, s.log(20));
});

// ───────────────────────── Ekko ─────────────────────────
test('Ekko: "recicle-me" é o custo do gatilho, pago ao pôr na pilha; o jogador pode recusar', () => {
  const s = new Scenario();
  const ekko = s.put(0, 'OGN-110', BF0);
  s.put(0, 'OGN-085', 'hand');
  s.runes(0, mind(5));
  s.go();
  s.pick('Jogar Falling Comet');
  s.maybeObj(ekko);
  s.passAll(2);
  assert.match(s.d.prompt, /Ekko: pagar o custo/);
  s.pick('Sim');
  s.passAll();
  assert.equal(ekko.zone, 'mainDeck');
  const iPay = s.e.log.findIndex((l) => l.text.includes('recicla Ekko'));
  const iRes = s.e.log.findIndex((l) => l.text.startsWith('Resolve: Ekko'));
  assert.ok(iPay >= 0 && iPay < iRes, 'reciclado ao pôr o gatilho na pilha, antes de resolver');
  assert.ok(s.e.runesOf(0).every((r) => !r.exhausted));

  const s2 = new Scenario();
  const ekko2 = s2.put(0, 'OGN-110', BF0);
  s2.put(0, 'OGN-085', 'hand');
  s2.runes(0, mind(5));
  s2.go();
  s2.pick('Jogar Falling Comet');
  s2.maybeObj(ekko2);
  s2.passAll(2);
  s2.pick('Não');
  assert.equal(ekko2.zone, 'trash');
  assert.equal(s2.e.chain.length, 0, 'recusou pagar: o gatilho sai da pilha (regra 404.2)');
  assert.ok(s2.e.runesOf(0).every((r) => r.exhausted));
});

// ───────────────────────── Mushroom Pouch ─────────────────────────
test('Mushroom Pouch: o "se" é condição do gatilho — não é checado de novo na resolução (regra 383.2.a.1)', () => {
  const s = new Scenario();
  const e = s.e;
  const pouch = s.put(0, 'OGN-101', base(0));
  e.bfs[0].controller = 0;
  const fd = e.newObj('OGN-135', 0, 'setAside');
  e.bfs[0].facedown.push(fd.id);
  fd.zone = 'facedown';
  fd.loc = BF0;
  e.emit({ type: 'beginStart', player: 0 });
  e.pending = e.pending.filter((x) => x.sourceId === pouch.id); // só o gatilho da Pouch (a lenda também tem)
  assert.equal(e.pending.length, 1);
  e.toZone(fd, 'trash'); // a carta escondida sai antes de o gatilho resolver
  run(e.placePending());
  const h = e.pl[0].hand.length;
  run(e.resolveTop());
  assert.equal(e.pl[0].hand.length, h + 1);
  // sem carta escondida no início da fase, não dispara
  e.emit({ type: 'beginStart', player: 0 });
  assert.equal(e.pending.filter((x) => x.sourceId === pouch.id).length, 0);
});

// ───────────────────────── Sprite Call / Sprite Mother ─────────────────────────
test('Sprite Call: campo aberto vale com Miss Fortune, Buccaneer; Mageseeker Warden força a base', () => {
  const s = new Scenario();
  s.put(0, 'OGN-088', BF0);
  s.put(0, 'OGN-094', 'hand');
  s.runes(0, mind(3));
  s.go();
  s.pick('Jogar Sprite Call');
  drain(s);
  assert.ok(!has(s, 'Campo Vazio B'), 'campo aberto sem permissão não vale');
  s.pick('base de A');
  drain(s);

  const s2 = new Scenario();
  s2.put(0, 'OGN-088', BF0);
  s2.put(0, 'OGN-193', base(0)); // Miss Fortune, Buccaneer
  s2.put(0, 'OGN-094', 'hand');
  s2.runes(0, mind(3));
  s2.go();
  s2.pick('Jogar Sprite Call');
  drain(s2);
  s2.pick('Campo Vazio B');
  drain(s2);
  assert.deepEqual(tokens(s2, 'TOK-SPRITE')[0].loc, BF1);

  const s3 = new Scenario();
  s3.put(0, 'OGN-088', BF0);
  s3.put(1, 'OGN-070', BF1); // Mageseeker Warden do oponente num campo
  s3.put(0, 'OGN-094', 'hand');
  s3.runes(0, mind(3));
  s3.go();
  s3.pick('Jogar Sprite Call');
  drain(s3);
  assert.deepEqual(tokens(s3, 'TOK-SPRITE')[0].loc, base(0), 'só a base é permitida');
});

test('Sprite Mother: se ela sai do tabuleiro antes de o gatilho resolver, não há "aqui" e o Sprite não é jogado', () => {
  const s = new Scenario();
  const e = s.e;
  const mom = s.put(0, 'OGN-106', base(0));
  e.emit({ type: 'play', obj: mom, player: 0, loc: base(0) });
  run(e.placePending());
  e.returnToHand(mom); // sai antes de o gatilho resolver
  run(e.resolveTop());
  assert.equal(tokens(s, 'TOK-SPRITE').length, 0, s.log(10));
  // em jogo, o Sprite entra onde ela está
  const mom2 = s.put(0, 'OGN-106', BF0);
  e.emit({ type: 'play', obj: mom2, player: 0, loc: BF0 });
  run(e.placePending());
  run(e.resolveTop());
  assert.deepEqual(tokens(s, 'TOK-SPRITE')[0].loc, BF0);
});

// ───────────────────────── Kai'Sa, Evolutionary ─────────────────────────
test("Kai'Sa: o spell do descarte é alvo escolhido ao pôr na pilha; se sair do descarte, nada é jogado", () => {
  const s = new Scenario();
  s.e.pl[0].points = 6;
  const kai = s.put(0, 'OGN-112', base(0));
  const comet = s.put(0, 'OGN-085', 'trash');
  const stup = s.put(0, 'OGN-095', 'trash');
  s.put(1, 'OGN-065', BF1);
  // o oponente tem uma Reaction: a pilha para na prioridade dele
  s.put(1, 'OGN-095', 'hand');
  s.runes(1, [MIND]);
  s.go();
  moveTo(s, [kai.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.prompt.startsWith("Kai'Sa"); i++) s.pick('Passar');
  s.pick('Sim');
  assert.match(s.d.prompt, /jogar qual spell/);
  assert.ok(s.d.options.some((o) => o.obj === stup.id));
  s.pickObj(comet);
  assert.equal(s.d.kind, 'priority', 'escolhido antes de resolver');
  s.e.toZone(comet, 'banish'); // sai do descarte antes da resolução
  drain(s);
  assert.equal(comet.zone, 'banish');
  assert.ok(!logHas(s, 'joga Falling Comet'));
});

// ───────────────────────── Volibear, Imposing ─────────────────────────
test('Volibear, Imposing: precisa estar num campo; vale também quando quem move a unidade inimiga é o dono do Volibear', () => {
  const s = new Scenario();
  const e = s.e;
  const voli = s.put(1, 'OGN-158', base(1));
  const a = s.put(0, 'OGN-087', base(0));
  e.moveUnits([a], BF0, 0);
  assert.equal(e.pending.length, 0, 'Volibear na base: não dispara (FAQ riftjudge #2574)');
  e.recall(a);
  e.recall(voli);
  voli.loc = BF1;
  e.moveUnits([a], BF0, 1); // o próprio jogador do Volibear move a unidade inimiga (Charm)
  assert.equal(e.pending.length, 1, 'unidade inimiga se moveu para outro campo (FAQ riftjudge #8279, #8448)');
  e.pending = [];
  const own = s.put(1, 'OGN-087', base(1));
  e.moveUnits([own], BF0, 0);
  assert.equal(e.pending.length, 0, 'unidade aliada não conta');
});

// ───────────────────────── Deadbloom Predator + Dazzling Aurora ─────────────────────────
test('Dazzling Aurora joga Deadbloom Predator num campo inimigo ocupado e o combate acontece no fim do turno', () => {
  const s = new Scenario();
  s.put(0, 'OGN-160', base(0));
  const db = s.put(0, 'OGN-161', 'deckTop');
  const poro = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Encerrar o turno');
  drain(s);
  assert.match(s.d.prompt, /Jogar Deadbloom Predator onde/);
  assert.ok(has(s, 'Campo Vazio A'), 'permissão vale ao jogar por efeito (FAQ riftjudge #5654)');
  s.pick('Campo Vazio A');
  drain(s);
  assert.equal(poro.zone, 'trash', s.log(25));
  assert.equal(db.zone, 'board');
  assert.equal(s.e.bfs[0].controller, 0, 'o combate aconteceu na fase final');
  assert.equal(s.e.active, 1);
});

test('Deadbloom Predator: campo inimigo sem unidade não é "ocupado"', () => {
  const s = new Scenario();
  s.e.bfs[0].controller = 1;
  s.put(0, 'OGN-161', 'hand');
  s.runes(0, [B, B, B, B, B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Deadbloom Predator');
  assert.ok(!has(s, 'Campo Vazio A'));
});

// ───────────────────────── Jogar por efeito: custos adicionais ─────────────────────────
test('Portal Rescue: ao jogar de novo "ignorando o custo", o Accelerate ainda pode ser pago (regra 356.1.b.3)', () => {
  const s = new Scenario();
  const ekko = s.put(0, 'OGN-110', BF0, { ready: false });
  s.put(0, 'OGN-102', 'hand');
  s.runes(0, mind(6));
  s.go();
  s.pick('Jogar Portal Rescue');
  s.maybeObj(ekko);
  s.passAll(2);
  assert.match(s.d.prompt, /Accelerate/);
  s.pick('Sim');
  drain(s);
  assert.equal(ekko.zone, 'board');
  assert.deepEqual(ekko.loc, base(0));
  assert.equal(ekko.exhausted, false, 'entrou pronta');
  assert.equal(s.e.runesOf(0).length, 4, 'pagou o power do Portal Rescue e o do Accelerate');
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 2, '3 de energia do Portal Rescue + 1 do Accelerate');
});

// ───────────────────────── Miss Fortune, Captain ─────────────────────────
test('Miss Fortune, Captain: pode preparar runa ou lenda (de qualquer jogador); recusar não libera um segundo disparo', () => {
  const s = new Scenario();
  const mf = s.put(0, 'OGN-162', base(0));
  s.runes(1, [MIND]);
  const rune = s.e.runesOf(1)[0];
  rune.exhausted = true;
  const leg = s.e.legendOf(1);
  leg.exhausted = true;
  s.go();
  moveTo(s, [mf.id], 'Campo Vazio A');
  s.pick('Sim');
  assert.ok(s.d.options.some((o) => o.obj === rune.id), 'runa inimiga exaurida é opção');
  assert.ok(s.d.options.some((o) => o.obj === leg.id), 'lenda exaurida é opção');
  assert.ok(!s.d.options.some((o) => o.obj === mf.id), 'ela mesma não');
  s.pickObj(leg);
  drain(s);
  assert.equal(leg.exhausted, false);

  const s2 = new Scenario();
  const mf2 = s2.put(0, 'OGN-162', base(0));
  const tired = s2.put(0, 'OGN-142', base(0), { ready: false });
  s2.go();
  moveTo(s2, [mf2.id], 'Campo Vazio A');
  s2.pick('Não');
  drain(s2);
  s2.e.ready(mf2);
  s2.go();
  moveTo(s2, [mf2.id], 'Campo Vazio B');
  assert.ok(!/Miss Fortune/.test(s2.d.prompt), 'só o primeiro movimento do turno dispara');
  drain(s2);
  assert.equal(tired.exhausted, true);
});

// ───────────────────────── Udyr ─────────────────────────
test('Udyr: sem unidade num campo, os modos de dano e Stun não são oferecidos', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-157', base(0));
  u.buffs = 1;
  s.go();
  s.pick('Udyr, Wildman: Gastar meu Buff');
  assert.deepEqual(s.d.options.map((o) => o.id).sort(), ['gank', 'ready']);
  s.pick('gank');
  drain(s);
  assert.equal(s.e.kw(u).ganking, true);
});

// ───────────────────────── Promising Future ─────────────────────────
test('Promising Future: o jogador pode não pagar o power, e a carta fica banida (regra 444.2.a)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-087', 'deckTop');
  const smoke = s.put(1, 'OGN-093', 'deckTop'); // Smoke Screen: 2 + Mind
  s.put(0, 'OGN-088', BF0);
  s.put(0, 'OGN-115', 'hand');
  s.runes(0, mind(6));
  s.runes(1, [MIND]);
  s.go();
  s.pick('Jogar Promising Future');
  s.passAll();
  s.ok([s.d.options[0].id]); // A bane a Lecturing Yordle (única)
  s.pickObj(smoke);
  assert.match(s.d.prompt, /pagar 1 power para jogar Smoke Screen/);
  assert.equal(s.d.player, 1, 'começa pelo próximo jogador');
  s.pick('Não');
  drain(s);
  assert.equal(smoke.zone, 'banish');
});

// ───────────────────────── Ava Achiever ─────────────────────────
test('Ava Achiever: o gatilho dispara mesmo sem carta com Hidden na mão (a mão é privada)', () => {
  const s = new Scenario();
  const ava = s.put(0, 'OGN-107', base(0));
  s.put(1, 'OGN-088', BF0);
  s.runes(0, [MIND]);
  s.go();
  moveTo(s, [ava.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Ava Achiever'); i++) s.pick('Passar');
  assert.match(s.d.prompt, /Ava Achiever: Pagar 1 Mind/);
  s.pick('Não');
  drain(s);
});

test('Ava Achiever + Sprite Call: a ficha entra no campo onde a Ava ataca (FAQ riftjudge #5628)', () => {
  const s = new Scenario();
  const ava = s.put(0, 'OGN-107', base(0));
  s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-094', 'hand');
  s.runes(0, [MIND]);
  s.go();
  moveTo(s, [ava.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Ava Achiever'); i++) s.pick('Passar');
  s.pick('Sim');
  for (let i = 0; i < 10 && !tokens(s, 'TOK-SPRITE').length; i++) {
    assert.ok(!/Sprite Call: jogar o Sprite onde/.test(s.d.prompt), 'sem escolha de local');
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.deepEqual(tokens(s, 'TOK-SPRITE')[0].loc, BF0);
});

// ───────────────────────── Teemo / Stupefy: alvo ilegal ─────────────────────────
test('Teemo: com o alvo fora, as cartas ainda são reveladas e recicladas (regra 359.3.e.5)', () => {
  const s = new Scenario();
  s.put(1, 'OGN-121', BF0);
  const atk = s.put(0, 'OGN-088', base(0));
  const top = [s.put(1, 'OGN-097', 'deckTop'), s.put(1, 'OGN-088', 'deckTop')];
  s.put(0, 'OGN-095', 'hand'); // o atacante tem uma Reaction: a pilha para na prioridade dele
  s.runes(0, [MIND]);
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.e.chain.some((it) => it.label.includes('Teemo')); i++) s.pick('Passar');
  s.e.recall(atk); // o atacante sai do campo: alvo ilegal
  drain(s);
  assert.ok(logHas(s, 'Teemo revela'), s.log(20));
  const deck = s.e.pl[1].mainDeck;
  for (const o of top) assert.ok(deck.indexOf(o.id) >= deck.length - 5, "as 5 reveladas vão para o fundo");
});

test('Stupefy: com o alvo fora, ainda compra 1 (regras 359.3.e.5-6)', () => {
  const s = new Scenario();
  const t = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-095', 'hand');
  s.runes(0, mind(1));
  s.go();
  s.pick('Jogar Stupefy');
  s.maybeObj(t);
  s.e.returnToHand(t);
  drain(s);
  assert.equal(s.e.pl[0].hand.length, 1);
});

// ───────────────────────── Singularity ─────────────────────────
test('Singularity: "até duas" aceita zero alvos (regra 355.13)', () => {
  const s = new Scenario();
  const u = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-105', 'hand');
  s.runes(0, mind(6));
  s.go();
  s.pick('Jogar Singularity');
  s.ok([]);
  drain(s);
  assert.equal(u.damage, 0);
  assert.ok(logHas(s, 'Resolve: Singularity'));
});

// ───────────────────────── Unyielding Spirit ─────────────────────────
test('Unyielding Spirit: previne Singularity mas não a troca de dano da Carnivorous Snapvine', () => {
  const s = new Scenario();
  const e = s.e;
  e.addEffect({ flag: 'preventSpellDamage', until: 'turn' });
  const foe = s.put(1, 'OGN-087', BF0); // 2
  s.put(0, 'OGN-149', 'hand'); // Snapvine 6
  s.runes(0, [B, B, B, B, B, B, B]);
  s.go();
  s.pick('Jogar Carnivorous Snapvine');
  if (s.d.prompt.includes('onde')) s.pick('base de A');
  drain(s);
  assert.equal(foe.zone, 'trash', 'dano causado pelas unidades (FAQ riftjudge #8166)');
  void (null as unknown as Obj);
});

// ───────────────────────── Time Warp: fila de turnos ─────────────────────────
test('Time Warp do oponente (ex.: via Promising Future): o turno adicional vem logo depois e a fila continua (regra 737)', () => {
  const s = new Scenario();
  s.go();
  s.e.extraTurns.push(1); // B ganha um turno adicional no turno de A
  const endT = () => {
    s.pick('Encerrar o turno');
    drain(s);
  };
  endT();
  assert.equal(s.e.active, 1, 'B* (adicional)');
  endT();
  assert.equal(s.e.active, 1, 'B (turno normal da fila)');
  endT();
  assert.equal(s.e.active, 0);
});
