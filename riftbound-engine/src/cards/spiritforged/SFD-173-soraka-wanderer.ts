import { registerCard } from '../../engine/script';

// Devo receber dano de combate por último. Se outra unidade que você controla aqui fosse morrer, se ela tiver menos
// Might que eu, em vez disso cure-a, exaura-a e chame-a de volta (recall).
// - Substituição obrigatória (369-373): vale para qualquer morte (dano letal, instrução de matar, custo, Temporary —
//   RiftJudge #9872); custo pago com a morte substituída continua pago (FAQ #9045, #11534).
// - "Aqui" é o meu local, inclusive a base (FAQ #1171, #11248: na base o recall não muda o local, mas cura e exaure).
// - Comparação de Might no momento da morte.
// - Morrendo junto, ainda salva as outras (370.4). Aplica-se numa só sequência (373.2): com Guardian Angel, se ele a
//   salva primeiro, ela salva só as da base; se ela vai primeiro, salva as do campo e não volta a valer
//   (Engine.replaceDeathsG).
registerCard({
  code: 'SFD-173',
  damageLast: () => true,
  deathReplacements: [
    {
      label: 'curar, exaurir e chamar de volta para a base',
      applies: (g, self, dying) =>
        self.zone === 'board' &&
        dying.id !== self.id &&
        dying.zone === 'board' &&
        g.isUnit(dying) &&
        dying.controller === self.controller &&
        g.locEq(dying.loc, self.loc) &&
        g.might(dying) < g.might(self),
      apply: function* (g, self, dying) {
        dying.damage = 0;
        g.exhaust(dying);
        g.recall(dying);
        g.say(`${g.name(dying)} é curada, exaurida e volta para a base (Soraka, Wanderer).`);
        return true;
      },
    },
  ],
});
