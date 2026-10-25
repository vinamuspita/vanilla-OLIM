import subprocess,re,json
def txt(f,layout=True): return subprocess.run(['pdftotext']+(['-layout'] if layout else [])+[f,'-'],capture_output=True,text=True).stdout
def after_marker(f):
    t=txt(f); m=re.search(r'(ANSWER\s*SHEET|ANSWER\s*KEY|KUNCI\s*JAWABAN|Answer Key)',t,re.I)
    return t[m.start():] if m else ''
def iob(f):
    t=after_marker(f); k={}
    for m in re.finditer(r'(\d{1,2})\s*\.\s*(?:Answer|Jawaban)?\s*:?\s*([A-E])\b',t): k.setdefault(int(m.group(1)),m.group(2))
    return k
def iksc(f):
    k={}
    for line in txt(f).splitlines():
        m=re.match(r'^\s*(\d{1,2})\s+([A-E])\b',line)
        if m: k.setdefault(int(m.group(1)),m.group(2))
    return k
def table_after(f):
    t=after_marker(f); k={}
    for m in re.finditer(r'(?<!\d)(\d{1,2})\s*\.?\s+([A-E])\b',t): k.setdefault(int(m.group(1)),m.group(2))
    return k
K={}
import glob
S=json.load(open('sources.json'))
for s in S:
    if s['id'].startswith('iob_'): K[s['id']]=('IOB answer sheet in the same file',iob(s['file']))
ik={2017:'2017/Jawaban IKSC Tahun 2017.pdf',2019:'2019/Jawaban IKSC Tahun 2019.pdf',2020:'2020/Jawaban IKSC 2020.pdf',2021:'2021/Jawaban IKSC Tahun 2021.pdf',2022:'2022/Jawaban IKSC 2022.pdf',2023:'2023/Jawaban IKSC 2023.pdf',2024:'2024/Answer key IKSC 2024.pdf'}
for y,f in ik.items(): K[f'iksc{y}']=('IKSC answer key file: '+f.split('/')[-1]+' (Pre-Ecolier column)',iksc('src/IKSC/Soal IKSC '+f))
K['isco_sample']=('Answer key at the end of the same file',table_after('src/ISCO-SCIENCE COMPETITION/PAST PAPER/SAMPLE PAPER/ISCO1 GRADE 1 - 2.pdf'))
K['iyslo2025']=('Kunci jawaban table at the end of the same file',table_after('src/IYSLO/IPA IYSLO Level 1 2025.pdf'))
json.dump({k:[v[0],v[1]] for k,v in K.items()},open('keys.json','w'))
for k,(src,d) in K.items(): print(f"{k:<16} {len(d):>3} {''.join(d[i] for i in sorted(d))[:30]}")
