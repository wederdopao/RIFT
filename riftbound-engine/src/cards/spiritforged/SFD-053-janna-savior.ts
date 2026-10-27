import { registerCard } from '../../engine/script';

// [Reaction]. Quando você me joga, cure as suas unidades aqui; depois mova até uma unidade inimiga daqui para a base
// dela (texto com errata). "Aqui" é o local da Janna na resolução (RiftJudge FAQ #3321); a unidade inimiga é alvo
// e pode ser nenhuma (regra 355.13; FAQ #7071) — a cura acontece de qualquer jeito.
registerCard({
  code: 'SFD-053',
  keywords: { reaction: true },
  onPlay: [
    {
      label: 'Curar as suas unidades aqui e mover até uma inimiga daqui para a base',
      alwaysResolve: true,
      targets: [
        {
          prompt: 'Janna: mover qual unidade inimiga daqui para a base dela? (opcional)',
          min: 0,
          max: 1,
          filter: (c, o) => o.controller !== c.p && c.self.zone === 'board' && c.g.locEq(o.loc, c.self.loc),
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return; // sem local, "aqui" não existe
        const here = c.self.loc!;
        const mine = g.unitsAt(here).filter((u) => u.controller === c.p && u.damage > 0);
        for (const u of mine) u.damage = 0;
        if (mine.length) g.say(`Janna cura ${mine.map((u) => g.name(u)).join(', ')}.`, c.p);
        const e = c.targets[0]?.[0];
        if (e && e.zone === 'board' && e.controller !== c.p && g.locEq(e.loc, here)) g.moveUnits([e], { t: 'base', p: e.controller }, c.p);
      },
    },
  ],
});
