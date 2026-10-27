// Revisão independente do lote "fury" do Unleashed (UNL-001..UNL-030): um teste por erro achado. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const F = RUNE.fury;
const fury = (n: number) => Array.from({ length: n }, () => F);

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Avança passando a prioridade/Focus; `other` responde as demais decisões (undefined = primeira opção). */
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 80) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      s.ok(a ?? [d.options[0].id]);
    }
  }
}
const count = (s: Scenario, re: RegExp) => (s.log(200).match(re) || []).length;

// ── Red Brambleback (UNL-029) ──
// "Your conquer effects for conquering here trigger an additional time": as habilidades de hold que o Skyfall of Areion
// faz valer como de conquista também disparam a mais (RiftJudge #9537, #11010, verificadas); e, ao SEGURAR, as de
// conquista que o Skyfall faz valer como de hold não são "por conquistar aqui".
test('Red Brambleback: hold-como-conquista (Skyfall) dispara uma vez a mais ao conquistar aqui', () => {
  const s = new Scenario();
  const rb = s.put(0, 'UNL-029', base(0));
  const dune = s.put(0, 'SFD-027', base(0)); // Dunebreaker: "When I hold, draw 2"
  const sky = s.put(0, 'SFD-030', base(0)); // Skyfall of Areion
  s.e.attach(sky, dune);
  s.go();
  const h = s.e.pl[0].hand.length;
  moveTo(s, [rb.id, dune.id], 'Campo Vazio A');
  run(s);
  assert.equal(s.e.pl[0].hand.length, h + 4, s.log(60));
});

test('Red Brambleback: segurar com Skyfall não dobra a habilidade de conquista (não é "por conquistar")', () => {
  const s = new Scenario();
  s.put(0, 'UNL-029', BF0);
  const vox = s.put(0, 'UNL-027', BF0); // Inviolus Vox: "When I conquer, +8"
  const sky = s.put(0, 'SFD-030', base(0));
  s.e.attach(sky, vox);
  s.go();
  s.e.scored = [];
  s.e.runSync(s.e.score(0, 0, 'hold'));
  s.e.runSync(s.e.settle());
  assert.equal(count(s, /Resolve: Inviolus Vox/g), 1, s.log(60));
});

// ── Dancing Grenade (UNL-020) com [Repeat] dado por efeito (Temporal Portal) ──
// A jogada de A causa dano duas vezes (efeito + repetição); B joga de novo só na repetição. "1 de Bonus Damage para cada
// vez que este spell causou dano neste turno" = 2 vezes → 4 de dano. E a energia que A gastou (4) continua sendo a da
// jogada de A quando ela termina (Revna), mesmo com a jogada de B (por [A]) no meio.
function grenadeWithRepeat() {
  const s = new Scenario();
  const revna = s.put(0, 'UNL-005', base(0));
  revna.exhausted = true;
  const mine = s.put(0, 'OGN-142', base(0)); // 10
  const drake = s.put(1, 'OGN-142', base(1)); // 10
  s.put(0, 'UNL-020', 'hand');
  s.runes(0, fury(6));
  s.runes(1, fury(1));
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' });
  s.go();
  s.pick('Jogar Dancing Grenade');
  s.pickObj(drake);
  s.pick('Sim'); // Repeat
  s.pickObj(drake);
  let asked = 0;
  run(s, (d) => {
    if (/de novo/.test(d.prompt)) return [asked++ === 1 && d.player === 1 ? 'yes' : 'no'];
    if (/2 de dano em qual/.test(d.prompt)) return [d.options.find((o) => o.obj === mine.id)!.id];
    if (d.kind === 'confirm') return ['no'];
    return undefined;
  });
  return { s, revna, mine, drake };
}
test('Dancing Grenade: a repetição (Repeat) também conta como vez que o spell causou dano', () => {
  const { s, mine, drake } = grenadeWithRepeat();
  assert.equal(drake.damage, 4, s.log(40));
  assert.equal(mine.damage, 4, s.log(40));
});
test('Revna: a energia gasta é a da jogada que terminou, não a do Dancing Grenade jogado de novo por [A]', () => {
  const { s, revna } = grenadeWithRepeat();
  assert.equal(revna.exhausted, false, s.log(40));
});

// Dancing Grenade com [Repeat]: se B joga de novo já na 1ª execução, o spell já está na pilha como a jogada nova (outro
// objeto, 124.1) e a repetição da jogada de A não pode "jogá-lo de novo" uma segunda vez.
test('Dancing Grenade: com Repeat, jogado de novo na 1ª execução não é jogado de novo outra vez na repetição', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-142', base(0)); // 10
  const drake = s.put(1, 'OGN-142', base(1)); // 10
  s.put(0, 'UNL-020', 'hand');
  s.runes(0, fury(6));
  s.runes(1, fury(2));
  s.e.addEffect({ player: 0, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' });
  s.go();
  s.pick('Jogar Dancing Grenade');
  s.pickObj(drake);
  s.pick('Sim'); // Repeat
  s.pickObj(drake);
  const asks: P[] = [];
  run(s, (d) => {
    if (/de novo/.test(d.prompt)) {
      asks.push(d.player);
      return [d.player === 1 ? 'yes' : 'no'];
    }
    if (/2 de dano em qual/.test(d.prompt)) return [d.options.find((o) => o.obj === mine.id)!.id];
    if (d.kind === 'confirm') return ['no'];
    return undefined;
  });
  // B é perguntado uma vez só (na 1ª execução); depois, A, cuja unidade a jogada de B atingiu
  assert.deepEqual(asks, [1, 0], s.log(40));
  assert.equal(drake.damage, 4, s.log(40));
});

// ── Blighted Battleaxe (UNL-019) ──
// O custo de Equip é [1][Fury] (arte da carta; o cards.json perdeu o ícone e trazia [Rune]): sem power de Fury não equipa.
test('Blighted Battleaxe: Equip custa [1][Fury], não [1][A]', () => {
  const s = new Scenario();
  s.put(0, 'OGN-065', base(0));
  s.put(0, 'UNL-019', base(0));
  s.runes(0, [RUNE.calm, RUNE.calm]);
  s.go();
  assert.ok(!s.d.options.some((o) => /Equipar Blighted Battleaxe/.test(o.label)), s.d.options.map((o) => o.label).join(' | '));
  const s2 = new Scenario();
  const u2 = s2.put(0, 'OGN-065', base(0));
  const ax2 = s2.put(0, 'UNL-019', base(0));
  s2.runes(0, [RUNE.calm, F]);
  s2.go();
  s2.pick('Equipar Blighted Battleaxe');
  s2.maybeObj(u2);
  run(s2);
  assert.equal(ax2.attachedTo, u2.id, s2.log(20));
});
