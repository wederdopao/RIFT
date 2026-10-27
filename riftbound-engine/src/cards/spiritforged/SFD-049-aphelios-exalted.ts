import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';

// Quando você anexa um Equipment a mim, escolha um modo que ainda não foi escolhido neste turno —
// preparar 2 runas / canalizar 1 runa exaurida / dar um Buff a uma unidade aliada.
// O modo é escolhido ao pôr o gatilho na pilha (regra 355.3) e as runas/unidade são alvos (regra 355.7).
// Cada instância do texto (cópia do Svellsongur, c.gear) controla os próprios modos já escolhidos (RiftJudge FAQ #326 e
// #8411); a cópia não vê o anexar do próprio Svellsongur (ver SFD-059).
const MODES = [
  { id: 'ready', label: 'Preparar 2 runas' },
  { id: 'channel', label: 'Canalizar 1 runa exaurida' },
  { id: 'buff', label: 'Dar um Buff a uma unidade aliada' },
];
const keyOf = (c: Ctx) => `aph:${c.gear?.id ?? 'impresso'}`; // cópia do Svellsongur: c.gear
registerCard({
  code: 'SFD-049',
  triggers: [
    {
      on: 'attach',
      label: 'Escolher um modo ainda não escolhido neste turno',
      cond: (c, ev) =>
        ev.unit?.id === c.self.id && ev.player === c.p && !!ev.obj && c.g.isEquipment(ev.obj),
      prepare: function* (c) {
        const g = c.g;
        const d = (c.self.data ||= {});
        const stamp = `${g.turn}:${c.self.zoneVersion}`; // voltar ao tabuleiro faz um objeto novo
        const rec = d[keyOf(c)];
        const used: string[] = rec?.stamp === stamp ? rec.used : [];
        const runes = g.board().filter((o) => g.kind(o) === 'rune').length;
        const friends = g.units().some((u) => u.controller === c.p);
        // modos com alvos possíveis (regra 355.8)
        const opts = MODES.filter((m) => !used.includes(m.id) && (m.id !== 'ready' || runes >= 2) && (m.id !== 'buff' || friends));
        if (!opts.length) return false;
        const [m] = yield* g.ask(c.p, 'choose', 'Aphelios: escolha um modo', opts);
        c.data.mode = m;
        d[keyOf(c)] = { stamp, used: [...used, m] };
        return true;
      },
      targets: (c) =>
        c.data.mode === 'ready'
          ? [{ prompt: 'Aphelios: preparar quais 2 runas?', kind: 'rune', min: 2, max: 2 }]
          : c.data.mode === 'buff'
            ? [{ prompt: 'Aphelios: dar um Buff a qual unidade sua?', filter: (cc, o) => o.controller === cc.p }]
            : [],
      resolve: function* (c) {
        const g = c.g;
        const m = c.data.mode;
        if (m === 'ready') for (const r of c.targets[0] || []) g.ready(r, c.p);
        else if (m === 'channel') g.channel(c.p, 1, true);
        else if (m === 'buff') {
          const u = c.targets[0]?.[0];
          if (u) g.buff(u, c.p);
        }
      },
    },
  ],
});
