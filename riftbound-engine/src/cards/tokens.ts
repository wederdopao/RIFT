import { registerCard } from '../engine/script';
import { DOMAINS } from '../engine/types';

// Fichas com habilidade própria (regra 187).
// Gold (187.5): "[Reaction] Kill this, [Tap]: [Add] [A]". O pagamento automático já usa a Gold pelo caminho próprio
// (planPay/payG, com a energia extra da Renata Glasc, Chem-Baroness); esta habilidade é para ativar à mão a qualquer
// momento em que haja prioridade — por exemplo, para disparar "quando você usa uma habilidade ativada de um gear"
// (Prize of Progress). O [A] fica no pool e esvazia como qualquer recurso.
registerCard({
  code: 'TOK-GOLD',
  activated: [
    {
      label: 'Matar, exaurir: adicionar 1 power de qualquer domínio',
      timing: 'reaction',
      isAdd: true,
      exhaustSelf: true,
      killSelf: true,
      notAutoPay: true,
      adds: { power: [[...DOMAINS]] },
      resolve: function* (c) {
        const gx = c.g.goldExtra(c.p); // Renata Glasc, Chem-Baroness: "your Gold [Add] an additional [1]"
        if (gx) c.g.addResources(c.p, gx, []);
      },
    },
  ],
});

// ── novos (UNL, lote motor): fichas de campo de batalha ──
// Brush (187.8): "Bird, Cat, Dog, Poro, and Ivern units here have +1 [Might]" e "When you score here, you may replace
// this with the battlefield it replaced." (substituir/trocar de volta, 438.7). "Você" num campo = quem o controla (190.6.d).
const BRUSH_TAGS = ['Bird', 'Cat', 'Dog', 'Poro', 'Ivern'];
registerCard({
  code: 'TOK-BRUSH',
  auras: [
    {
      might: (g, src, t) => {
        const i = g.bfOf(src);
        return i >= 0 && t.zone === 'board' && g.isUnit(t) && g.bfIndex(t) === i && BRUSH_TAGS.some((x) => g.hasTag(t, x)) ? 1 : 0;
      },
    },
  ],
  triggers: [
    {
      on: ['conquer', 'hold'],
      label: 'Trocar de volta pelo campo que foi substituído',
      optional: 'trocar o Brush de volta pelo campo que ele substituiu?',
      cond: (c, ev) => {
        const i = c.g.bfOf(c.self);
        return i >= 0 && ev.bf === i && c.g.bfs[i].controller === ev.player && c.g.replacedCards(c.self).length > 0;
      },
      resolve: function* (c) {
        yield* c.g.swapBackG(c.p, c.self);
      },
    },
  ],
});
// Baron Pit (187.9): "Units can move here from anywhere."
registerCard({
  code: 'TOK-BARONPIT',
  auras: [{ allowMove: (g, src, _u, _from, to) => to.t === 'bf' && to.i === g.bfOf(src) }],
});

// ── novo (Radiance): Bomb — "[Deploy] [Deathknell] — Deal 2 to an enemy unit here and kill all other Bombs you control
// here." (Core Rules, definição da ficha Bomb: o Deathknell é palavra-chave — Detonation Amplifier o dobra) ──
registerCard({
  code: 'TOK-BOMB',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Bomb: 2 de dano a uma unidade inimiga aqui e matar suas outras Bombs aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.loc?.t === 'bf',
      resolve: function* (c) {
        const ev = c.ev!;
        const i = (ev.loc as any).i as number;
        const ctrl = (ev.controller ?? c.p) as any;
        const enemies = c.g.board().filter((o) => c.g.isUnit(o) && o.controller !== ctrl && c.g.bfIndex(o) === i);
        if (enemies.length) {
          const [u] = yield* c.g.chooseObj(ctrl, 'Bomb: 2 de dano em qual unidade inimiga?', enemies);
          if (u) c.g.dealDamage(u, 2, c.self);
        }
        const others = c.g.board().filter((o) => o.code === 'TOK-BOMB' && o.controller === ctrl && c.g.bfIndex(o) === i);
        if (others.length) yield* c.g.killG(others);
      },
    },
  ],
});
