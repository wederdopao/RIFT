import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';
import type { Engine } from '../../engine/engine';
import type { Obj, P } from '../../engine/types';
// Spell (com errata): jogue uma ficha de unidade Sand Soldier de 2 de Might para cada Equipamento que você controla.
// Então faça isto: prepare até duas delas.
// - Os Equipamentos são contados na resolução. Cada ficha é jogada como uma unidade (regra 185.2.a): o local de cada
//   uma é a sua base ou um campo que você controla (regra 355.2.a), escolhido por você.
// - "Then do this:" é um gatilho reflexivo (regras 387-388; FAQ oficial do Spiritforged: cria um item novo na pilha,
//   que dá aos jogadores a chance de reagir). Ele vai para a pilha depois que o spell termina de resolver e escolhe
//   como alvo até duas delas ao ser posto na pilha (355.10, 355.13; 355.5.b: não é escolha do spell). Prepara na
//   resolução as que continuarem válidas. Mudou (microdetalhes UNL): os gatilhos das fichas (Weaponmaster do Azir)
//   dispararam antes, quando elas entraram; vão para a pilha antes dele, na ordem de adição (337.1.b; FAQ #9917).
const equipCount = (g: Engine, p: P) => g.gearOf(p).filter((o) => g.data(o).tags.includes('Equipment')).length;
registerCard({
  code: 'SFD-198',
  spell: {
    label: 'Arise!',
    resolve: function* (c) {
      const g = c.g;
      const n = equipCount(g, c.p);
      const made: Obj[] = [];
      if (!n) g.say('Arise!: você não controla nenhum Equipamento.', c.p);
      for (let k = 0; k < n; k++) {
        const loc = yield* chooseTokenLoc(c, `Arise!: onde jogar o Sand Soldier ${k + 1} de ${n}?`);
        if (!loc) break;
        // caça UNL: com Zilean, Time Mage, a ficha a mais também é "delas" (regra 375; FAQ #9917, #11565)
        for (const t of yield* g.playTokensG('TOK-SAND', c.p, loc)) if (t.zone === 'board') made.push(t);
      }
      const vers = new Map(made.map((t) => [t.id, t.zoneVersion]));
      const reflex: AbilityDef = {
        label: 'preparar até duas das fichas Sand Soldier',
        targets: made.length
          ? [
              {
                prompt: 'Arise!: preparar até duas destas fichas',
                min: 0,
                max: 2,
                filter: (_cc, o) => vers.get(o.id) === o.zoneVersion && o.zone === 'board',
              },
            ]
          : undefined,
        resolve: function* (cc) {
          for (const t of cc.targets[0] || []) cc.g.ready(t, cc.p);
        },
      };
      g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
    },
  },
});
