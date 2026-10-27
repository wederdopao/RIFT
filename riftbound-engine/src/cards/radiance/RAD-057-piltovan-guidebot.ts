import { registerCard } from '../../engine/script';

// Quando você joga uma carta, pode fazer meu Might base ser igual ao custo de Energia dela neste turno.
registerCard({
  code: 'RAD-057',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Meu Might base vira o custo de Energia da carta',
      optional: 'Fazer o Might base do Guidebot ser igual ao custo da carta jogada?',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const ev = c.ev!;
        if (c.self.zone !== 'board' || !ev.obj) return;
        c.g.addEffect({ target: c.self.id, baseMight: c.g.data(ev.obj).energy, until: 'turn' });
        c.g.say(`${c.g.name(c.self)} tem Might base ${c.g.data(ev.obj).energy} neste turno.`, c.p);
      },
    },
  ],
});
