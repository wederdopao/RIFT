// Interface que cada carta implementa. Um arquivo por carta em src/cards/<set>/.
//
// ── Mecânicas do Unleashed (lote motor) — como escrever ──
// XP (728-733): é do jogador (g.pl[p].xp), pública, não zera nunca (nem no fim do turno) e não tem limite.
//   - ganhar: g.gainXp(p, n, fonte?) (emite 'gainXp'); "se você ganhou XP neste turno": g.gainedXpThisTurn(p) > 0.
//   - gastar como custo: helpers xpCost(n) (habilidade ativada/gatilho: "Spend 2 XP: ..."), xpOptionalCost(n, flag)
//     ("You may spend 3 XP as an additional cost"), xpEquipExtra(n) (Equip — Spend 1 XP). Gastar fora de custo
//     ("you may pay 2 XP to ..." na resolução): if (g.canSpendXp(p, 2) && (yield* g.yesNo(...))) yield* g.spendXpG(p, 2).
// Level (824) e Legion (812) são palavras-chave dependentes (727): o texto depois do [>] fica INATIVO até a condição.
//   - passivas (Might, palavras-chave, custo, entrar pronta, auras): cheque dentro da função: g.levelReached(self, 3)
//     (XP do controlador da carta; na mão, quem joga: g.levelReached(self, 3, p)); g.legion(self, p).
//   - gatilho dependente: a condição em `cond` (avaliada quando o evento acontece, 727.1.c.1; não é checada de novo
//     na resolução). Gatilho "quando você me joga" dependente: use `triggers` com on 'play' + cond, ou onPlay com prepare.
//   - ativada dependente: `condition` (só pode ser ativada com a condição; já na pilha, segue, 727.1.c.3.a).
//   - parte de spell ("[Level 6] ... instead"): cheque na resolução com g.level(c.p, 6).
// Hunt (823): só `keywords: { hunt: N }` — o motor põe o gatilho "quando eu conquisto ou seguro, meu controlador ganha N
//   XP" na pilha (soma as instâncias, 823.2). Aura.triggerExtra conta Hunt como efeito de conquista e de hold.
// Ambush (822): `keywords: { ambush: true }`; "I can [Ambush] to ..." = CardScript.ambushBfs.
// Cópia (477.1.b): g.becomeCopy(o, fonte) — copia os traços impressos (nome, tipo, tags, custo, domínio, Might impresso,
//   texto); buffs, equipamentos e efeitos dados à fonte não são copiados (RiftJudge #9410, #10239).
// Substituir (438)/Criar (439): g.replaceWith(alvo, códigoDaFicha, p), g.swapBackG(p, ficha), g.replacedCards(ficha),
//   g.createBattlefield(código, p). Nomear (759-763): g.nameTagG, g.nameCardG, g.nameTypeG. Dar tag: g.giveTag.
import type { Engine, ChainItem, GameEvent } from './engine';
import type { Cost, Domain, Gen, Keywords, Loc, Obj, P } from './types';

export interface Ctx {
  g: Engine;
  self: Obj; // fonte (carta, habilidade, campo)
  p: P; // controlador do efeito
  targets: Obj[][]; // alvos legais na resolução, por especificação
  item?: ChainItem;
  ev?: GameEvent;
  data: Record<string, any>; // memória entre finalizar e resolver
  hiddenBf?: number; // jogada a partir de Hidden: alvos presos a este campo
  rep: number; // repetição (Repeat): 0 = normal, 1 = segunda execução (2, 3... com mais instâncias de Repeat, regra 820.3)
  /** Novo: equipamento cujo texto de efeito deu esta habilidade à unidade (`self`); "this" no texto de efeito (136.2.d). */
  gear?: Obj;
}

export type TargetKind = 'unit' | 'gear' | 'permanent' | 'spell' | 'battlefield' | 'trash' | 'facedown' | 'rune' | 'object' | 'chainItem'; // object: tabuleiro + lendas; chainItem (novo): spell ou habilidade na pilha

export interface TargetSpec {
  prompt: string;
  kind?: TargetKind; // padrão: unit
  filter?: (c: Ctx, o: Obj) => boolean;
  bfFilter?: (c: Ctx, i: number) => boolean; // kind battlefield
  min?: number; // padrão 1
  max?: number; // padrão 1
  /** Novo: o próprio texto exclui o campo da carta escondida (ex.: "em outro local"): a restrição de Hidden não vale (811.1.d.2). */
  ignoreHidden?: boolean;
  /** Novo: candidatos fora das zonas padrão do `kind` (ex.: zona de campeão + tabuleiro, Teemo, Swift Scout). */
  cands?: (c: Ctx) => Obj[];
}

export interface AbilityDef {
  label: string;
  /** "você pode" no início do efeito: perguntado ao finalizar. */
  optional?: string;
  /** Escolhas feitas antes dos alvos (modos, "escolha um"). Retorna false para cancelar. */
  prepare?: (c: Ctx) => Gen<boolean>;
  targets?: TargetSpec[] | ((c: Ctx) => TargetSpec[]);
  /** Custo pago ao finalizar (gatilhos com "pague X" e habilidades ativadas). */
  cost?: Cost | ((c: Ctx) => Cost);
  /** Custos não padrão (gastar buff, descartar...). Retorna false se não pôde pagar. */
  extraCost?: (c: Ctx) => Gen<boolean>;
  canPayExtra?: (c: Ctx) => boolean;
  /**
   * Escolhas feitas ao finalizar, depois dos alvos (ex.: destino de um movimento, regra 355.4). `ids` = alvos
   * escolhidos. Guarde a escolha em c.data (use c.rep para separar a cópia do Repeat). Retorna false para cancelar.
   * Mystic Reversal chama de novo para refazer a escolha (regra 752.1).
   */
  choose?: (c: Ctx, ids: string[][]) => Gen<boolean>;
  /** Resolve mesmo se todos os alvos ficaram ilegais (regra 359.3.e.5: as outras instruções ainda valem). */
  alwaysResolve?: boolean;
  resolve: (c: Ctx) => Gen;
}

export type EventType =
  | 'play' // carta jogada (unidade/gear ao entrar; spell ao terminar de resolver — regra 419.4.a: gatilhos de "jogar" disparam na resolução)
  | 'move'
  | 'conquer'
  | 'hold'
  | 'attack'
  | 'defend'
  | 'die'
  | 'discard'
  | 'combatStart'
  | 'combatEnd'
  | 'beginStart'
  | 'mainStart'
  | 'turnEnd'
  | 'buff'
  | 'stun'
  | 'returnToHand'
  | 'empower'
  | 'draw'
  | 'chosen'
  | 'kill'
  | 'ready' // algo exaurido foi preparado (ev.obj, ev.player = quem preparou)
  | 'recycle' // carta (não runa) reciclada para o deck: { obj, player = dono, by = quem recicla, batch = ação }
  | 'damage' // unidade recebeu dano: { unit, amount, source }
  | 'cardPlayed' // qualquer carta jogada (sem fichas); spells: ao terminar de resolver (419.4.a); ev.nth = quantas jogadas completas no turno
  | 'leave' // novo: permanente saiu do tabuleiro por qualquer motivo: { obj, loc, controller, to, attached } (Treasure Trove)
  | 'spendBuff' // novo: buff gasto: { unit, player = quem gasta } (Fae Dragon)
  | 'combatWin' // novo (SFD): um jogador venceu o combate (regra 466.3.a): { bf, player = vencedor, units = ids das unidades dele lá }
  // ── novos (Spiritforged, lote motor) ──
  | 'attach' // carta anexada (434): { obj = gear, unit = carta do topo, player = quem anexou, prev = unidade anterior, viaEquip (818.2: "equipou") }
  | 'detach' // carta desanexada (435): { obj = gear, unit = carta do topo de antes, player, reason: 'effect' | 'reattach' | 'leave' }
  | 'activate' // habilidade ativada usada (Equip, [Add], Gold...): { obj = fonte, player, label, isAdd }
  | 'abilityUsed' // novo (mind): habilidade ativada que resolveu pela pilha (377.2.a): { obj = fonte, player, ability } (Prize of Progress)
  | 'mighty' // unidade "fica Mighty" (709: Might passa de menos de 5 para 5 ou mais no tabuleiro): { unit, player = controlador }
  | 'mightReach' // novo (VEN): Might de uma unidade passa de menos de N para N ou mais (como 'mighty'): { unit, player, threshold } — o gatilho diz o N em TriggerDef.threshold (Renekton, Brute: 10)
  | 'recycleRune' // novo (SFD): runa reciclada para o deck de runas: { obj, player = dono, by = quem recicla }
  | 'showdownStart' // novo (UNL mind): um showdown começa num campo (344, 464.2.b), combate ou não: { bf, player = quem disputou } (Diana, Lunari)
  // ── novos (Unleashed, lote motor) ──
  | 'gainXp' // jogador ganhou XP (730.1): { player, amount, source? } — "se você ganhou XP neste turno": g.gainedXpThisTurn(p)
  | 'spendXp' // jogador gastou XP (730.2), como custo ou não: { player, amount, source? }
  | 'replace' // objeto substituído por uma ficha ou trocado de volta (438): { obj (mesmo id), from, to = códigos, player, swapBack? }
  | 'banish' // novo (Vendetta): carta banida: { obj, player = dono } (Zed, Master of Shadows)
  | 'mightReduce' // novo (RAD): Might de uma unidade reduzido por efeito: { unit, amount (<0), by = controlador do efeito }
  | 'exhaust' // novo (RAD): permanente ficou exaurido: { obj, player = controlador, units = os que exauriram juntos }
  | 'hide'; // novo (UNL fury): carta escondida (Hidden): { obj, player = quem escondeu, bf } (Katarina, Reckless)

export interface TriggerDef extends AbilityDef {
  on: EventType | EventType[];
  cond?: (c: Ctx, ev: GameEvent) => boolean;
  /** Onde a fonte precisa estar: board (padrão), trash (ex.: "quando você me descarta"), self (morte: olha para trás). */
  zone?: 'board' | 'trash' | 'self';
  /** Novo: quem controla o gatilho, quando não é o controlador da fonte (regra 190.6.c: campo que diz qual jogador escolhe). */
  controller?: (g: Engine, src: Obj, ev: GameEvent) => P | null;
  /** Novo (VEN): com on 'mightReach', o limiar N de "quando meu Might fica N ou mais" (padrão 5). */
  threshold?: number;
  /** Novo (UNL mind): gatilho que adiciona recursos: resolve assim que é finalizado, sem ficar na pilha (429.2; Blue Sentinel). */
  immediate?: boolean;
  /**
   * Novo: com `optional`, há algo que o efeito possa fazer agora? false = o "você pode" não é perguntado e o gatilho sai
   * da pilha, como se recusado (383.3.a.2). Alvos sem candidato e custo de recursos impagável o motor já confere sozinho.
   */
  possible?: (c: Ctx) => boolean;
}

export interface ActivatedDef extends AbilityDef {
  exhaustSelf?: boolean; // [Tap]
  killSelf?: boolean; // "Kill this"
  spendBuffSelf?: boolean; // "Spend my buff"
  timing?: 'main' | 'action' | 'reaction';
  isAdd?: boolean; // adiciona recursos: resolve na hora
  /**
   * Novo (Vendetta, motor de custos): esta é a habilidade da palavra-chave [Empower] (827): o motor cria uma por instância a
   * partir de `CardScript.empower` (não escreva à mão). Descontos "[Empower] costs ..." (Risen Altar) olham para isto.
   */
  empower?: boolean;
  /** Novo (Vendetta): custo de energia da habilidade para efeitos que o leem ("activated ability with Energy cost [7] or
   *  more", Nasus, Curator of the Sands): o do texto (com o que o próprio texto muda, 827.1.c.3), sem descontos de fora. */
  baseCost?: (c: Ctx) => Cost;
  /** "[Tap]: Add [domínio]" (Seals): o pagamento automático exaure a fonte para pagar um pip destes domínios. */
  addPower?: Domain[] | Domain;
  /** [Add] geral (Kai'Sa, Darius...): o que a habilidade adiciona; addPower equivale a { power: [addPower] }. */
  adds?: { energy?: number; power?: Domain[][]; onlySpells?: boolean; onlyGear?: boolean; convert?: 'energyToPower' | 'powerToEnergy'; onlyShowdown?: boolean; only?: PayUse[] };
  // only (novo, Vendetta): restrição de uso genérica do recurso adicionado ("Spend this Energy only to play units or
  // activated abilities of units": ['unit', 'unitAbility'], Renekton, Butcher; "only to play units or gear": ['unit',
  // 'gear'], Iron Revenant). onlySpells = ['spell']; onlyGear = ['gear', 'gearAbility'] (Ornn).
  // onlyShowdown (novo, UNL legends): "Spend this Energy only during showdowns" (Diana, Scorn of the Moon): parte do pool
  // que só paga custos durante um showdown (pool.showdownOnly).
  // onlyGear (novo): "Use only to play gear or use gear abilities" (Ornn). convert (novo): "pague qualquer quantidade de
  // energia para adicionar esse tanto de [A]" (Ancient Henge: energyToPower) ou o contrário (Hextech Anomaly:
  // powerToEnergy): o pagamento automático escolhe a quantidade e paga a conversão junto; a ativação manual continua
  // pela própria habilidade (prepare/cost/resolve da carta).
  condition?: (g: Engine, self: Obj) => boolean;
  /** Resolve na hora, sem passar pela pilha (habilidades de Add, ex.: Lux, Crownguard). */
  immediate?: boolean;
  /** Novo: o pagamento automático não usa esta fonte de [Add] por aqui (a Gold já entra no pagamento pelo caminho dela). */
  notAutoPay?: boolean;
}

/**
 * Novo (Vendetta, motor de custos): para que um pagamento serve (restrições de uso de recursos, ActivatedDef.adds.only):
 * jogar unidade/gear/spell, ou habilidade ativada de unidade/gear/lenda/campo.
 */
export type PayUse = 'unit' | 'gear' | 'spell' | 'unitAbility' | 'gearAbility' | 'legendAbility' | 'otherAbility';

/** Novo (Vendetta): modificação de custo de recursos (energia e pips de power) de uma carta ou habilidade. */
export interface CostMod {
  energyMore?: number; // [N] a mais
  energyLess?: number; // [N] a menos
  powerMore?: number; // N × [Rune] a mais (qualquer domínio)
  powerLess?: number; // N × [Rune] a menos (o jogador escolhe quais pips)
  either?: number; // N descontos "[1] ou [Rune]" (o jogador escolhe cada um)
  energyMin?: number; // com energyLess: "até um mínimo de N" (356.4.e, vale só para este desconto)
}

/**
 * Novo (Vendetta): uma instância de [Empower] (827): "[Custo]: Empower this. Use only if not Empowered." O motor cria
 * a habilidade ativada (pilha, evento 'activate', descontos de habilidade). Várias instâncias = várias habilidades
 * (827.3; "[Empower] — [1] or [Body]" = duas).
 */
export interface EmpowerSpec {
  /** Custo de recursos; função = texto que altera o custo de Empower (827.1.c.3: Baccai Sandspinner, Frostcoat Mother). */
  cost?: Cost | ((g: Engine, self: Obj, p: P) => Cost);
  /** [Tap] no custo (Questionable Tome, Hextech Disc, Platewyrm Egg, Boy Who Shattered Time). */
  exhaustSelf?: boolean;
  /** Custo não de recursos (Discard 1, matar uma unidade aliada, descartar um spell). */
  extra?: { label: string; canPay: (c: Ctx) => boolean; pay: (c: Ctx) => Gen<boolean> };
  /** "I can be Empowered up to three times" (Kayle, Justified): pode ativar enquanto empowerCount < max. */
  max?: number;
  /** Timing alterado pelo texto (827.1.c.4). */
  timing?: 'main' | 'action' | 'reaction';
}

export interface Aura {
  /** Might extra que a fonte dá a outra unidade (ou a si). */
  might?: (g: Engine, src: Obj, target: Obj) => number;
  keywords?: (g: Engine, src: Obj, target: Obj) => Keywords | undefined;
  /** Desconto de energia para cartas que um jogador joga. */
  costMod?: (g: Engine, src: Obj, card: Obj, p: P) => number; // negativo = mais barato
  /** Novo: desconto de energia "até um mínimo de N" (regra 356.4.e: o mínimo vale só para este desconto). */
  costModMin?: (g: Engine, src: Obj, card: Obj, p: P) => { amount: number; min: number } | undefined;
  /** Unidades que entram prontas. */
  enterReady?: (g: Engine, src: Obj, unit: Obj, loc?: Loc) => boolean; // loc (novo, Radiance): local da jogada (The Exile)
  /** Buffs valem +N extra (Stand United). */
  buffBonus?: (g: Engine, src: Obj, target: Obj) => number;
  /** Bonus Damage em dano de spells e habilidades (Annie, Fiery; Void Gate). `by` = quem controla a fonte do dano. */
  bonusDamage?: (g: Engine, src: Obj, target: Obj, source: Obj, by: P | null) => number;
  /** Novo (RAD): a unidade `o` não se prepara no despertar (Firebrand Raider: "Units don't ready during the Awaken Phase"). */
  noAwaken?: (g: Engine, src: Obj, o: Obj) => boolean;
  /**
   * Impede um movimento (ex.: Vilemaw's Lair: não pode ir daqui para a base). `by` (novo, VEN-073): controlador do spell
   * ou habilidade que move; null = movimento padrão (Jagged Cutlass: "can't be moved by enemy spells and abilities").
   */
  blockMove?: (g: Engine, src: Obj, unit: Obj, from: Loc, to: Loc, by: P | null) => boolean;
  /** Novo (UNL chaos): [Repeat] dado aos spells que p joga (Syndra, Transcendent: "your spells have [Repeat] [2][C]"). */
  repeatGrant?: (g: Engine, src: Obj, card: Obj, p: P) => Cost | undefined;
  /** Unidades que p joga podem ir para um campo aberto (Miss Fortune, Buccaneer). */
  playToOpen?: (g: Engine, src: Obj, unit: Obj, p: P) => boolean;
  /** Might negativo "até um mínimo de N" (Leona, Zealot). */
  mightFloor?: (g: Engine, src: Obj, target: Obj) => { might: number; floor: number } | undefined;
  /** Onde um jogador pode jogar uma unidade: false proíbe o local (Mageseeker Warden). */
  playLoc?: (g: Engine, src: Obj, p: P, card: Obj, loc: Loc) => boolean;
  /** Spells e habilidades não podem preparar o objeto (Mageseeker Warden). */
  blockReady?: (g: Engine, src: Obj, o: Obj) => boolean;
  /** Deathknells do jogador p disparam N vezes a mais (Karthus, Eternal). */
  deathknellExtra?: (g: Engine, src: Obj, p: P, dying?: Obj) => number;
  /** Impede um jogador de jogar uma carta (ex.: Noxus Saboteur). via: hand, hidden, champion, flow, effect. */
  blockPlay?: (g: Engine, src: Obj, card: Obj, p: P, via: string) => boolean;
  /** Custo alternativo para esconder uma carta com Hidden (Teemo, Swift Scout). */
  hideCost?: (g: Engine, src: Obj, p: P) => Cost | undefined;
  /** Novo: impede o processo de pontuar (conquista/hold) do jogador p no campo i (Forgotten Monument). */
  blockScore?: (g: Engine, src: Obj, p: P, i: number) => boolean;
  /** Novo: habilidades ativadas que a fonte concede a `holder` (Forge of the Fluft): índices em `activated` da fonte. */
  grantActivated?: (g: Engine, src: Obj, holder: Obj) => number[];
  /** Novo: energia extra que cada Gold de p adiciona (Renata Glasc, Chem-Baroness). */
  goldExtra?: (g: Engine, src: Obj, p: P) => number;
  /** Novo (SFD calm): o jogador p não pode ganhar pontos (Tianna Crownguard). Não impede pontuar o campo (FAQ #9615). */
  cantGainPoints?: (g: Engine, src: Obj, p: P) => boolean;
  // ── novos (UNL mind) ──
  /** O Temporary de `o` não dispara (LeBlanc, Everywhere at Once). Checado quando a fase de início começa (816.1.c). */
  noTemporary?: (g: Engine, src: Obj, o: Obj) => boolean;
  // ── novos (Spiritforged, lote motor) ──
  /**
   * Palavras-chave dadas a cartas em QUALQUER zona (mão, deck, descarte, tabuleiro...), ex.: Jax, Unmatched ("Your
   * Equipment everywhere have [Quick-Draw]"). `keywords` só vale no tabuleiro. (Para "enquanto é jogada", use playKeywords.)
   */
  keywordsAnywhere?: (g: Engine, src: Obj, card: Obj) => Keywords | undefined;
  /** Modifica a energia do custo de Equip de `gear` para a unidade `unit` (818.1.c.4); negativo = mais barato. */
  equipCostMod?: (g: Engine, src: Obj, gear: Obj, unit: Obj, p: P) => number;
  /** Novo: "não pode ser escolhida por spells e habilidades inimigas" (Ruin Runner). `by` = quem escolhe (inimigo do alvo). */
  cantBeChosen?: (g: Engine, src: Obj, target: Obj, by: P) => boolean;
  /** Novo (SFD): palavras-chave que uma carta tem enquanto p a joga (Rek'Sai, Breacher: Accelerate fora da mão). `card` ainda está na zona de origem. */
  playKeywords?: (g: Engine, src: Obj, card: Obj, p: P) => Keywords | undefined;
  /**
   * Novo (SFD): modificador do custo TOTAL de um spell que p joga, aplicado depois dos custos adicionais, Deflect
   * incluído (regras 356.3/356.4.d; FAQ riftjudge #10609, #11173). powerMore: +N pips de qualquer domínio; powerLess:
   * −N pips; either: N descontos "[1] ou [A]" (o jogador escolhe cada um). A energia vai por costMod/costModMin.
   * chosen: o que o spell escolheu (alvos, inclusive do Repeat); undefined = ainda sem alvos (estimativa otimista).
   * Ex.: Vex, Cheerless; Irelia, Graceful.
   */
  spellCostMod?: (g: Engine, src: Obj, card: Obj, p: P, chosen?: Obj[]) => { powerMore?: number; powerLess?: number; either?: number } | undefined;
  /**
   * Novo (SFD): desconto num custo adicional OPCIONAL que p paga (Accelerate, Repeat, custos "você pode ... como custo
   * adicional"), aplicado ao componente assim que ele entra no custo (regra 356.4.c; FAQ riftjudge #8415, #5499).
   * energy/power: desconto fixo; either: N descontos "[1] ou [A]" (o jogador escolhe). Ex.: Ezreal, Prodigy.
   */
  addCostMod?: (g: Engine, src: Obj, card: Obj, p: P, kind: 'accelerate' | 'repeat' | 'optional') => { energy?: number; power?: number; either?: number } | undefined;
  /**
   * Novo (UNL order): custo aplicado a um movimento (regra 204.4: pago quando o movimento acontece, sem pilha; quem não
   * pode ou não quer pagar não faz o movimento, 204.4.c). `units` = as que de fato se movem para `to`; `mover` = quem
   * move. Ex.: Mageseeker Investigator. Ver Engine.moveAppliedCost / moveUnitsG.
   */
  moveCost?: (g: Engine, src: Obj, units: Obj[], to: Loc, mover: P) => Cost | undefined;
  /** Novo (UNL calm): `unit` não causa dano de combate (Vilemaw: "unidades inimigas aqui com menos Might que eu"). */
  noCombatDamage?: (g: Engine, src: Obj, unit: Obj) => boolean;
  // ── novos (Unleashed, lote motor) ──
  /**
   * Gatilhos que disparam N vezes a mais: "Your conquer effects for conquering here trigger an additional time" (Red
   * Brambleback), "Your hold effects for holding here..." (Blue Sentinel). Chamado para cada habilidade disparada (inclusive
   * Hunt, que é efeito de conquista e de hold, 823.1.b, e efeitos atrasados) com o evento, a fonte da habilidade e o
   * controlador dela. Ex.: `(g, src, ev, from, ctrl) => ev.type === 'conquer' && ev.bf === g.bfIndex(src) && ctrl === src.controller ? 1 : 0`.
   */
  triggerExtra?: (g: Engine, src: Obj, ev: GameEvent, from: Obj, ctrl: P) => number;
  /** Permissão extra de movimento (Baron Pit: "Units can move here from anywhere"): true = `unit` pode ir de `from` para `to`. */
  allowMove?: (g: Engine, src: Obj, unit: Obj, from: Loc, to: Loc) => boolean;
  // ── novos (Unleashed, lote body) ──
  /** Qualquer quantidade de dano marcado por `p` em `unit` é letal (142.4.c; Elder Dragon). Vale na limpeza e na atribuição de combate. */
  anyDamageLethal?: (g: Engine, src: Obj, unit: Obj, p: P) => boolean;
  /**
   * Campos extras onde p pode jogar `unit` (permissão de local, 355.2.b; Arachnoid Horror: "unidades aliadas podem ser
   * jogadas num campo ocupado se uma unidade inimiga está sozinha lá"). Só dá local: fora da fase principal vale só para
   * quem já pode ser jogada naquele timing por outra permissão ([Reaction]); não estende o Ambush (riftboundfaq.com, Ambush).
   */
  extraPlayBfs?: (g: Engine, src: Obj, unit: Obj, p: P) => number[];
}

export interface Aura {
  /** Novo (RAD): runas exauridas a mais ao canalizar (Seraphic Wyvern). */
  channelExtra?: (g: Engine, src: Obj, p: P) => number;
  /** Novo (RAD): cartas escondidas a mais permitidas no campo i para p (Bushwhack Trap). */
  hideExtra?: (g: Engine, src: Obj, i: number, p: P) => number;
  // ── novos (Vendetta, motor de custos) ──
  /**
   * Modificador do custo TOTAL de qualquer carta que p joga (unidade, gear ou spell), como spellCostMod mas para todos os
   * tipos: power a mais/a menos, "[1] ou [Rune]", e energia (energyMore/energyLess/energyMin). `chosen` = alvos do spell.
   * Ex.: Mystic Vortex ([Rune] a mais para cartas com [Reaction]), Orianna, Mechanical Marvel ([1][Rune] a menos num gear).
   */
  cardCostMod?: (g: Engine, src: Obj, card: Obj, p: P, chosen?: Obj[]) => CostMod | undefined;
  /** Chamado quando p paga o custo de jogar `card` (para descontos "uma vez por turno": Orianna, Mechanical Marvel). */
  onPaid?: (g: Engine, src: Obj, card: Obj, p: P) => void;
  /**
   * Modificador do custo de uma habilidade ativada `a` de `holder` que p ativa (inclusive [Empower] e [Add]). Ex.: Risen
   * Altar ("[Empower] costs of your units here cost [1] or [Rune] less": either 1 com a.empower), Piltovan Forge.
   */
  abilityCostMod?: (g: Engine, src: Obj, holder: Obj, a: ActivatedDef, p: P) => CostMod | undefined;
  /**
   * Custo adicional que permite jogar a unidade `unit` num campo ("Any player may pay [Rune][Rune] as an additional cost
   * to play a Dragon. If they do, they play it to this battlefield", Dragon Roost): o campo vira opção de local, e
   * escolhê-lo (quando não seria permitido de outro jeito) acrescenta o custo (custo adicional opcional, 356.2).
   */
  locCost?: (g: Engine, src: Obj, unit: Obj, p: P) => { i: number; cost: Cost } | undefined;
  /**
   * Custos adicionais opcionais oferecidos por outra carta ao jogar `card` ("As an additional cost to play a spell, you
   * may exhaust me and three friendly units to reduce the cost of that spell by [2]", Starry-Eyed Songstress). A flag
   * deve ser única por fonte (ex.: `opt:${src.id}`).
   */
  grantOptionalCosts?: (g: Engine, src: Obj, card: Obj, p: P) => OptionalCost[] | undefined;
  /** O jogador p pula a fase (Endless Riches: "Skip your draw phase"). */
  skipPhase?: (g: Engine, src: Obj, p: P, phase: 'draw') => boolean;
  /** p pode jogar `card` do descarte (pelo custo normal; Endless Riches: "You may play cards from your trash"). */
  playFromTrash?: (g: Engine, src: Obj, card: Obj, p: P) => boolean;
  /**
   * Substituição de ir para o descarte (Endless Riches: "If a card would go to your trash from anywhere other than your
   * Main Deck, banish it instead"): 'banish' = vai para a zona de banidas no lugar. `from` = zona de origem.
   */
  trashReplace?: (g: Engine, src: Obj, card: Obj, from: string) => 'banish' | undefined;
  /** Máximo de runas que p canaliza no início da Channel Phase (Sandstone Chimera: 1). */
  channelLimit?: (g: Engine, src: Obj, p: P) => number | undefined;
  /** O item da pilha não pode ser anulado (Mel, Newly Awakened: "Your spells and abilities can't be countered"). */
  uncounterable?: (g: Engine, src: Obj, item: ChainItem) => boolean;
  /**
   * Might a mais dado por um spell/habilidade (`item`, controlado por `by`) a uma unidade (n = quanto ia dar; devolve o
   * acréscimo). Mel, Newly Awakened: -[Might] a uma unidade que ele escolhe dá -1 a mais.
   */
  mightGiveMod?: (g: Engine, src: Obj, unit: Obj, n: number, item: ChainItem | undefined, by: P | null) => number;
}

export interface OptionalCost {
  label: string; // pergunta exibida
  cost?: Cost;
  canPay?: (g: Engine, self: Obj, p: P) => boolean;
  pay?: (c: Ctx) => Gen<boolean>; // custo não padrão
  energyMod?: number; // ex.: -2 (Brazen Buccaneer)
  flag: string; // gravado em ctx.data[flag] = true
  /** Desconto de power depois de pago (Kraken Hunter: um pip por Buff gasto). */
  powerCut?: (c: Ctx) => number;
  /** Desconto máximo de power possível (para saber se dá para jogar). */
  maxPowerCut?: (g: Engine, self: Obj, p: P) => number;
  /** Custo mais barato possível com este custo opcional (para saber se a carta pode ser jogada). */
  best?: (g: Engine, self: Obj, p: P, cost: Cost) => Cost;
  /** Ajusta o custo depois de `pay` (ex.: Commander Ledros tira 1 [Order] por unidade morta). */
  adjust?: (c: Ctx, cost: Cost) => Cost;
  /** Novo (UNL chaos): pago, a unidade entra pronta ("If you do, I enter ready", Crescent Guardian), como o Accelerate. */
  enterReady?: boolean;
}

/** Novo: "se X fosse morrer, ... em vez disso". O motor pergunta ao controlador quando é opcional (371.2.a). */
export interface DeathReplacement {
  label: string;
  /** "você pode": o controlador do efeito escolhe, no momento da morte, se aplica (regra 371.2). */
  optional?: boolean;
  /** Vale para esta morte? Inclui poder pagar os custos ("você pode pagar..."). */
  applies: (g: Engine, self: Obj, dying: Obj) => boolean;
  /** Aplica a substituição (paga custos, cura, chama de volta...). Retorna false se no fim não deu para aplicar. */
  apply: (g: Engine, self: Obj, dying: Obj) => Gen<boolean>;
  /** Novo (UNL legends): o texto diz quem escolhe ("its controller may pay...", Altar of Blood): esse jogador controla a
   *  substituição (190.6.c). Padrão: o controlador da fonte (373). */
  controller?: (g: Engine, self: Obj, dying: Obj) => P;
}

export interface CardScript {
  code: string;
  keywords?: Keywords;
  kwMod?: (g: Engine, self: Obj) => Keywords | undefined;
  /**
   * Novo (RAD-147): palavras-chave de uma habilidade que esta carta DÁ a outra unidade por efeito ("give a friendly unit
   * 'I have [Assault] equal to my [Shield]' this turn"): `g.addEffect({ target, kwFrom: code, until })`. `soFar` = as
   * palavras-chave da unidade já somadas (sem esta), para calcular sem recursão.
   */
  grantedKw?: (g: Engine, unit: Obj, soFar: Keywords) => Keywords | undefined;
  mightMod?: (g: Engine, self: Obj) => number;
  /** Equip [custo] (818): custo de recursos. "Equip — [C], Recycle 2..." usa também `equipExtra`. */
  equipCost?: Cost;
  /** Novo: custo de Equip que depende da unidade escolhida (Hextech Gauntlets); tem prioridade sobre `equipCost`. */
  equipFor?: (g: Engine, gear: Obj, unit: Obj, p: P) => Cost;
  /** Novo: parte não de recursos do custo de Equip (Last Rites: reciclar 2; Blade of the Ruined King: matar uma unidade
   *  aliada). Weaponmaster não reduz esta parte (RiftJudge #10704). `pay` recebe c.self = gear, c.data.equipUnit = unidade. */
  /** Novo (RAD-150): `canPay` recebe `wm` = true e `pay` recebe c.data.weaponmaster quando o custo é pago pelo Weaponmaster
   *  (821.1.c: [A] a menos), para custos com alternativa em power ("[Rune] or exhaust a friendly unit", Blade of the Exile). */
  equipExtra?: { label: string; canPay: (g: Engine, gear: Obj, p: P, wm?: boolean) => boolean; pay: (c: Ctx) => Gen<boolean> };
  /** Novo: texto que muda o timing do Equip (818.1.c.5). Padrão: fase principal do seu turno, estado neutro aberto. */
  equipTiming?: 'action' | 'reaction';
  /**
   * Texto de efeito (136; a parte de baixo do equipamento): só vale enquanto anexado e é acrescentado ao texto de regras
   * da unidade (o "I/me/aqui/seu" é a unidade e o controlador DELA). Pode ser uma função (Svellsongur: texto copiado).
   * O Might Bonus impresso (cards.json `mightBonus`) o motor já soma sozinho (137.3) — não ponha em mightMod.
   */
  equipped?: EffectText | ((g: Engine, gear: Obj, unit: Obj) => EffectText | undefined);
  repeat?: Cost;
  /** Novo (UNL legends): outras instâncias impressas de Repeat, depois de `repeat`, pagas cada uma separadamente (820.3;
   *  Curtain Call: [1] / [A] / [1][A], FAQ riftjudge #11289). */
  repeatMore?: Cost[];
  /** Novo (UNL fury): parte não de recursos do custo do Repeat impresso (Square Up: "[Repeat] — Discard 1"); `repeat` = parte de recursos. */
  repeatExtra?: { label: string; canPay: (g: Engine, self: Obj, p: P) => boolean; pay: (c: Ctx) => Gen<boolean> };
  /** Custo para jogar a carta do descarte (Flow; novo (UNL fury): também "você pode me jogar do descarte por X", Undying Legion, com `canPlay`). */
  flow?: Cost;
  /**
   * [Empower] (827): custo fixo, uma instância com custo não de recursos/[Tap]/vezes (EmpowerSpec) ou várias instâncias.
   * O motor cria as habilidades ativadas (ver EmpowerSpec); não escreva a habilidade à mão.
   */
  empower?: Cost | EmpowerSpec | EmpowerSpec[];
  optionalCosts?: OptionalCost[];
  /** Custos adicionais obrigatórios (ex.: matar uma unidade aliada). */
  mandatoryCost?: { label: string; canPay: (g: Engine, self: Obj, p: P) => boolean; pay: (c: Ctx) => Gen<boolean> };
  /**
   * Novo (UNL): escolhas "enquanto você me joga" (355.1: nomear uma tag, escolher Bird/Cat/Dog/Poro...). Roda durante a
   * jogada, antes dos custos, sempre — também quando a carta é jogada por efeito ou ignorando todos os custos (não é
   * custo). Guarde a escolha em `c.data` (vira o `data` da unidade) ou em `c.self.data`. Devolver false desfaz a jogada.
   */
  asPlayed?: (c: Ctx) => Gen<boolean>;
  /**
   * Modificação de energia da própria carta (Rhasa, Monch...). Novo (UNL order): `chosen` = alvos que o spell escolheu
   * ao ser jogado ("custa [2] a menos se você escolher...", Undying Loyalty); undefined = ainda sem alvos (estimativa
   * otimista, como em Aura.spellCostMod).
   */
  selfCostMod?: (g: Engine, self: Obj, p: P, chosen?: Obj[]) => number;
  /** Novo (SFD calm): desconto de power da própria carta: tira n pips que aceitam o domínio (Needlessly Large Yordle). */
  selfPowerCut?: (g: Engine, self: Obj, p: P) => { domain: Domain; n: number } | undefined;
  /** Novo (SFD): desconto da própria carta "até um mínimo de N" (Battering Ram; regra 356.4.e). */
  selfCostModMin?: (g: Engine, self: Obj, p: P) => { amount: number; min: number } | undefined;
  /**
   * Novo (UNL mind): custo alternativo da própria carta ("you may play me for [C]", Jhin, Meticulous Killer): substitui o
   * custo base (energia e power) ao jogar da mão ou da zona de campeão; custos adicionais e descontos continuam valendo.
   * O jogador escolhe usar (se só der para pagar assim, é usado).
   */
  altCost?: (g: Engine, self: Obj, p: P) => Cost | undefined;
  /**
   * Novo (UNL mind): substituição "se você fosse jogar uma ficha de unidade ... jogue-a e mais uma cópia dela" (Zilean,
   * Time Mage). Chamado por Engine.playTokensG para cada fonte no tabuleiro; retorna quantas fichas a mais (0 = não
   * aplicou). A própria função pergunta o "você pode" e marca o "uma vez por turno".
   * `inst` (caça UNL): o equipamento cujo texto de efeito é esta instância (Svellsongur copiando o Zilean): cada instância
   * tem o próprio "uma vez por turno" (370.2).
   */
  tokenPlayReplace?: (g: Engine, self: Obj, code: string, p: P, loc: Loc, inst?: Obj) => Gen<number>;
  /** Novo (RAD): "se você fosse jogar uma ficha de unidade, jogue outra no lugar" (Heimerdinger, Academy Instructor): devolve o código da ficha que substitui, ou undefined. */
  tokenCodeReplace?: (g: Engine, self: Obj, code: string, p: P, loc: Loc) => Gen<string | undefined>;
  /** Novo (SFD): restrição de local da própria unidade ao ser jogada ("jogue-me só em...", Perched Grimwyrm): false proíbe. */
  selfPlayLoc?: (g: Engine, self: Obj, p: P, loc: Loc) => boolean;
  /** Novo (SFD): equipamento que faz as habilidades de hold da unidade equipada também serem de conquista, e vice-versa (Skyfall of Areion). */
  holdConquerAlias?: boolean;
  /** Novo (SFD): substituição "se você fosse revelar cartas de um deck" (Void Hatchling); o motor chama via Engine.beforeReveal. */
  beforeReveal?: (g: Engine, self: Obj, p: P, owner: P, deck: 'mainDeck' | 'runeDeck') => Gen;
  /** `loc` (novo, UNL legends): local para onde a carta está sendo jogada ("se você me joga num campo", Shadow). */
  entersReady?: (g: Engine, self: Obj, loc?: Loc) => boolean;
  /** Novo (UNL chaos): "I can't be readied" (Maduli): nada a prepara, nem o despertar; entrar pronta continua valendo (RiftJudge #8730). */
  cantBeReadied?: (g: Engine, self: Obj) => boolean;
  /**
   * Novo (UNL chaos): substituição do local onde a unidade entra ao ser jogada ("as you play me ... I enter there", Baron
   * Nashor; regra 369.3). Chamado logo antes de ela entrar (jogada normal ou por efeito); devolve o local final.
   */
  enterLoc?: (g: Engine, self: Obj, p: P, loc: Loc) => Loc;
  /** Campos extras onde a unidade pode ser jogada na fase principal (Deadbloom Predator). */
  extraPlayBfs?: (g: Engine, self: Obj, p: P) => number[];
  /**
   * Novo (UNL): "I can [Ambush] to ..." (822.1.d): campos extras para onde a unidade pode ser jogada com as permissões do
   * Ambush (inclusive como [Reaction]), além dos campos onde p tem unidades. Chamado ao escolher o local (c ausente) e
   * de novo na checagem de legalidade, depois dos custos (c = contexto da jogada, com o que os custos gravaram em c.data):
   * se o campo não estiver mais na lista e p não tiver unidades lá, a jogada é desfeita (822.3, 813.4.b).
   * Ex.: Rengar, Trophy Hunter (campos com unidades inimigas); Stalking Wolf (o campo da unidade morta como custo).
   */
  ambushBfs?: (g: Engine, self: Obj, p: P, c?: Ctx) => number[];
  /** "Posso ter qualquer número de buffs" (Lee Sin, Ascetic). */
  anyBuffs?: boolean;
  /** Novo (Vendetta): "ignore Deflect while paying this spell's cost" (Decree of Insight). */
  ignoreDeflectCost?: boolean;
  /** Novo (Vendetta): "this can't be countered". */
  uncounterable?: boolean;
  /** Novo (Vendetta): "you ignore Tank while assigning combat damage here" (Dune Surfer): vale em combates no campo da fonte. */
  ignoreTank?: (g: Engine, self: Obj) => boolean;
  /** Novo (Vendetta): impede o dano que `source` (spell/habilidade) causaria a `self` (Esteemed Hierophant). */
  preventDamageFrom?: (g: Engine, self: Obj, source: Obj) => boolean;
  /** Novo (Vendetta): "se um jogador fosse pontuar 1 ponto por conquistar/segurar... compra 1 em vez disso" (Otterpus). */
  replaceScore?: (g: Engine, self: Obj, p: P, how: 'conquer' | 'hold') => boolean;
  /**
   * Novo (VEN-086): substituição "se um spell ou habilidade que me escolhe fosse me atordoar, me dar -Might ou me devolver à
   * mão, ... em vez disso" (Gangplank, Naval). Chamado por stun/giveMight(n<0)/returnToHand quando o item que resolve
   * escolheu esta unidade; faz o efeito substituto e devolve true (o original não acontece).
   */
  replaceChosen?: (g: Engine, self: Obj, what: 'stun' | 'mightReduce' | 'returnToHand', item: ChainItem) => boolean;
  /** Spell: o que acontece ao resolver. */
  spell?: AbilityDef;
  /** "Quando você me joga" (gatilho de jogada). */
  onPlay?: AbilityDef[];
  triggers?: TriggerDef[];
  activated?: ActivatedDef[];
  /** Habilidades ativadas que esta carta tem por empréstimo (Heimerdinger): fonte + índice em `activated` dela. */
  borrowedActivated?: (g: Engine, self: Obj) => { from: Obj; index: number }[];
  auras?: Aura[];
  noCombatDamage?: (g: Engine, self: Obj) => boolean;
  /** "Devo receber dano de combate por último" sem ter Backline (Caitlyn, Patrolling). */
  damageLast?: (g: Engine, self: Obj) => boolean;
  /** "Não recebo dano" (Kayn, Unleashed). */
  noDamage?: (g: Engine, self: Obj) => boolean;
  /** "Você pode me jogar num campo aberto" (Sai Scout, Sneaky Deckhand...). */
  playToOpen?: boolean;
  /** Quando o dono olha ou revela esta carta no topo do deck principal (Nocturne, Horrifying). */
  onLookTop?: (g: Engine, self: Obj, p: P) => Gen;
  /** Novo: "As I'm revealed from your deck" (Undertitan). Chamado por `g.revealTop` ao revelar esta carta (p = dono). */
  onReveal?: (g: Engine, self: Obj, p: P) => Gen;
  /** Efeito de substituição "se uma unidade aliada fosse morrer" (antigo: obrigatório, sem perguntar). Prefira deathReplacements. */
  replaceDeath?: (g: Engine, self: Obj, dying: Obj) => boolean; // true = substituiu
  /** Novo: efeitos de substituição de morte (regras 369-373), inclusive os opcionais ("você pode"). */
  deathReplacements?: DeathReplacement[];
  /** Empate de combate em que o atacante teria unidades chamadas de volta: chamar todas as unidades do campo (Symbol of the Solari). */
  tieRecallAll?: (g: Engine, self: Obj, bf: number, attacker: P) => boolean;
  /** Jogador pode jogar esta carta agora? (restrições extras) */
  canPlay?: (g: Engine, self: Obj, p: P) => boolean;
  /** Campo de batalha: ajuste feito quando o campo entra na partida (Bandle Tree, Aspirant's Climb). */
  bfSetup?: (g: Engine, self: Obj) => void;
  /** Novo (UNL): desfaz o bfSetup quando o campo deixa de existir na mesa (substituído por uma ficha, 438; ou trocado de volta). */
  bfTeardown?: (g: Engine, self: Obj) => void;
  notes?: string; // simplificações conhecidas
}

/**
 * Novo: texto de efeito de um equipamento (regras 136, 434.1.c, 718.3). Vale para a unidade em que está anexado.
 * - triggers/activated: c.self = a unidade, c.p = controlador da unidade, c.gear = o equipamento ("this", 136.2.d).
 *   Deathknell no texto de efeito funciona (a unidade tinha a habilidade ao morrer).
 * - auras, deathReplacements, noCombatDamage...: `src`/`self` = a unidade; o equipamento vem como ÚLTIMO argumento extra.
 */
export interface EffectText {
  keywords?: Keywords;
  kwMod?: (g: Engine, gear: Obj, unit: Obj) => Keywords | undefined;
  mightMod?: (g: Engine, gear: Obj, unit: Obj) => number;
  triggers?: TriggerDef[];
  activated?: ActivatedDef[];
  auras?: Aura[];
  deathReplacements?: DeathReplacement[];
  noCombatDamage?: (g: Engine, self: Obj, gear?: Obj) => boolean;
  damageLast?: (g: Engine, self: Obj, gear?: Obj) => boolean;
  noDamage?: (g: Engine, self: Obj, gear?: Obj) => boolean;
  /** Novo (mind): tags dadas à unidade ("I am a Mech", Experimental Hexplate). Ver Engine.hasTag. */
  tags?: string[];
  /**
   * Novo (SFD calm): substituição "se você fosse revelar cartas de um deck" no texto de efeito (Svellsongur copiando
   * Void Hatchling). Cada instância é outra substituição e se aplica uma vez (370.2). `self` = a unidade.
   */
  beforeReveal?: (g: Engine, self: Obj, p: P, owner: P, deck: 'mainDeck' | 'runeDeck', gear?: Obj) => Gen;
  /**
   * Novo (caça UNL): substituição "se você fosse jogar uma ficha de unidade" no texto de efeito (Svellsongur copiando o
   * Zilean, Time Mage): outra instância, que se aplica uma vez à jogada (370.2; RiftJudge #10154). `self` = a unidade.
   */
  tokenPlayReplace?: (g: Engine, self: Obj, code: string, p: P, loc: Loc, gear?: Obj) => Gen<number>;
}

const REGISTRY: Record<string, CardScript> = {};

/** Novo (Vendetta): instâncias de [Empower] do script, normalizadas. */
export function empowerSpecs(s: CardScript): EmpowerSpec[] {
  const e = s.empower;
  if (!e) return [];
  if (Array.isArray(e)) return e;
  return 'energy' in e && 'power' in e ? [{ cost: e as Cost }] : [e as EmpowerSpec];
}

const costLabel = (c: Cost) => [c.energy ? `[${c.energy}]` : '', ...c.power.map((d) => (d.length >= 6 ? '[Rune]' : `[${d.join('/')}]`))].join('');

/**
 * Novo (Vendetta): a habilidade ativada de uma instância de [Empower] (827.1.c.1: "[Custo]: Empower this. Use only if not
 * Empowered."). Vai para a pilha; ao resolver, a fonte fica Empowered (441). A fonte não é alvo (827.1.b.1).
 */
export function empowerAbilityOf(spec: EmpowerSpec): ActivatedDef {
  const max = spec.max ?? 1;
  const base = (c: Ctx): Cost => {
    const k = spec.cost;
    return typeof k === 'function' ? k(c.g, c.self, c.p) : k || { energy: 0, power: [] };
  };
  const fixed = typeof spec.cost === 'function' ? '' : spec.cost ? costLabel(spec.cost) : '';
  const parts = [fixed, spec.exhaustSelf ? '[Tap]' : '', spec.extra?.label || ''].filter(Boolean);
  return {
    label: `Empower${parts.length ? ` — ${parts.join(', ')}` : ''}${max > 1 ? ` (até ${max} vezes)` : ''}`,
    empower: true,
    exhaustSelf: spec.exhaustSelf,
    timing: spec.timing,
    cost: base,
    baseCost: base,
    canPayExtra: spec.extra ? (c) => spec.extra!.canPay(c) : undefined,
    extraCost: spec.extra ? (c) => spec.extra!.pay(c) : undefined,
    condition: (g, self) => g.empowerCount(self) < max,
    resolve: function* (c) {
      if (c.self.zone === 'board' || c.self.zone === 'legend') c.g.empowerObj(c.self, c.p, max);
    },
  };
}

export function registerCard(s: CardScript) {
  // [Empower] vira habilidade(s) ativada(s) de verdade, depois das impressas (os índices das outras não mudam)
  const emp = empowerSpecs(s).map(empowerAbilityOf);
  if (emp.length) s = { ...s, activated: [...(s.activated || []), ...emp] };
  REGISTRY[s.code] = s;
}

export function getScript(code: string): CardScript | undefined {
  return REGISTRY[code];
}

export function isImplemented(code: string): boolean {
  return !!REGISTRY[code];
}

export function implementedCodes(): string[] {
  return Object.keys(REGISTRY);
}
