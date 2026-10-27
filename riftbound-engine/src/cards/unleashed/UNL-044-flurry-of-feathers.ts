import { registerCard, type TargetSpec } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// [Reaction]. Escolha um — • Anule (Counter) um spell. • Jogue quatro fichas de unidade Bird de 1 de Might com [Deflect].
// - O modo é escolhido ao jogar (355.3); o spell a anular é alvo (355.9.a.2; não pode ser este, 355.9.c).
// - As fichas não têm local especificado: cada uma vai para a sua base ou um campo que você controla, à sua escolha
//   (185.2.a, 355.2.a; o mesmo de Arise!).
const COUNTER: TargetSpec = { prompt: 'Flurry of Feathers: anular qual spell?', kind: 'spell' };
registerCard({
  code: 'UNL-044',
  keywords: { reaction: true },
  spell: {
    label: 'Flurry of Feathers',
    prepare: function* (c) {
      const g = c.g;
      const modes = g.targetCandidates(c, COUNTER).length ? ['counter', 'birds'] : ['birds'];
      const label: Record<string, string> = { counter: 'Anular um spell', birds: 'Jogar quatro fichas Bird 1 com Deflect' };
      const [m] = yield* g.ask(c.p, 'choose', 'Flurry of Feathers: escolha um modo', modes.map((x) => ({ id: x, label: label[x] })));
      c.data[`mode${c.rep}`] = m;
      return true;
    },
    targets: (c) => (c.data[`mode${c.rep}`] === 'counter' ? [COUNTER] : []),
    resolve: function* (c) {
      const g = c.g;
      if (c.data[`mode${c.rep}`] === 'counter') {
        const s = c.targets[0]?.[0];
        const item = s && g.chain.find((it) => it.cardId === s.id);
        if (item) g.counter(item);
        return;
      }
      for (let k = 0; k < 4; k++) {
        const loc = yield* chooseTokenLoc(c, `Flurry of Feathers: onde jogar a ficha Bird ${k + 1} de 4?`);
        if (!loc) break;
        yield* g.playTokenG('TOK-BIRD', c.p, loc);
      }
    },
  },
});
