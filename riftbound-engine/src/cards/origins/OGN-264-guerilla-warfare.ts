import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Devolva até duas cartas com Hidden do seu descarte para a mão. Neste turno você pode esconder ignorando custos.
// O descarte é público: as cartas são alvos escolhidos ao jogar (regras 355.10.a e 355.13 — "até duas" aceita zero).
// A segunda instrução não depende dos alvos: vale mesmo se eles saírem do descarte (regra 359.3.e.5).
// "Carta com [Hidden]" = carta que tem a palavra-chave (Engine.kw, em qualquer zona). Não pelo texto: Ember Monk e
// Noxus Saboteur citam [Hidden] sem ter a palavra-chave (regra 811).
const hasHidden = (c: Ctx, o: Obj) => !!c.g.kw(o).hidden;

registerCard({
  code: 'OGN-264',
  spell: {
    label: 'Guerilla Warfare',
    alwaysResolve: true,
    targets: [
      {
        prompt: 'Guerilla Warfare: devolver até 2 cartas com Hidden do seu descarte para a mão',
        kind: 'trash',
        filter: (c, o) => o.owner === c.p && o.zone === 'trash' && o.id !== c.self.id && hasHidden(c, o),
        min: 0,
        max: 2,
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      for (const o of c.targets[0] || []) {
        if (o.zone !== 'trash') continue;
        g.toZone(o, 'hand');
        g.say(`${g.name(o)} volta do descarte para a mão de ${g.pname(c.p)}.`, c.p);
      }
      g.addEffect({ player: c.p, flag: 'hideFree', until: 'turn' });
      g.say(`Neste turno, ${g.pname(c.p)} pode esconder cartas sem pagar.`, c.p);
    },
  },
});
