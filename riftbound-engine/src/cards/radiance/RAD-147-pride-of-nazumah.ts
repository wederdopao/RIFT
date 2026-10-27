import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// RAD-147 K'Sante, Pride of Nazumah — "[1], [Tap]: Give a friendly unit 'I have [Assault] equal to my [Shield]' this turn."
// A unidade ganha uma habilidade (texto entre aspas), não um número fixo: o Assault acompanha o Shield dela durante o
// turno inteiro (Shield ganho depois, como o do Ntofo Strikes, também conta). TempEffect.kwFrom + grantedKw.
registerCard({
  code: 'RAD-147',
  grantedKw: (_g, _u, k) => (k.shield ? { assault: k.shield } : undefined),
  activated: [
    {
      label: "[1], exaurir: uma unidade aliada ganha \"tenho Assault igual ao meu Shield\" neste turno",
      exhaustSelf: true,
      cost: E(1),
      targets: [{ prompt: 'Pride of Nazumah: qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        c.g.addEffect({ target: u.id, kwFrom: 'RAD-147', until: 'turn' });
        c.g.say(`${c.g.name(u)} tem Assault igual ao seu Shield neste turno.`, c.p);
      },
    },
  ],
});
