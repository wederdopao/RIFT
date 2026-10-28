// Partida que começa numa situação montada (modo Desafios, testes): mesa, mãos, runas, pontos e campos fixos.
// É só dado dentro do GameConfig (`scenario`): o motor monta a mesa no começo de `run()` no lugar da preparação normal
// (sem sorteio de campos, mulligan nem compra inicial) e começa direto na fase principal do jogador ativo. Como tudo
// sai do cfg, desfazer, salvar e replay (que refazem a partida pelas respostas) continuam funcionando sem mudança.
import type { DeckList, Engine } from './engine';
import type { Loc, Obj, P } from './types';

/** Uma carta no tabuleiro (unidade, gear ou runa). */
export interface PieceSpec {
  code: string;
  exhausted?: boolean;
  damage?: number;
  /** Tem um buff (+1 Might). */
  buff?: boolean;
  stunned?: boolean;
  /** Equipamentos anexados (códigos de gear; ficam no mesmo local, anexados a esta unidade). */
  gear?: string[];
}
export type Piece = string | PieceSpec;

export interface ScenarioSide {
  legend: string;
  legendExhausted?: boolean;
  /** Campeão escolhido na Champion Zone (pode ser jogado de lá). Sem ele, a zona fica vazia. */
  champion?: string;
  points?: number;
  xp?: number;
  hand?: string[];
  /** Topo do deck primeiro. Sem deck, o motor completa com `filler` (para nenhum "compre 1" virar Burn Out). */
  deck?: string[];
  /** Runas no tabuleiro (na base). */
  runes?: Piece[];
  /** Deck de runas (topo primeiro). Sem ele, fica vazio. */
  runeDeck?: string[];
  base?: Piece[];
  trash?: string[];
}

export interface ScenarioBf {
  code: string;
  owner?: P;
  /** Quem controla o campo (deve bater com quem tem unidades lá). */
  controller?: P | null;
  units?: [Piece[], Piece[]];
  /** Cartas escondidas (Hidden) viradas para baixo neste campo, por jogador; já podem ser jogadas neste turno. */
  facedown?: [string[], string[]];
}

export interface ScenarioSetup {
  /** Número do turno que começa (só importa para efeitos que contam turnos). */
  turn: number;
  /** Quem joga o turno (começa na fase principal dele). */
  active: P;
  /** Quem começou a partida (padrão: o ativo). */
  first?: P;
  sides: [ScenarioSide, ScenarioSide];
  battlefields: ScenarioBf[];
}

/** Carta usada para completar o deck quando o cenário não diz qual (unidade sem texto, cara). */
export const SCENARIO_FILLER = 'OGN-049';
const FILLER_N = 12;

const spec = (x: Piece): PieceSpec => (typeof x === 'string' ? { code: x } : x);

/** Lista de deck que descreve o lado (cfg.decks: nome, lenda, campeão; o motor não usa para montar a mesa). */
export function scenarioDeck(side: ScenarioSide, name: string): DeckList {
  const count = new Map<string, number>();
  for (const c of side.deck ?? []) count.set(c, (count.get(c) ?? 0) + 1);
  return { name, legend: side.legend, champion: side.champion ?? '', main: [...count], runes: [], battlefields: [] };
}

/** Monta a mesa do cenário (chamado por Engine.run no lugar de setup()). Não pergunta nada nem dispara gatilhos. */
export function applyScenario(e: Engine, sc: ScenarioSetup) {
  const turn = sc.turn;
  e.turn = turn - 1; // takeTurn soma 1
  e.first = sc.first ?? sc.active;
  e.active = sc.active;
  e.firstChannelDone = [true, true];
  const place = (o: Obj, loc: Loc, x: PieceSpec) => {
    e.putOnBoard(o, loc, !x.exhausted);
    o.enteredTurn = turn - 1; // já estava na mesa antes deste turno
    o.damage = x.damage ?? 0;
    o.buffs = x.buff ? 1 : 0;
    o.stunned = !!x.stunned;
  };
  const putPiece = (p: P, x0: Piece, loc: Loc) => {
    const x = spec(x0);
    const o = e.newObj(x.code, p, 'setAside');
    place(o, loc, x);
    for (const gc of x.gear ?? []) {
      const gr = e.newObj(gc, p, 'setAside');
      place(gr, loc, { code: gc });
      gr.attachedTo = o.id;
      o.attached = [...(o.attached || []), gr.id];
      gr.attachedTurn = turn - 1;
    }
    return o;
  };
  for (const p of [0, 1] as P[]) {
    const side = sc.sides[p];
    const s = e.pl[p];
    const leg = e.newObj(side.legend, p, 'legend');
    leg.exhausted = !!side.legendExhausted;
    s.legend = leg.id;
    s.champion = side.champion ? e.newObj(side.champion, p, 'champion').id : null;
    s.points = side.points ?? 0;
    s.xp = side.xp ?? 0;
    s.turns = Math.ceil((turn - (p === e.first ? 0 : 1)) / 2);
    const deck = side.deck ?? Array(FILLER_N).fill(SCENARIO_FILLER);
    for (const c of deck) s.mainDeck.push(e.newObj(c, p, 'mainDeck').id);
    for (const c of side.runeDeck ?? []) s.runeDeck.push(e.newObj(c, p, 'runeDeck').id);
    for (const c of side.hand ?? []) s.hand.push(e.newObj(c, p, 'hand').id);
    for (const c of side.trash ?? []) s.trash.push(e.newObj(c, p, 'trash').id);
    for (const r of side.runes ?? []) putPiece(p, r, { t: 'base', p });
    for (const u of side.base ?? []) putPiece(p, u, { t: 'base', p });
  }
  sc.battlefields.forEach((b, i) => {
    const o = e.newObj(b.code, b.owner ?? ((i % 2) as P), 'battlefieldZone');
    e.bfs.push({ objId: o.id, owner: b.owner ?? ((i % 2) as P), controller: b.controller ?? null, contestedBy: null, facedown: [], capacity: 1 });
  });
  for (const b of e.bfs) e.script(e.objs[b.objId]).bfSetup?.(e, e.objs[b.objId]);
  sc.battlefields.forEach((b, i) => {
    for (const p of [0, 1] as P[]) {
      for (const u of b.units?.[p] ?? []) putPiece(p, u, { t: 'bf', i });
      for (const c of b.facedown?.[p] ?? []) {
        const o = e.newObj(c, p, 'facedown');
        o.loc = { t: 'bf', i };
        o.hiddenTurn = turn - 1;
        e.bfs[i].facedown.push(o.id);
      }
    }
  });
  e.say(`Desafio montado: ${e.bfs.map((b) => e.name(b.objId)).join(' e ')}.`);
}
