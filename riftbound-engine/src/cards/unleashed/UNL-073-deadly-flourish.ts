import { registerCard } from '../../engine/script';

// Cause 3 de dano a uma unidade inimiga. Quando ela morrer neste turno, jogue uma ficha de gear Gold exaurida.
// "Quando ela morrer neste turno" é um gatilho atrasado criado na resolução (vale para qualquer morte dela neste turno,
// não só pelo dano). Guarda só o id e a versão de zona (Delayed não guarda Obj: cópia da IA). Se ela sair do tabuleiro
// e voltar, é outro objeto (124) e não conta.
registerCard({
  code: 'UNL-073',
  spell: {
    label: 'Deadly Flourish',
    targets: [{ prompt: 'Deadly Flourish: 3 de dano em qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      g.dealDamage(u, 3, c.self);
      const id = u.id;
      const ver = u.zoneVersion;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'die',
        once: true,
        untilTurn: g.turn,
        cond: (_cc, ev) => ev.obj?.id === id && ev.snap?.zoneVersion === ver,
        ability: {
          label: 'Deadly Flourish: jogar uma Gold exaurida',
          resolve: function* (cc) {
            cc.g.createToken('TOK-GOLD', cc.p, { t: 'base', p: cc.p }, false);
          },
        },
      });
    },
  },
});
