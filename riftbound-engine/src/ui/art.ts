// Artes oficiais das cartas. As imagens ficam em pacotes (dist/art/<pacote>.json, base64 de webp) e só os pacotes
// das cartas em jogo são baixados. Na versão para abrir direto no navegador os pacotes vêm embutidos na página.
// No site (__RB_ART_FILES__), cada carta é um arquivo art/<código>.webp: a URL sai na hora e o navegador baixa e guarda
// só as imagens que aparecem.
const w = window as any;
/** código da carta → nome do pacote (gerado no build) */
const INDEX: Record<string, string> = w.__RB_ART_INDEX__ || {};
/** pacotes já embutidos na página (versão offline) */
const INLINE: Record<string, Record<string, string>> = w.__RB_ART__ || {};
/** site: um arquivo por carta em vez de pacotes */
const FILES = !!w.__RB_ART_FILES__;

const urls = new Map<string, string>();
const loaded = new Set<string>();
const loading = new Map<string, Promise<void>>();
const failed = new Set<string>();

function addPack(name: string, pack: Record<string, string>) {
  for (const [code, b64] of Object.entries(pack)) {
    if (urls.has(code)) continue;
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      urls.set(code, URL.createObjectURL(new Blob([bytes], { type: 'image/webp' })));
    } catch {
      /* imagem corrompida: fica com a moldura gerada */
    }
  }
  loaded.add(name);
}
for (const [name, pack] of Object.entries(INLINE)) addPack(name, pack);

export function hasArt(code: string): boolean {
  return code in INDEX;
}

/** site com as artes em alta (art-hd/<código>.webp, scripts/art_hd.py) */
const HD = FILES && !!w.__RB_ART_HD__;

/** URL da arte (ou null se ainda não carregou / não existe). */
export function artUrl(code: string): string | null {
  if (FILES) return code in INDEX ? `art/${code}.webp` : null;
  return urls.get(code) ?? null;
}

/** Arte para mostrar a carta grande (ampliada, prévia, deckbuilder): a original em alta no site, para o texto da
 *  carta ficar legível; fora do site, a mesma de sempre. */
export function artHd(code: string): string | null {
  if (HD && code in INDEX) return `art-hd/${code}.webp`;
  return artUrl(code);
}

/** Baixa os pacotes com as artes destes códigos; chama `done` quando algum pacote novo chegar. */
export function ensureArt(codes: Iterable<string>, done: () => void) {
  if (FILES) return;
  const packs = new Set<string>();
  for (const c of codes) {
    const p = INDEX[c];
    if (p && !loaded.has(p) && !failed.has(p)) packs.add(p);
  }
  for (const p of packs) {
    if (loading.has(p)) continue;
    const pr = fetch(`art/${p}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((pack) => {
        addPack(p, pack);
        done();
      })
      .catch(() => {
        failed.add(p); // sem a arte: a carta aparece com a moldura gerada
      })
      .finally(() => loading.delete(p));
    loading.set(p, pr);
  }
}

export function artPending(): boolean {
  return loading.size > 0;
}
