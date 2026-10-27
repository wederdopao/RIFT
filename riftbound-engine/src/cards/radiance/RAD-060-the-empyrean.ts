import { registerCard } from '../../engine/script';
import { showOff, showedOff } from '../helpers';

// Show Off uma carta. Ao jogar, se fez Show Off, Predict igual ao custo de Power dela, depois compre 2.
registerCard({
  code: 'RAD-060',
  asPlayed: showOff(() => true, 'Show Off uma carta'),
  onPlay: [
    {
      label: 'Predict (Power da carta mostrada), depois comprar 2',
      resolve: function* (c) {
        const info = showedOff(c);
        if (!info) return;
        if (info.power > 0) yield* c.g.predict(c.p, info.power);
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
});
