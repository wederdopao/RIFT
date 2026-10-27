import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Deathknell: você pode jogar uma unidade com custo de no máximo [3] e no máximo [Rune] do seu descarte, ignorando o
// custo.
// - "Você pode" no começo do efeito: decidido ao pôr o gatilho na pilha (383.3.a).
// - A unidade é alvo (355.12; o descarte é público, 355.10.a), escolhida ao pôr o gatilho na pilha, entre as unidades
//   do seu descarte com custo impresso de até 3 de energia e até 1 power (efeitos que olham o custo usam o impresso:
//   RiftJudge #4992). Na resolução, se ela ainda estiver lá, é jogada ignorando o custo (custos adicionais, como
//   Accelerate, continuam opcionais: 419.3.b).
// - Local: sua base ou um campo que você controla. Morrer sozinho num campo que você controla não tira o controle
//   antes de o Deathknell resolver (RiftJudge #9329, #10510, #11226); quem atacava ainda não controla o campo (#10948).
registerCard({
  code: 'SFD-165',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: jogar uma unidade barata do descarte',
      optional: 'Jogar uma unidade (até [3] e [Rune]) do seu descarte, ignorando o custo?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [
        {
          prompt: 'Glasc Mixologist: jogar qual unidade do seu descarte?',
          kind: 'trash',
          filter: (c, o) => {
            if (o.owner !== c.p || o.zone !== 'trash' || !c.g.isUnit(o)) return false;
            const d = c.g.data(o);
            return d.energy <= 3 && d.power <= 1;
          },
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.zone === 'trash') yield* c.g.playFromEffect(c.p, u, E(0));
      },
    },
  ],
});
