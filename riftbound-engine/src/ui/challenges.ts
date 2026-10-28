// Modo Desafios: tela com a lista, faixa do objetivo na mesa, abertura e resultado de cada desafio. Os desafios em si
// (mesa montada, objetivo, dica) ficam em src/data/challenges.ts; a partida é uma partida normal contra a IA que começa
// na mesa montada (GameConfig.scenario), então desfazer, salvar, relatar e replay funcionam como sempre.
import { Game } from '../engine/game';
import { CHALLENGES, challengeById, challengeConfig, challengeResult, goalText, type Challenge, type ChallengeResult } from '../data/challenges';
import * as acc from './account';
import { artUrl } from './art';
import { esc, rulesHtml } from './text';

export interface ChallengeHooks {
  /** Abre a partida do desafio na mesa. */
  play: (g: Game) => void;
  /** Volta para a tela inicial. */
  home: () => void;
  /** Fecha a partida e abre a lista de desafios. */
  list: () => void;
  render: () => void;
}
let hooks: ChallengeHooks | null = null;
export function setChallengeHooks(h: ChallengeHooks) {
  hooks = h;
}

const LEVEL = ['', 'Fácil', 'Médio', 'Difícil'];
/** Dicas abertas na lista. */
const hintOpen = new Set<string>();
/** Partida aberta: tela de abertura já fechada? vitória já gravada? resultado escondido para ver a mesa? */
let run: { game: Game; intro: boolean; recorded: boolean; best: boolean; moves: number; hiddenAt: string } | null = null;

/** O desafio da partida (pelo cfg; vale também para a partida salva e para o replay). */
export function challengeOf(g: Game | null | undefined): Challenge | undefined {
  const id = (g?.cfg as { challenge?: unknown } | undefined)?.challenge;
  return typeof id === 'string' ? challengeById(id) : undefined;
}
const idx = (ch: Challenge) => CHALLENGES.indexOf(ch);
const solved = (ch: Challenge) => !!acc.challengeProgress(ch.id)?.solved;
/** Um desafio libera quando o anterior foi resolvido. */
export function unlocked(ch: Challenge): boolean {
  const i = idx(ch);
  return i <= 0 || solved(ch) || solved(CHALLENGES[i - 1]);
}

/** Jogadas (ações da fase principal, sem contar "encerrar o turno") que o jogador fez na partida. */
export function movesOf(g: Game): number {
  const r = new Game(g.cfg);
  let n = 0;
  for (const a of g.answers) {
    const d = r.current;
    if (!d) break;
    if (d.player === 0 && d.kind === 'action' && !['end', '__refresh', 'manualpay'].includes(a[0])) n++;
    if (!r.answer(a)) break;
  }
  return n;
}

/** Começa (ou recomeça) o desafio: conta a tentativa e devolve a partida. */
export function startChallenge(id: string, names?: [string, string]): Game | null {
  const ch = challengeById(id);
  if (!ch || !unlocked(ch)) return null;
  acc.recordChallengeTry(id);
  const g = new Game(challengeConfig(ch, names));
  run = { game: g, intro: true, recorded: false, best: false, moves: 0, hiddenAt: '' };
  return g;
}

/** Estado da partida aberta (desafio, resultado) — grava a vitória na conta na primeira vez. */
function state(g: Game): { ch: Challenge; result: ChallengeResult } | null {
  const ch = challengeOf(g);
  if (!ch) return null;
  if (!run || run.game !== g) run = { game: g, intro: false, recorded: false, best: false, moves: 0, hiddenAt: '' };
  const result = challengeResult(g.engine, ch);
  if (result === 'won' && !run.recorded) {
    run.recorded = true;
    run.moves = movesOf(g);
    run.best = acc.recordChallengeWin(ch.id, run.moves);
  }
  return { ch, result };
}

/** A partida do desafio já tem resultado: a IA para de jogar (a mesa fica como terminou). */
export function challengeHold(g: Game | null): boolean {
  return !!g && !!challengeOf(g) && state(g)?.result != null;
}
/** Partida de desafio com a tela de abertura ainda aberta. */
export function challengeIntro(g: Game | null): boolean {
  return !!g && !!run && run.game === g && run.intro;
}

const ord = (n: number) => `${n}ª`;
function progressLine(ch: Challenge): string {
  const p = acc.challengeProgress(ch.id);
  if (!p) return unlocked(ch) ? 'Ainda não tentado' : 'Resolva o anterior para liberar';
  const tries = `${p.tries} ${p.tries === 1 ? 'tentativa' : 'tentativas'}`;
  if (!p.solved) return tries;
  return `${tries} · melhor: ${p.best} ${p.best === 1 ? 'jogada' : 'jogadas'}`;
}

/** Tela com a lista dos desafios. */
export function challengesHtml(profileName: string): string {
  const done = CHALLENGES.filter(solved).length;
  const cards = CHALLENGES.map((ch, i) => {
    const open = unlocked(ch);
    const ok = solved(ch);
    const p = acc.challengeProgress(ch.id);
    const url = artUrl(ch.cover);
    const hint = hintOpen.has(ch.id);
    const status = ok ? '<span class="chst ok">Resolvido</span>' : open ? (p?.tries ? '<span class="chst try">Em aberto</span>' : '<span class="chst new">Novo</span>') : '<span class="chst lock">Bloqueado</span>';
    return `<article class="chcard mz${ok ? ' solved' : ''}${open ? '' : ' locked'}">
      <div class="chcov">${url ? `<img src="${url}" alt="" draggable="false">` : ''}<span class="chnum">${i + 1}</span></div>
      <div class="chbody">
        <div class="chtop"><span class="chlv l${ch.level}" title="Dificuldade">${'◆'.repeat(ch.level)}<i>${LEVEL[ch.level]}</i></span>${status}</div>
        <h2>${esc(ch.title)}</h2>
        <p class="chteach">${rulesHtml(ch.teaches)}</p>
        ${open ? `<p class="chgoal">${esc(goalText(ch))}</p>` : ''}
        <p class="chprog muted">${esc(progressLine(ch))}</p>
        ${open && hint ? `<p class="chhint">${rulesHtml(ch.hint)}</p>` : ''}
        ${ok && hint ? `<p class="chsol"><b>Solução:</b> ${rulesHtml(ch.solution)}</p>` : ''}
        <div class="chacts">${open ? `<button class="primary" data-act="chplay" data-id="${ch.id}">${ok ? 'Jogar de novo' : p?.tries ? 'Tentar de novo' : 'Jogar'}</button><button data-act="chhint" data-id="${ch.id}" aria-expanded="${hint}">${hint ? 'Esconder dica' : ok ? 'Dica e solução' : 'Ver dica'}</button>` : ''}</div>
      </div>
    </article>`;
  }).join('');
  return `<header class="topbar"><div class="brand">Riftbound <span>mesa</span></div><div class="turninfo">${esc(profileName)}</div><div class="tb"><button type="button" data-act="chback">Voltar</button></div></header>
  <main class="setup challenges">
    <div class="chhead"><div><h1>Desafios</h1><p>Uma mesa montada e um objetivo: ache a jogada. Cada desafio ensina uma interação do jogo; a IA joga pelo oponente quando for a vez dela. Desfazer vale como numa partida.</p></div>
      <div class="chcount"><b>${done}</b><span>de ${CHALLENGES.length} resolvidos</span></div></div>
    <div class="chgrid">${cards}</div>
  </main>`;
}

/** Faixa do objetivo sobre a mesa (com Dica e Recomeçar). */
export function challengeHudHtml(g: Game): string {
  const st = state(g);
  if (!st) return '';
  const { ch, result } = st;
  const hint = hintOpen.has(ch.id);
  return `<div class="chhud${result ? ` ${result}` : ''}" role="status">
    <div class="chhud-main"><span class="chhud-k">Desafio ${idx(ch) + 1} · ${esc(ch.title)}</span><b>${esc(goalText(ch))}</b></div>
    <div class="chhud-btns"><button type="button" data-act="chhint" data-id="${ch.id}" aria-expanded="${hint}">${hint ? 'Esconder dica' : 'Dica'}</button><button type="button" data-act="chretry">Recomeçar</button></div>
    ${hint ? `<p class="chhud-hint">${rulesHtml(ch.hint)}</p>` : ''}
  </div>`;
}

/** Abertura (situação e objetivo) ou resultado, no centro da mesa. Vazio quando não há nada a mostrar. */
export function challengeOverlayHtml(g: Game): string {
  const st = state(g);
  if (!st || !run) return '';
  const { ch, result } = st;
  if (run.intro)
    return `<div class="tt-overlay chintro"><div class="tt-obox"><p class="tt-kicker">Desafio ${idx(ch) + 1} de ${CHALLENGES.length} · ${LEVEL[ch.level]}</p><h2>${esc(ch.title)}</h2>
      <p class="chbrief">${rulesHtml(ch.brief)}</p><p class="chgoalbig">${esc(goalText(ch))}</p>
      <div class="btns"><button class="primary" data-act="chgo">Começar</button><button data-act="chlist">Lista de desafios</button></div></div></div>`;
  if (!result) return '';
  const key = `${g.answers.length}:${result}`;
  if (run.hiddenAt === key) return `<button class="tt-reopen" data-act="chshow">${result === 'won' ? 'Desafio cumprido' : 'Desafio perdido'}</button>`;
  const next = CHALLENGES[idx(ch) + 1];
  if (result === 'won') {
    const best = run.best && (acc.challengeProgress(ch.id)?.tries ?? 0) > 1 ? ' · sua melhor vitória' : '';
    return `<div class="tt-overlay end win chres"><div class="tt-obox"><p class="tt-kicker">Desafio ${idx(ch) + 1} cumprido</p><h2>${esc(ch.title)}</h2>
      <p>${run.moves} ${run.moves === 1 ? 'jogada' : 'jogadas'}${best}</p><p class="chsol">${rulesHtml(ch.solution)}</p>
      <div class="btns">${next ? `<button class="primary" data-act="chplay" data-id="${next.id}">Próximo: ${esc(next.title)}</button>` : '<span class="chall">Você resolveu o último desafio!</span>'}<button data-act="chretry">Jogar de novo</button><button data-act="chlist">Lista de desafios</button><button data-act="chhide">Ver a mesa</button></div></div></div>`;
  }
  return `<div class="tt-overlay end lose chres"><div class="tt-obox"><p class="tt-kicker">Não foi desta vez</p><h2>${esc(ch.title)}</h2>
    <p>${esc(goalText(ch))} ${g.engine.winner === 1 ? 'O oponente venceu.' : 'O turno acabou sem cumprir o objetivo.'}</p>
    <div class="btns"><button class="primary" data-act="chretry">Tentar de novo</button><button data-act="undo">Desfazer a última jogada</button><button data-act="chlist">Lista de desafios</button><button data-act="chhide">Ver a mesa</button></div>
    ${hintOpen.has(ch.id) ? `<p class="chhint">${rulesHtml(ch.hint)}</p>` : `<button class="link" data-act="chhint" data-id="${ch.id}">Ver dica</button>`}</div></div>`;
}

/** Cliques do modo Desafios (botões data-act="ch…"). `g` = partida aberta. Devolve true se tratou. */
export function onChallengeClick(t: HTMLElement, g: Game | null): boolean {
  const el = t.closest('[data-act]') as HTMLElement | null;
  const a = el?.dataset.act;
  if (!a || !a.startsWith('ch') || !hooks) return false;
  const ch = challengeOf(g);
  switch (a) {
    case 'chplay': {
      const ng = startChallenge(el!.dataset.id!);
      if (ng) hooks.play(ng);
      return true;
    }
    case 'chretry': {
      const ng = ch ? startChallenge(ch.id, g!.cfg.names) : null;
      if (ng) {
        run!.intro = false;
        hooks.play(ng);
      }
      return true;
    }
    case 'chhint': {
      const id = el!.dataset.id!;
      if (hintOpen.has(id)) hintOpen.delete(id);
      else {
        hintOpen.add(id);
        acc.recordChallengeHint(id);
      }
      hooks.render();
      return true;
    }
    case 'chgo':
      if (run) run.intro = false;
      hooks.render();
      return true;
    case 'chhide':
      if (run && g) run.hiddenAt = `${g.answers.length}:${challengeResult(g.engine, ch!)}`;
      hooks.render();
      return true;
    case 'chshow':
      if (run) run.hiddenAt = '';
      hooks.render();
      return true;
    case 'chlist':
      hooks.list();
      return true;
    case 'chback':
      hooks.home();
      return true;
  }
  return false;
}

/** Artes que a lista mostra. */
export const challengeArtCodes = () => CHALLENGES.map((c) => c.cover);
