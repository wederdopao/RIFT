import { registerCard } from '../../engine/script';

// [Accelerate]. Quando eu me movo de um local, jogue lá uma ficha Sprite de 3 de Might com [Temporary] (exaurida: o
// texto não diz "pronta").
// "Lá" é o local de onde saí, que vem da condição do gatilho e é fixado quando ele dispara (patch notes do Unleashed,
// "Referents"). O local é dado pelo efeito, então vale mesmo num campo que você não controla; restrições de local
// (Mageseeker Warden) continuam valendo (createToken). Enquanto o gatilho está pendente/na pilha o campo que deixei não
// é perdido (RiftJudge #11108, #10369): o Sprite chega antes da limpeza que tiraria o controle.
registerCard({
  code: 'UNL-082',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'move',
      label: 'Jogar um Sprite no local de onde saí',
      cond: (c, ev) => ev.unit?.id === c.self.id && !!ev.from,
      resolve: function* (c) {
        const from = c.ev!.from;
        yield* c.g.playTokenG('TOK-SPRITE', c.p, from, false);
      },
    },
  ],
});
