import { registerCard } from '../../engine/script';
import { xpCost } from '../helpers';
// Lenda: quando você vence um combate, ganhe 1 XP.
// Gastar 1 XP, [Tap]: [Buff] uma unidade.
// Gastar 2 XP, [Tap]: mova uma unidade aliada exaurida de um campo para a base dela.
// - Vencer o combate: ser o único com unidades no campo depois dele (466.3.a; evento combatWin).
// - Gastar XP é custo (202, 203.1; núcleo xpCost). Sem [Reaction]: só no seu turno, pilha vazia, fora de showdown.
// - As unidades são alvos, escolhidas ao ativar; a do movimento tem de continuar aliada, exaurida e num campo ao
//   resolver. "A base dela" = a base de quem a controla.
registerCard({
  code: 'UNL-201',
  triggers: [
    {
      on: 'combatWin',
      label: 'Venceu um combate: ganhar 1 XP',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
  activated: [
    {
      ...xpCost(1),
      label: 'Gastar 1 XP, exaurir: dar um Buff a uma unidade',
      exhaustSelf: true,
      targets: [{ prompt: "Kha'Zix: dar um Buff a qual unidade?" }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
    {
      ...xpCost(2),
      label: 'Gastar 2 XP, exaurir: mover uma unidade aliada exaurida de um campo para a base',
      exhaustSelf: true,
      targets: [
        {
          prompt: "Kha'Zix: mover qual unidade aliada exaurida de um campo para a base?",
          filter: (c, o) => o.controller === c.p && o.exhausted && c.g.bfIndex(o) >= 0,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
