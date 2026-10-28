// Modo Desafios: cada desafio tem solução e ela é a interação que ele ensina. Para cada um, um teste joga a solução
// pelo motor (o oponente responde como a IA responderia: passa) e confere a vitória; outro joga a jogada "óbvia" errada
// e confere que ela não basta. Também confere que a montagem é jogável: desfazer, salvar/carregar e replay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/cards';
import { Game } from '../src/engine/game';
import { AiPlayer, quickPick } from '../src/ai/ai';
import { CHALLENGES, challengeById, challengeConfig, challengeResult, type Challenge, type ChallengeResult } from '../src/data/challenges';
import { cardData, hasCard } from '../src/engine/db';
import { isImplemented } from '../src/engine/script';
import type { Obj } from '../src/engine/types';

class Run {
  g: Game;
  ch: Challenge;
  constructor(id: string, public opp: 'pass' | 'ai' = 'pass') {
    this.ch = challengeById(id)!;
    assert.ok(this.ch, id);
    this.g = new Game(challengeConfig(this.ch));
    this.settle();
  }
  get e() {
    return this.g.engine;
  }
  get d() {
    return this.g.current!;
  }
  get result(): ChallengeResult {
    return challengeResult(this.e, this.ch);
  }
  log(n = 30) {
    return this.e.log.slice(-n).map((l) => l.text).join('\n');
  }
  private ai = new AiPlayer(1, 'normal');
  /** Responde sozinho: decisões do oponente (passa / IA) e "Como pagar?" (plano automático). */
  settle() {
    for (let i = 0; i < 400 && this.g.current && this.result === null; i++) {
      const d = this.g.current;
      if (d.player === 1) {
        const a = this.opp === 'ai' ? this.ai.decide(this.g) : quickPick(d, this.e);
        if (!this.g.answer(a)) assert.ok(this.g.answer(quickPick(d, this.e)), this.g.error ?? '');
        continue;
      }
      if (/^Como pagar \d/.test(d.prompt)) {
        this.g.answer([d.options[0].id]);
        continue;
      }
      break;
    }
  }
  ok(ids: string[]) {
    const r = this.g.answer(ids);
    if (!r) throw new Error('resposta recusada: ' + this.g.error + ' | ' + this.d.prompt + ' ' + JSON.stringify(this.d.options) + '\n' + this.log());
    this.settle();
  }
  pick(text: string | RegExp) {
    const d = this.d;
    assert.equal(d.player, 0, `esperava decisão minha: ${d.prompt}`);
    const o = d.options.find((x) => (typeof text === 'string' ? x.label.includes(text) || x.id === text : text.test(x.label)));
    if (!o) throw new Error(`opção "${text}" não encontrada em: ${d.prompt} → ${d.options.map((x) => x.label).join(' | ')}\n${this.log()}`);
    this.ok([o.id]);
  }
  /** Escolhe se a opção estiver sendo perguntada (escolhas de um só candidato são automáticas). */
  maybe(text: string | RegExp) {
    const d = this.g.current;
    if (d && !d.root && d.player === 0 && d.options.some((x) => (typeof text === 'string' ? x.label.includes(text) : text.test(x.label)))) this.pick(text);
  }
  obj(code: string, owner?: 0 | 1): Obj {
    const o = Object.values(this.e.objs).find((x) => x.code === code && (owner === undefined || x.owner === owner) && x.zone !== 'gone');
    assert.ok(o, code);
    return o!;
  }
  pickObj(o: Obj) {
    const opt = this.d.options.find((x) => x.obj === o.id || x.id === o.id);
    if (!opt) throw new Error(`${this.e.name(o)} não está nas opções de: ${this.d.prompt} → ${this.d.options.map((x) => x.label).join(' | ')}`);
    this.ok([opt.id]);
  }
  maybeObj(o: Obj) {
    const d = this.g.current;
    if (d && !d.root && d.player === 0 && d.options.some((x) => x.obj === o.id || x.id === o.id)) this.pickObj(o);
  }
  /** Mover estas unidades para o campo `bf` (pela ação "Mover unidades"). */
  move(units: Obj[], bf: number) {
    this.pick('Mover unidades');
    if (this.d.prompt.startsWith('Quais unidades')) this.ok(units.map((u) => u.id));
    if (this.d.prompt.startsWith('Para onde')) this.pickObj(this.e.objs[this.e.bfs[bf].objId]);
  }
  /** Passa nas pilhas/showdowns e distribui dano pela 1ª opção, até voltar a uma decisão raiz. */
  passAll() {
    for (let i = 0; i < 40 && this.g.current && this.result === null && this.d.player === 0 && this.d.kind !== 'action'; i++) {
      if (this.d.kind === 'priority' || this.d.kind === 'focus') this.pick('Passar');
      else if (/Distribuir dano|dano por último/.test(this.d.prompt)) this.ok([this.d.options[0].id]);
      else break;
    }
    this.settle();
  }
  endTurn() {
    if (this.result !== null) return;
    this.passAll();
    if (this.result !== null) return;
    this.pick('Encerrar o turno');
    this.passAll();
  }
}

test('desafios: pelo menos 12, ids únicos, cartas existentes e implementadas, mesa coerente', () => {
  assert.ok(CHALLENGES.length >= 12);
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, CHALLENGES.length);
  for (const ch of CHALLENGES) {
    const sc = ch.scenario;
    const codes: string[] = [];
    const add = (x: string | { code: string; gear?: string[] }) => (typeof x === 'string' ? codes.push(x) : codes.push(x.code, ...(x.gear ?? [])));
    for (const s of sc.sides) {
      codes.push(s.legend, ...(s.champion ? [s.champion] : []), ...(s.hand ?? []), ...(s.deck ?? []), ...(s.trash ?? []), ...(s.runeDeck ?? []));
      for (const x of [...(s.runes ?? []), ...(s.base ?? [])]) add(x);
    }
    for (const b of sc.battlefields) {
      codes.push(b.code, ...(b.facedown?.flat() ?? []));
      for (const x of b.units?.flat() ?? []) add(x);
      // quem tem unidade no campo e mais ninguém tem que ser o controlador
      const who = [0, 1].filter((p) => (b.units?.[p]?.length ?? 0) > 0);
      if (who.length === 1) assert.equal(b.controller, who[0], `${ch.id}: controlador de ${b.code}`);
    }
    for (const c of codes) {
      assert.ok(hasCard(c), `${ch.id}: carta ${c} não existe`);
      if (!/^TOK-|OGN-27[1-4]/.test(c) && !/Rune/.test(cardData(c).type)) assert.ok(isImplemented(c), `${ch.id}: carta ${c} sem script`);
    }
    // a partida monta e para numa decisão minha, na fase principal do turno do desafio
    const r = new Run(ch.id);
    assert.equal(r.e.turn, sc.turn, ch.id);
    assert.equal(r.e.phase, 'main', ch.id);
    assert.equal(r.d.player, 0, ch.id);
    assert.equal(r.d.kind, 'action', ch.id);
    assert.equal(r.result, null, ch.id);
    assert.ok(ch.hint && ch.solution && ch.brief && ch.teaches, ch.id);
  }
});

test('desafio montado continua jogável: desfazer, salvar/carregar e replay refazem a mesma mesa', () => {
  const r = new Run('ultimo-ponto');
  const serg = r.obj('OGN-219', 0);
  r.move([serg], 0);
  r.passAll();
  const sig = (g: Game) => JSON.stringify([g.engine.pl.map((p) => [p.points, p.hand.length]), g.engine.bfs.map((b) => b.controller), g.engine.log.length]);
  const loaded = Game.load(r.g.serialize());
  assert.equal(sig(loaded), sig(r.g));
  r.g.undo();
  assert.equal(r.g.engine.bfs[0].controller, 1, 'desfazer volta para antes do movimento');
  assert.equal(r.g.engine.pl[0].points, 7);
  assert.equal(r.d.kind, 'action');
});

// ───────────────────────────── soluções e jogadas erradas ─────────────────────────────

test('escudo-assalto: Cleave e ataque conquista; atacar sem nada empata e não conquista', () => {
  const r = new Run('escudo-assalto');
  const serg = r.obj('OGN-219', 0);
  r.pick('Jogar Cleave');
  r.maybeObj(serg);
  r.passAll();
  r.move([serg], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('escudo-assalto');
  w.move([w.obj('OGN-219', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
  assert.equal(w.obj('OGN-219', 0).zone, 'trash', 'empate: os dois morrem');
});

test('escudo-assalto: o Cleave também pode entrar no showdown, depois de mover', () => {
  const r = new Run('escudo-assalto');
  const serg = r.obj('OGN-219', 0);
  r.move([serg], 0);
  assert.equal(r.d.kind, 'focus', 'showdown aberto: ' + r.d.prompt);
  r.pick('Jogar Cleave');
  r.maybeObj(serg);
  r.passAll();
  assert.equal(r.result, 'won', r.log());
});

test('equipar: Equip do Serrated Dirk no Daring Poro conquista; sem equipar, empate', () => {
  const r = new Run('equipar');
  const poro = r.obj('OGN-210', 0);
  r.pick(/Equip|Equipar/);
  r.maybeObj(poro);
  r.passAll();
  assert.equal(r.obj('SFD-009', 0).attachedTo, poro.id, r.log());
  r.move([poro], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('equipar');
  w.move([w.obj('OGN-210', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('empower: Empower do Shadow Fiend conquista; Discipline (+2) só empata', () => {
  const r = new Run('empower');
  const fiend = r.obj('VEN-014', 0);
  r.pick(/Empower/);
  r.passAll();
  assert.equal(fiend.empowered, true, r.log());
  r.move([fiend], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('empower');
  const f2 = w.obj('VEN-014', 0);
  w.pick('Jogar Discipline');
  w.maybeObj(f2);
  w.passAll();
  w.move([f2], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('ultimo-ponto: uma unidade em cada campo vence; as duas no Grove só compram uma carta', () => {
  const r = new Run('ultimo-ponto');
  r.move([r.obj('OGN-219', 0)], 0);
  r.passAll();
  assert.equal(r.e.pl[0].points, 7, 'a primeira conquista vira compra');
  assert.equal(r.result, null);
  r.move([r.obj('OGN-210', 0)], 1);
  r.passAll();
  assert.equal(r.result, 'won', r.log());
  assert.equal(r.e.winner, 0);

  const w = new Run('ultimo-ponto');
  w.move([w.obj('OGN-219', 0), w.obj('OGN-210', 0)], 0);
  w.passAll();
  assert.equal(w.e.pl[0].points, 7);
  assert.equal(w.e.pl[0].hand.length, 1, 'comprou no lugar do ponto');
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('deflect: Stupefy na Qiyana (pagando o Deflect) conquista; Hextech Ray não basta', () => {
  const r = new Run('deflect');
  const q = r.obj('OGN-155', 1);
  r.pick('Jogar Stupefy');
  r.maybeObj(q);
  r.maybe(/Sim|Pagar/);
  r.passAll();
  r.move([r.obj('OGN-219', 0)], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('deflect');
  w.pick('Jogar Hextech Ray');
  w.maybeObj(w.obj('OGN-155', 1));
  w.maybe(/Sim|Pagar/);
  w.passAll();
  assert.equal(w.obj('OGN-155', 1).damage, 3, w.log());
  w.move([w.obj('OGN-219', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('hidden: o Stand United sai por 0 na Vi e ela passa pelo Guardian; atacar sem ele perde', () => {
  const r = new Run('hidden');
  const card = r.obj('OGN-053', 0);
  const vi = r.obj('OGN-036', 0);
  r.pick(/Stand United/);
  r.maybeObj(vi);
  r.passAll();
  assert.equal(card.zone, 'trash', r.log());
  assert.equal(r.e.might(vi), 5, r.log());
  r.move([vi], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('hidden');
  w.move([w.obj('OGN-036', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('pilha: Not So Fast no gatilho da Ahri conquista; sem responder, a Sergeant morre', () => {
  const r = new Run('pilha');
  r.move([r.obj('OGN-219', 0)], 0);
  // o gatilho de defesa da Ahri vai para a pilha; respondo com Not So Fast
  for (let i = 0; i < 6 && r.result === null && !r.d.options.some((o) => o.label.includes('Not So Fast')); i++) r.pick('Passar');
  r.pick(/Not So Fast/);
  r.maybe(/Ahri/);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('pilha');
  w.move([w.obj('OGN-219', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
  assert.equal(w.obj('OGN-219', 0).zone, 'trash');
});

test('tank: Hextech Ray antes do combate mata a Ahri; atacar direto esbarra no Tank', () => {
  for (const target of ['OGN-054', 'OGN-066']) {
    const r = new Run('tank');
    r.pick('Jogar Hextech Ray');
    r.maybeObj(r.obj(target, 1));
    r.passAll();
    r.move([r.obj('OGN-219', 0), r.obj('OGN-210', 0)], 0);
    r.passAll();
    assert.equal(r.result, 'won', target + '\n' + r.log());
  }
  const w = new Run('tank');
  w.move([w.obj('OGN-219', 0), w.obj('OGN-210', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
  assert.equal(w.obj('OGN-066', 1).zone, 'board');
});

test("deathknell: matar o Kog'Maw com o Ray antes de entrar conquista; atacar direto morre no Deathknell", () => {
  const r = new Run('deathknell');
  r.pick('Jogar Hextech Ray');
  r.maybeObj(r.obj('OGN-190', 1));
  r.passAll();
  r.move([r.obj('OGN-219', 0)], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('deathknell');
  w.move([w.obj('OGN-219', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('hold: atacar a Ahri impede o hold; conquistar o campo vazio dá a vitória ao oponente', () => {
  for (const opp of ['pass', 'ai'] as const) {
    const r = new Run('hold', opp);
    r.move([r.obj('OGN-219', 0), r.obj('OGN-210', 0)], 0);
    r.passAll();
    assert.equal(r.e.bfs[0].controller, 0, r.log());
    r.endTurn();
    assert.equal(r.result, 'won', opp + '\n' + r.log());
  }
  const w = new Run('hold');
  w.move([w.obj('OGN-219', 0), w.obj('OGN-210', 0)], 1);
  w.passAll();
  assert.equal(w.e.pl[0].points, 6);
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
  assert.equal(w.e.winner, 1);
});

test('legion: Cleave antes do Darius (Legion: pronto) conquista; Darius primeiro fica exaurido', () => {
  const r = new Run('legion');
  const rec = r.obj('OGN-273', 0);
  r.pick('Jogar Cleave');
  r.maybeObj(rec);
  r.passAll();
  r.pick(/Jogar Darius/);
  r.maybe(/base/i);
  r.passAll();
  const darius = r.obj('OGN-243', 0);
  assert.equal(darius.exhausted, false, 'Legion: entrou pronto\n' + r.log());
  r.move([darius, rec], 0);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('legion');
  w.pick(/Jogar Darius/);
  w.maybe(/base/i);
  w.passAll();
  assert.equal(w.obj('OGN-243', 0).exhausted, true);
  w.pick('Jogar Cleave');
  w.maybeObj(w.obj('OGN-273', 0));
  w.passAll();
  w.move([w.obj('OGN-273', 0)], 0);
  w.passAll();
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});

test('mestre-armas: Accelerate + Weaponmaster trazendo o Dirk conquista; sem o Dirk perde', () => {
  const play = (equip: boolean) => {
    const r = new Run('mestre-armas');
    r.pick(/Jogar Armed Assailant/);
    for (let i = 0; i < 8 && !r.d.root && r.d.player === 0; i++) {
      const d = r.d;
      if (/Accelerate/i.test(d.prompt) || d.options.some((o) => /Accelerate/.test(o.label))) r.pick(/Sim|Accelerate|Pagar/);
      else if (/Weaponmaster|Equip/i.test(d.prompt)) r.pick(equip ? /Serrated Dirk|Sim/ : /Não|Nenhum/);
      else if (/base/i.test(d.options.map((o) => o.label).join())) r.pick(/base/i);
      else if (d.kind === 'priority') r.pick('Passar');
      else break;
    }
    r.passAll();
    const a = r.obj('SFD-002', 0);
    assert.equal(a.exhausted, false, 'Accelerate: entrou pronto\n' + r.log());
    if (equip) assert.equal(r.obj('SFD-009', 0).attachedTo, a.id, r.log());
    r.move([a], 0);
    r.passAll();
    r.endTurn();
    return r;
  };
  const ok = play(true);
  assert.equal(ok.result, 'won', ok.log());
  const bad = play(false);
  assert.equal(bad.result, 'lost', bad.log());
});

test('duas-frentes: mover, conquistar e Ride the Wind para o outro campo vence; Ride the Wind primeiro não', () => {
  const r = new Run('duas-frentes');
  const s = r.obj('OGN-219', 0);
  r.move([s], 0);
  r.passAll();
  assert.equal(r.e.pl[0].points, 7, r.log());
  r.pick('Jogar Ride the Wind');
  r.maybeObj(s);
  r.maybe(/Monastery/);
  r.passAll();
  assert.equal(r.result, 'won', r.log());

  const w = new Run('duas-frentes');
  const s2 = w.obj('OGN-219', 0);
  w.pick('Jogar Ride the Wind');
  w.maybeObj(s2);
  w.maybe(/Grove/);
  w.passAll();
  assert.equal(w.e.pl[0].points, 7, w.log());
  assert.equal(s2.exhausted, false);
  // pronta, mas sem Ganking: do campo só volta para a base
  assert.ok(!w.e.moveDests([s2]).some((l) => l.t === 'bf'));
  w.endTurn();
  assert.equal(w.result, 'lost', w.log());
});
