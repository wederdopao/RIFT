import { registerCard } from '../../engine/script';
// RAD-156 Demacian Standard — "[Deploy]. When one or more friendly units attack here, give one of them +2 [Might] this
// turn. When you hold here, you may return this to its owner's hand."
// "One of them" é escolha específica de um objeto: feita quando o gatilho vai para a pilha (355.5, 355.5.b), entre as
// unidades aliadas atacantes daqui; se ela sair antes de resolver, a instrução não acontece (359.3.e.5).
registerCard({
  code: 'RAD-156',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'attack',
      label: '+2 Might a uma das unidades atacantes',
      cond: (c, ev) => !!ev.playerLevel && ev.player === c.p && c.g.bfIndex(c.self) >= 0 && ev.bf === c.g.bfIndex(c.self),
      targets: [
        {
          prompt: 'Demacian Standard: +2 Might neste turno em qual atacante?',
          filter: (c, o) => o.controller === c.p && o.role === 'attacker' && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2, 'turn');
      },
    },
    {
      on: 'hold',
      label: 'Devolver à mão',
      optional: 'devolver Demacian Standard à mão?',
      cond: (c, ev) => ev.player === c.p && c.g.bfIndex(c.self) >= 0 && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.returnToHand(c.self);
      },
    },
  ],
});
