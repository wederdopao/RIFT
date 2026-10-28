// Tapetes da mesa: os de feltro (só CSS, valem em qualquer lugar) e as ilustrações dos tabuleiros do Legends of
// Runeterra (assets/mats, baixadas por scripts/lor_mats.py; só no site, como a música). Todos liberados. A escolha fica
// no aparelho (localStorage). 'auto' = o tabuleiro da música da partida, se houver ilustração dele; senão o clássico.

export interface Mat {
  id: string;
  name: string;
  /** ilustração (LoR); sem ela é um feltro de CSS (classe .mat-<id>) */
  src?: string;
}

export const FELTS: Mat[] = [
  { id: 'classico', name: 'Clássico' },
  { id: 'esmeralda', name: 'Esmeralda' },
  { id: 'carmesim', name: 'Carmesim' },
  { id: 'vazio', name: 'Vazio' },
  { id: 'ardosia', name: 'Ardósia' },
  { id: 'areia', name: 'Areia' },
];

const KEY = 'rb-mat';
let choice = 'auto';
try {
  choice = localStorage.getItem(KEY) || 'auto';
} catch {}

let lor: Mat[] = [];
let asked = false;
const waiting = new Set<() => void>();
/** Carrega a lista das ilustrações (uma vez); `then` roda quando ela chega. Como em music.ts, não chama `then` se já
 *  carregou (quem chamou já desenhou com ela). */
export function loadMats(then?: () => void) {
  if (lor.length) return;
  if (then) waiting.add(then);
  if (asked || typeof fetch === 'undefined' || location.protocol === 'file:') return;
  asked = true;
  fetch('mats/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { mats?: Mat[] } | null) => {
      if (!j?.mats?.length) return;
      lor = j.mats;
      const fs = [...waiting];
      waiting.clear();
      for (const f of fs) f();
    })
    .catch(() => {});
}
export const lorMats = () => lor;
export const matChoice = () => choice;
export function setMat(id: string) {
  choice = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}

/** O tapete a desenhar: a escolha, ou (em 'auto' / escolha que não existe aqui) o do tabuleiro da música. */
export function currentMat(trackId?: string): Mat {
  const all = [...FELTS, ...lor];
  if (choice !== 'auto') {
    const m = all.find((x) => x.id === choice);
    if (m) return m;
  }
  return (trackId && lor.find((x) => x.id === trackId)) || FELTS[0];
}

/** Classe e estilo para o <main class="tt-mat">. */
export function matAttrs(m: Mat): { cls: string; style: string } {
  if (m.src) return { cls: ' mat-art', style: `--mat-img:url('${m.src}')` };
  return { cls: m.id === 'classico' ? '' : ` mat-${m.id}`, style: '' };
}
