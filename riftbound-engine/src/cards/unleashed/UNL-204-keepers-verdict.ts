import { registerCard } from '../../engine/script';
// Signature Spell (Poppy): [Action]. Escolha uma unidade inimiga num campo. O dono dela a põe no topo ou no fundo do Main
// Deck dele.
// - A unidade é alvo (ao jogar); o dono escolhe topo ou fundo na resolução (355.10.e: escolha de outro jogador). Ficha
//   vai para o deck e deixa de existir (RiftJudge #9345). Anexados se soltam e ficam no local (719.5).
registerCard({
  code: 'UNL-204',
  keywords: { action: true },
  spell: {
    label: "Keeper's Verdict",
    targets: [{ prompt: "Keeper's Verdict: escolha uma unidade inimiga num campo", filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const owner = u.owner;
      const [w] = yield* g.ask(owner, 'choose', `Keeper's Verdict: pôr ${g.name(u)} no topo ou no fundo do seu deck?`, [
        { id: 'top', label: 'Topo do deck' },
        { id: 'bottom', label: 'Fundo do deck' },
      ]);
      g.toZone(u, 'mainDeck', { bottom: w === 'bottom' });
      g.say(`${g.pname(owner)} põe ${g.name(u)} no ${w === 'bottom' ? 'fundo' : 'topo'} do deck.`, owner);
    },
  },
});
