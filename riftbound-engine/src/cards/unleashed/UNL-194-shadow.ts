import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Signature Unit (Vex). Se você me joga num campo, eu entro pronta.
// [Action] [1][A], [Tap]: [Stun] uma unidade inimiga que está atacando aqui.
// - "Entro pronta" depende do local para onde é jogada (o motor passa o local a entersReady).
// - A habilidade tem [Action]: no seu turno ou num showdown com o Focus. A unidade inimiga é alvo: tem de estar atacando
//   (designação de atacante, 464) no campo onde a Shadow está, ao ativar e ao resolver.
registerCard({
  code: 'UNL-194',
  entersReady: (_g, _self, loc) => loc?.t === 'bf',
  activated: [
    {
      label: '[1][A], exaurir: atordoar uma unidade inimiga atacando aqui',
      timing: 'action',
      exhaustSelf: true,
      cost: E(1, 'any'),
      targets: [
        {
          prompt: 'Shadow: atordoar qual unidade inimiga atacando aqui?',
          filter: (c, o) => o.controller !== c.p && o.role === 'attacker' && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
  ],
});
