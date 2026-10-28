import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';

// "Once each turn, while I'm at a battlefield, you may pay [1][Rune] less to play a gear."
// "you may": o jogador escolhe usar ao jogar o gear (oferecido como opção da jogada, Aura.grantOptionalCosts, com
// [1] a menos e um pip a menos). Só conta como usado se ele aceitou — jogar um gear de graça (ignorando os custos) ou
// recusar não gasta o "uma vez por turno". Objeto novo (saiu e voltou) conta de novo.
const key = (g: Engine, src: Obj) => `${g.turn}:${src.zoneVersion}`;
const can = (g: Engine, src: Obj, card: Obj, p: P) =>
  src.zone === 'board' && p === src.controller && g.bfIndex(src) >= 0 && g.kind(card) === 'gear' && src.data?.oriOnce !== key(g, src);
registerCard({
  code: 'RAD-068',
  auras: [
    {
      grantOptionalCosts: (g, src, card, p) => {
        if (!can(g, src, card, p)) return undefined;
        const id = src.id; // closures guardam o id (a IA simula numa cópia)
        const use = (g2: Engine) => {
          const o = g2.objs[id];
          if (o) o.data = { ...(o.data || {}), oriOnce: key(g2, o) };
          return 1;
        };
        return [
          {
            label: 'Orianna, Mechanical Marvel: pagar [1][Rune] a menos por este gear (uma vez por turno)?',
            flag: `ori:${id}`,
            energyMod: -1,
            maxPowerCut: () => 1,
            powerCut: (c) => use(c.g),
          },
        ];
      },
    },
  ],
});
