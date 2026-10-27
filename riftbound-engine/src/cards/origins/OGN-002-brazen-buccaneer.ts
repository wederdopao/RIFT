import { registerCard } from '../../engine/script';

// Ao me jogar, você pode descartar uma carta como custo adicional. Se fizer, meu custo cai em 2.
registerCard({
  code: 'OGN-002',
  optionalCosts: [
    {
      label: 'Descartar uma carta para reduzir o custo em 2?',
      flag: 'discarded',
      energyMod: -2,
      canPay: (g, self, p) => g.pl[p].hand.some((id) => id !== self.id),
      pay: function* (c) {
        const hand = c.g.pl[c.p].hand.filter((id) => id !== c.self.id);
        if (!hand.length) return false;
        yield* c.g.discard(c.p, 1, 'Brazen Buccaneer: descarte 1');
        return true;
      },
    },
  ],
});
