import { registerCard } from '../../engine/script';
import type { EffectText, TriggerDef } from '../../engine/script';
import { E } from '../helpers';

// Equipment. [Equip][1][Calm]. Ao ser anexado a uma unidade, o texto dela é copiado para o efeito deste equipamento
// enquanto ficar anexado — e o texto de efeito é acrescentado à unidade (136.2.c): ela passa a ter o próprio texto
// impresso mais uma vez. Em gatilhos/ativadas da cópia, c.gear = este Svellsongur (cada cópia é uma instância própria).
// - Só o texto impresso da unidade (RiftJudge FAQ #10830); palavras-chave numéricas somam (Deflect 2 vira 4, #4283);
//   o próprio Svellsongur não ganha nada (#7465); "quando você me joga" não acontece de novo (#44): não há onPlay.
// - A cópia vem depois do anexar: os gatilhos copiados não veem o anexar do próprio Svellsongur (Aphelios dispara uma
//   vez só ao recebê-lo; FAQ Vendetta, ago/2026, que reverteu #8411). Equipamentos anexados depois disparam as duas.
registerCard({
  code: 'SFD-059',
  equipCost: E(1, 'Calm'),
  equipped: (g, gear, unit): EffectText | undefined => {
    if (!g.isUnit(unit)) return undefined;
    const b = g.baseScript(unit);
    const notOwnAttach = (t: TriggerDef): TriggerDef => ({
      ...t,
      cond: (c, ev) => !(ev.type === 'attach' && ev.obj?.id === gear.id) && (!t.cond || t.cond(c, ev)),
    });
    return {
      // caça UNL: g.baseKeywords também lê o texto de uma ficha sem script (Bird: [Deflect] vira Deflect 2, #4283)
      keywords: g.baseKeywords(unit),
      kwMod: b.kwMod ? (gg, _gear, u) => b.kwMod!(gg, u) : undefined,
      mightMod: b.mightMod ? (gg, _gear, u) => b.mightMod!(gg, u) : undefined,
      triggers: b.triggers?.map(notOwnAttach),
      activated: b.activated,
      auras: b.auras,
      deathReplacements: b.deathReplacements,
      noCombatDamage: b.noCombatDamage ? (gg, self) => b.noCombatDamage!(gg, self) : undefined,
      damageLast: b.damageLast ? (gg, self) => b.damageLast!(gg, self) : undefined,
      noDamage: b.noDamage ? (gg, self) => b.noDamage!(gg, self) : undefined,
      // substituição "se você fosse revelar" (Void Hatchling): a cópia é outra instância e também se aplica (370.2)
      beforeReveal: b.beforeReveal ? (gg, self, p, owner, deck) => b.beforeReveal!(gg, self, p, owner, deck) : undefined,
      // caça UNL: substituição de jogar ficha (Zilean, Time Mage): outra instância, com o próprio "uma vez por turno"
      tokenPlayReplace: b.tokenPlayReplace ? (gg, self, code, p, loc, gr) => b.tokenPlayReplace!(gg, self, code, p, loc, gr) : undefined,
    };
  },
});
