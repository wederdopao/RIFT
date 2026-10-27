import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: na primeira vez em cada turno que um jogador joga uma unidade que não é ficha aqui, ele pode mover outra unidade
// que ele controla aqui para a base dela.
// - "Primeira vez" é contada por jogador em cada turno (RiftJudge #12731, #12439): a jogada do oponente não gasta a sua.
//   Conta a jogada mesmo que o gatilho não tenha o que fazer. Fichas nunca contam (#10099, #10351); mover para cá não é
//   jogar. "Aqui" é o local da jogada (ev.playLoc), mesmo que ela entre em outro lugar (Baron Nashor: FAQ do Baron
//   Nashor, Hunters' Circle; 355.2, 369.3).
// - Quem jogou a unidade controla a habilidade e escolhe a outra unidade (alvo, ao finalizar; não pode ser a recém-jogada).
registerCard({
  code: 'UNL-215',
  triggers: [
    {
      on: 'play',
      label: 'Mover outra unidade sua daqui para a base',
      optional: 'mover outra unidade sua deste campo para a base dela?',
      controller: (_g, _src, ev) => (ev.player !== undefined && !ev.spell ? ev.player : null),
      cond: (c, ev) => {
        const g = c.g;
        const i = bfIdx(c);
        const u = ev.obj;
        if (ev.spell || !u || !g.isUnit(u) || u.token || ev.token || (ev.playLoc ?? ev.loc)?.t !== 'bf' || (ev.playLoc ?? ev.loc).i !== i || ev.player !== c.p) return false;
        const d = (c.self.data ||= {});
        if (d.starSpringTurn !== g.turn) d.starSpring = [];
        d.starSpringTurn = g.turn;
        if (d.starSpring.includes(c.p)) return false;
        d.starSpring.push(c.p);
        return g.unitsAtBf(i, c.p).some((x) => x.id !== u.id);
      },
      targets: [
        {
          prompt: 'Star Spring: mover qual outra unidade sua daqui para a base?',
          filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) === bfIdx(c) && o.id !== c.ev?.obj?.id,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
