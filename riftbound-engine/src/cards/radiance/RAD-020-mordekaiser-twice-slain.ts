import { registerCard } from '../../engine/script';

// Accelerate. Assault 3. Uma vez por turno, se eu fosse morrer, pode matar uma unidade aliada para me curar, me exaurir e me chamar de volta.
registerCard({
  code: 'RAD-020',
  keywords: { accelerate: true, assault: 3 },
  deathReplacements: [
    {
      label: 'matar uma unidade sua para Mordekaiser ser curado, exaurido e chamado de volta',
      optional: true,
      applies: (g, self, dying) =>
        dying.id === self.id && self.data?.mordTurn !== g.turn && g.units().some((u) => u.controller === self.controller && u.id !== self.id),
      apply: function* (g, self, dying) {
        const others = g.units().filter((u) => u.controller === self.controller && u.id !== self.id);
        if (!others.length) return false;
        const [v] = yield* g.chooseObj(self.controller, 'Mordekaiser: matar qual unidade sua?', others);
        self.data = { ...(self.data || {}), mordTurn: g.turn };
        yield* g.killG(v);
        dying.damage = 0;
        dying.exhausted = true;
        g.recall(dying);
        g.say(`${g.name(dying)} escapa da morte e volta exausto para a base.`, self.controller);
        return true;
      },
    },
  ],
});
