// Tela da escada contra a IA: os 5 degraus (capa do deck do adversário, nome, nível, vencido/atual/bloqueado), o deck
// escolhido, as vidas, o próximo adversário com a frase de apresentação, a vitória e o hall. O progresso está em
// ladder.ts.
import * as acc from './account';
import { LADDER, type LadderRung } from '../decks/ladder';
import { AI_LEVELS, type AiLevel } from '../ai/ai';
import { cardData } from '../engine/db';
import { coverArt } from './deckbuilder';
import { musicBoards } from './music';
import { esc } from './text';
import { deckOk, hearts, ladderMatch, ladderStart, type LadderMatch } from './ladder';

interface LadderHooks {
  render(): void;
  /** volta para a tela inicial */
  home(): void;
  /** fecha a partida aberta (se houver) e mostra a tela da escada */
  open(): void;
  /** começa a partida de um degrau */
  play(m: LadderMatch): void;
  /** abre o deck no editor (deck da conta com pendência) */
  edit(id: string): void;
}
let hooks: LadderHooks;
export function setLadderHooks(h: LadderHooks) {
  hooks = h;
}

/** Tela da escada: confirmação pendente de recomeçar (troca de deck / abandonar). */
let confirmReset = false;

const levelName = (l: AiLevel) => AI_LEVELS.find((x) => x.id === l)?.t ?? l;
const trackName = (id: string) => musicBoards().find((b) => b.id === id)?.name ?? '';
/** Cartas cuja arte a tela da escada usa (capas). */
export function ladderCodes(): string[] {
  const run = acc.ladderRun();
  const own = run ? [run.legend, run.champion] : acc.deckChoices().flatMap((c) => (c.deck ? [c.deck.legend, c.deck.champion] : []));
  return [...LADDER.flatMap((r) => [r.deck.legend, r.deck.champion]), ...own, ...acc.ladderHall().flatMap((h) => [h.legend, h.champion])];
}

function rungHtml(r: LadderRung, i: number, state: 'won' | 'cur' | 'lock'): string {
  const lg = cardData(r.deck.legend);
  const st = state === 'won' ? 'Vencido' : state === 'cur' ? 'Atual' : 'Bloqueado';
  return `<li class="lad-rung ${state}" aria-current="${state === 'cur' ? 'step' : 'false'}">
    <span class="lad-num">${i + 1}</span>
    ${coverArt(r.deck.legend, r.deck.champion)}
    <span class="lad-rinfo"><b>${esc(r.name)}</b><span class="muted">${esc(r.title)}</span>
      <span class="lad-tags"><span class="lad-lvl ${r.level}">${levelName(r.level)}</span><span class="lad-st">${st}</span></span>
      <span class="muted small lad-legend">${esc(lg.name)}</span></span>
  </li>`;
}

function hallHtml(): string {
  const hall = acc.ladderHall();
  if (!hall.length) return '';
  const date = (t: number) => new Date(t).toLocaleDateString('pt-BR');
  return `<section class="lad-hall mz" aria-label="Hall da escada"><h2>Hall da escada</h2><p class="muted small">Os decks que venceram os 5 degraus nesta conta.</p>
    <ul>${hall
      .map(
        (h) =>
          `<li>${coverArt(h.legend, h.champion)}<span><b>${esc(h.deckName)}</b><span class="muted small">${esc(cardData(h.legend).name)} · ${date(h.at)} · ${h.losses ? `${h.losses} derrota${h.losses > 1 ? 's' : ''} no caminho` : 'sem nenhuma derrota'}</span></span></li>`,
      )
      .join('')}</ul></section>`;
}

/** Escolha do deck para começar a escada (ou trocar, recomeçando). */
function pickHtml(cur: string | null): string {
  const choices = acc.deckChoices();
  const item = (c: acc.DeckChoice) => {
    const sd = acc.savedDeckOf(c.id);
    const legend = c.deck?.legend ?? sd?.legend ?? null;
    const champ = c.deck?.champion ?? sd?.champion ?? null;
    const sub = legend ? esc(cardData(legend).name) : 'Sem lenda';
    if (c.ok)
      return `<button type="button" class="pick${c.id === cur ? ' on' : ''}" data-act="ladpick" data-deck="${esc(c.id)}">${coverArt(legend, champ, sd?.cover)}<span class="pkname">${esc(c.name)}</span><span class="pksub">${sub}</span></button>`;
    return `<div class="pick off">${coverArt(legend, champ, sd?.cover)}<span class="pkname">${esc(c.name)}</span><span class="pksub err">Incompleto</span></div>`;
  };
  const mine = choices.filter((c) => c.group === 'Meus decks').map(item).join('');
  return `<section class="lad-pick mz" aria-label="Escolher o deck da escada"><h2>${cur ? 'Trocar de deck' : 'Escolha o seu deck'}</h2>
    <p class="muted small">${cur ? 'Trocar de deck recomeça a escada do 1º degrau, com 3 vidas.' : 'Ele vai com você até o fim: os 5 adversários, com 3 vidas.'}</p>
    ${mine ? `<h3>Meus decks</h3><div class="pkgrid">${mine}</div>` : ''}
    <h3>Starters</h3><div class="pkgrid">${choices.filter((c) => c.group === 'Starters').map(item).join('')}</div>
    ${cur ? '<div class="btns"><button type="button" data-act="ladpickclose">Cancelar</button></div>' : ''}
  </section>`;
}

let picking = false;

export function ladderHtml(topbar: string): string {
  const run = acc.ladderRun();
  const states = (i: number): 'won' | 'cur' | 'lock' => (!run ? 'lock' : run.done || i < run.rung ? 'won' : i === run.rung ? 'cur' : 'lock');
  const rungs = `<ol class="lad-rungs" aria-label="Os 5 degraus">${LADDER.map((r, i) => rungHtml(r, i, states(i))).join('')}</ol>`;
  const head = `<div class="hero lad-hero"><h1>Escada contra a IA</h1><p>Cinco adversários em sequência, do mais fácil ao chefe final. Você tem 3 vidas: perdeu, tenta o mesmo degrau de novo; sem vidas, a escada recomeça.</p></div>`;
  let body: string;
  if (!run || picking) body = `${run ? '' : `<section class="lad-ladder mz">${rungs}</section>`}${pickHtml(run?.deck ?? null)}`;
  else {
    const sd = acc.savedDeckOf(run.deck);
    const ok = deckOk(run.deck);
    const deckBox = `<section class="lad-deck mz" aria-label="Seu deck">
      <span class="seat-who">Seu deck</span>
      ${coverArt(run.legend, run.champion, sd?.cover)}
      <b class="lad-dname">${esc(sd?.name ?? run.deckName)}</b>
      <span class="muted small">${esc(cardData(run.legend).name)}</span>
      ${run.done ? '' : `<div class="lad-livesrow"><span>Vidas</span>${hearts(run.lives)}</div>`}
      <span class="muted small">Degrau ${Math.min(run.rung + 1, LADDER.length)} de ${LADDER.length}${run.losses ? ` · ${run.losses} derrota${run.losses > 1 ? 's' : ''}` : ''}${run.resets ? ` · recomeçou ${run.resets}×` : ''}</span>
      ${
        confirmReset
          ? `<div class="lad-confirm"><span>Recomeçar a escada do zero?</span><button type="button" class="danger" data-act="ladabandon">Sim, abandonar</button><button type="button" data-act="ladnoconf">Cancelar</button></div>`
          : `<div class="btns"><button type="button" data-act="ladchange">Trocar deck</button><button type="button" data-act="ladconf">Abandonar</button></div>`
      }
    </section>`;
    let main: string;
    if (run.done) {
      main = `<section class="lad-win mz" aria-label="Escada vencida">
        <p class="tt-kicker">Escada vencida</p><h2>Você venceu os 5 degraus!</h2>
        <p>${esc(sd?.name ?? run.deckName)} derrotou ${LADDER.map((r) => esc(r.name)).join(', ')}${run.losses ? `, com ${run.losses} derrota${run.losses > 1 ? 's' : ''} no caminho` : ', sem perder nenhuma partida'}. O deck entrou no hall da conta.</p>
        <div class="btns"><button type="button" class="primary big" data-act="ladnew">Nova escada</button></div>
      </section>`;
    } else {
      const r = LADDER[run.rung];
      const note = run.last
        ? run.last.reset
          ? `<p class="lad-note lose">As vidas acabaram no degrau ${run.last.rung + 1}: a escada recomeçou do 1º degrau.</p>`
          : run.last.won
            ? `<p class="lad-note win">Você venceu ${esc(LADDER[run.last.rung].name)}! Próximo degrau liberado.</p>`
            : `<p class="lad-note lose">${esc(LADDER[run.last.rung].name)} venceu. Tente de novo: ${run.lives} ${run.lives === 1 ? 'vida restante' : 'vidas restantes'}.</p>`
        : '';
      const tn = trackName(r.track);
      main = `<section class="lad-next mz" aria-label="Próximo adversário">
        ${note}
        <div class="lad-vs">${coverArt(r.deck.legend, r.deck.champion)}
          <div class="lad-vsinfo"><p class="tt-kicker">Degrau ${run.rung + 1} de ${LADDER.length}${run.rung === LADDER.length - 1 ? ' · chefe final' : ''}</p>
            <h2>${esc(r.name)} <small>${esc(r.title)}</small></h2>
            <blockquote>“${esc(r.quote)}”</blockquote>
            <p class="muted small">${esc(r.plan)}</p>
            <p class="lad-meta"><span class="lad-lvl ${r.level}">IA ${levelName(r.level)}</span><span>${esc(cardData(r.deck.legend).name)}</span>${tn ? `<span title="Música do tabuleiro">♪ ${esc(tn)}</span>` : ''}</p>
          </div></div>
        ${ok ? `<div class="btns"><button type="button" class="primary big" data-act="ladfight">Lutar contra ${esc(r.name)}</button></div>` : `<p class="err">O deck desta escada ${sd ? 'tem pendências' : 'não existe mais'}. ${sd ? '<button type="button" data-act="ladedit">Completar o deck</button> ou' : ''} troque de deck (a escada recomeça).</p>`}
      </section>`;
    }
    body = `<div class="lad-grid">${deckBox}${main}</div><section class="lad-ladder mz">${rungs}</section>`;
  }
  return `${topbar}<main class="setup ladder">
    <div class="lad-top"><button type="button" data-act="ladhome">← Início</button></div>
    ${head}${body}${hallHtml()}
  </main>`;
}

/** Cliques da escada (na tela dela e nos botões do fim da partida). true = tratado. */
export function onLadderClick(t: HTMLElement): boolean {
  const el = t.closest('[data-act]') as HTMLElement | null;
  const a = el?.dataset.act;
  if (!el || !a || !(a === 'ladder' || a.startsWith('lad'))) return false;
  if (a === 'ladder') {
    picking = false;
    confirmReset = false;
    hooks.open();
  } else if (a === 'ladhome') {
    picking = false;
    confirmReset = false;
    hooks.home();
  } else if (a === 'ladpick') {
    const id = el.dataset.deck!;
    const run = acc.ladderRun();
    // mesmo deck da escada em andamento: só fecha a escolha (não recomeça)
    if (!run || run.deck !== id || run.done) ladderStart(id);
    picking = false;
    hooks.render();
  } else if (a === 'ladpickclose') {
    picking = false;
    hooks.render();
  } else if (a === 'ladchange') {
    picking = true;
    confirmReset = false;
    hooks.render();
  } else if (a === 'ladconf' || a === 'ladnoconf') {
    confirmReset = a === 'ladconf';
    hooks.render();
  } else if (a === 'ladabandon' || a === 'ladnew') {
    confirmReset = false;
    acc.setLadderRun(null);
    picking = false;
    hooks.render();
  } else if (a === 'ladedit') {
    const run = acc.ladderRun();
    const sd = run ? acc.savedDeckOf(run.deck) : undefined;
    if (sd) hooks.edit(sd.id);
  } else if (a === 'ladfight' || a === 'ladnext') {
    const m = ladderMatch();
    if (m) hooks.play(m);
    else hooks.open();
  } else return false;
  return true;
}
