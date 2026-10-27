// IA de Riftbound: testa jogadas numa cópia da partida e escolhe a que deixa a mesa melhor.
// Não lê a mão nem o deck do oponente: a avaliação só usa o que está na mesa e o tamanho das mãos, e o oponente simulado
// só decide (contra a IA) escolhas públicas — sim/não e alvos na mesa; na pilha e no showdown ele passa.
// Três níveis (AiLevel): Fácil (busca curta, avaliação míope e erros plausíveis), Normal e Difícil (mais tempo, oponente
// simulado mais a fundo e planejamento do turno inteiro).
// Benchmarks: `npm run ai` (contra jogador aleatório) e `npx tsx tests/ai-vs.ts 96` (contra a cópia antiga, tests/ai-old.ts).
import { MANUAL_PAY, type Engine } from '../engine/engine';
import { Game } from '../engine/game';
import { IllegalAction, type Answer, type Decision, type Keywords, type Obj, type P } from '../engine/types';
import { empowerSpecs, getScript } from '../engine/script';

const opp = (p: P): P => (1 - p) as P;

// ───────────────────────────── níveis ─────────────────────────────
export type AiLevel = 'easy' | 'normal' | 'hard';
export const AI_LEVELS: { id: AiLevel; t: string; s: string }[] = [
  { id: 'easy', t: 'Fácil', s: 'Joga sem pensar muito à frente' },
  { id: 'normal', t: 'Normal', s: 'Equilibrada' },
  { id: 'hard', t: 'Difícil', s: 'Planeja o turno inteiro' },
];
export const isAiLevel = (x: unknown): x is AiLevel => x === 'easy' || x === 'normal' || x === 'hard';

/** Como cada nível pensa. Tempos em ms; folhas = mesas avaliadas por decisão. */
interface Profile {
  /** Decisão de ação: folhas e tempo da 1ª fase (cada jogada até a próxima decisão de ação). */
  budget: number;
  ms: number;
  /** Ramificação das próprias escolhas e das escolhas públicas do oponente simulado. */
  myBr: number;
  oppBr: number;
  /** Planejamento do turno: as K melhores jogadas seguem com até `depth` jogadas seguintes, em `turnMs`. */
  turnK: number;
  depth: number;
  turnMs: number;
  /**
   * Resposta do oponente: os `verifyK` melhores planos são conferidos jogando o turno seguinte do oponente só com o que é
   * público (ele move as unidades da base para cada campo, ou fica parado; a pior para a IA vale), em `verifyMs`.
   */
  verifyK: number;
  verifyMs: number;
  /** Respostas fora da decisão de ação (pilha, showdown, escolhas). */
  replyBudget: number;
  replyMs: number;
  /** Avaliação míope: não olha a ameaça do oponente sobre os campos nem guarda resposta para o turno dele. */
  myopic: boolean;
  /** Erros (só no Fácil): chance de jogar a 2ª melhor jogada, de encerrar o turno cedo e de não responder na pilha. */
  slip: number;
  idle: number;
  lazy: number;
}
const PROFILES: Record<AiLevel, Profile> = {
  easy: { budget: 40, ms: 300, myBr: 2, oppBr: 0, turnK: 0, depth: 0, turnMs: 0, verifyK: 0, verifyMs: 0, replyBudget: 8, replyMs: 200, myopic: true, slip: 0.3, idle: 0.15, lazy: 0.5 },
  normal: { budget: 150, ms: 450, myBr: 4, oppBr: 2, turnK: 2, depth: 2, turnMs: 150, verifyK: 3, verifyMs: 200, replyBudget: 22, replyMs: 500, myopic: false, slip: 0, idle: 0, lazy: 0 },
  hard: { budget: 340, ms: 1000, myBr: 5, oppBr: 3, turnK: 4, depth: 4, turnMs: 450, verifyK: 5, verifyMs: 450, replyBudget: 48, replyMs: 1100, myopic: false, slip: 0, idle: 0, lazy: 0 },
};

/**
 * Pesos da avaliação que o autojogo afinou (`npx tsx tests/ai-vs.ts N --tune chave=valor,...` muda um peso só na IA nova
 * para medir contra a antiga). Os valores aqui são os escolhidos.
 */
export const W = {
  /** gear solto: max(5, gearBase + custo × gearPerCost) */
  gearBase: 4,
  gearPerCost: 2.5,
  /** Empowered: empBase + empPerCost × custo do [Empower] */
  empBase: 2,
  empPerCost: 1.6,
  /** multiplicador do valor das palavras-chave que ficam */
  kw: 1,
  /** carta jogável do descarte ([Flow]) */
  flow: 3,
  /** ler o arquétipo do oponente (0 = sempre meio-termo) */
  arch: 1,
  /** campo mal defendido: penalidade contra aggro / meio-termo / control */
  contestAggro: 40,
  contestMid: 30,
  contestControl: 24,
};
/** Muda pesos e níveis (só para o autojogo: tests/ai-vs.ts --tune). Chaves de nível: normal.turnK, hard.depth... */
export function tuneAi(spec: string) {
  for (const kv of spec.split(',').filter(Boolean)) {
    const [k, v] = kv.split('=');
    const n = Number(v);
    if (k.includes('.')) {
      const [lv, f] = k.split('.') as [AiLevel, keyof Profile];
      (PROFILES[lv] as any)[f] = n;
    } else if (k in W) (W as any)[k] = n;
    else throw new Error(`peso desconhecido: ${k}`);
  }
}

/** Sorteio determinístico (mesma partida, mesmo lance → mesmo "erro"): os erros do Fácil se repetem no replay. */
function chance(seed: number, n: number, salt: number): number {
  let h = (seed ^ Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

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

/**
 * Arquétipo do oponente pelo que é público: a(s) lenda(s) dele (texto e domínios) e, depois de umas cartas vistas, a curva
 * do que ele já jogou (mesa, descarte, banidas). aggro = pressiona os campos cedo; control = segura, compra, acelera runas.
 */
export type Archetype = 'aggro' | 'control' | 'mid';
const AGGRO_RE = /conquer|attack|assault|ganking|win a combat|enter ready|ready a unit|move a friendly|deal \d|\+\d \[might\]/gi;
const SLOW_RE = /channel|\[add\]|hold|defend|ready (?:up to )?\d+ runes?|xp|recycle|spell/gi;
const DOM_BIAS: Record<string, number> = { Fury: 1, Chaos: 0.5, Body: 0.5, Order: 0, Calm: -0.5, Mind: -0.5 };
const archCache = new Map<string, Archetype>();
export function oppArchetype(e: Engine, me: P): Archetype {
  const o = opp(me);
  const legends = e.legendsOf(o);
  const s = e.pl[o];
  const seen = [...s.trash, ...s.banish, ...e.board().filter((x) => x.owner === o && !x.token && (e.isUnit(x) || e.isGear(x))).map((x) => x.id)]
    .map((id) => e.objs[id])
    .filter((x) => x && e.kind(x) !== 'rune');
  const key = `${o}:${legends.map((l) => l.code).join()}:${seen.length}:${e.cfg.seed}`;
  const hit = archCache.get(key);
  if (hit) return hit;
  let score = 0;
  for (const l of legends) {
    const d = e.data(l);
    score += (d.text.match(AGGRO_RE)?.length || 0) - (d.text.match(SLOW_RE)?.length || 0);
    for (const dom of d.domains) score += DOM_BIAS[dom] ?? 0;
  }
  if (seen.length >= 6) {
    const avg = seen.reduce((t, x) => t + e.data(x).energy, 0) / seen.length;
    score += (3.4 - avg) * 1.5;
  }
  const a: Archetype = score >= 1.5 ? 'aggro' : score <= -1 ? 'control' : 'mid';
  if (archCache.size > 200) archCache.clear();
  archCache.set(key, a);
  return a;
}

/** Eventos que se repetem todo turno: uma carta com gatilho neles é um "motor" (gera valor turno após turno). */
const RECURRING = new Set(['turnEnd', 'beginStart', 'mainStart', 'awaken']);

/** Custo (energia + power) de ficar Empowered: o que a carta cobra no [Empower] dela. */
function empowerWorth(e: Engine, o: Obj): number {
  const sc = getScript(o.code);
  const specs = sc ? empowerSpecs(sc) : [];
  if (!specs.length) return 3; // empowered por outro efeito (Mel, Ambessa, Kennen, Zed): recurso de uma habilidade
  let best = 0;
  for (const sp of specs) {
    let c = 0;
    try {
      const k = typeof sp.cost === 'function' ? sp.cost(e, o, o.controller) : sp.cost;
      c = k ? k.energy + k.power.length : 0;
    } catch {
      c = 2;
    }
    if (sp.extra) c += 2;
    if (sp.exhaustSelf) c += 1;
    best = Math.max(best, c);
  }
  return best;
}
/** Valor de estar Empowered (contado à parte do Might/palavras-chave que o Empowered já dá e a avaliação já vê). */
function empoweredValue(e: Engine, o: Obj): number {
  const n = e.empowerCount(o);
  return n ? n * (W.empBase + W.empPerCost * empowerWorth(e, o)) : 0;
}

/** Palavras-chave que ficam (as dadas "neste turno"/"neste combate" somem e não contam). */
function lastingKw(e: Engine, u: Obj): Keywords {
  const k = { ...e.kw(u) } as Record<string, any>;
  for (const ef of e.effects) {
    if (ef.target !== u.id || ef.until === 'perm' || !ef.kw) continue;
    for (const [n, v] of Object.entries(ef.kw)) {
      if (typeof v === 'number' && typeof k[n] === 'number') k[n] = Math.max(0, k[n] - v);
      else if (v) delete k[n];
    }
  }
  return k as Keywords;
}
/** Quanto as palavras-chave de uma unidade valem além do Might. */
function kwValue(k: Keywords): number {
  return (
    (k.assault || 0) * 1 +
    (k.shield || 0) * 1.5 +
    (k.deflect || 0) * 1.5 +
    (k.disarm || 0) * 1 +
    (k.tank ? 1.5 : 0) +
    (k.ganking ? 2 : 0) +
    (k.backline ? 0.5 : 0) +
    (k.hunt || 0) * 0.5 -
    (k.temporary ? 4 : 0)
  );
}

/**
 * Valor de uma permanente além do Might: o custo dela (as cartas são precificadas pelo que fazem) e, se ela é um motor
 * (gatilho de início/fim de turno, ou habilidade ativada reutilizável), o valor que ainda vai render nos próximos turnos.
 * Sem isso a IA via, por exemplo, a Dazzling Aurora como "um gear de 5 pontos" e sempre preferia uma unidade grande.
 * Vendetta/Radiance: Empowered vale o que custou; gear com [Deploy] num campo que o oponente segura vai morrer (vale pouco);
 * Bomb vale a explosão; unit gear é contado como unidade (não duas vezes).
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
  if ((sc?.activated || []).some((a) => !a.isAdd && !a.empower)) engine = Math.max(engine, cost * 1.2);
  const emp = empoweredValue(e, o);
  if (e.isUnit(o)) return engine + emp;
  if (o.code === 'TOK-BOMB') return 4;
  if (!e.isGear(o)) return engine + emp;
  if (o.attachedTo) return 3 + emp;
  let v = Math.max(5, W.gearBase + cost * W.gearPerCost) + engine + emp; // um gear barato também vale mais que ficar na mão
  const i = e.bfIndex(o);
  if (i >= 0 && e.activeKw(o).deploy) {
    // Deploy: morre quando o oponente segura este campo
    const foe = opp(o.controller);
    const b = e.bfs[i];
    if (b.controller === foe && e.unitsAtBf(i, foe).length) v *= 0.25;
    else if (defenseAt(e, i, o.controller) < reach(e, i, foe)) v *= 0.6;
  }
  return v;
}

/** Cartas no descarte que dá para jogar de lá ([Flow], ou permissão de jogar do descarte): quase como cartas na mão. */
function trashValue(e: Engine, p: P): number {
  let v = 0;
  for (const id of e.pl[p].trash) {
    const o = e.objs[id];
    if (o && e.flowCostOf(o)) v += W.flow;
  }
  return Math.min(v, 15);
}

// ───────────────────────────── avaliação ─────────────────────────────
export interface EvalOpts {
  /** Fácil: não olha a ameaça do oponente sobre os campos (nem o ponto de vitória que ele vai pontuar). */
  myopic?: boolean;
  /** Arquétipo do oponente (lido da lenda e do que ele já jogou). */
  arch?: Archetype;
  /**
   * A mesa é do fim do meu turno (o oponente joga em seguida)? Padrão: é o meu turno. A conferência da resposta do
   * oponente avalia no começo do meu turno seguinte (eu ajo antes de ele pontuar de novo): passa false.
   */
  turnEnding?: boolean;
}

/** Quanto a mesa vale para `me` (positivo = bom). */
export function evaluate(e: Engine, me: P, opts: EvalOpts = {}): number {
  if (e.winner === me) return 1e6;
  if (e.winner === opp(me)) return -1e6;
  const vs = e.cfg.victoryScore!;
  const arch = W.arch ? opts.arch ?? 'mid' : 'mid';
  const myopic = !!opts.myopic;
  // a avaliação é feita no fim do meu turno (planAction) ou numa resposta no meu turno: o oponente joga em seguida
  const myTurnEnding = opts.turnEnding ?? e.active === me;
  // contra aggro, campo mal defendido custa mais caro; contra control, a corrida por pontos vale mais
  const contested = arch === 'aggro' ? W.contestAggro : arch === 'control' ? W.contestControl : W.contestMid;
  const side = (p: P) => {
    const s = e.pl[p];
    const plan: Plan = p === me ? deckPlan(e, p) : 'mid'; // o deck do oponente é escondido: só o próprio plano
    const nRunes = e.runesOf(p).length;
    let ptW = plan === 'aggro' ? 130 : 120;
    if (p === me && arch === 'control') ptW += 10;
    if (p !== me && arch === 'aggro') ptW += 10;
    let v = s.points * ptW + (s.points >= vs - 1 ? 60 : 0);
    v += Math.min(s.hand.length, 8) * 6;
    // runas: no ramp, cada runa a mais vale bem mais enquanto o deck ainda não chegou ao topo da curva
    v += nRunes * (plan === 'ramp' && nRunes < 12 ? 9 : 4);
    v += s.xp;
    v += trashValue(e, p);
    // deck quase vazio: Burn Out dá ponto ao oponente
    if (s.mainDeck.length < 4) v -= (4 - s.mainDeck.length) * 15;
    for (const u of e.units()) {
      if (u.controller !== p) continue;
      // bônus "neste turno" não contam: somem no fim do turno
      const m = Math.max(0, persistentMight(e, u));
      v += 5 + (p === me && arch === 'aggro' ? 3.4 : 3) * m + permanentValue(e, u) + W.kw * kwValue(lastingKw(e, u));
      if (u.stunned) v -= 1;
    }
    for (const g of e.board()) if (g.controller === p && e.isGear(g) && !e.isUnit(g)) v += permanentValue(e, g);
    for (const l of e.legendsOf(p)) v += empoweredValue(e, l);
    // campos: controle vale um ponto no próximo turno de quem controla, se aguentar o ataque do outro antes disso
    e.bfs.forEach((b, i) => {
      if (b.controller !== p) return;
      if (!e.unitsAtBf(i, p).length) return (v += 20);
      // fim do meu turno: o campo do oponente com unidades dele pontua (hold) no começo do turno dele, sem eu poder
      // fazer mais nada — é praticamente um ponto
      if (myTurnEnding && p !== me && !myopic) return (v += 100);
      v += 55;
      if (myopic) return;
      if (defenseAt(e, i, p) < reach(e, i, opp(p))) v -= contested;
      else v += 5;
    });
    // fim do meu turno: Reactions/Actions na mão com runas prontas para pagar valem mais (posso responder no turno do
    // oponente); gastar tudo no meu turno sem ganhar nada deixa de compensar
    if (myTurnEnding && p === me && !myopic) {
      let ready = e.runesOf(p).filter((r) => !r.exhausted).length;
      const reactive = s.hand
        .map((id) => e.objs[id])
        .filter((o) => o && (e.kw(o).reaction || e.kw(o).action))
        .sort((a, b) => e.data(a).energy - e.data(b).energy);
      for (const o of reactive.slice(0, 2)) {
        if (e.data(o).energy > ready) break;
        ready -= e.data(o).energy;
        v += arch === 'aggro' ? 5 : 4;
      }
    }
    return v;
  };
  let score = side(me) - side(opp(me));
  // o oponente vai pontuar os campos que segura no começo do turno dele: se isso fecha a partida, é quase derrota; se o
  // deixa a um ponto e ele ainda consegue conquistar todos os outros campos no turno dele, também
  if (myTurnEnding && !myopic) {
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
 * com Ganking em outros campos, com o Assault (e o Disarm, que tira Might de um defensor). Unidades em outros campos sem
 * Ganking só voltam para a base.
 */
function reach(e: Engine, i: number, q: P): number {
  let t = 0;
  for (const u of e.units()) {
    if (u.controller !== q || !u.loc) continue;
    if (u.loc.t === 'base' || (u.loc.t === 'bf' && u.loc.i !== i && e.kw(u).ganking)) {
      const k = e.kw(u);
      t += Math.max(0, persistentMight(e, u)) + (k.assault || 0) + (k.disarm || 0);
    }
  }
  return t;
}

/** Might sem os efeitos que acabam no fim do turno ou do combate. */
function persistentMight(e: Engine, u: Obj): number {
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
const PREDICT_RE = /^Predict/;
/** Predict: recicla do topo o que ainda não dá para jogar logo (custa mais que as runas + 1) — fica o que tem jogada. */
function predictPick(d: Decision, e: Engine): Answer {
  const runes = e.runesOf(d.player).length;
  const out = d.options.filter((o) => {
    const x = e.objs[o.obj || o.id];
    return x && e.kind(x) !== 'rune' && cardValue(e, x.id) > runes + 2;
  });
  return out.slice(0, d.max).map((o) => o.id);
}
export function quickPick(d: Decision, e: Engine): Answer {
  if (d.kind === 'priority' || d.kind === 'focus') return ['pass'];
  if (d.kind === 'action') return ['end'];
  if (d.kind === 'mulligan') return mulliganPick(d, e);
  if (d.kind === 'confirm') return [d.options.find((o) => o.id === 'yes')?.id ?? d.options[0].id];
  if (PREDICT_RE.test(d.prompt)) return predictPick(d, e);
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
  /** A busca parou numa decisão de ação da própria IA (dá para seguir o turno a partir daqui). */
  open?: boolean;
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
    readonly start: (path: Step[]) => Stepper | null,
    private me: P,
    private leaf: (d: Decision) => boolean,
    private opts: EvalOpts,
  ) {}

  value(path: Step[], myBr: number, oppBr: number): Res | null {
    const sim = this.start(path);
    if (!sim) return null;
    const p = [...path];
    for (let i = 0; i < 200; i++) {
      const d = sim.cur;
      if (!d || this.leaf(d)) break;
      const open = this.leaves < this.limit && now() < this.until;
      // como pagar: fica o plano automático (1ª opção) — testar cada combinação de runas só gasta o orçamento; Predict:
      // a avaliação não enxerga o deck, a política rápida decide
      if (d.player === this.me && (d.kind === 'choose' || d.kind === 'confirm') && myBr > 0 && open && !PAY_RE.test(d.prompt) && !PREDICT_RE.test(d.prompt)) {
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
    const d = sim.cur;
    return { score: evaluate(sim.e, this.me, this.opts), path: p, open: !!d && d.kind === 'action' && d.player === this.me && sim.e.winner === null };
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

/** Opções da decisão de ação, com "encerrar" primeiro (uma jogada só vale se deixar a mesa melhor que parar agora). */
function rootOptions(d: Decision): string[] {
  return noManualPay(d)
    .options.map((o) => o.id)
    .sort((a, b) => (b === 'end' ? 1 : 0) - (a === 'end' ? 1 : 0));
}

/** Uma decisão da IA em fatias: cada `yield` é um ponto em que a interface pode respirar (desenhar, animar, receber clique). */
type Slices<T> = Generator<void, T, void>;
function runSync<T>(it: Slices<T>): T {
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/**
 * Na decisão de ação da fase principal: testa cada jogada (com as escolhas que ela pede, inclusive mover várias
 * unidades juntas) até a próxima decisão de ação e devolve a melhor sequência. O orçamento de folhas é dividido entre as
 * jogadas, para "mover" (que é a última da lista) não ficar sem vez.
 *
 * Planejamento do turno (Normal e Difícil): as melhores jogadas seguem adiante — a partir da mesa que cada uma deixa, a
 * IA escolhe a melhor jogada seguinte, e a seguinte, até encerrar ou chegar à profundidade do nível. Assim uma jogada
 * que sozinha parece pior mas abre caminho (acelerar runas e então descer a carta grande, mover e então Empower...)
 * ganha da jogada que só é boa isolada.
 */
export function planAction(e: Engine, me: P, level: AiLevel | Partial<Profile> = 'normal', rand?: (salt: number) => number): AiPlan {
  return runSync(planActionIter(e, me, level, rand));
}
function* planActionIter(e: Engine, me: P, level: AiLevel | Partial<Profile>, rand?: (salt: number) => number): Slices<AiPlan> {
  const prof: Profile = typeof level === 'string' ? PROFILES[level] : { ...PROFILES.normal, ...level };
  const t0 = now();
  const opts: EvalOpts = { myopic: prof.myopic, arch: prof.myopic ? 'mid' : oppArchetype(e, me) };
  const best: AiPlan = { seq: [['end']], score: -Infinity };
  const start = (path: Step[]) => {
    const sim = Sim.fromRoot(e);
    for (const s of path) if (!sim.answer(s.a)) return null;
    return sim;
  };
  const search = new Search(start, me, (d) => d.prompt === '__horizon' || d.kind === 'action', opts);
  const d0 = Sim.fromRoot(e).cur;
  if (!d0) return best;
  const roots = rootOptions(d0);
  const results: { id: string; r: Res; score: number; end?: Step[] }[] = [];
  const budget = prof.budget;
  for (let k = 0; k < roots.length; k++) {
    const id = roots[k];
    const share = Math.max(4, Math.floor((budget - search.leaves) / (roots.length - k)));
    const w = id === 'move' ? 2 : 1;
    search.limit = search.leaves + (id === 'move' ? Math.max(share * 2, 40) : share);
    // o tempo que sobra é dividido entre as jogadas que faltam ("mover" conta em dobro)
    const left = roots.slice(k).reduce((t, x) => t + (x === 'move' ? 2 : 1), 0);
    search.until = now() + Math.max(0, t0 + prof.ms - now()) * (w / left);
    const r = search.value([{ a: [id], p: me }], prof.myBr, prof.oppBr);
    if (r) results.push({ id, r, score: r.score - (id === 'end' ? 0 : 1) });
    yield;
  }
  if (!results.length) return best;
  results.sort((a, b) => b.score - a.score);

  // planejamento do turno: segue as K melhores jogadas
  if (prof.turnK > 0 && prof.depth > 0) {
    const top = results.filter((x) => x.id !== 'end' && x.r.open).slice(0, prof.turnK);
    for (let k = 0; k < top.length; k++) {
      const until = now() + Math.max(0, t0 + prof.ms + prof.turnMs - now()) / (top.length - k); // o atraso de uma fase sai da seguinte
      const c = yield* continueTurn(search, top[k].r, me, prof, until);
      if (c.score - 1 > top[k].score) {
        top[k].score = c.score - 1;
        top[k].end = c.path;
      }
    }
    results.sort((a, b) => b.score - a.score);
  }

  // resposta do oponente: os melhores planos são conferidos com o turno seguinte dele (só o público)
  if (prof.verifyK > 0) {
    const tEnd = t0 + prof.ms + prof.turnMs + prof.verifyMs;
    const top = results.slice(0, prof.verifyK);
    const checked: { x: (typeof results)[number]; v: number }[] = [];
    for (let k = 0; k < top.length; k++) {
      const until = now() + Math.max(0, tEnd - now()) / (top.length - k);
      const x = top[k];
      const v = oppTurnValue(start, x.end ?? x.r.path, me, opts, until);
      if (v !== null) checked.push({ x, v: v - (x.id === 'end' ? 0 : 1) });
      yield;
      if (now() > tEnd && checked.length) break;
    }
    if (checked.length) {
      checked.sort((a, b) => b.v - a.v);
      const first = checked[0].x;
      results.splice(results.indexOf(first), 1);
      results.unshift(first);
    }
  }

  let pick = results[0];
  // Fácil: às vezes joga a 2ª melhor (se não for desastre) — erro plausível de quem não calcula tudo
  if (rand && prof.slip > 0 && results.length > 1 && rand(1) < prof.slip) {
    const second = results[1];
    if (second.score > pick.score - 150) pick = second;
  }
  return { seq: ownPrefix(pick.r.path, me), score: pick.score };
}

/**
 * Segue o turno a partir do fim de uma jogada (`r` parou na próxima decisão de ação da IA): escolhe, a cada passo, a
 * melhor jogada seguinte (cada uma testada com uma ramificação curta das escolhas dela) até encerrar, até `prof.depth`
 * jogadas ou até o prazo. Devolve a melhor mesa vista no caminho (parar é sempre possível).
 */
function* continueTurn(search: Search, r: Res, me: P, prof: Profile, until: number): Slices<{ score: number; path: Step[] }> {
  let bestScore = r.score;
  let bestPath = r.path;
  let cur = r;
  for (let step = 0; step < prof.depth && cur.open && now() < until; step++) {
    let next: Res | null = null;
    const d = search.start(cur.path)?.cur;
    if (!d || d.kind !== 'action') break;
    const opts = rootOptions(d).filter((id) => id !== 'end');
    for (let k = 0; k < opts.length && now() < until; k++) {
      search.limit = search.leaves + 4;
      search.until = Math.min(until, now() + (until - now()) / (opts.length - k));
      const x = search.value([...cur.path, { a: [opts[k]], p: me }], 1, prof.oppBr > 0 ? 1 : 0);
      if (x && (!next || x.score > next.score)) next = x;
    }
    yield;
    if (!next || next.score - 1 <= cur.score) break;
    cur = next;
    if (cur.score - 1 > bestScore) {
      bestScore = cur.score - 1;
      bestPath = cur.path;
    }
  }
  return { score: bestScore, path: bestPath };
}

/**
 * O turno seguinte do oponente, jogado só com o que é público: a partir do fim do plano da IA (`path`), ele não joga
 * cartas da mão (escondidas) — só move as unidades que estão na base dele para um campo (cada campo é testado) ou fica
 * parado; combate, pontos de hold e gatilhos correm pelo motor. Devolve a pior mesa para a IA no fim do turno dele
 * (null se o caminho não se refaz). Pega o que a estimativa estática de ameaça erra: palavras-chave, gatilhos, empates.
 */
function oppTurnValue(start: (path: Step[]) => Stepper | null, path: Step[], me: P, opts: EvalOpts, until: number): number | null {
  const o = opp(me);
  // 1. até a primeira decisão de ação do oponente (a IA encerra o turno; o resto pela política rápida)
  let sim = start(path);
  if (!sim) return null;
  const pre = [...path];
  for (let i = 0; i < 300; i++) {
    const d = sim.cur;
    if (!d || sim.e.winner !== null) return evaluate(sim.e, me, opts);
    if (d.kind === 'action' && d.player === o) break;
    const a: Answer = d.kind === 'action' ? ['end'] : quickPick(d, sim.e);
    pre.push({ a, p: d.player });
    if (!sim.answer(a)) return null;
  }
  const d0 = sim.cur!;
  // 2. as respostas do oponente: ficar parado, ou mover as unidades da base para cada campo
  const lines: Answer[][] = [[['end']]];
  if (d0.options.some((x) => x.id === 'move')) {
    if (!sim.answer(['move'])) return null;
    const du = sim.cur;
    if (du && du.kind === 'choose') {
      const pick = du.options.filter((x) => {
        const u = x.obj ? sim!.e.objs[x.obj] : undefined;
        return u && u.loc?.t === 'base';
      });
      const ids = pick.slice(0, du.max).map((x) => x.id);
      if (ids.length >= du.min && ids.length && sim.answer(ids)) {
        const dd = sim.cur;
        if (dd && dd.kind === 'choose')
          for (const opt of dd.options) {
            const x = opt.obj ? sim.e.objs[opt.obj] : undefined;
            if (x && x.zone === 'battlefieldZone') lines.push([['move'], ids, [opt.id]]);
          }
      }
    }
  }
  // 3. cada linha até o fim do turno do oponente; vale a pior para a IA
  let worst: number | null = null;
  for (const line of lines) {
    if (worst !== null && now() > until) break;
    sim = start(pre);
    if (!sim) return worst;
    let ok = true;
    for (const a of line) if (!sim.answer(a)) ok = false;
    if (!ok) continue;
    for (let i = 0; i < 300; i++) {
      const d = sim.cur;
      if (!d || sim.e.winner !== null) break;
      if (d.prompt === '__horizon' && d.player === o) break;
      if (d.kind === 'action' && d.player === me) break;
      const a: Answer = d.kind === 'action' ? ['end'] : quickPick(d, sim.e);
      if (!sim.answer(a)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    // parou na minha primeira decisão de ação do turno seguinte: não é fim do meu turno (eu ajo antes de ele pontuar)
    const v = evaluate(sim.e, me, { ...opts, turnEnding: sim.e.active === me ? false : undefined });
    if (worst === null || v < worst) worst = v;
  }
  return worst;
}

/**
 * Decisões fora da decisão de ação (responder no showdown ou na pilha, distribuir dano, escolhas no turno do oponente):
 * testa cada opção (e as escolhas que ela pede) refazendo a partida a partir das respostas, e joga até o estado assentar.
 * A opção neutra (passar) vai primeiro e as outras precisam ser estritamente melhores: gastar uma carta só quando muda o
 * resultado (salvar a unidade alvo, ganhar o combate...).
 */
export function decideByReplay(game: Game, me: P, level: AiLevel | Partial<Profile> = 'normal'): Answer {
  return runSync(decideByReplayIter(game, me, level));
}
function* decideByReplayIter(game: Game, me: P, level: AiLevel | Partial<Profile>): Slices<Answer> {
  const prof: Profile = typeof level === 'string' ? PROFILES[level] : { ...PROFILES.normal, ...level };
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
  const opts: EvalOpts = { myopic: prof.myopic, arch: prof.myopic ? 'mid' : oppArchetype(game.engine, me) };
  const search = new Search(start, me, (x) => x.kind === 'action', opts);
  let best: Answer = q;
  let bestScore = -Infinity;
  const budget = prof.replyBudget;
  for (let k = 0; k < ordered.length; k++) {
    const c = ordered[k];
    // refazer a partida custa caro no fim do jogo: passado o prazo, as opções restantes ficam sem teste
    if (k > 0 && now() > t0 + prof.replyMs) break;
    search.limit = search.leaves + Math.max(2, Math.floor((budget - search.leaves) / (ordered.length - k)));
    search.until = now() + Math.max(0, t0 + prof.replyMs - now()) / (ordered.length - k);
    const r = search.value([{ a: c, p: me }], 2, prof.oppBr > 0 ? 1 : 0);
    if (r) {
      const sc = r.score - (k === 0 ? 0 : 1);
      if (sc > bestScore) {
        bestScore = sc;
        best = c;
      }
    }
    yield;
  }
  return best;
}

/** Controlador da IA durante a partida: segue o plano da jogada escolhida e decide o resto. */
export class AiPlayer {
  private plan: Answer[] = [];
  /** Turno e jogadas já feitas nele (o Fácil às vezes encerra cedo, depois de já ter feito alguma coisa). */
  private turn = -1;
  private acts = 0;
  constructor(
    public me: P,
    public level: AiLevel = 'normal',
  ) {}

  decide(game: Game): Answer {
    return runSync(this.decideIter(game));
  }

  /**
   * A mesma decisão, em fatias separadas por pausas do navegador: a interface não trava enquanto a IA pensa (o Difícil
   * pensa até ~2 s). `stale()` diz se a partida mudou no meio (desfazer, sair): aí a resposta é descartada (null).
   */
  decideAsync(game: Game, stale: () => boolean = () => false): Promise<Answer | null> {
    const it = this.decideIter(game);
    return new Promise((resolve) => {
      const step = () => {
        if (stale()) return resolve(null);
        const t = now();
        for (;;) {
          const r = it.next();
          if (r.done) return resolve(r.value);
          if (now() - t > 40) break; // ~40 ms por fatia
        }
        setTimeout(step, 0);
      };
      step();
    });
  }

  private *decideIter(game: Game): Slices<Answer> {
    const d = game.current!;
    const e = game.engine;
    const prof = PROFILES[this.level];
    const rand = (salt: number) => chance(e.cfg.seed, game.answers.length, salt + this.me * 31);
    if (d.kind === 'mulligan') return mulliganPick(d, e);
    if (d.kind === 'setup') return [d.options[0].id];
    if (d.kind === 'action') {
      if (e.turn !== this.turn) {
        this.turn = e.turn;
        this.acts = 0;
      }
      // Fácil: às vezes se dá por satisfeito e encerra o turno depois de já ter jogado algo
      if (prof.idle > 0 && this.acts > 0 && rand(2) < prof.idle && d.options.some((o) => o.id === 'end')) return ['end'];
      const p = yield* planActionIter(e, this.me, this.level, rand);
      this.plan = p.seq.slice(1);
      if (p.seq[0]?.[0] !== 'end') this.acts++;
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
    // Fácil: muitas vezes nem pensa em responder na pilha/showdown
    if (prof.lazy > 0 && (d.kind === 'priority' || d.kind === 'focus') && rand(3) < prof.lazy) return quickPick(d, e);
    return yield* decideByReplayIter(game, this.me, this.level);
  }
}
