// Testes de exatidão das lendas, signatures e campos (OGN-247..298) e do Proving Grounds (OGS-001..024).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import { registerCard } from '../src/engine/script';
import type { Decision, Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';

// Ficha de teste com Hunt 2 (só neste processo) para o Reckoner's Arena.
registerCard({ code: 'TOK-MECH', keywords: { hunt: 2 } });

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
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 60) {
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
function endTurn(s: Scenario, other?: (d: Decision) => string[] | undefined) {
  s.pick('Encerrar o turno');
  run(s, other);
}
const yes = (d: Decision) => (d.kind === 'confirm' ? ['yes'] : undefined);
/** Roda o resolve de um gatilho direto (para checar o que ele faz na resolução). */
function resolveTrigger(s: Scenario, src: Obj, k: number, p: P, ev: any) {
  const t = s.e.script(src).triggers![k];
  const gen = t.resolve(s.e.ctx(src, p, { ev }));
  for (let r = gen.next(); !r.done; r = gen.next([])) {
    /* sem decisões */
  }
}

// ───────────── lendas ─────────────

test('Jinx, Loose Cannon: o gatilho sempre vai para a pilha; o "se" é checado na resolução (regra 383.2.a.1)', () => {
  const s = new Scenario();
  const jinx = s.e.legendOf(0);
  for (let i = 0; i < 3; i++) s.put(0, 'OGN-052', 'hand');
  s.e.emit({ type: 'beginStart', player: 0 });
  assert.equal(s.e.pending.filter((x) => x.sourceId === jinx.id).length, 1, 'dispara com 3 cartas na mão');
  s.e.pending = [];
  const hand = s.e.pl[0].hand.length;
  resolveTrigger(s, jinx, 0, 0, { type: 'beginStart', player: 0 });
  assert.equal(s.e.pl[0].hand.length, hand, 'com 3 cartas não compra');
  for (const id of [...s.e.pl[0].hand].slice(1)) s.e.toZone(s.e.objs[id], 'trash');
  resolveTrigger(s, jinx, 0, 0, { type: 'beginStart', player: 0 });
  assert.equal(s.e.pl[0].hand.length, 2, 'com 1 carta compra 1');
});

test('Darius: ativado à mão (com Legion) põe 1 de energia no pool', () => {
  const s = new Scenario();
  const dar = legend(s, 0, 'OGN-253');
  runes(s, 0, RUNE.body, 2);
  s.put(0, 'OGN-136', 'hand'); // Pit Rookie
  s.go();
  s.pick('Jogar Pit Rookie');
  run(s);
  s.pick('Exaurir: adicionar 1 de energia');
  assert.equal(dar.exhausted, true);
  assert.equal(s.e.pl[0].pool.energy, 1, s.log());
});

test('Stormbringer: o dano é do spell (regra 417.6.a)', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.body, 4);
  runes(s, 0, RUNE.fury, 4);
  const drake = s.put(0, 'OGN-142', base(0)); // 10 de Might
  const foe = s.put(1, 'OGN-142', BF0);
  const sb = s.put(0, 'OGN-250', 'hand');
  s.go();
  s.pick('Jogar Stormbringer');
  s.maybeObj(drake);
  s.pick('Campo Vazio A');
  run(s);
  assert.equal(foe.lastDmg?.src, sb.id, s.log());
  assert.deepEqual(drake.loc, BF0);
});

test('Last Breath e Void Gate: a unidade causa o dano (regra 417.6.b.3), sem Bonus Damage', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-296');
  runes(s, 0, RUNE.calm, 5);
  const elder = s.put(0, 'OGN-065', base(0), { ready: false }); // 4
  const drake = s.put(1, 'OGN-142', BF0); // 10
  s.put(0, 'OGN-260', 'hand');
  s.go();
  s.pick('Jogar Last Breath');
  s.maybeObj(elder);
  s.maybeObj(drake);
  run(s);
  assert.equal(elder.exhausted, false);
  assert.equal(drake.damage, 4, s.log());
});

test("Dragon's Rage: o destino é escolhido ao jogar, antes de qualquer resposta (regra 355.4); o dano é das unidades", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-296'); // Void Gate: não soma nada (dano das unidades)
  runes(s, 0, RUNE.body, 5);
  const elder = s.put(1, 'OGN-065', BF1); // 4
  const drake = s.put(1, 'OGN-142', BF0); // 10
  s.put(0, 'OGN-258', 'hand');
  s.go();
  s.pick("Jogar Dragon's Rage");
  s.pickObj(elder);
  assert.ok(/para onde/.test(s.d.prompt), 'destino perguntado ao jogar: ' + s.d.prompt);
  assert.ok(!s.e.log.some((l) => l.text.startsWith("Na pilha: Dragon's Rage")), 'ainda não está na pilha');
  s.pick('Void Gate');
  run(s);
  assert.ok(s.e.log.some((l) => l.text.includes('Wizened Elder → Void Gate')), s.log());
  assert.equal(drake.damage, 4, 'Elder causa 4 (sem Bonus Damage do Void Gate)');
  assert.equal(elder.zone, 'trash');
});

test("Dragon's Rage: movimento impedido (Vilemaw's Lair) é ignorado, mas o reflexivo usa o destino escolhido", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-295');
  runes(s, 0, RUNE.body, 5);
  const poro = s.put(1, 'OGN-052', BF0); // 2
  const elder = s.put(1, 'OGN-065', base(1)); // 4
  s.put(0, 'OGN-258', 'hand');
  s.go();
  s.pick("Jogar Dragon's Rage");
  s.pickObj(poro);
  s.pick('base de B');
  run(s, (d) => (d.prompt.includes('outra unidade inimiga') ? [elder.id] : undefined));
  assert.ok(!s.e.log.some((l) => l.text.includes('Stalwart Poro → base')), 'não saiu do Vilemaw');
  assert.equal(poro.zone, 'trash', s.log());
  assert.equal(elder.damage, 2);
});

test('Fox-Fire: na resolução, se o Might total passou de 4, o jogador escolhe um subconjunto (regra 355.11.b)', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 3);
  const a = s.put(1, 'OGN-052', BF0); // 2
  const b = s.put(1, 'OGN-052', BF0); // 2
  s.put(0, 'OGN-256', 'hand');
  runes(s, 1, RUNE.chaos, 2);
  s.put(1, 'OGS-011', 'hand'); // Flash (Reaction): o oponente recebe prioridade
  s.go();
  s.pick('Jogar Fox-Fire');
  if (s.d.prompt.includes('qual campo')) s.pick('Campo Vazio A');
  s.pickObj(a);
  s.pickObj(b);
  assert.equal(s.e.chain.length, 1, s.d.prompt);
  // em resposta, b ganha +1
  s.e.giveMight(b, 1);
  run(s, (d) => (d.prompt.includes('passou de 4') ? [b.id] : undefined));
  assert.equal(b.zone, 'trash', s.log());
  assert.equal(a.zone, 'board');
});

test('Fox-Fire: as mortes são simultâneas (killAll)', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.calm, 3);
  const a = s.put(1, 'OGN-052', BF0);
  const b = s.put(1, 'OGN-052', BF0);
  s.put(0, 'OGN-256', 'hand');
  s.go();
  s.pick('Jogar Fox-Fire');
  if (s.d.prompt.includes('qual campo')) s.pick('Campo Vazio A');
  s.pickObj(a);
  s.pickObj(b);
  run(s);
  assert.equal(a.zone, 'trash');
  assert.equal(b.zone, 'trash', s.log());
});

test('Yasuo: unidade e destino escolhidos ao ativar, antes da pilha', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-259');
  runes(s, 0, RUNE.calm, 2);
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Yasuo');
  assert.ok(s.d.prompt.includes('para qual campo'), s.d.prompt);
  assert.ok(!s.e.log.some((l) => l.text.startsWith('Na pilha: Yasuo')), 'destino escolhido antes da pilha');
  s.pick('Campo Vazio B');
  run(s);
  assert.deepEqual(u.loc, BF1);
});

test('Teemo, Swift Scout: a unidade Teemo na zona de campeão é alvo, escolhido ao ativar', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-263');
  runes(s, 0, RUNE.chaos, 1);
  const e = s.e;
  const champ = e.objs[e.pl[0].champion!];
  e.toZone(champ, 'trash');
  const teemo = e.newObj('OGN-197', 0, 'champion');
  e.pl[0].champion = teemo.id;
  const onBoard = s.put(0, 'OGN-121', base(0));
  s.go();
  s.pick('pôr um Teemo seu na mão');
  assert.ok(s.d.options.some((o) => o.obj === teemo.id) && s.d.options.some((o) => o.obj === onBoard.id), s.d.prompt);
  assert.ok(!s.e.log.some((l) => l.text.startsWith('Na pilha: Teemo')), 'alvo escolhido antes da pilha');
  s.pickObj(teemo);
  run(s);
  assert.equal(teemo.zone, 'hand', s.log());
  assert.equal(e.pl[0].champion, null);
  assert.equal(onBoard.zone, 'board');
});

test('Guerilla Warfare: as cartas do descarte são alvos ao jogar; esconder de graça vale mesmo sem alvo válido', () => {
  const s = new Scenario();
  runes(s, 0, RUNE.chaos, 2);
  runes(s, 0, MIND, 1);
  const fox = s.put(0, 'OGN-256', 'trash'); // Fox-Fire (Hidden)
  s.put(0, 'OGN-264', 'hand');
  runes(s, 1, RUNE.chaos, 2);
  s.put(1, 'OGS-011', 'hand'); // Flash (Reaction): o oponente recebe prioridade
  s.go();
  s.pick('Jogar Guerilla Warfare');
  s.ok([fox.id]);
  assert.equal(s.e.chain.length, 1);
  // em resposta, a carta sai do descarte
  s.e.toZone(fox, 'banish');
  run(s);
  assert.equal(fox.zone, 'banish');
  assert.ok(s.e.playerFlag(0, 'hideFree'), s.log());
});

test('Zenith Blade: a aliada é alvo ao jogar; mover ou não é decidido na resolução', () => {
  for (const ans of ['yes', 'no']) {
    const s = new Scenario();
    runes(s, 0, RUNE.calm, 5);
    const elder = s.put(0, 'OGN-065', base(0));
    const poro = s.put(1, 'OGN-052', BF0);
    s.put(0, 'OGN-262', 'hand');
    s.go();
    s.pick('Jogar Zenith Blade');
    s.maybeObj(poro);
    s.pickObj(elder);
    run(s, (d) => (d.kind === 'confirm' ? [ans] : undefined));
    assert.ok(s.e.log.some((l) => l.text.includes('Stalwart Poro fica atordoada')));
    assert.deepEqual(elder.loc, ans === 'yes' ? BF0 : base(0), s.log());
  }
});

test('Viktor: a ficha Recruit pode ir para a base ou para um campo que você controla', () => {
  const s = new Scenario();
  legend(s, 0, 'OGN-265');
  runes(s, 0, RUNE.calm, 1);
  s.put(0, 'OGN-052', BF0);
  s.go();
  s.pick('jogar uma ficha Recruit');
  run(s, (d) => (d.prompt.startsWith('Viktor: jogar a ficha') ? [d.options.find((o) => o.label === 'Campo Vazio A')!.id] : undefined));
  const rec = s.e.units().find((u) => u.code === 'TOK-RECRUIT');
  assert.deepEqual(rec?.loc, BF0, s.log());
});

test('Annie, Dark Child: "até 2" pergunta mesmo com 2 runas exauridas (pode escolher só uma)', () => {
  const s = new Scenario();
  legend(s, 0, 'OGS-017');
  runes(s, 0, RUNE.fury, 3);
  const [r1, r2, r3] = s.e.runesOf(0);
  r1.exhausted = true;
  r2.exhausted = true;
  s.go();
  let asked = false;
  endTurn(s, (d) => {
    if (!d.prompt.startsWith('Annie')) return undefined;
    asked = true;
    assert.equal(d.min, 0);
    assert.equal(d.options.length, 2, 'só runas exauridas');
    return [r1.id];
  });
  assert.ok(asked, s.log());
  assert.equal(r1.exhausted, false);
  assert.equal(r2.exhausted, true, 'só a escolhida foi preparada');
  assert.equal(r3.exhausted, false);
});

test("Targon's Peak: no fim do turno o jogador escolhe até 2 runas", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-289');
  s.e.bfs[0].controller = null;
  runes(s, 0, RUNE.fury, 3);
  const u = s.put(0, 'OGN-052', base(0));
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([u.id]);
  s.pick("Targon's Peak");
  run(s);
  assert.equal(s.e.bfs[0].controller, 0, s.log());
  const rs = s.e.runesOf(0);
  for (const r of rs) r.exhausted = true;
  let opts = 0;
  s.pick('Encerrar o turno');
  run(s, (d) => {
    if (!d.prompt.startsWith("Targon's Peak")) return undefined;
    opts = d.options.length;
    assert.equal(d.max, 2);
    return [rs[2].id];
  });
  assert.equal(opts, 3, s.log());
});

test("Obelisk of Power e The Arena's Greatest: 'primeira Beginning Phase' é por jogador, mesmo com turno extra", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-290');
  setBf(s, 1, 'OGN-284');
  s.e.extraTurns.push(0); // o jogador 0 joga de novo antes do jogador 1
  s.go();
  endTurn(s); // turno 2: jogador 0 de novo
  assert.equal(s.e.active, 0);
  assert.equal(s.e.pl[0].points, 0, 'jogador 0 já teve a primeira Beginning Phase\n' + s.log(20));
  endTurn(s, (d) => (d.prompt.startsWith('Vários efeitos') ? [d.options[0].id] : undefined)); // turno 3: primeiro turno do jogador 1
  assert.equal(s.e.pl[1].points, 1, s.log(20));
  assert.equal(s.e.runesOf(1).length, 1 + 3);
});

test('Fortified Position: sem controlador, "quando você defende aqui" não dispara (regra 190.6.d)', () => {
  const s = new Scenario();
  const fp = setBf(s, 0, 'OGN-279');
  s.e.bfs[0].controller = null;
  s.e.emit({ type: 'defend', bf: 0, player: 1, playerLevel: true });
  assert.equal(s.e.pending.filter((x) => x.sourceId === fp.id).length, 0);
  s.e.bfs[0].controller = 1;
  s.e.emit({ type: 'defend', bf: 0, player: 1, playerLevel: true });
  assert.equal(s.e.pending.filter((x) => x.sourceId === fp.id && x.controller === 1).length, 1);
});

test('The Dreaming Tree: quem escolhe controla o gatilho, mesmo com o campo do oponente (regra 190.6.c)', () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-292');
  runes(s, 0, RUNE.fury, 4);
  s.put(1, 'OGN-142', BF0); // o oponente controla o campo
  const mine = s.put(0, 'OGN-142', BF0);
  s.e.bfs[0].controller = 1;
  s.put(0, 'OGN-024', 'hand'); // Void Seeker
  s.go();
  s.pick('Jogar Void Seeker');
  s.pickObj(mine);
  run(s);
  const l = s.e.log.find((x) => x.text.startsWith('Na pilha: The Dreaming Tree'));
  assert.ok(l, s.log());
  assert.equal(l!.player, 0);
});

test('Hallowed Tomb: qualquer cópia da campeã escolhida (mesmo nome) volta; sem nada no descarte, não pergunta', () => {
  const s = new Scenario();
  const e = s.e;
  const champ = e.objs[e.pl[0].champion!];
  setBf(s, 0, 'OGN-281');
  e.toZone(champ, 'banish');
  const copy = s.put(0, champ.code, 'trash'); // outra cópia, no descarte
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  let asked = 0;
  endTurn(s, (d) => (d.kind === 'confirm' && d.prompt.includes('Hallowed Tomb') ? (asked++, ['yes']) : undefined));
  assert.equal(asked, 1);
  assert.equal(copy.zone, 'champion', s.log(20));
  assert.equal(e.pl[0].champion, copy.id);
  // próximo hold: zona ocupada, nada a perguntar
  endTurn(s);
  endTurn(s, (d) => (d.kind === 'confirm' && d.prompt.includes('Hallowed Tomb') ? (asked++, ['yes']) : undefined));
  assert.equal(asked, 1);
});

test("Reckoner's Arena: Hunt também é habilidade de conquista e vai para a pilha (XP duas vezes)", () => {
  const s = new Scenario();
  setBf(s, 0, 'OGN-286');
  s.put(0, 'TOK-MECH', BF0); // Hunt 2
  for (let i = 0; i < 3; i++) s.put(0, 'OGN-142', 'hand');
  s.go();
  endTurn(s);
  // mudou (UNL): o Hunt do próprio hold também é gatilho na pilha (823.1), junto com o do Arena: o jogador escolhe a ordem
  endTurn(s, (d) => (d.prompt.startsWith('Vários efeitos') ? [d.options[0].id] : undefined));
  assert.equal(s.e.pl[0].xp, 4, s.log(30));
  assert.ok(s.e.log.some((l) => l.text.includes('Na pilha: Mech: Hunt 2')), 'Hunt ativado vai para a pilha');
});

test('The Grand Plaza e Garen: o "se" logo depois da condição não é checado de novo na resolução', () => {
  const s = new Scenario();
  const gp = setBf(s, 0, 'OGN-293');
  resolveTrigger(s, gp, 0, 0, { type: 'hold', player: 0, bf: 0 });
  assert.equal(s.e.winner, 0);
  const s2 = new Scenario();
  const garen = legend(s2, 0, 'OGS-023');
  const hand = s2.e.pl[0].hand.length;
  resolveTrigger(s2, garen, 0, 0, { type: 'conquer', player: 0, bf: 0 });
  assert.equal(s2.e.pl[0].hand.length, hand + 2);
});

test('Recruit the Vanguard: Mageseeker Warden inimigo num campo deixa as fichas só na base', () => {
  const s = new Scenario();
  runes(s, 0, 'OGN-214', 6);
  s.put(0, 'OGN-052', BF0); // controla o campo A
  s.put(1, 'OGN-070', BF1); // Warden do oponente num campo
  s.put(0, 'OGS-015', 'hand');
  s.go();
  s.pick('Jogar Recruit the Vanguard');
  let asked = false;
  run(s, (d) => (d.prompt.startsWith('Recruit the Vanguard') ? ((asked = true), [d.options[0].id]) : undefined));
  assert.equal(asked, false, 'só a base: não pergunta');
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-RECRUIT' && u.loc?.t === 'base').length, 4, s.log());
});
