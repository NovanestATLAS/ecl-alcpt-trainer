#!/usr/bin/env python3
"""Recordings of the listening questions - Kokoro TTS (free, open-source, runs locally).

Kokoro-82M (Apache 2.0, https://github.com/hexgrad/kokoro) runs on the machine
itself: no paid API, no API key, no billing. Voices, speed 1.0:
  . the man: am_michael for questions L01 to L155, am_liam for L156 and after
  . the woman: af_heart

Collects every listening line of the website:
  . practice/js/listening-data.js  (Listening practice, ECL and ALCPT timed exams)
  . tests/*.html, data-seq buttons  (listening tests; the same questions, matched by text)
and keeps one MP3 per line, named after the question: assets/audio/listening/L04-2.mp3
is the 2nd line of question L04. The question-to-audio manifest is written twice:
  . assets/audio/listening/manifest.json  (for people and tools: every line with its text)
  . assets/audio/listening/manifest.js    (loaded by the website, assets/listen-audio.js:
    the hash of each recorded line and a mark of its text, by question, plus the
    lines of the test pages; the texts themselves come from listening-data.js)

Only MISSING or CHANGED lines are recorded (each entry keeps a hash of voice,
speed and text). Grammar, vocabulary, idioms... are not concerned.

  python3 tools/listening-audio/generate.py              # count only, no synthesis
  python3 tools/listening-audio/generate.py --only L01,L02,L04
  python3 tools/listening-audio/generate.py --all [--batch 20]
  python3 tools/listening-audio/generate.py --all --shard 0 --shards 8 --out new   (one batch of 8, GitHub)
  python3 tools/listening-audio/generate.py --merge new                            (manifest after the batches)

Needs: pip install "kokoro>=0.9.4" soundfile; espeak-ng and ffmpeg.
"""
import argparse, glob, hashlib, html, json, os, re, subprocess, sys, tempfile, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'audio', 'listening')
MANIFEST_JSON = os.path.join(OUT, 'manifest.json')
MANIFEST_JS = os.path.join(OUT, 'manifest.js')
DEMO_JSON = os.path.join(OUT, 'demo.json')    # listening questions of the home-page demo
DEMO_SIZE = 300
MODEL = 'hexgrad/Kokoro-82M'
VOICES = {'M': 'am_michael', 'W': 'af_heart'}
MAN_NEW = 'am_liam'             # the man of the questions added in October 2026
NEW_FROM = 156                  # ... L156 and after
SPEED = 1.0
SR = 24000                      # Kokoro's own sample rate
BITRATE = '48k'                 # mono MP3: clear speech, about 6 KB a second


def load_items():
    src = open(os.path.join(ROOT, 'practice', 'js', 'listening-data.js'), encoding='utf-8').read()
    return json.loads(src[src.index('{'):src.rindex('}') + 1])['items']


def test_lines():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tests', '*.html'))):
        for m in re.finditer(r'data-seq="([^"]*)"', open(f, encoding='utf-8').read()):
            for role, text in json.loads(html.unescape(m.group(1))):
                if role in ('M', 'W'):
                    out.append((os.path.basename(f), role, text))
    return out


def spoken(text):
    """Text given to Kokoro: plain punctuation."""
    t = re.sub(r'[‘’]', "'", text)
    t = re.sub(r'[“”]', '"', t)
    t = re.sub(r'[–—]', ', ', t)
    return re.sub(r'\s+', ' ', t).strip()


def voice_of(qid, role):
    if role == 'W':
        return VOICES['W']
    n = re.sub(r'\D', '', qid)
    return MAN_NEW if n and int(n) >= NEW_FROM else VOICES['M']


def text_mark(text):
    """FNV-1a (32 bits, UTF-16 code units, base 36) of a line's exact text: the
    website plays a recording only when the text it shows has this mark, so a
    question file and a manifest of different versions (browser cache, CDN)
    can never pair a question with another question's recording."""
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


def line_hash(voice, text):
    return hashlib.sha1(('kokoro|%s|%s|%s' % (voice, SPEED, text)).encode('utf-8')).hexdigest()[:10]


def plan(items):
    """Every line of every question: {id: [{file, role, voice, text, hash}]}"""
    out = {}
    for it in items:
        lines = []
        for n, (role, text) in enumerate(it['L'], 1):
            r = 'W' if role == 'W' else 'M'
            v = voice_of(it['id'], r)
            lines.append({'file': '%s-%d.mp3' % (it['id'], n), 'role': r, 'voice': v, 'text': text, 'hash': line_hash(v, text)})
        out[it['id']] = lines
    return out


def read_manifest():
    try:
        return json.load(open(MANIFEST_JSON, encoding='utf-8')).get('items', {})
    except (OSError, ValueError):
        return {}


def write_manifest(want, done):
    """Only lines whose MP3 exists and matches the current text go in."""
    items = {}
    for qid, lines in want.items():
        ok = [l for l in lines if done.get(l['file']) == l['hash'] and os.path.exists(os.path.join(OUT, l['file']))]
        if len(ok) == len(lines):
            items[qid] = lines
    voices = {'M': VOICES['M'], 'M_new': MAN_NEW, 'W': VOICES['W'], 'new_from': 'L%d' % NEW_FROM}
    m = {'v': 2, 'engine': 'Kokoro TTS', 'model': MODEL, 'voices': voices, 'speed': SPEED,
         'format': 'MP3 %s mono %d Hz' % (BITRATE, SR), 'count': sum(len(v) for v in items.values()), 'items': items}
    os.makedirs(OUT, exist_ok=True)
    with open(MANIFEST_JSON, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
    # for the website: h = hashes of the recorded lines by question (the texts are in
    # listening-data.js); t = the lines of the test pages, which do not load it
    byline = {(l['role'], l['text']): l for v in items.values() for l in v}
    t = {}
    for _, role, text in test_lines():
        l = byline.get(('W' if role == 'W' else 'M', text))
        if l:
            t[l['role'] + '|' + text] = l['file'] + '?v=' + l['hash']
    web = {'v': 3, 'voices': voices, 'count': m['count'],
           'h': {qid: [l['hash'] + '.' + text_mark(l['text']) for l in v] for qid, v in items.items()}, 't': t}
    # home page: about 300 short recorded questions (statements, questions and
    # answers, short dialogs) with their own files, so the page plays them
    # without loading the whole bank
    src = {it['id']: it for it in load_items()}
    pick = [qid for qid in items if src.get(qid) and src[qid]['k'] in ('s', 'r', 'd')]
    step = max(1, len(pick) // DEMO_SIZE)
    demo = []
    for qid in pick[::step][:DEMO_SIZE]:
        it = src[qid]
        demo.append({'id': qid, 'k': it['k'], 'L': it['L'], 'q': it['q'], 'o': it['o'], 'a': it['a'],
                     'e': it.get('e', ''), 'f': [l['file'] + '?v=' + l['hash'] for l in items[qid]]})
    with open(DEMO_JSON, 'w', encoding='utf-8') as f:
        json.dump({'v': 1, 'items': demo}, f, ensure_ascii=False, separators=(',', ':'))
    with open(MANIFEST_JS, 'w', encoding='utf-8') as f:
        f.write('/* Question-to-audio manifest of the listening questions (Kokoro TTS, speed 1.0: man\n'
                '   am_michael, am_liam from L%d; woman af_heart). Generated by tools/listening-audio/generate.py. */\n'
                'window.ECL_LISTEN_AUDIO = ' % NEW_FROM + json.dumps(web, ensure_ascii=False, separators=(',', ':')) + ';\n')
    return m


class Kokoro:
    def __init__(self):
        import numpy as np, soundfile as sf
        from kokoro import KPipeline
        self.np, self.sf = np, sf
        self.pipe = KPipeline(lang_code='a', repo_id=MODEL)          # 'a' = American English

    def mp3(self, voice, text, dest):
        parts = [r.audio for r in self.pipe(spoken(text), voice=voice, speed=SPEED, split_pattern=r'\n+') if r.audio is not None]
        if not parts:
            sys.exit('Kokoro produced no audio for: ' + text)
        pause = self.np.zeros(int(SR * 0.12), dtype='float32')     # a breath between long sentences
        audio = self.np.concatenate([x for p in parts for x in (p.cpu().numpy().astype('float32'), pause)][:-1])
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as w:
            self.sf.write(w.name, audio, SR)
        try:
            # same loudness for both voices; mono 24 kHz 48 kbps; no tags
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', w.name,
                            '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', str(SR),
                            '-codec:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', '-id3v2_version', '0',
                            dest], check=True)
        finally:
            os.unlink(w.name)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', help='question ids to record, e.g. L01,L02,L04')
    ap.add_argument('--all', action='store_true', help='record every missing or changed line')
    ap.add_argument('--batch', type=int, default=20, help='questions per batch; the manifest is saved after each batch')
    ap.add_argument('--shard', type=int, default=0, help='with --shards: this batch only (0 to shards-1)')
    ap.add_argument('--shards', type=int, default=0, help='split the work into N batches run in parallel (GitHub)')
    ap.add_argument('--out', help='with --shards: folder for the MP3 files and done-<shard>.json (no manifest)')
    ap.add_argument('--merge', help='folder of done-*.json written by the batches: writes the manifest')
    ap.add_argument('--missing', action='store_true', help='print the number of questions to record, nothing else')
    a = ap.parse_args()

    items = load_items()
    want = plan(items)
    known = {(l['role'], l['text']) for v in want.values() for l in v}
    stray = [x for x in test_lines() if (x[1], x[2]) not in known]
    old = read_manifest()
    done = {l['file']: l['hash'] for v in old.values() for l in v}
    todo_ids = [qid for qid, lines in want.items()
                if any(done.get(l['file']) != l['hash'] or not os.path.exists(os.path.join(OUT, l['file'])) for l in lines)]

    if a.missing:
        print(len(todo_ids))
        return
    if a.merge:
        for p in sorted(glob.glob(os.path.join(a.merge, 'done-*.json'))):
            done.update(json.load(open(p, encoding='utf-8')))
        keep = {l['file'] for v in want.values() for l in v} | {'manifest.json', 'manifest.js', 'demo.json'}
        for p in glob.glob(os.path.join(OUT, '*')):
            if os.path.basename(p) not in keep:
                os.unlink(p)
                print('  removed', os.path.basename(p))
        m = write_manifest(want, done)
        mp3 = glob.glob(os.path.join(OUT, '*.mp3'))
        miss = [qid for qid in want if qid not in m['items']]
        print('Saved: %d MP3 files, %d of %d questions complete, %.2f MB.' % (
            len(mp3), len(m['items']), len(want), sum(map(os.path.getsize, mp3)) / 1e6))
        if miss:
            print('Not recorded yet (the browser voice reads them): %d, e.g. %s' % (len(miss), ', '.join(miss[:12])))
        return

    n_lines = sum(len(v) for v in want.values())
    chars = sum(len(spoken(l['text'])) for v in want.values() for l in v)
    print('Questions with audio : %d (%d lines: %d man / %d woman, %d characters)' % (
        len(want), n_lines, sum(1 for v in want.values() for l in v if l['role'] == 'M'),
        sum(1 for v in want.values() for l in v if l['role'] == 'W'), chars))
    print('Voices               : man %s (%s from L%d), woman %s, speed %.1f' % (VOICES['M'], MAN_NEW, NEW_FROM, VOICES['W'], SPEED))
    print('Up to date           : %d questions; to record: %d' % (len(want) - len(todo_ids), len(todo_ids)))
    if stray:
        print('Test-page lines not found in listening-data.js (they keep the browser voice): %d' % len(stray))
        for s in stray[:10]:
            print('   ', s)

    if a.only:
        ids = [x.strip() for x in a.only.split(',') if x.strip()]
        bad = [x for x in ids if x not in want]
        if bad:
            sys.exit('Unknown question ids: ' + ', '.join(bad))
        todo_ids = [x for x in todo_ids if x in ids]
    elif not a.all:
        write_manifest(want, done)
        print('\nCount only. Use --only IDS or --all to record.')
        return

    if a.shards:
        todo_ids = todo_ids[a.shard::a.shards]
        dest = os.path.abspath(a.out or OUT)
        os.makedirs(dest, exist_ok=True)
        tts = Kokoro() if todo_ids else None
        rec, t0 = {}, time.time()
        for i, qid in enumerate(todo_ids, 1):
            for l in want[qid]:
                if done.get(l['file']) == l['hash'] and os.path.exists(os.path.join(OUT, l['file'])):
                    continue
                tts.mp3(l['voice'], l['text'], os.path.join(dest, l['file']))
                rec[l['file']] = l['hash']
            if i % 25 == 0 or i == len(todo_ids):
                with open(os.path.join(dest, 'done-%d.json' % a.shard), 'w', encoding='utf-8') as f:
                    json.dump(rec, f)
                print('Batch %d/%d: %d of %d questions (%.0f s)' % (a.shard + 1, a.shards, i, len(todo_ids), time.time() - t0), flush=True)
        return

    os.makedirs(OUT, exist_ok=True)
    tts = Kokoro() if todo_ids else None
    t0 = time.time()
    for b in range(0, len(todo_ids), max(1, a.batch)):
        batch = todo_ids[b:b + a.batch]
        for qid in batch:
            for l in want[qid]:
                if done.get(l['file']) == l['hash'] and os.path.exists(os.path.join(OUT, l['file'])):
                    continue
                tts.mp3(l['voice'], l['text'], os.path.join(OUT, l['file']))
                done[l['file']] = l['hash']
                print('  %-9s %-10s %s' % (l['file'], l['voice'], l['text'][:70]), flush=True)
        write_manifest(want, done)
        print('Batch %d: %d questions done (%.0f s)' % (b // a.batch + 1, min(b + a.batch, len(todo_ids)), time.time() - t0), flush=True)

    # files of questions that no longer exist
    if a.all:
        keep = {l['file'] for v in want.values() for l in v} | {'manifest.json', 'manifest.js', 'demo.json'}
        for p in glob.glob(os.path.join(OUT, '*')):
            if os.path.basename(p) not in keep:
                os.unlink(p)
                print('  removed', os.path.basename(p))

    m = write_manifest(want, done)
    mp3 = glob.glob(os.path.join(OUT, '*.mp3'))
    print('\nSaved: %d MP3 files for %d questions, %.2f MB.' % (len(mp3), len(m['items']), sum(map(os.path.getsize, mp3)) / 1e6))


if __name__ == '__main__':
    main()
