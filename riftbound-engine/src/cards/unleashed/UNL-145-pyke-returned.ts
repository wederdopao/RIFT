import { registerCard } from '../../engine/script';

// Campeão 3, Hidden, Backline. Uma vez por turno, quando uma unidade inimiga morre enquanto estou num campo de batalha,
// jogue uma ficha de gear Gold exaurida.
// - "Enquanto estou num campo" é parte da condição (383.2.a.1): conferido na morte. Se eu morro na mesma ação, não disparo
//   (383.2.c.2).
// - "Uma vez por turno" (383.3.e.1): depois de acontecer uma vez neste turno, não dispara mais. Com várias mortes
//   simultâneas, só uma vai para a pilha. Se eu sair do tabuleiro e voltar, sou outro objeto e conto de novo.
// - Gear vai para a base (ficha jogada sem local especificado).
const key = (turn: number, ver: number) => `${turn}:${ver}`;
registerCard({
  code: 'UNL-145',
  keywords: { hidden: true, backline: true },
  triggers: [
    {
      on: 'die',
      label: 'Jogar uma ficha Gold exaurida',
      cond: (c, ev) =>
        !!ev.obj && ev.controller !== c.p && c.g.isUnit(ev.obj) && c.g.bfIndex(c.self) >= 0 && c.self.data?.pykeOnce !== key(c.g.turn, c.self.zoneVersion),
      prepare: function* (c) {
        if (c.self.data?.pykeOnce === key(c.g.turn, c.self.zoneVersion)) return false;
        c.self.data = { ...(c.self.data || {}), pykeOnce: key(c.g.turn, c.self.zoneVersion) };
        return true;
      },
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
