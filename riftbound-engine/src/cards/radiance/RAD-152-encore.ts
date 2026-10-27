import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-152 Encore
import { chooseTokenLoc } from '../helpers';
registerCard({
  code: 'RAD-152',
  spell: {
    label: 'Encore',
    prepare: function* (c) {
      const [a, b] = yield* c.g.ask(
        c.p,
        'choose',
        'Encore: escolha dois',
        [
          { id: '0', label: '2 de dano em uma unidade' },
          { id: '1', label: 'Jogar duas fichas Recruit' },
          { id: '2', label: 'Até duas unidades +1 Might neste turno' },
          { id: '3', label: 'Olhar 2 do topo, comprar 1 e reciclar a outra' },
        ],
        2,
        2,
      );
      c.data.modes = [a, b];
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      const modes: string[] = c.data.modes || [];
      for (const m of modes) {
        if (m === '0') {
          const us = g.units();
          if (!us.length) continue;
          const [u] = yield* g.chooseObj(c.p, 'Encore: 2 de dano em qual unidade?', us);
          if (u) g.dealDamage(u, 2, c.self);
        } else if (m === '1') {
          const loc = yield* chooseTokenLoc(c, 'Encore: jogar as Recruits onde?');
          if (loc) for (let k = 0; k < 2; k++) yield* g.playTokenG('TOK-RECRUIT', c.p, loc);
        } else if (m === '2') {
          const us = g.units();
          if (!us.length) continue;
          const picks = yield* g.chooseObj(c.p, 'Encore: até duas unidades (+1 Might)', us, 0, 2);
          for (const u of picks) g.giveMight(u, 1, 'turn');
        } else if (m === '3') {
          const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 2));
          if (!top.length) continue;
          const [d] = yield* g.chooseObj(c.p, 'Encore: comprar qual carta? (a outra é reciclada)', top.map((id) => g.objs[id]));
          if (d) g.toZone(d, 'hand');
          const rest = top.filter((id) => id !== d?.id && g.objs[id].zone === 'mainDeck').map((id) => g.objs[id]);
          if (rest.length) yield* g.recycleCards(rest, { by: c.p });
        }
      }
    },
  },
});
