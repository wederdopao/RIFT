import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Undying Legion. [Legion][>] Você pode me jogar do seu descarte por [3][Fury].
// - Legion é palavra-chave dependente (812): a permissão só vale se você já jogou (finalizou) outra carta neste turno
//   (812.1.c). "Por [3][Fury]" substitui o custo base (356.1.a); descontos e custos adicionais valem normalmente.
// - Motor: a permissão de jogar do descarte com custo próprio é o gancho `flow` (sem banir: é unidade), restrita por
//   `canPlay` enquanto estou no descarte. Jogo no tempo normal de unidade (fase principal do seu turno).
registerCard({
  code: 'UNL-025',
  flow: E(3, 'Fury'),
  canPlay: (g, self, p) => self.zone !== 'trash' || g.legion(self, p),
});
