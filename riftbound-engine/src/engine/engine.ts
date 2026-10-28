// Motor de regras de Riftbound (1x1). Baseado nas Core Rules (16/07/2026) + patch de Radiance (16/10/2026).
// Toda a partida é uma corrotina: `run()` faz yield de decisões e recebe as respostas.
import { cardData, kindOf, isChampionCard, allCards } from './db';
import { TOKENS } from './tokens'; // novo (UNL): nomear tags (763)
import { Rng } from './rng';
import { applyScenario, type ScenarioSetup } from './scenario'; // novo (modo Desafios)
import { getScript, empowerSpecs } from './script';
import type { AbilityDef, ActivatedDef, Aura, CardScript, CostMod, Ctx, EffectText, EventType, OptionalCost, PayUse, TargetSpec, TriggerDef } from './script';
import {
  DOMAINS,
  type CardData,
  IllegalAction,
  NO_COST,
  NUMERIC_KW,
  type Answer,
  type Cost,
  type Decision,
  type DecisionKind,
  type Domain,
  type Gen,
  type Keywords,
  type Kind,
  type Loc,
  type LogEntry,
  type Obj,
  type Option,
  type P,
  type Zone,
} from './types';

export interface DeckList {
  name: string;
  legend: string;
  champion: string;
  main: [string, number][]; // sem a campeã escolhida
  runes: [string, number][];
  battlefields: string[];
  /**
   * Novo (RAD-167 Neeko, Blending In): "If Neeko is in your deck, choose 3 different legends in addition to your starting
   * legend" — as 3 lendas escolhidas (nomes diferentes entre si e da lenda inicial). Ficam fora da partida até um efeito
   * as pôr na Legend Zone (Engine.addLegendWhile). Ver deckcheck.needsExtraLegends / fillExtraLegends.
   */
  extraLegends?: string[];
}

export interface GameConfig {
  seed: number;
  decks: [DeckList, DeckList];
  names?: [string, string];
  firstPlayer?: P | 'random';
  battlefieldMode?: 'random' | 'choose';
  autoPass?: boolean;
  victoryScore?: number;
  /** Novo (modo Desafios): começa numa mesa montada, na fase principal do jogador ativo (src/engine/scenario.ts). */
  scenario?: ScenarioSetup;
}

export interface GameEvent {
  type: EventType;
  [k: string]: any;
}

export interface ChainItem {
  id: string;
  kind: 'spell' | 'ability' | 'trigger';
  controller: P;
  sourceId: string;
  cardId?: string; // spell no chain
  label: string;
  ability: AbilityDef;
  ctx: Ctx;
  targetIds: string[][];
  targetVers: number[][];
  repeatIds?: string[][];
  repeatVers?: number[][];
  /** Novo: execuções a mais de outras instâncias de Repeat pagas (820.3): alvos e versões de cada uma (rep 2, 3...). */
  moreRepeats?: { ids: string[][]; vers: number[][] }[];
  flow?: boolean;
  isAdd?: boolean;
  recycleAfter?: boolean; // "então recicle-o" (regra 390.3.a): ao sair da pilha vai para o fundo do deck
  proxyId?: string; // novo (SFD calm): objeto que representa esta habilidade como alvo (Not So Fast, regra 355.9.a.2)
  /** Novo: quem jogou o spell, quando o controle do item mudou depois (Mystic Reversal): "quando você joga" é dele. */
  playedBy?: P;
  /** Novo (revisão UNL fury): energia gasta nesta jogada do spell; volta a data.spentE quando ela termina (Revna). */
  spentE?: number;
}

/** Plano de pagamento: runas a exaurir/reciclar, Gold, e fontes de [Add] de cartas (com o power que cada uma põe no pool). */
export interface PayPlan {
  exhaust: Obj[];
  recycle: Obj[];
  gold: Obj[];
  adds?: AddSource[];
  addPow?: string[];
  /** Novo: quantidade escolhida para cada fonte de conversão (adds.convert), na ordem de `adds`. */
  addN?: number[];
  /** Novo: custo efetivamente pago com as conversões (Henge: +n de energia; Anomaly: +n [A]). */
  payCost?: Cost;
}
export interface AddSource {
  src: Obj;
  a: ActivatedDef;
  adds: NonNullable<ActivatedDef['adds']>;
}

/** Novo: uma substituição de morte candidata (ver killG). */
interface DeathRep {
  key: string;
  label: string;
  ctrl: P;
  optional: boolean;
  src?: Obj;
  zone?: Zone;
  eff?: TempEffect;
  check: () => boolean;
  apply: () => Gen<boolean>;
}

/** Novo: custo em construção ao jogar uma carta (regra 356): base, adicionais e modificadores próprios. */
export interface CostBuild {
  base: Cost;
  add: Cost; // custos adicionais (Accelerate, opcionais, Repeat)
  plain: number[]; // descontos/aumentos de energia vindos das escolhas (Brazen Buccaneer, Reinforce)
  post: ((c: Cost) => Cost)[]; // descontos de power (Kraken Hunter, Ledros)
  // novo (SFD): Deflect dos alvos (entra antes dos modificadores do custo total, 356.2.a.2/356.4.d) e o que o spell
  // escolheu (Irelia, Graceful); rawSpell: sem os modificadores Aura.spellCostMod (o chamador escolhe a variante)
  defl?: Cost;
  chosen?: Obj[];
  rawSpell?: boolean;
}

interface Pending {
  controller: P;
  sourceId: string;
  ability: AbilityDef;
  ev: GameEvent;
  label: string;
  hiddenBf?: number; // novo: efeito de jogada de permanente jogada a partir de Hidden (811.1.d.2)
  /**
   * Novo: item criado por um gatilho reflexivo ("Then do this", 387-388) no meio de uma resolução. Não é simultâneo com
   * os itens pendentes de antes nem com os de depois: vai para a pilha na ordem em que foi adicionado (337.1.b, 388.2).
   */
  reflexive?: boolean;
}

export interface TempEffect {
  id: number;
  target?: string;
  player?: P;
  until: 'turn' | 'combat' | 'perm';
  might?: number;
  floor?: number; // "até um mínimo de N"
  baseMight?: number;
  kw?: Keywords;
  buffBonus?: number;
  flag?: string;
  turn: number;
  // "a próxima carta (spell/unidade) que você jogar neste turno..." (Raging Firebrand, Ravenborn Tome, Sun Disc)
  nextPlay?: 'spell' | 'unit' | 'card';
  costMod?: number; // energia (negativo = mais barato)
  /** Novo (Vendetta): com nextPlay, pips de power a menos ("[2][Rune][Rune] less", Astral Heron). */
  powerLess?: number;
  enterReady?: boolean;
  bonusDamage?: number;
  retreatCost?: Cost; // flag 'retreat': custo pago para trocar a morte por recall (Unlicensed Armory)
  retreatOptional?: boolean; // novo: flag 'retreat' com "você pode" (o jogador escolhe na hora da morte)
  /** Novo: com nextPlay 'spell': a próxima spell ganha [Repeat] com este custo ('printed' = o custo impresso dela; Temporal Portal). */
  grantRepeat?: Cost | 'printed';
  /** Novo (mind): "você pode jogar um(a) <kind> da mão com custo de energia até N neste turno, ignorando o custo de
   *  energia" (Jayce, Man of Progress): uma vez só; o power ainda é pago (356.1.b.2). */
  playPerm?: { kind: Kind; maxEnergy: number };
  /** Novo (UNL legends): enquanto durar, as cartas que `player` joga (do tipo `kind`; sem fichas se nonToken) custam
   *  `energy` a mais (positivo) ou a menos (Vaults of Helia: "your non-token units cost [1] more to play this turn"). */
  playCostMod?: { energy: number; kind?: Kind; nonToken?: boolean };
  /** Novo (UNL): tags dadas ao alvo ("I gain that tag", Ivern, Friend to All). Ver g.giveTag / g.hasTag. */
  tags?: string[];
  /** Novo (RAD): fonte do efeito (Lady of Clockwork: "até você escolher outro gear comigo"). */
  source?: string;
  /** Novo: versão de zona do alvo quando o efeito foi criado (efeito em carta fora do tabuleiro, ex.: no descarte). */
  ver?: number;
  /** Novo (VEN): habilidade ativada concedida ao alvo enquanto durar (Dominus: "[Rune][Rune]: Ready me"): `activated[index]` do script `code`. */
  grantAct?: { code: string; index: number };
  /** Novo (VEN): [Flow] concedido a uma carta no descarte enquanto durar (Kennen, Storm of Shuriken): custo de Flow. */
  grantFlow?: Cost;
  /** Novo (RAD-147): o alvo tem, enquanto durar, as palavras-chave calculadas por CardScript.grantedKw do código dado. */
  kwFrom?: string;
}

/**
 * Efeito atrasado ("da próxima vez...", "no fim do turno..."). As funções (cond/ability) não devem guardar objetos
 * (Obj) do momento em que foram criadas: guarde o id e busque em `g.objs` — a cópia da IA (cloneAtRoot) reaproveita
 * estas funções, e um objeto guardado seria o da partida de verdade.
 */
export interface Delayed {
  id: number;
  controller: P;
  sourceId: string;
  on: EventType;
  cond?: (c: Ctx, ev: GameEvent) => boolean;
  ability: AbilityDef;
  once: boolean;
  untilTurn?: number;
  /** Novo: limiar de Might, com on 'mightReach'. */
  threshold?: number;
}

export interface Showdown {
  bf: number;
  combat: boolean;
  focus: P;
  passes: number;
  flipAfterChain: boolean;
  attacker?: P;
  defender?: P;
  excess: [number, number];
  /** Caça (gatilhos): o combate acabou de abrir; os gatilhos de estabelecer atacante/defensor ainda não foram para a pilha (464.2.e). */
  opening?: boolean;
}

export interface Bf {
  objId: string;
  owner: P;
  controller: P | null;
  contestedBy: P | null;
  facedown: string[];
  capacity: number;
}

export interface PlayerState {
  id: P;
  name: string;
  deckName: string;
  legend: string;
  /** Novo (RAD-167 Neeko): ids das lendas escolhidas além da inicial (fora da partida, 'setAside', até irem à Legend Zone). */
  extraLegends?: string[];
  champion: string | null;
  mainDeck: string[];
  runeDeck: string[];
  hand: string[];
  trash: string[];
  banish: string[];
  points: number;
  xp: number;
  pool: { energy: number; power: Record<string, number>; only?: { energy: number; power: Record<string, number>; uses: PayUse[] }[]; showdownOnly?: { energy: number; power: Record<string, number> } }; // only (novo, Vendetta): partes do pool com restrição de uso ("só para jogar spells": ['spell']; Ornn: ['gear', 'gearAbility']; Renekton, Butcher: ['unit', 'unitAbility']; Iron Revenant: ['unit', 'gear']); showdownOnly (novo, UNL legends): "só durante showdowns" (Diana, Scorn of the Moon)
  played: string[]; // cartas finalizadas neste turno
  discardedThisTurn: number;
  bfChoices: string[];
  gearDeaths?: number; // novo (RAD): gear deste jogador que morreu neste turno (Lingering Animus)
  unitDeaths?: number; // unidades deste jogador que morreram neste turno (Spoils of War)
  completed?: number; // novo: cartas cuja jogada terminou neste turno (gatilhos de "jogar", regra 419.4.a)
  turns?: number; // novo (SFD): quantos turnos este jogador já começou (Forgotten Monument: "até o terceiro turno dele")
  /** Novo (SFD): escolhas de alvo feitas por este jogador (uma entrada por spell/habilidade, e outra para o Repeat).
   *  enemies: quantas escolhas de unidade/gear inimigo a entrada teve (cada alvo conta; RiftJudge #6758). */
  chooseLog?: { turn: number; src: Kind; enemy: boolean; enemies?: number; enemyUnits?: number }[];
  powerSpent?: { turn: number; n: number }; // novo (SFD): power gasto pagando custos neste turno (Sivir, Mercenary)
  holdPoints?: number; // novo: pontos ganhos por hold neste turno (Needlessly Large Yordle)
  beginDeathTurn?: number; // novo (UNL calm): turno em que uma unidade deste jogador morreu na fase de início (Shadow Watcher)
  drawn?: { turn: number; n: number }; // novo (UNL mind): cartas compradas neste turno (Frigid Jewel: "a segunda carta")
  bigSpell?: number; // novo (UNL mind): último turno em que gastou [4]+ de energia para jogar UM spell (Jhin, Meticulous Killer)
  bfPlays?: { turn: number; n: number }; // novo (RAD): unidades/gear (fichas incluídas) que este jogador jogou para um campo de batalha neste turno (Hold 'Em)
  acts?: { turn: number; uses: PayUse[] }; // novo (Vendetta): habilidades ativadas usadas neste turno (tipo da fonte), Piltovan Forge
  xpGained?: { turn: number; n: number }; // novo (UNL): XP ganha neste turno (Wily Newtfish: "se você ganhou XP neste turno")
  /** Novo (interface): pagamento manual ligado — ao pagar runas, o jogador escolhe quais exaurir e quais reciclar
   *  (verbo 'manualpay' nas decisões raiz; a IA nunca liga). */
  manualPay?: boolean;
}

const opp = (p: P): P => (1 - p) as P;
/** Novo: id da opção raiz que liga/desliga o pagamento manual do jogador (PlayerState.manualPay). */
export const MANUAL_PAY = 'manualpay';

export class Engine {
  cfg: Required<GameConfig>;
  rng: Rng;
  objs: Record<string, Obj> = {};
  pl: [PlayerState, PlayerState];
  bfs: Bf[] = [];
  turn = 0;
  active: P = 0;
  first: P = 0;
  phase: 'setup' | 'awaken' | 'beginning' | 'channel' | 'draw' | 'main' | 'ending' = 'setup';
  chain: ChainItem[] = [];
  pending: Pending[] = [];
  showdown: Showdown | null = null;
  effects: TempEffect[] = [];
  delayed: Delayed[] = [];
  scored: string[] = [];
  /** Novo (SFD): campos conquistados neste turno, `${jogador}-${campo}` (Perched Grimwyrm; regra 469.1). */
  conqueredThisTurn: string[] = [];
  winner: P | null = null;
  winReason = '';
  log: LogEntry[] = [];
  /** Novo (interface): passes seguidos na rodada de prioridade atual (1 = o outro já passou; passar resolve o de cima). */
  prioPasses = 0;
  private nextId = 1;
  stunBatch = 0; // numera as instruções de Stun (evento "uma ou mais")
  private nextEff = 1;
  resolving = 0;
  resolvingBy: P | null = null; // controlador do item que está resolvendo (atribuição de morte)
  /** Item da pilha que está resolvendo agora (atribuição de mortes por instrução de matar). */
  resolvingItem?: ChainItem;
  /** Novo (atribuição de morte, regra 428.5.c): item que acabou de resolver; vale só até a limpeza seguinte. */
  lastResolvedId?: string;
  /** Novo: custo sendo pago agora (matar como custo, regra 428.1.a.1): a morte é atribuída a esta fonte. */
  payingFor?: { src: Obj; p: P };
  /** Novo (Radiance): local escolhido para a jogada em andamento (Hunters' Circle: desconto por local). */
  playingLoc?: Loc;
  /** Novo: limpeza de combate em andamento (regra 428.5.c.2: mortes atribuídas ao dano de combate). */
  combatCleanup = false;
  chainOpenedByTrigger = false;
  firstChannelDone: [boolean, boolean] = [false, false];
  /** Turnos adicionais na fila ("take a turn after this one", regra 735). */
  extraTurns: P[] = [];
  /** Novo: quem joga o turno "normal" depois que os turnos adicionais acabarem (fila de turnos, regra 738). */
  afterExtra: P | null = null;
  /** Em simulações da IA: parar antes da fase final do turno. */
  simHorizon = false;
  /** Novo: eventos 'leave' guardados durante mortes simultâneas (emitidos juntos no fim). */
  private leaveBuf: GameEvent[] | null = null;
  /** Novo: finalizando gatilhos (estado fechado: só [Add] com Reaction no pagamento). */
  private finalizingTriggers = 0;
  /**
   * Novo (Vendetta, motor de custos): para que serve o pagamento em andamento (pilha; o do topo vale): jogar
   * unidade/gear/spell ou habilidade de unidade/gear/lenda. Libera as partes restritas do pool e as fontes de [Add]
   * restritas (ActivatedDef.adds.only). Use asPayFor / asPayForG.
   */
  payUses: (PayUse | PayUse[])[] = []; // lista: o pagamento serve a vários usos (unit gear é unidade e gear)
  /** Novo (SFD): numera as mortes simultâneas (killG) para gatilhos "quando uma ou mais ... morrem" (Sivir). */
  dieBatch = 0;

  constructor(cfg: GameConfig) {
    this.cfg = {
      names: ['Jogador 1', 'Jogador 2'],
      firstPlayer: 'random',
      battlefieldMode: 'random',
      autoPass: true,
      victoryScore: 8,
      ...cfg,
    } as Required<GameConfig>;
    this.rng = new Rng(cfg.seed);
    const mk = (p: P): PlayerState => ({
      id: p,
      name: this.cfg.names[p],
      deckName: cfg.decks[p].name,
      legend: '',
      champion: null,
      mainDeck: [],
      runeDeck: [],
      hand: [],
      trash: [],
      banish: [],
      points: 0,
      xp: 0,
      pool: { energy: 0, power: {} },
      played: [],
      discardedThisTurn: 0,
      bfChoices: [],
    });
    this.pl = [mk(0), mk(1)];
  }

  // ───────────────────────────── utilidades ─────────────────────────────
  say(text: string, player?: P, meta?: LogEntry['meta']) {
    this.log.push(meta ? { turn: this.turn, text, player, meta } : { turn: this.turn, text, player });
  }
  /**
   * Novo (online com informação oculta): linha do registro que só `to` pode ler (ex.: olhar uma carta escondida); os
   * outros leem `pub` na visão filtrada (src/engine/view.ts). Na partida local o texto aparece como sempre.
   */
  sayTo(to: P[], text: string, pub: string, player?: P) {
    this.log.push({ turn: this.turn, text, player, to, pub });
  }
  name(o: Obj | string): string {
    const obj = typeof o === 'string' ? this.objs[o] : o;
    return obj ? cardData(obj.code).name : '?';
  }
  pname(p: P) {
    return this.pl[p].name;
  }
  /**
   * Script efetivo da carta. Novo (Spiritforged): carta anexada tem o texto de regras inativo (718.2, 135.4) e a carta do
   * topo ganha o texto de efeito dos equipamentos anexados (136.2.c, 719.1). Use `baseScript` para o texto impresso.
   */
  script(o: Obj): CardScript {
    const base = getScript(o.code) || { code: o.code };
    if (o.zone !== 'board') return base;
    if (o.attachedTo) return inactiveView(base);
    if (o.attached?.length) return this.withEffectText(o, base, o.attached);
    return base;
  }
  /** Novo: script impresso (sem texto de efeito acrescentado nem texto inativo). */
  baseScript(o: Obj): CardScript {
    return getScript(o.code) || { code: o.code };
  }
  /** Novo: texto de efeito que `gear` dá a `unit` (136; `equipped` pode ser função, ex.: Svellsongur). */
  effectTextOf(gear: Obj, unit: Obj): EffectText | undefined {
    const e = getScript(gear.code)?.equipped;
    return typeof e === 'function' ? e(this, gear, unit) : e;
  }
  /**
   * Novo: script de `o` com o texto de efeito das cartas `ids` acrescentado (719.1). Gatilhos/ativadas recebem c.gear;
   * auras e substituições recebem o equipamento como último argumento. Cache por (carta, equipamentos) quando estático.
   */
  withEffectText(o: Obj, base: CardScript, ids: string[]): CardScript {
    const gears = ids.map((id) => this.objs[id]).filter(Boolean);
    if (!gears.length) return base;
    const dynamic = gears.some((x) => typeof getScript(x.code)?.equipped === 'function');
    const key = dynamic ? '' : `${o.code}#${gears.map((x) => `${x.id}=${x.code}`).join(',')}`;
    if (key) {
      const hit = MERGED.get(key);
      if (hit) return hit;
    }
    const m: CardScript = { ...base };
    for (const gr of gears) {
      const et = this.effectTextOf(gr, o);
      if (!et) continue;
      const gid = gr.id;
      const gd = cardData(gr.code);
      const dk = /\[deathknell\]/i.test(gd.effectText || '');
      if (et.triggers?.length)
        m.triggers = [...(m.triggers || []), ...et.triggers.map((t) => ({ ...withGearCtx(t, gid), label: `${gd.name}: ${t.label}`, __dk: dk }) as TriggerDef)];
      if (et.activated?.length) m.activated = [...(m.activated || []), ...et.activated.map((a) => ({ ...withGearCtx(a, gid), label: `${gd.name}: ${a.label}` }))];
      if (et.auras?.length) m.auras = [...(m.auras || []), ...et.auras.map((a) => withGearArg(a, gid))];
      if (et.deathReplacements?.length)
        m.deathReplacements = [...(m.deathReplacements || []), ...et.deathReplacements.map((d) => ({ ...withGearArg(d, gid), label: `${gd.name}: ${d.label}` }))];
      for (const k of ['noCombatDamage', 'damageLast', 'noDamage'] as const) {
        const f = et[k];
        if (!f) continue;
        const prev = m[k];
        m[k] = (g: Engine, self: Obj) => !!prev?.(g, self) || f(g, self, g.objs[gid]);
      }
      // novo (SFD calm): "se você fosse revelar" vinda do texto de efeito (Svellsongur + Void Hatchling): cada instância
      // se aplica uma vez, uma depois da outra (370.2)
      if (et.beforeReveal) {
        const prev = m.beforeReveal;
        const f = et.beforeReveal;
        m.beforeReveal = function* (g, self, p, owner, deck) {
          if (prev) yield* prev(g, self, p, owner, deck);
          if (self.zone === 'board') yield* f(g, self, p, owner, deck, g.objs[gid]);
        };
      }
      // novo (caça UNL): "se você fosse jogar uma ficha de unidade" vinda do texto de efeito (Svellsongur + Zilean, Time
      // Mage): outra instância da substituição, aplicada uma vez à mesma jogada (370.2; RiftJudge #10154)
      if (et.tokenPlayReplace) {
        const prev = m.tokenPlayReplace;
        const f = et.tokenPlayReplace;
        m.tokenPlayReplace = function* (g, self, code, p, loc) {
          let n = prev ? yield* prev(g, self, code, p, loc) : 0;
          if (self.zone === 'board') n += yield* f(g, self, code, p, loc, g.objs[gid]);
          return n;
        };
      }
    }
    if (key) {
      if (MERGED.size > 20000) MERGED.clear();
      MERGED.set(key, m);
    }
    return m;
  }
  data(o: Obj) {
    return cardData(o.code);
  }
  kind(o: Obj): Kind {
    return kindOf(o.code);
  }
  /**
   * Unidade? Novo (RAD/VEN): inclui o unit gear (149.3, 152.2, 323.7, 359.2.d, 457.1) — objeto que é unidade e gear ao
   * mesmo tempo: o impresso ("Unit Gear", Patched Porobot; o tipo vale em todas as zonas, 141.2.b) e o gear que vira
   * unit gear por efeito no tabuleiro (Lady of Clockwork; g.makeUnitGear). `kind` continua 'gear' (isGear também vale).
   */
  isUnit(o: Obj) {
    const k = this.kind(o);
    return k === 'unit' || (k === 'gear' && this.isUnitGear(o));
  }
  isGear(o: Obj) {
    return this.kind(o) === 'gear';
  }
  /** Novo: `o` é um unit gear agora (impresso, ou por efeito enquanto está no tabuleiro). */
  isUnitGear(o: Obj): boolean {
    if (this.kind(o) !== 'gear') return false;
    if (/unit gear/i.test(this.data(o).type)) return true;
    if (this.lookbackUnit === o.id) return true; // novo (revisão RAD): gatilhos de morte olham para trás (ver emit)
    return o.zone === 'board' && this.effects.some((e) => e.target === o.id && e.flag === 'unitGear');
  }
  /**
   * Novo (revisão RAD): id do gear que era unidade por efeito (Lady of Clockwork) enquanto os gatilhos da morte dele são
   * conferidos: o gatilho vê a permanente como ela era ao morrer (323.4, 428.1.a.1.b: localização e atributos anotados).
   */
  lookbackUnit?: string;
  /** Novo: o objeto é do tipo `k`? 'unit' conta o unit gear (isUnit); os outros pelo tipo da carta. */
  isKind(o: Obj, k: Kind): boolean {
    return k === 'unit' ? this.isUnit(o) : this.kind(o) === k;
  }
  /** Novo: tipo com que a carta é jogada: unit gear é jogado como unidade (local à escolha, entra exaurido; 359.2.c). */
  playKind(o: Obj): Kind {
    const k = this.kind(o);
    return k === 'gear' && this.isUnit(o) ? 'unit' : k;
  }
  /**
   * Novo (RAD): `gear` "se torna um unit gear com Might igual ao custo de energia" (Lady of Clockwork) enquanto estiver
   * no tabuleiro, até `src` escolher outro gear: o efeito anterior da mesma fonte acaba aqui. Anexado, ele se desanexa
   * (unidade não fica anexada; fica no local de antes). Quem deixa de ser unidade perde o dano marcado e a designação de
   * combate; num campo, a próxima limpeza o chama de volta (149.3) se não tiver Deploy.
   */
  makeUnitGear(gear: Obj, src: Obj, might = this.data(gear).energy) {
    this.endUnitGear(src);
    if (gear.zone !== 'board' || !this.isGear(gear)) return;
    if (gear.attachedTo) this.detach(gear, src.controller);
    this.addEffect({ target: gear.id, flag: 'unitGear', baseMight: might, until: 'perm', source: src.id });
    this.say(`${this.name(gear)} vira um unit gear com ${might} de Might.`);
    // novo (revisão RAD): virou unidade num campo que o controlador não controla: o campo fica disputado (patch notes
    // das Core Rules do Radiance, Lady of Clockwork)
    const l = this.locOf(gear);
    if (l?.t === 'bf') this.applyContested(l.i, gear.controller);
  }
  /**
   * Novo (revisão RAD): acaba o "vira unit gear" dado por `src` (o gear anterior deixa de ser unidade). A Lady of Clockwork
   * chama ao finalizar o gatilho, quando escolhe o gear novo (patch notes do Radiance: entre finalizar e resolver,
   * nenhum dos dois é unidade).
   */
  endUnitGear(src: Obj) {
    const old = this.effects.filter((e) => e.flag === 'unitGear' && e.source === src.id);
    this.effects = this.effects.filter((e) => !old.includes(e));
    for (const e of old) {
      const o = e.target ? this.objs[e.target] : undefined;
      if (o && o.zone === 'board' && !this.isUnit(o)) {
        o.damage = 0;
        o.role = undefined;
        this.say(`${this.name(o)} deixa de ser unidade.`);
      }
    }
  }
  newObj(code: string, owner: P, zone: Zone, token = false): Obj {
    const o: Obj = {
      id: 'o' + this.nextId++,
      code,
      owner,
      controller: owner,
      zone,
      exhausted: false,
      damage: 0,
      buffs: 0,
      stunned: false,
      empowered: false,
      token,
      prevent: 0,
      zoneVersion: 0,
    };
    this.objs[o.id] = o;
    return o;
  }
  locEq(a?: Loc, b?: Loc) {
    if (!a || !b) return false;
    if (a.t !== b.t) return false;
    return a.t === 'base' ? a.p === (b as any).p : a.i === (b as any).i;
  }
  locOf(o: Obj): Loc | undefined {
    if (o.attachedTo) {
      const u = this.objs[o.attachedTo];
      if (u) return u.loc;
    }
    return o.loc;
  }
  locName(l?: Loc): string {
    if (!l) return '?';
    if (l.t === 'base') return `base de ${this.pname(l.p)}`;
    return this.name(this.bfs[l.i].objId);
  }
  bfIndex(o: Obj): number {
    const l = this.locOf(o);
    return l && l.t === 'bf' ? l.i : -1;
  }
  board(): Obj[] {
    return Object.values(this.objs).filter((o) => o.zone === 'board');
  }
  units(): Obj[] {
    return this.board().filter((o) => this.isUnit(o));
  }
  unitsAt(l: Loc): Obj[] {
    return this.units().filter((u) => this.locEq(u.loc, l));
  }
  unitsAtBf(i: number, p?: P): Obj[] {
    return this.unitsAt({ t: 'bf', i }).filter((u) => p === undefined || u.controller === p);
  }
  runesOf(p: P): Obj[] {
    return this.board().filter((o) => this.kind(o) === 'rune' && o.controller === p);
  }
  gearOf(p: P): Obj[] {
    return this.board().filter((o) => this.isGear(o) && o.controller === p);
  }
  legendOf(p: P): Obj {
    return this.objs[this.pl[p].legend];
  }
  /**
   * Novo (RAD-167 Neeko): todas as lendas na Legend Zone de p — a inicial e as acrescentadas por efeito
   * (addLegendWhile), que têm as habilidades ativas como a inicial. `legendOf` continua sendo a lenda inicial.
   */
  legendsOf(p: P): Obj[] {
    const s = this.pl[p];
    if (!s.legend) return [];
    const out = [this.legendOf(p)];
    for (const id of s.extraLegends || []) {
      const o = this.objs[id];
      if (o && o.zone === 'legend' && o.controller === p) out.push(o);
    }
    return out;
  }
  /**
   * Novo (RAD-167 Neeko): põe a lenda `leg` (de pl[p].extraLegends, fora da partida) na Legend Zone de p enquanto `src`
   * estiver no tabuleiro ("add it to your Legend Zone while I'm on the board"). Quando `src` sai do tabuleiro, ela volta
   * para fora da partida (toZone). Já na Legend Zone: nada acontece.
   */
  addLegendWhile(p: P, leg: Obj, src: Obj): boolean {
    if (leg.zone === 'legend' || src.zone !== 'board') return false;
    leg.zone = 'legend';
    leg.zoneVersion++;
    leg.controller = p;
    leg.exhausted = false;
    leg.data = { ...(leg.data || {}), legendWhile: src.id, legendWhileVer: src.zoneVersion };
    this.say(`${this.pname(p)} põe ${this.name(leg)} na Legend Zone (enquanto ${this.name(src)} estiver no tabuleiro).`, p);
    return true;
  }
  /** Novo: lendas fora da partida que p escolheu na montagem do deck (Neeko) e ainda não estão na Legend Zone. */
  extraLegendsOut(p: P): Obj[] {
    return (this.pl[p].extraLegends || []).map((id) => this.objs[id]).filter((o) => o && o.zone === 'setAside');
  }
  /** Índice do campo de batalha cujo objeto é `o` (-1 se não for campo). */
  bfOf(o: Obj): number {
    return this.bfs.findIndex((b) => b.objId === o.id);
  }
  bfObj(i: number): Obj {
    return this.objs[this.bfs[i].objId];
  }
  /** Cartas anexadas a `u` (719). Mantido por attach/detach/toZone — nunca mude `attachedTo` à mão. */
  attachedTo(u: Obj): Obj[] {
    if (!u.attached?.length) return [];
    return u.attached.map((id) => this.objs[id]).filter((g) => g && g.zone === 'board' && g.attachedTo === u.id);
  }
  /**
   * Novo (mind): o objeto tem a tag? Sem diferenciar maiúsculas (o banco tem "mech" e "Mech") e contando as tags dadas
   * pelo texto de efeito de equipamentos anexados ("I am a Mech", Experimental Hexplate; EffectText.tags).
   */
  hasTag(o: Obj, tag: string): boolean {
    const t = tag.toLowerCase();
    if (this.data(o).tags.some((x) => x.toLowerCase() === t)) return true;
    if (o.zone === 'board')
      for (const g of this.attachedTo(o)) if (this.effectTextOf(g, o)?.tags?.some((x) => x.toLowerCase() === t)) return true;
    // novo (UNL): tags dadas por efeitos (g.giveTag; Ivern, Friend to All: "I gain that tag")
    if (this.effects.some((e) => e.target === o.id && e.tags?.some((x) => x.toLowerCase() === t))) return true;
    return false;
  }
  /** Novo (UNL): dá a tag `tag` ao objeto no tabuleiro (padrão: enquanto ele estiver no tabuleiro). */
  giveTag(o: Obj, tag: string, until: 'turn' | 'combat' | 'perm' = 'perm') {
    if (o.zone !== 'board') return;
    this.addEffect({ target: o.id, tags: [tag], until });
    this.say(`${this.name(o)} ganha a tag ${tag}.`);
  }
  // ── equipamento (Spiritforged, lote motor; regras 150, 434, 435, 716-725, 818, 819, 821) ──
  /** Gear com a tag Equipment (150.1). */
  isEquipment(o: Obj): boolean {
    return this.isGear(o) && this.data(o).tags.includes('Equipment');
  }
  /** Unidade "equipada": tem pelo menos um Equipamento anexado (818.3). */
  isEquipped(u: Obj): boolean {
    return this.attachedTo(u).some((g) => this.isEquipment(g));
  }
  /** Equipamentos anexados a `u`. */
  equipmentOf(u: Obj): Obj[] {
    return this.attachedTo(u).filter((g) => this.isEquipment(g));
  }
  /** Carta do topo em que `o` está anexada (ou undefined). */
  topMost(o: Obj): Obj | undefined {
    return o.attachedTo && o.zone === 'board' ? this.objs[o.attachedTo] : undefined;
  }
  /** A carta tem Equip (818.5: característica, vale mesmo com o texto inativo, 818.5.a). */
  hasEquip(gear: Obj): boolean {
    const s = this.baseScript(gear);
    return !!(s.equipCost || s.equipFor || s.equipExtra);
  }
  /** Custo de recursos do Equip de `gear` escolhendo `unit` (818.1.c.4: com os modificadores de custo de Equip). */
  equipCostFor(gear: Obj, unit: Obj, p: P = gear.controller): Cost {
    const s = this.baseScript(gear);
    const c = s.equipFor ? s.equipFor(this, gear, unit, p) : s.equipCost || NO_COST;
    let e = c.energy;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) if (a.equipCostMod) e += a.equipCostMod(this, src, gear, unit, p);
    return { energy: Math.max(0, e), power: [...c.power] };
  }
  /**
   * Custo do Equip pelo Weaponmaster: o mesmo custo reduzido em [A] (821.1.c). [A] é power de qualquer domínio
   * (135.2.e.5.a), então o desconto tira um pip de power de qualquer domínio: Equip [Fury] sai de graça, Equip [1][Mind]
   * vira [1], e o [Order] do Blade of the Ruined King sai mas a morte continua (RiftJudge #8841, #10503, #10704). Só não
   * reduz um Equip sem power nenhum (821.1.c.3). Energia e custos não de recursos não mudam. Com pips diferentes, sai o
   * mais restrito (o melhor para quem paga).
   */
  weaponmasterCost(gear: Obj, unit: Obj, p: P): Cost {
    const c = this.equipCostFor(gear, unit, p);
    if (!c.power.length) return c;
    let k = 0;
    c.power.forEach((pip, i) => { if (pip.length < c.power[k].length) k = i; });
    return { energy: c.energy, power: c.power.filter((_, i) => i !== k) };
  }
  /** p consegue pagar o Equip (recursos + parte não de recursos) de `gear` em `unit`? `cost` = custo já calculado. */
  canPayEquip(p: P, gear: Obj, unit: Obj, cost = this.equipCostFor(gear, unit, p), gearAbility = true): boolean {
    const ex = this.baseScript(gear).equipExtra;
    if (ex && !ex.canPay(this, gear, p, !gearAbility)) return false; // novo (RAD-150): 4º arg = pago pelo Weaponmaster
    return this.asPayFor(gearAbility ? 'gearAbility' : undefined, () => this.canPay(p, cost));
  }
  /** Unidades em que p pode ativar o Equip de `gear` agora (alvo: unidade que p controla, 818.1.c.2). */
  equipTargets(p: P, gear: Obj): Obj[] {
    return this.units().filter((u) => u.controller === p && u.id !== gear.id && this.canPayEquip(p, gear, u));
  }
  /**
   * p pode ativar o Equip de `gear` neste momento? Só com o gear solto (anexado, o texto de regras com o Equip fica
   * inativo: 718.2; mudar de unidade só com Weaponmaster ou efeitos de anexar), controlado por p, no timing do Equip
   * (padrão: fase principal do próprio turno, estado neutro aberto; 818.1.c.5 permite outro).
   */
  canEquip(p: P, gear: Obj, timing: 'main' | 'focus' | 'priority'): boolean {
    if (gear.zone !== 'board' || gear.controller !== p || gear.attachedTo || !this.isGear(gear) || this.isUnit(gear) || !this.hasEquip(gear)) return false;
    const t = this.baseScript(gear).equipTiming;
    if (timing === 'main' && p !== this.active) return false;
    if (timing === 'focus' && !t) return false;
    if (timing === 'priority' && t !== 'reaction') return false;
    return this.equipTargets(p, gear).length > 0;
  }
  isFriendly(a: Obj, p: P) {
    return a.controller === p;
  }
  isAlone(u: Obj): boolean {
    const l = u.loc;
    return this.units().filter((x) => x.id !== u.id && x.controller === u.controller && this.locEq(x.loc, l)).length === 0;
  }
  ctx(self: Obj, p: P, extra: Partial<Ctx> = {}): Ctx {
    return { g: this, self, p, targets: [], data: {}, rep: 0, ...extra };
  }
  isMighty(u: Obj) {
    return this.might(u) >= 5;
  }
  /** [Level N] (824): p tem N ou mais XP. */
  level(p: P, n: number) {
    return this.pl[p].xp >= n;
  }
  /**
   * Novo (UNL): o texto "[Level N][>]" de `o` está ativo? Usa a XP do controlador de `o` (824.1.c; se o controle muda,
   * vale a XP do novo, 824.1.c.1). Na mão/descarte o controlador é o dono; ao calcular o custo de quem joga, passe `p`.
   */
  levelReached(o: Obj, n: number, p: P = o.controller) {
    return this.level(p, n);
  }
  legion(self: Obj, p: P) {
    return this.pl[p].played.some((id) => id !== self.id);
  }
  inCombat(u: Obj) {
    return !!(this.showdown?.combat && this.bfIndex(u) === this.showdown.bf && u.role);
  }

  // ───────────────────────────── características ─────────────────────────────
  /** Cache de auraSources() durante um cálculo só de leitura (withAuraCache): o tabuleiro não muda no meio dele. */
  private auraCache?: Obj[];
  /** Roda `f` (que só lê o estado) com as fontes de aura calculadas uma vez só. */
  withAuraCache<T>(f: () => T): T {
    if (this.auraCache) return f();
    this.auraCache = this.auraSources();
    try {
      return f();
    } finally {
      this.auraCache = undefined;
    }
  }
  auraSources(): Obj[] {
    if (this.auraCache) return [...this.auraCache];
    const out = this.board();
    for (const p of [0, 1] as P[]) out.push(...this.legendsOf(p)); // novo (Neeko): lendas acrescentadas também
    for (const b of this.bfs) out.push(this.objs[b.objId]);
    return out;
  }
  mergeKw(a: Keywords, b?: Keywords) {
    if (!b) return a;
    for (const k of Object.keys(b) as (keyof Keywords)[]) {
      const v = (b as any)[k];
      if (v === undefined || v === false) continue;
      if (NUMERIC_KW.includes(k)) (a as any)[k] = ((a as any)[k] || 0) + (v === true ? 1 : v);
      else (a as any)[k] = true;
    }
    return a;
  }
  baseKeywords(o: Obj): Keywords {
    // caça UNL: baseScript (as palavras-chave são as mesmas do script efetivo: anexada e texto de efeito mantêm `keywords`)
    // para o Svellsongur poder copiar as de uma ficha sem script (Bird: [Deflect] do texto) sem recursão
    const s = this.baseScript(o);
    if (s.keywords) return { ...s.keywords };
    // fichas e cartas sem script: palavras-chave óbvias do texto. Carta com script declara as próprias palavras-chave:
    // o texto dela pode citar a palavra-chave de outra coisa (Sprite Mother joga uma ficha "with [Temporary]"; Spirit's
    // Refuge dá [Deflect] às unidades; Fiora só tem [Deflect] enquanto Mighty), e ler o texto dava a palavra-chave a ela.
    if (getScript(o.code)) return {};
    const t = this.data(o).text;
    const k: Keywords = {};
    if (/\[Deflect\]/i.test(t)) k.deflect = 1;
    if (/\[Temporary\]/i.test(t)) k.temporary = true;
    return k;
  }
  kw(o: Obj): Keywords {
    const k = this.baseKeywords(o);
    const s = this.script(o);
    const onBoard = o.zone === 'board' || o.zone === 'facedown';
    if (onBoard) {
      this.mergeKw(k, s.kwMod?.(this, o));
      // texto de efeito dos equipamentos anexados (136.2.c)
      for (const g of this.attachedTo(o)) {
        const et = this.effectTextOf(g, o);
        this.mergeKw(k, et?.keywords);
        this.mergeKw(k, et?.kwMod?.(this, g, o));
      }
      for (const e of this.effects) if (e.target === o.id && e.kw) this.mergeKw(k, e.kw);
    }
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        if (onBoard && a.keywords) this.mergeKw(k, a.keywords(this, src, o));
        if (a.keywordsAnywhere) this.mergeKw(k, a.keywordsAnywhere(this, src, o)); // novo: em qualquer zona (Jax, Unmatched)
      }
    // novo (RAD-147): habilidade dada por efeito que calcula palavras-chave ("I have [Assault] equal to my [Shield]" neste
    // turno): TempEffect.kwFrom = código cujo CardScript.grantedKw recebe as palavras-chave já somadas (sem recursão)
    if (onBoard) for (const e of this.effects) if (e.target === o.id && e.kwFrom) this.mergeKw(k, getScript(e.kwFrom)?.grantedKw?.(this, o, { ...k }));
    return k;
  }
  /**
   * Novo: palavras-chave que FUNCIONAM agora. Numa carta anexada o texto de regras impresso fica inativo (718.2): só
   * valem as dadas por outros efeitos (135.4.b). Ex.: Spinning Axe anexado não morre pelo Temporary (722.2).
   * `kw` continua dando as impressas para referência (722.1: "um gear com [Temporary]").
   */
  activeKw(o: Obj): Keywords {
    if (!(o.zone === 'board' && o.attachedTo)) return this.kw(o);
    const k: Keywords = {};
    for (const e of this.effects) if (e.target === o.id && e.kw) this.mergeKw(k, e.kw);
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        if (a.keywords) this.mergeKw(k, a.keywords(this, src, o));
        if (a.keywordsAnywhere) this.mergeKw(k, a.keywordsAnywhere(this, src, o));
      }
    return k;
  }
  buffValue(o: Obj): number {
    if (!o.buffs) return 0;
    let per = 1;
    for (const e of this.effects) if (e.buffBonus && e.player === o.controller) per += e.buffBonus;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) if (a.buffBonus) per += a.buffBonus(this, src, o);
    return o.buffs * per;
  }
  might(o: Obj): number {
    const d = this.data(o);
    if (o.zone !== 'board') return d.might;
    let base = d.might;
    for (const e of this.effects) if (e.target === o.id && e.baseMight !== undefined) base = e.baseMight;
    let m = base + this.buffValue(o);
    let neg = 0;
    let floor = -Infinity;
    // Might Bonus (137.3) e texto de efeito dos anexados
    for (const g of this.attachedTo(o)) {
      m += this.data(g).mightBonus;
      m += this.effectTextOf(g, o)?.mightMod?.(this, g, o) || 0;
    }
    for (const e of this.effects)
      if (e.target === o.id && e.might) {
        if (e.might < 0 && e.floor !== undefined) {
          neg += e.might;
          floor = Math.max(floor, e.floor);
        } else m += e.might;
      }
    m += this.script(o).mightMod?.(this, o) || 0;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) if (a.might) m += a.might(this, src, o);
    // auras de Might negativo com mínimo (Leona, Zealot)
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const r = a.mightFloor?.(this, src, o);
        if (r) {
          neg += r.might;
          floor = Math.max(floor, r.floor);
        }
      }
    const k = this.kw(o);
    if (o.role === 'defender') m += k.shield || 0;
    if (o.role === 'attacker') m += k.assault || 0;
    if (neg) m = Math.max(Math.min(m, floor), m + neg);
    return m;
  }
  combatMight(o: Obj): number {
    if (o.stunned) return 0;
    if (this.script(o).noCombatDamage?.(this, o)) return 0;
    // novo (UNL calm): habilidade estática de outra fonte (Vilemaw)
    if (this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.noCombatDamage?.(this, src, o)))) return 0;
    return Math.max(0, this.might(o));
  }
  lethalNeed(o: Obj, by?: P): number {
    // novo (SFD): prevenção de "todo" o próximo dano: nenhuma quantidade é letal (437.5.b)
    if (this.effects.some((e) => e.target === o.id && e.flag === 'preventNextDamage')) return Infinity;
    // novo (UNL body): qualquer quantidade do dano de `by` é letal (Elder Dragon; 142.4.c): 1 basta (riftboundfaq.com,
    // Elder Dragon #combat-damage-assignment; RiftJudge #10416)
    if (by !== undefined && this.anyDamageLethal(o, by)) return 1 + o.prevent;
    const m = Math.max(0, this.might(o));
    const need = Math.max(1, m - o.damage) + o.prevent;
    // novo (UNL fury): dano dobrado (Lotus Trap): a duplicação vale na atribuição, o mínimo que vira letal depois de
    // dobrado (465.2.c.4.a, 465.2.c.5; riftboundfaq.com/cards/lotus-trap)
    const dbl = this.doubleDamageOf(o);
    return dbl ? Math.max(1, Math.ceil(need / 2 ** dbl)) : need;
  }
  /** Novo (UNL fury): quantas vezes o dano causado a `o` é dobrado neste turno (efeitos 'doubleDamage', Lotus Trap). */
  doubleDamageOf(o: Obj): number {
    let n = 0;
    for (const e of this.effects) if (e.target === o.id && e.flag === 'doubleDamage') n++;
    return n;
  }
  /** Novo (UNL body): qualquer quantidade de dano marcado por p em u é letal (Aura.anyDamageLethal; Elder Dragon). */
  anyDamageLethal(u: Obj, p: P): boolean {
    return this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.anyDamageLethal?.(this, src, u, p)));
  }
  /** Novo (UNL body): u tem dano letal marcado (142.4.b: não zero e ≥ Might; 142.4.c: efeitos que mudam o letal). */
  hasLethalDamage(u: Obj): boolean {
    if (u.damage <= 0) return false;
    if (u.damage >= this.might(u)) return true;
    return ([0, 1] as P[]).some((p) => (u.dmgBy?.[p] || 0) > 0 && this.anyDamageLethal(u, p));
  }

  // ───────────────────────────── efeitos temporários ─────────────────────────────
  addEffect(e: Omit<TempEffect, 'id' | 'turn'>) {
    const eff = { ...e, id: this.nextEff++, turn: this.turn };
    this.effects.push(eff);
    return eff;
  }
  giveMight(o: Obj, n: number, until: 'turn' | 'combat' = 'turn', floor?: number) {
    if (o.zone !== 'board') return;
    if (n < 0 && this.isUnit(o) && this.chosenReplace(o, 'mightReduce')) return; // novo (VEN-086)
    // novo (Vendetta): Might a mais dado por spell/habilidade (Aura.mightGiveMod: Mel, Newly Awakened)
    if (this.resolving > 0 && this.isUnit(o)) {
      const by = this.resolvingBy;
      let d = 0;
      for (const src of this.auraSources()) for (const a of this.script(src).auras || []) d += a.mightGiveMod?.(this, src, o, n, this.resolvingItem, by) || 0;
      n += d;
    }
    this.addEffect({ target: o.id, might: n, until, floor });
    this.say(`${this.name(o)} recebe ${n >= 0 ? '+' : ''}${n} de Might${until === 'turn' ? ' neste turno' : ''}.`);
    // novo (RAD): "quando você reduz o Might de uma unidade inimiga" (Ahri, Confident); by = controlador do que resolve
    if (n < 0 && this.isUnit(o)) this.emit({ type: 'mightReduce', unit: o, amount: n, by: this.resolving > 0 ? this.resolvingBy : null });
  }
  giveKw(o: Obj, kw: Keywords, until: 'turn' | 'combat' = 'turn') {
    if (o.zone !== 'board') return;
    this.addEffect({ target: o.id, kw, until });
  }
  hasFlag(o: Obj, flag: string) {
    return this.effects.some((e) => e.target === o.id && e.flag === flag);
  }
  /** Efeito de jogador ativo (sem alvo), ex.: Confront 'unitsEnterReady'. */
  playerFlag(p: P, flag: string) {
    return this.effects.some((e) => !e.target && e.player === p && e.flag === flag);
  }
  addDelayed(d: Omit<Delayed, 'id'>) {
    this.delayed.push({ ...d, id: this.nextEff++ });
  }

  // ───────────────────────────── zonas ─────────────────────────────
  private removeFromArrays(o: Obj) {
    for (const p of [0, 1] as P[]) {
      const s = this.pl[p];
      for (const k of ['mainDeck', 'runeDeck', 'hand', 'trash', 'banish'] as const) {
        const i = s[k].indexOf(o.id);
        if (i >= 0) s[k].splice(i, 1);
      }
      if (s.champion === o.id) s.champion = null;
    }
    for (const b of this.bfs) {
      const i = b.facedown.indexOf(o.id);
      if (i >= 0) b.facedown.splice(i, 1);
    }
  }
  /** Move um objeto para outra zona, limpando o estado de tabuleiro quando sai dele. */
  toZone(o: Obj, zone: Zone, opts: { bottom?: boolean; player?: P } = {}) {
    // novo (Vendetta): substituição de ir para o descarte (Aura.trashReplace: Endless Riches, "If a card would go to your
    // trash from anywhere other than your Main Deck, banish it instead")
    // revisão VEN-126..145: quem bane (evento 'banish', Zed: "when you banish"): o controlador do item que resolve; a
    // substituição de descarte e o Flow são do dono / de quem jogou
    let banishBy: P | undefined;
    if (zone === 'trash' && !o.token && this.kind(o) !== 'rune' && this.trashReplaced(o)) {
      zone = 'banish';
      banishBy = o.owner;
    }
    // revisão VEN-126..145: spell jogado por Flow é banido sempre que sai da pilha, anulado inclusive (829.1.b; FAQ
    // oficial do Vendetta: substituição atrasada, vale até contra "devolva à mão")
    if (o.zone === 'chain' && zone !== 'chain' && o.data?.flowBy !== undefined) {
      banishBy = o.data.flowBy;
      delete o.data.flowBy;
      zone = 'banish';
    }
    const wasBoard = o.zone === 'board';
    const lastLoc = this.locOf(o);
    // novo: evento genérico de saída do tabuleiro (morrer, voltar à mão, banir, reciclar...); attached = o que estava
    // anexado (olhar para trás: texto de efeito)
    const leaveEv: GameEvent | null =
      wasBoard && zone !== 'board' ? { type: 'leave', obj: o, loc: lastLoc, controller: o.controller, to: zone, attached: o.attached ? [...o.attached] : undefined } : null;
    const detachEvs: GameEvent[] = [];
    this.removeFromArrays(o);
    if (wasBoard && zone !== 'board') {
      // 719.5: a carta do topo saiu do tabuleiro: os anexados se desanexam e ficam no último local dela (435.4.b); num
      // campo, a limpeza os chama de volta para a base do controlador (457.1). Controle não muda (718.5.f).
      for (const g of this.attachedTo(o)) {
        this.unlink(g);
        g.loc = lastLoc ?? { t: 'base', p: g.controller };
        detachEvs.push({ type: 'detach', obj: g, unit: o, player: o.controller, reason: 'leave' });
      }
      if (o.attachedTo) this.endCopyWhile(o, this.unlink(o)); // o próprio anexado saiu (vira outro objeto)
      o.attached = undefined;
      o.mty = undefined;
      o.mtyN = undefined; // novo: limiares de Might ('mightReach')
      o.damage = 0;
      o.buffs = 0;
      o.stunned = false;
      o.empowered = false;
      (o as any).empowerCount = 0;
      o.role = undefined;
      // caça (gatilhos): saiu do tabuleiro, é outro objeto (124): se voltar ao mesmo combate, ganha a designação e os
      // gatilhos de ataque/defesa de novo (383.4.e.2.a vale para o mesmo objeto)
      o.attackedThisCombat = false;
      o.defendedThisCombat = false;
      o.prevent = 0;
      o.exhausted = false;
      // novo (124.1): o objeto novo também não herda "não pode se mover neste turno" (Vex, Apathetic)
      o.noMoveTurn = undefined;
      o.noMoveBy = undefined; // novo (UNL chaos)
      o.damagedTurn = undefined; // novo (revisão VEN): objeto novo não "recebeu dano neste turno" (124; Affectionate Poro)
      o.controller = o.owner;
      this.effects = this.effects.filter((e) => e.target !== o.id);
      this.endControlUntilLeaves(o); // novo: controle "até eu sair do tabuleiro" acaba na hora (Akshan, Mischievous)
      this.endLegendsWhile(o); // novo (Neeko): lendas na Legend Zone "enquanto eu estiver no tabuleiro" saem
      if (o.attachedTo === undefined && o.data?.copyWhile) delete o.data.copyWhile;
      // novo (UNL): a cópia acaba quando o objeto sai do tabuleiro (vira outro objeto); a ficha deixa de existir com o
      // código copiado. O evento de saída guarda o código que ele tinha (olhar para trás, ev.code).
      if (o.printed !== undefined && !o.token) {
        if (leaveEv) leaveEv.code = o.code;
        o.code = o.printed;
        o.printed = undefined;
      }
    }
    o.zone = zone;
    o.zoneVersion++;
    if (zone !== 'board' && zone !== 'facedown') o.loc = undefined;
    if (o.token && zone !== 'board' && zone !== 'chain') {
      o.zone = 'gone';
      if (leaveEv) this.emitLeave(leaveEv);
      for (const ev of detachEvs) this.emitLeave(ev);
      return;
    }
    const s = this.pl[opts.player ?? o.owner];
    if (zone === 'hand') s.hand.push(o.id);
    else if (zone === 'trash') s.trash.push(o.id);
    else if (zone === 'banish') s.banish.push(o.id);
    else if (zone === 'mainDeck') opts.bottom ? s.mainDeck.push(o.id) : s.mainDeck.unshift(o.id);
    else if (zone === 'runeDeck') opts.bottom ? s.runeDeck.push(o.id) : s.runeDeck.unshift(o.id);
    if (leaveEv) this.emitLeave(leaveEv);
    for (const ev of detachEvs) this.emitLeave(ev);
    if (zone === 'banish' && this.kind(o) !== 'rune') this.emit({ type: 'banish', obj: o, player: o.owner, by: banishBy ?? (this.resolving > 0 && this.resolvingBy !== null ? this.resolvingBy : o.owner) }); // novo (Vendetta): Zed, Master of Shadows
  }
  /** Novo (Vendetta): o item da pilha escolheu `o` (alvo da jogada ou de uma execução do Repeat)? */
  itemChose(item: ChainItem | undefined, o: Obj): boolean {
    if (!item) return false;
    const ids = [...item.targetIds.flat(), ...(item.repeatIds || []).flat(), ...(item.moreRepeats || []).flatMap((r) => r.ids.flat())];
    return ids.includes(o.id);
  }
  /** Novo (Vendetta): alguma substituição manda `o` para a zona de banidas em vez do descarte? (Aura.trashReplace) */
  trashReplaced(o: Obj): boolean {
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) if (a.trashReplace?.(this, src, o, o.zone) === 'banish') return true;
    return false;
  }
  /** Novo (Neeko): `left` saiu do tabuleiro: as lendas que estavam na Legend Zone enquanto ele estivesse lá voltam para fora da partida. */
  private endLegendsWhile(left: Obj) {
    for (const p of [0, 1] as P[])
      for (const id of this.pl[p].extraLegends || []) {
        const l = this.objs[id];
        if (!l || l.zone !== 'legend' || l.data?.legendWhile !== left.id) continue;
        l.zone = 'setAside';
        l.zoneVersion++;
        l.exhausted = false;
        l.controller = l.owner;
        delete l.data!.legendWhile;
        delete l.data!.legendWhileVer;
        this.effects = this.effects.filter((e) => e.target !== l.id);
        this.say(`${this.name(l)} sai da Legend Zone (${this.name(left)} saiu do tabuleiro).`);
      }
  }
  /** Novo: emite 'leave' (ou guarda, durante mortes simultâneas). Runas não disparam nada. */
  private emitLeave(ev: GameEvent) {
    if (this.kind(ev.obj) === 'rune') return;
    if (this.leaveBuf) this.leaveBuf.push(ev);
    else this.emit(ev);
  }
  /**
   * Novo: p controla `o` até `src` sair do tabuleiro (Akshan, Mischievous). Os efeitos ficam em o.data.ctrlFx; vale o
   * mais recente que ainda existe (ruling riftboundfaq.com: dois Akshans); sem nenhum, volta o controle de antes.
   */
  gainControlUntilLeaves(o: Obj, p: P, src: Obj) {
    if (o.zone !== 'board' || src.zone !== 'board') return;
    const d = (o.data ||= {});
    if (!d.ctrlFx?.length) d.ctrlBase = o.controller;
    d.ctrlFx = [...(d.ctrlFx || []), { src: src.id, p }];
    o.controller = p;
  }
  /** Novo: `left` saiu do tabuleiro: acabam os efeitos de controle que dependiam dele (e os que estavam nele). */
  endControlUntilLeaves(left: Obj) {
    if (left.data?.ctrlFx) {
      delete left.data.ctrlFx;
      delete left.data.ctrlBase;
    }
    for (const o of this.board()) {
      const fx: { src: string; p: P }[] | undefined = o.data?.ctrlFx;
      if (!fx?.some((f) => f.src === left.id)) continue;
      const rest = fx.filter((f) => f.src !== left.id);
      const p: P = rest.length ? rest[rest.length - 1].p : o.data!.ctrlBase;
      o.data!.ctrlFx = rest;
      if (o.controller !== p) {
        o.controller = p;
        this.say(`${this.pname(p)} volta a controlar ${this.name(o)}.`, p);
      }
    }
  }
  putOnBoard(o: Obj, loc: Loc, ready: boolean) {
    this.removeFromArrays(o);
    o.mty = undefined; // novo: entrar já Mighty não é "ficar Mighty" (709; RiftJudge #5835)
    o.mtyN = undefined; // idem para os outros limiares ('mightReach')
    o.zone = 'board';
    o.zoneVersion++;
    o.loc = loc;
    o.exhausted = !ready;
    o.enteredTurn = this.turn;
  }

  // ── Unleashed (lote motor): cópia (477.1.b), substituir (438), criar (439), nomear (759-763) ──
  /**
   * Novo (UNL): `o` "se torna uma cópia de" `src` (477.1.b.1). Copia os traços copiáveis — os impressos ou já copiados
   * de `src` (nome, supertipo, tipo, tags, custo, domínio, texto de regras e o Might impresso; RiftJudge #10239): se `src`
   * é uma cópia, `o` vira cópia do original (477.1.b.1.b). Nada dado ou acrescentado a `src` é copiado (buffs, anexos,
   * efeitos; RiftJudge #9410). `o` continua o mesmo objeto (dano, buffs, estado, efeitos dele e se é ficha continuam).
   * Na mesa: o código do objeto passa a ser o copiado (o.printed guarda o impresso).
   */
  becomeCopy(o: Obj, src: Obj, whileAttached?: Obj): boolean {
    if (o.zone !== 'board' && o.zone !== 'chain') return false;
    if (o.code === src.code) return true;
    const prev = o.code;
    if (o.printed === undefined) o.printed = o.code;
    const before = this.name(o);
    o.code = src.code;
    // novo (VEN-137 Shady Spectacles): "for as long as this is attached to it" — a cópia acaba quando o gear se solta
    if (whileAttached) (o.data ||= {}).copyWhile = { gear: whileAttached.id, prev };
    this.say(`${before} se torna uma cópia de ${this.name(src)}${whileAttached ? ` enquanto ${this.name(whileAttached)} estiver anexado` : ''}.`);
    return true;
  }
  /** Novo (VEN-137): `gear` deixou de estar anexado a `unit`: acaba a cópia que durava enquanto ele estivesse anexado. */
  private endCopyWhile(gear: Obj, unit?: Obj) {
    const cw = unit?.data?.copyWhile;
    if (!unit || !cw || cw.gear !== gear.id) return;
    delete unit.data!.copyWhile;
    if (unit.zone !== 'board') return;
    const before = this.name(unit);
    unit.code = cw.prev;
    if (unit.printed === cw.prev) unit.printed = undefined;
    this.say(`${before} deixa de ser uma cópia (${this.name(gear)} não está mais anexado): volta a ser ${this.name(unit)}.`);
  }
  /**
   * Novo (UNL): Substituir (438) `target` — permanente no tabuleiro ou campo de batalha — por uma ficha `tokenCode`
   * criada por p. A ficha é tratada como o mesmo objeto (438.1.a): mesmo id, local, controle, estado e efeitos (para
   * alvos e referências); a carta substituída vai para o banimento como "substituída", não banida (438.5, 438.5.a). Uma
   * ficha substituída deixa de existir (438.6). Devolve o objeto (agora a ficha).
   */
  replaceWith(target: Obj, tokenCode: string, p: P): Obj {
    const fromCode = target.code;
    const bfI = this.bfOf(target);
    if (bfI >= 0) this.script(target).bfTeardown?.(this, target);
    const prev: string[] = target.data?.replaced || [];
    let moved: Obj | undefined;
    if (!target.token) {
      // a carta vai para o banimento do dono como objeto à parte (o objeto da mesa continua sendo a ficha)
      moved = this.newObj(target.printed ?? fromCode, target.owner, 'banish');
      moved.data = { replacedBy: target.id };
      this.pl[target.owner].banish.push(moved.id);
    }
    target.code = tokenCode;
    target.printed = undefined;
    target.token = true;
    target.owner = p; // a ficha é de quem a criou (439.4); controle e estado são herdados (438.1)
    target.data = { ...(target.data || {}), replaced: moved ? [...prev, moved.id] : prev };
    if (bfI >= 0) this.script(target).bfSetup?.(this, target);
    this.say(`${this.pname(p)} substitui ${cardData(fromCode).name} por ${this.name(target)}.`, p);
    this.emit({ type: 'replace', obj: target, from: fromCode, to: tokenCode, player: p });
    return target;
  }
  /** Novo (UNL): cartas que a ficha `token` substituiu (ela ou fichas que ela substituiu) e ainda estão no banimento (438.7.b.1). */
  replacedCards(token: Obj): Obj[] {
    return (token.data?.replaced || []).map((id: string) => this.objs[id]).filter((o: Obj | undefined) => !!o && o.zone === 'banish' && o.data?.replacedBy === token.id);
  }
  /** Novo (UNL): carta no banimento que está lá por ter sido substituída (438.5.a: não conta como banida). */
  isReplaced(o: Obj): boolean {
    return o.zone === 'banish' && !!o.data?.replacedBy;
  }
  /**
   * Novo (UNL): Trocar de volta (438.7): a ficha deixa de existir e a carta que ela substituiu volta ao lugar dela,
   * herdando efeitos e estado atuais (438.7.b). Com várias elegíveis, p escolhe. Sem nenhuma, nada acontece (438.7.c).
   */
  *swapBackG(p: P, token: Obj): Gen<Obj | undefined> {
    const cands = this.replacedCards(token);
    if (!token.token || !cands.length || (token.zone !== 'board' && this.bfOf(token) < 0)) return undefined;
    let card = cands[0];
    if (cands.length > 1) {
      const [id] = yield* this.ask(p, 'choose', `Trocar ${this.name(token)} de volta por qual carta?`, cands.map((o) => ({ id: o.id, label: this.name(o) })));
      card = this.objs[id];
    }
    const fromCode = token.code;
    const bfI = this.bfOf(token);
    if (bfI >= 0) this.script(token).bfTeardown?.(this, token);
    this.removeFromArrays(card);
    card.zone = 'gone';
    token.code = card.code;
    token.owner = card.owner;
    token.token = false;
    const rest = (token.data?.replaced || []).filter((id: string) => id !== card.id);
    token.data = { ...(token.data || {}), replaced: rest };
    if (bfI >= 0) this.script(token).bfSetup?.(this, token);
    this.say(`${this.name(token)} volta no lugar de ${cardData(fromCode).name}.`, p);
    this.emit({ type: 'replace', obj: token, from: fromCode, to: token.code, player: p, swapBack: true });
    return token;
  }
  /**
   * Novo (UNL): Criar (439) uma ficha de campo de batalha (Baron Pit) na zona de campos: sem controlador (439.4.b),
   * de p (439.4). Devolve o índice do campo novo (em g.bfs).
   */
  createBattlefield(code: string, p: P): number {
    const o = this.newObj(code, p, 'battlefieldZone', true);
    this.bfs.push({ objId: o.id, owner: p, controller: null, contestedBy: null, facedown: [], capacity: 1 });
    this.script(o).bfSetup?.(this, o);
    this.say(`${this.pname(p)} cria o campo ${this.name(o)}.`, p);
    return this.bfs.length - 1;
  }
  /** Novo (UNL): todas as tags que existem no Riftbound (763.1) mais as das cartas e fichas do banco. */
  allTags(): string[] {
    const set = new Map<string, string>();
    for (const t of TAGS_763) set.set(t.toLowerCase(), t);
    for (const c of allCards()) for (const t of c.tags) if (!set.has(t.toLowerCase())) set.set(t.toLowerCase(), t);
    for (const c of Object.values(TOKENS)) for (const t of c.tags) if (!set.has(t.toLowerCase())) set.set(t.toLowerCase(), t);
    return [...set.values()].sort((a, b) => a.localeCompare(b));
  }
  /** Novo (UNL): p nomeia uma tag (763: só tags que existem). `only` restringe a lista (ex.: Bird, Cat, Dog, Poro). */
  *nameTagG(p: P, prompt: string, only?: string[]): Gen<string> {
    const tags = only?.length ? only : this.allTags();
    const [id] = yield* this.ask(p, 'choose', prompt, tags.map((t) => ({ id: t, label: t })));
    this.say(`${this.pname(p)} nomeia a tag ${id}.`, p);
    return id;
  }
  /**
   * Novo (UNL): p nomeia uma carta (761-762): só cartas que existem e não fichas (762.2); devolve o NOME. `filter` limita
   * a lista (ex.: só unidades). Cópias com o mesmo nome aparecem uma vez.
   */
  *nameCardG(p: P, prompt: string, filter?: (d: CardData) => boolean): Gen<string> {
    const names = [...new Set(allCards().filter((d) => !/token/i.test(d.type) && (!filter || filter(d))).map((d) => d.name))].sort((a, b) => a.localeCompare(b));
    const [id] = yield* this.ask(p, 'choose', prompt, names.map((n) => ({ id: n, label: n })));
    this.say(`${this.pname(p)} nomeia ${id}.`, p);
    return id;
  }
  /** Novo (UNL): p nomeia um tipo de carta (760): Unit, Spell, Gear, Rune, Battlefield, Legend. */
  *nameTypeG(p: P, prompt: string, only?: Kind[]): Gen<Kind> {
    const all: Kind[] = only?.length ? only : ['unit', 'spell', 'gear', 'rune', 'battlefield', 'legend'];
    const label: Record<Kind, string> = { unit: 'Unidade', spell: 'Spell', gear: 'Gear', rune: 'Runa', battlefield: 'Campo de batalha', legend: 'Lenda' };
    const [id] = yield* this.ask(p, 'choose', prompt, all.map((k) => ({ id: k, label: label[k] })));
    this.say(`${this.pname(p)} nomeia o tipo ${label[id as Kind]}.`, p);
    return id as Kind;
  }

  // ───────────────────────────── ações de jogo ─────────────────────────────
  *draw(p: P, n = 1): Gen {
    let burns = 0; // novo: Burn Outs desta sequência (431.3.b)
    const batch = {}; // novo (revisão RAD): mesma ação de comprar ("when you draw 1 or more cards", Zero Point Inflection)
    for (let i = 0; i < n; i++) {
      const s = this.pl[p];
      if (s.mainDeck.length === 0) {
        this.burnOut(p, burns++ > 0);
        if (this.winner !== null) return;
        if (s.mainDeck.length === 0) continue;
      }
      const id = s.mainDeck.shift()!;
      const o = this.objs[id];
      o.zone = 'hand';
      o.zoneVersion++;
      s.hand.push(id);
      this.emit({ type: 'draw', player: p, obj: o, batch });
    }
    if (n > 0) this.say(`${this.pname(p)} compra ${n}.`, p);
  }
  /** `again` (novo): não é o primeiro Burn Out da sequência: o ponto não pode ser impedido (431.3.b; Tianna Crownguard). */
  burnOut(p: P, again = false) {
    const s = this.pl[p];
    this.say(`${this.pname(p)} ficou sem cartas no deck (Burn Out): o descarte volta ao deck e o oponente ganha 1 ponto.`, p);
    const ids = this.rng.shuffle([...s.trash]);
    s.trash = [];
    for (const id of ids) {
      const o = this.objs[id];
      o.zone = 'mainDeck';
      o.zoneVersion++;
      s.mainDeck.push(id);
    }
    // novo: Burn Out recicla o descarte (regra 431.2.b): evento de reciclagem, uma ação só (Karma)
    const batch = {};
    for (const id of ids) this.emit({ type: 'recycle', obj: this.objs[id], player: p, by: p, batch });
    this.gainPoints(opp(p), 1, 'burnout', again);
    if (this.pl[opp(p)].points >= this.cfg.victoryScore && this.pl[opp(p)].points > this.pl[p].points) {
      this.winner = opp(p);
      this.winReason = 'Burn Out';
    }
  }
  *discard(p: P, n: number, prompt = 'Escolha carta(s) para descartar'): Gen<Obj[]> {
    const s = this.pl[p];
    const k = Math.min(n, s.hand.length);
    if (k === 0) return [];
    let ids: string[];
    if (k === s.hand.length) ids = [...s.hand];
    else
      ids = yield* this.ask(
        p,
        'choose',
        `${prompt} (${k})`,
        s.hand.map((id) => ({ id, label: this.name(id), obj: id })),
        k,
        k,
      );
    const out: Obj[] = [];
    for (const id of ids) {
      const o = this.objs[id];
      this.toZone(o, 'trash');
      s.discardedThisTurn++;
      out.push(o);
      this.say(`${this.pname(p)} descarta ${this.name(o)}.`, p);
      this.emit({ type: 'discard', player: p, obj: o, first: out.length === 1 }); // first: 1ª carta do lote ("quando você descarta uma ou mais")
    }
    return out;
  }
  /** Descarta cartas específicas da mão de p (ex.: escolhidas pelo oponente — Mindsplitter). */
  discardObjs(p: P, objs: Obj[]) {
    const s = this.pl[p];
    let k = 0;
    for (const o of objs) {
      if (o.zone !== 'hand' || !s.hand.includes(o.id)) continue;
      this.toZone(o, 'trash');
      s.discardedThisTurn++;
      this.say(`${this.pname(p)} descarta ${this.name(o)}.`, p);
      this.emit({ type: 'discard', player: p, obj: o, first: ++k === 1 });
    }
  }
  channel(p: P, n: number, exhausted = false) {
    const s = this.pl[p];
    let c = 0;
    // novo (RAD): Aura.channelExtra (Seraphic Wyvern): canalizar N runas = N + extra runas exauridas
    let extra = 0;
    if (n > 0) for (const src of this.auraSources()) for (const a of this.script(src).auras || []) extra += a.channelExtra?.(this, src, p) || 0;
    for (let i = 0; i < n && s.runeDeck.length; i++) {
      const o = this.objs[s.runeDeck.shift()!];
      this.putOnBoard(o, { t: 'base', p }, !exhausted);
      c++;
    }
    // "that many runes plus 1 exhausted rune": as runas a mais vêm depois das N (com o deck de runas curto, 430.3)
    for (let i = 0; i < extra && s.runeDeck.length; i++) {
      this.putOnBoard(this.objs[s.runeDeck.shift()!], { t: 'base', p }, false);
      c++;
    }
    if (c) this.say(`${this.pname(p)} canaliza ${c} runa(s)${exhausted ? ' exauridas' : ''}.`, p);
    return c;
  }
  /**
   * Recicla para o fundo do deck do dono (regra 416.1.c). opts.by = quem recicla (o jogador instruído; padrão: o
   * controlador do que está resolvendo, ou o dono); opts.batch = objeto que identifica uma mesma ação de reciclar
   * (padrão: o item que está resolvendo) — Karma, Channeler dispara uma vez por ação.
   */
  recycleCard(o: Obj, opts: { by?: P; batch?: object } = {}) {
    const k = this.kind(o);
    this.toZone(o, k === 'rune' ? 'runeDeck' : 'mainDeck', { bottom: true });
    // novo: evento de reciclagem de carta (Karma, Channeler); runas não são cartas
    const by = opts.by ?? (this.resolving > 0 && this.resolvingBy !== null ? this.resolvingBy : o.owner);
    if (k !== 'rune' && !o.token) this.emit({ type: 'recycle', obj: o, player: o.owner, by, batch: opts.batch ?? this.resolvingItem });
    // novo (SFD): "quando você recicla uma runa" (Sivir, Battle Mistress)
    if (k === 'rune') this.emit({ type: 'recycleRune', obj: o, player: o.owner, by });
  }
  /**
   * Novo: recicla várias cartas ao mesmo tempo (regra 416.5): as do deck principal vão para o fundo em ordem aleatória;
   * runas vão para o fundo do deck de runas na ordem que o dono escolher (416.5.a).
   */
  *recycleCards(objs: Obj[], opts: { by?: P; batch?: object } = {}): Gen {
    const list = objs.filter((o, i) => objs.indexOf(o) === i);
    const runes = list.filter((o) => this.kind(o) === 'rune');
    const ro = { by: opts.by, batch: opts.batch ?? {} }; // uma ação de reciclar só (Karma)
    for (const o of this.rng.shuffle(list.filter((o) => this.kind(o) !== 'rune'))) this.recycleCard(o, ro);
    for (const p of [0, 1] as P[]) {
      const mine = runes.filter((r) => r.owner === p);
      const ord = mine.length > 1 ? yield* this.chooseOrder(p, 'Fundo do deck de runas: qual runa vai primeiro (fica mais acima)?', mine) : mine;
      for (const r of ord) this.recycleCard(r, ro);
    }
  }
  /** Novo: o jogador põe cartas numa ordem (a 1ª escolhida fica primeiro). */
  *chooseOrder(p: P, prompt: string, objs: Obj[]): Gen<Obj[]> {
    const left = [...objs];
    const out: Obj[] = [];
    while (left.length > 1) {
      const [id] = yield* this.ask(p, 'choose', `${prompt} (${out.length + 1}ª de ${objs.length})`, left.map((o) => ({ id: o.id, label: this.name(o), obj: o.id })));
      const o = this.objs[id];
      out.push(o);
      left.splice(left.indexOf(o), 1);
    }
    return [...out, ...left];
  }
  /** Novo: põe cartas no topo do deck principal do dono, na ordem que ele escolher (Predict, "em qualquer ordem"). */
  *putOnTop(p: P, objs: Obj[]): Gen {
    if (!objs.length) return;
    const ord = objs.length > 1 ? yield* this.chooseOrder(p, 'Topo do deck: qual carta fica no topo?', objs) : objs;
    for (const o of [...ord].reverse()) this.toZone(o, 'mainDeck');
  }
  /** Buff (426). Novo (UNL): devolve se a unidade foi buffada ("if it was buffed this way", 426.1.c). */
  buff(u: Obj, by: P): boolean {
    if (u.zone !== 'board' || !this.isUnit(u)) return false;
    if (u.buffs > 0 && !this.script(u).anyBuffs) return false; // anyBuffs: Lee Sin, Ascetic
    u.buffs++;
    this.say(`${this.name(u)} recebe um Buff (+1).`);
    this.emit({ type: 'buff', unit: u, player: by });
    return true;
  }
  spendBuff(u: Obj, by?: P): boolean {
    if (u.buffs <= 0) return false;
    u.buffs--;
    this.emit({ type: 'spendBuff', unit: u, player: by ?? u.controller }); // novo: "quando você gasta um buff" (Fae Dragon)
    return true;
  }
  /** `batch`: mesma instrução atordoando várias unidades ("uma ou mais", ex.: Leona) — passe o mesmo número. */
  stun(u: Obj, by: P, batch?: number) {
    if (u.zone !== 'board' || !this.isUnit(u) || u.stunned) return;
    if (this.chosenReplace(u, 'stun')) return; // novo (VEN-086)
    u.stunned = true;
    this.say(`${this.name(u)} fica atordoada (Stun).`);
    // bf (novo, UNL calm): campo da unidade no momento do Stun ("that battlefield" do Vex, Mocking; 359.3.f.3)
    this.emit({ type: 'stun', unit: u, player: by, batch: batch ?? ++this.stunBatch, bf: this.bfIndex(u) });
  }
  ready(o: Obj, by?: P) {
    if (o.zone !== 'board' && o.zone !== 'legend') return; // novo (SFD): lendas também podem ser preparadas (Hall of Legends)
    // novo (UNL chaos): "I can't be readied" (Maduli): nem o despertar a prepara; entrar pronta não é preparar (RiftJudge #8730)
    if (o.exhausted && this.script(o).cantBeReadied?.(this, o)) {
      this.say(`${this.name(o)} não pode ser preparada.`);
      return;
    }
    // auras que impedem efeitos de preparar (Mageseeker Warden); o despertar do turno é regra, não spell/habilidade
    // (caça, gatilhos: habilidades que resolvem durante o despertar não são o despertar)
    if (!(this.phase === 'awaken' && this.resolving === 0) && this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.blockReady?.(this, src, o)))) {
      this.say(`${this.name(o)} não pode ser preparada.`);
      return;
    }
    const was = o.exhausted;
    o.exhausted = false;
    // evento "quando você prepara" (Pirate's Haven); preparar algo já pronto não faz nada (415.1.c)
    if (was) this.emit({ type: 'ready', obj: o, player: by ?? o.controller });
  }
  exhaust(o: Obj) {
    if (o.zone !== 'board') return;
    this.markExhausted(o);
  }
  /** Novo (RAD): exaure `o` e emite 'exhaust' ({ obj, player, units }) se estava pronto; `units` = exaustão simultânea. */
  markExhausted(o: Obj, units?: Obj[]): boolean {
    if (o.exhausted || o.zone !== 'board') { o.exhausted = true; return false; }
    o.exhausted = true;
    this.emit({ type: 'exhaust', obj: o, player: o.controller, units: units ?? [o] });
    return true;
  }
  // ── XP (Unleashed, lote motor; regras 728-733) ──
  // XP é do jogador, pública, sem limite, não é objeto (não pode ser alvo, preparada nem exaurida) e não zera: nenhuma
  // regra a tira no fim do turno; ela só cai quando é gasta (730.2).
  /** XP atual de p. */
  xp(p: P): number {
    return this.pl[p].xp;
  }
  /** Ganhar XP (730.1). `source` = o que deu a XP (vai no evento 'gainXp'). */
  gainXp(p: P, n: number, source?: Obj) {
    if (n <= 0) return;
    const s = this.pl[p];
    s.xp += n;
    s.xpGained = { turn: this.turn, n: (s.xpGained?.turn === this.turn ? s.xpGained.n : 0) + n }; // novo (UNL)
    this.say(`${this.pname(p)} ganha ${n} XP (total ${s.xp}).`, p);
    this.emit({ type: 'gainXp', player: p, amount: n, source }); // novo (UNL)
  }
  /** Novo (RAD): p jogou uma unidade ou gear (ficha ou carta) para um campo de batalha neste turno? */
  playedToBfThisTurn(p: P): boolean {
    const x = this.pl[p].bfPlays;
    return !!x && x.turn === this.turn && x.n > 0;
  }
  /** Novo (UNL): XP que p ganhou neste turno ("se você ganhou XP neste turno", Wily Newtfish). */
  gainedXpThisTurn(p: P): number {
    const x = this.pl[p].xpGained;
    return x && x.turn === this.turn ? x.n : 0;
  }
  /** Novo (UNL): p pode gastar n XP (tem pelo menos n)? */
  canSpendXp(p: P, n: number): boolean {
    return n >= 0 && this.pl[p].xp >= n;
  }
  /** Novo (UNL): gastar n XP (730.2), como custo ou não. Sem XP suficiente não gasta nada e devolve false. */
  spendXp(p: P, n: number, source?: Obj): boolean {
    if (!this.canSpendXp(p, n)) return false;
    if (n === 0) return true;
    this.pl[p].xp -= n;
    this.say(`${this.pname(p)} gasta ${n} XP (resta ${this.pl[p].xp}).`, p);
    this.emit({ type: 'spendXp', player: p, amount: n, source });
    return true;
  }
  /** Novo (UNL): versão gerador de spendXp, para custos (`extraCost`, `OptionalCost.pay`, `equipExtra.pay`). */
  *spendXpG(p: P, n: number, source?: Obj): Gen<boolean> {
    return this.spendXp(p, n, source);
  }
  gainPoints(p: P, n: number, why: string, unpreventable = false) {
    // novo (SFD calm): "oponentes não podem ganhar pontos" (Tianna Crownguard); pontuar o campo continua valendo (FAQ #9615)
    // unpreventable (novo): pontos de Burn Out depois do primeiro da sequência não podem ser impedidos (431.3.b)
    if (n > 0 && !unpreventable && this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.cantGainPoints?.(this, src, p)))) {
      this.say(`${this.pname(p)} não pode ganhar pontos (${why}).`, p);
      return;
    }
    this.pl[p].points += n;
    this.say(`${this.pname(p)} ganha ${n} ponto(s) (${why}) → ${this.pl[p].points}.`, p);
  }
  /** `opts`: { byUnit } (ou true) = a carta manda uma unidade causar o dano (Challenge, regra 417.6.b.3). */
  dealDamage(u: Obj, n: number, source?: Obj, opts: { byUnit?: boolean; noBonus?: boolean } | boolean = {}) {
    const byUnit = typeof opts === 'boolean' ? opts : !!opts.byUnit;
    const noBonus = typeof opts === 'boolean' ? false : !!opts.noBonus; // novo: dano dividido já com o bônus (dealSplit)
    if (u.zone !== 'board' || !this.isUnit(u) || n <= 0) return 0;
    // Unyielding Spirit: previne o dano de spells e habilidades (resolvendo na pilha) neste turno.
    // byUnit = a carta manda uma unidade causar o dano (Challenge, regra 417.6.b.3): não é dano de spell/habilidade.
    if (this.resolving > 0 && !byUnit && this.effects.some((e) => e.flag === 'preventSpellDamage')) {
      this.say(`O dano em ${this.name(u)} é prevenido.`);
      return 0;
    }
    if (this.cantTakeDamage(u)) return 0; // Kayn, Unleashed
    if (source && !byUnit && source.controller !== u.controller && this.script(u).preventDamageFrom?.(this, u, source)) return 0; // Vendetta
    // Bonus Damage do spell (Ravenborn Tome): gravado no card do spell ao ser jogado
    if (source && !noBonus && this.kind(source) === 'spell') n += source.data?.bonusDamage || 0;
    let d = n;
    // Bonus Damage (regra 712): só em dano de spells e habilidades (byUnit = a unidade causa o dano, ex.: Challenge)
    if (source && !byUnit && !noBonus) d += this.bonusDamage(u, source);
    // novo (UNL fury): "dobre todo o dano que seria causado a ela neste turno" (Lotus Trap): cada instância dobra o dano
    // (com o Bonus Damage). No combate a atribuição já contou a duplicação (lethalNeed): dobrar aqui dá o mesmo total
    // (465.2.c.5). Com as prevenções de hoje (todo o dano) a ordem das substituições (372) não muda o resultado.
    const dbl = this.doubleDamageOf(u);
    if (dbl && d > 0) d *= 2 ** dbl;
    // novo (SFD): "da próxima vez que esta unidade fosse receber dano neste turno, previna-o" (Counter Strike): previne
    // todo esse dano, já com o Bonus Damage (437.1.a.1); dano todo prevenido não conta como causado (437.4)
    const pn = this.effects.find((e) => e.target === u.id && e.flag === 'preventNextDamage');
    if (pn && d > 0) {
      this.effects = this.effects.filter((e) => e !== pn);
      this.say(`O dano em ${this.name(u)} é prevenido.`);
      return 0;
    }
    if (u.prevent > 0) {
      const pr = Math.min(u.prevent, d);
      u.prevent -= pr;
      d -= pr;
    }
    if (d <= 0) return 0;
    // atribuição de morte (regra 428.5.c): quem causou o dano
    if (source) u.lastDamagedBy = source.controller;
    else if (this.resolving > 0 && this.resolvingBy !== null) u.lastDamagedBy = this.resolvingBy;
    // novo (UNL body): dano marcado por jogador (142.3.a: o responsável pela ação de causar dano; 417.6.b.4: o controlador
    // da fonte; no combate, o dono das unidades que atribuíram). A cura limpa todo o dano (418.1), então recomeça do zero.
    // Dano de campo de batalha não é de nenhum jogador para "o seu dano" (RiftJudge #9622, Frozen Fortress × Elder Dragon).
    if (!u.damage || !u.dmgBy) u.dmgBy = [0, 0];
    if (u.lastDamagedBy !== undefined && !(source && this.kind(source) === 'battlefield')) u.dmgBy[u.lastDamagedBy] += d;
    u.damage += d;
    u.damagedTurn = this.turn;
    // atribuição de morte (regra 428.5.c): fonte, jogador e item da pilha que causou o dano; no combate, o dano de combate
    u.lastDmg = source
      ? { src: source.id, p: source.controller, item: this.resolvingItem?.id }
      : this.resolving > 0 && this.resolvingBy !== null
        ? { p: this.resolvingBy, item: this.resolvingItem?.id }
        : this.showdown?.combat && u.lastDamagedBy !== undefined
          ? { p: u.lastDamagedBy, combat: true }
          : undefined;
    this.say(`${this.name(u)} recebe ${d} de dano${source ? ` de ${this.name(source)}` : ''}.`);
    this.emit({ type: 'damage', unit: u, amount: d, source }); // novo: "quando uma unidade recebe dano" (Imperial Decree)
    return d;
  }
  /** Soma de Bonus Damage das auras para dano de `source` em `u`. */
  bonusDamage(u: Obj, source: Obj): number {
    const bi = this.bfOf(source);
    const by = bi >= 0 ? this.bfs[bi].controller : source.controller;
    let n = 0;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) if (a.bonusDamage) n += a.bonusDamage(this, src, u, source, by);
    return Math.max(0, n);
  }
  /**
   * Novo: Bonus Damage de uma ação que divide dano (regras 714 e 715.3): todas as instâncias somadas e aplicadas
   * uma vez, ao total a dividir. Bônus que depende do alvo (Void Gate) vale se valer para algum dos alvos.
   */
  splitBonus(source: Obj, targets: Obj[]): number {
    let n = this.kind(source) === 'spell' ? source.data?.bonusDamage || 0 : 0;
    n += Math.max(0, ...targets.map((u) => this.bonusDamage(u, source)));
    return Math.max(0, n);
  }
  /** Novo: quantos alvos uma divisão de `n` de dano pode ter, contando o Bonus Damage (355.14.c, 715.3). */
  splitMaxTargets(source: Obj, n: number): number {
    return n + this.splitBonus(source, this.units());
  }
  /**
   * Novo: causa `n` de dano dividido entre `targets` (355.14): o Bonus Damage soma uma vez no total (715.3), cada alvo
   * recebe pelo menos 1 (355.14.f) e o controlador escolhe a divisão na resolução (355.14.e). Se houver mais alvos que
   * dano, ele escolhe quais deixam de ser alvos (355.14.h).
   */
  *dealSplit(p: P, source: Obj, n: number, targets: Obj[], label = this.name(source), byUnit = false): Gen {
    let us = targets.filter((u) => u.zone === 'board' && this.isUnit(u));
    if (!us.length) return;
    // byUnit (novo, UNL legends): a carta manda uma unidade causar o dano (Alpha Strike; 417.6.b.3): não é dano de
    // spell/habilidade, então sem Bonus Damage (712)
    let total = n + (byUnit ? 0 : this.splitBonus(source, us));
    if (us.length > total) us = yield* this.chooseObj(p, `${label}: só há ${total} de dano; quais unidades continuam como alvo?`, us, total, total);
    let left = total;
    const parts: [Obj, number][] = [];
    for (let k = 0; k < us.length; k++) {
      const u = us[k];
      const rest = us.length - k - 1; // cada unidade escolhida recebe pelo menos 1
      let a = left - rest;
      if (rest > 0 && left - rest > 1) {
        const opts = Array.from({ length: left - rest }, (_, i) => ({ id: String(i + 1), label: `${i + 1}` }));
        const [x] = yield* this.ask(p, 'choose', `${label}: quanto dano em ${this.describe(u)}? (${left} restante)`, opts);
        a = Number(x);
      }
      parts.push([u, a]);
      left -= a;
    }
    for (const [u, a] of parts) this.dealDamage(u, a, source, { noBonus: true, byUnit });
  }
  /** A unidade não pode receber dano (CardScript.noDamage). */
  cantTakeDamage(u: Obj): boolean {
    return !!this.script(u).noDamage?.(this, u);
  }
  /** Mata uma permanente (instrução de matar ou dano letal). Síncrono (legado): prefira `yield* killG(...)`,
   *  que pergunta ao jogador as substituições opcionais; aqui elas recebem a resposta padrão (aplicar). */
  kill(o: Obj, reason = 'morre', deferred?: GameEvent[]) {
    this.runSync(this.killG([o], reason, deferred));
  }
  /** Novo: mata várias permanentes na mesma ação (regra 370.1.a.2): os gatilhos de morte veem todas já mortas. */
  killAll(os: Obj[], reason = 'morre') {
    this.runSync(this.killG(os, reason));
  }
  /** Novo: roda um gerador sem perguntar (contextos síncronos legados): cada decisão recebe a resposta padrão. */
  runSync<T>(gen: Gen<T>): T {
    let r = gen.next(undefined as any);
    while (!r.done) {
      const d = r.value;
      const n = Math.min(d.options.length, Math.max(d.min, 1));
      r = gen.next(d.options.slice(0, n).map((x) => x.id));
    }
    return r.value;
  }
  /**
   * Novo: mata uma ou mais permanentes ao mesmo tempo (uma só ação, regra 370.1.a.2).
   * 1. Substituições de morte de cada uma (369-373): o controlador da substituição escolhe as opcionais ("você pode",
   *    371.2.a); com várias para a mesma morte, o controlador da unidade escolhe a ordem (372). As ações das
   *    substituições acontecem antes das mortes não substituídas (373.1.a).
   * 2. As demais morrem juntas e só então os gatilhos de morte/saída são emitidos (todas já mortas).
   * Retorna as que morreram.
   */
  *killG(os: Obj | Obj[], reason = 'morre', deferred?: GameEvent[]): Gen<Obj[]> {
    const list = (Array.isArray(os) ? os : [os]).filter((o, i, a) => o.zone === 'board' && a.indexOf(o) === i);
    if (!list.length) return [];
    const dying = yield* this.replaceDeathsG(list);
    if (!dying.length) return [];
    // 2. mortes simultâneas: fotografa todas antes de qualquer uma sair
    const it = this.resolvingItem;
    const infos = dying.map((o) => {
      const loc = this.locOf(o);
      const snap = { ...o, loc };
      // quem matou (regra 428.5): o custo sendo pago (matar como custo, 428.1.a.1), o item que está resolvendo
      // (instrução de matar, 428.5.b) ou, na limpeza, o item que acabou de resolver e causou o dano (428.5.c) /
      // o dano de combate na limpeza de combate (428.5.c.2)
      const ld = o.lastDmg;
      const killedBy: { src?: Obj; p: P; item?: string; combat?: boolean } | undefined = this.payingFor
        ? { src: this.payingFor.src, p: this.payingFor.p }
        : it
          ? { src: this.objs[it.cardId ?? it.sourceId], p: it.controller, item: it.id }
          : o.damage > 0 && ld && ((ld.combat && this.combatCleanup) || (!ld.combat && ld.item !== undefined && ld.item === this.lastResolvedId))
            ? { src: ld.src ? this.objs[ld.src] : undefined, p: ld.p, item: ld.item, combat: ld.combat }
            : undefined;
      const killer: P | undefined = killedBy?.p;
      // Deathknell dispara antes de a carta ir para o descarte (323.4, 808.1.d.2): as vezes extras (Karthus) são
      // contadas com todas ainda em jogo
      let dkExtra = 0;
      for (const s2 of this.auraSources())
        for (const a of this.script(s2).auras || []) if (a.deathknellExtra) dkExtra += a.deathknellExtra(this, s2, o.controller, o);
      // mortes simultâneas contam como uma só "vez" (383.1.b): priorDeaths = mortes do controlador antes do lote
      const priorDeaths = this.pl[o.controller].unitDeaths || 0;
      const attached = o.attached ? [...o.attached] : undefined; // novo: texto de efeito que a unidade tinha (olhar para trás)
      const wasUnit = this.isUnit(o); // novo (revisão RAD): era unidade ao morrer (unit gear por efeito; ver emit)
      const might = this.isUnit(o) ? this.might(o) : undefined; // novo: Might ao morrer (808.1.d.3; "se eu era Mighty", Unsung Hero)
      const alone = this.isUnit(o) && this.isAlone(o); // novo (SFD calm): "se eu morri sozinha", com as que morrem junto (FAQ #10890)
      // novo (revisão VEN): substituição de ir para o descarte (Aura.trashReplace, Endless Riches) vista antes de qualquer
      // uma sair: vale também para as que morrem junto com a fonte e para a própria fonte (370.4)
      const banished = !o.token && this.kind(o) !== 'rune' && this.trashReplaced(o);
      return { o, loc, snap, ctrl: o.controller, wasBuffed: o.buffs > 0, killer, killedBy, dkExtra, priorDeaths, attached, alone, might, banished, wasUnit };
    });
    const prevBuf = this.leaveBuf;
    const leaves: GameEvent[] = [];
    this.leaveBuf = leaves;
    const evs: GameEvent[] = [];
    // novo (SFD): mortes desta ação, para gatilhos "quando uma ou mais ... morrem" (Sivir): batch + lista
    const batch = ++this.dieBatch;
    const dyingList = infos.filter((x) => !x.banished).map((x) => ({ id: x.o.id, controller: x.ctrl, unit: this.isUnit(x.o) }));
    for (const x of infos) {
      // novo (revisão VEN): banida em vez de ir para o descarte = não foi morta (428.1: matar é ir do tabuleiro para o
      // descarte); sem gatilhos de morte nem Deathknell (808.1.d.1; RiftJudge #11055; riftboundfaq, Mordekaiser × Endless Riches)
      if (x.banished) {
        this.toZone(x.o, 'banish');
        this.say(`${this.name(x.o)} é banida em vez de ir para o descarte.`);
        continue;
      }
      if (this.isUnit(x.o)) this.pl[x.ctrl].unitDeaths = (this.pl[x.ctrl].unitDeaths || 0) + 1; // Spoils of War
      if (this.isGear(x.o)) this.pl[x.ctrl].gearDeaths = (this.pl[x.ctrl].gearDeaths || 0) + 1; // novo (RAD); unit gear conta como unidade e como gear
      if (this.isUnit(x.o) && this.phase === 'beginning') this.pl[x.ctrl].beginDeathTurn = this.turn; // novo (UNL calm): Shadow Watcher
      this.toZone(x.o, 'trash');
      this.say(`${this.name(x.o)} ${reason}.`);
      evs.push({ type: 'die', obj: x.o, snap: x.snap, loc: x.loc, controller: x.ctrl, wasBuffed: x.wasBuffed, killer: x.killer, killedBy: x.killedBy, dkExtra: x.dkExtra, priorDeaths: x.priorDeaths, attached: x.attached, batch, dying: dyingList, alone: x.alone, might: x.might, wasUnit: x.wasUnit });
    }
    this.leaveBuf = prevBuf;
    for (const ev of [...evs, ...leaves]) {
      if (deferred) deferred.push(ev);
      else if (prevBuf && ev.type === 'leave') prevBuf.push(ev);
      else this.emit(ev);
    }
    return dying;
  }
  /** Novo (370.2): substituições de morte sendo aplicadas agora (chaves de DeathRep). */
  private applyingReps = new Set<string>();
  private *withApplyingRep<T>(key: string, gen: Gen<T>): Gen<T> {
    this.applyingReps.add(key);
    try {
      return yield* gen;
    } finally {
      this.applyingReps.delete(key);
    }
  }
  /** Novo: substituições de morte que valem para `o` agora (cartas, lendas, campos e efeitos 'retreat'). */
  deathReps(o: Obj): DeathRep[] {
    const out: DeathRep[] = [];
    for (const src of this.auraSources()) {
      (this.script(src).deathReplacements || []).forEach((d, k) => {
        // novo (370.2): não se aplica de novo às ações que substituem o evento ao qual já está sendo aplicada (Zhonya que é
        // unit gear: "mate isto em vez disso" não salva a si mesmo de novo)
        if (this.applyingReps.has(`${src.id}:${k}`)) return;
        if (!d.applies(this, src, o)) return;
        out.push({
          key: `${src.id}:${k}`,
          label: `${this.name(src)}: ${d.label}`,
          ctrl: d.controller ? d.controller(this, src, o) : src.controller, // novo (UNL legends): "its controller may pay" (Altar of Blood)
          optional: !!d.optional,
          src,
          zone: src.zone,
          check: () => d.applies(this, src, o),
          apply: () => this.withApplyingRep(`${src.id}:${k}`, d.apply(this, src, o)),
        });
      });
    }
    // "da próxima vez que fosse morrer neste turno" (Highlander, Unlicensed Armory)
    if (this.isUnit(o))
      for (const e of this.effects) {
        if (e.target !== o.id || e.flag !== 'retreat') continue;
        const ctrl = e.player ?? o.controller;
        const cost = e.retreatCost;
        const eng = this;
        out.push({
          key: `eff:${e.id}`,
          label: cost
            ? `pagar ${this.costText(cost).replace(/^0 \+ /, '')} para ${this.name(o)} voltar curada e exausta para a base`
            : `${this.name(o)} volta curada e exausta para a base`,
          ctrl,
          optional: !!e.retreatOptional,
          eff: e,
          check: () => !cost || this.canPay(ctrl, cost),
          apply: function* () {
            if (cost) {
              if (!eng.canPay(ctrl, cost)) return false;
              yield* eng.payG(ctrl, cost);
            }
            o.damage = 0;
            o.exhausted = true;
            eng.recall(o);
            eng.say(`${eng.name(o)} escapa da morte e volta para a base.`);
            return true;
          },
        });
      }
    // novo (UNL fury): "se ela fosse morrer neste turno, bana-a em vez disso" (Smite): obrigatória, controlada por quem
    // criou o efeito (374), vale para toda morte dela no turno (não é "da próxima vez": não se gasta). Banir não é matar:
    // sem Deathknell (RiftJudge #9664)
    if (this.isUnit(o))
      for (const e of this.effects) {
        if (e.target !== o.id || e.flag !== 'banishInstead') continue;
        const eng = this;
        out.push({
          key: `ban:${e.id}`,
          label: `${this.name(o)} é banida em vez de morrer`,
          ctrl: e.player ?? o.controller,
          optional: false,
          check: () => o.zone === 'board',
          apply: function* () {
            eng.banishObj(o);
            return true;
          },
        });
      }
    return out;
  }
  /**
   * Novo: aplica as substituições às mortes simultâneas de `list` e devolve as que continuam morrendo.
   * Cada morte é um evento separado (373); o controlador de cada substituição escolhe a qual morte ela se aplica
   * (373; RiftJudge #10615, #10333: com duas aliadas morrendo, o Zhonya salva uma, à escolha do controlador) e se
   * aplica as opcionais (371.2.a). Controladores diferentes: na ordem de turno (373.1). Uma fonte que saiu do
   * tabuleiro ao se aplicar (Zhonya) não vale para as outras mortes.
   */
  private *replaceDeathsG(list: Obj[]): Gen<Obj[]> {
    const pending: Obj[] = [];
    for (const o of list) {
      // substituição antiga (CardScript.replaceDeath): obrigatória, aplicada direto
      let done = false;
      for (const src of this.auraSources()) {
        const s = this.script(src);
        if (s.replaceDeath && s.replaceDeath(this, src, o)) {
          done = true;
          break;
        }
      }
      if (!done) pending.push(o);
    }
    // "da próxima vez que fosse morrer" (Highlander, Armory): esta é a próxima vez; o efeito é usado agora
    const reps = new Map<Obj, DeathRep[]>();
    for (const o of pending) reps.set(o, this.deathReps(o));
    const effs = [...reps.values()].flat().filter((r) => r.eff).map((r) => r.eff);
    if (effs.length) this.effects = this.effects.filter((e) => !effs.includes(e));
    const declined = new Set<DeathRep>();
    const left = new Set(pending);
    // novo (SFD order): cada substituição se aplica numa só sequência ininterrupta (373.2): a obrigatória continua nas
    // outras mortes que ela substitui antes de outra entrar; depois de interrompida, não volta (Soraka, Wanderer)
    const closed = new Set<string>();
    let seq: DeathRep | undefined;
    for (let guard = 0; guard < 100; guard++) {
      // novo (SFD order): substituição que passa a valer no meio do processo (o Guardian Angel chama Soraka de volta
      // para a base e ela salva as que morrem lá: exemplo da regra 373.2)
      if (guard > 0)
        for (const o of left) {
          if (o.zone !== 'board') continue;
          const have = reps.get(o)!;
          for (const r of this.deathReps(o)) if (!r.eff && !have.some((x) => x.key === r.key)) have.push(r);
        }
      let pairs: { o: Obj; r: DeathRep }[] = [];
      for (const o of left) {
        if (o.zone !== 'board') continue;
        for (const r of reps.get(o)!) if (!declined.has(r) && !closed.has(r.key) && r.check()) pairs.push({ o, r });
      }
      if (seq && !seq.optional) {
        const cont = pairs.filter((x) => x.r.key === seq!.key);
        if (cont.length) pairs = cont;
      }
      if (!pairs.length) break;
      // novo (UNL fury): substituições de controladores diferentes para a MESMA morte: quem controla a unidade escolhe a
      // que se aplica primeiro (372; Smite × Zhonya: riftboundfaq.com/cards/smite, RiftJudge #12738). A opcional ainda
      // é decidida por quem a controla (371.2.a).
      const mixed = [...left].find((o) => {
        const ps = pairs.filter((x) => x.o === o);
        return ps.length > 1 && new Set(ps.map((x) => x.r.ctrl)).size > 1;
      });
      if (mixed) {
        const ps = pairs.filter((x) => x.o === mixed);
        const [k] = yield* this.ask(
          mixed.controller,
          'choose',
          `${this.describe(mixed)} vai morrer: qual efeito de substituição se aplica primeiro?`,
          ps.map((x, i) => ({ id: String(i), label: `${x.r.label}${x.r.optional ? ' (opcional)' : ''}`, obj: mixed.id })),
        );
        const pk = ps[Number(k)];
        if (pk.r.optional && !(yield* this.yesNo(pk.r.ctrl, `${this.name(mixed)} vai morrer. ${pk.r.label}?`))) {
          declined.add(pk.r);
          continue;
        }
        if (seq && seq.key !== pk.r.key) closed.add(seq.key);
        seq = pk.r;
        if (yield* pk.r.apply()) left.delete(mixed);
        else declined.add(pk.r);
        continue;
      }
      const who: P = pairs.some((x) => x.r.ctrl === this.active) ? this.active : opp(this.active);
      const mine = pairs.filter((x) => x.r.ctrl === who);
      let pick = mine[0];
      const allOptional = mine.every((x) => x.r.optional);
      if (mine.length > 1) {
        const opts = mine.map((x, i) => ({ id: String(i), label: `${x.r.label} → ${this.describe(x.o)}${x.r.optional ? ' (opcional)' : ''}`, obj: x.o.id }));
        if (allOptional) opts.push({ id: 'none', label: 'Não usar nenhuma', obj: undefined as any });
        const [k] = yield* this.ask(who, 'choose', 'Unidades vão morrer: qual efeito de substituição aplicar, e a qual unidade?', opts);
        if (k === 'none') {
          for (const x of mine) declined.add(x.r);
          continue;
        }
        pick = mine[Number(k)];
      } else if (pick.r.optional && !(yield* this.yesNo(who, `${this.name(pick.o)} vai morrer. ${pick.r.label}?`))) {
        declined.add(pick.r);
        continue;
      }
      // várias substituições para a mesma morte: o controlador da unidade escolhe a ordem (372) — aqui a escolhida
      // vem do controlador da substituição, que no 1x1 é o mesmo jogador (efeitos de unidades aliadas)
      if (seq && seq.key !== pick.r.key) closed.add(seq.key); // novo (SFD order): sequência interrompida (373.2)
      seq = pick.r;
      if (yield* pick.r.apply()) left.delete(pick.o);
      else declined.add(pick.r);
    }
    return pending.filter((o) => left.has(o) && o.zone === 'board');
  }
  banishObj(o: Obj) {
    this.toZone(o, 'banish');
    this.say(`${this.name(o)} é banida.`);
  }
  returnToHand(o: Obj) {
    if (o.zone !== 'board' && o.zone !== 'facedown') return;
    if (o.zone === 'board' && this.isUnit(o) && this.chosenReplace(o, 'returnToHand')) return; // novo (VEN-086)
    const loc = this.locOf(o);
    const p = o.owner;
    const facedown = o.zone === 'facedown'; // novo (revisão UNL legends): carta escondida não é unidade (Ripper's Bay)
    this.toZone(o, 'hand');
    this.say(`${this.name(o)} volta para a mão de ${this.pname(p)}.`);
    this.emit({ type: 'returnToHand', obj: o, loc, facedown });
  }
  recall(o: Obj) {
    if (o.zone !== 'board') return;
    o.loc = { t: 'base', p: o.controller };
    o.role = undefined;
  }
  /**
   * Novo (UNL order): custo aplicado (204.4) para `mover` mover `us` para `to` ao mesmo tempo (Mageseeker Investigator).
   * Só contam as unidades que de fato se movem (já estão lá ou estão impedidas: não se movem).
   */
  moveAppliedCost(us: Obj[], to: Loc, mover: P): Cost {
    // revisão UNL order: a que `mover` está proibido de mover (Vex, Apathetic) também não se move (moveUnits)
    const moving = us.filter((u, i) => us.indexOf(u) === i && u.zone === 'board' && u.loc && !this.locEq(u.loc, to) && !this.moveBlocked(u, u.loc, to, this.moveBy(mover)) && !this.cantMoveBy(u, mover));
    let cost: Cost = NO_COST;
    if (!moving.length) return cost;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const x = a.moveCost?.(this, src, moving, to, mover);
        if (x) cost = this.addCost(cost, x);
      }
    return cost;
  }
  /**
   * Novo (UNL order): move por efeito com custo aplicado (204.4): quem move escolhe pagar; sem pagar (ou sem poder), o
   * movimento não acontece (204.4.c). Sem custo aplicado, é o mesmo que moveUnits. Retorna se moveu.
   */
  *moveUnitsG(us: Obj[], to: Loc, mover: P): Gen<boolean> {
    const ac = this.moveAppliedCost(us, to, mover);
    if (ac.energy || ac.power.length) {
      if (!this.canPay(mover, ac) || !(yield* this.yesNo(mover, `Mover ${us.map((u) => this.name(u)).join(', ')} para ${this.locName(to)} exige pagar ${this.costText(ac)} (custo aplicado). Pagar?`))) {
        this.say(`${this.pname(mover)} não paga o custo aplicado: o movimento para ${this.locName(to)} não acontece.`, mover);
        return false;
      }
      yield* this.payG(mover, ac);
    }
    this.moveUnits(us, to, mover, true);
    return true;
  }
  /** Move (não é movimento padrão: não exaure). `paid` (novo, UNL order): o custo aplicado (204.4) já foi tratado por quem chamou. */
  moveUnits(us: Obj[], to: Loc, mover: P, paid = false) {
    // novo (UNL order): custo aplicado ao movimento (Mageseeker Investigator). Chamada síncrona (cartas antigas): paga
    // com o plano padrão se der; se não der, o movimento não acontece (204.4.c). Prefira `yield* moveUnitsG(...)`.
    if (!paid) {
      const ac = this.moveAppliedCost(us, to, mover);
      if (ac.energy || ac.power.length) {
        if (!this.canPay(mover, ac)) {
          this.say(`${this.pname(mover)} não consegue pagar o custo aplicado: o movimento para ${this.locName(to)} não acontece.`, mover);
          return;
        }
        this.pay(mover, ac);
      }
    }
    const moved: Obj[] = [];
    const from: Loc[] = [];
    for (const u of us) {
      if (u.zone !== 'board' || this.locEq(u.loc, to)) continue;
      if (this.moveBlocked(u, u.loc!, to, this.moveBy(mover))) continue; // movimento impedido (Vilemaw's Lair; Jagged Cutlass): instrução ignorada
      if (this.cantMoveBy(u, mover)) continue; // novo (UNL chaos): "they can't move it this turn" (Vex, Apathetic; FAQ riftjudge #10548)
      from.push(u.loc!);
      u.loc = to;
      moved.push(u);
      // contador de movimentos no turno (Kayn, Yasuo)
      const md = (u.data ||= {});
      if (md.moveTurn !== this.turn) {
        md.moveTurn = this.turn;
        md.moves = 0;
      }
      md.moves++;
    }
    if (!moved.length) return;
    this.say(`${moved.map((u) => this.name(u)).join(', ')} → ${this.locName(to)}.`, moved[0].controller);
    if (to.t === 'bf') this.applyContested(to.i, moved[0].controller);
    for (let i = 0; i < moved.length; i++)
      this.emit({ type: 'move', unit: moved[i], from: from[i], to, mover, units: moved });
  }
  /** Novo (UNL chaos): `p` está proibido de mover `u` neste turno (noMoveTurn; noMoveBy = só esse jogador, Vex, Apathetic). */
  cantMoveBy(u: Obj, p: P): boolean {
    return u.noMoveTurn === this.turn && (u.noMoveBy === undefined || u.noMoveBy === p);
  }
  /** Alguma aura impede este movimento? (Vilemaw's Lair) */
  moveBlocked(u: Obj, from: Loc, to: Loc, by: P | null = this.moveBy()): boolean {
    return this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.blockMove?.(this, src, u, from, to, by)));
  }
  /**
   * Novo (VEN-073): quem move por spell/habilidade agora — o controlador do item que está resolvendo (ou `mover`); null
   * = não é um spell nem uma habilidade (movimento padrão). Usado por Aura.blockMove ("can't be moved by enemy spells and
   * abilities", Jagged Cutlass).
   */
  moveBy(mover?: P): P | null {
    return this.resolving > 0 ? (this.resolvingBy ?? mover ?? null) : null;
  }
  /** Novo (UNL fury): a unidade (este objeto) conquistou neste turno? (Blighted Battleaxe; RiftJudge #9662) */
  unitConqueredThisTurn(u: Obj): boolean {
    const x = u.data?.conquered;
    return !!x && x.turn === this.turn && x.v === u.zoneVersion;
  }
  /** Novo (UNL fury): grava no spell `o` a energia gasta para jogá-lo (data.spentE; Revna: "se você gastou [4] ou mais"). */
  noteSpellEnergy(o: Obj, n: number) {
    (o.data ||= {}).spentE = n;
  }
  /** Quantas vezes a unidade se moveu neste turno (movimento padrão ou por efeito; recall não conta). */
  movesThisTurn(u: Obj): number {
    return u.data?.moveTurn === this.turn ? u.data.moves || 0 : 0;
  }
  applyContested(i: number, p: P) {
    const b = this.bfs[i];
    if (b.controller !== p && b.contestedBy === null) b.contestedBy = p;
  }
  createToken(code: string, p: P, loc: Loc, ready = false): Obj {
    const o = this.newObj(code, p, 'board', true);
    // novo: criar ficha de unidade é jogá-la (regras 185.2.a e 350.2): restrições de local (Mageseeker Warden) valem;
    // se o local é proibido, a instrução é ignorada (regra 358.3.a)
    if (this.isUnit(o) && !this.playLocOk(p, o, loc)) {
      o.zone = 'gone';
      this.say(`${this.pname(p)} não pode jogar a ficha ${this.name(o)} em ${this.locName(loc)}.`, p);
      return o;
    }
    // novo: "a próxima unidade que você jogar neste turno entra pronta" (Sun Disc) vale para fichas de unidade; com o
    // Zilean só a original o recebe (a cópia a mais não herda efeito de outra fonte: 375; ver OGN-021)
    const nxUnit = this.isUnit(o) ? this.effects.filter((e) => e.nextPlay === 'unit' && e.player === p) : [];
    if (nxUnit.length) this.effects = this.effects.filter((e) => !nxUnit.includes(e));
    const auraReady = this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.enterReady?.(this, src, o, loc)));
    this.putOnBoard(o, loc, ready || auraReady || nxUnit.some((e) => e.enterReady) || (this.isUnit(o) && this.playerFlag(p, 'unitsEnterReady')));
    this.say(`${this.pname(p)} joga uma ficha ${this.name(o)} em ${this.locName(loc)}.`, p);
    if (loc.t === 'bf') this.applyContested(loc.i, p);
    if (this.isUnit(o)) this.emit({ type: 'play', obj: o, player: p, loc, token: true, nextFx: nxUnit.map((e) => e.id) });
    // novo (mind): ficha de gear também é jogada (185.2.a): "quando você joga um gear" vale para Gold (FAQ riftjudge #1938)
    else if (this.isGear(o)) this.emit({ type: 'play', obj: o, player: p, loc, token: true });
    return o;
  }
  /**
   * Novo (SFD): joga uma ficha de unidade como uma jogada (185.2.a): custos adicionais que ela tem ao ser jogada
   * (Accelerate dado por Rek'Sai, Breacher; RiftJudge #9414 e #9360) são oferecidos e pagos antes de ela entrar.
   * Ficha sem domínio paga o [C] do Accelerate com qualquer domínio (805.1.a.2). Fora isso, igual a createToken.
   */
  *playTokenG(code: string, p: P, loc: Loc, ready = false): Gen<Obj> {
    return (yield* this.playTokensG(code, p, loc, ready))[0];
  }
  /**
   * Novo (UNL mind): como playTokenG, mas aplica as substituições "se você fosse jogar uma ficha de unidade, jogue-a e
   * mais N cópias" (CardScript.tokenPlayReplace: Zilean, Time Mage) e devolve TODAS as fichas jogadas. Cada fonte se
   * aplica uma vez à jogada, na ordem que o jogador escolher (370.2, 372; RiftJudge #10154). As cópias a mais herdam as
   * modificações da jogada (pronta, Accelerate pago; regra 375, RiftJudge #9917, #12467).
   */
  *playTokensG(code: string, p: P, loc: Loc, ready = false): Gen<Obj[]> {
    // novo (RAD): CardScript.tokenCodeReplace ("em vez disso, jogue outra ficha", Heimerdinger, Academy Instructor)
    if (kindOf(code) === 'unit')
      for (const src of this.board().filter((o) => o.controller === p && this.script(o).tokenCodeReplace)) {
        const nc = yield* this.script(src).tokenCodeReplace!(this, src, code, p, loc);
        if (nc) {
          code = nc;
          break;
        }
      }
    let acc = false;
    const grants = this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.playKeywords));
    if (!ready && kindOf(code) === 'unit' && grants) {
      const probe = this.newObj(code, p, 'setAside', true);
      const kw = this.kw(probe);
      for (const src of this.auraSources()) for (const a of this.script(src).auras || []) this.mergeKw(kw, a.playKeywords?.(this, src, probe, p));
      if (kw.accelerate && this.playLocOk(p, probe, loc)) {
        const cost = this.totalCost({ base: NO_COST, add: { energy: 1, power: [[...DOMAINS]] }, plain: [], post: [] }, p, probe);
        if (this.canPay(p, cost) && (yield* this.yesNo(p, `Pagar Accelerate (${this.costText(cost)}) para a ficha ${this.name(probe)} entrar pronta?`))) {
          yield* this.payG(p, cost);
          acc = true;
        }
      }
      delete this.objs[probe.id];
    }
    // novo (UNL mind): substituições de jogar ficha de unidade (Zilean, Time Mage)
    let extra = 0;
    if (kindOf(code) === 'unit') {
      const srcs = this.board().filter((o) => o.controller === p && this.script(o).tokenPlayReplace);
      for (const src of srcs) if (src.zone === 'board') extra += yield* this.script(src).tokenPlayReplace!(this, src, code, p, loc);
    }
    const out: Obj[] = [];
    for (let k = 0; k <= extra; k++) out.push(this.createToken(code, p, loc, ready || acc));
    return out;
  }
  /** Cartas olhadas/reveladas do topo do deck principal de p: ganchos "ao olhar/revelar" (Nocturne). Retorna os ids que continuam no deck. */
  *lookAtTop(p: P, ids: string[]): Gen<string[]> {
    for (const id of ids) {
      const o = this.objs[id];
      const f = this.script(o).onLookTop;
      if (f && o.zone === 'mainDeck' && o.owner === p) yield* f(this, o, p);
    }
    return ids.filter((id) => this.objs[id].zone === 'mainDeck');
  }
  /**
   * Novo (SFD): chame antes de `p` revelar cartas do topo de um deck ("revele as N do topo", "revele até..."): aplica as
   * substituições "se você fosse revelar cartas de um deck" das permanentes de p (Void Hatchling), uma vez por instrução
   * (regra 370.2). owner = dono do deck.
   */
  *beforeReveal(p: P, owner: P, deck: 'mainDeck' | 'runeDeck' = 'mainDeck'): Gen {
    for (const src of this.board().filter((o) => o.controller === p && this.script(o).beforeReveal))
      if (src.zone === 'board') yield* this.script(src).beforeReveal!(this, src, p, owner, deck);
  }
  /**
   * Novo (lote motor): revela as `n` cartas do topo do deck principal de `owner` (regra 424), por instrução de `by`
   * (padrão: o dono). 1. beforeReveal (Void Hatchling). 2. Ganchos de olhar/revelar do topo (onLookTop: Nocturne).
   * 3. "As I'm revealed" de cada carta revelada (CardScript.onReveal, ex.: Undertitan). Deck com menos cartas: revela as
   * que houver, sem Burn Out (431.1.c). Retorna as reveladas que continuam no deck (424.1.a.2): quem chamou decide o destino.
   */
  *revealTop(owner: P, n: number, by: P = owner): Gen<Obj[]> {
    yield* this.beforeReveal(by, owner);
    const ids = yield* this.lookAtTop(owner, this.pl[owner].mainDeck.slice(0, n));
    const cards = ids.map((id) => this.objs[id]);
    this.say(`${this.pname(by)} revela ${cards.length ? cards.map((o) => this.name(o)).join(', ') : 'nada'} do topo do deck${owner !== by ? ` de ${this.pname(owner)}` : ''}.`, by);
    yield* this.onRevealG(cards, owner);
    return cards.filter((o) => o.zone === 'mainDeck');
  }
  /** Novo: "As I'm revealed" (onReveal) das cartas reveladas que ainda estão no deck (parte 3 de revealTop). */
  *onRevealG(cards: Obj[], owner: P): Gen {
    for (const o of cards) {
      const f = this.script(o).onReveal;
      if (f && o.zone === 'mainDeck' && o.owner === owner) yield* f(this, o, owner);
    }
  }
  *predict(p: P, n = 1): Gen {
    const s = this.pl[p];
    const top = yield* this.lookAtTop(p, s.mainDeck.slice(0, n));
    if (!top.length) return;
    const ids = yield* this.ask(
      p,
      'choose',
      'Predict: escolha quais cartas do topo reciclar (as outras voltam ao topo)',
      top.map((id) => ({ id, label: this.name(id), obj: id })),
      0,
      top.length,
    );
    yield* this.recycleCards(ids.map((id) => this.objs[id]), { by: p }); // várias ao mesmo tempo: ordem aleatória (416.5)
    // as outras voltam ao topo na ordem que o jogador quiser (436.1.a)
    const rest = top.filter((id) => !ids.includes(id) && this.objs[id].zone === 'mainDeck');
    if (rest.length > 1) yield* this.putOnTop(p, rest.map((id) => this.objs[id]));
    this.say(`${this.pname(p)} faz Predict ${n}${ids.length ? ` e recicla ${ids.length}` : ''}.`, p);
  }
  burn(p: P, n: number) {
    const s = this.pl[p];
    let burns = 0; // novo: Burn Outs desta sequência (431.3.b)
    for (let i = 0; i < n; i++) {
      if (!s.mainDeck.length) {
        this.burnOut(p, burns++ > 0);
        if (!s.mainDeck.length) continue;
      }
      this.toZone(this.objs[s.mainDeck[0]], 'trash');
    }
  }
  /** Add (regra 429): põe energia/power no pool do jogador. 'any' = power de qualquer domínio. */
  addResources(p: P, energy: number, power: (Domain | 'any')[] = [], onlySpells = false, onlyGear = false, onlyShowdown = false, only?: PayUse[]) {
    const pool = this.pl[p].pool;
    pool.energy += energy;
    for (const d of power) pool.power[d] = (pool.power[d] || 0) + 1;
    // novo (Vendetta): recurso com restrição de uso fica marcado no pool ("só para spells"; Ornn: "só para gear ou
    // habilidades de gear"; Renekton, Butcher: "só para jogar unidades ou habilidades ativadas de unidades"...)
    const uses = this.addUses({ onlySpells, onlyGear, only });
    if (uses) {
      const key = [...uses].sort().join(',');
      const list = (pool.only ||= []);
      let r = list.find((x) => [...x.uses].sort().join(',') === key);
      if (!r) list.push((r = { energy: 0, power: {}, uses: [...uses] }));
      r.energy += energy;
      for (const d of power) r.power[d] = (r.power[d] || 0) + 1;
    }
    // novo (UNL legends): "gaste esta energia só durante showdowns" (Diana, Scorn of the Moon)
    if (onlyShowdown) {
      const sd = (pool.showdownOnly ||= { energy: 0, power: {} });
      sd.energy += energy;
      for (const d of power) sd.power[d] = (sd.power[d] || 0) + 1;
    }
    const pw = power.map((d) => (d === 'any' ? 'qualquer' : d)).join(', ');
    if (!energy && !pw) return; // novo (revisão mind): nada adicionado (ativação manual de conversão, Hextech Anomaly) não vira "adiciona  ao pool"
    this.say(`${this.pname(p)} adiciona ${[energy ? `${energy} de energia` : '', pw ? `power (${pw})` : ''].filter(Boolean).join(' e ')} ao pool.`, p);
  }
  /**
   * Anexa `gear` a `unit` (regra 434). Novo (lote motor): desanexa da carta anterior (434.1.f); anexar à mesma carta não
   * faz nada (434.1.g/h); o gear vai para o local da unidade sem ser movimento (434.4) e não muda de estado (434.5);
   * controladores podem ser diferentes (718.5.e). Emite 'detach' (reattach) e 'attach'. `by` = jogador que anexa
   * ("quando você anexa", Aphelios); viaEquip = pela palavra-chave Equip (818.2: a unidade foi "equipada").
   * Não confere "unidade que você controla": isso é do texto/alvo de quem chama. Retorna se anexou.
   */
  attach(
    gear: Obj,
    unit: Obj,
    by: P = this.resolving > 0 && this.resolvingBy !== null ? this.resolvingBy : gear.controller, // novo (SFD calm): quem resolve o efeito
    opts: { viaEquip?: boolean } = {},
  ): boolean {
    if (gear.zone !== 'board' || unit.zone !== 'board' || !this.isUnit(unit) || gear.id === unit.id || unit.attachedTo) return false;
    if (this.isUnit(gear)) return false; // novo: unit gear é unidade, não se anexa (patch notes das Core Rules do Radiance: "Units can't be attached to other game objects")
    if (gear.attachedTo === unit.id) return false; // 434.1.g: nada acontece
    const prev = this.topMost(gear);
    if (prev) {
      this.unlink(gear);
      this.endCopyWhile(gear, prev); // novo (VEN-137)
      this.emit({ type: 'detach', obj: gear, unit: prev, player: by, reason: 'reattach' });
    }
    gear.attachedTo = unit.id;
    unit.attached = [...(unit.attached || []), gear.id];
    gear.loc = unit.loc; // 434.4 (não é movimento); o local vale sempre pelo da unidade (locOf)
    gear.attachedTurn = this.turn;
    this.say(`${this.name(gear)} é anexado a ${this.name(unit)}${prev ? ` (sai de ${this.name(prev)})` : ''}.`, by);
    this.emit({ type: 'attach', obj: gear, unit, player: by, prev, viaEquip: !!opts.viaEquip });
    return true;
  }
  /**
   * Novo: desanexa `gear` (regra 435): fica no local da carta do topo (435.4); solto num campo, a próxima limpeza o chama
   * de volta para a base do controlador (435.4.a, 457.1). Não anexado: nada acontece (435.1.a.1). Emite 'detach'.
   */
  detach(gear: Obj, by?: P): boolean {
    const u = this.topMost(gear);
    if (!u) return false;
    const loc = this.locOf(gear);
    this.unlink(gear);
    if (loc) gear.loc = loc;
    this.endCopyWhile(gear, u); // novo (VEN-137)
    this.say(`${this.name(gear)} é desanexado de ${this.name(u)}.`, by);
    this.emit({ type: 'detach', obj: gear, unit: u, player: by ?? gear.controller, reason: 'effect' });
    return true;
  }
  /** Desfaz o vínculo de anexo (sem eventos). Troca os arrays (não muta) para fotografias de morte continuarem certas. */
  private unlink(gear: Obj): Obj | undefined {
    const u = gear.attachedTo ? this.objs[gear.attachedTo] : undefined;
    gear.attachedTo = undefined;
    if (u?.attached) {
      const a = u.attached.filter((id) => id !== gear.id);
      u.attached = a.length ? a : undefined;
    }
    return u;
  }

  // ───────────────────────────── pagamento ─────────────────────────────
  /** Planeja pagar um custo com o pool, runas (exaurir = energia, reciclar = power) e fichas de Gold. */
  planPayment(p: P, cost: Cost, forSpell = false, noAdds = false, exclude?: Set<string>, forced?: string[], goldE?: number): PayPlan | null {
    // [Add] de cartas (Kai'Sa, Darius...): planeja também com as fontes disponíveis
    if (!noAdds) {
      const srcs = this.addSources(p, forSpell).filter((x) => !exclude?.has(this.addKey(x)));
      if (srcs.length) return this.planWithAdds(p, cost, srcs, forSpell);
    }
    const pool = this.usablePool(p, forSpell); // novo: sem a parte "só para spells" se não for spell
    let needE = Math.max(0, cost.energy - pool.energy);
    const poolPow: Record<string, number> = { ...pool.power };
    const pips: Domain[][] = [];
    for (const pip of [...cost.power].sort((a, b) => a.length - b.length)) {
      const d = pip.find((x) => (poolPow[x] || 0) > 0);
      if (d) poolPow[d]--;
      else if ((poolPow.any || 0) > 0) poolPow.any--;
      else pips.push(pip);
    }
    const runes = this.runesOf(p);
    const readyRunes = runes.filter((r) => !r.exhausted);
    const gExtra = this.goldExtra(p); // novo (SFD): energia extra de cada Gold (Renata Glasc, Chem-Baroness)
    if (readyRunes.length < needE && !gExtra) return null;
    // casar pips com runas (preferindo exauridas) e Gold
    const gold = this.gearOf(p).filter((g) => g.code === 'TOK-GOLD' && !g.exhausted);
    const pref = [...runes].sort((a, b) => Number(b.exhausted) - Number(a.exhausted));
    // Runas do mesmo domínio e mesmo estado (pronta/exaurida) são intercambiáveis, assim como as fichas de Gold:
    // a busca anda por classes e memoriza os estados sem solução (sem isso, um custo impossível com muitos pips e
    // muitas runas fazia uma busca exponencial).
    const classes: { dom: Domain; objs: Obj[] }[] = [];
    for (const r of pref) {
      const dom = this.data(r).domains[0];
      let c = classes.find((x) => x.dom === dom && x.objs[0].exhausted === r.exhausted);
      if (!c) classes.push((c = { dom, objs: [] }));
      c.objs.push(r);
    }
    const usedN = classes.map(() => 0);
    let goldN = 0;
    const failed = new Set<string>();
    const assign: (Obj | null)[] = [];
    const tryAssign = (i: number): boolean => {
      if (i === pips.length) return true;
      const key = `${i}:${usedN.join(',')}:${goldN}`;
      if (failed.has(key)) return false;
      for (let k = 0; k < classes.length; k++) {
        const c = classes[k];
        if (usedN[k] >= c.objs.length) continue;
        if (!pips[i].includes(c.dom)) continue;
        if (forced && forced[i] !== c.dom) continue; // escolha do jogador (payChoices)
        assign[i] = c.objs[usedN[k]++];
        if (tryAssign(i + 1)) return true;
        usedN[k]--;
      }
      if (goldN < gold.length && (!forced || forced[i] === 'gold')) {
        assign[i] = gold[goldN++];
        if (tryAssign(i + 1)) return true;
        goldN--;
      }
      failed.add(key);
      return false;
    };
    if (!tryAssign(0)) return null;
    const recycle = assign.filter((x) => x && this.kind(x) === 'rune') as Obj[];
    const goldUsed = assign.filter((x) => x && x.code === 'TOK-GOLD') as Obj[];
    // novo (SFD): com a Renata, cada Gold usado também adiciona energia; se faltar energia, usa Gold só pela energia
    // (o [A] dele sobra no pool)
    if (gExtra) {
      needE = Math.max(0, needE - goldUsed.length * gExtra);
      if (goldE !== undefined) {
        // novo: escolha do jogador (payChoices): exatamente goldE Golds a mais pela energia, em vez de exaurir runas
        let k = 0;
        for (const g of gold)
          if (k < goldE && needE > 0 && !goldUsed.includes(g)) {
            goldUsed.push(g);
            needE = Math.max(0, needE - gExtra);
            k++;
          }
        if (k < goldE) return null;
      } else
        for (const g of gold)
          if (needE > readyRunes.length && !goldUsed.includes(g)) {
            goldUsed.push(g);
            needE = Math.max(0, needE - gExtra);
          }
    }
    // energia: exaurir primeiro as runas prontas que serão recicladas
    const exhaust: Obj[] = [];
    const recycleReady = recycle.filter((r) => !r.exhausted);
    for (const r of recycleReady) if (exhaust.length < needE) exhaust.push(r);
    // depois, alternando os domínios: sempre do domínio com mais runas prontas sobrando (empate: um diferente do último
    // exaurido; depois a ordem de canalização), para as prontas que ficam continuarem equilibradas entre as cores
    if (exhaust.length < needE) exhaust.push(...this.balancedExhaust(readyRunes.filter((r) => !recycle.includes(r)), needE - exhaust.length));
    if (exhaust.length < needE) return null;
    return { exhaust, recycle, gold: goldUsed };
  }
  /** Novo: escolhe n runas de `ready` para exaurir deixando as que sobram o mais equilibradas possível entre os
   *  domínios (sempre do domínio com mais runas sobrando; empate: alterna com o último escolhido, depois a ordem). */
  balancedExhaust(ready: Obj[], n: number): Obj[] {
    const left = new Map<string, Obj[]>();
    for (const r of ready) {
      const d = this.data(r).domains[0];
      if (!left.has(d)) left.set(d, []);
      left.get(d)!.push(r);
    }
    const out: Obj[] = [];
    let last: string | undefined;
    while (out.length < n) {
      let best: string | undefined;
      for (const [d, rs] of left) {
        if (!rs.length) continue;
        const b = best === undefined ? 0 : left.get(best)!.length;
        if (best === undefined || rs.length > b || (rs.length === b && best === last && d !== last)) best = d;
      }
      if (best === undefined) break;
      out.push(left.get(best)!.shift()!);
      last = best;
    }
    return out;
  }
  /** Novo (SFD): energia extra que cada Gold de p adiciona (auras goldExtra: Renata Glasc, Chem-Baroness). */
  goldExtra(p: P): number {
    let n = 0;
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) n += a.goldExtra?.(this, src, p) || 0;
    return n;
  }
  /** Domínios que um objeto adiciona com "[Tap]: Add [domínio]" (habilidade isAdd com addPower). */
  addPowerOf(o: Obj): Domain[] {
    if (o.zone !== 'board') return [];
    const a = (this.script(o).activated || []).find((x) => x.isAdd && x.exhaustSelf && x.addPower);
    const ap = a?.addPower as Domain[] | Domain | undefined;
    return !ap ? [] : Array.isArray(ap) ? ap : [ap];
  }
  canPay(p: P, cost: Cost, forSpell = false) {
    return this.planPayment(p, cost, forSpell) !== null;
  }
  // ── [Add] de cartas no pagamento automático (regras 429.3 e 444.2.c) ──
  /** Habilidades de [Add] que p pode usar agora para pagar. forSpell: o pagamento é para jogar um spell. */
  addSources(p: P, forSpell = false): AddSource[] {
    const out: AddSource[] = [];
    const owners = this.board().filter((o) => o.controller === p);
    owners.push(...this.legendsOf(p)); // novo (Neeko): lendas acrescentadas
    for (const o of owners) {
      for (const a of this.script(o).activated || []) {
        const adds = this.addsOf(a, o);
        if (!adds || a.notAutoPay) continue; // novo: Gold entra pelo caminho próprio do pagamento
        // restrição de uso ("Use only to play spells", Ornn "only to play gear or use gear abilities", Renekton, Butcher...)
        if (!this.usesAllow(this.addUses(adds), forSpell)) continue;
        if (adds.onlyShowdown && !this.showdown) continue; // novo (UNL legends): só durante showdowns (Diana)
        if (a.exhaustSelf && o.exhausted) continue;
        if (a.spendBuffSelf && o.buffs <= 0) continue;
        if (a.condition && !a.condition(this, o)) continue;
        // sem [Reaction] (429.3), só quando o jogador poderia ativá-la logo antes (estado aberto, com o Focus no showdown)
        if (a.timing !== 'reaction' && !this.couldActivateNow(p, a)) continue;
        if ((a.cost || a.targets) && !adds.convert) continue; // fontes com custo de recurso ou alvo ficam de fora (conversões entram: o planejador conta o custo)
        // custo não padrão (Malzahar: matar algo seu): entra se der para pagar; o jogador confirma e escolhe no pagamento
        if (a.extraCost && a.canPayExtra && !a.canPayExtra(this.ctx(o, p))) continue;
        out.push({ src: o, a, adds });
      }
    }
    return out;
  }
  /** Novo: p poderia ativar agora (logo antes de pagar) uma habilidade sem [Reaction]? Estado aberto, fora da
   *  resolução: fase principal no próprio turno, ou com o Focus num showdown se a habilidade tiver [Action]. */
  couldActivateNow(p: P, a: ActivatedDef): boolean {
    if (this.resolving > 0 || this.finalizingTriggers > 0 || this.chain.length || this.pending.length) return false;
    if (this.showdown) return a.timing === 'action' && this.showdown.focus === p;
    return this.phase === 'main' && p === this.active;
  }
  /** Novo (Vendetta): roda `f` como pagamento para `use` (jogar uma carta ou habilidade; ver payUses). */
  asPayFor<T>(use: PayUse | PayUse[] | undefined, f: () => T): T {
    if (!use) return f();
    this.payUses.push(use);
    try {
      return f();
    } finally {
      this.payUses.pop();
    }
  }
  /** Novo (Vendetta): versão gerador de asPayFor. */
  *asPayForG<T>(use: PayUse | PayUse[] | undefined, gen: Gen<T>): Gen<T> {
    if (!use) return yield* gen;
    this.payUses.push(use);
    try {
      return yield* gen;
    } finally {
      this.payUses.pop();
    }
  }
  /** Novo (Vendetta): quantas habilidades ativadas p usou neste turno (de fontes do tipo `use`, ou todas). */
  activationsThisTurn(p: P, use?: PayUse): number {
    const a = this.pl[p].acts;
    return !a || a.turn !== this.turn ? 0 : use ? a.uses.filter((u) => u === use).length : a.uses.length;
  }
  /** Uso de pagamento de jogar a carta `o`. */
  playUse(o: Obj): PayUse | PayUse[] | undefined {
    if (this.isUnitGear(o)) return ['unit', 'gear']; // unit gear é unidade e gear
    const k = this.kind(o);
    return k === 'unit' || k === 'gear' || k === 'spell' ? k : undefined;
  }
  /** Uso de pagamento de uma habilidade ativada de `o` ("activated abilities of units", "gear abilities"). */
  abilityUse(o: Obj): PayUse {
    if (this.isUnit(o)) return 'unitAbility';
    if (this.isGear(o)) return 'gearAbility';
    return this.kind(o) === 'legend' ? 'legendAbility' : 'otherAbility';
  }
  /** Usos de pagamento de habilidade de `o` (unit gear: de unidade e de gear). */
  abilityUses(o: Obj): PayUse | PayUse[] {
    return this.isUnit(o) && this.isGear(o) ? ['unitAbility', 'gearAbility'] : this.abilityUse(o);
  }
  /** Restrição de uso de uma fonte de [Add] (adds.only, ou os atalhos onlySpells/onlyGear). */
  addUses(adds: { onlySpells?: boolean; onlyGear?: boolean; only?: PayUse[] }): PayUse[] | undefined {
    if (adds.only) return adds.only;
    if (adds.onlySpells) return ['spell'];
    if (adds.onlyGear) return ['gear', 'gearAbility'];
    return undefined;
  }
  /** O pagamento em andamento pode usar um recurso com esta restrição? (sem restrição: sempre) */
  usesAllow(uses: PayUse[] | undefined, forSpell: boolean): boolean {
    if (!uses) return true;
    const t = this.payUses[this.payUses.length - 1];
    const top = Array.isArray(t) ? t : t ? [t] : [];
    return uses.some((u) => top.includes(u) || (u === 'spell' && forSpell));
  }
  /** Novo: identificador de uma fonte de [Add] (para excluir uma recusada pelo jogador). */
  addKey(x: AddSource): string {
    return `${x.src.id}:${(this.script(x.src).activated || []).indexOf(x.a)}`;
  }
  /** Novo: pool utilizável num pagamento (a parte "só para spells" não paga outras coisas). */
  usablePool(p: P, forSpell: boolean): { energy: number; power: Record<string, number> } {
    const pool = this.pl[p].pool;
    const power: Record<string, number> = { ...pool.power };
    let energy = pool.energy;
    // partes restritas do pool que este pagamento não pode usar
    for (const r of [...(pool.only || []).filter((x) => !this.usesAllow(x.uses, forSpell)), this.showdown ? undefined : pool.showdownOnly]) { // showdownOnly: novo (UNL legends)
      if (!r) continue;
      for (const k of Object.keys(r.power)) power[k] = Math.max(0, (power[k] || 0) - r.power[k]);
      energy = Math.max(0, energy - r.energy);
    }
    return { energy, power };
  }
  /** O que uma habilidade de [Add] adiciona (adds, ou addPower dos Seals); undefined se não for [Add]. */
  addsOf(a: ActivatedDef, src?: Obj): NonNullable<ActivatedDef['adds']> | undefined {
    if (!a.isAdd) return undefined;
    if (a.addsFor && src) return a.addsFor(this, src); // novo (revisão VEN-075): o que adiciona depende do estado da fonte
    if (a.adds) return a.adds;
    if (a.addPower) return { power: [Array.isArray(a.addPower) ? a.addPower : [a.addPower]] };
    return undefined;
  }
  /**
   * Escolhe quais fontes de [Add] usar: testa cada combinação (e a quem cada power adicionado vai) e fica com a
   * que gasta menos. Peso: exaurir runa 1, reciclar runa 3, Gold 3,5; fonte reutilizável 0,5 (preferida às runas),
   * fonte que se sacrifica 4 (só quando precisa).
   */
  private planWithAdds(p: P, cost: Cost, srcs: AddSource[], forSpell = false): PayPlan | null {
    let best: PayPlan | null = null;
    let bestScore = Infinity;
    const n = Math.min(srcs.length, 8);
    for (let mask = 0; mask < 1 << n; mask++) {
      const chosen = srcs.filter((_, i) => mask & (1 << i));
      if (new Set(chosen.map((x) => x.src.id)).size !== chosen.length) continue; // uma ativação por permanente
      const addE = chosen.reduce((s, x) => s + (x.adds.energy || 0), 0);
      const addP = chosen.flatMap((x) => x.adds.power || []);
      const pen = chosen.reduce((s, x) => s + (x.a.killSelf ? 4 : x.a.extraCost ? 6 : 0.5), 0); // extraCost (Malzahar): só quando precisa
      // novo: conversões de quantidade variável (Ancient Henge: energia → [A]; Hextech Anomaly: [A] → energia): testa cada
      // quantidade; o custo da conversão entra no que se paga (payCost) e o que ela adiciona cobre o resto
      const conv = chosen.filter((x) => x.adds.convert);
      if (conv.length > 1) continue; // uma conversão por pagamento basta (nenhuma carta pede duas)
      const cv = conv[0];
      const maxN = !cv ? 0 : cv.adds.convert === 'energyToPower' ? cost.power.length : cost.energy;
      for (let cn = cv ? 1 : 0; cn <= maxN; cn++) {
      const toPow = cv?.adds.convert === 'energyToPower';
      const payCost: Cost = !cv ? cost : toPow ? { energy: cost.energy + cn, power: cost.power } : { energy: cost.energy, power: [...cost.power, ...Array.from({ length: cn }, () => [...DOMAINS])] };
      // pips já cobertos pelo [A] convertido (os mais restritos primeiro) e energia já coberta pela energia convertida
      const ord = cost.power.map((_, i) => i).sort((x, y) => cost.power[x].length - cost.power[y].length);
      const convCovered = toPow ? ord.slice(0, cn) : [];
      const convE = cv && !toPow ? cn : 0;
      // cada power adicionado cobre um pip diferente do custo (ou sobra)
      const covered: number[] = [];
      const keys: string[] = [];
      const tryCover = (k: number) => {
        if (k === addP.length) {
          const residual: Cost = {
            energy: Math.max(0, payCost.energy - addE - convE),
            power: [...cost.power.filter((_, i) => !covered.includes(i)), ...payCost.power.slice(cost.power.length)],
          };
          const plan = this.planPayment(p, residual, forSpell, true);
          if (!plan) return;
          const score = plan.exhaust.length + 3 * plan.recycle.length + 3.5 * plan.gold.length + pen;
          if (score < bestScore) {
            bestScore = score;
            best = { ...plan, adds: chosen, addPow: [...keys], addN: chosen.map((x) => (x === cv ? cn : 0)), payCost: cv ? payCost : undefined };
          }
          return;
        }
        const ap = addP[k];
        const anyKey = ap.length >= DOMAINS.length ? 'any' : null;
        cost.power.forEach((pip, i) => {
          if (covered.includes(i)) return;
          const d = pip.find((x) => ap.includes(x));
          if (!d) return;
          covered.push(i);
          keys.push(anyKey || d);
          tryCover(k + 1);
          covered.pop();
          keys.pop();
        });
        keys.push(anyKey || ap[0]); // sobra no pool
        tryCover(k + 1);
        keys.pop();
      };
      const covered0 = [...convCovered];
      covered.push(...covered0);
      tryCover(0);
      covered.length = 0;
      }
    }
    return best;
  }
  /** Ativa as fontes de [Add] escolhidas pelo plano (429.3.a: finalizam e resolvem na hora): o que adicionam vai
   *  para o pool (e é gasto pelo pagamento). Custos não padrão (Malzahar) são pagos aqui, com as escolhas do jogador. */
  private *useAddsG(p: P, plan: PayPlan): Gen {
    const pool = this.pl[p].pool;
    let k = 0;
    for (const { src, a, adds } of plan.adds || []) {
      this.emit({ type: 'activate', obj: src, player: p, label: a.label, isAdd: true }); // novo
      if (a.exhaustSelf) this.markExhausted(src);
      if (a.spendBuffSelf) this.spendBuff(src);
      if (a.extraCost && !(yield* a.extraCost(this.ctx(src, p)))) throw new IllegalAction('Custo não pago.');
      const e = adds.energy || 0;
      const pw = (adds.power || []).map(() => plan.addPow![k++]);
      this.addResources(p, e, pw as (Domain | 'any')[], !!adds.onlySpells, !!adds.onlyGear, !!adds.onlyShowdown, adds.only);
      // novo: conversão (o custo dela está em plan.payCost)
      const cn = plan.addN?.[(plan.adds || []).findIndex((x) => x.src === src && x.a === a)] || 0;
      if (adds.convert && cn) {
        if (adds.convert === 'energyToPower') this.addResources(p, 0, Array.from({ length: cn }, () => 'any' as const), !!adds.onlySpells, !!adds.onlyGear, false, adds.only);
        else this.addResources(p, cn, [], !!adds.onlySpells, !!adds.onlyGear, false, adds.only);
      }
      if (a.killSelf) {
        this.payingFor = { src, p }; // atribuição de morte (custo)
        yield* this.killG(src, 'é sacrificada');
        this.payingFor = undefined;
      }
    }
  }
  /** Pagamento síncrono (legado): escolhas de fontes de [Add] recebem a resposta padrão. Prefira `yield* payG(...)`. */
  pay(p: P, cost: Cost, forSpell = false) {
    this.runSync(this.payG(p, cost, forSpell));
  }
  /**
   * Novo: paga um custo (pool, runas, Gold e [Add] de cartas, regras 357.1.a e 429.3). Fonte de [Add] com custo que
   * exige escolha (Malzahar: matar algo seu) só é usada se o jogador confirmar. forSpell: o pagamento é de um spell
   * (pode usar recursos "só para spells").
   */
  *payG(p: P, cost: Cost, forSpell = false): Gen {
    const exclude = new Set<string>();
    const ok = new Set<string>();
    let plan = this.planPayment(p, cost, forSpell, false, exclude);
    for (let guard = 0; plan && guard < 20; guard++) {
      const ask = (plan.adds || []).find((x) => x.a.extraCost && !ok.has(this.addKey(x)));
      if (!ask) break;
      const key = this.addKey(ask);
      if (yield* this.yesNo(p, `Usar ${this.name(ask.src)} (${ask.a.label}) para ajudar a pagar ${this.costText(cost)}?`)) ok.add(key);
      else {
        exclude.add(key);
        plan = this.planPayment(p, cost, forSpell, false, exclude);
      }
    }
    if (!plan) throw new IllegalAction('Recursos insuficientes para pagar o custo.');
    // o jogador escolhe COMO pagar quando há jeitos diferentes de verdade (quais runas reciclar, Gold, fontes de [Add])
    plan = yield* this.choosePayPlan(p, cost, forSpell, plan, exclude);
    if (this.pl[p].manualPay && (plan.exhaust.length || plan.recycle.length)) plan = yield* this.manualRunesG(p, plan);
    if (plan.adds?.length) yield* this.useAddsG(p, plan); // [Add] de cartas
    // novo (SFD): Gold é "[Reaction] Kill this, [Tap]: [Add] [A]" (regra 187.5): a ficha é morta e o [A] (mais a energia
    // extra da Renata Glasc, Chem-Baroness) vai para o pool; o pagamento abaixo gasta do pool
    if (plan.gold.length) {
      const gx = this.goldExtra(p);
      for (const g of plan.gold) {
        if (g.zone !== 'board') continue;
        g.exhausted = true;
        const pf = this.payingFor;
        this.payingFor = { src: g, p };
        yield* this.killG(g, 'é usada (Gold)');
        this.payingFor = pf;
        this.addResources(p, gx, ['any']);
        this.emit({ type: 'activate', obj: g, player: p, label: 'Gold', isAdd: true }); // habilidade ativada de gear (Prize of Progress)
      }
    }
    if (plan.payCost) cost = plan.payCost; // novo: conversão (Ancient Henge, Hextech Anomaly) paga junto
    const pool = this.pl[p].pool;
    const usable = this.usablePool(p, forSpell);
    const fromPoolE = Math.min(usable.energy, cost.energy);
    pool.energy -= fromPoolE;
    // gasta primeiro as partes restritas que este pagamento pode usar (novo, Vendetta: genérico)
    const allowed = (pool.only || []).filter((x) => this.usesAllow(x.uses, forSpell));
    {
      let left = fromPoolE;
      for (const r of allowed) {
        const d = Math.min(r.energy, left);
        r.energy -= d;
        left -= d;
      }
    }
    const sdo = this.showdown ? pool.showdownOnly : undefined; // novo (UNL legends): durante o showdown, gasta primeiro o "só em showdown"
    if (sdo) sdo.energy -= Math.min(sdo.energy, fromPoolE);
    for (const r of plan.exhaust) r.exhausted = true;
    // power: consumir do pool primeiro (o plano já considerou)
    const pips = [...cost.power].sort((a, b) => a.length - b.length);
    const take = (key: string) => {
      usable.power[key]--;
      pool.power[key]--;
      const r = allowed.find((x) => (x.power[key] || 0) > 0);
      if (r) r.power[key]--;
      if (sdo && (sdo.power[key] || 0) > 0) sdo.power[key]--;
    };
    for (const pip of pips) {
      const d = pip.find((x) => (usable.power[x] || 0) > 0);
      if (d) take(d);
      else if ((usable.power.any || 0) > 0) take('any');
    }
    for (const r of plan.recycle) this.recycleCard(r, { by: p }); // novo (SFD): quem recicla é quem paga (Sivir)
    // novo (SFD): power gasto neste turno (Sivir, Mercenary); gerar power sem gastá-lo não conta (FAQ riftjudge #12921)
    if (cost.power.length) {
      const ps = this.pl[p].powerSpent;
      this.pl[p].powerSpent = { turn: this.turn, n: (ps?.turn === this.turn ? ps.n : 0) + cost.power.length };
    }
    if (cost.energy || cost.power.length)
      this.say(
        `${this.pname(p)} paga ${cost.energy} de energia${cost.power.length ? ` + ${cost.power.length} power` : ''}.`,
        p,
      );
  }
  /**
   * Jeitos de pagar que mudam o resultado (regra: quem paga escolhe as fontes). Exaurir runas para energia não entra:
   * runas prontas são equivalentes para energia (o domínio só importa ao reciclar, e reciclar não exige estar pronta).
   */
  payChoices(p: P, cost: Cost, forSpell: boolean, exclude?: Set<string>): { label: string; plan: PayPlan }[] {
    const out: { label: string; plan: PayPlan; sig: string }[] = [];
    // novo (SFD): com a Renata Glasc, Chem-Baroness, cada Gold também adiciona energia: usar Gold no lugar de exaurir
    // runas é escolha do jogador (quantos Golds usar só pela energia)
    const gExtra = this.goldExtra(p);
    const nGold = gExtra ? this.gearOf(p).filter((g) => g.code === 'TOK-GOLD' && !g.exhausted).length : 0;
    const goldEs: (number | undefined)[] = gExtra ? Array.from({ length: Math.min(nGold, 6) + 1 }, (_, k) => k) : [undefined];
    const add = (plan: PayPlan | null) => {
      if (!plan) return;
      const rec = plan.recycle.map((r) => this.data(r).domains[0]).sort();
      const sig = `${rec.join(',')}|g${plan.gold.length}|${(plan.adds || []).map((x) => this.addKey(x)).sort().join(',')}|e${gExtra ? plan.exhaust.length : 0}`;
      if (out.some((o) => o.sig === sig)) return;
      const parts: string[] = [];
      const cnt: Record<string, number> = {};
      for (const d of rec) cnt[d] = (cnt[d] || 0) + 1;
      const PT: Record<string, string> = { Fury: 'Fúria', Calm: 'Calma', Mind: 'Mente', Body: 'Corpo', Chaos: 'Caos', Order: 'Ordem' };
      for (const [d, n] of Object.entries(cnt)) parts.push(`reciclar ${n} runa${n > 1 ? 's' : ''} de ${PT[d] || d}`);
      if (plan.gold.length) parts.push(`usar ${plan.gold.length} Gold`);
      for (const x of plan.adds || []) parts.push(`usar ${this.name(x.src)}`);
      // novo: com Gold que também adiciona energia (Renata Glasc), quantas runas exaurir também é escolha
      if (gExtra && plan.exhaust.length) parts.push(`exaurir ${plan.exhaust.length} runa${plan.exhaust.length > 1 ? 's' : ''}`);
      const label = parts.length ? parts.join(' + ') : 'só energia';
      out.push({ label: label.charAt(0).toUpperCase() + label.slice(1), plan, sig });
    };
    // plano com fontes de [Add] (o automático) e sem elas
    add(this.planPayment(p, cost, forSpell, false, exclude));
    // pips de power que vão sair de runas/Gold: enumera os domínios possíveis (multiconjuntos), com teto
    const pool = this.usablePool(p, forSpell);
    const poolPow: Record<string, number> = { ...pool.power };
    const pips: Domain[][] = [];
    for (const pip of [...cost.power].sort((a, b) => a.length - b.length)) {
      const d = pip.find((x) => (poolPow[x] || 0) > 0);
      if (d) poolPow[d]--;
      else if ((poolPow.any || 0) > 0) poolPow.any--;
      else pips.push(pip);
    }
    if (pips.length) {
      const doms = [...new Set(this.runesOf(p).map((r) => this.data(r).domains[0]))] as string[];
      const hasGold = this.gearOf(p).some((g) => g.code === 'TOK-GOLD' && !g.exhausted);
      const opts = hasGold ? [...doms, 'gold'] : doms;
      const combos: string[][] = [];
      const rec = (i: number, acc: string[]) => {
        if (combos.length >= 24) return;
        if (i === pips.length) return void combos.push([...acc]);
        for (const o of opts) if (o === 'gold' || pips[i].includes(o as Domain)) rec(i + 1, [...acc, o]);
      };
      rec(0, []);
      for (const f of combos) for (const k of goldEs) add(this.planPayment(p, cost, forSpell, true, exclude, f, k));
    } else for (const k of goldEs) add(this.planPayment(p, cost, forSpell, true, exclude, undefined, k));
    return out.map(({ label, plan }) => ({ label, plan }));
  }
  /** Novo: opção raiz de ligar/desligar o pagamento manual (não é ação de jogo: não passa a vez nem a prioridade). */
  manualPayOpt(p: P): Option {
    return { id: MANUAL_PAY, label: this.pl[p].manualPay ? 'Pagamento manual: desligar' : 'Pagamento manual: ligar', group: 'Opções' };
  }
  toggleManualPay(p: P) {
    this.pl[p].manualPay = !this.pl[p].manualPay;
  }
  /**
   * Novo: pagamento manual (PlayerState.manualPay). Depois do plano escolhido (Gold, fontes de [Add] e domínios já
   * decididos), o jogador escolhe qual runa reciclar para cada power e quais runas exaurir para a energia. Só pergunta
   * quando há escolha de verdade: reciclar uma pronta ou uma exaurida do mesmo domínio; exaurir runas de domínios
   * diferentes. As prontas que vão ser recicladas continuam sendo exauridas primeiro (saem de qualquer jeito).
   */
  *manualRunesG(p: P, plan: PayPlan): Gen<PayPlan> {
    const runes = this.runesOf(p);
    const dom = (r: Obj) => this.data(r).domains[0];
    const PT: Record<string, string> = { Fury: 'Fúria', Calm: 'Calma', Mind: 'Mente', Body: 'Corpo', Chaos: 'Caos', Order: 'Ordem' };
    const runeLabel = (r: Obj) => `Runa de ${PT[dom(r)] || dom(r)}${r.exhausted ? ' (exaurida)' : ' (pronta)'}`;
    const needE = plan.exhaust.length;
    const recycle: Obj[] = [];
    for (let i = 0; i < plan.recycle.length; i++) {
      const d = dom(plan.recycle[i]);
      const cands = runes.filter((r) => dom(r) === d && !recycle.includes(r));
      let pick = plan.recycle[i];
      if (cands.some((r) => r.exhausted) && cands.some((r) => !r.exhausted)) {
        const [id] = yield* this.ask(
          p,
          'choose',
          `Pagamento manual: qual runa reciclar para o power de ${PT[d] || d}${plan.recycle.length > 1 ? ` (${i + 1} de ${plan.recycle.length})` : ''}?`,
          cands.map((r) => ({ id: r.id, label: runeLabel(r), obj: r.id })),
        );
        pick = this.objs[id] ?? pick;
      } else if (!cands.includes(pick)) pick = cands[0];
      recycle.push(pick);
    }
    // energia: as prontas recicladas primeiro; o resto, à escolha
    const exhaust = recycle.filter((r) => !r.exhausted).slice(0, needE);
    const k = needE - exhaust.length;
    if (k > 0) {
      const cands = runes.filter((r) => !r.exhausted && !recycle.includes(r));
      if (cands.length < k) return plan; // não deveria acontecer (o plano já garantiu); fica o automático
      const auto = this.balancedExhaust(cands, k);
      if (k < cands.length && new Set(cands.map(dom)).size > 1) {
        const ids = yield* this.ask(
          p,
          'choose',
          `Pagamento manual: quais runas exaurir para ${k} de energia?`,
          cands.map((r) => ({ id: r.id, label: runeLabel(r), obj: r.id })),
          k,
          k,
        );
        const got = ids.map((id) => this.objs[id]).filter((r) => r && cands.includes(r));
        exhaust.push(...(got.length === k ? got : auto));
      } else exhaust.push(...auto);
    }
    return { ...plan, exhaust, recycle };
  }
  /** Novo (SFD): quanto power p gastou pagando custos neste turno. */
  powerSpentThisTurn(p: P): number {
    const ps = this.pl[p].powerSpent;
    return ps && ps.turn === this.turn ? ps.n : 0;
  }
  *choosePayPlan(p: P, cost: Cost, forSpell: boolean, plan: PayPlan, exclude?: Set<string>): Gen<PayPlan> {
    const choices = this.payChoices(p, cost, forSpell, exclude);
    if (choices.length < 2) return plan;
    const [k] = yield* this.ask(
      p,
      'choose',
      `Como pagar ${this.costText(cost)}?`,
      choices.map((c, i) => ({ id: String(i), label: c.label })),
    );
    return choices[Number(k)]?.plan ?? plan;
  }
  costText(c: Cost) {
    const pw = c.power.map((d) => (d.length >= 6 ? 'qualquer' : d.join('/'))).join(', ');
    return `${c.energy}${pw ? ` + [${pw}]` : ''}`;
  }
  /** Tira n pips de power do custo (descontos de power; não passa de 0). */
  cutPower(c: Cost, n: number): Cost {
    return { ...c, power: c.power.slice(0, Math.max(0, c.power.length - Math.max(0, n))) };
  }
  addCost(a: Cost, b?: Cost): Cost {
    if (!b) return a;
    return { energy: a.energy + b.energy, power: [...a.power, ...b.power] };
  }
  /** Custo impresso de uma carta. */
  printedCost(o: Obj): Cost {
    const d = this.data(o);
    const doms = d.domains.length ? d.domains : DOMAINS;
    return { energy: d.energy, power: Array.from({ length: d.power }, () => [...doms]) };
  }
  /** Diferença de energia que os modificadores fazem no custo impresso (negativo = mais barato). */
  energyDiscount(o: Obj, p: P): number {
    const e = this.data(o).energy;
    const mods = this.costMods(o, p);
    return this.applyEnergyMods(e, mods.plain, mods.mins) - e;
  }
  // ── custo total (regra 356): base → custos adicionais → aumentos → descontos → nunca abaixo de 0 ──
  /** Novo: modificadores de energia de uma carta: simples (aumentos/descontos) e descontos com mínimo (356.4.e). */
  costMods(o: Obj, p: P, chosen?: Obj[]): { plain: number[]; mins: { amount: number; min: number }[] } {
    const plain: number[] = [];
    const mins: { amount: number; min: number }[] = [];
    const sm = this.script(o).selfCostMod?.(this, o, p, chosen); // novo (UNL order): chosen = alvos do spell (Undying Loyalty)
    if (sm) plain.push(sm);
    const smm = this.script(o).selfCostModMin?.(this, o, p); // novo (SFD): Battering Ram
    if (smm && smm.amount > 0) mins.push(smm);
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const m = a.costMod?.(this, src, o, p);
        if (m) plain.push(m);
        const mm = a.costModMin?.(this, src, o, p);
        if (mm && mm.amount > 0) mins.push(mm);
        // novo (Vendetta): parte de energia de Aura.cardCostMod
        const cm = a.cardCostMod?.(this, src, o, p, chosen);
        if (cm?.energyMore) plain.push(cm.energyMore);
        if (cm?.energyLess) cm.energyMin !== undefined ? mins.push({ amount: cm.energyLess, min: cm.energyMin }) : plain.push(-cm.energyLess);
      }
    for (const e of this.effects) if (e.costMod && this.nextPlayMatches(e, o, p)) plain.push(e.costMod); // "a próxima spell custa menos"
    // novo (UNL legends): "suas unidades não-ficha custam [1] a mais neste turno" (Vaults of Helia)
    for (const e of this.effects) {
      const pm = e.playCostMod;
      if (pm && e.player === p && (!pm.kind || this.isKind(o, pm.kind)) && !(pm.nonToken && o.token)) plain.push(pm.energy);
    }
    return { plain, mins };
  }
  /**
   * Novo: aplica os modificadores à energia: aumentos (356.3), depois descontos (356.4). O jogador escolhe a ordem dos
   * descontos (356.4.d.1) e o mínimo de um desconto vale só para ele (356.4.e): usa a ordem que deixa mais barato
   * (descontos com mínimo antes dos simples). Nunca abaixo de 0 (356.6).
   */
  applyEnergyMods(e: number, plain: number[], mins: { amount: number; min: number }[]): number {
    e += plain.filter((x) => x > 0).reduce((a, x) => a + x, 0);
    const dec = plain.filter((x) => x < 0).reduce((a, x) => a + x, 0);
    const run = (order: { amount: number; min: number }[]) => order.reduce((x, d) => Math.max(x - d.amount, Math.min(x, d.min)), e);
    let best = run([...mins].sort((a, b) => b.min - a.min));
    if (mins.length > 1 && mins.length <= 5) {
      const perm = (arr: typeof mins, acc: typeof mins) => {
        if (!arr.length) best = Math.min(best, run(acc));
        arr.forEach((d, i) => perm([...arr.slice(0, i), ...arr.slice(i + 1)], [...acc, d]));
      };
      perm(mins, []);
    }
    return Math.max(0, best + dec);
  }
  /** Novo: custo total de uma construção de custo (base + adicionais, com os modificadores da carta). */
  totalCost(b: CostBuild, p: P, o: Obj): Cost {
    const mods = this.costMods(o, p, b.chosen);
    let cost = this.addCost(b.base, b.add);
    cost = { energy: this.applyEnergyMods(cost.energy, [...mods.plain, ...b.plain], mods.mins), power: cost.power };
    for (const f of b.post) cost = f(cost);
    // novo (SFD calm): desconto de power da própria carta, só em pips daquele domínio (Needlessly Large Yordle)
    const spc = this.script(o).selfPowerCut?.(this, o, p);
    if (spc && spc.n > 0) {
      let left = spc.n;
      const power = [...cost.power];
      for (let i = power.length - 1; i >= 0 && left > 0; i--)
        if (power[i].includes(spc.domain)) {
          power.splice(i, 1);
          left--;
        }
      cost = { ...cost, power };
    }
    // novo (SFD): Deflect e modificadores do custo total de spells (Vex, Irelia); sem escolha feita, a estimativa usa a
    // primeira variante que dá para pagar
    if (b.defl) cost = this.addCost(cost, b.defl);
    if (!b.rawSpell) {
      const opts = this.spellCostOptions(p, o, cost, b.chosen); // novo (Vendetta): modificadores de power de qualquer carta
      if (opts.length > 1) cost = opts.find((x) => this.canPay(p, x, this.kind(o) === 'spell')) ?? opts[0];
      else cost = opts[0];
    }
    return cost;
  }
  /**
   * Novo (SFD): custos finais possíveis de um spell depois dos modificadores Aura.spellCostMod (356.3 aumentos, depois
   * 356.4.d descontos ao total). Cada desconto de power tira um pip à escolha do jogador; cada "[1] ou [A]" vai para a
   * energia ou para o power, à escolha dele. Devolve as variantes distintas (sem as que outra domina).
   */
  spellCostOptions(p: P, o: Obj, cost: Cost, chosen?: Obj[]): Cost[] {
    const mods: CostMod[] = [];
    const isSpell = this.kind(o) === 'spell';
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const m = isSpell ? a.spellCostMod?.(this, src, o, p, chosen) : undefined;
        if (m) mods.push({ powerMore: m.powerMore, powerLess: m.powerLess, either: m.either });
        // novo (Vendetta): modificadores de power de qualquer carta (a energia vai por costMods)
        const cm = a.cardCostMod?.(this, src, o, p, chosen);
        if (cm) mods.push({ powerMore: cm.powerMore, powerLess: cm.powerLess, either: cm.either });
      }
    // novo (Vendetta): "a próxima carta custa [2][Rune][Rune] a menos" (Astral Heron; Boy Who Shattered Time)
    for (const e of this.effects) if (e.powerLess && this.nextPlayMatches(e, o, p)) mods.push({ powerLess: e.powerLess });
    return this.modCostOptions(cost, mods, false);
  }
  /**
   * Novo (Vendetta, motor de custos): variantes de um custo com modificadores CostMod: aumentos (356.3) e depois descontos
   * (356.4.d). Cada desconto de power tira um pip à escolha do jogador; cada "[1] ou [Rune]" vai para a energia ou para o
   * power. withEnergy: aplica também energyMore/energyLess/energyMin (habilidades; nas cartas a energia vai por costMods).
   * Devolve as variantes distintas (sem as que outra domina).
   */
  modCostOptions(cost: Cost, mods: CostMod[], withEnergy: boolean): Cost[] {
    let more = 0;
    let less = 0;
    let either = 0;
    const plain: number[] = [];
    const mins: { amount: number; min: number }[] = [];
    for (const m of mods) {
      more += m.powerMore || 0;
      less += m.powerLess || 0;
      either += m.either || 0;
      if (withEnergy) {
        if (m.energyMore) plain.push(m.energyMore);
        if (m.energyLess) m.energyMin !== undefined ? mins.push({ amount: m.energyLess, min: m.energyMin }) : plain.push(-m.energyLess);
      }
    }
    const e0 = withEnergy && (plain.length || mins.length) ? this.applyEnergyMods(cost.energy, plain, mins) : cost.energy;
    if (!more && !less && !either) return [{ energy: e0, power: cost.power }];
    const base: Cost = { energy: e0, power: [...cost.power, ...Array.from({ length: more }, () => [...DOMAINS])] };
    const out: Cost[] = [];
    for (let k = 0; k <= either; k++) {
      // k descontos "ou" na energia, o resto no power
      const energy = Math.max(0, base.energy - k);
      const cut = Math.min(base.power.length, less + (either - k));
      for (const power of this.pipRemovals(base.power, cut)) out.push({ energy, power });
    }
    // tira repetidas e dominadas (mesma energia ou mais, e pips que são um sub-multiconjunto mais restrito)
    const key = (c: Cost) => `${c.energy}|${c.power.map((d) => [...d].sort().join('/')).sort().join(',')}`;
    const uniq = out.filter((c, i) => out.findIndex((x) => key(x) === key(c)) === i);
    const covers = (a: Cost, b2: Cost) => {
      // a é tão fácil ou mais que b2: energia ≤ e cada pip de a casa com um pip diferente de b2 que ele contém
      if (a.energy > b2.energy || a.power.length > b2.power.length) return false;
      const used = new Set<number>();
      const match = (i: number): boolean => {
        if (i === a.power.length) return true;
        for (let j = 0; j < b2.power.length; j++) {
          if (used.has(j) || !b2.power[j].every((d) => a.power[i].includes(d))) continue;
          used.add(j);
          if (match(i + 1)) return true;
          used.delete(j);
        }
        return false;
      };
      return match(0);
    };
    return uniq.filter((c) => !uniq.some((x) => x !== c && covers(x, c) && !covers(c, x)));
  }
  /**
   * Novo (Vendetta, motor de custos): variantes do custo de ativar a habilidade `a` de `holder` (Aura.abilityCostMod:
   * Risen Altar nos custos de [Empower], Piltovan Forge). `cost` = custo de recursos já com o Deflect.
   */
  abilityCostOptions(p: P, holder: Obj, a: ActivatedDef, cost: Cost): Cost[] {
    const mods: CostMod[] = [];
    for (const src of this.auraSources())
      for (const au of this.script(src).auras || []) {
        const m = au.abilityCostMod?.(this, src, holder, a, p);
        if (m) mods.push(m);
      }
    return mods.length ? this.modCostOptions(cost, mods, true) : [cost];
  }
  /** Novo (SFD): maneiras de tirar n pips de uma lista de pips (multiconjuntos distintos do que sobra). */
  pipRemovals(pips: Domain[][], n: number): Domain[][][] {
    if (n <= 0) return [pips];
    if (n >= pips.length) return [[]];
    const out: Domain[][][] = [];
    const seen = new Set<string>();
    const rec = (start: number, removed: number[]) => {
      if (removed.length === n) {
        const rest = pips.filter((_, i) => !removed.includes(i));
        const k = rest.map((d) => [...d].sort().join('/')).sort().join(',');
        if (!seen.has(k)) {
          seen.add(k);
          out.push(rest);
        }
        return;
      }
      for (let i = start; i < pips.length && out.length < 64; i++) rec(i + 1, [...removed, i]);
    };
    rec(0, []);
    return out;
  }
  /**
   * Novo (SFD): variantes de um custo adicional opcional com os descontos de componente (Aura.addCostMod, 356.4.c):
   * cada "[1] ou [A]" vai para a energia ou para o power. Sem desconto, só o próprio custo.
   */
  addCostVariants(p: P, o: Obj, kind: 'accelerate' | 'repeat' | 'optional', cost: Cost): Cost[] {
    let e = 0;
    let pw = 0;
    let either = 0;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const m = a.addCostMod?.(this, src, o, p, kind);
        if (!m) continue;
        e += m.energy || 0;
        pw += m.power || 0;
        either += m.either || 0;
      }
    if (!e && !pw && !either) return [cost];
    const out: Cost[] = [];
    for (let k = 0; k <= either; k++) {
      const c2: Cost = { energy: Math.max(0, cost.energy - e - k), power: cost.power.slice(0, Math.max(0, cost.power.length - pw - (either - k))) };
      out.push(c2);
    }
    // sem as repetidas e as dominadas (desconto "gasto" num componente que já era 0)
    return out.filter(
      (c, i) =>
        out.findIndex((x) => x.energy === c.energy && x.power.length === c.power.length) === i &&
        !out.some((x) => x !== c && x.energy <= c.energy && x.power.length <= c.power.length && (x.energy < c.energy || x.power.length < c.power.length)),
    );
  }
  /** Novo (SFD): o jogador escolhe entre variantes de custo (só as que dá para pagar, se houver alguma). */
  *chooseCostVariant(p: P, prompt: string, vars: Cost[], payable: (c: Cost) => boolean): Gen<Cost> {
    const ok = vars.filter(payable);
    const list = ok.length ? ok : vars;
    if (list.length === 1) return list[0];
    const [k] = yield* this.ask(p, 'choose', prompt, list.map((c, i) => ({ id: String(i), label: this.costText(c) })));
    return list[Number(k)];
  }
  /** Novo: custo de jogar por efeito com custo base `base` ("ignorando o custo" = 0, "por X"...) e desconto extra (Reinforce). */
  effectCost(p: P, o: Obj, base: Cost, discount = 0): Cost {
    return this.totalCost({ base, add: NO_COST, plain: discount ? [-discount] : [], post: [] }, p, o);
  }
  /** Novo: custo mais barato ainda possível a partir de `b`, com os custos opcionais (a partir de `from`) que reduzem. */
  cheapestCost(p: P, o: Obj, b: CostBuild, from = 0): Cost {
    const t: CostBuild = { ...b, plain: [...b.plain], post: [...b.post] };
    for (const oc of this.usableOptionalCosts(p, o).slice(from)) {
      if (oc.energyMod && oc.energyMod < 0) t.plain.push(oc.energyMod);
      if (oc.maxPowerCut) {
        const n = oc.maxPowerCut(this, o, p);
        t.post.push((x) => this.cutPower(x, n));
      }
      if (oc.best) {
        const f = oc.best;
        t.post.push((x) => f(this, o, p, x));
      }
    }
    return this.totalCost(t, p, o);
  }
  /** Novo: custos opcionais que o jogador pode pagar agora. */
  usableOptionalCosts(p: P, o: Obj): OptionalCost[] {
    const all = [...(this.script(o).optionalCosts || [])];
    // novo (Vendetta): custos adicionais opcionais oferecidos por outra carta (Starry-Eyed Songstress)
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) all.push(...(a.grantOptionalCosts?.(this, src, o, p) || []));
    return all.filter((oc) => !oc.canPay || oc.canPay(this, o, p));
  }
  /** Efeitos "a próxima carta que você jogar neste turno" que valem para esta carta. */
  nextPlayMatches(e: TempEffect, o: Obj, p: P): boolean {
    if (!e.nextPlay || e.player !== p) return false;
    return e.nextPlay === 'card' || (e.nextPlay === 'spell' ? this.kind(o) === 'spell' : this.isUnit(o));
  }
  /** Consome os efeitos "a próxima carta..." ao jogar a carta. */
  takeNextPlay(p: P, o: Obj): TempEffect[] {
    const hit = this.effects.filter((e) => this.nextPlayMatches(e, o, p));
    if (hit.length) this.effects = this.effects.filter((e) => !hit.includes(e));
    return hit;
  }
  /** Jogador impedido de jogar esta carta (Brynhir Thundersong, Noxus Saboteur...). */
  playBlocked(p: P, o: Obj, via: string): boolean {
    if (this.effects.some((e) => e.flag === 'cantPlay' && e.player === p)) return true;
    // novo (UNL legends): "Its controller can't play spells this turn" (Lilting Lullaby)
    if (this.kind(o) === 'spell' && this.effects.some((e) => e.flag === 'cantPlaySpells' && e.player === p)) return true;
    return this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.blockPlay?.(this, src, o, p, via)));
  }

  // ───────────────────────────── decisões ─────────────────────────────
  *ask(
    player: P,
    kind: DecisionKind,
    prompt: string,
    options: Option[],
    min = 1,
    max = 1,
    root = false,
    purpose?: 'target' | 'location',
  ): Gen<string[]> {
    if (!options.length) return [];
    if (!root && min === max && options.length === min) return options.map((o) => o.id);
    const d: Decision = { player, kind, prompt, options, min, max, root };
    if (purpose) d.purpose = purpose;
    const a: Answer = yield d;
    return a;
  }
  *yesNo(p: P, prompt: string): Gen<boolean> {
    const a = yield* this.ask(p, 'confirm', prompt, [
      { id: 'yes', label: 'Sim' },
      { id: 'no', label: 'Não' },
    ]);
    return a[0] === 'yes';
  }
  *chooseObj(p: P, prompt: string, objs: Obj[], min = 1, max = 1): Gen<Obj[]> {
    const ids = yield* this.ask(
      p,
      'choose',
      prompt,
      objs.map((o) => ({ id: o.id, label: this.describe(o), obj: o.id })),
      Math.min(min, objs.length),
      Math.min(max, objs.length),
    );
    return ids.map((id) => this.objs[id]);
  }
  describe(o: Obj): string {
    if (o.data?.chainItem) return `Habilidade: ${o.data.label}`; // novo (SFD calm): habilidade na pilha como alvo
    const where = o.zone === 'board' ? ` (${this.locName(this.locOf(o))})` : '';
    const mine = o.zone === 'board' && this.isUnit(o) ? ` [${this.might(o)}]` : '';
    return `${this.name(o)}${mine}${where}`;
  }

  // ───────────────────────────── alvos ─────────────────────────────
  targetCandidates(c: Ctx, spec: TargetSpec): Obj[] {
    const kind = spec.kind || 'unit';
    let cands: Obj[] = [];
    if (kind === 'unit') cands = this.units();
    else if (kind === 'gear') cands = this.board().filter((o) => this.isGear(o));
    else if (kind === 'permanent') cands = this.board().filter((o) => this.isUnit(o) || this.isGear(o));
    else if (kind === 'rune') cands = this.board().filter((o) => this.kind(o) === 'rune');
    // novo: qualquer objeto do tabuleiro (unidade, gear, runa) ou lenda ("algo exaurido", Miss Fortune, Captain)
    else if (kind === 'object')
      cands = [...this.board(), ...([0, 1] as P[]).flatMap((pp) => this.legendsOf(pp))];
    else if (kind === 'trash') cands = [...this.pl[0].trash, ...this.pl[1].trash].map((id) => this.objs[id]);
    else if (kind === 'facedown') cands = this.bfs.flatMap((b) => b.facedown.map((id) => this.objs[id]));
    else if (kind === 'spell')
      cands = this.chain.filter((it) => it.cardId && it !== c.item).map((it) => this.objs[it.cardId!]);
    // novo (SFD calm): spell ou habilidade na pilha (regra 355.9.a.2); habilidades são representadas por um objeto
    else if (kind === 'chainItem') cands = this.chain.filter((it) => it !== c.item).map((it) => (it.cardId ? this.objs[it.cardId] : this.abilityProxy(it)));
    else if (kind === 'battlefield')
      cands = this.bfs.map((b, i) => this.objs[b.objId]).filter((o, i) => !spec.bfFilter || spec.bfFilter(c, i));
    if (spec.cands) cands = spec.cands(c); // novo: candidatos fora das zonas padrão (Teemo, Swift Scout)
    if (spec.filter) cands = cands.filter((o) => spec.filter!(c, o));
    // jogada a partir de Hidden (811.1.d.2): cada alvo tem de estar naquele campo, salvo se o próprio texto o exclui
    if (c.hiddenBf !== undefined && !spec.ignoreHidden) {
      if (kind === 'unit' || kind === 'gear' || kind === 'permanent') cands = cands.filter((o) => this.bfIndex(o) === c.hiddenBf);
      else if (kind === 'battlefield') cands = cands.filter((o) => this.bfOf(o) === c.hiddenBf); // novo
      else if (kind === 'facedown') cands = cands.filter((o) => o.loc?.t === 'bf' && o.loc.i === c.hiddenBf); // novo
    }
    // "não pode ser escolhida por spells e habilidades inimigas"
    cands = cands.filter((o) => !(o.controller !== c.p && this.hasFlag(o, 'untargetable')));
    // novo: o mesmo, vindo de habilidade estática (Ruin Runner)
    cands = cands.filter(
      (o) => o.controller === c.p || !this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.cantBeChosen?.(this, src, o, c.p))),
    );
    return cands;
  }
  /**
   * Novo (VEN-086 Gangplank, Naval): "If a spell or ability that chooses me would stun me, give me -[Might], or return me to
   * hand, ... instead" — o spell/habilidade que está resolvendo escolheu `u` (alvo dele, inclusive do Repeat)? Então a
   * substituição da carta (CardScript.replaceChosen) pode trocar o efeito. true = substituído (quem chamou não faz nada).
   */
  chosenReplace(u: Obj, what: 'stun' | 'mightReduce' | 'returnToHand'): boolean {
    const it = this.resolvingItem;
    const f = this.script(u).replaceChosen;
    if (!it || !f) return false;
    const ids = [...it.targetIds.flat(), ...(it.repeatIds || []).flat(), ...(it.moreRepeats || []).flatMap((r) => r.ids.flat())];
    if (!ids.includes(u.id)) return false;
    return f(this, u, what, it);
  }
  /** Novo: `o` não pode ser escolhida por spells e habilidades de p (efeito "untargetable" ou aura cantBeChosen; 757-758). */
  untargetableBy(o: Obj, p: P): boolean {
    return this.hasFlag(o, 'untargetable') || this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.cantBeChosen?.(this, src, o, p)));
  }
  /** Novo (SFD calm): objeto que representa uma habilidade da pilha como alvo (zona 'chain'; não é carta). */
  abilityProxy(it: ChainItem): Obj {
    let o = it.proxyId ? this.objs[it.proxyId] : undefined;
    if (!o) {
      o = this.newObj('TOK-ABILITY', it.controller, 'chain', true);
      o.data = { chainItem: it.id, label: it.label };
      it.proxyId = o.id;
    }
    o.controller = it.controller;
    return o;
  }
  /** Novo (SFD calm): item da pilha de um spell (carta) ou de uma habilidade (objeto de abilityProxy). */
  chainItemOf(o: Obj): ChainItem | undefined {
    return this.chain.find((it) => it.cardId === o.id || (it.proxyId !== undefined && it.proxyId === o.id));
  }
  specsOf(a: AbilityDef, c: Ctx): TargetSpec[] {
    if (!a.targets) return [];
    return typeof a.targets === 'function' ? a.targets(c) : a.targets;
  }
  hasLegalTargets(a: AbilityDef, c: Ctx): boolean {
    const specs = this.specsOf(a, c);
    // novo: filtros que dependem dos alvos anteriores ("outra unidade aliada") — testa escolhas possíveis em sequência
    const saved = c.targets;
    const ok = (k: number, chosen: Obj[][]): boolean => {
      if (k === specs.length) return true;
      c.targets = chosen;
      const cands = this.targetCandidates(c, specs[k]);
      const min = specs[k].min ?? 1;
      if (cands.length < min) return false;
      if (min === 0) return ok(k + 1, [...chosen, []]);
      if (k === specs.length - 1) return true;
      for (let i = 0; i + min <= cands.length && i < 6; i++) if (ok(k + 1, [...chosen, cands.slice(i, i + min)])) return true;
      return false;
    };
    const r = ok(0, []);
    c.targets = saved;
    return r;
  }
  *chooseTargets(a: AbilityDef, c: Ctx, baseCost: Cost = NO_COST, forSpell = false, costOf?: (ids: string[][]) => Cost): Gen<string[][]> {
    const out: string[][] = [];
    const specs0 = this.specsOf(a, c);
    for (let si = 0; si < specs0.length; si++) {
      // novo: os alvos já escolhidos ficam visíveis aos filtros seguintes ("outra unidade aliada", Convergent Mutation)
      c.targets = out.map((grp) => grp.map((id) => this.objs[id]));
      // novo (UNL legends): especificações em função são recalculadas com os alvos já escolhidos (Alpha Strike: alvos do
      // dano dividido até o Might da unidade escolhida antes, 355.14.c)
      const s = si > 0 && typeof a.targets === 'function' ? (this.specsOf(a, c)[si] ?? specs0[si]) : specs0[si];
      let cands = this.targetCandidates(c, s);
      // regra 355.16: não escolher um alvo cujo Deflect não dá para pagar, se houver outra opção
      const affordable = cands.filter((o) => {
        // novo (SFD): costOf = custo total com o Deflect destes alvos (descontos ao total valem para ele)
        if (costOf) return this.canPay(c.p, costOf([[...out.flat(), o.id]]), forSpell);
        const extra = this.deflectCost([[...out.flat(), o.id]], c.p);
        return this.canPay(c.p, this.addCost(baseCost, extra), forSpell);
      });
      if (affordable.length >= (s.min ?? 1)) cands = affordable;
      const min = s.min ?? 1;
      const max = s.max ?? 1;
      if (cands.length < min) throw new IllegalAction(`Sem alvo válido para: ${s.prompt}`);
      const ids = yield* this.ask(
        c.p,
        'choose',
        s.prompt,
        cands.map((o) => ({ id: o.id, label: this.describe(o), obj: o.id })),
        Math.min(min, cands.length),
        Math.min(max, cands.length),
        false,
        'target',
      );
      out.push(ids);
      for (const id of ids) this.emit({ type: 'chosen', obj: this.objs[id], by: c.p, source: c.self });
    }
    this.noteChoice(c, out);
    return out;
  }
  /** Novo (SFD): registra que c.p escolheu alvos com esta spell/habilidade (uma vez por instância; o Repeat é outra). */
  noteChoice(c: Ctx, ids: string[][]) {
    const objs = ids.flat().map((id) => this.objs[id]).filter(Boolean);
    if (!objs.length) return;
    // novo: cada unidade/gear inimigo escolhido conta como uma escolha (um spell que escolhe dois inimigos conta duas,
    // o mesmo alvo escolhido duas vezes também; RiftJudge #6758)
    const enemies = objs.filter((o) => o.zone === 'board' && (this.isUnit(o) || this.isGear(o)) && o.controller !== c.p).length;
    const s = this.pl[c.p];
    const enemyUnits = objs.filter((o) => o.zone === 'board' && this.isUnit(o) && o.controller !== c.p).length; // novo (VEN): só unidades (Hungry Wolf)
    s.chooseLog = [...(s.chooseLog || []).filter((x) => x.turn === this.turn), { turn: this.turn, src: this.kind(c.self), enemy: enemies > 0, enemies, enemyUnits }];
  }
  /** Novo (Vendetta): Heisho, Shell of the World — "players ignore Deflect while choosing something here". */
  ignoresDeflect(o: Obj): boolean {
    const i = this.bfIndex(o);
    return i >= 0 && this.bfs[i].objId !== undefined && this.objs[this.bfs[i].objId]?.code === 'VEN-158';
  }
  deflectCost(ids: string[][], p: P): Cost {
    if (this.ignoreDeflectNow) return { energy: 0, power: [] };
    // revisão VEN: escolher algo no Heisho ignora TODO o Deflect desse spell/habilidade, também de alvos em outro lugar
    // (FAQ oficial do Vendetta; RiftJudge #11769)
    if (ids.some((grp) => grp.some((id) => this.objs[id]?.zone === 'board' && this.ignoresDeflect(this.objs[id])))) return { energy: 0, power: [] };
    let n = 0;
    for (const grp of ids)
      for (const id of grp) {
        const o = this.objs[id];
        if (o && o.zone === 'board' && o.controller !== p) n += this.activeKw(o).deflect || 0;
      }
    return { energy: 0, power: Array.from({ length: n }, () => [...DOMAINS]) };
  }
  legalTargets(item: ChainItem, ids: string[][], vers: number[][], c: Ctx): Obj[][] {
    const specs = this.specsOf(item.ability, c);
    return ids.map((grp, si) =>
      grp
        .map((id, k) => ({ o: this.objs[id], v: vers[si][k] }))
        .filter(({ o, v }) => {
          if (!o || o.zoneVersion !== v) return false;
          // novo: alvo que passou a não poder ser escolhido por este controlador (Ruin Runner) erra o alvo (758.1)
          if (o.controller !== c.p && this.untargetableBy(o, c.p)) return false;
          const s = specs[si];
          if (!s) return true;
          if (s.filter && !s.filter(c, o)) return false;
          // novo (revisão SFD chaos): jogada a partir de Hidden, o alvo tem de continuar naquele campo na resolução
          // (811.1.d.2; exemplo do Hidden Blade na regra 359.3.e.5) — a mesma restrição de targetCandidates
          if (c.hiddenBf !== undefined && !s.ignoreHidden && ['unit', 'gear', 'permanent'].includes(s.kind || 'unit') && this.bfIndex(o) !== c.hiddenBf) return false;
          return true;
        })
        .map(({ o }) => o),
    );
  }

  // ───────────────────────────── gatilhos ─────────────────────────────
  emit(ev: GameEvent) {
    // novo (revisão RAD): gear que era unidade por efeito e morreu é visto como unidade pelos gatilhos dessa morte
    // ("quando uma unidade morre"): 323.4 e 428.1.a.1.b anotam os atributos do momento da morte
    if (ev.type === 'die' && ev.wasUnit && ev.obj && this.lookbackUnit !== ev.obj.id && !this.isUnit(ev.obj)) {
      const prev = this.lookbackUnit;
      this.lookbackUnit = ev.obj.id;
      try {
        return this.emit(ev);
      } finally {
        this.lookbackUnit = prev;
      }
    }
    // novo (RAD): "jogou uma unidade ou gear para um campo de batalha neste turno" (Hold 'Em): vale mesmo que a carta já tenha saído
    if (ev.type === 'play' && !ev.spell && ev.player !== undefined && ev.loc?.t === 'bf' && ev.obj && (this.isUnit(ev.obj) || this.isGear(ev.obj))) {
      const s = this.pl[ev.player as P];
      s.bfPlays = { turn: this.turn, n: (s.bfPlays?.turn === this.turn ? s.bfPlays.n : 0) + 1 };
    }
    // novo (Vendetta): habilidades ativadas usadas neste turno, por tipo de fonte (Piltovan Forge: "a primeira habilidade
    // ativada de gear aliado de cada turno")
    if (ev.type === 'activate' && ev.player !== undefined && ev.obj) {
      const s = this.pl[ev.player as P];
      const u = this.abilityUses(ev.obj);
      s.acts = { turn: this.turn, uses: [...(s.acts?.turn === this.turn ? s.acts.uses : []), ...(Array.isArray(u) ? u : [u])] };
    }
    // novo (UNL mind): n-ésima carta que o jogador compra neste turno (ev.nth), em qualquer turno (Frigid Jewel)
    if (ev.type === 'draw' && ev.player !== undefined && ev.nth === undefined) {
      const s = this.pl[ev.player as P];
      s.drawn = { turn: this.turn, n: (s.drawn?.turn === this.turn ? s.drawn.n : 0) + 1 };
      ev.nth = s.drawn.n;
    }
    const srcs = new Set<Obj>(this.auraSources());
    for (const k of ['obj', 'unit'] as const) if (ev[k]) srcs.add(ev[k]);
    // cartas no descarte com gatilhos de descarte (Immortal Phoenix)
    for (const pp of [0, 1] as P[])
      for (const id of this.pl[pp].trash) if (this.script(this.objs[id]).triggers?.some((t) => t.zone === 'trash')) srcs.add(this.objs[id]);
    // novo (SFD): evento restrito a algumas fontes (ev.only: ids), ex.: alias hold/conquista do Skyfall of Areion
    if (ev.only) for (const o of [...srcs]) if (!ev.only.includes(o.id)) srcs.delete(o);
    // novo (UNL): "seus efeitos de conquista/hold aqui disparam uma vez a mais" (Aura.triggerExtra)
    const xtra = this.triggerExtraSources();
    const more = (src: Obj, ctrl: P) => (xtra.length ? this.triggerExtraFor(xtra, ev, src, ctrl) : 0);
    for (const src of srcs) {
      const s = this.triggerScript(src, ev);
      const list: TriggerDef[] = [...(s.triggers || [])];
      for (const t of list) {
        const types = Array.isArray(t.on) ? t.on : [t.on];
        if (!types.includes(ev.type)) continue;
        if (ev.aliasOf && types.includes(ev.aliasOf)) continue; // novo (SFD): já disparou pelo evento original ("quando eu conquisto ou seguro")
        if (ev.type === 'mightReach' && (t.threshold ?? 5) !== ev.threshold) continue; // novo: limiar do gatilho
        const zone = t.zone || 'board';
        if (zone === 'board' && !['board', 'legend', 'battlefieldZone'].includes(src.zone)) continue;
        if (zone === 'trash' && src.zone !== 'trash') continue;
        if (zone === 'self' && ev.obj?.id !== src.id && ev.unit?.id !== src.id) continue;
        const ctrl = (t as any).controller ? (t as any).controller(this, src, ev) : this.controllerOf(src, ev);
        if (ctrl === null) continue;
        const c = this.ctx(src, ctrl, { ev });
        if (t.cond && !t.cond(c, ev)) continue;
        this.pending.push({ controller: ctrl, sourceId: src.id, ability: t, ev, label: t.label, hiddenBf: this.playEffectBf(src, ev) });
        for (let k = more(src, ctrl); k > 0; k--) this.pending.push({ controller: ctrl, sourceId: src.id, ability: t, ev, label: t.label, hiddenBf: this.playEffectBf(src, ev) }); // novo (UNL)
        // novo: Deathknell que dispara vezes adicionais (Karthus, Eternal)
        if (ev.type === 'die' && zone === 'self' && (/\[deathknell\]/i.test(cardData(ev.snap?.code ?? src.code).text) || (t as any).__dk)) { // ev.snap.code (UNL): cópia olhando para trás
          let extra = 0;
          if (ev.dkExtra !== undefined) extra = ev.dkExtra; // novo: contado antes de sair do tabuleiro (killG)
          else
            for (const s2 of this.auraSources())
              for (const a of this.script(s2).auras || []) if (a.deathknellExtra) extra += a.deathknellExtra(this, s2, ctrl);
          for (let k = 0; k < extra; k++) this.pending.push({ controller: ctrl, sourceId: src.id, ability: t, ev, label: t.label });
        }
      }
      // gatilhos de jogada ("quando você me joga") + Vision + Weaponmaster
      if (ev.type === 'play' && ev.obj?.id === src.id && src.zone === 'board') {
        const hb = this.playEffectBf(src, ev);
        for (const a of s.onPlay || [])
          this.pending.push({ controller: src.controller, sourceId: src.id, ability: a, ev, label: a.label, hiddenBf: hb });
        const k = this.kw(src);
        if (k.vision)
          for (let i = 0; i < (k.vision || 0); i++)
            this.pending.push({ controller: src.controller, sourceId: src.id, ability: VISION, ev, label: 'Vision' });
        if (k.weaponmaster && this.isUnit(src))
          this.pending.push({ controller: src.controller, sourceId: src.id, ability: WEAPONMASTER, ev, label: 'Weaponmaster', hiddenBf: hb });
        if (k.quickDraw && this.isGear(src))
          this.pending.push({ controller: src.controller, sourceId: src.id, ability: QUICKDRAW, ev, label: 'Quick-Draw', hiddenBf: hb });
      }
      // Disarm (gatilho de ataque)
      if (ev.type === 'attack' && ev.unit?.id === src.id && (this.kw(src).disarm || 0) > 0)
        this.pending.push({ controller: src.controller, sourceId: src.id, ability: DISARM, ev, label: 'Disarm' });
      // novo (UNL): Hunt é gatilho (823.1) de conquista e de hold (823.1.b): "quando eu conquisto ou seguro, meu
      // controlador ganha X XP". No evento-espelho do Skyfall of Areion (aliasOf) já disparou pelo evento original.
      if ((ev.type === 'conquer' || ev.type === 'hold') && !ev.aliasOf && src.zone === 'board' && ev.units?.includes(src.id) && this.isUnit(src))
        if (this.huntTrigger(src, ev)) for (let k = more(src, src.controller); k > 0; k--) this.huntTrigger(src, ev);
    }
    for (const d of [...this.delayed]) {
      if (ev.only) break; // novo (SFD): evento restrito não dispara efeitos atrasados
      if (d.on !== ev.type) continue;
      if (ev.type === 'mightReach' && (d.threshold ?? 5) !== ev.threshold) continue; // novo
      const src = this.objs[d.sourceId];
      const c = this.ctx(src, d.controller, { ev });
      if (d.cond && !d.cond(c, ev)) continue;
      this.pending.push({ controller: d.controller, sourceId: d.sourceId, ability: d.ability, ev, label: d.ability.label });
      for (let k = more(src, d.controller); k > 0; k--) this.pending.push({ controller: d.controller, sourceId: d.sourceId, ability: d.ability, ev, label: d.ability.label }); // novo (UNL)
      if (d.once) this.delayed = this.delayed.filter((x) => x !== d);
    }
  }
  /** Novo (UNL): fontes com Aura.triggerExtra no tabuleiro (Red Brambleback, Blue Sentinel). */
  private triggerExtraSources(): { src: Obj; f: NonNullable<Aura['triggerExtra']> }[] {
    const out: { src: Obj; f: NonNullable<Aura['triggerExtra']> }[] = [];
    for (const s of this.auraSources()) for (const a of this.script(s).auras || []) if (a.triggerExtra) out.push({ src: s, f: a.triggerExtra });
    return out;
  }
  /** Novo (UNL): quantas vezes a mais uma habilidade de `from` (controlada por ctrl) dispara neste evento. */
  private triggerExtraFor(list: ReturnType<Engine['triggerExtraSources']>, ev: GameEvent, from: Obj, ctrl: P): number {
    let n = 0;
    for (const x of list) n += Math.max(0, x.f(this, x.src, ev, from, ctrl) || 0);
    return n;
  }
  /**
   * Novo (UNL): põe na fila o gatilho de Hunt de `u` (823.1.c.1: "quando eu conquisto ou seguro, meu controlador ganha X
   * XP"; as instâncias somam, 823.2). Na resolução vale o Hunt e o controlador atuais da unidade (referentes) ou, se ela
   * saiu do tabuleiro, os do momento em que disparou. Também usado por "ative os efeitos de conquista" (Reckoner's Arena).
   * Devolve false se a unidade não tem Hunt.
   */
  huntTrigger(u: Obj, ev: GameEvent): boolean {
    const x = this.kw(u).hunt || 0;
    if (x <= 0) return false;
    const id = u.id;
    const ver = u.zoneVersion;
    const ctrl = u.controller;
    const ability: AbilityDef = {
      label: `Hunt ${x}: ganhar ${x} XP`,
      resolve: function* (c) {
        const o = c.g.objs[id];
        const same = !!o && o.zone === 'board' && o.zoneVersion === ver;
        c.g.gainXp(same ? o.controller : ctrl, same ? c.g.kw(o).hunt || 0 : x, o);
      },
    };
    this.pending.push({ controller: ctrl, sourceId: id, ability, ev, label: ability.label });
    return true;
  }
  /**
   * Novo: script usado para os gatilhos de `src` neste evento. Morte/saída olham para trás: a unidade tinha o texto de
   * efeito dos equipamentos anexados (ev.attached). Ao anexar/desanexar, os gatilhos de "ao anexar/desanexar" da própria
   * carta anexada existem durante o processo (725.1, 725.2).
   */
  triggerScript(src: Obj, ev: GameEvent): CardScript {
    // novo (UNL): uma cópia (não ficha) que saiu do tabuleiro volta ao impresso; os gatilhos de morte/saída olham para
    // trás e usam o texto que ela tinha (o copiado)
    const was = (ev.type === 'die' || ev.type === 'leave') && ev.obj?.id === src.id ? ((ev.snap?.code as string | undefined) ?? (ev.code as string | undefined)) : undefined;
    if (was && was !== src.code) {
      const s = getScript(was) || { code: was };
      return ev.attached?.length ? this.withEffectText({ ...src, code: was }, s, ev.attached) : s;
    }
    if ((ev.type === 'die' || ev.type === 'leave') && ev.obj?.id === src.id && ev.attached?.length)
      return this.withEffectText(src, this.baseScript(src), ev.attached);
    if ((ev.type === 'attach' || ev.type === 'detach') && ev.obj?.id === src.id && src.attachedTo) {
      const b = this.baseScript(src);
      return { ...this.script(src), triggers: (b.triggers || []).filter((t) => (Array.isArray(t.on) ? t.on : [t.on]).some((x) => x === 'attach' || x === 'detach')) };
    }
    return this.script(src);
  }
  /** Novo: efeito de jogada ("quando você me joga") de uma permanente jogada a partir de Hidden: campo onde estava (811.1.d.2). */
  playEffectBf(src: Obj, ev: GameEvent): number | undefined {
    if (ev.type !== 'play' || ev.obj?.id !== src.id || ev.via !== 'hidden') return undefined;
    return ev.loc?.t === 'bf' ? ev.loc.i : undefined;
  }
  controllerOf(src: Obj, ev: GameEvent): P | null {
    const k = this.kind(src);
    if (k === 'battlefield') {
      const i = this.bfs.findIndex((b) => b.objId === src.id);
      const b = this.bfs[i];
      if (b.controller !== null) return b.controller;
      if (ev.player !== undefined) return ev.player;
      return this.active;
    }
    if (src.zone === 'trash' || src.zone === 'hand') return src.owner;
    if ((ev.type === 'die' || ev.type === 'leave') && ev.obj?.id === src.id) return ev.controller;
    return src.controller;
  }
  /**
   * Novo (interface): opções da pergunta de ordem dos gatilhos. Rótulo "Carta: efeito" (com o que disparou ou o número
   * quando há dois iguais), `obj` = a fonte e `detail` = o texto da carta, para a interface listar.
   */
  pendingOptions(list: Pending[]): Option[] {
    const base = list.map((m) => `${this.name(m.sourceId)}: ${m.label}`);
    const seen = new Map<string, number>();
    return list.map((m, i) => {
      let label = base[i];
      if (base.filter((b) => b === label).length > 1) {
        const k = (seen.get(label) ?? 0) + 1;
        seen.set(label, k);
        const by = m.ev?.unit ?? m.ev?.obj;
        label += by && by.id !== m.sourceId ? ` (por ${this.describe(by)}; ${k}º)` : ` (${k}º)`;
      }
      const src = this.objs[m.sourceId];
      const text = src ? this.data(src).text : '';
      return { id: String(i), label, obj: m.sourceId, ...(text ? { detail: text } : {}) };
    });
  }
  *placePending(): Gen {
    // 383.3.d.1: a partir do jogador do turno. Caça (gatilhos): ao abrir um combate, os gatilhos vindos de estabelecer
    // atacante e defensor vão primeiro os do atacante, depois os do defensor (464.2.e.1), mesmo fora do turno do atacante
    const sd = this.showdown;
    const opening = !!(sd?.combat && sd.opening && sd.attacker !== undefined);
    const first: P = opening ? sd!.attacker! : this.active;
    if (sd) sd.opening = false;
    // novo (revisão 2 UNL mind): num combate que abre com um showdown novo, os gatilhos de início de showdown/combate
    // (464.2.b; Diana, Lunari) entram na pilha antes dos das designações (464.2.e): vão primeiro, a partir do jogador do
    // turno (383.3.d.1), e resolvem por último (334.1, 340.1; riftboundfaq.com/cards/diana-lunari #trigger-resolution-order)
    const early = (x: Pending) => x.ev?.type === 'showdownStart' || x.ev?.type === 'combatStart';
    const all = () => true;
    const passes: [P, (x: Pending) => boolean][] =
      opening && this.pending.some(early) && !this.pending.every(early)
        ? [[this.active, early], [opp(this.active), early], [first, (x) => !early(x)], [opp(first), (x) => !early(x)]]
        : [[first, all], [opp(first), all]];
    for (const [p, inPass] of passes) {
      let mine = this.pending.filter((x) => x.controller === p && inPass(x));
      this.pending = this.pending.filter((x) => !(x.controller === p && inPass(x)));
      while (mine.length) {
        let pick = mine[0];
        // novo (microdetalhes UNL): o jogador só escolhe a ordem de gatilhos disparados ao mesmo tempo (383.3.d); itens
        // pendentes adicionados em momentos diferentes são finalizados na ordem em que entraram na pilha (337.1, 337.1.b;
        // FAQ #9917 do LeBlanc, Deceiver: "resolvem na ordem inversa de adição"). O motor separa esses momentos nos
        // gatilhos reflexivos (Pending.reflexive): o grupo da vez vai até o primeiro reflexivo, e um reflexivo é sozinho.
        // Entre jogadores segue 383.3.d.1 (o do turno primeiro), como antes.
        const cut = mine[0].reflexive ? 1 : mine.findIndex((m) => m.reflexive);
        const group = cut < 0 ? mine : mine.slice(0, cut);
        if (group.length > 1 && new Set(group.map((m) => m.label + m.sourceId)).size > 1) {
          const ids = yield* this.ask(
            p,
            'choose',
            'Vários efeitos seus foram ativados ao mesmo tempo. Qual vai para a pilha primeiro? (resolve por último)',
            this.pendingOptions(group),
          );
          pick = group[Number(ids[0])];
        }
        mine = mine.filter((m) => m !== pick);
        this.finalizingTriggers++; // novo: estado fechado (pagamento só com [Add] de Reaction)
        try {
          yield* this.finalizeAbility(pick.controller, this.objs[pick.sourceId], pick.ability, 'trigger', pick.ev, undefined, pick.hiddenBf);
        } finally {
          this.finalizingTriggers--;
        }
      }
    }
  }
  /** Finaliza uma habilidade (gatilho ou ativada) na pilha: "você pode", alvos, custos. */
  *finalizeAbility(
    p: P,
    src: Obj,
    a: AbilityDef,
    kind: 'trigger' | 'ability',
    ev?: GameEvent,
    pre?: (c: Ctx) => Gen<boolean>,
    hiddenBf?: number, // novo: efeito de jogada de permanente jogada a partir de Hidden (811.1.d.2)
  ): Gen<boolean> {
    const c = this.ctx(src, p, { ev, hiddenBf });
    // novo (UNL): gatilho cujo custo não de recursos (ex.: gastar XP, 383.3.b) não pode ser pago não vai para a pilha
    // (nem pergunta o "você pode")
    if (kind === 'trigger' && a.extraCost && a.canPayExtra && !a.canPayExtra(c)) {
      this.say(`${this.name(src)}: ${a.label} — custo não pode ser pago.`);
      return false;
    }
    if (kind === 'trigger') {
      // novo (microdetalhes UNL): sem alvo possível ou com custo de recursos que não dá para pagar, o gatilho não pode ser
      // finalizado (402.4, 383.3.b.1) — sai da pilha sem perguntar o "você pode" nem os alvos (antes perguntava e dava no
      // mesmo). Com `prepare` (modos), os alvos/custo dependem da escolha e são conferidos depois dela.
      if (!a.prepare && !this.hasLegalTargets(a, c)) {
        this.say(`${this.name(src)}: ${a.label} — sem alvo válido.`);
        return false;
      }
      const pc = !a.prepare || typeof a.cost !== 'function' ? (typeof a.cost === 'function' ? a.cost(c) : a.cost || NO_COST) : NO_COST;
      if ((pc.energy || pc.power.length) && !this.canPay(p, pc)) {
        this.say(`${this.name(src)}: ${a.label} — custo não pode ser pago.`);
        return false;
      }
      // novo: "você pode" cujo efeito não faria nada agora (TriggerDef.possible) não pergunta — o mesmo que recusar
      // (383.3.a.1-2: recusado, sai da pilha e conta como não disparado)
      if (a.optional && (a as TriggerDef).possible && !(a as TriggerDef).possible!(c)) {
        this.say(`${this.name(src)}: ${a.label} — nada a fazer.`);
        return false;
      }
    }
    if (a.optional) {
      const yes = yield* this.yesNo(p, `${this.name(src)}: ${a.optional}`);
      if (!yes) return false;
    }
    if (a.prepare && !(yield* a.prepare(c))) {
      if (kind === 'trigger') return false;
      throw new IllegalAction('Escolha inválida.');
    }
    if (!this.hasLegalTargets(a, c)) {
      if (kind === 'trigger') {
        this.say(`${this.name(src)}: ${a.label} — sem alvo válido.`);
        return false;
      }
      throw new IllegalAction('Sem alvo válido.');
    }
    let cost = typeof a.cost === 'function' ? a.cost(c) : a.cost || NO_COST;
    // novo (Vendetta): modificadores de custo de habilidade ativada (Aura.abilityCostMod): estimativa para os alvos
    const abilityOpts = (x: Cost) => (kind === 'ability' ? this.abilityCostOptions(p, src, a as ActivatedDef, x) : [x]);
    const cheapest = (x: Cost) => abilityOpts(x).find((y) => this.canPay(p, y)) ?? abilityOpts(x)[0];
    // caça (gatilhos): gatilho que não chega a ser finalizado é removido e considerado não disparado (383.3.a.2,
    // 383.3.b.1): as escolhas de alvo dele não aconteceram ("quando você escolhe" só vale para o finalizado, 383.4.b.2)
    const mark = this.pending.length;
    const logBefore = this.pl[p].chooseLog;
    const notChosen = () => {
      this.pending = this.pending.filter((x, i) => i < mark || x.ev.type !== 'chosen' || x.ev.source !== src);
      this.pl[p].chooseLog = logBefore;
      return false;
    };
    const ids = yield* this.chooseTargets(a, c, cheapest(cost));
    // novo: escolhas depois dos alvos, ao finalizar (destinos de movimento, regra 355.4)
    if (a.choose && !(yield* a.choose(c, ids))) {
      if (kind === 'trigger') return notChosen();
      throw new IllegalAction('Escolha inválida.');
    }
    const defl = this.deflectCost(ids, p);
    // novo: num gatilho, o jogador pode recusar o custo de Deflect; aí o gatilho não vai para a pilha
    // (regras 383.3.b.1 e 204.4.c; riftjudge FAQ #7212, Twisted Fate)
    if (kind === 'trigger' && defl.power.length && this.canPay(p, this.addCost(cost, defl))) {
      if (!(yield* this.yesNo(p, `${this.name(src)}: pagar Deflect (${defl.power.length} power) para ${a.label}? Se não pagar, a habilidade não vai para a pilha.`))) {
        this.say(`${this.name(src)}: ${a.label} — Deflect não pago.`);
        return notChosen();
      }
    }
    cost = this.addCost(cost, defl);
    // novo (Vendetta): descontos/aumentos do custo da habilidade (o jogador escolhe como aplicar "[1] ou [Rune]")
    if (kind === 'ability') cost = yield* this.chooseCostVariant(p, `${this.name(src)}: como aplicar os descontos do custo?`, abilityOpts(cost), (x) => this.canPay(p, x));
    if (cost.energy || cost.power.length) {
      if (!this.canPay(p, cost)) {
        if (kind === 'trigger') {
          this.say(`${this.name(src)}: ${a.label} — custo não pago.`);
          return notChosen();
        }
        throw new IllegalAction('Recursos insuficientes.');
      }
      yield* this.payG(p, cost);
    }
    this.payingFor = { src, p }; // novo: matar como custo é atribuído à habilidade/fonte (regra 428.1.a.1)
    const preOk = !pre || (yield* pre(c));
    this.payingFor = undefined;
    if (!preOk) {
      if (kind === 'trigger') return notChosen();
      throw new IllegalAction('Custo não pago.');
    }
    if (a.extraCost) {
      this.payingFor = { src, p };
      const ok = yield* a.extraCost(c);
      this.payingFor = undefined;
      if (!ok) {
        if (kind === 'trigger') return notChosen();
        throw new IllegalAction('Custo não pago.');
      }
    }
    // novo (UNL mind): gatilho que adiciona recursos resolve assim que é finalizado (429.2; Blue Sentinel)
    if (kind === 'trigger' && (a as TriggerDef).immediate) {
      yield* a.resolve(c);
      return true;
    }
    // habilidade que resolve na hora, sem pilha (Add); quem a usou mantém o Focus
    if (kind === 'ability' && (a as ActivatedDef).immediate) {
      yield* a.resolve(c);
      this.emit({ type: 'abilityUsed', obj: src, player: p, ability: a }); // novo (mind): usada ao resolver (377.2.a)
      if (this.showdown && !this.chain.length) this.showdown.flipAfterChain = false;
      return true;
    }
    const item: ChainItem = {
      id: 'c' + this.nextId++,
      kind,
      controller: p,
      sourceId: src.id,
      label: `${this.name(src)}: ${a.label}`,
      ability: a,
      ctx: c,
      targetIds: ids,
      targetVers: ids.map((g) => g.map((id) => this.objs[id].zoneVersion)),
      isAdd: (a as ActivatedDef).isAdd,
    };
    c.item = item;
    this.pushChain(item);
    return true;
  }
  pushChain(item: ChainItem) {
    if (!this.chain.length) this.chainOpenedByTrigger = item.kind === 'trigger';
    this.chain.push(item);
    this.say(`Na pilha: ${item.label}.`, item.controller);
  }

  // ───────────────────────────── resolução da pilha ─────────────────────────────
  *resolveTop(): Gen {
    const item = this.chain.pop()!;
    this.resolving++;
    const prevBy = this.resolvingBy;
    this.resolvingBy = item.controller;
    const prevItem = this.resolvingItem;
    this.resolvingItem = item;
    const c = item.ctx;
    c.item = item;
    c.targets = this.legalTargets(item, item.targetIds, item.targetVers, c);
    const wantsTargets = item.targetIds.some((g) => g.length);
    const allGone = wantsTargets && c.targets.every((g) => g.length === 0) && !item.ability.alwaysResolve;
    {
      // novo (interface): histórico da mesa com a carta e os alvos escolhidos (inclusive os das execuções de Repeat)
      const tg = [...item.targetIds.flat(), ...(item.repeatIds || []).flat(), ...(item.moreRepeats || []).flatMap((r) => r.ids.flat())];
      const srcId = item.cardId || item.sourceId;
      const src = this.objs[srcId];
      this.say(`Resolve: ${item.label}.`, item.controller, src ? { kind: 'resolve', obj: srcId, code: src.code, targets: [...new Set(tg)], fizzled: allGone } : undefined);
    }
    if (!allGone) yield* item.ability.resolve(c);
    else this.say(`${item.label}: os alvos não são mais válidos.`);
    if (item.repeatIds) {
      const c2: Ctx = { ...c, rep: 1, data: c.data };
      c2.targets = this.legalTargets(item, item.repeatIds, item.repeatVers!, c2);
      const gone2 = item.repeatIds.some((g) => g.length) && c2.targets.every((g) => g.length === 0);
      if (!gone2) yield* item.ability.resolve(c2);
    }
    // novo: outras instâncias de Repeat pagas (820.3)
    for (let r = 0; r < (item.moreRepeats || []).length; r++) {
      const x = item.moreRepeats![r];
      const c3: Ctx = { ...c, rep: r + 2, data: c.data };
      c3.targets = this.legalTargets(item, x.ids, x.vers, c3);
      const gone3 = x.ids.some((g) => g.length) && c3.targets.every((g) => g.length === 0);
      if (!gone3) yield* item.ability.resolve(c3);
    }
    // novo (mind): "quando você usa uma habilidade ativada" dispara quando ela resolve (377.2.a); 'activate' é emitido
    // ao ativar. As de [Add] (e Gold) resolvem na hora: para elas 'activate' (isAdd) já é a resolução.
    if (item.kind === 'ability') this.emit({ type: 'abilityUsed', obj: this.objs[item.sourceId], player: item.controller, ability: item.ability });
    this.resolvingItem = prevItem;
    this.resolving--;
    this.resolvingBy = prevBy;
    this.lastResolvedId = item.id; // novo: atribuição de morte na limpeza seguinte (regra 428.5.c)
    if (item.cardId) {
      const card = this.objs[item.cardId];
      // novo (UNL fury): jogado de novo enquanto resolvia (Dancing Grenade): continua na pilha como o item novo (RiftJudge #13006)
      if (card.zone === 'chain' && !this.chain.some((x) => x.cardId === card.id)) {
        if (item.flow) this.toZone(card, 'banish');
        else if (item.recycleAfter) this.recycleCard(card);
        else this.toZone(card, 'trash');
      }
      // Gatilhos de "quando você joga" disparam aqui, quando a jogada termina com a resolução (regra 419.4.a; Vendetta
      // patch notes 17/07/2026; RiftJudge #9946 e #12086). Spell anulado não é jogado (419.4.a.1): counter() não emite.
      // via: 'hidden'/'flow' quando o spell foi jogado escondido ou do descarte (Ember Monk)
      const via = item.flow ? 'flow' : item.ctx.hiddenBf !== undefined ? 'hidden' : undefined;
      // novo: ganhar o controle do spell não faz o novo controlador tê-lo jogado (FAQ riftjudge #8801: jogado uma vez só)
      const by = item.playedBy ?? item.controller;
      // novo (revisão UNL fury): o spell jogado de novo enquanto resolvia (Dancing Grenade) gravou a energia da jogada
      // nova; "se você gastou [4]" desta jogada vê a energia dela (Revna, Jhin, Virtuoso, Forgotten Library)
      if (item.spentE !== undefined) (card.data ||= {}).spentE = item.spentE;
      this.emit({ type: 'play', obj: card, player: by, spell: true, via });
      this.emitCardPlayed(card, by, via); // Darius, Trifarian
    }
  }
  counter(item: ChainItem) {
    if (item.cardId && this.script(this.objs[item.cardId]).uncounterable) return this.say(`${item.label} não pode ser anulado.`);
    // novo (Vendetta): "Your spells and abilities can't be countered" (Aura.uncounterable: Mel, Newly Awakened)
    if (this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.uncounterable?.(this, src, item)))) return this.say(`${item.label} não pode ser anulado.`);
    this.chain = this.chain.filter((x) => x !== item);
    if (item.cardId && item.recycleAfter) this.recycleCard(this.objs[item.cardId]);
    else if (item.cardId) this.toZone(this.objs[item.cardId], 'trash');
    this.say(`${item.label} foi anulado (Counter).`);
  }

  // ───────────────────────────── limpeza (regra 323) ─────────────────────────────
  /** Limpeza síncrona (legado/testes): substituições opcionais de morte recebem a resposta padrão. */
  cleanup() {
    this.runSync(this.cleanupG());
  }
  /**
   * Limpeza (regra 323); gerador porque mortes podem perguntar substituições ("você pode").
   * `once` (novo, revisão UNL chaos): uma passada só, sem repetir — a Limpeza Especial de Combate (466.1.a): cada unidade
   * é conferida uma vez quanto a dano letal (323.4) e quem chama cura todas (3c) e chama de volta os atacantes (3d) antes
   * da limpeza normal seguinte (322, 324.2). Ex.: uma aliada que só fica com dano letal porque o Baron Nashor (+2) morreu
   * no mesmo combate sobrevive (riftboundfaq.com, Baron Nashor).
   */
  *cleanupG(once = false): Gen {
    for (let guard = 0; guard < (once ? 1 : 50); guard++) {
      let changed = false;
      // 1. vitória
      for (const p of [0, 1] as P[]) {
        if (this.winner === null && this.pl[p].points >= this.cfg.victoryScore && this.pl[p].points > this.pl[opp(p)].points) {
          this.winner = p;
          this.winReason = `${this.cfg.victoryScore} pontos`;
          this.say(`🏆 ${this.pname(p)} vence a partida!`, p);
        }
      }
      if (this.winner !== null) return;
      // 2. designações de combate
      const sd = this.showdown;
      for (const u of this.units()) {
        if (sd?.combat && this.bfIndex(u) === sd.bf) {
          const want = u.controller === sd.attacker ? 'attacker' : 'defender';
          if (u.role !== want) {
            u.role = want;
            if (want === 'attacker' && !u.attackedThisCombat) {
              u.attackedThisCombat = true;
              this.emit({ type: 'attack', unit: u, bf: sd.bf, player: u.controller });
            }
            if (want === 'defender' && !u.defendedThisCombat) {
              u.defendedThisCombat = true;
              this.emit({ type: 'defend', unit: u, bf: sd.bf, player: u.controller });
            }
            changed = true;
          }
        } else if (u.role) {
          u.role = undefined;
          changed = true;
        }
      }
      // 3. dano letal: todas as unidades com dano letal morrem ao mesmo tempo (323.5, 370.1.a.2)
      const lethal = this.units().filter((u) => this.hasLethalDamage(u)); // novo (UNL body): letal modificado (Elder Dragon)
      if (lethal.length) {
        yield* this.killG(lethal, 'morre (dano letal)');
        changed = true;
      }
      // 4. perder controle de campos vazios
      // novo: itens pendentes também são parte da pilha (808.1.d.2, 309.1): o Deathknell de quem morreu sozinho no campo
      // mantém o controle até resolver (RiftJudge #10510, #11226, Glasc Mixologist)
      const open = this.chain.length === 0 && this.pending.length === 0;
      this.bfs.forEach((b, i) => {
        if (b.controller !== null && open && !(this.showdown && this.showdown.bf === i)) {
          if (this.unitsAtBf(i, b.controller).length === 0) {
            this.say(`${this.pname(b.controller)} perde o controle de ${this.name(b.objId)}.`);
            b.controller = null;
            changed = true;
          }
        }
      });
      // 5. gear solto em campo volta para a base; cartas escondidas de quem não controla o campo vão para o descarte
      // novo: só o gear que NÃO é unidade (149.3, 323.7, 457.1): unit gear fica no campo como qualquer unidade
      for (const g of this.board().filter((o) => this.isGear(o) && !o.attachedTo && o.loc?.t === 'bf' && !this.isUnit(o))) {
        if (this.kw(g).deploy) continue;
        g.loc = { t: 'base', p: g.controller };
        changed = true;
      }
      // novo (323.7): permanentes e runas soltos na base de outro jogador voltam para a base do controlador (Akshan,
      // gear tomado/devolvido); anexados ficam com a carta do topo (107.1.c.1)
      for (const o of this.board().filter((x) => !x.attachedTo && x.loc?.t === 'base' && x.loc.p !== x.controller)) {
        o.loc = { t: 'base', p: o.controller };
        changed = true;
      }
      this.bfs.forEach((b) => {
        for (const id of [...b.facedown]) {
          const o = this.objs[id];
          if (b.controller !== o.controller) {
            this.toZone(o, 'trash');
            this.say(`A carta escondida de ${this.pname(o.controller)} em ${this.name(b.objId)} vai para o descarte (${this.name(o)}).`);
            changed = true;
          }
        }
      });
      // novo (RAD, 107.3.b.2): a lotação da zona de cartas escondidas diminuiu (saiu o Bushwhack Trap, Aura.hideExtra):
      // o controlador do campo põe o excesso no descarte, à escolha dele
      for (let i = 0; i < this.bfs.length; i++) {
        const b = this.bfs[i];
        if (b.controller === null) continue;
        const over = b.facedown.length - (b.capacity + this.hideExtra(i, b.controller));
        if (over <= 0) continue;
        const ids = yield* this.ask(b.controller, 'choose', `Só cabem ${b.facedown.length - over} carta(s) escondida(s) em ${this.name(b.objId)}: quais vão para o descarte?`, b.facedown.map((id) => ({ id, label: this.name(id), obj: id })), over, over);
        for (const id of ids) this.toZone(this.objs[id], 'trash');
        this.say(`${this.pname(b.controller)} põe ${over} carta(s) escondida(s) de ${this.name(b.objId)} no descarte.`);
        changed = true;
      }
      // 8. status de disputa
      this.bfs.forEach((b, i) => {
        const inSd = this.showdown && this.showdown.bf === i;
        if (b.contestedBy !== null && !inSd && this.unitsAtBf(i, b.contestedBy).length === 0) {
          b.contestedBy = null;
          changed = true;
        }
        if (b.contestedBy === null && !inSd) {
          for (const p of [this.active, opp(this.active)]) {
            if (b.controller !== p && this.unitsAtBf(i, p).length > 0) {
              b.contestedBy = p;
              changed = true;
              break;
            }
          }
        }
      });
      this.checkMighty(); // novo: "fica Mighty" (709)
      if (!changed) {
        this.lastResolvedId = undefined; // novo: a atribuição "item que resolveu antes da limpeza" vale só para esta limpeza
        return;
      }
    }
  }

  /**
   * Novo: evento 'mighty' quando o Might de uma unidade no tabuleiro passa de menos de 5 para 5 ou mais (regra 709).
   * Verificado a cada limpeza (depois de cada ação/resolução e das designações de combate). Entrar no tabuleiro já com
   * 5+ não conta (RiftJudge #5835); perder e voltar a ficar Mighty conta de novo.
   */
  checkMighty() {
    const us = this.units();
    // sem ninguém esperando o evento, só esquece o estado (quem passar a esperar começa do zero, sem evento falso)
    if (!this.mightyListened()) {
      for (const u of us) u.mty = undefined;
    } else {
      const ms = this.withAuraCache(() => us.map((u) => this.isMighty(u)));
      for (const [i, u] of us.entries()) {
        const m = ms[i];
        if (u.mty === undefined) u.mty = m;
        else if (m && !u.mty) {
          u.mty = true;
          this.emit({ type: 'mighty', unit: u, player: u.controller });
        } else if (!m) u.mty = false;
      }
    }
    // novo (VEN-092): limiares genéricos — "quando meu Might fica N ou mais" ('mightReach', TriggerDef.threshold): mesmo
    // critério do Mighty (passa de menos de N para N ou mais no tabuleiro; entrar já com N+ não conta)
    const ths = this.mightReachListened();
    if (!ths.length) {
      for (const u of us) u.mtyN = undefined;
      return;
    }
    const vals = this.withAuraCache(() => us.map((u) => this.might(u)));
    for (const [i, u] of us.entries()) {
      const st = (u.mtyN ||= {});
      for (const n of ths) {
        const at = vals[i] >= n;
        if (st[n] === undefined) st[n] = at;
        else if (at && !st[n]) {
          st[n] = true;
          this.emit({ type: 'mightReach', unit: u, player: u.controller, threshold: n });
        } else if (!at) st[n] = false;
      }
    }
  }

  /** Algum gatilho (de carta, lenda, campo ou atrasado) espera o evento 'mighty'? */
  private mightyListened(): boolean {
    if (this.delayed.some((d) => d.on === 'mighty')) return true;
    return this.auraSources().some((src) => (this.script(src).triggers || []).some((t) => t.on === 'mighty' || (Array.isArray(t.on) && t.on.includes('mighty'))));
  }
  /** Novo: limiares de Might que algum gatilho 'mightReach' espera (TriggerDef.threshold; atrasados: Delayed.threshold). */
  private mightReachListened(): number[] {
    const out = new Set<number>();
    const has = (t: { on: EventType | EventType[] }) => t.on === 'mightReach' || (Array.isArray(t.on) && t.on.includes('mightReach'));
    for (const d of this.delayed) if (d.on === 'mightReach') out.add(d.threshold ?? 5);
    for (const src of this.auraSources()) for (const t of this.script(src).triggers || []) if (has(t)) out.add(t.threshold ?? 5);
    return [...out];
  }

  // ───────────────────────────── laço de estabilização ─────────────────────────────
  /** Resolve gatilhos, pilha, showdowns e combates até o estado ficar aberto e neutro. */
  *settle(): Gen {
    for (let guard = 0; guard < 10000; guard++) {
      yield* this.cleanupG();
      if (this.winner !== null) return;
      if (this.pending.length) {
        yield* this.placePending();
        continue;
      }
      if (this.chain.length) {
        yield* this.priorityRound();
        continue;
      }
      const sd = this.showdown;
      if (sd) {
        if (sd.flipAfterChain) {
          sd.flipAfterChain = false;
          sd.focus = opp(sd.focus);
          sd.passes = 0;
        }
        if (!sd.combat && this.unitsAtBf(sd.bf, opp(this.bfs[sd.bf].contestedBy ?? this.active)).length > 0 &&
          this.unitsAtBf(sd.bf, this.bfs[sd.bf].contestedBy ?? this.active).length > 0) {
          this.convertToCombat();
          continue;
        }
        yield* this.focusStep();
        continue;
      }
      // novo: também na fase final (regras 323.12-323.13: showdown/combate começam em qualquer estado neutro aberto;
      // ex.: Deadbloom Predator jogada por Dazzling Aurora num campo inimigo ocupado, FAQ riftjudge #5654)
      if (this.phase === 'main' || this.phase === 'ending') {
        const staged = this.bfs
          .map((b, i) => i)
          .filter((i) => {
            const b = this.bfs[i];
            return b.contestedBy !== null && this.unitsAtBf(i, b.contestedBy).length > 0;
          });
        if (staged.length) {
          let i = staged[0];
          if (staged.length > 1) {
            const ids = yield* this.ask(
              this.active,
              'choose',
              'Qual campo resolve primeiro?',
              staged.map((x) => ({ id: String(x), label: this.name(this.bfs[x].objId), obj: this.bfs[x].objId })),
            );
            i = Number(ids[0]);
          }
          this.startShowdown(i);
          continue;
        }
      }
      return;
    }
    throw new Error('settle(): laço sem fim');
  }
  /** Só esvazia gatilhos e pilha (usado no meio do combate e nas fases sem showdown). */
  *drain(): Gen {
    for (let guard = 0; guard < 10000; guard++) {
      yield* this.cleanupG();
      if (this.winner !== null) return;
      if (this.pending.length) {
        yield* this.placePending();
        continue;
      }
      if (this.chain.length) {
        yield* this.priorityRound();
        continue;
      }
      return;
    }
  }
  *priorityRound(): Gen {
    let p = this.chain[this.chain.length - 1].controller;
    let passes = 0;
    for (let guard = 0; guard < 200; guard++) {
      this.prioPasses = passes; // novo (interface): quantos passaram em seguida nesta rodada da pilha
      const opts = this.actionOptions(p, 'priority');
      let choice = 'pass';
      if (opts.length) {
        const top = this.chain[this.chain.length - 1];
        const ids = yield* this.ask(
          p,
          'priority',
          `Pilha: ${top.label}. Responder com uma Reaction ou passar?`,
          [...opts, { id: 'pass', label: 'Passar' }, this.manualPayOpt(p)],
          1,
          1,
          true,
        );
        choice = ids[0];
      }
      if (choice === '__refresh') return;
      if (choice === MANUAL_PAY) {
        this.toggleManualPay(p);
        continue;
      }
      if (choice === 'pass') {
        passes++;
        if (passes >= 2) {
          yield* this.resolveTop();
          return;
        }
        p = opp(p);
        continue;
      }
      // novo (429.2.a): [Add] não passa a prioridade — quem ativou continua com ela
      if (this.isAddChoice(choice)) {
        yield* this.doAction(p, choice, 'priority');
        if (this.pending.length || this.winner !== null) return;
        continue;
      }
      yield* this.doAction(p, choice, 'priority');
      return;
    }
  }

  // ───────────────────────────── showdown e combate ─────────────────────────────
  startShowdown(i: number) {
    const b = this.bfs[i];
    const att = b.contestedBy!;
    const combat = this.unitsAtBf(i, opp(att)).length > 0;
    this.showdown = { bf: i, combat: false, focus: att, passes: 0, flipAfterChain: false, excess: [0, 0] };
    this.say(`Showdown em ${this.name(b.objId)}.`);
    // novo (UNL mind): "quando um showdown começa aqui" (Diana, Lunari): vale para showdown de combate também (464.2.b)
    this.emit({ type: 'showdownStart', bf: i, player: att, combat });
    if (combat) this.convertToCombat();
  }
  convertToCombat() {
    const sd = this.showdown!;
    const b = this.bfs[sd.bf];
    sd.combat = true;
    sd.attacker = b.contestedBy ?? this.active;
    sd.defender = opp(sd.attacker);
    sd.opening = true; // caça (gatilhos): 464.2.e.1, ver placePending
    for (const u of this.units()) {
      u.attackedThisCombat = false;
      u.defendedThisCombat = false;
    }
    this.say(`⚔ Combate em ${this.name(b.objId)}: ${this.pname(sd.attacker)} ataca, ${this.pname(sd.defender)} defende.`);
    this.emit({ type: 'combatStart', bf: sd.bf, attacker: sd.attacker, defender: sd.defender, player: sd.attacker });
    // "quando você ataca/defende" (nível do jogador)
    this.emit({ type: 'attack', bf: sd.bf, player: sd.attacker, playerLevel: true });
    this.emit({ type: 'defend', bf: sd.bf, player: sd.defender, playerLevel: true });
    // as designações (e gatilhos de ataque/defesa) são aplicadas no cleanup
  }
  *focusStep(): Gen {
    const sd = this.showdown!;
    sd.opening = false; // caça (gatilhos): a abertura do combate (464.2) já passou
    const p = sd.focus;
    const opts = this.actionOptions(p, 'focus');
    let choice = 'pass';
    if (opts.length || !this.cfg.autoPass) {
      const ids = yield* this.ask(
        p,
        'focus',
        `${sd.combat ? 'Combate' : 'Showdown'} em ${this.name(this.bfs[sd.bf].objId)}: você tem o Focus. Jogar algo ou passar?`,
        [...opts, { id: 'pass', label: 'Passar' }, this.manualPayOpt(p)],
        1,
        1,
        true,
      );
      choice = ids[0];
    }
    if (choice === '__refresh') return;
    if (choice === MANUAL_PAY) {
      this.toggleManualPay(p);
      return;
    }
    if (choice === 'pass') {
      sd.passes++;
      if (sd.passes >= 2) {
        yield* this.endShowdown();
        return;
      }
      sd.focus = opp(p);
      return;
    }
    // novo (429.2.a): [Add] não passa o Focus nem conta como jogada
    if (this.isAddChoice(choice)) {
      yield* this.doAction(p, choice, 'focus');
      return;
    }
    sd.passes = 0;
    sd.flipAfterChain = true;
    yield* this.doAction(p, choice, 'focus');
  }
  /** Novo: a opção de ação é ativar uma habilidade de [Add]? */
  isAddChoice(id: string): boolean {
    const [verb, oid, via] = id.split(':');
    if (verb === 'act') return !!(this.script(this.objs[oid]).activated || [])[Number(via)]?.isAdd;
    if (verb === 'actb') {
      const [fid, k] = via.split('.');
      return !!(this.script(this.objs[fid]).activated || [])[Number(k)]?.isAdd;
    }
    return false;
  }
  *endShowdown(): Gen {
    const sd = this.showdown!;
    if (sd.combat) {
      yield* this.combatDamage();
      return;
    }
    const b = this.bfs[sd.bf];
    this.showdown = null;
    b.contestedBy = null;
    // caça (gatilhos): se só um jogador tem unidades lá e não controla o campo, ele estabelece o controle (348.2.a), mesmo
    // que não tenha sido quem disputou (ex.: as unidades de quem disputou morreram e as do outro entraram no showdown)
    const only = ([0, 1] as P[]).filter((p) => this.unitsAtBf(sd.bf, p).length > 0);
    if (only.length === 1 && b.controller !== only[0]) yield* this.establishControl(sd.bf, only[0], 0);
  }
  *establishControl(i: number, p: P, excess: number): Gen {
    const b = this.bfs[i];
    const prev = b.controller; // novo: quem controlava logo antes da conquista (Yone, Blademaster)
    b.controller = p;
    this.say(`${this.pname(p)} assume o controle de ${this.name(b.objId)}.`, p);
    yield* this.score(p, i, 'conquer', excess, prev);
  }
  *score(p: P, i: number, how: 'conquer' | 'hold', excess = 0, prev?: P | null): Gen {
    const key = `${p}-${i}`;
    if (this.scored.includes(key)) return;
    // novo (SFD): o processo de pontuar está impedido aqui (Forgotten Monument): sem ponto, sem conquista/hold e sem os
    // gatilhos deles (FAQ oficial do Spiritforged)
    if (this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.blockScore?.(this, src, p, i)))) {
      this.say(`${this.pname(p)} não pode pontuar em ${this.name(this.bfs[i].objId)} agora.`, p);
      return;
    }
    this.scored.push(key);
    if (how === 'conquer') this.conqueredThisTurn.push(key); // novo (SFD): conquista = controle de campo ainda não pontuado (469.1)
    // novo (UNL fury): unidades que conquistaram neste turno (as presentes na conquista, 383.4.c.2.a; Blighted Battleaxe)
    if (how === 'conquer') for (const u of this.unitsAtBf(i, p)) (u.data ||= {}).conquered = { turn: this.turn, v: u.zoneVersion };
    const s = this.pl[p];
    const before = s.points;
    const word = how === 'conquer' ? 'conquista' : 'segura (hold)';
    if (how === 'conquer' && s.points >= this.cfg.victoryScore - 1) {
      const all = this.bfs.every((_, j) => this.scored.includes(`${p}-${j}`));
      if (!all) {
        this.say(
          `${this.pname(p)} ${word} ${this.name(this.bfs[i].objId)}, mas o último ponto por conquista só vale se ${this.pname(p)} pontuar (hold ou conquista) todos os campos neste turno: compra 1 em vez do ponto.`,
          p,
        );
        yield* this.draw(p, 1);
      } else {
        const how2 = this.bfs.map((b, j) => (j === i ? null : this.name(b.objId))).filter(Boolean).join(', ');
        this.gainPoints(p, 1, `${word} ${this.name(this.bfs[i].objId)} — último ponto válido: também pontuou ${how2} neste turno`);
      }
    } else if (this.board().some((o) => this.script(o).replaceScore?.(this, o, p, how))) {
      this.say(`${this.pname(p)} ${word} ${this.name(this.bfs[i].objId)}: compra 1 em vez de pontuar (Otterpus).`, p);
      yield* this.draw(p, 1);
    } else this.gainPoints(p, 1, `${word} ${this.name(this.bfs[i].objId)}`);
    if (how === 'hold') s.holdPoints = (s.holdPoints || 0) + Math.max(0, s.points - before); // novo
    // Hunt: mudou (UNL) — é gatilho na pilha (823.1), disparado pelo evento de conquista/hold abaixo (emit → huntTrigger)
    // Deploy: gear inimigo com Deploy morre quando o oponente segura o campo
    if (how === 'hold')
      for (const g of this.board().filter((o) => this.isGear(o) && this.bfIndex(o) === i && o.controller !== p)) // bfIndex: anexado vale o local da unidade
        if (this.activeKw(g).deploy) yield* this.killG(g);
    this.emit({ type: how, player: p, bf: i, excess, units: this.unitsAtBf(i, p).map((u) => u.id), prevController: prev });
    // novo (SFD): "minhas habilidades de hold também são de conquista, e vice-versa" (Skyfall of Areion): as habilidades
    // da unidade (e do que está equipado nela) do outro tipo disparam junto, só para ela
    const other = how === 'conquer' ? 'hold' : 'conquer';
    for (const u of this.unitsAtBf(i, p)) {
      const gear = this.attachedTo(u);
      if (!gear.some((g) => this.baseScript(g).holdConquerAlias)) continue; // texto de efeito do gear (o script "inativo" não o tem)
      this.emit({ type: other, player: p, bf: i, excess, units: [u.id], only: [u.id, ...gear.map((g) => g.id)], aliasOf: how });
    }
  }
  *assignDamage(by: P, amount: number, targets: Obj[]): Gen<{ map: Map<string, number>; excess: number }> {
    const map = new Map<string, number>();
    let rem = amount;
    // regra 465.2.c.10: unidade que não pode receber dano fica fora da atribuição de dano letal
    const left = targets.filter((u) => !this.cantTakeDamage(u));
    // novo: "devo receber dano de combate por último" sem ser Backline (Caitlyn, Patrolling); se a unidade tem
    // exigências opostas (Tank e "por último"), quem atribui escolhe qual vale (regras 465.2.c.8 e 465.2.c.9)
    const pr = new Map<string, number>();
    for (const u of left) {
      const first = !!this.kw(u).tank && !this.board().some((s) => s.controller === by && this.bfIndex(s) >= 0 && this.bfIndex(s) === this.bfIndex(u) && this.script(s).ignoreTank?.(this, s));
      const last = !!this.kw(u).backline || !!this.script(u).damageLast?.(this, u);
      let v = first ? 0 : last ? 2 : 1;
      if (first && last && left.length > 1) {
        const [k] = yield* this.ask(by, 'choose', `${this.describe(u)} tem Tank e deve receber dano por último: qual exigência vale na atribuição?`, [
          { id: 'first', label: 'Tank (recebe dano antes)', obj: u.id },
          { id: 'last', label: 'Por último', obj: u.id },
        ]);
        v = k === 'last' ? 2 : 0;
      }
      pr.set(u.id, v);
    }
    const prio = (u: Obj) => pr.get(u.id) ?? 1;
    while (rem > 0 && left.length) {
      const best = Math.min(...left.map(prio));
      const cands = left.filter((u) => prio(u) === best);
      let pick = cands[0];
      if (cands.length > 1) {
        const ids = yield* this.ask(
          by,
          'choose',
          `Distribuir dano (${rem} restante): qual unidade recebe dano letal agora?`,
          cands.map((u) => ({ id: u.id, label: `${this.describe(u)} — ${this.lethalNeed(u, by) === Infinity ? 'nenhum dano é letal (prevenido)' : `precisa de ${this.lethalNeed(u, by)}`}`, obj: u.id })),
        );
        pick = this.objs[ids[0]];
      }
      const need = this.lethalNeed(pick, by); // novo (UNL body): `by` (Elder Dragon)
      const give = Math.min(need, rem);
      map.set(pick.id, (map.get(pick.id) || 0) + give);
      rem -= give;
      left.splice(left.indexOf(pick), 1);
    }
    const excess = rem;
    if (rem > 0 && targets.length) {
      const last = targets[targets.length - 1];
      map.set(last.id, (map.get(last.id) || 0) + rem);
    }
    return { map, excess };
  }
  *combatDamage(): Gen {
    const sd = this.showdown!;
    const i = sd.bf;
    const A = sd.attacker!;
    const D = sd.defender!;
    const atk = this.unitsAtBf(i, A);
    const def = this.unitsAtBf(i, D);
    if (atk.length && def.length) {
      const aM = atk.reduce((s, u) => s + this.combatMight(u), 0);
      const dM = def.reduce((s, u) => s + this.combatMight(u), 0);
      this.say(`Dano de combate: ${this.pname(A)} ${aM} × ${dM} ${this.pname(D)}.`);
      const a = yield* this.assignDamage(A, aM, def);
      const d = yield* this.assignDamage(D, dM, atk);
      sd.excess = [0, 0];
      sd.excess[A] = a.excess;
      sd.excess[D] = d.excess;
      // atribuição de morte no combate (regra 428.5.c.2)
      for (const id of a.map.keys()) this.objs[id].lastDamagedBy = A;
      for (const id of d.map.keys()) this.objs[id].lastDamagedBy = D;
      for (const [id, n] of [...a.map, ...d.map]) this.dealDamage(this.objs[id], n);
    }
    // limpeza de combate: mortes, cura, retorno dos atacantes
    this.combatCleanup = true; // mortes desta limpeza são atribuídas ao dano de combate (regra 428.5.c.2)
    yield* this.cleanupG(true); // novo (revisão UNL chaos): Limpeza Especial de Combate, uma passada (466.1.a, 323.4)
    this.combatCleanup = false;
    for (const u of this.units()) u.damage = 0;
    const atkLeft = this.unitsAtBf(i, A);
    const defLeft = this.unitsAtBf(i, D);
    if (atkLeft.length && defLeft.length) {
      // novo: substituição "chame todas as unidades do campo" (Symbol of the Solari)
      const allBack = this.board().some((src) => this.script(src).tieRecallAll?.(this, src, i, A));
      for (const u of allBack ? [...atkLeft, ...defLeft] : atkLeft) this.recall(u);
      this.say(allBack ? `Empate: todas as unidades do campo voltam para a base.` : `Os defensores resistiram: os atacantes voltam para a base.`);
    }
    yield* this.drain();
    if (this.winner !== null) return;
    // novo (SFD): resultado do combate (regra 466.3): vence quem é o único com unidades no campo; sem resultado se houve
    // recall de atacantes (466.3.d). Os gatilhos resolvem antes de estabelecer o controle (466.4).
    if (!(atkLeft.length && defLeft.length)) {
      const aR = this.unitsAtBf(i, A);
      const dR = this.unitsAtBf(i, D);
      const w: P | null = aR.length && !dR.length ? A : dR.length && !aR.length ? D : null;
      if (w !== null) {
        this.emit({ type: 'combatWin', bf: i, player: w, units: this.unitsAtBf(i, w).map((u) => u.id) });
        yield* this.drain();
        if (this.winner !== null) return;
      }
    }
    // resultado e controle
    const b = this.bfs[i];
    const aNow = this.unitsAtBf(i, A).length;
    const dNow = this.unitsAtBf(i, D).length;
    const remaining = this.unitsAtBf(i).map((u) => u.id);
    b.contestedBy = null;
    if (aNow && !dNow) {
      if (b.controller !== A) yield* this.establishControl(i, A, sd.excess[A]);
    } else if (dNow && !aNow) {
      if (b.controller !== D) yield* this.establishControl(i, D, sd.excess[D]);
    } else if (!aNow && !dNow) {
      if (b.controller !== null) this.say(`${this.name(b.objId)} fica sem controle.`);
      b.controller = null;
    }
    // caça (gatilhos): os gatilhos de conquista resolvem antes de o combate acabar (466.6), ainda com as designações e
    // os efeitos "neste combate" (RiftJudge #8706: o Assault ainda vale quando a conquista resolve)
    yield* this.drain();
    if (this.winner !== null) return;
    this.showdown = null;
    // novo (revisão VEN): unidades que estiveram neste combate (atacante/defensora em algum momento) e continuam no
    // tabuleiro, mesmo se chamadas de volta no empate: "When a combat that I was in ends" (Affectionate Poro, Mournful Witness)
    const was = this.units().filter((u) => u.attackedThisCombat || u.defendedThisCombat).map((u) => u.id);
    for (const u of this.units()) {
      u.role = undefined;
      u.attackedThisCombat = false;
      u.defendedThisCombat = false;
    }
    this.effects = this.effects.filter((e) => e.until !== 'combat');
    this.emit({ type: 'combatEnd', bf: i, units: remaining, was });
  }

  // ───────────────────────────── opções de ação ─────────────────────────────
  /** Lista de ações legais para p no momento: 'main' (estado neutro aberto), 'focus' (showdown) ou 'priority' (pilha). */
  actionOptions(p: P, timing: 'main' | 'focus' | 'priority'): Option[] {
    this.playingLoc = undefined;
    return this.withAuraCache(() => this.actionOptionsRaw(p, timing));
  }
  private actionOptionsRaw(p: P, timing: 'main' | 'focus' | 'priority'): Option[] {
    const out: Option[] = [];
    const s = this.pl[p];
    // cartas
    const playable: { o: Obj; via: string }[] = [];
    for (const id of s.hand) playable.push({ o: this.objs[id], via: 'hand' });
    if (s.champion) playable.push({ o: this.objs[s.champion], via: 'champion' });
    for (const b of this.bfs)
      for (const id of b.facedown) {
        const o = this.objs[id];
        if (o.controller === p && (o.hiddenTurn ?? 99) < this.turn) playable.push({ o, via: 'hidden' });
      }
    for (const id of s.trash) {
      const o = this.objs[id];
      if (this.flowCostOf(o)) playable.push({ o, via: 'flow' }); // novo: também [Flow] dado por efeito (Kennen)
      // novo (Vendetta): permissão de jogar do descarte pelo custo normal (Aura.playFromTrash: Endless Riches)
      if (this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.playFromTrash?.(this, src, o, p)))) playable.push({ o, via: 'trash' });
    }
    // novo (RAD): cartas banidas que podem ser jogadas "até o seu próximo Ending Phase" (Akali, Brash; Runeblade Anvil)
    for (const id of s.banish) {
      const d = this.objs[id]?.data;
      // revisão RAD: "until your next Ending Phase" acaba quando esse Ending Phase começa; playVer = o mesmo objeto (124.1)
      const live = d && d.playUntil !== undefined && (this.turn < d.playUntil || (this.turn === d.playUntil && this.phase !== 'ending'));
      if (d && d.playBy === p && live && (d.playVer === undefined || d.playVer === this.objs[id].zoneVersion)) playable.push({ o: this.objs[id], via: 'banished' });
    }
    for (const { o, via } of playable) {
      if (this.canPlayCard(p, o, via, timing))
        out.push({
          id: `play:${o.id}:${via}`,
          // novo (UNL fury): sem [Flow] no texto, é outra permissão de jogar do descarte (Undying Legion)
          label: `Jogar ${this.name(o)}${via === 'hidden' ? ' (escondida, por 0)' : via === 'flow' ? (/\[Flow\]/i.test(this.data(o).text) || this.grantedFlow(o) ? ' (Flow, do descarte)' : ' (do descarte)') : via === 'trash' ? ' (do descarte, custo normal)' : via === 'banished' ? ' (banida, até o fim do turno)' : via === 'champion' ? ' (campeã)' : ''}`,
          obj: o.id,
          group: 'Jogar',
        });
    }
    // esconder
    if (timing === 'main' && p === this.active) {
      for (const id of s.hand) {
        const o = this.objs[id];
        if (this.kw(o).hidden && this.hideSpots(p).length && this.hideCosts(p).some((hc) => this.canPay(p, hc)))
          out.push({ id: `hide:${o.id}`, label: `Esconder ${this.name(o)} (paga 1 power)`, obj: o.id, group: 'Esconder' });
      }
      if (s.champion) {
        const o = this.objs[s.champion];
        if (this.kw(o).hidden && this.hideSpots(p).length && this.hideCosts(p).some((hc) => this.canPay(p, hc)))
          out.push({ id: `hide:${o.id}`, label: `Esconder ${this.name(o)}`, obj: o.id, group: 'Esconder' });
      }
    }
    // habilidades ativadas
    const owners = [...this.board().filter((o) => o.controller === p), ...this.legendsOf(p)];
    for (const o of owners) {
      const sc = this.script(o);
      (sc.activated || []).forEach((a, k) => {
        if (this.canActivate(p, o, a, timing)) out.push({ id: `act:${o.id}:${k}`, label: `${this.name(o)}: ${a.label}`, obj: o.id, group: 'Habilidades' });
      });
      // habilidades emprestadas de outros objetos (Heimerdinger, Inventor)
      for (const b of sc.borrowedActivated?.(this, o) || []) {
        const a = (this.script(b.from).activated || [])[b.index];
        if (a && this.canActivate(p, o, a, timing))
          out.push({ id: `actb:${o.id}:${b.from.id}.${b.index}`, label: `${this.name(o)}: ${a.label} (de ${this.name(b.from)})`, obj: o.id, group: 'Habilidades' });
      }
      // novo (SFD): habilidades concedidas por auras de outra fonte (Forge of the Fluft: lendas aliadas ganham "[Tap]: ...")
      for (const src of this.auraSources())
        for (const au of this.script(src).auras || [])
          for (const k of au.grantActivated?.(this, src, o) || []) {
            const a = (this.script(src).activated || [])[k];
            if (a && this.canActivate(p, o, a, timing))
              out.push({ id: `actb:${o.id}:${src.id}.${k}`, label: `${this.name(o)}: ${a.label} (de ${this.name(src)})`, obj: o.id, group: 'Habilidades' });
          }
      // novo (VEN): habilidades ativadas dadas por efeito enquanto durar (Dominus: "[Rune][Rune]: Ready me" neste turno)
      for (const { e, a } of this.grantedActs(o))
        if (this.canActivate(p, o, a, timing)) out.push({ id: `acte:${o.id}:${e.id}`, label: `${this.name(o)}: ${a.label}`, obj: o.id, group: 'Habilidades' });
      // Equip (818): gear solto, timing do Equip, alguma unidade sua em que dá para pagar
      if (this.isGear(o) && this.canEquip(p, o, timing)) {
        const bs = this.baseScript(o);
        const ct = bs.equipFor ? 'custo conforme a unidade' : this.costText(bs.equipCost || NO_COST);
        out.push({ id: `equip:${o.id}`, label: `Equipar ${this.name(o)} (${ct}${bs.equipExtra ? ` + ${bs.equipExtra.label}` : ''})`, obj: o.id, group: 'Habilidades' });
      }
    }
    // mover
    if (timing === 'main' && p === this.active && this.movableUnits(p).length)
      out.push({ id: 'move', label: 'Mover unidades', group: 'Mover' });
    if (timing === 'main' && p === this.active) out.push({ id: 'end', label: 'Encerrar o turno', group: 'Turno' });
    return out;
  }
  timingOk(p: P, o: Obj, kw: Keywords, timing: 'main' | 'focus' | 'priority', viaHidden: boolean): boolean {
    if (timing === 'main') return p === this.active;
    const reaction = !!kw.reaction || viaHidden || !!kw.quickDraw;
    if (timing === 'priority') return reaction;
    return reaction || !!kw.action;
  }
  hideSpots(p: P): number[] {
    return this.bfs
      .map((b, i) => i)
      .filter((i) => this.bfs[i].controller === p && this.bfs[i].facedown.length < this.bfs[i].capacity + this.hideExtra(i, p));
  }
  /** Novo (RAD): cartas escondidas a mais permitidas no campo i para p (Aura.hideExtra: Bushwhack Trap). */
  hideExtra(i: number, p: P): number {
    let n = 0;
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) n += a.hideExtra?.(this, src, i, p) || 0;
    return n;
  }
  /** Auras podem proibir locais para jogar unidades (Mageseeker Warden). */
  playLocOk(p: P, o: Obj, l: Loc): boolean {
    if (this.script(o).selfPlayLoc && !this.script(o).selfPlayLoc!(this, o, p, l)) return false; // novo (SFD): Perched Grimwyrm
    return !this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.playLoc && !a.playLoc(this, src, p, o, l)));
  }
  /** Custos possíveis para esconder (padrão 1 power; auras com hideCost; "esconder ignorando custos" neste turno). */
  hideCosts(p: P): Cost[] {
    const out: Cost[] = [{ energy: 0, power: [[...DOMAINS]] }];
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const hc = a.hideCost?.(this, src, p);
        if (hc) out.push(hc);
      }
    if (this.effects.some((e) => e.player === p && e.flag === 'hideFree')) out.push(NO_COST);
    return out;
  }
  unitLocations(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority'): Loc[] {
    return this.unitLocationsRaw(p, o, via, timing).filter((l) => this.playLocOk(p, o, l));
  }
  /**
   * Novo (Vendetta): campos que p só pode usar para jogar a unidade `o` pagando um custo adicional (Aura.locCost: Dragon
   * Roost, "Any player may pay [Rune][Rune] as an additional cost to play a Dragon. If they do, they play it to this
   * battlefield"). Só os que não são local permitido de outro jeito. Fora da fase principal, só para unidade com [Reaction].
   */
  paidLocations(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority' | 'effect', normal?: Loc[]): { loc: Loc; cost: Cost }[] {
    if (via === 'hidden' || this.kind(o) !== 'unit') return [];
    if (timing !== 'main' && timing !== 'effect' && !this.kw(o).reaction) return [];
    const base = normal ?? (timing === 'effect' ? [] : this.unitLocations(p, o, via, timing));
    const out: { loc: Loc; cost: Cost }[] = [];
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const r = a.locCost?.(this, src, o, p);
        if (!r || r.i < 0 || r.i >= this.bfs.length) continue;
        const loc: Loc = { t: 'bf', i: r.i };
        if (base.some((l) => this.locEq(l, loc)) || out.some((x) => this.locEq(x.loc, loc)) || !this.playLocOk(p, o, loc)) continue;
        out.push({ loc, cost: r.cost });
      }
    return out;
  }
  /**
   * Novo (UNL): campos para onde `o` pode ser jogada pelo Ambush (822): onde p controla unidades (822.1.b) mais os que a
   * própria carta permite ("I can [Ambush] to ...", 822.1.d; CardScript.ambushBfs). `c` = contexto da jogada na checagem
   * de legalidade, depois dos custos.
   */
  ambushBfs(p: P, o: Obj, c?: Ctx): number[] {
    const extra = this.script(o).ambushBfs?.(this, o, p, c) || [];
    return this.bfs.map((_, i) => i).filter((i) => this.unitsAtBf(i, p).length > 0 || extra.includes(i));
  }
  /**
   * Novo (UNL): o local escolhido só era válido pelo Ambush (e não pelas regras normais nem por outras permissões)?
   * Nesse caso a checagem de legalidade (passo 5) exige que ele continue sendo um campo de Ambush depois dos custos:
   * sem unidades de p lá (e sem a permissão da carta), a jogada é desfeita (822.3, 806.4.b, 813.4.b).
   */
  ambushOnlyLoc(p: P, o: Obj, loc: Loc, via: string, timing: 'main' | 'focus' | 'priority'): boolean {
    if (loc.t !== 'bf' || via === 'hidden' || !this.kw(o).ambush) return false;
    const i = loc.i;
    const k = this.kw(o);
    const normal =
      (timing === 'main' || k.reaction) &&
      (this.bfs[i].controller === p || (this.isOpenBf(i) && this.canPlayToOpen(p, o)));
    const extra =
      (this.script(o).extraPlayBfs?.(this, o, p) || []).includes(i) ||
      ((timing === 'main' || !!k.reaction) && this.auraPlayBfs(p, o).includes(i)); // novo (UNL body): permissão de outra carta (Arachnoid Horror)
    return !normal && !extra;
  }
  unitLocationsRaw(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority'): Loc[] {
    // novo (RAD): escondida, joga-se no campo dela (811.1.d.1) — ou em qualquer campo com Last Caress ("even from face down")
    if (via === 'hidden') return this.anyBfNext(p, o) ? [o.loc!, ...this.bfs.map((_, i) => ({ t: 'bf', i }) as Loc).filter((l) => !this.locEq(l, o.loc))] : [o.loc!];
    const k = this.kw(o);
    const out: Loc[] = [];
    // "pode ser jogada num campo aberto" (sem unidades e sem controlador)
    const addOpen = () => {
      if (!this.canPlayToOpen(p, o)) return;
      this.bfs.forEach((b, i) => {
        if (this.isOpenBf(i) && !out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i });
      });
    };
    // novo (UNL): campos de Ambush = onde p tem unidades (822.1.b) + os que a carta permite ("I can [Ambush] to...", 822.1.d)
    const amb = k.ambush ? this.ambushBfs(p, o) : [];
    if (timing === 'main') {
      out.push({ t: 'base', p });
      this.bfs.forEach((b, i) => {
        if (b.controller === p) out.push({ t: 'bf', i });
        else if (amb.includes(i)) out.push({ t: 'bf', i });
      });
      // locais extras de jogada (Deadbloom Predator: campo inimigo ocupado)
      for (const i of this.script(o).extraPlayBfs?.(this, o, p) || [])
        if (!out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i });
      for (const i of this.auraPlayBfs(p, o)) if (!out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i }); // novo (UNL body): Arachnoid Horror
      addOpen();
    } else {
      for (const i of amb) out.push({ t: 'bf', i }); // Ambush: [Reaction] só jogando para esses campos (822.1.b)
      if (k.reaction) {
        out.push({ t: 'base', p });
        this.bfs.forEach((b, i) => {
          if (b.controller === p && !out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i });
        });
        addOpen();
      }
      // novo (SFD): permissões de local da carta também valem fora da fase principal (Rengar, Pouncing: campo que você
      // está atacando; regra 355.2.b)
      for (const i of this.script(o).extraPlayBfs?.(this, o, p) || [])
        if (!out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i });
      // novo (UNL body): permissão de local de outra carta (Arachnoid Horror) só com [Reaction] da própria unidade; não
      // estende o Ambush (riftboundfaq.com, Ambush #ambush-base; 822.1.b)
      if (k.reaction) for (const i of this.auraPlayBfs(p, o)) if (!out.some((l) => l.t === 'bf' && l.i === i)) out.push({ t: 'bf', i });
    }
    return out;
  }
  /** Novo (UNL body): campos extras onde p pode jogar a unidade `o` por permissão de outra carta (Aura.extraPlayBfs). */
  auraPlayBfs(p: P, o: Obj): number[] {
    const out: number[] = [];
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) for (const i of a.extraPlayBfs?.(this, src, o, p) || []) if (!out.includes(i)) out.push(i);
    // novo (Radiance): "a próxima unidade que você jogar neste turno pode ser jogada em qualquer campo" (Last Caress):
    // efeito nextPlay 'unit' com flag 'anyBf' (consumido ao jogar a unidade, takeNextPlay)
    if (this.anyBfNext(p, o)) this.bfs.forEach((_, i) => out.includes(i) || out.push(i));
    return out;
  }
  /** Novo (RAD): há um efeito "a próxima unidade que você jogar pode ir a qualquer campo" valendo para `o`? (Last Caress) */
  anyBfNext(p: P, o: Obj): boolean {
    return this.isUnit(o) && this.effects.some((e) => e.flag === 'anyBf' && this.nextPlayMatches(e, o, p));
  }
  /** Campo aberto: sem unidades e sem controlador (regra 170.11.c). */
  isOpenBf(i: number): boolean {
    return this.bfs[i].controller === null && this.unitsAtBf(i).length === 0;
  }
  /** A unidade o pode ser jogada por p num campo aberto (CardScript.playToOpen ou Aura.playToOpen). */
  canPlayToOpen(p: P, o: Obj): boolean {
    if (this.script(o).playToOpen) return true;
    return this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.playToOpen?.(this, src, o, p)));
  }
  minCostFor(p: P, o: Obj, via: string): Cost {
    return this.totalCost({ base: this.baseCostFor(o, via), add: NO_COST, plain: [], post: [] }, p, o);
  }
  /** Novo (UNL mind): custo alternativo da própria carta (CardScript.altCost) ao jogá-la da mão ou da zona de campeão. */
  altCostFor(p: P, o: Obj, via: string): Cost | undefined {
    // revisão VEN-113: spell com [Flow] impresso que ganhou outro [Flow] por efeito (Kennen) tem as duas instâncias; o
    // jogador escolhe por qual joga (a impressa é o custo base, a dada é a alternativa)
    if (via === 'flow') return this.script(o).flow ? this.grantedFlow(o) : undefined;
    if (via !== 'hand' && via !== 'champion') return undefined;
    return this.script(o).altCost?.(this, o, p);
  }
  /** Novo: custo base ao jogar: impresso, Flow (custo alternativo) ou 0 (escondida: ignora o custo base, 811.1.b). */
  baseCostFor(o: Obj, via: string): Cost {
    const sc = this.script(o);
    if (via === 'hidden') return NO_COST;
    const fl = via === 'flow' ? sc.flow ?? this.grantedFlow(o) : undefined;
    return fl ?? this.printedCost(o);
  }
  /** Novo (VEN): [Flow] dado por efeito à carta `o` no descarte (TempEffect.grantFlow; Kennen, Storm of Shuriken). */
  grantedFlow(o: Obj): Cost | undefined {
    if (o.zone !== 'trash') return undefined;
    return this.effects.find((e) => e.target === o.id && e.grantFlow && e.ver === o.zoneVersion)?.grantFlow;
  }
  /** Custo de Flow de `o` (impresso ou dado por efeito); undefined = não pode ser jogada do descarte por Flow. */
  flowCostOf(o: Obj): Cost | undefined {
    return this.script(o).flow ?? this.grantedFlow(o);
  }
  /** Novo (VEN): dá [Flow] com custo `cost` à carta `o` no descarte até o fim do turno ("give a spell in your trash [Flow]"). */
  grantFlow(o: Obj, cost: Cost) {
    if (o.zone !== 'trash') return;
    this.addEffect({ target: o.id, grantFlow: cost, until: 'turn', ver: o.zoneVersion });
    this.say(`${this.name(o)} ganha [Flow] ${this.costText(cost)} neste turno.`);
  }
  canPlayCard(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority'): boolean {
    const k = this.playKind(o); // novo: unit gear é jogado como unidade
    const kw = this.kw(o);
    const sc = this.script(o);
    if (k === 'legend' || k === 'battlefield' || k === 'rune') return false;
    if (sc.canPlay && !sc.canPlay(this, o, p)) return false;
    if (this.playBlocked(p, o, via)) return false;
    let locAdd: Cost = NO_COST; // novo (Vendetta): só há local pagando um custo adicional (Dragon Roost)
    if (k === 'unit') {
      if (timing !== 'main' && !kw.ambush && !kw.reaction && via !== 'hidden') return false;
      if (timing === 'main' && p !== this.active) return false;
      if (!this.unitLocations(p, o, via, timing).length) {
        const paid = this.paidLocations(p, o, via, timing);
        if (!paid.length) return false;
        locAdd = paid.reduce((m, x) => (x.cost.energy + x.cost.power.length < m.energy + m.power.length ? x.cost : m), paid[0].cost);
      }
    } else if (k === 'gear') {
      if (!this.timingOk(p, o, kw, timing, via === 'hidden')) return false;
      // Quick-Draw sem unidades: pode jogar, o gear fica solto na base (RiftJudge #438)
    } else if (k === 'spell') {
      if (!this.timingOk(p, o, kw, timing, via === 'hidden')) return false;
      if (sc.spell) {
        const c = this.ctx(o, p, { hiddenBf: via === 'hidden' ? (o.loc as any).i : undefined });
        if (!this.hasLegalTargets(sc.spell, c)) return false;
      }
    }
    // custo mais barato possível, com os custos opcionais que reduzem (Brazen Buccaneer, Kraken Hunter, Ledros)
    const base0 = this.baseCostFor(o, via);
    const cost = this.cheapestCost(p, o, { base: base0, add: locAdd, plain: [], post: [] });
    // novo (mind): ou ignorando o custo de energia por uma permissão (Jayce, Man of Progress)
    const alt = this.playPermsFor(p, o, via).length ? this.cheapestCost(p, o, { base: { ...base0, energy: 0 }, add: locAdd, plain: [], post: [] }) : null;
    // novo (UNL mind): custo alternativo da própria carta (Jhin, Meticulous Killer)
    const own = this.altCostFor(p, o, via);
    const alt2 = own ? this.cheapestCost(p, o, { base: own, add: locAdd, plain: [], post: [] }) : null;
    if (!this.asPayFor(this.playUse(o), () => this.canPay(p, cost, k === 'spell') || (!!alt && this.canPay(p, alt, k === 'spell')) || (!!alt2 && this.canPay(p, alt2, k === 'spell')))) return false;
    if (sc.mandatoryCost && !sc.mandatoryCost.canPay(this, o, p)) return false;
    return true;
  }
  /**
   * Novo (interface): por que `o` não pode ser jogada agora (a mesma checagem de canPlayCard, na mesma ordem, só que
   * dizendo o motivo). null = pode. Não muda nada na partida.
   */
  playBlockReason(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority'): string | null {
    const k = this.playKind(o);
    const kw = this.kw(o);
    const sc = this.script(o);
    if (k === 'legend' || k === 'battlefield' || k === 'rune') return 'não é carta de jogar';
    if (sc.canPlay && !sc.canPlay(this, o, p)) return 'a condição da própria carta para jogá-la não foi cumprida';
    if (this.playBlocked(p, o, via)) return 'um efeito em jogo impede jogar esta carta agora';
    const when = timing === 'priority' ? 'com a pilha aberta só entram cartas com [Reaction]' : timing === 'focus' ? 'no showdown só entram cartas com [Action] ou [Reaction]' : '';
    if (k === 'unit') {
      if (timing !== 'main' && !kw.ambush && !kw.reaction && via !== 'hidden') return `unidade só se joga na sua fase principal, com a pilha vazia (${when})`;
      if (timing === 'main' && p !== this.active) return 'não é o seu turno';
      if (!this.unitLocations(p, o, via, timing).length && !this.paidLocations(p, o, via, timing).length) return 'não há local válido para jogar esta unidade';
    } else if (k === 'gear' || k === 'spell') {
      if (!this.timingOk(p, o, kw, timing, via === 'hidden')) return timing === 'main' ? 'não é o seu turno' : when;
      if (k === 'spell' && sc.spell) {
        const c = this.ctx(o, p, { hiddenBf: via === 'hidden' ? (o.loc as any).i : undefined });
        if (!this.hasLegalTargets(sc.spell, c)) return 'não há alvo válido para ela agora';
      }
    }
    if (!this.canPlayCard(p, o, via, timing)) {
      if (sc.mandatoryCost && !sc.mandatoryCost.canPay(this, o, p)) return sc.mandatoryCost.label;
      const cost = this.cheapestCost(p, o, { base: this.baseCostFor(o, via), add: NO_COST, plain: [], post: [] });
      return `recursos insuficientes: custa ${this.costText(cost)}`;
    }
    return null;
  }
  canActivate(p: P, o: Obj, a: ActivatedDef, timing: 'main' | 'focus' | 'priority'): boolean {
    const t = a.timing || 'main';
    if (timing === 'main' && p !== this.active) return false;
    if (timing === 'focus' && t === 'main') return false;
    if (timing === 'priority' && t !== 'reaction') return false;
    if (a.exhaustSelf && o.exhausted) return false;
    if (a.spendBuffSelf && o.buffs <= 0) return false;
    if (a.condition && !a.condition(this, o)) return false;
    const c = this.ctx(o, p);
    if (!this.hasLegalTargets(a, c)) return false;
    const cost = typeof a.cost === 'function' ? a.cost(c) : a.cost || NO_COST;
    if (!this.asPayFor(this.abilityUses(o), () => this.abilityCostOptions(p, o, a, cost).some((x) => this.canPay(p, x)))) return false;
    if (a.canPayExtra && !a.canPayExtra(c)) return false;
    return true;
  }
  movableUnits(p: P): Obj[] {
    return this.units().filter((u) => u.controller === p && !u.exhausted && !this.cantMoveBy(u, p) && this.moveDests([u]).length > 0);
  }
  moveDests(us: Obj[]): Loc[] {
    const sets = us.map((u) => {
      const l = u.loc!;
      const out: Loc[] = [];
      if (l.t === 'base') this.bfs.forEach((_, i) => out.push({ t: 'bf', i }));
      else {
        out.push({ t: 'base', p: u.controller });
        if (this.kw(u).ganking) this.bfs.forEach((_, i) => i !== l.i && out.push({ t: 'bf', i }));
        // novo (UNL): permissões de auras ("Units can move here from anywhere", Baron Pit)
        else
          this.bfs.forEach((_, i) => {
            const to: Loc = { t: 'bf', i };
            if (i !== l.i && this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.allowMove?.(this, src, u, l, to)))) out.push(to);
          });
      }
      return out.filter((to) => !this.moveBlocked(u, l, to, null)); // Vilemaw's Lair (movimento padrão: não é spell nem habilidade)
    });
    if (!sets.length) return [];
    return sets[0].filter((l) => sets.every((s) => s.some((x) => this.locEq(x, l))));
  }

  // ───────────────────────────── executar ações ─────────────────────────────
  *doAction(p: P, id: string, timing: 'main' | 'focus' | 'priority'): Gen {
    const [verb, oid, via] = id.split(':');
    if (verb === 'play') yield* this.playCard(p, this.objs[oid], via, timing);
    else if (verb === 'hide') yield* this.hide(p, this.objs[oid]);
    else if (verb === 'act') {
      const o = this.objs[oid];
      const a = (this.script(o).activated || [])[Number(via)];
      yield* this.activate(p, o, a);
    } else if (verb === 'actb') {
      // habilidade emprestada: via = "<id da fonte>.<índice>"
      const [fid, k] = via.split('.');
      const a = (this.script(this.objs[fid]).activated || [])[Number(k)];
      yield* this.activate(p, this.objs[oid], a);
    } else if (verb === 'acte') {
      // novo (VEN): habilidade dada por efeito (TempEffect.grantAct): via = id do efeito
      const o = this.objs[oid];
      const ga = this.grantedActs(o).find((x) => String(x.e.id) === via);
      if (!ga) throw new IllegalAction('Essa habilidade não está mais disponível.');
      yield* this.activate(p, o, ga.a);
    } else if (verb === 'equip') yield* this.equip(p, this.objs[oid]);
    else if (verb === 'move') yield* this.standardMove(p);
  }
  /** Novo (VEN): habilidades ativadas que efeitos deram a `o` (TempEffect.grantAct; Dominus). */
  grantedActs(o: Obj): { e: TempEffect; a: ActivatedDef }[] {
    const out: { e: TempEffect; a: ActivatedDef }[] = [];
    if (o.zone !== 'board') return out;
    for (const e of this.effects) {
      if (e.target !== o.id || !e.grantAct) continue;
      const a = (getScript(e.grantAct.code)?.activated || [])[e.grantAct.index];
      if (a) out.push({ e, a });
    }
    return out;
  }
  /** Novo (VEN): dá a `o` (no tabuleiro) a habilidade ativada `activated[index]` do script `code` até o fim do turno (Dominus). */
  grantActivated(o: Obj, code: string, index: number, until: 'turn' | 'combat' | 'perm' = 'turn') {
    if (o.zone !== 'board') return;
    this.addEffect({ target: o.id, grantAct: { code, index }, until });
  }
  /** Novo (Vendetta): "empower it" (fica Empowered se não estiver; com `max`, conta até N vezes — Kayle, Justified). */
  empowerObj(o: Obj, p: P, max = this.empowerMax(o)): boolean {
    // revisão VEN-082/VEN-134: a permissão "até N vezes" (Kayle, Justified: EmpowerSpec.max) vale para qualquer
    // instrução de Empower, não só a da própria habilidade (441.1.c.1)
    const n = o.empowered ? Math.max(1, (o as any).empowerCount ?? 1) : 0;
    if (n >= max) return false;
    (o as any).empowerCount = n + 1;
    o.empowered = true;
    this.say(`${this.name(o)} fica Empowered.`, p);
    this.emit({ type: 'empower', obj: o, player: p });
    return true;
  }
  /** Novo (Vendetta): "disempower it". */
  disempower(o: Obj): boolean {
    if (!o.empowered) return false;
    // revisão VEN-082/VEN-134: quem pode ficar Empowered várias vezes perde só um status por Disempower (FAQ oficial do
    // Vendetta, Kayle, Justified; RiftJudge #11752); nos outros o status é binário (441.1.a)
    const left = Math.max(1, (o as any).empowerCount ?? 1) - 1;
    o.empowered = left > 0;
    (o as any).empowerCount = left;
    this.say(left > 0 ? `${this.name(o)} perde um status de Empowered (fica com ${left}).` : `${this.name(o)} deixa de estar Empowered.`);
    return true;
  }
  /** Novo (revisão VEN-082): quantas vezes `o` pode ficar Empowered ("up to three times", Kayle: EmpowerSpec.max; padrão 1). */
  empowerMax(o: Obj): number {
    return Math.max(1, ...empowerSpecs(this.script(o)).map((s) => s.max ?? 1));
  }
  /** Vezes que está Empowered (Kayle, Justified). */
  empowerCount(o: Obj): number {
    return o.empowered ? ((o as any).empowerCount ?? 1) : 0;
  }
  *hide(p: P, o: Obj): Gen {
    const spots = this.hideSpots(p);
    const ids = yield* this.ask(
      p,
      'choose',
      `Esconder ${this.name(o)} em qual campo?`,
      spots.map((i) => ({ id: String(i), label: this.name(this.bfs[i].objId), obj: this.bfs[i].objId })),
      1,
      1,
      false,
      'location',
    );
    const i = Number(ids[0]);
    // custo de esconder: 1 power, ou uma alternativa (Teemo, Guerilla Warfare)
    const costs = this.hideCosts(p).filter((hc) => this.canPay(p, hc));
    if (!costs.length) throw new IllegalAction('Recursos insuficientes para esconder.');
    let hc = costs.find((x) => !x.energy && !x.power.length) || costs[0];
    if (costs.length > 1 && hc.power.length + hc.energy > 0) {
      const [k] = yield* this.ask(p, 'choose', 'Como pagar para esconder?', costs.map((x, j) => ({ id: String(j), label: [x.energy ? `${x.energy} de energia` : '', x.power.length ? `${x.power.length} power` : ''].filter(Boolean).join(' + ') })));
      hc = costs[Number(k)];
    }
    yield* this.payG(p, hc);
    this.removeFromArrays(o);
    o.zone = 'facedown';
    o.zoneVersion++;
    o.loc = { t: 'bf', i };
    o.hiddenTurn = this.turn;
    o.controller = p;
    this.bfs[i].facedown.push(o.id);
    this.say(`${this.pname(p)} esconde uma carta em ${this.name(this.bfs[i].objId)}.`, p);
    // novo (UNL calm): oponente que pode olhar as cartas viradas de p neste turno (Scuttle Crab)
    if (this.playerFlag(opp(p), 'seeFacedown'))
      this.sayTo([0, 1], `${this.pname(opp(p))} olha a carta escondida: ${this.name(o)}.`, `${this.pname(opp(p))} olha a carta escondida.`, opp(p));
    this.emit({ type: 'hide', obj: o, player: p, bf: i }); // novo (UNL fury): "quando você esconde uma carta" (Katarina, Reckless)
  }
  *standardMove(p: P): Gen {
    const movable = this.movableUnits(p);
    const chosen = yield* this.chooseObj(p, 'Quais unidades mover? (todas vão para o mesmo destino)', movable, 1, movable.length);
    // novo (UNL order): destino com custo aplicado que não dá para pagar não é opção (204.4.c)
    const dests = this.moveDests(chosen).filter((l) => {
      const ac = this.moveAppliedCost(chosen, l, p);
      return !(ac.energy || ac.power.length) || this.canPay(p, ac);
    });
    if (!dests.length) throw new IllegalAction('Essas unidades não têm destino em comum.');
    const ids = yield* this.ask(
      p,
      'choose',
      'Para onde?',
      dests.map((l, k) => ({ id: String(k), label: this.locName(l), obj: l.t === 'bf' ? this.bfs[l.i].objId : undefined })),
      1,
      1,
      false,
      'location',
    );
    const to = dests[Number(ids[0])];
    // novo (UNL order): custo aplicado ao movimento (204.4; Mageseeker Investigator): pago ao mover, sem pilha; sem
    // poder ou sem querer pagar, o movimento não pode ser feito (204.4.c)
    const ac = this.moveAppliedCost(chosen, to, p);
    if (ac.energy || ac.power.length) {
      if (!this.canPay(p, ac)) throw new IllegalAction(`Mover essas unidades para ${this.locName(to)} exige pagar ${this.costText(ac)}.`);
      if (!(yield* this.yesNo(p, `Mover ${chosen.length} unidades para ${this.locName(to)} exige pagar ${this.costText(ac)} (custo aplicado). Pagar?`)))
        throw new IllegalAction('Movimento cancelado: custo aplicado não pago.');
      yield* this.payG(p, ac);
    }
    const wasReady = chosen.filter((u) => !u.exhausted);
    for (const u of chosen) u.exhausted = true;
    for (const u of wasReady) this.emit({ type: 'exhaust', obj: u, player: u.controller, units: wasReady }); // novo (RAD): exaustão simultânea (mesmo formato de markExhausted)
    this.moveUnits(chosen, to, p, true);
  }
  *activate(p: P, o: Obj, a: ActivatedDef): Gen {
    const pre = function* (this: Engine, c: Ctx): Gen<boolean> {
      if (a.exhaustSelf) {
        if (o.exhausted) return false;
        this.markExhausted(o);
      }
      if (a.spendBuffSelf && !this.spendBuff(o)) return false;
      if (a.killSelf) yield* this.killG(o, 'é sacrificada');
      return true;
    }.bind(this);
    // novo (Vendetta): custo de energia da habilidade (o do texto, sem descontos de fora) para "activated ability with
    // Energy cost [7] or more" (Nasus, Curator of the Sands)
    const c0 = this.ctx(o, p);
    const energy = (a.baseCost ? a.baseCost(c0) : typeof a.cost === 'function' ? a.cost(c0) : a.cost || NO_COST).energy;
    const use = this.abilityUses(o);
    if (a.isAdd) {
      yield* this.asPayForG(use, this.activateAdd(p, o, a, pre));
      this.emit({ type: 'activate', obj: o, player: p, label: a.label, isAdd: true, ability: a, energy }); // novo (Prize of Progress)
      return;
    }
    if (yield* this.asPayForG(use, this.finalizeAbility(p, o, a, 'ability', undefined, pre))) this.emit({ type: 'activate', obj: o, player: p, label: a.label, ability: a, energy, empower: !!a.empower }); // novo
  }
  /** Habilidades de Add (regra 429.2): finalizam e resolvem na hora, sem pilha; o Focus não passa (429.2.a). */
  *activateAdd(p: P, o: Obj, a: ActivatedDef, pre: (c: Ctx) => Gen<boolean>): Gen {
    const c = this.ctx(o, p);
    if (a.prepare && !(yield* a.prepare(c))) throw new IllegalAction('Escolha inválida.');
    let cost = typeof a.cost === 'function' ? a.cost(c) : a.cost || NO_COST;
    cost = yield* this.chooseCostVariant(p, `${this.name(o)}: como aplicar os descontos do custo?`, this.abilityCostOptions(p, o, a, cost), (x) => this.canPay(p, x)); // novo (Vendetta)
    if (cost.energy || cost.power.length) yield* this.payG(p, cost);
    if (!(yield* pre(c))) throw new IllegalAction('Custo não pago.');
    if (a.extraCost && !(yield* a.extraCost(c))) throw new IllegalAction('Custo não pago.');
    this.say(`${this.name(o)}: ${a.label}.`, p);
    // novo: [Add] declarado em `adds` (Energy Conduit, Kai'Sa, Lux...): o motor põe no pool (com a marca "só para spells")
    const ad = a.addsFor ? a.addsFor(this, o) : a.adds; // novo (revisão VEN-075): addsFor
    if (ad) {
      const pw: (Domain | 'any')[] = [];
      for (const pip of ad.power || []) {
        if (pip.length >= DOMAINS.length) pw.push('any');
        else if (pip.length === 1) pw.push(pip[0]);
        else {
          const [d] = yield* this.ask(p, 'choose', `${this.name(o)}: adicionar power de qual domínio?`, pip.map((x) => ({ id: x, label: x })));
          pw.push(d as Domain);
        }
      }
      this.addResources(p, ad.energy || 0, pw, !!ad.onlySpells, !!ad.onlyGear, !!ad.onlyShowdown, ad.only);
    }
    yield* a.resolve(c);
    if (this.showdown && !this.chain.length) this.showdown.flipAfterChain = false;
  }
  /**
   * Ativa o Equip de `gear` (818): "[Custo]: anexe este gear a uma unidade que você controla". A unidade é alvo
   * (818.1.b.1: dispara 'chosen'); o custo (que pode depender da unidade, ex.: Hextech Gauntlets) é pago depois de
   * escolher, como em toda ativação; a habilidade vai para a pilha e, ao resolver, anexa (818.2: 'attach' com viaEquip).
   */
  *equip(p: P, gear: Obj): Gen {
    const bs = this.baseScript(gear);
    const a: AbilityDef = {
      label: 'Equip',
      targets: [
        {
          prompt: `Equip: anexar ${this.name(gear)} a qual unidade sua?`,
          cands: (c) => c.g.equipTargets(p, gear),
          filter: (c, u) => u.controller === c.p && c.g.isUnit(u),
        },
      ],
      choose: function* (c, ids) {
        c.data.equipUnit = ids[0]?.[0];
        return !!c.data.equipUnit;
      },
      extraCost: function* (c) {
        const g = c.g;
        const u = g.objs[c.data.equipUnit];
        const cost = g.equipCostFor(gear, u, p);
        if (!g.canPayEquip(p, gear, u, cost)) return false;
        if (cost.energy || cost.power.length) yield* g.payG(p, cost);
        if (bs.equipExtra && !(yield* bs.equipExtra.pay(g.ctx(gear, p, { data: { equipUnit: u.id } })))) return false;
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && gear.zone === 'board') c.g.attach(gear, u, c.p, { viaEquip: true });
      },
    };
    if (yield* this.asPayForG('gearAbility', this.finalizeAbility(p, gear, a, 'ability'))) this.emit({ type: 'activate', obj: gear, player: p, label: 'Equip', equip: true, energy: (bs.equipCost || NO_COST).energy });
  }
  /**
   * Novo: escolhas de custo ao jogar (355.1.a) e custo total na ordem da regra 356: custo base (impresso, Flow,
   * "por X", "ignorando o custo"...), custos adicionais (Accelerate, custos opcionais, Repeat; Deflect é obrigatório),
   * depois aumentos e descontos. Para spells, também a preparação e os alvos. Vale para jogar da mão e por efeito
   * (419.3.b: todos os passos como normais). `free`: ignorando todos os custos (sem Accelerate/Repeat).
   */
  /** Novo (VEN): "ignore Deflect while paying this spell's cost" (CardScript.ignoreDeflectCost): vale durante a escolha de alvos e custos desta jogada. */
  private ignoreDeflectNow = false;
  private *chooseCosts(
    p: P,
    o: Obj,
    c: Ctx,
    b0: CostBuild,
    free = false,
    allFree = false,
  ): Gen<{ cost: Cost; ready: boolean; targetIds: string[][]; repeatIds?: string[][]; moreRepeatIds?: string[][][] }> {
    const prev = this.ignoreDeflectNow;
    this.ignoreDeflectNow = !!this.script(o).ignoreDeflectCost;
    try {
      return yield* this.chooseCostsInner(p, o, c, b0, free, allFree);
    } finally {
      this.ignoreDeflectNow = prev;
    }
  }
  private *chooseCostsInner(
    p: P,
    o: Obj,
    c: Ctx,
    b0: CostBuild,
    free = false,
    // novo (UNL chaos): "ignorando todo e qualquer custo" (356.5.a, Bone Skewer): as escolhas de custos adicionais
    // opcionais continuam (355.1.a), mas o custo total é [0], inclusive os não padrão (o `pay` deles não é feito)
    allFree = false,
  ): Gen<{ cost: Cost; ready: boolean; targetIds: string[][]; repeatIds?: string[][]; moreRepeatIds?: string[][][] }> {
    const k = this.playKind(o);
    const sc = this.script(o);
    const kw = this.kw(o);
    // novo (SFD): palavras-chave dadas à carta enquanto é jogada (Rek'Sai, Breacher: Accelerate fora da mão)
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) this.mergeKw(kw, a.playKeywords?.(this, src, o, p));
    const forSpell = k === 'spell';
    const ocs = this.usableOptionalCosts(p, o);
    let b: CostBuild = { ...b0, plain: [...b0.plain], post: [...b0.post] };
    let ready = false;
    if (k === 'unit' && kw.accelerate && !free) {
      // [C]: power do domínio da unidade; sem domínio, qualquer; com vários, qualquer um deles (135.2.e.6)
      const dom = this.data(o).domains.length ? this.data(o).domains : DOMAINS;
      const acc: Cost = { energy: 1, power: [[...dom]] };
      // novo (SFD): descontos de componente no custo adicional opcional (Ezreal, Prodigy; 356.4.c)
      const withAccOf = (a: Cost): CostBuild => ({ ...b, add: this.addCost(b.add, a) });
      const accOk = (a: Cost) => allFree || this.canPay(p, this.cheapestCost(p, o, withAccOf(a)), forSpell);
      const accVars = this.addCostVariants(p, o, 'accelerate', acc);
      // oferece se der para pagar contando os descontos que ainda podem ser escolhidos (Kraken Hunter)
      if (accVars.some(accOk) &&
        (yield* this.yesNo(p, `Pagar Accelerate (${this.costText(acc)}) para ${this.name(o)} entrar pronta?`))) {
        b = withAccOf(yield* this.chooseCostVariant(p, `Accelerate de ${this.name(o)}: qual desconto usar?`, accVars, accOk));
        ready = true;
      }
    }
    for (let i = 0; i < ocs.length; i++) {
      const oc = ocs[i];
      const tOf = (oCost?: Cost): CostBuild => ({
        ...b,
        add: oCost ? this.addCost(b.add, oCost) : b.add,
        plain: oc.energyMod ? [...b.plain, oc.energyMod] : [...b.plain],
        post: [...b.post],
      });
      const testOk = (oCost?: Cost) => {
        const test: CostBuild = tOf(oCost);
        if (oc.maxPowerCut) {
          const n = oc.maxPowerCut(this, o, p);
          test.post.push((x) => this.cutPower(x, n)); // Kraken Hunter
        }
        if (oc.best) {
          const f = oc.best;
          test.post.push((x) => f(this, o, p, x)); // Commander Ledros
        }
        return this.canPay(p, this.cheapestCost(p, o, test, i + 1), forSpell);
      };
      // novo (SFD): descontos de componente no custo adicional opcional (Ezreal, Prodigy; 356.4.c)
      const ocVars = oc.cost ? this.addCostVariants(p, o, 'optional', oc.cost) : [undefined];
      if (!allFree && !ocVars.some((v) => testOk(v))) continue;
      if (!(yield* this.yesNo(p, `${this.name(o)}: ${oc.label}`))) continue;
      const ocPick = oc.cost ? yield* this.chooseCostVariant(p, `${this.name(o)}: qual desconto usar no custo adicional?`, ocVars as Cost[], (v) => testOk(v)) : undefined;
      const t = tOf(ocPick);
      c.data[oc.flag] = true;
      b = t;
      if (oc.enterReady) ready = true; // novo (UNL chaos): "If you do, I enter ready" (Crescent Guardian)
      if (oc.pay && !allFree) {
        c.data.costSoFar = this.totalCost(b, p, o); // custo até aqui (Commander Ledros calcula o mínimo de unidades)
        this.payingFor = { src: o, p }; // matar como custo é atribuído à carta jogada (regra 428.1.a.1)
        const ok = yield* oc.pay(c);
        this.payingFor = undefined;
        if (!ok) throw new IllegalAction('Custo opcional não pago.');
      }
      if (oc.powerCut) {
        const n = oc.powerCut(c);
        b.post.push((x) => this.cutPower(x, n)); // Kraken Hunter
      }
      if (oc.adjust) {
        const f = oc.adjust;
        b.post.push((x) => f(c, x)); // Commander Ledros
      }
    }
    let targetIds: string[][] = [];
    const reps: string[][][] = []; // alvos de cada execução extra do Repeat
    const repDefl = () => reps.reduce((acc, ids) => this.addCost(acc, this.deflectCost(ids, p)), this.deflectCost(targetIds, p));
    if (k === 'spell' && sc.spell) {
      if (sc.spell.prepare && !(yield* sc.spell.prepare(c))) throw new IllegalAction('Escolha inválida.');
      // novo (SFD): custo com o Deflect dos alvos para checar o que dá para pagar (os descontos ao total, como o de
      // Vex, Cheerless, também valem para o Deflect: FAQ riftjudge #10609)
      // novo (UNL order): com os alvos escolhidos (desconto "se você escolher...", Undying Loyalty; selfCostMod)
      const costWith = (bb: CostBuild, ids: string[][]) =>
        this.totalCost({ ...bb, defl: this.deflectCost(ids, p), chosen: [...new Set(ids.flat())].map((id) => this.objs[id]) }, p, o);
      targetIds = yield* this.chooseTargets(sc.spell, c, this.totalCost(b, p, o), true, (ids) => costWith(b, ids));
      // Repeat (820): cada instância (a impressa e as dadas por efeito, ex.: Temporal Portal — grantRepeat) é paga ou
      // não separadamente e executa as instruções mais uma vez, com escolhas próprias (820.1.c.2, 820.2.a, 820.3);
      // descontos de componente (Ezreal, Prodigy; Marai Spire) valem para cada uma (356.4.c)
      const repCosts = free ? [] : this.repeatCostsFor(p, o);
      for (let r = 0; r < repCosts.length; r++) {
        const rc = repCosts[r];
        const withRepOf = (x: Cost): CostBuild => ({ ...b, add: this.addCost(b.add, x) });
        const prevIds = [...targetIds, ...reps.flat()];
        const repOk = (x: Cost) => this.canPay(p, costWith(withRepOf(x), prevIds), true);
        const repVars = this.addCostVariants(p, o, 'repeat', rc);
        const nth = repCosts.length > 1 ? ` (${r + 1}º Repeat)` : '';
        // novo (mind): cada execução faz as próprias escolhas, inclusive o modo (820.2.a; FAQ riftjudge #9763):
        // `prepare` roda de novo com c.rep = número da execução (guarde as escolhas por c.rep)
        const cr: Ctx = { ...c, rep: reps.length + 1 };
        // novo (UNL fury): parte não de recursos do Repeat impresso (Square Up: "Discard 1"), paga junto (820.1.c.1)
        const rx = r === 0 && sc.repeat ? sc.repeatExtra : undefined;
        const rcText = rx ? (rc.energy || rc.power.length ? `${this.costText(rc)} + ${rx.label}` : rx.label) : this.costText(rc);
        if (repVars.some(repOk) &&
          (!rx || rx.canPay(this, o, p)) &&
          (sc.spell.prepare ? true : this.hasLegalTargets(sc.spell, cr)) &&
          (yield* this.yesNo(p, `Pagar Repeat${nth} (${rcText}) para repetir o efeito?`))) {
          if (sc.spell.prepare && (!(yield* sc.spell.prepare(cr)) || !this.hasLegalTargets(sc.spell, cr))) continue; // sem escolha possível: não paga
          b = withRepOf(yield* this.chooseCostVariant(p, `Repeat de ${this.name(o)}: qual desconto usar?`, repVars, repOk));
          const bRep = b;
          const tot = costWith(b, prevIds);
          reps.push(yield* this.chooseTargets(sc.spell, cr, tot, true, (ids) => costWith(bRep, [...prevIds, ...ids])));
          if (rx) {
            this.payingFor = { src: o, p };
            const ok = yield* rx.pay(cr);
            this.payingFor = undefined;
            if (!ok) throw new IllegalAction(`Repeat: ${rx.label}`);
          }
        }
      }
      // escolhas depois dos alvos, ao jogar (destinos de movimento, regra 355.4)
      if (sc.spell.choose) {
        if (!(yield* sc.spell.choose(c, targetIds))) throw new IllegalAction('Escolha inválida.');
        for (let r = 0; r < reps.length; r++)
          if (!(yield* sc.spell.choose({ ...c, rep: r + 1 }, reps[r]))) throw new IllegalAction('Escolha inválida.');
      }
    }
    // Deflect: custo adicional obrigatório de power (os descontos de energia não mexem nele)
    // novo (SFD): entra antes dos modificadores do custo total de spells (Vex, Irelia), que o jogador escolhe agora
    const defl = repDefl();
    let cost: Cost;
    {
      // novo (Vendetta): modificadores de power do custo total valem para qualquer carta (Mystic Vortex, Orianna)
      const chosen = [...new Set([...targetIds.flat(), ...reps.flat(2)])].map((id) => this.objs[id]);
      const raw = this.totalCost({ ...b, defl, rawSpell: true, chosen }, p, o); // novo (UNL order): chosen para selfCostMod
      const opts = this.spellCostOptions(p, o, raw, chosen);
      cost = yield* this.chooseCostVariant(p, `${this.name(o)}: como aplicar os descontos do custo?`, opts, (x) => this.canPay(p, x, forSpell));
    }
    if (allFree) cost = NO_COST; // novo (UNL chaos): 356.5.a
    return { cost, ready, targetIds, repeatIds: reps[0], moreRepeatIds: reps.length > 1 ? reps.slice(1) : undefined };
  }
  /** Novo (mind): permissões de jogar a carta da mão ignorando o custo de energia (TempEffect.playPerm; custo impresso, 206). */
  playPermsFor(p: P, o: Obj, via: string): TempEffect[] {
    if (via !== 'hand') return [];
    return this.effects.filter((e) => e.playPerm && e.player === p && this.isKind(o, e.playPerm.kind) && this.data(o).energy <= e.playPerm.maxEnergy);
  }
  /** Novo: custos de Repeat de `o` ao ser jogada por p: o impresso e os dados por efeitos "a próxima spell" (grantRepeat). */
  repeatCostsFor(p: P, o: Obj): Cost[] {
    const out: Cost[] = [];
    const r = this.script(o).repeat;
    if (r) out.push(r);
    out.push(...(this.script(o).repeatMore || [])); // novo (UNL legends): várias instâncias impressas (Curtain Call)
    for (const e of this.effects)
      if (e.grantRepeat && this.nextPlayMatches(e, o, p)) out.push(e.grantRepeat === 'printed' ? this.printedCost(o) : e.grantRepeat);
    // novo (UNL chaos): [Repeat] dado por habilidade estática (Syndra, Transcendent); cada instância é paga à parte (820.3)
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const rc = a.repeatGrant?.(this, src, o, p);
        if (rc) out.push(rc);
      }
    return out;
  }
  /** Jogar uma carta (mão, zona de campeão, escondida, Flow do descarte). */
  *playCard(p: P, o: Obj, via: string, timing: 'main' | 'focus' | 'priority', free = false): Gen {
    const k = this.playKind(o); // novo: unit gear é jogado como unidade (359.2.c)
    const sc = this.script(o);
    const kw = this.kw(o);
    const hiddenBf = via === 'hidden' ? (o.loc as any).i : undefined;
    const c = this.ctx(o, p, { hiddenBf });
    const forSpell = k === 'spell'; // [Add] "só para jogar spells"
    // 2. escolhas: local, custos opcionais, alvos
    let loc: Loc = { t: 'base', p };
    let locAdd: Cost | undefined; // novo (Vendetta): custo adicional do local (Dragon Roost)
    if (k === 'unit') {
      const normal = this.unitLocations(p, o, via, timing);
      const paid = this.paidLocations(p, o, via, timing, normal).filter(
        (x) => free || this.asPayFor('unit', () => this.canPay(p, this.cheapestCost(p, o, { base: this.baseCostFor(o, via), add: x.cost, plain: [], post: [] }))),
      );
      const locs = [...normal, ...paid.map((x) => x.loc)];
      if (!locs.length) throw new IllegalAction('Nenhum local válido para jogar esta unidade.');
      const ids = yield* this.ask(
        p,
        'choose',
        `Jogar ${this.name(o)} onde?`,
        locs.map((l, i) => ({
          id: String(i),
          label: i < normal.length ? this.locName(l) : `${this.locName(l)} (custo adicional ${this.costText(paid[i - normal.length].cost)})`,
          obj: l.t === 'bf' ? this.bfs[l.i].objId : undefined,
        })),
        1,
        1,
        false,
        'location',
      );
      const li = Number(ids[0]);
      loc = locs[li];
      if (li >= normal.length) locAdd = paid[li - normal.length].cost;
      c.data.ambushOnly = this.ambushOnlyLoc(p, o, loc, via, timing); // novo (UNL): checado de novo depois dos custos (822.3)
    } else if (k === 'gear' && hiddenBf !== undefined) {
      loc = { t: 'bf', i: hiddenBf }; // novo: gear escondido é jogado naquele campo (811.1.d.1.a); a limpeza o chama de volta (457.1)
    } else if (k === 'gear' && kw.deploy) {
      // Deploy: "Play this only to a battlefield" (texto lembrete da carta)
      const locs: Loc[] = this.bfs.map((_, i) => ({ t: 'bf', i }) as Loc);
      const ids = yield* this.ask(p, 'choose', `Jogar ${this.name(o)} onde? (Deploy)`, locs.map((l, i) => ({ id: String(i), label: this.locName(l), obj: l.t === 'bf' ? this.bfs[l.i].objId : undefined })), 1, 1, false, 'location');
      loc = locs[Number(ids[0])];
    }
    this.playingLoc = k === 'unit' || k === 'gear' ? loc : undefined;
    const b0: CostBuild = { base: free ? NO_COST : this.baseCostFor(o, via), add: NO_COST, plain: [], post: [] };
    // novo (Vendetta): custo adicional do local escolhido (opcional: descontos de componente valem, 356.4.c)
    if (locAdd && !free) b0.add = yield* this.chooseCostVariant(p, `${this.name(o)}: qual desconto usar no custo adicional?`, this.addCostVariants(p, o, 'optional', locAdd), () => true);
    const use = this.playUse(o); // novo (Vendetta): restrições de uso de recursos (Ornn, Renekton, Butcher, Iron Revenant)
    // novo (mind): permissão "jogue um gear da mão ignorando o custo de energia" (Jayce): o jogador escolhe usar (uma vez
    // só, FAQ riftjudge #10270); o custo base de energia vira 0 e o power continua (356.1.b.2)
    const perms = free ? [] : this.playPermsFor(p, o, via);
    if (perms.length) {
      const normalOk = this.asPayFor(use, () => this.canPay(p, this.cheapestCost(p, o, b0), forSpell));
      if (!normalOk || (yield* this.yesNo(p, `Jogar ${this.name(o)} ignorando o custo de energia (efeito deste turno, uso único)?`))) {
        b0.base = { ...b0.base, energy: 0 };
        this.effects = this.effects.filter((e) => e !== perms[0]);
      }
    }
    // novo (UNL mind): custo alternativo da própria carta ("you may play me for [C]", Jhin, Meticulous Killer)
    const own = free ? undefined : this.altCostFor(p, o, via);
    if (own) {
      const normalOk = this.asPayFor(use, () => this.canPay(p, this.cheapestCost(p, o, b0), forSpell));
      if (!normalOk || (yield* this.yesNo(p, `Jogar ${this.name(o)} pelo custo alternativo (${this.costText(own)}) em vez do custo normal?`))) b0.base = own;
    }
    // novo (UNL): escolhas "enquanto você me joga" (355.1; The List, Ivern, Friend to All) — antes dos custos
    if (sc.asPlayed && !(yield* sc.asPlayed(c))) throw new IllegalAction(`${this.name(o)}: escolha não feita.`);
    const { cost, ready, targetIds, repeatIds, moreRepeatIds } = yield* this.asPayForG(use, this.chooseCosts(p, o, c, b0, free));
    // 3. custo total (Deflect é custo adicional obrigatório)
    c.targets = targetIds.map((grp) => grp.map((id) => this.objs[id]).filter(Boolean)); // novo (RAD): o custo adicional vê os alvos já escolhidos (Parallel Convergence)
    if (sc.mandatoryCost) {
      if (!sc.mandatoryCost.canPay(this, o, p)) throw new IllegalAction(sc.mandatoryCost.label);
    }
    // 4. pagar
    if (!this.asPayFor(use, () => this.canPay(p, cost, forSpell))) throw new IllegalAction('Recursos insuficientes para pagar o custo total.');
    if (sc.mandatoryCost) {
      this.payingFor = { src: o, p }; // novo: matar como custo é atribuído à carta jogada (regra 428.1.a.1)
      const ok = yield* sc.mandatoryCost.pay(c);
      this.payingFor = undefined;
      if (!ok) throw new IllegalAction(sc.mandatoryCost.label);
    }
    yield* this.asPayForG(use, this.payG(p, cost, forSpell));
    this.notePaid(p, o); // novo (Vendetta): Aura.onPaid (descontos "uma vez por turno")
    this.playingLoc = undefined;
    // novo (UNL): 5. checar legalidade — local que só valia pelo Ambush precisa continuar valendo depois dos custos
    // (unidades de p lá, ou a permissão da carta); senão a jogada inteira é desfeita (822.3, 806.4.b, 813.4.b)
    if (k === 'unit' && c.data.ambushOnly && loc.t === 'bf' && !this.ambushBfs(p, o, c).includes(loc.i))
      throw new IllegalAction(`Ambush: ${this.pname(p)} não tem mais unidades em ${this.locName(loc)}.`);
    delete c.data.ambushOnly;
    if (k === 'spell') this.noteSpellSpend(p, cost); // novo (UNL mind): Jhin, Meticulous Killer
    if (k === 'spell') this.noteSpellEnergy(o, cost.energy); // novo (UNL fury): Revna
    // 5-6. finalizar
    o.playedFrom = o.zone; // novo (revisão VEN): zona de onde a carta é jogada (Kennen, Heart of the Tempest)
    this.removeFromArrays(o);
    o.controller = p;
    o.zone = 'chain';
    o.zoneVersion++;
    this.pl[p].played.push(o.id);
    const nx = this.takeNextPlay(p, o); // "a próxima carta que você jogar..."
    if (k === 'spell') o.data = { ...(o.data || {}), bonusDamage: nx.reduce((s, e) => s + (e.bonusDamage || 0), 0) };
    this.say(`${this.pname(p)} joga ${this.name(o)}.`, p, { kind: 'play', obj: o.id, code: o.code });
    if (k === 'unit') {
      const enterReady =
        nx.some((e) => e.enterReady) ||
        ready ||
        !!sc.entersReady?.(this, o, loc) || // loc (novo, UNL legends): Shadow
        this.playerFlag(p, 'unitsEnterReady') ||
        this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.enterReady?.(this, src, o, loc)));
      const playLoc = loc; // novo (revisão UNL legends): local da jogada, mesmo que entre em outro (FAQ do Baron Nashor)
      if (sc.enterLoc) loc = sc.enterLoc(this, o, p, loc); // novo (UNL chaos): substituição do local de entrada (Baron Nashor)
      this.putOnBoard(o, loc, enterReady);
      o.data = c.data as any;
      if (loc.t === 'bf') this.applyContested(loc.i, p);
      this.emit({ type: 'play', obj: o, player: p, loc, playLoc, via, data: c.data, nextFx: nx.map((e) => e.id) }); // nextFx (novo): efeitos "a próxima unidade" consumidos
    } else if (k === 'gear') {
      this.putOnBoard(o, loc, sc.entersReady ? sc.entersReady(this, o) : true); // gear "entra exaurido" (Iron Ballista)
      this.emit({ type: 'play', obj: o, player: p, loc, via, data: c.data });
    } else if (k === 'spell') {
      const item: ChainItem = {
        id: 'c' + this.nextId++,
        kind: 'spell',
        controller: p,
        sourceId: o.id,
        cardId: o.id,
        label: this.name(o),
        ability: sc.spell || { label: this.name(o), resolve: function* () {} },
        ctx: c,
        targetIds,
        targetVers: targetIds.map((g) => g.map((id) => this.objs[id].zoneVersion)),
        repeatIds,
        repeatVers: repeatIds?.map((g) => g.map((id) => this.objs[id].zoneVersion)),
        moreRepeats: moreRepeatIds?.map((ids) => ({ ids, vers: ids.map((g) => g.map((id) => this.objs[id].zoneVersion)) })),
        flow: via === 'flow',
        spentE: cost.energy, // novo (revisão UNL fury)
      };
      c.item = item;
      if (via === 'flow') (o.data ||= {}).flowBy = p; // revisão VEN-126..145: banir ao sair da pilha (toZone)
      this.pushChain(item);
    }
    // gatilhos de "jogar" (Darius, Trifarian): unidade/gear agora; spell ao terminar de resolver (419.4.a)
    if (k !== 'spell') this.emitCardPlayed(o, p, via);
  }
  /**
   * Novo (UNL mind): p gastou [4] ou mais de energia para jogar UM spell neste turno (Jhin, Meticulous Killer): conta o
   * custo total pago, com custos adicionais como Repeat (RiftJudge #10012), mesmo que o spell seja anulado depois
   * (FAQ oficial do Unleashed; #9920); energia de spells diferentes não soma (#10307); jogar de Hidden custa 0 (#10399).
   */
  noteSpellSpend(p: P, cost: Cost) {
    if (cost.energy >= 4) this.pl[p].bigSpell = this.turn;
  }
  /** Novo (Vendetta): p pagou o custo de jogar `o` (Aura.onPaid: Orianna, Mechanical Marvel "uma vez por turno"). */
  notePaid(p: P, o: Obj) {
    for (const src of this.auraSources()) for (const a of this.script(src).auras || []) a.onPaid?.(this, src, o, p);
  }
  /** Novo: evento 'cardPlayed' quando a jogada de uma carta termina (419.4.a); ev.nth = quantas no turno. */
  emitCardPlayed(o: Obj, p: P, via?: string) {
    const s = this.pl[p];
    s.completed = (s.completed || 0) + 1;
    this.emit({ type: 'cardPlayed', obj: o, player: p, via, nth: s.completed, from: o.playedFrom }); // from (novo, revisão VEN): zona de origem
  }
  /**
   * Jogar uma carta por efeito (ex.: Flame Chompers do descarte). `cost` é o custo base que o efeito dá ("ignorando o
   * custo" = 0, "por X"...); custos adicionais (Accelerate, opcionais) e descontos valem como ao jogar normalmente
   * (419.3.b). opts.discount: desconto de energia do próprio efeito (Reinforce: "reduzindo o custo em [5]").
   */
  *playFromEffect(p: P, o: Obj, cost: Cost, locHint?: Loc, opts: { recycleAfter?: boolean; discount?: number; data?: Record<string, any>; allFree?: boolean } = {}): Gen {
    // opts.allFree (novo, UNL chaos): "ignorando todo e qualquer custo" (356.5.a, Bone Skewer): custo total [0], inclusive
    // custos não padrão; as escolhas de custos adicionais opcionais (Accelerate...) continuam (355.1.a). Só permanentes.
    if (this.kind(o) === 'spell') {
      // spells jogados por efeito (Blind Fury, Kai'Sa, Ava...): alvos, Deflect e pilha
      if (this.playBlocked(p, o, 'effect')) return this.say(`${this.pname(p)} não pode jogar ${this.name(o)} agora.`, p);
      if (yield* this.playSpellFromEffect(p, o, cost, opts)) {
        const nx = this.takeNextPlay(p, o); // "a próxima carta que você jogar..."
        o.data = { ...(o.data || {}), bonusDamage: nx.reduce((sum, e) => sum + (e.bonusDamage || 0), 0) };
      }
      return;
    }
    const b0: CostBuild = { base: cost, add: NO_COST, plain: opts.discount ? [-opts.discount] : [], post: [] };
    const k = this.playKind(o); // novo: unit gear é jogado como unidade
    const use = this.playUse(o); // novo (Vendetta): restrições de uso de recursos
    if (!opts.allFree && !this.asPayFor(use, () => this.canPay(p, this.cheapestCost(p, o, b0)))) return;
    // jogador impedido de jogar: a carta fica onde está
    if (this.playBlocked(p, o, 'effect')) return this.say(`${this.pname(p)} não pode jogar ${this.name(o)} agora.`, p);
    const sc = this.script(o);
    const c = this.ctx(o, p);
    c.data = { ...(opts.data || {}) }; // dados passados por quem joga
    // spell escondido ou efeito de jogada de permanente escondida que joga uma unidade: naquele campo (811.1.d.3)
    const hb = this.resolvingItem?.ctx.hiddenBf;
    if (k === 'unit' && hb !== undefined) locHint = { t: 'bf', i: hb };
    // local exigido pelo efeito proibido (Mageseeker Warden): a jogada é impossível e é ignorada (regra 358.3.a)
    if (k === 'unit' && locHint && !this.playLocOk(p, o, locHint)) return this.say(`${this.pname(p)} não pode jogar ${this.name(o)} em ${this.locName(locHint)}.`, p);
    let loc: Loc = locHint && this.playLocOk(p, o, locHint) ? locHint : { t: 'base', p };
    if (k === 'unit' && !locHint) {
      const extra = [...(this.script(o).extraPlayBfs?.(this, o, p) || []), ...this.auraPlayBfs(p, o)]; // locais extras da carta (Deadbloom Predator, FAQ riftjudge #5654); novo (UNL body): de outra carta (Arachnoid Horror)
      // novo (revisão UNL body): o Ambush é permissão de local (822.1.c) e vale também jogada por efeito sem local fixo
      // (RiftJudge #11535: Dazzling Aurora + Rengar, Trophy Hunter); um local fixado pelo efeito não muda (#12689)
      if (this.kw(o).ambush) extra.push(...this.ambushBfs(p, o));
      const locs: Loc[] = [{ t: 'base', p }, ...this.bfs.map((_, i) => ({ t: 'bf', i }) as Loc).filter((l: any) => (this.bfs[l.i].controller === p || extra.includes(l.i) || (this.isOpenBf(l.i) && this.canPlayToOpen(p, o))) && this.playLocOk(p, o, l))];
      if (!this.playLocOk(p, o, locs[0])) locs.shift(); // novo (SFD): a base também pode ser proibida (Perched Grimwyrm)
      // novo (Vendetta): campos com custo adicional de local (Dragon Roost), também na jogada por efeito (419.3.b)
      const paid = opts.allFree ? [] : this.paidLocations(p, o, 'effect', 'effect', locs).filter((x) => this.asPayFor('unit', () => this.canPay(p, this.cheapestCost(p, o, { ...b0, add: x.cost }))));
      const n0 = locs.length;
      locs.push(...paid.map((x) => x.loc));
      if (!locs.length) return this.say(`${this.pname(p)} não tem onde jogar ${this.name(o)}.`, p); // novo (SFD): sem local válido, nada acontece (419.3.c)
      const ids = yield* this.ask(p, 'choose', `Jogar ${this.name(o)} onde?`, locs.map((l, i) => ({ id: String(i), label: i < n0 ? this.locName(l) : `${this.locName(l)} (custo adicional ${this.costText(paid[i - n0].cost)})`, obj: l.t === 'bf' ? this.bfs[l.i].objId : undefined })), 1, 1, false, 'location');
      const li = Number(ids[0]);
      loc = locs[li];
      if (li >= n0) b0.add = this.addCost(b0.add, paid[li - n0].cost);
    }
    // novo: custos adicionais/opcionais (Accelerate...) e descontos, como ao jogar normalmente
    // novo (UNL): escolhas "enquanto você me joga" (355.1) também quando jogada por efeito / ignorando os custos
    if (sc.asPlayed && !(yield* sc.asPlayed(c))) return;
    this.playingLoc = loc; // novo (Vendetta): local da jogada também por efeito (Hunters' Circle)
    const { cost: total, ready } = yield* this.asPayForG(use, this.chooseCosts(p, o, c, b0, false, !!opts.allFree));
    if (!opts.allFree && sc.mandatoryCost && !sc.mandatoryCost.canPay(this, o, p)) return this.say(`${this.name(o)}: ${sc.mandatoryCost.label}`, p);
    if (!this.asPayFor(use, () => this.canPay(p, total))) return this.say(`${this.pname(p)} não consegue pagar ${this.name(o)}.`, p);
    if (sc.mandatoryCost && !opts.allFree) {
      this.payingFor = { src: o, p };
      const okm = yield* sc.mandatoryCost.pay(c);
      this.payingFor = undefined;
      if (!okm) return;
    }
    yield* this.asPayForG(use, this.payG(p, total));
    this.notePaid(p, o); // novo (Vendetta): Aura.onPaid
    this.playingLoc = undefined;
    o.playedFrom = o.zone; // novo (revisão VEN): zona de onde a carta é jogada (Kennen, Heart of the Tempest)
    this.removeFromArrays(o);
    o.controller = p;
    o.zone = 'chain';
    o.zoneVersion++;
    this.pl[p].played.push(o.id);
    const nx = this.takeNextPlay(p, o); // "a próxima carta que você jogar..."
    if (k === 'unit') {
      const enterReady =
        ready ||
        nx.some((e) => e.enterReady) ||
        this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.enterReady?.(this, src, o, loc))) ||
        !!this.script(o).entersReady?.(this, o, loc) || // Warwick, Hunter; loc (novo, UNL legends): Shadow
        this.playerFlag(p, 'unitsEnterReady'); // Confront
      const playLoc = loc; // novo (revisão UNL legends): local da jogada (FAQ do Baron Nashor)
      if (sc.enterLoc) loc = sc.enterLoc(this, o, p, loc); // novo (UNL chaos): substituição do local de entrada (Baron Nashor)
      this.putOnBoard(o, loc, enterReady);
      o.data = c.data as any;
      if (loc.t === 'bf') this.applyContested(loc.i, p);
      this.say(`${this.pname(p)} joga ${this.name(o)}.`, p, { kind: 'play', obj: o.id, code: o.code });
      this.emit({ type: 'play', obj: o, player: p, loc, playLoc, via: 'effect', data: c.data, nextFx: nx.map((e) => e.id) });
    } else if (k === 'gear') {
      const gsc = this.script(o);
      this.putOnBoard(o, { t: 'base', p }, gsc.entersReady ? gsc.entersReady(this, o) : true);
      this.emit({ type: 'play', obj: o, player: p, via: 'effect', data: c.data });
    }
    this.emitCardPlayed(o, p, 'effect');
  }
  /** Jogar um spell por efeito (Kai'Sa, Ava Achiever, Promising Future): alvos, custo e pilha. Ignora o timing. */
  *playSpellFromEffect(p: P, o: Obj, cost: Cost, opts: { recycleAfter?: boolean; discount?: number; data?: Record<string, any> } = {}): Gen<boolean> {
    const sc = this.script(o);
    const ab: AbilityDef = sc.spell || { label: this.name(o), resolve: function* () {} };
    // spell escondido que joga outro spell: os alvos também ficam naquele campo (811.1.d.2)
    const c = this.ctx(o, p, { hiddenBf: this.resolvingItem?.ctx.hiddenBf });
    c.data = { ...(opts.data || {}) }; // dados passados por quem joga (ex.: Ava Achiever, "aqui")
    const b0: CostBuild = { base: cost, add: NO_COST, plain: opts.discount ? [-opts.discount] : [], post: [] };
    if (!this.canPay(p, this.cheapestCost(p, o, b0), true)) return false;
    if (!this.hasLegalTargets(ab, c)) {
      this.say(`${this.name(o)} não tem alvo válido e não é jogada.`);
      return false;
    }
    // novo: custos opcionais/adicionais (Repeat...), preparação e alvos como ao jogar normalmente (419.3.b)
    const { cost: total, targetIds, repeatIds, moreRepeatIds } = yield* this.chooseCosts(p, o, c, b0);
    c.targets = targetIds.map((grp) => grp.map((id) => this.objs[id]).filter(Boolean)); // novo (RAD): o custo adicional vê os alvos
    if (sc.mandatoryCost && !sc.mandatoryCost.canPay(this, o, p)) return false;
    if (!this.canPay(p, total, true)) return false;
    if (sc.mandatoryCost) {
      this.payingFor = { src: o, p };
      const okm = yield* sc.mandatoryCost.pay(c);
      this.payingFor = undefined;
      if (!okm) return false;
    }
    yield* this.asPayForG('spell', this.payG(p, total, true));
    this.notePaid(p, o); // novo (Vendetta): Aura.onPaid
    this.noteSpellSpend(p, total); // novo (UNL mind): Jhin, Meticulous Killer
    this.noteSpellEnergy(o, total.energy); // novo (UNL fury): Revna
    o.playedFrom = o.zone; // novo (revisão VEN): zona de onde a carta é jogada (Kennen, Heart of the Tempest)
    this.removeFromArrays(o);
    o.controller = p;
    o.zone = 'chain';
    o.zoneVersion++;
    this.pl[p].played.push(o.id);
    this.say(`${this.pname(p)} joga ${this.name(o)}.`, p, { kind: 'play', obj: o.id, code: o.code });
    const item: ChainItem = {
      id: 'c' + this.nextId++,
      kind: 'spell',
      controller: p,
      sourceId: o.id,
      cardId: o.id,
      label: this.name(o),
      ability: ab,
      ctx: c,
      targetIds,
      targetVers: targetIds.map((g) => g.map((id) => this.objs[id].zoneVersion)),
      repeatIds,
      repeatVers: repeatIds?.map((g) => g.map((id) => this.objs[id].zoneVersion)),
      moreRepeats: moreRepeatIds?.map((ids) => ({ ids, vers: ids.map((g) => g.map((id) => this.objs[id].zoneVersion)) })),
      recycleAfter: opts.recycleAfter,
      spentE: total.energy, // novo (revisão UNL fury)
    };
    c.item = item;
    this.pushChain(item);
    return true;
  }

  // ───────────────────────────── turno ─────────────────────────────
  *run(): Gen {
    // novo (modo Desafios): mesa montada no lugar da preparação; o primeiro turno começa na fase principal
    const sc = this.cfg.scenario;
    if (sc) applyScenario(this, sc);
    else yield* this.setup();
    for (let t = 0; t < 400 && this.winner === null; t++) {
      yield* this.takeTurn(!!sc && t === 0);
      if (this.winner !== null) break;
      this.active = this.nextTurnPlayer();
    }
  }
  /** Quem joga o próximo turno: turnos adicionais na fila vêm antes da alternância normal (regra 735). */
  nextTurnPlayer(): P {
    if (this.extraTurns.length) {
      // novo: o turno adicional entra na fila logo depois deste; a alternância normal continua depois dele
      // (ex.: Time Warp do oponente via Promising Future: [A > B* > B > A])
      if (this.afterExtra === null) this.afterExtra = opp(this.active);
      return this.extraTurns.shift()!;
    }
    if (this.afterExtra !== null) {
      const p = this.afterExtra;
      this.afterExtra = null;
      return p;
    }
    return opp(this.active);
  }
  *setup(): Gen {
    for (const p of [0, 1] as P[]) {
      const d = this.cfg.decks[p];
      const s = this.pl[p];
      const leg = this.newObj(d.legend, p, 'legend');
      s.legend = leg.id;
      // novo (RAD-167 Neeko): lendas escolhidas além da inicial ficam fora da partida até um efeito as pôr na Legend Zone
      if (d.extraLegends?.length) s.extraLegends = d.extraLegends.map((code) => this.newObj(code, p, 'setAside').id);
      const ch = this.newObj(d.champion, p, 'champion');
      s.champion = ch.id;
      for (const [code, n] of d.main) for (let i = 0; i < n; i++) s.mainDeck.push(this.newObj(code, p, 'mainDeck').id);
      for (const [code, n] of d.runes) for (let i = 0; i < n; i++) s.runeDeck.push(this.newObj(code, p, 'runeDeck').id);
      this.rng.shuffle(s.mainDeck);
      this.rng.shuffle(s.runeDeck);
    }
    // campos: cada jogador usa 1 dos 3
    for (const p of [0, 1] as P[]) {
      const opts = this.cfg.decks[p].battlefields;
      let code = opts[this.rng.int(opts.length)];
      if (this.cfg.battlefieldMode === 'choose' && opts.length > 1) {
        const ids = yield* this.ask(p, 'setup', `${this.pname(p)}: escolha o seu campo de batalha`, opts.map((c) => ({ id: c, label: cardData(c).name })));
        code = ids[0];
      }
      const o = this.newObj(code, p, 'battlefieldZone');
      this.bfs.push({ objId: o.id, owner: p, controller: null, contestedBy: null, facedown: [], capacity: 1 });
    }
    // ajustes dos campos ao entrar na partida (Bandle Tree, Aspirant's Climb)
    for (const b of this.bfs) this.script(this.objs[b.objId]).bfSetup?.(this, this.objs[b.objId]);
    this.say(`Campos: ${this.bfs.map((b) => this.name(b.objId)).join(' e ')}.`);
    this.first = this.cfg.firstPlayer === 'random' ? (this.rng.int(2) as P) : this.cfg.firstPlayer;
    this.active = this.first;
    this.say(`${this.pname(this.first)} começa.`);
    for (const p of [0, 1] as P[]) yield* this.draw(p, 4);
    for (const p of [this.first, opp(this.first)]) {
      const s = this.pl[p];
      const ids = yield* this.ask(
        p,
        'mulligan',
        `${this.pname(p)}: mulligan — escolha até 2 cartas para trocar (ou nenhuma)`,
        s.hand.map((id) => ({ id, label: this.name(id), obj: id })),
        0,
        2,
      );
      for (const id of ids) {
        const o = this.objs[id];
        this.removeFromArrays(o);
        o.zone = 'setAside';
      }
      yield* this.draw(p, ids.length);
      const back = this.rng.shuffle([...ids]);
      for (const id of back) this.recycleCard(this.objs[id]);
      if (ids.length) this.say(`${this.pname(p)} troca ${ids.length} carta(s).`, p);
    }
  }
  *takeTurn(fromMain = false): Gen {
    const p = this.active;
    this.turn++;
    this.scored = [];
    this.conqueredThisTurn = []; // novo (SFD)
    const s = this.pl[p];
    s.turns = (s.turns || 0) + 1; // novo (SFD): turnos que o jogador já começou
    s.played = [];
    s.discardedThisTurn = 0;
    this.pl[opp(p)].played = [];
    this.pl[opp(p)].discardedThisTurn = 0;
    s.unitDeaths = 0;
    this.pl[opp(p)].unitDeaths = 0;
    s.gearDeaths = 0;
    this.pl[opp(p)].gearDeaths = 0;
    s.completed = 0; // novo
    this.pl[opp(p)].completed = 0;
    for (const x of [s, this.pl[opp(p)]]) x.holdPoints = 0; // novo
    this.say(`── Turno ${this.turn}: ${this.pname(p)} ──`, p);
    // novo (modo Desafios): o turno montado começa direto na fase principal
    if (fromMain) {
      yield* this.mainPhase();
      if (this.winner !== null) return;
      yield* this.endingPhase();
      return;
    }
    // despertar
    this.phase = 'awaken';
    for (const o of this.board())
      if (o.controller === p && !(this.isUnit(o) && this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.noAwaken?.(this, src, o))))) {
        // evento 'ready' para o que estava exaurido (415.3.a: o jogador prepara; Pirate's Haven)
        if (o.exhausted) this.ready(o, p);
        if (!this.script(o).cantBeReadied?.(this, o)) o.exhausted = false; // novo (UNL chaos): Maduli não se prepara
      }
    for (const l of this.legendsOf(p)) l.exhausted = false; // novo (Neeko): todas as lendas da Legend Zone
    // caça (gatilhos): gatilhos do despertar ("quando você prepara") vão para a pilha e resolvem antes de a fase de início
    // começar (319.2: limpeza na troca de fase; 335: só se avança sem itens pendentes)
    yield* this.drain();
    if (this.winner !== null) return;
    // início
    this.phase = 'beginning';
    // caça (gatilhos): Temporary é um gatilho (816.1.b-c) que vai para a pilha com os outros gatilhos do início da fase (o
    // controlador escolhe a ordem, 383.3.d) e resolve antes de pontuar; enquanto está na pilha, dá para responder.
    // Anexado: texto inativo, não dispara (722.2)
    for (const o of this.board().filter((x) => x.controller === p && this.activeKw(x).temporary && !this.temporaryBlocked(x)))
      this.pending.push({ controller: p, sourceId: o.id, ability: TEMPORARY, ev: { type: 'beginStart', player: p, ver: o.zoneVersion }, label: TEMPORARY.label });
    this.emit({ type: 'beginStart', player: p });
    yield* this.drain();
    if (this.winner !== null) return;
    for (let i = 0; i < this.bfs.length; i++) {
      if (this.bfs[i].controller === p && this.unitsAtBf(i, p).length) yield* this.score(p, i, 'hold');
    }
    yield* this.drain();
    if (this.winner !== null) return;
    // canalizar
    this.phase = 'channel';
    const extra = p !== this.first && !this.firstChannelDone[p] ? 1 : 0;
    this.firstChannelDone[p] = true;
    // novo (Vendetta): limite de runas canalizadas (Aura.channelLimit: Sandstone Chimera, "players only channel 1 rune")
    let nCh = 2 + extra;
    for (const src of this.auraSources())
      for (const a of this.script(src).auras || []) {
        const lim = a.channelLimit?.(this, src, p);
        if (lim !== undefined) nCh = Math.min(nCh, lim);
      }
    this.channel(p, nCh);
    // comprar (novo, Vendetta: Aura.skipPhase pula a fase, Endless Riches "Skip your draw phase")
    this.phase = 'draw';
    if (!this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.skipPhase?.(this, src, p, 'draw')))) yield* this.draw(p, 1);
    if (this.winner !== null) return;
    yield* this.mainPhase();
    if (this.winner !== null) return;
    yield* this.endingPhase();
  }
  *mainPhase(): Gen {
    const p = this.active;
    this.phase = 'main';
    this.pl[0].pool = { energy: 0, power: {} };
    this.pl[1].pool = { energy: 0, power: {} };
    this.emit({ type: 'mainStart', player: p });
    yield* this.settle();
    yield* this.mainLoop();
  }
  /** Laço de ações da fase principal (ponto onde a IA copia a partida). */
  *mainLoop(): Gen {
    const p = this.active;
    while (this.winner === null) {
      const opts = this.actionOptions(p, 'main');
      const ids = yield* this.ask(p, 'action', `Turno ${this.turn} — ${this.pname(p)}: o que fazer?`, [...opts, this.manualPayOpt(p)], 1, 1, true);
      if (ids[0] === 'end') {
        // nas simulações da IA, para aqui para avaliar a mesa no fim do turno
        if (this.simHorizon) yield { player: p, kind: 'confirm', prompt: '__horizon', options: [{ id: 'ok', label: 'ok' }], min: 1, max: 1 };
        break;
      }
      if (ids[0] === '__refresh') continue;
      if (ids[0] === MANUAL_PAY) {
        this.toggleManualPay(p);
        continue;
      }
      yield* this.doAction(p, ids[0], 'main');
      yield* this.settle();
    }
  }
  *endingPhase(): Gen {
    const p = this.active;
    this.phase = 'ending';
    this.emit({ type: 'turnEnd', player: p });
    yield* this.settle(); // novo: settle (e não só drain) para abrir showdowns/combates criados no fim do turno
    if (this.winner !== null) return;
    for (const u of this.units()) {
      u.damage = 0;
      u.stunned = false;
      u.prevent = 0;
    }
    this.effects = this.effects.filter((e) => e.until === 'perm');
    this.delayed = this.delayed.filter((d) => d.untilTurn === undefined || d.untilTurn > this.turn);
    this.pl[0].pool = { energy: 0, power: {} };
    this.pl[1].pool = { energy: 0, power: {} };
    yield* this.cleanupG();
    // novo (SFD): gatilhos disparados na expiração (ex.: unidade volta a ser Mighty quando um -Might expira, RiftJudge
    // #11929) resolvem ainda neste turno; depois a expiração recomeça (317.2.f)
    if (this.pending.length && this.winner === null) {
      yield* this.drain();
      this.effects = this.effects.filter((e) => e.until === 'perm');
      this.pl[0].pool = { energy: 0, power: {} };
      this.pl[1].pool = { energy: 0, power: {} };
    }
  }
  /** Novo (UNL mind): o Temporary de `o` não dispara (Aura.noTemporary: LeBlanc, Everywhere at Once). */
  temporaryBlocked(o: Obj): boolean {
    return this.auraSources().some((src) => (this.script(src).auras || []).some((a) => a.noTemporary?.(this, src, o)));
  }
  /** Continua a partida a partir de uma decisão de ação da fase principal (usado em cópias). */
  *resumeFromMain(): Gen {
    yield* this.mainLoop();
    if (this.winner !== null) return;
    yield* this.endingPhase();
    for (let t = 0; t < 400 && this.winner === null; t++) {
      this.active = this.nextTurnPlayer();
      yield* this.takeTurn();
    }
  }
  /**
   * Copia o estado da partida numa decisão de ação da fase principal (pilha vazia, sem showdown).
   * A cópia continua com `resumeFromMain()`. Usada pela IA para testar jogadas.
   */
  cloneAtRoot(): Engine {
    if (this.chain.length || this.pending.length || this.showdown || this.phase !== 'main')
      throw new Error('cloneAtRoot só funciona numa decisão de ação da fase principal');
    const e: Engine = Object.create(Engine.prototype);
    Object.assign(e, this);
    // novo (revisão UNL legends): cfg é mutável na partida (Aspirant's Climb: victoryScore; substituído pelo Brush do
    // Ivern, bfTeardown) — a cópia não pode mexer no da partida de verdade
    e.cfg = { ...this.cfg };
    e.objs = structuredClone(this.objs);
    e.pl = structuredClone(this.pl);
    e.bfs = structuredClone(this.bfs);
    e.effects = structuredClone(this.effects);
    e.delayed = this.delayed.map((d) => ({ ...d }));
    e.scored = [...this.scored];
    e.conqueredThisTurn = [...this.conqueredThisTurn]; // novo (SFD)
    e.firstChannelDone = [...this.firstChannelDone] as [boolean, boolean];
    e.extraTurns = [...this.extraTurns];
    e.applyingReps = new Set(); // novo (370.2): estado só de uma substituição em andamento
    e.log = [];
    e.chain = [];
    e.pending = [];
    e.rng = Object.assign(Object.create(Object.getPrototypeOf(this.rng)), this.rng);
    return e;
  }
}

// ───────────────────────────── anexos: texto inativo e texto de efeito (Spiritforged, lote motor) ─────────────────────────────
/** Partes do script que continuam valendo numa carta anexada: palavras-chave para referência (722.1), Equip para o
 *  Weaponmaster (725.3) e o próprio texto de efeito. Gatilhos, ativadas, auras e substituições ficam inativos (718.2). */
const INACTIVE_KEEP = ['code', 'keywords', 'equipCost', 'equipFor', 'equipExtra', 'equipTiming', 'equipped', 'notes'] as const;
const INACTIVE = new WeakMap<CardScript, CardScript>();
function inactiveView(s: CardScript): CardScript {
  let v = INACTIVE.get(s);
  if (!v) {
    v = { code: s.code };
    for (const k of INACTIVE_KEEP) if (s[k] !== undefined) (v as any)[k] = s[k];
    INACTIVE.set(s, v);
  }
  return v;
}
/** Scripts com texto de efeito acrescentado, por "carta#gear=código,..." (as funções só guardam o id do equipamento). */
const MERGED = new Map<string, CardScript>();
/** Marca c.gear (o equipamento, 136.2.d) em toda chamada de uma habilidade vinda de texto de efeito. */
function withGearCtx<T extends object>(def: T, gid: string): T {
  const out: any = {};
  for (const [k, v] of Object.entries(def)) {
    if (typeof v === 'function')
      out[k] = function (this: any, ...args: any[]) {
        for (const a of args) if (a && typeof a === 'object' && a.g instanceof Engine && 'rep' in a) a.gear = a.g.objs[gid];
        return (v as any).apply(this, args);
      };
    else if (k === 'targets' && Array.isArray(v)) out[k] = v.map((spec) => withGearCtx(spec, gid));
    else out[k] = v;
  }
  return out;
}
/** Funções de aura/substituição vindas de texto de efeito recebem o equipamento como último argumento extra. */
function withGearArg<T extends object>(def: T, gid: string): T {
  const out: any = {};
  for (const [k, v] of Object.entries(def)) {
    if (typeof v === 'function') out[k] = (...args: any[]) => (v as any)(...args, (args[0] as Engine).objs[gid]);
    else out[k] = v;
  }
  return out;
}

// ───────────────────────────── habilidades de palavras-chave ─────────────────────────────
const VISION: AbilityDef = {
  label: 'Vision (olhar o topo do deck e decidir se recicla)',
  resolve: function* (c) {
    yield* c.g.predict(c.p, 1);
  },
};
/**
 * Weaponmaster (821): "Quando você me joga, você pode escolher um Equipamento que você controla (pode já estar anexado,
 * 725.3). Pague o custo do Equip dele com [A] a menos para anexá-lo a esta unidade." A escolha é feita ao pôr o gatilho
 * na pilha (821.1.b: o gatilho "escolhe"; jogada a partir de Hidden: no mesmo campo, 811.1.d.2); o pagamento, ao
 * resolver. O desconto tira só um pip [A] (Equip sem [A] paga inteiro, 821.1.c.3, RiftJudge #9599) — energia e custos
 * não de recursos (Blade of the Ruined King, Last Rites) são pagos inteiros (#10704). Sem Equip ou sem como pagar: nada acontece (821.1.c.4-5). Não é
 * ativar o Equip e a unidade não é escolhida (821.1.c.6). Cada instância dispara separada (821.1.c.7).
 */
const WM_SPEC: TargetSpec = {
  prompt: 'Weaponmaster: qual Equipamento seu? (pode estar anexado a outra unidade)',
  kind: 'gear',
  filter: (c, o) => o.controller === c.p && c.g.isEquipment(o),
};
const WEAPONMASTER: AbilityDef = {
  label: 'Weaponmaster',
  prepare: function* (c) {
    const g = c.g;
    if (c.self.zone !== 'board' || !g.targetCandidates(c, WM_SPEC).length) return false;
    return yield* g.yesNo(c.p, `${g.name(c.self)} — Weaponmaster: anexar um Equipamento seu a esta unidade pagando o Equip com [A] a menos?`);
  },
  targets: [WM_SPEC],
  resolve: function* (c) {
    const g = c.g;
    const eq = c.targets[0][0];
    const u = c.self;
    if (!eq || eq.zone !== 'board' || u.zone !== 'board' || !g.isUnit(u)) return;
    if (eq.attachedTo === u.id) return; // já está nesta unidade: anexar não faria nada (434.1.g)
    if (!g.hasEquip(eq)) return g.say(`${g.name(eq)} não tem custo de Equip: o Weaponmaster não consegue anexá-lo.`, c.p);
    const cost = g.weaponmasterCost(eq, u, c.p);
    // pagar pelo Weaponmaster não ativa o Equip (821.1.c.6): não é "usar habilidade de gear", então recursos "só para
    // gear" (o [Add] do Ornn, Fire Below the Mountain) não pagam
    if (!g.canPayEquip(c.p, eq, u, cost, false)) return g.say(`Weaponmaster: não dá para pagar o Equip de ${g.name(eq)}; ele fica onde está.`, c.p);
    if (cost.energy || cost.power.length) yield* g.payG(c.p, cost);
    const ex = g.baseScript(eq).equipExtra;
    if (ex) {
      g.payingFor = { src: eq, p: c.p };
      const ok = yield* ex.pay(g.ctx(eq, c.p, { data: { equipUnit: u.id, weaponmaster: true } })); // novo (RAD-150): parte em [Rune] com [A] a menos
      g.payingFor = undefined;
      if (!ok) return;
    }
    if (eq.zone === 'board' && u.zone === 'board') g.attach(eq, u, c.p);
  },
};
/**
 * Quick-Draw (819): [Reaction] + "Quando você joga isto, anexe-o a uma unidade que você controla". Obrigatório (RiftJudge
 * #11367); sem unidade sua, o gatilho não tem alvo e não vai para a pilha: fica solto na base (#438).
 * Não paga o Equip (#8528). Mais de uma instância não faz nada a mais (819.2).
 * Revisão SFD (calm e legends): anexar em si não escolhe (434.3), mas a unidade citada no texto do gatilho é alvo
 * (355.10, 355.5.b), escolhida ao pô-lo na pilha (RiftJudge #2996, #3886, #9577, #9963, #10749;
 * riftboundfaq.com/mechanics/equipment): dispara "quando você me escolhe" (Irelia, Fervent; Irelia, Blade Dancer) e,
 * se o alvo ficar inválido antes de resolver (Gust), o gear fica solto. Jogado a partir de Hidden, o alvo tem de estar
 * naquele campo (efeito de jogada, 811.1.d.2).
 */
const QUICKDRAW: AbilityDef = {
  label: 'Quick-Draw: anexar a uma unidade sua',
  targets: (c) => [
    {
      prompt: `Quick-Draw: anexar ${c.g.name(c.self)} a qual unidade sua?`,
      filter: (cc, u) => u.controller === cc.p,
    },
  ],
  resolve: function* (c) {
    const g = c.g;
    const gear = c.self;
    const u = c.targets[0]?.[0];
    if (gear.zone !== 'board' || !u || u.zone !== 'board') return;
    g.attach(gear, u, c.p);
  },
};
/** Caça (gatilhos): Temporary (816.1.b): "no início da Beginning Phase do controlador, antes de pontuar, mate isto". */
const TEMPORARY: AbilityDef = {
  label: 'Temporary (morrer)',
  resolve: function* (c) {
    const o = c.self;
    // se saiu do tabuleiro (e voltou), é outro objeto (124): nada acontece
    if (o.zone === 'board' && o.zoneVersion === c.ev?.ver) yield* c.g.killG(o, 'expira (Temporary)');
  },
};
const DISARM: AbilityDef = {
  label: 'Disarm',
  targets: (c) => [
    {
      prompt: 'Disarm: escolha uma unidade inimiga aqui',
      filter: (cc, u) => u.controller !== cc.p && cc.g.bfIndex(u) === cc.g.bfIndex(cc.self),
    },
  ],
  resolve: function* (c) {
    const u = c.targets[0][0];
    if (u) c.g.giveMight(u, -(c.g.kw(c.self).disarm || 1));
  },
};

export { opp };

/** Novo (UNL, lote motor): as tags que existem no Riftbound (regra 763.1; "Miss, Fortune" do documento é Miss Fortune). */
const TAGS_763 = [
  'Ahri', 'Akali', 'Akshan', 'Ambessa', 'Anivia', 'Annie', 'Aphelios', 'Ashe', 'Azir', 'Bandle City', 'Bard', 'Bilgewater', 'Bird',
  'Blitzcrank', 'Caitlyn', 'Cat', 'Darius', 'Demacia', 'Demon', 'Diana', 'Dog', 'Dr. Mundo', 'Dragon', 'Draven', 'Ekko', 'Elite',
  'Equipment', 'Evelynn', 'Ezreal', 'Fae', 'Fiora', 'Fizz', 'Freljord', 'Galio', 'Gangplank', 'Garen', 'Heimerdinger', 'Hwei',
  'Icathia', 'Illaoi', 'Ionia', 'Irelia', 'Ivern', 'Ixtal', 'Janna', 'Jax', 'Jayce', 'Jhin', 'Jinx', "Kai'Sa", 'Karma', 'Karthus',
  'Katarina', 'Kathkan', 'Kayle', 'Kayn', 'Kennen', "Kha'Zix", "Kog'Maw", 'LeBlanc', 'Lee Sin', 'Leona', 'Lillia', 'Lucian', 'Lux',
  'Malzahar', 'Master Yi', 'Mech', 'Mel', 'Miss Fortune', 'Morgana', 'Mount Targon', 'Nami', 'Nasus', 'Nidalee', 'Nilah',
  'Nocturne', 'Noxus', 'Ornn', 'Piltover', 'Pirate', 'Poppy', 'Poro', 'Pyke', 'Qiyana', 'Recruit', "Rek'Sai", 'Rell',
  'Renata Glasc', 'Renekton', 'Rengar', 'Riven', 'Rumble', 'Sentinel', 'Sett', 'Shadow Isles', 'Shen', 'Shurima', 'Sivir', 'Sona',
  'Soraka', 'Spider', 'Spirit', 'Swain', 'Syndra', 'Taric', 'Teemo', 'The Void', 'Trifarian', 'Tryndamere', 'Twisted Fate',
  'Udyr', 'Vayne', 'Vex', 'Vi', 'Viktor', 'Volibear', 'Warwick', 'Xerath', 'Xin Zhao', 'Yasuo', 'Yone', 'Yordle', 'Yuumi', 'Zaun',
  'Zed', 'Zilean',
];
