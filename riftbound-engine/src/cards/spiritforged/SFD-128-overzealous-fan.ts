import { registerCard } from '../../engine/script';

// Quando eu defendo, você pode me matar para mover uma unidade atacante para a base dela.
// "Me matar" é o custo do gatilho, pago ao pô-lo na pilha, e a unidade atacante é alvo escolhido nessa hora (regras
// 383.3.b e 355.5.b; FAQ riftjudge #12915). "A base dela" é a base do controlador (a unidade só pode estar na base
// de quem a controla).
registerCard({
  code: 'SFD-128',
  triggers: [
    {
      on: 'defend',
      label: 'Mover uma unidade atacante para a base',
      optional: 'Matar Overzealous Fan para mover uma unidade atacante para a base dela?',
      cond: (c, ev) => !ev.playerLevel && ev.unit?.id === c.self.id,
      targets: [{ prompt: 'Overzealous Fan: mover qual unidade atacante para a base?', filter: (c, o) => o.role === 'attacker' }],
      canPayExtra: (c) => c.self.zone === 'board',
      extraCost: function* (c) {
        if (c.self.zone !== 'board') return false;
        yield* c.g.killG(c.self, 'é sacrificada');
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
