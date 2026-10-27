import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Você pode pagar [Calm] como custo adicional para me jogar.
// Quando você me joga, se pagou o custo adicional, [Stun] uma unidade inimiga.
// Quando eu seguro (hold), da próxima vez que você jogar uma unidade neste turno, prepare-a e dê [Buff] nela.
// - O custo adicional opcional é escolhido ao jogar (355.1.a); o "se pagou" é condição do gatilho (como Blast Corps
//   Cadet). A unidade inimiga é alvo, escolhida ao pôr o gatilho na pilha.
// - O hold cria um efeito atrasado de uso único que expira no fim do turno (untilTurn). "Jogar uma unidade" inclui fichas
//   de unidade, que também são jogadas (185.2.a). A unidade jogada é lida do evento (sem guardar Obj no atrasado).
registerCard({
  code: 'UNL-052',
  optionalCosts: [{ label: 'Pagar [Calm] a mais para atordoar uma unidade inimiga?', cost: E(0, 'Calm'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Atordoar uma unidade inimiga (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [{ prompt: 'Nami, Headstrong: atordoar qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
    {
      on: 'hold',
      label: 'A próxima unidade que você jogar neste turno: preparar e dar Buff',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        const p = c.p;
        g.addDelayed({
          controller: p,
          sourceId: c.self.id,
          on: 'play',
          cond: (cc, ev) => ev.player === p && !ev.spell && !!ev.obj && cc.g.isUnit(ev.obj),
          once: true,
          untilTurn: g.turn,
          ability: {
            label: 'preparar e dar Buff na unidade jogada',
            resolve: function* (cc) {
              const u = cc.ev?.obj;
              if (!u || u.zone !== 'board') return;
              cc.g.ready(u, cc.p);
              cc.g.buff(u, cc.p);
            },
          },
        });
        g.say(`Nami, Headstrong: a próxima unidade que ${g.pname(p)} jogar neste turno será preparada e receberá Buff.`, p);
      },
    },
  ],
});
