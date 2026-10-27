import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento: Equip [Body]. Texto de efeito (vale para a unidade equipada): quando eu seguro (hold), marque 1 ponto.
// O texto de efeito é acrescentado ao texto da unidade (regras 136.2.c e 434.1.c): "eu" é a unidade equipada e quem
// controla o gatilho é o controlador dela. Dispara se a unidade estava no campo no hold (regra 383.4.d.2.a).
// Gatilho no texto de efeito (CardScript.equipped.triggers): c.self = a unidade equipada, c.p = o controlador dela,
// c.gear = este equipamento; dispara se a unidade estava no campo (ev.units, regra 383.4).
registerCard({
  code: 'SFD-115',
  equipCost: E(0, 'Body'),
  equipped: {
    triggers: [
      {
        on: 'hold',
        label: 'Hold: marcar 1 ponto',
        cond: (c, ev) => {
          if (!(ev.units || []).includes(c.self.id)) return false;
          (ev.eqVer ||= {})[c.self.id] = c.self.zoneVersion;
          return true;
        },
        resolve: function* (c) {
          c.g.gainPoints(c.p, 1, `${c.g.name(c.gear!)} (hold)`);
        },
      },
    ],
  },
});
