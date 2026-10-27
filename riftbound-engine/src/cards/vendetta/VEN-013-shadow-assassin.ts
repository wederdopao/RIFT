import { registerCard } from '../../engine/script';

// Shadow Assassin
registerCard({
  code: 'VEN-013',
  // "you" = quem me joga (o controlador, já definido ao finalizar), não necessariamente o dono; "my name" = o meu nome.
  // A própria carta já saiu do descarte ao ser jogada (riftboundfaq.com, Shadow Assassin: só outra cópia conta).
  entersReady: (g, self) => {
    const name = g.data(self).name;
    return g.pl[self.controller].trash.some((id) => g.data(g.objs[id]).name === name);
  },
});
