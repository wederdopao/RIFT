import { registerCard } from '../../engine/script';
// Lenda: quando você joga uma unidade Mighty (5+ de Might), você pode me exaurir para canalizar 1 runa exaurida.
registerCard({
  code: 'OGN-249',
  triggers: [
    {
      on: 'play',
      label: 'Canalizar 1 runa exaurida',
      optional: 'Exaurir o Volibear para canalizar 1 runa exaurida?',
      cond: (c, ev) =>
        ev.player === c.p && !ev.spell && !!ev.obj && c.g.isUnit(ev.obj) && ev.obj.zone === 'board' && c.g.isMighty(ev.obj) && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
