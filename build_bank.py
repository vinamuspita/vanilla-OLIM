import json,re,os,hashlib
R=json.load(open('raw.json'));K=json.load(open('keys.json'));S={s['id']:s for s in json.load(open('sources.json'))}
UNRELIABLE={'iksc2016':'Hasil scan tidak terbaca otomatis dengan andal','iksc2018':'Hasil scan tidak terbaca otomatis dengan andal','isco_final':'Tata letak tabel tidak dapat dipotong otomatis','jeo2025a':'Format slide tidak dapat dipotong otomatis'}
LEVELNOTE={'kmsi_l1a':'File hanya menyebut "Level 1" tanpa kelas','kmsi_l1b':'File hanya menyebut "Level 1" tanpa kelas'}
norm=lambda t:re.sub(r'[^a-z0-9]+',' ',(t or '').lower()).strip()
seen={};bank=[];papers={}
for sid,qs in R.items():
    s=S[sid];key_src,keys=(K.get(sid) or [None,{}])
    pid=sid.rsplit('_',1)[0] if sid.startswith('iob_') else sid
    lang=s.get('lang','en')
    P=papers.setdefault(pid,dict(id=pid,olympiad=s['olympiad'],subject=s['subject'],level=s['level'],title=s['paper'],combined=bool(s.get('combined')),files=[],langs=[],keySource=None,note=None,total=0))
    P['files'].append(s['file'][4:]);P['langs'].append(lang)
    if key_src: P['keySource']=key_src
    if sid in UNRELIABLE: P['note']=UNRELIABLE[sid]
    if sid in LEVELNOTE: P['note']=LEVELNOTE[sid]
    for q in qs:
        issues=[];status='verified'
        opts=q['options']
        if len(opts)<2: status='excluded';issues.append('Bukan soal pilihan ganda atau pilihan tidak terdeteksi')
        if not q['img']: status='excluded';issues.append('Gambar soal tidak berhasil dipotong')
        if sid in UNRELIABLE: status='needs_review';issues.append(UNRELIABLE[sid])
        if sid in LEVELNOTE and status=='verified': status='needs_review';issues.append(LEVELNOTE[sid])
        k=keys.get(str(q['num'])) if keys else None;kst='none';ksrc=key_src
        if not k and q.get('key_inline') and not re.fullmatch(r'_+',q['key_inline']):
            ki=q['key_inline'].strip()
            if re.fullmatch(r'[A-E]',ki.upper()) and sid!='jeo2023': k=ki.upper();ksrc='Kunci jawaban tertulis di bawah soal dalam file yang sama'
            else:
                m=[a for a,b in opts if norm(b)==norm(ki)]
                if len(m)==1: k=m[0];ksrc='Jawaban tertulis di bawah soal (dicocokkan dengan teks pilihan)'
                else: issues.append(f'Jawaban di sumber "{ki}" tidak cocok persis dengan satu pilihan')
        if k:
            if k in [a for a,_ in opts]: kst='verified'
            else:
                kst='mismatch';issues.append(f'Kunci {k} tidak ada di pilihan yang terdeteksi (pilihan mungkin berupa gambar)');k=None
                if status=='verified': status='needs_review'
        group=f"{pid}_{q['num']:02d}"
        nt=norm(q['text'])
        if status=='verified' and len(nt)>25:
            dk=(nt,s['level'])
            if dk in seen and seen[dk]!=group.rsplit('_',1)[0]:
                status='excluded';issues.append('Duplikat dari '+seen[dk])
            else: seen.setdefault(dk,group.rsplit('_',1)[0])
        stim=q.get('stimulus')
        optText=all(o[1] and len(re.findall(r'\(',o[1]))<2 and len(o[1])<90 for o in opts)
        bank.append(dict(id=f"{sid}_{q['num']:02d}",group=group,paper=pid,lang=lang,olympiad=s['olympiad'],subject=s['subject'],level=s['level'],combined=bool(s.get('combined')),
            source=s['file'][4:],page=q['page'],num=q['num'],img=q['img'],stim=stim['img'] if stim else None,text=q['text'],options=[{'l':a,'t':b} for a,b in opts],optText=optText,
            key=k,keyStatus=kst,keySource=ksrc if k else None,explanation=q.get('explanation'),status=status,issues=issues))
        if lang==P['langs'][0]: P['total']+=1
json.dump(dict(papers=list(papers.values()),questions=bank),open('site/bank.json','w'),ensure_ascii=False,separators=(',',':'))
from collections import Counter
c=Counter((q['status'],q['keyStatus']) for q in bank);print(c)
print('papers',len(papers),'questions',len(bank),'size',os.path.getsize('site/bank.json')//1024,'KB')
used={q['img'] for q in bank}|{q['stim'] for q in bank if q['stim']}
for f in os.listdir('site/q'):
    if f not in used: os.remove('site/q/'+f)
print('images',len(os.listdir('site/q')))
