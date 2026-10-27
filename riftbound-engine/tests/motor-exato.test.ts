// Testes das correções do motor para deixar as cartas exatas (BRIEF-EXATIDAO, parte do motor). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Obj, P } from '../src/engine/types';
import type { Engine } from '../src/engine/engine';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';
const ORDER = 'OGN-214';
const CALM = RUNE.calm;
const FURY = RUNE.fury;
const has = (s: Scenario, label: string) => s.d.options.some((o) => o.label.includes(label));
const yes = (s: Scenario, text: string) => {
  assert.ok(s.d.prompt.includes(text), `esperava pergunta "${text}", veio: ${s.d.prompt}`);
  s.pick('Sim');
};
const no = (s: Scenario, text: string) => {
  assert.ok(s.d.prompt.includes(text), `esperava pergunta "${text}", veio: ${s.d.prompt}`);
  s.pick('Não');
};
/** Responde a pilha/showdown passando, e escolhas de dano com a primeira opção. */
function run(s: Scenario, max = 40) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
}
/** Passa só as decisões de prioridade/Focus. */
function passPrio(s: Scenario, max = 20) {
  for (let i = 0; i < max && s.g.current && (s.d.kind === 'priority' || s.d.kind === 'focus'); i++) s.pick('Passar');
}
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Dirige um gerador do motor à mão (sem Game), respondendo com `answer`. */
function drive<T>(gen: Generator<any, T, string[]>, answer: (d: any) => string[]): T {
  let r = gen.next(undefined as any);
  while (!r.done) r = gen.next(answer(r.value));
  return r.value;
}
const setLegend = (e: Engine, p: P, code: string) => {
  e.legendOf(p).code = code;
};

// ───────────── 1. gatilhos de "quando você joga um spell" (regra 419.4.a) ─────────────
test('Ravenbloom Student: dispara quando o spell termina de resolver; spell anulado não conta', () => {
  const s = new Scenario();
  const rb = s.put(0, 'OGN-103', base(0)); // 2 de Might
  const tgt = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-095', 'hand'); // Stupefy (1)
  s.runes(0, [MIND, MIND]);
  s.go();
  s.pick('Jogar Stupefy');
  s.maybeObj(tgt);
  run(s);
  assert.equal(s.e.might(rb), 3, s.log());
  // o gatilho só entra depois de o Stupefy resolver (vem depois no registro)
  const L = s.e.log.map((l) => l.text);
  assert.ok(L.findIndex((t) => t.startsWith('Resolve: Stupefy')) < L.findIndex((t) => t.includes('Ravenbloom Student: +1')), L.join('\n'));

  // anulado (Defy): sem o +1
  const s2 = new Scenario();
  const rb2 = s2.put(0, 'OGN-103', base(0));
  const tgt2 = s2.put(1, 'OGN-088', BF0);
  s2.put(0, 'OGN-095', 'hand');
  s2.runes(0, [MIND, MIND]);
  s2.put(1, 'OGN-045', 'hand'); // Defy
  s2.runes(1, [CALM, CALM]);
  s2.go();
  s2.pick('Jogar Stupefy');
  s2.maybeObj(tgt2);
  // P1 responde com Defy
  s2.pick('Jogar Defy', 1);
  if (!s2.d.root && s2.d.kind === 'choose') s2.ok([s2.d.options[0].id]);
  run(s2);
  assert.equal(s2.e.might(rb2), 2, s2.log());
});

test('Darius, Trifarian: a 2ª jogada completa do turno (spell conta ao resolver)', () => {
  const s = new Scenario();
  const d = s.put(0, 'OGN-027', BF0);
  d.exhausted = true;
  const tgt = s.put(1, 'OGN-088', BF1);
  s.put(0, 'OGN-095', 'hand'); // Stupefy
  s.put(0, 'OGN-210', 'hand'); // Daring Poro (2)
  s.runes(0, [MIND, MIND, ORDER, ORDER]);
  s.go();
  s.pick('Jogar Stupefy');
  s.maybeObj(tgt);
  run(s);
  assert.equal(d.exhausted, true, '1ª jogada: nada');
  s.pick('Jogar Daring Poro');
  if (s.d.prompt.includes('onde')) s.pick('base');
  run(s);
  assert.equal(d.exhausted, false, s.log());
});

// ───────────── 2. substituições opcionais perguntam ─────────────
test('Sett, The Boss: o jogador escolhe na hora da morte; recusar deixa morrer', () => {
  for (const answer of ['Sim', 'Não']) {
    const s = new Scenario();
    setLegend(s.e, 0, 'OGN-269');
    const u = s.put(0, 'OGN-219', BF0);
    u.buffs = 1;
    s.put(0, 'OGN-229', 'hand'); // Vengeance (4 + 2 Order): o próprio jogador mata a unidade
    s.runes(0, [...Array(6).fill(ORDER), RUNE.body]);
    s.go();
    s.pick('Jogar Vengeance', 0);
    s.maybeObj(u);
    passPrio(s);
    // a pergunta vem para o controlador do Sett
    assert.equal(s.d.player, 0);
    assert.ok(s.d.prompt.includes('vai morrer'), s.d.prompt);
    s.pick(answer);
    run(s);
    if (answer === 'Sim') {
      assert.equal(u.zone, 'board');
      assert.deepEqual(u.loc, base(0));
      assert.equal(u.exhausted, true);
      assert.equal(u.buffs, 0);
      assert.equal(s.e.legendOf(0).exhausted, true);
    } else {
      assert.equal(u.zone, 'trash');
      assert.equal(s.e.legendOf(0).exhausted, false);
    }
  }
});

test('Unlicensed Armory: pagar [Fury] é opcional e perguntado quando a unidade fosse morrer', () => {
  const s = new Scenario();
  const arm = s.put(0, 'OGN-023', base(0));
  const u = s.put(0, 'OGN-219', BF0);
  s.put(0, 'OGN-210', 'hand'); // para descartar
  s.runes(0, [FURY]);
  s.go();
  s.pick('Unlicensed Armory: Descartar');
  s.maybeObj(u);
  run(s);
  assert.equal(arm.exhausted, true);
  // a unidade morre (Vengeance do próprio jogador)
  s.put(0, 'OGN-229', 'hand');
  s.runes(0, Array(6).fill(ORDER));
  s.go();
  s.pick('Jogar Vengeance', 0);
  s.maybeObj(u);
  passPrio(s);
  assert.equal(s.d.player, 0);
  assert.ok(s.d.prompt.includes('[Fury]') || s.d.prompt.includes('Fury'), s.d.prompt);
  s.pick('Sim');
  run(s);
  assert.equal(u.zone, 'board');
  assert.deepEqual(u.loc, base(0));
});

// ───────────── 3. ordem no fundo/topo do deck ─────────────
test('recycleCards: runas na ordem do dono (416.5.a); cartas do deck principal em ordem aleatória (416.5)', () => {
  const s = new Scenario();
  const e = s.e;
  const r1 = s.put(0, ORDER, base(0));
  const r2 = s.put(0, CALM, base(0));
  const r3 = s.put(0, FURY, base(0));
  const asked: string[] = [];
  drive(e.recycleCards([r1, r2, r3]), (d) => {
    asked.push(d.prompt);
    // escolhe Fury, depois Calm
    const want = d.options.find((o: any) => o.id === r3.id) || d.options.find((o: any) => o.id === r2.id);
    return [want.id];
  });
  assert.equal(asked.length, 2);
  const rd = e.pl[0].runeDeck;
  assert.deepEqual(rd.slice(-3), [r3.id, r2.id, r1.id]);
  // deck principal: sem perguntas
  const cards = [0, 1, 2, 3, 4].map(() => s.put(0, 'OGN-210', 'hand'));
  let n = 0;
  drive(e.recycleCards(cards), () => {
    n++;
    return [];
  });
  assert.equal(n, 0);
  assert.deepEqual(new Set(e.pl[0].mainDeck.slice(-5)), new Set(cards.map((c) => c.id)));
});

test('Predict 2: as que ficam voltam ao topo na ordem que o jogador escolher (436.1.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-210', 'deckTop');
  const b = s.put(0, 'OGN-219', 'deckTop'); // topo: b, a
  drive(e.predict(0, 2), (d) => {
    if (d.prompt.startsWith('Predict')) return []; // não recicla nenhuma
    return [a.id]; // a fica no topo
  });
  assert.deepEqual(e.pl[0].mainDeck.slice(0, 2), [a.id, b.id]);
});

test('Baited Hook: o resto vai para o fundo; a unidade jogada por efeito oferece Accelerate', () => {
  const s = new Scenario();
  const hook = s.put(0, 'OGN-242', base(0));
  const victim = s.put(0, 'OGN-219', base(0)); // 4
  // topo: Blazing Scorcher (5, Accelerate) + 4 outras
  const others = [0, 1, 2, 3].map(() => s.put(0, 'OGN-088', 'deckTop'));
  const scorcher = s.put(0, 'OGN-001', 'deckTop');
  s.runes(0, [ORDER, ORDER, FURY, FURY]);
  s.go();
  s.pick('Baited Hook');
  s.maybeObj(victim);
  passPrio(s);
  s.pickObj(scorcher);
  if (s.d.prompt.includes('onde')) s.pick('base');
  yes(s, 'Accelerate');
  run(s);
  assert.equal(scorcher.zone, 'board');
  assert.equal(scorcher.exhausted, false, 'Accelerate pago: entra pronta');
  assert.equal(hook.exhausted, true);
  const bottom = new Set(s.e.pl[0].mainDeck.slice(-4));
  for (const o of others) assert.ok(bottom.has(o.id));
});

// ───────────── 4. mortes simultâneas ─────────────
test('Limpeza: unidades com dano letal morrem juntas; Karthus morrendo junto ainda dobra os Deathknells (323.4, 808.1.d.2)', () => {
  const s = new Scenario();
  const k = s.put(1, 'OGN-236', BF0); // Karthus 3
  const sentry = s.put(1, 'OGN-096', BF0); // Watchful Sentry 1: Deathknell compre 1
  const atk = s.put(0, 'OGN-088', base(0)); // 8
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  const hand1 = s.e.pl[1].hand.length;
  run(s);
  assert.equal(k.zone, 'trash');
  assert.equal(sentry.zone, 'trash');
  assert.equal(s.e.pl[1].hand.length, hand1 + 2, s.log(20));
});

test('Thermo Beam: "mate todos os gear" é uma ação só (mortes simultâneas)', () => {
  const s = new Scenario();
  const e = s.e;
  const g1 = s.put(0, 'OGN-098', base(0));
  const g2 = s.put(1, 'OGN-098', base(1));
  const seen: number[] = [];
  const orig = e.emit.bind(e);
  e.emit = (ev) => {
    if (ev.type === 'die') seen.push([g1, g2].filter((g) => g.zone === 'trash').length);
    orig(ev);
  };
  drive(e.killG([g1, g2]), (d) => [d.options[0].id]);
  assert.deepEqual(seen, [2, 2], 'cada evento de morte já vê as duas no descarte');
});

// ───────────── 5. [Add] no pagamento ─────────────
test('Energy Conduit entra no pagamento automático (429.3)', () => {
  const s = new Scenario();
  const cond = s.put(0, 'OGN-098', base(0));
  const tgt = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-095', 'hand'); // Stupefy (1)
  s.go();
  s.pick('Jogar Stupefy');
  s.maybeObj(tgt);
  run(s);
  assert.equal(cond.exhausted, true);
  assert.equal(s.e.might(tgt), 7);
});

test('Lux, Crownguard: a energia "só para spells" fica marcada e não paga unidade', () => {
  const s = new Scenario();
  const lux = s.put(0, 'OGS-014', base(0));
  s.put(0, 'OGN-210', 'hand'); // Daring Poro (2)
  s.go();
  assert.ok(!has(s, 'Jogar Daring Poro'), 'a Lux não paga unidade');
  s.pick('Lux, Crownguard: Adicionar');
  assert.equal(s.e.pl[0].pool.energy, 2);
  assert.ok(!has(s, 'Jogar Daring Poro'), 'nem com a energia já no pool');
  const tgt = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGS-003', 'hand'); // Incinerate (2)
  s.go();
  s.pick('Jogar Incinerate');
  s.maybeObj(tgt);
  run(s);
  assert.equal(tgt.damage, 2);
  assert.equal(lux.exhausted, true);
  assert.equal(s.e.pl[0].pool.energy, 0);
});

test('Malzahar no pagamento: o jogador confirma e escolhe o que matar', () => {
  const s = new Scenario();
  const mz = s.put(0, 'OGN-113', base(0));
  const poro = s.put(0, 'OGN-210', base(0));
  s.put(0, 'OGN-024', 'hand'); // Void Seeker: 3 + Fury
  const tgt = s.put(1, 'OGN-088', BF0);
  s.runes(0, [ORDER, ORDER, ORDER]); // energia sim, Fury não
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(tgt);
  yes(s, 'Malzahar');
  s.pickObj(poro);
  run(s);
  assert.equal(poro.zone, 'trash');
  assert.equal(mz.exhausted, true);
  assert.equal(tgt.damage, 4);
});

test('Prioridade depois de [Add]: quem ativou continua com a prioridade (429.2.a)', () => {
  const s = new Scenario();
  const tgt = s.put(1, 'OGN-088', BF0);
  s.put(0, 'OGN-095', 'hand');
  s.runes(0, [MIND]);
  s.put(1, 'OGN-098', base(1)); // Energy Conduit do oponente
  s.put(1, 'OGN-095', 'hand'); // Stupefy (Reaction)
  s.go();
  s.pick('Jogar Stupefy', 0);
  s.maybeObj(tgt);
  assert.equal(s.d.player, 1);
  s.pick('Energy Conduit: Exaurir', 1);
  assert.equal(s.d.player, 1, 'continua com o jogador 1');
  assert.equal(s.d.kind, 'priority');
  assert.equal(s.e.pl[1].pool.energy, 1);
});

// ───────────── 6. sair do tabuleiro ─────────────
test('Treasure Trove: qualquer saída do tabuleiro dispara (banir)', () => {
  const s = new Scenario();
  const tt = s.put(0, 'OGN-186', base(0));
  s.go();
  s.e.banishObj(tt);
  assert.equal(s.e.pending.length, 1);
  assert.equal(s.e.pending[0].ev.type, 'leave');
});

test('Treasure Trove: morrer dispara uma vez só', () => {
  const s = new Scenario();
  s.put(0, 'OGN-186', base(0));
  s.runes(0, [RUNE.chaos]);
  const hand0 = s.e.pl[0].hand.length;
  s.go();
  s.pick('Treasure Trove: Matar isto');
  run(s);
  assert.equal(s.e.pl[0].hand.length, hand0 + 1, s.log());
});

// ───────────── 7. Hidden ─────────────
test('Tideturner jogada de Hidden: "outro local" não fica preso ao campo (811.1.d.2)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-219', base(0)); // controla um campo
  const anchor = s.put(0, 'OGN-210', BF0);
  const friend = s.put(0, 'OGN-219', base(0));
  const tt = s.put(0, 'OGN-199', 'hand');
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Esconder Tideturner');
  if (s.d.prompt.includes('qual campo')) s.pick('Campo Vazio A');
  run(s);
  // próximo turno do jogador 0
  s.e.turn++;
  s.go();
  s.pick('Jogar Tideturner (escondida');
  passPrio(s);
  yes(s, 'Trocar');
  s.pickObj(friend);
  run(s);
  assert.deepEqual(tt.loc, base(0));
  assert.deepEqual(friend.loc, BF0);
  assert.ok(anchor);
});

test('Efeito de jogada de unidade jogada de Hidden: alvos presos ao campo (811.1.d.2)', () => {
  const s = new Scenario();
  const e = s.e;
  const fae = s.put(0, 'OGN-097', BF0); // Blastcone Fae
  const here = s.put(1, 'OGN-088', BF0);
  const there = s.put(1, 'OGN-088', BF1);
  const c = e.ctx(fae, 0, { hiddenBf: 0 });
  const spec = { prompt: 'x' };
  const cands = e.targetCandidates(c, spec);
  assert.ok(cands.includes(here) && !cands.includes(there));
  // pending de efeito de jogada leva o campo
  e.emit({ type: 'play', obj: fae, player: 0, loc: BF0, via: 'hidden' });
  assert.equal(e.pending.find((x) => x.sourceId === fae.id)?.hiddenBf, 0);
});

// ───────────── 8. jogar por efeito com custos adicionais ─────────────
test('Reinforce: oferece Accelerate e o desconto de [5] vale sobre o total (356.4.f)', () => {
  const s = new Scenario();
  const others = [0, 1, 2, 3].map(() => s.put(0, 'OGN-088', 'deckTop'));
  const scorcher = s.put(0, 'OGN-001', 'deckTop'); // 5 Fury, Accelerate
  s.put(0, 'OGN-062', 'hand');
  s.runes(0, [CALM, CALM, CALM, CALM, CALM, FURY]); // 5 do Reinforce + 1 Fury (Accelerate: 5+1-5 = 1 + [Fury])
  s.go();
  s.pick('Jogar Reinforce');
  passPrio(s);
  s.pickObj(scorcher);
  if (s.d.prompt.includes('onde')) s.pick('base');
  yes(s, 'Accelerate');
  run(s);
  assert.equal(scorcher.zone, 'board');
  assert.equal(scorcher.exhausted, false);
  assert.ok(others.every((o) => o.zone === 'mainDeck'));
});

// ───────────── 9. Bonus Damage em dano dividido ─────────────
test('Annie, Fiery + Volibear: o bônus soma uma vez no total dividido (715.3)', () => {
  const s = new Scenario();
  s.put(0, 'OGS-001', base(0)); // Annie
  const vb = s.put(0, 'OGN-041', base(0));
  const a = s.put(1, 'OGN-088', BF0);
  const b = s.put(1, 'OGN-088', BF0);
  s.e.bfs[0].controller = 1;
  s.go();
  moveTo(s, [vb.id], 'Campo Vazio A');
  // alvos do Volibear: as duas
  for (let i = 0; i < 6 && !s.d.prompt.startsWith('Volibear: dividir'); i++) s.ok([s.d.options[0].id]);
  s.ok([a.id, b.id]);
  // divisão: 3 na primeira (sobram 3)
  for (let i = 0; i < 6 && !s.d.prompt.startsWith('Volibear: quanto'); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  s.pick('3');
  assert.equal(a.damage + b.damage, 6, s.log(20));
});

// ───────────── 10. ordem do cálculo de custo ─────────────
test('applyEnergyMods: desconto com mínimo vale só para ele e entra na melhor ordem (356.4.e)', () => {
  const s = new Scenario();
  const e = s.e;
  assert.equal(e.applyEnergyMods(3, [-2], [{ amount: 2, min: 1 }]), 0);
  assert.equal(e.applyEnergyMods(1, [], [{ amount: 2, min: 1 }]), 1);
  assert.equal(e.applyEnergyMods(4, [], [{ amount: 2, min: 2 }, { amount: 2, min: 1 }]), 1);
  assert.equal(e.applyEnergyMods(5, [2], [{ amount: 2, min: 1 }]), 5);
});

test('Herald of Scales: o desconto vale sobre o custo com Accelerate', () => {
  const s = new Scenario();
  s.put(0, 'OGN-140', base(0));
  const sc = s.put(0, 'OGN-001', 'hand'); // 5 + Accelerate [1][Fury]
  s.runes(0, [FURY, FURY, FURY, FURY]); // 4 de energia: 5+1-2 = 4, mais 1 Fury reciclando
  s.go();
  s.pick('Jogar Blazing Scorcher');
  if (s.d.prompt.includes('onde')) s.pick('base');
  yes(s, 'Accelerate');
  run(s);
  assert.equal(sc.zone, 'board');
  assert.equal(sc.exhausted, false);
});

test('Kraken Hunter: Accelerate oferecido contando o desconto dos Buffs', () => {
  const s = new Scenario();
  const us = [0, 1, 2].map(() => s.put(0, 'OGN-210', base(0)));
  for (const u of us) u.buffs = 1;
  const kh = s.put(0, 'OGN-150', 'hand'); // 3 + [Body][Body]; Accelerate [1][Body]
  s.runes(0, [ORDER, ORDER, ORDER, ORDER]); // 4 de energia e nenhum Body
  s.go();
  s.pick('Jogar Kraken Hunter');
  if (s.d.prompt.includes('onde')) s.pick('base');
  yes(s, 'Accelerate');
  yes(s, 'Gastar Buffs');
  s.ok(us.map((u) => u.id));
  run(s);
  assert.equal(kh.zone, 'board');
  assert.equal(kh.exhausted, false);
  assert.ok(us.every((u) => u.buffs === 0));
});

export type { Obj };

// ───────────── pendências do coordenador (mortes simultâneas e jogada por efeito) ─────────────
test('Immortal Phoenix morrendo junto com a unidade inimiga (spell) ainda dispara do descarte (383.2.c.1)', () => {
  const s = new Scenario();
  const e = s.e;
  const ph = s.put(0, 'OGN-037', BF0);
  const en = s.put(1, 'OGN-210', BF0);
  const spell = s.put(0, 'OGN-256', 'hand'); // a fonte é um spell (Fox-Fire)
  e.resolvingItem = { id: 'cX', kind: 'spell', controller: 0, sourceId: spell.id, cardId: spell.id } as any;
  drive(e.killG([ph, en]), (d) => [d.options[0].id]);
  e.resolvingItem = undefined;
  assert.equal(ph.zone, 'trash');
  assert.ok(e.pending.some((x) => x.sourceId === ph.id && x.ev.obj === en), 'gatilho do Phoenix pela morte inimiga');
});

test("Zhonya's Hourglass: duas mortes simultâneas de aliadas — salva uma, à escolha do controlador (373; RiftJudge #10615)", () => {
  const s = new Scenario();
  const e = s.e;
  const z = s.put(0, 'OGN-077', base(0));
  const a = s.put(0, 'OGN-210', BF0);
  const b = s.put(0, 'OGN-219', BF0);
  let asked = '';
  const died = drive(e.killG([a, b]), (d) => {
    asked = d.prompt;
    return [d.options.find((o: any) => o.obj === b.id).id];
  });
  assert.ok(asked.includes('substituição'), asked);
  assert.deepEqual(died, [a]);
  assert.equal(z.zone, 'trash');
  assert.deepEqual(b.loc, base(0));
});

test('Clockwork Keeper jogado por efeito: oferece o custo adicional e repassa os dados no evento de jogada', () => {
  const s = new Scenario();
  const e = s.e;
  const ck = s.put(0, 'OGN-044', 'trash');
  s.runes(0, [CALM]);
  let asked = false;
  drive(e.playFromEffect(0, ck, { energy: 0, power: [] }), (d) => {
    if (d.kind === 'confirm') {
      asked = true;
      return ['yes'];
    }
    return [d.options[0].id];
  });
  assert.ok(asked);
  assert.equal(ck.zone, 'board');
  assert.ok(e.pending.some((x) => x.sourceId === ck.id && x.ev.data?.paid), 'gatilho "se pagou o custo adicional"');
});

test('Pagamento: com runas de dois domínios, o jogador escolhe qual reciclar para um [qualquer]', () => {
  const s = new Scenario();
  s.runes(0, [RUNE.fury, RUNE.chaos]);
  const e = s.e;
  const any = { energy: 0, power: [['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'] as any] };
  const ch = e.payChoices(0, any, false);
  assert.equal(ch.length, 2, ch.map((c) => c.label).join(' | '));
  assert.ok(ch.some((c) => c.label.includes('Fúria')) && ch.some((c) => c.label.includes('Caos')));
  // pagando pelo gerador e escolhendo Caos
  drive(e.payG(0, any, false), (d) => [d.options.find((o: any) => o.label.includes('Caos')).id]);
  const left = e.runesOf(0).map((r) => e.data(r).domains[0]);
  assert.deepEqual(left, ['Fury'], 'a runa de Caos foi reciclada');
});

test('Pagamento: sem escolha real (um domínio só), não pergunta', () => {
  const s = new Scenario();
  s.runes(0, [RUNE.fury, RUNE.fury]);
  const any = { energy: 1, power: [['Fury'] as any] };
  assert.equal(s.e.payChoices(0, any, false).length, 1);
});
