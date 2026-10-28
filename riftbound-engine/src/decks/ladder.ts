// Escada contra a IA: os 5 adversários, em ordem de dificuldade (a ordem segue a força dos decks medida em partidas
// IA × IA entre eles e contra os starters, e o nível da IA sobe junto). Cada um tem um deck temático montado à mão (legal no
// Padrão: 40 cartas, 12 runas, 3 campos, sem banidas), o nível da IA e o tema de tabuleiro do Legends of Runeterra
// que toca na partida (id em assets/music/index.json). Testes: tests/escada.test.ts.
import type { DeckList } from '../engine/engine';
import type { AiLevel } from '../ai/ai';

export interface LadderRung {
  id: string;
  /** nome do adversário na mesa */
  name: string;
  /** apelido curto embaixo do nome */
  title: string;
  /** frase de apresentação */
  quote: string;
  /** a ideia do deck, em uma linha */
  plan: string;
  level: AiLevel;
  /** tema de tabuleiro (id da trilha em music/index.json) */
  track: string;
  deck: DeckList;
}

const RUNE = { Fury: 'OGN-007', Calm: 'OGN-042', Mind: 'OGN-089', Body: 'OGN-126', Chaos: 'OGN-166', Order: 'OGN-214' };

/** Aggro de Fúria: unidades baratas, Assault e dano direto; a lenda dá +1 a cada unidade jogada. */
const RENGAR: DeckList = {
  name: 'Rengar, Caçada Sangrenta',
  legend: 'UNL-183', // Rengar, Pridestalker
  champion: 'SFD-025', // Rengar, Pouncing
  main: [
    ['OGN-010', 3], // Legion Rearguard
    ['UNL-002', 3], // Inferna
    ['RAD-088', 3], // Staunch Survivor
    ['OGN-136', 3], // Pit Rookie
    ['UNL-003', 2], // Mischievous Marai
    ['SFD-006', 3], // Eager Drakehound
    ['UNL-006', 3], // Sharkling
    ['VEN-009', 2], // Baccai Reaper
    ['OGN-130', 2], // Crackshot Corsair
    ['SFD-025', 2], // Rengar, Pouncing
    ['UNL-024', 2], // Rengar, Unseen
    ['OGN-015', 2], // Captain Farron
    ['OGN-009', 3], // Hextech Ray
    ['SFD-003', 2], // Blood Rush
    ['OGS-003', 2], // Incinerate
    ['OGN-128', 2], // Challenge
  ],
  runes: [
    [RUNE.Fury, 6],
    [RUNE.Body, 6],
  ],
  battlefields: ['OGN-294', 'OGN-277', 'OGN-289'], // Trifarian War Camp, Back-Alley Bar, Targon's Peak
};

/** Control de Mente: remoção, cartas e spells grandes (a lenda compra a cada spell de 5+). */
const LUX: DeckList = {
  name: 'Lux, Luz Implacável',
  legend: 'OGS-021', // Lux, Lady of Luminosity
  champion: 'OGS-006', // Lux, Illuminated
  main: [
    ['OGN-087', 3], // Lecturing Yordle
    ['OGN-097', 2], // Blastcone Fae
    ['OGS-014', 2], // Lux, Crownguard
    ['OGN-086', 2], // Jeweled Colossus
    ['SFD-158', 2], // Sandshifter
    ['OGN-092', 2], // Riptide Rex
    ['OGN-116', 1], // Thousand-Tailed Watcher
    ['OGS-006', 1], // Lux, Illuminated
    ['OGN-095', 2], // Stupefy
    ['OGN-093', 2], // Smoke Screen
    ['UNL-063', 2], // Eclipse
    ['UNL-159', 2], // Soul Harvest
    ['SFD-070', 2], // Wages of Pain
    ['OGN-083', 2], // Consult the Past
    ['OGN-085', 3], // Falling Comet
    ['SFD-164', 2], // Drag Under
    ['OGN-229', 2], // Vengeance
    ['OGS-012', 2], // Blast of Power
    ['OGN-105', 2], // Singularity
    ['OGN-114', 1], // Progress Day
  ],
  runes: [
    [RUNE.Order, 6],
    [RUNE.Mind, 6],
  ],
  battlefields: ['OGN-280', 'UNL-211', 'OGN-279'], // Grove of the God-Willow, Forgotten Library, Fortified Position
};

/** Vendetta com Empower: unidades que ficam mais fortes ao serem Empowered; a lenda acompanha e prepara unidades. */
const AMBESSA: DeckList = {
  name: 'Ambessa, Matilha de Noxus',
  legend: 'VEN-153', // Ambessa, Matriarch of War
  champion: 'VEN-084', // Ambessa, The Wolf
  main: [
    ['VEN-074', 3], // Legion Marauder
    ['VEN-128', 3], // Noxian Emissary
    ['VEN-070', 3], // Brutal Hunter
    ['VEN-122', 3], // Solari Sunhawk
    ['VEN-134', 2], // Kayle, Justified
    ['VEN-078', 2], // Baccai Witherclaw
    ['VEN-082', 2], // Profiteer
    ['VEN-084', 2], // Ambessa, The Wolf
    ['VEN-136', 2], // Ambessa, Respected and Feared
    ['VEN-130', 2], // Aurok General
    ['VEN-079', 1], // Dame the Despoiler
    ['VEN-077', 2], // Tools of Empire
    ['VEN-075', 2], // Platewyrm Egg
    ['VEN-072', 3], // Guttural Roar
    ['VEN-154', 3], // Public Execution
    ['VEN-127', 2], // Lacerate
    ['UNL-159', 2], // Soul Harvest
  ],
  runes: [
    [RUNE.Body, 6],
    [RUNE.Order, 6],
  ],
  battlefields: ['VEN-163', 'OGN-283', 'VEN-162'], // Risen Altar, Navori Fighting Pit, Protective Sands
};

/** Radiance com gear e Deploy: Bombas nos campos, gear de Deploy e o Ziggs dando dano extra às habilidades de gear. */
const ZIGGS: DeckList = {
  name: 'Ziggs, Fogos de Artifício',
  legend: 'RAD-141', // Ziggs, Hexplosives Expert
  champion: 'RAD-023', // Ziggs, Short-Fused
  main: [
    ['RAD-001', 3], // Amateur Demolitionist
    ['SFD-006', 3], // Eager Drakehound
    ['RAD-003', 3], // Bilgewater Tracker
    ['RAD-014', 2], // Shimmering Swimmer
    ['RAD-112', 2], // Ziggs, Explosive
    ['RAD-023', 2], // Ziggs, Short-Fused
    ['RAD-094', 2], // Explosimian
    ['OGN-191', 2], // Maddened Marauder
    ['RAD-104', 1], // Pitiless Stalker
    ['RAD-002', 2], // Banner of Conquest
    ['RAD-017', 1], // Detonation Amplifier
    ['OGN-017', 2], // Iron Ballista
    ['RAD-106', 1], // The Good Stuff
    ['RAD-142', 2], // Hexplosive Minefield
    ['RAD-096', 2], // Satchel Charge
    ['OGN-009', 3], // Hextech Ray
    ['OGN-024', 2], // Void Seeker
    ['RAD-013', 2], // Lost to the Sands
    ['OGS-003', 1], // Incinerate
    ['OGN-169', 1], // Gust
  ],
  runes: [
    [RUNE.Fury, 6],
    [RUNE.Chaos, 6],
  ],
  battlefields: ['OGN-296', 'RAD-163', 'SFD-220'], // Void Gate, Hunters' Circle, Treasure Hoard
};

/** Chefe: Kai'Sa com remoção pesada (Icathian Rain, Void Seeker), ameaças grandes e spells que voltam do descarte. */
const KAISA: DeckList = {
  name: "Kai'Sa, Filha do Vazio",
  legend: 'OGN-247', // Kai'Sa, Daughter of the Void
  champion: 'OGN-039', // Kai'Sa, Survivor
  main: [
    ['OGN-039', 2], // Kai'Sa, Survivor
    ['OGN-112', 2], // Kai'Sa, Evolutionary
    ['RAD-063', 1], // Kai'Sa, Rebel
    ['SFD-006', 2], // Eager Drakehound
    ['SFD-013', 2], // Blast Corps Cadet
    ['OGN-097', 2], // Blastcone Fae
    ['OGN-087', 2], // Lecturing Yordle
    ['RAD-058', 2], // Riptide Mage
    ['OGN-092', 2], // Riptide Rex
    ['OGN-116', 1], // Thousand-Tailed Watcher
    ['OGN-009', 3], // Hextech Ray
    ['OGS-003', 2], // Incinerate
    ['OGN-095', 2], // Stupefy
    ['OGN-093', 2], // Smoke Screen
    ['OGN-029', 2], // Falling Star
    ['OGN-024', 3], // Void Seeker
    ['OGN-083', 2], // Consult the Past
    ['OGN-085', 2], // Falling Comet
    ['OGN-105', 1], // Singularity
    ['OGN-248', 2], // Icathian Rain
  ],
  runes: [
    [RUNE.Fury, 6],
    [RUNE.Mind, 6],
  ],
  battlefields: ['SFD-217', 'OGN-298', 'RAD-164'], // Seat of Power, Zaun Warrens, Packed Amphitheater
};

export const LADDER: LadderRung[] = [
  {
    id: 'rengar',
    name: 'Rengar',
    title: 'O Caçador',
    quote: 'Você é a presa mais interessante desta temporada. Corra.',
    plan: 'Aggro de Fúria: unidades baratas com Assault, dano direto e pressão desde o 1º turno.',
    level: 'easy',
    track: 'ascended-oasis',
    deck: RENGAR,
  },
  {
    id: 'ziggs',
    name: 'Ziggs',
    title: 'O Especialista em Hexplosivos',
    quote: 'Relaxa, essa aqui quase nunca explode antes da hora!',
    plan: 'Radiance com gear e Deploy: Bombas nos campos, gear de Deploy e dano extra das habilidades de gear.',
    level: 'easy',
    track: 'hextech-lab',
    deck: ZIGGS,
  },
  {
    id: 'ambessa',
    name: 'Ambessa',
    title: 'A Matriarca da Guerra',
    quote: 'Lobos não pedem licença. Cada golpe meu deixa a matilha mais forte.',
    plan: 'Vendetta com Empower: unidades que crescem ao serem Empowered e a lenda que prepara as melhores.',
    level: 'normal',
    track: 'reckoner-s-arena',
    deck: AMBESSA,
  },
  {
    id: 'lux',
    name: 'Lux',
    title: 'A Dama da Luz',
    quote: 'Demacia me ensinou a esconder a luz. Hoje não vou esconder nada.',
    plan: 'Control de Mente: responde tudo, compra cartas e fecha com spells grandes.',
    level: 'hard',
    track: 'hall-of-valor',
    deck: LUX,
  },
  {
    id: 'kaisa',
    name: "Kai'Sa",
    title: 'Filha do Vazio — chefe final',
    quote: 'Sobrevivi ao Vazio sozinha. Você não é a coisa mais assustadora que já cacei.',
    plan: 'Chefe: remoção pesada, ameaças grandes e spells que voltam do descarte quando ela conquista.',
    level: 'hard',
    track: 'summoner-s-rift',
    deck: KAISA,
  },
];

/** Vidas por escada: perdeu todas, a escada recomeça do 1º degrau. */
export const LADDER_LIVES = 3;
