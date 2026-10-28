// Interface de mesa (passa-e-joga) para o motor de Riftbound.
import '../cards';
import { Game } from '../engine/game';
import { cardData, hasCard, isChampionCard, kindOf } from '../engine/db';
import { isImplemented } from '../engine/script';
import { checkDeck } from '../engine/deckcheck';
import { DECKS, deckSize } from '../decks/origins';
import { MANUAL_PAY, type Engine } from '../engine/engine';
import type { Decision, Domain, Loc, Obj, Option, P } from '../engine/types';
import { DOMAIN_COLOR, DOMAIN_PT, esc, rulesHtml } from './text';
import { AiPlayer, quickPick, AI_LEVELS, isAiLevel, type AiLevel } from '../ai/ai';
import { artUrl, ensureArt } from './art';
import { cycleSound, sfx, soundFromLog, soundIcon } from './sound';
import { canLink, codeFromText, decodeReplay, encodeReplay, linkFor, prepareReplay } from './replaylink';
import { copyText, showCopyBox } from './copy';
import { cycleMusic, deckTrack, loadMusic, musicBoards, musicIcon, musicScene, stopPreview } from './music';
import { registerSw } from './swreg';
import { pageZoom, zRect, zpx } from './zoom';
import { FELTS, currentMat, loadMats, lorMats, matAttrs, matChoice, setMat } from './mats';
import * as acc from './account';
import { RUNE_CODES, coverArt, db as dbState, deckbuilderHtml, mountDb, onDbClick, onDbContext, onDbHover, onDbInput, poolCodes, refreshDbPeek, setHooks } from './deckbuilder';
import * as hist from './history';
import { challengeArtCodes, challengeHold, challengeHudHtml, challengeOf, challengeOverlayHtml, challengesHtml, onChallengeClick, setChallengeHooks } from './challenges';
import * as tut from './tutorial';
import { ladderEndButtons, ladderEndNote, ladderRecord, type LadderMatch } from './ladder';
import { ladderCodes, ladderHtml, onLadderClick, setLadderHooks } from './ladderscreen';
import { initTour, knownGames, tourRecord, tourTagOf, type TourTag } from './tournamentsync';
import { onTourClick, setHash, setTourHooks, showTour, tourArtCodes, tourHtml, type TourRoom } from './tournamentscreen';
import type { DeckList, GameConfig } from '../engine/engine';
import { chainTargets, liveCombat, locKey, matchDrop, moveCombat, moveTargets, type CombatPreview, type Drop } from './interact';
import { CONCEPTS, guideHtml, keywordHelpHtml } from './glossary';
import { LobbyWatch, Net, PROTOCOL, cleanCode, cleanText, inClaudeApp, makeKeys, newCode, pack, sharedKey, unpack, type Listing, type Msg, type Op } from './online';
import * as rating from './rating';
import { onProfileClick, profileCodes, profileHtml, rankEndNote, rankingHtml, setProfileHooks } from './profile';
import { ViewGame, ViewKeeper, type ViewDiff, type ViewSource, type ViewState, type Viewer } from '../engine/view';
/** A página está aberta dentro do app do Claude? (lá o online usa o canal da própria página) */
let claudeApp = false;
void inClaudeApp().then((v) => {
  claudeApp = v;
  if (v) render();
});

// ───────────────────────────── estado da interface ─────────────────────────────
interface Settings {
  names: [string, string];
  decks: [string, string]; // 'pre:<n>' (starter) ou 'my:<id>' (deck da conta)
  bfMode: 'random' | 'choose';
  format: 'casual' | 'padrao';
  privacy: boolean;
  autoPass: boolean;
  opponent: 'ai' | 'human' | 'online';
  aiLevel: AiLevel; // nível da IA para a próxima partida (a partida guarda o dela no cfg)
}
const DEFAULTS: Settings = {
  names: ['Você', 'IA'],
  decks: ['pre:0', 'pre:1'],
  bfMode: 'random',
  format: 'casual',
  privacy: true,
  autoPass: true,
  opponent: 'ai',
  aiLevel: 'normal',
};

// ───────────────────────────── IA ─────────────────────────────
const HUMAN: P = 0;
let ai: AiPlayer | null = null;
let aiTimer: ReturnType<typeof setTimeout> | null = null;
const vsAi = () => settings.opponent === 'ai' || !!challengeOf(game); // desafio: sempre contra a IA
/** Nível da IA da partida aberta: o guardado no cfg dela (replay e relatório reproduzem); sem ele, o das configurações. */
const aiLevelOf = (g: Game | null): AiLevel => {
  const l = (g?.cfg as { aiLevel?: unknown } | undefined)?.aiLevel;
  return isAiLevel(l) ? l : settings.aiLevel;
};
const newAi = () => new AiPlayer((1 - HUMAN) as P, aiLevelOf(game));
const isAiTurn = () => !replay && vsAi() && !!game?.current && game.current.player !== HUMAN;
/** Vez do outro lado (IA ou amigo online): a interface só observa. No replay, também só se observa. */
const isOtherTurn = () => !!replay || isAiTurn() || (online() && (net!.role === 'watch' || (!!game?.current && game.current.player !== seat)));
/** Esconder a mão/cartas escondidas do outro lado? (sempre contra a IA e online; no replay mostra tudo) */
const hideOpp = () => !replay && (vsAi() || online() || settings.privacy);

// ───────────────────────────── replay e relatório de problema ─────────────────────────────
// A partida é só a configuração + a lista de respostas: dá para salvar num arquivo pequeno, mandar para quem cuida
// do jogo e reabrir no mesmo lance, ou rever lance a lance.
let replay: { cfg: any; answers: string[][]; pos: number; note?: string; back: { game: Game | null; view: P } } | null = null;

// ───────────────────────────── online ─────────────────────────────
// O anfitrião roda a partida de verdade; convidado e espectadores recebem só a própria visão (src/engine/view.ts:
// a mão de cada um e o que é público) e montam a mesa com ela (ViewGame, mesma cara de Game para a mesa). Limitação
// aceita: a partida inteira fica na memória do anfitrião (é a máquina dele que joga).
let net: Net | null = null;
let seat: P = 0; // meu lugar na partida online (anfitrião 0, convidado 1)
let seq = 0; // jogadas aplicadas (para o convidado não perder nenhuma)
let owners: P[] = []; // anfitrião: quem deu cada resposta (para o "desfazer")
let guest: { name: string; deck: DeckList; rk?: rating.RankCard | null } | null = null; // anfitrião: quem entrou
let hostInfo: { name: string; deck: string; rk?: rating.RankCard | null } | null = null; // convidado: dados do anfitrião
let joinCode = '';
let netNote = '';
const online = () => !!net;
/** Convidado: jogada enviada ainda sem resposta (reenvia se a mensagem se perder no caminho). */
let pendingReq: { op: Op; seq: number; at: number } | null = null;
/** Anfitrião: visões filtradas do convidado (lugar 1) e dos espectadores (-1). */
let guestView: ViewKeeper | null = null;
let watchView: ViewKeeper | null = null;
/** Canal cifrado com o outro jogador: minhas chaves (novas a cada abertura da página) e a chave combinada. */
let myKeys: { pub: string; priv: CryptoKey } | null = null;
const keysReady = makeKeys().then((k) => {
  myKeys = k;
});
let peerKey: CryptoKey | null = null;
/** Anfitrião: chave pública que o convidado mandou no hello (sem ela, o navegador dele não cifra). */
let guestPk: string | undefined;
/** Anfitrião: dá para mandar a visão do convidado? Só depois do hello e, se os dois cifram, com a chave pronta (a
 *  visão dele nunca vai aberta pela sala: um espectador leria a mão dele). Conferido na hora de mandar. */
const guestReady = () => !!guest && (!!peerKey || !guestPk || !myKeys);
/** Empacotar/abrir mensagens é assíncrono: o que sai e o que chega passa por filas, para a ordem ficar. */
let outQ: Promise<unknown> = Promise.resolve();
let inQ: Promise<unknown> = Promise.resolve();
const queueOut = (f: () => Promise<void> | void) => {
  outQ = outQ.then(f).catch(() => {});
};
/** A partida aberta aqui é a visão filtrada (convidado/espectador). */
const viewGame = (): ViewGame | null => (game && (game as any).isView ? (game as unknown as ViewGame) : null);
/** A partida completa: a de verdade, ou (convidado) a que o anfitrião manda quando ela acaba. */
let finCache: { fin: string; g: Game } | null = null;
function fullGame(): Game | null {
  const vg = viewGame();
  if (!vg) return game;
  const fin = vg.final;
  if (!fin) return null;
  if (finCache?.fin !== fin) {
    try {
      finCache = { fin, g: Game.load(fin) };
    } catch {
      return null;
    }
  }
  return finCache.g;
}
const helloMsg = (): Msg => ({ t: 'hello', name: settings.names[0], deck: myDeck(), v: PROTOCOL, pk: myKeys?.pub, rk: rating.myCard(settings.names[0]) });
/** Sala de um confronto do torneio (tournamentscreen.ts): a marca que vai no cfg e o deck inscrito no torneio. */
let roomTour: { tag: TourTag; deck: DeckList | null } | null = null;
/** Anfitrião: quem entrou como convidado (id do aparelho; no torneio tem de ser o lado b do confronto). */
let guestId = '';
/** Meu deck na sala: o do torneio (fica o mesmo até o fim) ou o escolhido na tela inicial. */
const myDeck = (): DeckList => roomTour?.deck ?? acc.deckById(settings.decks[0]);
function sendReq(op: Op, s: number) {
  queueOut(async () => {
    const z = await pack(op, peerKey);
    net?.send({ t: 'req', z, seq: s });
  });
}
setInterval(() => {
  if (!net || !net.connected) return;
  if (net.role === 'host' && game) {
    const s = seq;
    queueOut(() => net?.send({ t: 'sync', seq: s }));
  }
  if (net.role === 'guest' && pendingReq && Date.now() - pendingReq.at > 3000) {
    if (pendingReq.seq !== seq) pendingReq = null; // o estado já andou: o pedido velho não vale mais
    else {
      sendReq(pendingReq.op, pendingReq.seq);
      pendingReq.at = Date.now();
    }
  }
}, 3000);

// ── anfitrião: a visão de cada um ──
function newKeepers() {
  guestView = new ViewKeeper(1);
  watchView = new ViewKeeper(-1);
}
function viewSource(viewer: Viewer): ViewSource {
  const g = game!;
  const lr = g.lastRoot;
  const over = g.engine.winner !== null || !g.current;
  return {
    engine: g.engine,
    current: g.current,
    answers: g.answers,
    lastRoot: lr,
    canCancel: g.canCancel,
    rootMine: lr !== null && owners.length >= g.answers.length && owners.slice(lr, g.answers.length).every((o) => o === viewer),
    // no fim já não há segredo: a partida completa vai junto (replay, histórico e relatório do convidado)
    final: over ? g.serialize() : undefined,
  };
}
/** Anfitrião: visão completa do convidado (começo da partida, reconexão, ou ele se perdeu). */
function sendGuestFull(kind: 'start' | 'state') {
  if (!net || net.role !== 'host' || !game) return;
  if (!guestView) newKeepers();
  const v: ViewState = guestView!.full(viewSource(1));
  const s = seq;
  queueOut(async () => {
    if (!guestReady()) return; // sem hello/chave: ele pede de novo quando se apresentar
    const z = await pack(v, peerKey);
    net?.send(kind === 'start' ? { t: 'start', z, seq: s, you: 1 } : { t: 'state', z, seq: s });
  });
}
/** Anfitrião: visão completa de espectador (para um só, ou para a sala toda). */
function sendWatchFull(to: string | null) {
  if (!net || net.role !== 'host' || !game) return;
  if (!watchView) newKeepers();
  const v: ViewState = watchView!.full(viewSource(-1));
  const s = seq;
  queueOut(async () => {
    const m: Msg = { t: 'wstate', z: await pack(v), seq: s };
    if (to) net?.sendTo(m, to);
    else net?.send(m);
  });
}
/** Anfitrião: depois de cada jogada, cada um recebe o que mudou na própria visão. */
function pushViews() {
  if (!net || net.role !== 'host' || !game) return;
  if (!guestView || !watchView) newKeepers();
  const s = seq;
  const df: ViewDiff | null = guestView!.diff(viewSource(1));
  if (df) queueOut(async () => (guestReady() ? net?.send({ t: 'view', z: await pack(df, peerKey), seq: s, base: s - 1 }) : undefined));
  else sendGuestFull('state');
  if (net.watcherCount) {
    const wd = watchView!.diff(viewSource(-1));
    if (wd) queueOut(async () => net?.send({ t: 'wview', z: await pack(wd), seq: s, base: s - 1 }));
    else sendWatchFull(null);
  } else watchView!.reset(); // ninguém assistindo: quem chegar recebe a visão completa
}
/** Anfitrião: a resposta do convidado vem com os apelidos das cartas escondidas dele; volta aos ids de verdade. */
function unaliasOp(op: Op): Op {
  if (!guestView || !op || typeof op !== 'object') return op;
  if (op.k === 'answer' && Array.isArray(op.ids)) return { k: 'answer', ids: guestView.unalias(op.ids.map(String)) };
  if (op.k === 'batch' && Array.isArray(op.list)) return { k: 'batch', list: op.list.map((ids) => guestView!.unalias((ids || []).map(String))) };
  return op;
}

// ── hub de salas: criar sala (nome, pública/privada) e a lista ao vivo das salas públicas ──
const ROOMOPTS = 'rbmesa-roomopts';
/** Rascunho de "Criar sala" (guardado no aparelho): nome e se aparece na lista. */
let roomDraft = { name: '', pub: true };
try {
  const r = JSON.parse(localStorage.getItem(ROOMOPTS) || '{}');
  roomDraft = { name: typeof r.name === 'string' ? r.name : '', pub: r.pub !== false };
} catch {
  /* sem armazenamento */
}
function saveRoomDraft() {
  try {
    localStorage.setItem(ROOMOPTS, JSON.stringify(roomDraft));
  } catch {
    /* sem armazenamento */
  }
}
const defaultRoomName = () => `Sala de ${settings.names[0] || 'Jogador'}`;
/** Lista de salas públicas (só enquanto o menu online está aberto e fora de uma sala). */
let lobbyWatch: LobbyWatch | null = null;
function syncLobbyWatch() {
  const want = !game && !net && !replay && page === 'setup' && settings.opponent === 'online';
  if (want && !lobbyWatch) lobbyWatch = new LobbyWatch(updateHub);
  else if (!want && lobbyWatch) {
    lobbyWatch.close();
    lobbyWatch = null;
  }
}
/** O anúncio da minha sala no hub (anfitrião de sala pública). */
function listingInfo(): Listing | null {
  if (!net || net.role !== 'host' || !net.pub) return null;
  const d = game ? game.cfg.decks[0] : acc.deckById(settings.decks[0]);
  const eng = game?.engine;
  const over = !!game && (eng!.winner !== null || !game.current);
  return {
    code: net.code,
    name: net.roomName || defaultRoomName(),
    host: settings.names[0],
    legend: d.legend,
    champion: d.champion,
    deck: d.name,
    state: game ? (over ? 'over' : 'playing') : guest && net.connected ? 'ready' : 'open',
    guest: game ? eng!.pl[1].name : guest && net.connected ? guest.name : undefined,
    score: eng ? [eng.pl[0].points, eng.pl[1].points] : undefined,
    turn: eng?.turn,
    active: eng && !over ? eng.pl[eng.active].name : undefined,
    watchers: net.watcherCount,
    v: PROTOCOL,
    at: Date.now(),
  };
}

// ── chat rápido e pedido de desfazer (mesa online) ──
interface ChatLine {
  id: string;
  by: P;
  name: string;
  text: string;
  at: number;
}
const QUICK_CHAT = ['Boa!', 'Pensando...', 'Ops', 'GG'];
/** Emotes: um clique na mesa (botão 😊), sem abrir o chat; viajam como chat, com o emoji na frente. */
const EMOTES: [string, string][] = [
  ['👍', 'Boa jogada!'],
  ['🤔', 'Hmm...'],
  ['😅', 'Ops'],
  ['😮', 'Uau!'],
  ['⏳', 'Pensando...'],
  ['🤝', 'GG'],
];
const emoteOf = (text: string) => EMOTES.find(([e, t]) => text === `${e} ${t}`);
let emoteOpen = false;
const BUBBLE_MS = 5000;
let chatLog: ChatLine[] = [];
let chatOpen = false;
let chatDraft = '';
let lastChatSent = 0;
/** Anfitrião: pedido de desfazer esperando resposta (volta até a resposta n). */
let undoReq: { by: P; n: number; seq: number } | null = null;
/** Convidado: o anfitrião pediu para desfazer (vale enquanto a partida não andar). */
let undoAsk: { seq: number } | null = null;
function pushChat(c: ChatLine): boolean {
  if (!c.text || chatLog.some((x) => x.id === c.id)) return false;
  chatLog.push(c);
  if (chatLog.length > 40) chatLog = chatLog.slice(-40);
  setTimeout(scheduleRender, BUBBLE_MS + 60); // o balão some
  return true;
}
function sendChat(text: string) {
  if (!net || watching()) return;
  const t = cleanText(text, 60);
  if (!t || Date.now() - lastChatSent < 700) return;
  lastChatSent = Date.now();
  const c: ChatLine = { id: Math.random().toString(36).slice(2, 10), by: seat, name: game?.engine.pl[seat].name || settings.names[0], text: t, at: Date.now() };
  pushChat(c);
  net.send({ t: 'chat', id: c.id, by: c.by, name: c.name, text: c.text });
  render();
}

function openRoom(role: 'host' | 'guest' | 'watch', code: string, opts?: { pub: boolean; name: string; tour?: typeof roomTour }) {
  net?.close();
  roomTour = opts?.tour ?? null;
  guestId = '';
  guest = null;
  hostInfo = null;
  netNote = '';
  chatLog = [];
  chatOpen = false;
  undoReq = null;
  undoAsk = null;
  peerKey = null;
  guestPk = undefined;
  guestView = watchView = null;
  remoteSteps = null;
  seat = role === 'guest' ? 1 : 0;
  net =
    role === 'host'
      ? Net.host(code, onNetMsg, render, { pub: opts?.pub ?? false, name: cleanText(opts?.name, 32) || defaultRoomName(), listing: listingInfo })
      : role === 'guest'
        ? Net.join(code, onNetMsg, render)
        : Net.watch(code, onNetMsg, render);
  rememberRoom(code, role);
  syncLobbyWatch();
  save();
  render();
}
/** Assistindo uma sala (não joga; as duas mãos ficam escondidas). */
const watching = () => net?.role === 'watch';
// salas recentes (para voltar com um clique)
const RECENT = 'rbmesa-recent';
function recentRooms(): { code: string; role: 'host' | 'guest' | 'watch'; at: number }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT) || '[]');
  } catch {
    return [];
  }
}
function rememberRoom(code: string, role: 'host' | 'guest' | 'watch') {
  try {
    const list = recentRooms().filter((r) => r.code !== code);
    list.unshift({ code, role, at: Date.now() });
    localStorage.setItem(RECENT, JSON.stringify(list.slice(0, 5)));
  } catch {
    /* sem armazenamento */
  }
}
function ago(t: number): string {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 60 * 24 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} dia(s)`;
}
function leaveRoom() {
  net?.close();
  net = null;
  chatLog = [];
  chatOpen = false;
  undoReq = null;
  undoAsk = null;
  guest = null;
  hostInfo = null;
  game = null;
  seq = 0;
  owners = [];
  seat = 0;
  peerKey = null;
  guestView = watchView = null;
  remoteSteps = null;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  // sala de um confronto do torneio: volta para a tela do torneio
  if (roomTour) {
    page = 'tour';
    showTour(roomTour.tag.code);
    roomTour = null;
  }
  save();
  render();
}
function performOp(g: Game, op: Op) {
  if (op.k === 'answer') g.answer(op.ids);
  else if (op.k === 'batch') {
    // jogada em sequência (arrastar/mover direto): para assim que a decisão muda de dono ou uma resposta não vale
    const who = g.current?.player;
    for (const ids of op.list) if (!g.current || g.current.player !== who || !g.answer(ids)) break;
  } else if (op.k === 'cancel') g.cancel();
  else if (typeof op.n === 'number') {
    // pedido de desfazer aceito: volta até a jogada de quem pediu (inclusive)
    for (let k = 0; k < 400 && g.answers.length > op.n && g.lastRoot !== null; k++) g.undo();
  } else g.undo();
}
function deny(by: P, msg: string) {
  if (by === seat) netNote = msg;
  else net?.send({ t: 'deny', msg });
}
/** Anfitrião: onde a última jogada (decisão raiz) de `by` começa — o ponto para onde o pedido de desfazer volta. */
function undoTarget(by: P): number | null {
  if (!game) return null;
  const sim = Game.load(game.serialize());
  for (let k = 0; k < 150; k++) {
    const r = sim.lastRoot;
    if (r === null) return null;
    if (owners[r] === by) return r;
    sim.undo();
  }
  return null;
}
/** Anfitrião: `by` quer desfazer depois de o oponente já ter agido — pergunta ao oponente. */
function askUndo(by: P) {
  if (!game || !net) return;
  const n = undoTarget(by);
  if (n === null) return deny(by, 'Não há jogada sua para desfazer.');
  undoReq = { by, n, seq };
  if (by === 0) net.send({ t: 'undoask', seq });
  deny(by, `Pedido de desfazer enviado: esperando ${game.engine.pl[1 - by].name} responder.`);
}
/** Anfitrião: resposta ao pedido de desfazer (dada aqui ou pelo convidado). */
function resolveUndo(ok: boolean) {
  const r = undoReq;
  undoReq = null;
  if (!r || !game || !net || r.seq !== seq) return;
  if (ok) {
    applyOp({ k: 'undo', n: r.n }, r.by, true);
    if (r.by === seat) netNote = '';
  } else deny(r.by, `${game.engine.pl[1 - r.by].name} recusou desfazer.`);
}
/** Anfitrião: aplica uma jogada (sua ou do convidado) e repassa. */
function applyOp(op: Op, by: P, accepted = false): boolean {
  if (!game || !net) return false;
  const d = game.current;
  if (op.k === 'undo' && (game.engine.winner !== null || !d)) {
    // no fim a partida completa já foi para os dois lados (não há mais segredo): desfazer reabriria a partida
    deny(by, 'A partida acabou: não dá mais para desfazer.');
    return false;
  }
  if (op.k === 'undo' && !accepted) {
    // a própria jogada, antes de o oponente agir: desfaz direto; senão vira pedido ao oponente
    const back = game.lastRoot;
    if (back === null || owners.length < game.answers.length || owners.slice(back).some((o) => o !== by)) {
      askUndo(by);
      return false;
    }
    op = { k: 'undo' };
  } else if (op.k === 'undo') {
    /* pedido aceito */
  } else if (!d || d.player !== by) {
    deny(by, 'Não é a sua vez de decidir.');
    return false;
  }
  const before = game.answers.length;
  performOp(game, op);
  owners.length = Math.min(owners.length, game.answers.length);
  for (let k = before; k < game.answers.length; k++) owners[k] = by;
  seq++;
  undoReq = null; // a partida andou: pedido de desfazer pendente não vale mais
  pushViews();
  return true;
}
function startOnlineGame() {
  if (!net || net.role !== 'host' || !guest || !net.connected) return;
  if (roomTour && guestId && guestId !== roomTour.tag.b) return; // confronto do torneio: só contra o adversário certo
  game = new Game({
    seed: (Math.random() * 2 ** 31) | 0,
    decks: [myDeck(), guest.deck],
    names: [settings.names[0], guest.name],
    battlefieldMode: settings.bfMode,
    autoPass: settings.autoPass,
    // partida de torneio: o resultado volta para o torneio (tournamentsync.ts); o motor ignora
    ...(roomTour ? { tour: roomTour.tag } : {}),
    // testes (scripts/tourtest.mjs): partida mais curta
    ...((window as any).__RB_TEST_CFG__ || {}),
    // ranking: os cartões dos dois como estavam no começo (o motor ignora; os dois lados contam pelo mesmo cfg)
    ...((r) => (r ? { rank: r } : {}))(rating.rankForGame(rating.myCard(settings.names[0]), rating.latestCard(guest.rk))),
  } as GameConfig);
  seq = 0;
  owners = [];
  undoReq = null;
  seat = 0;
  view = 0;
  selected = [];
  preview = null;
  zoom = null;
  newKeepers();
  sendGuestFull('start');
  if (net.watcherCount) sendWatchFull(null);
  save();
  render();
}
function backToLobby() {
  game = null;
  seq = 0;
  owners = [];
  guestView = watchView = null;
  net?.send({ t: 'lobby' });
  save();
  render();
}
function onNetMsg(m: Msg | { t: '__open' }) {
  // quem mandou é guardado agora (a fila abaixo pode demorar e a próxima mensagem troca o remetente)
  const from = net?.lastFrom ?? '';
  inQ = inQ.then(() => handleNet(m, from)).catch(() => {});
}
async function handleNet(m: Msg | { t: '__open' }, from: string) {
  if (!net) return;
  const t = (m as any).t as string;
  // batimento do anfitrião: o convidado confere se não perdeu nenhuma jogada (sem redesenhar a tela)
  if (m.t === 'sync') {
    if (net.role !== 'host' && (!game || m.seq > seq)) net.send({ t: 'need' });
    return;
  }
  // a resposta à minha jogada chegou: limpa a seleção (como no anfitrião)
  const mineDone = net.role === 'guest' && !!pendingReq && (m.t === 'view' || m.t === 'state' || m.t === 'start');
  if (net.role === 'guest' && (m.t === 'view' || m.t === 'state' || m.t === 'start' || m.t === 'deny')) pendingReq = null;
  if (m.t === 'chat') {
    // chat: o anfitrião confere e repassa para a sala toda (espectadores só leem)
    const c: ChatLine = {
      id: cleanText(m.id, 12) || Math.random().toString(36).slice(2, 10),
      by: net.role === 'host' ? 1 : m.by === 1 ? 1 : 0,
      name: net.role === 'host' ? game?.engine.pl[1].name || guest?.name || 'Amigo' : cleanText(m.name, 20) || 'Jogador',
      text: cleanText(m.text, 60),
      at: Date.now(),
    };
    const fresh = pushChat(c);
    if (fresh && net.role === 'host') net.send({ t: 'chat', id: c.id, by: c.by, name: c.name, text: c.text });
    if (fresh && c.by !== seat) sfx(emoteOf(c.text) ? 'buff' : 'draw');
    render();
    return;
  }
  if (net.role === 'host') {
    if (m.t === 'undoans') {
      if (undoReq && undoReq.by === 0 && m.seq === undoReq.seq) resolveUndo(!!m.ok);
      save();
      render();
      return;
    }
    if (m.t === 'watch' || (m.t === 'need' && !net.isOther(from))) {
      // espectador entrou (ou se perdeu): recebe a visão de espectador (as jogadas seguintes chegam para a sala toda)
      if (m.t === 'watch' && (m.v ?? 0) !== PROTOCOL) net.sendTo({ t: 'deny', msg: 'Versões diferentes do Riftbound Mesa: atualize a página.' }, from);
      else if (game) sendWatchFull(from);
      render();
      return;
    }
    if (m.t === 'hello') {
      if ((m.v ?? 0) !== PROTOCOL) {
        net.send({ t: 'deny', msg: 'Vocês estão com versões diferentes do Riftbound Mesa: atualizem a página.' });
        return;
      }
      guest = { name: (m.name || 'Amigo').slice(0, 20), deck: m.deck && typeof m.deck === 'object' ? m.deck : DECKS[0], rk: rating.cleanCard(m.rk) };
      guestId = from;
      rating.sawFriend(guest.rk ?? null);
      // canal cifrado: chave combinada com a chave pública que veio no hello (antes de mandar a visão)
      const pk = typeof m.pk === 'string' ? m.pk : undefined;
      queueOut(async () => {
        guestPk = pk;
        await keysReady;
        peerKey = myKeys ? await sharedKey(myKeys.priv, pk) : null;
        net?.send({ t: 'welcome', hostName: settings.names[0], hostDeck: myDeck().name, pk: myKeys?.pub, rk: rating.myCard(settings.names[0]) });
      });
      if (game) sendGuestFull('start');
    } else if (m.t === 'req') {
      if (!game) return;
      let op: Op;
      try {
        op = unaliasOp(await unpack(String(m.z), peerKey));
      } catch {
        sendGuestFull('state');
        return;
      }
      // "undo" do convidado nunca traz o ponto de volta (só o pedido aceito, aqui no anfitrião)
      if (op?.k === 'undo') op = { k: 'undo' };
      if (m.seq !== seq) sendGuestFull('state');
      else applyOp(op, 1);
    } else if (m.t === 'need' && game) sendGuestFull('state');
  } else {
    if (t === '__open') {
      await keysReady;
      net?.send(net.role === 'watch' ? { t: 'watch', name: settings.names[0], v: PROTOCOL } : helloMsg());
      return;
    } else if (m.t === '__open') return;
    else if (m.t === 'welcome') {
      hostInfo = { name: m.hostName, deck: m.hostDeck, rk: rating.cleanCard(m.rk) };
      rating.sawFriend(hostInfo.rk ?? null);
      peerKey = myKeys ? await sharedKey(myKeys.priv, m.pk) : null;
    } else if (m.t === 'start' || m.t === 'state' || m.t === 'wstate') {
      try {
        const v: ViewState = await unpack(m.z, m.t === 'wstate' ? null : peerKey);
        game = new ViewGame(v) as unknown as Game;
        seq = m.seq;
        if (m.t === 'start' && net.role === 'guest') {
          undoAsk = null;
          seat = m.you;
          selected = [];
          preview = null;
          zoom = null;
          remoteSteps = null;
        }
      } catch {
        net.send({ t: 'need' });
      }
    } else if (m.t === 'view' || m.t === 'wview') {
      const vg = viewGame();
      if (!vg || m.base !== seq) {
        net.send({ t: 'need' });
        return;
      }
      try {
        const n0 = vg.answers.length;
        const df: ViewDiff = await unpack(m.z, m.t === 'wview' ? null : peerKey);
        if (!vg.apply(df)) throw new Error('visão fora de ordem');
        if (vg.answers.length < n0) netNote = ''; // desfazer aplicado: o aviso do pedido some
      } catch {
        net.send({ t: 'need' });
        return;
      }
      seq = m.seq;
      undoAsk = null;
    } else if (m.t === 'deny') {
      netNote = cleanText(m.msg, 160);
      remoteSteps = null;
    } else if (m.t === 'undoask') {
      if (net.role === 'guest') undoAsk = { seq: m.seq };
    } else if (m.t === 'lobby') {
      game = null;
      seq = 0;
      remoteSteps = null;
    }
  }
  if (mineDone) {
    selected = [];
    flashOpt = null;
    zoom = null;
  }
  view = seat;
  ctxMenu = null;
  if (m.t === 'deny' || m.t === 'state' || m.t === 'start') pendingDrop = null;
  save();
  render();
  // jogada em sequência do convidado: a próxima pergunta chegou, segue respondendo
  if (net?.role === 'guest' && remoteSteps && (m.t === 'view' || m.t === 'state' || m.t === 'start')) runRemoteSteps();
}
/** Uma jogada minha: online vai para o anfitrião; local aplica direto. Devolve true se foi tratada aqui. */
function onlineAct(op: Op): boolean {
  if (!net) return false;
  netNote = '';
  if (net.role === 'host') applyOp(op, seat);
  else if (net.role === 'guest') {
    sendReq(op, seq);
    pendingReq = { op, seq, at: Date.now() };
  }
  if (op.k !== 'answer' || net.role === 'host') {
    selected = [];
    flashOpt = null;
    zoom = null;
  }
  save();
  render();
  return true;
}

/** Depois de a IA jogar/resolver algo, a próxima jogada dela espera mais, para dar tempo de ver o que aconteceu. */
let aiSlow = false;
/** A IA está pensando (decisão em fatias, ver AiPlayer.decideAsync). */
let aiThinking = false;
function scheduleAi() {
  if (!game || replay || !isAiTurn() || aiTimer || aiThinking || challengeHold(game)) return;
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (!game || !isAiTurn()) return;
    if (!ai) ai = newAi();
    const g = game;
    const n0 = g.engine.log.length;
    const at = g.answers.length;
    const who = ai;
    // a IA pensa em fatias (a mesa continua respondendo); se a partida mudou no meio (desfazer, sair), descarta
    const stale = () => game !== g || g.answers.length !== at || ai !== who || !!replay;
    aiThinking = true;
    const think = tut.isTut(g) ? Promise.resolve(tut.oppAnswer(g)) : who.decideAsync(g, stale);
    void think.then((ans) => {
      aiThinking = false;
      if (!ans || stale()) return scheduleAi();
      if (!g.answer(ans)) {
        const cur = g.current!;
        if (!g.answer(quickPick(cur, g.engine))) g.answer([g.current!.options[0].id]);
      }
      aiSlow = g.engine.log.length >= n0 && g.engine.log.slice(n0).some((l) => l.meta);
      selected = [];
      afterChange();
    });
  }, aiSlow ? 1100 : 520);
}

let settings: Settings = { ...DEFAULTS };
let game: Game | null = null;
let view: P = 0; // perspectiva (quem está embaixo)
let handoffPending = false;
let selected: string[] = [];
let preview: string | null = null;
let modal: { title: string; html: string } | null = null;
let flashOpt: string | null = null;
let zoom: string | null = null;
/** Tela fora da partida: mesa (configuração), decks, desafios, a escada contra a IA (src/ui/ladder.ts), o torneio
 *  entre amigos (src/ui/tournamentscreen.ts), o ranking ou o perfil (src/ui/profile.ts). */
let page: 'setup' | 'decks' | 'challenges' | 'ladder' | 'tour' | 'ranking' | 'profile' = 'setup';
let logOpen = true;
/** Unidades escolhidas para mover (clique direto na unidade pronta), válidas enquanto a decisão raiz não muda. */
let moveSel: string[] = [];
let moveKey = '';
/** Menu de ações ancorado na carta (carta com mais de uma ação). */
let ctxMenu: { obj: string; x: number; y: number } | null = null;
/** Lugar onde a carta foi solta, ainda sem decisão que o use (ex.: o custo opcional veio antes do local). */
let pendingDrop: { drop: Drop; answers: unknown; root: number | null } | null = null;
/** O lugar guardado só vale dentro da mesma ação (a partida não foi refeita nem passou de decisão raiz). */
function livePending(): Drop | null {
  if (!pendingDrop || !game || pendingDrop.answers !== game.answers || pendingDrop.root !== game.lastRoot || game.current?.root) {
    pendingDrop = null;
    return null;
  }
  return pendingDrop.drop;
}
const keepDrop = (drop: Drop) => {
  pendingDrop = game ? { drop, answers: game.answers, root: game.lastRoot } : null;
};
/** Lista completa das opções da decisão (aberta pelo botão "Opções"). */
let showAllOpts = false;
/** Carta escolhida para jogar/ativar, esperando a confirmação (clique de novo, botão ou alvo aceso). `opt` = a ação
 *  escolhida (null: a carta tem mais de uma ação e o jogador ainda não escolheu). Vale só na decisão raiz em que nasceu. */
let armed: { id: string; opt: string | null; key: string } | null = null;
/** O que vem depois de confirmar a ação armada (simulado numa cópia da partida): a próxima pergunta e o que acende. */
interface ArmNext {
  prompt: string;
  objs: Set<string>;
  locs: Map<string, Loc>;
  /** sem mais perguntas para o jogador depois de confirmar */
  none: boolean;
}
let armCache: { key: string; opt: string; info: ArmNext | null } | null = null;
/** Ordem escolhida para os efeitos simultâneos (de cima para baixo: a ordem em que resolvem). */
let trigOrder: { key: string; items: Option[] } | null = null;
/** Ordem confirmada: o que ainda vai para a pilha (na ordem de entrada), respondida sozinha a cada pergunta de ordem. */
let trigPlan: { items: { label: string; obj?: string }[]; player: P; base: number } | null = null;
/** Arrastando uma linha da lista de ordem. */
let trigDrag: { i: number } | null = null;
/** Partidas em que o "Pagar: manual" lembrado na conta já foi ligado sozinho (semente:lugar). */
const manualAuto = new Set<string>();
/** Aviso curto na barra (ex.: por que a carta clicada não pode ser jogada). */
let uiHint = '';
/** Coluna com o registro aberta (no celular em pé é uma gaveta). */
let sideOpen = false;
const PREFS = 'riftbound-mesa-ui';
const prefs0 = (() => {
  try {
    return JSON.parse(localStorage.getItem(PREFS) || '{}');
  } catch {
    return {};
  }
})();
let logNewestFirst = prefs0.logNewestFirst !== false;
/** Prévia do resultado (estilo Olho do Oráculo): o que acontece se todos passarem. */
let oracleOn = prefs0.oracle !== false;
function savePrefs() {
  try {
    localStorage.setItem(PREFS, JSON.stringify({ logNewestFirst, oracle: oracleOn }));
  } catch {
    /* sem armazenamento: segue */
  }
}

const $app = () => document.getElementById('app')!;
const STORE = 'riftbound-mesa-v1';

function save() {
  if (replay) return; // rever uma partida não mexe na partida salva
  if (tut.isTut(game)) return; // tutorial: o progresso fica na conta (tutorial.ts), a partida salva continua a mesma
  try {
    const on = net ? { role: net.role, code: net.code, seat, seq, owners, pub: net.pub, rname: net.roomName, tour: roomTour } : null;
    localStorage.setItem(STORE, JSON.stringify({ settings, saved: game ? game.serialize() : null, view, online: on }));
  } catch {
    /* armazenamento indisponível: segue sem salvar */
  }
}
interface SavedOnline {
  role: 'host' | 'guest' | 'watch';
  code: string;
  seat: P;
  seq: number;
  owners: P[];
  pub?: boolean;
  rname?: string;
  /** sala de um confronto do torneio */
  tour?: { tag: TourTag; deck: DeckList | null } | null;
}
function loadSaved(): { settings: Settings; saved: string | null; view: P; online?: SavedOnline | null } | null {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ───────────────────────────── início ─────────────────────────────
function newGame() {
  const decks = settings.decks.map((i) => acc.deckById(i)) as any;
  game = new Game({
    seed: (Math.random() * 2 ** 31) | 0,
    decks,
    // no passa-e-joga "Você" vira "Jogador 1" (as frases da mesa falam de cada jogador pelo nome)
    names: (settings.opponent === 'human' && settings.names[0] === 'Você' ? ['Jogador 1', settings.names[1]] : settings.names) as [string, string],
    battlefieldMode: settings.bfMode,
    autoPass: settings.autoPass,
    ...(vsAi() ? { aiLevel: settings.aiLevel } : {}), // o motor ignora; a IA e o replay leem
  } as GameConfig);
  selected = [];
  preview = null;
  view = vsAi() ? HUMAN : game.current?.player ?? 0;
  handoffPending = false;
  ai = vsAi() ? newAi() : null;
  save();
  render();
  scheduleAi();
}

function answer(ids: string[]) {
  if (!game) return;
  ctxMenu = null;
  uiHint = '';
  const drop = livePending();
  // o jogador respondeu à mão a própria pergunta de alvo/local: o lugar guardado não vale mais
  if (drop && game.current && matchDrop(game.engine, game.current, drop)) pendingDrop = null;
  else if (drop) {
    // a carta foi solta num lugar e a pergunta que usa esse lugar vem depois desta: segue sozinha até lá
    exec([
      () => ids,
      (d, eng) => {
        const id = matchDrop(eng, d, drop);
        if (!id) {
          if (!d.root) keepDrop(drop);
          return null;
        }
        if (d.max > 1 || d.min === 0) {
          selected = [id];
          return null;
        }
        return [id];
      },
    ]);
    return;
  }
  showAllOpts = false;
  if (onlineAct({ k: 'answer', ids })) return;
  const ok = game.answer(ids);
  selected = [];
  flashOpt = null;
  zoom = null;
  afterChange(ok);
}

// ───────────────────────────── jogadas em sequência ─────────────────────────────
// Mover com um clique, arrastar da mão para um campo, soltar um spell num alvo: a interface responde várias
// decisões do motor seguidas (as mesmas que o jogador responderia), parando na primeira que não sabe responder.
type Step = (d: Decision, eng: Engine) => string[] | null;
const decKey = () => (game ? String(game.answers.length) : '');

function runSteps(g: Game, steps: Step[], who: P): { list: string[][]; error: string | null } {
  const list: string[][] = [];
  for (const st of steps) {
    const d = g.current;
    if (!d || d.player !== who) break;
    const ids = st(d, g.engine);
    if (!ids) break;
    if (!g.answer(ids)) return { list, error: g.error || 'Jogada inválida.' };
    list.push(ids);
  }
  return { list, error: null };
}

function exec(steps: Step[]) {
  if (!game?.current || isOtherTurn() || handoffPending) return;
  const who = game.current.player;
  moveSel = [];
  ctxMenu = null;
  zoom = null;
  flashOpt = null;
  pendingDrop = null;
  if (net && net.role !== 'host') {
    // convidado: não tem a partida para simular; responde um passo, espera a pergunta seguinte do anfitrião e segue
    remoteSteps = { steps: [...steps], who };
    runRemoteSteps();
    return;
  }
  if (net) {
    // anfitrião: simula numa cópia para saber as respostas e manda tudo junto (aplica na ordem)
    const sim = Game.load(game.serialize());
    const r = runSteps(sim, steps, who);
    if (r.error) {
      netNote = r.error;
      pendingDrop = null;
      render();
      return;
    }
    if (r.list.length) onlineAct({ k: 'batch', list: r.list });
    else render();
    return;
  }
  const r = runSteps(game, steps, who);
  if (r.error) pendingDrop = null;
  selected = selected.filter((id) => game!.current?.options.some((o) => o.id === id));
  afterChange();
}

/** Convidado online: passos de uma jogada em sequência esperando a próxima pergunta do anfitrião. */
let remoteSteps: { steps: Step[]; who: P } | null = null;
function runRemoteSteps() {
  const q = remoteSteps;
  if (!q || !game || pendingReq) return;
  const d = game.current;
  const st = q.steps.shift();
  if (!st || !d || d.player !== q.who) {
    remoteSteps = null;
    render();
    return;
  }
  const ids = st(d, game.engine);
  if (!ids || !q.steps.length) remoteSteps = null;
  if (!ids) {
    render();
    return;
  }
  onlineAct({ k: 'answer', ids });
}

/** Mover estas unidades para `to` (a ação "Mover unidades" do motor, respondida inteira). O motor pula as perguntas
 * com uma opção só (uma unidade pronta, um destino), então cada passo depois do primeiro aceita qualquer das duas. */
function moveTo(ids: string[], to: Loc) {
  const flex: Step = (d, eng) => {
    if (d.root) return null;
    if (d.options.length && ids.every((id) => d.options.some((o) => o.id === id)) && d.max >= ids.length) return ids;
    const id = matchDrop(eng, d, { loc: to });
    return id ? [id] : null;
  };
  exec([(d) => (d.root && d.options.some((o) => o.id === 'move') ? ['move'] : null), flex, flex]);
}

/** Responde a opção `optId` e usa o lugar onde a carta foi solta na decisão seguinte (local, alvo, unidade...). */
function playDrop(optId: string, drop: Drop) {
  pendingDrop = null;
  exec([
    () => [optId],
    (d, eng) => {
      if (d.root) return null; // a jogada já acabou: o lugar solto não escolhe mais nada
      const id = matchDrop(eng, d, drop);
      if (!id) {
        keepDrop(drop);
        return null;
      }
      if (d.max > 1 || d.min === 0) {
        selected = [id];
        return null;
      }
      return [id];
    },
  ]);
}

// ───────────────────────────── confirmar antes de jogar ─────────────────────────────
// Clicar numa carta jogável só a escolhe: o painel mostra o custo, o texto, o que vem depois e acende os alvos/locais
// possíveis. Confirma com o segundo clique na carta, o botão, Enter ou um clique direto num alvo aceso; Esc ou clique
// fora cancela. Arrastar para um destino continua jogando direto (já é intenção clara).
const ROOT_ACT = /^(play|hide|act|actb|acte|equip):/;
/** Ações da decisão raiz ligadas a esta carta (jogar, esconder, ativar, equipar). */
function rootActs(id: string): Option[] {
  const d = game?.current;
  if (!d?.root) return [];
  return optionsFor(id).filter((o) => ROOT_ACT.test(o.id)) as Option[];
}
function armVerb(opt: string): string {
  return opt.startsWith('play:') ? 'Jogar' : opt.startsWith('hide:') ? 'Esconder' : opt.startsWith('equip:') ? 'Equipar' : 'Ativar';
}
function arm(id: string, opt: string | null) {
  armed = { id, opt, key: decKey() };
  moveSel = [];
  ctxMenu = null;
  showAllOpts = false;
  uiHint = '';
  selected = [];
  render();
}
function armGo(opt: string, drop?: Drop) {
  armed = null;
  if (drop) playDrop(opt, drop);
  else answer([opt]);
}
/** Local de uma opção de pergunta de local (campo pela carta do campo, base pelo nome). */
function optLoc(e: Engine, o: Option): Loc | null {
  if (o.obj) {
    const i = e.bfs.findIndex((b) => b.objId === o.obj);
    if (i >= 0) return { t: 'bf', i };
  }
  for (const p of [0, 1] as P[]) if (o.label === `base de ${e.pl[p].name}`) return { t: 'base', p };
  const i = e.bfs.findIndex((b) => e.name(b.objId) === o.label);
  return i >= 0 ? { t: 'bf', i } : null;
}
/** Simula a ação numa cópia da partida e devolve a pergunta seguinte (alvos/locais para acender). Não muda a partida. */
function armNext(opt: string): ArmNext | null {
  if (!game?.current) return null;
  const key = `${game.cfg.seed}:${decKey()}`;
  if (armCache && armCache.key === key && armCache.opt === opt) return armCache.info;
  let info: ArmNext | null = null;
  try {
    const sim = Game.load(game.serialize());
    const who = sim.current!.player;
    if (sim.answer([opt])) {
      const d = sim.current;
      const e = sim.engine;
      if (!d || d.root || d.player !== who) info = { prompt: '', objs: new Set(), locs: new Map(), none: true };
      else {
        const objs = new Set<string>();
        const locs = new Map<string, Loc>();
        if (d.purpose)
          for (const o of d.options) {
            const l = d.purpose === 'location' ? optLoc(e, o) : null;
            if (l) locs.set(locKey(l), l);
            else if (o.obj) objs.add(o.obj);
          }
        info = { prompt: d.prompt, objs, locs, none: false };
      }
    }
  } catch {
    info = null;
  }
  armCache = { key, opt, info };
  return info;
}

// ───────────────────────────── ordem dos efeitos simultâneos ─────────────────────────────
const isTrigQ = (d: Decision) => !d.root && /^Vários efeitos/.test(d.prompt);
/** Rótulo sem a numeração dos iguais ("(2º)"), que muda quando um deles sai da lista. */
const normTrig = (label: string) => label.replace(/ \((?:por (.+?); )?\d+º\)$/, (_m, by: string | undefined) => (by ? ` (por ${by})` : ''));
function trigStep(d: Decision): string[] | null {
  const pl = trigPlan;
  if (!pl || d.player !== pl.player || !isTrigQ(d)) return null;
  const next = pl.items[0];
  const o = next && d.options.find((x) => normTrig(x.label) === next.label && x.obj === next.obj);
  if (!o) {
    trigPlan = null;
    return null;
  }
  pl.items.shift();
  if (!pl.items.length) trigPlan = null;
  return [o.id];
}
function runTrigPlan() {
  const n = trigPlan?.items.length || 0;
  exec(Array.from({ length: n }, () => (d: Decision) => trigStep(d)));
}
/** A pergunta de ordem atual é parte da ordem já confirmada (todas as opções estão no plano)? */
function trigPlanFits(d: Decision): boolean {
  if (!trigPlan || !game || game.answers.length < trigPlan.base || d.player !== trigPlan.player || !isTrigQ(d)) return false;
  const pool = [...trigPlan.items];
  return d.options.every((o) => {
    const k = pool.findIndex((x) => x.label === normTrig(o.label) && x.obj === o.obj);
    if (k < 0) return false;
    pool.splice(k, 1);
    return true;
  });
}

/** O lugar de quem usa este aparelho (para a preferência da conta): contra a IA e online o seu; no passa-e-joga o 1. */
function mySeat(): P | null {
  if (replay) return null;
  if (online()) return watching() ? null : seat;
  return vsAi() ? HUMAN : 0;
}
/** Respostas automáticas depois de desenhar: continuar a ordem de efeitos confirmada; ligar o pagamento manual lembrado. */
let autoQueued = false;
function queueAuto() {
  if (autoQueued) return;
  autoQueued = true;
  setTimeout(() => {
    autoQueued = false;
    autoAnswers();
  }, 0);
}
function autoAnswers() {
  if (!game?.current || replay || !myDecision() || pendingReq || drag) return;
  const d = game.current;
  const eng = game.engine;
  if (trigPlan && game.answers.length < trigPlan.base) trigPlan = null;
  if (trigPlan && isTrigQ(d)) {
    if (trigPlanFits(d)) runTrigPlan();
    else {
      trigPlan = null;
      render();
    }
    return;
  }
  const me = mySeat();
  if (me !== null && d.player === me && d.root && acc.manualPayPref() && !eng.pl[me].manualPay && d.options.some((o) => o.id === MANUAL_PAY)) {
    const k = `${game.cfg.seed}:${me}`;
    if (!manualAuto.has(k)) {
      manualAuto.add(k);
      answer([MANUAL_PAY]);
    }
  }
}

function afterChange(_ok = true) {
  if (!game) return;
  ctxMenu = null;
  if (online()) {
    view = seat;
    save();
    render();
    return;
  }
  if (vsAi()) {
    view = HUMAN;
    handoffPending = false;
    save();
    render();
    scheduleAi();
    return;
  }
  const d = game.current;
  if (d && d.player !== view) {
    if (settings.privacy) handoffPending = true;
    else view = d.player;
  }
  save();
  render();
}

// ───────────────────────────── componentes ─────────────────────────────
function costHtml(code: string, eng?: Engine, o?: Obj): string {
  const d = cardData(code);
  const k = kindOf(code);
  if (k === 'legend' || k === 'battlefield' || k === 'rune') return '';
  let energy = d.energy;
  if (eng && o) energy = Math.max(0, energy + eng.energyDiscount(o, o.controller));
  const doms = d.domains as Domain[];
  const pips = Array.from({ length: d.power }, (_, i) => {
    const dm = doms[i % Math.max(1, doms.length)];
    return `<i class="pip" style="--c:${dm ? DOMAIN_COLOR[dm] : 'var(--muted)'}" title="1 power de ${dm ? DOMAIN_PT[dm] : 'qualquer domínio'}"></i>`;
  }).join('');
  const changed = energy !== d.energy ? ' mod' : '';
  return `<span class="cost"><b class="en${changed}" title="Custo de energia">${energy}</b>${pips}</span>`;
}

function kwChips(eng: Engine, o: Obj): string {
  const k = eng.kw(o);
  const out: string[] = [];
  const add = (cond: any, label: string) => cond && out.push(`<span class="chip">${label}</span>`);
  add(k.tank, 'Tank');
  add(k.shield, `Shield ${k.shield}`);
  add(k.assault, `Assault ${k.assault}`);
  add(k.deflect, `Deflect${k.deflect! > 1 ? ' ' + k.deflect : ''}`);
  add(k.ganking, 'Ganking');
  add(k.backline, 'Backline');
  add(k.temporary, 'Temporary');
  add(k.hunt, `Hunt ${k.hunt}`);
  add(k.ambush, 'Ambush');
  add(k.accelerate && o.zone !== 'board', 'Accelerate');
  add(k.hidden && o.zone !== 'board', 'Hidden');
  add(k.action, 'Action');
  add(k.reaction, 'Reaction');
  return out.join('');
}

/**
 * Palavras-chave de combate da unidade na mesa, legíveis sobre a arte (o texto impresso fica pequeno demais na mesa).
 * As ganhas em jogo (diferentes das impressas) ficam douradas.
 */
function boardKw(eng: Engine, o: Obj): string {
  const k = eng.kw(o) as any;
  const base = eng.baseKeywords(o) as any;
  const names: [string, string][] = [
    ['tank', 'Tank'], ['shield', 'Shield'], ['assault', 'Assault'], ['deflect', 'Deflect'], ['ganking', 'Ganking'],
    ['backline', 'Backline'], ['temporary', 'Temp'], ['hunt', 'Hunt'],
  ];
  return names
    .filter(([key]) => k[key])
    .map(([key, label]) => {
      const gain = k[key] !== base[key];
      // número junto (Shield 2, Assault 3); Deflect 1 é só "Deflect"
      const n = typeof k[key] === 'number' && !(key === 'deflect' && k[key] === 1) ? ' ' + k[key] : '';
      return `<span class="chip${gain ? ' gain' : ''}"${gain ? ' title="Ganho em jogo"' : ''}>${label}${n}</span>`;
    })
    .join('');
}

function optionsFor(objId: string): { id: string; label: string }[] {
  const d = game?.current;
  if (!d || handoffPending || isOtherTurn()) return [];
  return d.options.filter((o) => o.obj === objId || o.id === objId);
}

function backHtml(mode: string, id?: string, title = 'Carta escondida'): string {
  return `<div class="card back ${mode}" ${id ? `data-obj="${id}"` : ''} title="${title}"><i class="sigil"></i></div>`;
}

function imgTag(code: string, cls = ''): string {
  const url = artUrl(code);
  return url ? `<img class="art ${cls}" src="${url}" alt="${esc(cardData(code).name)}" draggable="false" loading="lazy">` : '';
}

function cardHtml(eng: Engine, o: Obj, mode: 'hand' | 'board' | 'small' | 'thumb' = 'board', hidden = false): string {
  if (hidden) return backHtml(mode, o.id);
  const d = cardData(o.code);
  const k = o.zone === 'board' && eng.isUnit(o) ? 'unit' : kindOf(o.code); // novo: unit gear aparece como unidade
  const doms = (d.domains as Domain[]).map((x) => DOMAIN_COLOR[x]);
  const bar = doms.length ? doms.join(', ') : 'var(--line)';
  const opts = optionsFor(o.id);
  const sel = selected.includes(o.id) || opts.some((x) => selected.includes(x.id));
  const url = artUrl(o.code);
  const classes = ['card', mode, k, url ? 'has-art' : 'frame'];
  const onBoard = o.zone === 'board';
  // a lenda também gira quando exaure (ela fica na zona da lenda, não no tabuleiro)
  if (o.exhausted && (onBoard || o.zone === 'legend')) classes.push('exhausted');
  if (opts.length) classes.push('actionable');
  if (sel || moveSel.includes(o.id)) classes.push('selected');
  if (frame.movable.has(o.id)) classes.push('movable');
  if (frame.drag.has(o.id)) classes.push('dragok');
  const tg = frame.targeted.get(o.id);
  if (tg) classes.push('targeted', tg.includes(view) ? 'by-me' : 'by-them');
  if (frame.doomed.has(o.id)) classes.push('doomed');
  else if (frame.maybeDoomed.has(o.id)) classes.push('doomed', 'maybe');
  if (armed?.id === o.id) classes.push('armed');
  if (frame.armObjs.has(o.id)) classes.push('armtgt');
  // Empowered: brilho que fica enquanto a carta estiver Empowered (no tabuleiro ou a lenda)
  if (o.empowered && (onBoard || o.zone === 'legend')) classes.push('empowered');
  if (o.code === 'TOK-BOMB') classes.push('bomb');
  if (o.stunned) classes.push('stunned');
  if (o.token) classes.push('token');
  if (o.role) classes.push(o.role);
  if (!isImplemented(o.code) && !o.token && k !== 'rune') classes.push('noscript');

  // valores vivos sobre a arte
  let might = '';
  if (k === 'unit' && (onBoard || !url)) {
    const m = onBoard ? eng.might(o) : d.might;
    const delta = onBoard ? m - d.might : 0;
    might = `<span class="might${delta > 0 ? ' up' : delta < 0 ? ' down' : ''}" title="Might atual (impresso: ${d.might})">${m}</span>`;
  }
  const role = o.role === 'attacker' ? '<span class="role atk">Ataca</span>' : o.role === 'defender' ? '<span class="role def">Defende</span>' : '';
  const status: string[] = [];
  if (onBoard) {
    if (o.buffs) status.push(`<span class="st buff" title="Buff (+1 Might)">Buff</span>`);
    if (o.stunned) status.push(`<span class="st stun" title="Atordoada: não causa dano de combate neste turno">Stun</span>`);
    if (o.empowered) status.push(`<span class="st emp">Empowered</span>`);
  }
  const gear =
    onBoard && k === 'unit'
      ? eng.attachedTo(o).map((g) => `<span class="st gear" data-obj="${g.id}" title="${esc(cardData(g.code).name)}">⚙ ${esc(cardData(g.code).name)}</span>`).join('')
      : '';
  const dmg = onBoard && o.damage ? `<span class="dmg" title="Dano marcado">${o.damage}</span>` : '';
  let costBadge = '';
  if (url && o.zone === 'hand') {
    const e2 = Math.max(0, d.energy + eng.energyDiscount(o, o.controller));
    if (e2 !== d.energy) costBadge = `<span class="costmod" title="Custo atual de energia">custa ${e2}</span>`;
  }
  const gained = onBoard && k === 'unit' ? boardKw(eng, o) : '';
  const om = frame.oracle?.might.get(o.id);
  const od = frame.oracle?.dmg.get(o.id);
  const pred = onBoard && (om !== undefined || od !== undefined) && !frame.doomed.has(o.id) && !frame.maybeDoomed.has(o.id) ? `<span class="tt-pred" title="Previsão se todos passarem">${om !== undefined ? `Might → ${om}` : ''}${od !== undefined ? `${om !== undefined ? ' · ' : ''}dano → ${od}` : ''}</span>` : '';
  const mark = tg ? `<span class="tt-tmark" title="Alvo de um item da pilha">alvo</span>` : frame.doomed.has(o.id) ? '<span class="tt-skull" title="Previsão: morre neste combate">☠</span>' : '';
  const overlay = `${role}${dmg}${might}${costBadge}${mark}${pred}${status.length || gear || gained ? `<div class="sts">${gained}${status.join('')}${gear}</div>` : ''}`;
  const body = url
    ? `<img class="art" src="${url}" alt="${esc(d.name)}" draggable="false">`
    : `<div class="ch">${costHtml(o.code, eng, o)}</div>
      <div class="cn">${esc(d.name)}</div>
      <div class="ct">${esc(d.type)}${d.tags.length ? ' · ' + esc(d.tags.slice(0, 2).join(' · ')) : ''}</div>
      <div class="kws">${kwChips(eng, o)}</div>
      ${mode === 'hand' ? `<div class="tx">${rulesHtml(d.text)}</div>` : ''}`;
  return `<div class="${classes.join(' ')}" data-obj="${o.id}" style="--bar:linear-gradient(90deg, ${bar})" tabindex="0" title="${esc(d.name)}">${body}${overlay}</div>`;
}

function runesHtml(eng: Engine, p: P): string {
  const rs = eng.runesOf(p);
  const s = eng.pl[p];
  const ready = rs.filter((r) => !r.exhausted).length;
  const runes = rs
    .sort((a, b) => cardData(a.code).domains[0].localeCompare(cardData(b.code).domains[0]))
    .map((r) => {
      const dm = cardData(r.code).domains[0] as Domain;
      const url = artUrl(r.code);
      const opts = optionsFor(r.id).length ? ' actionable' : '';
      return `<span class="rune${r.exhausted ? ' ex' : ''}${opts}" data-obj="${r.id}" style="--c:${DOMAIN_COLOR[dm]}" title="Runa de ${DOMAIN_PT[dm]}${r.exhausted ? ' (exaurida)' : ''}">${url ? `<img src="${url}" alt="" draggable="false">` : ''}</span>`;
    })
    .join('');
  const pw = Object.entries(s.pool.power).filter(([, n]) => n);
  const pool =
    s.pool.energy || pw.length
      ? `<span class="pool" title="Recursos sobrando neste momento">${s.pool.energy ? `${s.pool.energy} energia` : ''}${pw.map(([dm, n]) => ` <i class="pip" style="--c:${DOMAIN_COLOR[dm as Domain]}"></i>×${n}`).join('')}</span>`
      : '';
  return `<div class="runes" title="Runas: exaurir dá 1 de energia; reciclar dá 1 power do domínio">
    <div class="rrow">${runes || '<span class="muted">sem runas</span>'}</div>
    <div class="rc"><b>${ready}</b>/${rs.length} prontas · ${s.runeDeck.length} no deck de runas ${pool}</div></div>`;
}

function pointsHtml(eng: Engine, p: P): string {
  const n = eng.pl[p].points;
  const vs = eng.cfg.victoryScore;
  const pips = Array.from({ length: vs }, (_, i) => {
    const last = i === vs - 1;
    return `<i class="pt${i < n ? ' on' : ''}${last ? ' final' : ''}" ${last ? 'title="Último ponto: vem de hold, de efeito de carta, ou de uma conquista no turno em que você pontuou todos os campos"' : ''}>${i + 1}</i>`;
  }).join('');
  return `<div class="points" title="${n} de ${vs} pontos"><span class="pn">${n}</span><span class="track">${pips}</span></div>`;
}


// ── nomes de carta clicáveis no registro ──
let nameCache: { eng: Engine; n: number; re: RegExp | null; map: Map<string, string> } | null = null;
function nameIndex(eng: Engine) {
  const n = Object.keys(eng.objs).length;
  if (nameCache && nameCache.eng === eng && nameCache.n === n) return nameCache;
  const map = new Map<string, string>();
  for (const o of Object.values(eng.objs)) {
    const nm = cardData(o.code).name;
    if (nm.length >= 3 && !map.has(nm)) map.set(nm, o.code);
  }
  const names = [...map.keys()].sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = names.length ? new RegExp(`(?<![\\w'])(?:${names.join('|')})(?![\\w])`, 'g') : null;
  nameCache = { eng, n, re, map };
  return nameCache;
}
/** O objeto em jogo que melhor representa a carta citada (visível para quem está olhando), ou ''. */
function refObj(eng: Engine, code: string): string {
  const objs = Object.values(eng.objs).filter((o) => o.code === code && !isHiddenFromView(eng, o));
  const rank = (z: string) => ['board', 'chain', 'facedown', 'legend', 'champion', 'trash', 'hand', 'banish'].indexOf(z);
  const best = objs.filter((o) => rank(o.zone) >= 0).sort((a, b) => rank(a.zone) - rank(b.zone))[0];
  return best ? best.id : '';
}
/** Texto do registro mais legível (só na tela): plural certo e sem "0 de energia". */
function prettyLog(t: string): string {
  return t
    .replace(/\b(\d+) (ponto|runa)\(s\)/g, (_m, n: string, w: string) => `${n} ${w}${n === '1' ? '' : 's'}`)
    .replace(/paga 0 de energia \+ (\d+) power/g, 'paga $1 power')
    .replace(/\b0 \+ \[/g, '[');
}
/** Texto do registro com os nomes de carta virando botões. */
function linkCards(eng: Engine, text: string): string {
  text = prettyLog(text);
  const { re, map } = nameIndex(eng);
  if (!re) return esc(text);
  let out = '';
  let last = 0;
  for (const mt of text.matchAll(re)) {
    const code = map.get(mt[0])!;
    out += esc(text.slice(last, mt.index));
    out += `<button type="button" class="cref" data-code="${code}" data-ref="${refObj(eng, code)}">${esc(mt[0])}</button>`;
    last = mt.index! + mt[0].length;
  }
  return out + esc(text.slice(last));
}
/** Objeto de mentira para mostrar uma carta só pelo código (sem estado de jogo). */
function codeObj(code: string): Obj {
  return { id: 'code:' + code, code, owner: 0, controller: 0, zone: 'banish', exhausted: false, damage: 0, buffs: 0, stunned: false, empowered: false, token: false, prevent: 0, zoneVersion: 0 } as any;
}
function objOrCode(eng: Engine, id: string | null): Obj | null {
  if (!id) return null;
  if (id.startsWith('code:')) return codeObj(id.slice(5));
  return eng.objs[id] ?? null;
}


function isHiddenFromView(eng: Engine, o: Obj): boolean {
  // carta virada do oponente fica visível para quem tem permissão de olhar neste turno (Scuttle Crab: 'seeFacedown')
  if (watching() && (o.zone === 'hand' || o.zone === 'facedown')) return true; // quem assiste não vê nenhuma mão
  if (o.zone === 'facedown' && eng.playerFlag(view, 'seeFacedown')) return false;
  return hideOpp() && o.controller !== view && ((o.zone === 'hand' && o.owner !== view) || o.zone === 'facedown');
}

/** Corpo do detalhe de uma carta: arte grande, estado em jogo e texto atualizado. */
function cardDetail(eng: Engine, o: Obj): string {
  const d = cardData(o.code);
  const k = o.zone === 'board' && eng.isUnit(o) ? 'unit' : kindOf(o.code); // novo: unit gear
  const url = artUrl(o.code);
  const eff = d.effectText ? `<p class="eff"><b>Quando equipado:</b> ${rulesHtml(d.effectText)}</p>` : '';
  const sc = (eng.script(o) as any)?.notes;
  const live: string[] = [];
  if (k === 'unit' && o.zone === 'board') {
    live.push(`Might atual <b>${eng.might(o)}</b> (impresso ${d.might})`);
    if (o.damage) live.push(`<b class="bad">${o.damage}</b> de dano`);
    if (o.exhausted) live.push('exausta');
    if (o.stunned) live.push('atordoada');
    const kw = kwChips(eng, o);
    if (kw) live.push(`<span class="kws">${kw}</span>`);
  }
  return `<div class="detail${url && k === 'battlefield' ? ' wide' : ''}">
    ${url ? `<img class="big" src="${url}" alt="${esc(d.name)}" draggable="false">` : ''}
    <div class="dtext">
      <div class="ph">${costHtml(o.code)}<h3>${esc(d.name)}</h3></div>
      <p class="ptype">${esc(d.type)} · ${(d.domains as Domain[]).map((x) => DOMAIN_PT[x]).join('/') || 'sem domínio'}${d.might ? ` · Might ${d.might}` : ''}</p>
      ${live.length ? `<p class="live">${live.join(' · ')}</p>` : ''}
      <p class="ptx">${rulesHtml(d.text) || '<span class="muted">sem texto</span>'}</p>${eff}
      ${d.errata ? '<p class="note">Texto com a errata oficial mais recente (pode diferir do impresso na arte).</p>' : ''}
      ${sc ? `<p class="note">Simplificação: ${esc(sc)}</p>` : ''}
      ${!isImplemented(o.code) && !o.token && k !== 'rune' && k !== 'battlefield' ? '<p class="note warn">Esta carta ainda não tem efeito programado.</p>' : ''}
      ${(() => {
        const w = whyNot(eng, o);
        return w ? `<p class="tt-why">${w}</p>` : '';
      })()}
      ${keywordHelpHtml(eng, o)}
      <p class="code">${esc(o.code)}${d.set ? ' · ' + esc(d.set) : ''}</p>
    </div></div>`;
}

/** No celular: tocar numa carta abre o zoom com as ações dela. */
function zoomHtml(eng: Engine): string {
  const o = objOrCode(eng, zoom);
  if (!o) return '';
  if (!o.id.startsWith('code:') && isHiddenFromView(eng, o)) return '';
  const opts = o.id.startsWith('code:') ? [] : optionsFor(o.id);
  const btns = opts.map((x) => `<button class="opt" data-opt="${esc(x.id)}"><span>${esc(x.label)}</span></button>`).join('');
  return `<div class="modal zoom" data-act="closezoom"><div class="mbox" role="dialog" aria-label="${esc(cardData(o.code).name)}">
    ${cardDetail(eng, o)}
    <div class="zfoot">${btns ? `<div class="opts">${btns}</div>` : ''}
    <div class="btns"><button data-act="closezoom">Fechar</button></div></div></div></div>`;
}

function netChip(): string {
  if (!net) return '';
  const st = net.status;
  const label = st === 'conectado' ? 'conectado' : st === 'esperando' ? (net.role === 'host' ? 'amigo desconectado' : 'esperando') : st === 'reconectando' ? 'reconectando…' : st === 'abrindo' ? 'abrindo sala…' : 'sem conexão';
  return `<span class="netchip ${st}" title="${esc(net.error || '')}">Sala ${esc(net.code)} · ${label}</span>`;
}

// ── mesa online: chat, pedido de desfazer, aviso de conexão ──
function chatBubblesHtml(): string {
  const now = Date.now();
  const last = new Map<P, ChatLine>();
  for (const c of chatLog) if (now - c.at < BUBBLE_MS) last.set(c.by, c);
  return [...last.values()]
    .map((c) => {
      const em = emoteOf(c.text);
      const body = em ? `<i class="tt-emoji">${em[0]}</i>${esc(em[1])}` : esc(c.text);
      return `<div class="tt-bubble ${c.by === view ? 'me' : 'them'}${em ? ' emote' : ''}" style="animation-delay:-${now - c.at}ms" aria-hidden="true"><b>${esc(c.name)}</b> ${body}</div>`;
    })
    .join('');
}
function chatPopHtml(): string {
  if (!chatOpen || watching()) return '';
  return `<div class="tt-chatpop" role="dialog" aria-label="Chat rápido">
    <div class="tt-chatq">${QUICK_CHAT.map((q) => `<button type="button" data-act="chatq" data-text="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="tt-chatrow"><input id="chatin" value="${esc(chatDraft)}" maxlength="60" placeholder="Mensagem curta" autocomplete="off"><button type="button" data-act="chatsend">Enviar</button></div>
  </div>`;
}
function emotePopHtml(): string {
  if (!emoteOpen || watching()) return '';
  return `<div class="tt-emotepop" role="dialog" aria-label="Emotes">${EMOTES.map(([e, t]) => `<button type="button" data-act="emote" data-text="${esc(`${e} ${t}`)}" title="${esc(t)}"><i class="tt-emoji">${e}</i><span>${esc(t)}</span></button>`).join('')}</div>`;
}
function chatLogHtml(): string {
  if (!online() || !chatLog.length) return '';
  return `<section class="tt-chatlog" aria-label="Chat"><div class="tt-chath">Chat</div>${chatLog
    .slice(-8)
    .map((c) => `<p class="${c.by === view ? 'me' : 'them'}"><b>${esc(c.name)}</b> ${esc(c.text)}</p>`)
    .join('')}</section>`;
}
function undoAskHtml(eng: Engine): string {
  const asking =
    net?.role === 'host'
      ? undoReq && undoReq.by !== seat && undoReq.seq === seq
        ? undoReq.by
        : null
      : net?.role === 'guest' && undoAsk && undoAsk.seq === seq
        ? ((1 - seat) as P)
        : null;
  if (asking === null) return '';
  return `<div class="tt-undoask" role="alertdialog" aria-label="Pedido de desfazer"><span><b>${esc(eng.pl[asking].name)}</b> pediu para desfazer a última jogada dele.</span><button type="button" class="primary" data-act="undoyes">Aceitar</button><button type="button" data-act="undono">Recusar</button></div>`;
}
function netWarnHtml(eng: Engine): string {
  if (!net || net.connected || eng.winner !== null) return '';
  const other = net.role === 'host' ? eng.pl[1].name : eng.pl[0].name;
  const text =
    net.role === 'host'
      ? `${esc(other)} caiu. A partida continua quando ele voltar (ao abrir a página de novo, ele volta sozinho).`
      : `Sem notícias de ${esc(other)}, o anfitrião. A partida continua quando ele voltar.`;
  return `<div class="tt-netwarn" role="status"><span class="dots"><i></i><i></i><i></i></span>${text}</div>`;
}

// ───────────────────────────── mesa (tapete) ─────────────────────────────
// A partida é desenhada como uma mesa de verdade: oponente em cima, você embaixo, os dois campos de batalha no meio,
// mão em leque, runas e pilhas de cartas, trilhas de pontos nas laterais. As regras continuam no motor: tudo que dá
// para clicar na mesa é uma opção da decisão atual, e a coluna da direita mostra a decisão, a pilha e o registro.
const PHASE_PT: Record<string, string> = {
  setup: 'preparação', awaken: 'despertar', beginning: 'início', channel: 'canalizar', draw: 'compra', main: 'fase principal', ending: 'final',
};
/** Opção "base de X" da decisão atual (destino de mover/jogar): a base daquele jogador vira clicável. */
function baseOpt(eng: Engine, p: P): string | null {
  const d = game?.current;
  if (!d || handoffPending || isOtherTurn()) return null;
  const lbl = `base de ${eng.pl[p].name}`;
  return d.options.find((x) => !x.obj && x.label === lbl)?.id ?? null;
}
const sigil = '<i class="sigil"></i>';

function pileHtml(label: string, n: number, cls: string, faceCode: string | null, attrs = ''): string {
  const url = faceCode ? artUrl(faceCode) : null;
  const face = url ? `<img src="${url}" alt="" draggable="false">` : n ? `<span class="tt-back">${sigil}</span>` : '';
  return `<div class="tt-pile ${cls}${n ? '' : ' empty'}" ${attrs} title="${esc(label)}: ${n}"><div class="tt-pilecard">${face}</div><b class="tt-count">${n}</b><span class="tt-pl">${esc(label)}</span></div>`;
}

function poolHtml(eng: Engine, p: P): string {
  const s = eng.pl[p];
  const pw = Object.entries(s.pool.power).filter(([, n]) => n);
  const npw = pw.reduce((a, [, n]) => a + n, 0);
  const pips = pw.map(([dm, n]) => `<i class="pip" style="--c:${DOMAIN_COLOR[dm as Domain] || 'var(--gold)'}"></i>${n > 1 ? `×${n}` : ''}`).join('');
  return `<div class="tt-pool" title="Recursos sobrando neste momento"><span>Energia <b>${s.pool.energy}</b></span><span>Power <b>${npw}</b>${pips}</span></div>`;
}

function runeRowHtml(eng: Engine, p: P): string {
  const rs = [...eng.runesOf(p)].sort((a, b) => cardData(a.code).domains[0].localeCompare(cardData(b.code).domains[0]));
  const ready = rs.filter((r) => !r.exhausted).length;
  const cards = rs
    .map((r) => {
      const dm = cardData(r.code).domains[0] as Domain;
      const url = artUrl(r.code);
      const act = optionsFor(r.id).length ? ' actionable' : '';
      return `<span class="tt-rune${r.exhausted ? ' ex' : ''}${act}" data-obj="${r.id}" style="--c:${DOMAIN_COLOR[dm]}" title="Runa de ${DOMAIN_PT[dm]}${r.exhausted ? ' (exaurida)' : ''}">${url ? `<img src="${url}" alt="" draggable="false">` : ''}</span>`;
    })
    .join('');
  return `<div class="tt-zone tt-runes"><div class="tt-zl">Runas <b>${ready}/${rs.length}</b></div><div class="tt-runerow">${cards || '<span class="tt-none">—</span>'}</div>${poolHtml(eng, p)}${manualPayBtn(eng, p)}</div>`;
}

/** Botão de ligar/desligar o pagamento manual (só nas runas de quem está jogando nesta tela; troca na sua decisão
 *  raiz, quando a opção do motor existe). Não sugere nada: só mostra o estado. */
function manualPayBtn(eng: Engine, p: P): string {
  if (!game || replay || watching() || p !== view) return '';
  const on = !!eng.pl[p].manualPay;
  const d = game.current;
  const can = myDecision() && !!d?.root && d.player === p && d.options.some((o) => o.id === MANUAL_PAY);
  const tip = `Pagamento manual ${on ? 'ligado: ao pagar, você escolhe quais runas exaurir e qual reciclar' : 'desligado: a mesa escolhe as runas (alternando as cores)'}${can ? '' : ' · dá para trocar quando for a sua vez de agir'}${p === mySeat() ? ' · fica lembrado na sua conta para as próximas partidas' : ''}`;
  return `<button class="tt-mpay${on ? ' on' : ''}" ${can ? `data-opt="${MANUAL_PAY}"` : 'disabled'} title="${tip}" aria-pressed="${on}">Pagar: ${on ? 'manual' : 'auto'}</button>`;
}

function heroHtml(eng: Engine, p: P): string {
  const s = eng.pl[p];
  const legend = eng.legendOf(p);
  const champ = s.champion ? eng.objs[s.champion] : null;
  return `<div class="tt-zone tt-hero">
    <div class="tt-slotcol"><div class="tt-zl">Lenda</div>${cardHtml(eng, legend, 'small')}<span class="tt-xp" title="Experiência">XP <b>${s.xp}</b></span></div>
    ${eng.legendsOf(p).slice(1).map((l) => `<div class="tt-slotcol"><div class="tt-zl">Lenda (Neeko)</div>${cardHtml(eng, l, 'small')}</div>`).join('')}
    <div class="tt-slotcol"><div class="tt-zl">Campeão</div>${champ ? cardHtml(eng, champ, 'small') : `<div class="tt-emptyslot">${eng.cfg.decks[p].champion ? 'em jogo' : 'vazio'}</div>`}</div>
  </div>`;
}

function baseZoneHtml(eng: Engine, p: P): string {
  const items = eng
    .board()
    .filter((o) => o.controller === p && o.loc?.t === 'base' && (eng.isUnit(o) || (eng.isGear(o) && !o.attachedTo)))
    .map((o) => cardHtml(eng, o, 'board'))
    .join('');
  const bo = baseOpt(eng, p);
  const dest = frame.dests.has(`base:${p}`);
  const armd = frame.armLocs.has(`base:${p}`) ? ' armdest' : '';
  return `<div class="tt-zone tt-base${bo ? ' actionable' : ''}${dest ? ' dest' : ''}${armd}" data-drop="base:${p}" ${dest ? `data-dest="base:${p}"` : ''} ${bo ? `data-zopt="${esc(bo)}"` : ''}><div class="tt-zl">Base</div><div class="tt-cards">${items}</div></div>`;
}

function plateHtml(eng: Engine, p: P): string {
  const s = eng.pl[p];
  const active = eng.active === p;
  const who = p === view ? 'me' : 'them';
  return `<div class="tt-plate ${who}${active ? ' active' : ''}"><span class="tt-pname">${esc(s.name)}</span><span class="tt-ppts"><b>${s.points}</b>/${eng.cfg.victoryScore}</span>${active ? '<span class="tt-onturn">na vez</span>' : ''}</div>`;
}

/** Fileira de casa: runas, base e lenda/campeão. */
function homeRowHtml(eng: Engine, p: P, top: boolean): string {
  return `<section class="tt-home ${top ? 'top' : 'bottom'} ${p === view ? 'me' : 'them'}">${runeRowHtml(eng, p)}${baseZoneHtml(eng, p)}${heroHtml(eng, p)}</section>`;
}

/** Fileira da mão: deck de runas, mão em leque, deck principal e descarte. */
function handRowHtml(eng: Engine, p: P, top: boolean): string {
  const s = eng.pl[p];
  const hidden = hideOpp() && (p !== view || watching());
  const n = s.hand.length;
  const fan = s.hand
    .map((id, i) => `<div class="tt-slot" style="--i:${i};--n:${n}">${cardHtml(eng, eng.objs[id], 'hand', hidden)}</div>`)
    .join('');
  const topTrash = s.trash.length ? eng.objs[s.trash[s.trash.length - 1]].code : null;
  const left = `<div class="tt-piles">${pileHtml('Runas', s.runeDeck.length, 'runedeck', null)}${plateHtml(eng, p)}</div>`;
  const right = `<div class="tt-piles">${pileHtml('Deck', s.mainDeck.length, 'deck', null)}${pileHtml('Descarte', s.trash.length, 'trash', topTrash, `data-trash="${p}"`)}${s.banish.length ? pileHtml('Banidas', s.banish.length, 'banish', null) : ''}</div>`;
  return `<section class="tt-handrow ${top ? 'top' : 'bottom'} ${p === view ? 'me' : 'them'}${hidden ? ' hidden' : ''}">${left}<div class="tt-fan" aria-label="Mão de ${esc(s.name)} (${n})">${fan}</div>${right}</section>`;
}

function railHtml(eng: Engine, p: P, side: 'left' | 'right'): string {
  const vs = eng.cfg.victoryScore;
  const n = Math.min(eng.pl[p].points, vs);
  const steps = Array.from({ length: vs + 1 }, (_, k) => k);
  if (side === 'left') steps.reverse();
  const pts = steps
    .map((k) => `<i class="tt-pt${k === n ? ' on' : ''}${k < n ? ' past' : ''}${k === vs ? ' final' : ''}${k % 2 ? ' odd' : ''}">${k}</i>`)
    .join('');
  return `<div class="tt-rail ${side} ${p === view ? 'me' : 'them'}" title="${esc(eng.pl[p].name)}: ${n} de ${vs} pontos">${side === 'left' ? histHtml(eng) : ''}${pts}</div>`;
}

// ── histórico de jogadas (coluna da esquerda, como no LoR) e avisos do que o oponente acabou de fazer ──
type LogLine = Engine['log'][number];
function histTip(eng: Engine, l: LogLine): string {
  const m = l.meta!;
  const names = (m.targets || []).map((id) => eng.objs[id]).filter(Boolean).map((o) => eng.name(o));
  return `${eng.pl[l.player ?? 0].name}: ${l.text.replace(/^Resolve: /, '').replace(/\.$/, '')}${names.length ? ` → ${names.join(', ')}` : ''}${m.fizzled ? ' (sem efeito: os alvos não eram mais válidos)' : ''}`;
}
function histHtml(eng: Engine): string {
  const items = eng.log
    .filter((l) => l.meta?.kind === 'resolve')
    .slice(-10)
    .reverse()
    .map((l) => {
      const m = l.meta!;
      const url = artUrl(m.code);
      return `<div class="tt-hi ${l.player === view ? 'me' : 'them'}${m.fizzled ? ' fizz' : ''}" data-hover="${m.obj}" data-hist="${(m.targets || []).join(',')}" title="${esc(histTip(eng, l))}">${url ? `<img src="${url}" alt="" draggable="false">` : `<span>${esc(cardData(m.code).name)}</span>`}</div>`;
    })
    .join('');
  return items ? `<div class="tt-hist" aria-label="Últimas coisas que resolveram (mais nova em cima)"><span class="tt-histl">Últimas</span>${items}</div>` : '<div class="tt-hist"></div>';
}
const rerenderMenu = () => {
  if (!game) render();
};
/** Música da cena: menu fora da partida, a trilha do meu deck (escolhida no deckbuilder) na partida, vitória/derrota no fim. */
function syncMusic() {
  // o índice chega depois do primeiro desenho: redesenha para o botão da música aparecer
  loadMusic(rerenderMenu);
  if (page !== 'decks') stopPreview();
  if (!game || replay) return musicScene({ kind: 'menu' });
  const w = game.engine.winner;
  if (w !== null) return musicScene({ kind: 'end', won: w === (mySeat() ?? view), key: `${game.cfg.seed}:${game.answers.length}` });
  // a partida pode pedir a própria trilha (cfg.music, ex.: degrau da escada); senão vale a escolha do deck
  musicScene({ kind: 'game', choice: acc.savedDeckOf(settings.decks[0])?.music, track: (game.cfg as { music?: string }).music, seed: game.cfg.seed });
}
/** O tabuleiro (id) da música desta partida, mesmo com a música desligada: o tapete 'auto' acompanha. */
function gameTrackId(): string | undefined {
  if (!game) return undefined;
  const t = (game.cfg as { music?: string }).music;
  if (t && musicBoards().some((b) => b.id === t)) return t;
  return deckTrack(acc.savedDeckOf(settings.decks[0])?.music, game.cfg.seed)?.id;
}
/** Escolha do tapete: automático (o da música), os feltros e, no site, as ilustrações do LoR. Todos liberados. */
function matPickHtml(): string {
  const cur = matChoice();
  const btn = (id: string, name: string, src?: string) =>
    `<button type="button" data-act="mat" data-id="${esc(id)}" class="${src ? '' : `mat-${esc(id)}`}${cur === id ? ' on' : ''}"${src ? ` style="background-image:url('${esc(src)}')"` : ''} title="${esc(name)}"><span>${esc(name)}</span></button>`;
  const lor = lorMats();
  return `<div class="tt-matpick">
    <h4>Feltro</h4>${btn('auto', 'Automático (o do tabuleiro da música)')}${FELTS.map((m) => btn(m.id, m.name)).join('')}
    ${lor.length ? `<h4>Tabuleiros do Legends of Runeterra</h4>${lor.map((m) => btn(m.id, m.name, m.src)).join('')}` : location.protocol === 'file:' ? '<p class="note">As ilustrações dos tabuleiros só aparecem no site.</p>' : ''}
  </div>`;
}
/** Sons das linhas novas do registro (no replay, só acompanha a leitura). */
function playSounds(eng: Engine) {
  if (!game) return;
  const champs = Object.values(eng.objs)
    .filter((o) => isChampionCard(o.code))
    .map((o) => cardData(o.code).name);
  soundFromLog(game, eng, view, !!replay, {
    champIn: (text) => champs.find((n) => text.includes(n)) ?? null,
    champAt: (bf, player) => {
      const p = eng.pl.findIndex((x) => eng.pname(eng.pl.indexOf(x) as P) === player);
      const i = eng.bfs.findIndex((b) => eng.name(eng.objs[b.objId]) === bf);
      const u = p < 0 || i < 0 ? undefined : eng.unitsAtBf(i, p as P).find((x) => isChampionCard(x.code));
      return u ? cardData(u.code).name : null;
    },
    legend: (p) => cardData(eng.legendOf(p as P).code).name,
    meName: eng.pname(view),
  });
}
let toastSeen: { game: Game | null; n: number } = { game: null, n: 0 };
let toasts: { line: LogLine; until: number; at: number }[] = [];
function updateToasts(eng: Engine) {
  const now = Date.now();
  if (toastSeen.game !== game || eng.log.length < toastSeen.n) {
    toastSeen = { game, n: eng.log.length };
    toasts = [];
    return;
  }
  for (const l of eng.log.slice(toastSeen.n))
    if ((l.meta?.kind === 'resolve' && l.player !== undefined && l.player !== view) || (l.player !== undefined && /ganha \d+ ponto/.test(l.text))) toasts.push({ line: l, until: now + 4500, at: now });
  toastSeen.n = eng.log.length;
  // somem sozinhos pela animação (sem redesenhar a tela); o próximo desenho tira os vencidos
  toasts = toasts.filter((t) => t.until > now).slice(-3);
}
function toastsHtml(eng: Engine): string {
  if (!toasts.length) return '';
  return `<div class="tt-toasts" aria-live="polite">${toasts
    .map(({ line: l, at }) => {
      if (!l.meta) {
        // ponto marcado (dos dois jogadores)
        return `<div class="tt-toast score ${l.player === view ? 'me' : 'them'}" style="animation-delay:-${Date.now() - at}ms"><b class="tt-plus">+${/ganha (\d+) ponto/.exec(l.text)?.[1] || 1}</b><div>${linkCards(eng, l.text)}</div></div>`;
      }
      const m = l.meta!;
      const delay = `style="animation-delay:-${Date.now() - at}ms"`;
      const url = artUrl(m.code);
      const names = (m.targets || []).map((id) => eng.objs[id]).filter(Boolean).map((o) => eng.name(o));
      return `<div class="tt-toast them" ${delay} data-hover="${m.obj}" data-targets="${(m.targets || []).join(',')}" data-at="${at}">${url ? `<img src="${url}" alt="" draggable="false">` : ''}<div><b>${esc(eng.pl[l.player ?? 0].name)}</b> ${esc(l.text.replace(/^Resolve: /, '').replace(/\.$/, ''))}${names.length ? `<span class="tt-tt">→ ${esc(names.join(', '))}</span>` : ''}${m.fizzled ? '<span class="tt-tt">sem efeito: alvos inválidos</span>' : ''}</div></div>`;
    })
    .join('')}</div>`;
}
// aviso grande de troca de turno
let turnSeen: { game: Game | null; key: string } = { game: null, key: '' };
let banner: { text: string; mine: boolean; until: number } | null = null;
function turnBannerHtml(eng: Engine): string {
  const key = `${eng.turn}:${eng.active}`;
  const now = Date.now();
  if (turnSeen.game === game && turnSeen.key !== key && eng.turn > 0 && eng.winner === null) {
    const mine = vsAi() || online() ? eng.active === view : true;
    banner = { text: vsAi() || online() ? (mine ? 'Seu turno' : `Turno de ${eng.pl[eng.active].name}`) : `Turno de ${eng.pl[eng.active].name}`, mine, until: now + 1700 };
  }
  turnSeen = { game, key };
  if (!banner || banner.until <= now || eng.winner !== null) return '';
  return `<div class="tt-turnbanner ${banner.mine ? 'me' : 'them'}" style="animation-delay:-${now - (banner.until - 1700)}ms"><span>${esc(banner.text)}</span><small>Turno ${eng.turn}</small></div>`;
}

function bfZoneHtml(eng: Engine, i: number): string {
  const b = eng.bfs[i];
  const o = eng.objs[b.objId];
  const d = cardData(o.code);
  const sd = eng.showdown && eng.showdown.bf === i ? eng.showdown : null;
  const owner = b.controller === null ? '' : b.controller === view ? 'me' : 'them';
  const opp: P = (1 - view) as P;
  const lane = (p: P) => {
    const units = eng.unitsAtBf(i, p).map((u) => cardHtml(eng, u, 'board'));
    const gears = eng
      .board()
      .filter((g) => eng.isGear(g) && !eng.isUnit(g) && !g.attachedTo && g.controller === p && g.loc?.t === 'bf' && (g.loc as any).i === i)
      .map((g) => cardHtml(eng, g, 'board'));
    return [...units, ...gears].join('');
  };
  const fd = (p: P) =>
    b.facedown
      .map((id) => eng.objs[id])
      .filter((f) => f.controller === p)
      .map((f) => (isHiddenFromView(eng, f) ? backHtml('thumb', f.id) : cardHtml(eng, f, 'thumb')))
      .join('');
  const opts = optionsFor(o.id);
  const tags: string[] = [];
  tags.push(`<span class="tt-ctrl ${owner}" title="Quem controla o campo (pontua com hold no começo do turno se tiver unidades aqui)">${b.controller === null ? 'sem controle' : `de ${esc(eng.pl[b.controller].name)}`}</span>`);
  if (sd) tags.push(`<span class="tt-sd${sd.combat ? ' combat' : ''}">${sd.combat ? 'Combate' : 'Showdown'} · Focus ${esc(eng.pl[sd.focus].name)}</span>`);
  else if (b.contestedBy !== null) tags.push('<span class="tt-sd">Disputado</span>');
  for (const p of [0, 1] as P[])
    if (eng.scored.includes(`${p}-${i}`)) tags.push(`<span class="tt-scored ${p === view ? 'me' : 'them'}" title="${esc(eng.pl[p].name)} já pontuou este campo neste turno (cada campo pontua uma vez por turno para cada jogador)">✓ ${esc(eng.pl[p].name)} pontuou</span>`);
  const url = artUrl(o.code);
  const fdOpp = fd(opp);
  const fdMe = fd(view);
  const dest = frame.dests.has(`bf:${i}`);
  const cp = frame.combat?.bf === i ? frame.combat : dest ? frame.movePreview.get(i) ?? null : null;
  const armd = frame.armLocs.has(`bf:${i}`) || frame.armObjs.has(o.id) ? ' armdest' : '';
  return `<div class="tt-bf${owner ? ' c' + owner : ''}${opts.length ? ' actionable' : ''}${sd ? ' live' : ''}${dest ? ' dest' : ''}${armd}" data-obj="${o.id}" data-drop="bf:${i}" ${dest ? `data-dest="bf:${i}"` : ''}>
    ${cp ? combatBadge(eng, cp) : dest && frame.destNote.has(i) ? `<div class="tt-cpv"><span class="tt-cpk">Se mover (sem combate)</span><span class="tt-cpn">${esc(frame.destNote.get(i)!)}</span></div>` : ''}
    <div class="tt-lane them">${lane(opp)}</div>
    <div class="tt-bfmid">
      <div class="tt-fd">${fdOpp ? `${fdOpp}<span class="tt-fdl">escondida</span>` : ''}</div>
      <div class="tt-bfcard" data-hover="${o.id}" title="${esc(d.name)}">${url ? `<img src="${url}" alt="${esc(d.name)}" draggable="false">` : `<span class="tt-bftext">${rulesHtml(d.text)}</span>`}<span class="tt-bfn">${esc(d.name)}</span></div>
      <div class="tt-bftags">${tags.join('')}${fdMe ? `<div class="tt-fd mine">${fdMe}</div>` : ''}</div>
    </div>
    <div class="tt-lane me">${lane(view)}</div>
  </div>`;
}


/** Zona onde a carta da opção aparece na mesa (se aparece). */
function visibleOnMat(eng: Engine, o: Obj): boolean {
  if (o.zone === 'board' || o.zone === 'legend' || o.zone === 'champion' || o.zone === 'battlefieldZone') return true;
  if (o.zone === 'hand') return !(hideOpp() && o.owner !== view);
  if (o.zone === 'facedown') return true;
  return false;
}

/**
 * Resumo do fim da partida, tirado do registro: pontos de cada um turno a turno (gráfico), a virada (ou desde quando o
 * vencedor liderou), a carta que mais causou dano e quantas cartas cada um jogou.
 */
function endSummaryHtml(eng: Engine): string {
  const vs = eng.cfg.victoryScore || 8;
  const turns = Math.max(1, eng.turn);
  // pontos ao fim de cada turno (o registro traz o total depois de cada ponto: "→ N")
  const pts: [number[], number[]] = [Array(turns + 1).fill(0), Array(turns + 1).fill(0)];
  const played = [0, 0];
  const dmg = new Map<string, number>();
  for (const l of eng.log) {
    let m: RegExpExecArray | null;
    if (l.player !== undefined && (m = /ganha \d+ ponto.*→ (\d+)\.$/.exec(l.text))) {
      for (let t = Math.min(l.turn, turns); t <= turns; t++) pts[l.player][t] = Number(m[1]);
    } else if (l.player !== undefined && / joga /.test(l.text)) played[l.player]++;
    else if ((m = /^.+? recebe (\d+) de dano de (.+?)\.$/.exec(l.text))) dmg.set(m[2], (dmg.get(m[2]) || 0) + Number(m[1]));
  }
  const me = (mySeat() ?? 0) as P;
  const name = (p: P) => esc(eng.pl[p].name);
  // gráfico: x = turno, y = pontos (0..vs); a linha do oponente é tracejada e cada uma tem o nome na ponta
  const W = 320, H = 120, L = 22, R = 64, T = 8, B = 20;
  const x = (t: number) => L + ((W - L - R) * t) / turns;
  const y = (v: number) => T + (H - T - B) * (1 - Math.min(v, vs) / vs);
  const line = (p: P) => pts[p].map((v, t) => `${t ? 'H' : 'M'}${x(t).toFixed(1)}${t ? ` V${y(v).toFixed(1)}` : ` ${y(v).toFixed(1)}`}`).join(' ');
  const series = ([me, (1 - me) as P] as P[])
    .map((p) => {
      const c = p === me ? 'var(--me)' : 'var(--them)';
      const end = pts[p][turns];
      return `<path d="${line(p)}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"${p === me ? '' : ' stroke-dasharray="5 4"'}/>
        <circle cx="${x(turns)}" cy="${y(end)}" r="4.5" fill="${c}" stroke="var(--panel)" stroke-width="2"/>
        <text x="${x(turns) + 9}" y="${y(end) + (p === me ? -2 : 10)}" class="tt-sumlbl">${name(p)} ${end}</text>`;
    })
    .join('');
  const grid = [0, Math.round(vs / 2), vs].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="tt-sumgrid"/><text x="${L - 6}" y="${y(v) + 3}" class="tt-sumax" text-anchor="end">${v}</text>`).join('');
  const hits = Array.from({ length: turns }, (_, i) => i + 1)
    .map((t) => `<rect x="${x(t - 1)}" y="${T}" width="${x(t) - x(t - 1)}" height="${H - T - B}" fill="transparent"><title>Turno ${t}: ${eng.pl[0].name} ${pts[0][t]} × ${pts[1][t]} ${eng.pl[1].name}</title></rect>`)
    .join('');
  const chart = `<svg class="tt-sumchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Pontos por turno: ${name(0)} ${pts[0][turns]}, ${name(1)} ${pts[1][turns]}">${grid}${series}${hits}<text x="${(L + W - R) / 2}" y="${H - 4}" class="tt-sumax" text-anchor="middle">turnos</text></svg>`;
  // a virada: o último turno em que o vencedor não estava na frente
  const w = eng.winner;
  let turn = '';
  if (w !== null) {
    const o = (1 - w) as P;
    let lastNot = 0;
    let behind = false;
    for (let t = 1; t <= turns; t++) {
      if (pts[w][t] <= pts[o][t]) lastNot = t;
      if (pts[w][t] < pts[o][t]) behind = true;
    }
    turn = lastNot >= turns ? '' : behind ? `Virada no turno ${lastNot + 1}` : `${name(w)} na frente desde o turno ${lastNot + 1}`;
  }
  const top = [...dmg.entries()].sort((a, b) => b[1] - a[1])[0];
  const facts = [
    turn,
    top ? `Mais dano: <b>${esc(top[0])}</b> (${top[1]})` : '',
    `Cartas jogadas: ${name(0)} ${played[0]} · ${name(1)} ${played[1]}`,
  ].filter(Boolean);
  return `<div class="tt-summary"><div class="tt-sumh">Pontos por turno</div>${chart}<ul class="tt-sumfacts">${facts.map((f) => `<li>${f}</li>`).join('')}</ul></div>`;
}

/** Sobreposição no centro da mesa: escolha de campo, mulligan, cartas fora da mesa, troca de jogador e fim. */
let overlayHidden = '';
/** Fim de uma partida de confronto do torneio: a próxima partida (melhor de 3, anfitrião) e a volta ao torneio. */
function tourEndButtons(eng: Engine, compact = false): string | null {
  // (a visão do convidado não traz o cfg inteiro: vale a marca da sala)
  const tag = roomTour && net && !watching() ? tourTagOf(game?.cfg) ?? roomTour.tag : null;
  if (!tag) return roomTour && watching() ? '<button class="primary" data-act="tourback">Voltar ao torneio</button>' : null;
  const k = knownGames(tag);
  const next = k.decided ? '' : net!.role === 'host' ? `<button class="primary" data-act="rematch">Próxima partida (${k.w[0]} × ${k.w[1]})</button>` : compact ? '' : `<span class="muted">Confronto em ${k.w[0]} × ${k.w[1]}: ${esc(eng.pl[0].name)} começa a próxima partida aqui.</span>`;
  return `${next}<button class="${next && net!.role === 'host' ? '' : 'primary'}" data-act="tourback">Voltar ao torneio</button>`;
}
function overlayHtml(eng: Engine, d: Decision | null): string {
  if (!game || replay) return '';
  // desafio: abertura e resultado no lugar do fim de jogo
  if (challengeOf(game)) {
    const ch = challengeOverlayHtml(game);
    if (ch || eng.winner !== null || !d) return ch;
  }
  if (eng.winner !== null || !d) {
    if (overlayHidden === 'end') return '';
    const w = eng.winner;
    const mine = w !== null && (vsAi() ? w === HUMAN : online() ? w === seat : true);
    const btns = online()
      ? tourEndButtons(eng) ?? (net!.role === 'host'
        ? '<button class="primary" data-act="rematch">Revanche</button><button data-act="lobby">Trocar decks</button>'
        : `<span class="muted">Esperando ${esc(eng.pl[0].name)} pedir a revanche.</span>`)
      : ladderEndButtons(game.cfg) ?? '<button class="primary" data-act="newgame">Nova partida</button><button data-act="setup">Trocar decks</button>';
    const lad = online() ? rankEndNote(fullGame()?.cfg, seat) : ladderEndNote(game.cfg);
    return `<div class="tt-overlay end ${mine ? 'win' : 'lose'}"><div class="tt-obox">
      <p class="tt-kicker">Fim de jogo</p><h2>${w !== null ? `${esc(eng.pl[w].name)} venceu` : 'Fim de jogo'}</h2>
      <p>${esc(eng.winReason || '')} · ${eng.pl[0].points} × ${eng.pl[1].points} · ${eng.turn} turnos</p>${lad ? `<p class="tt-ladnote">${lad}</p>` : ''}${(() => {
        const last = [...eng.log].reverse().find((l) => /ganha \d+ ponto/.test(l.text));
        return last ? `<p class="muted">Último ponto: ${linkCards(eng, last.text)}</p>` : '';
      })()}${endSummaryHtml(eng)}<div class="btns">${btns}<button data-act="replaythis">Ver o replay</button>${(() => {
        const fg = fullGame();
        if (!fg) return '';
        const sv = JSON.parse(fg.serialize());
        return replayShareBtn(sv.cfg, sv.answers);
      })()}<button data-act="hideoverlay">Ver a mesa</button></div></div></div>`;
  }
  if (handoffPending)
    return `<div class="tt-overlay handoff"><div class="tt-obox"><p class="tt-kicker">Passe o aparelho</p><h2>Vez de ${esc(eng.pl[d.player].name)}</h2>
      <p class="muted">A mão de ${esc(eng.pl[view].name)} fica escondida.</p><div class="btns"><button class="primary" data-act="handoff">Mostrar a minha mesa</button></div></div></div>`;
  if (isOtherTurn()) return '';
  const key = `${game.answers.length}`;
  if (overlayHidden === key) return '';
  const multi = d.max > 1 || d.min === 0;
  const hideBtn = '<button data-act="hideoverlay">Ver a mesa</button>';
  if (d.kind === 'setup') {
    const picks = d.options
      .map((o) => {
        const url = hasCard(o.id) ? artUrl(o.id) : null;
        return `<button class="tt-pick land" data-opt="${esc(o.id)}" ${hasCard(o.id) ? `data-hover="code:${esc(o.id)}"` : ''}>${url ? `<img src="${url}" alt="" draggable="false">` : `<span class="tt-pickname">${esc(o.label)}</span>`}<span class="tt-picklabel">${esc(o.label)}</span></button>`;
      })
      .join('');
    return `<div class="tt-overlay"><div class="tt-obox wide"><p class="tt-kicker">${esc(eng.pl[d.player].name)}</p><h2>Escolha o seu campo de batalha</h2><div class="tt-picks">${picks}</div></div></div>`;
  }
  if (d.kind === 'mulligan') {
    const cards = d.options
      .map((o) => {
        const ob = o.obj ? eng.objs[o.obj] : null;
        const on = selected.includes(o.id);
        return `<button class="tt-pick${on ? ' on' : ''}" data-opt="${esc(o.id)}" ${ob ? `data-hover="${ob.id}"` : ''}>${ob && artUrl(ob.code) ? `<img src="${artUrl(ob.code)}" alt="" draggable="false">` : `<span class="tt-pickname">${esc(o.label)}</span>`}${on ? '<span class="tt-mark">trocar</span>' : ''}</button>`;
      })
      .join('');
    const first = eng.pl[eng.active]?.name;
    return `<div class="tt-overlay"><div class="tt-obox wide"><p class="tt-kicker">${esc(eng.pl[d.player].name)} · ${first ? `${esc(first)} começa` : ''}</p><h2>Mulligan</h2>
      <p class="muted">Toque em até ${d.max} cartas para trocar. As trocadas vão para o fundo do deck.</p><div class="tt-picks">${cards}</div>
      <div class="btns"><button class="primary" data-act="confirm">${selected.length ? `Trocar ${selected.length} ${selected.length > 1 ? 'cartas' : 'carta'}` : 'Manter a mão'}</button>${hideBtn}</div></div></div>`;
  }
  // cartas que não estão à vista na mesa (topo do deck, descarte, banidas...): mostra as cartas grandes para escolher
  const objs = d.options.map((o) => (o.obj ? eng.objs[o.obj] : null));
  const offMat = objs.some((o) => o && !visibleOnMat(eng, o));
  if (offMat && d.options.every((o) => o.obj || /^(none|no|pass|skip|nao|não)$/i.test(o.id))) {
    const cards = d.options
      .map((o) => {
        const ob = o.obj ? eng.objs[o.obj] : null;
        const on = selected.includes(o.id);
        if (!ob) return `<button class="tt-pick text${on ? ' on' : ''}" data-opt="${esc(o.id)}"><span class="tt-pickname">${esc(o.label)}</span></button>`;
        const url = artUrl(ob.code);
        return `<button class="tt-pick${on ? ' on' : ''}" data-opt="${esc(o.id)}" data-hover="${ob.id}" title="${esc(o.label)}">${url ? `<img src="${url}" alt="" draggable="false">` : `<span class="tt-pickname">${esc(cardData(ob.code).name)}</span>`}<span class="tt-picklabel">${esc(o.label)}</span></button>`;
      })
      .join('');
    const confirm = multi ? `<button class="primary" data-act="confirm" ${selected.length < d.min || selected.length > d.max ? 'disabled' : ''}>Confirmar (${selected.length})</button>` : '';
    return `<div class="tt-overlay"><div class="tt-obox wide"><p class="tt-kicker">${esc(eng.pl[d.player].name)}</p><h2>${esc(d.prompt)}</h2>
      ${multi ? `<p class="muted">Escolha ${d.min === d.max ? d.min : `de ${d.min} a ${d.max}`}.</p>` : ''}<div class="tt-picks">${cards}</div>
      <div class="btns">${confirm}${game.canCancel ? '<button data-act="cancel">Cancelar ação</button>' : ''}${hideBtn}</div></div></div>`;
  }
  return '';
}


function logHtml(eng: Engine): string {
  const li = (l: (typeof eng.log)[number]) => {
    const cls = l.text.startsWith('──') ? 'turn' : l.player === undefined ? '' : l.player === view ? 'me' : 'them';
    return `<li class="${cls}">${linkCards(eng, l.text)}</li>`;
  };
  const recent = eng.log.slice(-240);
  let lines: string;
  if (logNewestFirst) {
    // mais novo em cima, sem precisar rolar; cada turno continua com o seu título no topo do bloco
    const groups: (typeof recent)[] = [[]];
    for (const l of recent) {
      if (l.text.startsWith('──')) groups.push([l]);
      else groups[groups.length - 1].push(l);
    }
    lines = groups
      .reverse()
      .map((g) => {
        const head = g[0]?.text.startsWith('──') ? g[0] : null;
        const body = (head ? g.slice(1) : g).reverse();
        return (head ? li(head) : '') + body.map(li).join('');
      })
      .join('');
  } else lines = recent.map(li).join('');
  return `<section class="panel log${logNewestFirst ? ' newest' : ''}"><header class="tt-logh"><h3>Registro</h3><button class="tt-dbtn" data-act="logorder" title="Inverter a ordem">${logNewestFirst ? 'Mais novo em cima' : 'Mais novo embaixo'}</button></header><ol id="logl">${lines}</ol></section>`;
}

/** Por que esta carta (ou unidade) não pode ser usada agora: o motivo em uma linha, ou '' se pode / não se aplica. */
function whyNot(eng: Engine, o: Obj): string {
  if (!game || o.id.startsWith('code:') || o.controller !== view) return '';
  const d = game.current;
  if (o.zone === 'board' && eng.isUnit(o)) {
    if (frame.movable.has(o.id) || optionsFor(o.id).length) return '';
    if (!d || isOtherTurn() || d.player !== view) return '';
    if (d.root && d.kind === 'action' && eng.active === view) {
      if (o.exhausted) return 'Exausta: não se move até o seu próximo Despertar.';
      if (o.stunned) return '';
      return 'Sem destino para mover agora.';
    }
    return '';
  }
  if (o.zone !== 'hand' && o.zone !== 'champion') return '';
  if (optionsFor(o.id).length) return '';
  if (eng.winner !== null) return '';
  if (!d || isOtherTurn() || d.player !== view) return `Agora a vez é de ${esc(eng.pl[d ? d.player : eng.active].name)}.`;
  if (!d.root) return 'Termine a escolha atual primeiro.';
  const timing = d.kind === 'action' ? 'main' : d.kind === 'priority' ? 'priority' : d.kind === 'focus' ? 'focus' : null;
  if (!timing) return '';
  const r = eng.playBlockReason(view, o, o.zone === 'champion' ? 'champion' : 'hand', timing);
  return r ? `Não dá para jogar agora: ${esc(r)}.` : '';
}

/** Prévia grande da carta sob o mouse (só em telas com mouse). */
function peekHtml(eng: Engine, id: string | null): string {
  const o = objOrCode(eng, id);
  if (!o) return '';
  if (!o.id.startsWith('code:') && isHiddenFromView(eng, o)) return '';
  const d = cardData(o.code);
  const k = o.zone === 'board' && eng.isUnit(o) ? 'unit' : kindOf(o.code); // novo: unit gear
  const url = artUrl(o.code);
  const live: string[] = [];
  if (k === 'unit' && o.zone === 'board') {
    live.push(`Might <b>${eng.might(o)}</b>`);
    if (o.damage) live.push(`<b class="bad">${o.damage}</b> de dano`);
    if (o.buffs) live.push('Buff');
    if (o.stunned) live.push('atordoada');
    const kw = kwChips(eng, o);
    if (kw) live.push(`<span class="kws">${kw}</span>`);
    const gear = eng.attachedTo(o).map((g) => esc(cardData(g.code).name));
    if (gear.length) live.push(`⚙ ${gear.join(', ')}`);
  }
  const why = whyNot(eng, o);
  const text = `<div class="tt-peektext"><b>${esc(d.name)}</b>${live.length ? `<p class="live">${live.join(' · ')}</p>` : ''}${why ? `<p class="tt-why">${why}</p>` : ''}${d.text ? `<p class="tt-ptx">${rulesHtml(d.text)}</p>` : ''}${d.effectText ? `<p><b>Quando equipado:</b> ${rulesHtml(d.effectText)}</p>` : ''}${d.errata ? '<p class="note">Texto com errata.</p>' : ''}${keywordHelpHtml(eng, o)}</div>`;
  return `<div class="tt-peekin${k === 'battlefield' ? ' land' : ''}">${url ? `<img src="${url}" alt="" draggable="false">` : ''}${text}</div>`;
}

/** As fases do turno em ordem, a atual acesa; e o que está aberto agora (pilha, showdown, combate). */
function phaseStripHtml(eng: Engine): string {
  const order = ['awaken', 'beginning', 'channel', 'draw', 'main', 'ending'];
  const k = order.indexOf(eng.phase);
  const short: Record<string, string> = { awaken: 'Despertar', beginning: 'Início', channel: 'Canalizar', draw: 'Compra', main: 'Principal', ending: 'Final' };
  const items = order.map((ph, i) => `<li class="${i === k ? 'on' : i < k ? 'past' : ''}">${short[ph]}</li>`).join('');
  const st: string[] = [];
  const sd = eng.showdown;
  if (sd) st.push(`<span class="tt-st ${sd.combat ? 'combat' : ''}" title="${esc(sd.combat ? CONCEPTS.combate : CONCEPTS.showdown)}">${sd.combat ? '⚔ Combate' : 'Showdown'} · ${esc(eng.name(eng.bfs[sd.bf].objId))} · Focus: ${esc(eng.pl[sd.focus].name)}</span>`);
  if (eng.chain.length) st.push(`<span class="tt-st chain" title="${esc(CONCEPTS.pilha)}">Pilha aberta (${eng.chain.length})</span>`);
  return `<ol class="tt-phases" title="Fases do turno">${items}</ol>${st.length ? `<div class="tt-states">${st.join('')}</div>` : ''}`;
}

function sideHtml(eng: Engine, d: Decision | null): string {
  const me = eng.active === view;
  return `<aside class="tt-side">
    <header class="tt-head">
      <div class="tt-turn"><span class="tn">Turno ${eng.turn}</span><span class="who ${me ? 'me' : 'them'}">${esc(eng.pl[eng.active].name)}</span><span class="ph">${eng.chain.length ? 'pilha aberta' : eng.showdown ? (eng.showdown.combat ? 'combate' : 'showdown') : PHASE_PT[eng.phase] || eng.phase}</span></div>
      ${phaseStripHtml(eng)}
      <div class="tt-tools">
        <button class="tt-logtog" data-act="sidetoggle">${sideOpen ? 'Fechar registro' : 'Registro'}</button>
        ${online() ? netChip() : vsAi() ? '' : `<label class="tog"><input type="checkbox" id="privacy" ${settings.privacy ? 'checked' : ''}> esconder mãos</label><button data-act="flip" title="Ver a mesa do outro lado">Girar</button>`}
        <button data-act="guide" title="Como funciona (?)">Como funciona</button>
        <button data-act="sound" class="tt-sound" title="Volume dos sons (M)">${soundIcon()}</button>
        <button data-act="music" class="tt-sound" title="Volume da música (N); a trilha de cada deck se escolhe no deckbuilder">${musicIcon()}</button>
        <button data-act="matpick" title="Trocar o tapete da mesa (T)">Tapete</button>
        ${replay ? '' : '<button data-act="report" title="Guardar esta partida para mostrar um problema">Relatar problema</button>'}
        ${online() ? '<button data-act="leave">Sair da sala</button>' : '<button data-act="setup">Menu</button>'}
      </div>
    </header>
    ${chatLogHtml()}
    ${logHtml(eng)}
  </aside>`;
}

// ── estado desenhado nesta passada (o que é móvel, arrastável, alvo, previsto para morrer) ──
interface Frame {
  movable: Set<string>;
  drag: Set<string>;
  targeted: Map<string, P[]>;
  doomed: Set<string>;
  dests: Map<string, Loc>;
  combat: CombatPreview | null;
  movePreview: Map<number, CombatPreview>;
  oracle: Oracle | null;
  /** destino de movimento sem combate: o que a conquista daria */
  destNote: Map<number, string>;
  /** morrem só em alguns dos resultados possíveis (depende de uma escolha) */
  maybeDoomed: Set<string>;
  /** alvos e locais possíveis da ação armada (confirmar antes de jogar) */
  armObjs: Set<string>;
  armLocs: Map<string, Loc>;
}
const emptyFrame = (): Frame => ({ movable: new Set(), drag: new Set(), targeted: new Map(), doomed: new Set(), dests: new Map(), combat: null, movePreview: new Map(), oracle: null, destNote: new Map(), maybeDoomed: new Set(), armObjs: new Set(), armLocs: new Map() });

// ── prévia do resultado: refaz a partida numa cópia e deixa a pilha (e o combate) resolver com todos passando ──
interface Oracle {
  dies: Set<string>;
  /** morrem só em alguns dos resultados possíveis */
  maybe: Set<string>;
  might: Map<string, number>;
  dmg: Map<string, number>;
  summary: string[];
  /** o resultado depende de uma escolha no caminho (Tank × "por último", ordem do dano): um resumo por escolha */
  alts: { label: string; summary: string[] }[];
  /** quem faz essa escolha */
  chooser?: P;
  /** (interno) a primeira escolha do caminho: índice da resposta e opções */
  branch?: { at: number; opts: Option[]; picked: string; player: P };
}
let oracleCache: { key: string; ref: unknown; res: Oracle | null } | null = null;
function computeOracle(): Oracle | null {
  // só na hora de decidir se passa ou responde: no meio de uma escolha sua a simulação teria de adivinhar a escolha
  if (!game?.current?.root || !oracleOn) return null;
  // convidado online: a prévia simularia a partida com cartas que ele não vê (mão e deck do anfitrião): desligada
  if (viewGame()) return null;
  const eng = game.engine;
  if (!eng.chain.length && !eng.showdown?.combat) return null;
  const key = `${game.cfg.seed}:${decKey()}`;
  if (oracleCache?.key === key && oracleCache.ref === game.answers) return oracleCache.res;
  let res: Oracle | null = null;
  try {
    res = simulateOracle(game);
    // o caminho passou por uma escolha que muda o resultado: simula cada opção (até 3) em vez de chutar uma
    const br = res?.branch;
    if (res && br) {
      const runs = [{ label: br.opts.find((o) => o.id === br.picked)?.label || br.picked, r: res }];
      for (const o of br.opts.filter((o) => o.id !== br.picked).slice(0, 2)) {
        const r = simulateOracle(game, { at: br.at, ans: [o.id] });
        if (r && !r.summary[0]?.startsWith('sem prévia')) runs.push({ label: o.label, r });
      }
      const sig = (r: Oracle) => r.summary.join('|') + '#' + [...r.dies].sort().join(',');
      if (runs.length > 1 && runs.some((x) => sig(x.r) !== sig(res!))) {
        const all = runs.map((x) => x.r.dies);
        const sure = new Set([...all[0]].filter((id) => all.every((d) => d.has(id))));
        res.maybe = new Set(all.flatMap((d) => [...d]).filter((id) => !sure.has(id)));
        res.dies = sure;
        res.alts = runs.map((x) => ({ label: x.label.replace(/ — .*$/, ''), summary: x.r.summary }));
        res.chooser = br.player;
        // Might/dano previstos só onde todas as escolhas concordam
        for (const x of runs.slice(1)) {
          for (const [id, m] of [...res.might]) if (x.r.might.get(id) !== m) res.might.delete(id);
          for (const [id, n] of [...res.dmg]) if (x.r.dmg.get(id) !== n) res.dmg.delete(id);
        }
      }
    }
  } catch {
    res = null;
  }
  oracleCache = { key, ref: game.answers, res };
  return res;
}
/** Escolhas do caminho que mudam o resultado e por isso viram possibilidades na prévia. */
const BRANCH_Q = /Tank e deve receber dano por último|^Distribuir dano/;
function simulateOracle(g0: Game, forced?: { at: number; ans: string[] }): Oracle | null {
  const sim = Game.load(g0.serialize());
  const turn = sim.engine.turn;
  let done = false;
  let branch: Oracle['branch'];
  for (let i = 0; i < 400; i++) {
    const d = sim.current;
    const e = sim.engine;
    if (!d || e.winner !== null) {
      done = true;
      break;
    }
    if (e.turn !== turn || (i > 0 && !e.chain.length && !e.showdown && d.root)) {
      done = true;
      break;
    }
    if (d.root && d.kind === 'action') {
      done = true;
      break;
    }
    const pass = d.root ? d.options.find((o) => o.id === 'pass') : undefined;
    const ans = forced && sim.answers.length === forced.at ? forced.ans : pass ? [pass.id] : quickPick(d, e);
    if (!forced && !branch && !d.root && d.options.length > 1 && d.max === 1 && BRANCH_Q.test(d.prompt))
      branch = { at: sim.answers.length, opts: d.options as Option[], picked: ans[0], player: d.player };
    if (!sim.answer(ans) && !sim.answer([d.options[0].id])) break;
  }
  if (!done) return null;
  const a = g0.engine;
  const b = sim.engine;
  const out: Oracle = { dies: new Set(), maybe: new Set(), might: new Map(), dmg: new Map(), summary: [], alts: [], branch };
  // a cópia sabe tudo (ordem do deck, mãos, cartas viradas, sorteio): se o resultado passa por algo escondido, não mostra
  const hidden = new Set(['mainDeck', 'runeDeck', 'hand', 'facedown']);
  const touchesHidden =
    b.rng.state !== a.rng.state ||
    // comprar (deck → mão) não aparece na prévia; carta escondida que vira pública (descarte, jogada, revelada) sim
    Object.values(a.objs).some((o) => hidden.has(o.zone) && b.objs[o.id] && !hidden.has(b.objs[o.id].zone));
  if (touchesHidden) {
    out.summary.push('sem prévia: depende de carta escondida ou de sorteio');
    return out;
  }
  const died: string[] = [];
  for (const u of a.units()) {
    const v = b.objs[u.id];
    if (!v || v.zone !== 'board' || v.zoneVersion !== u.zoneVersion) {
      out.dies.add(u.id);
      died.push(a.name(u));
      continue;
    }
    const m0 = a.might(u);
    const m1 = b.might(v);
    if (m1 !== m0) out.might.set(u.id, m1);
    if (v.damage !== u.damage) out.dmg.set(u.id, v.damage);
  }
  if (died.length) out.summary.push(`${died.length > 2 ? `${died.length} unidades` : died.join(' e ')} ${died.length > 1 ? 'morrem' : 'morre'}`);
  const fresh = b.units().filter((u) => !a.objs[u.id] || a.objs[u.id].zone !== 'board');
  if (fresh.length) out.summary.push(`${fresh.length > 2 ? `${fresh.length} unidades entram` : fresh.map((u) => b.name(u)).join(' e ') + (fresh.length > 1 ? ' entram' : ' entra')}`);
  for (const p of [0, 1] as P[]) {
    const dp = b.pl[p].points - a.pl[p].points;
    if (dp) out.summary.push(`${a.pl[p].name} ${dp > 0 ? '+' : ''}${dp} ponto${Math.abs(dp) > 1 ? 's' : ''}`);
  }
  b.bfs.forEach((bf, i) => {
    const c0 = a.bfs[i]?.controller;
    if (a.bfs[i] && bf.controller !== c0) out.summary.push(`${a.name(a.bfs[i].objId)}: ${bf.controller === null ? 'sem controle' : `fica com ${a.pl[bf.controller].name}`}`);
  });
  if (b.winner !== null) out.summary.push(`${a.pl[b.winner].name} vence`);
  for (const [id, m] of out.might) if (out.summary.length < 5) out.summary.push(`${a.name(id)}: Might ${a.might(a.objs[id])} → ${m}`);
  for (const [id, n] of out.dmg) if (out.summary.length < 5 && !out.might.has(id)) out.summary.push(`${a.name(id)} fica com ${n} de dano`);
  if (!out.summary.length) out.summary.push('nada muda na mesa');
  return out;
}
let frame: Frame = emptyFrame();

/** A decisão atual é minha (posso clicar/arrastar)? */
const myDecision = () => !!game?.current && !isOtherTurn() && !handoffPending && game.engine.winner === null;
/** Dá para mover com um clique agora (decisão raiz da fase principal com "Mover unidades")? */
const canMoveNow = () => myDecision() && !!game!.current!.root && game!.current!.options.some((o) => o.id === 'move');

function computeFrame(eng: Engine, d: Decision | null): Frame {
  const f = emptyFrame();
  if (moveKey !== decKey()) moveSel = [];
  if (myDecision() && d) {
    if (canMoveNow()) for (const u of eng.movableUnits(d.player)) f.movable.add(u.id);
    moveSel = moveSel.filter((id) => f.movable.has(id));
    if (d.root)
      for (const o of d.options) {
        if (!o.obj) continue;
        if (o.id.startsWith('play:') || o.id.startsWith('hide:') || o.id.startsWith('equip:')) f.drag.add(o.obj);
      }
    for (const id of f.movable) f.drag.add(id);
    if (moveSel.length)
      for (const l of moveTargets(eng, d.player, moveSel)) {
        f.dests.set(locKey(l), l);
        if (l.t === 'bf') {
          const cp = moveCombat(eng, d.player, moveSel, l.i);
          if (cp) f.movePreview.set(l.i, cp);
          if (eng.bfs[l.i].controller !== d.player) f.destNote.set(l.i, conquestNote(eng, d.player, l.i));
        }
      }
  }
  for (const it of eng.chain)
    for (const id of chainTargets(it)) {
      const a = f.targeted.get(id) || [];
      a.push(it.controller);
      f.targeted.set(id, a);
    }
  f.combat = liveCombat(eng);
  f.oracle = myDecision() ? computeOracle() : null;
  if (f.oracle) {
    for (const id of f.oracle.dies) f.doomed.add(id);
    for (const id of f.oracle.maybe) f.maybeDoomed.add(id);
  } else if (f.combat) {
    for (const id of f.combat.dies) f.doomed.add(id);
    for (const id of f.combat.maybe) f.maybeDoomed.add(id);
  }
  // ação armada: só vale na mesma decisão raiz, com a carta ainda tendo a ação
  if (armed && (armed.key !== decKey() || !myDecision() || !d?.root || !rootActs(armed.id).length || (armed.opt && !d.options.some((o) => o.id === armed!.opt)))) armed = null;
  if (armed?.opt) {
    const info = armNext(armed.opt);
    if (info) {
      for (const id of info.objs) f.armObjs.add(id);
      for (const [k, l] of info.locs) f.armLocs.set(k, l);
    }
  }
  return f;
}

/** O que conquistar o campo i daria a p agora (ponto, nada, ou a regra do último ponto). */
function conquestNote(eng: Engine, p: P, i: number): string {
  if (eng.scored.includes(`${p}-${i}`)) return 'já pontuou aqui neste turno: conquistar não dá ponto';
  const s = eng.pl[p];
  if (s.points >= eng.cfg.victoryScore - 1) {
    const all = eng.bfs.every((_, j) => j === i || eng.scored.includes(`${p}-${j}`));
    return all ? 'conquista vale o ponto final' : 'último ponto: só vale pontuando todos os campos neste turno; senão compra 1';
  }
  return 'conquista: +1 ponto';
}

/** Placar da previsão de combate em cima do campo: dano de cada lado e quem fica com o campo. */
function combatBadge(eng: Engine, cp: CombatPreview): string {
  const an = esc(eng.pl[cp.atk].name);
  const res =
    cp.result === 'atk' ? `${an} conquista` : cp.result === 'def' ? `${esc(eng.pl[cp.def].name)} segura` : cp.result === 'tie' ? 'empate: atacantes voltam' : 'ninguém sobra';
  const side = (p: P) => (p === view ? 'me' : 'them');
  const at = new Set(eng.unitsAtBf(cp.bf).map((u) => u.id));
  const useOracle = cp.live && frame.oracle;
  const deaths = useOracle ? [...frame.oracle!.dies].filter((id) => at.has(id)).length : [...cp.dies].length;
  const maybe = useOracle ? [...frame.oracle!.maybe].filter((id) => at.has(id)).length : cp.maybe.size;
  const resTxt = (r: CombatPreview['result']) => (r === 'atk' ? `${an} conquista` : r === 'def' ? `${esc(eng.pl[cp.def].name)} segura` : r === 'tie' ? 'empate' : 'ninguém sobra');
  // a escolha de quem atribui o dano muda o resultado (Tank e "por último" na mesma unidade): mostra as possibilidades
  const alts = cp.alts.length
    ? `<span class="tt-cpalt">${cp.alts.map((x) => `<span><b>${esc(x.label)}</b> → ${resTxt(x.result)}${x.dies.size ? ` · ${x.dies.size} ☠` : ''}</span>`).join('')}</span>`
    : '';
  // carta escondida no campo (que você não vê): pode entrar e mudar a conta
  const hid = eng.bfs[cp.bf].facedown.map((id) => eng.objs[id]).filter((f) => f && isHiddenFromView(eng, f)).length;
  const tip = `Previsão com a mesa de agora (sem contar spells e habilidades que ainda podem entrar). Quem atribui o dano escolhe a ordem; a previsão supõe o máximo de mortes.${cp.alts.length ? ' Uma unidade tem Tank e "por último" ao mesmo tempo: quem atribui o dano escolhe qual vale, e o resultado muda com a escolha.' : ''}${hid ? ' Há carta escondida neste campo.' : ''}`;
  return `<div class="tt-cpv${cp.live ? ' live' : ''}${cp.alts.length ? ' alts' : ''}" title="${esc(tip)}">
    <span class="tt-cpk">${cp.live ? 'Combate' : 'Se mover'}</span>
    <span class="tt-cps"><b class="${side(cp.atk)}">${cp.aM}</b><i>⚔</i><b class="${side(cp.def)}">${cp.dM}</b></span>
    <span class="tt-cpr">${cp.alts.length ? 'depende da escolha' : res}${deaths ? ` · ${deaths} ☠` : ''}${maybe ? ` · ${maybe} ☠?` : ''}</span>${alts}${hid ? `<span class="tt-cpn">${hid > 1 ? `${hid} cartas escondidas` : 'carta escondida'} aqui pode mudar o resultado</span>` : ''}${cp.result === 'atk' && !cp.live && !cp.alts.length ? `<span class="tt-cpn">${esc(conquestNote(eng, cp.atk, cp.bf))}</span>` : ''}</div>`;
}

/** A pilha desenhada na mesa: o item de cima resolve primeiro; setas saem dele até os alvos. */
function stackHtml(eng: Engine): string {
  if (!eng.chain.length) return '';
  const items = [...eng.chain]
    .reverse()
    .map((it, k) => {
      const src = it.cardId || it.sourceId;
      const ob = src ? eng.objs[src] : null;
      const url = ob ? artUrl(ob.code) : null;
      const who = it.controller === view ? 'me' : 'them';
      return `<div class="tt-sti ${who}${k === 0 ? ' top' : ''}" data-chain="${esc(it.id)}" ${ob ? `data-hover="${ob.id}"` : ''} style="--k:${k}" title="${k + 1}º a resolver · ${esc(eng.pl[it.controller].name)}: ${esc(it.label)}"><b class="tt-sn">${k + 1}º</b>
        ${url ? `<img src="${url}" alt="" draggable="false">` : `<span class="tt-stn">${esc(ob ? cardData(ob.code).name : it.label)}</span>`}
        ${k === 0 ? `<span class="tt-stl">${esc(eng.pl[it.controller].name)}: ${esc(it.label)}</span>` : ''}</div>`;
    })
    .join('');
  return `<div class="tt-stack" aria-label="Pilha"><div class="tt-sth" title="${esc(CONCEPTS.pilha)}">Pilha <b>${eng.chain.length}</b><span>1º resolve antes</span></div><div class="tt-stitems">${items}</div></div>`;
}

let hoverHist: HTMLElement | null = null;
/** Setas (SVG) da carta na pilha até cada alvo, desenhadas depois de montar a tela (precisam das posições). */
function drawArrows() {
  const svg = document.getElementById('tt-arrows') as SVGSVGElement | null;
  const mat = document.querySelector('.tt-mat') as HTMLElement | null;
  if (!svg || !mat || !game) return;
  const eng = game.engine;
  const mr = mat.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
  const proxyOf = new Map<string, string>();
  for (const it of eng.chain) {
    if (it.proxyId) proxyOf.set(it.proxyId, it.id);
    if (it.cardId) proxyOf.set(it.cardId, it.id);
  }
  const center = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - mr.left, y: r.top + r.height / 2 - mr.top, r };
  };
  let paths = '';
  for (const it of eng.chain) {
    const from = mat.querySelector(`.tt-sti[data-chain="${CSS.escape(it.id)}"]`);
    if (!from) continue;
    const a = center(from);
    const who = it.controller === view ? 'me' : 'them';
    for (const id of chainTargets(it)) {
      const chainId = proxyOf.get(id);
      const to = chainId && chainId !== it.id ? mat.querySelector(`.tt-sti[data-chain="${CSS.escape(chainId)}"]`) : mat.querySelector(`.tt-mat .card[data-obj="${CSS.escape(id)}"], .tt-mat .tt-bf[data-obj="${CSS.escape(id)}"] .tt-bfcard, .tt-mat [data-obj="${CSS.escape(id)}"]`);
      // alvo fora da mesa: a seta vai para o descarte, a mão ou o deck do dono
      const tob = to ? null : eng.objs[id];
      const row = tob ? `.tt-handrow.${tob.owner === view ? 'bottom' : 'top'}` : '';
      const alt = !tob
        ? null
        : tob.zone === 'trash'
          ? mat.querySelector(`[data-trash="${tob.owner}"]`)
          : tob.zone === 'hand'
            ? mat.querySelector(`${row} .tt-fan`)
            : tob.zone === 'mainDeck' || tob.zone === 'banish'
              ? mat.querySelector(`${row} .tt-pile.${tob.zone === 'banish' ? 'banish' : 'deck'}`)
              : null;
      const tgt = to || alt;
      if (!tgt) continue;
      const b = center(tgt);
      // a ponta para na borda da carta-alvo, a curva sai para o lado
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const stop = Math.min(b.r.width, b.r.height) * 0.42;
      const ex = b.x - (dx / len) * stop;
      const ey = b.y - (dy / len) * stop;
      const cx = (a.x + ex) / 2 - (dy / len) * len * 0.22;
      const cy = (a.y + ey) / 2 + (dx / len) * len * 0.22;
      paths += `<path class="tt-arrow ${who}" d="M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#tt-head-${who})"/>`;
    }
  }
  // avisos do oponente e item do histórico sob o mouse: setas até os alvos que ainda estão na mesa
  const extra: [Element, string[], string][] = [];
  const toastAge: number[] = [];
  for (const t of Array.from(mat.querySelectorAll('.tt-toast[data-targets]'))) {
    extra.push([t, (t as HTMLElement).dataset.targets!.split(',').filter(Boolean), 'them']);
    toastAge.push(Date.now() - Number((t as HTMLElement).dataset.at || 0));
  }
  if (hoverHist && mat.contains(hoverHist)) extra.push([hoverHist, (hoverHist.dataset.hist || '').split(',').filter(Boolean), hoverHist.classList.contains('me') ? 'me' : 'them']);
  extra.forEach(([from, ids, who], xi) => {
    const a = center(from);
    const fade = xi < toastAge.length ? ` toastarrow" style="animation-delay:-${toastAge[xi]}ms` : '';
    for (const id of ids) {
      const to = mat.querySelector(`.tt-mat .card[data-obj="${CSS.escape(id)}"]`);
      if (!to) continue;
      const b = center(to);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const stop = Math.min(b.r.width, b.r.height) * 0.42;
      const ex = b.x - (dx / len) * stop;
      const ey = b.y - (dy / len) * stop;
      const cx = (a.x + ex) / 2 - (dy / len) * len * 0.18;
      const cy = (a.y + ey) / 2 + (dx / len) * len * 0.18;
      paths += `<path class="tt-arrow ${who} past${fade}" d="M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#tt-head-${who})"/>`;
    }
  });
  svg.innerHTML = `<defs>${['me', 'them']
    .map((w) => `<marker id="tt-head-${w}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="tt-ahead ${w}"/></marker>`)
    .join('')}</defs>${paths}`;
}

/** Texto de pergunta do motor com os custos desenhados ([Fury] vira o ícone; "0 + [x]" vira só "[x]"). */
function promptHtml(text: string): string {
  return rulesHtml(text.replace(/\b0 \+ \[/g, '[').replace(/\[qualquer\]/g, '[A]'));
}

/** Opções da decisão que não aparecem como carta na mesa (viram botões na barra de decisão). */
function offMatOptions(eng: Engine, d: Decision) {
  // ordem de efeitos simultâneos: sempre em lista, com o texto de cada efeito (a mesma carta pode ter dois)
  if (/^Vários efeitos/.test(d.prompt)) return [];
  return d.options.filter((o) => {
    if (o.id === 'end' || o.id === 'pass' || o.id === 'move' || o.id === MANUAL_PAY) return false; // MANUAL_PAY: botão nas runas
    if (!o.obj) return true;
    const ob = eng.objs[o.obj];
    return !ob || !visibleOnMat(eng, ob);
  });
}

function optButtons(eng: Engine, opts: Decision['options'], multi: boolean): string {
  return opts
    .map((o) => {
      const on = selected.includes(o.id);
      const ob = o.obj ? eng.objs[o.obj] : null;
      const thumb = ob && !isHiddenFromView(eng, ob) ? imgTag(ob.code, 'thumb') : '';
      return `<button class="opt${on ? ' on' : ''}${flashOpt === o.id ? ' flash' : ''}" data-opt="${esc(o.id)}" ${o.obj ? `data-hover="${o.obj}"` : ''}>${multi ? `<i class="box">${on ? '✓' : ''}</i>` : ''}${thumb}<span>${promptHtml(o.label)}${o.detail ? `<small class="tt-odet">${rulesHtml(o.detail)}</small>` : ''}</span></button>`;
    })
    .join('');
}

/** Lista completa (agrupada) das opções: o mesmo que dá para fazer clicando na mesa. */
function optListHtml(eng: Engine, d: Decision, head = ''): string {
  const multi = d.max > 1 || d.min === 0;
  const groups = new Map<string, typeof d.options>();
  for (const o of d.options) {
    if (o.id === MANUAL_PAY) continue; // botão próprio nas runas
    const g = o.group || '';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(o);
  }
  return `<div class="tt-optlist${head ? ' forced' : ''}">${head ? `<p class="tt-olh">${esc(head)}</p>` : ''}${[...groups.entries()].map(([g, opts]) => `${g ? `<div class="og">${esc(g)}</div>` : ''}<div class="opts">${optButtons(eng, opts, multi)}</div>`).join('')}</div>`;
}

/** Botão de compartilhar o replay: o link (site) ou o código (offline), preparado antes para o clique só copiar. */
let shareCode: string | null = null;
function replayShareBtn(cfg: any, answers: string[][], cls = ''): string {
  shareCode = prepareReplay(`${cfg?.seed}:${answers.length}`, { cfg, answers, view }, scheduleRender);
  const label = canLink() ? 'Copiar link do replay' : 'Copiar código do replay';
  return `<button class="${cls}" data-act="rlink" ${shareCode ? '' : 'disabled'} title="${canLink() ? 'Quem abrir o link vê a partida inteira, lance a lance' : 'Cole o código em Abrir replay, na tela inicial'}">${label}</button>`;
}
function replayBarHtml(eng: Engine, d: Decision | null): string {
  const r = replay!;
  const n = r.answers.length;
  const next = d && r.pos < n ? r.answers[r.pos] : null;
  const lbl = next ? next.map((id) => d!.options.find((o) => o.id === id)?.label ?? id).join(', ') : '';
  const what = !d ? 'fim da partida' : next ? `${esc(eng.pl[d.player].name)}: ${esc(d.prompt)} → <b>${promptHtml(lbl)}</b>` : `${esc(eng.pl[d.player].name)}: ${esc(d.prompt)} (aqui o arquivo acaba)`;
  return `<div class="tt-dock decision replay">
    <div class="tt-dmain"><span class="tt-dprompt">Replay · lance ${r.pos} de ${n}</span><span class="tt-dsub">${what}</span></div>
    <input type="range" class="tt-rrange" id="rrange" min="0" max="${n}" value="${r.pos}" aria-label="Lance">
    <span class="tt-dbtns">
      <button class="tt-dbtn" data-act="rgo" data-to="0" title="Começo">⏮</button>
      <button class="tt-dbtn" data-act="rgo" data-to="${r.pos - 1}" title="Lance anterior (←)">◀</button>
      <button class="tt-dbtn" data-act="rgo" data-to="${r.pos + 1}" title="Próximo lance (→)">▶</button>
      <button class="tt-dbtn" data-act="rgo" data-to="${n}" title="Fim">⏭</button>
      <button class="tt-dbtn" data-act="flip" title="Ver do outro lado">Girar</button>
      ${replayShareBtn(r.cfg, r.answers, 'tt-dbtn')}
      <button class="tt-dbtn" data-act="rplay" data-mode="human" title="Continuar daqui, os dois no mesmo aparelho">Jogar daqui</button>
      <button class="tt-dbtn" data-act="rplay" data-mode="ai" title="Continuar daqui contra a IA (você é o Jogador 1)">Daqui × IA</button>
      <button class="primary" data-act="rexit">Sair do replay</button>
    </span>
  </div>`;
}

/** Abre um replay (de um relatório, de um arquivo da partida ou da partida atual) no lance `pos`. */
function openReplay(cfg: any, answers: string[][], pos = answers.length, opts: { view?: P; note?: string } = {}) {
  if (net) {
    modal = { title: 'Replay', html: '<p>Saia da sala online antes de abrir um replay.</p>' };
    render();
    return;
  }
  const back = { game, view };
  replay = { cfg, answers, pos: 0, note: opts.note, back };
  aiTimer && clearTimeout(aiTimer);
  aiTimer = null;
  game = Game.load(JSON.stringify({ cfg, answers: [] }));
  view = opts.view ?? 0;
  selected = [];
  moveSel = [];
  modal = null;
  replayGo(pos);
  if (opts.note) modal = { title: 'Nota do relatório', html: `<p>${esc(opts.note)}</p>` };
  render();
}
function replayGo(to: number) {
  if (!replay || !game) return;
  const r = replay;
  to = Math.max(0, Math.min(r.answers.length, to));
  if (to < r.pos) {
    game = Game.load(JSON.stringify({ cfg: r.cfg, answers: r.answers.slice(0, to) }));
  } else {
    for (let i = r.pos; i < to; i++) if (!game.current || !game.answer(r.answers[i])) {
      to = game.answers.length;
      break;
    }
  }
  r.pos = game.answers.length;
  render();
}
function exitReplay(mode?: 'human' | 'ai') {
  if (!replay) return;
  if (mode) {
    // continua a partida daqui (vira uma partida normal salva); ao terminar, volta para a tela inicial
    settings.opponent = mode;
    page = 'setup';
    view = mode === 'ai' ? HUMAN : game?.current?.player ?? 0;
    ai = mode === 'ai' ? newAi() : null;
    handoffPending = false;
    replay = null;
    save();
    render();
    scheduleAi();
    return;
  }
  game = replay.back.game;
  view = replay.back.view;
  replay = null;
  render();
  scheduleAi();
}

/** Conteúdo do relatório: a partida inteira (para refazer no mesmo lance) + as últimas linhas do registro. */
function reportJson(note: string): string {
  // convidado online no meio da partida: só tem a própria visão (não dá para refazer o lance); depois do fim, a
  // partida completa que o anfitrião mandou
  const g = fullGame();
  return JSON.stringify({
    app: 'riftbound-mesa',
    v: 1,
    at: new Date().toISOString(),
    mode: settings.opponent,
    view,
    note,
    ...(g ? { game: JSON.parse(g.serialize()) } : { partial: true, viewState: viewGame()?.state }),
    log: game!.engine.log.slice(-40).map((l) => l.text),
  });
}
function reportHtml(): string {
  return `<div class="tt-report">
    ${
      viewGame() && !fullGame()
        ? '<p>No online, enquanto a partida não acaba, você só tem a sua visão dela (sem a mão e o deck do anfitrião): o arquivo leva a mesa como você vê e o registro, mas não dá para refazer o lance. O anfitrião tem a partida inteira: peça a ele o <b>Relatar problema</b> também. Depois do fim, o seu relatório leva a partida completa.</p>'
        : '<p>Isto guarda a partida inteira até agora. Quem receber o arquivo abre no mesmo lance (tela inicial → <b>Abrir replay</b>) e vê exatamente o que aconteceu.</p>'
    }
    <label for="rnote">O que aconteceu? (opcional)</label>
    <textarea id="rnote" rows="3" placeholder="Ex.: usei o Draven com o Ezreal em jogo e perdi a runa"></textarea>
    <div class="btns"><button class="primary" data-act="rcopy">Copiar</button><button data-act="rdownload">Baixar arquivo</button></div>
    <p class="note" id="rmsg"></p>
    <textarea id="rjson" rows="4" readonly hidden></textarea>
  </div>`;
}
function importHtml(): string {
  return `<div class="tt-report">
    <p>Abra um relatório (ou o arquivo de uma partida) para rever lance a lance.</p>
    <input type="file" id="rfile" accept=".json,.txt,application/json,text/plain">
    <label for="rpaste">Ou cole o conteúdo aqui</label>
    <textarea id="rpaste" rows="4" placeholder='O link do replay, o código rb1:… ou o conteúdo do relatório'></textarea>
    <div class="btns"><button class="primary" data-act="rimport">Abrir</button></div>
    <p class="err" id="rerr"></p>
  </div>`;
}
function importText(text: string): string | null {
  const code = codeFromText(text);
  if (code) {
    void decodeReplay(code)
      .then((d) => openReplay(d.cfg, d.answers, 0, { view: d.view as P }))
      .catch(() => {
        const el = document.getElementById('rerr');
        if (el) el.textContent = 'Não consegui ler este link ou código: confira se copiou inteiro.';
      });
    return null;
  }
  try {
    const o = JSON.parse(text.trim());
    if (o?.partial && !o.game)
      return 'Este relatório veio do convidado de uma partida online, no meio da partida: ele só tem a própria visão (sem a mão e o deck do anfitrião), então não dá para refazer o lance. Peça o relatório do anfitrião (ou abra o replay no Histórico depois do fim).';
    const g = o.game ?? (typeof o.saved === 'string' ? JSON.parse(o.saved) : o.saved) ?? o;
    if (!g?.cfg || !Array.isArray(g.answers)) return 'Não reconheci este arquivo.';
    openReplay(g.cfg, g.answers, g.answers.length, { view: o.view === 1 ? 1 : 0, note: o.note || undefined });
    return null;
  } catch {
    return 'Não consegui ler: confira se colou o conteúdo inteiro.';
  }
}

/**
 * Avisos de ruling na hora da pergunta (ou no painel de confirmar): interações que parecem bug mas são regra. Cada um diz
 * a regra e de onde vem. `optId`: a ação armada (antes de confirmar); sem ele, a ação em andamento (resposta raiz).
 */
const USE_PT: Record<string, string> = { unit: 'unidades', gear: 'gear', spell: 'spells', unitAbility: 'habilidades de unidades', gearAbility: 'habilidades de gear', legendAbility: 'habilidades de lenda', otherAbility: 'outras habilidades' };
function rulingHints(eng: Engine, d: Decision, optId?: string): string[] {
  const out: string[] = [];
  const p = d.player;
  const mine = (code: string) => eng.board().some((o) => o.code === code && o.controller === p);
  // a ação em questão: a armada, ou a que está em andamento (a resposta raiz desta jogada)
  const ra = optId ?? (!d.root && game && game.lastRoot !== null ? game.answers[game.lastRoot]?.[0] : undefined);
  const m = ra ? /^(play|hide|act|actb|acte|equip):([^:]+)(?::(.+))?$/.exec(ra) : null;
  const verb = m?.[1];
  const src = m ? eng.objs[m[2]] ?? null : null;
  const optLabel = optId ? d.options.find((o) => o.id === optId)?.label || '' : '';
  if (!optId) {
    // Ezreal, Prodigy: só reduz custo adicional opcional (pago ao jogar: Accelerate, Repeat, "como custo adicional")
    if (mine('SFD-149') && d.kind === 'confirm' && /pagar/i.test(d.prompt) && !/accelerate|repeat|adicional/i.test(d.prompt))
      out.push('O desconto do Ezreal, Prodigy não vale aqui: ele só reduz custo adicional opcional pago ao jogar uma carta (Accelerate, Repeat, “como custo adicional”). Este pagamento é de um efeito de carta já em jogo (RiftJudge #286, #504).');
    // Deflect: escolher a unidade custa power a mais
    if (d.purpose === 'target' && d.options.some((o) => o.obj && eng.objs[o.obj] && eng.objs[o.obj].controller !== d.player && (eng.kw(eng.objs[o.obj]).deflect || 0) > 0))
      out.push('Unidades com Deflect custam power a mais para serem escolhidas como alvo (o custo sobe ao escolher).');
  }
  // Empower: habilidade ativada que usa a pilha (827.1; 827.1.c.1 "[Custo]: Empower this. Use only if not Empowered.")
  if (src && verb?.startsWith('act')) {
    const ab = verb === 'act' ? (eng.script(src).activated || [])[Number(m![3])] : null;
    if (ab?.empower || /: Empower\b/.test(optLabel))
      out.push('Empower é uma habilidade ativada (827.1): paga o custo e vai para a pilha — o oponente pode responder, e a carta só fica Empowered quando a habilidade resolver. Não escolhe alvo (827.1.b.1) e só pode ser usada se a carta ainda não estiver Empowered.');
  }
  // Deploy: só em campo de batalha; morre quando o oponente segura o campo (texto lembrete das cartas)
  if ((src && verb === 'play' && eng.kw(src).deploy) || (!optId && /\(Deploy\)/.test(d.prompt)))
    out.push('Deploy: este gear só pode ser jogado num campo de batalha, e morre quando o oponente segura (hold) aquele campo.');
  // unit gear: é unidade e gear ao mesmo tempo
  const ug = (o: Obj | null | undefined) => !!o && eng.isUnitGear(o);
  if ((src && ug(src) && verb === 'play') || (!optId && d.options.some((o) => o.obj && ug(eng.objs[o.obj]))))
    out.push('Unit gear é unidade e gear ao mesmo tempo: conta para efeitos que pedem unidade e para efeitos que pedem gear (pode ser escolhido por qualquer um dos dois).');
  // Neeko, Blending In: as lendas extras só entram com ela
  if (src?.code === 'RAD-167' && verb === 'play')
    out.push('Neeko, Blending In: as 3 lendas extras não começam em jogo. Ao jogar a Neeko você escolhe uma delas, que fica na sua zona de lenda só enquanto a Neeko estiver no tabuleiro.');
  // Flow: jogada do descarte; banida ao sair da pilha (829.1.b)
  if (verb === 'play' && m?.[3] === 'flow')
    out.push('Flow: você joga do descarte pelo custo de Flow; quando a carta sair da pilha (resolvendo ou anulada), ela é banida em vez de voltar ao descarte (829.1.b).');
  // Endless Riches: o que iria para o descarte (de qualquer lugar menos do deck principal) é banido
  if (mine('VEN-022') && (verb === 'play' || (!optId && !d.root)))
    out.push('Endless Riches em jogo: cartas suas que iriam para o descarte vindas de qualquer lugar menos do deck principal são banidas (spells jogados, unidades que morrem, cartas descartadas). Burn (topo do deck) ainda vai para o descarte.');
  // recursos restritos (Renekton, Butcher of the Sands; Mordekaiser, Iron Revenant; Ornn...): só pagam o que o texto permite
  const restricted = (eng.pl[p].pool.only || []).filter((r) => r.energy || Object.values(r.power).some((n) => n));
  if (restricted.length && (m || d.kind === 'confirm'))
    out.push(`Parte do seu pool é restrita: ${restricted.map((r) => `${r.energy ? `${r.energy} energia` : ''}${r.energy && Object.values(r.power).some((n) => n) ? ' + ' : ''}${Object.values(r.power).reduce((a, n) => a + n, 0) ? `${Object.values(r.power).reduce((a, n) => a + n, 0)} power` : ''} só para ${r.uses.map((u) => USE_PT[u] || u).join(' ou ')}`).join('; ')}. Esse recurso não paga outras coisas, mesmo estando no pool.`);
  else if (src && verb?.startsWith('act') && (src.code === 'VEN-141' || src.code === 'RAD-143'))
    out.push(src.code === 'VEN-141' ? 'Renekton, Butcher of the Sands: a energia que ele adiciona só paga unidades ou habilidades ativadas de unidades.' : 'Mordekaiser, Iron Revenant: o power que ele adiciona só paga unidades ou gear.');
  return out;
}

/** Começo do seu turno, antes de você agir: o que o outro jogador fez no turno dele (como o resumo do LoR). */
function turnRecap(eng: Engine, d: Decision): string {
  if (d.kind !== 'action' || eng.active !== d.player) return '';
  const me = d.player;
  const other = (1 - me) as P;
  if (eng.log.some((l) => l.turn === eng.turn && l.player === me && (l.meta || / → /.test(l.text)))) return '';
  const prev = eng.log.filter((l) => l.turn === eng.turn - 1 && l.player === other);
  if (!prev.length) return '';
  const plays = prev.filter((l) => l.meta?.kind === 'play').map((l) => eng.name(l.meta!.obj));
  const moves = prev.filter((l) => / → /.test(l.text) && !l.meta).length;
  const pts = prev.reduce((n, l) => n + Number(/ganha (\d+) ponto/.exec(l.text)?.[1] || 0), 0);
  const parts: string[] = [];
  if (plays.length) parts.push(`jogou ${plays.slice(0, 4).join(', ')}${plays.length > 4 ? ` e mais ${plays.length - 4}` : ''}`);
  if (moves) parts.push(`moveu ${moves} ${moves > 1 ? 'vezes' : 'vez'}`);
  if (pts) parts.push(`+${pts} ponto${pts > 1 ? 's' : ''}`);
  if (!parts.length) return '';
  return `<span class="tt-dlast them" title="Veja o histórico à esquerda e o registro para os detalhes">No turno de ${esc(eng.pl[other].name)}: ${linkCards(eng, parts.join(' · '))}</span>`;
}

/** Painel da carta armada: custo, ação, texto, o que vem depois, avisos de ruling e Confirmar/Cancelar. */
function armPanelHtml(eng: Engine, d: Decision): string {
  if (!armed) return '';
  const o = eng.objs[armed.id];
  if (!o) return '';
  const cd = cardData(o.code);
  const acts = rootActs(armed.id);
  const opt = armed.opt;
  const info = opt ? armNext(opt) : null;
  const rows =
    acts.length > 1 || !opt
      ? `<div class="tt-armopts">${acts
          .map((x) => `<button class="tt-armopt${x.id === opt ? ' on' : ''}" data-act="arm" data-id="${o.id}" data-opt="${esc(x.id)}">${x.id.startsWith('play:') ? costHtml(o.code, eng, o) : ''}<span>${promptHtml(x.label)}</span></button>`)
          .join('')}</div>`
      : '';
  const chosen = acts.find((x) => x.id === opt);
  const cost = chosen?.id.startsWith('play:') ? `<span class="tt-armcost">${costHtml(o.code, eng, o)}</span>` : '';
  const what = chosen ? `<p class="tt-armwhat">${cost}${promptHtml(chosen.label)}</p>` : '';
  const text = `<div class="tt-armtext">${rulesHtml(cd.text) || '<span class="muted">sem texto</span>'}${cd.effectText && (chosen?.id.startsWith('equip:') || (o.zone === 'board' && !o.attachedTo)) ? `<br><b>Quando equipado:</b> ${rulesHtml(cd.effectText)}` : ''}</div>`;
  let next = '';
  if (info) {
    const n = info.objs.size + info.locs.size;
    next = info.none
      ? `<p class="tt-armnext">Sem outras escolhas: ao confirmar, ${chosen?.id.startsWith('hide:') ? 'a carta fica escondida' : 'vai para a pilha'}.</p>`
      : `<p class="tt-armnext">Depois: ${promptHtml(info.prompt)}${n ? ` <b>— ${n} ${n > 1 ? 'opções acesas' : 'opção acesa'} na mesa</b> (clique numa para escolher direto)` : ''}</p>`;
  }
  const hints = opt ? rulingHints(eng, d, opt) : [];
  const hintHtml = hints.map((h) => `<p class="tt-ruling">⚖ ${esc(h)}</p>`).join('');
  const go = opt ? `<button class="primary" data-act="armgo">${armVerb(opt)}<kbd>Enter</kbd></button>` : '';
  const up = [...frame.armObjs].some((id) => {
    const t = eng.objs[id];
    return !!t && t.controller === view && (t.zone === 'legend' || t.zone === 'champion' || (t.zone === 'board' && t.loc?.t === 'base'));
  }) || frame.armLocs.has(`base:${view}`);
  return `<div class="tt-arm${up ? '' : ' down'}" role="dialog" aria-label="Confirmar ${esc(cd.name)}">
    <div class="tt-armhead">${artUrl(o.code) ? `<img src="${artUrl(o.code)}" alt="" draggable="false" data-hover="${o.id}">` : ''}<div><b class="tt-armname">${esc(cd.name)}</b>${what}</div></div>
    ${rows}${text}${next}${hintHtml}
    <div class="btns">${go}<button data-act="disarm">Cancelar <kbd>Esc</kbd></button>${touchUi() ? '<button data-act="armzoom">Ver carta</button>' : ''}</div>
  </div>`;
}

/** Lista ordenável dos efeitos simultâneos: a ordem em que vão resolver (o 1º resolve primeiro). */
function trigListHtml(eng: Engine, d: Decision): string {
  const key = decKey();
  if (!trigOrder || trigOrder.key !== key || trigOrder.items.length !== d.options.length) trigOrder = { key, items: [...(d.options as Option[])].reverse() };
  const items = trigOrder.items;
  const n = items.length;
  const rows = items
    .map((o, i) => {
      const ob = o.obj ? eng.objs[o.obj] : null;
      const thumb = ob && !isHiddenFromView(eng, ob) ? imgTag(ob.code, 'thumb') : '';
      return `<li class="tt-trow${trigDrag?.i === i ? ' drag' : ''}" data-ti="${i}" ${o.obj ? `data-hover="${o.obj}"` : ''}><b class="tt-tn">${i + 1}º</b><span class="tt-th" title="Arraste para mudar a ordem">⠿</span>${thumb}<span class="tt-tl">${promptHtml(o.label)}${o.detail ? `<small class="tt-odet">${rulesHtml(o.detail)}</small>` : ''}</span><span class="tt-tbtns"><button class="tt-dbtn" data-act="trigup" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Resolver antes">↑</button><button class="tt-dbtn" data-act="trigdown" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} aria-label="Resolver depois">↓</button></span></li>`;
    })
    .join('');
  const below = eng.chain.length ? ` Só depois deles resolve o que já estava na pilha (${eng.chain.length}).` : '';
  const seq = items.map((o) => esc(normTrig(o.label).replace(/^[^:]+: /, ''))).slice(0, 4);
  return `<div class="tt-optlist forced tt-trig" role="dialog" aria-label="Ordem dos efeitos">
    <p class="tt-olh"><b>Vários efeitos seus ao mesmo tempo: escolha a ordem.</b> A lista mostra a ordem em que eles vão <b>resolver</b> — o 1º resolve primeiro. Para isso eles entram na pilha de baixo para cima: o último da lista entra primeiro e fica embaixo.${below} Arraste as linhas ou use ↑ ↓.</p>
    <ol class="tt-tlist">${rows}</ol>
    <p class="tt-tsum">Resolve: ${seq.map((x, i) => `<b>${i + 1}º</b> ${x}`).join(' → ')}${n > 4 ? ' → …' : ''}</p>
    <div class="btns"><button class="primary" data-act="trigok">Confirmar ordem <kbd>Enter</kbd></button></div>
  </div>`;
}

/** Barra de decisão na mesa (entre os campos e a sua base): o pedido, os botões que não são cartas e o botão grande. */
function dockHtml(eng: Engine, d: Decision | null): string {
  if (!game) return '';
  if (replay) return replayBarHtml(eng, d);
  const undo = `<button class="tt-dbtn ico-undo" data-act="undo" ${game.answers.length ? '' : 'disabled'} title="${online() ? 'Desfazer (Z): depois que o oponente agiu, vira um pedido que ele aceita ou recusa' : 'Desfazer (Z)'}"><span class="lbl">Desfazer</span></button>${
    online() && !watching() ? `<button class="tt-dbtn tt-emotebtn${emoteOpen ? ' on' : ''}" data-act="emotetog" title="Emotes (E)">😊</button><button class="tt-dbtn ico-chat${chatOpen ? ' on' : ''}" data-act="chattog" title="Chat rápido"><span class="lbl">Chat</span></button>` : ''
  }`;
  if (eng.winner !== null || !d) {
    const w = eng.winner;
    const again = online()
      ? tourEndButtons(eng, true) ?? (net!.role === 'host' ? '<button class="primary" data-act="rematch">Revanche</button>' : '')
      : challengeOf(game)
        ? '<button class="primary" data-act="chretry">Tentar de novo</button>'
        : ladderEndButtons(game.cfg, true) ?? '<button class="primary" data-act="newgame">Nova partida</button>';
    return `<div class="tt-dock decision over"><div class="tt-dmain"><span class="tt-dprompt">${w !== null ? `${esc(eng.pl[w].name)} venceu` : 'Fim de jogo'}</span><span class="tt-dsub">${esc(eng.winReason || '')} · ${eng.pl[0].points} × ${eng.pl[1].points} · ${eng.turn} turnos</span></div><span class="tt-dbtns">${overlayHidden === 'end' ? '<button class="tt-dbtn" data-act="showoverlay">Resultado</button>' : ''}${again}</span></div>`;
  }
  const last = eng.log.filter((l) => !l.text.startsWith('──')).slice(-1)[0];
  const lastHtml = last ? `<span class="tt-dlast ${last.player === undefined ? '' : last.player === view ? 'me' : 'them'}">${linkCards(eng, last.text)}</span>` : '';
  if (isOtherTurn())
    return `<div class="tt-dock decision thinking">${stackHtml(eng)}<span class="tt-dprompt wait"><span class="dots"><i></i><i></i><i></i></span>${challengeHold(game) ? 'Desafio encerrado' : `${esc(eng.pl[d.player].name)} ${online() ? 'está jogando' : 'está pensando'}`}</span>${lastHtml}${netNote ? `<span class="err">${esc(netNote)}</span>` : ''}<span class="tt-dbtns">${watching() || replay ? '' : undo}<button class="tt-dbtn ico-menu tt-sidebtn" data-act="sidetoggle" title="Registro e menu"><span class="lbl">Registro</span></button></span></div>`;
  if (handoffPending)
    return `<div class="tt-dock decision"><span class="tt-dprompt">Vez de ${esc(eng.pl[d.player].name)}</span><span class="tt-dsub">passe o aparelho</span></div>`;
  const multi = d.max > 1 || d.min === 0;
  const endOpt = !multi ? d.options.find((x) => x.id === 'pass') || d.options.find((x) => x.id === 'end') : undefined;
  const rootish = d.root && (d.kind === 'action' || d.kind === 'focus' || d.kind === 'priority');
  let prompt: string;
  let sub = '';
  if (armed && !moveSel.length) {
    const ao = eng.objs[armed.id];
    const info = armed.opt ? armNext(armed.opt) : null;
    const lit = info ? info.objs.size + info.locs.size : 0;
    prompt = armed.opt ? `${armVerb(armed.opt)} ${esc(eng.name(ao))}?` : `${esc(eng.name(ao))}: escolha a ação`;
    sub = armed.opt
      ? `clique de novo na carta ou em ${armVerb(armed.opt)} para confirmar${lit ? ' · ou clique direto num alvo aceso' : ''} · Esc ou clique fora cancela`
      : 'escolha no painel o que fazer com a carta · Esc cancela';
  } else if (moveSel.length) {
    prompt = `Mover ${moveSel.length === 1 ? esc(eng.name(moveSel[0])) : `${moveSel.length} unidades`}`;
    sub = frame.dests.size ? 'clique no destino aceso · clique em outra unidade para levar junto (duplo clique: todas dali) · Esc cancela' : 'essas unidades não têm destino em comum';
  } else if (rootish) {
    const mineSeat = vsAi() || online();
    const who = eng.active === d.player ? (mineSeat ? 'Sua vez' : `Vez de ${esc(eng.pl[d.player].name)}`) : `Turno de ${esc(eng.pl[eng.active].name)}`;
    const you = mineSeat ? 'você tem' : `${esc(eng.pl[d.player].name)} tem`;
    const other = esc(eng.pl[1 - d.player].name);
    const top = eng.chain[eng.chain.length - 1];
    const sd = eng.showdown;
    if (d.kind === 'action') {
      prompt = `${who} · fase principal`;
      sub = 'jogue cartas acesas (clique ou arraste), mova unidades (clique nela e no destino) ou encerre o turno';
    } else if (d.kind === 'priority') {
      prompt = `Pilha aberta · ${mineSeat ? 'responder?' : `${esc(eng.pl[d.player].name)} responde?`}`;
      sub = `${eng.active !== d.player ? `${who} · ` : ''}com a pilha aberta só entra Reaction · ${eng.prioPasses ? `${other} passou: se você passar, ${esc(top?.label || '')} resolve` : `se você passar, ${other} ainda pode responder; se ele passar também, o de cima resolve`}`;
    } else {
      const where = sd ? esc(eng.name(eng.bfs[sd.bf].objId)) : '';
      prompt = `${sd?.combat ? 'Combate' : 'Showdown'} em ${where} · ${mineSeat ? 'seu Focus' : `Focus de ${esc(eng.pl[d.player].name)}`}`;
      const ends = sd?.combat ? 'vem o dano de combate' : 'o showdown acaba e quem estiver sozinho no campo fica com ele';
      sub = `${eng.active !== d.player ? `${who} · ` : ''}${you} o Focus: pode jogar Action ou Reaction · ${sd?.passes ? `${other} passou: se passar agora, ${ends}` : `se passar, o Focus vai para ${other}; se os dois passarem seguidos, ${ends}`}`;
    }
  } else {
    prompt = promptHtml(d.prompt);
    if (multi) sub = `escolha ${d.min === d.max ? d.min : `de ${d.min} a ${d.max}`}`;
    else if (d.options.some((o) => o.obj && eng.objs[o.obj] && visibleOnMat(eng, eng.objs[o.obj]))) sub = 'clique numa carta acesa';
    if (d.purpose === 'target') sub = `${sub ? sub + ' · ' : ''}o alvo é escolhido agora e conferido de novo quando resolver`;
    if (isTrigQ(d)) prompt = 'Vários efeitos ao mesmo tempo: escolha a ordem';
    if (/^Distribuir dano/.test(d.prompt)) sub = 'regra do combate: cada unidade recebe dano letal antes de passar para a próxima (Tank primeiro, Backline por último); o que sobrar fica na última';
    else if (isTrigQ(d)) sub = 'monte a lista na ordem em que quer que resolvam (o 1º resolve primeiro) e confirme';
  }
  // de onde vem a pergunta: a carta que está resolvendo ou a jogada em andamento
  let origin = '';
  if (!d.root) {
    const ri = (eng as any).resolvingItem as { label: string; controller: P; cardId?: string; sourceId: string } | undefined;
    const ra = game.lastRoot !== null ? game.answers[game.lastRoot]?.[0] : undefined;
    const m = ra ? /^(?:play|act|actb|acte|equip|hide|emp):([^:]+)/.exec(ra) : null;
    const srcId = ri ? ri.cardId || ri.sourceId : m ? m[1] : null;
    const src = srcId ? eng.objs[srcId] : null;
    const what = ri ? `Resolvendo: ${esc(ri.label)}` : m ? `${ra!.startsWith('play') ? 'Jogando' : ra!.startsWith('hide') ? 'Escondendo' : ra!.startsWith('equip') ? 'Equipando' : 'Ativando'} ${src ? esc(eng.name(src)) : ''}` : '';
    if (what) origin = `<span class="tt-origin" ${src ? `data-hover="${src.id}"` : ''}>${src && artUrl(src.code) ? `<img src="${artUrl(src.code)}" alt="" draggable="false">` : ''}<span>${what}</span></span>`;
  }
  const off = moveSel.length || armed ? [] : offMatOptions(eng, d);
  const btns = off.length <= 8 ? optButtons(eng, off, multi) : '';
  const confirm = multi ? `<button class="primary" data-act="confirm" ${selected.length < d.min || selected.length > d.max ? 'disabled' : ''}>Confirmar (${selected.length})</button>` : '';
  const cancel = moveSel.length ? '<button class="tt-dbtn ico-x" data-act="clearmove" title="Cancelar (Esc)"><span class="lbl">Cancelar</span></button>' : armed ? '<button class="tt-dbtn ico-x" data-act="disarm" title="Cancelar (Esc)"><span class="lbl">Cancelar</span></button>' : game.canCancel ? '<button class="tt-dbtn ico-x" data-act="cancel" title="Cancelar (Esc)"><span class="lbl">Cancelar</span></button>' : '';
  const err = game.error || netNote ? `<span class="err">${esc(netNote || game.error || '')}</span>` : '';
  // o botão diz o que acontece ao apertar (como no LoR)
  let next = '';
  if (endOpt?.id === 'end') next = `vez de ${esc(eng.pl[1 - d.player].name)}`;
  else if (endOpt && d.kind === 'priority') next = eng.prioPasses ? 'resolve o de cima' : `${esc(eng.pl[1 - d.player].name)} responde`;
  else if (endOpt && d.kind === 'focus') next = eng.showdown?.passes ? (eng.showdown.combat ? 'dano de combate' : 'fim do showdown') : 'Focus para o outro';
  const big = endOpt
    ? `<button class="tt-endbtn${endOpt.id === 'pass' ? ' pass' : ''}" data-opt="${esc(endOpt.id)}"><span class="tt-ebm">${endOpt.id === 'pass' ? 'Passar' : 'Encerrar<span class="lbl"> turno</span>'}<kbd>Espaço</kbd></span>${next ? `<span class="tt-ebs">${next}</span>` : ''}</button>`
    : '';
  const canOracle = !!(eng.chain.length || eng.showdown?.combat);
  const eye = !canOracle
    ? ''
    : viewGame()
      ? '<button class="tt-dbtn ico-eye" disabled title="Prévia desligada para o convidado: ela precisa simular a partida com cartas que você não vê (a mão e o deck do anfitrião). A previsão de combate em cima do campo continua."><span class="lbl">Prévia</span></button>'
      : `<button class="tt-dbtn ico-eye${oracleOn ? ' on' : ''}" data-act="oracle" title="Prévia do resultado se todos passarem (V)"><span class="lbl">Prévia</span></button>`;
  const orc = frame.oracle;
  const oline = !orc
    ? ''
    : orc.alts.length
      ? `<span class="tt-oracle alts" title="${esc(`Simulação: a pilha resolve e todos passam. No caminho ${orc.chooser !== undefined ? eng.pl[orc.chooser].name : 'alguém'} faz uma escolha que muda o resultado: ${orc.alts.map((x) => `${x.label} → ${x.summary.join(', ')}`).join(' | ')}`)}">Se todos passarem, depende da escolha de ${esc(orc.chooser !== undefined ? eng.pl[orc.chooser].name : '—')}: ${orc.alts.map((x) => `<b>${esc(x.label)}</b> → ${esc(x.summary.join(', '))}`).join(' <i>|</i> ')}</span>`
      : `<span class="tt-oracle" title="Simulação: a pilha resolve e todos passam; escolhas automáticas podem ser diferentes das reais">Se todos passarem: ${esc(orc.summary.join(' · '))}</span>`;
  const list = `<button class="tt-dbtn ico-list${showAllOpts ? ' on' : ''}" data-act="optlist" title="Todas as opções desta decisão em lista"><span class="lbl">Opções</span></button>`;
  const longP = prompt.replace(/<[^>]+>/g, '').length > 44;
  return `<div class="tt-dock decision${rootish && !moveSel.length && !armed ? '' : ' ask'}${armed ? ' arming' : ''}${longP ? ' longp' : ''}">
    ${isTrigQ(d) ? trigListHtml(eng, d) : showAllOpts ? optListHtml(eng, d) : armPanelHtml(eng, d)}
    ${stackHtml(eng)}${origin}
    <div class="tt-dmain"><span class="tt-dprompt">${prompt}</span>${sub ? `<span class="tt-dsub">${sub}</span>` : ''}${err}${uiHint ? `<span class="tt-hint">${uiHint}</span>` : ''}${(() => {
      const h = !d.root ? rulingHints(eng, d).join(' ') : '';
      return h ? `<span class="tt-ruling" title="${esc(h)}">⚖ ${esc(h)}</span>` : '';
    })()}${oline || (rootish && !moveSel.length && !armed ? turnRecap(eng, d) || lastHtml : '')}</div>
    ${btns || off.length > 8 ? `<div class="tt-dopts">${btns || `<span class="tt-dsub">${off.length} opções: abra a lista</span>`}</div>` : ''}
    <span class="tt-dbtns">${overlayHidden === decKey() ? '<button class="primary" data-act="showoverlay">Voltar à escolha</button>' : ''}${confirm}${cancel}${eye}${undo}${list}<button class="tt-dbtn ico-help" data-act="guide" title="Como funciona (?)"><span class="lbl">?</span></button><button class="tt-dbtn ico-menu tt-sidebtn" data-act="sidetoggle" title="Registro e menu"><span class="lbl">Registro</span></button></span>
    ${big}
  </div>`;
}

function ctxMenuHtml(eng: Engine): string {
  if (!ctxMenu) return '';
  const o = eng.objs[ctxMenu.obj];
  if (!o) return '';
  const items: string[] = [];
  if (frame.movable.has(o.id)) items.push(`<button data-act="movesel" data-id="${o.id}">Mover</button>`);
  for (const x of optionsFor(o.id))
    items.push(ROOT_ACT.test(x.id) && game?.current?.root ? `<button data-act="arm" data-id="${o.id}" data-opt="${esc(x.id)}">${esc(x.label)}</button>` : `<button data-opt="${esc(x.id)}">${esc(x.label)}</button>`);
  if (!items.length) return '';
  // ctxMenu está em pixels da tela; o menu, em pixels de CSS (zoom das telas grandes, zoom.ts)
  const f = pageZoom();
  const left = Math.min(ctxMenu.x / f, window.innerWidth / f - 260);
  const top = Math.min(ctxMenu.y / f, window.innerHeight / f - 40 - items.length * 38);
  return `<div class="tt-ctx" style="left:${left}px;top:${Math.max(8, top)}px"><div class="tt-ctxh">${esc(cardData(o.code).name)}</div>${items.join('')}</div>`;
}

function modalHtml(): string {
  return modal ? `<div class="modal" data-act="closemodal"><div class="mbox" role="dialog"><h3>${esc(modal.title)}</h3><div class="mbody">${modal.html}</div><button data-act="closemodal">Fechar</button></div></div>` : '';
}

function gameHtml(): string {
  const eng = game!.engine;
  const d = game!.current;
  const top: P = (1 - view) as P;
  frame = computeFrame(eng, d);
  const mat = matAttrs(currentMat(gameTrackId()));
  return `<div class="tt${isOtherTurn() ? ' waiting' : ''}${moveSel.length ? ' moving' : ''}${sideOpen ? ' sideopen' : ''}">
    <main class="tt-mat${mat.cls}"${mat.style ? ` style="${mat.style}"` : ''}>
      ${railHtml(eng, view, 'left')}${railHtml(eng, top, 'right')}
      ${handRowHtml(eng, top, true)}
      ${homeRowHtml(eng, top, true)}
      <section class="tt-bfs" style="--nbf:${eng.bfs.length}">${eng.bfs.map((_, i) => bfZoneHtml(eng, i)).join('')}${(updateToasts(eng), playSounds(eng), toastsHtml(eng))}${turnBannerHtml(eng)}</section>
      ${dockHtml(eng, d)}
      ${homeRowHtml(eng, view, false)}
      ${handRowHtml(eng, view, false)}
      <svg class="tt-arrows" id="tt-arrows" aria-hidden="true"></svg>
      ${challengeOf(game) && !replay ? challengeHudHtml(game!) : ''}
      ${overlayHtml(eng, d)}
      ${online() ? netWarnHtml(eng) + undoAskHtml(eng) + chatBubblesHtml() + chatPopHtml() + emotePopHtml() : ''}
      <div class="tt-peek" id="tt-peek" aria-hidden="true"></div>
    </main>
    ${sideHtml(eng, d)}
  </div>
  ${ctxMenuHtml(eng)}
  ${zoomHtml(eng)}
  ${modalHtml()}`;
}

/** Depois de redesenhar: cartas que mudaram de lugar entram com animação; exaurir gira; dano treme. Efeitos novos:
 *  ficar Empowered (estouro de brilho; o brilho fica pelo CSS enquanto durar), Bomb que morre explode, gear que vira
 *  unidade, Burn (cartas voando do deck para o descarte) e Predict (o deck pisca). Só visual: nada espera a animação, e
 *  com prefers-reduced-motion nada é criado (o CSS já desliga as animações das classes). */
let motionKeys = new Map<string, string>();
let motionGame: Game | null = null;
let motionLog = 0;
const calmMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function fxAt(cls: string, r0: DOMRect, html = '', ms = 900, style = '') {
  const r = zRect(r0);
  const el = document.createElement('div');
  el.className = `tt-fx ${cls}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;${style}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function pileOf(p: P, kind: 'deck' | 'trash'): HTMLElement | null {
  const row = `.tt-handrow.${p === view ? 'bottom' : 'top'}`;
  return document.querySelector<HTMLElement>(kind === 'trash' ? `.tt-mat [data-trash="${p}"] .tt-pilecard` : `.tt-mat ${row} .tt-pile.deck .tt-pilecard`);
}
interface Seen {
  r: DOMRect;
  bomb: boolean;
  unit: boolean;
  art: string;
}
function animateArrivals(before: Map<string, Seen> = new Map()) {
  if (!game) return;
  const eng = game.engine;
  const fresh = motionGame !== game;
  const next = new Map<string, string>();
  for (const o of Object.values(eng.objs))
    next.set(o.id, `${o.zone}|${o.loc ? (o.loc.t === 'bf' ? 'b' + o.loc.i : 'h' + o.loc.p) : ''}|${o.attachedTo || ''}|${o.exhausted ? 1 : 0}|${o.damage}|${o.empowered ? 1 : 0}|${o.zone === 'board' && eng.isUnit(o) ? 1 : 0}`);
  const calm = calmMotion();
  if (!fresh) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.tt-mat [data-obj]'))) {
      const id = el.dataset.obj!;
      const prev = motionKeys.get(id);
      const now = next.get(id);
      if (!now || prev === now) continue;
      if (prev === undefined) {
        el.classList.add('arrive');
        continue;
      }
      const [pz, pl, pa, pe, pd, pemp, pu] = prev.split('|');
      const [nz, nl, na, ne, nd, nemp, nu] = now.split('|');
      if (pz !== nz || pl !== nl || pa !== na) el.classList.add('arrive');
      else if (pemp === '0' && nemp === '1') el.classList.add('empflash');
      else if (pu === '0' && nu === '1' && nz === 'board') el.classList.add('gearunit');
      else if (pe !== ne) el.classList.add(ne === '1' ? 'tap' : 'untap');
      else if (Number(nd) > Number(pd)) {
        el.classList.add('hit');
        // o dano sobe sobre a carta
        if (!calm) fxAt('dmgpop', el.getBoundingClientRect(), `<b>−${Number(nd) - Number(pd)}</b>`, 1100);
      }
    }
    if (!calm) {
      for (const [id, b] of before) {
        const o = eng.objs[id];
        if (o && o.zone === 'board') continue;
        // Bomb que saiu do tabuleiro: explode onde estava
        if (b.bomb) fxAt('boom', b.r, '<i></i><b>BOOM</b>', 900);
        // unidade que morreu (foi do tabuleiro para o descarte, ou banida no lugar — Endless Riches): a arte se parte
        else if (b.unit && (!o || o.zone === 'trash' || o.zone === 'banish') && motionKeys.get(id)?.startsWith('board|')) {
          const bg = b.art ? `background-image:url(${JSON.stringify(b.art).slice(1, -1)})` : '';
          fxAt('shatter', b.r, `<i class="l" style="${bg}"></i><i class="r" style="${bg}"></i>`, 1000);
        }
      }
      // Burn (e o que mais for do topo do deck direto para o descarte): cartas voando do deck para o descarte
      const burned: Record<number, number> = { 0: 0, 1: 0 };
      for (const o of Object.values(eng.objs)) {
        const prev = motionKeys.get(o.id);
        if (prev && prev.startsWith('mainDeck|') && o.zone === 'trash') burned[o.owner]++;
      }
      for (const p of [0, 1] as P[]) {
        const n = burned[p];
        if (!n) continue;
        const a = pileOf(p, 'deck');
        const b = pileOf(p, 'trash');
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        for (let k = 0; k < Math.min(n, 6); k++)
          fxAt('fly', ra, '', 1000 + k * 90, `--dx:${zpx(rb.left - ra.left)}px;--dy:${zpx(rb.top - ra.top)}px;animation-delay:${k * 90}ms`);
        fxAt('pilenote burn', rb, `<b>Burn ${n}</b>`, 1500);
      }
      // Predict: o deck de quem fez pisca (olhou o topo)
      if (motionLog <= eng.log.length)
        for (const l of eng.log.slice(motionLog)) {
          const mt = /faz Predict (\d+)(?: e recicla (\d+))?/.exec(l.text);
          if (!mt || l.player === undefined) continue;
          const a = pileOf(l.player, 'deck');
          if (a) fxAt('pilenote predict', a.getBoundingClientRect(), `<b>Predict ${mt[1]}</b>${mt[2] ? `<small>recicla ${mt[2]}</small>` : ''}`, 1600);
        }
    }
  }
  motionKeys = next;
  motionGame = game;
  motionLog = eng.log.length;
}

/** Assento na tela inicial com o deck escolhido (capa, situação, lista). */
function seatHtml(p: 0 | 1, reports: ReturnType<typeof checkDeck>[]): string {
  const id = settings.decks[p];
  const d = acc.deckById(id);
  const r = reports[p];
  const sd = id.startsWith('my:') ? acc.getDeck(id.slice(3)) : null;
  const lg = cardData(d.legend);
  const ch = cardData(d.champion);
  const isAi = p === 1 && settings.opponent === 'ai';
  const who = settings.opponent === 'online' ? 'Jogador' : isAi ? 'Adversário' : `Jogador ${p + 1}`;
  const bans = r.banned.length
    ? `<p class="${settings.format === 'padrao' ? 'err' : 'note'}">Banidas no Padrão: ${r.banned.map(esc).join(', ')}${settings.format === 'casual' ? ' (liberadas no Casual)' : ''}</p>`
    : '';
  const errs = r.errors.length ? `<p class="err">${r.errors.map(esc).join('<br>')}</p>` : '';
  const list = [[d.champion, 1] as [string, number], ...d.main]
    .map(([c, n]) => `<li><span>${n}×</span> ${esc(cardData(c).name)}${isImplemented(c) ? '' : ' <em>(sem efeito)</em>'}</li>`)
    .join('');
  const sr = sd ? acc.deckRecord(sd) : null;
  const rec = sr && sr.g ? `<span class="rec" title="Vitórias e derrotas com este deck">${sr.w}V ${sr.l}D</span>` : '';
  return `<section class="seat mz${p === 1 ? ' opp' : ''}" aria-label="${who}">
    <div class="seat-top"><span class="seat-who">${who}</span>${isAi ? `<span class="seat-name">IA</span>${aiLevelHtml()}` : `<input id="name${p}" value="${esc(settings.names[p])}" maxlength="20" aria-label="Nome do ${who}">`}</div>
    <button type="button" class="cover-btn" data-act="pickdeck" data-seat="${p}" aria-label="Trocar o deck de ${esc(who)}">${coverArt(d.legend, d.champion, sd?.cover)}<span class="cover-swap">Trocar deck</span></button>
    <div class="seat-deck"><b>${esc(d.name)}</b>${rec}
      <span class="muted">${esc(lg.name)} · campeão ${esc(ch.name)} · ${deckSize(d)} cartas</span></div>
    ${bans}${errs}
    <details class="seat-list"><summary>Ver lista e campos</summary>
      <p class="muted small">Campos: ${d.battlefields.map((c) => esc(cardData(c).name)).join(', ')}</p>${d.extraLegends?.length ? `<p class="muted small">Lendas extras (Neeko): ${d.extraLegends.map((c) => esc(cardData(c).name)).join(', ')}</p>` : ''}
      <ul class="dl">${list}</ul></details>
  </section>`;
}

/** Escolha de deck: capas dos starters e dos decks da conta. */
let pickSeat: 0 | 1 | null = null;
function pickerHtml(): string {
  if (pickSeat === null) return '';
  const sel = settings.decks[pickSeat];
  const choices = acc.deckChoices();
  const item = (c: acc.DeckChoice) => {
    const sd = c.id.startsWith('my:') ? acc.getDeck(c.id.slice(3)) : null;
    const legend = c.deck?.legend ?? sd?.legend ?? null;
    const champ = c.deck?.champion ?? sd?.champion ?? null;
    const sr = sd ? acc.deckRecord(sd) : null;
    const rec = sr && sr.g ? ` · ${sr.w}V ${sr.l}D` : '';
    const sub = `${legend ? esc(cardData(legend).name) : 'Sem lenda'}${rec}`;
    if (c.ok)
      return `<button type="button" class="pick${c.id === sel ? ' on' : ''}" data-act="setdeck" data-deck="${c.id}" aria-pressed="${c.id === sel}">${coverArt(legend, champ, sd?.cover)}<span class="pkname">${esc(c.name)}</span><span class="pksub">${sub}</span></button>`;
    const v = sd ? acc.validate(sd) : null;
    return `<div class="pick off">${coverArt(legend, champ, sd?.cover)}<span class="pkname">${esc(c.name)}</span><span class="pksub err">${v ? `${v.errors.length} pendência${v.errors.length > 1 ? 's' : ''}` : 'Incompleto'}</span>${sd ? `<button type="button" data-act="editdeck" data-deck="${sd.id}">Completar</button>` : ''}</div>`;
  };
  const group = (g: 'Starters' | 'Meus decks') => choices.filter((c) => c.group === g).map(item).join('');
  const mine = group('Meus decks');
  const who = settings.opponent === 'ai' && pickSeat === 1 ? 'da IA' : settings.opponent === 'online' ? 'para jogar' : `do ${pickSeat === 0 ? 'Jogador 1' : 'Jogador 2'}`;
  return `<div class="modal picker" data-act="closepick"><div class="mbox" role="dialog" aria-label="Escolher deck">
    <div class="pkhead"><h2>Deck ${who}</h2><button type="button" data-act="closepick">Fechar</button></div>
    <h3>Meus decks</h3>${mine ? `<div class="pkgrid">${mine}</div>` : '<p class="muted">Você ainda não tem decks. Monte um, importe um código ou copie um starter em Meus decks.</p>'}
    <h3>Starters</h3><div class="pkgrid">${group('Starters')}</div>
    <div class="btns"><button type="button" data-act="decks">Montar ou importar decks</button></div>
  </div></div>`;
}

/** Nível da IA, no assento dela (Fácil / Normal / Difícil). */
function aiLevelHtml(): string {
  return `<div class="ailevel" role="radiogroup" aria-label="Nível da IA">${AI_LEVELS.map(
    (l) => `<button type="button" role="radio" class="${settings.aiLevel === l.id ? 'on' : ''}" data-act="ailevel" data-level="${l.id}" aria-checked="${settings.aiLevel === l.id}" title="${esc(l.s)}">${l.t}</button>`,
  ).join('')}</div>`;
}

const MODES: { id: Settings['opponent']; t: string; s: string }[] = [
  { id: 'ai', t: 'Contra a IA', s: 'Treine sozinho, quando quiser' },
  { id: 'online', t: 'Online', s: 'Cada um no seu aparelho' },
  { id: 'human', t: 'Passa-e-joga', s: 'Duas pessoas, um aparelho' },
];

function setupHtml(): string {
  const saved = loadSaved();
  const reports = settings.decks.map((i) => checkDeck(acc.deckById(i)));
  const isOn = settings.opponent === 'online';
  const blocked = reports.some((r) => r.errors.length) || (settings.format === 'padrao' && reports.some((r) => r.banned.length));
  const onlineBox = hubHtml();
  const resumeLabel = saved?.online ? `Voltar para a sala ${esc(saved.online.code)}` : 'Continuar a partida salva';
  const modes = `<nav class="modes" aria-label="Como jogar">
      <div class="modegroup" role="radiogroup" aria-label="Adversário">${MODES.map(
        (m) => `<button type="button" role="radio" class="mode${settings.opponent === m.id ? ' on' : ''}" data-act="mode" data-mode="${m.id}" aria-checked="${settings.opponent === m.id}"><b>${m.t}</b><span>${m.s}</span></button>`,
      ).join('')}</div>
      <div class="modegroup aux">${tut.homeButton()}<button type="button" class="mode aux" data-act="decks"><b>Meus decks</b><span>Montar, importar e exportar</span></button><button type="button" class="mode aux" data-act="history"><b>Histórico</b><span>Partidas, replays e estatísticas</span></button><button type="button" class="mode aux" data-act="importopen"><b>Abrir replay</b><span>De um arquivo ou relatório</span></button><button type="button" class="mode aux" data-act="challenges"><b>Desafios</b><span>Vença neste turno</span></button><button type="button" class="mode aux ladder" data-act="ladder"><b>Escada</b><span>5 adversários seguidos contra a IA</span></button><button type="button" class="mode aux tour" data-act="tour"><b>Torneio</b><span>Chave ou pontos corridos entre amigos</span></button><button type="button" class="mode aux" data-act="ranking"><b>Ranking</b><span>${rating.rankStore().elo} pontos · amigos online</span></button><button type="button" class="mode aux" data-act="profile"><b>Perfil</b><span>Pontuação, vitórias e decks</span></button></div>
    </nav>`;
  const summary = `${settings.opponent === 'ai' ? `Contra a IA (${AI_LEVELS.find((l) => l.id === settings.aiLevel)!.t})` : 'Passa-e-joga'} · ${settings.format === 'padrao' ? 'Padrão' : 'Casual'} · campos ${settings.bfMode === 'random' ? 'sorteados' : 'escolhidos'}`;
  return `<header class="topbar"><div class="brand">Riftbound <span>mesa</span></div><div class="turninfo"><button type="button" class="tb-acct" data-act="profile" title="Ver o perfil">${esc(acc.profile().name)} <span>${rating.rankStore().elo}</span></button></div>
    <div class="tb">${musicBoards().length ? `<button type="button" data-act="music" title="Volume da música (N)">${musicIcon()}</button>` : ''}${net ? '<button type="button" data-act="decks">Meus decks</button>' : ''}</div></header>
  <main class="setup home">
    ${net ? lobbyHtml() : `<div class="hero"><h1>Riftbound na mesa</h1><p>As regras rodam sozinhas: custos, pilha, combate, pontos e o efeito de cada carta.</p></div>
      ${tut.homeBanner()}
      ${saved && (saved.saved || saved.online) ? `<div class="resume mz"><span>${saved.online ? 'Você estava numa sala online.' : 'Há uma partida em andamento.'}</span><button class="primary" data-act="resume">${resumeLabel}</button></div>` : ''}
      ${modes}`}
    <form class="form" id="setupform">
      <div class="faceoff${isOn ? ' is-online' : ''}">
        ${seatHtml(0, reports)}
        ${net ? '' : `<div class="vs" aria-hidden="true"><i class="sigil"></i><span>contra</span></div>${isOn ? onlineBox : seatHtml(1, reports)}`}
      </div>
      ${isOn ? '' : `<div class="startbar"><button class="primary big" type="submit" ${blocked ? 'disabled' : ''}>Começar partida</button>
        <span class="${blocked ? 'err' : 'muted'}">${blocked ? 'Algum deck não é válido neste formato. Troque o deck ou o formato.' : summary}</span></div>`}
      <fieldset class="tablerules"><legend>Regras da mesa</legend>
        <div class="rgrid">
        <div><label for="format">Formato</label>
        <select id="format"><option value="casual" ${settings.format === 'casual' ? 'selected' : ''}>Casual (cartas banidas liberadas)</option><option value="padrao" ${settings.format === 'padrao' ? 'selected' : ''}>Padrão (sem cartas banidas)</option></select></div>
        <div><label for="bfmode">Campos de batalha</label>
        <select id="bfmode"><option value="random" ${settings.bfMode === 'random' ? 'selected' : ''}>Sorteados (melhor de 1)</option><option value="choose" ${settings.bfMode === 'choose' ? 'selected' : ''}>Cada um escolhe</option></select></div>
        <div class="togs"><label class="tog" ${isOn || settings.opponent === 'ai' ? 'hidden' : ''}><input type="checkbox" id="privacy0" ${settings.privacy ? 'checked' : ''}> Esconder a mão de quem não está jogando</label>
        <label class="tog"><input type="checkbox" id="autopass" ${settings.autoPass ? 'checked' : ''}> Passar sozinho quando não houver resposta possível</label></div>
        </div>
        ${isOn ? '<p class="note">No online, o formato e os campos valem o que o anfitrião (quem criou a sala) escolher.</p>' : ''}
      </fieldset>
    </form>
    <p class="note fineprint">Projeto de fã feito sob a política "Legal Jibber Jabber" da Riot Games, com textos de cartas da Riot. A Riot não endossa nem patrocina este projeto.</p>
  </main>${pickerHtml()}`;
}

/** Quadro online da tela inicial: criar sala (nome, pública/privada), lista ao vivo e entrar com código. */
function hubHtml(): string {
  const recent = (() => {
    const rr = recentRooms();
    if (!rr.length) return '';
    const lbl = { host: 'você criou', guest: 'você entrou', watch: 'você assistiu' } as const;
    return `<details class="hub-recent"><summary>Salas recentes</summary><div class="recent-rooms">${rr
      .map((r) => `<button type="button" data-act="reroom" data-room="${esc(r.code)}" data-role="${r.role}" title="${lbl[r.role]} ${ago(r.at)}"><b>${esc(r.code)}</b> <small>${lbl[r.role]} · ${ago(r.at)}</small></button>`)
      .join('')}</div></details>`;
  })();
  const vis = (pub: boolean, t: string, sub: string) =>
    `<button type="button" role="radio" class="hub-vis${roomDraft.pub === pub ? ' on' : ''}" data-act="roomvis" data-pub="${pub ? 1 : 0}" aria-checked="${roomDraft.pub === pub}"><b>${t}</b><span>${sub}</span></button>`;
  return `<section class="seat mz online hub" aria-label="Jogar online">
    <div class="seat-top"><span class="seat-who">Online</span><span class="hub-live" id="hubcount">${hubCountHtml()}</span></div>
    <div class="hub-create">
      <label for="roomname">Criar uma sala</label>
      <input id="roomname" value="${esc(roomDraft.name)}" placeholder="${esc(defaultRoomName())}" maxlength="32" autocomplete="off" aria-label="Nome da sala">
      <div class="hub-viss" role="radiogroup" aria-label="Quem vê a sala">${vis(true, 'Pública', 'aparece na lista')}${vis(false, 'Privada', 'só com o código')}</div>
      <button type="button" class="primary big" data-act="host">Criar sala</button>
    </div>
    <div class="hub-listwrap">
      <div class="hub-h"><span>Salas no ar</span><small>entre para jogar ou assista</small></div>
      <ul class="hub-list" id="hublist" aria-live="polite">${hubListHtml()}</ul>
    </div>
    <div class="hub-code">
      <label for="joincode">Entrar com código <small>(salas privadas também)</small></label>
      <div class="joinrow"><input id="joincode" value="${esc(joinCode)}" placeholder="Código (6 letras)" maxlength="60" autocomplete="off"><button type="button" data-act="join">Entrar</button><button type="button" data-act="watch" title="Só assistir a partida dessa sala">Assistir</button></div>
    </div>
    ${recent}
  </section>`;
}
function hubCountHtml(): string {
  if (!lobbyWatch) return '';
  const n = lobbyWatch.rooms.length;
  return lobbyWatch.ready || n ? `<i></i>${n ? `${n} sala${n > 1 ? 's' : ''} no ar` : 'ao vivo'}` : lobbyWatch.failed ? 'sem conexão' : 'conectando…';
}
function hubListHtml(): string {
  const rooms = lobbyWatch?.rooms ?? [];
  if (!rooms.length)
    return `<li class="hub-empty">${lobbyWatch?.failed ? 'Sem conexão com o servidor de salas agora. Confira a internet; o jogo tenta de novo sozinho.' : lobbyWatch && !lobbyWatch.ready ? 'Procurando salas…' : 'Nenhuma sala pública agora. Crie uma (ela aparece aqui para os outros) ou entre com um código.'}</li>`;
  return rooms
    .map((l) => {
      const lg = l.legend && hasCard(l.legend) ? l.legend : null;
      const ch = l.champion && hasCard(l.champion) ? l.champion : null;
      const who = `${esc(l.host)}${lg ? ` · ${esc(cardData(lg).name)}` : ''}${ch ? ` <span class="muted">(${esc(cardData(ch).name)})</span>` : ''}`;
      const old = l.v !== PROTOCOL;
      let st: string;
      let btn: string;
      if (l.state === 'open') {
        st = '<span class="hub-st open">Esperando adversário</span>';
        btn = `<button type="button" class="primary" data-act="lobjoin" data-room="${l.code}" ${old ? 'disabled' : ''}>Entrar</button>`;
      } else {
        const score = l.score ? `<b class="hub-score">${l.score[0]} × ${l.score[1]}</b>` : '';
        st =
          l.state === 'ready'
            ? `<span class="hub-st">Começando · contra ${esc(l.guest || 'adversário')}</span>`
            : l.state === 'over'
              ? `<span class="hub-st">Terminou ${score} · contra ${esc(l.guest || 'adversário')}</span>`
              : `<span class="hub-st live">${score} · ${l.turn ? `turno ${l.turn}` : 'começando'}${l.active ? ` · vez de ${esc(l.active)}` : ''} · contra ${esc(l.guest || 'adversário')}</span>`;
        btn = `<button type="button" data-act="lobwatch" data-room="${l.code}" ${old ? 'disabled' : ''}>Assistir</button>`;
      }
      const w = l.watchers ? `<span class="hub-w">${l.watchers} assistindo</span>` : '';
      return `<li class="hub-room ${l.state}" data-room="${l.code}">
        <span class="hub-cv">${coverArt(lg, ch)}</span>
        <span class="hub-info"><b>${esc(l.name)}</b><span class="hub-who">${who}</span>${st}${old ? '<span class="err small">versão diferente do jogo: atualizem a página</span>' : ''}${w}</span>
        ${btn}
      </li>`;
    })
    .join('');
}
/** A lista mudou: redesenha só o quadro (sem perder o que está sendo digitado). */
function updateHub() {
  const list = document.getElementById('hublist');
  if (!list) return;
  const rooms = lobbyWatch?.rooms ?? [];
  ensureArt(
    rooms.flatMap((l) => [l.legend, l.champion].filter((c) => c && hasCard(c))),
    updateHub,
  );
  list.innerHTML = hubListHtml();
  const cnt = document.getElementById('hubcount');
  if (cnt) cnt.innerHTML = hubCountHtml();
}

function lobbyHtml(): string {
  if (!net) return '';
  const err = net.error ? `<p class="err">${esc(net.error)}</p>` : '';
  if (net.role === 'host') {
    const link = `${location.href.split('#')[0]}#sala-${net.code}`;
    const web = location.protocol.startsWith('http');
    const g = guest && net.connected ? guest : null;
    const gRep = g ? checkDeck(g.deck) : null;
    const gBan = g && gRep && (gRep.errors.length || (settings.format === 'padrao' && gRep.banned.length));
    // confronto do torneio: só o adversário do confronto pode jogar nesta sala
    const wrong = !!(g && roomTour && guestId && guestId !== roomTour.tag.b);
    return `<section class="lobby panel">
      <p class="who">${roomTour ? 'Confronto do torneio' : 'Sua sala'} · <b>${esc(net.roomName || defaultRoomName())}</b> · ${roomTour ? '<span class="hub-tag">seu adversário entra sozinho pela tela do torneio</span>' : net.pub ? '<span class="hub-tag pub">pública: aparece na lista de salas</span>' : '<span class="hub-tag">privada: só entra quem tiver o código</span>'}</p>
      <div class="roomcode" aria-label="Código da sala">${esc(net.code)}</div>
      ${(net.kind ?? (claudeApp ? 'room' : 'mqtt')) === 'room' ? '<p class="note">Vocês estão jogando pela página do Claude. Compartilhe esta página com o seu amigo dando acesso de edição (menu Compartilhar); ele abre a página, escolhe "Amigo online" e digita este código.</p>' : web ? `<label for="invite">Link de convite</label><div class="joinrow"><input id="invite" readonly value="${esc(link)}"><button type="button" data-act="copy">Copiar</button></div>` : '<p class="note">Mande este código para o seu amigo. Ele abre o jogo, escolhe "Amigo online" e digita o código.</p>'}
      ${err}
      <p class="lstatus">${
        net.status === 'abrindo'
          ? 'Abrindo a sala…'
          : g
            ? `<b>${esc(g.name)}</b>${g.rk ? ` (${rating.latestCard(g.rk)!.elo} pontos)` : ''} entrou com o deck <b>${esc(g.deck.name)}</b>.`
            : 'Esperando seu amigo entrar…'
      }${net.watcherCount ? ` · ${net.watcherCount} assistindo` : ''}</p>
      ${gBan ? `<p class="err">${gRep!.errors.length ? `O deck do seu amigo não é válido: ${esc(gRep!.errors[0])}` : 'O deck do seu amigo tem cartas banidas no formato Padrão. Troque para Casual para jogar.'}</p>` : ''}
      ${wrong ? '<p class="err">Quem entrou não é o seu adversário neste confronto do torneio.</p>' : ''}
      <div class="btns"><button class="primary" data-act="ostart" ${g && !gBan && !wrong ? '' : 'disabled'}>Começar partida</button><button data-act="leave">${roomTour ? 'Voltar ao torneio' : 'Fechar sala'}</button></div>
    </section>`;
  }
  if (net.role === 'watch')
    return `<section class="lobby panel">
    <p class="who">Assistindo a sala ${esc(net.code)}</p>
    <h2>${net.connected ? 'Conectado' : net.status === 'reconectando' ? 'Procurando a sala…' : 'Conectando…'}</h2>
    ${err}
    <p class="lstatus">${net.connected ? 'A partida aparece aqui assim que começar. Você vê a mesa, mas nenhuma das mãos.' : 'O jogo tenta de novo sozinho a cada poucos segundos.'}</p>
    <div class="btns"><button data-act="leave">Sair</button></div>
  </section>`;
  return `<section class="lobby panel">
    <p class="who">Sala ${esc(net.code)}</p>
    <h2>${net.connected ? (hostInfo ? `Conectado com ${esc(hostInfo.name)}${hostInfo.rk ? ` (${rating.latestCard(hostInfo.rk)!.elo} pontos)` : ''}` : 'Conectado') : net.status === 'reconectando' ? 'Procurando a sala…' : 'Conectando…'}</h2>
    ${err}
    <p class="lstatus">${net.connected ? `Esperando ${esc(hostInfo?.name ?? 'o anfitrião')} começar a partida. Seu deck: <b>${esc(myDeck().name)}</b>${roomTour ? ' (o do torneio)' : ' (pode trocar no campo Deck: o anfitrião vê na hora)'}.` : 'O jogo tenta de novo sozinho a cada poucos segundos.'}</p>
    <div class="btns"><button data-act="leave">Sair da sala</button></div>
  </section>`;
}

// ───────────────────────────── render e eventos ─────────────────────────────
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}
/** Tela de toque: tocar numa carta abre o zoom em vez de agir direto. Vai pelo tipo de ponteiro, não pela largura:
 * notebook com zoom do sistema (125%/150%) ou janela estreita continua com mouse e precisa do clique normal. */
const touchUi = () => matchMedia('(hover: none), (pointer: coarse)').matches;

function render() {
  // saiu do tutorial por qualquer caminho (menu, fim): volta às configurações de antes
  if (tutPrev && !tut.isTut(game)) {
    settings = tutPrev;
    tutPrev = null;
  }
  const app = $app();
  const logScrolled = document.getElementById('logl');
  const grid = document.querySelector('.dbgrid');
  const gridTop = grid ? grid.scrollTop : 0;
  const winY = window.scrollY;
  const wasDecks = !!document.querySelector('.deckbuilder');
  syncLobbyWatch();
  // campo de texto em foco (chat, nome da sala, código): continua em foco depois de redesenhar
  const ae = document.activeElement as HTMLInputElement | null;
  const focusId = ae && ae.id && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && ae.type !== 'checkbox' ? ae.id : null;
  const selRange = focusId ? [ae!.selectionStart, ae!.selectionEnd] : null;
  // bombas na mesa antes de redesenhar (para a explosão sair do lugar onde estava a que morreu)
  // cartas na mesa antes de redesenhar: a Bomb que sumiu explode onde estava; a unidade que morreu se parte ali
  const before = new Map<string, Seen>();
  if (game)
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.tt-mat .card[data-obj]')))
      before.set(el.dataset.obj!, { r: el.getBoundingClientRect(), bomb: el.classList.contains('bomb'), unit: el.classList.contains('unit'), art: el.querySelector<HTMLImageElement>('img.art')?.src || '' });
  recordIfOver(); // antes de desenhar: o quadro do fim já mostra o resultado gravado (escada: próximo degrau / vidas)
  app.innerHTML = game ? gameHtml() : page === 'decks' ? deckbuilderHtml() : page === 'challenges' ? challengesHtml(acc.profile().name) : page === 'ladder' ? ladderHtml(ladderTopbar()) + modalHtml() : page === 'tour' ? tourHtml(ladderTopbar()) + modalHtml() : page === 'ranking' ? rankingHtml(ladderTopbar()) : page === 'profile' ? profileHtml(ladderTopbar()) : setupHtml() + modalHtml();
  if (focusId) {
    const el = document.getElementById(focusId) as HTMLInputElement | null;
    if (el && el !== document.activeElement) {
      el.focus({ preventScroll: true });
      try {
        if (selRange && selRange[0] !== null) el.setSelectionRange(selRange[0], selRange[1]);
      } catch {
        /* campo sem seleção */
      }
    }
  }
  // o deckbuilder redesenha a cada clique: mantém a rolagem
  if (!game && page === 'decks' && wasDecks) {
    const g2 = document.querySelector('.dbgrid');
    if (g2) g2.scrollTop = gridTop;
    window.scrollTo(0, winY);
    refreshDbPeek();
  }
  // grade da biblioteca: as cartas seguintes entram ao rolar
  if (!game && page === 'decks') mountDb();
  if (game) {
    animateArrivals(before);
    peekId = null;
    drawArrows();
    hoveredDest = null;
    queueAuto();
  }
  tut.afterRender();
  yourTurnCue();
  syncMusic();
  const ll = document.getElementById('logl');
  if (ll) ll.scrollTop = logNewestFirst ? 0 : ll.scrollHeight;
  void logScrolled;
  void logOpen;
  // artes: baixa os pacotes das cartas que estão na mesa (ou nos decks escolhidos)
  const codes = game
    ? Object.values(game.engine.objs).map((o) => o.code)
    : page === 'decks'
      ? poolCodes()
      : page === 'challenges'
        ? challengeArtCodes()
      : page === 'ladder'
        ? [...RUNE_CODES, ...ladderCodes()]
      : page === 'tour'
        ? tourArtCodes()
      : page === 'profile'
        ? profileCodes()
        : [
          ...RUNE_CODES,
          ...settings.decks.flatMap((i) => {
            const d = acc.deckById(i);
            return [d.legend, d.champion, ...d.battlefields, ...(d.extraLegends || []), ...d.main.map(([c]) => c)];
          }),
          ...(lobbyWatch ? lobbyWatch.rooms.flatMap((l) => [l.legend, l.champion].filter((c) => c && hasCard(c))) : []),
          // a escolha de deck mostra a capa de todos
          ...(pickSeat !== null ? acc.deckChoices().flatMap((c) => { const sd = c.id.startsWith('my:') ? acc.getDeck(c.id.slice(3)) : null; return [c.deck?.legend ?? sd?.legend ?? '', c.deck?.champion ?? sd?.champion ?? '']; }) : []),
        ];
  ensureArt(codes, scheduleRender);
  const priv = document.getElementById('privacy') as HTMLInputElement | null;
  if (priv)
    priv.onchange = () => {
      settings.privacy = priv.checked;
      if (!settings.privacy) {
        handoffPending = false;
        if (game?.current) view = game.current.player;
      }
      save();
      render();
    };
  const form = document.getElementById('setupform') as HTMLFormElement | null;
  if (form) {
    const read = () => {
      const el = (id: string) => document.getElementById(id) as HTMLInputElement | null;
      const v = (id: string, dflt = '') => el(id)?.value ?? dflt;
      const c = (id: string) => el(id)?.checked ?? false;
      const jc = el('joincode');
      if (jc) joinCode = jc.value;
      settings = {
        names: [v('name0').trim() || 'Jogador 1', v('name1', settings.names[1]).trim() || 'Jogador 2'],
        decks: [settings.decks[0], settings.decks[1]],
        format: v('format', settings.format) as any,
        bfMode: v('bfmode', settings.bfMode) as any,
        privacy: el('privacy0') ? c('privacy0') : settings.privacy,
        autoPass: el('autopass') ? c('autopass') : settings.autoPass,
        opponent: settings.opponent,
        aiLevel: settings.aiLevel,
      };
      if (settings.opponent === 'ai' && (settings.names[1] === 'Jogador 2' || !settings.names[1])) settings.names[1] = 'IA';
      if (settings.opponent === 'human' && settings.names[1] === 'IA') settings.names[1] = 'Jogador 2';
    };
    const jc = document.getElementById('joincode') as HTMLInputElement | null;
    if (jc) {
      jc.oninput = () => (joinCode = jc.value);
      jc.onkeydown = (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          read();
          if (cleanCode(joinCode).length === 6) openRoom('guest', cleanCode(joinCode));
        }
      };
    }
    form.onchange = (ev) => {
      read();
      // convidado na sala, antes da partida: o deck novo vai para o anfitrião na hora
      if (net && net.role === 'guest' && !game && net.connected) net.send(helloMsg());
      // campos de texto não redesenham a tela (senão o clique seguinte num botão se perde)
      if ((ev.target as HTMLElement | null)?.tagName === 'INPUT' && (ev.target as HTMLInputElement).type !== 'checkbox') return;
      render();
    };
    form.onsubmit = (ev) => {
      ev.preventDefault();
      read();
      newGame();
    };
  }
}

function onClick(ev: MouseEvent) {
  const t = ev.target as HTMLElement;
  // o clique que vem logo depois de soltar uma carta (ou de um toque longo) não vale como clique
  if (Date.now() < suppressUntil) {
    suppressUntil = 0;
    return;
  }
  if (!game && page === 'decks' && onDbClick(t)) return;
  if (onLadderClick(t)) return;
  if (!game && page === 'tour' && onTourClick(t)) return;
  if (onProfileClick(t)) return;
  // clique fora do menu da carta fecha o menu (e segue valendo como clique normal)
  if (ctxMenu && !t.closest('.tt-ctx')) {
    ctxMenu = null;
    if (!t.closest('[data-obj],[data-opt],[data-act],[data-dest]')) {
      render();
      return;
    }
  }
  // carta armada (confirmar antes de jogar): clique num alvo/local aceso confirma escolhendo-o; na própria carta confirma;
  // fora do painel cancela (e o clique segue valendo se caiu num botão, numa opção ou noutra carta jogável)
  if (armed && game && !t.closest('.tt-arm, .tt-ctx, .modal')) {
    const info = armed.opt ? armNext(armed.opt) : null;
    const el = t.closest('[data-obj]') as HTMLElement | null;
    const outer = el?.parentElement?.closest('[data-obj]') as HTMLElement | null;
    const zone = t.closest('[data-drop]') as HTMLElement | null;
    if (armed.opt && info && !t.closest('.tt-dock')) {
      const hit = [el?.dataset.obj, outer?.dataset.obj].find((id) => id && id !== armed!.id && info.objs.has(id));
      if (hit) return armGo(armed.opt, { obj: hit });
      const l = zone ? info.locs.get(zone.dataset.drop!) : undefined;
      if (l && !(el && el.dataset.obj === armed.id)) return armGo(armed.opt, { loc: l });
    }
    if (el && el.dataset.obj === armed.id && !t.closest('.tt-dock')) {
      if (armed.opt) armGo(armed.opt);
      return;
    }
    const keep = t.closest('[data-opt],[data-act]') || (el && (rootActs(el.dataset.obj!).length || frame.movable.has(el.dataset.obj!)));
    armed = null;
    if (!keep) {
      render();
      return;
    }
  }
  if (onChallengeClick(t, replay ? null : game)) return;
  let act = t.closest('[data-act]') as HTMLElement | null;
  // botão de opção dentro de um contêiner com data-act (ex.: as ações no zoom da carta): vale a opção
  const optIn = t.closest('[data-opt]') as HTMLElement | null;
  if (act && optIn && act !== optIn && act.contains(optIn)) act = null;
  if (act) {
    const a = act.dataset.act;
    if (a === 'arm' && game) {
      arm(act.dataset.id!, act.dataset.opt || null);
      return;
    }
    if (a === 'armgo') {
      if (armed?.opt) armGo(armed.opt);
      return;
    }
    if (a === 'disarm') {
      armed = null;
      render();
      return;
    }
    if (a === 'armzoom') {
      if (armed) zoom = armed.id;
      armed = null;
      render();
      return;
    }
    if ((a === 'trigup' || a === 'trigdown') && trigOrder) {
      const i = Number(act.dataset.i);
      const j = a === 'trigup' ? i - 1 : i + 1;
      const it = trigOrder.items;
      if (j >= 0 && j < it.length) [it[i], it[j]] = [it[j], it[i]];
      render();
      return;
    }
    if (a === 'trigok' && game?.current && trigOrder && isTrigQ(game.current)) {
      const d = game.current;
      trigPlan = { items: [...trigOrder.items].reverse().map((o) => ({ label: normTrig(o.label), obj: o.obj })), player: d.player, base: game.answers.length };
      trigOrder = null;
      runTrigPlan();
      return;
    }
    if (a === 'movesel') {
      ctxMenu = null;
      toggleMove(act.dataset.id!);
      return;
    }
    if (a === 'clearmove') {
      moveSel = [];
      render();
      return;
    }
    if (a === 'optlist') {
      showAllOpts = !showAllOpts;
      armed = null;
      render();
      return;
    }
    if (a === 'report' && game) {
      modal = { title: 'Relatar problema', html: reportHtml() };
      render();
      return;
    }
    if (a === 'rcopy' || a === 'rdownload') {
      const note = (document.getElementById('rnote') as HTMLTextAreaElement | null)?.value || '';
      const json = reportJson(note);
      const msg = document.getElementById('rmsg');
      const box = document.getElementById('rjson') as HTMLTextAreaElement | null;
      const showBox = (t: string) => {
        if (box) {
          box.hidden = false;
          box.value = json;
          box.select();
        }
        if (msg) msg.textContent = t;
      };
      if (a === 'rcopy') {
        const p = navigator.clipboard?.writeText(json);
        if (p) p.then(() => msg && (msg.textContent = 'Copiado. Cole numa mensagem para quem vai ver o problema.'), () => showBox('Não deu para copiar sozinho: o conteúdo está abaixo, selecionado — copie com Ctrl+C.'));
        else showBox('Copie o conteúdo abaixo (já está selecionado).');
      } else {
        const filename = `riftbound-partida-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
        // dentro do app do Claude o download passa pela permissão "downloads" da página (pede confirmação)
        const W2 = window as any;
        const viaClaude: Promise<any> = W2.claude?.use ? W2.claude.use('downloads').catch(() => null) : Promise.resolve(null);
        void viaClaude.then((dl) => {
          if (dl)
            dl.save({ filename, data: json }).then(
              () => msg && (msg.textContent = 'Arquivo salvo.'),
              (e: any) => (e?.code === 'declined' ? msg && (msg.textContent = 'Download cancelado.') : showBox('Não deu para baixar aqui: copie o conteúdo abaixo.')),
            );
          else blobDownload();
        });
        return;
      }
      function blobDownload() {
        try {
          const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
          const el = document.createElement('a');
          el.href = url;
          el.download = `riftbound-partida-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
          document.body.appendChild(el);
          el.click();
          el.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          if (msg) msg.textContent = 'Arquivo baixado. Se não apareceu, use Copiar.';
        } catch {
          showBox('Não deu para baixar aqui: copie o conteúdo abaixo.');
        }
      }
      return;
    }
    if (a === 'importopen') {
      modal = { title: 'Abrir replay', html: importHtml() };
      render();
      const f = document.getElementById('rfile') as HTMLInputElement | null;
      if (f)
        f.onchange = () => {
          const file = f.files?.[0];
          if (!file) return;
          void file.text().then((t) => {
            const err = importText(t);
            const el = document.getElementById('rerr');
            if (err && el) el.textContent = err;
          });
        };
      return;
    }
    if (a === 'rimport') {
      const t = (document.getElementById('rpaste') as HTMLTextAreaElement | null)?.value || '';
      const err = importText(t);
      const el = document.getElementById('rerr');
      if (err && el) el.textContent = err;
      return;
    }
    if (a === 'rlink') {
      if (!shareCode) {
        // ainda preparando: gera agora e mostra numa caixa para copiar (fora do clique a cópia automática falha)
        const src = replay ? { cfg: replay.cfg, answers: replay.answers } : fullGame() ? JSON.parse(fullGame()!.serialize()) : null;
        if (src) void encodeReplay({ cfg: src.cfg, answers: src.answers, view }).then((c) => showCopyBox(canLink() ? linkFor(c) : `rb1:${c}`, canLink() ? 'Link do replay' : 'Código do replay', 'O link ficou pronto agora.'));
        return;
      }
      const text = canLink() ? linkFor(shareCode) : `rb1:${shareCode}`;
      copyText(text, canLink() ? 'Link do replay' : 'Código do replay', () => {
        uiHint = canLink() ? 'Link do replay copiado: quem abrir vê a partida inteira.' : 'Código copiado: cole em Abrir replay, na tela inicial.';
        modal = { title: 'Replay', html: `<p>${uiHint}</p>` };
        render();
      });
      return;
    }
    if (a === 'replaythis' && game) {
      const fg = fullGame();
      if (!fg) {
        modal = { title: 'Replay', html: '<p>O replay completo chega quando o anfitrião fechar a partida. Tente de novo em instantes.</p>' };
        render();
        return;
      }
      const sv = JSON.parse(fg.serialize());
      openReplay(sv.cfg, sv.answers, sv.answers.length, { view });
      return;
    }
    if (a === 'rgo') return replayGo(Number(act.dataset.to));
    if (a === 'rplay') return exitReplay(act.dataset.mode as 'human' | 'ai');
    if (a === 'rexit') return exitReplay();
    if (a === 'music') {
      cycleMusic();
      render();
      return;
    }
    if (a === 'sound') {
      cycleSound();
      render();
      return;
    }
    if (a === 'matpick') {
      loadMats(() => {
        if (modal?.title === 'Tapete da mesa') modal.html = matPickHtml();
        render();
      });
      modal = { title: 'Tapete da mesa', html: matPickHtml() };
      render();
      return;
    }
    if (a === 'mat') {
      setMat(act.dataset.id || 'auto');
      modal = null;
      render();
      return;
    }
    if (a === 'guide') {
      modal = { title: 'Como funciona', html: guideHtml() };
      render();
      return;
    }
    if (a === 'oracle') {
      oracleOn = !oracleOn;
      savePrefs();
      render();
      return;
    }
    if (a === 'logorder') {
      logNewestFirst = !logNewestFirst;
      savePrefs();
      render();
      return;
    }
    if (a === 'sidetoggle') {
      sideOpen = !sideOpen;
      render();
      return;
    }
    if (a === 'closemodal' && (t === act || t.tagName === 'BUTTON')) {
      modal = null;
      render();
      return;
    }
    if (a === 'closemodal') return;
    if (a === 'closezoom') {
      // tocar de novo na carta grande também fecha
      if (t === act || t.tagName === 'BUTTON' || t.matches('img.big')) {
        zoom = null;
        render();
      }
      return;
    }
    if (a === 'reroom') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      openRoom(act.dataset.role as 'host' | 'guest' | 'watch', act.dataset.room!, { pub: roomDraft.pub, name: roomDraft.name });
      return;
    }
    if (a === 'roomvis') {
      roomDraft.pub = act.dataset.pub === '1';
      saveRoomDraft();
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      render();
      return;
    }
    if (a === 'lobjoin' || a === 'lobwatch') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      const code = cleanCode(act.dataset.room || '');
      if (code.length === 6) openRoom(a === 'lobjoin' ? 'guest' : 'watch', code);
      return;
    }
    if (a === 'emotetog') {
      emoteOpen = !emoteOpen;
      chatOpen = false;
      render();
      return;
    }
    if (a === 'emote') {
      emoteOpen = false;
      sendChat(act.dataset.text || '');
      render();
      return;
    }
    if (a === 'chattog') {
      emoteOpen = false;
      chatOpen = !chatOpen;
      render();
      if (chatOpen && !touchUi()) document.getElementById('chatin')?.focus();
      return;
    }
    if (a === 'chatq') {
      chatOpen = false;
      sendChat(act.dataset.text || '');
      return;
    }
    if (a === 'chatsend') {
      const t = chatDraft;
      chatDraft = '';
      chatOpen = false;
      sendChat(t);
      render();
      return;
    }
    if (a === 'undoyes' || a === 'undono') {
      const ok = a === 'undoyes';
      if (net?.role === 'host') resolveUndo(ok);
      else if (net?.role === 'guest' && undoAsk) {
        net.send({ t: 'undoans', ok, seq: undoAsk.seq });
        undoAsk = null;
      }
      save();
      render();
      return;
    }
    if (a === 'watch') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      const code = cleanCode(joinCode);
      if (code.length !== 6) {
        (document.getElementById('joincode') as HTMLInputElement | null)?.focus();
        return;
      }
      openRoom('watch', code);
      return;
    }
    if (a === 'host' || a === 'join') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      if (a === 'host') openRoom('host', newCode(), { pub: roomDraft.pub, name: roomDraft.name });
      else {
        const code = cleanCode(joinCode);
        if (code.length !== 6) {
          const jc = document.getElementById('joincode') as HTMLInputElement | null;
          jc?.focus();
          return;
        }
        openRoom('guest', code);
      }
      return;
    }
    if (a === 'hideoverlay' || a === 'showoverlay') {
      overlayHidden = a === 'hideoverlay' && game ? (game.engine.winner !== null || !game.current ? 'end' : String(game.answers.length)) : '';
      render();
      return;
    }
    if (a === 'leave') return leaveRoom();
    if (a === 'ailevel') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any); // guarda nome e opções antes de redesenhar
      const l = act.dataset.level;
      if (isAiLevel(l)) settings.aiLevel = l;
      save();
      render();
      return;
    }
    if (a === 'mode') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any); // guarda nome e opções antes de redesenhar
      settings.opponent = act.dataset.mode as Settings['opponent'];
      if (settings.opponent === 'ai' && (settings.names[1] === 'Jogador 2' || !settings.names[1])) settings.names[1] = 'IA';
      if (settings.opponent === 'human' && settings.names[1] === 'IA') settings.names[1] = 'Jogador 2';
      save();
      render();
      return;
    }
    if (a === 'pickdeck') {
      const form = document.getElementById('setupform') as HTMLFormElement | null;
      form?.onchange?.(new Event('change') as any);
      pickSeat = act.dataset.seat === '1' ? 1 : 0;
      render();
      return;
    }
    if (a === 'closepick') {
      if (t === act || t.tagName === 'BUTTON') {
        pickSeat = null;
        render();
      }
      return;
    }
    if (a === 'setdeck' && pickSeat !== null) {
      settings.decks[pickSeat] = act.dataset.deck!;
      pickSeat = null;
      save();
      // convidado na sala, antes da partida: o deck novo vai para o anfitrião na hora
      if (net && net.role === 'guest' && !game && net.connected) net.send(helloMsg());
      render();
      return;
    }
    if (a === 'editdeck') {
      pickSeat = null;
      page = 'decks';
      dbState.view = 'edit';
      dbState.deckId = act.dataset.deck!;
      dbState.sample = [];
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'tour') {
      pickSeat = null;
      page = 'tour';
      showTour(null);
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'tourback') return leaveRoom(); // sala de um confronto: volta para a tela do torneio
    if (a === 'challenges') {
      pickSeat = null;
      page = 'challenges';
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'decks' || a === 'history') {
      pickSeat = null;
      page = 'decks';
      dbState.view = a === 'history' ? 'history' : 'list';
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'ostart' || a === 'rematch') return startOnlineGame();
    if (a === 'lobby') return backToLobby();
    if (a === 'copy') {
      const inp = document.getElementById('invite') as HTMLInputElement | null;
      if (!inp) return;
      const done = () => {
        act.textContent = 'Copiado';
      };
      navigator.clipboard?.writeText(inp.value).then(done, () => {
        inp.select();
      }) ?? inp.select();
      return;
    }
    if (a === 'setup') {
      if (replay) {
        // sair do replay volta para a partida que estava aberta antes (e não apaga a partida salva)
        exitReplay();
        if (game) return;
        render();
        return;
      }
      if (challengeOf(game)) page = 'challenges'; // o Menu de um desafio volta para a lista
      game = null;
      save();
      render();
    } else if (a === 'newgame') newGame();
    else if (a === 'resume') {
      const s = loadSaved();
      if (s?.online) {
        settings = normSettings(s.settings);
        resumeOnline(s);
        return;
      }
      if (s && s.saved) {
        settings = normSettings(s.settings);
        try {
          game = Game.load(s.saved!);
          view = vsAi() ? HUMAN : s.view ?? game.current?.player ?? 0;
          ai = vsAi() ? newAi() : null;
        } catch {
          game = null;
        }
      }
      render();
      scheduleAi();
    } else if (a === 'handoff') {
      handoffPending = false;
      if (game?.current) view = game.current.player;
      render();
    } else if (a === 'flip') {
      view = (1 - view) as P;
      render();
    } else if (a === 'undo') {
      pendingDrop = null;
      trigPlan = null;
      armed = null;
      ctxMenu = null;
      moveSel = [];
      if (onlineAct({ k: 'undo' })) return;
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
      game?.undo();
      if (vsAi() && game) {
        for (let i = 0; i < 80 && game.current && !(game.current.player === HUMAN && game.current.root) && game.answers.length; i++) game.undo();
        ai = newAi();
      }
      selected = [];
      afterChange();
    } else if (a === 'cancel') {
      pendingDrop = null;
      if (onlineAct({ k: 'cancel' })) return;
      game?.cancel();
      selected = [];
      afterChange();
    } else if (a === 'confirm') answer(selected);
    return;
  }
  const trash = t.closest('[data-trash]') as HTMLElement | null;
  if (trash && game) {
    const p = Number(trash.dataset.trash) as P;
    const eng = game.engine;
    const ids = eng.pl[p].trash;
    modal = {
      title: `Descarte de ${eng.pl[p].name}`,
      html: ids.length ? `<div class="row wrap">${ids.map((id) => cardHtml(eng, eng.objs[id], 'hand')).join('')}</div>` : '<p class="muted">Vazio.</p>',
    };
    render();
    return;
  }
  const opt = t.closest('[data-opt]') as HTMLElement | null;
  if (opt && game?.current) {
    const id = opt.dataset.opt!;
    const d = game.current;
    // "Pagar: manual" fica lembrado na conta (vale para as próximas partidas)
    if (id === MANUAL_PAY && d.player === mySeat()) {
      acc.setManualPayPref(!game.engine.pl[d.player].manualPay);
      manualAuto.add(`${game.cfg.seed}:${d.player}`);
    }
    if (d.max > 1 || d.min === 0) {
      if (selected.includes(id)) selected = selected.filter((x) => x !== id);
      else if (selected.length < d.max) selected = [...selected, id];
      else if (d.max === 1) selected = [id];
      render();
    } else answer([id]);
    return;
  }
  const cref = t.closest('[data-code]') as HTMLElement | null;
  if (cref && game) {
    const id = cref.dataset.ref || 'code:' + cref.dataset.code;
    pingRef(cref);
    if (touchUi()) zoom = id;
    else preview = id;
    render();
    return;
  }
  const card = t.closest('[data-obj]') as HTMLElement | null;
  const cardId = card?.dataset.obj;
  // mover com um clique: unidade pronta entra/sai da seleção; destino aceso recebe as unidades escolhidas
  if (cardId && frame.movable.has(cardId) && card!.classList.contains('card')) {
    const others = optionsFor(cardId);
    if (others.length && !moveSel.length) openCtx(cardId, card!);
    else toggleMove(cardId);
    return;
  }
  const destEl = t.closest('[data-dest]') as HTMLElement | null;
  if (destEl && moveSel.length && game) {
    const l = frame.dests.get(destEl.dataset.dest!);
    if (l) {
      moveTo(moveSel, l);
      return;
    }
  }
  if (moveSel.length && !t.closest('.tt-dock')) {
    moveSel = [];
    render();
    return;
  }
  const zopt = t.closest('[data-zopt]') as HTMLElement | null;
  // zona clicável (base como destino): vale se o clique não caiu numa carta com ação
  if (zopt && game?.current && (!card || !zopt.contains(card) || !optionsFor(card.dataset.obj!).length)) {
    answer([zopt.dataset.zopt!]);
    return;
  }
  if (card && game) {
    const id = card.dataset.obj!;
    preview = id;
    const opts = optionsFor(id);
    const d = game.current;
    const multiSel = !!d && (d.max > 1 || d.min === 0);
    // jogar/ativar: o primeiro clique só escolhe a carta (painel com custo, texto e alvos); confirma depois
    const acts = rootActs(id);
    if (acts.length && acts.length === opts.length) {
      arm(id, acts.length === 1 ? acts[0].id : null);
      return;
    }
    if (!opts.length && !touchUi()) {
      const o = game.engine.objs[id];
      const w = o ? whyNot(game.engine, o) : '';
      if (w) {
        uiHint = w;
        render();
        return;
      }
    }
    if (touchUi() && !(multiSel && opts.length === 1) && !(opts.length === 1 && !d?.root)) {
      zoom = id;
      render();
      return;
    }
    if (d && opts.length === 1 && !(d.max > 1 || d.min === 0)) {
      answer([opts[0].id]);
      return;
    }
    if (d && opts.length === 1) {
      const oid = opts[0].id;
      selected = selected.includes(oid) ? selected.filter((x) => x !== oid) : [...selected, oid];
    } else if (opts.length > 1) {
      openCtx(id, card);
      return;
    }
    render();
  }
}

function toggleMove(id: string) {
  if (!frame.movable.has(id)) return;
  showAllOpts = false;
  moveKey = decKey();
  armed = null;
  moveSel = moveSel.includes(id) ? moveSel.filter((x) => x !== id) : [...moveSel, id];
  render();
}

function openCtx(id: string, el: HTMLElement) {
  const r = el.getBoundingClientRect();
  ctxMenu = { obj: id, x: r.right + 6, y: r.top };
  if (ctxMenu.x > window.innerWidth - 240) ctxMenu.x = Math.max(8, r.left - 250);
  render();
}

// ───────────────────────────── arrastar e soltar ─────────────────────────────
// Mouse e toque (pointer events). Da mão: jogar (no campo/base onde soltou; spell solto numa carta a escolhe como
// alvo). Unidade pronta: mover para o destino. Gear: equipar na unidade onde soltou. Soltar fora não faz nada.
let suppressUntil = 0;
let drag: {
  id: string;
  kind: 'move' | 'play' | 'equip';
  x0: number;
  y0: number;
  on: boolean;
  ghost: HTMLElement | null;
  touch: boolean;
  timer: ReturnType<typeof setTimeout> | null;
} | null = null;

function dragKind(id: string): 'move' | 'play' | 'equip' | null {
  if (!game || !frame.drag.has(id)) return null;
  if (frame.movable.has(id)) return 'move';
  const opts = optionsFor(id);
  if (opts.some((o) => o.id.startsWith('equip:'))) return 'equip';
  if (opts.some((o) => o.id.startsWith('play:') || o.id.startsWith('hide:'))) return 'play';
  return null;
}

function onPointerDown(ev: PointerEvent) {
  if (!game || ev.button > 0) return;
  // lista de ordem dos efeitos: arrastar uma linha (fora dos botões ↑↓) muda a ordem
  const row = (ev.target as HTMLElement).closest('.tt-trow[data-ti]') as HTMLElement | null;
  if (row && trigOrder && !(ev.target as HTMLElement).closest('button')) {
    trigDrag = { i: Number(row.dataset.ti) };
    ev.preventDefault();
    render();
    return;
  }
  const el = (ev.target as HTMLElement).closest('.tt-mat .card[data-obj]') as HTMLElement | null;
  if (!el) return;
  const id = el.dataset.obj!;
  const touch = ev.pointerType === 'touch';
  const kind = dragKind(id);
  drag = { id, kind: kind || 'play', x0: ev.clientX, y0: ev.clientY, on: false, ghost: null, touch, timer: null };
  if (!kind) (drag as any).noDrag = true;
  // toque longo: abre o zoom da carta (no toque, tocar uma unidade móvel a seleciona para mover)
  if (touch)
    drag.timer = setTimeout(() => {
      if (drag && !drag.on) {
        zoom = id;
        suppressUntil = Date.now() + 700;
        drag = null;
        render();
      }
    }, 520);
}

function dropUnder(x: number, y: number): { loc?: Loc; obj?: string; zone?: HTMLElement } {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el || !game) return {};
  const zone = el.closest('[data-drop]') as HTMLElement | null;
  const cardEl = el.closest('.card[data-obj]') as HTMLElement | null;
  const bfCard = el.closest('.tt-bfcard') as HTMLElement | null;
  let loc: Loc | undefined;
  if (zone) {
    const [t, n] = zone.dataset.drop!.split(':');
    loc = t === 'base' ? { t: 'base', p: Number(n) as P } : { t: 'bf', i: Number(n) };
  }
  const obj = cardEl?.dataset.obj || (bfCard ? bfCard.dataset.hover : undefined);
  return { loc, obj, zone: zone || undefined };
}

function onPointerMove(ev: PointerEvent) {
  if (trigDrag && trigOrder) {
    ev.preventDefault();
    const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest('.tt-trow[data-ti]') as HTMLElement | null;
    const j = over ? Number(over.dataset.ti) : trigDrag.i;
    if (j !== trigDrag.i) {
      const it = trigOrder.items;
      const [x] = it.splice(trigDrag.i, 1);
      it.splice(j, 0, x);
      trigDrag.i = j;
      render();
    }
    return;
  }
  if (!drag || !game) return;
  // o botão foi solto fora da janela (o pointerup não chegou): cancela o arrasto
  if (drag.on && ev.buttons === 0 && ev.pointerType === 'mouse') {
    endDrag();
    render();
    return;
  }
  if ((drag as any).noDrag) {
    if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 10 && drag.timer) clearTimeout(drag.timer);
    return;
  }
  if (!drag.on) {
    if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 8) return;
    if (drag.timer) clearTimeout(drag.timer);
    drag.on = true;
    // arrastar uma unidade que não está na seleção começa uma seleção nova só com ela
    if (drag.kind === 'move' && !moveSel.includes(drag.id)) {
      moveKey = decKey();
      moveSel = [drag.id];
    }
    ctxMenu = null;
    showAllOpts = false;
    armed = null;
    document.body.classList.add('tt-dragging', 'tt-drag-' + drag.kind);
    render();
    const g = document.createElement('div');
    g.className = 'tt-ghost';
    const o = game.engine.objs[drag.id];
    const url = o ? artUrl(o.code) : null;
    g.innerHTML = url ? `<img src="${url}" alt="" draggable="false">` : `<span>${esc(o ? cardData(o.code).name : '')}</span>`;
    if (drag.kind === 'move' && moveSel.length > 1) g.innerHTML += `<b class="tt-gcount">${moveSel.length}</b>`;
    document.body.appendChild(g);
    drag.ghost = g;
    document.querySelector(`.tt-mat .card[data-obj="${CSS.escape(drag.id)}"]`)?.classList.add('tt-dragsrc');
  }
  ev.preventDefault();
  drag.ghost!.style.transform = `translate(${zpx(ev.clientX)}px, ${zpx(ev.clientY)}px)`;
  const u = dropUnder(ev.clientX, ev.clientY);
  for (const z of Array.from(document.querySelectorAll('.dropover'))) if (z !== u.zone) z.classList.remove('dropover');
  const okZone = u.zone && (drag.kind !== 'move' || (u.zone.dataset.dest && frame.dests.has(u.zone.dataset.dest)));
  if (okZone) u.zone!.classList.add('dropover');
  hoverDest(drag.kind === 'move' && okZone ? u.zone!.dataset.dest! : null);
}

function endDrag() {
  if (!drag) return;
  if (drag.timer) clearTimeout(drag.timer);
  drag.ghost?.remove();
  document.body.classList.remove('tt-dragging', 'tt-drag-move', 'tt-drag-play', 'tt-drag-equip');
  for (const z of Array.from(document.querySelectorAll('.dropover'))) z.classList.remove('dropover');
  hoverDest(null);
  drag = null;
}

function onPointerUp(ev: PointerEvent) {
  if (trigDrag) {
    trigDrag = null;
    render();
    return;
  }
  if (!drag || !game) return;
  const dg = drag;
  if (!dg.on) {
    endDrag();
    return;
  }
  suppressUntil = Date.now() + 350;
  const u = dropUnder(ev.clientX, ev.clientY);
  endDrag();
  if (dg.kind === 'move') {
    const l = u.zone?.dataset.dest ? frame.dests.get(u.zone.dataset.dest) : undefined;
    if (l) moveTo(moveSel, l);
    else render();
    return;
  }
  const opts = optionsFor(dg.id);
  if (dg.kind === 'equip') {
    const eq = opts.find((o) => o.id.startsWith('equip:'));
    if (eq && u.obj && u.obj !== dg.id) playDrop(eq.id, { obj: u.obj });
    else render();
    return;
  }
  const o = game.engine.objs[dg.id];
  const k = o ? kindOf(o.code) : '';
  // soltar de volta na mão (em cima dela mesma ou de outra carta da mão) ou fora da mesa: desiste
  const onHand = u.obj ? game.engine.objs[u.obj]?.zone === 'hand' : false;
  if (u.obj === dg.id || onHand) u.obj = undefined;
  if ((!u.zone && !u.obj) || (k !== 'spell' && !u.zone)) {
    render();
    return;
  }
  const play = opts.find((x) => x.id.startsWith('play:'));
  const hide = opts.find((x) => x.id.startsWith('hide:'));
  // carta [Hidden] solta num campo: unidade é jogada lá; spell/gear (ou quando não dá para jogar) é escondida
  const useHide = hide && u.loc?.t === 'bf' && (!play || k !== 'unit') && !(u.obj && u.obj !== game.engine.bfs[u.loc.i].objId);
  const opt = useHide ? hide : play || hide;
  if (!opt) return render();
  // spell: só a carta onde soltou conta (o local não); unidade/gear: o local onde soltou
  const drop: Drop = k === 'spell' ? { obj: u.obj } : { loc: u.loc, obj: k === 'unit' ? undefined : u.obj };
  if (useHide) drop.obj = game.engine.bfs[(u.loc as any).i].objId;
  playDrop(opt.id, drop);
}

/** Ao apontar um destino de movimento: as unidades que a previsão diz que morrem ganham a caveira. */
let hoveredDest: string | null = null;
function hoverDest(key: string | null) {
  if (key === hoveredDest) return;
  hoveredDest = key;
  for (const el of Array.from(document.querySelectorAll('.tt-mat .card.hovdoom'))) el.classList.remove('doomed', 'maybe', 'hovdoom');
  if (!key || !key.startsWith('bf:') || !game) return;
  const cp = frame.movePreview.get(Number(key.slice(3)));
  if (!cp) return;
  for (const id of [...cp.dies, ...cp.maybe]) {
    const el = document.querySelector(`.tt-mat .card[data-obj="${CSS.escape(id)}"]`);
    if (el && !el.classList.contains('doomed')) el.classList.add('doomed', 'maybe', 'hovdoom');
  }
  // unidades que estão vindo (ainda na base) também
}

/** Ao apontar um nome no registro, a carta correspondente pisca na mesa. */
function pingRef(el: HTMLElement) {
  const ref = el.dataset.ref;
  if (!ref) return;
  const card = document.querySelector(`.mat [data-obj="${ref}"]`);
  if (!card) return;
  card.classList.remove('pinged');
  void (card as HTMLElement).offsetWidth;
  card.classList.add('pinged');
}

let peekId: string | null = null;
function onHover(ev: MouseEvent) {
  const t = ev.target as HTMLElement;
  if (!game && page === 'decks') return onDbHover(t);
  if (!game) return;
  if (moveSel.length && !drag) hoverDest((t.closest('[data-dest]') as HTMLElement | null)?.dataset.dest ?? null);
  const hh = t.closest('.tt-hi') as HTMLElement | null;
  if (hh !== hoverHist) {
    hoverHist = hh;
    drawArrows();
  }
  const el = t.closest('[data-obj],[data-hover],[data-code]') as HTMLElement | null;
  if (el?.dataset.code) pingRef(el);
  const id = !el ? null : el.dataset.code ? el.dataset.ref || 'code:' + el.dataset.code : el.dataset.hover || el.dataset.obj!;
  // não mostra a prévia do próprio campo inteiro (só ao apontar a carta do campo)
  const bfZone = el && el.classList.contains('tt-bf');
  const want = id && !bfZone && objOrCode(game.engine, id) ? id : null;
  if (want === peekId) return;
  peekId = want;
  preview = want ?? preview;
  const pk = document.getElementById('tt-peek');
  if (pk) {
    pk.innerHTML = want && !touchUi() ? peekHtml(game.engine, want) : '';
    // a prévia fica do lado oposto ao do mouse
    pk.classList.toggle('right', ev.clientX < window.innerWidth * 0.36);
  }
}

function resumeOnline(s: { saved: string | null; online?: SavedOnline | null }) {
  const on = s.online!;
  openRoom(on.role, on.code, { pub: !!on.pub, name: on.rname || '', tour: on.tour && tourTagOf({ tour: on.tour.tag }) ? on.tour : null });
  // volta no lance em que estava (o convidado e o espectador recebem o estado do anfitrião logo depois)
  if (s.saved) {
    try {
      // anfitrião: a partida de verdade; convidado/espectador: só a visão dele (uma partida completa salva por uma
      // versão antiga não é carregada: ela teria a mão do outro)
      if (on.role === 'host') {
        game = Game.load(s.saved);
        owners = on.owners || [];
      } else game = ViewGame.isSaved(s.saved) ? (ViewGame.load(s.saved) as unknown as Game) : null;
      seq = game ? on.seq : 0;
    } catch {
      game = null;
    }
  }
  seat = on.role === 'host' ? 0 : 1;
  view = seat;
  save(); // o openRoom gravou sem a partida: grava de novo já com ela
  render();
}

/** Configurações salvas por versões antigas usavam o índice do deck. */
function normSettings(s: any): Settings {
  const out = { ...DEFAULTS, ...s } as Settings;
  if (!isAiLevel(out.aiLevel)) out.aiLevel = DEFAULTS.aiLevel;
  out.decks = (out.decks || DEFAULTS.decks).map((d: any) => (typeof d === 'number' ? `pre:${d}` : String(d))) as [string, string];
  return out;
}

/** Quando a decisão volta para você (contra a IA ou online): o painel pisca e a aba avisa. */
let wasMine = true;
function yourTurnCue() {
  const d = game?.current;
  const mineNow = !!d && game!.engine.winner === null && !isOtherTurn() && !handoffPending && (vsAi() || online());
  if (mineNow && !wasMine) {
    const el = document.querySelector('.decision');
    el?.classList.add('yourturn');
    sfx('turn');
  }
  wasMine = mineNow || !(vsAi() || online());
  document.title = mineNow && document.hidden ? '● Sua vez · Riftbound Mesa' : 'Riftbound Mesa';
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) document.title = 'Riftbound Mesa';
});

/** Atalhos: Espaço = passar/encerrar o turno, Enter = confirmar, Esc = cancelar/fechar, Z = desfazer, M = volume dos sons, N = volume da música, E = emotes (online), T = tapete. */
function onKey(ev: KeyboardEvent) {
  const t = ev.target as HTMLElement;
  if (t?.id === 'chatin' && (ev.key === 'Enter' || ev.key === 'Escape')) {
    ev.preventDefault();
    if (ev.key === 'Enter') {
      const msg = chatDraft;
      chatDraft = '';
      sendChat(msg);
    }
    chatOpen = false;
    render();
    return;
  }
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (replay && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
    ev.preventDefault();
    replayGo(replay.pos + (ev.key === 'ArrowRight' ? 1 : -1));
    return;
  }
  if (ev.key === 'Escape') {
    if (armed || ctxMenu || moveSel.length || showAllOpts) {
      armed = null;
      ctxMenu = null;
      moveSel = [];
      showAllOpts = false;
      render();
    } else if (zoom || modal || dbState.zoom || dbState.modal || pickSeat !== null) {
      zoom = null;
      modal = null;
      dbState.zoom = null;
      dbState.modal = null;
      pickSeat = null;
      render();
    } else if (game?.canCancel && !isOtherTurn()) document.querySelector<HTMLElement>('[data-act=cancel]')?.click();
    return;
  }
  // deckbuilder: "/" vai para a busca
  if (!game && page === 'decks' && ev.key === '/') {
    const q = document.getElementById('dbq') as HTMLInputElement | null;
    if (q) {
      ev.preventDefault();
      q.focus();
      q.select();
    }
    return;
  }
  if (!game || !game.current || isOtherTurn() || handoffPending) return;
  const d = game.current;
  if (ev.key === ' ' || ev.code === 'Space') {
    if (t && t.tagName === 'BUTTON') return; // espaço num botão focado já clica nele
    armed = null;
    const o = d.options.find((x) => x.id === 'pass') || d.options.find((x) => x.id === 'end');
    if (o && !(d.max > 1 || d.min === 0)) {
      ev.preventDefault();
      answer([o.id]);
    }
  } else if (ev.key === 'Enter') {
    if (t && t.tagName === 'BUTTON') return; // Enter num botão focado já clica nele
    if (armed?.opt) {
      ev.preventDefault();
      armGo(armed.opt);
      return;
    }
    const trig = document.querySelector<HTMLButtonElement>('[data-act=trigok]');
    if (trig) {
      ev.preventDefault();
      trig.click();
      return;
    }
    const btn = document.querySelector<HTMLButtonElement>('[data-act=confirm]:not([disabled])');
    if (btn && !(t && t.tagName === 'BUTTON')) {
      ev.preventDefault();
      btn.click();
    }
  } else if (ev.key === '?') document.querySelector<HTMLElement>('[data-act=guide]')?.click();
  else if (ev.key === 'v' || ev.key === 'V') document.querySelector<HTMLElement>('[data-act=oracle]')?.click();
  else if (ev.key === 'z' || ev.key === 'Z') document.querySelector<HTMLElement>('.decision [data-act=undo]:not([disabled])')?.click();
  else if (ev.key === 'm' || ev.key === 'M') document.querySelector<HTMLElement>('[data-act=sound]')?.click();
  else if (ev.key === 'n' || ev.key === 'N') document.querySelector<HTMLElement>('[data-act=music]')?.click();
  else if (ev.key === 'e' || ev.key === 'E') document.querySelector<HTMLElement>('[data-act=emotetog]')?.click();
  else if (ev.key === 't' || ev.key === 'T') document.querySelector<HTMLElement>('[data-act=matpick]')?.click();
}

/** Fim de partida: guarda no histórico da conta e conta nas estatísticas do deck (uma vez por partida). */
function recordIfOver() {
  if (!game || replay || game.engine.winner === null) return;
  if (challengeOf(game)) return; // desafio: o progresso vai para a conta (challenges.ts), não para o histórico
  if (tut.isTut(game)) return; // o tutorial não entra no histórico nem nas estatísticas
  if (online() && watching()) return;
  // convidado: grava com a partida completa que o anfitrião manda no fim (até ela chegar, espera)
  const full = fullGame();
  if (!full) return;
  const mode: hist.HistMode = online() ? 'online' : vsAi() ? 'ai' : 'human';
  const mine: P = vsAi() ? HUMAN : online() ? seat : 0;
  // deck escolhido de cada lado (online: o meu é sempre settings.decks[0]; o do outro não se sabe)
  const prefer: [string | null, string | null] = online() ? (seat === 0 ? [settings.decks[0], null] : [null, settings.decks[0]]) : [settings.decks[0], settings.decks[1]];
  hist.recordGame(full, { mode, seat: mine, prefer });
  // partida de um confronto do torneio: o resultado (e o replay) vai para o organizador
  if (online()) tourRecord(full.cfg, full.answers, full.engine.winner, [full.engine.pl[0].points, full.engine.pl[1].points], full.engine.turn, seat);
  if (vsAi()) ladderRecord(full.cfg, full.engine.winner, HUMAN);
}

/** Configurações de antes do tutorial (ele joga como "contra a IA" com o oponente roteirizado). */
let tutPrev: Settings | null = null;
tut.init({
  game: () => game,
  start: (g) => {
    if (replay) exitReplay();
    if (!tutPrev) tutPrev = { ...settings };
    settings = { ...settings, opponent: 'ai', names: ['Você', 'Oponente'] };
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = null;
    game = g;
    view = HUMAN;
    ai = newAi();
    selected = [];
    preview = null;
    zoom = null;
    armed = null;
    moveSel = [];
    trigPlan = null;
    pickSeat = null;
    page = 'setup';
    render();
    scheduleAi();
  },
  exit: () => {
    game = null;
    zoom = null;
    armed = null;
    moveSel = [];
    render();
    window.scrollTo(0, 0);
  },
  render: () => render(),
  answer: (ids) => answer(ids),
  touch: () => touchUi(),
  zoomId: () => zoom,
  zoom: (id) => {
    zoom = id;
    armed = null;
    moveSel = [];
    render();
  },
  playEasy: () => {
    game = null;
    render(); // devolve as configurações de antes
    settings.opponent = 'ai';
    settings.aiLevel = 'easy';
    newGame();
  },
});

setHooks({
  render: () => render(),
  back: () => {
    page = 'setup';
    render();
    window.scrollTo(0, 0);
  },
  openReplay: (cfg, answers, v) => openReplay(cfg, answers, answers.length, { view: v }),
  play: (id) => {
    page = 'setup';
    settings.decks[0] = id;
    if (settings.opponent === 'online' && !net) settings.opponent = 'ai';
    save();
    render();
    window.scrollTo(0, 0);
  },
  touch: () => touchUi(),
});

// modo Desafios: a partida do desafio entra na mesa como uma partida contra a IA
const leaveGame = (to: typeof page) => {
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  game = null;
  ai = null;
  page = to;
  save();
  render();
  window.scrollTo(0, 0);
};
setChallengeHooks({
  play: (g) => {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = null;
    game = g;
    view = HUMAN;
    handoffPending = false;
    selected = [];
    armed = null;
    moveSel = [];
    pendingDrop = null;
    trigPlan = null;
    overlayHidden = '';
    ai = newAi();
    save();
    render();
    scheduleAi();
  },
  home: () => leaveGame('setup'),
  list: () => leaveGame('challenges'),
  render: () => render(),
});

// ───────────────────────────── escada contra a IA (src/ui/ladder.ts) ─────────────────────────────
function ladderTopbar(): string {
  return `<header class="topbar"><div class="brand">Riftbound <span>mesa</span></div><div class="turninfo"><button type="button" class="tb-acct" data-act="profile" title="Ver o perfil">${esc(acc.profile().name)} <span>${rating.rankStore().elo}</span></button></div>
    <div class="tb">${musicBoards().length ? `<button type="button" data-act="music" title="Volume da música (N)">${musicIcon()}</button>` : ''}</div></header>`;
}
/** Partida de um degrau: contra a IA no nível do degrau, com a trilha dele (o cfg leva a marca da escada). */
function startLadderGame(m: LadderMatch) {
  settings.opponent = 'ai';
  settings.decks[0] = m.deck;
  game = new Game({
    seed: (Math.random() * 2 ** 31) | 0,
    decks: [acc.deckById(m.deck), m.opp],
    names: [settings.names[0] === 'Jogador 1' ? acc.profile().name : settings.names[0], m.oppName],
    battlefieldMode: 'random',
    autoPass: settings.autoPass,
    aiLevel: m.aiLevel,
    music: m.music,
    ladder: m.ladder,
  } as GameConfig);
  selected = [];
  preview = null;
  overlayHidden = '';
  view = HUMAN;
  handoffPending = false;
  ai = newAi();
  save();
  render();
  window.scrollTo(0, 0);
  scheduleAi();
}
setProfileHooks({
  render: () => render(),
  home: () => {
    page = 'setup';
    render();
    window.scrollTo(0, 0);
  },
  open: (pg) => {
    if (replay) exitReplay();
    if (game) {
      game = null;
      save();
    }
    page = pg;
    render();
    window.scrollTo(0, 0);
  },
});
setLadderHooks({
  render: () => render(),
  home: () => {
    page = 'setup';
    render();
    window.scrollTo(0, 0);
  },
  open: () => {
    if (replay) exitReplay();
    // vindo do fim de uma partida: ela sai (como "Trocar decks"); da tela inicial, a partida salva fica onde está
    if (game) {
      game = null;
      save();
    }
    page = 'ladder';
    render();
    window.scrollTo(0, 0);
  },
  play: (m) => startLadderGame(m),
  edit: (id) => {
    page = 'decks';
    dbState.view = 'edit';
    dbState.deckId = id;
    dbState.sample = [];
    render();
    window.scrollTo(0, 0);
  },
});

// ───────────────────────────── torneio entre amigos (src/ui/tournament*.ts) ─────────────────────────────
/** Abre a sala de um confronto (anfitrião = lado a da chave; o outro entra; os demais assistem). */
function enterTourRoom(r: TourRoom) {
  if (replay) exitReplay();
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
  game = null;
  ai = null;
  pickSeat = null;
  settings.opponent = 'online';
  page = 'setup';
  setHash(null); // na sala, recarregar volta para a sala (não para a tela do torneio)
  openRoom(r.role, r.room, { pub: false, name: r.name, tour: { tag: r.tag, deck: r.deck } });
  window.scrollTo(0, 0);
}
setTourHooks({
  render: () => render(),
  home: () => {
    page = 'setup';
    render();
    window.scrollTo(0, 0);
  },
  play: (r) => enterTourRoom(r),
});
initTour({
  // o estado do torneio mudou: redesenha só se a tela do torneio está aberta (não mexe na mesa de uma partida)
  changed: () => {
    if (!game && !net && page === 'tour') scheduleRender();
  },
  openReplay: (cfg, answers) => openReplay(cfg, answers, answers.length, { view: 0 }),
});

function start(data: any = {}) {
  registerSw();
  const snap = data?.saved ? data : loadSaved();
  if (snap?.settings) settings = normSettings(snap.settings);
  if (settings.names[0] === 'Você' && acc.profile().name !== 'Você') settings.names[0] = acc.profile().name;
  if (data?.saved && !ViewGame.isSaved(data.saved)) {
    try {
      game = Game.load(data.saved);
      view = vsAi() ? HUMAN : data.view ?? game.current?.player ?? 0;
      ai = vsAi() ? newAi() : null;
    } catch {
      game = null;
    }
  }
  // link de convite: ...#sala-ABC123
  const hm = /^#sala-([A-Za-z0-9]{6})$/.exec(location.hash);
  if (hm && !game) {
    settings.opponent = 'online';
    joinCode = hm[1].toUpperCase();
  }
  // link de convite do torneio: ...#torneio-ABC123
  const tm = /^#torneio-([A-Za-z0-9]{6})$/.exec(location.hash);
  if (tm && !game) {
    page = 'tour';
    showTour(tm[1].toUpperCase());
  }
  // caiu ou recarregou no meio de uma sala online: volta sozinho para a mesma sala (o anfitrião manda o lance atual)
  const back = !data?.saved || ViewGame.isSaved(data.saved) ? loadSaved() : null;
  if (back?.online && !game && !tm && (!hm || hm[1].toUpperCase() === back.online.code)) {
    settings.opponent = 'online';
    resumeOnline(back);
  }
  document.addEventListener('click', onClick);
  // link de torneio colado na mesma aba (só o # muda: a página não recarrega)
  window.addEventListener('hashchange', () => {
    const h = /^#torneio-([A-Za-z0-9]{6})$/.exec(location.hash);
    if (!h || game || net) return;
    page = 'tour';
    showTour(h[1].toUpperCase());
    render();
  });
  document.addEventListener('keydown', onKey);
  const onField = (ev: Event) => {
    if (!game && page === 'decks') onDbInput(ev.target as HTMLElement);
  };
  document.addEventListener('input', (ev) => {
    const el = ev.target as HTMLInputElement;
    if (el.id === 'rrange') return replayGo(Number(el.value));
    if (el.id === 'chatin') chatDraft = el.value;
    if (el.id === 'name0') document.getElementById('roomname')?.setAttribute('placeholder', `Sala de ${el.value.trim() || 'Jogador'}`);
    if (el.id === 'roomname') {
      roomDraft.name = el.value;
      saveRoomDraft();
    }
    if (el.id === 'dbq' || el.id === 'cvy' || el.id === 'cvx' || el.id === 'cvz') onField(ev);
  });
  document.addEventListener('change', (ev) => {
    if ((ev.target as HTMLElement).id !== 'dbq') onField(ev);
    // sliders da capa: grava ao soltar
    if (/^cv[xyz]$/.test((ev.target as HTMLElement).id)) acc.persist();
  });
  document.addEventListener('mouseover', onHover);
  // deckbuilder: botão direito numa carta tira uma cópia
  document.addEventListener('contextmenu', (ev) => {
    if (!game && page === 'decks' && onDbContext(ev.target as HTMLElement)) ev.preventDefault();
  });
  document.addEventListener('pointerdown', onPointerDown);
  // duplo clique numa unidade pronta: escolhe todas as unidades prontas daquele lugar
  document.addEventListener('dblclick', (ev) => {
    const el = (ev.target as HTMLElement).closest('.tt-mat .card.movable') as HTMLElement | null;
    if (!el || !game) return;
    const u = game.engine.objs[el.dataset.obj!];
    if (!u?.loc) return;
    const same = [...frame.movable].filter((id) => {
      const o = game!.engine.objs[id];
      return o?.loc && game!.engine.locEq(o.loc, u.loc);
    });
    moveKey = decKey();
    moveSel = same;
    render();
  });
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', () => {
    endDrag();
    if (trigDrag) {
      trigDrag = null;
      render();
    }
  });
  window.addEventListener('resize', () => drawArrows());
  render();
  scheduleAi();
  // link de replay: ...#r=<código> abre direto no replay, do primeiro lance
  const rl = /^#r=([zj][A-Za-z0-9_-]+)$/.exec(location.hash);
  if (rl) {
    history.replaceState(null, '', location.pathname + location.search);
    void decodeReplay(rl[1])
      .then((d) => openReplay(d.cfg, d.answers, 0, { view: d.view as P }))
      .catch(() => {
        modal = { title: 'Replay', html: '<p>Este link de replay está incompleto ou quebrado: peça para enviarem de novo.</p>' };
        render();
      });
  }
}

const w = window as any;
w.claude?.hot?.snapshot?.(() => (tut.isTut(game) ? { settings: tutPrev ?? settings, saved: null, view } : { settings, saved: game?.serialize(), view }));
if (w.claude?.hot?.ready) w.claude.hot.ready(start);
else start(w.claude?.hot?.data ?? {});

// para depuração no console
w.__rb = {
  get game() {
    return game;
  },
  /** Assinatura do que é público (testes online: anfitrião, convidado e espectador têm de bater). */
  sig() {
    if (!game) return null;
    const e = game.engine;
    const board = Object.values(e.objs)
      .filter((o) => o.zone === 'board' || o.zone === 'trash' || o.zone === 'chain')
      .map((o) => `${o.id}:${o.code}:${o.zone}:${o.damage}:${o.exhausted ? 1 : 0}`)
      .sort();
    return JSON.stringify([game.answers.length, e.turn, e.active, e.winner, e.pl.map((p) => [p.points, p.hand.length, p.mainDeck.length, p.trash.length]), board]);
  },
};
export type { Loc };
