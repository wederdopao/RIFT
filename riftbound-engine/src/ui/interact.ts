// Lógica pura da mesa (sem estado de interface): onde uma carta foi solta, que opção do motor isso escolhe, e a
// previsão de combate (estilo LoR). Nada aqui muda a partida: só lê o motor.
import type { Engine, ChainItem } from '../engine/engine';
import type { Decision, Loc, Obj, P } from '../engine/types';

/** Lugar onde a carta foi solta: um campo, uma base e/ou uma carta. */
export interface Drop {
  loc?: Loc;
  obj?: string;
}

/** A opção da decisão que corresponde ao lugar/carta onde a carta foi solta (ou null). */
export function matchDrop(eng: Engine, d: Decision, drop: Drop): string | null {
  // só perguntas de alvo ou de local (nunca custo, "qual Buff gastar", nem a decisão principal)
  if (d.root || !d.purpose) return null;
  if (drop.obj) {
    const o = d.options.find((x) => x.obj === drop.obj);
    if (o) return o.id;
  }
  const l = drop.loc;
  if (!l || d.purpose !== 'location') return null;
  if (l.t === 'base') {
    const lbl = eng.locName(l);
    return d.options.find((x) => !x.obj && x.label === lbl)?.id ?? null;
  }
  const bfObj = eng.bfs[l.i]?.objId;
  if (!bfObj) return null;
  const name = eng.name(bfObj);
  return d.options.find((x) => x.obj === bfObj)?.id ?? d.options.find((x) => !x.obj && x.label === name)?.id ?? null;
}

/** Destinos válidos para mover estas unidades juntas agora (mesmo filtro do motor: custo aplicado pagável). */
export function moveTargets(eng: Engine, p: P, ids: string[]): Loc[] {
  const us = ids.map((id) => eng.objs[id]).filter(Boolean);
  if (!us.length) return [];
  return eng.moveDests(us).filter((l) => {
    const ac = eng.moveAppliedCost(us, l, p);
    return !(ac.energy || ac.power.length) || eng.canPay(p, ac);
  });
}

export const locKey = (l: Loc) => (l.t === 'base' ? `base:${l.p}` : `bf:${l.i}`);

/** Todos os alvos de um item da pilha (inclusive os das execuções extras de Repeat). */
export function chainTargets(it: ChainItem): string[] {
  const out = new Set<string>();
  for (const g of it.targetIds || []) for (const id of g) out.add(id);
  for (const g of it.repeatIds || []) for (const id of g) out.add(id);
  for (const r of it.moreRepeats || []) for (const g of r.ids) for (const id of g) out.add(id);
  return [...out];
}

// ───────────── previsão de combate ─────────────
/** Um resultado possível do combate quando ele depende de uma escolha (ex.: Tank e "por último" na mesma unidade). */
export interface CombatAlt {
  /** o que foi escolhido para chegar aqui (ex.: "Garen: Tank") */
  label: string;
  dies: Set<string>;
  result: 'atk' | 'def' | 'tie' | 'none';
}
export interface CombatPreview {
  bf: number;
  atk: P;
  def: P;
  aM: number;
  dM: number;
  /** morrem em qualquer caso */
  dies: Set<string>;
  /** morrem só em alguns dos resultados possíveis */
  maybe: Set<string>;
  /** quem fica com o campo se ninguém mexer em nada: atacante, defensor, empate (atacantes voltam) ou ninguém */
  result: 'atk' | 'def' | 'tie' | 'none';
  /** resultados diferentes conforme a escolha de quem atribui o dano (vazio: só um resultado) */
  alts: CombatAlt[];
  live: boolean;
}

const isTank = (eng: Engine, u: Obj, ignore: boolean) => !!eng.kw(u).tank && !ignore;
const isLast = (eng: Engine, u: Obj) => !!eng.kw(u).backline || !!eng.script(u).damageLast?.(eng, u);

/**
 * Quem atribui o dano escolhe a ordem entre iguais: a previsão supõe o melhor para ele (matar o máximo). Unidade com
 * Tank e "por último" ao mesmo tempo: quem atribui escolhe qual vale (465.2.c.8–9) — devolve um resultado por escolha
 * (até duas unidades assim: 4 combinações), cada um com o rótulo do que foi escolhido.
 */
function assignVariants(eng: Engine, by: P, amount: number, targets: Obj[], assigners: Obj[]): { label: string; dies: Set<string> }[] {
  const ignore = assigners.some((s) => !!eng.script(s).ignoreTank?.(eng, s));
  const left = targets.filter((u) => !eng.cantTakeDamage(u));
  const amb = left.length > 1 ? left.filter((u) => isTank(eng, u, ignore) && isLast(eng, u)).slice(0, 2) : [];
  const out: { label: string; dies: Set<string> }[] = [];
  for (let mask = 0; mask < 1 << amb.length; mask++) {
    const pr = new Map<string, number>();
    const picks: string[] = [];
    for (const u of left) {
      const k = amb.indexOf(u);
      if (k >= 0) {
        const last = !!(mask & (1 << k));
        pr.set(u.id, last ? 2 : 0);
        picks.push(`${eng.name(u)}: ${last ? 'por último' : 'Tank'}`);
      } else pr.set(u.id, isTank(eng, u, ignore) ? 0 : isLast(eng, u) ? 2 : 1);
    }
    const dies = new Set<string>();
    let rem = amount;
    const order = left.map((u) => ({ u, p: pr.get(u.id)!, need: eng.lethalNeed(u, by) })).sort((a, b) => a.p - b.p || a.need - b.need);
    for (const t of order) {
      if (rem <= 0) break;
      // a prioridade obriga a dar dano letal à de cima antes de passar para a próxima
      if (t.need === Infinity) break;
      if (rem >= t.need) dies.add(t.u.id);
      rem -= t.need;
    }
    out.push({ label: picks.join(', '), dies });
  }
  return out;
}

function preview(eng: Engine, i: number, A: P, atk: Obj[], def: Obj[], live: boolean): CombatPreview | null {
  if (!atk.length || !def.length) return null;
  const D = (1 - A) as P;
  // fora do combate as unidades ainda não têm o papel: põe o papel só durante a conta (o Might do motor soma
  // Assault/Shield pelo papel, tanto no dano quanto no letal) e devolve como estava
  const saved = [...atk, ...def].map((u) => [u, u.role] as const);
  let aM = 0;
  let dM = 0;
  let va: { label: string; dies: Set<string> }[] = [];
  let vd: { label: string; dies: Set<string> }[] = [];
  try {
    for (const u of atk) u.role = 'attacker';
    for (const u of def) u.role = 'defender';
    aM = atk.reduce((s, u) => s + eng.combatMight(u), 0);
    dM = def.reduce((s, u) => s + eng.combatMight(u), 0);
    va = assignVariants(eng, A, aM, def, atk);
    vd = assignVariants(eng, D, dM, atk, def);
  } finally {
    for (const [u, r] of saved) u.role = r;
  }
  const outcomes: CombatAlt[] = [];
  for (const a of va)
    for (const d of vd) {
      const dies = new Set([...a.dies, ...d.dies]);
      const aLeft = atk.filter((u) => !dies.has(u.id)).length;
      const dLeft = def.filter((u) => !dies.has(u.id)).length;
      const result = aLeft && dLeft ? 'tie' : aLeft ? 'atk' : dLeft ? 'def' : 'none';
      outcomes.push({ label: [a.label, d.label].filter(Boolean).join(' · '), dies, result });
    }
  // resultados iguais (mesmas mortes e mesmo dono do campo) contam como um só
  const sig = (o: CombatAlt) => `${o.result}|${[...o.dies].sort().join(',')}`;
  const distinct: CombatAlt[] = [];
  for (const o of outcomes) if (!distinct.some((x) => sig(x) === sig(o))) distinct.push(o);
  const all = outcomes.map((o) => o.dies);
  const sure = new Set([...all[0]].filter((id) => all.every((s) => s.has(id))));
  const maybe = new Set(all.flatMap((s) => [...s]).filter((id) => !sure.has(id)));
  return { bf: i, atk: A, def: D, aM, dM, dies: sure, maybe, result: distinct[0].result, alts: distinct.length > 1 ? distinct : [], live };
}

/** Combate em andamento num campo (atacante e defensor já definidos). */
export function liveCombat(eng: Engine): CombatPreview | null {
  const sd = eng.showdown;
  if (!sd || !sd.combat || sd.attacker === undefined || sd.defender === undefined) return null;
  return preview(eng, sd.bf, sd.attacker, eng.unitsAtBf(sd.bf, sd.attacker), eng.unitsAtBf(sd.bf, sd.defender), true);
}

/** Se `p` mover estas unidades para o campo i: o combate que abriria (só olhando a mesa de agora). */
export function moveCombat(eng: Engine, p: P, ids: string[], i: number): CombatPreview | null {
  const movers = ids.map((id) => eng.objs[id]).filter((u) => u && !(u.loc?.t === 'bf' && u.loc.i === i));
  const atk = [...eng.unitsAtBf(i, p).filter((u) => !movers.includes(u)), ...movers];
  const def = eng.unitsAtBf(i, (1 - p) as P);
  return preview(eng, i, p, atk, def, false);
}
