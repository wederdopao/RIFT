// Modo Desafios ("vença neste turno"): cada desafio é uma situação montada (src/engine/scenario.ts) com um objetivo.
// Tudo aqui é dado: para criar um desafio novo, acrescente um item na lista CHALLENGES (e um teste que joga a solução
// em tests/desafios.test.ts). O jogador é sempre o lado 0 ("Você"); a IA joga pelo lado 1.
import type { Engine, GameConfig } from '../engine/engine';
import { cardData } from '../engine/db';
import { scenarioDeck, type ScenarioSetup } from '../engine/scenario';

export type ChallengeGoal =
  /** Vença a partida neste turno. */
  | { kind: 'win' }
  /** Conquiste o campo `bf` (índice) neste turno. */
  | { kind: 'conquer'; bf: number }
  /** Destrua (tire do tabuleiro) a unidade inimiga com este código neste turno. */
  | { kind: 'kill'; code: string }
  /** Chegue ao começo do seu próximo turno sem o oponente vencer. */
  | { kind: 'survive' };

export interface Challenge {
  id: string;
  title: string;
  /** 1 fácil, 2 médio, 3 difícil. */
  level: 1 | 2 | 3;
  /** O que o desafio ensina (aparece na lista). */
  teaches: string;
  /** A situação, contada ao jogador. */
  brief: string;
  goal: ChallengeGoal;
  /** Dica (só aparece se o jogador pedir). */
  hint: string;
  /** Explicação da solução (aparece depois de resolver). */
  solution: string;
  scenario: ScenarioSetup;
  /** Carta cuja arte ilustra o desafio na lista (a carta que ele ensina). */
  cover: string;
}

export const R = { fury: 'OGN-007', calm: 'OGN-042', mind: 'OGN-089', body: 'OGN-126', chaos: 'OGN-166', order: 'OGN-214' };
const n = (code: string, k: number) => Array<string>(k).fill(code);
const ex = (code: string, k: number) => Array.from({ length: k }, () => ({ code, exhausted: true }));

// Lendas sem habilidade ativada (não abrem caminhos fora do que o desafio ensina).
const MY_LEGEND = 'OGN-251'; // Jinx, Loose Cannon
const OPP_LEGEND = 'OGN-261'; // Leona, Radiant Dawn
// Campos com efeitos que não mexem na conta do desafio.
const GROVE = 'OGN-280'; // Grove of the God-Willow
const TOMB = 'OGN-281'; // Hallowed Tomb
const MONASTERY = 'OGN-282'; // Monastery of Hirana

export const CHALLENGES: Challenge[] = [
  {
    id: 'escudo-assalto',
    cover: 'OGN-004',
    title: 'Escudo contra Assalto',
    level: 1,
    teaches: 'Shield, Assault e jogar Action durante o showdown',
    brief:
      'O Sunlit Guardian defende o Grove com [Shield]: tem 3 de Might, 4 quando defende. A sua Vanguard Sergeant tem 4. Conquiste o campo neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Num empate de Might os dois morrem e ninguém conquista. [Assault] só vale para quem ataca, e um spell [Action] pode ser jogado no seu turno ou no showdown.',
    solution:
      'Cleave dá [Assault 3] à Sergeant: atacando, ela tem 7 contra os 4 do Guardian (3 + Shield 1), mata e sobrevive. Sem o Cleave é 4 contra 4: os dois morrem e o campo não muda de dono.',
    scenario: {
      turn: 5,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 3, hand: ['OGN-004'], runes: [R.fury], base: ['OGN-219'] },
        { legend: OPP_LEGEND, points: 3, runes: ex(R.calm, 3) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-054']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'equipar',
    cover: 'SFD-009',
    title: 'Mão na arma',
    level: 1,
    teaches: 'Equip: anexar um Equipment a uma unidade',
    brief:
      'O seu Daring Poro (2, [Assault]) precisa passar pelo Stalwart Poro (2, [Shield]). Na sua base há um Serrated Dirk solto. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Equipment na base não faz nada sozinho: pague o custo de [Equip] para anexá-lo a uma unidade sua. O texto do equipamento passa para ela.',
    solution:
      'Equip [Fury] anexa o Serrated Dirk ao Daring Poro: com [Assault] 1 + 2 ele ataca com 5 contra os 3 do Stalwart Poro (2 + Shield 1). Sem o Dirk é 3 contra 3 e os dois morrem.',
    scenario: {
      turn: 3,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 2, runes: [R.fury], base: ['OGN-210', 'SFD-009'] },
        { legend: OPP_LEGEND, points: 2, runes: ex(R.calm, 2) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-052']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'empower',
    cover: 'VEN-014',
    title: 'Força interior',
    level: 1,
    teaches: 'Empower: habilidade ativada que liga o texto [Empowered]',
    brief:
      'O Shadow Fiend (2) está pronto na sua base; o Sunlit Guardian defende o Grove com 4 (3 + Shield). Você tem 3 runas e um Discipline na mão. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'O Discipline dá +2 — dá empate. Olhe o texto do Shadow Fiend: [Empower] é uma habilidade que você ativa (vai para a pilha) e liga o que vem depois de [Empowered].',
    solution:
      'Ative o [Empower] do Shadow Fiend ([2][Fury]): Empowered, ele tem [Assault 3] e ataca com 5 contra 4. O Discipline deixaria 4 contra 4 (os dois morrem), e não sobra runa para as duas coisas.',
    scenario: {
      turn: 5,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 4, hand: ['OGN-058'], runes: n(R.fury, 3), base: ['VEN-014'] },
        { legend: OPP_LEGEND, points: 4, runes: ex(R.calm, 4) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-054']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'ultimo-ponto',
    cover: 'OGN-219',
    title: 'O último ponto',
    level: 2,
    teaches: 'Regra do último ponto (471.1.b.1): para vencer conquistando, pontue em todos os campos no turno',
    brief:
      'Você tem 7 pontos e precisa de 8. O oponente controla o Grove com um Pouty Poro (2); o Hallowed Tomb está vazio. Na sua base: Vanguard Sergeant (4) e Daring Poro (2, [Assault]). Vença neste turno.',
    goal: { kind: 'win' },
    hint: 'O ponto da vitória por conquista só vem se você pontuou em TODOS os campos neste turno; senão você compra uma carta no lugar dele. Um campo vazio também é conquistado.',
    solution:
      'Mande uma unidade para cada campo: a conquista do primeiro vira uma compra (ainda faltava pontuar no outro) e a do segundo, com os dois campos pontuados no turno, dá o 8º ponto. Atacar o Grove com as duas só rende uma carta.',
    scenario: {
      turn: 9,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 7, runes: n(R.order, 2), base: ['OGN-219', 'OGN-210'] },
        { legend: OPP_LEGEND, points: 6, runes: ex(R.calm, 5) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-013']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'deflect',
    cover: 'OGN-155',
    title: 'Pele de pedra',
    level: 2,
    teaches: 'Deflect: escolher a unidade com um spell custa power a mais',
    brief:
      'Qiyana (4, [Deflect]) defende o Grove. A sua Vanguard Sergeant tem 4 — empate. Na mão: Hextech Ray (3 de dano) e Stupefy (-1 Might). Runas: 2 de Fury e 1 de Mind. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Mirar a Qiyana com qualquer spell custa 1 power a mais por causa do [Deflect]. Dano de spell não some antes do combate, mas o que importa é quem sobrevive ao combate.',
    solution:
      'Stupefy na Qiyana (1 de energia + o power do Deflect): ela fica com 3, a Sergeant (4) a mata e sobrevive aos 3 de dano. Com o Hextech Ray (1 + Fury + Deflect = as 3 runas) ela fica com 3 de dano e 4 de Might: o combate mata as duas.',
    scenario: {
      turn: 6,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 4, hand: ['OGN-009', 'OGN-095'], runes: [R.fury, R.fury, R.mind], base: ['OGN-219'] },
        { legend: OPP_LEGEND, points: 5, runes: ex(R.body, 4) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-155']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'hidden',
    cover: 'OGN-053',
    title: 'Carta na manga',
    level: 2,
    teaches: 'Hidden: a carta escondida sai por [0] num turno seguinte, no campo onde está',
    brief:
      'Suas runas estão todas exauridas. No Hallowed Tomb, que você controla, estão Vi, Destructive (3, [Ganking]) e um Stand United que você escondeu no turno passado. O Sunlit Guardian (3, [Shield]) defende o Grove com 4. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Uma carta com [Hidden] escondida num turno anterior pode ser jogada por [0] — sem runa nenhuma —, e o que ela escolhe tem que estar naquele campo.',
    solution:
      'Jogue o Stand United virado no Tomb por [0] na Vi: ela ganha o buff (+1) e, neste turno, buffs dão +1 a mais — 5 de Might. Com [Ganking] ela vai do Tomb para o Grove e vence o Guardian (4). Sem a carta escondida é 3 contra 4.',
    scenario: {
      turn: 8,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 5, runes: ex(R.calm, 5) },
        { legend: OPP_LEGEND, points: 5, runes: ex(R.mind, 5) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-054']] },
        { code: TOMB, owner: 0, controller: 0, units: [['OGN-036'], []], facedown: [['OGN-053'], []] },
      ],
    },
  },
  {
    id: 'pilha',
    cover: 'SFD-045',
    title: 'Não tão rápido',
    level: 2,
    teaches: 'Pilha e Reaction: responder a uma habilidade antes que ela resolva',
    brief:
      'Ahri, Inquisitive (3) defende o Grove: quando defende, dá -2 Might a uma unidade inimiga lá. Sua Vanguard Sergeant (4) vai atacar sozinha. Na mão, Not So Fast. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'O gatilho da Ahri vai para a pilha quando ela defende e só tira o Might quando resolve. Um spell com [Reaction] pode ser jogado por cima dele.',
    solution:
      'Ataque. Quando o gatilho da Ahri estiver na pilha mirando a Sergeant, jogue Not So Fast nele: o gatilho é anulado, a Sergeant fica com 4 e vence a Ahri (3). Sem a resposta ela vira 2 contra 3 e morre.',
    scenario: {
      turn: 7,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 5, hand: ['SFD-045'], runes: n(R.calm, 3), base: ['OGN-219'] },
        { legend: OPP_LEGEND, points: 5, runes: ex(R.mind, 4) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-119']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'tank',
    cover: 'OGN-054',
    title: 'Parede de escudos',
    level: 2,
    teaches: 'Tank: o dano de combate tem que ir primeiro (e letal) para a unidade com Tank',
    brief:
      'Ahri, Alluring (4) pontua sempre que segura o Grove. Na frente dela, o Sunlit Guardian (3, [Shield], [Tank]). Você tem Vanguard Sergeant (4) e Daring Poro (2, [Assault]) e um Hextech Ray. Destrua a Ahri neste turno.',
    goal: { kind: 'kill', code: 'OGN-066' },
    hint: 'Atacando com tudo você tem 7, mas o [Tank] obriga a pôr dano letal nele primeiro (4, com o Shield): só sobram 3 para a Ahri, que tem 4.',
    solution:
      'Use o Hextech Ray antes do combate: no Guardian (3 de dano mata, fora do combate ele tem 3) ou na Ahri (3 de dano). Depois ataque com as duas: o dano que sobra do Tank basta para ela.',
    scenario: {
      turn: 6,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 4, hand: ['OGN-009'], runes: n(R.fury, 2), base: ['OGN-219', 'OGN-210'] },
        { legend: OPP_LEGEND, points: 5, runes: ex(R.calm, 4) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-054', 'OGN-066']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'deathknell',
    cover: 'OGN-190',
    title: 'Último suspiro',
    level: 2,
    teaches: 'Deathknell: o efeito acontece onde a unidade morreu',
    brief:
      "Kog'Maw (1) está sozinho no Grove. Quando morre, causa 4 a todas as unidades no campo dele ([Deathknell]). A sua Vanguard Sergeant (4) e um Hextech Ray estão prontos. Conquiste o Grove neste turno.",
    goal: { kind: 'conquer', bf: 0 },
    hint: "Se o Kog'Maw morrer em combate, a Sergeant está lá (com 1 de dano) quando os 4 caem. E se ele morrer antes de você chegar?",
    solution:
      "Hextech Ray no Kog'Maw antes de mover: ele morre sozinho e o [Deathknell] não acerta ninguém seu. Depois a Sergeant entra no Grove vazio e conquista. Atacando direto, a Sergeant leva 1 + 4 e morre junto.",
    scenario: {
      turn: 6,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 4, hand: ['OGN-009'], runes: n(R.fury, 2), base: ['OGN-219'] },
        { legend: OPP_LEGEND, points: 4, runes: ex(R.chaos, 4) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-190']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'hold',
    cover: 'OGN-066',
    title: 'Segure a linha',
    level: 2,
    teaches: 'Conquista × hold: o oponente pontua no começo do turno dele com o campo que segura',
    brief:
      'O oponente tem 6 pontos e segura o Grove com Ahri, Alluring (4): no começo do turno dele, o hold do campo e o da Ahri dão 2 pontos — vitória. O Hallowed Tomb está vazio. Você tem Vanguard Sergeant (4) e Daring Poro (2, [Assault]). Sobreviva ao turno do oponente.',
    goal: { kind: 'survive' },
    hint: 'Conquistar o campo vazio dá um ponto a você, mas não tira nenhum dele. O hold só acontece se ele ainda controlar o Grove com unidade lá no começo do turno.',
    solution:
      'Ataque o Grove com as duas (4 + 3 contra 4): a Ahri morre e o campo é seu. Sem campo e sem Ahri, o oponente não pontua no começo do turno. Ir ao Tomb vazio dá 1 ponto a você e a vitória a ele.',
    scenario: {
      turn: 10,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 5, runes: n(R.order, 3), base: ['OGN-219', 'OGN-210'] },
        { legend: OPP_LEGEND, points: 6, runes: ex(R.calm, 3) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-066']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'legion',
    cover: 'OGN-243',
    title: 'A legião primeiro',
    level: 3,
    teaches: 'Legion: o efeito só vale se você já jogou outra carta neste turno (a ordem importa)',
    brief:
      'O Mega-Mech (8) guarda o Grove. Na sua base, um Recruit (1). Na mão, Darius, Executioner ([Legion]: entra pronto; outras unidades suas têm +1 lá) e Cleave. Oito runas. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Unidade jogada entra exaurida e não pode se mover. O [Legion] do Darius o prepara — mas só se outra carta já foi jogada neste turno.',
    solution:
      'Primeiro o Cleave no Recruit, depois o Darius (Legion: entra pronto). Atacam juntos: Darius 6 + Recruit 1 + Assault 3 + 1 do Darius = 11 contra 8. Jogando o Darius primeiro ele fica exaurido e o Recruit sozinho não passa.',
    scenario: {
      turn: 9,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 5, hand: ['OGN-243', 'OGN-004'], runes: [...n(R.order, 6), R.fury, R.fury], base: ['OGN-273'] },
        { legend: OPP_LEGEND, points: 5, runes: ex(R.mind, 6) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-088']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'mestre-armas',
    cover: 'SFD-002',
    title: 'Mestre de armas',
    level: 3,
    teaches: 'Accelerate e Weaponmaster: entrar pronto e equipar por [Rune] a menos',
    brief:
      'O Eclipse Herald (7) guarda o Grove. O seu Recruit está com um Serrated Dirk ([Assault 2]). Na mão, Armed Assailant (6, [Accelerate], [Weaponmaster]). Nove runas de Fury. Conquiste o Grove neste turno.',
    goal: { kind: 'conquer', bf: 0 },
    hint: 'Com [Accelerate] a unidade entra pronta. Com [Weaponmaster], ao jogá-la você pode equipar um Equipment seu — mesmo um já anexado — por [Rune] a menos.',
    solution:
      'Jogue o Armed Assailant pagando o Accelerate (6 + [Fury] + [1][Fury] = as 9 runas) e use o Weaponmaster para trazer o Dirk de graça (Equip [Fury] menos [Rune]). Ele ataca com 8 contra 7. Sem o Dirk são 6, e sem o Accelerate ele nem se move.',
    scenario: {
      turn: 11,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 6, hand: ['SFD-002'], runes: n(R.fury, 9), base: [{ code: 'OGN-273', exhausted: true, gear: ['SFD-009'] }] },
        { legend: OPP_LEGEND, points: 6, runes: ex(R.calm, 7) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-059']] },
        { code: TOMB, owner: 0, controller: null },
      ],
    },
  },
  {
    id: 'duas-frentes',
    cover: 'OGN-173',
    title: 'Duas frentes',
    level: 3,
    teaches: 'Movimento: andar exaure, Ride the Wind move e prepara; e de novo o último ponto',
    brief:
      'Você tem 6 pontos. O oponente segura os dois campos: um Stalwart Poro (2, [Shield]) no Grove e um Pouty Poro (2) no Monastery. Sua única unidade é a Vanguard Sergeant (4). Na mão, Ride the Wind. Vença neste turno.',
    goal: { kind: 'win' },
    hint: 'Mover exaure a unidade, e uma unidade num campo só volta para a base (sem [Ganking]). Um efeito de mover não tem essa limitação — e o Ride the Wind ainda prepara.',
    solution:
      'Mova a Sergeant normalmente para um campo e conquiste (7). Depois Ride the Wind nela: vai direto para o outro campo, pronta, e conquista o 8º ponto com os dois campos pontuados. Usar o Ride the Wind primeiro, saindo da base, deixa a Sergeant presa no primeiro campo.',
    scenario: {
      turn: 12,
      active: 0,
      sides: [
        { legend: MY_LEGEND, points: 6, hand: ['OGN-173'], runes: n(R.chaos, 3), base: ['OGN-219'] },
        { legend: OPP_LEGEND, points: 6, runes: ex(R.calm, 6) },
      ],
      battlefields: [
        { code: GROVE, owner: 1, controller: 1, units: [[], ['OGN-052']] },
        { code: MONASTERY, owner: 0, controller: 1, units: [[], ['OGN-013']] },
      ],
    },
  },
];

export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);

/** Configuração da partida do desafio (a semente não importa: nada é sorteado na montagem). */
export function challengeConfig(ch: Challenge, names: [string, string] = ['Você', 'IA']): GameConfig & { challenge: string } {
  const sc = ch.scenario;
  return {
    seed: 1,
    decks: [scenarioDeck(sc.sides[0], `Desafio: ${ch.title}`), scenarioDeck(sc.sides[1], 'Oponente')],
    names,
    firstPlayer: sc.first ?? sc.active,
    autoPass: true,
    scenario: sc,
    challenge: ch.id, // o motor ignora; a interface lê para saber que é desafio
  };
}

export type ChallengeResult = 'won' | 'lost' | null;

/** Situação do desafio na mesa atual: vitória, derrota ou em andamento. */
export function challengeResult(e: Engine, ch: Challenge): ChallengeResult {
  const start = ch.scenario.turn;
  const g = ch.goal;
  if (e.winner === 1) return 'lost';
  const settled = !e.chain.length && !e.showdown;
  switch (g.kind) {
    case 'win':
      if (e.winner === 0) return 'won';
      return e.turn > start ? 'lost' : null;
    case 'conquer':
      if (settled && e.turn === start && e.bfs[g.bf]?.controller === 0) return 'won';
      return e.turn > start || e.winner !== null ? 'lost' : null;
    case 'kill': {
      const alive = Object.values(e.objs).some((o) => o.code === g.code && o.controller === 1 && o.zone === 'board');
      if (settled && e.turn === start && !alive) return 'won';
      return e.turn > start || e.winner !== null ? 'lost' : null;
    }
    case 'survive':
      if (e.winner === 0 || e.turn >= start + 2) return 'won';
      return null;
  }
}

/** O que o objetivo pede, em uma linha. */
export function goalText(ch: Challenge): string {
  const g = ch.goal;
  switch (g.kind) {
    case 'win':
      return 'Vença neste turno.';
    case 'conquer':
      return `Conquiste ${cardData(ch.scenario.battlefields[g.bf].code).name} neste turno.`;
    case 'kill':
      return `Destrua ${cardData(g.code).name} neste turno.`;
    case 'survive':
      return 'Sobreviva ao turno do oponente.';
  }
}
