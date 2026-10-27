import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Gaste meu Buff: escolha um modo que você ainda não escolheu neste turno —
// 2 de dano numa unidade num campo / Stun numa unidade num campo / me prepare / me dê Ganking neste turno.
// Habilidade sem Action/Reaction: só no seu turno, fora de showdown e sem pilha (FAQ riftjudge #9601, #8763). O modo é
// escolhido ao ativar (regra 355.3) e conta como escolhido por este objeto neste turno.
const MODES = [
  { id: 'dmg', label: 'Causar 2 de dano a uma unidade num campo' },
  { id: 'stun', label: 'Atordoar (Stun) uma unidade num campo' },
  { id: 'ready', label: 'Me preparar' },
  { id: 'gank', label: 'Me dar Ganking neste turno' },
];
registerCard({
  code: 'OGN-157',
  activated: [
    {
      label: 'Gastar meu Buff: escolher um modo',
      spendBuffSelf: true,
      condition: (g, self) => {
        const d = self.data || {};
        return d.udyrKey !== `${g.turn}:${self.zoneVersion}` || (d.udyrUsed || []).length < MODES.length;
      },
      prepare: function* (c) {
        const d = (c.self.data ||= {});
        const key = `${c.g.turn}:${c.self.zoneVersion}`; // voltar ao tabuleiro faz um objeto novo
        const used: string[] = d.udyrKey === key ? d.udyrUsed : [];
        // modo de dano/Stun só se houver alvo possível (regra 355.16)
        const anyAtBf = c.g.units().some((u) => c.g.bfIndex(u) >= 0);
        const opts = MODES.filter((m) => !used.includes(m.id) && (anyAtBf || (m.id !== 'dmg' && m.id !== 'stun')));
        if (!opts.length) return false;
        const [m] = yield* c.g.ask(c.p, 'choose', 'Udyr: escolha um modo', opts);
        c.data.mode = m;
        d.udyrKey = key;
        d.udyrUsed = [...used, m];
        return true;
      },
      targets: (c) =>
        c.data.mode === 'dmg' || c.data.mode === 'stun'
          ? [{ prompt: `Udyr: ${c.data.mode === 'dmg' ? '2 de dano' : 'Stun'} em qual unidade?`, filter: (cc, o) => atBf(cc, o) }]
          : [],
      resolve: function* (c) {
        const g = c.g;
        const m = c.data.mode;
        const u = c.targets[0]?.[0];
        if (m === 'dmg' && u) g.dealDamage(u, 2, c.self);
        if (m === 'stun' && u) g.stun(u, c.p);
        if (m === 'ready' && c.self.zone === 'board') g.ready(c.self, c.p);
        if (m === 'gank' && c.self.zone === 'board') g.giveKw(c.self, { ganking: true });
      },
    },
  ],
});
