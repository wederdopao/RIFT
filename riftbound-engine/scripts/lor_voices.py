# Baixa as falas dos campeões do Legends of Runeterra (wiki do League of Legends, páginas "<Campeão>/LoR") para os
# campeões que existem no Riftbound, e grava assets/voice/<chave>/<evento>-N.mp3 + assets/voice/index.json.
# Uso (na pasta riftbound-engine): python3 scripts/lor_voices.py [--max 2]
# Projeto de fã sem fins comerciais (política "Legal Jibber Jabber" da Riot); o áudio é da Riot Games.
import json, os, re, shutil, subprocess, sys, time, urllib.parse, urllib.request

WIKI = 'https://wiki.leagueoflegends.com'
OUT = 'assets/voice'
# evento do LoR -> evento da mesa
EVENTS = {'summon': 'play', 'attack_declare': 'attack', 'block_declare': 'block', 'death': 'death', 'victory': 'victory', 'defeat': 'defeat'}
MAX = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 2
# nome da página da wiki quando difere do nome da carta
PAGE = {'Dr. Mundo': 'Dr._Mundo'}
# prefixo dos arquivos quando difere do nome (normalizado)
ALIAS = {'Dr. Mundo': 'mundo'}

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'riftbound-mesa (fan project)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def shrink(path):
    """Voz em mono a 48 kbps (o original é estéreo a ~140 kbps): ~3x menor, mesma clareza. Precisa do ffmpeg."""
    if not shutil.which('ffmpeg'):
        return
    tmp = path + '.tmp.mp3'
    if subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-b:a', '48k', tmp]).returncode == 0:
        os.replace(tmp, path)

def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())

cards = json.load(open('src/data/cards.json'))
names = sorted({d['name'].split(',')[0].strip() for d in cards.values()
                if ('champion' in d.get('type', '').lower() or 'legend' in d.get('type', '').lower()) and ',' in d['name']})
index = {}
missing = []
for name in names:
    page = PAGE.get(name, name.replace(' ', '_'))
    try:
        html = get(f'{WIKI}/en-us/{urllib.parse.quote(page)}/LoR').decode('utf-8', 'replace')
    except Exception:
        html = ''
    files = sorted(set(re.findall(r'/en-us/images/(VO_([A-Za-z0-9]+)_([a-z_]+?)_(\d+)\.ogg)', html)))
    # a chave do próprio campeão: o prefixo VO_<chave>_ que bate com o nome (LeeSin, JarvanIV, Kaisa...)
    own = [f for f in files if norm(f[1]) in (norm(name), ALIAS.get(name, ''))]
    if not own:
        # sem página "/LoR" (Yasuo, Zed...): os arquivos seguem o padrão VO_<Nome>_<evento>_0N; tenta direto
        key = re.sub(r'[^A-Za-z0-9]', '', name)
        own = [(f'VO_{key}_{ev}_{n:02d}.ogg', key, ev, str(n)) for ev in EVENTS for n in range(1, MAX + 2)]
    key = name.lower()
    entry = {}
    for lor_ev, ev in EVENTS.items():
        pick = [f for f in own if f[2] == lor_ev][:MAX + (1 if ev == 'play' else 0)]
        for i, f in enumerate(pick, 1):
            fn = f[0]
            url = f'{WIKI}/en-us/images/transcoded/{fn}/{fn}.mp3'
            dst = f'{OUT}/{norm(name)}/{ev}-{i}.mp3'
            if not os.path.exists(dst):
                try:
                    data = get(url)
                except Exception:
                    continue
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                open(dst, 'wb').write(data)
                shrink(dst)
                time.sleep(0.2)
            entry.setdefault(ev, []).append(f'voice/{norm(name)}/{ev}-{i}.mp3')
    if entry:
        index[key] = entry
    else:
        missing.append(f'{name} (sem falas dos eventos)')
    time.sleep(0.3)

os.makedirs(OUT, exist_ok=True)
json.dump(index, open(f'{OUT}/index.json', 'w'), ensure_ascii=False, indent=1, sort_keys=True)
print(f'{len(index)} campeões com voz; sem voz: {", ".join(missing) or "nenhum"}')
