// Revisão independente do Radiance, RAD-147..RAD-167. Rodar: node --import tsx --test tests/venrad-revisao-rad-b-4.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { checkDeck } from '../src/engine/deckcheck';
import { JINX_PRECON } from '../src/decks/origins';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const ORDER = 'OGN-214';

function setBf(s: Scenario, i: number, code: string) {
  const e = s.e;
  const o = e.newObj(code, i as P, 'battlefieldZone');
  e.bfs[i].objId = o.id;
  e.script(o).bfSetup?.(e, o);
  return o;
}
function setLegend(s: Scenario, p: P, code: string) {
  const z = s.e.newObj(code, p, 'legend');
  s.e.legendOf(p).zone = 'gone';
  s.e.pl[p].legend = z.id;
  return z;
}
/** Guarda os alvos de cada item posto na pilha (label → targetIds). */
function spyChain(s: Scenario) {
  const e = s.e;
  const seen: Record<string, string[][]> = {};
  const push = e.pushChain.bind(e);
  e.pushChain = (item) => {
    seen[item.label] = item.targetIds.map((g) => [...g]);
    return push(item);
  };
  return seen;
}
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 40) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      if (!a) return;
      s.ok(a);
    }
  }
}

// ───────────── K'Sante, Pride of Nazumah (RAD-147) ─────────────
test("K'Sante: a unidade ganha \"Assault igual ao meu Shield\" — acompanha o Shield ganho depois, no turno", () => {
  const s = new Scenario();
  const e = s.e;
  setLegend(s, 0, 'RAD-147');
  const u = s.put(0, 'OGN-087', base(0)); // Lecturing Yordle, sem Shield
  s.runes(0, rs(RUNE.calm, 1));
  s.go();
  s.pick('Pride of Nazumah');
  s.maybeObj(u);
  s.passAll();
  assert.equal(e.kw(u).assault || 0, 0, 'sem Shield, Assault 0');
  // Shield ganho depois (ex.: Ntofo Strikes): o Assault acompanha (habilidade entre aspas, não um número fixo)
  e.giveKw(u, { shield: 2 }, 'turn');
  assert.equal(e.kw(u).assault, 2, s.log());
  e.giveKw(u, { shield: 1 }, 'turn');
  assert.equal(e.kw(u).assault, 3);
});

// ───────────── Encore (RAD-152) ─────────────
test('Encore: os alvos ("a unit", "up to two units") são escolhidos ao jogar; "draw 1" é compra', () => {
  const s = new Scenario();
  const e = s.e;
  const foe = s.put(1, 'OGN-142', base(1)); // Mountain Drake 10
  const mine = s.put(0, 'OGN-087', base(0));
  s.put(0, 'RAD-152', 'hand');
  s.runes(0, [...rs(MIND, 3), ORDER]);
  const seen = spyChain(s);
  s.go();
  s.pick('Jogar Encore');
  assert.match(s.d.prompt, /Encore: escolha dois/);
  s.ok(['dmg', 'might']);
  // alvo do dano: escolhido agora (antes de ir para a pilha)
  assert.match(s.d.prompt, /2 de dano/);
  s.pickObj(foe);
  assert.match(s.d.prompt, /até duas unidades/);
  const opt = s.d.options.find((o) => o.obj === mine.id)!;
  s.ok([opt.id]);
  assert.deepEqual(seen['Encore'], [[foe.id], [mine.id]], s.log());
  s.passAll();
  assert.equal(foe.damage, 2);
  assert.equal(e.might(mine), 3);
});

test('Encore: o modo de olhar 2 compra de verdade (evento de compra conta no turno)', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'RAD-152', 'hand');
  s.runes(0, [...rs(MIND, 3), ORDER]);
  s.go();
  const before = e.pl[0].drawn?.turn === e.turn ? e.pl[0].drawn.n : 0;
  const hand0 = e.pl[0].hand.length;
  s.pick('Jogar Encore');
  s.ok(['recruits', 'look']);
  run(s, (d) => (/Recruits onde/.test(d.prompt) ? [d.options[0].id] : /comprar/.test(d.prompt) ? [d.options[0].id] : undefined));
  assert.equal(e.pl[0].hand.length, hand0, 'Encore saiu da mão e uma carta entrou');
  assert.equal(e.pl[0].drawn?.n, before + 1, s.log());
});

// ───────────── Blade of the Exile (RAD-150) × Weaponmaster ─────────────
test('Blade of the Exile: pelo Weaponmaster, a alternativa [Rune] sai com [A] a menos (de graça)', () => {
  const s = new Scenario();
  const e = s.e;
  const blade = s.put(0, 'RAD-150', base(0));
  s.put(0, 'SFD-099', 'hand'); // Veteran Poro: Weaponmaster, [2]
  s.runes(0, rs(RUNE.body, 2)); // só o custo do Poro: nenhuma runa sobra para o [Rune]
  s.go();
  s.pick('Jogar Veteran');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.options.some((o) => o.obj === blade.id) ? [d.options.find((o) => o.obj === blade.id)!.id] : undefined));
  const poro = e.units().find((u) => u.code === 'SFD-099')!;
  assert.equal(blade.attachedTo, poro.id, s.log(20));
  assert.equal(e.might(poro), 2 + 3);
});

// ───────────── Demacian Standard (RAD-156) ─────────────
test('Demacian Standard: "one of them" é escolhido ao pôr o gatilho de ataque na pilha', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(1, 'OGN-087', BF1); // defensor (campo 1 é de B)
  s.put(0, 'RAD-156', BF1);
  const a1 = s.put(0, 'OGN-019', base(0));
  const a2 = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [a1.id, a2.id], 'Campo Vazio B');
  let chosenAt = -1;
  run(s, (d) => {
    if (/Demacian Standard: \+2/.test(d.prompt)) {
      chosenAt = e.chain.filter((x) => x.label.includes('+2 Might')).length;
      return [d.options.find((o) => o.obj === a1.id)!.id];
    }
    return undefined;
  });
  assert.equal(chosenAt, 0, 'escolha feita antes de o gatilho estar na pilha: ' + s.log(25));
});

// ───────────── Durand Memorial (RAD-161) ─────────────
test('Durand Memorial: a unidade que ganha Tank é escolhida quando o gatilho vai para a pilha', () => {
  const s = new Scenario();
  const e = s.e;
  setBf(s, 0, 'RAD-161');
  const d1 = s.put(1, 'OGN-052', BF0); // Stalwart Poro
  const d2 = s.put(1, 'OGN-142', BF0); // Mountain Drake
  const att = s.put(0, 'OGN-019', base(0));
  const seen = spyChain(s);
  s.go();
  moveTo(s, [att.id], 'Durand Memorial');
  let onChain = -1;
  let tankDuring = false;
  const tankAt = () => (tankDuring ||= !!e.kw(d2).tank);
  const giveKw = e.giveKw.bind(e);
  e.giveKw = (o, kw, until) => {
    giveKw(o, kw, until);
    tankAt();
  };
  run(s, (d) => {
    if (/Durand Memorial/.test(d.prompt)) {
      onChain = e.chain.filter((x) => x.label.includes('Tank')).length;
      return [d.options.find((o) => o.obj === d2.id)!.id];
    }
    return undefined;
  });
  assert.equal(onChain, 0, s.log(20));
  const k = Object.keys(seen).find((x) => x.includes('Tank'))!;
  assert.deepEqual(seen[k], [[d2.id]]);
  assert.ok(tankDuring, s.log(20));
  assert.ok(!e.kw(d1).tank);
});

// ───────────── Firelights' Hideout (RAD-162) ─────────────
test("Firelights' Hideout: uma ficha de unidade é \"a próxima unidade\" e consome o Accelerate", () => {
  const s = new Scenario();
  const e = s.e;
  const bf = setBf(s, 0, 'RAD-162');
  const u = s.put(0, 'OGN-087', base(0));
  const card = s.put(0, 'OGN-142', 'hand');
  s.go();
  moveTo(s, [u.id], "Firelights' Hideout");
  run(s);
  assert.equal(e.bfs[0].controller, 0, s.log(20));
  const accel = () => !!e.script(bf).auras![0].playKeywords!(e, bf, card, 0)?.accelerate;
  assert.ok(accel(), 'a próxima unidade tem Accelerate');
  e.createToken('TOK-RECRUIT', 0, base(0)); // ficha de unidade jogada (185.2.a, 350.2)
  assert.ok(!accel(), 'a ficha foi a próxima unidade: a carta seguinte não tem Accelerate');
});

// ───────────── Ruined Monastery (RAD-166) ─────────────
test('Ruined Monastery: com a mão vazia, ainda pode fazer e canaliza 1 runa exaurida (359.3.e.11)', () => {
  const s = new Scenario();
  const e = s.e;
  setBf(s, 0, 'RAD-166');
  const u = s.put(0, 'OGN-087', base(0));
  assert.equal(e.pl[0].hand.length, 0);
  s.go();
  const r0 = e.runesOf(0).length;
  moveTo(s, [u.id], 'Ruined Monastery');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : undefined));
  const rs1 = e.runesOf(0);
  assert.equal(rs1.length, r0 + 1, s.log(20));
  assert.ok(rs1[rs1.length - 1].exhausted);
});

// ───────────── Black Market (RAD-158) ─────────────
test('Black Market: com uma lenda extra (Neeko), o jogador continua com um uso por turno', () => {
  const s = new Scenario();
  const e = s.e;
  setBf(s, 0, 'RAD-158');
  const neeko = s.put(0, 'RAD-167', base(0));
  const extra = e.newObj('OGN-265', 0, 'setAside');
  e.pl[0].extraLegends = [extra.id];
  assert.ok(e.addLegendWhile(0, extra, neeko));
  s.runes(0, rs(RUNE.calm, 4));
  s.go();
  const bm = () => s.d.options.filter((o) => o.label.includes('Black Market')).length;
  assert.equal(bm(), 1, s.d.options.map((o) => o.label).join(' | '));
  s.pick('comprar 1 (uma vez');
  s.passAll();
  assert.equal(bm(), 0, 'já usou neste turno');
});

// ───────────── Neeko, Blending In (RAD-167): errata ─────────────
test('Neeko: errata "choose up to 3" — de 0 a 3 lendas extras', () => {
  const d0 = { ...JINX_PRECON, main: [...JINX_PRECON.main, ['RAD-167', 1]] as [string, number][] };
  assert.ok(!checkDeck(d0).errors.some((x) => /Neeko/.test(x)));
  assert.deepEqual(checkDeck({ ...d0, extraLegends: ['OGN-265'] }).errors, []);
  assert.ok(checkDeck({ ...d0, extraLegends: ['OGN-265', 'OGN-257', 'OGN-267', 'OGN-253'] }).errors.some((x) => /até 3/.test(x)));
});
