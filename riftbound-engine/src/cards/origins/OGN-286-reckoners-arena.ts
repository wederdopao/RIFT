import { registerCard } from '../../engine/script';
import type { GameEvent } from '../../engine/engine';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, ative as habilidades de conquista das unidades aqui.
// Regra 383.4.g (o exemplo é esta carta): cada habilidade de conquista é checada como se a conquista tivesse
// acontecido; as que cumprem o resto da condição vão para a pilha como se tivessem disparado.
// "Unidades aqui" = todas as que estão no campo quando o gatilho resolve; cada habilidade é do controlador da unidade.
// Conferido (microdetalhes UNL): Aura.triggerExtra não vale para estas ativações — não houve conquista, então "seus efeitos
// de conquista por conquistar aqui disparam uma vez a mais" (Red Brambleback) não se aplica (RiftJudge #10802). Já este
// gatilho de hold é efeito de hold aqui: com a Blue Sentinel ele dispara de novo pelo emit (RiftJudge #9697, #10814).
registerCard({
  code: 'OGN-286',
  triggers: [
    {
      on: 'hold',
      label: 'Ativar as habilidades de conquista das unidades aqui',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const i = bfIdx(c);
        const here = g.unitsAtBf(i);
        const ev: GameEvent = { type: 'conquer', player: c.p, bf: i, excess: 0, units: here.map((u) => u.id), activated: true };
        let n = 0;
        for (const u of here) {
          // Hunt ("quando eu conquisto ou seguro", regra 823.1.b) também é uma habilidade de conquista: vai para a
          // pilha como se tivesse disparado, além da XP do próprio hold (ruling FAQ #10039 em app.riftjudge.com)
          // mudou (UNL): o mesmo gatilho de Hunt que o motor dispara na conquista/hold (Engine.huntTrigger)
          if (g.huntTrigger(u, ev)) n++;
          // novo (SFD): também as habilidades acrescentadas pelo que está equipado na unidade (718.3: já estão no script da
          // unidade, CardScript.equipped) e, com Skyfall of
          // Areion, as de hold dela (que também são de conquista; RiftJudge #7492 e #10802)
          const gear = g.attachedTo(u);
          const alias = gear.some((x) => g.baseScript(x).holdConquerAlias); // texto de efeito do gear (o script ativo do gear anexado não o tem)
          for (const src of [u, ...gear]) {
            for (const t of g.script(src).triggers || []) {
              const types = Array.isArray(t.on) ? t.on : [t.on];
              if (!(types.includes('conquer') || (alias && types.includes('hold'))) || (t.zone || 'board') !== 'board') continue;
              const ctrl = t.controller ? t.controller(g, src, { ...ev, unit: u }) : u.controller; // a habilidade é da unidade (718.3)
              if (ctrl === null) continue;
              const cc = g.ctx(src, ctrl, { ev });
              if (t.cond && !t.cond(cc, ev)) continue;
              g.pending.push({ controller: ctrl, sourceId: src.id, ability: t, ev, label: t.label });
              n++;
            }
          }
        }
        g.say(`Reckoner's Arena: ${n ? `${n} habilidade(s) de conquista ativada(s)` : 'nenhuma habilidade de conquista aqui'}.`, c.p);
      },
    },
  ],
});
