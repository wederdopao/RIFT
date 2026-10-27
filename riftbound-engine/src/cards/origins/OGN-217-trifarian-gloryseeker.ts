import { registerCard } from '../../engine/script';

// Legion: quando você me joga, me dê Buff.
registerCard({
  code: 'OGN-217',
  onPlay: [
    {
      label: 'Legion: receber Buff',
      prepare: function* (c) {
        return c.g.legion(c.self, c.p);
      },
      resolve: function* (c) {
        c.g.buff(c.self, c.p);
      },
    },
  ],
});
