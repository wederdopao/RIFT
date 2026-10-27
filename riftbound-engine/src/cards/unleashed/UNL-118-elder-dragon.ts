import { registerCard } from '../../engine/script';
import type { TargetSpec } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Qualquer quantidade do seu dano basta para matar unidades inimigas.
// Quando você me joga, escolha até uma unidade inimiga em cada local. Cause 1 a elas.
// - Passiva (Aura.anyDamageLethal): muda o dano letal das unidades inimigas com dano marcado por você (142.3.b, 142.4.c);
//   não muda quanto dano é causado: dano todo prevenido não conta (FAQ oficial do Unleashed: Counter Strike; RiftJudge
//   #9499). Vale para qualquer fonte que você controle (spell, habilidade, combate) e não para as suas unidades
//   (#8684); dano de campo de batalha não é seu (#9622). No combate, 1 de dano já é letal na atribuição
//   (riftboundfaq.com, Elder Dragon #combat-damage-assignment; #10416). Dano seu já marcado vira letal quando eu entro
//   (#lethal-damage-timing).
// - Gatilho de jogada: uma escolha de "até uma" por local (as duas bases e cada campo), cada uma com a sua restrição de
//   local; quem saiu daquele local antes de resolver não é afetado (FAQ oficial do Unleashed: Flash). Finaliza mesmo
//   sem alvo nenhum (riftboundfaq.com, #zero-target-finalization).
const locs = (n: number): Loc[] => [{ t: 'base', p: 0 }, { t: 'base', p: 1 }, ...Array.from({ length: n }, (_, i) => ({ t: 'bf', i }) as Loc)];

registerCard({
  code: 'UNL-118',
  auras: [{ anyDamageLethal: (g, src, unit, p) => src.zone === 'board' && p === src.controller && unit.controller !== src.controller }],
  onPlay: [
    {
      label: 'Causar 1 a até uma unidade inimiga em cada local',
      targets: (c) =>
        locs(c.g.bfs.length).map(
          (l): TargetSpec => ({
            prompt: `Elder Dragon: até uma unidade inimiga em ${c.g.locName(l)} (1 de dano)`,
            filter: (cc, o) => o.controller !== cc.p && cc.g.locEq(o.loc, l),
            min: 0,
            max: 1,
          }),
        ),
      resolve: function* (c) {
        for (const grp of c.targets) for (const u of grp) if (u.zone === 'board') c.g.dealDamage(u, 1, c.self);
      },
    },
  ],
});
