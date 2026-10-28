# Baixa as fontes da mesa (Barlow e Barlow Condensed, Google Fonts, licença OFL) para o site servir do próprio
# endereço: sem as duas conexões extras ao Google na abertura, e o service worker guarda junto. Só o recorte "latin"
# (cobre o português). Grava assets/fonts/*.woff2 e assets/fonts/fonts.css.
# Uso (na pasta riftbound-engine): python3 scripts/fonts.py
import os, re, urllib.request

URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
OUT = 'assets/fonts'

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
        return r.read()

css = get(URL).decode()
os.makedirs(OUT, exist_ok=True)
out = []
for block in re.findall(r'/\* latin \*/\s*(@font-face \{.*?\})', css, re.S):
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    w = re.search(r'font-weight: (\d+)', block).group(1)
    src = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
    name = f"{fam.lower().replace(' ', '-')}-{w}.woff2"
    open(f'{OUT}/{name}', 'wb').write(get(src))
    out.append(re.sub(r'url\(https://[^)]+\)', f'url(fonts/{name})', block))
    print(name, os.path.getsize(f'{OUT}/{name}') // 1024, 'KB')
open(f'{OUT}/fonts.css', 'w').write('\n'.join(out) + '\n')
