import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Gear. Ao jogar isto, nomeie uma tag. [Tap]: dê -2 de Might neste turno a uma unidade com a tag nomeada.
// - Nomear é uma escolha "ao ser jogada" (355.1), feita enquanto a carta é jogada (gancho asPlayed: vale também jogada
//   por efeito ou ignorando custos); só vale tag que existe em cartas ou fichas de Riftbound (regra 763; lista em 763.1)
//   — g.nameTagG do núcleo.
// - A tag nomeada fica com este objeto; se ele sair e voltar, é outro objeto e nomeia de novo ao ser jogado.
// - [Tap]: habilidade ativada sem Action/Reaction (fase principal do seu turno). A unidade é alvo (qualquer controlador)
//   e tem de ter a tag ao escolher e ao resolver (hasTag conta tags dadas por equipamento).
const named = (o: Obj): string | undefined => (o.data?.listVer === o.zoneVersion ? o.data?.listTag : undefined);
registerCard({
  code: 'UNL-138',
  asPlayed: function* (c) {
    const tag = yield* c.g.nameTagG(c.p, 'The List: nomeie uma tag');
    // a carta ainda vai para a pilha e o tabuleiro (zoneVersion +2): a tag vale para esse objeto
    c.self.data = { ...(c.self.data || {}), listTag: tag, listVer: c.self.zoneVersion + 2 };
    return true;
  },
  activated: [
    {
      label: 'Exaurir: -2 de Might neste turno a uma unidade com a tag nomeada',
      exhaustSelf: true,
      condition: (g, self) => !!named(self),
      targets: [{ prompt: 'The List: dar -2 de Might a qual unidade com a tag nomeada?', filter: (c, o) => !!named(c.self) && c.g.hasTag(o, named(c.self)!) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -2);
      },
    },
  ],
});
