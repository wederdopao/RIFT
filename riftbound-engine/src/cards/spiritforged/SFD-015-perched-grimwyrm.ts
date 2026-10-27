import { registerCard } from '../../engine/script';

// Jogue-me só num campo de batalha que você conquistou neste turno (você não pode me jogar em outro lugar).
// É uma restrição: os locais normais continuam exigidos (campo que você controla), e permissões de outras cartas não
// a superam ("não pode" vence "pode"; RiftJudge FAQ #11764, Dragon Roost).
registerCard({
  code: 'SFD-015',
  selfPlayLoc: (g, self, p, loc) => loc.t === 'bf' && g.conqueredThisTurn.includes(`${p}-${loc.i}`),
});
