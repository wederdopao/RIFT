import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';

// Unidade 6. Não posso ser preparada. [Caos]: mova-me para um campo inimigo ocupado se o meu Might for maior que o Might
// total das unidades inimigas lá.
// - "Não posso ser preparada": nem o despertar nem efeitos a preparam; entrar pronta (Confront, Accelerate) não é
//   preparar e continua valendo (RiftJudge #8730). Gancho do motor: CardScript.cantBeReadied.
// - Habilidade ativada sem Action/Reaction (fase principal do seu turno) e sem [Tap]: funciona com ela exaurida. O
//   destino é escolhido ao ativar (355.4): campo controlado por um oponente e ocupado (170.11.a), diferente do atual. A
//   comparação de Might é conferida na resolução; se não for maior, ela não se move.
// - Movimento por efeito: não exaure e não precisa de Ganking.
const dests = (g: Engine, self: Obj): number[] =>
  g.bfs
    .map((b, i) => i)
    .filter((i) => {
      const b = g.bfs[i];
      return b.controller !== null && b.controller !== self.controller && g.unitsAtBf(i).length > 0 && g.bfIndex(self) !== i;
    });
registerCard({
  code: 'UNL-144',
  cantBeReadied: () => true,
  activated: [
    {
      label: '[Caos]: mover-me para um campo inimigo ocupado (se o meu Might for maior que o das inimigas lá)',
      cost: E(0, 'Chaos'),
      condition: (g, self) => dests(g, self).length > 0,
      prepare: function* (c) {
        const g = c.g;
        const ds = dests(g, c.self);
        if (!ds.length) return false;
        const [k] = yield* g.ask(c.p, 'choose', 'Maduli: mover para qual campo inimigo ocupado?', ds.map((i) => ({ id: String(i), label: g.name(g.bfs[i].objId), obj: g.bfs[i].objId })));
        c.data.bf = Number(k);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const self = c.self;
        const i = c.data.bf as number;
        if (self.zone !== 'board' || g.bfIndex(self) === i) return;
        const enemy = g.unitsAtBf(i).filter((u) => u.controller !== c.p).reduce((s, u) => s + g.might(u), 0);
        if (g.might(self) > enemy) g.moveUnits([self], { t: 'bf', i }, c.p);
        else g.say(`Maduli: o Might dele (${g.might(self)}) não é maior que o das unidades inimigas lá (${enemy}); não se move.`, c.p);
      },
    },
  ],
});
