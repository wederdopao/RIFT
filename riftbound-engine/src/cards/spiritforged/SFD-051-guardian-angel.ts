import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E } from '../helpers';

// Equipment. [Equip][Calm]. Efeito: se eu (a unidade equipada) fosse morrer, mate o Guardian Angel em vez disso.
// Cure-me, exaura-me e chame-me de volta (recall) para a base de quem me controla (RiftJudge FAQ #760).
// Substituição obrigatória (texto de efeito: self = a unidade, o equipamento vem como último argumento). Com dois
// Guardian Angels só um é usado, à escolha do controlador (FAQ #9026); com Zhonya's Hourglass, o controlador escolhe
// qual aplica (#834). Os outros equipamentos continuam anexados (#11624).
registerCard({
  code: 'SFD-051',
  equipCost: E(0, 'Calm'),
  equipped: {
    deathReplacements: [
      {
        label: 'matar o Guardian Angel no lugar (a unidade volta curada e exausta para a base)',
        applies: (g, self, dying, gear?: Obj) =>
          !!gear && gear.zone === 'board' && gear.attachedTo === self.id && dying.id === self.id && dying.zone === 'board',
        apply: function* (g, self, dying, gear?: Obj) {
          if (!gear) return false;
          g.say(`${g.name(gear)} salva ${g.name(dying)}.`);
          if (gear.zone === 'board') yield* g.killG(gear, 'é destruído no lugar');
          dying.damage = 0;
          dying.exhausted = true;
          g.recall(dying);
          return true;
        },
      },
    ],
  },
});
