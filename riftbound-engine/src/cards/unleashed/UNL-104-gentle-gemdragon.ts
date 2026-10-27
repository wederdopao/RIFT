import { registerCard } from '../../engine/script';

// Quando você me joga ou joga outro Dragon, prepare até 2 runas.
// - "Você joga" um Dragon: qualquer carta com a tag Dragon que você joga (unidade/gear ao entrar, spell ao terminar de
//   resolver, 419.4.a; fichas de unidade também são jogadas, 185.2.a). Eu mesmo conto como "me", não como "outro".
// - As runas são alvos escolhidos ao pôr o gatilho na pilha (355.5.b, como Targon's Peak), de 0 a 2 (355.13): podem ser
//   as runas usadas para me pagar (RiftJudge #10149). O texto diz "runas", sem restringir de quem; uma runa ainda pronta
//   também pode ser escolhida (ex.: para exauri-la em resposta antes de o gatilho resolver); preparar algo pronto não faz
//   nada (415.1.c).
registerCard({
  code: 'UNL-104',
  triggers: [
    {
      on: 'play',
      label: 'Preparar até 2 runas',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && (ev.obj.id === c.self.id || c.g.hasTag(ev.obj, 'Dragon')),
      targets: [{ prompt: 'Gentle Gemdragon: preparar quais runas? (até 2)', kind: 'rune', min: 0, max: 2 }],
      resolve: function* (c) {
        const runes = c.targets[0] || [];
        let n = 0;
        for (const r of runes)
          if (r.exhausted) {
            c.g.ready(r, c.p);
            n++;
          }
        if (n) c.g.say(`${c.g.pname(c.p)} prepara ${n} runa(s).`, c.p);
      },
    },
  ],
});
