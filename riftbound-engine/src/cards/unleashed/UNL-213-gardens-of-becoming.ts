import { registerCard } from '../../engine/script';
// Campo: as unidades aqui têm "[Tap]: ganhe 1 XP."
// A habilidade é de cada unidade enquanto ela está aqui (motor: aura grantActivated), de qualquer jogador; quem ativa é
// quem controla a unidade e é quem ganha a XP. Sem [Reaction]: só no seu turno, pilha vazia, fora de showdown.
registerCard({
  code: 'UNL-213',
  auras: [
    {
      grantActivated: (g, src, holder) => {
        const i = g.bfOf(src);
        return i >= 0 && holder.zone === 'board' && g.isUnit(holder) && g.bfIndex(holder) === i ? [0] : [];
      },
    },
  ],
  activated: [
    {
      label: 'Exaurir: ganhar 1 XP',
      exhaustSelf: true,
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
});
