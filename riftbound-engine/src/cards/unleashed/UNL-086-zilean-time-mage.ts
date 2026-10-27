import { registerCard } from '../../engine/script';

// Uma vez por turno, se você fosse jogar uma ficha de unidade enquanto estou num campo de batalha, você pode jogar
// essa ficha e mais uma cópia dela em vez disso.
// Substituição (369-373) aplicada por Engine.playTokensG (CardScript.tokenPlayReplace):
// - Só jogar ficha de unidade conta (fichas de gear, como Gold, não; "criar" ficha não é jogar).
// - "Uma vez por turno": marca o turno e o objeto (sair e voltar ao tabuleiro é outro objeto, 124). Recusar não gasta.
// - Vários Zileans: cada um se aplica uma vez à mesma jogada (370.2, 372; RiftJudge #10154).
// - Keeper of Masks jogando duas Reflection: dobra só uma das duas jogadas; as três viram cópias (RiftJudge #12467).
// - A cópia a mais herda as modificações da jogada (pronta etc., regra 375; RiftJudge #9917).
// - Se a ficha não pode ser jogada naquele local (Mageseeker Warden), não há jogada a substituir.
registerCard({
  code: 'UNL-086',
  tokenPlayReplace: function* (g, self, code, p, loc, inst) {
    if (g.bfIndex(self) < 0 || self.controller !== p) return 0;
    // caça UNL: cópia do texto no Svellsongur (inst) é outra instância, com o próprio "uma vez por turno" (370.2)
    const key = `${g.turn}:${self.zoneVersion}${inst ? `:${inst.id}` : ''}`;
    const mark = inst ? `zileanUsed:${inst.id}` : 'zileanUsed';
    if (self.data?.[mark] === key) return 0;
    const probe = g.newObj(code, p, 'setAside', true);
    const ok = g.playLocOk(p, probe, loc);
    delete g.objs[probe.id];
    if (!ok) return 0;
    if (!(yield* g.yesNo(p, `Zilean, Time Mage: jogar esta ficha ${g.name(probe)} e mais uma cópia dela? (uma vez por turno)`))) return 0;
    (self.data ||= {})[mark] = key;
    g.say(`Zilean, Time Mage: ${g.pname(p)} joga uma ficha ${g.name(probe)} a mais.`, p);
    return 1;
  },
});
