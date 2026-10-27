// Atalhos para escrever cartas.
import type { CardScript, Ctx, OptionalCost, TargetSpec } from '../engine/script';
import type { ChainItem } from '../engine/engine';
import { DOMAINS, type Cost, type Domain, type Loc, type Obj } from '../engine/types';

export const E = (energy: number, ...power: (Domain | 'any')[]): Cost => ({
  energy,
  power: power.map((d) => (d === 'any' ? [...DOMAINS] : [d])),
});

/** Índice do campo de batalha desta carta de campo. */
export const bfIdx = (c: Ctx) => c.g.bfOf(c.self);

export const atBf = (c: Ctx, o: Obj) => c.g.bfIndex(o) >= 0;
export const friendly = (c: Ctx, o: Obj) => o.controller === c.p;
export const enemy = (c: Ctx, o: Obj) => o.controller !== c.p;

export const T = {
  unitAtBf: (prompt = 'Escolha uma unidade em um campo de batalha'): TargetSpec => ({
    prompt,
    filter: (c, o) => atBf(c, o),
  }),
  friendlyUnit: (prompt = 'Escolha uma unidade sua', exceptSelf = false): TargetSpec => ({
    prompt,
    filter: (c, o) => friendly(c, o) && (!exceptSelf || o.id !== c.self.id),
  }),
  enemyUnit: (prompt = 'Escolha uma unidade inimiga'): TargetSpec => ({ prompt, filter: (c, o) => enemy(c, o) }),
  anyUnit: (prompt = 'Escolha uma unidade'): TargetSpec => ({ prompt }),
};

/** Destinos válidos para "mover uma unidade" por efeito. */
export function moveDestinations(c: Ctx, u: Obj): Loc[] {
  const g = c.g;
  const l = u.loc!;
  const out: Loc[] = [];
  if (l.t === 'base') g.bfs.forEach((_, i) => out.push({ t: 'bf', i }));
  else {
    out.push({ t: 'base', p: u.controller });
    g.bfs.forEach((_, i) => i !== l.i && out.push({ t: 'bf', i }));
  }
  return out;
}

export function* chooseDestination(c: Ctx, u: Obj, prompt: string) {
  const dests = moveDestinations(c, u);
  const ids = yield* c.g.ask(
    c.p,
    'choose',
    prompt,
    dests.map((l, k) => ({ id: String(k), label: c.g.locName(l) })),
  );
  return dests[Number(ids[0])];
}

/**
 * Novo: "você" num campo de batalha é quem o controla (regra 190.6.d); sem controlador, "você" não é ninguém e
 * gatilhos "quando você ... aqui" não disparam. Use em cond: `youHere(c, ev.player)`.
 */
export const youHere = (c: Ctx, p: unknown) => {
  const i = c.g.bfOf(c.self);
  return i >= 0 && c.g.bfs[i].controller !== null && c.g.bfs[i].controller === p;
};

/**
 * Novo: locais onde c.p pode jogar uma ficha de unidade sem local especificado (regras 185.2.a e 355.2.a):
 * a sua base ou um campo que você controla (respeitando auras como Mageseeker Warden).
 */
export function tokenPlayLocs(c: Ctx): Loc[] {
  const g = c.g;
  const locs: Loc[] = [{ t: 'base', p: c.p }];
  g.bfs.forEach((b, i) => b.controller === c.p && locs.push({ t: 'bf', i }));
  return locs.filter((l) => g.playLocOk(c.p, c.self, l));
}

/** Novo: pergunta onde jogar a ficha (só pergunta se houver mais de um local). */
export function* chooseTokenLoc(c: Ctx, prompt: string) {
  const locs = tokenPlayLocs(c);
  if (!locs.length) return undefined;
  const [id] = yield* c.g.ask(
    c.p,
    'choose',
    prompt,
    locs.map((l, j) => ({ id: String(j), label: c.g.locName(l), obj: l.t === 'bf' ? c.g.bfs[l.i].objId : undefined })),
  );
  return locs[Number(id)];
}

// ── XP como custo (Unleashed, lote motor; regras 202, 203.1, 730.2) ──
/**
 * Novo (UNL): "Spend N XP" como custo de habilidade ativada ou de gatilho (custo no começo do efeito = custo base do
 * gatilho, 383.3.b). Espalhe no AbilityDef: `{ ...xpCost(2), label: ..., resolve }`. Com `extraCost` já usado, chame
 * c.g.spendXpG dentro do seu. Ex.: Crowd Favorite ("Spend 2 XP: [Buff] me"), Kha'Zix, Evolving Hunter (gatilho com
 * optional + xpCost(3)).
 */
export const xpCost = (n: number) => ({
  canPayExtra: (c: Ctx) => c.g.canSpendXp(c.p, n),
  extraCost: function* (c: Ctx) {
    return yield* c.g.spendXpG(c.p, n, c.self);
  },
});
/**
 * Novo (UNL): "You may spend N XP as an additional cost to play me/this" (OptionalCost; ctx.data[flag] = true quando
 * pago). Ex.: Conscription, Safety Inspector, Poppy, Defender of the Meek (+ energyMod/adjust se baratear).
 */
export const xpOptionalCost = (n: number, flag: string, label = `Gastar ${n} XP como custo adicional?`): OptionalCost => ({
  label,
  flag,
  canPay: (g, _self, p) => g.canSpendXp(p, n),
  pay: function* (c) {
    return yield* c.g.spendXpG(c.p, n, c.self);
  },
});
/** Novo (UNL): custo de Equip "Spend N XP" (CardScript.equipExtra; Shepherd's Heirloom: "[Equip] — Spend 1 XP"). */
export const xpEquipExtra = (n: number): NonNullable<CardScript['equipExtra']> => ({
  label: `Gastar ${n} XP`,
  canPay: (g, _gear, p) => g.canSpendXp(p, n),
  pay: function* (c) {
    return yield* c.g.spendXpG(c.p, n, c.self);
  },
});

// ── Radiance (Bomb, Show Off) ──
/** "Play a Bomb gear token to a battlefield" (o jogador escolhe o campo). Devolve a ficha. */
export function* playBomb(c: Ctx, prompt = 'Jogar a ficha Bomb em qual campo?', p = c.p): Generator<any, Obj | undefined, any> {
  const g = c.g;
  if (!g.bfs.length) return undefined;
  const [id] = yield* g.ask(p, 'choose', prompt, g.bfs.map((b, i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: b.objId })));
  return g.createToken('TOK-BOMB', p, { t: 'bf', i: Number(id) });
}

export interface ShowOffInfo { code: string; might: number; energy: number; power: number; fromHand: boolean }
/**
 * "[Show Off] X (As you play me, you may reveal X from hand or pick another friendly X.)" — escolha feita enquanto a
 * carta é jogada (gancho `asPlayed`). Use: `asPlayed: showOff((g, o) => g.hasTag(o, 'Mech'))`; depois leia
 * `showedOff(c)` (onPlay/resolve/entersReady: `showedOff({ g, self })`).
 */
export function showOff(filter: (g: Ctx['g'], o: Obj) => boolean = () => true, label = 'Show Off'): NonNullable<CardScript['asPlayed']> {
  return function* (c) {
    const g = c.g;
    const cands = [
      ...g.pl[c.p].hand.map((id: string) => g.objs[id]).filter((o: Obj) => o && o.id !== c.self.id),
      ...g.board().filter((o) => o.controller === c.p && o.id !== c.self.id),
    ].filter((o) => filter(g, o));
    let info: ShowOffInfo | null = null;
    if (cands.length && (yield* g.yesNo(c.p, `${label}: revelar/apontar uma carta?`))) {
      const [o] = yield* g.chooseObj(c.p, `${label}: qual carta?`, cands);
      if (o) {
        const d = g.data(o);
        const fromHand = o.zone !== 'board';
        info = { code: o.code, might: fromHand ? d.might : g.might(o), energy: d.energy, power: d.power, fromHand };
        g.say(`${g.pname(c.p)} faz Show Off com ${g.name(o)}.`, c.p);
      }
    }
    c.data.showOff = info;
    c.self.data = { ...(c.self.data || {}), showOff: info, showOffVer: c.self.zoneVersion };
    return true;
  };
}
/** O que foi mostrado no Show Off desta jogada (null se não mostrou). */
export function showedOff(c: { g: Ctx['g']; self: Obj; data?: Record<string, any> }): ShowOffInfo | null {
  if (c.data && 'showOff' in c.data) return c.data.showOff;
  const d = c.self.data;
  return d && d.showOffVer !== undefined && c.self.zoneVersion - d.showOffVer <= 2 ? d.showOff : null;
}

/** "Você pode fazer novas escolhas" para um item da pilha (regras 751-755): Mystic Reversal, Rebuttal. `who` = nome no texto das perguntas. */
export function* newChoices(c: Ctx, item: ChainItem, who = g0name(c)) {
  const g = c.g;
  const ab = item.ability;
  const name = g.name(item.cardId ?? item.sourceId);
  const extra = item.moreRepeats || []; // outras instâncias de Repeat pagas (820.3)
  const execs = 1 + (item.repeatIds ? 1 : 0) + extra.length;
  const ctxOf = (data: Record<string, any>, rep: number): Ctx => ({ ...item.ctx, data, rep });
  const prevTargets = new Set([...item.targetIds.flat(), ...(item.repeatIds || []).flat(), ...extra.flatMap((r) => r.ids.flat())]);
  let data = item.ctx.data;
  let ids: string[][][] = [item.targetIds, ...(item.repeatIds ? [item.repeatIds] : []), ...extra.map((r) => r.ids)];
  const vers: number[][][] = [item.targetVers, ...(item.repeatVers ? [item.repeatVers] : []), ...extra.map((r) => r.vers)];
  let remade = false;

  // grupos de alvo têm candidatos suficientes com estas escolhas de modo?
  const enough = (d: Record<string, any>) => {
    for (let r = 0; r < execs; r++)
      for (const spec of g.specsOf(ab, ctxOf(d, r))) if (g.targetCandidates(ctxOf(d, r), spec).length < (spec.min ?? 1)) return false;
    return true;
  };

  // 1. modos / campos escolhidos antes dos alvos
  if (ab.prepare && (yield* g.yesNo(c.p, `${who}: refazer as escolhas de modo/campo de ${name}?`))) {
    const d2 = { ...data };
    // cada execução (Repeat) tem as próprias escolhas de modo/campo (820.2.a)
    let ok = true;
    for (let r = 0; r < execs && ok; r++) ok = yield* ab.prepare(ctxOf(d2, r));
    if (ok && enough(d2)) {
      data = d2;
      remade = true;
    } else g.say(`${who}: não há como refazer essas escolhas de ${name}; ficam as anteriores.`, c.p);
  }

  // 2. alvos (de cada execução); depois de refazer modos, todos os alvos são escolhidos de novo
  const newIds: string[][][] = [];
  const newVers: number[][][] = [];
  let changed = remade;
  for (let r = 0; r < execs; r++) {
    const cr = ctxOf(data, r);
    const specs = g.specsOf(ab, cr);
    const out: string[][] = [];
    const outV: number[][] = [];
    for (let si = 0; si < specs.length; si++) {
      const spec = specs[si];
      const cur = remade ? [] : ids[r][si] || [];
      cr.targets = out.map((grp) => grp.map((id) => g.objs[id])); // novo: alvos já escolhidos visíveis aos filtros seguintes, como em chooseTargets (Strike Down)
      const cands = g.targetCandidates(cr, spec);
      const min = spec.min ?? 1;
      const max = spec.max ?? 1;
      let pick = cur;
      const must = remade || si >= (ids[r] || []).length;
      if (cands.length >= min && cands.length > 0) {
        const curTxt = cur.length ? cur.map((id) => g.describe(g.objs[id])).join(', ') : 'nenhum';
        const want =
          must ||
          (yield* g.yesNo(c.p, `${who}: escolher novo(s) alvo(s) para "${spec.prompt}"${execs > 1 ? ` (${r + 1}ª execução)` : ''}? Atual: ${curTxt}`));
        if (want) {
          pick = yield* g.ask(
            c.p,
            'choose',
            spec.prompt,
            cands.map((o) => ({ id: o.id, label: g.describe(o), obj: o.id })),
            Math.min(min, cands.length),
            Math.min(max, cands.length),
          );
          if (pick.join() !== cur.join()) changed = true;
        }
      }
      out.push(pick);
      // alvo mantido conserva a versão original (se já tinha mudado de zona, continua ilegal)
      outV.push(pick === cur && !remade ? vers[r]?.[si] || [] : pick.map((id) => g.objs[id].zoneVersion));
    }
    newIds.push(out);
    newVers.push(outV);
  }
  ids = newIds;

  // 3. escolhas depois dos alvos (destinos): obrigatórias se os alvos mudaram, senão opcionais
  if (ab.choose) {
    const redo = changed || (yield* g.yesNo(c.p, `${who}: escolher novo destino para ${name}?`));
    if (redo) {
      const d2 = { ...data };
      let ok = true;
      for (let r = 0; r < execs && ok; r++) ok = yield* ab.choose(ctxOf(d2, r), ids[r]);
      if (ok) data = d2;
    }
  }

  // grava as novas escolhas no item
  item.ctx.data = data;
  item.targetIds = ids[0];
  item.targetVers = newVers[0];
  if (item.repeatIds) {
    item.repeatIds = ids[1];
    item.repeatVers = newVers[1];
  }
  const off = item.repeatIds ? 2 : 1;
  extra.forEach((r, j) => {
    r.ids = ids[off + j];
    r.vers = newVers[off + j];
  });
  // novos alvos disparam efeitos de "quando escolhido" (regra 754)
  for (const id of new Set(ids.flat(2)))
    if (!prevTargets.has(id)) g.emit({ type: 'chosen', obj: g.objs[id], by: c.p, source: g.objs[item.sourceId] });
}

const g0name = (c: Ctx) => c.g.name(c.self);
