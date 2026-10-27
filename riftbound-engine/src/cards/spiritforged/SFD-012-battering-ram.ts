import { registerCard } from '../../engine/script';

// Eu custo [1] a menos para cada carta que você jogou neste turno, até um mínimo de [1].
// "Jogou" numa habilidade que não é gatilho = cartas finalizadas (regra 419.4.b), inclusive spells ainda na pilha ou
// anulados; fichas não são cartas (185). O mínimo vale só para este desconto (356.4.e).
// O custo é calculado antes de esta jogada entrar na lista; uma jogada anterior do próprio Ram neste turno (voltou para
// a mão) também é "carta que você jogou neste turno" e conta.
registerCard({
  code: 'SFD-012',
  selfCostModMin: (g, self, p) => {
    const n = g.pl[p].played.length;
    return n > 0 ? { amount: n, min: 1 } : undefined;
  },
});
