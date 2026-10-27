import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Resonating Strike
// Hidden. Reaction. Escolha um campo que você controla e uma unidade sua em outro local. Mova-a para esse campo e dê-lhe +2 Might
// neste turno. Os dois alvos são escolhidos ao jogar (campo primeiro). Jogado de Hidden, o campo escolhido é o escondido
// (811.1.d.2) e a unidade, por estar "em outro local", fica fora da restrição.
registerCard({
  code: 'VEN-034',
  keywords: { hidden: true, reaction: true },
  spell: {
    label: 'Resonating Strike',
    targets: [
      {
        prompt: 'Resonating Strike: para qual campo que você controla?',
        kind: 'battlefield',
        bfFilter: (c, i) => c.g.bfs[i].controller === c.p,
      },
      {
        prompt: 'Resonating Strike: mover qual unidade sua (em outro local)?',
        ignoreHidden: true,
        filter: (c, o) => {
          if (o.controller !== c.p) return false;
          if (c.item) return true; // na resolução o campo é conferido no resolve
          const bf = c.targets[0]?.[0];
          const i = bf ? c.g.bfOf(bf) : -1;
          return !(o.loc?.t === 'bf' && o.loc.i === i);
        },
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const bf = c.targets[0]?.[0];
      const u = c.targets[1]?.[0];
      if (!u || u.zone !== 'board') return;
      // a unidade continua "em outro local" em relação ao campo escolhido (mesmo que o campo tenha ficado ilegal)?
      const chosenBf = c.item?.targetIds?.[0]?.[0];
      const i0 = chosenBf ? g.bfOf(g.objs[chosenBf]) : -1;
      if (u.loc?.t === 'bf' && u.loc.i === i0) return;
      // campo ilegal (deixou de ser seu): o movimento é ignorado, o +2 na unidade ainda vale (359.3.e.5/e.6)
      const i = bf ? g.bfOf(bf) : -1;
      if (i >= 0 && g.bfs[i].controller === c.p) yield* g.moveUnitsG([u], { t: 'bf', i }, c.p);
      g.giveMight(u, 2);
    },
  },
});
