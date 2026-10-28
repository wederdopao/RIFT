// Roteiro do tutorial "Aprender a jogar": decks na ordem fixa, os passos (o que explicar, o que apontar, que jogada
// vale) e as jogadas do oponente. Sem DOM: os testes percorrem o roteiro inteiro pelo motor (tests/tutorial.test.ts) e
// a mesa (tutorial.ts) usa os mesmos passos.
import type { DeckList, Engine, GameConfig } from '../engine/engine';
import type { Answer, Decision, Obj, P } from '../engine/types';

// ── cartas ──
export const C = {
  survivor: 'RAD-088', // Staunch Survivor: 2 + [Body], Might 2, [Assault 2] [Shield 2]
  laurent: 'SFD-096', // Laurent Bladekeeper: 3, Might 3, [Ganking]
  enGarde: 'OGN-046', // En Garde: Reaction, 1, +1 Might (+1 a mais se for a única unidade sua lá)
  animus: 'RAD-005', // Lingering Animus: 2, Might 2
  odds: 'SFD-001', // Against the Odds: Reaction, 2, +2 Might por unidade inimiga lá
  saboteur: 'OGN-018', // Noxus Saboteur: 3, Might 3
  sergeant: 'OGN-219', // Vanguard Sergeant: 4, Might 4
  myBf: 'OGN-278', // Bandle Tree
  oppBf: 'OGN-280', // Grove of the God-Willow
};
const BODY = 'OGN-126';
const CALM = 'OGN-042';
const FURY = 'OGN-007';
const ORDER = 'OGN-214';
const one = (codes: string[]): [string, number][] => codes.map((c) => [c, 1]);
const alt = (a: string, b: string, n: number) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));

/** O seu deck (Lee Sin, Body/Calm): a mão inicial são as 4 primeiras; depois uma compra por turno. */
export const TUTORIAL_ME: DeckList = {
  name: 'Tutorial',
  legend: 'OGN-257', // Lee Sin, Blind Monk
  champion: 'OGN-151', // Lee Sin, Centered
  main: one([C.survivor, C.laurent, C.enGarde, 'OGN-065', 'OGN-049', 'OGN-142', 'OGN-052', 'OGN-065', 'OGN-049', 'OGN-142', 'OGN-052', 'OGN-065']),
  runes: one(alt(BODY, CALM, 12)),
  battlefields: [C.myBf],
};
/** O deck do oponente (Darius, Fury/Order). */
export const TUTORIAL_OPP: DeckList = {
  name: 'Oponente do tutorial',
  legend: 'OGN-253', // Darius, Hand of Noxus
  champion: 'OGN-027', // Darius, Trifarian
  main: one([C.animus, C.odds, C.saboteur, C.sergeant, 'OGN-215', 'OGN-006', 'OGN-175', 'OGN-219', 'OGN-215', 'OGN-006', 'OGN-175', 'OGN-219']),
  runes: one(alt(FURY, ORDER, 12)),
  battlefields: [C.oppBf],
};

export function tutorialConfig(): GameConfig {
  return {
    seed: 20261028,
    decks: [TUTORIAL_ME, TUTORIAL_OPP],
    names: ['Você', 'Oponente'],
    firstPlayer: 0,
    battlefieldMode: 'random',
    autoPass: true,
    fixedOrder: true,
    startPoints: [4, 4],
  };
}

// ── ajudantes ──
const ME: P = 0;
const OPP: P = 1;
/** A carta (única no roteiro) deste código e deste dono. */
export function card(eng: Engine, p: P, code: string): Obj | undefined {
  return Object.values(eng.objs).find((o) => o.owner === p && o.code === code && o.zone !== 'setAside');
}
const id = (eng: Engine, p: P, code: string) => card(eng, p, code)?.id ?? '?';
const atBf = (eng: Engine, p: P, code: string, i: number) => {
  const o = card(eng, p, code);
  return !!o && o.zone === 'board' && o.loc?.t === 'bf' && o.loc.i === i;
};
const onBoard = (eng: Engine, p: P, code: string) => card(eng, p, code)?.zone === 'board';
const inHand = (eng: Engine, p: P, code: string) => card(eng, p, code)?.zone === 'hand';
const playOpt = (eng: Engine, p: P, code: string) => `play:${id(eng, p, code)}:hand`;
const has = (d: Decision, opt: string) => d.options.some((o) => o.id === opt);
const isWhere = (d: Decision) => /^Jogar .* onde\?$/.test(d.prompt) && !d.root;
const baseOf = (d: Decision, eng: Engine, p: P) => d.options.find((o) => o.label === `base de ${eng.pl[p].name}`)?.id;
const myRoot = (eng: Engine, d: Decision | null, turn: number) => !!d && d.player === ME && !!d.root && eng.turn === turn;

// seletores da mesa (o que o passo aponta e o que pode ser usado)
const sel = {
  hand: (oid: string) => `.tt-handrow.bottom [data-obj="${oid}"]`,
  obj: (oid: string) => `.tt-mat [data-obj="${oid}"]`,
  opt: (o: string) => `[data-opt="${o}"]`,
  armGo: '.tt-arm [data-act=armgo]',
  bf: (i: number) => `.tt-bf[data-drop="bf:${i}"]`,
  base: '.tt-base[data-drop="base:0"]',
  end: '.tt-endbtn',
  plate: '.tt-handrow.bottom .tt-plate',
  oppPlate: '.tt-handrow.top .tt-plate',
  runes: '.tt-home.bottom .tt-runes',
  runeDeck: '.tt-handrow.bottom .runedeck',
};

// ── passos ──
export type StepKind = 'info' | 'act' | 'watch' | 'read' | 'end';
export interface TutCtx {
  eng: Engine;
  touch: boolean;
}
export interface TutStep {
  id: string;
  kind: StepKind;
  title: string;
  /** explicação (HTML) */
  body: (c: TutCtx) => string;
  /** o que fazer agora (HTML), conforme mouse ou toque */
  how?: (c: TutCtx) => string;
  /** o que a seta aponta, em ordem de preferência (o primeiro que estiver na tela) */
  point?: (c: TutCtx) => string[];
  /** o que mais pode ser usado neste passo (além do apontado) */
  use?: (c: TutCtx) => string[];
  /** confere uma resposta sua: null vale; texto = recusada, com o porquê */
  allow?: (d: Decision, a: Answer, eng: Engine) => string | null;
  /** o passo terminou (act/watch)? */
  done?: (eng: Engine, d: Decision | null) => boolean;
  /** (passo de ler) a carta a apontar */
  read?: (eng: Engine) => string;
  /** a jogada certa (teste automático do roteiro) */
  solve?: (d: Decision, eng: Engine) => Answer | null;
}

const clickOrTap = (c: TutCtx, mouse: string, touch: string) => (c.touch ? touch : mouse);
const onlyRoot = (want: (eng: Engine) => string, why: string) => (d: Decision, a: Answer, eng: Engine) => {
  if (d.root) return a.length === 1 && a[0] === want(eng) ? null : why;
  return null;
};

export const STEPS: TutStep[] = [
  {
    id: 'goal',
    kind: 'info',
    title: 'O objetivo: 8 pontos',
    body: () =>
      'Riftbound é uma disputa por <b>campos de batalha</b>. Quem chegar primeiro a <b>8 pontos</b> vence. Você ganha ponto de dois jeitos: <b>conquistando</b> um campo e <b>segurando</b> um campo que já é seu no começo do seu turno.<br>Para a aula caber em uns 10 minutos, os dois começam com <b>4 pontos</b> — veja o placar ao lado do seu nome.',
    point: () => [sel.plate],
  },
  {
    id: 'board',
    kind: 'info',
    title: 'A mesa',
    body: () =>
      'Você joga embaixo; o oponente, em cima. No meio estão os dois campos de batalha (cada jogador traz um): <b>Bandle Tree</b> é o seu, <b>Grove of the God-Willow</b> é o dele, mas campo não tem dono fixo — é de quem conquistar. Perto de você ficam a mão, as runas, a base (onde as unidades chegam) e a sua lenda.',
    point: () => [sel.bf(0)],
  },
  {
    id: 'runes',
    kind: 'info',
    title: 'Runas: energia e power',
    body: () =>
      'As runas pagam tudo. No começo de cada turno você <b>canaliza</b> 2 runas: elas saem do deck de runas e vêm para a mesa (quem joga em segundo canaliza 3 no primeiro turno).<br>Cada runa paga de dois jeitos: <b>exaurir</b> (girar a runa) dá <b>1 de energia</b>, o número do custo; <b>reciclar</b> (devolvê-la ao fundo do deck de runas) dá <b>1 power</b> da cor dela, o símbolo colorido do custo. Runa exaurida volta a ficar pronta no começo do seu turno.',
    point: () => [sel.runes],
  },
  {
    id: 'play1',
    kind: 'act',
    title: 'Jogar uma unidade',
    body: () =>
      'Jogue <b>Staunch Survivor</b>. Ela custa <b>2 de energia + 1 power de Body</b>. Você tem 2 runas: a mesa paga sozinha — exaure as duas (2 de energia) e recicla a de Body (1 power). Unidades entram na sua <b>base</b>.',
    how: (c) => clickOrTap(c, 'Clique na carta e depois em <b>Jogar</b> (ou clique nela de novo). Também dá para arrastar.', 'Toque na carta e depois em <b>Jogar</b>.'),
    point: (c) => [sel.armGo, sel.opt(playOpt(c.eng, ME, C.survivor)), sel.hand(id(c.eng, ME, C.survivor))],
    use: (c) => [sel.base],
    allow: onlyRoot((eng) => playOpt(eng, ME, C.survivor), 'Agora é a vez de jogar a Staunch Survivor (a carta apontada).'),
    done: (eng) => onBoard(eng, ME, C.survivor),
    solve: (d, eng) => (d.root ? [playOpt(eng, ME, C.survivor)] : null),
  },
  {
    id: 'paid',
    kind: 'info',
    title: 'Pago!',
    body: () =>
      'Veja as runas: a que sobrou está <b>exaurida</b> (deitada, já usada neste turno) e a de Body foi <b>reciclada</b> — voltou para o fundo do deck de runas. A Staunch Survivor chegou à base <b>exaurida</b> também: unidade que acabou de entrar só age no seu próximo turno.',
    point: (c) => [sel.obj(id(c.eng, ME, C.survivor))],
  },
  {
    id: 'end1',
    kind: 'act',
    title: 'Encerrar o turno',
    body: () => 'Não há mais nada útil a fazer: encerre o turno. O oponente joga o dele (no tutorial ele segue um roteiro).',
    how: (c) => clickOrTap(c, 'Clique em <b>Encerrar turno</b> (ou aperte Espaço).', 'Toque em <b>Encerrar</b>.'),
    point: () => [sel.end],
    allow: onlyRoot(() => 'end', 'Agora é só encerrar o turno (o botão apontado).'),
    done: (eng) => eng.turn >= 2,
    solve: (d) => (d.root ? ['end'] : null),
  },
  {
    id: 'opp2',
    kind: 'watch',
    title: 'Turno do oponente',
    body: () => 'O oponente canaliza 3 runas (é o primeiro turno dele, e ele joga em segundo) e joga uma unidade, <b>Lingering Animus</b>, na base dele.',
    done: (eng, d) => myRoot(eng, d, 3),
  },
  {
    id: 'move1',
    kind: 'act',
    title: 'Mover e conquistar',
    body: () =>
      'Seu turno de novo: tudo o que é seu ficou pronto, você canalizou mais 2 runas e comprou 1 carta. Leve a <b>Staunch Survivor</b> para o campo <b>Bandle Tree</b>. Mover <b>exaure</b> a unidade; um campo sem dono em que só você tem unidades é <b>conquistado</b>: +1 ponto.',
    how: (c) => clickOrTap(c, 'Clique na Staunch Survivor e depois no campo Bandle Tree (ou arraste).', 'Toque na Staunch Survivor e depois no campo Bandle Tree.'),
    point: (c) => (document0().querySelector('.tt-bf.dest') ? [sel.bf(0)] : [sel.obj(id(c.eng, ME, C.survivor))]),
    use: (c) => [sel.obj(id(c.eng, ME, C.survivor)), sel.bf(0)],
    allow: (d, a, eng) => {
      const why = 'Agora é a vez de levar a Staunch Survivor para Bandle Tree.';
      if (d.root) return a[0] === 'move' ? null : why;
      if (d.prompt.startsWith('Quais unidades')) return a.length === 1 && a[0] === id(eng, ME, C.survivor) ? null : why;
      if (d.prompt.startsWith('Para onde')) return a[0] === '0' ? null : why;
      return null;
    },
    done: (eng) => atBf(eng, ME, C.survivor, 0),
    solve: (d, eng) => (d.root ? ['move'] : d.prompt.startsWith('Para onde') ? ['0'] : d.prompt.startsWith('Quais unidades') ? [id(eng, ME, C.survivor)] : null),
  },
  {
    id: 'sd1',
    kind: 'act',
    title: 'Um showdown',
    body: () =>
      'Quando unidades chegam a um campo que não é do dono delas, abre-se um <b>showdown</b>: uma pausa em que os dois podem responder com cartas rápidas antes de o campo mudar de dono. Quem tem o <b>Focus</b> age primeiro. Aqui ninguém quer responder.',
    how: (c) => clickOrTap(c, 'Clique em <b>Passar</b>.', 'Toque em <b>Passar</b>.'),
    point: () => [sel.end],
    allow: onlyRoot(() => 'pass', 'Passe: não vale a pena gastar o En Garde agora.'),
    done: (eng) => eng.bfs[0].controller === ME,
    solve: (d) => (d.root ? ['pass'] : null),
  },
  {
    id: 'conquer',
    kind: 'info',
    title: 'Conquistado: +1 ponto',
    body: () =>
      'Bandle Tree agora é seu e você ganhou <b>1 ponto</b> por conquistar (5). Cada campo dá ponto a um jogador no máximo uma vez por turno.',
    point: () => [sel.plate, sel.bf(0)],
  },
  {
    id: 'play2',
    kind: 'act',
    title: 'Mais uma unidade',
    body: () =>
      'Jogue <b>Laurent Bladekeeper</b> (3 de energia: as suas 3 runas prontas) na sua <b>base</b>. Dá para jogar unidade num campo que você controla, mas desta vez vamos pela base.',
    how: (c) => clickOrTap(c, 'Clique na carta, depois em <b>Jogar</b>, e escolha a sua base.', 'Toque na carta, em <b>Jogar</b> e depois na sua base.'),
    point: (c) => [sel.armGo, sel.opt(playOpt(c.eng, ME, C.laurent)), `${sel.base}.actionable`, sel.hand(id(c.eng, ME, C.laurent))],
    use: () => [sel.base, '.tt-dopts [data-opt="0"]'],
    allow: (d, a, eng) => {
      const why = 'Agora é a vez de jogar o Laurent Bladekeeper na sua base.';
      if (d.root) return a[0] === playOpt(eng, ME, C.laurent) ? null : why;
      if (isWhere(d)) return a[0] === baseOf(d, eng, ME) ? null : 'Desta vez, jogue na sua base.';
      return null;
    },
    done: (eng) => onBoard(eng, ME, C.laurent),
    solve: (d, eng) => (d.root ? [playOpt(eng, ME, C.laurent)] : isWhere(d) ? [baseOf(d, eng, ME)!] : null),
  },
  {
    id: 'end2',
    kind: 'act',
    title: 'Encerrar o turno',
    body: () =>
      'Encerre o turno. Repare: a Staunch Survivor ficou em Bandle Tree. Se no começo do seu próximo turno o campo ainda for seu, com unidade sua lá, você <b>segura</b> o campo (hold) e ganha mais 1 ponto.',
    how: (c) => clickOrTap(c, 'Clique em <b>Encerrar turno</b>.', 'Toque em <b>Encerrar</b>.'),
    point: () => [sel.end],
    allow: onlyRoot(() => 'end', 'Agora é só encerrar o turno.'),
    done: (eng) => eng.turn >= 4,
    solve: (d) => (d.root ? ['end'] : null),
  },
  {
    id: 'opp4',
    kind: 'watch',
    title: 'Turno do oponente',
    body: () =>
      'O oponente leva o Lingering Animus para o campo dele, <b>Grove of the God-Willow</b>, e conquista (5 pontos). Depois joga <b>Noxus Saboteur</b> na base e guarda 2 runas prontas…',
    done: (eng, d) => myRoot(eng, d, 5),
  },
  {
    id: 'hold',
    kind: 'info',
    title: 'Hold: +1 ponto',
    body: () =>
      'No começo do seu turno você ainda controlava Bandle Tree, com a Staunch Survivor lá: <b>segurou</b> o campo e ganhou 1 ponto (6). Segurar vale 1 ponto em cada um dos seus turnos enquanto o campo for seu.',
    point: () => [sel.plate, sel.bf(0)],
  },
  {
    id: 'combat',
    kind: 'info',
    title: 'Combate',
    body: () =>
      'Mover para um campo com unidades do oponente abre um <b>combate</b>: quem chega é o <b>atacante</b>; o dono das unidades de lá é o <b>defensor</b>. Cada unidade causa dano igual ao seu <b>Might</b> (o número grande na carta); quem recebe dano igual ou maior que o próprio Might <b>morre</b>. Se só sobrarem atacantes, o campo é conquistado.<br>O Laurent tem Might 3; o Lingering Animus, Might 2.',
    point: (c) => [sel.obj(id(c.eng, OPP, C.animus))],
  },
  {
    id: 'attack',
    kind: 'act',
    title: 'Atacar',
    body: () => 'Leve o <b>Laurent Bladekeeper</b> para <b>Grove of the God-Willow</b>, onde está o Lingering Animus.',
    how: (c) => clickOrTap(c, 'Clique no Laurent e depois em Grove of the God-Willow (ou arraste).', 'Toque no Laurent e depois em Grove of the God-Willow.'),
    point: (c) => (document0().querySelector('.tt-bf.dest') ? [sel.bf(1)] : [sel.obj(id(c.eng, ME, C.laurent))]),
    use: (c) => [sel.obj(id(c.eng, ME, C.laurent)), sel.bf(1)],
    allow: (d, a, eng) => {
      const why = 'Agora é a vez de atacar Grove of the God-Willow com o Laurent Bladekeeper.';
      if (d.root) return a[0] === 'move' ? null : why;
      if (d.prompt.startsWith('Quais unidades')) return a.length === 1 && a[0] === id(eng, ME, C.laurent) ? null : 'Mova só o Laurent: a Staunch Survivor fica segurando Bandle Tree.';
      if (d.prompt.startsWith('Para onde')) return a[0] === '1' ? null : why;
      return null;
    },
    done: (eng) => atBf(eng, ME, C.laurent, 1),
    solve: (d, eng) => (d.root ? ['move'] : d.prompt.startsWith('Para onde') ? ['1'] : d.prompt.startsWith('Quais unidades') ? [id(eng, ME, C.laurent)] : null),
  },
  {
    id: 'focus',
    kind: 'act',
    title: 'Showdown e Focus',
    body: () =>
      'Antes do dano vem o <b>showdown</b> do combate. Quem tem o <b>Focus</b> pode jogar uma carta rápida (Action ou Reaction) ou passar; ao passar, o Focus vai para o outro. Quando os dois passam em seguida, vem o dano. Você está com o Focus: passe e veja o que o oponente faz.',
    how: (c) => clickOrTap(c, 'Clique em <b>Passar</b>.', 'Toque em <b>Passar</b>.'),
    point: () => [sel.end],
    allow: onlyRoot(() => 'pass', 'Passe primeiro: guarde o En Garde para responder.'),
    done: (eng) => eng.chain.length > 0 || !inHand(eng, OPP, C.odds),
    solve: (d) => (d.root ? ['pass'] : null),
  },
  {
    id: 'stack',
    kind: 'act',
    title: 'A pilha: responda!',
    body: () =>
      'O oponente jogou <b>Against the Odds</b>, uma <b>Reaction</b>: Animus +2 de Might (fica com 4), o que mataria o seu Laurent. Ela está na <b>pilha</b> e ainda não resolveu — com a pilha aberta, qualquer um pode responder com uma Reaction, e a pilha resolve de cima para baixo: <b>o último a entrar resolve primeiro</b>.<br>Responda com <b>En Garde</b>: +1 de Might no Laurent e mais +1 porque ele é a sua única unidade lá.',
    how: (c) => clickOrTap(c, 'Clique no En Garde, depois em <b>Jogar</b>, e escolha o Laurent.', 'Toque no En Garde, em <b>Jogar</b> e depois no Laurent.'),
    point: (c) => {
      const laurent = sel.obj(id(c.eng, ME, C.laurent));
      return [sel.armGo, sel.opt(playOpt(c.eng, ME, C.enGarde)), `.tt-mat .card.actionable${laurent.slice('.tt-mat '.length)}`, sel.hand(id(c.eng, ME, C.enGarde))];
    },
    use: (c) => [sel.obj(id(c.eng, ME, C.laurent)), sel.opt(id(c.eng, ME, C.laurent))],
    allow: (d, a, eng) => {
      if (d.root) return a[0] === playOpt(eng, ME, C.enGarde) ? null : 'Responda com o En Garde: se passar, a Against the Odds resolve e o Laurent morre.';
      if (/En Garde/.test(d.prompt) || d.purpose === 'target') return a[0] === id(eng, ME, C.laurent) ? null : 'Dê o +2 ao Laurent, que está no combate.';
      return null;
    },
    done: (eng) => !inHand(eng, ME, C.enGarde),
    solve: (d, eng) => (d.root ? [playOpt(eng, ME, C.enGarde)] : d.options.some((o) => o.id === id(eng, ME, C.laurent)) ? [id(eng, ME, C.laurent)] : null),
  },
  {
    id: 'resolve',
    kind: 'watch',
    title: 'A pilha resolve',
    body: () => 'O En Garde, que entrou por último, resolve primeiro: Laurent fica com Might 5. Depois resolve a Against the Odds: Animus com 4. Os dois passam e vem o dano…',
    done: (eng, d) => eng.bfs[1].controller === ME || (!!d && d.player === ME && !!d.root && !eng.showdown),
  },
  {
    id: 'result',
    kind: 'info',
    title: 'Resultado do combate',
    body: () =>
      'Laurent causou 5 de dano no Animus (Might 4): <b>morreu</b>. Animus causou 4 no Laurent (Might 5): <b>sobreviveu</b>. Só sobrou o atacante, então você <b>conquistou</b> Grove of the God-Willow: 7 pontos!<br>Sem o En Garde seria 3 contra 4: o Laurent morreria e o Animus ficaria. O dano marcado some no fim do turno.',
    point: () => [sel.plate, sel.bf(1)],
  },
  {
    id: 'keywords',
    kind: 'read',
    title: 'Palavras-chave',
    body: () =>
      'As <b>palavras-chave</b> são os termos entre colchetes no texto da carta, como [Assault] e [Shield]: regras curtas que se repetem em muitas cartas. Leia as da Staunch Survivor.',
    how: (c) => clickOrTap(c, 'Aponte o mouse para a Staunch Survivor em Bandle Tree (ou clique nela).', 'Toque na Staunch Survivor em Bandle Tree para ampliar.'),
    point: (c) => [sel.obj(id(c.eng, ME, C.survivor))],
    use: (c) => [sel.obj(id(c.eng, ME, C.survivor))],
    read: (eng) => id(eng, ME, C.survivor),
  },
  {
    id: 'keywords2',
    kind: 'info',
    title: 'Assault e Shield',
    body: () =>
      '<b>[Assault 2]</b>: +2 de Might enquanto ataca. <b>[Shield 2]</b>: +2 enquanto defende. Então a Staunch Survivor ataca com 4 e defende com 4, apesar do Might 2 impresso.<br>Outras comuns: [Tank] (recebe dano primeiro), [Accelerate] (paga a mais para entrar pronta), [Ganking] (como o Laurent: vai de um campo direto para outro). O botão <b>?</b> da mesa tem o glossário completo.',
    point: (c) => [sel.obj(id(c.eng, ME, C.survivor))],
  },
  {
    id: 'lastpoint',
    kind: 'info',
    title: 'O último ponto',
    body: () =>
      'Você tem 7: falta 1. Regra do último ponto: o ponto da vitória por <b>conquista</b> só vale se você pontuou em <b>todos</b> os campos naquele turno — senão, você compra 1 carta no lugar do ponto. Por <b>hold</b> vale sempre.<br>Você controla os dois campos, com unidades neles: se ninguém os tomar, no começo do seu próximo turno você segura e vence.',
    point: () => [sel.plate],
  },
  {
    id: 'end3',
    kind: 'act',
    title: 'Encerrar o turno',
    body: () => 'Encerre o turno. No fim do turno o dano marcado nas unidades some e acabam os efeitos “neste turno” (o +2 do En Garde, o +2 da Against the Odds).',
    how: (c) => clickOrTap(c, 'Clique em <b>Encerrar turno</b>.', 'Toque em <b>Encerrar</b>.'),
    point: () => [sel.end],
    allow: onlyRoot(() => 'end', 'Agora é só encerrar o turno.'),
    done: (eng) => eng.turn >= 6,
    solve: (d) => (d.root ? ['end'] : null),
  },
  {
    id: 'opp6',
    kind: 'watch',
    title: 'Turno do oponente',
    body: () => 'O oponente joga <b>Vanguard Sergeant</b> na base e passa a vez sem atacar. Começa o seu turno…',
    done: (eng) => eng.winner !== null,
  },
  {
    id: 'win',
    kind: 'end',
    title: 'Vitória!',
    body: () =>
      'Você segurou os dois campos no começo do turno (+2) e passou dos <b>8 pontos</b>. Você já sabe o essencial: runas, unidades, mover, conquistar e segurar, combate, pilha, showdown e palavras-chave.<br><b>Agora jogue de verdade</b>: uma partida contra a IA no nível Fácil.',
    point: () => [sel.plate],
  },
];

/** `document` só existe no navegador; nos testes (Node) os passos não consultam a tela. */
function document0(): { querySelector(s: string): unknown } {
  return typeof document !== 'undefined' ? document : { querySelector: () => null };
}

/** Avança os passos que já se cumpriram (act/watch pelo estado da partida; info e read só pelo jogador). */
export function advance(i: number, eng: Engine, d: Decision | null): number {
  while (i < STEPS.length - 1) {
    const s = STEPS[i];
    if ((s.kind === 'act' || s.kind === 'watch') && s.done?.(eng, d)) i++;
    else break;
  }
  return i;
}

/** A jogada do oponente, pelo roteiro (no lugar da IA). */
export function oppAnswer(d: Decision, eng: Engine): Answer {
  const play = (code: string) => (has(d, playOpt(eng, OPP, code)) ? [playOpt(eng, OPP, code)] : null);
  if (d.kind === 'mulligan') return [];
  if (d.root && d.kind === 'action') {
    if (eng.turn === 2) return play(C.animus) ?? ['end'];
    if (eng.turn === 4) {
      if (card(eng, OPP, C.animus)?.loc?.t === 'base' && has(d, 'move')) return ['move'];
      return play(C.saboteur) ?? ['end'];
    }
    if (eng.turn === 6) return play(C.sergeant) ?? ['end'];
    return ['end'];
  }
  if (d.root && d.kind === 'focus') return (eng.showdown?.combat && eng.showdown.bf === 1 && play(C.odds)) || ['pass'];
  if (d.root) return has(d, 'pass') ? ['pass'] : has(d, 'end') ? ['end'] : [d.options[0].id];
  if (isWhere(d)) return [baseOf(d, eng, OPP) ?? d.options[0].id];
  if (d.prompt.startsWith('Para onde')) return [has(d, '1') ? '1' : d.options[0].id];
  if (d.prompt.startsWith('Quais unidades')) return [id(eng, OPP, C.animus)];
  return d.min === 0 ? [] : d.options.slice(0, d.min || 1).map((o) => o.id);
}
