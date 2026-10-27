import { registerCard } from '../../engine/script';

// Reaction: previna todo o dano que seria causado neste turno por spells e habilidades (de qualquer jogador).
// O motor previne o dano causado enquanto um spell ou habilidade resolve (efeito 'preventSpellDamage' em dealDamage).
// Não é prevenido: dano de combate e dano que a carta manda uma unidade causar ("eles causam", "nós causamos":
// Challenge, Carnivorous Snapvine) — regra 417.6.b.3; FAQ riftjudge #116, #8166 e #8394.
registerCard({
  code: 'OGN-145',
  keywords: { reaction: true },
  spell: {
    label: 'Unyielding Spirit',
    resolve: function* (c) {
      c.g.addEffect({ flag: 'preventSpellDamage', until: 'turn' });
      c.g.say('Neste turno, o dano causado por spells e habilidades é prevenido.', c.p);
    },
  },
});
