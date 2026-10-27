// Revisão independente do lote "legends" do Unleashed (UNL-181..219): um teste por erro achado (falha antes da
// correção, passa depois).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function legend(s: Scenario, p: P, code: string): Obj {
  const e = s.e;
  e.legendOf(p).zone = 'gone';
  const o = e.newObj(code, p, 'legend');
  e.pl[p].legend = o.id;
  return o;
}
function runes(s: Scenario, p: P, code: string, n: number) {
  s.runes(p, Array.from({ length: n }, () => code));
}
function setBf(s: Scenario, i: number, code: string) {
  const e = s.e;
  const o = e.newObj(code, i as P, 'battlefieldZone');
  e.bfs[i].objId = o.id;
  e.script(o).bfSetup?.(e, o);
  return o;
}
/** Esconde uma carta de p num campo (escondida num turno anterior). */
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
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 120) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    const a = other?.(d);
    if (a) {
      s.ok(a);
      continue;
    }
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Vários efeitos seus')) s.ok([d.options[0].id]);
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else return;
  }
}

// ───────────── campos ─────────────

test("Ripper's Bay: carta escondida devolvida à mão não é \"uma unidade aqui\" (não dispara)", () => {
  // Uma carta virada para baixo não é unidade (355.9.a.3: "facedown card" é outra categoria; 811): Pack of Wonders
  // devolvendo a carta escondida no Ripper's Bay não dá a chance de pagar [1] para canalizar.
  const s = new Scenario();
  setBf(s, 0, 'UNL-214');
  runes(s, 0, RUNE.chaos, 2);
  s.put(0, 'OGN-181', base(0)); // Pack of Wonders
  s.put(0, 'OGN-052', BF0); // controla o campo
  const fd = hideAt(s, 0, 'OGN-052', 0); // uma unidade escondida
  s.go();
  const r0 = s.e.runesOf(0).length;
  s.pick(/Pack of Wonders/);
  if (s.d.prompt.includes('devolver o quê')) s.pick('carta escondida');
  s.maybeObj(fd);
  let asked = false;
  run(s, (d) => (d.kind === 'confirm' && d.prompt.includes('canalizar') ? ((asked = true), ['yes']) : undefined));
  assert.equal(fd.zone, 'hand', s.log(20));
  assert.equal(asked, false, "Ripper's Bay não deveria disparar: " + s.log(20));
  assert.equal(s.e.runesOf(0).length, r0);
});

// ───────────── Ivern, Green Father (substituir campo) na cópia da IA ─────────────

test('Ivern, Green Father: substituir o Aspirant\'s Climb na cópia da IA não muda os pontos para vencer da partida de verdade', () => {
  // A IA testa jogadas numa cópia (cloneAtRoot). Substituir o Aspirant's Climb por um Brush (438) tira o "+1 ponto para
  // vencer" (bfTeardown), que mexe em cfg.victoryScore: a cópia não pode dividir esse objeto com a partida de verdade.
  const s = new Scenario();
  legend(s, 0, 'UNL-195');
  setBf(s, 0, 'OGN-276'); // Aspirant's Climb
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  const vs = s.e.cfg.victoryScore;
  const sim = s.e.cloneAtRoot();
  sim.emit({ type: 'conquer', player: 0, bf: 0, units: [] });
  sim.runSync(sim.drain());
  assert.equal(sim.name(sim.bfObj(0)), 'Brush', 'na cópia, o Ivern substituiu o campo');
  assert.equal(sim.cfg.victoryScore, vs - 1, 'na cópia, o Climb deixou de valer');
  assert.equal(s.e.name(s.e.bfObj(0)), "Aspirant's Climb");
  assert.equal(s.e.cfg.victoryScore, vs, 'na partida de verdade, continua o mesmo número de pontos para vencer');
});

// ───────────── "joga uma unidade aqui" = local escolhido para jogar (Baron Nashor entra no Baron Pit) ─────────────

test('Valley of Idols: Baron Nashor jogado aqui que entra no Baron Pit foi jogado aqui (pode pagar [1] para o Buff)', () => {
  // FAQ do Baron Nashor (Hunters' Circle, The Exile): a substituição só muda onde ele ENTRA; o local onde foi jogado
  // continua o escolhido (355.2, 369.3). "Quando um jogador joga uma unidade aqui" olha o local da jogada.
  const s = new Scenario();
  setBf(s, 0, 'UNL-218');
  runes(s, 0, RUNE.chaos, 14);
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  const baron = s.put(0, 'UNL-147', 'hand');
  s.go();
  s.pick('Jogar Baron Nashor');
  s.pick('Valley of Idols');
  let asked = false;
  run(s, (d) => (d.kind === 'confirm' && d.prompt.includes('Buff') ? ((asked = true), ['yes']) : undefined));
  assert.equal(s.e.name(s.e.bfObj(s.e.bfIndex(baron))), 'Baron Pit', s.log(20));
  assert.equal(asked, true, 'Valley of Idols deveria disparar: ' + s.log(20));
  assert.equal(baron.buffs, 1);
});

test('Star Spring: Baron Nashor jogado aqui (entra no Baron Pit) conta como a primeira unidade jogada aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-215');
  runes(s, 0, RUNE.chaos, 13);
  const old = s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'UNL-147', 'hand');
  s.go();
  s.pick('Jogar Baron Nashor');
  s.pick('Star Spring');
  run(s, (d) => (d.kind === 'confirm' && d.prompt.includes('Star Spring') ? ['yes'] : d.prompt.startsWith('Star Spring: mover') ? [old.id] : undefined));
  assert.deepEqual(s.e.locOf(old), base(0), s.log(20));
});
