import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// (Unidades com 0 [Might] podem conquistar e segurar — lembrete; o motor já trata.) Quando você me joga, compre 1.
// [Deathknell] Escolha um oponente. Ele revela a mão. Você pode olhar as cartas viradas para baixo dele neste turno.
// Ganhe 1 XP.
// - No 1x1 o oponente é o único (a escolha é automática). Revelar a mão: o registro mostra as cartas (como Mindsplitter).
// - "Olhar as viradas neste turno": efeito do jogador até o fim do turno (flag 'seeFacedown'); as que já estão viradas
//   são mostradas agora, e o motor mostra também as que ele esconder depois, ainda neste turno (Engine.hide).
registerCard({
  code: 'UNL-053',
  onPlay: [
    {
      label: 'Comprar 1',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: o oponente revela a mão, você olha as viradas dele neste turno e ganha 1 XP',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const o = (1 - c.p) as P;
        const hand = g.pl[o].hand.map((id) => g.objs[id]);
        g.say(`${g.pname(o)} revela a mão: ${hand.length ? hand.map((x) => g.name(x)).join(', ') : 'vazia'}.`, o);
        g.addEffect({ player: c.p, flag: 'seeFacedown', until: 'turn' });
        const fd = g.bfs.flatMap((b) => b.facedown.map((id) => g.objs[id])).filter((x) => x.controller === o);
        // só quem olha (e o dono das cartas) lê os nomes; na visão filtrada do espectador fica só a contagem
        g.sayTo(
          [0, 1],
          `${g.pname(c.p)} olha as cartas viradas de ${g.pname(o)}: ${fd.length ? fd.map((x) => `${g.name(x)} (${g.locName(x.loc)})`).join(', ') : 'nenhuma'}.`,
          `${g.pname(c.p)} olha as cartas viradas de ${g.pname(o)} (${fd.length}).`,
          c.p,
        );
        g.gainXp(c.p, 1, c.self);
      },
    },
  ],
});
