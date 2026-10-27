import { registerCard } from '../../engine/script';
// Campo: os jogadores não podem pontuar aqui até o terceiro turno deles.
// Impede o processo inteiro de pontuar aqui: não há conquista nem hold (nem os gatilhos deles) nem ponto; ainda dá
// para ganhar o controle depois de um showdown (FAQ oficial do Spiritforged, Forgotten Monument). "Até o terceiro
// turno deles": antes de o jogador começar o seu 3º turno (turnos adicionais contam).
registerCard({
  code: 'SFD-209',
  auras: [
    {
      blockScore: (g, src, p, i) => g.bfOf(src) === i && (g.pl[p].turns || 0) < 3,
    },
  ],
});
