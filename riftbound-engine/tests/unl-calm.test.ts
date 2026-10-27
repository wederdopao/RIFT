// Testes de cenário das cartas do lote "calm" do Unleashed (UNL-031 a UNL-060). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);
const SKULKER = 'OGN-175'; // 3, sem texto
const SERGEANT = 'OGN-219'; // 4, sem texto
const PHANTOM = 'OGN-049'; // 5, sem texto
const MECH = 'OGN-088'; // 8, sem texto
const DRAKE = 'OGN-142'; // 10, sem texto

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function where(s: Scenario, text: string) {
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** Dá ao oponente (B) uma Reaction para ele receber a prioridade com o spell de A na pilha. */
function oppReaction(s: Scenario) {
  s.put(1, 'UNL-031', 'hand');
  s.runes(1, calm(1));
}
const tokens = (s: Scenario, code: string, p: P) => s.e.units().filter((u) => u.code === code && u.controller === p);

test('Combat Experience: +1 sem XP; +3 em vez disso com 6 XP (conferido na resolução)', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  s.runes(0, calm(2));
  s.put(0, 'UNL-031', 'hand');
  s.put(0, 'UNL-031', 'hand');
  s.go();
  s.pick('Jogar Combat Experience');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 4, s.log());
  s.e.pl[0].xp = 6;
  s.go();
  s.pick('Jogar Combat Experience');
  s.maybeObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 7, s.log());
});

test('Double Trouble: revela e compra uma unidade das 3 do topo e recicla o resto; Repeat faz de novo', () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'UNL-032', 'hand');
  const deckLen = s.e.pl[0].mainDeck.length;
  const c3 = s.put(0, 'UNL-031', 'deckTop');
  const c2 = s.put(0, PHANTOM, 'deckTop');
  const c1 = s.put(0, 'UNL-031', 'deckTop');
  s.go();
  s.pick('Jogar Double Trouble');
  s.pick('Não'); // sem Repeat
  s.passAll();
  if (!s.d.root) s.pickObj(c2); // escolher a unidade (opcional)
  s.passAll();
  assert.equal(c2.zone, 'hand', s.log());
  assert.equal(c1.zone, 'mainDeck');
  assert.equal(c3.zone, 'mainDeck');
  const deck = s.e.pl[0].mainDeck;
  assert.ok(deck.indexOf(c1.id) >= deckLen && deck.indexOf(c3.id) >= deckLen, 'as outras foram para o fundo');
});

test('Double Trouble: com o Repeat pago olha o topo duas vezes', () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'UNL-032', 'hand');
  const b = s.put(0, SERGEANT, 'deckTop');
  for (let i = 0; i < 2; i++) s.put(0, 'UNL-031', 'deckTop');
  const a = s.put(0, PHANTOM, 'deckTop');
  s.go();
  s.pick('Jogar Double Trouble');
  s.pick('Sim'); // Repeat [2]
  s.passAll();
  s.pickObj(a);
  // segunda execução: o Sergeant já é a 1ª das 3 do topo? (as 2 Combat Experience foram para o fundo)
  if (!s.d.root && s.d.options.some((o) => o.obj === b.id)) s.pickObj(b);
  s.passAll();
  assert.equal(a.zone, 'hand', s.log());
  assert.equal(b.zone, 'hand', s.log());
});

test('Frisky Hunter: ao jogar, uma ficha Bird com Deflect no mesmo local', () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'UNL-033', 'hand');
  s.go();
  s.pick('Jogar Frisky Hunter');
  where(s, 'base de A');
  s.passAll();
  const birds = tokens(s, 'TOK-BIRD', 0);
  assert.equal(birds.length, 1, s.log());
  assert.deepEqual(birds[0].loc, base(0));
  assert.equal(s.e.kw(birds[0]).deflect, 1);
});

test('Herald of Spring: ganha 2 XP ao jogar e 1 XP (Hunt) ao segurar', () => {
  const s = new Scenario();
  s.runes(0, calm(5));
  s.put(0, 'UNL-034', 'hand');
  s.go();
  s.pick('Jogar Herald of Spring');
  where(s, 'base de A');
  s.passAll();
  assert.equal(s.e.pl[0].xp, 2, s.log());
  const h = s.e.units().find((u) => u.code === 'UNL-034')!;
  s.e.moveUnits([h], BF0, 0);
  s.e.bfs[0].controller = 0;
  s.e.bfs[0].contestedBy = null;
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.pl[0].xp, 3, s.log());
});

test('Monch: com unidade inimiga atordoada custa [2] a menos e entra pronta', () => {
  const s = new Scenario();
  const e = s.put(1, SKULKER, base(1));
  s.runes(0, calm(4));
  const m = s.put(0, 'UNL-035', 'hand');
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Jogar Monch')), 'sem desconto não dá (custa 6)');
  e.stunned = true;
  s.go();
  s.pick('Jogar Monch');
  where(s, 'base de A');
  s.passAll();
  assert.equal(m.zone, 'board', s.log());
  assert.equal(m.exhausted, false);
});

test('Shadow Watcher: entra pronta se uma unidade aliada morreu na sua fase de início neste turno', () => {
  const s = new Scenario();
  s.put(0, 'TOK-SPRITE', base(0)); // Temporary: morre no início do próximo turno de A
  s.runes(0, calm(4));
  const w = s.put(0, 'UNL-037', 'hand');
  const w2 = s.put(1, 'UNL-037', 'hand');
  s.runes(1, calm(4));
  s.go();
  endTurn(s);
  // turno de B: nenhuma unidade de B morreu na fase de início dele
  s.pick('Jogar Shadow Watcher');
  where(s, 'base de B');
  s.passAll();
  assert.equal(w2.exhausted, true, 'B: entra exausta');
  endTurn(s);
  // turno de A: o Sprite morreu na fase de início
  assert.equal(tokens(s, 'TOK-SPRITE', 0).length, 0, s.log());
  s.pick('Jogar Shadow Watcher');
  where(s, 'base de A');
  s.passAll();
  assert.equal(w.zone, 'board');
  assert.equal(w.exhausted, false, s.log());
});

test('Skyward Strike: sem Level só move; com 6 XP também atordoa (alvo escolhido ao jogar)', () => {
  const s = new Scenario();
  const e = s.put(1, SKULKER, base(1));
  const e2 = s.put(1, SERGEANT, base(1));
  s.runes(0, calm(6));
  s.put(0, 'UNL-038', 'hand');
  s.put(0, 'UNL-038', 'hand');
  s.go();
  s.pick('Jogar Skyward Strike');
  s.pickObj(e);
  s.pick('Campo Vazio A');
  s.passAll();
  assert.deepEqual(e.loc, BF0, s.log());
  assert.equal(e.stunned, false);
  s.e.pl[0].xp = 6;
  s.go();
  s.pick('Jogar Skyward Strike');
  s.pickObj(e2); // mover
  s.pickObj(e); // atordoar (Level 6)
  s.pick('Campo Vazio B'); // destino (escolhido depois dos alvos)
  s.passAll();
  assert.deepEqual(e2.loc, BF1, s.log());
  assert.equal(e.stunned, true, s.log());
});

test('Skyward Strike: se o XP cair abaixo de 6 antes de resolver, o Stun não acontece', () => {
  const s = new Scenario();
  const e = s.put(1, SKULKER, base(1));
  s.runes(0, calm(3));
  s.put(0, 'UNL-038', 'hand');
  oppReaction(s);
  s.e.pl[0].xp = 6;
  s.go();
  s.pick('Jogar Skyward Strike'); // só uma unidade inimiga: os dois alvos são automáticos
  s.pick('Campo Vazio A');
  assert.equal(s.d.player, 1, 'B tem a prioridade com o spell na pilha');
  s.e.pl[0].xp = 5; // gasto por outro efeito enquanto o spell está na pilha
  s.passAll();
  assert.deepEqual(e.loc, BF0, s.log());
  assert.equal(e.stunned, false, s.log());
});

test('Soul Sword: +1 impresso; com 3 XP do controlador da unidade, +1 adicional', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  const sw = s.put(0, 'UNL-039', base(0));
  s.runes(0, calm(1));
  s.go();
  s.pick(`Equipar ${s.e.name(sw)}`);
  s.maybeObj(u);
  s.passAll();
  assert.equal(sw.attachedTo, u.id, s.log());
  assert.equal(s.e.might(u), 4);
  s.e.pl[0].xp = 3;
  assert.equal(s.e.might(u), 5);
});

test('Wuju Apprentice: compra 1 ao ser jogado só com 6+ XP; tem Hunt', () => {
  const s = new Scenario();
  s.runes(0, calm(4));
  s.put(0, 'UNL-040', 'hand');
  s.put(0, 'UNL-040', 'hand');
  s.go();
  let hand = s.e.pl[0].hand.length;
  s.pick('Jogar Wuju Apprentice');
  where(s, 'base de A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand - 1, s.log());
  s.e.pl[0].xp = 6;
  s.go();
  hand = s.e.pl[0].hand.length;
  s.pick('Jogar Wuju Apprentice');
  where(s, 'base de A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, s.log());
  assert.equal(s.e.kw(s.e.units().find((u) => u.code === 'UNL-040')!).hunt, 1);
});

test('Allay: num campo, as outras unidades aliadas ali têm Deflect; na base, não', () => {
  const s = new Scenario();
  const a = s.put(0, 'UNL-041', BF0);
  const o = s.put(0, SKULKER, BF0);
  const far = s.put(0, SERGEANT, base(0));
  assert.equal(s.e.kw(a).deflect, 1);
  assert.equal(s.e.kw(o).deflect, 1);
  assert.equal(s.e.kw(far).deflect || 0, 0);
  s.e.moveUnits([a], base(0), 0);
  assert.equal(s.e.kw(o).deflect || 0, 0);
  assert.equal(s.e.kw(far).deflect || 0, 0, 'Allay na base não dá Deflect');
});

test('Back Off: jogado da mão atordoa e compra 1; mesmo com o alvo ilegal ainda compra', () => {
  const s = new Scenario();
  const e = s.put(1, SKULKER, base(1));
  s.runes(0, calm(3));
  s.put(0, 'UNL-042', 'hand');
  oppReaction(s);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Back Off');
  s.maybeObj(e);
  assert.equal(s.d.player, 1);
  s.e.toZone(e, 'trash'); // o alvo sai antes de resolver
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1\n' + s.log());
});

test('Back Off: jogado a partir de Hidden não compra', () => {
  const s = new Scenario();
  const e = s.put(0, SERGEANT, BF0); // A controla o campo A; Back Off escondido só alcança unidades daqui
  const bo = s.put(0, 'UNL-042', 'hand');
  s.runes(0, calm(1));
  s.go();
  s.pick(/Esconder Back Off/);
  if (!s.d.root) s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(bo.zone, 'facedown', s.log());
  endTurn(s);
  endTurn(s);
  const hand = s.e.pl[0].hand.length;
  s.pick(/Jogar Back Off/);
  s.maybeObj(e);
  s.passAll();
  assert.equal(e.stunned, true, s.log());
  assert.equal(s.e.pl[0].hand.length, hand, 'não comprou');
});

test('Enthusiastic Promoter: ao segurar, Buff em todas as unidades aqui', () => {
  const s = new Scenario();
  const p = s.put(0, 'UNL-043', BF0);
  const o = s.put(0, SKULKER, BF0);
  const far = s.put(0, SERGEANT, base(0));
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(p.buffs, 1, s.log());
  assert.equal(o.buffs, 1);
  assert.equal(far.buffs, 0);
  assert.equal(s.e.kw(p).backline, true);
});

test('Flurry of Feathers: modo anular um spell', () => {
  const s = new Scenario();
  const mine = s.put(1, SKULKER, BF0);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.put(1, 'UNL-044', 'hand');
  s.runes(1, calm(6));
  s.go();
  s.pick('Jogar Void Seeker');
  s.maybeObj(mine);
  assert.equal(s.d.player, 1);
  s.pick('Jogar Flurry of Feathers');
  s.pick('Anular um spell');
  s.passAll();
  assert.equal(mine.damage, 0, s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('Void Seeker foi anulado')));
});

test('Flurry of Feathers: modo quatro fichas Bird (base ou campo que você controla)', () => {
  const s = new Scenario();
  s.put(0, SKULKER, BF0); // A controla o campo A
  s.runes(0, calm(6));
  s.put(0, 'UNL-044', 'hand');
  s.go();
  s.pick('Jogar Flurry of Feathers'); // sem spell na pilha: só o modo das fichas (escolha automática)
  s.passAll();
  for (let k = 0; k < 4; k++) {
    if (s.d.prompt.includes('Bird')) s.pick(k < 2 ? 'Campo Vazio A' : 'base de A');
  }
  s.passAll();
  const birds = tokens(s, 'TOK-BIRD', 0);
  assert.equal(birds.length, 4, s.log());
  assert.equal(birds.filter((b) => b.loc?.t === 'bf').length, 2);
});

test('Forgotten Signpost: exaure uma unidade sua e move outra para o local dela', () => {
  const s = new Scenario();
  const sp = s.put(0, 'UNL-045', base(0));
  const at = s.put(0, SKULKER, BF0);
  const mv = s.put(0, SERGEANT, base(0), { ready: false });
  s.go();
  s.pick(/Forgotten Signpost/);
  // alvo: só o Sergeant (o Skulker não pode, pois é a única outra unidade pronta para pagar o custo, 355.16)
  s.maybeObj(mv);
  s.maybeObj(at);
  s.passAll();
  assert.equal(at.exhausted, true, s.log());
  assert.equal(sp.exhausted, true);
  assert.deepEqual(mv.loc, BF0, s.log());
});

test('Forgotten Signpost: sem outra unidade pronta não dá para ativar', () => {
  const s = new Scenario();
  s.put(0, 'UNL-045', base(0));
  s.put(0, SKULKER, BF0);
  s.go();
  assert.ok(!s.d.options.some((o) => /Forgotten Signpost/.test(o.label)), JSON.stringify(s.d.options.map((o) => o.label)));
});

test('Friendship: +1 por tag (Bird, Cat, Dog, Poro) entre as suas unidades', () => {
  const s = new Scenario();
  const u = s.put(0, SKULKER, base(0));
  s.put(0, 'OGN-052', base(0)); // Poro
  s.put(0, 'TOK-BIRD', base(0)); // Bird
  s.put(0, 'UNL-036', base(0)); // Cat
  s.put(0, 'UNL-033', base(0)); // Cat (repetida não conta de novo)
  s.put(1, 'UNL-047', base(1)); // Dog do oponente não conta
  s.runes(0, calm(1));
  s.put(0, 'UNL-046', 'hand');
  s.go();
  s.pick('Jogar Friendship');
  s.pickObj(u);
  s.passAll();
  assert.equal(s.e.might(u), 6, s.log());
});

test('Mosstomper: Hunt 2; com 3 XP tem +1 e Deflect', () => {
  const s = new Scenario();
  const m = s.put(0, 'UNL-047', base(0));
  assert.equal(s.e.kw(m).hunt, 2);
  assert.equal(s.e.might(m), 3);
  assert.equal(s.e.kw(m).deflect || 0, 0);
  s.e.pl[0].xp = 3;
  assert.equal(s.e.might(m), 4);
  assert.equal(s.e.kw(m).deflect, 1);
});

test('Trevor Snoozebottom: ao segurar, joga um Sprite 3 pronto com Temporary aqui', () => {
  const s = new Scenario();
  s.put(0, 'UNL-048', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  const sp = tokens(s, 'TOK-SPRITE', 0);
  assert.equal(sp.length, 1, s.log());
  assert.deepEqual(sp[0].loc, BF0);
  assert.equal(sp[0].exhausted, false);
  assert.equal(s.e.kw(sp[0]).temporary, true);
});

test('Honeyfruit: entra exaurido; [Add][A]; com 6 XP a segunda habilidade adiciona [1][A]', () => {
  const s = new Scenario();
  s.runes(0, calm(2));
  const h = s.put(0, 'UNL-049', 'hand');
  s.go();
  s.pick('Jogar Honeyfruit');
  s.passAll();
  assert.equal(h.zone, 'board');
  assert.equal(h.exhausted, true, 'entra exaurido');
  h.exhausted = false;
  s.go();
  assert.ok(!s.d.options.some((o) => o.label.includes('Level 6')), 'sem 6 XP a segunda habilidade não existe');
  s.e.pl[0].xp = 6;
  s.go();
  s.pick('Level 6');
  assert.equal(s.e.pl[0].pool.energy, 1, s.log());
  assert.equal(Object.values(s.e.pl[0].pool.power).reduce((a, b) => a + b, 0), 1);
});

test('Iascylla: ao segurar, no início da sua fase principal pode mover uma unidade inimiga para este campo', () => {
  const s = new Scenario();
  s.put(0, 'UNL-050', BF0);
  const e = s.put(1, SKULKER, base(1));
  s.go();
  endTurn(s);
  endTurn(s);
  // início da fase principal de A: o gatilho atrasado pergunta
  s.pick('Sim');
  s.maybeObj(e);
  s.passAll();
  // a unidade movida entra no campo (e morre no combate que se abre)
  assert.ok(s.e.log.some((l) => l.text.includes('Shipyard Skulker → Campo Vazio A')), s.log(20));
});

test('Ivern, Nurturer: ao jogar, revela e compra uma Poro e dá Buff a uma unidade aliada (reflexivo)', () => {
  const s = new Scenario();
  const ally = s.put(0, SKULKER, base(0));
  s.runes(0, calm(6));
  s.put(0, 'UNL-051', 'hand');
  s.put(0, 'UNL-031', 'deckTop');
  const poro = s.put(0, 'OGN-052', 'deckTop');
  s.put(0, 'UNL-031', 'deckTop');
  s.go();
  s.pick('Jogar Ivern');
  where(s, 'base de A');
  s.passAll();
  s.pickObj(poro);
  s.passAll();
  s.maybeObj(ally);
  s.passAll();
  assert.equal(poro.zone, 'hand', s.log());
  assert.equal(ally.buffs, 1, s.log());
});

test('Ivern, Nurturer: unidade revelada sem as tags não dá Buff', () => {
  const s = new Scenario();
  const ally = s.put(0, SKULKER, base(0));
  s.runes(0, calm(6));
  s.put(0, 'UNL-051', 'hand');
  const u = s.put(0, SERGEANT, 'deckTop');
  s.go();
  s.pick('Jogar Ivern');
  where(s, 'base de A');
  s.passAll();
  s.pickObj(u);
  s.passAll();
  assert.equal(u.zone, 'hand', s.log());
  assert.equal(ally.buffs, 0);
});

test('Nami, Headstrong: pagando [Calm] a mais, atordoa uma unidade inimiga', () => {
  const s = new Scenario();
  const e = s.put(1, SKULKER, base(1));
  s.runes(0, calm(4));
  s.put(0, 'UNL-052', 'hand');
  s.go();
  s.pick('Jogar Nami');
  where(s, 'base de A');
  s.pick('Sim');
  s.passAll();
  s.maybeObj(e);
  s.passAll();
  assert.equal(e.stunned, true, s.log());
});

test('Nami, Headstrong: ao segurar, a próxima unidade jogada no turno é preparada e recebe Buff (só a próxima)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-052', BF0);
  s.runes(0, calm(8));
  const a = s.put(0, SKULKER, 'hand');
  const b = s.put(0, SERGEANT, 'hand');
  s.go();
  endTurn(s);
  endTurn(s);
  s.pick('Jogar Shipyard Skulker');
  where(s, 'base de A');
  s.passAll();
  assert.equal(a.exhausted, false, s.log());
  assert.equal(a.buffs, 1);
  s.pick('Jogar Vanguard Sergeant');
  where(s, 'base de A');
  s.passAll();
  assert.equal(b.exhausted, true);
  assert.equal(b.buffs, 0);
});

test('Scuttle Crab: compra ao jogar', () => {
  const s = new Scenario();
  s.runes(0, calm(2));
  s.put(0, 'UNL-053', 'hand');
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Scuttle Crab');
  where(s, 'base de A');
  s.passAll();
  assert.equal(s.e.pl[0].hand.length, hand, 'jogou 1 e comprou 1\n' + s.log());
});

test('Scuttle Crab: Deathknell revela a mão do oponente, mostra as viradas dele e dá 1 XP', () => {
  const s = new Scenario();
  const crab = s.put(0, 'UNL-053', base(0));
  s.put(1, SERGEANT, 'hand');
  s.put(1, DRAKE, BF0);
  s.go();
  moveTo(s, [crab.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(crab.zone, 'trash', s.log());
  assert.equal(s.e.pl[0].xp, 1, s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('revela a mão') && l.text.includes('Vanguard Sergeant')), s.log());
  assert.ok(s.e.playerFlag(0, 'seeFacedown'));
});

test('Scuttle Crab: carta escondida pelo oponente depois do Deathknell, no mesmo turno, é mostrada', () => {
  const s = new Scenario();
  const crab = s.put(1, 'UNL-053', BF0);
  s.put(0, 'OGN-052', BF1); // A controla o campo B
  s.put(0, 'UNL-042', 'hand');
  s.runes(0, calm(1));
  const atk = s.put(0, DRAKE, base(0));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(crab.zone, 'trash', s.log());
  assert.equal(s.e.pl[1].xp, 1);
  s.pick(/Esconder Back Off/);
  if (!s.d.root) s.pick('Campo Vazio B');
  s.passAll();
  assert.ok(s.e.log.some((l) => l.text.includes('B olha a carta escondida: Back Off')), s.log());
});

test('Tricksy Tentacles: move unidades inimigas com Might total até 8 para um só local', () => {
  const s = new Scenario();
  const a = s.put(1, SKULKER, base(1)); // 3
  const b = s.put(1, PHANTOM, base(1)); // 5
  const c = s.put(1, SERGEANT, base(1)); // 4
  s.runes(0, calm(5));
  s.put(0, 'UNL-054', 'hand');
  s.go();
  s.pick('Jogar Tricksy Tentacles');
  s.pickObj(a);
  s.pickObj(b);
  // 3 + 5 = 8: o Sergeant (4) não pode mais ser escolhido
  // (a pergunta de mais uma unidade nem aparece: não sobrou candidata)
  assert.ok(!s.d.options.some((o) => o.obj === c.id), 'passaria de 8');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.deepEqual(a.loc, BF0, s.log());
  assert.deepEqual(b.loc, BF0);
  assert.deepEqual(c.loc, base(1));
});

test('Tricksy Tentacles: se o grupo passa de 8 antes de resolver, o jogador escolhe um subconjunto (355.11.b)', () => {
  const s = new Scenario();
  const a = s.put(1, SKULKER, base(1)); // 3
  const b = s.put(1, PHANTOM, base(1)); // 5
  s.runes(0, calm(5));
  s.put(0, 'UNL-054', 'hand');
  oppReaction(s);
  s.go();
  s.pick('Jogar Tricksy Tentacles');
  s.pickObj(a);
  s.pickObj(b);
  s.pick('Campo Vazio A');
  // B reage com Combat Experience no Skulker: 4 + 5 = 9
  s.pick('Jogar Combat Experience', 1);
  s.pickObj(a);
  s.passAll();
  s.pickObj(b); // fica o Phantom (5); o Skulker (4) já não cabe
  s.passAll();
  assert.deepEqual(b.loc, BF0, s.log());
  assert.deepEqual(a.loc, base(1));
});

test('Vex, Mocking: quando você atordoa uma unidade inimiga num campo, pode mover-se para lá', () => {
  const s = new Scenario();
  const vex = s.put(0, 'UNL-055', base(0));
  const e = s.put(1, SKULKER, BF1);
  s.runes(0, calm(3));
  s.put(0, 'UNL-042', 'hand');
  s.go();
  s.pick('Jogar Back Off');
  s.maybeObj(e);
  s.passAll();
  s.pick('Sim');
  s.passAll();
  assert.deepEqual(vex.loc, BF1, s.log());
  assert.equal(s.e.kw(vex).tank, true);
  assert.equal(s.e.kw(vex).shield, 1);
});

test('Yuumi: ao atacar, outra unidade sua aqui ganha +3 e Tank neste turno', () => {
  const s = new Scenario();
  const y = s.put(0, 'UNL-056', base(0));
  const o = s.put(0, SKULKER, base(0));
  s.put(1, DRAKE, BF0);
  s.go();
  moveTo(s, [y.id, o.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !s.d.root; i++) {
    if (s.d.options.some((x) => x.obj === o.id)) s.pickObj(o);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Distribuir')) s.ok([s.d.options[0].id]);
    else break;
  }
  assert.ok(s.e.log.some((l) => l.text.includes('Shipyard Skulker recebe +3')), s.log(30));
});

test('Alpha Wildclaw: suas unidades aqui com menos Might não podem ser escolhidas por spells inimigos', () => {
  const s = new Scenario();
  s.put(1, 'UNL-057', BF0);
  const small = s.put(1, SKULKER, BF0);
  const big = s.put(1, MECH, BF0); // 8 > 7
  const away = s.put(1, SERGEANT, BF1);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Void Seeker');
  const ids = s.d.options.map((o) => o.obj);
  assert.ok(!ids.includes(small.id), 'menor que o Wildclaw, aqui: protegida');
  assert.ok(ids.includes(big.id), 'maior: pode');
  assert.ok(ids.includes(away.id), 'em outro local: pode');
});

test('Lillia: ao jogar uma ficha de unidade ganha +1 neste turno; suas fichas têm Tank', () => {
  const s = new Scenario();
  const l = s.put(0, 'UNL-058', base(0));
  s.runes(0, calm(4));
  s.put(0, 'UNL-033', 'hand'); // Frisky Hunter: joga uma ficha Bird
  s.go();
  s.pick('Jogar Frisky Hunter');
  where(s, 'base de A');
  s.passAll();
  const bird = tokens(s, 'TOK-BIRD', 0)[0];
  assert.ok(bird, s.log());
  assert.equal(s.e.kw(bird).tank, true);
  assert.equal(s.e.might(l), 5, s.log());
});

test('Master Yi, Unstoppable: descontos por Level (só o maior vale); Level 16 o protege de spells inimigos', () => {
  const s = new Scenario();
  const yi = s.put(0, 'UNL-059', 'hand');
  const cost = () => s.e.minCostFor(0, yi, 'hand');
  assert.equal(cost().energy, 12);
  assert.equal(cost().power.length, 3);
  s.e.pl[0].xp = 3;
  assert.equal(cost().energy, 10);
  assert.equal(cost().power.length, 2);
  s.e.pl[0].xp = 6;
  assert.equal(cost().energy, 8);
  assert.equal(cost().power.length, 1);
  s.e.pl[0].xp = 11;
  assert.equal(cost().energy, 6);
  assert.equal(cost().power.length, 0);
  // Level 16
  const s2 = new Scenario();
  const y2 = s2.put(1, 'UNL-059', BF0);
  s2.put(0, 'OGN-024', 'hand');
  s2.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury]);
  s2.e.pl[1].xp = 16;
  s2.go();
  assert.ok(!s2.d.options.some((o) => o.label.includes('Void Seeker')), 'sem alvo válido');
  s2.e.pl[1].xp = 15;
  s2.go();
  s2.pick('Jogar Void Seeker');
  s2.maybeObj(y2);
  s2.passAll();
  assert.equal(y2.damage, 4, 'com 15 XP pode ser escolhido\n' + s2.log());
});

test('Vilemaw: inimigas aqui com menos Might não causam dano de combate; hold compra 1', () => {
  const s = new Scenario();
  const v = s.put(1, 'UNL-060', BF0);
  const a = s.put(0, PHANTOM, base(0)); // 5 < 8
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(v.damage, 0);
  assert.equal(v.zone, 'board', s.log());
  assert.equal(a.zone, 'trash', s.log());
  assert.equal(s.e.kw(v).ambush, true);
});

test('Vilemaw: atacante com Might igual causa dano (RiftJudge #10741)', () => {
  const s = new Scenario();
  const v = s.put(1, 'UNL-060', BF0);
  const a = s.put(0, MECH, base(0)); // 8 = 8
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(v.zone, 'trash', s.log());
});

test('Mutated Mouser: Shield 2 e Tank', () => {
  const s = new Scenario();
  const m = s.put(0, 'UNL-036', base(0));
  assert.equal(s.e.kw(m).shield, 2);
  assert.equal(s.e.kw(m).tank, true);
});


