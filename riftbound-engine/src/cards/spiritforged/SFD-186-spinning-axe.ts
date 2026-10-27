import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Gear (Equipamento, +3 de Might — o motor soma o bônus impresso). [Quick-Draw] (tem [Reaction]; quando você o joga,
// prenda-o numa unidade sua). [Equip] [A] (símbolo arco-íris: power de qualquer domínio, conferido em api.riftcodex.com).
// [Temporary]: "se estiver solto, mate-o no início da Beginning Phase do controlador, antes de pontuar". Preso, o texto
// de regras do gear fica inativo (regras 434.1.e e 718.2): o motor só mata pelo Temporary o que está solto (722.2).
registerCard({
  code: 'SFD-186',
  keywords: { quickDraw: true, temporary: true },
  equipCost: E(0, 'any'),
});
