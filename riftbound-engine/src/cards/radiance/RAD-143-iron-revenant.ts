import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-143 Iron Revenant
import { DOMAINS } from '../../engine/types';
// "Spend this Power only to play units or gear": parte restrita do pool (adds.only).
const inTrash = (c: { g: any; p: 0 | 1 }) =>
  c.g.pl[c.p].trash.map((id: string) => c.g.objs[id]).filter((o: any) => o && (c.g.kind(o) === 'unit' || c.g.kind(o) === 'gear'));
registerCard({
  code: 'RAD-143',
  activated: [
    {
      label: 'Banir uma unidade ou gear do seu descarte, exaurir: adicionar 1 power',
      timing: 'reaction',
      exhaustSelf: true,
      isAdd: true,
      canPayExtra: (c) => inTrash(c).length > 0,
      extraCost: function* (c) {
        const opts = inTrash(c);
        if (!opts.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Iron Revenant: banir qual carta do descarte?', opts);
        if (!o) return false;
        c.g.banishObj(o);
        return true;
      },
      adds: { power: [[...DOMAINS]], only: ['unit', 'gear'] },
      resolve: function* () {},
    },
  ],
});
