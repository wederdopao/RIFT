// Champion Decks do Origins, como vêm na caixa (lista do "Deckbuilding Primer" da Riot,
// transcrita no Piltover Archive). A campeã escolhida fica fora de `main`.
import type { DeckList } from '../engine/engine';

export const JINX_PRECON: DeckList = {
  name: 'Jinx (Champion Deck Origins)',
  legend: 'OGN-251', // Jinx, Loose Cannon
  champion: 'OGN-030', // Jinx, Demolitionist
  main: [
    ['OGN-169', 3], // Gust
    ['OGN-003', 3], // Chemtech Enforcer
    ['OGN-168', 3], // Fight or Flight (banida no padrão)
    ['OGN-182', 3], // Scrapheap (banida no padrão)
    ['OGN-185', 3], // Traveling Merchant
    ['OGN-008', 2], // Get Excited!
    ['OGN-036', 1], // Vi, Destructive
    ['OGN-006', 3], // Flame Chompers
    ['OGN-165', 2], // Cemetery Attendant
    ['OGN-024', 2], // Void Seeker
    ['OGN-019', 3], // Raging Soul
    ['OGN-180', 2], // Fading Memories
    ['OGN-001', 2], // Blazing Scorcher
    ['OGN-178', 2], // Undercover Agent
    ['OGN-002', 3], // Brazen Buccaneer
    ['OGN-011', 1], // Magma Wurm
    ['OGN-195', 1], // Rhasa the Sunderer
  ],
  runes: [
    ['OGN-007', 6], // Fury Rune
    ['OGN-166', 6], // Chaos Rune
  ],
  battlefields: ['OGN-298', 'OGN-289', 'OGN-285'], // Zaun Warrens, Targon's Peak, Reaver's Row (banido no padrão)
};

export const LEE_SIN_PRECON: DeckList = {
  name: 'Lee Sin (Champion Deck Origins)',
  legend: 'OGN-257', // Lee Sin, Blind Monk
  champion: 'OGN-151', // Lee Sin, Centered
  main: [
    ['OGN-043', 2], // Charm
    ['OGN-058', 3], // Discipline
    ['OGN-060', 1], // Mask of Foresight
    ['OGN-136', 3], // Pit Rookie
    ['OGN-052', 3], // Stalwart Poro
    ['OGN-128', 3], // Challenge
    ['OGN-132', 3], // First Mate
    ['OGN-152', 1], // Mistfall
    ['OGN-135', 2], // Pakaa Cub
    ['OGN-053', 2], // Stand United
    ['OGN-055', 3], // Wielder of Water
    ['OGN-147', 3], // Wildclaw Shaman
    ['OGN-065', 3], // Wizened Elder
    ['OGN-125', 2], // Bilgewater Bully
    ['OGN-157', 1], // Udyr, Wildman
    ['OGN-137', 2], // Stormclaw Ursine
    ['OGN-142', 2], // Mountain Drake
  ],
  runes: [
    ['OGN-042', 6], // Calm Rune
    ['OGN-126', 6], // Body Rune
  ],
  battlefields: ['OGN-280', 'OGN-289', 'OGN-282'], // Grove of the God-Willow, Targon's Peak, Monastery of Hirana
};

export const DECKS: DeckList[] = [JINX_PRECON, LEE_SIN_PRECON];

export function deckSize(d: DeckList) {
  return 1 + d.main.reduce((s, [, n]) => s + n, 0);
}
