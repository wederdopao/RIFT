import { registerCard } from '../../engine/script';
import { T } from '../helpers';
// Action. Escolha uma unidade. Mate-a da próxima vez que ela receber dano neste turno.
// [Legion] – em vez disso, mate-a agora.
registerCard({
  code: 'OGN-254',
  keywords: { action: true },
  spell: {
    label: 'Noxian Guillotine',
    targets: [T.anyUnit('Noxian Guillotine: qual unidade?')],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      if (g.legion(c.self, c.p)) {
        yield* g.killG(u);
        return;
      }
      const ver = u.zoneVersion;
      const uid = u.id; // id, não o objeto: a cópia da IA reaproveita estas funções (ver Delayed)
      g.say(`${g.name(u)} morre da próxima vez que receber dano neste turno.`, c.p);
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'damage',
        cond: (cc, ev) => ev.unit?.id === uid && cc.g.objs[uid].zoneVersion === ver,
        ability: {
          label: 'Matar a unidade que recebeu dano',
          resolve: function* (cc) {
            const x = cc.g.objs[uid];
            if (x.zone === 'board' && x.zoneVersion === ver) yield* cc.g.killG(x);
          },
        },
        once: true,
        untilTurn: g.turn,
      });
    },
  },
});
