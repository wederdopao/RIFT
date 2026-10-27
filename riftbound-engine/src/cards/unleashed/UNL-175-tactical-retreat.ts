import { registerCard } from '../../engine/script';

// [Reaction]. Escolha uma unidade aliada. Da próxima vez que ela fosse morrer neste turno, cure-a, exaura-a e chame-a de
// volta para a base em vez disso (não é movimento).
// - Substituição atrasada (flag 'retreat' do motor, como Highlander). Vale em qualquer local, inclusive na base
//   (RiftJudge #10096); só a próxima morte (#10096). No combate ela causa o dano dela antes e não conquista (#11854).
// - Custo de matar substituído ainda é pago (357.2.a; RiftJudge #9931), sem Deathknell (808.1.d.1).
registerCard({
  code: 'UNL-175',
  keywords: { reaction: true },
  spell: {
    label: 'Tactical Retreat',
    targets: [{ prompt: 'Tactical Retreat: proteger qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.addEffect({ target: u.id, flag: 'retreat', until: 'turn', player: c.p });
      c.g.say(`${c.g.name(u)} está protegida da próxima morte neste turno.`, c.p);
    },
  },
});
