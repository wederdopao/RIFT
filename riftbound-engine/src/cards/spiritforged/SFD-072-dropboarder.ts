import { registerCard } from '../../engine/script';

// Quando você me joga, se você controla dois ou mais gear, prepare-me.
// O "se" faz parte da condição do gatilho (regra 383.2.a.1). Fichas e gear anexados contam.
registerCard({
  code: 'SFD-072',
  triggers: [
    {
      on: 'play',
      label: 'Preparar-me (dois ou mais gear)',
      cond: (c, ev) => ev.obj?.id === c.self.id && c.g.gearOf(c.p).length >= 2,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self, c.p);
        c.g.say(`${c.g.name(c.self)} fica pronta.`);
      },
    },
  ],
});
