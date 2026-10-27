import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Unidade 12. Ao me jogar, acrescente a ficha de campo Baron Pit ao tabuleiro se ela ainda não estiver lá. Se fizer isso,
// eu entro lá. (Ela tem "Unidades podem se mover para cá de qualquer lugar".) Não posso ser escolhido por spells e
// habilidades inimigas. Outras unidades aliadas têm +2 de Might.
// - "Se fizer isso, eu entro lá" é uma substituição do local de entrada (exemplo do próprio Baron na regra 369.3): só
//   vale se o Baron Pit foi criado agora; se já existia, ele entra onde foi jogado. Vale também jogado por efeito.
// - Baron Pit (187.9): ficha de campo sem domínio; acrescentar não usa a pilha. Entrando lá sozinho, o campo fica
//   disputado e abre um showdown (conquista normal). O campo fica no tabuleiro (fichas de campo não são recicladas,
//   185.2.e). A ficha e o "de qualquer lugar" são do núcleo (g.createBattlefield, TOK-BARONPIT em src/cards/tokens.ts);
//   o local de entrada usa CardScript.enterLoc.
// - "Não posso ser escolhido": não é alvo válido de spells/habilidades inimigas (355.9.b, 757-758).
registerCard({
  code: 'UNL-147',
  enterLoc: (g, self, p, loc): Loc => {
    if (g.bfs.some((b) => g.objs[b.objId].code === 'TOK-BARONPIT')) return loc;
    const i = g.createBattlefield('TOK-BARONPIT', p);
    return { t: 'bf', i };
  },
  auras: [
    {
      might: (g, src, t) => (t.id !== src.id && t.controller === src.controller && g.isUnit(t) && src.zone === 'board' ? 2 : 0),
    },
    {
      cantBeChosen: (g, src, target, by) => target.id === src.id && src.zone === 'board' && by !== src.controller,
    },
  ],
});

