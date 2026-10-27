import { registerCard } from '../../engine/script';
import { T } from '../helpers';
// Cause 5 de dano a uma unidade.
// Quando você conquista, você pode descartar 1 para devolver esta carta do seu descarte para a mão.
registerCard({
  code: 'OGN-252',
  spell: {
    label: 'Super Mega Death Rocket!',
    targets: [T.anyUnit('Super Mega Death Rocket!: 5 de dano em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 5, c.self);
    },
  },
  triggers: [
    {
      on: 'conquer',
      zone: 'trash',
      label: 'Descartar 1 para voltar para a mão',
      optional: 'Descartar 1 carta para devolver Super Mega Death Rocket! do descarte para a mão?',
      cond: (c, ev) => ev.player === c.p && c.g.pl[c.p].hand.length > 0,
      extraCost: function* (c) {
        if (!c.g.pl[c.p].hand.length || c.self.zone !== 'trash') return false;
        const d = yield* c.g.discard(c.p, 1, 'Super Mega Death Rocket!: descarte 1');
        return d.length > 0;
      },
      resolve: function* (c) {
        if (c.self.zone !== 'trash') return;
        c.g.toZone(c.self, 'hand');
        c.g.say(`Super Mega Death Rocket! volta para a mão de ${c.g.pname(c.p)}.`, c.p);
      },
    },
  ],
});
