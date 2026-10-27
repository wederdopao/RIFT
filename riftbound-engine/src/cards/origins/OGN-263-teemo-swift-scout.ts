import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
import type { Engine } from '../../engine/engine';
import { E } from '../helpers';
// Lenda: você pode pagar [1] em vez de [A] (1 power de qualquer domínio) para esconder uma carta com Hidden.
// [1], [Tap]: ponha na sua mão uma unidade Teemo sua que esteja na zona de campeão ou no tabuleiro.
// As duas zonas são públicas: a unidade é alvo, escolhida ao ativar (regras 355.10.a e 355.5).
function teemos(g: Engine, p: 0 | 1): Obj[] {
  const out: Obj[] = [];
  const ch = g.pl[p].champion;
  if (ch) {
    const o = g.objs[ch];
    if (g.isUnit(o) && g.data(o).tags.includes('Teemo')) out.push(o);
  }
  for (const u of g.units()) if (u.owner === p && g.data(u).tags.includes('Teemo')) out.push(u);
  return out;
}
registerCard({
  code: 'OGN-263',
  auras: [{ hideCost: (_g, src, p) => (src.controller === p ? E(1) : undefined) }],
  activated: [
    {
      label: '[1], exaurir: pôr um Teemo seu na mão',
      exhaustSelf: true,
      cost: E(1),
      targets: [
        {
          prompt: 'Teemo: qual unidade Teemo vai para a mão?',
          cands: (c) => teemos(c.g, c.p),
          // na resolução: ainda na zona de campeão ou no tabuleiro, e ainda sua
          filter: (c, o) =>
            o.owner === c.p && (o.zone === 'board' || (o.zone === 'champion' && c.g.pl[c.p].champion === o.id)),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const o = c.targets[0][0];
        if (!o) return;
        if (o.zone === 'board') g.returnToHand(o);
        else {
          g.toZone(o, 'hand');
          g.say(`${g.name(o)} vai da zona de campeão para a mão de ${g.pname(c.p)}.`, c.p);
        }
      },
    },
  ],
});
