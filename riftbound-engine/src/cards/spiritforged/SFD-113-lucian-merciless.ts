import { registerCard } from '../../engine/script';

// Weaponmaster. Na primeira vez em cada turno que eu conquisto, me prepare.
// "A primeira vez": contada ao disparar; voltar ao tabuleiro faz um objeto novo (conta de novo).
registerCard({
  code: 'SFD-113',
  keywords: { weaponmaster: true },
  triggers: [
    {
      on: 'conquer',
      label: 'Primeira conquista no turno: me preparar',
      cond: (c, ev) => {
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const d = (c.self.data ||= {});
        const key = `${c.g.turn}:${c.self.zoneVersion}`;
        if (d.lucianConquer === key) return false;
        d.lucianConquer = key;
        return true;
      },
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
  ],
});
