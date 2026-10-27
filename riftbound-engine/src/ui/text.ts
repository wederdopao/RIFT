// Formatação de texto de carta e cores de domínio.
import type { Domain } from '../engine/types';

export const DOMAIN_COLOR: Record<Domain, string> = {
  Fury: 'var(--fury)',
  Calm: 'var(--calm)',
  Mind: 'var(--mind)',
  Body: 'var(--body)',
  Chaos: 'var(--chaos)',
  Order: 'var(--order)',
};

export const DOMAIN_PT: Record<Domain, string> = {
  Fury: 'Fúria',
  Calm: 'Calma',
  Mind: 'Mente',
  Body: 'Corpo',
  Chaos: 'Caos',
  Order: 'Ordem',
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Texto de regras com os marcadores [Keyword] destacados. */
export function rulesHtml(text: string): string {
  const t = esc(text.replace(/\s*\n\s*/g, ' ').trim());
  return t.replace(/\[([^\]]{1,24})\]/g, (_m, inner: string) => {
    const k = inner.trim();
    const low = k.toLowerCase();
    if (low === 'might') return '<b class="m">Might</b>';
    if (low === 'tap') return '<span class="kw tap" title="Exaurir">exaurir</span>';
    if (low === 'rune' || low === 'a') return '<span class="kw pw" title="1 power de qualquer domínio">◆</span>';
    if (/^\d+$/.test(k)) return `<span class="kw en">${k}</span>`;
    const dom = ['fury', 'calm', 'mind', 'body', 'chaos', 'order'].find((d) => low === d);
    if (dom) return `<span class="kw pw ${dom}" title="power de ${k}">◆</span>`;
    return `<span class="kw">${k}</span>`;
  });
}
