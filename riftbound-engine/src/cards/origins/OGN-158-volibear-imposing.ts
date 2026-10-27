import { registerCard } from '../../engine/script';

// Shield 3, Tank. Quando um oponente move para um campo de batalha que não é o meu, compre 1. (Bases não são campos.)
// Rulings (FAQ riftjudge #568, #2499, #2574, #8279, #8399, #8448): o Volibear precisa estar num campo; dispara quando
// uma ou mais unidades do oponente se movem (não importa quem mandou mover) para outro campo; uma compra por movimento,
// mesmo que várias unidades se movam juntas. Jogar uma unidade direto num campo não é mover.
registerCard({
  code: 'OGN-158',
  keywords: { shield: 3, tank: true },
  triggers: [
    {
      on: 'move',
      label: 'Oponente moveu para outro campo: comprar 1',
      cond: (c, ev) => {
        const mine = c.g.bfIndex(c.self);
        if (mine < 0 || ev.to?.t !== 'bf' || ev.to.i === mine) return false;
        // um disparo por movimento: só no evento da primeira unidade inimiga do lote
        const first = (ev.units || [ev.unit]).find((u: any) => u.controller !== c.p);
        return !!first && first.id === ev.unit?.id;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
