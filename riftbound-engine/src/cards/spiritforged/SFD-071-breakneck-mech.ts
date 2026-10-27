import { registerCard } from '../../engine/script';

// Seus Mechs têm [Deflect] e [Ganking] (inclusive eu). Entro pronta se você controla outro Mech.
registerCard({
  code: 'SFD-071',
  keywords: {}, // sem palavras-chave próprias (o "[Deflect]" do texto é dado aos Mechs pela aura)
  auras: [
    {
      keywords: (g, src, t) =>
        src.zone === 'board' && t.controller === src.controller && g.isUnit(t) && g.hasTag(t, 'Mech')
          ? { deflect: 1, ganking: true }
          : undefined,
    },
  ],
  // ao ser jogada ela ainda não está no tabuleiro: qualquer Mech em jogo é "outro"
  entersReady: (g, self) => g.board().some((o) => o.id !== self.id && o.controller === self.controller && g.hasTag(o, 'Mech')),
});
