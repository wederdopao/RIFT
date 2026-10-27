import { registerCard, type AbilityDef } from '../../engine/script';

// Quando sou jogado e quando conquisto, me dê Buff. Gaste meu Buff: ganho +4 de Might neste turno.
// "Gaste meu Buff" é o custo da habilidade (pago ao ativar). Sem Action/Reaction: só no seu turno, sem pilha e fora de
// showdown/combate (FAQ riftjudge #9601 e #8763) — o padrão do motor para habilidades ativadas.
const BUFF_ME: AbilityDef = {
  label: 'Buff em mim',
  resolve: function* (c) {
    c.g.buff(c.self, c.p);
  },
};
registerCard({
  code: 'OGN-164',
  onPlay: [BUFF_ME],
  triggers: [
    {
      on: 'conquer',
      ...BUFF_ME,
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
    },
  ],
  activated: [
    {
      label: 'Gastar meu Buff: +4 de Might neste turno',
      spendBuffSelf: true,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 4);
      },
    },
  ],
});
