// Copia o build para as pastas versionadas na raiz do repositório:
//   ../riftbound-mesa-site/site/   o site que vai para o Netlify Drop (arrastar a pasta "site")
//   ../riftbound-mesa.html         a versão offline (abre direto no navegador)
// Uso: npm run publicar (roda o build antes)
import { cpSync, rmSync, statSync } from 'node:fs';

statSync('dist/site/index.html');
rmSync('../riftbound-mesa-site/site', { recursive: true, force: true });
cpSync('dist/site', '../riftbound-mesa-site/site', { recursive: true });
cpSync('dist/riftbound-mesa.html', '../riftbound-mesa.html');
console.log('atualizados: riftbound-mesa-site/site/ e riftbound-mesa.html');
