// Testes de exatidão das cartas Fúria e Calma (OGN-001 a OGN-082). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const fury = (n: number) => Array.from({ length: n }, () => RUNE.fury);
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);

function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}

test('Charm: o destino é escolhido ao jogar, antes de o oponente responder', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-043', 'hand');
  s.runes(0, calm(2));
  s.go();
  s.pick('Jogar Charm');
  s.maybeObj(enemy);
  assert.match(s.d.prompt, /Charm: mover .* para onde\?/, 'o destino vem logo depois do alvo');
  s.pick('base de B');
  s.passAll();
  assert.deepEqual(enemy.loc, base(1), s.log());
});

test('Mystic Reversal: troca alvo e destino do Charm roubado', () => {
  const s = new Scenario();
  const mine = s.put(1, 'OGN-065', BF0); // unidade de B (alvo original)
  const theirs = s.put(0, 'OGN-065', BF1); // unidade de A
  s.put(0, 'OGN-043', 'hand');
  s.runes(0, calm(2));
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, calm(7));
  s.go();
  s.pick('Jogar Charm');
  s.maybeObj(mine);
  s.pick('base de B');
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  // novo alvo: sim
  assert.match(s.d.prompt, /novo\(s\) alvo/);
  s.pick('Sim');
  s.maybeObj(theirs); // único candidato: escolhido sozinho
  // alvo mudou: o destino é escolhido de novo (obrigatório)
  assert.match(s.d.prompt, /para onde\?/);
  s.pick('base de A');
  s.passAll();
  assert.deepEqual(theirs.loc, base(0), s.log());
  assert.deepEqual(mine.loc, BF0, 'a unidade de B não se move');
});

test('Mystic Reversal: manter o alvo antigo (agora aliado) faz o Charm errar o alvo', () => {
  const s = new Scenario();
  const mine = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-065', BF1);
  s.put(0, 'OGN-043', 'hand');
  s.runes(0, calm(2));
  s.put(1, 'OGN-080', 'hand');
  s.runes(1, calm(7));
  s.go();
  s.pick('Jogar Charm');
  s.maybeObj(mine);
  s.pick('base de B');
  s.pick('Jogar Mystic Reversal', 1);
  s.passAll(2);
  s.pick('Não'); // mantém o alvo
  s.pick('Não'); // mantém o destino
  s.passAll();
  assert.deepEqual(mine.loc, BF0, 'a unidade agora é aliada do controlador do Charm: alvo ilegal\n' + s.log());
});

test('Disintegrate: só compra se a morte vier deste spell, na limpeza logo depois (regra 428.5.c)', () => {
  const s = new Scenario();
  const elder = s.put(1, 'OGN-065', BF0); // 4 de Might
  s.put(0, 'OGN-005', 'hand');
  s.runes(0, fury(4));
  s.go();
  s.pick('Jogar Disintegrate');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'board');
  assert.equal(elder.damage, 3);
  const hand = s.e.pl[0].hand.length;
  // depois, o Might cai sem novo dano: a morte não é atribuída ao Disintegrate
  s.e.giveMight(elder, -2);
  s.e.cleanup();
  assert.equal(elder.zone, 'trash');
  s.go();
  assert.equal(s.e.pl[0].hand.length, hand, 'não compra\n' + s.log());
});

test('Immortal Phoenix: dano de spell antes não conta se a morte vem depois por outro motivo', () => {
  const s = new Scenario();
  const phoenix = s.put(0, 'OGN-037', 'trash');
  const elder = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-009', 'hand'); // Hextech Ray: 3
  s.runes(0, fury(6));
  s.go();
  s.pick('Jogar Hextech Ray');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.zone, 'board');
  s.e.giveMight(elder, -2);
  s.e.cleanup();
  assert.equal(elder.zone, 'trash');
  assert.equal(s.e.pending.length, 0, 'sem gatilho do Phoenix');
  assert.equal(phoenix.zone, 'trash');
});

test('Matar como custo é atribuído à carta jogada (Cruel Patron não é spell: Phoenix não dispara)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-037', 'trash');
  const victim = s.put(0, 'OGN-052', base(0));
  s.put(0, 'OGN-208', 'hand');
  s.runes(0, ['OGN-214', 'OGN-214', 'OGN-214', 'OGN-214']);
  s.go();
  const evs: any[] = [];
  const emit = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    if (ev.type === 'die') evs.push(ev);
    emit(ev);
  };
  s.pick('Jogar Cruel Patron');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base de A');
  s.maybeObj(victim);
  assert.equal(victim.zone, 'trash', s.log());
  assert.equal(evs[0]?.killedBy?.src?.code, 'OGN-208', 'a morte é atribuída ao Cruel Patron');
  assert.equal(evs[0]?.killer, 0);
  assert.ok(!s.e.pending.some((x) => s.e.objs[x.sourceId].code === 'OGN-037'), 'Phoenix não dispara');
});

test('Sun Disc: sem Legion a habilidade fica inativa (UNL: Legion dependente, RiftJudge #9805); com Legion, a próxima unidade (até ficha) entra pronta', () => {
  const s = new Scenario();
  const disc = s.put(0, 'OGN-021', base(0));
  s.put(0, 'OGN-013', 'hand');
  s.runes(0, fury(2));
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.startsWith('Sun Disc')), 'sem Legion não pode ser ativada');
  assert.equal(disc.exhausted, false);
  // com Legion: joga uma carta e ativa o disco
  s.pick('Jogar Pouty Poro');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base de A');
  s.passAll();
  s.go();
  s.pick('Sun Disc');
  s.passAll();
  const tok = s.e.createToken('TOK-RECRUIT', 0, base(0));
  assert.equal(tok.exhausted, false, 'a ficha de unidade jogada é "a próxima unidade"');
  assert.equal(s.e.effects.filter((e) => e.nextPlay === 'unit').length, 0, 'efeito consumido');
});

test('Mageseeker Warden: ficha de unidade do oponente não entra num campo; o despertar prepara normalmente', () => {
  const s = new Scenario();
  s.put(0, 'OGN-070', BF0);
  s.e.bfs[1].controller = 1;
  const tok = s.e.createToken('TOK-RECRUIT', 1, BF1);
  assert.notEqual(tok.zone, 'board', 'a ficha não é jogada no campo');
  const tok2 = s.e.createToken('TOK-RECRUIT', 1, base(1));
  assert.equal(tok2.zone, 'board', 'na base pode');
  // efeito que manda jogar a unidade num campo (ex.: Ava Achiever): a jogada é ignorada (regra 358.3.a)
  const inHand = s.put(1, 'OGN-052', 'hand');
  const gen = s.e.playFromEffect(1, inHand, { energy: 0, power: [] }, BF1);
  assert.equal(gen.next(undefined as any).done, true);
  assert.equal(inHand.zone, 'hand');
  const u = s.put(1, 'OGN-052', base(1), { ready: false });
  s.go();
  endTurn(s);
  assert.equal(u.exhausted, false, 'o despertar não é spell nem habilidade');
  assert.ok(!s.log(40).includes('não pode ser preparada'), s.log(40));
});

test('Caitlyn com Tank (Block): quem atribui o dano escolhe qual exigência vale', () => {
  const s = new Scenario();
  const cait = s.put(1, 'OGN-068', BF0);
  const other = s.put(1, 'OGN-065', BF0);
  s.e.giveKw(cait, { tank: true });
  const gen = s.e.assignDamage(0, 3, [other, cait]);
  let r = gen.next(undefined as any);
  assert.ok(!r.done && /Tank/.test(r.value.prompt), 'pergunta qual exigência vale');
  r = gen.next(['last']);
  // "por último": o Elder (4) recebe primeiro
  while (!r.done) r = gen.next([r.value.options[0].id]);
  assert.equal(r.value.map.get(other.id), 3);
  assert.equal(r.value.map.get(cait.id) || 0, 0);
});

test('Caitlyn: se ela sai do tabuleiro antes da resolução, não causa dano (Might nulo)', () => {
  const s = new Scenario();
  const cait = s.put(0, 'OGN-068', BF0);
  const enemy = s.put(1, 'OGN-065', BF1);
  s.put(1, 'OGN-058', 'hand'); // B tem uma Reaction: a pilha espera a resposta
  s.runes(1, calm(2));
  s.go();
  s.pick('Caitlyn, Patrolling');
  s.maybeObj(enemy);
  assert.equal(s.d.kind, 'priority');
  s.e.kill(cait);
  s.passAll();
  assert.equal(enemy.damage, 0, s.log());
});

test('Sona: "até 4" pergunta quais runas mesmo com 4 ou menos exauridas', () => {
  const s = new Scenario();
  s.put(0, 'OGN-073', BF0);
  s.runes(0, calm(3));
  for (const r of s.e.runesOf(0)) r.exhausted = true;
  s.go();
  s.pick('Encerrar o turno');
  assert.match(s.d.prompt, /Sona/);
  assert.equal(s.d.min, 0);
  const one = s.d.options[0].id;
  s.ok([one]);
  s.passAll();
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 1, s.log());
});

test('Blind Fury: revelar dispara o "ao revelar" do Nocturne; spell sem alvo fica banido', () => {
  const s = new Scenario();
  s.put(0, 'OGN-025', 'hand');
  s.runes(0, fury(6));
  const seeker = s.put(1, 'OGN-024', 'deckTop'); // Void Seeker: sem unidade em campo, sem alvo
  s.go();
  s.pick('Jogar Blind Fury');
  s.passAll();
  assert.equal(seeker.zone, 'banish', s.log());
  // Nocturne revelado: o dono pode bani-lo antes
  const s2 = new Scenario();
  s2.put(0, 'OGN-025', 'hand');
  s2.runes(0, fury(6));
  const noct = s2.put(1, 'OGN-194', 'deckTop');
  s2.go();
  s2.pick('Jogar Blind Fury');
  s2.passAll();
  assert.match(s2.d.prompt, /Nocturne/);
  assert.equal(s2.d.player, 1);
  s2.pick('Sim');
  if (s2.d.prompt.includes('Jogar Nocturne')) s2.pick('Não');
  s2.passAll();
  assert.equal(noct.zone, 'banish');
  assert.equal(noct.controller, 1, 'A não joga o Nocturne');
});

test('Void Seeker, Get Excited!, Discipline e Stand United: instruções sem alvo valem mesmo com o alvo ilegal', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-024', 'hand');
  s.runes(0, fury(4));
  s.put(1, 'OGN-058', 'hand'); // B tem uma Reaction: a pilha espera a resposta
  s.runes(1, calm(2));
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(enemy);
  assert.equal(s.d.kind, 'priority');
  s.e.toZone(enemy, 'hand'); // o alvo sai do tabuleiro antes da resolução
  const hand = s.e.pl[0].hand.length;
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand + 1, 'compra 1 mesmo assim\n' + s.log());

  const s2 = new Scenario();
  const e2 = s2.put(1, 'OGN-065', BF0);
  s2.put(0, 'OGN-008', 'hand');
  s2.put(0, 'OGN-052', 'hand');
  s2.runes(0, fury(3));
  s2.put(1, 'OGN-058', 'hand');
  s2.runes(1, calm(2));
  s2.go();
  s2.pick('Jogar Get Excited');
  s2.maybeObj(e2);
  s2.e.toZone(e2, 'hand');
  s2.passAll();
  assert.equal(s2.e.pl[0].hand.length, 0, 'descarta mesmo assim\n' + s2.log());

  const s3 = new Scenario();
  const mine = s3.put(0, 'OGN-065', BF0);
  s3.put(0, 'OGN-053', 'hand');
  s3.runes(0, calm(3));
  s3.put(1, 'OGN-058', 'hand');
  s3.runes(1, calm(2));
  s3.go();
  s3.pick('Jogar Stand United');
  s3.maybeObj(mine);
  s3.e.toZone(mine, 'hand');
  s3.passAll();
  assert.ok(s3.e.effects.some((e) => e.player === 0 && e.buffBonus === 1), 'o bônus de Buff vale\n' + s3.log());

  const s4 = new Scenario();
  const u4 = s4.put(0, 'OGN-065', BF0);
  s4.put(0, 'OGN-058', 'hand');
  s4.runes(0, calm(2));
  s4.put(1, 'OGN-058', 'hand');
  s4.runes(1, calm(2));
  s4.go();
  s4.pick('Jogar Discipline');
  s4.maybeObj(u4);
  s4.e.toZone(u4, 'hand');
  const h4 = s4.e.pl[0].hand.length;
  s4.passAll();
  assert.equal(s4.e.pl[0].hand.length, h4 + 1, 'Discipline compra 1 mesmo assim\n' + s4.log());
});

test('Darius: dispara sendo a 2ª carta (inclusive ele mesmo), não sendo a 3ª', () => {
  const s = new Scenario();
  s.put(0, 'OGN-013', 'hand');
  const darius = s.put(0, 'OGN-027', 'hand');
  s.put(0, 'OGN-010', 'hand'); // 3ª carta
  s.runes(0, fury(9));
  s.go();
  s.pick('Jogar Pouty Poro');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base de A');
  s.passAll();
  s.pick('Jogar Darius');
  if (!s.d.root && s.d.prompt.includes('Accelerate')) s.pick('Não');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base de A');
  s.passAll();
  assert.equal(darius.exhausted, false, 'ele mesmo foi a 2ª carta\n' + s.log());
  assert.equal(s.e.might(darius), 7);
  s.pick('Jogar Legion Rearguard');
  if (!s.d.root && s.d.prompt.includes('Accelerate')) s.pick('Não');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base de A');
  s.passAll();
  assert.equal(s.e.might(darius), 7, 'a 3ª carta não dispara');
});

test('Volibear: pode atacar escolhendo zero alvos ("qualquer número")', () => {
  const s = new Scenario();
  const voli = s.put(0, 'OGN-041', base(0));
  const e = s.put(1, 'OGN-065', BF0);
  s.e.bfs[0].controller = 1;
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([voli.id]);
  s.pick(s.e.name(s.e.bfs[0].objId));
  assert.match(s.d.prompt, /Volibear/);
  assert.equal(s.d.min, 0);
  s.ok([]);
  s.passAll();
  assert.equal(e.damage === 0 || e.zone === 'trash', true);
});

test('Last Stand: dobrar soma o valor atual (regra 432.1)', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-065', BF0);
  s.e.giveMight(u, -6); // Might -2
  s.put(0, 'OGN-069', 'hand');
  s.runes(0, calm(4));
  s.go();
  s.pick('Jogar Last Stand');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.might(u), -4, s.log());
});
