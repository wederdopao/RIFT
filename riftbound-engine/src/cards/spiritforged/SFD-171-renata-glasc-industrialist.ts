import { registerCard } from '../../engine/script';

// Suas fichas entram prontas. Vale para fichas de unidade e de gear (RiftJudge FAQ #10698: a habilidade faz as
// fichas entrarem prontas mesmo quando o efeito não diz). Inclui as que o efeito manda jogar "exauridas" (Gold):
// como o Accelerate (805.6), é uma substituição de "entrar exaurida" por "entrar pronta" — leitura literal do texto.
registerCard({
  code: 'SFD-171',
  auras: [{ enterReady: (g, src, o) => o.token && o.controller === src.controller }],
});
