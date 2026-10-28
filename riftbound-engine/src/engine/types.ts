// Tipos centrais do motor de Riftbound.
// Convenção: todo efeito que pode pedir decisão a um jogador é um gerador (function*)
// que faz `yield` de um Decision e recebe a resposta (lista de ids de opção).

export type P = 0 | 1;
export type Domain = 'Fury' | 'Calm' | 'Mind' | 'Body' | 'Chaos' | 'Order';
export const DOMAINS: Domain[] = ['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order'];

export interface CardData {
  code: string;
  name: string;
  type: string; // texto original ("Unit", "Champion Unit", "Spell", ...)
  rarity: string;
  set: string;
  domains: Domain[];
  energy: number;
  power: number;
  might: number;
  mightBonus: number;
  tags: string[];
  text: string;
  effectText: string;
  errata: boolean;
}

export type Kind = 'unit' | 'spell' | 'gear' | 'legend' | 'battlefield' | 'rune';

/** Palavras-chave. Numéricas somam entre fontes; booleanas fazem OU. */
export interface Keywords {
  accelerate?: boolean;
  action?: boolean;
  reaction?: boolean;
  ambush?: boolean;
  assault?: number;
  backline?: boolean;
  deflect?: number;
  ganking?: boolean;
  hidden?: boolean;
  hunt?: number;
  shield?: number;
  tank?: boolean;
  temporary?: boolean;
  vision?: number;
  quickDraw?: boolean;
  weaponmaster?: boolean;
  unique?: boolean;
  deploy?: boolean;
  disarm?: number;
}

export const NUMERIC_KW: (keyof Keywords)[] = ['assault', 'deflect', 'hunt', 'shield', 'vision', 'disarm'];

/** Custo: energia + lista de "pips" de power; cada pip aceita um conjunto de domínios. */
export interface Cost {
  energy: number;
  power: Domain[][]; // [] = sem power; ['Calm'] = 1 Calm; DOMAINS = qualquer
}

export const NO_COST: Cost = { energy: 0, power: [] };

export type Loc = { t: 'base'; p: P } | { t: 'bf'; i: number };

export type Zone =
  | 'mainDeck'
  | 'runeDeck'
  | 'hand'
  | 'trash'
  | 'banish'
  | 'board'
  | 'chain'
  | 'champion'
  | 'legend'
  | 'facedown'
  | 'battlefieldZone'
  | 'setAside'
  | 'gone';

export interface Obj {
  id: string;
  code: string; // código da carta (ou token)
  owner: P;
  controller: P;
  zone: Zone;
  loc?: Loc; // no tabuleiro / facedown
  exhausted: boolean;
  damage: number;
  buffs: number;
  stunned: boolean;
  empowered: boolean;
  attachedTo?: string; // equipamento -> unidade (use g.attach/g.detach; nunca mude à mão)
  attached?: string[]; // novo: cartas anexadas a esta (carta do topo, 719); mantido por g.attach/g.detach/toZone
  attachedTurn?: number; // novo: turno em que foi anexada pela última vez (Brutalizer: "attached to me this turn")
  mty?: boolean; // novo: estava Mighty na última verificação (evento 'mighty', regra 709)
  mtyN?: Record<number, boolean>; // novo: estava com Might >= N na última verificação (evento 'mightReach')
  token: boolean;
  role?: 'attacker' | 'defender';
  hiddenTurn?: number; // turno em que foi escondida
  prevent: number; // dano a prevenir neste turno
  enteredTurn?: number;
  zoneVersion: number; // muda a cada troca de zona (para checar alvos)
  playedFrom?: Zone; // novo (revisão VEN): zona de onde a carta foi jogada pela última vez (evento cardPlayed.from)
  noMoveTurn?: number; // "não pode se mover neste turno"
  noMoveBy?: P; // novo (UNL chaos): com noMoveTurn, só este jogador não pode movê-la ("They can't move it this turn", Vex, Apathetic)
  attackedThisCombat?: boolean;
  defendedThisCombat?: boolean;
  revealed?: boolean;
  data?: Record<string, any>; // memória da carta (custos opcionais pagos etc.)
  damagedTurn?: number; // novo (VEN): último turno em que recebeu dano (Affectionate Poro: "se não recebi dano neste turno")
  lastDamagedBy?: P; // quem causou o último dano (atribuição de morte, regra 428.5.c)
  lastDmg?: { src?: string; p: P; item?: string; combat?: boolean }; // quem causou o último dano (atribuição de morte, regra 428.5.c); item = item da pilha, combat = dano de combate
  /**
   * Novo (UNL, lote motor): código impresso do objeto enquanto ele é uma cópia de outro (477.1.b; `code` passa a ser o
   * copiado). Use g.becomeCopy; um objeto que não é ficha volta ao impresso quando sai do tabuleiro (vira outro objeto).
   */
  printed?: string;
  /** Novo (UNL body): dano marcado por cada jogador (142.3.a-b: "o seu dano", Elder Dragon); só vale com damage > 0. */
  dmgBy?: [number, number];
}

export interface Option {
  id: string;
  label: string;
  obj?: string; // objeto do tabuleiro ligado à opção (para clique)
  group?: string;
  /** Novo (interface): texto completo ligado à opção (ex.: o texto da carta do gatilho na pergunta de ordem). */
  detail?: string;
}

export type DecisionKind =
  | 'action' // fase principal, estado neutro aberto
  | 'priority' // pilha aberta
  | 'focus' // showdown aberto
  | 'choose'
  | 'mulligan'
  | 'confirm'
  | 'setup';

export interface Decision {
  player: P;
  kind: DecisionKind;
  prompt: string;
  options: Option[];
  min: number;
  max: number;
  root?: boolean; // ponto para onde "cancelar" volta
  /** Novo (interface): a pergunta é de alvo ou de local (a mesa usa para "soltar a carta em cima"); não muda regra. */
  purpose?: 'target' | 'location';
}

export type Answer = string[];
export type Gen<T = void> = Generator<Decision, T, Answer>;

export class IllegalAction extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'IllegalAction';
  }
}

export interface LogEntry {
  turn: number;
  text: string;
  player?: P;
  /** Novo (interface): a carta e os alvos desta linha (histórico de jogadas da mesa). Não muda nada na partida. */
  meta?: { kind: 'play' | 'resolve'; obj: string; code: string; targets?: string[]; fizzled?: boolean };
  /**
   * Novo (online com informação oculta): a linha conta algo que só estes jogadores viram (olhar uma carta escondida);
   * para os outros (oponente, espectador) a visão filtrada troca `text` por `pub`. Não muda nada na partida.
   */
  to?: P[];
  pub?: string;
}
