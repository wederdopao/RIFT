// Tela do torneio entre amigos: criar / entrar por código / meus torneios e os passados; dentro de um torneio, a
// inscrição com o deck, a chave (eliminação) ou a tabela (pontos corridos), os próximos confrontos (Jogar / Assistir),
// os resultados com o replay, o campeão e, para o organizador, começar, tirar alguém, corrigir e dar W.O.
// A lógica está em tournament.ts e a sincronização em tournamentsync.ts; main.ts só mostra a página 'tour', repassa os
// cliques e abre a sala do confronto pelo gancho `play`.
import * as acc from './account';
import { cardData, hasCard } from '../engine/db';
import type { DeckList } from '../engine/engine';
import { coverArt } from './deckbuilder';
import { cleanCode } from './online';
import { esc } from './text';
import { gameWins, matchReady, matchWinner, playerName, playerOf, restingIn, roundName, standings, winsNeeded, type TourDeck, type TourMatch, type Tournament } from './tournament';
import { connState, createTour, deckFits, entries, entry, fix, forget, hasReplay, kick, matchRoomCode, me, openTour, openTourReplay, setMyDeck, setPlaying, startTour, syncConns, waitingReplay, type TourEntry, type TourTag } from './tournamentsync';

/** Sala de um confronto a abrir (main.ts): anfitrião = lado a; espectador não leva deck. */
export interface TourRoom {
  room: string;
  role: 'host' | 'guest' | 'watch';
  tag: TourTag;
  deck: DeckList | null;
  name: string;
}
interface Hooks {
  render(): void;
  home(): void;
  play(r: TourRoom): void;
}
let hooks: Hooks;
export function setTourHooks(h: Hooks) {
  hooks = h;
}

/** Torneio aberto na tela (null = lista). */
let cur: string | null = null;
let msg = '';
let joinDraft = '';
const draft = { name: '', format: 'elim' as 'elim' | 'rr', bestOf: 1 as 1 | 3, deckChange: false, cards: 'casual' as 'casual' | 'padrao', play: true, deckId: '' };
/** Organizador corrigindo um confronto. */
let fixing: { mid: string; games: { w: 0 | 1; a: number; b: number; seed?: number }[] } | null = null;
let confirmForget: string | null = null;

export const tourOpen = () => cur;
/** Abre um torneio pelo código (link de convite #torneio-XXXXXX ou volta da sala). */
export function showTour(code: string | null) {
  cur = code;
  msg = '';
  fixing = null;
  if (code) openTour(code);
  else syncConns(null);
  setHash(code);
}
/** O endereço leva o torneio aberto (#torneio-XXXXXX): recarregar a página volta para ele. */
export function setHash(code: string | null) {
  if (typeof location === 'undefined') return;
  const want = code ? `#torneio-${code}` : '';
  if (location.hash === want || (!code && !/^#torneio-/.test(location.hash))) return;
  try {
    history.replaceState(null, '', location.pathname + location.search + want);
  } catch {
    /* sem histórico (arquivo local em alguns navegadores): segue */
  }
}

const legendOk = (d: TourDeck | null | undefined) => (d && hasCard(d.legend) ? d.legend : null);
const champOk = (d: TourDeck | null | undefined) => (d && hasCard(d.champion) ? d.champion : null);
const cover = (d: TourDeck | null | undefined) => coverArt(legendOk(d), champOk(d));
const legendName = (d: TourDeck | null | undefined) => (legendOk(d) ? cardData(d!.legend).name.split(',')[0] : '');
const date = (t: number) => new Date(t).toLocaleDateString('pt-BR');

/** Cartas cuja arte a tela usa (capas). */
export function tourArtCodes(): string[] {
  const out: string[] = [];
  const add = (d: TourDeck | null | undefined) => {
    if (legendOk(d)) out.push(d!.legend);
    if (champOk(d)) out.push(d!.champion);
  };
  for (const e of entries()) {
    if (!e.t) continue;
    if (e.code === cur || !cur) {
      add(e.t.champDeck);
      if (e.code === cur) for (const p of e.t.players) add(p.deck);
    }
  }
  for (const c of acc.deckChoices()) if (c.deck) out.push(c.deck.legend, c.deck.champion);
  return out;
}

function deckSelect(id: string, sel: string | undefined, cards: 'casual' | 'padrao'): string {
  const ok = acc.deckChoices().filter((c) => c.ok && c.deck && deckFits(c.deck, cards));
  const group = (g: string) =>
    ok
      .filter((c) => c.group === g)
      .map((c) => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`)
      .join('');
  return `<select id="${id}">${sel ? '' : '<option value="" selected>Escolha um deck…</option>'}<optgroup label="Meus decks">${group('Meus decks')}</optgroup><optgroup label="Starters">${group('Starters')}</optgroup></select>`;
}
const fmtText = (t: Tournament) =>
  `${t.format === 'elim' ? 'Eliminação simples' : 'Pontos corridos'} · melhor de ${t.bestOf} · ${t.cards === 'padrao' ? 'Padrão' : 'Casual'} · ${t.deckChange ? 'pode trocar de deck entre confrontos' : 'deck fixo'}`;
const statusText = (t: Tournament) => (t.status === 'lobby' ? 'Inscrições abertas' : t.status === 'running' ? 'Em andamento' : 'Terminado');

// ───────────────────────────── lista ─────────────────────────────
function hubHtml(): string {
  const all = entries();
  const live = all.filter((e) => !e.t || e.t.status !== 'done');
  const past = all.filter((e) => e.t?.status === 'done');
  const radio = (k: string, v: string, on: boolean, t: string, s: string) =>
    `<button type="button" role="radio" class="hub-vis${on ? ' on' : ''}" data-act="tcopt" data-k="${k}" data-v="${v}" aria-checked="${on}"><b>${t}</b><span>${s}</span></button>`;
  const create = `<section class="mz tour-create" aria-label="Criar torneio">
    <h2>Criar um torneio</h2>
    <label for="tcname">Nome</label>
    <input id="tcname" value="${esc(draft.name)}" maxlength="40" placeholder="Torneio de ${esc(acc.profile().name)}" autocomplete="off">
    <span class="tour-lbl">Formato</span>
    <div class="hub-viss" role="radiogroup" aria-label="Formato">${radio('format', 'elim', draft.format === 'elim', 'Eliminação simples', 'chave; quem perde sai')}${radio('format', 'rr', draft.format === 'rr', 'Pontos corridos', 'todos contra todos')}</div>
    <span class="tour-lbl">Confronto</span>
    <div class="hub-viss" role="radiogroup" aria-label="Partidas por confronto">${radio('bestOf', '1', draft.bestOf === 1, 'Melhor de 1', 'uma partida')}${radio('bestOf', '3', draft.bestOf === 3, 'Melhor de 3', 'quem vencer 2')}</div>
    <div class="tour-row"><label for="tccards">Cartas</label><select id="tccards"><option value="casual" ${draft.cards === 'casual' ? 'selected' : ''}>Casual (banidas liberadas)</option><option value="padrao" ${draft.cards === 'padrao' ? 'selected' : ''}>Padrão (sem banidas)</option></select></div>
    <label class="tog"><input type="checkbox" id="tcchange" ${draft.deckChange ? 'checked' : ''}> Cada um pode trocar de deck entre os confrontos</label>
    <label class="tog"><input type="checkbox" id="tcplay" ${draft.play ? 'checked' : ''}> Eu também jogo</label>
    ${draft.play ? `<div class="tour-row"><label for="tcdeck">Meu deck</label>${deckSelect('tcdeck', draft.deckId || undefined, draft.cards)}</div>` : ''}
    <button type="button" class="primary big" data-act="tcreate">Criar torneio</button>
    <p class="muted small">Você vira o organizador: os outros entram pelo código ou pelo link, cada um com o seu deck. Cada confronto é jogado numa sala online normal e o resultado volta sozinho para o torneio.</p>
  </section>`;
  const join = `<section class="mz tour-join" aria-label="Entrar num torneio">
    <h2>Entrar num torneio</h2>
    <label for="tjcode">Código do torneio</label>
    <div class="joinrow"><input id="tjcode" value="${esc(joinDraft)}" placeholder="Código (6 letras)" maxlength="60" autocomplete="off"><button type="button" class="primary" data-act="tjoin">Abrir</button></div>
    <p class="muted small">Quem organiza manda o código (ou o link). Lá dentro você escolhe o deck e se inscreve.</p>
  </section>`;
  const card = (e: TourEntry) => {
    const t = e.t;
    const role = e.role === 'org' ? 'organizador' : e.role === 'player' ? 'participante' : 'acompanhando';
    const champ = t?.champion ? playerOf(t, t.champion) : null;
    return `<li class="tour-card"><button type="button" data-act="topen" data-code="${esc(e.code)}">
      ${cover(champ ? t!.champDeck : t?.players.find((p) => p.id === me())?.deck ?? null)}
      <span class="tour-cinfo"><b>${esc(t?.name ?? `Torneio ${e.code}`)}</b>
        <span class="muted small">${t ? `${t.format === 'elim' ? 'Eliminação' : 'Pontos corridos'} · ${t.players.length} participantes · ${statusText(t)}` : 'Procurando o torneio…'}</span>
        <span class="muted small">${esc(e.code)} · você é ${role}${t ? ` · ${date(t.finished ?? t.created)}` : ''}</span>
        ${champ ? `<span class="tour-champline">🏆 ${esc(champ.name)}${t!.champDeck ? ` · ${esc(t!.champDeck.name)}` : ''}</span>` : ''}
      </span></button></li>`;
  };
  return `<div class="hero tour-hero"><h1>Torneio entre amigos</h1><p>Chave de eliminação ou pontos corridos, melhor de 1 ou de 3, cada um no próprio aparelho.</p></div>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <div class="tour-hubgrid">${create}${join}</div>
    ${live.length ? `<section class="mz tour-list"><h2>Meus torneios</h2><ul>${live.map(card).join('')}</ul></section>` : ''}
    ${past.length ? `<section class="mz tour-list past"><h2>Torneios passados</h2><ul>${past.map(card).join('')}</ul></section>` : ''}`;
}

// ───────────────────────────── dentro de um torneio ─────────────────────────────
function nameCell(t: Tournament, id: string | null, win: string | null, tbd = 'a definir'): string {
  if (!id) return `<span class="tour-pn tbd">${tbd}</span>`;
  const p = playerOf(t, id);
  return `<span class="tour-pn${win === id ? ' win' : win ? ' lose' : ''}${id === me() ? ' me' : ''}"><b>${esc(p?.name ?? '?')}</b>${p?.deck ? `<small>${esc(legendName(p.deck) || p.deck.name)}</small>` : ''}</span>`;
}
function scoreOf(t: Tournament, m: TourMatch): string {
  if (m.bye) return '';
  if (m.wo) return `<span class="tour-sc">W.O.</span>`;
  if (!m.games.length) return '';
  if (t.bestOf === 1) {
    const g = m.games[0];
    return `<span class="tour-sc">${g.pts[0]} × ${g.pts[1]}</span>`;
  }
  const [a, b] = gameWins(m);
  return `<span class="tour-sc">${a} × ${b}</span>`;
}
/** Botões de um confronto: Jogar (sou um dos lados), Assistir (os outros), Corrigir/W.O. (organizador). */
function matchBtns(e: TourEntry, t: Tournament, m: TourMatch): string {
  const out: string[] = [];
  if (matchReady(t, m)) {
    if (m.a === me() || m.b === me()) out.push(`<button type="button" class="primary" data-act="tplay" data-mid="${m.id}">Jogar${t.bestOf === 3 ? ` (jogo ${m.games.length + 1})` : ''}</button>`);
    else out.push(`<button type="button" data-act="twatch" data-mid="${m.id}">Assistir</button>`);
  }
  if (e.role === 'org' && m.a && m.b && !m.bye && t.status !== 'lobby') out.push(`<button type="button" class="tour-org" data-act="tfix" data-mid="${m.id}">${matchWinner(t, m) ? 'Corrigir' : 'Resultado / W.O.'}</button>`);
  return out.join('');
}
function matchHtml(e: TourEntry, t: Tournament, m: TourMatch, withBtns = true): string {
  const win = matchWinner(t, m);
  return `<div class="tour-m${win ? ' done' : matchReady(t, m) ? ' ready' : ''}${m.a === me() || m.b === me() ? ' mine' : ''}" data-mid="${m.id}">
    <div class="tour-side">${nameCell(t, m.a, win)}${win === m.a && !m.bye ? '<i class="tour-wmark" aria-label="venceu">✓</i>' : ''}</div>
    <div class="tour-side">${nameCell(t, m.b, win, m.bye ? 'bye (passa direto)' : 'a definir')}${win && win === m.b ? '<i class="tour-wmark" aria-label="venceu">✓</i>' : ''}</div>
    <div class="tour-mfoot">${scoreOf(t, m)}${withBtns ? matchBtns(e, t, m) : ''}</div>
  </div>`;
}
function bracketHtml(e: TourEntry, t: Tournament): string {
  const cols: string[] = [];
  for (let r = 0; r < t.rounds; r++)
    cols.push(`<div class="tour-col"><h3>${roundName(t, r)}</h3><div class="tour-colm">${t.matches
      .filter((m) => m.round === r)
      .sort((x, y) => x.slot - y.slot)
      .map((m) => matchHtml(e, t, m))
      .join('')}</div></div>`);
  return `<section class="mz tour-bracket" aria-label="Chave"><h2>Chave</h2><div class="tour-cols" style="--rounds:${t.rounds}">${cols.join('')}</div></section>`;
}
function tableHtml(t: Tournament): string {
  const rows = standings(t);
  const tie = (i: number) => i > 0 && rows[i - 1].pts === rows[i].pts;
  return `<section class="mz tour-table" aria-label="Tabela"><h2>Tabela</h2>
    <div class="tour-tablewrap"><table><thead><tr><th>#</th><th class="l">Jogador</th><th title="Confrontos jogados">J</th><th title="Vitórias">V</th><th title="Derrotas">D</th><th title="Pontos (vitória = 3)">Pts</th>${t.bestOf === 3 ? '<th title="Partidas ganhas-perdidas">P</th>' : ''}<th title="Saldo de pontos de partida">Saldo</th></tr></thead>
    <tbody>${rows
      .map((s, i) => {
        const p = playerOf(t, s.id);
        const sd = s.pf - s.pa;
        return `<tr class="${s.id === me() ? 'me' : ''}${t.champion === s.id ? ' champ' : ''}"><td>${tie(i) ? '' : i + 1}</td><td class="l"><b>${esc(s.name)}</b>${p?.deck ? ` <small class="muted">${esc(legendName(p.deck) || p.deck.name)}</small>` : ''}</td><td>${s.played}</td><td>${s.w}</td><td>${s.l}</td><td><b>${s.pts}</b></td>${t.bestOf === 3 ? `<td>${s.gw}-${s.gl}</td>` : ''}<td>${sd > 0 ? '+' : ''}${sd}</td></tr>`;
      })
      .join('')}</tbody></table></div>
    <p class="muted small">Vitória = 3 pontos. Empate: confronto direto entre os empatados, depois o saldo de pontos de partida.</p></section>`;
}
function roundsHtml(e: TourEntry, t: Tournament): string {
  const out: string[] = [];
  for (let r = 0; r < t.rounds; r++) {
    const rest = restingIn(t, r);
    out.push(`<div class="tour-round"><h3>${roundName(t, r)}${rest ? ` <small class="muted">· folga: ${esc(playerName(t, rest))}</small>` : ''}</h3><div class="tour-rms">${t.matches
      .filter((m) => m.round === r)
      .map((m) => matchHtml(e, t, m))
      .join('')}</div></div>`);
  }
  return `<section class="mz tour-rounds" aria-label="Rodadas"><h2>Rodadas</h2>${out.join('')}</section>`;
}
function nextHtml(e: TourEntry, t: Tournament): string {
  const ready = t.matches.filter((m) => matchReady(t, m)).sort((x, y) => Number(y.a === me() || y.b === me()) - Number(x.a === me() || x.b === me()) || x.round - y.round || x.slot - y.slot);
  if (!ready.length) return '';
  return `<section class="mz tour-next" aria-label="Próximos confrontos"><h2>Próximos confrontos</h2>
    <ul>${ready
      .map((m) => {
        const [a, b] = gameWins(m);
        return `<li class="${m.a === me() || m.b === me() ? 'mine' : ''}"><span class="tour-nr">${roundName(t, m.round)}</span><span class="tour-vs"><b>${esc(playerName(t, m.a))}</b> × <b>${esc(playerName(t, m.b))}</b>${t.bestOf === 3 && m.games.length ? ` <small class="muted">(${a} × ${b} nas partidas)</small>` : ''}</span><span class="tour-nb">${matchBtns(e, t, m)}</span></li>`;
      })
      .join('')}</ul>
    <p class="muted small">Jogar abre a sala do confronto (quem está em cima na chave cria a sala, o outro entra sozinho). O resultado volta para cá quando a partida acaba.</p></section>`;
}
function resultsHtml(t: Tournament): string {
  const done = t.matches.filter((m) => matchWinner(t, m) && !m.bye).sort((x, y) => y.round - x.round || x.slot - y.slot);
  if (!done.length) return '';
  const wait = waitingReplay();
  return `<section class="mz tour-results" aria-label="Resultados"><h2>Resultados</h2><ul>${done
    .map((m) => {
      const w = matchWinner(t, m)!;
      const games = m.wo
        ? `<span class="muted small">W.O. para ${esc(playerName(t, w))}</span>`
        : m.games
            .map((g, i) => {
              const rp = g.rp || hasReplay(g.seed);
              const who = playerName(t, g.w === 0 ? m.a : m.b);
              return `<span class="tour-g">${t.bestOf === 3 ? `Jogo ${i + 1}: ` : ''}<b>${esc(who)}</b> ${g.pts[0]} × ${g.pts[1]}${g.turns ? ` · ${g.turns} turnos` : ''}${g.how === 'fix' ? ' <small class="muted">(lançado pelo organizador)</small>' : ''}${rp ? ` <button type="button" class="tour-rp" data-act="trp" data-seed="${g.seed}">${wait === g.seed ? 'Buscando…' : 'Replay'}</button>` : ''}</span>`;
            })
            .join('');
      return `<li><span class="tour-nr">${roundName(t, m.round)}</span><span class="tour-vs">${esc(playerName(t, m.a))} × ${esc(playerName(t, m.b))} · venceu <b>${esc(playerName(t, w))}</b></span><span class="tour-gs">${games}</span></li>`;
    })
    .join('')}</ul></section>`;
}
function playersHtml(e: TourEntry, t: Tournament): string {
  const org = e.role === 'org' && t.status === 'lobby';
  return `<section class="mz tour-players" aria-label="Participantes"><h2>Participantes <small class="muted">${t.players.length}</small></h2>
    ${t.players.length ? `<ul>${t.players
      .map(
        (p) =>
          `<li class="${p.id === me() ? 'me' : ''}">${cover(p.deck)}<span><b>${esc(p.name)}</b>${p.id === t.org ? ' <small class="hub-tag">organizador</small>' : ''}<small class="muted">${p.deck ? `${esc(p.deck.name)}${legendName(p.deck) ? ` · ${esc(legendName(p.deck))}` : ''}` : 'sem deck'}</small></span>${org && p.id !== me() ? `<button type="button" class="tour-x" data-act="tkick" data-pid="${esc(p.id)}" aria-label="Tirar ${esc(p.name)}">✕</button>` : ''}</li>`,
      )
      .join('')}</ul>`
      : '<p class="muted">Ninguém inscrito ainda. Mande o código para os seus amigos.</p>'}
    ${e.role === 'org' && t.status === 'lobby' ? `<div class="btns"><button type="button" class="primary big" data-act="tstart" ${t.players.length >= 2 ? '' : 'disabled'}>Começar torneio</button></div><p class="muted small">Ao começar, a ordem é sorteada e as inscrições fecham.${t.format === 'elim' ? ' Se o número não for potência de 2, os primeiros sorteados passam direto (bye) na 1ª rodada.' : ''}</p>` : ''}
  </section>`;
}
function meHtml(e: TourEntry, t: Tournament): string {
  const mine = t.players.find((p) => p.id === me());
  const lobby = t.status === 'lobby';
  const canDeck = lobby || (t.status === 'running' && t.deckChange && !!mine);
  const pend = e.pending.length ? `<p class="tour-pend">${e.pending.length === 1 ? 'Um resultado seu está' : `${e.pending.length} resultados seus estão`} esperando o organizador confirmar (vai sozinho quando ele estiver conectado).</p>` : '';
  if (!lobby && !mine) return pend + (e.note ? `<p class="muted">${esc(e.note)}</p>` : '');
  const deck = mine?.deck ?? (e.deck ? { name: e.deck.name, legend: e.deck.legend, champion: e.deck.champion } : null);
  const sel = canDeck ? `<div class="tour-row"><label for="tmydeck">${mine ? 'Trocar de deck' : 'Seu deck'}</label>${deckSelect('tmydeck', e.deckId, t.cards)}</div>` : '';
  let action = '';
  if (lobby) action = mine ? `<button type="button" data-act="tleave">${e.role === 'org' ? 'Não vou jogar' : 'Sair do torneio'}</button>` : `<button type="button" class="primary" data-act="tenter" ${e.deck ? '' : 'disabled'}>Inscrever-me</button>`;
  const local = e.deck && mine?.deck && mine.deck.name !== e.deck.name ? '<p class="muted small">Enviando o deck novo ao organizador…</p>' : '';
  return `<section class="mz tour-me" aria-label="Sua inscrição"><div class="tour-mecv">${cover(deck)}</div><div class="tour-meinfo">
    <h2>${mine ? 'Você está inscrito' : 'Inscrição'}</h2>
    <p>${deck ? `Deck: <b>${esc(deck.name)}</b>${legendName(deck) ? ` · ${esc(legendName(deck))}` : ''}` : 'Escolha o deck que vai usar no torneio.'}${!canDeck && mine ? ' <span class="muted small">(fixo até o fim)</span>' : ''}</p>
    ${sel}${local}
    ${e.note ? `<p class="err">${esc(e.note)}</p>` : ''}
    <div class="btns">${action}</div>${pend}</div></section>`;
}
function champHtml(t: Tournament): string {
  if (t.status !== 'done' || !t.champion) return '';
  const p = playerOf(t, t.champion);
  const d = t.champDeck ?? p?.deck ?? null;
  return `<section class="mz tour-champ" aria-label="Campeão">${cover(d)}<div><span class="tour-kicker">Campeão</span><h2>🏆 ${esc(p?.name ?? '?')}</h2>
    ${d ? `<p>com o deck <b>${esc(d.name)}</b>${legendName(d) ? ` · ${esc(legendName(d))}` : ''}${champOk(d) && cardData(d.champion).name.split(',')[0] !== legendName(d) ? ` (${esc(cardData(d.champion).name.split(',')[0])})` : ''}</p>` : ''}
    <p class="muted small">${fmtText(t)} · ${t.players.length} participantes · terminou em ${date(t.finished ?? Date.now())}</p></div></section>`;
}
function fixHtml(t: Tournament): string {
  if (!fixing) return '';
  const m = t.matches.find((x) => x.id === fixing!.mid);
  if (!m || !m.a || !m.b) return '';
  const A = playerName(t, m.a);
  const B = playerName(t, m.b);
  const max = 2 * winsNeeded(t) - 1;
  const rows = fixing.games
    .map(
      (g, i) => `<div class="tour-fixrow"><span>${t.bestOf === 3 ? `Jogo ${i + 1}` : 'Partida'}</span>
      <select data-fix="w" data-i="${i}" aria-label="Vencedor"><option value="0" ${g.w === 0 ? 'selected' : ''}>venceu ${esc(A)}</option><option value="1" ${g.w === 1 ? 'selected' : ''}>venceu ${esc(B)}</option></select>
      <label class="tour-fixpts">${esc(A)} <input type="number" min="0" max="99" data-fix="a" data-i="${i}" value="${g.a}"></label>
      <label class="tour-fixpts">${esc(B)} <input type="number" min="0" max="99" data-fix="b" data-i="${i}" value="${g.b}"></label>
      <button type="button" class="tour-x" data-act="tfixdel" data-i="${i}" aria-label="Tirar a partida">✕</button></div>`,
    )
    .join('');
  return `<div class="modal" data-act="tfixclose"><div class="mbox tour-fix" role="dialog" aria-label="Corrigir resultado"><h3>${esc(A)} × ${esc(B)} <small class="muted">${roundName(t, m.round)}</small></h3>
    <div class="mbody">
      <p class="muted small">O que você salvar vale para todos. Na chave, mudar quem venceu desfaz os confrontos seguintes que dependiam dele.</p>
      ${rows || '<p class="muted">Sem partidas.</p>'}
      ${fixing.games.length < max ? '<button type="button" data-act="tfixadd">+ partida</button>' : ''}
      <div class="btns"><button type="button" class="primary" data-act="tfixsave">Salvar resultado</button><button type="button" data-act="tfixwo" data-side="a">W.O. para ${esc(A)}</button><button type="button" data-act="tfixwo" data-side="b">W.O. para ${esc(B)}</button><button type="button" data-act="tfixclear">Limpar resultado</button></div>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    </div><button type="button" data-act="tfixclose">Fechar</button></div></div>`;
}
function tourViewHtml(e: TourEntry): string {
  const t = e.t;
  const st = connState(e.code);
  const chip =
    e.role === 'org'
      ? `<span class="netchip ${st === 'semrede' || st === 'abrindo' ? 'reconectando' : 'conectado'}">Você organiza · ${st === 'semrede' ? 'sem conexão' : st === 'abrindo' ? 'conectando…' : 'no ar'}</span>`
      : `<span class="netchip ${st === 'ok' ? 'conectado' : 'reconectando'}">${st === 'ok' ? 'conectado ao organizador' : st === 'semorg' ? 'organizador fora do ar' : st === 'abrindo' ? 'procurando o torneio…' : 'sem conexão'}</span>`;
  const link = `${location.href.split('#')[0]}#torneio-${e.code}`;
  const web = location.protocol.startsWith('http');
  const head = `<section class="mz tour-head"><div class="tour-hinfo">
      <span class="tour-kicker">${t ? statusText(t) : 'Torneio'}</span>
      <h1>${esc(t?.name ?? `Torneio ${e.code}`)}</h1>
      <p class="muted">${t ? `${fmtText(t)} · organizado por ${esc(t.orgName)}` : 'Esperando o organizador mandar o torneio. Ele precisa estar com o jogo aberto.'}</p>
      ${chip}
    </div><div class="tour-code"><span class="muted small">Código</span><div class="roomcode">${esc(e.code)}</div>
      ${web ? `<div class="joinrow"><input id="tinvite" readonly value="${esc(link)}" aria-label="Link de convite"><button type="button" data-act="tcopy">Copiar link</button></div>` : '<p class="muted small">Mande o código: os outros abrem Torneio → Entrar.</p>'}</div></section>`;
  if (!t) return head;
  const body =
    t.status === 'lobby'
      ? meHtml(e, t) + playersHtml(e, t)
      : champHtml(t) + meHtml(e, t) + nextHtml(e, t) + (t.format === 'elim' ? bracketHtml(e, t) : tableHtml(t) + roundsHtml(e, t)) + resultsHtml(t) + playersHtml(e, t);
  return head + body + fixHtml(t);
}

/** A página inteira (main.ts põe a barra do alto). */
export function tourHtml(topbar: string): string {
  const e = cur ? entry(cur) : null;
  if (cur && !e) cur = null;
  const back = e ? '<button type="button" data-act="tback">← Torneios</button>' : '<button type="button" data-act="thome">← Início</button>';
  const del =
    e && (!e.t || e.t.status !== 'running' || e.role !== 'org')
      ? confirmForget === e.code
        ? `<span class="tour-confirm">Tirar este torneio da sua lista? <button type="button" data-act="tforgetok">Tirar</button><button type="button" data-act="tforgetno">Cancelar</button></span>`
        : `<button type="button" data-act="tforget">Tirar da lista</button>`
      : '';
  return `${topbar}<main class="setup tour"><div class="tour-top">${back}${del}</div>${e ? tourViewHtml(e) : hubHtml()}</main>`;
}

// ───────────────────────────── cliques e campos ─────────────────────────────
function readFix() {
  if (!fixing) return;
  for (const el of Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-fix]'))) {
    const g = fixing.games[Number(el.dataset.i)];
    if (!g) continue;
    const v = Number(el.value);
    if (el.dataset.fix === 'w') g.w = v === 1 ? 1 : 0;
    else if (el.dataset.fix === 'a') g.a = v;
    else g.b = v;
  }
}
function room(e: TourEntry, m: TourMatch, watch: boolean): TourRoom | null {
  const t = e.t;
  if (!t || !m.a || !m.b) return null;
  const role = watch ? 'watch' : m.a === me() ? 'host' : m.b === me() ? 'guest' : 'watch';
  return { room: matchRoomCode(t.code, m.id), role, tag: { code: t.code, mid: m.id, a: m.a, b: m.b }, deck: role === 'watch' ? null : e.deck ?? null, name: `${t.name}: ${playerName(t, m.a)} × ${playerName(t, m.b)}`.slice(0, 32) };
}
const ACTS = new Set('thome tback tcopt tcreate tjoin topen tplay twatch tfix tfixclose tfixadd tfixdel tfixsave tfixwo tfixclear tkick tstart tenter tleave tcopy trp tforget tforgetno tforgetok'.split(' '));
export function onTourClick(t: HTMLElement): boolean {
  const act = t.closest('[data-act]') as HTMLElement | null;
  const a = act?.dataset.act;
  if (!a || !ACTS.has(a) || !document.querySelector('.setup.tour')) return false;
  const e = cur ? entry(cur) : null;
  if (a !== 'tfixclose' && a !== 'tfixsave') msg = '';
  switch (a) {
    case 'thome':
      cur = null;
      setHash(null);
      hooks.home();
      return true;
    case 'tback':
      showTour(null);
      confirmForget = null;
      break;
    case 'tcopt': {
      const k = act!.dataset.k;
      if (k === 'format') draft.format = act!.dataset.v === 'rr' ? 'rr' : 'elim';
      if (k === 'bestOf') draft.bestOf = act!.dataset.v === '3' ? 3 : 1;
      break;
    }
    case 'tcreate': {
      if (draft.play && !draft.deckId) {
        msg = 'Escolha o seu deck (ou desmarque "Eu também jogo").';
        break;
      }
      const ne = createTour({ ...draft, deckId: draft.play ? draft.deckId : undefined });
      draft.name = '';
      showTour(ne.code);
      break;
    }
    case 'tjoin': {
      const code = cleanCode(joinDraft.replace(/^.*TORNEIO-/i, ''));
      if (code.length !== 6) {
        msg = 'O código tem 6 letras.';
        break;
      }
      joinDraft = '';
      showTour(code);
      break;
    }
    case 'topen':
      showTour(act!.dataset.code!);
      break;
    case 'tplay':
    case 'twatch': {
      const m = e?.t?.matches.find((x) => x.id === act!.dataset.mid);
      const r = e && m ? room(e, m, a === 'twatch') : null;
      if (r && r.role !== 'watch' && !r.deck) {
        msg = 'Escolha o seu deck antes de jogar.';
        break;
      }
      if (r) hooks.play(r);
      return true;
    }
    case 'tfix': {
      const m = e?.t?.matches.find((x) => x.id === act!.dataset.mid);
      if (m) fixing = { mid: m.id, games: m.games.map((g) => ({ w: g.w, a: g.pts[0], b: g.pts[1], seed: g.seed })) };
      if (fixing && !fixing.games.length) fixing.games.push({ w: 0, a: 8, b: 0 });
      break;
    }
    case 'tfixclose':
      if (t !== act && t.tagName !== 'BUTTON') return true; // clique dentro da caixa
      fixing = null;
      break;
    case 'tfixadd':
      readFix();
      fixing?.games.push({ w: 0, a: 8, b: 0 });
      break;
    case 'tfixdel':
      readFix();
      fixing?.games.splice(Number(act!.dataset.i), 1);
      break;
    case 'tfixsave':
    case 'tfixwo':
    case 'tfixclear': {
      readFix();
      if (!cur || !fixing) break;
      const err =
        a === 'tfixwo'
          ? fix(cur, fixing.mid, [], act!.dataset.side === 'b' ? 'b' : 'a')
          : fix(cur, fixing.mid, a === 'tfixclear' ? [] : fixing.games.map((g) => ({ w: g.w, pts: [g.a, g.b] as [number, number], seed: g.seed })));
      msg = err ?? '';
      if (!err) fixing = null;
      break;
    }
    case 'tkick':
      if (cur) kick(cur, act!.dataset.pid!);
      break;
    case 'tstart':
      if (cur) msg = startTour(cur) ?? '';
      break;
    case 'tenter':
      if (cur) setPlaying(cur, true);
      break;
    case 'tleave':
      if (cur) setPlaying(cur, false);
      break;
    case 'tcopy': {
      const inp = document.getElementById('tinvite') as HTMLInputElement | null;
      if (inp)
        navigator.clipboard?.writeText(inp.value).then(
          () => (act!.textContent = 'Copiado'),
          () => inp.select(),
        );
      return true;
    }
    case 'trp':
      if (cur)
        void openTourReplay(cur, Number(act!.dataset.seed)).then((r) => {
          if (r === 'none') msg = 'O replay desta partida não está aqui e o organizador não está conectado.';
          hooks.render();
        });
      break;
    case 'tforget':
      confirmForget = cur;
      break;
    case 'tforgetno':
      confirmForget = null;
      break;
    case 'tforgetok':
      if (cur) forget(cur);
      confirmForget = null;
      cur = null;
      break;
  }
  hooks.render();
  return true;
}
/** Campos da tela (rascunho do torneio novo, código, deck): guardados sem redesenhar a cada tecla. */
function onField(ev: Event) {
  const el = ev.target as HTMLInputElement;
  if (!el?.id || !document.querySelector('.setup.tour')) return;
  if (el.id === 'tcname') draft.name = el.value;
  else if (el.id === 'tjcode') joinDraft = el.value;
  else if (ev.type === 'change') {
    if (el.id === 'tccards') draft.cards = el.value === 'padrao' ? 'padrao' : 'casual';
    else if (el.id === 'tcchange') draft.deckChange = el.checked;
    else if (el.id === 'tcplay') draft.play = el.checked;
    else if (el.id === 'tcdeck') draft.deckId = el.value;
    else if (el.id === 'tmydeck' && cur && el.value) setMyDeck(cur, el.value);
    else return;
    hooks.render();
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
  document.addEventListener('keydown', (ev) => {
    const el = ev.target as HTMLElement;
    if (ev.key === 'Enter' && el?.id === 'tjcode') document.querySelector<HTMLElement>('[data-act=tjoin]')?.click();
  });
}
