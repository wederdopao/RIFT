import { registerCard } from '../../engine/script';
// Lenda:
// 1. Quando você recicla uma runa, você pode me exaurir para jogar uma ficha de gear Gold exaurida. Dispara para cada
//    runa reciclada, inclusive ao pagar power (motor: evento recycleRune); exaurir é o custo, então só uma vez enquanto
//    ela estiver exaurida.
// 2. Quando uma ou mais unidades inimigas morrem, me prepare: uma vez por morte simultânea (mesma ação de matar),
//    mesmo que morram várias (motor: lote de mortes no evento die).
registerCard({
  code: 'SFD-203',
  triggers: [
    {
      on: 'recycleRune',
      label: 'Jogar uma ficha Gold exaurida',
      optional: 'Exaurir Sivir para jogar uma ficha Gold exaurida?',
      cond: (c, ev) => ev.by === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
    {
      on: 'die',
      label: 'Unidade(s) inimiga(s) morreram: preparar a Sivir',
      cond: (c, ev) => {
        if (!c.g.isUnit(ev.obj) || ev.controller === c.p) return false;
        // a primeira unidade inimiga deste lote de mortes dispara; as outras do mesmo lote não
        const first = (ev.dying || []).find((d: any) => d.unit && d.controller !== c.p);
        return !first || first.id === ev.obj.id;
      },
      resolve: function* (c) {
        c.g.ready(c.self, c.p);
        c.g.say(`${c.g.name(c.self)} fica pronta.`, c.p);
      },
    },
  ],
});
