"""Tell IndexNow search engines (Bing, Yandex, Seznam, Naver...) which pages changed.

Run by .github/workflows/indexnow.yml after a push to main. Arguments: the commit
before the push and the commit after it. Pages are mapped to their public URL;
if the list cannot be worked out, the home page and the sitemap are sent.
The key is public by design: IndexNow checks it at https://ecl-alcpt-trainer.com/KEY.txt
"""
import json
import subprocess
import sys
import urllib.request

SITE = 'https://ecl-alcpt-trainer.com'
KEY = '28fc7a4d852c88a8b0254c868dad5615'
SKIP = ('tg/', 'tools/', '.github/', 'practice/js/', '404.html')


def changed(before, after):
    try:
        out = subprocess.run(['git', 'diff', '--name-only', before, after], capture_output=True, text=True, check=True).stdout
    except Exception:
        return []
    return [f for f in out.split() if f.endswith('.html') and not f.startswith(SKIP)]


def url(f):
    return SITE + '/' + (f[:-len('index.html')] if f.endswith('index.html') else f)


before, after = (sys.argv[1:3] + ['', ''])[:2]
urls = [url(f) for f in changed(before, after)] if before.strip('0') else []
if not urls:
    urls = [SITE + '/', SITE + '/sitemap.xml']
urls = sorted(set(urls))[:10000]
data = json.dumps({'host': 'ecl-alcpt-trainer.com', 'key': KEY, 'keyLocation': SITE + '/' + KEY + '.txt',
                   'urlList': urls}).encode()
req = urllib.request.Request('https://api.indexnow.org/indexnow', data=data,
                             headers={'Content-Type': 'application/json; charset=utf-8'})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print('IndexNow answered', r.status, 'for', len(urls), 'URLs')
except urllib.error.HTTPError as e:
    print('::warning::IndexNow answered %s: %s' % (e.code, e.read()[:300]))
except Exception as e:
    print('::warning::IndexNow could not be reached: %s' % e)
for u in urls:
    print(' ', u)
