import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equipamento: Equip [Body]. Texto de efeito (vale para a unidade equipada): quando eu conquisto, me dê um Buff.
// O texto de efeito é acrescentado ao texto da unidade (regras 136.2.c e 434.1.c): "eu" é a unidade equipada e quem
// controla o gatilho é o controlador dela (regra 718.5.e: pode ser outro jogador). Dispara para a unidade que estava
// no campo na conquista (regra 383.4.c.2.a).
// Gatilho no texto de efeito (CardScript.equipped.triggers): c.self = a unidade equipada, c.p = o controlador dela,
// c.gear = este equipamento; dispara se a unidade estava no campo (ev.units, regra 383.4).
registerCard({
  code: 'SFD-108',
  equipCost: E(0, 'Body'),
  equipped: {
    triggers: [
      {
        on: 'conquer',
        label: 'Conquista: Buff na unidade equipada',
        cond: (c, ev) => {
          if (!(ev.units || []).includes(c.self.id)) return false;
          (ev.eqVer ||= {})[c.self.id] = c.self.zoneVersion;
          return true;
        },
        resolve: function* (c) {
          if (c.self.zone === 'board' && c.self.zoneVersion === c.ev!.eqVer?.[c.self.id]) c.g.buff(c.self, c.p);
        },
      },
    ],
  },
});
