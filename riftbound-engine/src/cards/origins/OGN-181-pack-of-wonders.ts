import { registerCard } from '../../engine/script';
import type { Ctx, TargetSpec } from '../../engine/script';
import type { Obj } from '../../engine/types';

// [Tap]: devolva outro gear ou unidade aliada, ou uma carta virada para baixo sua, para a mão do dono.
const permSpec: TargetSpec = {
  prompt: 'Pack of Wonders: devolver qual gear ou unidade sua para a mão?',
  kind: 'permanent',
  filter: (c, o) => o.controller === c.p && o.id !== c.self.id,
};
const fdSpec: TargetSpec = {
  prompt: 'Pack of Wonders: devolver qual carta escondida sua para a mão?',
  kind: 'facedown',
  filter: (c, o) => o.controller === c.p,
};
const has = (c: Ctx, s: TargetSpec) => c.g.targetCandidates(c, s).length > 0;
registerCard({
  code: 'OGN-181',
  activated: [
    {
      label: 'Devolver outro gear, unidade ou carta escondida sua para a mão',
      exhaustSelf: true,
      condition: (g, self) => {
        const c = g.ctx(self, self.controller);
        return has(c, permSpec) || has(c, fdSpec);
      },
      prepare: function* (c) {
        const a = has(c, permSpec);
        const b = has(c, fdSpec);
        if (!a && !b) return false;
        if (a && b) {
          const [m] = yield* c.g.ask(c.p, 'choose', 'Pack of Wonders: devolver o quê?', [
            { id: 'perm', label: 'Um gear ou uma unidade' },
            { id: 'fd', label: 'Uma carta escondida' },
          ]);
          c.data.mode = m;
        } else c.data.mode = a ? 'perm' : 'fd';
        return true;
      },
      targets: (c) => (c.data.mode === 'perm' ? [permSpec] : c.data.mode === 'fd' ? [fdSpec] : []),
      resolve: function* (c) {
        const o: Obj | undefined = c.targets[0]?.[0];
        if (o) c.g.returnToHand(o);
      },
    },
  ],
});
