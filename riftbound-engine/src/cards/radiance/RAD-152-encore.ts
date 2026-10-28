import { registerCard, type Ctx, type TargetSpec } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';
// RAD-152 Encore — "Choose two — Deal 2 to a unit. / Play two 1 [Might] Recruit unit tokens. / Give up to two units each
// +1 [Might] this turn. / Look at the top 2 cards of your Main Deck, draw 1 and recycle the other."
// Modos e alvos ("a unit", "up to two units") são escolhidos ao jogar (355.3, 355.5); um alvo que fica inválido só anula
// a instrução dele (359.3.e.5). "Draw 1" entre as olhadas é comprar (dispara "quando você compra"; como Called Shot).
type Mode = 'dmg' | 'recruits' | 'might' | 'look';
const LABEL: Record<Mode, string> = {
  dmg: '2 de dano em uma unidade',
  recruits: 'Jogar duas fichas Recruit de 1 Might',
  might: 'Até duas unidades com +1 Might neste turno',
  look: 'Olhar 2 do topo, comprar 1 e reciclar a outra',
};
const SPEC: Partial<Record<Mode, TargetSpec>> = {
  dmg: { prompt: 'Encore: 2 de dano em qual unidade?' },
  might: { prompt: 'Encore: até duas unidades (+1 Might neste turno)', min: 0, max: 2 },
};
const modesOf = (c: Ctx): Mode[] => c.data.modes || [];
registerCard({
  code: 'RAD-152',
  spell: {
    label: 'Encore',
    alwaysResolve: true,
    prepare: function* (c) {
      const g = c.g;
      // modo com alvo obrigatório sem candidato não pode ser escolhido
      const opts = (Object.keys(LABEL) as Mode[]).filter((m) => m !== 'dmg' || g.targetCandidates(c, SPEC.dmg!).length > 0);
      if (opts.length < 2) return false;
      const picks = yield* g.ask(c.p, 'choose', 'Encore: escolha dois', opts.map((m) => ({ id: m, label: LABEL[m] })), 2, 2);
      c.data.modes = (Object.keys(LABEL) as Mode[]).filter((m) => picks.includes(m)); // na ordem impressa
      return c.data.modes.length === 2;
    },
    // sem modos (conferir se dá para jogar): nenhum alvo obrigatório
    targets: (c) => modesOf(c).filter((m) => SPEC[m]).map((m) => SPEC[m]!),
    resolve: function* (c) {
      const g = c.g;
      let t = 0;
      for (const m of modesOf(c)) {
        if (m === 'dmg') {
          const u = c.targets[t++]?.[0];
          if (u) g.dealDamage(u, 2, c.self);
        } else if (m === 'might') {
          for (const u of c.targets[t++] || []) g.giveMight(u, 1, 'turn');
        } else if (m === 'recruits') {
          const loc = yield* chooseTokenLoc(c, 'Encore: jogar as Recruits onde?');
          if (loc) for (let k = 0; k < 2; k++) yield* g.playTokenG('TOK-RECRUIT', c.p, loc);
        } else {
          const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 2));
          if (!top.length) continue;
          const [id] = yield* g.ask(c.p, 'choose', 'Encore: qual carta comprar? (a outra é reciclada)', top.map((x) => ({ id: x, label: g.name(x), obj: x })));
          const pick = g.objs[id];
          if (pick && pick.zone === 'mainDeck') {
            g.toZone(pick, 'hand');
            g.emit({ type: 'draw', player: c.p, obj: pick });
            g.say(`${g.pname(c.p)} compra 1 (Encore).`, c.p);
          }
          const rest = top.filter((x) => x !== id && g.objs[x].zone === 'mainDeck').map((x) => g.objs[x]);
          if (rest.length) yield* g.recycleCards(rest, { by: c.p });
        }
      }
    },
  },
});
