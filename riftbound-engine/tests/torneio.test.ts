// Torneio entre amigos (src/ui/tournament.ts): chave com bye, rodízio dos pontos corridos, tabela e desempates,
// melhor de 3, relatórios de resultado (quem pode, uma vez por partida), W.O., correções e o estado vindo da rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTournament,
  fixMatch,
  joinPlayer,
  matchReady,
  matchWinner,
  newTournament,
  nextPow2,
  removePlayer,
  reportGame,
  roundRobin,
  seedOrder,
  standings,
  startTournament,
  type TourFormat,
  type Tournament,
} from '../src/ui/tournament';

const deck = (n: string) => ({ name: `Deck ${n}`, legend: 'OGN-247', champion: 'OGN-001' });
/** sorteio fixo: mantém a ordem de inscrição (p1 = cabeça 1, ...) */
const noShuffle = () => 0.999999;
function make(n: number, format: TourFormat, bestOf: 1 | 3 = 1): Tournament {
  const t = newTournament({ code: 'ABCDEF', name: 'Copa', org: 'p1', orgName: 'Org', format, bestOf, deckChange: false, cards: 'casual' });
  for (let i = 1; i <= n; i++) joinPlayer(t, `p${i}`, `Jogador ${i}`, deck(String(i)));
  const r = startTournament(t, noShuffle);
  assert.ok(r.ok, r.msg);
  return t;
}
let seedN = 1;
/** a partida que a sala relata: `winner` é o id de quem venceu */
function play(t: Tournament, mid: string, winner: string, pts: [number, number] = [8, 4]) {
  const m = t.matches.find((x) => x.id === mid)!;
  const w = winner === m.a ? 0 : 1;
  const r = reportGame(t, mid, m.a!, { seed: seedN++, a: m.a!, b: m.b!, w, pts: w === 0 ? pts : [pts[1], pts[0]] });
  assert.ok(r.ok, `${mid}: ${r.msg}`);
}
const byId = (t: Tournament, id: string) => t.matches.find((m) => m.id === id)!;

test('ordem da chave: cabeças só se encontram no fim', () => {
  assert.deepEqual(seedOrder(2), [1, 2]);
  assert.deepEqual(seedOrder(4), [1, 4, 2, 3]);
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.equal(nextPow2(5), 8);
  assert.equal(nextPow2(8), 8);
});

test('eliminação: tamanhos de 2 a 16, byes para os primeiros cabeças, nunca bye contra bye', () => {
  for (let n = 2; n <= 16; n++) {
    const t = make(n, 'elim');
    const size = nextPow2(n);
    assert.equal(t.rounds, Math.log2(size), `n=${n}`);
    assert.equal(t.matches.length, size - 1, `n=${n}: confrontos`);
    const r0 = t.matches.filter((m) => m.round === 0);
    const byes = r0.filter((m) => m.bye);
    assert.equal(byes.length, size - n, `n=${n}: byes`);
    for (const m of r0) assert.ok(m.a, `n=${n}: confronto ${m.id} sem nenhum jogador`);
    // quem passa direto são os primeiros do sorteio
    const free = byes.map((m) => t.players.find((p) => p.id === m.a)!.seed).sort((a, b) => a - b);
    assert.deepEqual(free, Array.from({ length: size - n }, (_, i) => i + 1), `n=${n}: bye para os cabeças`);
    // todos aparecem uma vez na 1ª rodada
    const ids = r0.flatMap((m) => [m.a, m.b]).filter(Boolean);
    assert.equal(new Set(ids).size, n);
  }
});

test('eliminação com 5: byes avançam sozinhos, chave até o campeão', () => {
  const t = make(5, 'elim');
  // r0: (1×bye) (4×5) (2×bye) (3×bye)
  assert.equal(matchWinner(t, byId(t, 'r0m0')), 'p1');
  assert.ok(matchReady(t, byId(t, 'r0m1')));
  assert.equal(byId(t, 'r1m1').a, 'p2');
  assert.equal(byId(t, 'r1m1').b, 'p3');
  assert.equal(byId(t, 'r1m0').b, null, 'espera o vencedor de 4×5');
  assert.ok(!matchReady(t, byId(t, 'r1m0')));
  play(t, 'r0m1', 'p5');
  assert.equal(byId(t, 'r1m0').b, 'p5');
  play(t, 'r1m0', 'p5');
  play(t, 'r1m1', 'p2');
  assert.equal(t.status, 'running');
  play(t, 'r2m0', 'p2', [8, 7]);
  assert.equal(t.status, 'done');
  assert.equal(t.champion, 'p2');
  assert.equal(t.champDeck?.name, 'Deck 2');
});

test('melhor de 3: precisa de 2 vitórias; partida repetida (mesma semente) conta uma vez; depois de decidido não entra mais', () => {
  const t = make(2, 'elim', 3);
  const m = byId(t, 'r0m0');
  const rep = (seed: number, w: 0 | 1) => reportGame(t, m.id, 'p1', { seed, a: 'p1', b: 'p2', w, pts: w ? [5, 8] : [8, 5] });
  assert.ok(rep(10, 0).ok);
  assert.ok(rep(10, 0).ok); // o outro jogador relata a mesma partida
  assert.equal(m.games.length, 1);
  assert.equal(matchWinner(t, m), null);
  rep(11, 1);
  assert.equal(matchWinner(t, m), null, '1 × 1');
  rep(12, 1);
  assert.equal(matchWinner(t, m), 'p2');
  assert.equal(t.champion, 'p2');
  assert.equal(rep(13, 0).ok, false, 'confronto decidido não aceita mais partida');
  assert.equal(m.games.length, 3);
});

test('relatório: só quem jogou (ou o organizador), com os lados certos', () => {
  const t = make(4, 'elim');
  const m = byId(t, 'r0m0'); // p1 × p4
  const before = t.rev;
  assert.equal(reportGame(t, m.id, 'p2', { seed: 1, a: m.a!, b: m.b!, w: 0, pts: [8, 0] }).ok, false, 'outro participante');
  assert.equal(reportGame(t, m.id, 'p4', { seed: 1, a: m.b!, b: m.a!, w: 0, pts: [8, 0] }).ok, false, 'lados trocados');
  assert.equal(reportGame(t, 'r9m9', 'p4', { seed: 1, a: m.a!, b: m.b!, w: 0, pts: [8, 0] }).ok, false, 'confronto inexistente');
  assert.equal(t.rev, before, 'nada mudou');
  assert.ok(reportGame(t, m.id, 'p4', { seed: 1, a: m.a!, b: m.b!, w: 1, pts: [3, 8] }).ok);
  assert.equal(matchWinner(t, m), 'p4');
  assert.ok(t.rev > before);
});

test('correção na chave: mudar o vencedor desfaz o confronto seguinte; W.O.; limpar', () => {
  const t = make(4, 'elim');
  play(t, 'r0m0', 'p1');
  play(t, 'r0m1', 'p2');
  play(t, 'r1m0', 'p1');
  assert.equal(t.champion, 'p1');
  // o organizador corrige a semifinal: p4 venceu
  assert.ok(fixMatch(t, 'r0m0', [{ w: 1, pts: [6, 8] }]).ok);
  const fin = byId(t, 'r1m0');
  assert.equal(fin.a, 'p4');
  assert.equal(fin.games.length, 0, 'a final com o lado errado foi desfeita');
  assert.equal(t.status, 'running');
  assert.equal(t.champion, undefined);
  // W.O. na final
  assert.ok(fixMatch(t, 'r1m0', [], 'b').ok);
  assert.equal(t.champion, 'p2');
  assert.equal(t.status, 'done');
  // limpar o resultado: volta a ser jogável
  assert.ok(fixMatch(t, 'r1m0', []).ok);
  assert.ok(matchReady(t, fin));
  // correção inválida: partida depois de decidido (melhor de 1 com 2 partidas)
  assert.equal(fixMatch(t, 'r1m0', [{ w: 0, pts: [8, 1] }, { w: 1, pts: [1, 8] }]).ok, false);
});

test('pontos corridos: cada par uma vez, rodadas sem repetir jogador, folga com número ímpar', () => {
  for (let n = 2; n <= 9; n++) {
    const ids = Array.from({ length: n }, (_, i) => `p${i + 1}`);
    const rounds = roundRobin(ids);
    assert.equal(rounds.length, n % 2 ? n : n - 1, `n=${n}: rodadas`);
    const pairs = new Set<string>();
    for (const r of rounds) {
      const seen = new Set<string>();
      for (const [a, b] of r) {
        assert.ok(!seen.has(a) && !seen.has(b), `n=${n}: ninguém joga duas vezes na rodada`);
        seen.add(a), seen.add(b);
        const k = [a, b].sort().join('-');
        assert.ok(!pairs.has(k), `n=${n}: par repetido ${k}`);
        pairs.add(k);
      }
      assert.equal(seen.size, n - (n % 2), `n=${n}: todos jogam (menos a folga)`);
    }
    assert.equal(pairs.size, (n * (n - 1)) / 2, `n=${n}: todos contra todos`);
  }
});

test('tabela: vitória = 3; desempate por confronto direto', () => {
  const t = make(4, 'rr');
  const m = (a: string, b: string) => t.matches.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!;
  // p1 e p2 com 2 vitórias; p2 venceu p1 no confronto direto, mas p1 tem saldo muito maior
  play(t, m('p1', 'p2').id, 'p2', [8, 7]);
  play(t, m('p1', 'p3').id, 'p1', [8, 0]);
  play(t, m('p1', 'p4').id, 'p1', [8, 0]);
  play(t, m('p2', 'p3').id, 'p3', [8, 7]);
  play(t, m('p2', 'p4').id, 'p2', [8, 7]);
  play(t, m('p3', 'p4').id, 'p4', [8, 7]);
  const s = standings(t);
  assert.deepEqual(
    s.map((x) => [x.id, x.pts]),
    [
      ['p2', 6],
      ['p1', 6],
      ['p4', 3], // p4 venceu p3 no confronto direto
      ['p3', 3],
    ],
  );
  assert.ok(s[1].pf - s[1].pa > s[0].pf - s[0].pa, 'p1 tem saldo maior, mas perdeu o confronto direto');
  assert.equal(t.status, 'done');
  assert.equal(t.champion, 'p2');
});

test('tabela: empate triplo em confronto direto vai para o saldo de pontos de partida', () => {
  const t = make(3, 'rr');
  const m = (a: string, b: string) => t.matches.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!;
  // ciclo: p1 > p2 > p3 > p1 (todos com 3 pontos e 3 no confronto direto); saldos: p3 +6, p1 +1, p2 -7
  play(t, m('p1', 'p2').id, 'p1', [8, 0]); // p1 +8, p2 -8
  play(t, m('p2', 'p3').id, 'p2', [8, 7]); // p2 +1, p3 -1
  play(t, m('p3', 'p1').id, 'p3', [8, 1]); // p3 +7, p1 -7
  const s = standings(t);
  assert.deepEqual(s.map((x) => x.id), ['p3', 'p1', 'p2']);
  assert.deepEqual(s.map((x) => x.pf - x.pa), [6, 1, -7]);
  assert.equal(t.champion, 'p3');
});

test('pontos corridos em melhor de 3: partidas ganhas e saldo somam todas as partidas', () => {
  const t = make(2, 'rr', 3);
  const mid = t.matches[0].id;
  const a = t.matches[0].a!;
  const b = t.matches[0].b!;
  reportGame(t, mid, a, { seed: 1, a, b, w: 0, pts: [8, 6] });
  reportGame(t, mid, a, { seed: 2, a, b, w: 1, pts: [2, 8] });
  reportGame(t, mid, a, { seed: 3, a, b, w: 0, pts: [8, 3] });
  const s = standings(t);
  assert.equal(s[0].id, a);
  assert.deepEqual([s[0].gw, s[0].gl, s[0].pf, s[0].pa], [2, 1, 18, 17]);
  assert.equal(s[0].pts, 3);
  assert.equal(t.status, 'done');
});

test('inscrição: antes de começar entra, troca o deck e sai; depois, só troca o deck se o torneio deixa', () => {
  const t = newTournament({ code: 'ABCDEF', name: '', org: 'o', orgName: 'Org', format: 'elim', bestOf: 1, deckChange: false, cards: 'casual' });
  assert.equal(t.name, 'Torneio de Org');
  assert.ok(joinPlayer(t, 'x', 'X', deck('1')).changed);
  assert.ok(!joinPlayer(t, 'x', 'X', deck('1')).changed, 'repetido não muda');
  assert.ok(joinPlayer(t, 'x', 'X', deck('2')).changed);
  assert.equal(startTournament(t).ok, false, 'um só não começa');
  joinPlayer(t, 'y', 'Y', null);
  assert.equal(startTournament(t).ok, false, 'sem deck não começa');
  joinPlayer(t, 'y', 'Y', deck('3'));
  assert.ok(removePlayer(t, 'y'));
  joinPlayer(t, 'y', 'Y', deck('3'));
  assert.ok(startTournament(t).ok);
  assert.equal(joinPlayer(t, 'z', 'Z', deck('4')).ok, false, 'inscrições fechadas');
  assert.equal(joinPlayer(t, 'x', 'X', deck('5')).ok, false, 'deck fixo');
  assert.equal(removePlayer(t, 'x'), false, 'não sai depois de começar');
  t.deckChange = true;
  assert.ok(joinPlayer(t, 'x', 'X', deck('5')).changed, 'pode trocar quando o torneio deixa');
});

test('estado vindo da rede: confere tipos e descarta lixo', () => {
  const t = make(5, 'elim', 3);
  play(t, 'r0m1', 'p4');
  const back = cleanTournament(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(t)));
  assert.equal(cleanTournament(null), null);
  assert.equal(cleanTournament({ v: 2 }), null);
  assert.equal(cleanTournament({ ...t, code: 'xx' }), null);
  const evil = JSON.parse(JSON.stringify(t));
  evil.players[0].name = '<img src=x onerror=alert(1)>‮' + 'a'.repeat(80);
  evil.matches[1].a = 'intruso';
  evil.matches[1].games[0].pts = [1e9, -5];
  const c = cleanTournament(evil)!;
  assert.ok(c.players[0].name.length <= 20 && !c.players[0].name.includes('‮'));
  assert.equal(c.matches[1].a, null, 'id que não é participante vira vazio');
  assert.deepEqual(c.matches[1].games[0].pts, [99, 0]);
});
