import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { T } from '../helpers';

// Temporal Breach — [Hidden]. "Banish a unit, then its owner plays it to the same location, ignoring its cost."
// Ficha banida deixa de existir (RiftJudge #11668). Se o local é a base de outro jogador (unidade tomada com Hostile
// Takeover e movida para a base), o dono não pode jogá-la lá e ela fica banida (FAQ oficial do Vendetta; RiftJudge
// #11767). Local que proíbe jogar unidades (Rockfall Path): fica banida (RiftJudge #11838; playFromEffect).
registerCard({
  code: 'VEN-066',
  keywords: { hidden: true },
  spell: {
    label: 'Temporal Breach',
    targets: [T.anyUnit('Temporal Breach: banir qual unidade?')],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const loc = g.locOf(u);
      const owner = u.owner;
      g.banishObj(u);
      if (u.zone !== 'banish' || u.token || !loc) return;
      if (loc.t === 'base' && loc.p !== owner) {
        g.say(`${g.name(u)} fica banida: o dono não pode jogá-la na base de outro jogador.`);
        return;
      }
      yield* g.playFromEffect(owner, u, NO_COST, loc);
    },
  },
});
