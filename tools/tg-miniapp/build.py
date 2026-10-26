#!/usr/bin/env python3
"""Builds tg/data.js, the questions of the Telegram mini app (tg/).

The mini app is a light version of the trainer for Telegram: 50 questions
per training instead of the full banks. They are taken from the website's
own files, which stay unchanged:

  practice/data/*.json            grammar, vocabulary, idioms, module test
  practice/js/app.js (QFIX)       the October 2026 corrections, applied here
  practice/js/listening-data.js   listening questions
  assets/audio/listening/manifest.js   recordings (only fully recorded
                                  listening questions are used)

Run it again after the questions change:  python3 tools/tg-miniapp/build.py
The choice is deterministic: the same files always give the same 50.
"""
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
N = 50


def path(*p):
    return os.path.join(ROOT, *p)


def load_json(name):
    with open(path('practice', 'data', name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def js_object(file, start_marker):
    """The JSON literal assigned in a generated .js file."""
    with open(file, encoding='utf-8') as f:
        src = f.read()
    i = src.index(start_marker) + len(start_marker)
    j = src.index('{', i)
    return json.JSONDecoder().raw_decode(src, j)[0]


def text_mark(text):
    """Same mark as tools/listening-audio/generate.py and assets/listen-audio.js."""
    h = 0x811c9dc5
    b = text.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 16777619) & 0xffffffff
    out, d = '', '0123456789abcdefghijklmnopqrstuvwxyz'
    while True:
        h, r = divmod(h, 36)
        out = d[r] + out
        if not h:
            return out


# ------------------------------------------------------------ banks + fixes
BANKS = {
    'BASE_GRAMMAR': load_json('base_grammar'),
    'GRAMMAR_PLUS': load_json('grammar_plus'),
    'EXPRESS_QCM': load_json('express_qcm'),
    'BASE_VOCAB': load_json('base_vocab'),
    'VOCAB_AM': load_json('vocab_american'),
    'PHRASALS': load_json('phrasal_verbs'),
    'IDIOMS_QUIZ': load_json('idioms_quiz'),
    'MODULE_TEST': load_json('module_test'),
}

with open(path('practice', 'js', 'app.js'), encoding='utf-8') as f:
    app = f.read()
m = re.search(r'var QFIX = (\[.*?\n\]);', app, re.S)
QFIX = json.loads(m.group(1)) if m else []
fixed = 0
for bank, q, patch in QFIX:
    for x in BANKS.get(bank, []):
        if x.get('q') == q:
            x.update(patch)
            fixed += 1
            break
US = re.compile(r'\((\*?)us(\*?)([,)])')
for bank in ('VOCAB_AM', 'PHRASALS', 'BASE_VOCAB'):
    for x in BANKS[bank]:
        for k in ('q', 'e'):
            if isinstance(x.get(k), str):
                x[k] = US.sub(r'(\1US\2\3', x[k])


def ok(x):
    o = x.get('o') or []
    return (isinstance(x.get('q'), str) and x['q'].strip() and len(o) == 4
            and len(set(o)) == 4 and isinstance(x.get('a'), int) and 0 <= x['a'] < 4
            and len(x['q']) <= 320 and all(len(s) <= 140 for s in o))


def spread(items, n):
    """n items evenly spread over the list (keeps every topic and level)."""
    if len(items) <= n:
        return list(items)
    return [items[int(i * len(items) / n)] for i in range(n)]


FRENCH = re.compile(r'\b(le|les|une|des|du|dans|pour|avec|sont|qui|aux|cette|nous|vous|leur|tres|donc|mais|'
                    r'sans|apres|avant|entre|chez|selon|ainsi|alors|etre|avoir|faire|irregulier|regle|verbe)\b|[àéèêç]', re.I)


def explained_well(x):
    """A full English explanation, not a two-word note."""
    e = (x.get('e') or '').strip()
    return len(e) >= 40 and not FRENCH.search(e)


def pick(items, n=N):
    """n questions spread over the bank, those with a full explanation first."""
    good = [x for x in items if ok(x)]
    best = [x for x in good if explained_well(x)]
    if len(best) >= n:
        return spread(best, n)
    rest = [x for x in good if not explained_well(x)]
    rest.sort(key=lambda x: -len((x.get('e') or '').strip()))
    chosen = set(map(id, best + rest[:n - len(best)]))
    return [x for x in good if id(x) in chosen]


def slim(x, tag=None):
    o = {'q': x['q'].strip(), 'o': x['o'], 'a': x['a']}
    if (x.get('e') or '').strip():
        o['e'] = x['e'].strip()
    if tag:
        o['t'] = tag
    return o


def stratified(groups, n=N):
    """n items shared between groups in proportion to their size."""
    total = sum(len(g) for g in groups.values())
    quota = {k: n * len(g) / total for k, g in groups.items()}
    alloc = {k: int(v) for k, v in quota.items()}
    for k in sorted(quota, key=lambda k: quota[k] - alloc[k], reverse=True)[:n - sum(alloc.values())]:
        alloc[k] += 1
    out = []
    for k, g in groups.items():
        out += [(k, x) for x in pick(g, alloc[k])]
    return out


SETS = []


def add(sid, section, title, desc, items):
    assert len(items) == N, (sid, len(items))
    SETS.append({'id': sid, 'sec': section, 'title': title, 'desc': desc, 'items': items})


# ------------------------------------------------------------------ grammar
add('g_base', 'Grammar', 'Structure & tenses', 'Sentence structure, tenses, modals',
    [slim(x) for x in pick(BANKS['BASE_GRAMMAR'])])
add('g_plus', 'Grammar', 'Grammar Plus', 'Conditionals, passive, reported speech',
    [slim(x) for x in pick(BANKS['GRAMMAR_PLUS'])])
topics = {}
for x in BANKS['EXPRESS_QCM']:
    if x.get('t') and x['t'] not in ('Military terms', 'Phrasal verbs'):
        topics.setdefault(x['t'], []).append(x)
add('g_topics', 'Grammar', 'Grammar by topic', 'Prepositions, tenses, modals and more',
    [slim(x, t) for t, x in stratified(topics)])

# --------------------------------------------------------------- vocabulary
add('v_ctx', 'Vocabulary', 'Vocabulary in context', 'Words and their meaning in a sentence',
    [slim(x) for x in pick(BANKS['BASE_VOCAB'])])
add('v_mil', 'Vocabulary', 'American & military', 'Words of everyday and military life',
    [slim(x) for x in pick(BANKS['VOCAB_AM'])])

# ------------------------------------------------------------------- idioms
add('i_idm', 'Idioms', 'American idioms', 'Common expressions and their meaning',
    [slim(x) for x in pick(BANKS['IDIOMS_QUIZ'])])
add('i_pv', 'Idioms', 'Phrasal verbs', 'Make up, pick up, put aside...',
    [slim(x) for x in pick(BANKS['PHRASALS'])])

# ---------------------------------------------------------------- listening
LD = js_object(path('practice', 'js', 'listening-data.js'), 'window.LISTEN_DATA')
MAN = js_object(path('assets', 'audio', 'listening', 'manifest.js'), 'window.ECL_LISTEN_AUDIO')
H = MAN.get('h', {})
by_kind = {}
for it in LD['items']:
    h = H.get(it['id'])
    if not h or not it.get('L') or len(h) != len(it['L']) or len(it.get('o') or []) != 4:
        continue
    files = []
    for n, (spk, text) in enumerate(it['L']):
        p = str(h[n]).split('.')
        if len(p) != 2 or p[1] != text_mark(text):
            files = None
            break
        files.append('%s-%d.mp3?v=%s' % (it['id'], n + 1, p[0]))
    if not files or not os.path.exists(path('assets', 'audio', 'listening', files[0].split('?')[0])):
        continue
    by_kind.setdefault(it['k'], []).append((it, files))
listen = []
for k in ('s', 'r', 'd', 'c', 'k'):
    for it, files in spread(by_kind.get(k, []), N // 5):
        x = {'id': it['id'], 'k': k, 'L': [[s, t, f] for (s, t), f in zip(it['L'], files)],
             'q': it['q'], 'o': it['o'], 'a': it.get('a', 0)}
        if (it.get('e') or '').strip():
            x['e'] = it['e'].strip()
        listen.append(x)
add('l_mix', 'Listening', 'Listening', 'Recorded American voices, 5 question types', listen)

# ------------------------------------------------------------------- test
add('t_mod', 'Test', 'Module test', 'Mixed questions, like the real test',
    [slim(x) for x in pick(BANKS['MODULE_TEST'])])

# ------------------------------------------------------------------ write
out = path('tg', 'data.js')
os.makedirs(os.path.dirname(out), exist_ok=True)
payload = json.dumps({'v': 1, 'n': N, 'sets': SETS}, ensure_ascii=False, separators=(',', ':'))
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Questions of the Telegram mini app: 50 per training, taken from the\n'
            '   website\'s banks. Generated by tools/tg-miniapp/build.py: do not edit. */\n')
    f.write('window.TG_DATA=' + payload + ';\n')
print('%d corrections applied, %d trainings x %d questions, %s: %.1f KB'
      % (fixed, len(SETS), N, os.path.relpath(out, ROOT), os.path.getsize(out) / 1024))
