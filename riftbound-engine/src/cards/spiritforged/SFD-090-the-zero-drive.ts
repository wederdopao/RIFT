import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import { NO_COST, type Obj } from '../../engine/types';
import { E } from '../helpers';

// Equip [1][Mind]. [3][Mind], Banir esta carta: Jogue todas as unidades banidas com esta carta, ignorando os custos.
// (Use só se desanexada.) Texto de efeito (vale para a unidade equipada): [Deathknell] — Bana-me.
// - O Deathknell é da unidade (texto anexado, 434.1.c): dispara com as informações dela de antes de morrer (323.4,
//   428.1.a.1.b), mesmo que a Zero Drive tenha saído junto; é controlado por quem controlava a unidade. Na resolução, a
//   unidade é banida do descarte (FAQ riftjudge #887 e #1727) e fica registrada como "banida com" esta Zero Drive
//   (c.gear) — inclusive unidade do oponente, que vai para o banimento do dono e ainda pode ser jogada (FAQ #4975).
// - A habilidade ativada é texto de regras: inativa enquanto anexada (718.2; FAQ #8969 e #6043). Banir a carta é custo;
//   a lista de unidades é olhada antes (359.3.e.13). Jogar "ignorando os custos": custo base 0 (356.1.b.1); quem joga
//   escolhe a ordem e o local de cada uma.
interface Rec {
  gv: number; // zoneVersion da Zero Drive quando baniu (outro objeto se ela mudou de zona)
  id: string;
  v: number; // zoneVersion da unidade no banimento
}
const banishedWith = (g: Engine, zd: Obj): Obj[] =>
  ((zd.data?.zd as Rec[]) || [])
    .filter((r) => r.gv === zd.zoneVersion && g.objs[r.id]?.zone === 'banish' && g.objs[r.id].zoneVersion === r.v)
    .map((r) => g.objs[r.id]);

registerCard({
  code: 'SFD-090',
  equipCost: E(1, 'Mind'),
  activated: [
    {
      label: 'Banir esta carta: jogar as unidades banidas com ela',
      cost: E(3, 'Mind'),
      condition: (g, self) => !self.attachedTo,
      canPayExtra: (c) => c.self.zone === 'board' && !c.self.attachedTo,
      extraCost: function* (c) {
        if (c.self.zone !== 'board' || c.self.attachedTo) return false;
        c.data.units = banishedWith(c.g, c.self).map((u) => ({ id: u.id, v: u.zoneVersion }));
        c.g.banishObj(c.self);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const still = (x: { id: string; v: number }) => g.objs[x.id].zone === 'banish' && g.objs[x.id].zoneVersion === x.v;
        const list = ((c.data.units as { id: string; v: number }[]) || []).filter(still);
        let us = list.map((x) => g.objs[x.id]);
        if (!us.length) return g.say('The Zero Drive: nenhuma unidade banida com ela.', c.p);
        if (us.length > 1) us = yield* g.chooseOrder(c.p, 'The Zero Drive: em que ordem jogar as unidades?', us);
        for (const u of us) {
          const x = list.find((y) => y.id === u.id)!;
          if (still(x)) yield* g.playFromEffect(c.p, u, NO_COST);
        }
      },
    },
  ],
  // texto de efeito: c.self = a unidade, c.p = quem a controla, c.gear = esta Zero Drive
  equipped: {
    triggers: [
      {
        on: 'die',
        zone: 'self',
        label: 'Deathknell: banir-me',
        cond: (c, ev) => ev.obj?.id === c.self.id,
        prepare: function* (c) {
          c.data.v = c.self.zoneVersion; // a unidade no descarte, como morreu
          return true;
        },
        resolve: function* (c) {
          const g = c.g;
          const u = c.self;
          if (u.zone !== 'trash' || u.zoneVersion !== c.data.v) return; // ficha deixou de existir; carta saiu do descarte
          g.banishObj(u);
          const zd = c.gear;
          if (!zd) return;
          const d = (zd.data ||= {});
          (d.zd ||= []).push({ gv: zd.zoneVersion, id: u.id, v: u.zoneVersion } as Rec);
        },
      },
    ],
  },
});
