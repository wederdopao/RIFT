// Helpers locais do lote Radiance (A): banir o topo e poder jogá-lo, escolher modo.
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

/**
 * "Banish the top card of your Main Deck. Until your next Ending Phase, you may play that card."
 * A carta fica banida com data.playBy/playUntil; o motor oferece "Jogar" (via 'banished') enquanto valer.
 */
export function banishTopPlayable(c: Ctx): Obj | undefined {
  const g = c.g;
  const p = c.p;
  const s = g.pl[p];
  if (!s.mainDeck.length) return undefined;
  const o = g.objs[s.mainDeck[0]];
  g.banishObj(o);
  o.data = { ...(o.data || {}), playBy: p, playUntil: g.active === p ? g.turn : g.turn + 1 };
  return o;
}

/** Pergunta um modo ("Choose one"). Devolve undefined se não houver modo possível. */
export function* chooseMode(c: Ctx, prompt: string, opts: { id: string; label: string }[]) {
  if (!opts.length) return undefined;
  if (opts.length === 1) return opts[0].id;
  const [m] = yield* c.g.ask(c.p, 'choose', prompt, opts);
  return m as string;
}

/** Unidades e gear aliados no tabuleiro (exceto `except`). */
export const friendlyPermanents = (c: Ctx, except?: Obj) =>
  c.g.board().filter((o) => o.controller === c.p && o !== except && (c.g.isUnit(o) || c.g.isGear(o)));
