// Caça de bugs de interação: mecânicas novas do Unleashed × cartas e mecânicas dos sets anteriores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const RUNE = { fury: 'OGN-007', calm: 'OGN-042', mind: 'OGN-089', chaos: 'OGN-166', order: 'OGN-214' };

/** Responde as decisões até voltar à fase principal, com uma função de resposta para cada prompt. */
function drive(s: Scenario, answer: (prompt: string) => boolean, max = 40) {
  for (let i = 0; i < max && s.d.kind !== 'action'; i++) {
    if (answer(s.d.prompt)) continue;
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
}

// ── Zilean, Time Mage × "Então faça isto" de cartas antigas que jogam fichas ──
// FAQ #9917 / #11565 (app.riftjudge.com): a ficha a mais do Zilean herda as modificações do evento (regra 375), inclusive
// as do "Então faça isto" ligado à jogada: com Mirror Image, as duas Reflection viram cópias.

test('Arise! + Zilean: "prepare até duas delas" pode escolher a Sand Soldier a mais do Zilean (regra 375)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-086', BF0); // Zilean num campo
  s.put(0, 'SFD-022', base(0)); // um Equipamento: uma Sand Soldier
  s.put(0, 'SFD-198', 'hand');
  s.runes(0, [...Array(6).fill(RUNE.calm), RUNE.order]);
  s.go();
  s.pick('Jogar Arise');
  let offered = 0;
  drive(s, (p) => {
    if (/Zilean/.test(p)) return s.pick('Sim'), true;
    if (/onde jogar/.test(p)) return s.pick('base de A'), true;
    if (/preparar até duas/.test(p)) {
      const os = s.d.options.filter((o) => o.obj);
      offered = os.length;
      s.ok(os.slice(0, s.d.max).map((o) => o.id));
      return true;
    }
    return false;
  });
  const sand = s.e.units().filter((u) => u.code === 'TOK-SAND');
  assert.equal(sand.length, 2, 'Zilean: duas Sand Soldier');
  assert.equal(offered, 2, 'as duas podem ser escolhidas para preparar');
  assert.ok(sand.every((u) => !u.exhausted), 'as duas prontas');
});

test('Guards! + Zilean: pagar [Order] prepara também a Sand Soldier a mais (regra 375)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-086', BF0);
  s.put(0, 'SFD-154', 'hand');
  s.runes(0, Array(5).fill(RUNE.order));
  s.go();
  s.pick('Jogar Guards');
  drive(s, (p) => {
    if (/Zilean/.test(p)) return s.pick('Sim'), true;
    if (/onde jogar/.test(p)) return s.pick('base de A'), true;
    if (/preparar o Sand Soldier/.test(p)) return s.pick('Sim'), true;
    return false;
  });
  const sand = s.e.units().filter((u) => u.code === 'TOK-SAND');
  assert.equal(sand.length, 2);
  assert.ok(sand.every((u) => !u.exhausted), 'as duas prontas');
});

// ── Mageseeker Investigator (custo aplicado, 204.4) × movimento de várias unidades por efeito ──

function tricksy(s: Scenario, us: Obj[]) {
  s.put(0, 'UNL-054', 'hand');
  s.runes(0, Array(6).fill(RUNE.calm));
  s.go();
  s.pick('Jogar Tricksy');
  const asked: string[] = [];
  drive(s, (p) => {
    if (/mover qual unidade inimiga/.test(p)) return s.pickObj(us[0]), true;
    if (/mais uma unidade/.test(p)) {
      const o = s.d.options.find((x) => us.slice(1).some((u) => u.id === x.obj && !s.e.locEq(u.loc, BF0) && u.zone === 'board'));
      s.ok(o ? [o.id] : []);
      return true;
    }
    if (/para qual local/.test(p)) return s.pick('Campo Vazio A'), true;
    if (/custo aplicado/.test(p)) return asked.push(p), s.pick('Não'), true;
    return false;
  });
  return asked;
}

test('Tricksy Tentacles × Mageseeker Investigator: quem move escolhe se paga o custo aplicado (204.4.c)', () => {
  const s = new Scenario();
  s.put(1, 'UNL-163', BF0); // Investigator do B
  const u1 = s.put(1, 'TOK-RECRUIT', base(1));
  const u2 = s.put(1, 'TOK-RECRUIT', base(1));
  const asked = tricksy(s, [u1, u2]);
  assert.equal(asked.length, 1, 'A é perguntado se paga [A]');
  assert.deepEqual(u1.loc, base(1), 'sem pagar, o movimento não acontece');
  assert.deepEqual(u2.loc, base(1));
});

test('Mageseeker Investigator: unidade que quem move não pode mover não conta para o custo aplicado', () => {
  const s = new Scenario();
  s.put(1, 'UNL-163', BF0);
  const u1 = s.put(1, 'TOK-RECRUIT', base(1));
  const u2 = s.put(1, 'TOK-RECRUIT', base(1));
  u2.noMoveTurn = s.e.turn; // "they can't move it this turn" (Vex, Apathetic): A não pode mover u2
  u2.noMoveBy = 0;
  const asked = tricksy(s, [u1, u2]);
  assert.equal(asked.length, 0, 'só uma unidade se move: sem custo');
  assert.ok(!/A paga 0 de energia \+ 1 power/.test(s.log(6)), 'nenhum [A] pago pelo movimento');
  assert.deepEqual(u1.loc, BF0);
  assert.deepEqual(u2.loc, base(1));
});

// ── Repeat a mais (The Academy, Temporal Portal, Syndra) × spells antigos que guardam escolhas por execução ──

test('Piercing Light com dois Repeats (impresso + The Academy): a 3ª execução compara com o próprio 1º alvo', () => {
  const s = new Scenario();
  const x = s.put(1, 'OGN-001', BF0);
  const y = s.put(1, 'OGN-001', BF0);
  const z = s.put(1, 'OGN-001', BF0);
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' }); // The Academy (hold)
  s.put(0, 'SFD-023', 'hand');
  s.runes(0, Array(12).fill(RUNE.fury));
  s.go();
  s.pick('Jogar Piercing Light');
  // execução 1: x e nada; execução 2: y e nada; execução 3: z e y
  const plan: (Obj | null)[] = [x, null, y, null, z, y];
  drive(s, (p) => {
    if (/Pagar Repeat/.test(p)) return s.pick('Sim'), true;
    if (/Piercing Light: 2 de dano/.test(p)) {
      const t = plan.shift();
      if (t) s.pickObj(t);
      else s.ok([]);
      return true;
    }
    return false;
  });
  assert.equal(x.damage, 2);
  assert.equal(z.damage, 2);
  assert.equal(y.damage, 4, 'y leva 2 na 2ª execução e 2 na 3ª');
});

test('Ride the Wind com dois Repeats dados por efeito: cada execução move para o próprio destino', () => {
  const s = new Scenario();
  const u1 = s.put(0, 'TOK-RECRUIT', base(0));
  const u2 = s.put(0, 'TOK-RECRUIT', base(0));
  const u3 = s.put(0, 'TOK-RECRUIT', base(0));
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' }); // Temporal Portal
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' }); // The Academy
  s.put(0, 'OGN-173', 'hand');
  s.runes(0, Array(12).fill(RUNE.chaos));
  s.go();
  s.pick('Jogar Ride the Wind');
  const units = [u1, u2, u3];
  const dests = ['Campo Vazio A', 'Campo Vazio B', 'Campo Vazio A'];
  drive(s, (p) => {
    if (/Pagar Repeat/.test(p)) return s.pick('Sim'), true;
    if (/mover e preparar qual/.test(p)) return s.pickObj(units.shift()!), true;
    if (/mover .* para onde/.test(p)) return s.pick(dests.shift()!), true;
    return false;
  });
  assert.deepEqual(u1.loc, BF0);
  assert.deepEqual(u2.loc, BF1, 'a 2ª execução vai para o destino dela');
  assert.deepEqual(u3.loc, BF0);
});

// ── Svellsongur (texto copiado no texto de efeito) × substituição de jogar ficha do Zilean, Time Mage ──

test('Svellsongur no Zilean, Time Mage: a cópia do texto é outra instância da substituição (370.2; RiftJudge #10154)', () => {
  const s = new Scenario();
  const z = s.put(0, 'UNL-086', BF0);
  const sv = s.put(0, 'SFD-059', base(0));
  assert.ok(s.e.attach(sv, z, 0));
  s.put(0, 'OGS-015', 'hand'); // Recruit the Vanguard: quatro Recruits
  s.runes(0, Array(6).fill(RUNE.order));
  s.go();
  s.pick('Jogar Recruit the Vanguard');
  let asks = 0;
  drive(s, (p) => {
    if (/Zilean/.test(p)) return asks++, s.pick('Sim'), true;
    if (/onde jogar/.test(p)) return s.pick('base de A'), true;
    return false;
  });
  assert.equal(asks, 2, 'as duas instâncias (uma vez por turno cada)');
  assert.equal(s.e.units().filter((u) => u.code === 'TOK-RECRUIT').length, 6, '4 + 1 + 1');
});

test('Svellsongur numa ficha Bird: copia o [Deflect] do texto da ficha (Deflect 2; RiftJudge #4283)', () => {
  const s = new Scenario();
  const bird = s.e.createToken('TOK-BIRD', 0, base(0));
  const sv = s.put(0, 'SFD-059', base(0));
  assert.equal(s.e.kw(bird).deflect, 1);
  assert.ok(s.e.attach(sv, bird, 0));
  assert.equal(s.e.kw(bird).deflect, 2);
});

test('(controle) Svellsongur numa unidade com script continua copiando as palavras-chave impressas', () => {
  const s = new Scenario();
  const z = s.put(0, 'UNL-087', base(0)); // Blue Sentinel: [Shield 2]
  const sv = s.put(0, 'SFD-059', base(0));
  assert.ok(s.e.attach(sv, z, 0));
  assert.equal(s.e.kw(z).shield, 4);
});
