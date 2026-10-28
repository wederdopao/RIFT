// Partida online entre dois aparelhos.
//
// Transporte (escolhido sozinho):
//  - dentro do app do Claude: o canal "room" da própria página (as pessoas com a página aberta conversam por ele);
//  - fora do app (site hospedado ou arquivo aberto no navegador): retransmissores MQTT públicos por WebSocket
//    seguro. Não depende de ligação direta entre aparelhos, então funciona em qualquer rede (inclusive 4G).
//    Usa dois retransmissores ao mesmo tempo e descarta repetidas, para não depender de um só.
//
// Protocolo: o anfitrião roda a partida "oficial" (só a máquina dele tem tudo: mãos, ordem dos decks, semente). O
// convidado manda pedidos de jogada; o anfitrião aplica na ordem e manda a cada um só a SUA visão da partida
// (src/engine/view.ts): a própria mão e o que é público, com as cartas escondidas do outro sem código. Nada de
// respostas nem semente sai do anfitrião durante a partida (com elas daria para refazer a partida e ver tudo); no fim
// a visão leva a partida completa (replay e histórico). A visão do convidado vai cifrada (ECDH + AES-GCM, chave
// combinada no hello/welcome): a sala é um canal aberto, e um espectador lendo as mensagens veria a mão do convidado.
// Mensagens podem se perder: há numeração (seq), diferença sobre a visão anterior (base), pedido de estado completo
// ("need") e batimentos ("ping"/"sync").
import type { P } from '../engine/types';
import type { DeckList } from '../engine/engine';

/** `undo` com `n`: pedido de desfazer aceito pelo oponente — volta até a resposta n (sempre uma decisão raiz). */
export type Op = { k: 'answer'; ids: string[] } | { k: 'batch'; list: string[][] } | { k: 'cancel' } | { k: 'undo'; n?: number };
/** `z`: carga empacotada (`pack`): visão completa (ViewState) ou diferença (ViewDiff); cifrada para o convidado. */
export type Msg =
  | { t: 'hello'; name: string; deck: DeckList; v: number; pk?: string }
  | { t: 'watch'; name: string; v: number }
  | { t: 'welcome'; hostName: string; hostDeck: string; pk?: string }
  | { t: 'start'; z: string; seq: number; you: P }
  | { t: 'lobby' }
  | { t: 'req'; z: string; seq: number }
  | { t: 'deny'; msg: string }
  | { t: 'need' }
  | { t: 'state'; z: string; seq: number }
  | { t: 'view'; z: string; seq: number; base: number }
  | { t: 'wstate'; z: string; seq: number }
  | { t: 'wview'; z: string; seq: number; base: number }
  | { t: 'sync'; seq: number }
  | { t: 'busy' }
  | { t: 'chat'; id: string; by: P; name: string; text: string }
  | { t: 'undoask'; seq: number }
  | { t: 'undoans'; ok: boolean; seq: number };

// 9: visão filtrada (start/state/view para o convidado, cifradas; wstate/wview para espectadores; req cifrado; sem
//    'op'); 8: hub de salas, chat, pedido de desfazer (undo com n); 7: verbo 'manualpay'; 6: DeckList.extraLegends
export const PROTOCOL = 9;

// ───────────────────────────── carga: compactar e cifrar ─────────────────────────────
const subtle: SubtleCrypto | undefined = (globalThis as any).crypto?.subtle;
const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let k = 0; k < bytes.length; k += 0x8000) bin += String.fromCharCode(...bytes.subarray(k, k + 0x8000));
  return btoa(bin);
};
const fromB64 = (s: string) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
};
async function pipe(bytes: Uint8Array, t: any): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(t);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
/** Par de chaves deste aparelho para combinar a chave do canal com o outro lado (null: navegador sem WebCrypto). */
export async function makeKeys(): Promise<{ pub: string; priv: CryptoKey } | null> {
  if (!subtle) return null;
  try {
    const kp = (await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'])) as CryptoKeyPair;
    return { pub: toB64(new Uint8Array(await subtle.exportKey('raw', kp.publicKey))), priv: kp.privateKey };
  } catch {
    return null;
  }
}
/** Chave do canal (a mesma dos dois lados) a partir da minha chave privada e da pública do outro. */
export async function sharedKey(priv: CryptoKey, pub: string | undefined): Promise<CryptoKey | null> {
  if (!subtle || !pub) return null;
  try {
    const other = await subtle.importKey('raw', fromB64(pub) as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return await subtle.deriveKey({ name: 'ECDH', public: other }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } catch {
    return null;
  }
}
/** Empacota uma carga: JSON compactado (deflate) e, com chave, cifrado. Formato "<z|r>[e]:<base64>". */
export async function pack(obj: unknown, key?: CryptoKey | null): Promise<string> {
  let bytes = enc.encode(JSON.stringify(obj));
  let f = 'r';
  const CS = (globalThis as any).CompressionStream;
  if (CS) {
    try {
      bytes = await pipe(bytes, new CS('deflate-raw'));
      f = 'z';
    } catch {
      /* sem compactação neste navegador */
    }
  }
  if (key && subtle) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes as BufferSource));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv);
    out.set(ct, 12);
    bytes = out;
    f += 'e';
  }
  return `${f}:${toB64(bytes)}`;
}
/** Abre uma carga de `pack` (lança se estiver cifrada e a chave não servir). */
export async function unpack(s: string, key?: CryptoKey | null): Promise<any> {
  const i = s.indexOf(':');
  const f = s.slice(0, i);
  let bytes = fromB64(s.slice(i + 1));
  if (f.includes('e')) {
    if (!key || !subtle) throw new Error('carga cifrada sem chave');
    bytes = new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12) as BufferSource));
  }
  if (f.startsWith('z')) bytes = await pipe(bytes, new (globalThis as any).DecompressionStream('deflate-raw'));
  return JSON.parse(dec.decode(bytes));
}

/** Sala anunciada no hub (lista de salas públicas). Chega de outros aparelhos: sempre conferir com `cleanListing`. */
export interface Listing {
  code: string;
  name: string;
  host: string;
  legend: string;
  champion: string;
  deck: string;
  /** open: esperando adversário; ready: adversário na sala, antes de começar; playing; over: partida acabou */
  state: 'open' | 'ready' | 'playing' | 'over';
  guest?: string;
  score?: [number, number];
  turn?: number;
  /** nome de quem está com o turno */
  active?: string;
  watchers?: number;
  v: number;
  at: number;
}
const LOBBY_ROOM = 'rbmesa-lobby';
const LOBBY_TOPIC = 'rbmesa/v3/lobby';
/** Sem anúncio por mais que isso: a sala sumiu. O anfitrião anuncia a cada ANNOUNCE_MS. */
const LISTING_TTL = 25000;
const ANNOUNCE_MS = 8000;

/** Texto curto vindo de outro aparelho: sem caracteres de controle/invisíveis, tamanho limitado. */
export function cleanText(s: unknown, max: number): string {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
export function cleanListing(x: any): Listing | null {
  if (!x || typeof x !== 'object') return null;
  const code = cleanCode(String(x.code ?? ''));
  if (code.length !== 6) return null;
  const st = ['open', 'ready', 'playing', 'over'].includes(x.state) ? x.state : 'open';
  const num = (v: any) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(999, Math.floor(v))) : undefined);
  const score = Array.isArray(x.score) && x.score.length === 2 ? ([num(x.score[0]) ?? 0, num(x.score[1]) ?? 0] as [number, number]) : undefined;
  return {
    code,
    name: cleanText(x.name, 32) || `Sala ${code}`,
    host: cleanText(x.host, 20) || 'Anfitrião',
    legend: cleanText(x.legend, 16),
    champion: cleanText(x.champion, 16),
    deck: cleanText(x.deck, 40),
    state: st,
    guest: x.guest ? cleanText(x.guest, 20) : undefined,
    score,
    turn: num(x.turn),
    active: x.active ? cleanText(x.active, 20) : undefined,
    watchers: num(x.watchers),
    v: typeof x.v === 'number' ? x.v : 0,
    at: typeof x.at === 'number' ? x.at : 0,
  };
}
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const W = globalThis as any;
/** Retransmissores MQTT (WebSocket seguro). Testes locais trocam com window.__RB_MQTT__. */
const brokers = (): string[] => W.__RB_MQTT__ || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];

export function newCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHA[(Math.random() * ALPHA.length) | 0];
  return s;
}
export function cleanCode(s: string): string {
  return s.toUpperCase().replace(/^.*SALA-/, '').replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/** Identidade deste navegador (fica a mesma depois de recarregar a página, para voltar à sala). */
function clientId(): string {
  if (W.__RB_CID__) return W.__RB_CID__; // testes
  try {
    let id = localStorage.getItem('rbmesa-cid');
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      localStorage.setItem('rbmesa-cid', id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

// ───────────────────────────── transportes ─────────────────────────────
interface LinkEvents {
  data(env: Env): void;
  up(): void;
  down(err?: string): void;
}
interface Link {
  kind: 'room' | 'mqtt';
  send(env: Env): void;
  close(): void;
}
/** Envelope: quem mandou, número da mensagem, para quem, e a mensagem. */
interface Env {
  f: string;
  s: string; // sessão (muda ao recarregar a página)
  i: number;
  to?: string;
  m: Msg | { t: 'ping' };
}

let roomApiP: Promise<any> | null = null;
function roomApi(): Promise<any> {
  if (!roomApiP) roomApiP = W.claude?.use ? W.claude.use('room').catch(() => null) : Promise.resolve(null);
  return roomApiP!;
}
/** Há canal "room" nesta página? (dentro do app do Claude) */
export async function inClaudeApp(): Promise<boolean> {
  return !!(await roomApi());
}

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (s: string) => {
  const bytes = enc.encode(s);
  let bin = '';
  for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
  return btoa(bin);
};
const unb64 = (s: string) => {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return dec.decode(bytes);
};

/** Canal "room" da página no app do Claude. Cada mensagem cabe em 4 KiB: as grandes vão em pedaços. */
async function roomLink(code: string, ev: LinkEvents): Promise<Link | null> {
  const api = await roomApi();
  if (!api) return null;
  let r: any;
  try {
    r = await api.join(`rbmesa-${code.toLowerCase()}`);
  } catch (e: any) {
    ev.down(
      e?.code === 'not_permitted'
        ? 'Sem permissão para jogar online nesta página. Quem compartilhou precisa te dar acesso de edição (Contribuidor ou acima).'
        : 'Não consegui entrar na sala agora. Tente de novo em instantes.',
    );
    return { kind: 'room', send() {}, close() {} };
  }
  const parts = new Map<string, { n: number; got: string[]; at: number }>();
  r.on(
    'mesa',
    (msg: any) => {
      if (msg.isMe) return;
      const d = msg.data;
      if (!d || typeof d !== 'object') return;
      if (d.ck) {
        // pedaço de mensagem grande
        const p = parts.get(d.ck) || { n: d.n, got: [], at: Date.now() };
        p.got[d.i] = d.d;
        parts.set(d.ck, p);
        if (p.got.filter((x) => x !== undefined).length === p.n) {
          parts.delete(d.ck);
          try {
            ev.data(JSON.parse(unb64(p.got.join(''))));
          } catch {
            /* pedaço corrompido: o protocolo pede o estado de novo */
          }
        }
        for (const [k, v] of parts) if (Date.now() - v.at > 30000) parts.delete(k);
        return;
      }
      ev.data(d as Env);
    },
    (e: any) => ev.down(e?.code === 'not_permitted' ? 'Sem permissão para mandar jogadas nesta página.' : undefined),
  );
  r.onConnection((c: boolean) => (c ? ev.up() : ev.down()));
  let ck = 0;
  return {
    kind: 'room',
    send(env) {
      const json = JSON.stringify(env);
      if (enc.encode(json).length < 3800) {
        r.emit('mesa', env).catch(() => {});
        return;
      }
      const data = b64(json);
      const size = 2800;
      const n = Math.ceil(data.length / size);
      const id = `${env.f}-${env.i}-${++ck}`;
      for (let k = 0; k < n; k++) r.emit('mesa', { ck: id, i: k, n, d: data.slice(k * size, (k + 1) * size) }).catch(() => {});
    },
    close() {
      r.leave().catch(() => {});
    },
  };
}

/** A biblioteca MQTT (324 KB) só baixa quando alguém entra numa sala: no site ela é um arquivo à parte (import
 *  dinâmico); no artifact e na versão offline o build a deixa embutida. */
let mqttLib: Promise<any> | null = null;
const loadMqtt = () => (mqttLib ??= import('mqtt').then((m: any) => m.default ?? m));

/** Retransmissores MQTT públicos: publica em todos os conectados e escuta todos (repetidas são descartadas). */
async function mqttLink(code: string, ev: LinkEvents): Promise<Link> {
  const mqtt = await loadMqtt();
  const topic = `rbmesa/v3/${code}`;
  const clients: any[] = [];
  let upCount = 0;
  for (const url of brokers()) {
    let c: any;
    try {
      c = mqtt.connect(url, { reconnectPeriod: 3000, connectTimeout: 8000, clean: true, keepalive: 30 });
    } catch {
      continue;
    }
    let isUp = false;
    c.on('connect', () => {
      c.subscribe(topic, { qos: 1 });
      if (!isUp) {
        isUp = true;
        upCount++;
        ev.up();
      }
    });
    const lost = () => {
      if (isUp) {
        isUp = false;
        upCount--;
        if (upCount <= 0) ev.down();
      }
    };
    c.on('close', lost);
    c.on('offline', lost);
    c.on('error', () => {});
    c.on('message', (_t: string, payload: Uint8Array) => {
      try {
        ev.data(JSON.parse(dec.decode(payload)));
      } catch {
        /* mensagem estranha: ignora */
      }
    });
    clients.push(c);
  }
  setTimeout(() => {
    if (upCount <= 0) ev.down('Sem conexão com o servidor de salas. Confira a internet.');
  }, 12000);
  return {
    kind: 'mqtt',
    send(env) {
      const s = JSON.stringify(env);
      for (const c of clients) if (c.connected) c.publish(topic, s, { qos: 1 });
    },
    close() {
      for (const c of clients) c.end(true);
    },
  };
}

// ───────────────────────────── hub de salas ─────────────────────────────
// Cada anfitrião de sala pública anuncia a sala; quem está no menu online escuta e monta a lista.
//  - room (app do Claude): sala nomeada "rbmesa-lobby". O anúncio vai na presença (some sozinho quando a página
//    fecha) e também como mensagem no tópico "mesa" a cada poucos segundos; quem chega pede os anúncios ("q").
//  - MQTT: mensagem retida em rbmesa/v3/lobby/<código>, repetida a cada poucos segundos (o horário vai junto, para
//    descartar anúncio velho). O "testamento" da conexão limpa o anúncio se o anfitrião cair; ao fechar, ele limpa.
interface LobbyHandlers {
  ann?(l: Listing): void;
  gone?(code: string): void;
  /** room: anúncios na presença de quem está no hub agora (substitui a lista anterior inteira) */
  peers?(list: Listing[]): void;
  query?(): void;
  up?(): void;
}
interface LobbyLink {
  kind: 'room' | 'mqtt';
  announce(l: Listing | null, code: string): void;
  query(): void;
  close(clearCode?: string): void;
}
async function lobbyLink(h: LobbyHandlers, hostCode?: string): Promise<LobbyLink> {
  const api = await roomApi();
  if (api) {
    let r: any = null;
    try {
      r = await api.join(LOBBY_ROOM);
    } catch {
      r = null;
    }
    if (!r) return { kind: 'room', announce() {}, query() {}, close() {} };
    r.on('mesa', (msg: any) => {
      if (msg.isMe) return;
      const d = msg.data;
      if (!d || typeof d !== 'object') return;
      if (d.lb === 'ann') {
        const l = cleanListing(d.l);
        if (l) h.ann?.(l);
      } else if (d.lb === 'gone') h.gone?.(cleanCode(String(d.code ?? '')));
      else if (d.lb === 'q') h.query?.();
    });
    const peers = (list: readonly any[]) => {
      if (!h.peers) return;
      const out: Listing[] = [];
      for (const p of list || []) {
        if (p?.isMe) continue;
        const l = cleanListing(p?.presence?.rb);
        if (l) out.push(l);
      }
      h.peers(out);
    };
    try {
      r.onPeers?.((c: any) => peers(c?.peers));
    } catch {
      /* sem presença: fica só com as mensagens */
    }
    setTimeout(() => {
      h.up?.();
    }, 50);
    r.onConnection?.((c: boolean) => c && h.up?.());
    return {
      kind: 'room',
      announce(l, code) {
        if (l) {
          r.emit('mesa', { lb: 'ann', l }).catch(() => {});
          r.presence?.({ rb: l })?.catch?.(() => {});
        } else {
          r.emit('mesa', { lb: 'gone', code }).catch(() => {});
          r.presence?.({ rb: null })?.catch?.(() => {});
        }
      },
      query() {
        r.emit('mesa', { lb: 'q' }).catch(() => {});
      },
      close(clearCode) {
        if (clearCode) r.emit('mesa', { lb: 'gone', code: clearCode }).catch(() => {});
        r.leave().catch(() => {});
      },
    };
  }
  const mqtt = await loadMqtt();
  const clients: any[] = [];
  const mine = hostCode ? `${LOBBY_TOPIC}/${hostCode}` : '';
  for (const url of brokers()) {
    let c: any;
    try {
      c = mqtt.connect(url, {
        reconnectPeriod: 3000,
        connectTimeout: 8000,
        clean: true,
        keepalive: 20,
        // anfitrião: se a conexão cair sem despedida, o retransmissor apaga o anúncio retido
        ...(mine ? { will: { topic: mine, payload: '', retain: true, qos: 1 } } : {}),
      } as any);
    } catch {
      continue;
    }
    c.on('connect', () => {
      if (!mine) c.subscribe(`${LOBBY_TOPIC}/+`, { qos: 0 });
      h.up?.();
    });
    c.on('error', () => {});
    c.on('message', (topic: string, payload: Uint8Array) => {
      const code = cleanCode(topic.split('/').pop() || '');
      if (!payload || !payload.length) return h.gone?.(code);
      try {
        const l = cleanListing(JSON.parse(dec.decode(payload)));
        if (l && l.code === code) h.ann?.(l);
      } catch {
        /* anúncio estranho: ignora */
      }
    });
    clients.push(c);
  }
  return {
    kind: 'mqtt',
    announce(l, code) {
      const s = l ? JSON.stringify(l) : '';
      for (const c of clients) if (c.connected) c.publish(`${LOBBY_TOPIC}/${code}`, s, { qos: 1, retain: true });
    },
    query() {},
    close(clearCode) {
      for (const c of clients) {
        if (clearCode && c.connected) {
          // limpa o anúncio retido antes de desligar
          let done = false;
          const end = () => {
            if (!done) (done = true), c.end(true);
          };
          c.publish(`${LOBBY_TOPIC}/${clearCode}`, '', { qos: 1, retain: true }, end);
          setTimeout(end, 1500);
        } else c.end(true);
      }
    },
  };
}

/** Lista de salas públicas, ao vivo (quem está no menu online). */
export class LobbyWatch {
  private ann = new Map<string, { l: Listing; seen: number }>();
  private pres = new Map<string, Listing>();
  private link: LobbyLink | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private sig = '';
  ready = false;
  /** sem conexão com o servidor de salas depois de alguns segundos */
  failed = false;
  constructor(private onChange: () => void) {
    void this.open();
  }
  private async open() {
    const link = await lobbyLink({
      ann: (l) => {
        // anúncio velho (retido de quem caiu sem limpar): ignora
        if (Math.abs(Date.now() - l.at) > LISTING_TTL * 3) return;
        this.ann.set(l.code, { l, seen: Date.now() });
        this.changed();
      },
      gone: (code) => {
        this.ann.delete(code);
        this.pres.delete(code);
        this.changed();
      },
      peers: (list) => {
        this.pres = new Map(list.map((l) => [l.code, l]));
        this.changed();
      },
      up: () => {
        this.ready = true;
        this.failed = false;
        this.link?.query();
        this.changed(true);
      },
    });
    if (this.closed) return link.close();
    this.link = link;
    link.query();
    this.timer = setInterval(() => this.changed(), 3000);
    setTimeout(() => {
      if (!this.ready && !this.closed) {
        this.failed = true;
        this.changed(true);
      }
    }, 12000);
  }
  /** Salas vivas: anunciadas há pouco ou presentes no hub agora. Abertas primeiro. */
  get rooms(): Listing[] {
    const now = Date.now();
    const out = new Map<string, Listing>();
    for (const [code, e] of this.ann) {
      if (now - e.seen > LISTING_TTL) this.ann.delete(code);
      else out.set(code, e.l);
    }
    for (const [code, l] of this.pres) {
      const a = out.get(code);
      if (!a || l.at > a.at) out.set(code, l);
    }
    const rank = { open: 0, ready: 1, playing: 2, over: 3 } as const;
    return [...out.values()].sort((a, b) => rank[a.state] - rank[b.state] || a.name.localeCompare(b.name));
  }
  private changed(force = false) {
    if (this.closed) return;
    const s = JSON.stringify(this.rooms.map((l) => ({ ...l, at: 0 })));
    if (force || s !== this.sig) {
      this.sig = s;
      this.onChange();
    }
  }
  close() {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.link?.close();
  }
}

// ───────────────────────────── sala ─────────────────────────────
export type NetStatus = 'abrindo' | 'esperando' | 'conectado' | 'reconectando' | 'erro';
const ALIVE_MS = 12000; // sem notícias do outro lado por mais que isso: desconectado

export class Net {
  status: NetStatus = 'abrindo';
  error = '';
  kind: 'room' | 'mqtt' | null = null;
  private link: Link | null = null;
  private me = clientId();
  private other: string | null = null; // o outro jogador (id do envelope)
  private lastHeard = 0;
  private counter = 0;
  private session = Math.random().toString(36).slice(2, 10);
  private recent = new Set<string>(); // mensagens já vistas (os dois retransmissores entregam em dobro)
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private linkUp = false;
  /** sessão do outro lado: se mudar, ele recarregou a página (o convidado se apresenta de novo) */
  private otherSession = '';
  /** anfitrião de sala pública: anúncio no hub */
  private lobby: LobbyLink | null = null;
  private lastAnn = '';
  private lastAnnAt = 0;
  /** sala pública (aparece no hub) e nome da sala */
  pub = false;
  roomName = '';
  private listing: (() => Listing | null) | null = null;

  /** Anfitrião: quem está assistindo (id → última notícia). */
  private watchers = new Map<string, number>();
  /** Quem mandou a última mensagem entregue (o anfitrião responde ao espectador certo). */
  lastFrom = '';

  private constructor(
    public role: 'host' | 'guest' | 'watch',
    public code: string,
    private onMsg: (m: Msg | { t: '__open' }) => void,
    private onChange: () => void,
  ) {
    void this.open();
  }
  static host(
    code: string,
    onMsg: (m: Msg | { t: '__open' }) => void,
    onChange: () => void,
    opts?: { pub: boolean; name: string; listing: () => Listing | null },
  ): Net {
    const n = new Net('host', code, onMsg, onChange);
    if (opts) {
      n.pub = opts.pub;
      n.roomName = opts.name;
      n.listing = opts.listing;
    }
    return n;
  }
  static join(code: string, onMsg: (m: Msg | { t: '__open' }) => void, onChange: () => void): Net {
    return new Net('guest', code, onMsg, onChange);
  }
  /** Só assistir: recebe as jogadas do anfitrião, não joga. */
  static watch(code: string, onMsg: (m: Msg | { t: '__open' }) => void, onChange: () => void): Net {
    return new Net('watch', code, onMsg, onChange);
  }
  get watcherCount() {
    const now = Date.now();
    return [...this.watchers.values()].filter((t) => now - t < ALIVE_MS * 2).length;
  }

  get connected() {
    return this.status === 'conectado';
  }

  private async open() {
    const ev: LinkEvents = {
      data: (env) => this.receive(env),
      up: () => {
        this.linkUp = true;
        if (this.error && this.status !== 'erro') this.error = '';
        this.refresh();
      },
      down: (err) => {
        this.linkUp = false;
        if (err) {
          this.error = err;
          if (!this.lastHeard) this.status = 'erro';
        }
        this.refresh();
      },
    };
    const room = await roomLink(this.code, ev);
    if (this.closed) return room?.close();
    const link = room ?? (await mqttLink(this.code, ev));
    if (this.closed) return link.close();
    this.link = link;
    this.kind = this.link.kind;
    if (this.role === 'host' && this.pub) {
      const lk = await lobbyLink({ query: () => this.announce(true), up: () => setTimeout(() => this.announce(true), 100) }, this.code);
      if (this.closed) lk.close(this.code);
      else this.lobby = lk;
    }
    // batimento: avisa que está vivo; o convidado repete o "olá" até o anfitrião responder
    this.timer = setInterval(() => this.tick(), 2000);
    this.tick();
    this.onChange();
  }

  private tick() {
    if (this.closed || !this.link) return;
    if (this.role !== 'host' && (!this.other || Date.now() - this.lastHeard > ALIVE_MS)) this.onMsg({ t: '__open' });
    else if (this.role === 'host') this.raw({ t: 'ping' }, '*');
    else if (this.role === 'guest') this.raw({ t: 'ping' });
    else this.raw({ t: 'ping' }); // espectador: o anfitrião sabe que ainda tem gente assistindo
    this.announce();
    this.refresh();
  }

  /** Anfitrião de sala pública: anuncia a sala no hub (quando muda, ou a cada poucos segundos). */
  announce(force = false) {
    if (!this.lobby || this.closed) return;
    const l = this.listing?.() ?? null;
    if (!l) return;
    const key = JSON.stringify({ ...l, at: 0 });
    if (!force && key === this.lastAnn && Date.now() - this.lastAnnAt < ANNOUNCE_MS) return;
    this.lastAnn = key;
    this.lastAnnAt = Date.now();
    this.lobby.announce(l, this.code);
  }

  /** Recalcula o estado da sala (e avisa a tela se mudou). */
  private refresh() {
    const before = this.status + this.error;
    const alive = !!this.other && Date.now() - this.lastHeard < ALIVE_MS;
    if (this.status === 'erro' && !alive) {
      /* fica no erro até ouvir alguém */
    } else if (!this.linkUp && !alive) this.status = this.other ? 'reconectando' : 'abrindo';
    else if (alive) this.status = 'conectado';
    else this.status = this.role === 'host' ? 'esperando' : this.other ? 'reconectando' : 'abrindo';
    if (this.status === 'conectado') this.error = '';
    if (before !== this.status + this.error) this.onChange();
  }

  private receive(env: Env) {
    if (!env || typeof env !== 'object' || env.f === this.me || !env.m) return;
    if (env.to && env.to !== this.me) return;
    const key = `${env.s}:${env.i}`;
    if (this.recent.has(key)) return;
    this.recent.add(key);
    if (this.recent.size > 600) this.recent = new Set([...this.recent].slice(-300));
    const m = env.m;
    this.lastFrom = env.f;
    if (this.role === 'host') {
      // espectadores: "watch", pedidos de estado e batimentos (não viram o jogador da sala)
      if (m.t === 'watch' || (this.watchers.has(env.f) && env.f !== this.other)) {
        this.watchers.set(env.f, Date.now());
        if (m.t === 'watch' || m.t === 'need') this.onMsg(m);
        return;
      }
      if (m.t === 'hello') {
        const busy = this.other && this.other !== env.f && Date.now() - this.lastHeard < ALIVE_MS;
        if (busy) return this.raw({ t: 'busy' }, env.f);
        this.other = env.f;
      } else if (env.f !== this.other) return;
    } else if (this.role === 'watch') {
      // espectador: só a visão de espectador (a do convidado é dele); o primeiro estado que chega diz quem é o anfitrião
      if (m.t === 'start' || m.t === 'state' || m.t === 'view') return;
      if (!this.other && m.t === 'wstate') this.other = env.f;
      else if (env.f !== this.other) return;
      if (this.hostReloaded(env)) this.onMsg({ t: '__open' }); // anfitrião voltou: pede o estado de novo
    } else {
      if (m.t === 'busy') {
        this.error = 'Essa sala já tem outro jogador.';
        this.status = 'erro';
        return this.onChange();
      }
      if (m.t === 'wstate' || m.t === 'wview') return; // visão de espectador: não é para o convidado
      if (m.t === 'welcome') this.other = env.f;
      else if (env.f !== this.other) return;
      // o anfitrião recarregou a página: não sabe mais quem é o convidado — apresenta-se de novo na hora
      if (this.hostReloaded(env) && m.t !== 'welcome') this.onMsg({ t: '__open' });
    }
    this.lastHeard = Date.now();
    this.refresh();
    if (m.t !== 'ping') this.onMsg(m);
  }

  private hostReloaded(env: Env): boolean {
    const was = this.otherSession;
    this.otherSession = env.s;
    return !!was && was !== env.s;
  }

  private raw(m: Env['m'], to?: string) {
    if (!this.link) return;
    // '*' = a sala toda (convidado e espectadores filtram pelo remetente)
    this.link.send({ f: this.me, s: this.session, i: ++this.counter, to: to === '*' ? undefined : (to ?? this.other ?? undefined), m });
  }

  send(m: Msg) {
    // "hello"/"watch" vão para a sala toda (ainda não se sabe quem é o anfitrião); o anfitrião manda a visão dos
    // espectadores, o batimento, a volta para a sala e o chat para a sala toda; a visão do convidado só para ele
    const all = m.t === 'hello' || m.t === 'watch' || (this.role === 'host' && (m.t === 'wview' || m.t === 'wstate' || m.t === 'sync' || m.t === 'lobby' || m.t === 'chat'));
    this.raw(m, all ? '*' : (this.other ?? undefined));
  }
  /** Anfitrião: manda só para quem mandou a última mensagem (resposta a um espectador). */
  reply(m: Msg) {
    this.raw(m, this.lastFrom || undefined);
  }
  /** Anfitrião: esse remetente é o outro jogador da sala (e não um espectador)? */
  isOther(id: string) {
    return !!id && id === this.other;
  }
  /** Anfitrião: manda para um destinatário guardado antes (resposta que sai depois de empacotar). */
  sendTo(m: Msg, to: string) {
    this.raw(m, to || undefined);
  }

  close() {
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.link?.close();
    // sala pública: sai do hub
    if (this.lobby) {
      this.lobby.announce(null, this.code);
      this.lobby.close(this.code);
    }
  }
}
