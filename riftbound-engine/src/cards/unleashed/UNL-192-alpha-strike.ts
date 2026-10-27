import { registerCard } from '../../engine/script';
// Signature Spell (Master Yi): [Action]. Escolha uma unidade aliada. Ela causa dano igual ao Might dela dividido entre
// unidades inimigas nos campos. Então, para cada unidade que isto matar, faça isto: ganhe 1 XP.
// - Alvos: a unidade aliada e as inimigas do dano dividido, todos escolhidos ao jogar (355.14.a-b); no máximo tantas
//   inimigas quanto o Might da aliada naquele momento (355.14.c). A divisão é decidida na resolução, pelo menos 1 em cada
//   (355.14.e-f), com o Might da aliada na resolução; com menos dano que alvos, o jogador tira alvos (355.14.h).
// - A unidade causa o dano (417.6.b.3): não é dano de spell, sem Bonus Damage (712).
// - Inimiga que saiu dos campos (foi para a base) continua escolhida mas não é afetada (359.3.e.5; FAQ oficial do
//   Unleashed, Alpha Strike e Repulse). Se a aliada deixou de ser alvo válido, não há dano (359.3.e.12).
// - "Para cada unidade que isto matar, faça isto": um gatilho reflexivo por morte causada por este dano (387.1.a), cada
//   um "ganhe 1 XP"; as mortes vêm na limpeza logo depois da resolução (atribuídas a este item, 428.5.c).
registerCard({
  code: 'UNL-192',
  keywords: { action: true },
  spell: {
    label: 'Alpha Strike',
    targets: (c) => {
      const f = c.targets?.[0]?.[0];
      const n = f ? Math.max(0, c.g.might(f)) : 99;
      return [
        { prompt: 'Alpha Strike: qual unidade aliada causa o dano?', filter: (cc, o) => o.controller === cc.p },
        {
          prompt: `Alpha Strike: dividir ${f ? n : 'o'} dano entre quais unidades inimigas nos campos?`,
          filter: (cc, o) => o.controller !== cc.p && cc.g.bfIndex(o) >= 0,
          min: n >= 1 ? 1 : 0,
          max: n,
        },
      ];
    },
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const f = c.targets[0]?.[0];
      if (!f || f.zone !== 'board') return;
      const n = Math.max(0, g.might(f));
      const foes = c.targets[1] || [];
      if (!n || !foes.length) return;
      const itemId = c.item?.id;
      const turn = g.turn;
      if (itemId)
        g.addDelayed({
          controller: c.p,
          sourceId: c.self.id,
          on: 'die',
          once: false,
          untilTurn: turn,
          cond: (cc, ev) => !!ev.killedBy && ev.killedBy.item === itemId && !ev.killedBy.combat && cc.g.isUnit(ev.obj),
          ability: {
            label: 'Alpha Strike: ganhar 1 XP (unidade morta)',
            resolve: function* (cc) {
              cc.g.gainXp(cc.p, 1, cc.self);
            },
          },
        });
      yield* g.dealSplit(c.p, f, n, foes, 'Alpha Strike', true);
    },
  },
});
