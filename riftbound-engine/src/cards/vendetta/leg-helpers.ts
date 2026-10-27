// Auxiliares dos lotes de lendas/campos de Vendetta e Radiance (VEN-139..166, RAD-139..167).
import type { Ctx } from '../../engine/script';
import { chooseDestination } from '../helpers';

/** Custo "me exaurir" pago dentro da instrução (lenda). */
export function* exhaustMe(c: Ctx) {
  if (c.self.exhausted) return false;
  c.self.exhausted = true;
  return true;
}
/** Custo "Disempower me". */
export function* disempowerMe(c: Ctx) {
  if (!c.self.empowered) return false;
  c.g.disempower(c.self);
  return true;
}
/** Escolhe uma unidade aliada (no tabuleiro) e a move (destino escolhido). */
export function* moveFriendlyUnit(c: Ctx, prompt = 'Mover qual unidade sua?') {
  const g = c.g;
  const us = g.units().filter((u) => u.controller === c.p);
  if (!us.length) return;
  const [u] = yield* g.chooseObj(c.p, prompt, us);
  if (!u) return;
  const to = yield* chooseDestination(c, u, `Mover ${g.name(u)} para onde?`);
  if (to) g.moveUnits([u], to.t === 'base' ? { t: 'base', p: u.controller } : to, c.p);
}
/** Pede um campo (índice) entre os dados; -1 se não há. */
export function* chooseBf(c: Ctx, prompt: string, idx: number[]) {
  const g = c.g;
  if (!idx.length) return -1;
  const [id] = yield* g.ask(c.p, 'choose', prompt, idx.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
  return Number(id);
}
