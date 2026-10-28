// Ranking entre amigos (Elo) e resumo do perfil (src/ui/rating.ts), sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from '../scripts/histseed';
import '../src/cards';
import * as acc from '../src/ui/account';
import * as hist from '../src/ui/history';
import * as rating from '../src/ui/rating';
import { playRandom } from './sim';

fakeStorage(); // a conta só lê o armazenamento no primeiro uso

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));
/** grava como a interface no fim da partida e espera entrar no histórico (ou não entrar: repetida) */
const rec = (g: Parameters<typeof hist.recordGame>[0], info: Parameters<typeof hist.recordGame>[1]) =>
  new Promise<void>((res) => {
    hist.recordGame(g, info, res);
    setTimeout(res, 3000);
  });

test('Elo: conta simétrica, favorito ganha menos, zebra ganha mais', () => {
  assert.equal(rating.eloDelta0(1000, 1000, true), 16);
  assert.equal(rating.eloDelta0(1000, 1000, false), -16);
  assert.ok(rating.eloDelta0(1200, 1000, true) < 16, 'favorito vence: ganha pouco');
  assert.ok(rating.eloDelta0(1000, 1200, true) > 16, 'zebra vence: ganha muito');
  assert.ok(Math.abs(rating.expected(1100, 1000) + rating.expected(1000, 1100) - 1) < 1e-12);
  // o que um ganha o outro perde, inclusive nos arredondamentos (visto dos dois lados)
  for (let a = 600; a <= 1600; a += 37)
    for (let b = 600; b <= 1600; b += 53)
      for (const w of [true, false]) assert.equal(rating.eloDelta0(a, b, w), -rating.eloDelta0(b, a, !w), `${a}×${b}`);
});

test('ranking: os dois lados contam a mesma partida, uma vez só, e veem os mesmos números', () => {
  const A = acc.profile();
  acc.renameProfile('Ana');
  const cardA = rating.myCard();
  const B = acc.createProfile('Bruno');
  const cardB = rating.myCard();
  assert.notEqual(cardA.id, cardB.id, 'cada conta tem a sua identidade');
  assert.equal(cardA.elo, 1000);
  // Bruno entra na sala de Ana: cada um vê o cartão do outro
  rating.sawFriend(cardA);
  acc.switchProfile(A.id);
  rating.sawFriend(cardB);
  const rank = rating.rankForGame(rating.myCard(), rating.latestCard(cardB))!;
  assert.ok(rank);
  const cfg = { seed: 4242, rank };
  // Ana (anfitriã, lugar 0) vence
  const ra = rating.recordRanked('online', cfg, 0, 0)!;
  assert.equal(ra.d, 16);
  assert.equal(rating.rankStore().elo, 1016);
  assert.equal(rating.recordRanked('online', cfg, 0, 0), null, 'a mesma partida não conta de novo (fim redesenhado, histórico apagado...)');
  assert.equal(rating.rankStore().elo, 1016);
  assert.equal(rating.rankStore().friends[cardB.id].elo, 984);
  // Bruno (convidado, lugar 1) recebe o mesmo cfg no fim
  acc.switchProfile(B.id);
  const rb = rating.recordRanked('online', cfg, 0, 1)!;
  assert.equal(rb.d, -16);
  assert.equal(rating.rankStore().elo, 984);
  assert.equal(rating.rankStore().friends[cardA.id].elo, 1016, 'Bruno vê Ana com a mesma pontuação que ela tem');
  // revanche: o anfitrião usa a pontuação nova do convidado; Bruno vence
  acc.switchProfile(A.id);
  const cfg2 = { seed: 4243, rank: rating.rankForGame(rating.myCard(), rating.latestCard(cardB))! };
  assert.equal(cfg2.rank[1].elo, 984);
  const a2 = rating.recordRanked('online', cfg2, 1, 0)!;
  acc.switchProfile(B.id);
  const b2 = rating.recordRanked('online', cfg2, 1, 1)!;
  assert.equal(a2.d, -b2.d);
  assert.ok(b2.d > 16, 'zebra ganha mais');
  const eB = rating.rankStore().elo;
  acc.switchProfile(A.id);
  const eA = rating.rankStore().elo;
  assert.equal(rating.rankStore().friends[cardB.id].elo, eB);
  acc.switchProfile(B.id);
  assert.equal(rating.rankStore().friends[cardA.id].elo, eA);
  assert.equal(eA + eB, 2000, 'soma constante');
  // tabela: Bruno vê os dois, ordenados pela pontuação, com V×D e sequência
  const t = rating.rankTable();
  assert.equal(t.length, 2);
  assert.ok(t[0].elo >= t[1].elo);
  const ana = t.find((x) => !x.me)!;
  assert.equal(ana.name, 'Ana');
  assert.equal(ana.w, 1);
  assert.equal(ana.l, 1);
  assert.equal(ana.streak, 1);
  assert.equal(rating.rankStore().log.length, 2);
  acc.switchProfile(A.id);
});

test('ranking: o que não conta', () => {
  const r0 = JSON.stringify(rating.rankStore());
  const me = rating.myCard();
  const other = { id: 'ffffffffffffffff0000', name: 'Outro', elo: 1100, n: 3 };
  assert.equal(rating.recordRanked('ai', { seed: 1, rank: [me, other] }, 0, 0), null, 'contra a IA não conta');
  assert.equal(rating.recordRanked('human', { seed: 2, rank: [me, other] }, 0, 0), null, 'passa-e-joga não conta');
  assert.equal(rating.recordRanked('online', { seed: 3 }, 0, 0), null, 'online sem cartões (versão antiga) não conta');
  assert.equal(rating.recordRanked('online', { seed: 4, rank: [other, { ...other, id: 'eeeeeeeeeeeeeeee0000' }] }, 0, 0), null, 'partida de outras contas (replay de arquivo) não conta');
  assert.equal(rating.recordRanked('online', { seed: 5, rank: [me, other] }, null, 0), null, 'sem vencedor não conta');
  assert.equal(rating.recordRanked('online', { seed: 6, rank: [me, other] }, 0, 1), null, 'o meu cartão no lugar errado não conta');
  assert.equal(rating.rankForGame(me, me), null, 'a mesma conta nos dois lados (duas abas) não conta');
  assert.equal(rating.cleanCard({ id: 'x', elo: 1000 }), null);
  assert.equal(rating.cleanCard({ id: 'abcdefgh12345678', elo: 'mil' }), null);
  assert.equal(JSON.stringify(rating.rankStore()), r0);
});

test('fim de partida pelo histórico: online conta no ranking e no perfil; desfazer/replay não contam de novo', async () => {
  const me = rating.myCard();
  const friend = { id: '0123456789abcdef0123', name: 'Caio', elo: 1050, n: 10 };
  let r = playRandom(301);
  for (let s = 302; r.winner === null; s++) r = playRandom(s);
  const g = r.g;
  (g.cfg as any).rank = [me, friend];
  const before = rating.rankStore().elo;
  const c0 = JSON.parse(JSON.stringify(rating.career(hist.list)));
  await rec(g, { mode: 'online', seat: 0, prefer: [null, null] });
  const e = hist.list()[0];
  assert.equal(e.opp, friend.id);
  assert.ok(e.elo, 'o histórico guarda a mudança da pontuação');
  assert.equal(rating.rankStore().elo, before + e.elo!.d);
  const c1 = JSON.parse(JSON.stringify(rating.career())) as rating.Career;
  assert.equal(c1.modes.online.g, c0.modes.online.g + 1);
  assert.equal(c1.opps[`f:${friend.id}`].g, 1);
  assert.equal(c1.opps[`f:${friend.id}`].name, 'Caio');
  // "desfazer" depois do fim e terminar de novo: mesma semente, outro número de lances → não conta outra vez
  const again = { cfg: g.cfg, answers: [...g.answers, ['x']], engine: g.engine, serialize: () => g.serialize() };
  hist.recordGame(again, { mode: 'online', seat: 0, prefer: [null, null] });
  await wait();
  assert.equal(rating.rankStore().elo, before + e.elo!.d, 'ranking não muda');
  assert.equal(rating.career().modes.online.g, c1.modes.online.g, 'perfil não muda');
  // a mesma partida aberta como replay e jogada "contra a IA" a partir dela: não é online, não conta no ranking
  await rec({ cfg: { ...g.cfg, seed: 999001 }, answers: g.answers, engine: g.engine, serialize: () => g.serialize() }, { mode: 'ai', seat: 0, prefer: [null, null] });
  assert.equal(rating.rankStore().elo, before + e.elo!.d);
  assert.equal(rating.career().modes.ai.g, c1.modes.ai.g + 1);
  assert.equal(rating.career().opps['ai:?'].g >= 1, true);
  // contra a IA com nível
  let r2 = playRandom(401);
  for (let s = 402; r2.winner === null; s++) r2 = playRandom(s);
  (r2.g.cfg as any).aiLevel = 'hard';
  await rec(r2.g, { mode: 'ai', seat: 0, prefer: [null, null] });
  assert.equal(hist.list()[0].ai, 'hard');
  assert.equal(rating.career().opps['ai:hard'].g, 1);
  const c = rating.career();
  const total = c.modes.ai.g + c.modes.online.g;
  assert.equal(Object.values(c.decks).reduce((a, d) => a + d.g, 0), total, 'cada partida (IA/online) num deck');
  assert.equal(Object.values(c.opps).reduce((a, d) => a + d.g, 0), total, 'e num adversário');
  assert.ok(c.best >= c.streak);
});

test('conta antiga: abre sem ranking nem perfil, o perfil começa do histórico, e o backup leva os dados novos', async () => {
  // backup de uma conta de antes do ranking (sem rank/career), com histórico já guardado no aparelho
  const old = { id: 'velha', name: 'Velha', decks: [], created: 1, recorded: [] };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');
  const p = acc.importProfile(b64(old));
  assert.equal(p.rank, undefined);
  // o histórico da conta antiga (gravado antes; aqui posto direto na chave dela)
  let r = playRandom(501);
  for (let s = 502; r.winner === null; s++) r = playRandom(s);
  const entries = [
    { id: `${r.g.cfg.seed}-10`, at: 1, mode: 'ai', seat: 0, names: ['Velha', 'IA'], decks: [{ name: 'D1', legend: r.g.cfg.decks[0].legend, champion: r.g.cfg.decks[0].champion }, { name: 'D2', legend: r.g.cfg.decks[1].legend, champion: r.g.cfg.decks[1].champion }], winner: 0, points: [8, 3], turns: 9, moves: 10 },
    { id: '77-5', at: 2, mode: 'online', seat: 1, names: ['Zé', 'Velha'], decks: [{ name: 'X', legend: r.g.cfg.decks[0].legend, champion: r.g.cfg.decks[0].champion }, { name: 'D1', legend: r.g.cfg.decks[0].legend, champion: r.g.cfg.decks[0].champion }], winner: 0, points: [8, 6], turns: 12, moves: 5 },
    { id: '78-5', at: 3, mode: 'human', seat: 0, names: ['J1', 'J2'], decks: [{ name: 'X', legend: '', champion: '' }, { name: 'Y', legend: '', champion: '' }], winner: 1, points: [2, 8], turns: 7, moves: 5 },
  ];
  localStorage.setItem(acc.HIST_PREFIX + p.id, JSON.stringify({ v: 1, list: entries.reverse() }));
  const rk = rating.rankStore();
  assert.equal(rk.elo, 1000);
  assert.equal(rk.v, 1);
  const c = rating.career(hist.list);
  assert.equal(c.fromHist, 3);
  assert.equal(c.modes.ai.g, 1);
  assert.equal(c.modes.online.g, 1);
  assert.equal(c.modes.human.g, 1);
  assert.equal(c.opps['n:Zé'].g, 1, 'online antigo: adversário pelo nome');
  assert.equal(c.opps['ai:?'].w, 1);
  assert.equal(c.best, 1);
  assert.equal(c.streak, 0);
  // dado estragado não derruba: conserta o que der
  (p as any).rank = { id: rk.id, elo: 'x', friends: null };
  const fixed = rating.rankStore();
  assert.equal(fixed.id, rk.id);
  assert.equal(fixed.elo, 1000);
  assert.deepEqual(fixed.friends, {});
  // backup: leva ranking (mesma identidade e pontuação) e perfil
  fixed.elo = 1077;
  acc.persist();
  const back = acc.exportProfile();
  const q = acc.importProfile(back);
  assert.notEqual(q.id, p.id);
  assert.equal(rating.rankStore().id, rk.id, 'a identidade no ranking vai junto (é a mesma pessoa em outro aparelho)');
  assert.equal(rating.rankStore().elo, 1077);
  assert.equal(rating.career().modes.ai.g, 1);
});
