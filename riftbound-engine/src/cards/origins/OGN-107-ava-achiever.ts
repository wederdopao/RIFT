import { registerCard } from '../../engine/script';
import { NO_COST, type Obj } from '../../engine/types';
import type { Engine } from '../../engine/engine';
import { E } from '../helpers';

// "Carta com [Hidden]" = carta que tem a palavra-chave (Engine.kw, em qualquer zona). Não pelo texto: Ember Monk e
// Noxus Saboteur citam [Hidden] sem ter a palavra-chave (regra 811).
const hasHidden = (g: Engine, o: Obj) => !!g.kw(o).hidden;

// Quando eu ataco, você pode pagar [Mind] para jogar da mão uma carta com Hidden, ignorando o custo.
// Se for unidade, jogue-a aqui.
// - "Você pode pagar [Mind]": custo-base do gatilho, decidido e pago ao pôr na pilha (regras 383.3.a e 383.3.b).
//   O gatilho dispara mesmo sem carta com Hidden na mão (a mão é informação privada).
// - A carta da mão não é alvo (zona privada, regra 355.10.a): é escolhida na resolução. É jogada da mão, não "a partir
//   de Hidden" (FAQ riftjudge #1918 e #10475), ignorando o timing e o custo (custos adicionais ainda valem, 356.1.b.3).
// - "Aqui" é o local da Ava na resolução (regra 359.3.f.2); se ela não está mais no tabuleiro, uma unidade não tem onde
//   ser jogada (359.3.e.12). Spell que joga ficha de unidade (Sprite Call) a joga aqui (FAQ riftjudge #5628).
registerCard({
  code: 'OGN-107',
  triggers: [
    {
      on: 'attack',
      label: 'Pagar Mind: jogar uma carta com Hidden da mão',
      optional: 'Pagar 1 Mind para jogar da mão uma carta com Hidden, ignorando o custo?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      cost: E(0, 'Mind'),
      resolve: function* (c) {
        const g = c.g;
        const here = c.self.zone === 'board' ? c.self.loc : undefined;
        // unidade só se houver "aqui" e o local for permitido (Mageseeker Warden): senão não há como jogá-la aqui
        const cands = g.pl[c.p].hand
          .map((id) => g.objs[id])
          .filter((o) => hasHidden(g, o) && (!g.isUnit(o) || (!!here && g.playLocOk(c.p, o, here))));
        if (!cands.length) return g.say('Ava Achiever: nenhuma carta com Hidden para jogar.', c.p);
        const [card] = yield* g.chooseObj(c.p, 'Ava Achiever: jogar qual carta com Hidden?', cands);
        if (!card) return;
        if (g.isUnit(card)) yield* g.playFromEffect(c.p, card, NO_COST, here);
        else yield* g.playFromEffect(c.p, card, NO_COST, undefined, { data: here ? { unitLoc: here } : {} });
      },
    },
  ],
});
