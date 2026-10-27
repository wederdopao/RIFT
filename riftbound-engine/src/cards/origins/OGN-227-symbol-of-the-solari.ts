import { registerCard } from '../../engine/script';

// Se um combate em que você é o atacante terminar empatado e fosse chamar de volta unidades suas, chame de volta
// todas as unidades daquele campo.
registerCard({
  code: 'OGN-227',
  tieRecallAll: (g, self, bf, attacker) => self.zone === 'board' && self.controller === attacker,
});
