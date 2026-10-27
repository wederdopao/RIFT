import { registerCard } from '../../engine/script';

// Reaction. [Assault 2]. Posso ser jogado num campo de batalha que você está atacando.
// "Atacando": há um combate nesse campo e você é o atacante. Ao entrar, Rengar ganha a designação de atacante na
// limpeza (RiftJudge FAQ #8779, #10669 e #9610).
registerCard({
  code: 'SFD-025',
  keywords: { reaction: true, assault: 2 },
  extraPlayBfs: (g, self, p) => {
    const sd = g.showdown;
    return sd && sd.combat && sd.attacker === p ? [sd.bf] : [];
  },
});
