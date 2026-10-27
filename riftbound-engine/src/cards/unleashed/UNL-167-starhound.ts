import { registerCard } from '../../engine/script';

// Quando você me joga, devolva um Bird, Cat, Dog ou Poro do seu descarte para a sua mão.
// - Carta no descarte é alvo (zona pública, 355.10.a: "Return a unit from your trash to your hand" é alvo), escolhida ao
//   pôr o gatilho na pilha; sem nenhuma, o gatilho não vai para a pilha. Na resolução tem de continuar no descarte.
const TAGS = ['Bird', 'Cat', 'Dog', 'Poro'];
registerCard({
  code: 'UNL-167',
  onPlay: [
    {
      label: 'Devolver um Bird, Cat, Dog ou Poro do descarte para a mão',
      targets: [
        {
          prompt: 'Starhound: devolver qual Bird, Cat, Dog ou Poro do seu descarte para a mão?',
          kind: 'trash',
          filter: (c, o) => c.g.pl[c.p].trash.includes(o.id) && TAGS.some((t) => c.g.hasTag(o, t)),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const o = c.targets[0][0];
        if (!o || o.zone !== 'trash') return;
        g.toZone(o, 'hand');
        g.say(`${g.name(o)} volta do descarte para a mão de ${g.pname(o.owner)}.`, c.p);
      },
    },
  ],
});
