import { registerCard, type AbilityDef } from '../../engine/script';

// Quando eu seguro (hold), no início da sua próxima fase principal, você pode mover uma unidade inimiga para este campo.
// - A resolução do gatilho de hold cria um efeito atrasado (359.3.e.16) que dispara no início da sua próxima fase
//   principal (evento mainStart), mesmo que eu já tenha saído do tabuleiro.
// - "Este campo" é o campo do hold, vindo da condição do gatilho (359.3.f.3) e fixado ao criar o atrasado
//   (359.3.f.3.a); guardado como índice (nunca Obj, por causa da cópia da IA).
// - "Você pode": o jogador decide se põe o gatilho atrasado na pilha (383; patch notes do Unleashed); a unidade inimiga
//   é alvo, escolhida ao pô-lo na pilha (355.10), entre as que não estão nesse campo (355.4.a).
registerCard({
  code: 'UNL-050',
  triggers: [
    {
      on: 'hold',
      label: 'No início da sua próxima fase principal: pode mover uma unidade inimiga para cá',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        const bf = c.ev!.bf as number;
        const p = c.p;
        const move: AbilityDef = {
          label: `mover uma unidade inimiga para ${g.name(g.bfs[bf].objId)}`,
          optional: `mover uma unidade inimiga para ${g.name(g.bfs[bf].objId)}?`,
          targets: [
            {
              prompt: `Iascylla: mover qual unidade inimiga para ${g.name(g.bfs[bf].objId)}?`,
              filter: (cc, o) => o.controller !== cc.p && cc.g.bfIndex(o) !== bf,
            },
          ],
          resolve: function* (cc) {
            const u = cc.targets[0][0];
            if (u) cc.g.moveUnits([u], { t: 'bf', i: bf }, cc.p);
          },
        };
        g.addDelayed({ controller: p, sourceId: c.self.id, on: 'mainStart', cond: (cc, ev) => ev.player === p, ability: move, once: true });
        g.say(`Iascylla: no início da próxima fase principal de ${g.pname(p)}, poderá mover uma unidade inimiga para ${g.name(g.bfs[bf].objId)}.`, p);
      },
    },
  ],
});
