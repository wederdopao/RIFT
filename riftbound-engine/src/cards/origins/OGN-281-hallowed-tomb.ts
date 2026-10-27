import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { cardData } from '../../engine/db';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, você pode devolver a sua campeã escolhida do descarte para a zona de campeão,
// se ela estiver vazia.
// - Campeã escolhida (regra 103.2.a.3): a carta escolhida para a zona de campeão e também qualquer Champion Unit com o
//   mesmo nome. Com mais de uma no descarte, o jogador escolhe qual volta.
// - O "se ela estiver vazia" vem depois do efeito: é checado na resolução (regras 383.2.a.1 e 108.3.c.1). O gatilho
//   sempre dispara ao segurar; o "você pode" é decidido ao pôr na pilha (regra 383.3.a) e só é perguntado quando há
//   o que devolver (sem nada para devolver, conta como recusado).
// - O descarte é público: a carta é alvo, escolhida ao pôr na pilha (regra 355.10.a).

/** Nome da campeã escolhida de c.p (gravada ao montar o campo; nos testes, cai na campeã do deck). */
function chosenName(c: Ctx): string {
  const id: string | undefined = c.self.data?.champs?.[c.p];
  return cardData(id ? c.g.objs[id].code : c.g.cfg.decks[c.p].champion).name;
}
const isChosen = (c: Ctx, o: Obj) =>
  o.owner === c.p && o.zone === 'trash' && c.g.data(o).type === 'Champion Unit' && c.g.data(o).name === chosenName(c);

registerCard({
  code: 'OGN-281',
  // guarda qual carta é a campeã escolhida de cada jogador (para saber o nome dela)
  bfSetup: (g, self) => {
    // (UNL) trocado de volta depois de substituído (438.7): mantém as campeãs guardadas no começo da partida
    self.data = { ...(self.data || {}), champs: self.data?.champs ?? [g.pl[0].champion, g.pl[1].champion] };
  },
  triggers: [
    {
      on: 'hold',
      label: 'Devolver a campeã escolhida do descarte para a zona de campeão',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      prepare: function* (c) {
        const g = c.g;
        // sem campeã no descarte ou com a zona ocupada não há o que fazer: equivale a recusar
        const any = g.pl[c.p].champion === null && g.pl[c.p].trash.some((id) => isChosen(c, g.objs[id]));
        if (!any) return false;
        c.data.use = yield* g.yesNo(c.p, `${g.name(c.self)}: devolver a sua campeã escolhida do descarte para a zona de campeão?`);
        return c.data.use; // recusar o "você pode" tira o gatilho da pilha (regra 383.3.a.2)
      },
      targets: (c) =>
        c.data.use
          ? [{ prompt: 'Hallowed Tomb: qual campeã volta para a zona de campeão?', kind: 'trash' as const, filter: (cc: Ctx, o: Obj) => isChosen(cc, o) }]
          : [],
      resolve: function* (c) {
        const g = c.g;
        const o = c.targets[0]?.[0];
        if (!o || o.zone !== 'trash' || g.pl[c.p].champion !== null) return;
        g.toZone(o, 'champion');
        g.pl[c.p].champion = o.id;
        g.say(`${g.name(o)} volta do descarte para a zona de campeão de ${g.pname(c.p)}.`, c.p);
      },
    },
  ],
});
