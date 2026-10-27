import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';
// RAD-158 Black Market — "[Rune][Rune]: Draw 1. Each player may use this ability once on their turn (even if they don't
// control this battlefield)."
// A habilidade é concedida a cada jogador pela lenda inicial dele (com Neeko, Blending In, uma lenda a mais na Legend Zone
// não dá um segundo uso). O uso conta ao ativar (custo pago), por jogador e por turno; com dois Black Market na mesa, cada
// um dá o próprio uso. Timing padrão: fase principal do próprio turno ("on their turn").
const markets = (g: Engine) => g.bfs.filter((b) => g.objs[b.objId]?.code === 'RAD-158').length;
const used = (g: Engine, holder: Obj) => (holder.data?.blackMarket?.turn === g.turn ? holder.data.blackMarket.n : 0);
registerCard({
  code: 'RAD-158',
  auras: [
    {
      grantActivated: (g, src, holder) =>
        g.bfOf(src) >= 0 && g.kind(holder) === 'legend' && g.legendOf(holder.controller)?.id === holder.id ? [0] : [],
    },
  ],
  activated: [
    {
      label: '[Rune][Rune]: comprar 1 (uma vez no seu turno)',
      cost: E(0, 'any', 'any'),
      condition: (g, self) => used(g, self) < markets(g),
      canPayExtra: (c) => used(c.g, c.self) < markets(c.g),
      extraCost: function* (c) {
        c.self.data = { ...(c.self.data || {}), blackMarket: { turn: c.g.turn, n: used(c.g, c.self) + 1 } };
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
