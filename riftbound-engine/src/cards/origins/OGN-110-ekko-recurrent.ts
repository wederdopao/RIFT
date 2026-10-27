import { registerCard } from '../../engine/script';

// Accelerate. Deathknell: recicle-me para preparar suas runas.
// "Recicle-me" é custo dentro da instrução: é o custo-base do gatilho, pago ao pôr na pilha (regra 383.3.b, exemplo
// do próprio Ekko), e o jogador pode recusar pagá-lo — aí o gatilho sai da pilha (regra 404.2).
registerCard({
  code: 'OGN-110',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: reciclar Ekko para preparar suas runas',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      extraCost: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'trash') return false; // já saiu do descarte: não dá para pagar (regra 416.3)
        if (!(yield* g.yesNo(c.p, 'Ekko: pagar o custo (reciclar Ekko do descarte para o fundo do deck) para preparar suas runas?'))) return false;
        g.recycleCard(c.self);
        g.say(`${g.pname(c.p)} recicla Ekko.`, c.p);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        for (const r of g.runesOf(c.p)) g.ready(r, c.p);
        g.say(`${g.pname(c.p)} prepara as runas (Ekko).`, c.p);
      },
    },
  ],
});
