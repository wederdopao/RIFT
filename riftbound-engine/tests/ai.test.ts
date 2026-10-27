// Comportamento da IA: plano de jogo, valor de cartas que rendem nos turnos seguintes, mulligan, ataque e reações;
// mecânicas de Vendetta/Radiance (Empower, Deploy, Flow, Predict), arquétipo do oponente e níveis de dificuldade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { AiPlayer, mulliganPick, evaluate, oppArchetype, quickPick } from '../src/ai/ai';
import { Game } from '../src/engine/game';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf' as const, i: 0 };
const BF1 = { t: 'bf' as const, i: 1 };
const base = (p: P) => ({ t: 'base' as const, p });

test('IA: com mana para uma só, desce a Dazzling Aurora (motor de todo turno) em vez de uma unidade grande', () => {
  const s = new Scenario();
  const aurora = s.put(0, 'OGN-160', 'hand'); // gear 9 + 2 power: no fim do seu turno, joga uma unidade do topo de graça
  s.put(0, 'OGN-161', 'hand'); // Deadbloom Predator, 8 + 2, Might 8
  s.runes(0, Array(11).fill(RUNE.body));
  s.go();
  const ans = new AiPlayer(0).decide(s.g);
  const opt = s.d.options.find((o) => o.id === ans[0]);
  assert.equal(opt?.obj, aurora.id, `a IA escolheu: ${opt?.label}`);
});

test('IA: mulligan troca a carta sem jogada nos primeiros turnos e fica com mão de curva baixa', () => {
  const s = new Scenario();
  const drake = s.put(0, 'OGN-142', 'hand'); // Mountain Drake, 9
  const cheap = [s.put(0, 'OGN-175', 'hand'), s.put(0, 'OGN-052', 'hand'), s.put(0, 'OGN-185', 'hand')]; // 3, 2, 2
  const mull = (ids: string[]): Decision => ({ player: 0, kind: 'mulligan', prompt: '', options: ids.map((id) => ({ id, label: id })), min: 0, max: 2 });
  assert.deepEqual(mulliganPick(mull([drake.id, ...cheap.map((o) => o.id)]), s.e), [drake.id]);
  assert.deepEqual(mulliganPick(mull(cheap.map((o) => o.id)), s.e), []);
});

/**
 * A IA refaz a partida pelas respostas (Game.load) para testar respostas fora da fase principal; num cenário montado à
 * mão isso não reproduz a mesa. Aqui o Game.load remonta o cenário e reaplica as respostas dadas depois dele.
 */
function scenario(build: (s: Scenario) => void): Scenario {
  const make = () => {
    const s = new Scenario();
    build(s);
    s.go();
    return s;
  };
  const s = make();
  const start = s.g.answers.length;
  Game.load = (json: string) => {
    const g = make().g;
    for (const a of JSON.parse(json).answers.slice(start)) if (!g.answer(a)) throw new Error('replay: ' + g.error);
    return g;
  };
  return s;
}
const realLoad = Game.load;
test.afterEach(() => {
  Game.load = realLoad;
});

/** Deixa as duas IAs jogarem até acabar o turno do jogador 0. */
function playTurn(s: Scenario) {
  const ais = [new AiPlayer(0), new AiPlayer(1)];
  const turn = s.e.turn;
  for (let i = 0; i < 60 && s.g.current && s.e.turn === turn; i++) s.ok(ais[s.d.player].decide(s.g));
}

test('IA: não manda a unidade morrer contra uma maior; conquista o campo vazio', () => {
  const s = scenario((s) => {
    s.put(0, 'OGN-175', base(0)); // Shipyard Skulker, 3
    s.put(1, 'OGN-049', BF0); // Playful Phantom, 5
  });
  const [mine, big] = s.e.units();
  playTurn(s);
  assert.equal(mine.zone, 'board', s.log());
  assert.equal(big.zone, 'board');
  assert.deepEqual(mine.loc, BF1, 'vai para o campo vazio\n' + s.log());
});

test('IA: ataca junto quando só as duas unidades somadas vencem o combate', () => {
  const s = scenario((s) => {
    s.put(0, 'OGN-175', base(0)); // 3
    s.put(0, 'OGN-175', base(0)); // 3
    s.put(1, 'OGN-049', BF0); // 5
    s.put(1, 'OGN-049', BF1); // 5
  });
  const enemies = s.e.units().filter((u) => u.controller === 1);
  playTurn(s);
  assert.ok(enemies.some((u) => u.zone !== 'board'), 'um dos Phantoms morre\n' + s.log());
  assert.ok(s.e.bfs.some((x) => x.controller === 0), 'conquista um campo\n' + s.log());
});

test('IA: no fim do turno, contesta o campo que daria o ponto da vitória ao oponente', () => {
  // o oponente tem 7 pontos e segura o campo A: se nada mudar, pontua (hold) no começo do turno dele e vence. Trocar a
  // unidade pela dele (empate de Might) é o único jeito de impedir; conquistar o campo vazio B não adianta.
  const s = scenario((s) => {
    s.put(0, 'OGN-219', base(0)); // Vanguard Sergeant, 4
    s.put(1, 'OGN-219', BF0); // 4
    s.e.pl[1].points = 7;
  });
  const [mine] = s.e.units().filter((u) => u.controller === 0);
  playTurn(s);
  assert.notEqual(s.e.bfs[0].controller, 1, 'o oponente não pode seguir controlando o campo A\n' + s.log());
  assert.equal(mine.zone, 'trash');
});

test('IA: responde na pilha para salvar a unidade alvo, e não gasta a resposta quando a unidade sobrevive', () => {
  for (const [code, save] of [
    ['OGN-175', true], // Skulker (3) morre com os 3 do Hextech Ray: vale o Unyielding Spirit
    ['OGN-142', false], // Mountain Drake (10) aguenta: passa
  ] as const) {
    const s = scenario((s) => {
      s.put(1, code, BF0);
      s.put(1, 'OGN-145', 'hand'); // Unyielding Spirit: [Reaction] previne o dano de spells e habilidades neste turno
      s.runes(1, [RUNE.body, RUNE.body]);
      s.put(0, 'OGN-009', 'hand'); // Hextech Ray: 3 de dano numa unidade num campo
      s.runes(0, [RUNE.fury, RUNE.fury]);
    });
    const [u] = s.e.units();
    s.pick('Jogar Hextech Ray');
    s.maybeObj(u);
    assert.equal(s.d.player, 1);
    const ans = new AiPlayer(1).decide(s.g);
    const label = s.d.options.find((o) => o.id === ans[0])?.label || '';
    assert.equal(/Unyielding/.test(label), save, `${code}: a IA escolheu ${label}`);
    Game.load = realLoad;
  }
});

test('IA: no próprio turno, não gasta a Reaction sem ganhar nada (guarda para o turno do oponente)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-175', BF0);
  s.put(0, 'OGN-145', 'hand'); // Unyielding Spirit
  s.runes(0, [RUNE.body, RUNE.body]);
  s.go();
  const ans = new AiPlayer(0).decide(s.g);
  assert.equal(ans[0], 'end', s.d.options.find((o) => o.id === ans[0])?.label);
});

// ───────────────────────────── Vendetta / Radiance ─────────────────────────────

test('IA: com energia sobrando e nada para jogar, paga o [Empower] (Shadow Fiend ganha Assault 3)', () => {
  const s = scenario((s) => {
    s.put(0, 'VEN-014', BF0); // Shadow Fiend: [Empower] [2][Fury]; Empowered: [Assault 3]
    s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury]);
    for (const o of Object.values(s.e.objs)) if (o.zone === 'champion') s.e.toZone(o, 'mainDeck', { bottom: true }); // sem a Jinx
  });
  const [fiend] = s.e.units();
  playTurn(s);
  assert.equal(fiend.empowered, true, s.log());
});

test('IA: joga o gear com [Deploy] no campo que ela segura, não no campo que o oponente segura (lá ele morre)', () => {
  const s = scenario((s) => {
    s.put(1, 'OGN-049', BF0); // Playful Phantom (5) segura o campo A
    s.put(0, 'OGN-175', BF1); // Shipyard Skulker (3) segura o campo B
    s.put(0, 'RAD-024', 'hand'); // Blossoming Dreamroot: [Deploy]
    s.runes(0, [RUNE.calm, RUNE.calm]);
  });
  playTurn(s);
  const root = s.e.board().find((o) => o.code === 'RAD-024');
  assert.ok(root, 'jogou o Dreamroot\n' + s.log());
  assert.equal(s.e.bfIndex(root!), 1, s.log());
});

test('IA: avaliação — carta com [Flow] no descarte vale mais que uma sem; Empowered vale mais', () => {
  const s = new Scenario();
  s.go();
  const base = evaluate(s.e, 0);
  s.put(0, 'VEN-003', 'trash'); // Brittle Steel: [Flow]
  assert.ok(evaluate(s.e, 0) > base, 'Flow no descarte');
  const fiend = s.put(0, 'VEN-014', BF0);
  const before = evaluate(s.e, 0);
  s.e.empowerObj(fiend, 0);
  assert.ok(evaluate(s.e, 0) > before, 'Empowered');
});

test('IA: Predict recicla do topo a carta cara demais para jogar logo e mantém a barata', () => {
  const s = new Scenario();
  const drake = s.put(0, 'OGN-142', 'deckTop'); // 9
  const skulker = s.put(0, 'OGN-175', 'deckTop'); // 3
  s.runes(0, [RUNE.body, RUNE.body]);
  s.go();
  const d: Decision = {
    player: 0,
    kind: 'choose',
    prompt: 'Predict: escolha quais cartas do topo reciclar (as outras voltam ao topo)',
    options: [drake, skulker].map((o) => ({ id: o.id, label: o.code, obj: o.id })),
    min: 0,
    max: 2,
  };
  assert.deepEqual(quickPick(d, s.e), [drake.id]);
});

test('IA: lê o arquétipo do oponente pela lenda (Jinx pressiona; Ornn acelera e segura)', () => {
  const s = new Scenario();
  assert.equal(oppArchetype(s.e, 1), 'aggro', 'Jinx');
  s.e.pl[1].legend = s.e.newObj('SFD-189', 1, 'legend').id; // Ornn
  assert.equal(oppArchetype(s.e, 0), 'control', 'Ornn');
});

// ───────────────────────────── níveis ─────────────────────────────

test('IA: os três níveis dão respostas legais; o Fácil é determinístico (mesmo lance, mesma escolha) e o Difícil respeita o tempo', () => {
  const g = new Game({ seed: 7, decks: [new Scenario().g.cfg.decks[0], new Scenario().g.cfg.decks[1]], names: ['A', 'B'], firstPlayer: 0 });
  const levels = ['easy', 'normal', 'hard'] as const;
  const ais = [new AiPlayer(0, 'hard'), new AiPlayer(1, 'easy')];
  let worst = 0;
  for (let i = 0; i < 160 && g.current && g.engine.turn < 6; i++) {
    const d = g.current;
    if (d.player === 1) {
      const again = new AiPlayer(1, 'easy');
      const a1 = ais[1].decide(g);
      if (d.kind !== 'action') assert.deepEqual(again.decide(g), a1, 'Fácil repetível');
      assert.ok(g.answer(a1), `Fácil: ${g.error}`);
    } else {
      const t0 = performance.now();
      const a0 = ais[0].decide(g);
      worst = Math.max(worst, performance.now() - t0);
      assert.ok(g.answer(a0), `Difícil: ${g.error}`);
    }
  }
  assert.ok(worst < 3000, `Difícil levou ${worst.toFixed(0)}ms`);
  void levels;
});
