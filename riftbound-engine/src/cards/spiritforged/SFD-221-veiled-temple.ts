import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, você pode preparar um gear aliado. Se for um Equipamento, você pode soltá-lo.
// - O "você pode" do início é decidido ao pôr o gatilho na pilha (383.3.a) e o gear é alvo escolhido nesse momento
//   (regra 355.7); o "você pode soltá-lo" é decidido na resolução (383.3.a.3).
// - Solto, o gear fica no local da unidade (regra 435.4); num campo, a limpeza o manda para a base (435.4.a).
registerCard({
  code: 'SFD-221',
  triggers: [
    {
      on: 'conquer',
      label: 'Preparar um gear aliado (e talvez soltá-lo)',
      optional: 'Preparar um gear aliado?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      targets: [{ prompt: 'Veiled Temple: preparar qual gear seu?', kind: 'gear', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const g = c.g;
        const gear = c.targets[0]?.[0];
        if (!gear || gear.zone !== 'board') return;
        g.ready(gear, c.p);
        g.say(`${g.name(gear)} fica pronto.`, c.p);
        if (!g.data(gear).tags.includes('Equipment') || !gear.attachedTo) return;
        if (!(yield* g.yesNo(c.p, `Veiled Temple: soltar ${g.name(gear)} de ${g.name(gear.attachedTo)}?`))) return;
        g.detach(gear, c.p);
      },
    },
  ],
});
