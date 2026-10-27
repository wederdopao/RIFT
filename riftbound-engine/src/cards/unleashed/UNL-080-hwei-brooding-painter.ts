import { registerCard, type AbilityDef, type Ctx } from '../../engine/script';

// Quando eu me movo, compre 1 e depois descarte 1. Então, conforme o tipo da carta descartada:
// * Spell: compre 1  * Gear: prepare até 2 runas  * Unidade: eu ganho +3 de Might neste turno.
// "Do the following based on the discarded card's type" é gatilho reflexivo (387.1.b): para cada tipo que a carta
// descartada tem, o efeito correspondente vai para a pilha depois do descarte; carta com vários tipos (Patched Porobot,
// "Unit Gear") põe um reflexivo por tipo (FAQ oficial do Vendetta, Hwei; RiftJudge #11695). Mudou (microdetalhes UNL):
// eles são criados em ordem (388.2, a impressa) e vão para a pilha nessa ordem (337.1.b), sem escolha do jogador.
// - "Prepare até 2 runas": as runas são alvos (355.10, 355.13: até 2, inclusive nenhuma), escolhidas ao finalizar o
//   reflexivo (355.5.b); qualquer runa no tabuleiro, de qualquer jogador e pronta ou não (o texto não restringe).
// - "Me" é conferido na resolução (359.3.f.2): se eu saí do tabuleiro, o +3 é ignorado.
const DRAW: AbilityDef = {
  label: 'Spell descartado: comprar 1',
  resolve: function* (c) {
    yield* c.g.draw(c.p, 1);
  },
};
const READY: AbilityDef = {
  label: 'Gear descartado: preparar até 2 runas',
  targets: [{ prompt: 'Hwei: quais runas preparar? (até 2)', kind: 'rune', min: 0, max: 2 }],
  resolve: function* (c) {
    for (const r of c.targets[0]) c.g.ready(r, c.p);
  },
};
const MIGHT: AbilityDef = {
  label: 'Unidade descartada: +3 de Might neste turno',
  resolve: function* (c) {
    if (c.self.zone === 'board') c.g.giveMight(c.self, 3);
  },
};
function reflexive(c: Ctx, a: AbilityDef) {
  c.g.pending.push({ controller: c.p, sourceId: c.self.id, ability: a, ev: c.ev ?? { type: 'move' }, label: a.label, reflexive: true });
}
registerCard({
  code: 'UNL-080',
  triggers: [
    {
      on: 'move',
      label: 'Comprar 1, descartar 1 e o efeito do tipo descartado',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        yield* g.draw(c.p, 1);
        const [d] = yield* g.discard(c.p, 1, 'Hwei: descarte 1');
        if (!d) return;
        const t = g.data(d).type.toLowerCase();
        if (t.includes('spell')) reflexive(c, DRAW);
        if (t.includes('gear')) reflexive(c, READY);
        if (t.includes('unit')) reflexive(c, MIGHT);
      },
    },
  ],
});
