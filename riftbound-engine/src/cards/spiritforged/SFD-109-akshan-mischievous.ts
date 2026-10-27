import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Weaponmaster. Você pode pagar [Body][Body] como custo adicional para me jogar.
// Quando você me joga, se pagou o custo adicional, mova um gear inimigo para a sua base. Você o controla até eu sair do
// tabuleiro. Se for um equipamento, prenda-o em mim.
// - O gear é alvo, escolhido ao pôr o gatilho na pilha; pode estar preso a uma unidade e, se for equipamento, vem para
//   mim (FAQ riftjudge #657). Escolher um Hexdrinker preso não paga Deflect: o Deflect é da unidade (FAQ riftjudge #8669).
// - Preso a uma unidade, o gear não pode ser movido separado dela (regra 718.5.c) e nada manda soltá-lo (435.2.a): o
//   "mova para a sua base" é ignorado (359.3.e.6); prender em mim o solta da unidade anterior (434.1.f).
// - Se eu saio do tabuleiro antes de o gatilho resolver, o controle nem chega a mudar (regra 359.3.e.16, exemplo do
//   próprio Akshan); o gear solto ainda é movido, e a limpeza o devolve à base de quem o controla (regra 323.7; FAQ
//   riftjudge #5742); o preso continua preso à unidade em que estava (718.5.c, 435.2.a; ruling da comunidade na Joutes).
// - Quando eu saio do tabuleiro, o controle volta na hora; se ele estava preso em mim, solta-se e volta à base do
//   dono (FAQ riftjudge #11090); preso em outra unidade, continua preso a ela (FAQ riftjudge #8714 e #9043).
registerCard({
  code: 'SFD-109',
  keywords: { weaponmaster: true },
  optionalCosts: [{ label: 'Pagar [Body][Body] a mais para roubar um gear inimigo?', cost: E(0, 'Body', 'Body'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Roubar um gear inimigo (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [{ prompt: 'Akshan: mover qual gear inimigo para a sua base?', kind: 'gear', filter: (c, o) => o.controller !== c.p }],
      prepare: function* (c) {
        c.data.akshanVer = c.self.zoneVersion; // o Akshan que foi jogado
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const gear = c.targets[0][0];
        if (!gear || gear.zone !== 'board') return;
        // mover para a sua base (preso, não se move sozinho: 718.5.c)
        if (!gear.attachedTo) {
          gear.loc = { t: 'base', p: c.p };
          g.say(`${g.name(gear)} vai para a base de ${g.pname(c.p)}.`, c.p);
        }
        const here = c.self.zone === 'board' && c.self.zoneVersion === c.data.akshanVer;
        if (!here) return;
        g.gainControlUntilLeaves(gear, c.p, c.self);
        g.say(`${g.pname(c.p)} controla ${g.name(gear)} enquanto ${g.name(c.self)} estiver no tabuleiro.`, c.p);
        if (g.isEquipment(gear)) g.attach(gear, c.self, c.p);
      },
    },
  ],
});
