import { registerCard } from '../../engine/script';
// Lenda: quando você conquista, se você atribuiu 3 ou mais de dano excedente, você pode me exaurir para preparar uma unidade.
// Estrutura (FAQ oficial do Unleashed, "Vi, Piltover Enforcer"): condição de disparo, condição extra (dano excedente do
// combate que deu a conquista), "você pode" (decide se vai para a pilha) e custo dentro da instrução ("me exaurir para",
// pago ao finalizar, 355.10.c.1). Só "preparar uma unidade" é o efeito: a unidade é alvo, escolhida ao finalizar.
// Sem poder pagar (lenda já exaurida), o gatilho não vai para a pilha.
registerCard({
  code: 'UNL-187',
  triggers: [
    {
      on: 'conquer',
      label: 'Preparar uma unidade',
      optional: 'exaurir a Vi para preparar uma unidade?',
      cond: (c, ev) => ev.player === c.p && (ev.excess || 0) >= 3 && !c.self.exhausted,
      targets: [{ prompt: 'Vi, Piltover Enforcer: preparar qual unidade?' }],
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.ready(u, c.p);
      },
    },
  ],
});
