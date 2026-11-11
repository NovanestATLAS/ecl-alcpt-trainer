#!/usr/bin/env python3
"""Check (and optionally fix) every question count shown on the site.

The numbers come from the question banks the trainer loads (practice/data/*.json, practice/js/listening-data.js)
and from the lists on the lesson pages. Each page must show the same figures.

    python3 tools/site-counts.py          # report mismatches, exit 1 if any
    python3 tools/site-counts.py --fix    # rewrite the stale numbers, then report

Run it after every change to a question bank or to a count on a page.
"""
import glob
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIX = '--fix' in sys.argv


def bank(name):
    return json.loads((ROOT / 'practice/data' / f'{name}.json').read_text(encoding='utf-8'))


def fmt(n):
    return f'{n:,}'


# ---------------------------------------------------------------- canonical numbers
grammar_banks = [bank('base_grammar'), bank('grammar_plus'), bank('express_qcm')]
vocab_banks = [bank('base_vocab'), bank('vocab_american')]
idioms_q, phrasal_q, module_q = bank('idioms_quiz'), bank('phrasal_verbs'), bank('module_test')

listen_js = (ROOT / 'practice/js/listening-data.js').read_text(encoding='utf-8')
listen = json.loads(re.search(r'window\.LISTEN_DATA\s*=\s*(\{.*\});?\s*$', listen_js, re.S).group(1))['items']

N = {
    'grammar': sum(len(b) for b in grammar_banks),
    'vocab': sum(len(b) for b in vocab_banks),
    'idioms_q': len(idioms_q),
    'phrasal_q': len(phrasal_q),
    'module': len(module_q),
    'listen': len(listen),
}
N['idioms_phrasal_q'] = N['idioms_q'] + N['phrasal_q']
N['total'] = N['grammar'] + N['vocab'] + N['idioms_phrasal_q'] + N['module']
N['phrasal_verbs'] = len(re.findall(r'class="wl-item"', (ROOT / 'lessons/phrasal-verbs.html').read_text(encoding='utf-8')))

# questions per topic bank: practice/?set=<key>
topic_sizes = {}
for q in bank('express_qcm'):
    key = 'g_x_' + re.sub(r'\W+', '_', q['t'])
    topic_sizes[key] = topic_sizes.get(key, 0) + 1

# ---------------------------------------------------------------- rules
NUM = r'(\d{1,3}(?:,\d{3})+|\d{2,4})'
RULES = [
    (rf'{NUM}(?=\s+(?:original\s+|explained\s+|multiple-choice\s+)*(?:practice\s+)?questions\b)', 'total', lambda v: v >= 3000 and v != N['listen']),
    (rf'{NUM}(?=\s+grammar questions)', 'grammar', lambda v: v >= 500),
    (rf'{NUM}(?=\s+vocabulary questions)', 'vocab', lambda v: v >= 500),
    (rf'{NUM}(?=\s+phrasal verb questions)', 'phrasal_q', lambda v: v >= 100),
    (rf'{NUM}(?=\s+idiom questions)', 'idioms_q', lambda v: v >= 100),
    (rf'{NUM}(?=\s+questions on idioms and phrasal verbs)', 'idioms_phrasal_q', lambda v: v >= 100),
    (rf'{NUM}(?=\s+phrasal verbs\b)', 'phrasal_verbs', lambda v: v > 200),
    (rf'{NUM}(?=<small>questions</small>)', None, None),  # home page cards, handled below
]

CARDS = {'practice/?go=grammar': 'grammar', 'practice/?go=vocab': 'vocab', 'practice/?go=idiom': 'idioms_phrasal_q'}

problems = []


def check_file(path: Path):
    rel = path.relative_to(ROOT).as_posix()
    text = path.read_text(encoding='utf-8')
    orig = text

    def line_of(pos):
        return orig.count('\n', 0, pos) + 1

    # simple rules
    for pattern, key, guard in RULES:
        if key is None:
            continue
        for m in list(re.finditer(pattern, text)):
            val = int(m.group(1).replace(',', ''))
            if guard and not guard(val):
                continue
            if val != N[key]:
                problems.append(f'{rel}:{line_of(m.start())}: {m.group(1)} should be {fmt(N[key])} ({key})')
        if FIX:
            def repl(m, key=key, guard=guard):
                val = int(m.group(1).replace(',', ''))
                if guard and not guard(val):
                    return m.group(0)
                return fmt(N[key])
            text = re.sub(pattern, repl, text)

    # listening: always "recorded listening questions"
    for m in re.finditer(r'5,037 (?:listening )?recordings\b', text):
        problems.append(f'{rel}:{line_of(m.start())}: say "{fmt(N["listen"])} recorded listening questions", not "recordings"')
    if FIX:
        text = re.sub(r'5,037 (?:listening )?recordings\b', f'{fmt(N["listen"])} recorded listening questions', text)
    for m in re.finditer(r'(\d{1,3},\d{3}) (?:recorded )?listening questions', text):
        if int(m.group(1).replace(',', '')) != N['listen']:
            problems.append(f'{rel}:{line_of(m.start())}: {m.group(1)} should be {fmt(N["listen"])} (listen)')

    # home page cards
    if rel == 'index.html':
        for card_href, key in CARDS.items():
            m = re.search(rf'<div class="count">{NUM}<small>questions</small></div><a [^>]*href="{re.escape(card_href)}"', text)
            if m and int(m.group(1).replace(',', '')) != N[key]:
                problems.append(f'{rel}:{line_of(m.start())}: card {card_href} shows {m.group(1)}, should be {fmt(N[key])}')
                if FIX:
                    text = text[:m.start(1)] + fmt(N[key]) + text[m.end(1):]
        m = re.search(r'<div class="count">5,037<small>recordings</small>', text)
        if m:
            problems.append(f'{rel}:{line_of(m.start())}: listening card should say "questions"')
            if FIX:
                text = text.replace('<small>recordings</small></div><a class="btn btn-brass btn-small" href="practice/?start=listen"', '<small>recorded questions</small></div><a class="btn btn-brass btn-small" href="practice/?start=listen"')

    # topic pages: numbers next to a link to practice/?set=<one bank>
    sets = set(re.findall(r'\?set=([A-Za-z0-9_]+)', text))
    if len(sets) == 1:
        key = next(iter(sets))
        if key in topic_sizes:
            size = topic_sizes[key]
            for pat in (r'Practice (?:all )?(\d+) questions', r'All (\d+) questions on this topic'):
                for m in list(re.finditer(pat, text)):
                    if int(m.group(1)) != size:
                        problems.append(f'{rel}:{line_of(m.start())}: topic {key} has {size} questions, page says {m.group(1)}')
                if FIX:
                    text = re.sub(pat, lambda m: m.group(0).replace(m.group(1), str(size)), text)

    if FIX and text != orig:
        path.write_text(text, encoding='utf-8')
        print('fixed', rel)


FILES = [p for p in ROOT.glob('**/*.html')
         if not any(part in {'assets', 'tg', 'fr', 'ar', '.git', 'node_modules'} for part in p.relative_to(ROOT).parts)]
for p in sorted(FILES):
    check_file(p)

print('Canonical counts:', {k: fmt(v) for k, v in N.items()})
if FIX:
    # report what is still wrong after fixing
    problems.clear()
    FIX = False
    for p in sorted(FILES):
        check_file(p)
if problems:
    print(f'\n{len(problems)} mismatch(es):')
    print('\n'.join(problems))
    sys.exit(1)
print('All counts match.')
