import { registerCard } from '../../engine/script';

// Red Brambleback. Accelerate. Seus efeitos de conquista por conquistar aqui disparam uma vez a mais. Quando eu conquisto,
// dê [Buff] a uma unidade aliada.
// - Efeitos de conquista: "quando eu conquisto" das unidades presentes, "quando você conquista" e os do campo/atrasados
//   que se referem ao jogador que conquista (383.4.c), inclusive o meu próprio e o Hunt (823.1.b), e os de hold transformados em conquista
//   (Skyfall of Areion: RiftJudge #9537, #11010 — o evento-espelho de hold com aliasOf 'conquer'). Ao segurar, as de
//   conquista que o Skyfall faz disparar (espelho de conquista com aliasOf 'hold') não são "por conquistar aqui".
//   Só na conquista deste campo, comigo nele (RiftJudge #10126). Motor: Aura.triggerExtra.
// - O Buff vai para qualquer unidade sua (+1 se ela não tem buff).
registerCard({
  code: 'UNL-029',
  keywords: { accelerate: true },
  auras: [
    {
      triggerExtra: (g, src, ev, _from, ctrl) =>
        (ev.aliasOf ?? ev.type) === 'conquer' && ev.player === ctrl && src.zone === 'board' && src.controller === ctrl && g.bfIndex(src) >= 0 && g.bfIndex(src) === ev.bf ? 1 : 0,
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'Buff numa unidade aliada',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      targets: [{ prompt: 'Red Brambleback: dar Buff a qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
