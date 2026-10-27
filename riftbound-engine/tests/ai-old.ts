// Cópia congelada da IA de antes dos níveis de dificuldade e das mecânicas VEN/RAD (26/10/2026). Só o tests/ai-vs.ts
// usa: é a "antiga" do benchmark nova × antiga. Não editar.
// IA de Riftbound: testa jogadas numa cópia da partida e escolhe a que deixa a mesa melhor.
// Não lê a mão nem o deck do oponente: a avaliação só usa o que está na mesa e o tamanho das mãos, e o oponente simulado
// só decide (contra a IA) escolhas públicas — sim/não e alvos na mesa; na pilha e no showdown ele passa.
// Benchmarks: `npm run ai` (contra jogador aleatório) e `npx tsx tests/ai-vs.ts 96` (contra a cópia antiga, tests/ai-old.ts).
import { MANUAL_PAY, type Engine } from '../src/engine/engine';
import { Game } from '../src/engine/game';
import { IllegalAction, type Answer, type Decision, type Obj, type P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const opp = (p: P): P => (1 - p) as P;

// ───────────────────────────── simulação ─────────────────────────────
class Sim {
  cur: Decision | null = null;
  dead = false;
  constructor(public e: Engine, private gen: Generator<Decision, void, Answer>) {
    const r = gen.next(undefined as any);
    this.cur = r.done ? null : r.value;
  }
  static fromRoot(e: Engine): Sim {
    const c = e.cloneAtRoot();
    c.simHorizon = true;
    return new Sim(c, c.resumeFromMain());
  }
  answer(a: Answer): boolean {
    if (this.dead || !this.cur) return false;
    try {
      const r = this.gen.next(a);
      this.cur = r.done ? null : r.value;
      return true;
    } catch (err) {
      if (err instanceof IllegalAction) {
        this.dead = true;
        this.cur = null;
        return false;
      }
      throw err;
    }
  }
}

// ───────────────────────────── plano de jogo ─────────────────────────────
/**
 * Perfil do próprio deck, lido no começo da partida (a IA conhece a lista do próprio deck, não a ordem): ramp (muitas
 * cartas que aceleram runas e finalizadores caros), aggro (curva baixa) ou meio-termo. O perfil muda os pesos da
 * avaliação: no ramp, runas valem mais enquanto ainda faltam; no aggro, pontos e mesa agora valem mais.
 */
export type Plan = 'ramp' | 'aggro' | 'mid';
const RAMP_RE = /channel|ready (?:up to )?(?:\d+|a|an|one|two) runes?|\[add\]/i;
const planCache = new Map<string, Plan>();
export function deckPlan(e: Engine, p: P): Plan {
  const s = e.pl[p];
  const ids = [...s.mainDeck, ...s.hand, ...s.trash, ...s.banish, ...e.board().filter((o) => o.owner === p && !o.token).map((o) => o.id)];
  const key = `${p}:${e.legendOf(p).code}:${ids.length}:${e.cfg.seed}`;
  const hit = planCache.get(key);
  if (hit) return hit;
  let cost = 0;
  let n = 0;
  let ramp = 0;
  let big = 0;
  for (const id of ids) {
    const o = e.objs[id];
    if (!o || e.kind(o) === 'rune') continue;
    const d = e.data(o);
    n++;
    cost += d.energy;
    if (d.energy >= 7) big++;
    if (RAMP_RE.test(d.text) && d.energy <= 5) ramp++;
  }
  const avg = n ? cost / n : 3;
  const plan: Plan = ramp >= 4 && big >= 3 ? 'ramp' : avg <= 3.1 ? 'aggro' : 'mid';
  if (planCache.size > 200) planCache.clear();
  planCache.set(key, plan);
  return plan;
}

/** Eventos que se repetem todo turno: uma carta com gatilho neles é um "motor" (gera valor turno após turno). */
const RECURRING = new Set(['turnEnd', 'beginStart', 'mainStart', 'awaken']);
/**
 * Valor de uma permanente além do Might: o custo dela (as cartas são precificadas pelo que fazem) e, se ela é um motor
 * (gatilho de início/fim de turno, ou habilidade ativada reutilizável), o valor que ainda vai render nos próximos turnos.
 * Sem isso a IA via, por exemplo, a Dazzling Aurora como "um gear de 5 pontos" e sempre preferia uma unidade grande.
 */
function permanentValue(e: Engine, o: Obj): number {
  const d = e.data(o);
  const cost = d.energy + d.power;
  const sc = getScript(o.code);
  let engine = 0;
  for (const t of sc?.triggers || []) {
    const evs = Array.isArray(t.on) ? t.on : [t.on];
    if (evs.some((x) => RECURRING.has(x))) engine = Math.max(engine, cost * 2.5);
  }
  if ((sc?.activated || []).some((a) => !a.isAdd)) engine = Math.max(engine, cost * 1.2);
  if (e.isGear(o)) return o.attachedTo ? 3 : Math.max(5, cost * 2) + engine;
  return engine;
}

// ───────────────────────────── avaliação ─────────────────────────────
/** Quanto a mesa vale para `me` (positivo = bom). */
export function evaluate(e: Engine, me: P): number {
  if (e.winner === me) return 1e6;
  if (e.winner === opp(me)) return -1e6;
  const vs = e.cfg.victoryScore!;
  // a avaliação é feita no fim do meu turno (planAction) ou numa resposta no meu turno: o oponente joga em seguida
  const myTurnEnding = e.active === me;
  const side = (p: P) => {
    const s = e.pl[p];
    const plan: Plan = p === me ? deckPlan(e, p) : 'mid'; // o deck do oponente é escondido: só o próprio plano
    const nRunes = e.runesOf(p).length;
    let v = s.points * (plan === 'aggro' ? 130 : 120) + (s.points >= vs - 1 ? 60 : 0);
    v += Math.min(s.hand.length, 8) * 6;
    // runas: no ramp, cada runa a mais vale bem mais enquanto o deck ainda não chegou ao topo da curva
    v += nRunes * (plan === 'ramp' && nRunes < 12 ? 9 : 4);
    v += s.xp;
    for (const u of e.units()) {
      if (u.controller !== p) continue;
      // bônus "neste turno" não contam: somem no fim do turno
      const m = Math.max(0, persistentMight(e, u));
      v += 5 + 3 * m + permanentValue(e, u);
      if (u.stunned) v -= 1;
    }
    for (const g of e.board()) if (g.controller === p && e.isGear(g)) v += permanentValue(e, g);
    // campos: controle vale um ponto no próximo turno de quem controla, se aguentar o ataque do outro antes disso
    e.bfs.forEach((b, i) => {
      if (b.controller !== p) return;
      if (!e.unitsAtBf(i, p).length) return v += 20;
      // fim do meu turno: o campo do oponente com unidades dele pontua (hold) no começo do turno dele, sem eu poder
      // fazer mais nada — é praticamente um ponto
      if (myTurnEnding && p !== me) return (v += 100);
      v += 55;
      if (defenseAt(e, i, p) < reach(e, i, opp(p))) v -= 30;
      else v += 5;
    });
    // fim do meu turno: Reactions/Actions na mão com runas prontas para pagar valem mais (posso responder no turno do
    // oponente); gastar tudo no meu turno sem ganhar nada deixa de compensar
    if (myTurnEnding && p === me) {
      let ready = e.runesOf(p).filter((r) => !r.exhausted).length;
      const reactive = s.hand
        .map((id) => e.objs[id])
        .filter((o) => o && (e.kw(o).reaction || e.kw(o).action))
        .sort((a, b) => e.data(a).energy - e.data(b).energy);
      for (const o of reactive.slice(0, 2)) {
        if (e.data(o).energy > ready) break;
        ready -= e.data(o).energy;
        v += 4;
      }
    }
    return v;
  };
  let score = side(me) - side(opp(me));
  // o oponente vai pontuar os campos que segura no começo do turno dele: se isso fecha a partida, é quase derrota; se o
  // deixa a um ponto e ele ainda consegue conquistar todos os outros campos no turno dele, também
  if (myTurnEnding) {
    const o = opp(me);
    const held = e.bfs.filter((b, i) => b.controller === o && e.unitsAtBf(i, o).length).length;
    const pts = e.pl[o].points + held;
    if (pts >= vs) score -= 5e5;
    else if (held && pts === vs - 1) {
      const open = e.bfs.filter((b, i) => !(b.controller === o && e.unitsAtBf(i, o).length) && defenseAt(e, i, me) < reach(e, i, o)).length;
      if (held + open >= e.bfs.length) score -= 400;
    }
  }
  return score;
}

/** Quanto `p` aguenta defendendo o campo `i` (Might + Shield das unidades dele lá). */
function defenseAt(e: Engine, i: number, p: P): number {
  return e.unitsAtBf(i, p).reduce((t, u) => t + Math.max(0, persistentMight(e, u)) + (e.kw(u).shield || 0), 0);
}
/**
 * Quanto `q` consegue mandar contra o campo `i` no próximo movimento dele: unidades na base (vão a qualquer campo) e as
 * com Ganking em outros campos, com o Assault. Unidades em outros campos sem Ganking só voltam para a base.
 */
function reach(e: Engine, i: number, q: P): number {
  let t = 0;
  for (const u of e.units()) {
    if (u.controller !== q || !u.loc) continue;
    if (u.loc.t === 'base' || (u.loc.t === 'bf' && u.loc.i !== i && e.kw(u).ganking)) t += Math.max(0, persistentMight(e, u)) + (e.kw(u).assault || 0);
  }
  return t;
}

/** Might sem os efeitos que acabam no fim do turno ou do combate. */
function persistentMight(e: Engine, u: import('../src/engine/types').Obj): number {
  let m = e.might(u);
  for (const ef of e.effects) if (ef.target === u.id && ef.until !== 'perm' && ef.might && ef.floor === undefined) m -= ef.might;
  return m;
}

// ───────────────────────────── política rápida (rollouts e oponente simulado) ─────────────────────────────
function cardValue(e: Engine, id: string) {
  const o = e.objs[id];
  if (!o) return 0;
  const d = e.data(o);
  return d.energy + d.power;
}
export function quickPick(d: Decision, e: Engine): Answer {
  if (d.kind === 'priority' || d.kind === 'focus') return ['pass'];
  if (d.kind === 'action') return ['end'];
  if (d.kind === 'mulligan') return mulliganPick(d, e);
  if (d.kind === 'confirm') return [d.options.find((o) => o.id === 'yes')?.id ?? d.options[0].id];
  if (d.min === 0) return [];
  const p = d.player;
  // descarte e reciclagem: as cartas mais baratas
  if (/descart|Recicl|recicl/.test(d.prompt)) {
    const sorted = [...d.options].sort((a, b) => cardValue(e, a.id) - cardValue(e, b.id));
    return sorted.slice(0, d.min).map((o) => o.id);
  }
  // alvos: inimigo mais forte se houver inimigos entre as opções, senão aliado mais forte
  const withObj = d.options.filter((o) => o.obj && e.objs[o.obj]);
  if (withObj.length === d.options.length && withObj.length) {
    const score = (o: (typeof d.options)[number]) => {
      const x = e.objs[o.obj!];
      const m = e.isUnit(x) && x.zone === 'board' ? e.might(x) : 0;
      return (x.controller !== p ? 100 : 0) + m;
    };
    const sorted = [...d.options].sort((a, b) => score(b) - score(a));
    return sorted.slice(0, d.min).map((o) => o.id);
  }
  return d.options.slice(0, d.min).map((o) => o.id);
}
// ───────────────────────────── mulligan ─────────────────────────────
/**
 * Mulligan pelo plano do próprio deck (sem olhar o deck: só a mão e o perfil da lista). Troca até 2 cartas que não têm
 * jogada nos primeiros turnos (2 runas no 1º turno, 4 no 2º), as mais caras primeiro:
 * - aggro quer curva baixa: troca o que custa 4+; sem nada de 2 ou menos, troca também a mais cara de 3;
 * - ramp guarda as cartas de ramp (aceleram runas) e troca o resto que custa 5+;
 * - meio-termo troca o que custa 5+ e, sem nenhuma jogada até 3, a mais cara.
 * Power conta como custo a mais no começo (sai de reciclar runa).
 */
export function mulliganPick(d: Decision, e: Engine): Answer {
  const plan = deckPlan(e, d.player);
  const cards = d.options.map((o) => {
    const x = e.objs[o.id];
    const dd = x ? e.data(x) : null;
    const cost = dd ? dd.energy + dd.power : 0;
    const ramp = !!dd && RAMP_RE.test(dd.text) && dd.energy <= 5;
    return { id: o.id, cost, ramp };
  });
  const tooHigh = plan === 'aggro' ? 4 : 5;
  const keepRamp = plan === 'ramp';
  const out = cards.filter((c) => c.cost >= tooHigh && !(keepRamp && c.ramp));
  const early = plan === 'aggro' ? 2 : 3;
  if (!out.length && !cards.some((c) => c.cost <= early || (keepRamp && c.ramp))) {
    const worst = cards.filter((c) => !(keepRamp && c.ramp)).sort((a, b) => b.cost - a.cost)[0];
    if (worst && worst.cost > early) out.push(worst);
  }
  out.sort((a, b) => b.cost - a.cost);
  return out.slice(0, 2).map((c) => c.id);
}

/** A IA nunca liga o pagamento manual: tira a opção das decisões raiz. */
function noManualPay(d: Decision): Decision {
  return d.root && d.options.some((o) => o.id === MANUAL_PAY) ? { ...d, options: d.options.filter((o) => o.id !== MANUAL_PAY) } : d;
}
/** Respostas candidatas para uma decisão da própria IA. */
function candidates(d: Decision, e: Engine, cap = 10): Answer[] {
  d = noManualPay(d);
  if (d.kind === 'confirm') return d.options.map((o) => [o.id]);
  if (d.max <= 1 && d.min >= 1) return d.options.slice(0, cap).map((o) => [o.id]);
  const out: Answer[] = [];
  const push = (a: Answer) => {
    if (a.length >= d.min && a.length <= d.max && !out.some((x) => x.join() === a.join())) out.push(a);
  };
  if (d.min === 0) push([]);
  const ids = d.options.map((o) => o.id);
  const k = Math.max(1, d.min);
  if (k === 1) {
    for (const id of ids.slice(0, cap)) push([id]);
    // escolha de várias (ex.: quais unidades mover juntas): grupos — todas, as do mesmo lugar, as 2 e 3 mais fortes
    if (d.max > 1) {
      const might = (id: string) => {
        const o = d.options.find((x) => x.id === id)?.obj;
        const x = o ? e.objs[o] : undefined;
        return x && e.isUnit(x) && x.zone === 'board' ? e.might(x) : 0;
      };
      const strong = [...ids].sort((a, b) => might(b) - might(a));
      push(strong.slice(0, d.max));
      const byLoc = new Map<string, string[]>();
      for (const id of ids) {
        const o = d.options.find((x) => x.id === id)?.obj;
        const l = o && e.objs[o]?.loc;
        const key = l ? (l.t === 'base' ? 'base' : `bf${l.i}`) : '?';
        byLoc.set(key, [...(byLoc.get(key) || []), id]);
      }
      for (const g of byLoc.values()) if (g.length > 1) push(g.slice(0, d.max));
      for (const n of [2, 3]) if (n < ids.length && n <= d.max) push(strong.slice(0, n));
    }
  } else {
    // algumas combinações de tamanho k
    const rec = (start: number, acc: string[]) => {
      if (out.length >= cap) return;
      if (acc.length === k) {
        push([...acc]);
        return;
      }
      for (let i = start; i < ids.length; i++) rec(i + 1, [...acc, ids[i]]);
    };
    rec(0, []);
  }
  push(quickPick(d, e));
  return out;
}

// ───────────────────────────── busca ─────────────────────────────
/** Tempo de busca por decisão (ms): a interface espera ~0,5 s; passado o prazo, cada jogada restante ainda é avaliada
 *  uma vez com a política rápida. */
const PLAN_MS = 800;
const REPLY_MS = 500;
const now = () => performance.now();
const PAY_RE = /^Como pagar/;
/** Uma resposta dada no caminho da busca, com quem respondeu. */
interface Step {
  a: Answer;
  p: P;
}
interface Res {
  score: number;
  path: Step[];
}
interface Stepper {
  cur: Decision | null;
  e: Engine;
  answer(a: Answer): boolean;
}

/** A escolha do oponente só usa informação pública (sim/não, ou alvo entre coisas na mesa ou no descarte). */
function publicChoice(d: Decision, e: Engine): boolean {
  if (d.kind === 'confirm') return d.options.length > 1;
  if (d.kind !== 'choose' || d.max !== 1 || d.options.length < 2 || d.options.length > 6) return false;
  return d.options.every((o) => {
    if (!o.obj) return true;
    const x = e.objs[o.obj];
    return !!x && (x.zone === 'board' || x.zone === 'trash' || x.zone === 'battlefieldZone');
  });
}

/**
 * Busca a partir de uma decisão: as escolhas da IA são testadas (máximo), as escolhas públicas do oponente também
 * (mínimo: ele escolhe o que é pior para a IA — por exemplo, não recuar a unidade do campo que a IA está atacando), e o
 * resto (pilha, showdown, escolhas com cartas escondidas) segue a política rápida. Cada folha é a mesa avaliada quando
 * `leaf` diz que assentou. Mostrar ao oponente simulado só o que é público mantém a IA sem trapaça.
 */
class Search {
  leaves = 0;
  /** Teto de folhas e prazo (performance.now) da jogada em teste: passado um dos dois, só completa com a política rápida. */
  limit = 0;
  until = Infinity;
  constructor(
    private start: (path: Step[]) => Stepper | null,
    private me: P,
    private leaf: (d: Decision) => boolean,
  ) {}

  value(path: Step[], myBr: number, oppBr: number): Res | null {
    const sim = this.start(path);
    if (!sim) return null;
    const p = [...path];
    for (let i = 0; i < 200; i++) {
      const d = sim.cur;
      if (!d || this.leaf(d)) break;
      const open = this.leaves < this.limit && now() < this.until;
      // como pagar: fica o plano automático (1ª opção) — testar cada combinação de runas só gasta o orçamento
      if (d.player === this.me && (d.kind === 'choose' || d.kind === 'confirm') && myBr > 0 && open && !PAY_RE.test(d.prompt)) {
        const cs = candidates(d, sim.e, myBr >= 4 ? 8 : 6);
        if (cs.length > 1) return this.branch(p, cs, d.player, myBr - 1, oppBr, true);
      }
      if (d.player !== this.me && oppBr > 0 && open && publicChoice(d, sim.e)) {
        const cs = d.options.map((o) => [o.id]);
        if (d.min === 0) cs.push([]);
        return this.branch(p, cs, d.player, myBr, oppBr - 1, false);
      }
      const q = quickPick(d, sim.e);
      p.push({ a: q, p: d.player });
      if (!sim.answer(q)) return null;
    }
    this.leaves++;
    return { score: evaluate(sim.e, this.me), path: p };
  }

  branch(prefix: Step[], cs: Answer[], who: P, myBr: number, oppBr: number, max: boolean): Res | null {
    let best: Res | null = null;
    for (const c of cs) {
      if (best && (this.leaves >= this.limit || now() >= this.until)) break;
      const r = this.value([...prefix, { a: c, p: who }], myBr, oppBr);
      if (r && (!best || (max ? r.score > best.score : r.score < best.score))) best = r;
    }
    return best;
  }
}

/** As respostas da IA no começo do caminho (até a primeira decisão de outro jogador): o plano que ela vai seguir. */
function ownPrefix(path: Step[], me: P): Answer[] {
  const out: Answer[] = [];
  for (const s of path) {
    if (s.p !== me) break;
    out.push(s.a);
  }
  return out;
}

// ───────────────────────────── decisões ─────────────────────────────
export interface AiPlan {
  seq: Answer[];
  score: number;
}

/**
 * Na decisão de ação da fase principal: testa cada jogada (com as escolhas que ela pede, inclusive mover várias
 * unidades juntas) até a mesa assentar no fim do turno e devolve a melhor sequência. O orçamento de folhas é dividido
 * entre as jogadas, para "mover" (que é a última da lista) não ficar sem vez.
 */
export function planAction(e: Engine, me: P, budget = 150, ms = PLAN_MS): AiPlan {
  const t0 = now();
  let best: AiPlan = { seq: [['end']], score: -Infinity };
  const start = (path: Step[]) => {
    const sim = Sim.fromRoot(e);
    for (const s of path) if (!sim.answer(s.a)) return null;
    return sim;
  };
  const search = new Search(start, me, (d) => d.prompt === '__horizon' || d.kind === 'action');
  const d0 = Sim.fromRoot(e).cur;
  if (!d0) return best;
  // "encerrar" primeiro: uma jogada só vale se deixar a mesa melhor que parar agora
  const roots = [...noManualPay(d0).options].sort((a, b) => (b.id === 'end' ? 1 : 0) - (a.id === 'end' ? 1 : 0));
  roots.forEach((o, k) => {
    const share = Math.max(4, Math.floor((budget - search.leaves) / (roots.length - k)));
    const w = o.id === 'move' ? 2 : 1;
    search.limit = search.leaves + (o.id === 'move' ? Math.max(share * 2, 40) : share);
    // o tempo que sobra é dividido entre as jogadas que faltam ("mover" conta em dobro)
    const left = roots.slice(k).reduce((t, x) => t + (x.id === 'move' ? 2 : 1), 0);
    search.until = now() + Math.max(0, t0 + ms - now()) * (w / left);
    const r = search.value([{ a: [o.id], p: me }], 4, 2);
    if (!r) return;
    const sc = r.score - (o.id === 'end' ? 0 : 1);
    if (sc > best.score) best = { seq: ownPrefix(r.path, me), score: sc };
  });
  return best;
}

/**
 * Decisões fora da decisão de ação (responder no showdown ou na pilha, distribuir dano, escolhas no turno do oponente):
 * testa cada opção (e as escolhas que ela pede) refazendo a partida a partir das respostas, e joga até o estado assentar.
 * A opção neutra (passar) vai primeiro e as outras precisam ser estritamente melhores: gastar uma carta só quando muda o
 * resultado (salvar a unidade alvo, ganhar o combate...).
 */
export function decideByReplay(game: Game, me: P, budget = 22, ms = REPLY_MS): Answer {
  const d = game.current!;
  const t0 = now();
  const first = candidates(d, game.engine, 8);
  if (first.length === 1) return first[0];
  const base = game.serialize();
  const q = quickPick(d, game.engine);
  const ordered = [q, ...first.filter((a) => a.join() !== q.join())];
  const start = (path: Step[]): Stepper | null => {
    let g: Game;
    try {
      g = Game.load(base);
    } catch {
      return null; // a partida não se refaz pelas respostas (cenário montado à mão): fica a política rápida
    }
    for (const s of path) if (!g.answer(s.a)) return null;
    return {
      get cur() {
        return g.current;
      },
      get e() {
        return g.engine;
      },
      answer: (a: Answer) => g.answer(a),
    };
  };
  const search = new Search(start, me, (x) => x.kind === 'action');
  let best: Answer = q;
  let bestScore = -Infinity;
  ordered.forEach((c, k) => {
    search.limit = search.leaves + Math.max(2, Math.floor((budget - search.leaves) / (ordered.length - k)));
    search.until = now() + Math.max(0, t0 + ms - now()) / (ordered.length - k);
    const r = search.value([{ a: c, p: me }], 2, 1);
    if (!r) return;
    const sc = r.score - (k === 0 ? 0 : 1);
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  });
  return best;
}

/** Controlador da IA durante a partida: segue o plano da jogada escolhida e decide o resto. */
export class AiPlayer {
  private plan: Answer[] = [];
  constructor(public me: P) {}

  decide(game: Game): Answer {
    const d = game.current!;
    const e = game.engine;
    if (d.kind === 'mulligan') return mulliganPick(d, e);
    if (d.kind === 'setup') return [d.options[0].id];
    if (d.kind === 'action') {
      const p = planAction(e, this.me);
      this.plan = p.seq.slice(1);
      return p.seq[0];
    }
    // segue o plano, se a decisão for a esperada
    if (this.plan.length) {
      const next = this.plan[0];
      if (next.every((id) => d.options.some((o) => o.id === id)) && next.length >= d.min && next.length <= d.max) {
        this.plan.shift();
        return next;
      }
      this.plan = [];
    }
    if (d.options.length === 1 && d.min === 1) return [d.options[0].id];
    return decideByReplay(game, this.me);
  }
}
