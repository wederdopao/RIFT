// Replay por link: a partida inteira (cfg + respostas) comprimida (deflate) em base64url, no fim do endereço do site
// (…/#r=…). Quem abre o link cai direto no replay. Fora do site (versão offline, artifact) vira um código "rb1:…" que se
// cola em "Abrir replay". O texto é preparado antes (a compressão é assíncrona) para o clique só copiar.

export interface ReplayData {
  cfg: unknown;
  answers: string[][];
  view?: number;
}

const b64url = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer();
  return new Uint8Array(buf);
}
const canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Código da partida: "z" + deflate em base64url (ou "j" + JSON em base64url, sem CompressionStream). */
export async function encodeReplay(d: ReplayData): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ c: d.cfg, a: d.answers, v: d.view ?? 0 }));
  return canZip() ? 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw'))) : 'j' + b64url(json);
}
export async function decodeReplay(code: string): Promise<ReplayData> {
  const raw = fromB64url(code.slice(1));
  const bytes = code[0] === 'z' ? await pipe(raw, new DecompressionStream('deflate-raw')) : raw;
  const o = JSON.parse(new TextDecoder().decode(bytes));
  if (!o?.c || !Array.isArray(o.a)) throw new Error('replay inválido');
  return { cfg: o.c, answers: o.a, view: o.v === 1 ? 1 : 0 };
}

/** O site tem endereço para compartilhar; o arquivo offline e o artifact não. */
export const canLink = () => location.protocol === 'https:' || location.protocol === 'http:';
export const linkFor = (code: string) => `${location.origin}${location.pathname}#r=${code}`;
/** Texto colado em "Abrir replay": aceita o link inteiro, "#r=…" ou o código "rb1:…". */
export function codeFromText(t: string): string | null {
  const s = t.trim();
  const m = /#r=([zj][A-Za-z0-9_-]+)/.exec(s) || /^rb1:([zj][A-Za-z0-9_-]+)$/.exec(s);
  return m ? m[1] : null;
}

// preparado por partida: chave = semente + número de respostas
let ready: { key: string; code: string } | null = null;
let pending = '';
/** Prepara o código desta partida (uma vez por chave); `done` redesenha quando fica pronto. */
export function prepareReplay(key: string, d: ReplayData, done: () => void): string | null {
  if (ready?.key === key) return ready.code;
  if (pending !== key) {
    pending = key;
    void encodeReplay(d).then((code) => {
      if (pending !== key) return;
      ready = { key, code };
      done();
    });
  }
  return null;
}
