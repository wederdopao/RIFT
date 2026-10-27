import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Lenda:
// 1. Quando você escolhe uma unidade aliada, você pode me exaurir e pagar [A] (símbolo arco-íris: power de qualquer
//    domínio) para prepará-la. "Escolher" é escolher como alvo de spell/habilidade (regra 355.7): dispara na
//    finalização e vai para a pilha acima do que a escolheu, resolvendo antes (RiftJudge #11317). Exaurir e o [A] são
//    custos pagos ao pôr o gatilho na pilha (383.3.b).
// 2. Quando você conquista, você pode pagar [1] para me preparar (custo pago ao pôr na pilha, RiftJudge #11075).
registerCard({
  code: 'SFD-195',
  triggers: [
    {
      on: 'chosen',
      label: 'Preparar a unidade aliada escolhida',
      // (só pergunta se der para pagar: a Irelia pronta e 1 power)
      cond: (c, ev) =>
        ev.by === c.p && !!ev.obj && ev.obj.zone === 'board' && c.g.isUnit(ev.obj) && ev.obj.controller === c.p && !c.self.exhausted && c.g.canPay(c.p, E(0, 'any')),
      // "você pode" decidido ao pôr na pilha (383.3.a), mas só se o custo inteiro ainda puder ser pago: com dois gatilhos
      // ao mesmo tempo (um spell que escolhe duas aliadas), depois do primeiro a Irelia já está exaurida e o segundo não
      // pode cobrar o [A] (383.3.b.1: sem pagar o custo inteiro não vai para a pilha)
      prepare: function* (c) {
        if (c.self.exhausted || !c.g.canPay(c.p, E(0, 'any'))) return false;
        return yield* c.g.yesNo(c.p, `${c.g.name(c.self)}: exaurir Irelia e pagar 1 power para preparar ${c.g.name(c.ev!.obj)}?`);
      },
      cost: E(0, 'any'),
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        c.data.ver = c.ev!.obj.zoneVersion; // "ela" é aquele objeto: se sair do tabuleiro, não é mais ela (regra 124)
        return true;
      },
      resolve: function* (c) {
        const u = c.ev!.obj;
        if (u.zone !== 'board' || u.zoneVersion !== c.data.ver) return;
        c.g.ready(u, c.p);
        c.g.say(`${c.g.name(u)} fica pronta.`, c.p);
      },
    },
    {
      on: 'conquer',
      label: 'Pagar [1] para preparar a Irelia',
      optional: 'Pagar [1] para preparar Irelia?',
      cond: (c, ev) => ev.player === c.p,
      cost: E(1),
      resolve: function* (c) {
        c.g.ready(c.self, c.p);
        c.g.say(`${c.g.name(c.self)} fica pronta.`, c.p);
      },
    },
  ],
});
