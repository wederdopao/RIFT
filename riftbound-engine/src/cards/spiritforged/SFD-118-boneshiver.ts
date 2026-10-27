import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento: Equip [1][Body]. Texto de efeito (vale para a unidade equipada): quando eu conquisto, canalize 1 runa
// exaurida. "Eu" é a unidade equipada e quem controla o gatilho é o controlador dela (regras 136.2.c e 718.5.e).
// Gatilho no texto de efeito (CardScript.equipped.triggers): c.self = a unidade equipada, c.p = o controlador dela,
// c.gear = este equipamento; dispara se a unidade estava no campo (ev.units, regra 383.4).
registerCard({
  code: 'SFD-118',
  equipCost: E(1, 'Body'),
  equipped: {
    triggers: [
      {
        on: 'conquer',
        label: 'Conquista: canalizar 1 runa exaurida',
        cond: (c, ev) => {
          if (!(ev.units || []).includes(c.self.id)) return false;
          (ev.eqVer ||= {})[c.self.id] = c.self.zoneVersion;
          return true;
        },
        resolve: function* (c) {
          c.g.channel(c.p, 1, true);
        },
      },
    ],
  },
});
