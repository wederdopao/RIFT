import { registerCard, type AbilityDef } from '../../engine/script';
import { NO_COST } from '../../engine/types';

// Tank. Quando eu ataco, você pode jogar um Equipment com custo de energia até [2], ignorando o custo dele. Se fizer,
// então faça isto: equipe-o em mim (errata de 14/01/2026).
// - "Você pode" no início: decidido ao pôr o gatilho na pilha (383.3.a); o Equipment vem da mão (419.1.a) e, como a mão
//   não é pública, não é alvo: é escolhido na resolução (355.10.a).
// - "Custo de energia até [2]": o custo de energia impresso da carta. Ignorar o custo não impede custos adicionais.
// - "Se fizer, então faça isto: equipe-o em mim" é um gatilho reflexivo (387.1, 388): anexar é outro item da pilha
//   (FAQ oficial do Spiritforged, 14/01/2026). Ele é criado quando o Equipment é jogado, antes de o Equipment entrar e
//   disparar o Quick-Draw; o Quick-Draw fica acima e resolve antes, e Rell termina com o Equipment (ruling de Doowan
//   citado no Joutes: Rell + Long Sword + Aphelios). Anexar aqui não é a habilidade Equip.
registerCard({
  code: 'SFD-024',
  keywords: { tank: true },
  triggers: [
    {
      on: 'attack',
      label: 'Jogar um Equipment de custo até 2 de graça e equipá-lo em mim',
      optional: 'jogar um Equipment da mão com custo de energia até 2, ignorando o custo, e equipá-lo em Rell?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const cands = g.pl[c.p].hand.map((id) => g.objs[id]).filter((o) => g.isEquipment(o) && g.data(o).energy <= 2);
        if (!cands.length) {
          g.say('Rell, Magnetic: nenhum Equipment com custo até 2 na mão.', c.p);
          return;
        }
        const [eq] = yield* g.chooseObj(c.p, 'Rell, Magnetic: jogar qual Equipment?', cands);
        yield* g.playFromEffect(c.p, eq, NO_COST);
        if (eq.zone !== 'board') return; // não foi jogado: "se fizer" não vale
        const rell = c.self;
        const eqVer = eq.zoneVersion;
        const rellVer = rell.zoneVersion;
        const reflex: AbilityDef = {
          label: `anexar ${g.name(eq)} a mim`,
          resolve: function* (cc) {
            // "o" Equipment e "eu" têm de ser os mesmos objetos (saiu do tabuleiro = outro objeto)
            if (eq.zone !== 'board' || eq.zoneVersion !== eqVer || rell.zone !== 'board' || rell.zoneVersion !== rellVer) return;
            cc.g.attach(eq, rell, cc.p);
          },
        };
        // vai para a pilha já, abaixo dos gatilhos de jogada do Equipment (Quick-Draw), que ainda estão pendentes
        yield* g.finalizeAbility(c.p, rell, reflex, 'trigger', c.ev);
      },
    },
  ],
});
