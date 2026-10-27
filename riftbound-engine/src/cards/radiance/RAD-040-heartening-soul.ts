import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Ao jogar, prepare uma lenda aliada. Lendas aliadas têm "[Tap]: dê +3 de Might a uma unidade neste turno".
registerCard({
  code: 'RAD-040',
  onPlay: [
    {
      label: 'Preparar uma lenda aliada',
      // "ready a friendly legend": a lenda é alvo (355.10.a); com Neeko pode haver mais de uma
      targets: [{ prompt: 'Heartening Soul: preparar qual lenda aliada?', kind: 'object', cands: (c) => c.g.legendsOf(c.p) }],
      resolve: function* (c) {
        const l = c.targets[0][0];
        if (l) c.g.ready(l, c.p);
      },
    },
  ],
  auras: [{ grantActivated: (g, src, holder) => (src.zone === 'board' && g.kind(holder) === 'legend' && holder.controller === src.controller ? [0] : []) }],
  activated: [
    {
      label: 'Exaurir: +3 de Might a uma unidade neste turno',
      exhaustSelf: true,
      condition: (g, self) => g.kind(self) === 'legend', // só as lendas têm a habilidade (a unidade não)
      targets: [T.anyUnit('Heartening Soul: +3 de Might em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
});
