import { registerCard, type AbilityDef, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Quando eu ataco, revele a runa do topo do seu deck de runas e recicle-a. Conforme o domínio:
// Fury — 2 de dano a uma unidade inimiga aqui e 1 a todas as outras inimigas aqui; Mind — compre 1;
// Order — atordoe (Stun) uma unidade inimiga.
// "Do one of the following" é um gatilho reflexivo (regra 387.1): o efeito do domínio vai para a pilha depois da
// revelação, e a unidade inimiga é escolhida (alvo, com Deflect) ao finalizá-lo (riftjudge FAQ #7212).
/** Gatilho reflexivo (regra 387): item pendente que vai para a pilha depois que o efeito atual terminar de resolver. */
function reflexive(c: Ctx, ability: AbilityDef) {
  c.g.pending.push({ controller: c.p, sourceId: c.self.id, ability, ev: c.ev ?? { type: 'attack' }, label: ability.label, reflexive: true });
}
const here = (c: Ctx, o: Obj) => {
  const i = c.g.bfIndex(c.self);
  return i >= 0 && c.g.bfIndex(o) === i;
};
const FURY: AbilityDef = {
  label: 'Fury: 2 de dano numa unidade inimiga aqui e 1 nas outras inimigas aqui',
  targets: [{ prompt: 'Twisted Fate (Fury): 2 de dano em qual unidade inimiga aqui?', filter: (c, o) => o.controller !== c.p && here(c, o) }],
  // se o alvo ficar ilegal, a instrução de 1 nas outras inimigas aqui ainda vale (359.3.e.5)
  alwaysResolve: true,
  resolve: function* (c) {
    const g = c.g;
    const t = c.targets[0][0];
    const chosen = c.item?.targetIds[0]?.[0];
    const i = g.bfIndex(c.self);
    const others = i >= 0 ? g.unitsAtBf(i).filter((u) => u.controller !== c.p && u.id !== chosen) : [];
    if (t) g.dealDamage(t, 2, c.self);
    for (const u of others) g.dealDamage(u, 1, c.self);
  },
};
const MIND: AbilityDef = {
  label: 'Mind: comprar 1',
  resolve: function* (c) {
    yield* c.g.draw(c.p, 1);
  },
};
const ORDER: AbilityDef = {
  label: 'Order: atordoar uma unidade inimiga',
  targets: [{ prompt: 'Twisted Fate (Order): atordoar qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
  resolve: function* (c) {
    const t = c.targets[0][0];
    if (t) c.g.stun(t, c.p);
  },
};
registerCard({
  code: 'OGN-200',
  triggers: [
    {
      on: 'attack',
      label: 'Revelar a runa do topo e aplicar o efeito do domínio',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const s = g.pl[c.p];
        yield* g.beforeReveal(c.p, c.p, 'runeDeck'); // novo (SFD): "se você fosse revelar" (Void Hatchling)
        if (!s.runeDeck.length) {
          g.say('Twisted Fate: o deck de runas está vazio.', c.p);
          return;
        }
        const rune = g.objs[s.runeDeck[0]];
        const dom = g.data(rune).domains[0];
        g.say(`Twisted Fate revela ${g.name(rune)} e a recicla.`, c.p);
        g.recycleCard(rune);
        const next = dom === 'Fury' ? FURY : dom === 'Mind' ? MIND : dom === 'Order' ? ORDER : null;
        if (next) reflexive(c, next);
        else g.say(`Twisted Fate: ${dom} não tem efeito.`, c.p);
      },
    },
  ],
});
