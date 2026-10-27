// Rodada 2 do Vendetta/Radiance — frente "mecânicas complexas": unit gear, Neeko, Last Caress, Shady Spectacles,
// Jagged Cutlass, Gangplank (Naval), Renekton (Brute), Kennen, Dominus, Rebuttal. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';
import { getScript } from '../src/engine/script';
import { checkDeck, fillExtraLegends } from '../src/engine/deckcheck';
import { JINX_PRECON } from '../src/decks/origins';
import { deckCode, deckFromCode, fromDeckList, toDeckList } from '../src/ui/account';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const R = { mind: 'OGN-089', calm: 'OGN-042', body: 'OGN-126', chaos: 'OGN-166', order: 'OGN-214', fury: 'OGN-007' };

/** Responde decisões até voltar a uma decisão de ação. `h` responde as que quiser; o resto: passar / sim / primeira opção. */
function run(s: Scenario, h: (d: Decision) => string[] | undefined = () => undefined, max = 80) {
  for (let i = 0; i < max && s.g.current; i++) {
    const d = s.d;
    if (d.kind === 'action' && d.root) return;
    const a = h(d);
    if (a) s.ok(a);
    else if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.kind === 'confirm') s.ok(['yes']);
    else s.ok(d.options.slice(0, Math.max(1, d.min)).map((o) => o.id));
  }
}
const pickBy = (d: Decision, re: RegExp) => {
  const o = d.options.find((x) => re.test(x.label));
  return o ? [o.id] : undefined;
};
function endTurn(s: Scenario, h?: (d: Decision) => string[] | undefined) {
  s.pick('Encerrar o turno');
  run(s, h);
}
function setLegend(s: Scenario, p: P, code: string): Obj {
  const z = s.e.newObj(code, p, 'legend');
  s.e.legendOf(p).zone = 'gone';
  s.e.pl[p].legend = z.id;
  return z;
}

// ───────────── unit gear ─────────────

test('Patched Porobot (Unit Gear impresso): jogado como unidade, entra exaurido, é unidade e gear; não é chamado de volta do campo', () => {
  const s = new Scenario();
  for (let k = 0; k < 3; k++) s.put(0, 'OGN-228', base(0)); // 3 outros gear
  const pb = s.put(0, 'VEN-058', 'hand');
  s.put(0, 'OGN-087', 'deckTop');
  s.runes(0, rs(R.mind, 2));
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  s.pick('Jogar Patched Porobot');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  run(s);
  assert.equal(pb.zone, 'board');
  assert.equal(pb.exhausted, true, 'entra exaurido');
  assert.ok(s.e.isUnit(pb) && s.e.isGear(pb), 'unidade e gear');
  assert.equal(s.e.might(pb), 2);
  assert.ok(s.e.units().includes(pb) && s.e.gearOf(0).includes(pb));
  assert.equal(s.e.pl[0].hand.length, hand0 - 1 + 1, 'comprou 1 (3+ outros gear): ' + s.log());
  // num campo, a limpeza não o chama de volta (149.3 só vale para gear que não é unidade)
  s.e.moveUnits([pb], BF0, 0);
  s.e.cleanup();
  assert.equal(pb.loc?.t, 'bf');
});

test('Lady of Clockwork: no início da Main Phase, paga [1] e um gear vira unit gear (Might = custo); escolher outro desfaz e o antigo volta à base', () => {
  const s = new Scenario();
  const lady = setLegend(s, 0, 'RAD-145');
  const haven = s.put(0, 'OGN-143', base(0)); // Pirate's Haven, custo 3
  const helm = s.put(0, 'OGN-228', base(0)); // Vanguard Helm, custo 2
  s.go();
  assert.equal(s.e.isUnit(haven), false);
  endTurn(s);
  endTurn(s, (d) => (/Lady of Clockwork: qual gear/.test(d.prompt) ? [haven.id] : undefined));
  assert.ok(s.e.isUnit(haven), 'virou unit gear: ' + s.log(20));
  assert.ok(s.e.isGear(haven));
  assert.equal(s.e.might(haven), 3, 'Might = custo de energia');
  assert.ok(s.e.movableUnits(0).includes(haven), 'pode fazer o movimento padrão');
  s.e.moveUnits([haven], BF0, 0);
  s.e.cleanup();
  assert.equal(haven.loc?.t, 'bf', 'unidade: fica no campo');
  // escolhe outro gear com a Lady: o primeiro deixa de ser unidade e a limpeza o chama de volta
  s.e.makeUnitGear(helm, lady);
  s.e.cleanup();
  assert.equal(s.e.isUnit(haven), false);
  assert.equal(haven.loc?.t, 'base', 'gear que não é unidade volta para a base');
  assert.ok(s.e.isUnit(helm));
  assert.equal(s.e.might(helm), 2);
});

test('The Ball: Deploy fica no campo; como unit gear, ao mover dispara o "escolha um" (comprar 1)', () => {
  const s = new Scenario();
  const lady = setLegend(s, 0, 'RAD-145');
  const ball = s.put(0, 'RAD-146', base(0));
  s.put(0, 'OGN-087', 'deckTop');
  s.e.makeUnitGear(ball, lady);
  s.go();
  assert.equal(s.e.might(ball), 5);
  assert.ok(s.e.kw(ball).ganking);
  const hand0 = s.e.pl[0].hand.length;
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([ball.id]);
  s.pick(s.e.name(s.e.bfs[0].objId));
  run(s, (d) => pickBy(d, /^Comprar 1$/));
  assert.equal(ball.loc?.t, 'bf');
  assert.equal(s.e.pl[0].hand.length, hand0 + 1, 'gatilho de mover: ' + s.log(20));
  s.e.cleanup();
  assert.equal(ball.loc?.t, 'bf');
});

// ───────────── Neeko ─────────────

test('Neeko: deck aceita até 3 lendas extras de nomes diferentes; código de deck guarda as extras à parte', () => {
  const main: [string, number][] = [...JINX_PRECON.main, ['RAD-167', 1]];
  const d0 = { ...JINX_PRECON, main };
  // errata de 09/10/2026: "choose up to 3" — sem extras vale; mais de 3, não
  assert.ok(!checkDeck(d0).errors.some((e) => /Neeko/.test(e)), 'sem as extras: ok (até 3)');
  assert.ok(checkDeck({ ...d0, extraLegends: ['OGN-265', 'OGN-257', 'OGN-267', 'OGN-253'] }).errors.some((e) => /até 3/.test(e)), '4 extras: erro');
  assert.ok(checkDeck({ ...d0, extraLegends: ['OGN-265', 'OGN-257', 'OGN-251'] }).errors.some((e) => /nomes diferentes/.test(e)), 'Jinx repetida');
  const ok = { ...d0, extraLegends: ['OGN-265', 'OGN-257', 'OGN-267'] };
  assert.deepEqual(checkDeck(ok).errors, []);
  const filled = fillExtraLegends(d0, () => 0);
  assert.equal(filled.extraLegends?.length, 3);
  assert.deepEqual(checkDeck(filled).errors, []);
  assert.ok(checkDeck({ ...JINX_PRECON, extraLegends: ['OGN-265'] }).errors.length, 'extras sem Neeko: erro');
  const code = deckCode(fromDeckList(ok));
  assert.match(code, /~L:/);
  const back = toDeckList(deckFromCode(code).deck);
  assert.deepEqual(back.extraLegends, ok.extraLegends);
  assert.equal(back.legend, ok.legend);
});

test('Neeko: ao jogá-la, uma das lendas escolhidas vai para a Legend Zone com as habilidades ativas; sai quando ela sai', () => {
  const s = new Scenario();
  const e = s.e;
  e.pl[0].extraLegends = ['OGN-265', 'OGN-257', 'OGN-267'].map((c) => e.newObj(c, 0, 'setAside').id);
  const neeko = s.put(0, 'RAD-167', 'hand');
  s.runes(0, rs(R.mind, 8));
  s.go();
  s.pick('Jogar Neeko, Blending In');
  if (/onde\?/.test(s.d.prompt)) s.pick('base de A');
  run(s, (d) => pickBy(d, /Viktor/));
  const vik = e.objs[e.pl[0].extraLegends![0]];
  assert.equal(vik.zone, 'legend', s.log(20));
  assert.ok(e.legendsOf(0).includes(vik));
  assert.ok(e.actionOptions(0, 'main').some((o) => o.id.startsWith(`act:${vik.id}:`)), 'habilidade ativada do Viktor disponível');
  e.killAll([neeko]);
  assert.equal(vik.zone, 'setAside', 'Neeko saiu: a lenda sai da Legend Zone');
  assert.ok(!e.legendsOf(0).includes(vik));
});

// ───────────── Last Caress ─────────────

test('Last Caress: a próxima unidade jogada (mesmo escondida) pode ir a qualquer campo e ganha Buff', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-054', BF0); // mantém o controle do campo 0
  const hid = e.newObj('OGN-087', 0, 'setAside');
  e.toZone(hid, 'facedown');
  hid.loc = BF0;
  hid.hiddenTurn = 0;
  e.bfs[0].facedown.push(hid.id);
  s.put(0, 'RAD-154', 'hand');
  s.runes(0, [R.body, R.chaos]);
  s.go();
  s.pick('Jogar Last Caress');
  run(s);
  s.pick('Jogar Lecturing Yordle (escondida');
  const bf1 = e.name(e.bfs[1].objId);
  assert.ok(s.d.options.some((o) => o.label === bf1), 'oferece o outro campo: ' + s.d.options.map((o) => o.label).join(' | '));
  s.pick(bf1);
  run(s);
  assert.equal(hid.zone, 'board');
  assert.deepEqual(hid.loc, BF1);
  assert.equal(hid.buffs, 1, 'Buff ao jogá-la: ' + s.log(20));
  assert.ok(!e.effects.some((x) => x.flag === 'anyBf'), 'efeito consumido');
});

// ───────────── Shady Spectacles ─────────────

test('Shady Spectacles: a unidade equipada vira cópia da escolhida só enquanto anexado', () => {
  const s = new Scenario();
  const e = s.e;
  const a = s.put(0, 'OGN-087', base(0)); // Lecturing Yordle
  const b = s.put(0, 'OGN-054', base(0)); // Sunlit Guardian
  const sp = s.put(0, 'VEN-137', base(0));
  s.runes(0, [R.order, R.order]);
  s.go();
  s.pick('Equipar Shady Spectacles');
  run(s, (d) => (/Equip|anexar|qual unidade/i.test(d.prompt) && d.options.some((o) => o.obj === a.id) ? [d.options.find((o) => o.obj === a.id)!.id] : /copiar/.test(d.prompt) ? [d.options.find((o) => o.obj === b.id)!.id] : undefined));
  assert.equal(sp.attachedTo, a.id, s.log(20));
  assert.equal(a.code, 'OGN-054', 'cópia do Sunlit Guardian');
  e.detach(sp, 0);
  assert.equal(a.code, 'OGN-087', 'soltou: volta a ser ele mesmo');
  assert.equal(a.printed, undefined);
});

// ───────────── Jagged Cutlass ─────────────

test('Jagged Cutlass: spell inimigo não move a unidade equipada; movimento do próprio controlador continua valendo', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-054', BF0);
  const cut = s.put(1, 'VEN-073', BF0);
  e.attach(cut, u, 1);
  s.put(0, 'OGN-043', 'hand'); // Charm: Move an enemy unit
  s.runes(0, [R.calm, R.calm]);
  s.go();
  s.pick('Jogar Charm');
  run(s);
  assert.ok(e.log.some((l) => /joga Charm/.test(l.text)), s.log(15));
  assert.deepEqual(u.loc, BF0, 'não foi movida: ' + s.log(15));
  // o controlador ainda move (efeito dele / movimento padrão)
  e.resolving = 1;
  e.resolvingBy = 1;
  e.moveUnits([u], base(1), 1);
  e.resolving = 0;
  e.resolvingBy = null;
  assert.deepEqual(u.loc, base(1));
  assert.ok(e.moveDests([u]).length > 0, 'movimento padrão permitido');
});

// ───────────── Gangplank, Naval ─────────────

test('Gangplank, Naval (Empowered): Stun / -Might / devolver à mão de spell que o escolhe viram +3 Might', () => {
  const s = new Scenario();
  const e = s.e;
  const gp = s.put(0, 'VEN-086', BF0);
  e.empowerObj(gp, 0);
  s.put(0, 'OGN-050', 'hand'); // Rune Prison: Stun a unit
  s.put(0, 'OGN-095', 'hand'); // Stupefy: -1 Might
  s.put(0, 'OGN-172', 'hand'); // Rebuke: return a unit at a battlefield
  s.runes(0, [...rs(R.calm, 3), R.mind, R.chaos, R.chaos, R.chaos, R.chaos]);
  s.go();
  const tgt = (d: Decision) => (d.options.some((o) => o.obj === gp.id) && d.kind === 'choose' ? [d.options.find((o) => o.obj === gp.id)!.id] : undefined);
  s.pick('Jogar Rune Prison');
  run(s, tgt);
  assert.equal(gp.stunned, false);
  assert.equal(e.might(gp), 9, s.log(15));
  s.pick('Jogar Stupefy');
  run(s, tgt);
  assert.equal(e.might(gp), 12);
  s.pick('Jogar Rebuke');
  run(s, tgt);
  assert.equal(gp.zone, 'board');
  assert.equal(e.might(gp), 15);
  // sem estar Empowered, o Stun vale
  e.disempower(gp);
  e.stun(gp, 0);
  assert.equal(gp.stunned, true);
});

// ───────────── Renekton, Brute ─────────────

test('Renekton, Brute: quando o Might fica 10 ou mais, fica Empowered (evento genérico de limiar)', () => {
  const s = new Scenario();
  const e = s.e;
  const rk = s.put(0, 'VEN-092', base(0));
  s.runes(0, rs(R.body, 2));
  s.go();
  e.giveMight(rk, 5); // 9
  e.cleanup();
  assert.equal(rk.empowered, false);
  s.go();
  s.pick('Renekton, Brute: +1 Might');
  run(s);
  assert.equal(e.might(rk), 10);
  assert.equal(rk.empowered, true, s.log(15));
  assert.ok(e.kw(rk).ganking && e.kw(rk).deflect);
});

// ───────────── Kennen ─────────────

test('Kennen, Storm of Shuriken: ao conquistar dá [Flow] a um spell do descarte neste turno (jogar depois, e banir)', () => {
  const s = new Scenario();
  const e = s.e;
  const kn = s.put(0, 'VEN-113', BF0);
  const sp = s.put(0, 'OGN-083', 'trash'); // Consult the Past
  s.runes(0, rs(R.mind, 5));
  const t = getScript('VEN-113')!.triggers![0];
  e.runSync(t.resolve(e.ctx(kn, 0)));
  assert.equal(sp.zone, 'trash', 'não joga na hora');
  s.go();
  const opt = s.d.options.find((o) => o.id === `play:${sp.id}:flow`);
  assert.ok(opt && /Flow/.test(opt.label), 'oferece jogar do descarte por Flow');
  s.ok([opt!.id]);
  run(s);
  assert.equal(sp.zone, 'banish', 'Flow: banida depois de resolver: ' + s.log(10));
});

// ───────────── Dominus ─────────────

test('Dominus: dobra o Might e dá "[Rune][Rune]: Ready me" para usar quantas vezes der neste turno', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'OGN-054', base(0)); // Might 3
  s.put(0, 'VEN-142', 'hand');
  s.runes(0, [...rs(R.body, 4), ...rs(R.fury, 4)]);
  s.go();
  s.pick('Jogar Dominus');
  run(s, (d) => (d.options.some((o) => o.obj === u.id) ? [d.options.find((o) => o.obj === u.id)!.id] : undefined));
  assert.equal(e.might(u), 6, s.log(10));
  for (let k = 0; k < 2; k++) {
    u.exhausted = true;
    s.go();
    const opt = s.d.options.find((o) => o.id.startsWith(`acte:${u.id}:`));
    assert.ok(opt, `habilidade concedida (vez ${k + 1})`);
    s.ok([opt!.id]);
    run(s);
    assert.equal(u.exhausted, false, `preparada (vez ${k + 1}): ` + s.log(10));
  }
});

// ───────────── Rebuttal ─────────────

test('Rebuttal: pagando [Rune], ganha o controle do spell e escolhe novo alvo', () => {
  const s = new Scenario();
  const e = s.e;
  const x = s.put(1, 'OGN-054', base(1)); // alvo original (de B)
  const y = s.put(0, 'RAD-054', base(0)); // novo alvo (de A), Might 3
  s.put(0, 'OGN-095', 'hand'); // Stupefy (A)
  s.put(1, 'VEN-152', 'hand'); // Rebuttal (B)
  s.runes(0, [R.mind]);
  s.runes(1, [R.mind, R.mind, R.chaos]);
  s.go();
  s.pick('Jogar Stupefy');
  run(s, (d) => {
    if (d.player === 0 && d.kind === 'choose' && d.options.some((o) => o.obj === x.id)) return [d.options.find((o) => o.obj === x.id)!.id];
    if (d.player === 1 && d.kind === 'priority') return pickBy(d, /^Jogar Rebuttal/);
    if (/Rebuttal: escolher novo/.test(d.prompt)) return ['yes'];
    if (d.player === 1 && d.kind === 'choose' && d.options.some((o) => o.obj === y.id)) return [d.options.find((o) => o.obj === y.id)!.id];
    return undefined;
  });
  assert.equal(e.might(y), 2, 'o novo alvo recebeu -1: ' + s.log(20));
  assert.equal(e.might(x), 3, 'o alvo original não');
});
