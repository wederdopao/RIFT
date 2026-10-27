import { registerCard, type Ctx, type TargetSpec } from '../../engine/script';
import { moveDestinations } from '../helpers';
import type { Loc } from '../../engine/types';

// Mova uma unidade inimiga. [Level 6] [Stun] uma unidade inimiga.
// - O alvo e o destino do movimento são escolhidos ao jogar (355.4, 355.5; como Charm).
// - A instrução de Level é texto dependente (727.1.b, 824.1): ao jogar, se você tem 6+ XP ela está ativa e o alvo dela
//   é escolhido junto (355.8: todos os alvos); sem 6 XP ela está inativa e não escolhe nada. Na resolução ela só é
//   processada se continuar ativa (721.2: instrução inativa não é processada; 824.1.d). Pode ser a mesma unidade.
const MOVE: TargetSpec = {
  prompt: 'Skyward Strike: mover qual unidade inimiga?',
  filter: (c, o) => o.controller !== c.p && moveDestinations(c, o).length > 0,
};
const STUN: TargetSpec = {
  prompt: 'Skyward Strike (Level 6): atordoar qual unidade inimiga?',
  filter: (c, o) => o.controller !== c.p,
};
// ao jogar: conforme o XP agora; na resolução (c.item existe): conforme o que foi escolhido ao jogar
const lvlChosen = (c: Ctx) => (c.item ? c.item.targetIds.length > 1 : c.g.level(c.p, 6));
registerCard({
  code: 'UNL-038',
  spell: {
    label: 'Skyward Strike',
    targets: (c) => (lvlChosen(c) ? [MOVE, STUN] : [MOVE]),
    choose: function* (c, ids) {
      const g = c.g;
      const u = g.objs[ids[0]?.[0]];
      if (!u) return true;
      const dests = moveDestinations(c, u);
      if (!dests.length) return false;
      const [k] = yield* g.ask(
        c.p,
        'choose',
        `Skyward Strike: mover ${g.name(u)} para onde?`,
        dests.map((l, i) => ({ id: String(i), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
      );
      c.data[`dest${c.rep}`] = dests[Number(k)];
      return true;
    },
    // o alvo do movimento pode ficar ilegal e o Stun ainda valer (359.3.e.5, 359.3.e.8)
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0]?.[0];
      const to = c.data[`dest${c.rep}`] as Loc | undefined;
      if (u && to) g.moveUnits([u], to.t === 'base' ? { t: 'base', p: u.controller } : to, c.p);
      const s = c.targets[1]?.[0];
      if (s && g.level(c.p, 6)) g.stun(s, c.p);
    },
  },
});
