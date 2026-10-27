import { registerCard } from '../../engine/script';
// RAD-154 Last Caress
// "The next unit you play this turn (even from face down) can be played to any battlefield. When you play it, [Buff] it."
// Efeito nextPlay 'unit' com flag 'anyBf' (Engine.anyBfNext): vale para a próxima unidade jogada, inclusive escondida
// (que pode ir a qualquer campo, não só ao dela), e é consumido ao jogá-la; o Buff é um gatilho atrasado dessa jogada.
registerCard({
  code: 'RAD-154',
  keywords: { reaction: true },
  spell: {
    label: 'Last Caress',
    resolve: function* (c) {
      const g = c.g;
      const effId = g.addEffect({ player: c.p, nextPlay: 'unit', flag: 'anyBf', until: 'turn' }).id;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'play',
        once: true,
        untilTurn: g.turn,
        cond: (cc, ev) => (ev.nextFx || []).includes(effId),
        ability: {
          label: 'Last Caress: Buff na unidade jogada',
          resolve: function* (cc) {
            const u = cc.ev?.obj;
            if (u && u.zone === 'board') cc.g.buff(u, cc.p);
          },
        },
      });
    },
  },
});
