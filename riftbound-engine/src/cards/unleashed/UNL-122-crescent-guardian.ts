import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Unidade 4. Se você jogou um spell neste turno, pode pagar [Caos] como custo adicional para me jogar. Se pagar, entro pronta.
// - "Jogou" aqui é ter finalizado o spell na pilha neste turno, mesmo que ainda não tenha resolvido (FAQ oficial do
//   Unleashed, seção Legion: Battering Ram, Crescent Guardian e Legion usam o "play" de finalizar). Spells jogados por
//   efeito também contam (419.3.b).
// - Custo adicional opcional (355.1.a), escolhido ao jogar; "entro pronta" é a substituição do modo de entrar (369.3).
registerCard({
  code: 'UNL-122',
  optionalCosts: [
    {
      label: 'Pagar [Caos] como custo adicional para entrar pronta?',
      cost: E(0, 'Chaos'),
      flag: 'paid',
      enterReady: true,
      canPay: (g, self, p) => g.pl[p].played.some((id) => id !== self.id && g.kind(g.objs[id]) === 'spell'),
    },
  ],
});
