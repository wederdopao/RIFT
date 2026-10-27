// Visão filtrada da partida (online com informação oculta).
//
// No online o anfitrião roda a partida de verdade (motor com tudo: mãos, ordem dos decks, semente). Para cada convidado
// ou espectador ele monta só o que aquela pessoa pode ver e manda isso, em vez de mandar as respostas da partida (com
// as respostas e a semente qualquer um refaria a partida inteira e veria tudo).
//
// O que vai na visão de quem olha (`viewer`: 0/1 = jogador, -1 = espectador):
//  - tudo que é público (tabuleiro, pilha, descarte, banidas, lendas, campeões, pontos, runas em jogo, registro);
//  - a própria mão e as próprias cartas viradas; as do oponente viram objetos sem código ("??", HIDDEN_CODE);
//  - os decks viram só a contagem (objetos "??" por posição: a ordem nunca sai do anfitrião);
//  - as cartas que a pergunta atual mostra a quem decide (Predict, olhar o topo, mão revelada por efeito...): só para
//    quem decide e só enquanto a pergunta existir;
//  - viradas do oponente com a permissão de olhar (Scuttle Crab, flag 'seeFacedown');
//  - linhas do registro com `to` (olhar carta escondida) só para quem pode ler; os outros leem `pub`;
//  - a pergunta atual inteira só para quem decide; para os outros, só de quem é a vez e o tipo (sem opções).
// Fora da visão: semente, sorteio, respostas, efeitos atrasados e itens pendentes (funções), contexto dos itens da
// pilha, listas dos decks do oponente.
//
// Ids: os objetos escondidos ganham apelidos (o id de verdade diz a posição da carta na lista do deck, o que entregaria
// a carta). Mão e viradas: apelido aleatório que fica o mesmo enquanto a carta continua escondida; decks: apelido por
// posição. Referências a objetos escondidos fora dos lugares onde eles aparecem (registro, por exemplo) viram '?'.
// O convidado responde com os apelidos; o anfitrião troca de volta (`ViewKeeper.unalias`).
//
// O convidado monta um Engine "de leitura" com a visão (`ViewGame`): a mesa chama os mesmos métodos de leitura
// (might, kw, playBlockReason...) e desenha igual. Ele nunca roda regra: só o anfitrião responde as perguntas.
import { Engine, type ChainItem } from './engine';
import { HIDDEN_CODE } from './db';
import { Rng } from './rng';
import type { Decision, LogEntry, Obj, P } from './types';

export type Viewer = P | -1;
export { HIDDEN_CODE };

/** Visão completa (mandada no começo, ao reconectar e quando o outro lado se perde). */
export interface ViewState {
  v: 1;
  me: Viewer;
  /** campos do motor (menos objs e registro), já sem nada escondido */
  e: Record<string, any>;
  o: Record<string, Obj>;
  /** registro a partir da linha `logOff` (a visão completa leva só as últimas linhas) */
  log: LogEntry[];
  logOff: number;
  /** pergunta atual (sem opções quando não é de quem olha) */
  d: Decision | null;
  /** respostas dadas até agora (só o número), última decisão raiz e a resposta raiz (só se a jogada é de quem olha) */
  n: number;
  lr: number | null;
  ra?: string[];
  /** quem olha pode cancelar a jogada em andamento */
  cc: boolean;
  /** partida completa (cfg + respostas), só depois do fim: aí já não há segredo (replay, histórico, relatório) */
  fin?: string;
}

/** Diferença entre duas visões (o que muda a cada jogada). */
export interface ViewDiff {
  e?: Record<string, any>;
  /** campos do motor que deixaram de existir */
  ex?: string[];
  o?: Record<string, Obj | 0>;
  /** o registro volta até a linha `cut` (desfazer) e ganha `add` */
  cut: number;
  add: LogEntry[];
  d: Decision | null;
  n: number;
  lr: number | null;
  ra?: string[];
  cc: boolean;
  fin?: string;
}

/** O que o anfitrião passa para montar a visão. */
export interface ViewSource {
  engine: Engine;
  current: Decision | null;
  answers: readonly string[][];
  lastRoot: number | null;
  canCancel: boolean;
  /** a jogada desde a última decisão raiz foi só de quem olha (então a resposta raiz pode ir junto) */
  rootMine?: boolean;
  /** partida completa, só depois do fim */
  final?: string;
}

/** Quantas linhas do registro a visão completa leva. */
export const VIEW_LOG = 400;

const isObjLike = (v: any): v is Obj => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.code === 'string' && 'zoneVersion' in v;

/** A carta `o` está escondida de `viewer` pelas regras de zona (antes do que a pergunta atual mostra)? */
export function hiddenFrom(eng: Engine, o: Obj, viewer: Viewer): boolean {
  switch (o.zone) {
    case 'mainDeck':
    case 'runeDeck':
      return true;
    case 'hand':
      return viewer === -1 || o.owner !== viewer;
    case 'facedown':
      if (viewer === -1) return true;
      return o.controller !== viewer && o.owner !== viewer && !eng.playerFlag(viewer, 'seeFacedown');
    case 'setAside':
      // fichas de teste (Zilean) e lendas extras declaradas no deck (Neeko) são públicas; a troca do mulligan não
      if (o.token || eng.pl[o.owner].extraLegends?.includes(o.id)) return false;
      return viewer === -1 || o.owner !== viewer;
    case 'battlefieldZone':
      // escolha de campos ("choose"): o campo de quem já escolheu fica escondido até os dois escolherem
      return eng.phase === 'setup' && eng.bfs.length < 2 && (viewer === -1 || o.owner !== viewer);
    default:
      return false;
  }
}

const CHAIN_KEYS = ['id', 'kind', 'controller', 'sourceId', 'cardId', 'label', 'targetIds', 'targetVers', 'repeatIds', 'repeatVers', 'moreRepeats', 'flow', 'isAdd', 'recycleAfter', 'proxyId', 'playedBy', 'spentE'] as const;
/** Campos do motor que nunca vão na visão (sorteio, funções, estado interno) ou que são montados à parte. */
const SKIP = new Set(['objs', 'log', 'rng', 'pending', 'delayed', 'leaveBuf', 'auraCache', 'applyingReps', 'nextId', 'nextEff', 'cfg', 'chain', 'resolvingItem', 'pl', 'bfs', 'effects', 'finalizingTriggers', 'simHorizon']);

const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789';
function randomAlias(): string {
  let s = 'h';
  for (let i = 0; i < 9; i++) s += ALPHA[(Math.random() * ALPHA.length) | 0];
  return s;
}

/**
 * Anfitrião: monta a visão de um jogador/espectador a cada jogada e a diferença para a anterior. Guarda os apelidos
 * dos objetos escondidos (para a resposta do convidado voltar ao id de verdade).
 */
export class ViewKeeper {
  private alias = new Map<string, string>(); // id → apelido (mão/viradas/separadas)
  private back = new Map<string, string>(); // apelido → id (inclui os apelidos de posição do deck)
  private prev: { e: Record<string, string>; o: Record<string, string>; log: string[]; fin?: string } | null = null;
  /** linhas do registro já montadas (ids escondidos viram '?' conforme a mesa na hora em que a linha apareceu) */
  private memo: { src: LogEntry; out: LogEntry }[] = [];
  constructor(public viewer: Viewer) {}

  /** Esquece a visão anterior (a próxima `diff` vira visão completa). */
  reset() {
    this.prev = null;
  }
  get hasPrev() {
    return !!this.prev;
  }

  /** Respostas do convidado: apelidos voltam a ser ids de verdade. */
  unalias(ids: string[]): string[] {
    return ids.map((id) => this.back.get(id) ?? id);
  }

  /** Visão completa (e passa a ser a base das próximas diferenças). */
  full(src: ViewSource): ViewState {
    const v = this.build(src);
    const logOff = Math.max(0, v.log.length - VIEW_LOG);
    this.remember(v);
    return { ...v, log: v.log.slice(logOff), logOff };
  }

  /** Diferença para a última visão mandada (null: não há base; mande `full`). */
  diff(src: ViewSource): ViewDiff | null {
    if (!this.prev) return null;
    const prev = this.prev;
    const v = this.build(src);
    const out: ViewDiff = { cut: 0, add: [], d: v.d, n: v.n, lr: v.lr, ra: v.ra, cc: v.cc };
    const ej: Record<string, string> = {};
    for (const [k, x] of Object.entries(v.e)) {
      const s = JSON.stringify(x);
      ej[k] = s;
      if (prev.e[k] !== s) (out.e ||= {})[k] = x;
    }
    for (const k of Object.keys(prev.e)) if (!(k in v.e)) (out.ex ||= []).push(k);
    const oj: Record<string, string> = {};
    for (const [id, o] of Object.entries(v.o)) {
      const s = JSON.stringify(o);
      oj[id] = s;
      if (prev.o[id] !== s) (out.o ||= {})[id] = o;
    }
    for (const id of Object.keys(prev.o)) if (!(id in v.o)) (out.o ||= {})[id] = 0;
    // registro: manda a partir da primeira linha diferente (normalmente só as novas; depois de desfazer, volta)
    const lj = v.log.map((l) => JSON.stringify(l));
    let cut = 0;
    const m = Math.min(prev.log.length, lj.length);
    while (cut < m && prev.log[cut] === lj[cut]) cut++;
    out.cut = cut;
    out.add = v.log.slice(cut);
    if (v.fin !== prev.fin) out.fin = v.fin;
    this.prev = { e: ej, o: oj, log: lj, fin: v.fin };
    return out;
  }

  private remember(v: ViewState) {
    const e: Record<string, string> = {};
    for (const [k, x] of Object.entries(v.e)) e[k] = JSON.stringify(x);
    const o: Record<string, string> = {};
    for (const [id, x] of Object.entries(v.o)) o[id] = JSON.stringify(x);
    this.prev = { e, o, log: v.log.map((l) => JSON.stringify(l)), fin: v.fin };
  }

  /** Monta a visão inteira (registro inteiro). */
  build(src: ViewSource): ViewState {
    const eng = src.engine;
    const me = this.viewer;
    const d = src.current;
    const mine = !!d && d.player === me;
    // cartas que a pergunta atual mostra a quem decide (topo do deck, mão revelada...); viradas do oponente não
    const shown = new Set<string>();
    if (mine)
      for (const op of d!.options) {
        const o = op.obj ? eng.objs[op.obj] : undefined;
        if (o && o.zone !== 'facedown' && o.zone !== 'battlefieldZone') shown.add(o.id);
      }
    const hidden = new Set<string>();
    for (const o of Object.values(eng.objs)) if (!shown.has(o.id) && hiddenFrom(eng, o, me)) hidden.add(o.id);

    // apelidos: mão/viradas/separadas ficam com o mesmo enquanto continuam escondidas; deck por posição
    const keep = new Set<string>();
    const back = new Map<string, string>();
    const aliasOf = (o: Obj): string => {
      let a = this.alias.get(o.id);
      if (!a) {
        a = randomAlias();
        this.alias.set(o.id, a);
      }
      keep.add(o.id);
      back.set(a, o.id);
      return a;
    };
    const deckAlias = new Map<string, string>();
    for (const p of [0, 1] as P[]) {
      eng.pl[p].mainDeck.forEach((id, i) => hidden.has(id) && deckAlias.set(id, `d${p}.${i}`));
      eng.pl[p].runeDeck.forEach((id, i) => hidden.has(id) && deckAlias.set(id, `r${p}.${i}`));
    }
    const ref = new Map<string, string>(); // id escondido → como ele aparece fora do próprio lugar
    const placeholders: Obj[] = [];
    for (const id of hidden) {
      const o = eng.objs[id];
      const dk = deckAlias.get(id);
      const a = dk ?? aliasOf(o);
      if (dk) back.set(dk, id);
      ref.set(id, dk ? '?' : a);
      const ph: Obj = { id: a, code: HIDDEN_CODE, owner: o.owner, controller: o.controller, zone: o.zone, exhausted: false, damage: 0, buffs: 0, stunned: false, empowered: false, token: false, prevent: 0, zoneVersion: 0 };
      if (o.zone === 'facedown') {
        if (o.loc) ph.loc = { ...o.loc };
        if (o.hiddenTurn !== undefined) ph.hiddenTurn = o.hiddenTurn;
      }
      placeholders.push(ph);
    }
    for (const id of [...this.alias.keys()]) if (!keep.has(id)) this.alias.delete(id);
    this.back = back;
    const pos = (id: string) => deckAlias.get(id) ?? ref.get(id) ?? id; // dentro das listas de zona
    const str = (s: string) => ref.get(s) ?? s; // em qualquer outro lugar

    // cópia sem funções, com objetos trocados por {__obj: id} e ids escondidos trocados
    const plain = (x: any, depth = 0): any => {
      if (x === null || x === undefined) return x;
      if (typeof x === 'string') return str(x);
      if (typeof x === 'number' || typeof x === 'boolean') return x;
      if (typeof x !== 'object' || depth > 12) return undefined;
      if (x instanceof Engine || x instanceof Set || x instanceof Map || x instanceof Rng) return undefined;
      if (Array.isArray(x)) return x.map((y) => plain(y, depth + 1));
      if (isObjLike(x)) return { __obj: str(x.id) };
      const out: any = {};
      for (const [k, y] of Object.entries(x)) {
        const z = plain(y, depth + 1);
        if (z !== undefined) out[k] = z;
      }
      return out;
    };

    // objetos: os visíveis inteiros (ordem do anfitrião), depois os escondidos (ordem dos apelidos: sem pista de
    // quando a carta foi criada)
    const objs: Record<string, Obj> = {};
    for (const o of Object.values(eng.objs)) {
      if (hidden.has(o.id)) continue;
      const c: any = {};
      for (const [k, y] of Object.entries(o)) {
        const z = plain(y, 1);
        if (z !== undefined) c[k] = z;
      }
      c.id = o.id;
      objs[o.id] = c;
    }
    placeholders.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const ph of placeholders) objs[ph.id] = ph;

    // campos do motor
    const e: Record<string, any> = {};
    for (const [k, y] of Object.entries(eng)) {
      if (SKIP.has(k) || typeof y === 'function') continue;
      const z = plain(y);
      if (z !== undefined) e[k] = z;
    }
    const chainItem = (it: ChainItem) => {
      const c: any = {};
      for (const k of CHAIN_KEYS) if ((it as any)[k] !== undefined) c[k] = plain((it as any)[k]);
      return c;
    };
    e.chain = eng.chain.map(chainItem);
    if (eng.resolvingItem) e.resolvingItem = chainItem(eng.resolvingItem);
    e.bfs = eng.bfs.map((b) => ({ ...plain(b), objId: str(b.objId), facedown: b.facedown.map(pos) }));
    e.pl = eng.pl.map((s) => {
      const c = plain(s);
      c.hand = s.hand.map(pos);
      c.mainDeck = s.mainDeck.map(pos);
      c.runeDeck = s.runeDeck.map(pos);
      c.trash = s.trash.map(pos);
      c.banish = s.banish.map(pos);
      if (s.id !== me) c.bfChoices = [];
      return c;
    });
    // efeitos em cartas escondidas de quem olha não vão (diriam qual carta da mão foi escolhida)
    e.effects = eng.effects.filter((x) => !x.target || !hidden.has(x.target)).map((x) => plain(x));
    const cfg = eng.cfg;
    e.cfg = {
      ...plain({ names: cfg.names, firstPlayer: cfg.firstPlayer, battlefieldMode: cfg.battlefieldMode, autoPass: cfg.autoPass, victoryScore: cfg.victoryScore }),
      seed: 0,
      decks: cfg.decks.map((dk, p) =>
        p === me
          ? JSON.parse(JSON.stringify(dk))
          : { name: dk.name, legend: dk.legend, champion: dk.champion, extraLegends: dk.extraLegends ? [...dk.extraLegends] : undefined, main: [], runes: [], battlefields: [] },
      ),
    };

    // registro: linhas privadas viram o texto público; ids de cartas escondidas na hora em que a linha apareceu viram
    // '?' (a linha diz o código: com o id daria para seguir a carta). Cada linha é montada uma vez só (a mesma em todas
    // as visões seguintes); depois de desfazer, as linhas refeitas são montadas de novo.
    const memo = this.memo;
    let same = 0;
    while (same < memo.length && same < eng.log.length && memo[same].src === eng.log[same]) same++;
    memo.length = same;
    for (let i = same; i < eng.log.length; i++) {
      const l = eng.log[i];
      const c: LogEntry = { turn: l.turn, text: l.to && !(me !== -1 && l.to.includes(me)) ? (l.pub ?? '') : l.text };
      if (l.player !== undefined) c.player = l.player;
      if (l.meta) {
        const hid = (id: string) => (hidden.has(id) || !eng.objs[id] ? '?' : id);
        c.meta = { ...l.meta, obj: hid(l.meta.obj), ...(l.meta.targets ? { targets: l.meta.targets.map(hid) } : {}) };
      }
      memo.push({ src: l, out: c });
    }
    const log = memo.map((x) => x.out);

    // pergunta: inteira só para quem decide
    let dv: Decision | null = null;
    if (d) {
      if (!mine) dv = { player: d.player, kind: d.kind, prompt: '', options: [], min: 0, max: 0, ...(d.root ? { root: true } : {}), ...(d.purpose ? { purpose: d.purpose } : {}) };
      else
        dv = {
          ...d,
          options: d.options.map((op) => {
            const c = { ...op };
            if (op.obj && hidden.has(op.obj)) {
              const o = eng.objs[op.obj];
              const nm = eng.name(o);
              c.obj = str(op.obj);
              if (nm) c.label = c.label.split(nm).join('carta escondida');
              if (c.detail) c.detail = c.detail.split(nm).join('carta escondida');
            }
            if (hidden.has(op.id)) c.id = str(op.id);
            return c;
          }),
        };
    }
    const ra = src.rootMine && src.lastRoot !== null && mine ? src.answers[src.lastRoot] : undefined;
    return {
      v: 1,
      me,
      e,
      o: objs,
      log,
      logOff: 0,
      d: dv,
      n: src.answers.length,
      lr: src.lastRoot,
      ...(ra ? { ra: ra.map(str) } : {}),
      cc: mine && src.canCancel,
      ...(src.final ? { fin: src.final } : {}),
    };
  }
}

// ───────────────────────────── lado de quem recebe ─────────────────────────────
const EMPTY: string[] = [];

/** Troca {__obj: id} pelo objeto da visão (o motor de leitura espera objetos de verdade nesses campos). */
function revive(x: any, objs: Record<string, Obj>, depth = 0): any {
  if (!x || typeof x !== 'object' || depth > 12) return x;
  if (Array.isArray(x)) return x.map((y) => revive(y, objs, depth + 1));
  if (typeof x.__obj === 'string' && Object.keys(x).length === 1) return objs[x.__obj] ?? null;
  const out: any = {};
  for (const [k, y] of Object.entries(x)) out[k] = revive(y, objs, depth + 1);
  return out;
}

/**
 * Convidado/espectador: a partida como ele a vê. Tem a mesma cara que `Game` para a mesa (engine, current, answers,
 * lastRoot, canCancel, cfg, serialize), mas não joga: as respostas vão para o anfitrião.
 */
export class ViewGame {
  readonly isView = true;
  engine!: Engine;
  current: Decision | null = null;
  /** só o tamanho vale (e a resposta raiz, quando a jogada é de quem olha); o mesmo array é atualizado no lugar */
  answers: string[][] = [];
  lastRoot: number | null = null;
  canCancel = false;
  error: string | null = null;
  state: ViewState;
  constructor(v: ViewState) {
    this.state = v;
    this.refresh();
  }
  get cfg() {
    return this.engine.cfg;
  }
  get over() {
    return this.engine.winner !== null || this.current === null;
  }
  get viewer(): Viewer {
    return this.state.me;
  }
  /** Partida completa (só depois do fim). */
  get final(): string | undefined {
    return this.state.fin;
  }

  /** Aplica a diferença da jogada seguinte. */
  apply(df: ViewDiff): boolean {
    const v = this.state;
    if (df.cut < v.logOff) return false; // o desfazer voltou para antes das linhas que temos: precisa da visão completa
    if (df.e) for (const [k, x] of Object.entries(df.e)) v.e[k] = x;
    if (df.ex) for (const k of df.ex) delete v.e[k];
    if (df.o) {
      for (const [id, o] of Object.entries(df.o)) if (o === 0) delete v.o[id];
      // objetos que mudaram entram no mesmo lugar; novos no fim
      for (const [id, o] of Object.entries(df.o)) if (o !== 0) v.o[id] = o;
    }
    v.log.length = Math.max(0, df.cut - v.logOff);
    v.log.push(...df.add);
    v.d = df.d;
    v.n = df.n;
    v.lr = df.lr;
    v.ra = df.ra;
    v.cc = df.cc;
    if ('fin' in df) v.fin = df.fin;
    this.refresh();
    return true;
  }

  /** Remonta o motor de leitura com o estado atual (um objeto novo a cada jogada, como a partida refeita). */
  private refresh() {
    const v = this.state;
    const eng: Engine = Object.create(Engine.prototype);
    // os objetos na ordem do anfitrião: ids de verdade pelo número, apelidos depois
    const ids = Object.keys(v.o).sort((a, b) => {
      const na = /^o\d+$/.test(a) ? Number(a.slice(1)) : Infinity;
      const nb = /^o\d+$/.test(b) ? Number(b.slice(1)) : Infinity;
      return na - nb || (a < b ? -1 : a > b ? 1 : 0);
    });
    const objs: Record<string, Obj> = {};
    for (const id of ids) objs[id] = v.o[id];
    Object.assign(eng, revive(v.e, objs));
    eng.objs = objs;
    eng.log = v.log;
    eng.pending = [];
    eng.delayed = [];
    (eng as any).applyingReps = new Set();
    (eng as any).leaveBuf = null;
    (eng as any).finalizingTriggers = 0;
    (eng as any).nextId = 1e9;
    (eng as any).nextEff = 1e9;
    eng.rng = new Rng(1);
    if (!eng.chain) eng.chain = [];
    if (!eng.effects) eng.effects = [];
    this.engine = eng;
    this.current = v.d;
    this.answers.length = v.n;
    this.answers.fill(EMPTY);
    if (v.lr !== null && v.ra && v.lr < v.n) this.answers[v.lr] = v.ra;
    this.lastRoot = v.lr;
    this.canCancel = v.cc;
  }

  // a mesa nunca chama estes no online (as jogadas vão para o anfitrião); ficam por segurança
  answer(_a: string[]): boolean {
    this.error = 'No online, a jogada vai para o anfitrião.';
    return false;
  }
  undo() {}
  cancel() {}
  refreshDecision() {}
  serialize(): string {
    return JSON.stringify({ view: this.state });
  }
  static isSaved(saved: string | null | undefined): boolean {
    return !!saved && saved.startsWith('{"view":');
  }
  static load(saved: string): ViewGame {
    const { view } = JSON.parse(saved);
    if (!view || view.v !== 1) throw new Error('visão inválida');
    return new ViewGame(view);
  }
}
