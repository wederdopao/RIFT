// Glossário da mesa: palavras-chave e conceitos de regra explicados em uma linha (o que o texto lembrete da carta diz,
// em português), mais o guia "Como funciona". Só texto: nada aqui muda a partida.
import { cardData } from '../engine/db';
import type { Engine } from '../engine/engine';
import type { Obj } from '../engine/types';
import { esc } from './text';

/** Palavra-chave (como aparece entre colchetes no texto, em maiúsculas) → explicação. N = o número da carta. */
export const KEYWORDS: Record<string, string> = {
  ACTION: 'Pode ser jogada no seu turno ou durante um showdown (quando você tem o Focus). Com a pilha aberta, não.',
  REACTION: 'Pode ser jogada a qualquer momento em que você tem a vez, inclusive em resposta a algo na pilha (resolve antes dele).',
  ACCELERATE: 'Ao jogar, você pode pagar o custo extra indicado para a unidade entrar pronta (em vez de exausta).',
  AMBUSH: 'Pode ser jogada como Reaction, num campo de batalha onde você já tem unidades.',
  ASSAULT: '+N de Might enquanto ataca.',
  SHIELD: '+N de Might enquanto defende.',
  TANK: 'No combate, recebe dano antes das unidades sem Tank.',
  BACKLINE: 'No combate, recebe dano por último.',
  DEFLECT: 'O oponente paga power a mais para escolher esta unidade como alvo de spell ou habilidade.',
  GANKING: 'Pode se mover de um campo de batalha direto para outro.',
  HIDDEN: 'Pode ser escondida virada num campo seu pagando 1 power; a partir do turno seguinte, pode ser jogada de lá por 0, como Reaction.',
  HUNT: 'Quando esta unidade conquista ou segura um campo, você ganha N de XP.',
  TEMPORARY: 'Morre no começo da fase de início do turno do controlador, antes de pontuar.',
  VISION: 'Ao jogar, olhe o topo do seu deck; você pode reciclá-lo (mandar para o fundo).',
  PREDICT: 'Olhe as N cartas do topo do seu deck; recicle as que quiser e devolva o resto na ordem que quiser.',
  'QUICK-DRAW': 'Este gear tem Reaction; ao jogá-lo, anexe-o a uma unidade sua.',
  WEAPONMASTER: 'Ao jogar esta unidade, você pode equipar nela um gear seu pagando 1 power a menos (mesmo que já esteja anexado).',
  DEATHKNELL: 'Efeito que acontece quando esta unidade morre.',
  LEGION: 'Efeito extra se você já jogou outra carta neste turno.',
  LEVEL: 'Efeito ativo enquanto você tem N ou mais de XP.',
  REPEAT: 'Você pode pagar o custo extra para executar o efeito do spell mais uma vez (com novos alvos).',
  EQUIP: 'Pague o custo para anexar este gear a uma unidade sua; a unidade ganha o efeito dele.',
  FLOW: 'Pode ser jogada do seu descarte pelo custo de Flow; depois vai para as banidas.',
  EMPOWER: 'Pague o custo para deixar a carta Empowered (uma vez); aí valem os efeitos marcados [Empowered].',
  EMPOWERED: 'Efeito que só vale depois de a carta ser Empowered.',
  BURN: 'Ponha as N cartas do topo do seu deck no descarte.',
  MIGHTY: 'Uma unidade é Mighty enquanto tem 5 ou mais de Might.',
  BUFF: 'Marca de +1 Might. Cada unidade tem no máximo um Buff; alguns efeitos gastam o Buff.',
  STUN: 'Unidade atordoada não causa dano de combate neste turno.',
  UNIQUE: 'O deck só pode ter 1 carta com este nome.',
  DEPLOY: 'Gear posto num campo de batalha; morre se o oponente segurar (hold) aquele campo.',
  ADD: 'Põe recursos no seu pool na hora, sem ir para a pilha e sem passar a vez.',
  TAP: 'Exaurir esta carta (deitá-la) faz parte do custo.',
};

/** Conceitos de regra que aparecem na mesa. */
export const CONCEPTS: Record<string, string> = {
  pilha: 'A pilha guarda spells e habilidades esperando para resolver. O último que entrou resolve primeiro. Cada vez que algo entra, o outro jogador pode responder com uma Reaction; quando os dois passam seguidos, o de cima resolve.',
  focus: 'No showdown, quem tem o Focus pode jogar uma Action ou Reaction, ou passar. Quem joga devolve o Focus ao outro; dois passes seguidos encerram o showdown.',
  showdown: 'Acontece quando unidades entram num campo de batalha disputado. Os dois jogadores alternam o Focus; ao fim, se houver unidades dos dois lados, vem o dano de combate.',
  combate: 'Atacantes e defensores somam o Might (Assault soma no ataque, Shield na defesa; atordoadas não contam). Cada lado distribui o seu total, dando dano letal a uma unidade antes de passar à próxima (Tank recebe primeiro, Backline por último). Se os dois lados sobram, os atacantes voltam para a base.',
  conquista: 'Assumir o controle de um campo que você ainda não pontuou neste turno vale 1 ponto. O último ponto por conquista só vale se você pontuou todos os campos neste turno; senão você compra 1.',
  hold: 'Na fase de início do seu turno, cada campo que você controla e onde tem unidades te dá 1 ponto (segurar, hold).',
  exaurir: 'Exausta (deitada) não se move nem paga custos de [Tap]. Tudo seu é preparado no seu Despertar.',
  runas: 'Exaurir uma runa dá 1 de energia; reciclar uma runa dá 1 power do domínio dela. A mesa escolhe o pagamento sozinha.',
};

/** Palavras-chave presentes numa carta (do texto e das palavras-chave ganhas em jogo), com a explicação. */
export function keywordHelp(eng: Engine | null, o: Obj): { kw: string; text: string }[] {
  const d = cardData(o.code);
  const found = new Map<string, string>();
  const add = (k: string) => {
    const t = KEYWORDS[k];
    if (t && !found.has(k)) found.set(k, t);
  };
  for (const m of (d.text + ' ' + (d.effectText || '')).matchAll(/\[([A-Za-z-]+)(?: \d+)?\]/g)) add(m[1].toUpperCase());
  if (eng && o.zone === 'board') {
    const k = eng.kw(o) as any;
    const map: Record<string, string> = { tank: 'TANK', shield: 'SHIELD', assault: 'ASSAULT', deflect: 'DEFLECT', ganking: 'GANKING', backline: 'BACKLINE', temporary: 'TEMPORARY', hunt: 'HUNT' };
    for (const [key, kw] of Object.entries(map)) if (k[key]) add(kw);
    if (o.stunned) add('STUN');
    if (o.buffs) add('BUFF');
  }
  // custos e domínios não são palavras-chave a explicar
  return [...found.entries()].map(([kw, text]) => ({ kw, text }));
}

export function keywordHelpHtml(eng: Engine | null, o: Obj): string {
  const list = keywordHelp(eng, o);
  if (!list.length) return '';
  return `<dl class="tt-kwhelp">${list.map((x) => `<div><dt>${esc(x.kw.charAt(0) + x.kw.slice(1).toLowerCase())}</dt><dd>${esc(x.text)}</dd></div>`).join('')}</dl>`;
}

/** Guia "Como funciona" (o botão ? da mesa). */
export function guideHtml(): string {
  const sec = (t: string, items: string[]) => `<section><h4>${t}</h4><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></section>`;
  return `<div class="tt-guide">
    ${sec('O turno, em ordem', [
      '<b>Despertar</b>: tudo seu é preparado (fica de pé).',
      '<b>Início</b>: unidades Temporary morrem; depois, cada campo que você controla e onde tem unidades te dá 1 ponto (hold).',
      '<b>Canalizar</b>: 2 runas do deck de runas entram em jogo (3 no primeiro turno de quem joga em segundo).',
      '<b>Compra</b>: você compra 1 carta.',
      '<b>Fase principal</b>: jogue cartas, ative habilidades e mova unidades, na ordem que quiser.',
      '<b>Final</b>: gatilhos de fim de turno; depois o dano marcado some, o atordoamento acaba, efeitos "neste turno" terminam e o pool de recursos esvazia.',
    ])}
    ${sec('Na sua fase principal', [
      'Clique numa carta acesa para escolhê-la: o painel mostra o custo, o texto, o que vem depois, e os alvos ou locais possíveis acendem na mesa. Confirme clicando de novo na carta, no botão ou direto num alvo aceso; Esc ou clique fora cancela. O mesmo vale para habilidades.',
      'Arrastar joga direto: arraste para a base ou um campo; spell arrastado para cima de uma carta a escolhe como alvo.',
      'Mover: clique na unidade pronta e depois no destino aceso (duplo clique escolhe todas dali). Mover exaure a unidade.',
      'Mover para um campo de batalha que não é seu abre um <b>showdown</b>; se lá houver unidades do oponente, é <b>combate</b>.',
      'Passe o mouse (ou segure o dedo) numa carta para ver o texto, as palavras-chave e, se não der para jogar, o porquê.',
      '<b>Pagar: auto / manual</b> (botão nas suas runas): no manual, ao pagar você escolhe quais runas exaurir para a energia e qual reciclar para cada power; no auto, a mesa escolhe alternando as cores. A escolha fica lembrada na sua conta e vale para as próximas partidas.',
    ])}
    ${sec('A pilha e as respostas', [
      esc(CONCEPTS.pilha),
      'Vários efeitos seus disparando ao mesmo tempo: aparece uma lista com o texto de cada um. Arraste (ou use ↑ ↓) para montar a ordem em que eles vão resolver — o 1º da lista resolve primeiro — e confirme.',
      'A pilha aparece na barra de decisão, com setas até os alvos. "Passar" diz o que acontece em seguida (o outro responde, ou o de cima resolve).',
      'Se você não tem nenhuma Reaction possível, a mesa passa sozinha; o que resolveu aparece no histórico (canto esquerdo) e no registro.',
    ])}
    ${sec('Showdown e combate', [esc(CONCEPTS.showdown), esc(CONCEPTS.focus), esc(CONCEPTS.combate)])}
    ${sec('Pontos', [esc(CONCEPTS.hold), esc(CONCEPTS.conquista), 'Quem chega primeiro a 8 vence.'])}
    ${sec('Previsões da mesa', [
      'Placar ⚔ em cima do campo: dano de cada lado e quem fica com o campo; caveira nas unidades que morrem. Ao escolher o destino de um movimento aparece "Se mover".',
      'Quando o resultado depende de uma escolha (ex.: unidade com Tank e "por último" ao mesmo tempo — quem atribui o dano escolhe qual vale), a mesa mostra cada possibilidade em vez de chutar uma; caveira clara com ? = morre só em alguma delas. Carta escondida no campo também é avisada.',
      '👁 Prévia (tecla V): com a pilha aberta, mostra o que muda se todos passarem. Não aparece quando o resultado depende de carta escondida ou sorteio.',
      'As previsões só leem a mesa; spells e habilidades que ainda podem entrar mudam o resultado.',
    ])}
    ${sec('Atalhos de teclado', [
      '<b>Espaço</b> passa ou encerra o turno · <b>Enter</b> confirma · <b>Esc</b> cancela ou fecha · <b>Z</b> desfaz',
      '<b>V</b> prévia da pilha · <b>?</b> este guia · <b>T</b> tapete da mesa · <b>A</b> cartas e textos maiores',
      '<b>M</b> volume dos sons · <b>N</b> volume da música · <b>E</b> emotes (online)',
    ])}
  </div>`;
}
