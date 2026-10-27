import { registerCard } from '../../engine/script';
import { T } from '../helpers';
import { chooseMode } from './_rad';

// Quando fico exaurido, escolha um que não foi escolhido neste turno: Buff em mim; gaste meu Buff para atordoar; gaste meu Buff para me preparar.
registerCard({
  code: 'RAD-043',
  triggers: [
    {
      on: 'exhaust',
      label: 'Riven: escolher um modo',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      prepare: function* (c) {
        const g = c.g;
        const d = (c.self.data ||= {});
        const used: string[] = d.rivenTurn === g.turn ? d.rivenUsed || [] : [];
        const opts: { id: string; label: string }[] = [];
        if (!used.includes('buff')) opts.push({ id: 'buff', label: 'Dar Buff a mim' });
        if (!used.includes('stun') && c.self.buffs > 0 && g.units().some((u) => u.controller !== c.p)) opts.push({ id: 'stun', label: 'Gastar meu Buff para atordoar uma unidade inimiga' });
        if (!used.includes('ready') && c.self.buffs > 0) opts.push({ id: 'ready', label: 'Gastar meu Buff para me preparar' });
        const m = yield* chooseMode(c, 'Riven: escolha um', opts);
        if (!m) return false;
        c.data.mode = m;
        d.rivenTurn = g.turn;
        d.rivenUsed = [...used, m];
        return true;
      },
      targets: (c) => (c.data.mode === 'stun' ? [T.enemyUnit('Riven: atordoar qual unidade inimiga?')] : []),
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        if (c.data.mode === 'buff') g.buff(c.self, c.p);
        else if (c.data.mode === 'stun') {
          const u = c.targets[0]?.[0];
          if (u && g.spendBuff(c.self, c.p)) g.stun(u, c.p);
        } else if (c.data.mode === 'ready') {
          if (g.spendBuff(c.self, c.p)) g.ready(c.self, c.p);
        }
      },
    },
  ],
});
