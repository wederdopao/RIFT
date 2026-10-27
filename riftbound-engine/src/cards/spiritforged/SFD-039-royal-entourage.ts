import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você me joga, prepare ou exaura uma lenda. A lenda é alvo (regra 355.10.a: "Ready a legend" é alvo), de
// qualquer jogador (RiftJudge FAQ #121); preparar ou exaurir é decidido na resolução (não é "escolha um").
registerCard({
  code: 'SFD-039',
  onPlay: [
    {
      label: 'Preparar ou exaurir uma lenda',
      targets: [
        {
          prompt: 'Royal Entourage: preparar ou exaurir qual lenda?',
          kind: 'object',
          cands: (c) => ([0, 1] as P[]).flatMap((p) => c.g.legendsOf(p)),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const leg = c.targets[0][0];
        if (!leg || leg.zone !== 'legend') return;
        const [m] = yield* g.ask(c.p, 'choose', `Royal Entourage: preparar ou exaurir ${g.name(leg)}?`, [
          { id: 'ready', label: `Preparar ${g.name(leg)}`, obj: leg.id },
          { id: 'exhaust', label: `Exaurir ${g.name(leg)}`, obj: leg.id },
        ]);
        if (m === 'ready') {
          g.ready(leg, c.p); // ready() do motor aceita lendas (evento 'ready', Mageseeker Warden)
        } else {
          leg.exhausted = true;
          g.say(`${g.name(leg)} é exaurida.`, c.p);
        }
      },
    },
  ],
});
