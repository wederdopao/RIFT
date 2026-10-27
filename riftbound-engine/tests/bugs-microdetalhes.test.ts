// Microdetalhes pendentes do Unleashed (CONTINUAR.md): "você pode" sem nada possível, Sun Disc × Zilean, ordem de itens
// pendentes não simultâneos, Reckoner's Arena × triggerExtra e o rótulo da pergunta de ordem dos gatilhos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';
const ORDER = 'OGN-214';
const A = 'Campo Vazio A';

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Avança passando a prioridade/Focus; `other` responde as demais decisões (undefined = parar). Guarda os enunciados. */
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, seen: string[] = [], max = 60) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    seen.push(d.prompt);
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      if (!a) return seen;
      s.ok(a);
    }
  }
  return seen;
}
const first = (d: Decision) => [d.options[0].id];

// ───────────── 1. "Você pode" sem alvo possível ou sem poder pagar: não pergunta ─────────────

test('Imposing Challenger: sem unidade inimiga aqui com menos Might, o "você pode" não é perguntado', () => {
  const s = new Scenario();
  const ic = s.put(0, 'UNL-105', base(0)); // 5
  s.put(1, 'OGN-142', BF0); // 10: não serve
  s.go();
  moveTo(s, [ic.id], A);
  const seen = run(s, first);
  assert.ok(!seen.some((p) => /Imposing Challenger/.test(p)), seen.join('\n'));
  assert.ok(s.e.log.some((l) => l.text.includes('sem alvo válido')), s.log(15));
});

test('Irresistible Faefolk: sem unidade inimiga que possa ir para lá, não pergunta; com uma, pergunta', () => {
  {
    const s = new Scenario();
    const f = s.put(0, 'UNL-112', base(0));
    s.go();
    moveTo(s, [f.id], A);
    const seen = run(s, first);
    assert.ok(!seen.some((p) => /unidade inimiga para o campo/.test(p)), seen.join('\n'));
  }
  {
    const s = new Scenario();
    const f = s.put(0, 'UNL-112', base(0));
    s.put(1, 'OGN-136', base(1));
    s.go();
    moveTo(s, [f.id], A);
    assert.match(s.d.prompt, /unidade inimiga para o campo/);
  }
});

test('Blood Rose: sem como pagar [1], o "você pode pagar" não é perguntado; com runa, é', () => {
  for (const extra of [0, 1]) {
    const s = new Scenario();
    s.put(0, 'UNL-109', base(0));
    s.put(0, 'OGN-136', 'hand'); // Pit Rookie [2]
    s.runes(0, Array(2 + extra).fill(RUNE.body));
    s.go();
    s.pick('Jogar Pit Rookie');
    const seen = run(s, (d) => (/Pagar \[1\] para ganhar 1 XP/.test(d.prompt) ? ['no'] : first(d)));
    assert.equal(seen.some((p) => /Pagar \[1\] para ganhar 1 XP/.test(p)), extra === 1, seen.join('\n'));
    assert.equal(s.e.pl[0].xp, 0);
  }
});

test('Vex, Mocking: atordoar uma inimiga no campo onde ela já está não pergunta; noutro campo, pergunta', () => {
  for (const at of [BF1, base(0)]) {
    const s = new Scenario();
    const vex = s.put(0, 'UNL-055', at);
    const foe = s.put(1, 'OGN-175', BF1);
    s.runes(0, Array(3).fill(RUNE.calm));
    s.put(0, 'UNL-042', 'hand'); // Back Off: [Stun] uma unidade
    s.go();
    s.pick('Jogar Back Off');
    s.maybeObj(foe);
    const seen = run(s, (d) => (d.kind === 'confirm' ? ['yes'] : first(d)));
    assert.equal(seen.some((p) => /mover Vex, Mocking/.test(p)), at.t === 'base', seen.join('\n'));
    assert.deepEqual(vex.loc, BF1);
  }
});

// ───────────── 2. Sun Disc × Zilean ─────────────
// Sun Disc modifica só "a próxima unidade que você jogar". A ficha a mais do Zilean herda apenas as modificações do
// efeito que gerou a jogada (ou de habilidade ligada a ela) — regra 375; RiftJudge #9917/#11565 —, não as de outro
// efeito; e o Sun Disc se gasta numa unidade só (RiftJudge #6312, #5664). Então só a ficha original entra pronta.

test('Sun Disc + Zilean: só a ficha original é "a próxima unidade" e entra pronta; a cópia a mais entra exaurida (375)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-086', BF0); // Zilean num campo
  s.put(0, 'OGN-021', base(0)); // Sun Disc
  s.put(0, 'OGN-013', 'hand'); // Pouty Poro [2] (Legion)
  s.put(0, 'SFD-031', 'hand'); // Desert's Call [2]: uma Sand Soldier
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.calm, RUNE.calm]);
  s.go();
  s.pick('Jogar Pouty Poro');
  run(s, (d) => (/onde/.test(d.prompt) ? [d.options.find((o) => o.label.includes('base'))!.id] : first(d)));
  s.go();
  s.pick('Sun Disc');
  run(s, first);
  s.pick("Jogar Desert's Call");
  run(s, (d) => {
    if (/Zilean/.test(d.prompt)) return ['yes'];
    if (d.kind === 'confirm') return ['no']; // Repeat
    if (/onde|Onde/.test(d.prompt)) return [d.options.find((o) => o.label.includes('base'))!.id];
    return first(d);
  });
  const sand = s.e.units().filter((u) => u.code === 'TOK-SAND');
  assert.equal(sand.length, 2, s.log(20));
  assert.deepEqual(sand.map((u) => u.exhausted).sort(), [false, true], 'uma pronta (Sun Disc), a cópia exaurida');
  assert.equal(s.e.effects.filter((e) => e.nextPlay === 'unit').length, 0);
});

// ───────────── 3. Ordem de itens pendentes não simultâneos ─────────────

test('Mirror Image + Blood Rose: o gatilho da ficha (antes) e o reflexivo (depois) vão na ordem de adição, sem pergunta (337.1.b)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-109', base(0)); // Blood Rose: quando você joga uma unidade, pode pagar [1]
  const drake = s.put(1, 'OGN-142', BF0);
  s.put(0, 'UNL-200', 'hand');
  s.runes(0, [MIND, MIND, MIND, ORDER, ORDER, ORDER]);
  s.go();
  s.pick('Jogar Mirror Image');
  s.maybeObj(drake);
  let chainAtRose = '';
  const seen = run(s, (d) => {
    if (/Pagar \[1\] para ganhar 1 XP/.test(d.prompt)) {
      chainAtRose = s.e.chain.map((x) => x.label).join(' | ');
      return ['yes'];
    }
    return first(d);
  });
  assert.ok(!seen.some((p) => p.startsWith('Vários efeitos')), seen.join('\n'));
  assert.ok(!/Reflection se torna/.test(chainAtRose), 'o reflexivo ainda não estava na pilha ao finalizar o da Blood Rose');
  assert.equal(s.e.pl[0].xp, 1);
  // o reflexivo resolveu antes (por cima): a ficha virou cópia e tem Temporary
  const r = s.e.units().find((u) => u.controller === 0 && s.e.name(u) === 'Mountain Drake');
  assert.ok(r, s.log(20));
  const iRose = s.e.log.findIndex((l) => l.text.startsWith('Resolve: Blood Rose'));
  const iRef = s.e.log.findIndex((l) => l.text.startsWith('Resolve: Mirror Image: a Reflection'));
  assert.ok(iRef >= 0 && iRose > iRef, 'o reflexivo resolve primeiro\n' + s.log(20));
});

// ───────────── 4. Reckoner's Arena × triggerExtra ─────────────

function arena(s: Scenario) {
  const o = s.e.newObj('OGN-286', 0, 'battlefieldZone');
  s.e.bfs[0].objId = o.id;
  return o;
}
function endTurn(s: Scenario, other: (d: Decision) => string[] | undefined = first) {
  s.pick('Encerrar o turno');
  run(s, other);
}
const onChain = (s: Scenario, text: string) => s.e.log.filter((l) => l.text.startsWith('Na pilha:') && l.text.includes(text)).length;

test("Reckoner's Arena + Red Brambleback: a conquista ativada pelo campo não é 'por conquistar aqui' — dispara 1 vez (RiftJudge #10802)", () => {
  const s = new Scenario();
  arena(s);
  s.put(0, 'UNL-029', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(onChain(s, 'Red Brambleback: Buff numa unidade aliada'), 1, s.log(30));
});

test("Reckoner's Arena + Blue Sentinel: o hold do campo é efeito de hold aqui e dispara 2 vezes; a Brambleback não dobra de novo", () => {
  const s = new Scenario();
  arena(s);
  s.put(0, 'UNL-029', BF0);
  s.put(0, 'UNL-087', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(onChain(s, "Reckoner's Arena: Ativar"), 2, s.log(40));
  assert.equal(onChain(s, 'Red Brambleback: Buff numa unidade aliada'), 2, s.log(40));
});

// ───────────── 5. Rótulos da pergunta de ordem ─────────────

test('Ordem de gatilhos simultâneos: opções "Carta: efeito", com a fonte (obj), o texto da carta e os iguais numerados', () => {
  const s = new Scenario();
  const r1 = s.put(0, 'UNL-109', base(0));
  const r2 = s.put(0, 'UNL-109', base(0));
  s.put(0, 'OGN-136', 'hand');
  s.runes(0, Array(4).fill(RUNE.body));
  s.go();
  s.pick('Jogar Pit Rookie');
  let opts: Decision['options'] = [];
  run(s, (d) => {
    if (d.prompt.startsWith('Vários efeitos') && !opts.length) opts = d.options;
    return d.kind === 'confirm' ? ['no'] : first(d);
  });
  assert.ok(opts.length >= 3, JSON.stringify(opts));
  const roses = opts.filter((o) => o.label.startsWith('Blood Rose: Pagar [1] para ganhar 1 XP'));
  assert.equal(roses.length, 2);
  assert.notEqual(roses[0].label, roses[1].label, 'os dois iguais ficam distinguíveis');
  assert.deepEqual(roses.map((o) => o.obj).sort(), [r1.id, r2.id].sort());
  assert.ok(roses.every((o) => o.detail?.includes('When you play a unit')));
  assert.ok(opts.some((o) => o.label.startsWith('Pit Rookie: ') && o.detail));
});
