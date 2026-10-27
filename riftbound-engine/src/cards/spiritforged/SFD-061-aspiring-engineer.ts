import { registerCard } from '../../engine/script';

// Quando você me joga, devolva um gear do seu descarte para a mão.
// O gear do descarte é alvo (zona pública, regra 355.10.a) e é escolhido ao pôr o gatilho na pilha.
registerCard({
  code: 'SFD-061',
  onPlay: [
    {
      label: 'Devolver um gear do descarte para a mão',
      targets: [
        {
          prompt: 'Aspiring Engineer: qual gear do seu descarte volta para a mão?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.isGear(o),
        },
      ],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o && o.zone === 'trash') {
          c.g.toZone(o, 'hand');
          c.g.say(`${c.g.name(o)} volta do descarte para a mão.`, c.p);
        }
      },
    },
  ],
});
