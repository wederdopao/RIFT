import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Lenda: os seus Sand Soldiers têm [Weaponmaster].
// [1], [Tap]: jogue uma ficha de unidade Sand Soldier de 2 de Might na sua base. Use só se você jogou um Equipamento
// neste turno. (Sem [Reaction]: só no seu turno, fora de showdown e com a pilha vazia.)
// "Jogou um Equipamento neste turno": qualquer carta com a tag Equipment que você terminou de jogar neste turno
// (da mão, escondida ou por efeito).
registerCard({
  code: 'SFD-197',
  auras: [
    {
      keywords: (g, src, t) =>
        g.isUnit(t) && t.zone === 'board' && t.controller === src.controller && g.name(t) === 'Sand Soldier' ? { weaponmaster: true } : undefined,
    },
  ],
  activated: [
    {
      label: '[1], exaurir: jogar uma ficha Sand Soldier na base',
      exhaustSelf: true,
      cost: E(1),
      condition: (g, self) => g.pl[self.controller].played.some((id) => g.objs[id] && g.data(g.objs[id]).tags.includes('Equipment')),
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-SAND', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
