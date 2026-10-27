// Testes do lote "legends" do Unleashed (UNL-181..219): lendas, signatures e campos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';
import { checkDeck } from '../src/engine/deckcheck';

test('Regras de deck (103.2.d): Signature do Unleashed só com a tag da lenda, no máximo 3 no total', () => {
  const deck = (sig: [string, number][]) => ({
    name: 't',
    legend: 'UNL-193', // Vex, Gloomist (Calm/Chaos)
    champion: 'UNL-055', // Vex, Mocking
    main: [...sig, ['OGN-052', 3], ['OGN-065', 3]] as [string, number][],
    runes: [['OGN-042', 6], ['OGN-166', 6]] as [string, number][],
    battlefields: ['UNL-205', 'UNL-206', 'UNL-207'],
  });
  const sigErr = (errs: string[]) => errs.filter((e) => /Signature/.test(e));
  assert.deepEqual(sigErr(checkDeck(deck([['UNL-194', 3]])).errors), [], 'Shadow tem a tag Vex');
  assert.ok(sigErr(checkDeck(deck([['UNL-198', 1]])).errors).some((e) => e.includes('outro campeão')), 'Moonfall é da Diana');
  assert.ok(sigErr(checkDeck(deck([['UNL-194', 3], ['UNL-194', 1]])).errors).some((e) => e.includes('máximo 3')), '4 Signatures');
  assert.ok(checkDeck({ ...deck([['UNL-194', 3]]), legend: 'UNL-197' }).errors.some((e) => /tag da lenda|outro campeão/.test(e)), 'com a Diana, Shadow/Vex não valem');
});

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';
const ORDER = 'OGN-214';

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
function endTurn(s: Scenario, other?: (d: Decision) => string[] | undefined) {
  s.pick('Encerrar o turno');
  run(s, other);
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);
const no = (d: Decision) => (d.kind === 'confirm' ? ['no'] : undefined);
function moveTo(s: Scenario, units: Obj[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(units.map((u) => u.id));
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Passa a prioridade até o jogador p poder responder e joga a carta. */
function react(s: Scenario, p: P, label: string) {
  for (let i = 0; i < 4 && s.d.player !== p && s.d.kind === 'priority'; i++) s.pick('Passar');
  s.pick(label, p);
}
const opt = (s: Scenario, text: string) => s.d.options.some((o) => o.label.includes(text));

// ───────────── lendas ─────────────

test('Jhin, Virtuoso: spell com [4]+ gasto pode ser banido; o 4º banido devolve todos, canaliza 4 e compra 1', () => {
  const s = new Scenario();
  const jhin = legend(s, 0, 'UNL-181');
  runes(s, 0, MIND, 7);
  const pd = s.put(0, 'OGN-114', 'hand'); // Progress Day: 6 + [Mind], compra 4
  const old = [1, 2, 3].map(() => s.put(0, 'OGN-114', 'trash'));
  for (const o of old) s.e.banishObj(o);
  jhin.data = { jhinBanished: old.map((o) => ({ id: o.id, v: o.zoneVersion })) };
  s.go();
  const runes0 = s.e.runesOf(0).length;
  s.pick('Jogar Progress Day');
  run(s, yes);
  assert.equal(pd.zone, 'trash', s.log(20));
  for (const o of old) assert.equal(o.zone, 'trash');
  assert.equal(s.e.runesOf(0).length, runes0 - 1 + 4, 'recicla 1 runa pagando o power, canaliza 4');
  assert.equal(jhin.data!.jhinBanished.length, 0);
});

test('Jhin, Virtuoso: spell barato não dispara; recusar o "você pode" deixa o spell no descarte', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-181');
  runes(s, 0, MIND, 7);
  s.put(0, 'OGN-169', 'hand'); // Gust: 1
  const pd = s.put(0, 'OGN-114', 'hand');
  const foe = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Gust');
  s.maybeObj(foe);
  run(s);
  assert.ok(!s.e.log.some((l) => l.text.includes('Banir o spell')));
  s.pick('Jogar Progress Day');
  run(s, no);
  assert.equal(pd.zone, 'trash');
});

test('Curtain Call: três Repeats, cada execução escolhe um modo ainda não escolhido', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 7);
  const cc = s.put(0, 'UNL-182', 'hand');
  const a = s.put(1, 'OGN-065', BF0); // 4
  const b = s.put(1, 'OGN-065', base(1)); // 4
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Jogar Curtain Call');
  const seen: string[][] = [];
  run(s, (d) => {
    if (d.prompt.includes('escolha um modo')) {
      seen.push(d.options.map((o) => o.id));
      const order = ['dmg2', 'dmg3', 'minus4', 'draw'];
      return [order.find((m) => d.options.some((o) => o.id === m))!];
    }
    if (d.prompt.startsWith('Pagar Repeat')) return ['yes'];
    if (d.prompt.includes('2 de dano')) return [a.id];
    if (d.prompt.includes('3 de dano')) return [b.id];
    if (d.prompt.includes('-4 de Might')) return [a.id];
    return undefined;
  });
  // a 4ª execução só tem o modo que sobrou (comprar 1): escolhido sem perguntar
  assert.equal(seen.length, 3, s.log(30));
  assert.equal(seen[2].length, 2);
  assert.equal(b.damage, 3);
  assert.equal(a.zone, 'trash', '2 de dano e -4 de Might');
  assert.equal(s.e.pl[0].hand.length, hand - 1 + 1);
  assert.equal(cc.data!.spentE, 4 + 1 + 1, 'Repeat [1] e [1][A] contam como gasto');
});

test('Rengar, Pridestalker: jogar uma unidade (ou ficha) dá +1 a uma unidade escolhida', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-183');
  runes(s, 0, RUNE.calm, 2);
  const u = s.put(0, 'OGN-065', base(0));
  s.put(0, 'OGN-052', 'hand');
  s.go();
  s.pick('Jogar Stalwart Poro');
  run(s, (d) => (d.prompt.startsWith('Jogar Stalwart') ? [d.options[0].id] : d.prompt.startsWith('Rengar') ? [u.id] : undefined));
  assert.equal(s.e.might(u), 5, s.log());
});

test('Thrill of the Hunt: bane a aliada e o dono a joga exausta num campo à escolha, ignorando o custo', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 3);
  s.put(0, 'UNL-184', 'hand');
  const u = s.put(0, 'OGN-142', base(0)); // 9 de energia
  s.put(1, 'OGN-052', BF1);
  s.go();
  s.pick('Jogar Thrill of the Hunt');
  s.maybeObj(u);
  run(s, (d) => (d.prompt.startsWith('Thrill of the Hunt: jogar') ? [d.options.find((o) => o.label === 'Campo Vazio B')!.id] : undefined));
  assert.equal(u.zone, 'board', s.log(20));
  assert.equal(s.e.bfIndex(u), 1);
  assert.equal(u.exhausted, true, 'entra exausta (RiftJudge #10792)');
});

test('Pyke, Bloodharbor Ripper: devolve a aliada do campo e joga Gold exaurido', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-185');
  runes(s, 0, RUNE.fury, 1);
  const u = s.put(0, 'OGN-065', BF0);
  s.go();
  s.pick('[1], exaurir: devolver');
  s.maybeObj(u);
  run(s);
  assert.equal(u.zone, 'hand');
  const gold = s.e.gearOf(0).find((g) => g.code === 'TOK-GOLD');
  assert.ok(gold && gold.exhausted, s.log());
});

test('Death from Below: matou unidade de 3 ou menos → pode jogar de novo do descarte por [A]', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 6);
  s.put(0, 'UNL-186', 'hand');
  const a = s.put(1, 'OGN-052', BF0); // 2
  const b = s.put(1, 'OGN-065', BF1); // 4
  s.go();
  s.pick('Jogar Death from Below');
  s.pickObj(a);
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (d.prompt.startsWith('Death from Below: matar')) return [b.id];
    return undefined;
  });
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash', s.log(25));
  // b tinha 4: não há terceira jogada
  assert.ok(!s.e.log.slice(-6).some((l) => l.text.includes('jogar Death from Below do descarte')));
});

test('Death from Below: alvo saiu antes de resolver (Gust) → sem a jogada do descarte', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 6);
  runes(s, 1, RUNE.chaos, 1);
  s.put(0, 'UNL-186', 'hand');
  s.put(1, 'OGN-169', 'hand');
  const a = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Death from Below');
  s.maybeObj(a);
  react(s, 1, 'Jogar Gust');
  s.maybeObj(a);
  run(s, yes);
  assert.equal(a.zone, 'hand');
  assert.ok(!s.e.log.some((l) => l.text.includes('Na pilha: Death from Below: jogar')), s.log(20));
});

test('Vi, Piltover Enforcer + Hextech Gauntlets: excesso de 3+ ao conquistar prepara uma unidade e compra 1', () => {
  const s = new Scenario();
  const vi = legend(s, 0, 'UNL-187');
  runes(s, 0, RUNE.fury, 1);
  const u = s.put(0, 'OGN-065', base(0)); // 4
  const gl = s.put(0, 'UNL-188', base(0));
  s.put(1, 'OGN-052', BF0); // 2 (Shield: 3 defendendo)
  const other = s.put(0, 'OGN-052', base(0), { ready: false });
  s.go();
  // Equip [3][A] reduzido pelo Might 4 → só [A]
  assert.deepEqual(s.e.equipCostFor(gl, u), { energy: 0, power: [['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order']] });
  s.e.attach(gl, u);
  assert.equal(s.e.might(u), 7);
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [u], 'Campo Vazio A');
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (d.prompt.startsWith('Vi, Piltover Enforcer: preparar')) return [other.id];
    return undefined;
  });
  assert.equal(vi.exhausted, true, s.log(25));
  assert.equal(other.exhausted, false);
  assert.equal(s.e.pl[0].hand.length, hand + 1, 'Gauntlets: compra 1');
});

test('Hextech Gauntlets: unidade de Might 1 paga [2][A]; Might negativo não aumenta', () => {
  const s = new Scenario();
  const gl = s.put(0, 'UNL-188', base(0));
  const r = s.e.createToken('TOK-RECRUIT', 0, base(0));
  assert.equal(s.e.equipCostFor(gl, r).energy, 2);
  s.e.giveMight(r, -5);
  assert.equal(s.e.equipCostFor(gl, r).energy, 3);
});

test('Lillia, Bashful Bloom: custa [1] a menos por unidade aliada com Temporary; Sprite entra pronta', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-189');
  runes(s, 0, RUNE.calm, 3);
  s.e.createToken('TOK-SPRITE', 0, base(0));
  s.go();
  s.pick('Exaurir: jogar uma ficha Sprite');
  run(s, (d) => (d.prompt.startsWith('Lillia: onde') ? [d.options[0].id] : undefined));
  const sprites = s.e.units().filter((u) => u.code === 'TOK-SPRITE');
  assert.equal(sprites.length, 2);
  assert.ok(sprites.some((x) => !x.exhausted));
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 0, 'pagou 3');
});

test('Lilting Lullaby: anula e o controlador não pode jogar spells no resto do turno', () => {
  const s = new Scenario();
  runes(s, 0, MIND, 3);
  runes(s, 1, RUNE.calm, 4);
  const pd = s.put(0, 'OGN-169', 'hand');
  s.put(0, 'OGN-169', 'hand');
  s.put(1, 'UNL-190', 'hand');
  const foe = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Gust');
  s.maybeObj(foe);
  react(s, 1, 'Jogar Lilting Lullaby');
  s.maybeObj(pd);
  run(s);
  assert.equal(foe.zone, 'board', 'Gust anulado');
  assert.ok(!opt(s, 'Jogar Gust'), 'não pode jogar spells');
});

test('Master Yi, Wuju Master: Level 6 dá +1 às suas unidades; Level 11 faz entrarem prontas', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-191');
  const u = s.put(0, 'OGN-065', base(0));
  const f = s.put(1, 'OGN-065', base(1));
  assert.equal(s.e.might(u), 4);
  s.e.gainXp(0, 6);
  assert.equal(s.e.might(u), 5);
  assert.equal(s.e.might(f), 4);
  assert.equal(s.e.createToken('TOK-RECRUIT', 0, base(0)).exhausted, true);
  s.e.gainXp(0, 5);
  assert.equal(s.e.createToken('TOK-RECRUIT', 0, base(0)).exhausted, false);
});

test('Alpha Strike: a aliada divide dano igual ao Might; cada inimiga morta dá 1 XP', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 4);
  s.put(0, 'UNL-192', 'hand');
  const yi = s.put(0, 'OGN-065', base(0)); // 4
  const a = s.put(1, 'OGN-052', BF0); // 2
  const b = s.put(1, 'OGN-052', BF1); // 2
  const c = s.put(1, 'OGN-065', BF1); // 4
  s.go();
  s.pick('Jogar Alpha Strike');
  s.maybeObj(yi);
  const d = s.d;
  assert.equal(d.max, 3, 'até 3 alvos (o Might 4 permitiria 4, mas só há 3 inimigas)');
  s.ok([a.id, b.id]);
  run(s, (dd) => (dd.prompt.includes('quanto dano') ? ['2'] : undefined));
  assert.equal(a.zone, 'trash', s.log(20));
  assert.equal(b.zone, 'trash');
  assert.equal(c.damage, 0);
  assert.equal(s.e.xp(0), 2);
});

test('Vex, Gloomist: no hold, pode exaurir para comprar 1', () => {
  const s = new Scenario();
  const vex = legend(s, 0, 'UNL-193');
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  endTurn(s);
  endTurn(s, yes);
  assert.equal(vex.exhausted, true, 'exaurida pelo custo depois do despertar');
  assert.ok(s.e.log.some((l) => l.text.startsWith('Resolve: Vex, Gloomist: Comprar 1')), s.log(30));
});

test('Shadow: entra pronta só num campo; atordoa unidade inimiga atacando aqui', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 6);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-052', BF0);
  const sh = s.put(0, 'UNL-194', 'hand');
  s.go();
  s.pick('Jogar Shadow');
  s.pick('Campo Vazio A');
  run(s);
  assert.equal(sh.zone, 'board');
  assert.equal(sh.exhausted, false);
  // habilidade: o alvo tem de estar atacando no campo da Shadow
  const ab = s.e.script(sh).activated![0];
  const atk = s.put(1, 'OGN-065', BF0);
  const c = s.e.ctx(sh, 0);
  assert.equal(s.e.hasLegalTargets(ab, c), false, 'sem atacante');
  atk.role = 'attacker';
  assert.equal(s.e.hasLegalTargets(ab, c), true);
});

test('Ivern, Green Father: conquistar troca o campo por Brush (+1 a Poro); pontuar no Brush pode trocar de volta', () => {
  const s = new Scenario();
  const iv = legend(s, 0, 'UNL-195');
  const orig = s.e.bfObj(0);
  const poro = s.put(0, 'OGN-052', base(0));
  s.go();
  moveTo(s, [poro], 'Campo Vazio A');
  run(s, yes);
  assert.equal(iv.exhausted, true);
  assert.equal(s.e.name(s.e.bfObj(0)), 'Brush', s.log(20));
  assert.equal(orig.code, 'TOK-BRUSH', 'mesmo objeto (438.1.a)');
  assert.equal(s.e.might(poro), 3);
  endTurn(s);
  // hold no Brush: o Ivern (de novo pronto) dispara outra vez; recusa, e troca de volta pelo Brush
  endTurn(s, (d) => (d.kind === 'confirm' ? [d.prompt.startsWith('Brush') ? 'yes' : 'no'] : undefined));
  assert.equal(s.e.name(s.e.bfObj(0)), 'Campo Vazio A', s.log(30));
});

test('Daisy!: custa [1] a menos por tag Bird/Cat/Dog/Poro; ataca com as 4 tags e atordoa', () => {
  const s = new Scenario();
  const daisy = s.put(0, 'UNL-196', 'hand');
  s.put(0, 'OGN-052', base(0)); // Poro
  s.put(0, 'OGN-013', base(0)); // outro Poro
  s.put(0, 'OGN-135', base(0)); // Cat
  assert.equal(s.e.minCostFor(0, daisy, 'hand').energy, 7);
  s.put(0, 'OGN-216', base(0)); // Bird
  s.put(0, 'SFD-006', base(0)); // Dog
  assert.equal(s.e.minCostFor(0, daisy, 'hand').energy, 5);
  s.e.putOnBoard(daisy, base(0), true);
  const foe = s.put(1, 'OGN-052', BF0);
  s.go();
  moveTo(s, [daisy], 'Campo Vazio A');
  run(s, (d) => (d.prompt.startsWith('Daisy!') ? [foe.id] : undefined));
  assert.ok(s.e.log.some((l) => l.text.includes('Stalwart Poro fica atordoada')), s.log(20));
});

test('Diana, Scorn of the Moon: a energia só paga durante showdowns', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-197');
  s.go();
  s.pick('Exaurir: adicionar 1 de energia');
  assert.equal(s.e.pl[0].pool.energy, 1);
  assert.equal(s.e.canPay(0, { energy: 1, power: [] }), false, 'fora de showdown não paga');
  s.e.showdown = { bf: 0, combat: false, focus: 0, passes: 0, flipAfterChain: false, excess: [0, 0] };
  assert.equal(s.e.canPay(0, { energy: 1, power: [] }), true);
  s.e.showdown = null;
});

test('Moonfall: move a inimiga para o campo escolhido e dá -2 às inimigas de lá', () => {
  const s = new Scenario();
  runes(s, 0, MIND, 4);
  s.put(0, 'UNL-198', 'hand');
  s.put(0, 'OGN-142', BF0);
  s.e.bfs[0].controller = 0;
  const a = s.put(1, 'OGN-065', BF1);
  const b = s.put(1, 'OGN-065', base(1));
  s.go();
  s.pick('Jogar Moonfall');
  s.pickObj(a);
  run(s, yes);
  // movida para o campo com o Drake: -2 e depois o combate (B disputou o campo, B ataca)
  assert.equal(s.e.log.filter((l) => l.text === 'Wizened Elder recebe -2 de Might neste turno.').length, 1, s.log());
  assert.ok(s.e.log.some((l) => l.text.includes('Dano de combate: B 2 × 10 A')));
  assert.equal(a.zone, 'trash');
  assert.equal(s.e.might(b), 4);
});

test('LeBlanc, Deceiver: ao conquistar, descarta 1 e joga Reflection que vira cópia de outra unidade lá com Temporary', () => {
  const s = new Scenario();
  const lb = legend(s, 0, 'UNL-199');
  s.put(0, 'OGN-169', 'hand');
  const u = s.put(0, 'OGN-065', base(0));
  s.go();
  moveTo(s, [u], 'Campo Vazio A');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.prompt.startsWith('LeBlanc, Deceiver: a Reflection') ? [u.id] : undefined));
  assert.equal(lb.exhausted, true);
  const r = s.e.units().find((x) => x.token && x.printed === 'TOK-REFLECTION');
  assert.ok(r, s.log(25));
  assert.equal(s.e.name(r!), 'Wizened Elder');
  assert.equal(s.e.might(r!), 4);
  assert.equal(r!.exhausted, false);
  assert.equal(s.e.kw(r!).temporary, true);
  assert.equal(s.e.bfIndex(r!), 0);
});

test('Mirror Image: alvo removido antes de resolver → Reflection 0 com Temporary (RiftJudge #10872)', () => {
  const s = new Scenario();
  runes(s, 0, ORDER, 5);
  runes(s, 1, RUNE.chaos, 1);
  s.put(0, 'UNL-200', 'hand');
  s.put(1, 'OGN-169', 'hand');
  const foe = s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Mirror Image');
  s.maybeObj(foe);
  react(s, 1, 'Jogar Gust');
  s.maybeObj(foe);
  run(s);
  const r = s.e.units().find((x) => x.code === 'TOK-REFLECTION');
  assert.ok(r, s.log(20));
  assert.equal(s.e.might(r!), 0);
  assert.equal(s.e.kw(r!).temporary, true);
});

test('Mirror Image: copia a unidade (Might impresso, sem buffs)', () => {
  const s = new Scenario();
  runes(s, 0, ORDER, 5);
  s.put(0, 'UNL-200', 'hand');
  const foe = s.put(1, 'OGN-142', BF0);
  foe.buffs = 1;
  s.go();
  s.pick('Jogar Mirror Image');
  s.maybeObj(foe);
  run(s);
  const r = s.e.units().find((x) => x.printed === 'TOK-REFLECTION')!;
  assert.equal(s.e.might(r), 10, s.log());
  assert.equal(r.controller, 0);
  assert.equal(s.e.locOf(r)!.t, 'base');
});

test("Kha'Zix, Voidreaver: vencer combate dá XP; gastar XP para buffar e para mover exaurida à base", () => {
  const s = new Scenario();
  const kz = legend(s, 0, 'UNL-201');
  const u = s.put(0, 'OGN-065', base(0));
  s.put(1, 'OGN-052', BF0);
  s.go();
  assert.ok(!opt(s, 'Gastar 1 XP'), 'sem XP');
  moveTo(s, [u], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.xp(0), 1, s.log(20));
  s.pick('Gastar 1 XP, exaurir');
  s.maybeObj(u);
  run(s);
  assert.equal(u.buffs, 1);
  assert.equal(s.e.xp(0), 0);
  kz.exhausted = false;
  s.e.gainXp(0, 2);
  s.go();
  s.pick('Gastar 2 XP, exaurir');
  s.maybeObj(u);
  run(s);
  assert.equal(s.e.locOf(u)!.t, 'base');
});

test('Void Assault: move a aliada e depois a inimiga para o mesmo campo; quem chegou primeiro ataca', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.chaos, 3);
  s.put(0, 'UNL-202', 'hand');
  const u = s.put(0, 'OGN-142', base(0));
  const f = s.put(1, 'OGN-052', base(1));
  s.go();
  s.pick('Jogar Void Assault');
  s.maybeObj(u);
  s.maybeObj(f);
  run(s, (d) => (d.prompt.startsWith('Void Assault: mover') ? [d.options.find((o) => o.label === 'Campo Vazio A')!.id] : undefined));
  assert.equal(f.zone, 'trash', s.log(25));
  assert.equal(s.e.bfs[0].controller, 0);
});

test('Poppy, Keeper of the Hammer: hold dá 1 XP; 3 XP + exaurir compra 1', () => {
  const s = new Scenario();
  legend(s, 0, 'UNL-203');
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.e.gainXp(0, 2);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.xp(0), 3, s.log(20));
  const hand = s.e.pl[0].hand.length;
  s.pick('Gastar 3 XP, exaurir: comprar 1');
  run(s);
  assert.equal(s.e.pl[0].hand.length, hand + 1);
  assert.equal(s.e.xp(0), 0);
});

test("Keeper's Verdict: o dono escolhe topo ou fundo; ficha deixa de existir", () => {
  const s = new Scenario();
  runes(s, 0, ORDER, 4);
  s.put(0, 'UNL-204', 'hand');
  const foe = s.put(1, 'OGN-142', BF0);
  s.go();
  s.pick("Jogar Keeper's Verdict");
  s.maybeObj(foe);
  run(s, (d) => (d.prompt.startsWith("Keeper's Verdict: pôr") ? (assert.equal(d.player, 1), ['bottom']) : undefined));
  assert.equal(foe.zone, 'mainDeck');
  assert.equal(s.e.pl[1].mainDeck[s.e.pl[1].mainDeck.length - 1], foe.id);
});

// ───────────── campos ─────────────

test('Abandoned Hall: quem joga o spell controla o gatilho (mesmo fora do turno) e escolhe a unidade dele aqui', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-205');
  runes(s, 0, MIND, 1);
  runes(s, 1, RUNE.calm, 1);
  const a = s.put(1, 'OGN-065', BF0); // 4
  s.e.bfs[0].controller = 1;
  s.put(0, 'OGN-095', 'hand'); // Stupefy: -1
  s.put(1, 'OGN-046', 'hand'); // En Garde: +1 a uma aliada
  s.go();
  s.pick('Jogar Stupefy');
  s.maybeObj(a);
  react(s, 1, 'Jogar En Garde');
  s.maybeObj(a);
  let asked: P | undefined;
  run(s, (d) => {
    if (d.kind === 'confirm' && d.prompt.includes('Abandoned Hall')) {
      asked = d.player;
      return ['yes'];
    }
    return undefined;
  });
  assert.equal(asked, 1, s.log(20));
  // 4 + 2 (En Garde, sozinha) + 1 (Abandoned Hall) - 1 (Stupefy; o jogador 0 não tem unidade aqui: sem gatilho)
  assert.equal(s.e.might(a), 6);
  assert.equal(s.e.log.filter((l) => l.text.startsWith('Na pilha: Abandoned Hall')).length, 1);
});

test('Altar of Blood: no combate, o controlador da unidade pode pagar [A][A][A] para salvá-la (exausta, na base)', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-206');
  runes(s, 0, RUNE.fury, 3);
  const u = s.put(0, 'OGN-065', base(0)); // 4
  s.put(1, 'OGN-142', BF0); // 10
  s.go();
  moveTo(s, [u], 'Altar of Blood');
  run(s, (d) => (d.kind === 'confirm' && d.player === 0 ? ['yes'] : undefined));
  assert.equal(u.zone, 'board', s.log(20));
  assert.equal(s.e.locOf(u)!.t, 'base');
  assert.equal(u.exhausted, true);
  assert.equal(u.damage, 0);
});

test('Black Flame Altar e Forbidding Waste: Shield para Temporary aqui; -2 para quem defende sozinha', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-208');
  setBf(s, 1, 'UNL-210');
  const sp = s.e.createToken('TOK-SPRITE', 0, BF0);
  assert.equal(s.e.kw(sp).shield, 1);
  const r = s.e.createToken('TOK-RECRUIT', 0, BF0);
  assert.equal(s.e.kw(r).shield, undefined);
  const d = s.put(1, 'OGN-065', BF1);
  d.role = 'defender';
  assert.equal(s.e.might(d), 2);
  s.put(1, 'OGN-052', BF1);
  assert.equal(s.e.might(d), 4, 'não está sozinha');
});

test('Dusk Rose Lab: no início da sua fase, pode matar uma unidade sua aqui para comprar 1', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-209');
  const u = s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  endTurn(s);
  endTurn(s, yes);
  assert.equal(u.zone, 'trash', s.log(25));
  assert.ok(s.e.log.some((l) => l.text.startsWith('Resolve: Dusk Rose Lab')));
});

test('Frozen Fortress: 1 de dano a cada unidade aqui no início da fase de cada jogador', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-212');
  const r = s.put(1, 'TOK-RECRUIT', BF0);
  r.token = true;
  s.e.bfs[0].controller = 1;
  s.go();
  endTurn(s);
  assert.equal(r.zone, 'gone', s.log(20));
});

test('Gardens of Becoming: unidades aqui têm "[Tap]: ganhe 1 XP"', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-213');
  const u = s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.go();
  s.pick('Exaurir: ganhar 1 XP');
  run(s);
  assert.equal(s.e.xp(0), 1);
  assert.equal(u.exhausted, true);
});

test("Ripper's Bay: o dono da unidade devolvida paga [1] para canalizar 1 runa exaurida", () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-214');
  runes(s, 0, RUNE.chaos, 1);
  runes(s, 1, RUNE.calm, 1);
  s.put(0, 'OGN-169', 'hand');
  const foe = s.put(1, 'OGN-052', BF0);
  s.go();
  const r1 = s.e.runesOf(1).length;
  s.pick('Jogar Gust');
  s.maybeObj(foe);
  run(s, (d) => (d.kind === 'confirm' ? (assert.equal(d.player, 1), ['yes']) : undefined));
  assert.equal(foe.zone, 'hand');
  assert.equal(s.e.runesOf(1).length, r1 + 1, s.log(20));
});

test('Star Spring: a primeira unidade não-ficha jogada aqui por jogador no turno move outra dele para a base', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-215');
  runes(s, 0, RUNE.calm, 4);
  const old = s.put(0, 'OGN-065', BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-052', 'hand');
  s.put(0, 'OGN-013', 'hand');
  s.go();
  s.pick('Jogar Stalwart Poro');
  s.pick('Star Spring');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.prompt.startsWith('Star Spring: mover') ? [old.id] : undefined));
  assert.equal(s.e.locOf(old)!.t, 'base', s.log(20));
  s.pick('Jogar Pouty Poro');
  s.pick('Star Spring');
  run(s, yes);
  assert.equal(s.e.log.filter((l) => l.text.startsWith('Na pilha: Star Spring')).length, 1, 'só a primeira vez');
});

test('The Academy e Vaults of Helia: hold dá Repeat ao próximo spell / unidades não-ficha custam [1] a mais', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-216');
  setBf(s, 1, 'UNL-219');
  s.put(0, 'OGN-052', BF0);
  s.put(0, 'OGN-052', BF1);
  s.e.bfs[0].controller = 0;
  s.e.bfs[1].controller = 0;
  s.go();
  endTurn(s);
  endTurn(s);
  const gust = s.put(0, 'OGN-169', 'hand');
  assert.equal(s.e.repeatCostsFor(0, gust).length, 1, s.log(20));
  const poro = s.put(0, 'OGN-052', 'hand');
  assert.equal(s.e.minCostFor(0, poro, 'hand').energy, 3);
});

test('Trapping Grounds: conquista com 3+ de excesso joga um Bird com Deflect', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-217');
  const u = s.put(0, 'OGN-142', base(0));
  s.put(1, 'OGN-052', BF0);
  s.go();
  moveTo(s, [u], 'Trapping Grounds');
  run(s, (d) => (d.prompt.startsWith('Trapping Grounds: onde') ? [d.options[0].id] : undefined));
  const bird = s.e.units().find((x) => x.code === 'TOK-BIRD');
  assert.ok(bird, s.log(20));
  assert.equal(s.e.kw(bird!).deflect, 1);
});

test('Valley of Idols: quem joga a unidade aqui pode pagar [1] para dar Buff', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-218');
  runes(s, 0, RUNE.calm, 3);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-052', BF0);
  const p = s.put(0, 'OGN-052', 'hand');
  s.go();
  s.pick('Jogar Stalwart Poro');
  s.pick('Valley of Idols');
  run(s, yes);
  assert.equal(p.buffs, 1, s.log(20));
});

test('Amateur Recital: no hold aqui, pode mover uma unidade de qualquer campo para a base dela', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-207');
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  const foe = s.put(1, 'OGN-142', BF1);
  s.e.bfs[1].controller = 1;
  s.go();
  endTurn(s);
  endTurn(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.prompt.startsWith('Amateur Recital') ? [foe.id] : undefined));
  assert.deepEqual(s.e.locOf(foe), base(1), s.log(20));
});

test('Forgotten Library: quem controla o campo faz Predict ao jogar spell com [4]+ gasto', () => {
  const s = new Scenario();
  setBf(s, 0, 'UNL-211');
  runes(s, 0, MIND, 7);
  s.put(0, 'OGN-052', BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-114', 'hand');
  s.put(0, 'OGN-169', 'hand');
  const foe = s.put(1, 'OGN-052', BF1);
  s.go();
  s.pick('Jogar Gust');
  s.maybeObj(foe);
  run(s);
  assert.ok(!s.e.log.some((l) => l.text.includes('Forgotten Library')), 'Gust custa 1');
  s.pick('Jogar Progress Day');
  run(s, (d) => (d.prompt.startsWith('Predict') ? [] : undefined));
  assert.ok(s.e.log.some((l) => l.text.startsWith('Resolve: Forgotten Library')), s.log(20));
});
