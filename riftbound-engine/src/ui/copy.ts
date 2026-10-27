// Copiar texto (código de deck, lista, backup). Dentro do app do Claude o navigator.clipboard às vezes falha ou nem
// responde; aí abre uma caixa com o texto já selecionado, para copiar à mão (Ctrl+C ou tocar e segurar → Copiar).
import { esc } from './text';

/** Tenta copiar com o comando antigo (precisa estar dentro do clique). */
function execCopy(el: HTMLTextAreaElement): boolean {
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

/** Caixa com o texto selecionado. Fica por cima de qualquer tela e não depende do redesenho. */
export function showCopyBox(text: string, title: string, why = 'Não deu para copiar sozinho aqui.') {
  document.getElementById('copybox')?.remove();
  const box = document.createElement('div');
  box.id = 'copybox';
  box.className = 'modal copybox';
  box.innerHTML = `<div class="mbox" role="dialog" aria-label="${esc(title)}">
    <div class="pkhead"><h2>${esc(title)}</h2><button type="button" data-cb="close">Fechar</button></div>
    <p class="muted">${esc(why)} O texto abaixo já está selecionado: use <b>Ctrl+C</b> (no celular, toque e segure → Copiar).</p>
    <textarea readonly rows="${Math.min(14, Math.max(3, text.split('\n').length + 1))}" spellcheck="false"></textarea>
    <div class="btns"><button type="button" class="primary" data-cb="again">Copiar</button><span class="note" data-cb="msg" role="status"></span></div>
  </div>`;
  const ta = box.querySelector('textarea')!;
  ta.value = text;
  const msg = box.querySelector('[data-cb=msg]') as HTMLElement;
  box.addEventListener('click', (ev) => {
    const t = ev.target as HTMLElement;
    ev.stopPropagation();
    if (t === box || t.dataset.cb === 'close') box.remove();
    else if (t.dataset.cb === 'again') {
      const p = navigator.clipboard?.writeText(text);
      const ok = execCopy(ta);
      if (ok) msg.textContent = 'Copiado.';
      else if (p) p.then(() => (msg.textContent = 'Copiado.'), () => (msg.textContent = 'Use Ctrl+C (o texto está selecionado).'));
      else msg.textContent = 'Use Ctrl+C (o texto está selecionado).';
    }
  });
  box.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      box.remove();
    }
  });
  document.body.appendChild(box);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
}

/**
 * Copia `text`. Se a área de transferência falhar (ou não responder em 1,5 s), abre a caixa com o texto selecionado.
 * `ok` é chamado quando copiou de verdade.
 */
export function copyText(text: string, title: string, ok: () => void) {
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    showCopyBox(text, title);
  };
  const win = () => {
    if (settled) return;
    settled = true;
    ok();
  };
  try {
    const p = navigator.clipboard?.writeText(text);
    if (!p) return fail();
    p.then(win, fail);
    setTimeout(fail, 1500);
  } catch {
    fail();
  }
}
