import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-163 Hunters' Circle
// O 'play' marca "já jogou aqui neste turno" por jogador; o desconto vale para a jogada em andamento neste campo.
registerCard({
  code: 'RAD-163',
  auras: [
    {
      costMod: (g, src, card, p) => {
        const i = g.bfOf(src);
        const l = g.playingLoc;
        if (i < 0 || !l || l.t !== 'bf' || l.i !== i || g.active !== p || !(g.isUnit(card) || g.isGear(card))) return 0;
        const d = src.data?.circle;
        return d && d.turn === g.turn && d.ps.includes(p) ? 0 : -1;
      },
    },
  ],
  triggers: [
    {
      on: 'play',
      label: 'Marcar',
      immediate: true,
      cond: (c, ev) => {
        const l = ev.playLoc ?? ev.loc;
        if (ev.spell || !ev.obj || l?.t !== 'bf' || l.i !== c.g.bfOf(c.self) || c.g.active !== ev.player) return false;
        const d = (c.self.data ||= {});
        if (!d.circle || d.circle.turn !== c.g.turn) d.circle = { turn: c.g.turn, ps: [] };
        if (!d.circle.ps.includes(ev.player)) d.circle.ps.push(ev.player);
        return false;
      },
      resolve: function* () {},
    },
  ],
});
