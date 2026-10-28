// Telas de Ranking (você e os amigos que já enfrentou online, pela pontuação Elo) e de Perfil (pontuação ao longo das
// partidas, taxa de vitória geral/por deck/por lenda/por adversário, sequências, partidas por modo). Os dados vêm de
// rating.ts (ranking e carreira), do histórico e das estatísticas dos decks da conta.
import * as acc from './account';
import * as hist from './history';
import * as rating from './rating';
import { cardData, hasCard } from '../engine/db';
import { coverArt } from './deckbuilder';
import { esc } from './text';

interface ProfileHooks {
  render(): void;
  /** volta para a tela inicial */
  home(): void;
  /** mostra a tela (fecha a partida aberta, se houver) */
  open(page: 'ranking' | 'profile'): void;
}
let hooks: ProfileHooks;
export function setProfileHooks(h: ProfileHooks) {
  hooks = h;
}

const AI_NAMES: Record<string, string> = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
const pct = (w: number, g: number) => (g ? Math.round((100 * w) / g) : 0);
const date = (t?: number) => (t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');
const signed = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '±0');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const careerNow = () => rating.career(hist.list);

/** Cartas cuja arte as telas usam (capas dos decks). */
export function profileCodes(): string[] {
  const c = careerNow();
  return Object.values(c.decks).flatMap((d) => [d.legend, d.champion]).filter((x) => x && hasCard(x));
}

function streakText(s: number): string {
  if (!s) return '<span class="muted">—</span>';
  const n = Math.abs(s);
  const t = s > 0 ? plural(n, 'vitória', 'vitórias') : plural(n, 'derrota', 'derrotas');
  return `<span class="rk-streak ${s > 0 ? 'up' : 'down'}"><i aria-hidden="true">${s > 0 ? '▲' : '▼'}</i>${t}</span>`;
}

// ───────────────────────────── ranking ─────────────────────────────
export function rankingHtml(topbar: string): string {
  const r = rating.rankStore();
  const rows = rating.rankTable();
  const pos = rows.findIndex((x) => x.me) + 1;
  const friends = rows.filter((x) => !x.me);
  const head = `<div class="hero"><h1>Ranking entre amigos</h1><p>Cada conta começa com 1000 pontos. Só as partidas <b>online</b> contra amigos contam: ganhar de quem tem mais pontos vale mais, perder para quem tem menos custa mais. Os dois lados registram o mesmo resultado.</p></div>`;
  const me = `<section class="rk-me mz" aria-label="Sua pontuação">
    <span class="seat-who">Sua pontuação</span>
    <b class="rk-big">${r.elo}</b>
    <span class="muted small">${friends.length ? `${pos}º de ${rows.length}` : 'Sem partidas online ainda'} · ${plural(r.n, 'partida', 'partidas')} · recorde ${r.best}</span>
    <div class="btns"><button type="button" data-act="profile">Ver o seu perfil</button></div>
  </section>`;
  const table = friends.length
    ? `<section class="rk-table mz" aria-label="Classificação">
      <div class="rk-row rk-headrow" aria-hidden="true"><span>#</span><span>Jogador</span><span>Pontos</span><span>Você × ele</span><span>Sua sequência</span><span>Última partida</span></div>
      <ol>${rows
        .map(
          (x, i) => `<li class="rk-row${x.me ? ' me' : ''}"${x.me ? ' aria-current="true"' : ''}>
        <span class="rk-pos">${i + 1}º</span>
        <span class="rk-name"><b>${esc(x.name)}</b>${x.me ? ' <span class="rk-you">você</span>' : ''}</span>
        <span class="rk-elo"><b>${x.elo}</b>${x.me ? '' : '<span class="muted small" title="A pontuação dele como você viu por último">última vista</span>'}</span>
        <span class="rk-wl"><span class="rk-lab">${x.me ? 'No total' : 'Você × ele'}</span>${x.w} V · ${x.l} D</span>
        <span class="rk-st"><span class="rk-lab">Sua sequência</span>${streakText(x.streak)}</span>
        <span class="rk-last"><span class="rk-lab">Última</span>${date(x.last)}${x.lastD !== undefined ? ` <span class="rk-d ${x.lastD >= 0 ? 'up' : 'down'}">(você ${signed(x.lastD)})</span>` : ''}</span>
      </li>`,
        )
        .join('')}</ol>
      <p class="muted small">A pontuação de cada amigo é a última que você viu (no começo e no fim de cada partida com ele). "Você × ele" conta só as partidas entre vocês dois.</p>
    </section>`
    : `<section class="rk-empty mz"><h2>Ninguém no ranking ainda</h2><p>Jogue uma partida online com um amigo (tela inicial → Online). Quando ela terminar, vocês dois aparecem aqui.</p></section>`;
  return `${topbar}<main class="setup ranking">
    <div class="lad-top"><button type="button" data-act="pfhome">← Início</button></div>
    ${head}<div class="rk-grid">${me}${table}</div>
  </main>`;
}

// ───────────────────────────── gráficos ─────────────────────────────
/** Pontuação depois de cada partida do ranking (linha), com a de partida (1000) como referência. */
export function eloChart(log: rating.RankLogEntry[]): string {
  if (!log.length) return '<p class="muted pf-nochart">O gráfico aparece depois da primeira partida online contra um amigo.</p>';
  const pts = [log[0].elo - log[0].d, ...log.map((e) => e.elo)];
  // largura do desenho pela tela (o texto do SVG escala junto: num celular um desenho largo deixaria tudo minúsculo)
  const vw = typeof innerWidth === 'number' ? innerWidth : 1024;
  const W = vw < 700 ? Math.max(300, vw - 60) : 640;
  const H = vw < 700 ? 200 : 220;
  const L = 46;
  const R = 54;
  const T = 14;
  const B = 28;
  let lo = Math.min(...pts, rating.START_ELO);
  let hi = Math.max(...pts, rating.START_ELO);
  const pad = Math.max(10, (hi - lo) * 0.12);
  lo = Math.floor((lo - pad) / 10) * 10;
  hi = Math.ceil((hi + pad) / 10) * 10;
  const x = (i: number) => L + (pts.length === 1 ? 0 : ((W - L - R) * i) / (pts.length - 1));
  const y = (v: number) => T + ((H - T - B) * (hi - v)) / (hi - lo);
  const step = [10, 20, 25, 50, 100, 200].find((s) => (hi - lo) / s <= 5) ?? 500;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  const grid = ticks.map((v) => `<line class="pf-gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="pf-ax" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const base = `<line class="pf-base" x1="${L}" x2="${W - R}" y1="${y(rating.START_ELO)}" y2="${y(rating.START_ELO)}"/>`;
  const line = `<polyline class="pf-line" points="${pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
  // marcadores: vitória = círculo cheio, derrota = círculo vazado (forma, não só cor); dica com o detalhe ao apontar
  const showDots = log.length <= 60;
  const dots = log
    .map((e, i) => {
      const cx = x(i + 1).toFixed(1);
      const cy = y(e.elo).toFixed(1);
      const tip = `Partida ${i + 1} · ${e.won ? 'venceu' : 'perdeu de'} ${e.name} (${e.oe}) · ${signed(e.d)} → ${e.elo} · ${date(e.at)}`;
      return `<g class="pf-pt"><circle class="pf-hit" cx="${cx}" cy="${cy}" r="10"/>${showDots ? `<circle class="pf-dot ${e.won ? 'w' : 'l'}" cx="${cx}" cy="${cy}" r="4.5"/>` : ''}<title>${esc(tip)}</title></g>`;
    })
    .join('');
  const last = pts[pts.length - 1];
  const lab = `<text class="pf-lastlab" x="${x(pts.length - 1) + 8}" y="${y(last) + 5}">${last}</text>`;
  const xl = `<text class="pf-ax" x="${L}" y="${H - 8}">início</text><text class="pf-ax" x="${W - R}" y="${H - 8}" text-anchor="end">${plural(log.length, 'partida', 'partidas')}</text>`;
  return `<figure class="pf-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pontuação depois de cada partida: de ${pts[0]} a ${last}">${grid}${base}${line}${dots}${lab}${xl}</svg>
    <figcaption class="pf-legend">${showDots ? '<span><i class="pf-key w" aria-hidden="true"></i>vitória</span><span><i class="pf-key l" aria-hidden="true"></i>derrota</span>' : ''}<span><i class="pf-key base" aria-hidden="true"></i>1000 (início)</span><span class="muted">Aponte um ponto para ver a partida.</span></figcaption></figure>`;
}

interface BarRow {
  label: string;
  sub?: string;
  g: number;
  w: number;
}
/** Barras horizontais de taxa de vitória: o texto "V–D · %" sempre ao lado (nada só por cor), marca em 50%. */
export function winBars(rows: BarRow[], empty: string): string {
  if (!rows.length) return `<p class="muted small">${empty}</p>`;
  return `<ul class="pf-bars">${rows
    .map((r) => {
      const p = pct(r.w, r.g);
      return `<li title="${esc(`${r.label}: ${r.w} vitórias em ${r.g} partidas (${p}%)`)}"><span class="pf-blab"><b>${esc(r.label)}</b>${r.sub ? `<span class="muted small">${esc(r.sub)}</span>` : ''}</span>
        <span class="pf-track" aria-hidden="true"><span class="pf-fill" style="width:${p}%"></span><span class="pf-half"></span></span>
        <span class="pf-bval"><b>${p}%</b> <span class="muted">${r.w}V · ${r.g - r.w}D</span></span></li>`;
    })
    .join('')}</ul>`;
}
/** Barras de quantidade (partidas por modo). */
function countBars(rows: { label: string; n: number; sub?: string }[]): string {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return `<ul class="pf-bars count">${rows
    .map(
      (r) => `<li><span class="pf-blab"><b>${esc(r.label)}</b>${r.sub ? `<span class="muted small">${esc(r.sub)}</span>` : ''}</span>
      <span class="pf-track" aria-hidden="true"><span class="pf-fill" style="width:${(100 * r.n) / max}%"></span></span>
      <span class="pf-bval"><b>${r.n}</b> <span class="muted">${r.n === 1 ? 'partida' : 'partidas'}</span></span></li>`,
    )
    .join('')}</ul>`;
}

// ───────────────────────────── perfil ─────────────────────────────
export function profileHtml(topbar: string): string {
  const p = acc.profile();
  const r = rating.rankStore();
  const c = careerNow();
  const played = c.modes.ai.g + c.modes.online.g;
  const won = c.modes.ai.w + c.modes.online.w;
  const rows = rating.rankTable();
  const pos = rows.findIndex((x) => x.me) + 1;
  const deckName = (k: string, d: { name: string }) => acc.savedDeckOf(k)?.name ?? d.name;
  const decks = Object.entries(c.decks).sort((a, b) => b[1].g - a[1].g || b[1].w - a[1].w);
  const fav = decks[0];
  const tile = (label: string, value: string, sub = '') => `<div class="pf-tile"><span class="pf-tlab">${label}</span><b class="pf-tval">${value}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>`;
  const tiles = `<div class="pf-tiles">
    ${tile('Pontuação', String(r.elo), r.n ? `${rows.length > 1 ? `${pos}º de ${rows.length} · ` : ''}recorde ${r.best}` : 'começa em 1000')}
    ${tile('Partidas', String(played), 'contra a IA e online')}
    ${tile('Taxa de vitória', played ? `${pct(won, played)}%` : '—', played ? `${plural(won, 'vitória', 'vitórias')} · ${plural(played - won, 'derrota', 'derrotas')}` : 'nenhuma partida ainda')}
    ${tile('Maior sequência', played ? plural(c.best, 'vitória', 'vitórias') : '—', `agora: ${c.streak ? plural(c.streak, 'vitória seguida', 'vitórias seguidas') : 'nenhuma vitória seguida'}`)}
  </div>`;
  const favBox = fav
    ? `<section class="pf-fav mz" aria-label="Deck mais usado"><span class="seat-who">Deck mais usado</span>${coverArt(fav[1].legend, fav[1].champion, acc.savedDeckOf(fav[0])?.cover)}
      <b class="lad-dname">${esc(deckName(fav[0], fav[1]))}</b><span class="muted small">${hasCard(fav[1].legend) ? esc(cardData(fav[1].legend).name) : ''} · ${plural(fav[1].g, 'partida', 'partidas')} · ${pct(fav[1].w, fav[1].g)}% de vitórias</span></section>`
    : `<section class="pf-fav mz"><span class="seat-who">Deck mais usado</span><p class="muted">Nenhuma partida contra a IA ou online ainda.</p></section>`;
  const eloBox = `<section class="pf-elo mz" aria-label="Pontuação ao longo das partidas"><h2>Pontuação por partida</h2>${eloChart(r.log)}</section>`;
  const deckBars = winBars(
    decks.slice(0, 10).map(([k, d]) => ({ label: deckName(k, d), sub: hasCard(d.legend) ? cardData(d.legend).name : '', g: d.g, w: d.w })),
    'Sem partidas ainda.',
  );
  const legBars = winBars(
    Object.entries(c.legends)
      .sort((a, b) => b[1].g - a[1].g)
      .slice(0, 10)
      .map(([code, x]) => ({ label: hasCard(code) ? cardData(code).name : code, g: x.g, w: x.w })),
    'Sem partidas ainda.',
  );
  const oppLabel = (k: string, name: string) => (k.startsWith('ai:') ? `IA ${AI_NAMES[k.slice(3)] ?? ''}`.trim() : name);
  const oppSub = (k: string) => (k.startsWith('ai:') ? (k === 'ai:?' ? 'antes dos níveis serem registrados' : 'contra a IA') : k.startsWith('f:') ? 'amigo (online)' : 'online');
  const oppOrder = (k: string) => (k.startsWith('f:') || k.startsWith('n:') ? 0 : 1);
  const oppBars = winBars(
    Object.entries(c.opps)
      .sort((a, b) => oppOrder(a[0]) - oppOrder(b[0]) || b[1].g - a[1].g)
      .slice(0, 12)
      .map(([k, x]) => ({ label: oppLabel(k, x.name), sub: oppSub(k), g: x.g, w: x.w })),
    'Sem partidas ainda.',
  );
  const modes = countBars([
    { label: 'Contra a IA', n: c.modes.ai.g, sub: c.modes.ai.g ? `${pct(c.modes.ai.w, c.modes.ai.g)}% de vitórias` : '' },
    { label: 'Online', n: c.modes.online.g, sub: c.modes.online.g ? `${pct(c.modes.online.w, c.modes.online.g)}% de vitórias` : '' },
    { label: 'Passa-e-joga', n: c.modes.human.g, sub: 'não conta na taxa de vitória' },
  ]);
  const note = c.fromHist ? `<p class="muted small">Esta conta é de antes do perfil: os números começaram com as ${c.fromHist} partidas que estavam no histórico.</p>` : '';
  return `${topbar}<main class="setup profile">
    <div class="lad-top"><button type="button" data-act="pfhome">← Início</button><button type="button" data-act="ranking">Ranking</button></div>
    <div class="hero"><h1>${esc(p.name)}</h1><p>Perfil da conta neste aparelho. Desafios, tutorial e partidas assistidas não entram nos números.</p></div>
    ${tiles}
    <div class="pf-grid">${eloBox}${favBox}</div>
    <div class="pf-cols">
      <section class="mz" aria-label="Taxa de vitória por deck"><h2>Por deck</h2>${deckBars}</section>
      <section class="mz" aria-label="Taxa de vitória por lenda"><h2>Por lenda</h2>${legBars}</section>
      <section class="mz" aria-label="Taxa de vitória por adversário"><h2>Por adversário</h2>${oppBars}</section>
      <section class="mz" aria-label="Partidas por modo"><h2>Partidas por modo</h2>${modes}</section>
    </div>
    ${note}
  </main>`;
}

/** Linha do fim da partida online: a mudança da pontuação (já gravada no histórico). */
export function rankEndNote(cfg: any, seat: number): string {
  const e = rating.rankedOf(cfg, seat);
  if (!e) return '';
  return `Ranking: ${signed(e.d)} → <b>${e.elo}</b> pontos <span class="muted">(${esc(e.name)}: ${e.oe} → ${Math.max(0, e.oe - e.d)})</span>`;
}

/** Cliques das telas de ranking e perfil (e dos botões que levam a elas). true = tratado. */
export function onProfileClick(t: HTMLElement): boolean {
  const el = t.closest('[data-act]') as HTMLElement | null;
  const a = el?.dataset.act;
  if (a === 'ranking' || a === 'profile') hooks.open(a);
  else if (a === 'pfhome') hooks.home();
  else return false;
  return true;
}
