// Zoom da página (style.css aumenta tudo em telas grandes de PC com `html { zoom }`). As medidas que o navegador dá
// (getBoundingClientRect, clientX, innerWidth) ficam em pixels da tela, mas um `left: Npx` escrito num elemento é
// multiplicado pelo zoom. Quem posiciona algo pela posição do mouse ou de outra carta divide por `pageZoom()`.
// O fator é medido (não lido do CSS): cada navegador trata o zoom do seu jeito e a sonda mostra o que vale ali.
let z = 0;
let at = '';
export function pageZoom(): number {
  if (typeof document === 'undefined' || !document.body) return 1;
  const key = `${innerWidth}x${innerHeight}`;
  if (z && at === key) return z;
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;left:100px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none';
  document.body.appendChild(p);
  const f = p.getBoundingClientRect().left / 100;
  p.remove();
  z = f > 0.2 && f < 8 ? f : 1;
  at = key;
  return z;
}
/** Medida da tela → pixels de CSS (para escrever em style). */
export const zpx = (v: number) => v / pageZoom();
/** Retângulo da tela → pixels de CSS. */
export function zRect(r: DOMRect): DOMRect {
  const f = pageZoom();
  return f === 1 ? r : new DOMRect(r.left / f, r.top / f, r.width / f, r.height / f);
}
