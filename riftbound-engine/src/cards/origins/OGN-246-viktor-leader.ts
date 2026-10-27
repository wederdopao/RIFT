import { registerCard } from '../../engine/script';

// Quando outra unidade não-Recruit que você controla morre, jogue uma ficha Recruit de 1 de Might na sua base.
registerCard({
  code: 'OGN-246',
  triggers: [
    {
      on: 'die',
      label: 'Ficha Recruit na base',
      cond: (c, ev) =>
        !!ev.obj &&
        ev.obj.id !== c.self.id &&
        ev.controller === c.p &&
        c.g.isUnit(ev.obj) &&
        !c.g.data(ev.obj).tags.includes('Recruit'),
      // morrendo ao mesmo tempo que a outra unidade, o Viktor não consegue disparar (383.2.c.2): o motor emite as
      // mortes simultâneas depois de todas saírem do tabuleiro
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
