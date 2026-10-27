import { registerCard } from '../../engine/script';
// Lenda: quando uma unidade sua fica [Mighty] (Might passa de menos de 5 para 5+, regra 709), você pode me exaurir para
// canalizar 1 runa exaurida.
// - Unidade que já entra no tabuleiro com 5+ não "fica" Mighty (RiftJudge #9442); voltar a 5+ quando um -Might expira
//   no fim do turno conta (RiftJudge #11929). Motor: evento 'mighty', checado a cada limpeza.
// - Exaurir é o custo, pago ao pôr o gatilho na pilha (383.3.b).
registerCard({
  code: 'SFD-205',
  triggers: [
    {
      on: 'mighty',
      label: 'Canalizar 1 runa exaurida',
      optional: 'Exaurir Fiora para canalizar 1 runa exaurida?',
      cond: (c, ev) => !!ev.unit && ev.unit.controller === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
