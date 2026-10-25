import pdfplumber, re, os, json, subprocess, hashlib, sys, glob
from PIL import Image, ImageOps
DPI = 150; SC = DPI / 72
OUT = 'site/q'
os.makedirs(OUT, exist_ok=True)
STOPWORDS = re.compile(r'^(ANSWER\s*SHEET|ANSWER\s*KEY|KUNCI\s*JAWABAN\s*$|Answer\s*Key|Lembar\s*Jawaban|SELAMAT\s*MENGERJAKAN|End of (Paper|Exam)|SHORT\s*ANSWER)', re.I)

def render(pdf, page_no, cache={}):
    key = (pdf, page_no)
    if key not in cache:
        base = f'/tmp/r_{hashlib.md5(pdf.encode()).hexdigest()[:8]}_{page_no}'
        if not os.path.exists(base + '.png'):
            subprocess.run(['pdftoppm', '-r', str(DPI), '-f', str(page_no), '-l', str(page_no), '-png', '-singlefile', pdf, base], check=True)
        cache.clear(); cache[key] = Image.open(base + '.png').convert('RGB')
    return cache[key]

def ocr_words(pdf, pno, pw, ph):
    base = f'/tmp/o_{hashlib.md5(pdf.encode()).hexdigest()[:8]}_{pno}'
    if not os.path.exists(base + '.png'):
        subprocess.run(['pdftoppm', '-r', '250', '-f', str(pno), '-l', str(pno), '-png', '-singlefile', pdf, base], check=True)
    img = Image.open(base + '.png'); OSC = 250 / 72
    tsv = subprocess.run(['tesseract', base + '.png', '-', '--psm', '3', 'tsv'], capture_output=True).stdout.decode('utf8', 'ignore')
    words = []
    for line in tsv.splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12 or not f[11].strip() or float(f[10]) < 20: continue
        l, t, w, h = map(int, f[6:10])
        words.append(dict(text=f[11].strip(), x0=l / OSC, top=t / OSC, x1=(l + w) / OSC, bottom=(t + h) / OSC))
    return words

def _png(img):
    import io; b = io.BytesIO(); img.save(b, 'PNG'); return b.getvalue()

def pop_words(pdf, pno):
    out = subprocess.run(['pdftotext', '-bbox', '-f', str(pno), '-l', str(pno), pdf, '-'], capture_output=True, text=True).stdout
    import html
    ws = []
    for m in re.finditer(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>', out):
        t = html.unescape(m.group(5)).strip()
        if t: ws.append(dict(text=t, x0=float(m.group(1)), top=float(m.group(2)), x1=float(m.group(3)), bottom=float(m.group(4))))
    return ws

def lines_of(words):
    ws = sorted(words, key=lambda w: (round(w['top']), w['x0']))
    lines = []
    for w in ws:
        for L in lines:
            if abs(L['top'] - w['top']) < 4 and abs(L['bottom'] - w['bottom']) < 6:
                L['words'].append(w); L['top'] = min(L['top'], w['top']); L['bottom'] = max(L['bottom'], w['bottom']); break
        else:
            lines.append(dict(top=w['top'], bottom=w['bottom'], words=[w]))
    for L in lines:
        L['words'].sort(key=lambda w: w['x0']); L['text'] = ' '.join(w['text'] for w in L['words']); L['x0'] = L['words'][0]['x0']
    return sorted(lines, key=lambda L: L['top'])

NUMRE = re.compile(r'^(\d{1,2})[\.\)](.*)$')
OPTRE = re.compile(r'^\(?([A-Ea-e])[\.\)](.*)$')

def linenum(L, src, numre):
    if src.get('linere'):
        m = re.match(src['linere'], L['text'])
        return int(m.group(1)) if m else None
    t = L['words'][0]['text']
    if src.get('ocr'): t = re.sub(r'^(\d{1,2})[,:;]', r'\1.', t)
    m = numre.match(t)
    return int(m.group(1)) if m else None

def trim(img, pad=8):
    g = ImageOps.grayscale(img).point(lambda v: 0 if v > 205 else 255)
    bb = g.getbbox()
    if not bb: return None
    l, t, r, b = bb
    return img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))

def extract(src):
    pdf = src['file']; res = []; stim = None; expected = 1; ocr = src.get('ocr', False)
    footer = src.get('footer', 0.935); header = src.get('header', 0.0)
    numre = re.compile(src['numre']) if src.get('numre') else NUMRE
    stopped = False
    with pdfplumber.open(pdf) as doc:
        pages = list(range(len(doc.pages))) if not src.get('pages') else [p - 1 for p in src['pages']]
        if not src.get('pages') and not ocr:
            for pi in pages:
                ws = pop_words(pdf, pi + 1)
                LL = lines_of(ws); hit = False
                for i, L in enumerate(LL):
                    if linenum(L, src, numre) == 1:
                        nxt = ' | '.join(x['text'] for x in LL[i:i + 16])
                        if re.search(r'(^|\| |\s)\(?[Aa][\.\)]\s*\S', nxt) or src.get('linere'): hit = True; break
                if hit:
                    k = pages.index(pi)
                    if src.get('stimulus', True) and k > 0:
                        prev = pop_words(pdf, pi)
                        pt = ' '.join(w['text'] for w in prev)
                        if len(pt.split()) > 80 and not re.search(r'Petunjuk|Instruction|Peraturan|Tata\s*Tertib|Ketentuan', pt, re.I): k -= 1
                    pages = pages[k:]; break
        for pi in pages:
            if stopped: break
            page = doc.pages[pi]; pw, ph = float(page.width), float(page.height)
            words = ocr_words(pdf, pi + 1, pw, ph) if ocr else pop_words(pdf, pi + 1)
            words = [w for w in words if w['top'] > ph * header and w['bottom'] < ph * footer]
            allL = lines_of(words)
            # stop marker
            stopy = None
            for L in allL:
                if STOPWORDS.search(L['text'].strip()): stopy = L['top']; break
            # columns
            cands = [L for L in allL if linenum(L, src, numre) is not None and (stopy is None or L['top'] < stopy)]
            ncol = src.get('cols', 0)
            if not ncol:
                right = [c for c in cands if c['x0'] > pw * 0.42]; left = [c for c in cands if c['x0'] < pw * 0.3]
                ncol = 2 if right and left else 1
            cols = [(pw * i / ncol, pw * (i + 1) / ncol) for i in range(ncol)]
            for ci, (cx0, cx1) in enumerate(cols):
                cw = [w for w in words if cx0 - 1 <= w['x0'] < cx1]
                CL = lines_of(cw)
                if stopy is not None: CL = [L for L in CL if L['top'] < stopy]
                starts = []
                for L in CL:
                    m = linenum(L, src, numre)
                    if m is None or (L['x0'] - cx0) >= (cx1 - cx0) * 0.35: continue
                    want = expected + len(starts)
                    if m == want or (src.get('tolerant') and m == want + 1 and len(starts) + expected > 1):
                        L['qnum'] = m; starts.append(L)
                        if m == want + 1: expected += 1
                if not starts and src.get('stimulus', True) and ci == 0:
                    body = [L for L in CL if L['top'] > ph * max(header, 0.06)]
                    if len(' '.join(L['text'] for L in body).split()) > 60:
                        s_img = save_crop(pdf, pi + 1, 0, min(L['top'] for L in body) - 4, pw, ph * footer, src, f"stim_{pi}_full")
                        if s_img: stim = dict(img=s_img, text=' '.join(L['text'] for L in body)[:600])
                # stimulus: content in column above first question on page
                if starts:
                    above = [L for L in CL if L['bottom'] < starts[0]['top'] - 2 and L['top'] > ph * max(header, 0.06)]
                    txt = ' '.join(L['text'] for L in above)
                    if len(txt.split()) >= src.get('stimwords', 12) and src.get('stimulus', True):
                        y0 = min(L['top'] for L in above) - 4; y1 = starts[0]['top'] - 2
                        stim = save_crop(pdf, pi + 1, cx0, y0, cx1, y1, src, f"stim_{pi}_{ci}")
                        if stim: stim = dict(img=stim, text=txt[:600])
                for k, L in enumerate(starts):
                    y0 = L['top'] - 4
                    y1 = starts[k + 1]['top'] - 3 if k + 1 < len(starts) else (stopy - 3 if stopy else ph * footer)
                    region = [l for l in CL if l['top'] >= L['top'] - 1 and l['top'] < y1]
                    # cut at in-question key lines
                    keyline = None; key_txt = None; expl = None
                    for idx, l in enumerate(region):
                        if re.match(r'^(Kunci\s*Jawaban|Answers?\s*:|Jawaban\s*:)', l['text'], re.I):
                            keyline = l; key_txt = re.sub(r'^(Kunci\s*Jawaban|Answers?|Jawaban)\s*:?\s*', '', l['text'], flags=re.I).strip()
                            rest = region[idx + 1:]
                            if rest and re.match(r'^Pembahasan', rest[0]['text'], re.I):
                                ex = ' '.join(r['text'] for r in rest)
                                expl = re.sub(r'^Pembahasan\s*:?\s*', '', ex, flags=re.I).strip() or None
                            region = region[:idx]; break
                    cy1 = keyline['top'] - 2 if keyline else y1
                    num = L['qnum']
                    img = save_crop(pdf, pi + 1, cx0, y0, cx1, cy1, src, f"{num:02d}")
                    # options: labels may appear in any order across columns
                    segs = []; qtext = []; seen_opt = False
                    for l in region:
                        cur = None; lineSegs = []
                        for wi, w in enumerate(l['words']):
                            m = OPTRE.match(w['text'])
                            prev_ok = wi == 0 or (w['x0'] - l['words'][wi - 1]['x1']) > 6
                            if m and prev_ok and (wi == 0 or seen_opt or m.group(1).upper() == 'A'):
                                cur = [m.group(1).upper(), m.group(2), w['x0']]; lineSegs.append(cur); seen_opt = True
                            elif cur is not None: cur[1] += ' ' + w['text']
                            elif seen_opt and segs:
                                tgt = min(segs, key=lambda sg: abs(sg[2] - w['x0'])); tgt[1] += ' ' + w['text']
                            else: qtext.append(w['text'])
                        segs.extend(lineSegs)
                    letters = [sg[0] for sg in segs]
                    srt = sorted(set(letters))
                    if letters and len(letters) == len(srt) and srt == list('ABCDE'[:len(srt)]):
                        opts = sorted([[a, b] for a, b, _ in segs])
                    else:
                        opts = []
                    qt = ' '.join(qtext); qt = re.sub(r'^(Question\s*)?\d{1,2}\s*([\.\),:]|/\d+)?\s*', '', qt).strip()
                    res.append(dict(num=num, page=pi + 1, img=img, text=qt, options=[[a, b.strip()] for a, b in opts], key_inline=key_txt, explanation=expl, stimulus=stim if src.get('stimulus', True) else None))
                expected += len(starts)
    return res

def save_crop(pdf, pno, x0, y0, x1, y1, src, tag):
    img = render(pdf, pno)
    box = (int(max(0, x0) * SC), int(max(0, y0) * SC), int(x1 * SC), int(y1 * SC))
    if box[3] - box[1] < 15: return None
    c = trim(img.crop(box))
    if c is None: return None
    if c.width > 1100: c = c.resize((1100, int(c.height * 1100 / c.width)))
    name = f"{src['id']}_{tag}.jpg"
    c.save(os.path.join(OUT, name), quality=72, optimize=True)
    return name

if __name__ == '__main__':
    srcs = json.load(open('sources.json'))
    only = sys.argv[1:]
    out = {}
    if os.path.exists('raw.json'): out = json.load(open('raw.json'))
    for s in srcs:
        if only and s['id'] not in only: continue
        for f in glob.glob(f"{OUT}/{s['id']}_*.jpg"): os.remove(f)
        r = extract(s); out[s['id']] = r
        nums = [q['num'] for q in r]
        json.dump(out, open('raw.json', 'w'), ensure_ascii=False)
        print(f"{s['id']:<22} {len(r):>3} q  opts:{sum(1 for q in r if len(q['options'])>=2):>3}  nums {nums[:3]}..{nums[-2:] if nums else ''}", flush=True)
    json.dump(out, open('raw.json', 'w'), ensure_ascii=False)
