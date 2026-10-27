import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Reaction]. [Repeat] [2]. Compre 1.
// O custo do Repeat conta como energia gasta para jogar o spell (2 + 2 = [4]: Jhin, Meticulous Killer; RiftJudge #10012).
registerCard({
  code: 'UNL-061',
  keywords: { reaction: true },
  repeat: E(2),
  spell: {
    label: 'Downstage Dramatics',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 1);
    },
  },
});
