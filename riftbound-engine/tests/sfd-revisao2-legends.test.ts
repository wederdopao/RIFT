// Segunda revisão independente do lote "legends" do Spiritforged (SFD-181..221): um teste por erro achado e corrigido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
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
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 80) {
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

// ───────────── Arise! ─────────────

test('Arise!: "Then do this" é gatilho reflexivo: o preparar vai para a pilha depois do spell e o oponente pode reagir', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 7);
  s.put(0, 'SFD-190', base(0));
  s.put(0, 'SFD-191', base(0));
  s.put(0, 'SFD-198', 'hand');
  // B tem uma Reaction que pode jogar (recebe prioridade)
  runes(s, 1, RUNE.chaos, 1);
  s.put(1, 'OGN-169', 'hand');
  s.put(1, 'OGN-052', BF0);
  s.go();
  s.pick('Jogar Arise!');
  // B passa com o Arise! na pilha; as fichas vão para a base
  for (let i = 0; i < 10 && !s.d.prompt.startsWith('Arise!: preparar'); i++) {
    if (s.d.kind === 'priority') s.pick('Passar');
    else if (s.d.prompt.startsWith('Arise!: onde')) s.ok([s.d.options[0].id]);
    else break;
  }
  // a escolha das fichas é feita ao pôr o gatilho reflexivo na pilha (355.5.b, 355.10), depois de o spell resolver
  assert.ok(s.d.prompt.startsWith('Arise!: preparar'), s.d.prompt);
  assert.equal(s.e.pl[0].trash.includes(s.e.pl[0].played.find((id) => s.e.objs[id].code === 'SFD-198')!), true, 'o Arise! já saiu da pilha');
  const sands = s.e.units().filter((u) => s.e.name(u) === 'Sand Soldier');
  assert.equal(sands.length, 2);
  s.ok(sands.map((u) => u.id));
  // o gatilho está na pilha e o oponente tem prioridade antes de as fichas ficarem prontas
  assert.ok(s.e.chain.some((it) => it.label.includes('preparar até duas')), s.log(10));
  assert.ok(sands.every((u) => u.exhausted));
  assert.equal(s.d.kind, 'priority');
  assert.equal(s.d.player, 1);
  run(s);
  assert.ok(sands.every((u) => !u.exhausted), s.log(10));
});

// mudou (microdetalhes UNL): o Weaponmaster da ficha disparou quando ela entrou, antes de o reflexivo ser criado; não são
// simultâneos, então vão para a pilha na ordem de adição (337.1.b; 383.3.d só vale para os simultâneos; FAQ #9917): o
// reflexivo fica por cima e resolve primeiro, sem pergunta de ordem entre eles.
test('Arise!: o reflexivo vai para a pilha depois dos Weaponmaster das fichas (Azir), na ordem de adição', () => {
  const s = new Scenario();
  legend(s, 0, 'SFD-197');
  runes(s, 0, RUNE.calm, 7);
  s.put(0, 'SFD-190', base(0));
  s.put(0, 'SFD-198', 'hand');
  s.go();
  s.pick('Jogar Arise!');
  let mixed = false;
  let top = '';
  run(s, (d) => {
    if (d.prompt.startsWith('Arise!: onde')) return [d.options[0].id];
    if (d.prompt.startsWith('Vários efeitos seus'))
      mixed ||= d.options.some((o) => o.label.includes('preparar até duas')) && d.options.some((o) => o.label.includes('Weaponmaster'));
    if (d.prompt.startsWith('Arise!: preparar')) {
      top = s.e.chain.map((x) => x.label).join(' | ');
      return d.options.map((o) => o.id);
    }
    if (d.kind === 'confirm') return [/Weaponmaster/.test(d.prompt) ? 'yes' : 'no'];
    return [d.options[0].id];
  });
  assert.ok(!mixed, 'sem escolha de ordem entre o reflexivo e o Weaponmaster');
  assert.match(top, /Weaponmaster/, 'o Weaponmaster já está na pilha quando o reflexivo é finalizado: ' + top);
});

// ───────────── Ornn, Fire Below the Mountain ─────────────

test('Ornn, Fire Below the Mountain: o [Add] continua pagando a habilidade de Equip do gear', () => {
  const s = new Scenario();
  const ornn = legend(s, 0, 'SFD-189');
  const sword = s.put(0, 'SFD-022', base(0));
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Equipar Long Sword');
  s.maybeObj(u);
  run(s);
  assert.equal(sword.attachedTo, u.id, s.log(10));
  assert.equal(ornn.exhausted, true);
});

// ───────────── Quick-Draw (Spinning Axe) ─────────────

test('Spinning Axe: a unidade do Quick-Draw é alvo escolhido ao pôr o gatilho na pilha; se ela sair (Gust), o machado fica solto', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.fury, 3);
  const a = s.put(0, 'OGN-052', BF0);
  const b = s.put(0, 'OGN-065', base(0));
  const axe = s.put(0, 'SFD-186', 'hand');
  runes(s, 1, RUNE.chaos, 1);
  s.put(1, 'OGN-169', 'hand'); // Gust
  s.go();
  s.pick('Jogar Spinning Axe');
  // a escolha vem antes de qualquer prioridade (RiftJudge #2996, #9963)
  assert.ok(/Quick-Draw: anexar .* a qual unidade/.test(s.d.prompt), s.d.prompt);
  s.pickObj(a);
  assert.ok(s.e.chain.some((it) => it.label.includes('Quick-Draw')));
  // B responde com Gust na unidade escolhida
  assert.equal(s.d.player, 1);
  s.pick('Jogar Gust');
  s.maybeObj(a);
  run(s);
  assert.equal(a.zone, 'hand');
  assert.equal(axe.attachedTo, undefined, 'alvo inválido: não escolhe outra unidade ' + s.log(10));
  assert.notEqual(axe.attachedTo, b.id);
});

test('Irelia, Blade Dancer: a unidade escolhida pelo Quick-Draw dispara "quando você escolhe uma unidade aliada"', () => {
  const s = new Scenario();
  const ire = legend(s, 0, 'SFD-195');
  runes(s, 0, RUNE.fury, 4);
  const u = s.put(0, 'OGN-065', base(0), { ready: false });
  const axe = s.put(0, 'SFD-186', 'hand');
  s.go();
  s.pick('Jogar Spinning Axe');
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : undefined));
  assert.equal(axe.attachedTo, u.id);
  assert.equal(ire.exhausted, true, s.log(15));
  assert.equal(u.exhausted, false);
});

// ───────────── Irelia, Blade Dancer ─────────────

test('Irelia, Blade Dancer: com dois gatilhos ao mesmo tempo, o segundo (Irelia já exaurida) não cobra o [A]', () => {
  const s = new Scenario();
  const ire = legend(s, 0, 'SFD-195');
  runes(s, 0, RUNE.calm, 5);
  const u = s.put(0, 'OGN-065', base(0), { ready: false });
  const v = s.put(0, 'OGN-052', base(0), { ready: false });
  s.put(0, 'SFD-196', 'hand'); // Defiant Dance: escolhe duas unidades aliadas
  s.go();
  s.pick('Jogar Defiant Dance');
  s.pickObj(u);
  s.maybeObj(v);
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : d.prompt.startsWith('Vários efeitos') ? [d.options[0].id] : undefined));
  assert.equal(ire.exhausted, true);
  assert.equal([u, v].filter((x) => !x.exhausted).length, 1, 'só uma unidade foi preparada');
  // Defiant Dance (1 + [A]) + um [A] da Irelia: 3 runas usadas (1 exaurida + 2 recicladas); 3 continuam no tabuleiro
  assert.equal(s.e.runesOf(0).length, 3, s.log(20));
});

// ───────────── Weaponmaster × recursos "só para gear" (coordenação) ─────────────

test('Weaponmaster: pagar o Equip por ele não é usar habilidade de gear (821.1.c.6): power "só para gear" do Ornn não paga', () => {
  const s = new Scenario();
  const e = s.e;
  const sword = s.put(0, 'SFD-022', base(0)); // Equip [Fury]
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  e.addResources(0, 0, ['Fury'], false, true);
  const cost = { energy: 0, power: [['Fury']] } as any;
  assert.equal(e.canPayEquip(0, sword, u, cost), true, 'pelo Equip (habilidade de gear) o power do Ornn paga');
  assert.equal(e.canPayEquip(0, sword, u, cost, false), false, 'pelo Weaponmaster não');
});
