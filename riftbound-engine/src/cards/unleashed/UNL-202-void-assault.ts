import { registerCard } from '../../engine/script';
import { moveDestinations } from '../helpers';
// Signature Spell (Kha'Zix): mova uma unidade aliada, depois mova uma unidade inimiga. (Se as duas forem para um campo que
// você não controla, você é o atacante.)
// - Os dois movimentos são obrigatórios e em ordem: precisa de uma aliada e de uma inimiga para jogar (RiftJudge #9965,
//   #10481). As unidades e os destinos são escolhidos ao jogar (355.4).
// - Instruções independentes: se a aliada não puder se mover, a inimiga ainda se move (RiftJudge #11529).
// - O lembrete sai das regras: a aliada chega primeiro e disputa o campo; quem disputou primeiro é o atacante (RiftJudge
//   #10026, #11348).
registerCard({
  code: 'UNL-202',
  spell: {
    label: 'Void Assault',
    targets: [
      { prompt: 'Void Assault: mover qual unidade aliada?', filter: (c, o) => o.controller === c.p },
      { prompt: 'Void Assault: depois mover qual unidade inimiga?', filter: (c, o) => o.controller !== c.p },
    ],
    choose: function* (c, ids) {
      const g = c.g;
      for (let k = 0; k < 2; k++) {
        const u = g.objs[ids[k]?.[0]];
        if (!u) return false;
        const dests = moveDestinations(c, u);
        if (!dests.length) return false;
        const [x] = yield* g.ask(
          c.p,
          'choose',
          `Void Assault: mover ${g.describe(u)} para onde?`,
          dests.map((l, j) => ({ id: String(j), label: g.locName(l), obj: l.t === 'bf' ? g.bfs[l.i].objId : undefined })),
        );
        c.data[`dest${k}_${c.rep}`] = dests[Number(x)];
      }
      return true;
    },
    resolve: function* (c) {
      const g = c.g;
      for (let k = 0; k < 2; k++) {
        const u = c.targets[k]?.[0];
        const to = c.data[`dest${k}_${c.rep}`];
        if (u && to && u.zone === 'board') g.moveUnits([u], to, c.p);
      }
    },
  },
});
