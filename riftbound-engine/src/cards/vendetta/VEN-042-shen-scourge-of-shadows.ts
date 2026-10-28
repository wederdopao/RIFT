import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Shen, Scourge of Shadows
registerCard({
  code: 'VEN-042',
  triggers: [
    {
      on: 'hold',
      label: 'Comprar 1 (exatamente uma outra unidade aqui)',
      // condição do gatilho (383.2.a.1): conta as unidades suas aqui de verdade (o evento de hold "de conquista" do Skyfall
      // of Areion só lista a unidade equipada)
      cond: (c, ev) =>
        ev.player === c.p &&
        (ev.units || []).includes(c.self.id) &&
        c.g.bfIndex(c.self) === ev.bf &&
        c.g.unitsAtBf(ev.bf, c.p).filter((u) => u.id !== c.self.id).length === 1,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
