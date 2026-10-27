import { registerCard } from '../../engine/script';
import type { AbilityDef } from '../../engine/script';
import { NO_COST, type Obj, type P } from '../../engine/types';

// Spell (com errata), Hidden. Escolha um campo de batalha. Um oponente revela a mão. Você pode escolher uma unidade dela.
// Ele joga essa unidade naquele campo, ignorando todo e qualquer custo. Se ele fizer isso, então faça isto: atordoe-a.
// - O campo é alvo (355.9.a), escolhido ao jogar; jogado a partir de Hidden, tem de ser o campo onde estava (811.1.d.2).
// - A unidade da mão não é alvo (a mão não é pública, 355.10.a): você a escolhe na resolução, depois da revelação (por
//   isso a jogada é obrigatória para ele, 128.6). Quem joga é o oponente: a jogada é dele (gatilhos "quando você joga"
//   dele disparam). O campo escolhido vale como local permitido (355.2.b), mas restrições de local (Mageseeker Warden)
//   impedem e a instrução é ignorada (358.3.a).
// - "Ignorando todo e qualquer custo": custo total [0], inclusive custos não padrão (356.5.a); ele ainda escolhe os
//   custos adicionais opcionais (Accelerate...), que saem de graça.
// - "If they do, then do this:" é gatilho reflexivo (387, 388): vai para a pilha depois que o spell termina de resolver
//   e atordoa aquela unidade (não é escolha) se ela ainda for o mesmo objeto no tabuleiro.
registerCard({
  code: 'UNL-139',
  keywords: { hidden: true },
  spell: {
    label: 'Bone Skewer',
    targets: [{ prompt: 'Bone Skewer: escolha um campo de batalha', kind: 'battlefield' }],
    resolve: function* (c) {
      const g = c.g;
      const bfo = c.targets[0][0];
      const i = bfo ? g.bfOf(bfo) : -1;
      if (i < 0) return;
      const op = (1 - c.p) as P;
      const hand = g.pl[op].hand.map((id) => g.objs[id]);
      g.say(`${g.pname(op)} revela a mão: ${hand.length ? hand.map((o) => g.name(o)).join(', ') : '(vazia)'}.`, op);
      const units = hand.filter((o) => g.isUnit(o));
      if (!units.length) return;
      const [k] = yield* g.ask(c.p, 'choose', `Bone Skewer: escolha uma unidade da mão de ${g.pname(op)} para ele jogar em ${g.name(bfo)} (ou nenhuma)`, [
        ...units.map((o) => ({ id: o.id, label: g.name(o), obj: o.id })),
        { id: 'none', label: 'Nenhuma' },
      ]);
      if (k === 'none') return;
      const u: Obj = g.objs[k];
      yield* g.playFromEffect(op, u, NO_COST, { t: 'bf', i }, { allFree: true });
      if (u.zone !== 'board') return; // ele não jogou (local proibido, jogada impedida)
      const uid = u.id;
      const ver = u.zoneVersion;
      const reflex: AbilityDef = {
        label: `atordoar ${g.name(u)}`,
        resolve: function* (cc) {
          const x = cc.g.objs[uid];
          if (x && x.zone === 'board' && x.zoneVersion === ver) cc.g.stun(x, cc.p);
        },
      };
      g.pending.push({ controller: c.p, sourceId: c.self.id, ability: reflex, ev: { type: 'play' }, label: reflex.label, reflexive: true });
    },
  },
});
