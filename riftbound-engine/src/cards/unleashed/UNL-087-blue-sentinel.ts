import { registerCard } from '../../engine/script';
import type { TriggerDef } from '../../engine/script';

// [Shield 2]. Os seus efeitos de hold por segurar aqui disparam uma vez a mais. Quando eu seguro, [Add] [A] no início
// da sua próxima Main Phase.
// - "Efeitos de hold" (383.4.d): gatilhos "quando eu/você seguro/segura" controlados por você quando você segura este
//   campo — os de unidades, da lenda e do próprio campo (Grove of the God-Willow) — inclusive o meu (RiftJudge #9697,
//   #10155, #10814). Não dá ponto a mais (#10378). Cada instância soma (Svellsongur copiando: #11631). Também as
//   habilidades de conquista que o Skyfall of Areion faz valer como hold (ev.aliasOf).
// - Aura.triggerExtra (núcleo do motor; inclui o Hunt, efeito de hold, 823.1.b) faz o gatilho disparar de novo; "aqui" = o campo em que estou quando o hold acontece.
// - O [Add] é um gatilho atrasado que adiciona recursos: resolve assim que é finalizado, sem pilha (429.2).
const ADD: TriggerDef = {
  on: 'mainStart',
  label: 'Blue Sentinel: [Add] [A]',
  immediate: true,
  resolve: function* (c) {
    c.g.addResources(c.p, 0, ['any']);
    c.g.say(`${c.g.pname(c.p)} adiciona 1 power (Blue Sentinel).`, c.p);
  },
};
registerCard({
  code: 'UNL-087',
  keywords: { shield: 2 },
  auras: [
    {
      triggerExtra: (g, src, ev, _trig, ctrl) => {
        if (ev.type !== 'hold' && ev.aliasOf !== 'hold') return 0;
        const i = g.bfIndex(src);
        return i >= 0 && ev.bf === i && ev.player === src.controller && ctrl === src.controller ? 1 : 0;
      },
    },
  ],
  triggers: [
    {
      on: 'hold',
      label: '[Add] [A] no início da sua próxima Main Phase',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.addDelayed({ controller: c.p, sourceId: c.self.id, on: 'mainStart', once: true, cond: (cc, ev) => ev.player === cc.p, ability: ADD });
        c.g.say(`Blue Sentinel: ${c.g.pname(c.p)} adiciona [A] no início da próxima Main Phase.`, c.p);
      },
    },
  ],
});
