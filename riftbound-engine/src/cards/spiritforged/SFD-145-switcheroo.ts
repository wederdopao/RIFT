import { registerCard } from '../../engine/script';

// Hidden. Action. Troque o Might de duas unidades no mesmo campo de batalha neste turno.
// Trocar (regra 433): cria um aumento num e uma redução no outro até os valores se inverterem, pela duração
// ("neste turno"); usa o Might atual na resolução, com Shield/Assault ativos, e buffs/equipamentos ficam onde estão
// (FAQ riftjudge #2144, #11334, #11507). Valores iguais: nada muda (433.1.c). Se as duas não estiverem mais no mesmo
// campo na resolução, a troca não pode ser feita.
registerCard({
  code: 'SFD-145',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Switcheroo',
    targets: [
      { prompt: 'Switcheroo: primeira unidade (num campo de batalha)', filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.unitsAtBf(c.g.bfIndex(o)).length >= 2 },
      {
        prompt: 'Switcheroo: segunda unidade (no mesmo campo)',
        filter: (c, o) => {
          const a = c.targets[0]?.[0];
          return !!a && o.id !== a.id && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(a);
        },
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const [a] = c.targets[0];
      const [b] = c.targets[1] || [];
      if (!a || !b || a.zone !== 'board' || b.zone !== 'board') return;
      const i = g.bfIndex(a);
      if (i < 0 || i !== g.bfIndex(b)) return g.say('Switcheroo: as unidades não estão mais no mesmo campo de batalha.');
      const ma = g.might(a);
      const mb = g.might(b);
      if (ma === mb) return g.say(`Switcheroo: ${g.name(a)} e ${g.name(b)} já têm o mesmo Might.`);
      g.giveMight(a, mb - ma);
      g.giveMight(b, ma - mb);
    },
  },
});
