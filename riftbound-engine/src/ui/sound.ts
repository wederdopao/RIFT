// Sons da mesa: efeitos gerados na hora (Web Audio, sem arquivos) e vozes de campeões opcionais.
// A mesa chama `soundFromLog` a cada desenho com as linhas novas do registro; cada linha vira no máximo um som.
// Vozes: `voice/index.json` (site) mapeia o campeão (primeiro nome, minúsculo: "jinx") para arquivos por evento
// ({ "jinx": { "play": ["voice/jinx/play-1.ogg"], "attack": [...] } }). Sem o índice, só os efeitos tocam.
import type { Engine } from '../engine/engine';

type Sfx = 'play' | 'move' | 'combat' | 'damage' | 'death' | 'point' | 'conquer' | 'turn' | 'win' | 'lose' | 'buff' | 'draw';

const KEY = 'rb-sound';
const LEVELS = [0, 0.35, 0.7, 1];
let level = 2;
try {
  const raw = localStorage.getItem(KEY);
  const v = raw === null ? NaN : Number(raw);
  if (Number.isInteger(v) && v >= 0 && v < LEVELS.length) level = v;
} catch {}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
function audio(): AudioContext | null {
  if (!LEVELS[level]) return null;
  if (!ctx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as AudioContext;
    master = ctx.createGain();
    master.connect(ctx.destination);
  }
  master!.gain.value = LEVELS[level] * 0.5;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
// o navegador só libera áudio depois de um gesto da pessoa
if (typeof window !== 'undefined') window.addEventListener('pointerdown', () => ctx?.state === 'suspended' && ctx.resume().catch(() => {}), { passive: true });

/** Nível do volume (0 = mudo … 3 = alto). */
export const soundLevel = () => level;
export function cycleSound(): number {
  level = (level + 1) % LEVELS.length;
  try {
    localStorage.setItem(KEY, String(level));
  } catch {}
  if (level) sfx('buff');
  return level;
}
export const soundIcon = () => ['🔇', '🔈', '🔉', '🔊'][level];

function tone(a: AudioContext, t: number, freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; attack?: number } = {}) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  const peak = opts.gain ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(a: AudioContext, t: number, dur: number, opts: { gain?: number; freq?: number; q?: number; to?: number } = {}) {
  const n = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1200, t);
  if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
  f.Q.value = opts.q ?? 1;
  const g = a.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

const last: Partial<Record<Sfx, number>> = {};
export function sfx(kind: Sfx) {
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  if ((last[kind] ?? -1) > now - 0.12) return; // o mesmo som em rajada vira um só
  last[kind] = now;
  const t = now + 0.01;
  switch (kind) {
    case 'play': // carta saindo da mão: sopro curto e uma nota que sobe
      noise(a, t, 0.18, { freq: 900, to: 2600, gain: 0.18, q: 0.8 });
      tone(a, t + 0.05, 520, 0.22, { type: 'triangle', to: 780, gain: 0.18 });
      break;
    case 'move':
      noise(a, t, 0.25, { freq: 500, to: 1400, gain: 0.16, q: 0.6 });
      break;
    case 'combat': // choque: tambor grave e um brilho metálico
      tone(a, t, 140, 0.35, { type: 'sine', to: 55, gain: 0.55 });
      noise(a, t, 0.12, { freq: 3200, gain: 0.25, q: 2 });
      tone(a, t + 0.02, 1320, 0.25, { type: 'square', to: 990, gain: 0.05 });
      break;
    case 'damage':
      tone(a, t, 220, 0.16, { type: 'sine', to: 90, gain: 0.35 });
      noise(a, t, 0.08, { freq: 1800, gain: 0.15 });
      break;
    case 'death': // estilhaço que cai
      noise(a, t, 0.45, { freq: 2400, to: 300, gain: 0.3, q: 1.5 });
      tone(a, t, 330, 0.5, { type: 'sawtooth', to: 70, gain: 0.08 });
      break;
    case 'conquer':
      [392, 494, 587].forEach((f) => tone(a, t, f, 0.6, { type: 'triangle', gain: 0.12, attack: 0.02 }));
      break;
    case 'point': // arpejo brilhante
      [659, 784, 988, 1319].forEach((f, i) => tone(a, t + i * 0.07, f, 0.35, { type: 'triangle', gain: 0.16 }));
      break;
    case 'buff':
      tone(a, t, 660, 0.18, { type: 'sine', to: 990, gain: 0.14 });
      break;
    case 'draw':
      noise(a, t, 0.1, { freq: 3000, gain: 0.08, q: 0.7 });
      break;
    case 'turn': // sino de duas notas: é a sua vez
      tone(a, t, 880, 0.5, { type: 'sine', gain: 0.18 });
      tone(a, t + 0.14, 1175, 0.6, { type: 'sine', gain: 0.16 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(a, t + i * 0.12, f, 0.7, { type: 'triangle', gain: 0.18, attack: 0.02 }));
      break;
    case 'lose':
      [392, 349, 311, 262].forEach((f, i) => tone(a, t + i * 0.16, f, 0.6, { type: 'triangle', gain: 0.14, attack: 0.02 }));
      break;
  }
}

// ── vozes dos campeões (opcionais) ──
type VoiceIndex = Record<string, Partial<Record<'play' | 'attack' | 'death', string[]>>>;
let voices: VoiceIndex | null = null;
let voicesAsked = false;
function loadVoices() {
  if (voicesAsked || typeof fetch === 'undefined' || location.protocol === 'file:') return;
  voicesAsked = true;
  fetch('voice/index.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => (voices = j))
    .catch(() => {});
}
let voiceUntil = 0;
/** Fala do campeão (`name` é o nome da carta, "Jinx, Demolitionist"). Não sobrepõe falas. */
export function voice(name: string, ev: 'play' | 'attack' | 'death'): boolean {
  loadVoices();
  if (!LEVELS[level] || !voices || Date.now() < voiceUntil) return false;
  const key = name.split(',')[0].trim().toLowerCase();
  const list = voices[key]?.[ev];
  if (!list?.length) return false;
  const el = new Audio(list[Math.floor(Math.random() * list.length)]);
  el.volume = Math.min(1, LEVELS[level]);
  voiceUntil = Date.now() + 2500;
  el.play().catch(() => {});
  return true;
}

// ── do registro para os sons ──
let seen: { src: object | null; n: number } = { src: null, n: 0 };
/**
 * Toca os sons das linhas novas do registro (`src` = a partida: trocou, recomeça a leitura). `quiet` (replay, carregar partida, desfazer) só avança a leitura.
 * `me` = o jogador desta tela (vitória × derrota); `champIn` acha o nome de um campeão citado no texto.
 */
export function soundFromLog(src: object, eng: Engine, me: number, quiet: boolean, champIn: (text: string) => string | null) {
  if (seen.src !== src || eng.log.length < seen.n || quiet || eng.log.length - seen.n > 40) {
    seen = { src, n: eng.log.length };
    return;
  }
  loadVoices();
  const lines = eng.log.slice(seen.n);
  seen.n = eng.log.length;
  let played = 0;
  const once = (k: Sfx) => {
    if (played < 4) {
      sfx(k);
      played++;
    }
  };
  for (const l of lines) {
    const t = l.text;
    let m: RegExpExecArray | null;
    if (/vence a partida/.test(t)) once(l.player === undefined ? 'win' : l.player === me ? 'win' : 'lose');
    else if (/^⚔ Combate/.test(t)) once('combat');
    else if (/ morre\b/.test(t)) once('death');
    else if (/ganha \d+ ponto/.test(t)) once('point');
    else if (/assume o controle de/.test(t)) once('conquer');
    else if ((m = / joga (.+?)\.$/.exec(t))) {
      const champ = champIn(m[1]);
      if (!(champ && voice(champ, 'play'))) once('play');
    } else if ((m = /^(.+?) → /.exec(t))) {
      const champ = champIn(m[1]);
      if (!(champ && lines.some((x) => /^⚔ Combate/.test(x.text)) && voice(champ, 'attack'))) once('move');
    } else if (/recebe \d+ de dano/.test(t)) once('damage');
    else if (/recebe um Buff|fica Empowered/.test(t)) once('buff');
  }
}
