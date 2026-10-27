import { registerCard } from '../../engine/script';

// Katarina, Reckless. Quando você esconde uma carta, me prepare. Quando você joga uma carta virada para baixo, cause 2 de
// dano a uma unidade inimiga.
// - Esconder: evento 'hide' do motor (Engine.hide).
// - Jogar de face para baixo: em qualquer campo, mesmo longe de mim; o alvo é qualquer unidade inimiga (base ou campo): a
//   restrição de Hidden vale só para o próprio card jogado (RiftJudge #12507; 811.1.d). Spell jogado escondido: dispara
//   quando termina de resolver (419.4.a). Obrigatório; com Deflect, pode recusar pagar e o gatilho não vai para a pilha.
registerCard({
  code: 'UNL-023',
  triggers: [
    {
      on: 'hide',
      label: 'Me preparar (você escondeu uma carta)',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
    {
      on: 'play',
      label: '2 de dano numa unidade inimiga',
      cond: (c, ev) => ev.player === c.p && ev.via === 'hidden' && !ev.token,
      targets: [{ prompt: 'Katarina, Reckless: 2 de dano em qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
