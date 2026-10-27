import { registerCard } from '../../engine/script';
import type { Keywords } from '../../engine/types';

// Deflect. Quando eu me movo para um campo, dê a outra unidade aliada as minhas palavras-chave e +Might igual ao meu
// Might neste turno. (Errata: "outra" — FAQ oficial do Spiritforged.)
// A unidade é alvo (escolhida ao pôr o gatilho na pilha). Ela recebe as palavras-chave e o Might que o Kato tem na
// resolução, inclusive os ganhos durante a partida (buffs, equipamentos); mudanças depois não importam (FAQ oficial do
// Spiritforged, regras 359.3.f.1 e 359.3.f.2). Se o Kato saiu do tabuleiro, não há o que dar (regra 359.3.e.12).
registerCard({
  code: 'SFD-112',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'move',
      label: 'Dar minhas palavras-chave e meu Might a outra unidade aliada',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      targets: [{ prompt: 'Kato the Arm: qual outra unidade aliada?', filter: (c, o) => o.controller === c.p && o.id !== c.self.id }],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        const kw: Keywords = { ...g.kw(c.self) };
        const m = g.might(c.self);
        if (Object.keys(kw).length) {
          g.giveKw(u, kw);
          g.say(`${g.name(u)} recebe as palavras-chave de ${g.name(c.self)} neste turno.`);
        }
        if (m) g.giveMight(u, m);
      },
    },
  ],
});
