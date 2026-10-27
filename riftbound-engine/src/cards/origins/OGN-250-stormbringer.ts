import { registerCard } from '../../engine/script';
// Escolha uma unidade aliada na sua base. Cause dano igual ao Might dela a todas as unidades inimigas num campo
// de batalha; depois mova a sua unidade para lá.
registerCard({
  code: 'OGN-250',
  spell: {
    label: 'Stormbringer',
    targets: [
      { prompt: 'Stormbringer: qual unidade sua na base?', filter: (c, o) => o.controller === c.p && o.loc?.t === 'base' },
      { prompt: 'Stormbringer: em qual campo de batalha?', kind: 'battlefield' },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const bf = c.targets[1]?.[0];
      if (!u || !bf || u.zone !== 'board') return; // sem a unidade, o Might dela é nulo
      const i = g.bfOf(bf);
      const m = Math.max(0, g.might(u));
      // o texto não diz quem causa o dano: a fonte é o próprio spell (regra 417.6.a), então vale Bonus Damage de spell
      for (const e of g.unitsAtBf(i).filter((x) => x.controller !== c.p)) g.dealDamage(e, m, c.self);
      g.moveUnits([u], { t: 'bf', i }, c.p);
    },
  },
});
