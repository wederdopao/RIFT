// Tutorial "Aprender a jogar": uma partida guiada contra um oponente roteirizado (tutorial-script.ts). Cada passo
// aparece numa caixa sobre a mesa, com uma seta no que usar; só a jogada do passo vale (o resto fica apagado e, se
// tentar, a caixa explica) e o passo avança sozinho quando ela acontece. O progresso fica na conta local.
// A mesa (main.ts) só chama: init (o que o tutorial pode fazer na mesa), isTut, oppAnswer, afterRender e os botões
// da tela inicial (homeBanner/homeButton). Os cliques do tutorial são tratados aqui, antes dos da mesa.
import { Game } from '../engine/game';
import { MANUAL_PAY } from '../engine/engine';
import type { Answer, Decision } from '../engine/types';
import * as acc from './account';
import { STEPS, advance, oppAnswer as scriptAnswer, tutorialConfig, type TutCtx, type TutStep } from './tutorial-script';
import { zRect, zpx } from './zoom';

/** A partida do tutorial: igual à normal, mas cada resposta sua passa pelo passo atual; desfazer não existe. */
export class TutorialGame extends Game {
  gate: ((d: Decision, a: Answer) => string | null) | null = null;
  /** a próxima resposta vem do próprio tutorial (refazer o progresso salvo, passar sozinho no turno do oponente) */
  bypass = false;
  answer(a: Answer): boolean {
    const d = this.current;
    if (d && d.player === 0 && this.gate && !this.bypass) {
      const why = this.gate(d, a);
      if (why !== null) {
        this.error = why || null;
        return false;
      }
    }
    this.bypass = false;
    return super.answer(a);
  }
  undo() {
    /* no tutorial não se desfaz: o roteiro segue o estado da partida */
  }
}

export interface TutHost {
  game(): Game | null;
  /** abre esta partida na mesa (contra o oponente roteirizado) */
  start(g: TutorialGame): void;
  /** fecha a partida e volta à tela inicial */
  exit(): void;
  render(): void;
  /** responde a decisão atual pela mesa (mesmo caminho de um clique) */
  answer(ids: string[]): void;
  touch(): boolean;
  zoomId(): string | null;
  /** abre o zoom desta carta (null fecha) */
  zoom(id: string | null): void;
  /** começa a partida de verdade: contra a IA no Fácil */
  playEasy(): void;
}

let host: TutHost | null = null;
let idx = 0;
let msg = '';
let msgAt = 0;
let collapsed = false;
let layer: HTMLElement | null = null;
let layerKey = '';
let autoKey = '';
let ticker: ReturnType<typeof setInterval> | null = null;

const tgame = (): TutorialGame | null => {
  const g = host?.game();
  return g instanceof TutorialGame ? g : null;
};
export const isTut = (g: Game | null | undefined): boolean => g instanceof TutorialGame;
const cur = (): TutStep => STEPS[Math.min(idx, STEPS.length - 1)];
const ctx = (g: TutorialGame): TutCtx => ({ eng: g.engine, touch: !!host?.touch() });

/** Passos que contam no "passo X de N" (os de esperar o oponente não contam). */
const COUNTED = STEPS.filter((s) => s.kind !== 'watch');
const stepNo = (s: TutStep) => COUNTED.indexOf(s) + 1;

export function init(h: TutHost) {
  host = h;
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('pointerdown', onPointerCapture, true);
  document.addEventListener('mouseover', onHover);
  window.addEventListener('resize', () => place());
}

/** Jogada do oponente no tutorial (a mesa usa no lugar da IA). */
export function oppAnswer(g: Game): Answer {
  return scriptAnswer(g.current!, g.engine);
}

// ── começar, continuar, sair ──
function start(resume: boolean) {
  if (!host) return;
  const pr = acc.tutorialProgress();
  let g = new TutorialGame(tutorialConfig());
  idx = 0;
  if (resume && pr && !pr.done && pr.answers.length) {
    let ok = true;
    for (const a of pr.answers) {
      g.bypass = true;
      if (!g.answer(a)) {
        ok = false;
        break;
      }
    }
    if (ok) idx = Math.max(0, Math.min(pr.step, STEPS.length - 1));
    else g = new TutorialGame(tutorialConfig()); // o roteiro mudou de versão: começa de novo
  }
  // mulligan: o tutorial fica com a mão (a do oponente o roteiro responde)
  if (g.current?.kind === 'mulligan' && g.current.player === 0) {
    g.bypass = true;
    g.answer([]);
  }
  g.gate = gate;
  msg = '';
  collapsed = false;
  host.start(g);
  persist(g);
}

function persist(g: TutorialGame) {
  const pr = acc.tutorialProgress();
  const done = !!pr?.done || cur().kind === 'end';
  acc.setTutorialProgress({ step: idx, answers: g.answers.map((a) => [...a]), done, at: Date.now() });
}

function say(text: string) {
  msg = text;
  msgAt = Date.now();
  layerKey = '';
  draw();
  const box = layer?.querySelector('.tut-box');
  if (box) {
    box.classList.remove('shake');
    void (box as HTMLElement).offsetWidth;
    box.classList.add('shake');
  }
}

/** O que dizer quando o jogador tenta outra coisa. */
function blockMsg(): string {
  const s = cur();
  if (s.kind === 'info') return 'Leia o passo e toque em Continuar.';
  if (s.kind === 'watch') return 'É a vez do oponente: espere ele jogar.';
  if (s.kind === 'read') return host?.touch() ? 'Antes, toque na Staunch Survivor para ler a carta.' : 'Antes, aponte o mouse para a Staunch Survivor e leia a carta.';
  if (s.kind === 'end') return 'O tutorial acabou: escolha uma opção na caixa.';
  return 'No tutorial, faça a jogada indicada pela seta.';
}

/** Cada resposta sua passa por aqui (TutorialGame.answer). */
function gate(d: Decision, a: Answer): string | null {
  const g = tgame();
  if (!g) return null;
  if (a.length === 1 && a[0] === MANUAL_PAY) return ''; // o modo de pagamento fica no automático (recusa sem aviso)
  const s = cur();
  if (s.kind === 'act') {
    const why = s.allow?.(d, a, g.engine) ?? null;
    if (why) say(why);
    return why;
  }
  if (!d.root) return null;
  const why = blockMsg();
  say(why);
  return why;
}

// ── depois de cada desenho da mesa ──
export function afterRender() {
  const g = tgame();
  document.body.classList.toggle('tut', !!g);
  if (!g) {
    layer?.remove();
    layer = null;
    layerKey = '';
    if (ticker) clearInterval(ticker);
    ticker = null;
    return;
  }
  const before = idx;
  idx = advance(idx, g.engine, g.current);
  const s = cur();
  if (s.kind === 'read' && s.read && host!.zoomId() === s.read(g.engine)) idx++;
  if (idx !== before) {
    msg = '';
    collapsed = false;
  }
  if (idx !== before || cur().kind === 'end') persist(g);
  else if (g.answers.length !== (acc.tutorialProgress()?.answers.length ?? -1)) persist(g);
  draw();
  decorate();
  autoPass(g);
  if (!ticker) ticker = setInterval(place, 300);
}

/** Nos passos de esperar o oponente, uma pergunta sua (passar na pilha) é respondida sozinha. */
function autoPass(g: TutorialGame) {
  const d = g.current;
  if (cur().kind !== 'watch' || !d || d.player !== 0 || g.engine.winner !== null) return;
  const key = `${g.answers.length}`;
  if (autoKey === key) return;
  autoKey = key;
  setTimeout(() => {
    if (tgame() !== g || `${g.answers.length}` !== key || !g.current || g.current.player !== 0) return;
    const c = g.current;
    const ans = c.options.some((o) => o.id === 'pass') ? ['pass'] : c.min === 0 ? [] : [c.options[0].id];
    g.bypass = true;
    host!.answer(ans);
  }, 700);
}

/** O que dá para clicar na mesa: o que não é do passo fica apagado (e o clique é barrado com a explicação). */
const ACTIONABLE = [
  '.tt-mat .card.actionable',
  '.tt-mat .card.movable',
  '.tt-mat .card.dragok',
  '.tt-mat .tt-rune.actionable',
  '.tt-bf.actionable',
  '.tt-bf.dest',
  '.tt-base.actionable',
  '.tt-base.dest',
  '.tt-endbtn',
  '.tt-dopts [data-opt]',
  '.tt-optlist [data-opt]',
  '.tt-overlay [data-opt]',
  '.zoom [data-opt]',
  '.tt-ctx [data-opt]',
  '.tt-ctx [data-act]',
  '.tt-arm [data-act=armgo]',
  '.tt-mpay',
  '[data-act=oracle]',
].join(',');

function allowedSel(g: TutorialGame): string[] {
  const s = cur();
  if (s.kind !== 'act' && s.kind !== 'read') return [];
  const c = ctx(g);
  return [...(s.point?.(c) ?? []), ...(s.use?.(c) ?? [])];
}

function decorate() {
  const g = tgame();
  if (!g) return;
  const ok = allowedSel(g);
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('#app ' + ACTIONABLE.split(',').join(', #app ')))) {
    const allowed = ok.some((q) => el.matches(q) || !!el.closest(q));
    el.classList.toggle('tut-off', !allowed);
  }
}

function onClickCapture(ev: MouseEvent) {
  const t = ev.target as HTMLElement | null;
  if (!t) return;
  const btn = t.closest('[data-tut]') as HTMLElement | null;
  if (btn) {
    ev.stopPropagation();
    ev.preventDefault();
    onTutButton(btn.dataset.tut!);
    return;
  }
  const g = tgame();
  if (!g) return;
  if (t.closest('#tut-layer')) {
    ev.stopPropagation();
    return;
  }
  const s = cur();
  if (s.kind === 'read' && s.read) {
    const id = s.read(g.engine);
    if (t.closest(`.tt-mat [data-obj="${id}"]`)) {
      ev.stopPropagation();
      ev.preventDefault();
      host!.zoom(id);
      return;
    }
  }
  if (t.closest('.tut-off')) {
    ev.stopPropagation();
    ev.preventDefault();
    say(blockMsg());
  }
}

function onPointerCapture(ev: PointerEvent) {
  if (!tgame()) return;
  const t = ev.target as HTMLElement | null;
  // arrastar uma carta apagada também não vale
  if (t?.closest('.tut-off')) ev.stopPropagation();
}

let readTimer: ReturnType<typeof setTimeout> | null = null;
function onHover(ev: MouseEvent) {
  const g = tgame();
  const s = cur();
  if (!g || s.kind !== 'read' || !s.read || host!.touch()) return;
  const id = s.read(g.engine);
  const on = !!(ev.target as HTMLElement | null)?.closest(`.tt-mat [data-obj="${id}"]`);
  if (on && !readTimer)
    readTimer = setTimeout(() => {
      readTimer = null;
      if (tgame() === g && cur() === s) {
        idx++;
        msg = '';
        persist(g);
        host!.render();
      }
    }, 900);
  else if (!on && readTimer) {
    clearTimeout(readTimer);
    readTimer = null;
  }
}

function onTutButton(what: string) {
  const g = tgame();
  if (what === 'start') return start(true);
  if (what === 'restart') return start(false);
  if (what === 'dismiss') {
    acc.setTutorialProgress({ step: 0, answers: [], dismissed: true, at: Date.now() });
    host?.render();
    return;
  }
  if (!g) return;
  if (what === 'next') {
    if (cur().kind === 'info') {
      idx++;
      msg = '';
      persist(g);
      // a carta ampliada (palavras-chave no celular) fecha junto
      if (host!.zoomId()) host!.zoom(null);
      else host!.render();
    }
  } else if (what === 'min') {
    collapsed = !collapsed;
    layerKey = '';
    draw();
  } else if (what === 'exit') {
    persist(g);
    host!.exit();
  } else if (what === 'easy') {
    persist(g);
    host!.playEasy();
  }
}

// ── a caixa, a seta e o destaque ──
function draw() {
  const g = tgame();
  if (!g) return;
  if (!layer || !document.body.contains(layer)) {
    layer = document.createElement('div');
    layer.id = 'tut-layer';
    document.body.appendChild(layer);
    layerKey = '';
  }
  const s = cur();
  const c = ctx(g);
  const key = `${idx}|${collapsed}|${msg}|${c.touch}|${msgAt}`;
  if (key !== layerKey) {
    layerKey = key;
    const n = stepNo(s);
    const head = `<div class="tut-head"><span class="tut-count">${s.kind === 'watch' ? 'Tutorial · vez do oponente' : `Tutorial · passo ${n} de ${COUNTED.length}`}</span><button type="button" class="tut-x" data-tut="min" title="${collapsed ? 'Abrir a caixa' : 'Recolher a caixa'}" aria-expanded="${!collapsed}">${collapsed ? '▴' : '▾'}</button>${s.kind === 'end' ? '' : '<button type="button" class="tut-x" data-tut="exit" title="Sair do tutorial (o progresso fica salvo)">Sair</button>'}</div>`;
    const btns =
      s.kind === 'info'
        ? '<button type="button" class="primary" data-tut="next">Continuar</button>'
        : s.kind === 'end'
          ? '<button type="button" class="primary" data-tut="easy">Jogar contra a IA (Fácil)</button><button type="button" data-tut="restart">Refazer o tutorial</button><button type="button" data-tut="exit">Voltar ao início</button>'
          : s.kind === 'watch'
            ? '<span class="tut-wait"><i></i><i></i><i></i></span>'
            : '';
    layer.innerHTML = `<div class="tut-ring" hidden></div><div class="tut-arrow" hidden></div>
      <div class="tut-box${collapsed ? ' min' : ''} k-${s.kind}" data-step="${s.id}" role="dialog" aria-label="Tutorial: ${s.title}" aria-live="polite">${head}
        <h3 class="tut-title">${s.title}</h3>
        ${collapsed ? '' : `<div class="tut-body">${s.body(c)}</div>${s.how ? `<p class="tut-how">${s.how(c)}</p>` : ''}${msg ? `<p class="tut-msg" role="alert">${msg}</p>` : ''}${btns ? `<div class="tut-btns">${btns}</div>` : ''}`}
      </div>`;
  }
  place();
}

function visibleEl(q: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(q))) {
    if (el.closest('#tut-layer')) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight) return el;
  }
  return null;
}

/** Posiciona o destaque e a caixa (de novo a cada tanto: cartas entram com animação, painéis abrem). */
function place() {
  const g = tgame();
  if (!g || !layer) return;
  const ring = layer.querySelector<HTMLElement>('.tut-ring')!;
  const arrow = layer.querySelector<HTMLElement>('.tut-arrow')!;
  const box = layer.querySelector<HTMLElement>('.tut-box')!;
  if (!ring || !box) return;
  const s = cur();
  let el: HTMLElement | null = null;
  for (const q of s.point?.(ctx(g)) ?? []) {
    el = visibleEl(q);
    if (el) break;
  }
  // um painel por cima da mesa (zoom da carta, janela) cobre o alvo: o destaque só vale para o que está nele
  const over = document.querySelector('#app .modal');
  if (over && el && !over.contains(el)) el = null;
  // tudo em pixels de CSS (o zoom das telas grandes muda a escala das medidas da tela; zoom.ts)
  const tr = el ? zRect(el.getBoundingClientRect()) : null;
  const W = zpx(innerWidth);
  const H = zpx(innerHeight);
  if (tr) {
    const pad = 6;
    ring.hidden = false;
    Object.assign(ring.style, { left: `${tr.left - pad}px`, top: `${tr.top - pad}px`, width: `${tr.width + pad * 2}px`, height: `${tr.height + pad * 2}px` });
    const below = tr.top < 70;
    arrow.hidden = false;
    arrow.classList.toggle('up', below);
    Object.assign(arrow.style, { left: `${Math.max(14, Math.min(W - 14, tr.left + tr.width / 2))}px`, top: below ? `${tr.bottom + pad + 4}px` : `${tr.top - pad - 30}px` });
  } else {
    ring.hidden = true;
    arrow.hidden = true;
  }
  // caixa: perto do alvo sem cobri-lo (nem a seta); sem alvo, em cima no meio da mesa
  const matEl = document.querySelector('.tt-mat');
  const mat = matEl ? zRect(matEl.getBoundingClientRect()) : undefined;
  const left0 = mat ? mat.left : 0;
  const right0 = mat ? mat.right : W;
  const bw = Math.min(400, W - 16);
  box.style.width = `${bw}px`;
  const bh = box.offsetHeight;
  const cx = tr ? tr.left + tr.width / 2 : (left0 + right0) / 2;
  const lo = W - bw - 8 >= left0 + 8 ? left0 + 8 : 8;
  const hi = Math.max(lo, Math.min(right0, W) - bw - 8);
  const x = Math.max(lo, Math.min(hi, cx - bw / 2));
  const keep = tr ? new DOMRect(tr.left - 10, tr.top - 44, tr.width + 20, tr.height + 88) : null;
  const dockEl = document.querySelector('.tt-dock');
  const dock = dockEl ? zRect(dockEl.getBoundingClientRect()) : undefined;
  const near = [tr ? tr.top - 44 - bh : 8, tr ? tr.bottom + 44 : 8]; // em cima / embaixo do alvo
  const edges = [8, H - bh - 8]; // topo / pé da tela
  // no celular a caixa prefere as bordas (em cima fica a área do oponente; perto do alvo cobriria a barra e a mão)
  const cands = [...(W < 700 ? [...edges, ...near] : [...near, ...edges]), dock ? dock.top - bh - 8 : H / 2 - bh / 2];
  const overlap = (y: number) => {
    if (y < 4 || y + bh > H - 4) return 1e9;
    if (!keep) return 0;
    const a = Math.max(0, Math.min(x + bw, keep.right) - Math.max(x, keep.left));
    const b = Math.max(0, Math.min(y + bh, keep.bottom) - Math.max(y, keep.top));
    return a * b;
  };
  let best = cands[0];
  let bestO = Infinity;
  for (const y of tr ? cands : [cands[2]]) {
    const o = overlap(y);
    if (o < bestO) {
      best = y;
      bestO = o;
    }
  }
  if (bestO >= 1e9) best = 8;
  box.style.left = `${x}px`;
  box.style.top = `${Math.max(4, Math.min(H - bh - 4, best))}px`;
}

// ── tela inicial ──
/** Sugestão da primeira visita (conta sem progresso do tutorial) ou tutorial parado no meio (continuar/recomeçar). */
export function homeBanner(): string {
  const pr = acc.tutorialProgress();
  if (!pr)
    return `<div class="tut-hello mz"><div class="tut-ht"><b>Primeira vez no Riftbound?</b><span>Aprenda numa partida guiada de uns 10 minutos: runas, unidades, campos, combate e a pilha, passo a passo.</span></div><div class="tut-hbtns"><button type="button" class="primary" data-tut="start">Aprender a jogar</button><button type="button" data-tut="dismiss">Agora não</button></div></div>`;
  if (!pr.done && pr.answers.length)
    return `<div class="tut-hello mz"><div class="tut-ht"><b>Tutorial pela metade</b><span>Você parou no passo ${resumeNo(pr.step)} de ${COUNTED.length}.</span></div><div class="tut-hbtns"><button type="button" class="primary" data-tut="start">Continuar o tutorial</button><button type="button" data-tut="restart">Recomeçar</button></div></div>`;
  return '';
}
/** Número do passo para mostrar (um passo de esperar o oponente conta como o próximo). */
function resumeNo(step: number): number {
  for (let i = Math.min(step, STEPS.length - 1); i < STEPS.length; i++) if (stepNo(STEPS[i])) return stepNo(STEPS[i]);
  return COUNTED.length;
}

/** Botão "Aprender a jogar" junto dos modos (continua de onde parou; terminado, refaz). */
export function homeButton(): string {
  const pr = acc.tutorialProgress();
  const going = !!pr && !pr.done && pr.answers.length > 0;
  const sub = going ? `Continuar do passo ${resumeNo(pr!.step)}` : pr?.done ? 'Concluído ✓ · refazer' : 'Partida guiada, ~10 min';
  return `<button type="button" class="mode aux tut-mode" data-tut="${going ? 'start' : 'restart'}"><b>Aprender a jogar</b><span>${sub}</span></button>`;
}
