// Escada contra a IA (campanha): o jogador escolhe um deck e enfrenta os 5 adversários de src/decks/ladder.ts em
// sequência, com 3 vidas (acabou, recomeça do 1º degrau). Vencer os 5 põe o deck no hall da conta. Aqui fica o
// progresso (na conta local: acc.ladderRun / acc.ladderHall) e os botões do fim da partida; a tela da escada está em
// ladderscreen.ts. main.ts só põe o botão na tela inicial, mostra a página 'ladder', repassa os cliques e começa a
// partida pelo gancho `play` (o cfg leva a marca `ladder`, o nível da IA e a trilha).
import * as acc from './account';
import { LADDER, LADDER_LIVES } from '../decks/ladder';
import type { AiLevel } from '../ai/ai';
import type { DeckList } from '../engine/engine';
import type { P } from '../engine/types';
import { esc } from './text';

/** O que vai no cfg da partida (o motor ignora): de qual escada e de qual degrau ela é. */
export interface LadderTag {
  rung: number;
  started: number;
}
/** Partida a começar: main.ts completa com semente, nome do jogador e opções da mesa. */
export interface LadderMatch {
  deck: string;
  opp: DeckList;
  oppName: string;
  aiLevel: AiLevel;
  music: string;
  ladder: LadderTag;
}
export function ladderTagOf(cfg: unknown): LadderTag | null {
  const t = (cfg as { ladder?: Partial<LadderTag> } | null | undefined)?.ladder;
  return t && Number.isInteger(t.rung) && typeof t.started === 'number' ? (t as LadderTag) : null;
}

/** O deck da escada ainda dá para jogar? (deck da conta apagado ou com pendência não dá) */
export const deckOk = (id: string) => acc.deckChoices().some((c) => c.id === id && c.ok);

/** Começa uma escada nova com o deck escolhido (do 1º degrau, com todas as vidas). */
export function ladderStart(deck: string) {
  const d = acc.deckById(deck);
  const sd = acc.savedDeckOf(deck);
  acc.setLadderRun({
    deck,
    deckName: sd?.name ?? d.name,
    legend: d.legend,
    champion: d.champion,
    rung: 0,
    lives: LADDER_LIVES,
    started: Date.now(),
    losses: 0,
    resets: 0,
    seen: [],
  });
}

/** Partida do degrau atual da escada em andamento. */
export function ladderMatch(): LadderMatch | null {
  const run = acc.ladderRun();
  if (!run || run.done || run.rung >= LADDER.length || !deckOk(run.deck)) return null;
  const r = LADDER[run.rung];
  return { deck: run.deck, opp: r.deck, oppName: r.name, aiLevel: r.level, music: r.track, ladder: { rung: run.rung, started: run.started } };
}

/**
 * Fim de uma partida da escada: conta uma vez só (pela semente) e só se ela é do degrau atual da escada em andamento
 * (replay, desfazer e partida de uma escada antiga não contam). Venceu: sobe um degrau (no 5º, vai para o hall).
 * Perdeu: menos uma vida; sem vidas, a escada recomeça do 1º degrau com o mesmo deck.
 */
export function ladderRecord(cfg: { seed: number }, winner: P | null, me: P) {
  const tag = ladderTagOf(cfg);
  const run = acc.ladderRun();
  if (!tag || !run || winner === null || run.done || tag.started !== run.started || tag.rung !== run.rung) return;
  if (run.seen.includes(cfg.seed)) return;
  run.seen = [...run.seen, cfg.seed].slice(-30);
  if (winner === me) {
    run.last = { rung: run.rung, won: true };
    run.rung++;
    if (run.rung >= LADDER.length) {
      run.done = Date.now();
      const sd = acc.savedDeckOf(run.deck);
      let code: string | undefined;
      try {
        code = acc.deckCode(sd ?? acc.fromDeckList(acc.deckById(run.deck)));
      } catch {
        code = undefined;
      }
      acc.addLadderHall({ deckName: sd?.name ?? run.deckName, legend: run.legend, champion: run.champion, code, at: run.done, losses: run.losses });
    }
  } else {
    run.losses++;
    run.lives--;
    run.last = { rung: run.rung, won: false };
    if (run.lives <= 0) {
      run.rung = 0;
      run.lives = LADDER_LIVES;
      run.resets++;
      run.last.reset = true;
    }
  }
  acc.setLadderRun(run);
}

/** Botões do fim de uma partida da escada (no lugar de "Nova partida"); null se a partida não é da escada. */
export function ladderEndButtons(cfg: unknown, compact = false): string | null {
  const tag = ladderTagOf(cfg);
  if (!tag) return null;
  const run = acc.ladderRun();
  const back = compact ? '' : '<button data-act="ladder">Ver a escada</button>';
  if (!run || run.started !== tag.started) return '<button class="primary" data-act="ladder">Escada</button>';
  if (run.done) return '<button class="primary" data-act="ladder">Escada vencida!</button>';
  const ok = deckOk(run.deck);
  if (run.last?.reset && run.last.rung === tag.rung)
    return `<button class="primary" data-act="ladder">Recomeçar a escada</button>`;
  if (!ok) return '<button class="primary" data-act="ladder">Ver a escada</button>';
  if (run.rung === tag.rung)
    return `<button class="primary" data-act="ladnext">Tentar de novo <small>(${run.lives} ${run.lives === 1 ? 'vida' : 'vidas'})</small></button>${back}`;
  return `<button class="primary" data-act="ladnext">Próximo: ${esc(LADDER[run.rung].name)}</button>${back}`;
}

/** Frase do fim da partida para o quadro de resultado (degrau e vidas). */
export function ladderEndNote(cfg: unknown): string {
  const tag = ladderTagOf(cfg);
  const run = acc.ladderRun();
  if (!tag || !run || run.started !== tag.started) return '';
  if (run.done) return 'Você venceu os 5 degraus da escada!';
  if (run.last?.reset && run.last.rung === tag.rung) return 'As vidas acabaram: a escada recomeça do 1º degrau.';
  if (run.rung === tag.rung) return `Degrau ${tag.rung + 1} de ${LADDER.length} · restam ${hearts(run.lives)}`;
  return `Degrau ${tag.rung + 1} vencido · próximo: ${esc(LADDER[run.rung].name)}`;
}

export const hearts = (n: number) =>
  `<span class="lad-lives" title="${n} de ${LADDER_LIVES} vidas" aria-label="${n} de ${LADDER_LIVES} vidas">${Array.from({ length: LADDER_LIVES }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
