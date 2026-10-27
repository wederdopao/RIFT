// Caminho do Chromium headless do Playwright: PW_EXE, ou o que estiver instalado em /opt/pw-browsers.
import fs from 'node:fs';
import path from 'node:path';
function find() {
  const root = '/opt/pw-browsers';
  const names = ['chrome-headless-shell', 'headless_shell'];
  const walk = (dir, depth) => {
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
      const f = path.join(dir, e.name);
      if (e.isFile() && names.includes(e.name)) return f;
      if (e.isDirectory() && depth < 2) {
        const r = walk(f, depth + 1);
        if (r) return r;
      }
    }
  };
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse() : [];
  for (const d of dirs) {
    const r = walk(path.join(root, d), 0);
    if (r) return r;
  }
}
export const executablePath = process.env.PW_EXE || find();
