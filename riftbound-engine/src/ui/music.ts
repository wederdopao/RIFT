// Música: os temas de tabuleiro do Legends of Runeterra (assets/music, baixados por scripts/lor_music.py) tocando em
// loop na partida, o tema do menu fora dela e as de vitória/derrota no fim. Cada deck escolhe a sua trilha no
// deckbuilder (SavedDeck.music: id do tabuleiro, '' = sorteada, 'none' = sem música). Só no site: a versão offline
// (file://) e o artifact não têm a pasta music/, e tudo aqui vira silêncio.

export interface Track {
  id: string;
  name: string;
  src: string;
}
interface MusicIndex {
  fixed: Partial<Record<'menu' | 'start' | 'victory' | 'defeat', { name: string; src: string }>>;
  boards: Track[];
}

const KEY = 'rb-music';
const LEVELS = [0, 0.18, 0.35, 0.6];
let level = 2;
try {
  const raw = localStorage.getItem(KEY);
  const v = raw === null ? NaN : Number(raw);
  if (Number.isInteger(v) && v >= 0 && v < LEVELS.length) level = v;
} catch {}

let index: MusicIndex | null = null;
let asked = false;
const waiting = new Set<() => void>(); // sem repetir: quem chama a cada desenho passa sempre a mesma função
/** Carrega o índice (uma vez); `then` roda só quando ele chega (ex.: redesenhar para mostrar a lista do deckbuilder). */
export function loadMusic(then?: () => void) {
  if (index) return; // já carregou: quem chamou já desenhou com ele (chamar `then` aqui viraria um laço de redesenho)
  if (then) waiting.add(then);
  if (asked || typeof fetch === 'undefined' || location.protocol === 'file:') return;
  asked = true;
  fetch('music/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j: MusicIndex | null) => {
      if (!j?.boards) return;
      index = j;
      const fs = [...waiting];
      waiting.clear();
      for (const f of fs) f();
      apply();
    })
    .catch(() => {});
}
/** Os tabuleiros com música (vazio enquanto o índice não chegou ou fora do site). */
export const musicBoards = (): Track[] => index?.boards ?? [];

export const musicLevel = () => level;
export const musicIcon = () => (level ? '🎵' : '🔕');
export function cycleMusic(): number {
  level = (level + 1) % LEVELS.length;
  try {
    localStorage.setItem(KEY, String(level));
  } catch {}
  apply();
  return level;
}

// ── tocador: um <audio> por vez, com fade ──
let el: HTMLAudioElement | null = null;
let cur = ''; // src tocando
let want: { src: string; loop: boolean } | null = null;
let unlocked = false;
if (typeof window !== 'undefined')
  window.addEventListener(
    'pointerdown',
    () => {
      unlocked = true;
      apply();
    },
    { passive: true },
  );

function fade(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = a.volume;
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else done?.();
  };
  requestAnimationFrame(step);
}
function apply() {
  const vol = LEVELS[level];
  if (!want || !vol) {
    if (el) {
      const old = el;
      fade(old, 0, 500, () => old.pause());
    }
    el = null;
    cur = '';
    return;
  }
  if (el && cur === want.src) {
    el.volume = vol;
    el.loop = want.loop;
    return;
  }
  if (!unlocked) return; // o navegador só toca depois de um clique
  if (el) {
    const old = el;
    fade(old, 0, 700, () => old.pause());
  }
  const a = new Audio(want.src);
  a.loop = want.loop;
  a.volume = 0;
  el = a;
  cur = want.src;
  a.play()
    .then(() => fade(a, vol, 1200))
    .catch(() => {});
}
function play(src: string | undefined, loop: boolean) {
  const next = src ? { src, loop } : null;
  if (next?.src === want?.src && next?.loop === want?.loop) return;
  want = next;
  apply();
}

/** Trilha de um deck: o id escolhido, sorteada pela partida (`seed`) ou nenhuma. */
export function deckTrack(choice: string | undefined, seed: number): Track | null {
  const bs = musicBoards();
  if (choice === 'none' || !bs.length) return null;
  return bs.find((b) => b.id === choice) ?? bs[Math.abs(seed) % bs.length];
}

/** A cena atual decide o que toca: menu, partida (com a trilha do deck) ou fim (vitória/derrota, uma vez). */
let endKey = '';
/** Prévia do deckbuilder tocando: o tema do menu não a interrompe (o deckbuilder é "menu"). */
let previewOn = false;
export const stopPreview = () => (previewOn = false);
export function musicScene(scene: { kind: 'menu' } | { kind: 'game'; choice?: string; seed: number } | { kind: 'end'; won: boolean; key: string }) {
  loadMusic();
  if (!index) return;
  if (scene.kind === 'menu') {
    endKey = '';
    if (previewOn) return;
    return play(index.fixed.menu?.src, true);
  }
  previewOn = false;
  if (scene.kind === 'game') {
    endKey = '';
    return play(deckTrack(scene.choice, scene.seed)?.src, true);
  }
  if (endKey === scene.key) return;
  endKey = scene.key;
  play((scene.won ? index.fixed.victory : index.fixed.defeat)?.src, false);
}

/** Prévia no deckbuilder: toca a trilha escolhida (ou para, se já for ela). */
export function previewTrack(id: string): boolean {
  loadMusic();
  unlocked = true;
  const t = musicBoards().find((b) => b.id === id);
  if (!t || want?.src === t.src) {
    previewOn = false;
    play(index?.fixed.menu?.src, true);
    return false;
  }
  previewOn = true;
  play(t.src, true);
  return true;
}
