import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Hidden, Action: jogue uma ficha de Sprite 3 pronta, com Temporary.
// Local: como qualquer unidade jogada (regra 355.2.a): sua base ou um campo que você controla (ou campo aberto, se
// algo permitir). Jogada a partir de Hidden, a unidade entra nesse campo (regra 811.1.d.3). Jogada pela Ava Achiever,
// a ficha entra no campo onde a Ava ataca (FAQ riftjudge #5628).
registerCard({
  code: 'OGN-094',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Sprite Call',
    resolve: function* (c) {
      const g = c.g;
      const forced: Loc | undefined = c.hiddenBf !== undefined ? { t: 'bf', i: c.hiddenBf } : c.data.unitLoc;
      if (forced) {
        if (!g.playLocOk(c.p, c.self, forced)) return g.say('Sprite Call: a ficha não pode ser jogada nesse local.', c.p);
        yield* g.playTokenG('TOK-SPRITE', c.p, forced, true); // playTokenG (UNL mind): Zilean, Time Mage
        return;
      }
      const locs: Loc[] = [{ t: 'base', p: c.p }];
      g.bfs.forEach((b, i) => {
        // campo aberto: permissão de aura do jogador (Miss Fortune, Buccaneer)
        if (b.controller === c.p || (g.isOpenBf(i) && g.canPlayToOpen(c.p, c.self))) locs.push({ t: 'bf', i });
      });
      const ok = locs.filter((l) => g.playLocOk(c.p, c.self, l)); // Mageseeker Warden
      const ids = yield* g.ask(c.p, 'choose', 'Sprite Call: jogar o Sprite onde?', ok.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })));
      yield* g.playTokenG('TOK-SPRITE', c.p, ok[Number(ids[0])], true);
    },
  },
});
