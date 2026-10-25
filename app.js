"use strict";
/* Olympiad Quiz Kids — quizzes built only from the uploaded olympiad papers. */
const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const LS={get(k,d){try{const v=localStorage.getItem("oqk:"+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem("oqk:"+k,JSON.stringify(v))}catch(e){toast("Penyimpanan penuh. / Storage is full.")}}};

const OLYS=[
 {id:"copernicus",name:"COPERNICUS",icon:"🔭",bg:"#E8DDFF",req:1},
 {id:"fiso",name:"FISO Competition Info Pack",icon:"🌍",bg:"#DCEBFF",req:1},
 {id:"heat",name:"HEAT BBC",icon:"🔥",bg:"#FFE2D6",req:1,note:"Semua soal HEAT BBC di file berbentuk isian (tanpa pilihan jawaban) dan tidak disertai kunci, jadi tidak dapat dijadikan kuis pilihan ganda tanpa mengubah soal aslinya."},
 {id:"imec",name:"IMEC – Math Competition",icon:"➗",bg:"#FFF0C4",req:1},
 {id:"iob",name:"IOB Season 1",icon:"🦜",bg:"#FFE0EA",req:1},
 {id:"isco",name:"ISCO – Science Competition",icon:"🔬",bg:"#DDF5E6",req:1},
 {id:"jeo",name:"JEO – English Competition",icon:"📖",bg:"#FFF0C4",req:1},
 {id:"jismo",name:"JISMO",icon:"🧮",bg:"#DCEBFF",req:1},
 {id:"idmec",name:"Past Paper ID-MEC Preliminary Round",icon:"📝",bg:"#E8DDFF",req:1},
 {id:"iksc",name:"IKSC – Kangaroo Science",icon:"🦘",bg:"#DDF5E6"},
 {id:"cosmii",name:"COSMII",icon:"🪐",bg:"#E8DDFF"},
 {id:"iyslo",name:"IYSLO",icon:"🌱",bg:"#DDF5E6"},
 {id:"kmsi",name:"KMSI",icon:"🧪",bg:"#FFE2D6"},
 {id:"helios",name:"HELIOS",icon:"☀️",bg:"#FFF0C4",note:"File HELIOS hanya berisi kisi-kisi materi, bukan soal."},
 {id:"iobrs",name:"IOB Rising Star",icon:"⭐",bg:"#FFE0EA",note:"File ini berisi silabus dan contoh soal campuran semua jenjang; belum diekstrak."}
];
const MISSING_NOTE="Folder olimpiade ini tidak ada di arsip yang diunggah.";
const SUBJ={math:["Mathematics","Matematika","🔢","s-math"],english:["English","Bahasa Inggris","🔤","s-english"],science:["Science","Sains","🔬","s-science"]};
const LVL={tk:["TK","Kindergarten","🧸"],g1:["Kelas 1 SD","Grade 1","🎒"]};

let BANK={papers:[],questions:[]},Q={},PAPER={};
const S={view:"home",p:{},level:LS.get("level",null),subject:null,settings:LS.get("settings",{sound:true,qlang:"id",combined:true}),ov:LS.get("ov",{}),session:LS.get("session",null),history:LS.get("history",[]),gate:false,custom:[]};
const app=document.getElementById("app");

/* ---------- data ---------- */
function eff(q){const o=S.ov[q.id]||{};return Object.assign({},q,o)}
function allQ(){return BANK.questions.map(eff).concat(S.custom)}
function playable(f={}){const seen=new Map();
 for(const q of allQ()){if(q.status!=="verified")continue;if(!S.settings.combined&&q.combined)continue;
  if(f.olympiad&&q.olympiad!==f.olympiad)continue;if(f.level&&q.level!==f.level)continue;if(f.subject&&q.subject!==f.subject)continue;if(f.paper&&q.paper!==f.paper)continue;if(f.keyed&&q.keyStatus!=="verified")continue;
  const g=q.group||q.id,cur=seen.get(g);if(!cur||(q.lang===S.settings.qlang&&cur.lang!==S.settings.qlang))seen.set(g,q)}
 return [...seen.values()].sort((a,b)=>a.paper===b.paper?a.num-b.num:a.paper.localeCompare(b.paper))}
const count=f=>playable(f).length;

/* ---------- sound & speech ---------- */
let AC=null;function tone(ok){if(!S.settings.sound)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;(ok?[523,659,784]:[392,330]).forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(.0001,t+i*.12);g.gain.exponentialRampToValueAtTime(.18,t+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+.25);o.connect(g).connect(AC.destination);o.start(t+i*.12);o.stop(t+i*.12+.3)})}catch(e){}}
const FEMALE=/female|samantha|victoria|karen|moira|tessa|serena|fiona|kate|libby|sonia|hazel|susan|zira|aria|jenny|emma|amy|joanna|salli|kimberly|ivy|kendra|nicole|olivia|google bahasa indonesia|damayanti|gadis/i,MALE=/\bmale\b|daniel|alex\b|fred|george|ryan|guy|david|mark|james|thomas|oliver|arthur|ardi|rizki|aaron|gordon/i;
function speak(text,lang){try{if(!S.settings.sound||!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const L=lang==="id"?/^(id|in)/i:/^en/i;const vs=speechSynthesis.getVoices().filter(v=>L.test(v.lang)).sort((a,b)=>(FEMALE.test(b.name)&&!MALE.test(b.name))-(FEMALE.test(a.name)&&!MALE.test(a.name)));u.lang=lang==="id"?"id-ID":"en-GB";if(vs[0])u.voice=vs[0];u.pitch=vs[0]&&FEMALE.test(vs[0].name)?1.1:1.3;u.rate=.9;speechSynthesis.speak(u)}catch(e){}}
function confetti(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;const c=document.createElement("canvas");c.className="confetti";document.body.appendChild(c);const W=c.width=innerWidth,H=c.height=innerHeight,x=c.getContext("2d");const cols=["#7FB2F0","#FFD66B","#8ED8A9","#C3A8F5","#FFB3C7"];const ps=Array.from({length:90},()=>({x:W/2,y:H*.35,vx:(Math.random()-.5)*12,vy:-Math.random()*9-3,r:4+Math.random()*5,c:cols[Math.floor(Math.random()*5)],a:Math.random()*6}));const t0=performance.now();
 (function f(t){x.clearRect(0,0,W,H);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.3;p.a+=.2;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.fillStyle=p.c;x.fillRect(-p.r,-p.r/2,p.r*2,p.r);x.restore()});if(t-t0<1600)requestAnimationFrame(f);else c.remove()})(t0)}
let toastT;function toast(m){let e=$(".toast");if(!e){e=document.createElement("div");e.className="toast";e.setAttribute("role","status");document.body.appendChild(e)}e.textContent=m;clearTimeout(toastT);toastT=setTimeout(()=>e.remove(),3000)}
function modal(html,bind){const m=document.createElement("div");m.className="modal";m.innerHTML=`<div class="box" role="dialog" aria-modal="true">${html}</div>`;document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.closest("[data-close]"))m.remove()};bind&&bind(m);return m}

/* ---------- art ---------- */
const ART=`<svg viewBox="0 0 320 260" role="img" aria-label="Anak-anak belajar bersama"><ellipse cx="160" cy="238" rx="140" ry="16" fill="#E3EAF6"/><rect x="40" y="150" width="240" height="20" rx="8" fill="#C9A27A"/><rect x="60" y="170" width="12" height="60" fill="#B08560"/><rect x="248" y="170" width="12" height="60" fill="#B08560"/>
<circle cx="105" cy="78" r="34" fill="#F6C9A4"/><path d="M71 70 Q105 22 139 70 Q128 50 105 50 Q82 50 71 70Z" fill="#3B2A20"/><circle cx="94" cy="80" r="4" fill="#22304F"/><circle cx="116" cy="80" r="4" fill="#22304F"/><path d="M95 94 Q105 102 115 94" stroke="#22304F" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="86" cy="90" r="5" fill="#FFB3C7"/><circle cx="124" cy="90" r="5" fill="#FFB3C7"/><path d="M72 150 Q72 112 105 112 Q138 112 138 150Z" fill="#7FB2F0"/>
<circle cx="215" cy="80" r="32" fill="#D9A47E"/><path d="M183 78 Q186 40 215 42 Q246 40 247 78 Q240 58 215 58 Q190 58 183 78Z" fill="#22304F"/><circle cx="183" cy="86" r="8" fill="#22304F"/><circle cx="247" cy="86" r="8" fill="#22304F"/><circle cx="205" cy="82" r="4" fill="#22304F"/><circle cx="226" cy="82" r="4" fill="#22304F"/><path d="M205 96 Q215 104 225 96" stroke="#22304F" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M182 150 Q182 112 215 112 Q248 112 248 150Z" fill="#C3A8F5"/>
<g transform="translate(118 126) rotate(-6)"><rect width="84" height="30" rx="4" fill="#fff" stroke="#22304F" stroke-width="3"/><line x1="42" y1="2" x2="42" y2="28" stroke="#22304F" stroke-width="2"/><text x="14" y="21" font-size="15" font-weight="900" fill="#3F7FD6">1+2</text><text x="50" y="21" font-size="15" font-weight="900" fill="#E0577D">ABC</text></g>
<text x="40" y="40" font-size="30">⭐</text><text x="262" y="38" font-size="26">✏️</text><text x="270" y="130" font-size="26">🔬</text><text x="18" y="132" font-size="24">🔢</text></svg>`;

/* ---------- views ---------- */
function go(view,p={}){S.view=view;S.p=p;render();scrollTo(0,0)}
function header(){return `<header class="top"><div class="in"><button class="brand" data-go="home" aria-label="Olympiad Quiz Kids"><img src="icons/icon-192.png" alt=""><span>Olympiad Quiz Kids</span></button><span class="sp"></span><button class="chip" data-sound aria-pressed="${S.settings.sound}" aria-label="Suara">${S.settings.sound?"🔊":"🔇"}</button><button class="chip" data-admin aria-label="Orang tua / pengelola">🔒 Orang tua</button></div></header>`}
function render(){const v=S.view;let h="";
 if(v==="home")h=vHome();else if(v==="olys")h=vOlys();else if(v==="setup")h=vSetup();else if(v==="quiz")h=vQuiz();else if(v==="result")h=vResult();else if(v==="review")h=vReview();else if(v==="admin")h=vAdmin();
 app.innerHTML=header()+`<main class="wrap">${h}</main>`;after()}
function after(){if(S.view==="quiz")bindQuiz();if(S.view==="admin")bindAdmin();if(S.view==="setup")bindSetup()}

function levelPick(){return `<div class="levelpick" role="group" aria-label="Pilih jenjang">${Object.entries(LVL).map(([k,[a,b,e]])=>`<button class="lv" data-level="${k}" aria-pressed="${S.level===k}"><span class="e">${e}</span>${a}<span class="tiny">${b} · ${count({level:k})} soal</span></button>`).join("")}</div>`}
function vHome(){const ses=S.session&&!S.session.done?S.session:null;
 return `<section class="hero"><div><p class="hello">Let's Play<br>and <span>Learn!</span></p><p class="muted">Latihan soal olimpiade asli untuk TK dan Kelas 1 SD.</p>
 ${ses?`<div class="card" style="border-color:var(--yellow)"><b>Kuis belum selesai</b><p class="tiny">${esc(ses.title)} · soal ${ses.idx+1} dari ${ses.ids.length}</p><button class="btn b-yellow" data-resume>▶ Lanjutkan</button></div>`:""}
 <button class="btn lg b-green" data-go="olys">🚀 Start Quiz</button></div><div class="art">${ART}</div></section>
 <div class="card"><h2>1. Pilih jenjang</h2>${levelPick()}<h2 style="margin-top:1rem">2. Pilih pelajaran</h2><div class="subjects">${Object.entries(SUBJ).map(([k,[en,id,e,cls]])=>{const n=count({level:S.level||undefined,subject:k});return `<button class="subj ${cls}" data-subject="${k}" ${n?"":"disabled"}><span class="e">${e}</span>${en}<span class="n">${n} soal</span></button>`}).join("")}</div>
 <p class="tiny">Ketuk pelajaran untuk melihat olimpiade yang punya soalnya.</p></div>
 <div class="card"><h2>Semua olimpiade</h2><div class="olys">${OLYS.map(olyCard).join("")}</div></div>`}
function olyCard(o){const f={olympiad:o.id,level:S.level||undefined,subject:S.subject||undefined};const tk=count({olympiad:o.id,level:"tk",subject:S.subject||undefined}),g1=count({olympiad:o.id,level:"g1",subject:S.subject||undefined});const subs=Object.keys(SUBJ).filter(s=>count({olympiad:o.id,subject:s}));const n=count(f);const has=BANK.papers.some(p=>p.olympiad===o.id);
 return `<button class="oly ${n?"":"off"}" data-oly="${o.id}"><span class="ic" style="background:${o.bg}">${o.icon}</span><span class="t">${esc(o.name)}</span>
 <span class="pills">${subs.map(s=>`<span class="pill">${SUBJ[s][2]} ${SUBJ[s][0]}</span>`).join("")||`<span class="pill x">Belum ada pelajaran</span>`}</span>
 <span class="pills"><span class="pill ${tk?"g":"x"}">TK: ${tk||"belum tersedia"}</span><span class="pill ${g1?"g":"x"}">Kelas 1: ${g1||"belum tersedia"}</span></span>
 <span class="tiny">${n?`${n} soal terverifikasi`:"Soal belum tersedia untuk jenjang ini"}${!has&&o.req&&!o.note?" · "+MISSING_NOTE:""}</span></button>`}
function vOlys(){return `<div class="crumbs"><button data-go="home">Beranda</button>›<span>Pilih olimpiade</span></div><h1>Pilih olimpiade</h1>${levelPick()}
 ${S.subject?`<p>Pelajaran: <b>${SUBJ[S.subject][2]} ${SUBJ[S.subject][0]}</b> <button class="chip" data-subject="">semua pelajaran</button></p>`:""}<div class="olys">${OLYS.map(olyCard).join("")}</div>`}
function vSetup(){const o=OLYS.find(x=>x.id===S.p.oly);const has=BANK.papers.some(p=>p.olympiad===o.id);
 const lv=S.p.level||S.level,sb=S.p.subject||S.subject;const papers=BANK.papers.filter(p=>p.olympiad===o.id&&(!lv||p.level===lv)&&(!sb||p.subject===sb)&&count({paper:p.id}));
 const f={olympiad:o.id,level:lv,subject:sb,paper:S.p.paper||undefined,keyed:S.p.keyed};const n=lv&&sb?count(f):0;
 const last=S.history.find(h=>h.olympiad===o.id&&h.level===lv&&h.subject===sb&&h.wrong&&h.wrong.length);
 return `<div class="crumbs"><button data-go="home">Beranda</button>›<button data-go="olys">Olimpiade</button>›<span>${esc(o.name)}</span></div>
 <h1>${o.icon} ${esc(o.name)}</h1>${o.note||(!has&&o.req)?`<div class="card" style="background:var(--try)"><b>Soal belum tersedia.</b> ${esc(o.note||MISSING_NOTE)}</div>`:""}
 <div class="card"><h2>1. Jenjang</h2><div class="levelpick">${Object.entries(LVL).map(([k,[a,b,e]])=>{const c=count({olympiad:o.id,level:k});return `<button class="lv" data-slevel="${k}" aria-pressed="${lv===k}" ${c?"":"disabled"}><span class="e">${e}</span>${a}<span class="tiny">${c?c+" soal":"belum tersedia"}</span></button>`}).join("")}</div>
 <h2>2. Pelajaran</h2><div class="subjects">${Object.entries(SUBJ).map(([k,[en,id,e,cls]])=>{const c=lv?count({olympiad:o.id,level:lv,subject:k}):0;return `<button class="subj ${cls}" data-ssubj="${k}" aria-pressed="${sb===k}" ${c?"":"disabled"}><span class="e">${e}</span>${en}<span class="n">${c?c+" soal":"belum tersedia"}</span></button>`}).join("")}</div>
 ${lv&&sb?`<h2>3. Pilih paket soal</h2><select id="paper" aria-label="Paket soal"><option value="">Semua paket (${count({olympiad:o.id,level:lv,subject:sb})} soal)</option>${papers.map(p=>`<option value="${p.id}" ${S.p.paper===p.id?"selected":""}>${esc(p.title)} (${count({paper:p.id})})</option>`).join("")}</select>
 <h2 style="margin-top:1rem">4. Mode kuis</h2><div class="opt-grid">${[["all","Semua soal ("+n+")"],["10","10 soal"],["20","20 soal"]].map(([v,l])=>`<button class="choice" data-mode="${v}" aria-pressed="${(S.p.mode||"all")===v}" ${v!=="all"&&n<+v?"disabled":""}>${l}</button>`).join("")}</div>
 <div class="opt-grid" style="margin-top:.7rem">${[["orig","🔢 Urutan asli"],["rand","🔀 Urutan acak"]].map(([v,l])=>`<button class="choice" data-order="${v}" aria-pressed="${(S.p.order||"orig")===v}">${l}</button>`).join("")}<button class="choice" data-keyed aria-pressed="${!!S.p.keyed}">⭐ Hanya soal bernilai</button></div>
 <p class="tiny" style="margin-top:.7rem">Soal yang kunci jawabannya tidak ada di file sumber tetap bisa dikerjakan, tetapi tidak dinilai.</p>
 <div class="row" style="margin-top:1rem"><button class="btn lg b-green" data-start ${n?"":"disabled"}>▶ Mulai kuis</button>${last?`<button class="btn b-pink" data-retrywrong>🔁 Ulangi ${last.wrong.length} soal yang salah</button>`:""}</div>`:`<p class="muted">Pilih jenjang dan pelajaran yang tersedia.</p>`}</div>`}
function bindSetup(){const sel=$("#paper");if(sel)sel.onchange=()=>{S.p.paper=sel.value||undefined;render()}}
function startQuiz(ids,meta){S.session=Object.assign({ids,ans:{},sub:{},idx:0,done:false,started:Date.now()},meta);LS.set("session",S.session);go("quiz")}
function beginFromSetup(){const lv=S.p.level||S.level,sb=S.p.subject||S.subject;let qs=playable({olympiad:S.p.oly,level:lv,subject:sb,paper:S.p.paper,keyed:S.p.keyed});
 if((S.p.order||"orig")==="rand")qs=shuffle(qs);const m=S.p.mode||"all";if(m!=="all")qs=(S.p.order==="rand"?qs:shuffle(qs).sort((a,b)=>a.paper===b.paper?a.num-b.num:a.paper.localeCompare(b.paper))).slice(0,+m);
 if(m!=="all"&&(S.p.order||"orig")==="orig"){const pick=new Set(shuffle(playable({olympiad:S.p.oly,level:lv,subject:sb,paper:S.p.paper,keyed:S.p.keyed}).map(q=>q.id)).slice(0,+m));qs=playable({olympiad:S.p.oly,level:lv,subject:sb,paper:S.p.paper,keyed:S.p.keyed}).filter(q=>pick.has(q.id))}
 const o=OLYS.find(x=>x.id===S.p.oly);startQuiz(qs.map(q=>q.id),{olympiad:S.p.oly,level:lv,subject:sb,title:`${o.name} · ${LVL[lv][0]} · ${SUBJ[sb][0]}`,setup:Object.assign({},S.p)})}

const QX=id=>{const q=BANK.questions.find(x=>x.id===id)||S.custom.find(x=>x.id===id);return q?eff(q):null};
function vQuiz(){const s=S.session;if(!s)return vHome();const id=s.ids[s.idx],q=QX(id);const n=s.ids.length,answered=Object.keys(s.sub).length;const tk=q.level==="tk";const P=PAPER[q.paper]||{title:q.source};
 const submitted=s.sub[id],chosen=s.ans[id];let fb="";
 if(submitted){if(q.keyStatus==="verified"){const ok=chosen===q.key;fb=`<div class="fb ${ok?"good":"try"} ${ok?"pop":""}"><div class="big">${ok?"🎉 Great Job!":"💪 Let's Try Again!"}</div>${ok?"<p>Jawabanmu benar!</p>":`<p>Jawaban yang benar: <b>${esc(q.key)}</b>${optLabel(q,q.key)}</p>`}${q.explanation?`<p><b>Pembahasan dari sumber:</b> ${esc(q.explanation)}</p>`:""}<p class="tiny">Kunci: ${esc(q.keySource||"")}</p></div>`}
  else fb=`<div class="fb nk"><div class="big">👍 Jawaban disimpan</div><p>Kunci jawaban soal ini tidak ada di file sumber, jadi soal ini tidak dinilai.</p></div>`}
 return `<div class="${tk?"tk":""}"><div class="qtop"><span class="qnum">Soal ${s.idx+1} / ${n}</span><div class="bar" aria-label="Kemajuan"><i style="width:${Math.round(100*answered/n)}%"></i></div><span class="tiny">${answered} dijawab</span></div>
 <div class="dots" aria-label="Daftar soal">${s.ids.map((x,i)=>{const qq=QX(x);let c="";if(s.sub[x])c=qq.keyStatus!=="verified"?"nk":s.ans[x]===qq.key?"ok":"no";else if(s.ans[x])c="chosen";return `<button class="dot ${c} ${i===s.idx?"cur":""}" data-jump="${i}" aria-label="Soal ${i+1}${s.sub[x]?" sudah dijawab":" belum dijawab"}">${i+1}</button>`}).join("")}</div>
 <div class="qcard"><div class="qtext-hint"><span class="src">${esc(P.title)} · no. ${q.num}${q.page?" · hal. "+q.page:""}${q.keyStatus!=="verified"?" · tidak dinilai":""}</span>${q.text?`<button class="chip" data-speak aria-label="Bacakan soal">🔊 Dengar</button>`:""}</div>
 ${q.stim?`<details class="story" ${tk||q.num<=1||true?"open":""}><summary>📖 Cerita / gambar untuk soal ini</summary><img class="qimg" src="${q.stim.startsWith("data:")?q.stim:"q/"+q.stim}" alt="Cerita atau gambar pendukung" loading="lazy"></details>`:""}
 <img class="qimg zoomable" src="${q.img.startsWith("data:")?q.img:"q/"+q.img}" alt="${esc(q.text||"Soal")}" title="Ketuk untuk memperbesar">
 <div class="answers" role="group" aria-label="Pilihan jawaban">${q.options.map(o=>{let cls="";if(submitted&&q.keyStatus==="verified"){if(o.l===q.key)cls="right";else if(o.l===chosen)cls="wrong"}return `<button class="ans ${cls}" data-pick="${o.l}" aria-pressed="${chosen===o.l}" ${submitted?"disabled":""}><span class="L">${o.l}</span>${q.optText&&o.t&&!tk?`<span class="T">${esc(o.t)}</span>`:q.optText&&o.t&&tk&&o.t.length<16?`<span class="T">${esc(o.t)}</span>`:""}</button>`}).join("")}</div>
 ${submitted?"":`<div class="row" style="justify-content:center;margin-top:1rem"><button class="btn lg b-purple" data-submit ${chosen?"":"disabled"}>✅ Submit Answer</button></div>`}${fb}
 <div class="navrow"><button class="btn b-white" data-prev ${s.idx===0?"disabled":""}>⬅ Previous</button><button class="btn b-yellow" data-finish>🏁 Finish Quiz</button><button class="btn b-green" data-next ${s.idx===n-1?"disabled":""}>Next ➡</button></div></div></div>`}
const optLabel=(q,l)=>{const o=q.options.find(x=>x.l===l);return o&&q.optText&&o.t?` (${esc(o.t)})`:""};
function bindQuiz(){const s=S.session,id=s.ids[s.idx],q=QX(id);
 $$("[data-pick]").forEach(b=>b.onclick=()=>{if(s.sub[id])return;s.ans[id]=b.dataset.pick;LS.set("session",s);render()});
 const sb=$("[data-submit]");if(sb)sb.onclick=()=>{if(!s.ans[id])return;s.sub[id]=true;LS.set("session",s);const ok=q.keyStatus==="verified"&&s.ans[id]===q.key;if(q.keyStatus==="verified"){tone(ok);if(ok)confetti()}render();if(q.keyStatus==="verified"&&!ok){const c=$(".qcard");c&&c.classList.add("shake")}};
 const sp=$("[data-speak]");if(sp)sp.onclick=()=>{const t=q.text+(q.optText?". "+q.options.map(o=>o.l+". "+o.t).join(". "):"");speak(t,q.lang)};
 $("[data-prev]").onclick=()=>{s.idx--;LS.set("session",s);render()};$("[data-next]").onclick=()=>{s.idx++;LS.set("session",s);render()};
 $$("[data-jump]").forEach(b=>b.onclick=()=>{s.idx=+b.dataset.jump;LS.set("session",s);render()});
 $("[data-finish]").onclick=()=>{const left=s.ids.filter(x=>!s.sub[x]).length;if(left)modal(`<h2>Selesai sekarang?</h2><p>Masih ada <b>${left}</b> soal yang belum dijawab. Soal itu akan dihitung "tidak dijawab".</p><div class="row"><button class="btn b-white" data-close>Kembali</button><button class="btn b-yellow" data-yes>Selesai</button></div>`,m=>{$("[data-yes]",m).onclick=()=>{m.remove();finish()}});else finish()}}
function grade(s){const r={correct:0,wrong:0,unanswered:0,ungraded:0,gradable:0,wrongIds:[]};for(const id of s.ids){const q=QX(id);if(!q)continue;const g=q.keyStatus==="verified";if(g)r.gradable++;if(!s.sub[id]){r.unanswered++;continue}if(!g){r.ungraded++;continue}if(s.ans[id]===q.key)r.correct++;else{r.wrong++;r.wrongIds.push(id)}}r.pct=r.gradable?Math.round(100*r.correct/r.gradable):null;return r}
function finish(){const s=S.session;s.done=true;const r=grade(s);s.result=r;LS.set("session",s);S.history.unshift({olympiad:s.olympiad,level:s.level,subject:s.subject,title:s.title,at:Date.now(),pct:r.pct,correct:r.correct,gradable:r.gradable,wrong:r.wrongIds});S.history=S.history.slice(0,30);LS.set("history",S.history);go("result");if(r.pct!=null&&r.pct>=70)confetti()}
function vResult(){const s=S.session;if(!s)return vHome();const r=s.result||grade(s);const p=r.pct;
 const [medal,stars,msg]=p==null?["🌟","",`Kamu sudah berlatih ${s.ids.length} soal. Hebat!`]:p>=90?["🥇","⭐⭐⭐","Luar biasa! Kamu juara!"]:p>=70?["🥈","⭐⭐","Hebat sekali! Terus berlatih ya!"]:p>=40?["🥉","⭐","Bagus! Setiap latihan membuatmu makin pintar."]:["🌈","","Kamu sudah berani mencoba! Ayo berlatih lagi, pasti makin bisa."];
 return `<div class="card center"><div class="medal pop">${medal}</div><p class="tiny">${esc(s.title)}</p><p class="score">${p==null?"—":p+"%"}</p><p style="font-size:1.6rem">${stars}</p><h2>${msg}</h2>
 <div class="stats"><div class="stat" style="background:var(--good)"><b>${r.correct}</b>Benar</div><div class="stat" style="background:#FFE8EE"><b>${r.wrong}</b>Belum tepat</div><div class="stat" style="background:#EEF3FB"><b>${r.unanswered}</b>Tidak dijawab</div><div class="stat" style="background:var(--try)"><b>${r.ungraded}</b>Tidak dinilai</div></div>
 <p class="tiny">Skor = jawaban benar dari ${r.gradable} soal yang punya kunci terverifikasi.${r.ungraded?` ${r.ungraded} soal yang kamu jawab tidak dinilai karena kuncinya tidak ada di file sumber.`:""}</p>
 <div class="row" style="justify-content:center"><button class="btn b-purple" data-go="review">📋 Review Answers</button><button class="btn b-green" data-again>🔁 Try Again</button>${r.wrongIds.length?`<button class="btn b-pink" data-wrongonly>Ulangi yang salah (${r.wrongIds.length})</button>`:""}<button class="btn b-yellow" data-go="olys">🏆 Choose Another Olympiad</button><button class="btn b-white" data-go="home">🏠 Back to Home</button></div></div>`}
function vReview(){const s=S.session;if(!s)return vHome();
 return `<div class="crumbs"><button data-go="result">Hasil</button>›<span>Review</span></div><h1>Review jawaban</h1>${s.ids.map((id,i)=>{const q=QX(id);const sub=s.sub[id],a=s.ans[id];const g=q.keyStatus==="verified";const st=!sub?["na","Tidak dijawab"]:!g?["nk","Tidak dinilai"]:a===q.key?["ok","Benar"]:["no","Belum tepat"];
  return `<div class="card rv"><div>${q.stim?`<details class="story"><summary>📖 Cerita / gambar</summary><img class="qimg" src="${q.stim.startsWith("data:")?q.stim:"q/"+q.stim}" alt="" loading="lazy"></details>`:""}<img class="qimg" src="${q.img.startsWith("data:")?q.img:"q/"+q.img}" alt="${esc(q.text)}" loading="lazy"></div><div><h3>Soal ${i+1} <span class="tag ${st[0]}">${st[1]}</span></h3><p class="tiny">${esc((PAPER[q.paper]||{}).title||q.source)} · no. ${q.num}</p>
  <p>Jawabanmu: <b>${a?esc(a)+optLabel(q,a):"—"}</b></p><p>Jawaban benar: <b>${g?esc(q.key)+optLabel(q,q.key):"belum terverifikasi"}</b></p>${q.explanation?`<p><b>Pembahasan:</b> ${esc(q.explanation)}</p>`:""}${g?`<p class="tiny">Kunci: ${esc(q.keySource)}</p>`:""}</div></div>`}).join("")}
 <div class="row"><button class="btn b-green" data-again>🔁 Try Again</button><button class="btn b-white" data-go="home">🏠 Back to Home</button></div>`}

/* ---------- admin (parents / managers) ---------- */
let gateQ;function askGate(next){gateQ=[11+Math.floor(Math.random()*9),5+Math.floor(Math.random()*5)];modal(`<h2>Untuk orang tua</h2><p>Jawab untuk melanjutkan: <b>${gateQ[0]} + ${gateQ[1]} = ?</b></p><input type="number" id="gi" inputmode="numeric" style="width:100%"><div class="row" style="margin-top:.8rem"><button class="btn b-white" data-close>Batal</button><button class="btn b-blue" data-ok>Lanjut</button></div>`,m=>{const i=$("#gi",m);i.focus();const ok=()=>{if(+i.value===gateQ[0]+gateQ[1]){S.gate=true;m.remove();next()}else{i.value="";toast("Belum benar.")}};$("[data-ok]",m).onclick=ok;i.onkeydown=e=>{if(e.key==="Enter")ok()}})}
const STL={verified:["g","Terverifikasi"],needs_review:["y","Perlu verifikasi"],excluded:["x","Dikeluarkan"]};
function vAdmin(){const t=S.p.tab||"sum";return `<h1>Pengelola soal</h1><p class="muted">Halaman ini untuk orang tua atau pengelola, bukan untuk anak.</p><div class="tabs" role="tablist">${[["sum","Ringkasan"],["bank","Bank soal"],["src","Sumber & kunci"],["add","Tambah / impor"],["set","Pengaturan"]].map(([k,l])=>`<button role="tab" aria-selected="${t===k}" data-tab="${k}">${l}</button>`).join("")}</div><div id="adm"></div>`}
function bindAdmin(){$$("[data-tab]").forEach(b=>b.onclick=()=>go("admin",{tab:b.dataset.tab}));const el=$("#adm"),t=S.p.tab||"sum";const qs=allQ();
 if(t==="sum"){const rows=[];for(const o of OLYS)for(const lv of ["tk","g1"])for(const sb of Object.keys(SUBJ)){const x=qs.filter(q=>q.olympiad===o.id&&q.level===lv&&q.subject===sb);if(!x.length)continue;const c=k=>x.filter(k).length;rows.push(`<tr><td>${o.icon} ${esc(o.name)}</td><td>${LVL[lv][0]}</td><td>${SUBJ[sb][0]}</td><td>${count({olympiad:o.id,level:lv,subject:sb})}</td><td>${c(q=>q.status==="verified"&&q.keyStatus==="verified")}</td><td>${c(q=>q.status==="verified"&&q.keyStatus!=="verified")}</td><td>${c(q=>q.status==="needs_review")}</td><td>${c(q=>q.status==="excluded")}</td></tr>`)}
  el.innerHTML=`<div class="card scroll"><table><thead><tr><th>Olimpiade</th><th>Jenjang</th><th>Pelajaran</th><th>Tampil ke anak</th><th>Dinilai (kunci ✓)</th><th>Tanpa kunci</th><th>Perlu cek</th><th>Dikeluarkan</th></tr></thead><tbody>${rows.join("")}</tbody></table><p class="tiny">"Tampil ke anak" menghitung soal unik; soal IOB versi EN dan ID dihitung satu.</p></div>
  <div class="card"><h2>Olimpiade tanpa soal</h2><ul>${OLYS.filter(o=>!BANK.papers.some(p=>p.olympiad===o.id)||o.note).map(o=>`<li><b>${esc(o.name)}</b>: ${esc(o.note||MISSING_NOTE)}</li>`).join("")}</ul></div>`;return}
 if(t==="bank"){const f=S.p.f||{status:"needs_review"};const list=qs.filter(q=>(!f.oly||q.olympiad===f.oly)&&(!f.status||q.status===f.status)&&(!f.paper||q.paper===f.paper)).slice(0,f.limit||40);const total=qs.filter(q=>(!f.oly||q.olympiad===f.oly)&&(!f.status||q.status===f.status)&&(!f.paper||q.paper===f.paper)).length;
  el.innerHTML=`<div class="card"><div class="row"><select data-f="oly"><option value="">Semua olimpiade</option>${OLYS.map(o=>`<option value="${o.id}" ${f.oly===o.id?"selected":""}>${esc(o.name)}</option>`).join("")}</select><select data-f="status"><option value="">Semua status</option>${Object.entries(STL).map(([k,[c,l]])=>`<option value="${k}" ${f.status===k?"selected":""}>${l}</option>`).join("")}</select><select data-f="paper"><option value="">Semua paket</option>${BANK.papers.filter(p=>!f.oly||p.olympiad===f.oly).map(p=>`<option value="${p.id}" ${f.paper===p.id?"selected":""}>${esc(p.title)}</option>`).join("")}</select></div><p class="tiny">${total} soal cocok${total>list.length?`, menampilkan ${list.length}`:""}.</p>
  ${list.map(q=>`<div class="adm-q"><div><img src="${q.img?(q.img.startsWith("data:")?q.img:"q/"+q.img):""}" alt="" loading="lazy">${q.stim?`<p class="tiny">+ gambar cerita</p>`:""}</div><div><b>${esc((PAPER[q.paper]||{}).title||q.paper)}</b> · no. ${q.num} · hal. ${q.page||"–"} · ${q.lang.toUpperCase()}<br><span class="tiny">File: ${esc(q.source)}</span>
  <p><span class="pill ${STL[q.status][0]}">${STL[q.status][1]}</span> <span class="pill ${q.keyStatus==="verified"?"g":"x"}">Kunci: ${q.keyStatus==="verified"?esc(q.key):"belum terverifikasi"}</span> <span class="pill">Pilihan: ${q.options.map(o=>o.l).join(" ")||"–"}</span></p>
  ${q.issues&&q.issues.length?`<p class="tiny">⚠️ ${q.issues.map(esc).join(" · ")}</p>`:""}<p class="tiny">${esc((q.text||"").slice(0,180))}</p>
  <div class="row"><select data-ed="${q.id}" data-k="level">${Object.keys(LVL).map(k=>`<option value="${k}" ${q.level===k?"selected":""}>${LVL[k][0]}</option>`).join("")}</select><select data-ed="${q.id}" data-k="subject">${Object.keys(SUBJ).map(k=>`<option value="${k}" ${q.subject===k?"selected":""}>${SUBJ[k][0]}</option>`).join("")}</select>
  ${q.options.length>=2?`<button class="btn sm b-green" data-st="${q.id}:verified">✓ Setujui</button>`:""}<button class="btn sm b-yellow" data-st="${q.id}:needs_review">Perlu cek</button><button class="btn sm b-white" data-st="${q.id}:excluded">Keluarkan</button>${S.ov[q.id]?`<button class="btn sm b-white" data-reset="${q.id}">↺ Kembalikan</button>`:""}</div></div></div>`).join("")}
  ${total>list.length?`<button class="btn b-white" data-more>Tampilkan lebih banyak</button>`:""}</div>`;
  $$("[data-f]",el).forEach(s=>s.onchange=()=>{const nf=Object.assign({},f,{[s.dataset.f]:s.value||undefined,limit:40});if(s.dataset.f==="oly")nf.paper=undefined;go("admin",{tab:"bank",f:nf})});
  const more=$("[data-more]",el);if(more)more.onclick=()=>go("admin",{tab:"bank",f:Object.assign({},f,{limit:(f.limit||40)+40})});
  $$("[data-st]",el).forEach(b=>b.onclick=()=>{const [id,st]=b.dataset.st.split(":");setOv(id,{status:st});go("admin",{tab:"bank",f})});
  $$("[data-ed]",el).forEach(s=>s.onchange=()=>{setOv(s.dataset.ed,{[s.dataset.k]:s.value});toast("Disimpan.")});
  $$("[data-reset]",el).forEach(b=>b.onclick=()=>{delete S.ov[b.dataset.reset];LS.set("ov",S.ov);go("admin",{tab:"bank",f})});return}
 if(t==="src"){el.innerHTML=`<div class="card scroll"><table><thead><tr><th>Paket</th><th>Jenjang</th><th>Pelajaran</th><th>File sumber</th><th>Kunci jawaban</th><th>Catatan</th></tr></thead><tbody>${BANK.papers.map(p=>`<tr><td>${esc(p.title)}${p.combined?' <span class="pill y">Kelas 1–2</span>':""}</td><td>${LVL[p.level][0]}</td><td>${SUBJ[p.subject][0]}</td><td class="tiny">${p.files.map(esc).join("<br>")}</td><td class="tiny">${esc(p.keySource||"Tidak ada di file sumber")}</td><td class="tiny">${esc(p.note||"")}</td></tr>`).join("")}</tbody></table></div>`;return}
 if(t==="add"){el.innerHTML=`<div class="card"><h2>Tambah soal dari gambar</h2><p class="tiny">Unggah foto atau tangkapan layar satu soal asli. Jangan menulis ulang soal. Isi kunci hanya jika tertulis di file sumber.</p>
  <div class="row"><input type="file" id="cimg" accept="image/*"><select id="coly">${OLYS.map(o=>`<option value="${o.id}">${esc(o.name)}</option>`).join("")}</select><select id="clv">${Object.keys(LVL).map(k=>`<option value="${k}">${LVL[k][0]}</option>`).join("")}</select><select id="csb">${Object.keys(SUBJ).map(k=>`<option value="${k}">${SUBJ[k][0]}</option>`).join("")}</select></div>
  <div class="row" style="margin-top:.6rem"><label>Jumlah pilihan <select id="copt">${[2,3,4,5].map(n=>`<option ${n===4?"selected":""}>${n}</option>`).join("")}</select></label><label>Kunci dari sumber <select id="ckey"><option value="">tidak ada</option>${"ABCDE".split("").map(l=>`<option>${l}</option>`).join("")}</select></label><input type="text" id="csrc" placeholder="Nama file sumber & no. soal" style="flex:1;min-width:200px"></div>
  <button class="btn b-green" id="cadd" style="margin-top:.8rem">Simpan sebagai "perlu verifikasi"</button><p class="tiny">${S.custom.length} soal tambahan tersimpan di perangkat ini.</p></div>
  <div class="card"><h2>Impor / ekspor bank soal</h2><p>Bank soal utama dibuat dari file PDF dengan alat di folder <code>tools/</code> (lihat README). Hasilnya <code>bank.json</code> dan folder <code>q/</code> diunggah ke repositori GitHub.</p><div class="row"><button class="btn b-white" id="exov">⬇ Ekspor verifikasi</button><label class="btn b-white">⬆ Impor verifikasi<input type="file" id="imov" accept="application/json" hidden></label></div></div>`;
  $("#cadd").onclick=async()=>{const f=$("#cimg").files[0];if(!f){toast("Pilih gambar dulu.");return}const img=await shrink(f);const n=+$("#copt").value;const key=$("#ckey").value||null;const q={id:"c_"+Date.now(),group:"c_"+Date.now(),paper:"custom",lang:"id",olympiad:$("#coly").value,level:$("#clv").value,subject:$("#csb").value,source:$("#csrc").value||"Unggahan pengelola",num:S.custom.length+1,page:null,img,stim:null,text:"",options:"ABCDE".slice(0,n).split("").map(l=>({l,t:""})),optText:false,key,keyStatus:key?"verified":"none",keySource:key?"Dimasukkan pengelola dari file sumber":null,status:"needs_review",issues:["Ditambahkan manual: periksa lalu setujui di Bank soal"]};S.custom.push(q);await idbPut(q);toast("Tersimpan. Setujui di tab Bank soal.");go("admin",{tab:"add"})};
  $("#exov").onclick=()=>{const b=new Blob([JSON.stringify({overrides:S.ov},null,1)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="oqk-verifikasi.json";a.click()};
  $("#imov").onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());Object.assign(S.ov,d.overrides||{});LS.set("ov",S.ov);toast("Diimpor.");go("admin",{tab:"sum"})}catch(x){toast("File tidak valid.")}};return}
 if(t==="set"){el.innerHTML=`<div class="card"><h2>Pengaturan</h2><label class="row"><input type="checkbox" id="scomb" ${S.settings.combined?"checked":""}> Sertakan paket resmi kategori <b>Kelas 1–2</b> di jenjang Kelas 1</label>
  <p class="tiny">Beberapa kompetisi (FISO Category 2, IKSC Pre-Ecolier, ISCO, COSMII, JEO) memakai satu soal untuk Kelas 1 dan 2. Matikan untuk hanya menampilkan paket khusus Kelas 1.</p>
  <label class="row" style="margin-top:.6rem">Bahasa soal untuk paket dua bahasa (IOB): <select id="sql"><option value="id" ${S.settings.qlang==="id"?"selected":""}>Bahasa Indonesia</option><option value="en" ${S.settings.qlang==="en"?"selected":""}>English</option></select></label>
  <div class="row" style="margin-top:1rem"><button class="btn b-white" id="rhist">Hapus riwayat kuis</button><button class="btn b-white" id="rov">Hapus semua verifikasi manual</button></div>
  <p class="tiny" style="margin-top:1rem">Data disimpan hanya di perangkat ini. Aplikasi tidak meminta nama, alamat, atau data pribadi anak, dan tidak mengirim data ke mana pun.</p></div>`;
  $("#scomb").onchange=e=>{S.settings.combined=e.target.checked;LS.set("settings",S.settings)};$("#sql").onchange=e=>{S.settings.qlang=e.target.value;LS.set("settings",S.settings)};
  $("#rhist").onclick=()=>{S.history=[];LS.set("history",[]);toast("Riwayat dihapus.")};$("#rov").onclick=()=>{if(confirm("Hapus semua verifikasi manual?")){S.ov={};LS.set("ov",{});toast("Dihapus.")}}}}
function setOv(id,o){S.ov[id]=Object.assign({},S.ov[id],o);LS.set("ov",S.ov);const c=S.custom.find(x=>x.id===id);if(c){Object.assign(c,o);idbPut(c)}}
function shrink(file){return new Promise(r=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1000/im.width);const c=document.createElement("canvas");c.width=im.width*s;c.height=im.height*s;c.getContext("2d").drawImage(im,0,0,c.width,c.height);r(c.toDataURL("image/jpeg",.78))};im.src=URL.createObjectURL(file)})}
/* custom questions in IndexedDB */
function idb(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej();const r=indexedDB.open("oqk",1);r.onupgradeneeded=()=>r.result.createObjectStore("custom",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=rej})}
async function idbPut(q){try{const d=await idb();d.transaction("custom","readwrite").objectStore("custom").put(q)}catch(e){}}
async function idbAll(){try{const d=await idb();return await new Promise(r=>{const q=d.transaction("custom").objectStore("custom").getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>r([])})}catch(e){return []}}

/* ---------- events ---------- */
document.addEventListener("click",e=>{const z=e.target.closest(".zoomable");if(z){modal(`<img src="${z.src}" alt="" style="width:100%;height:auto"><div class="row" style="justify-content:center;margin-top:.6rem"><button class="btn b-white" data-close>Tutup</button></div>`,m=>{$(".box",m).style.maxWidth="96vw"});return}
 const g=e.target.closest("[data-go]");if(g){go(g.dataset.go);return}
 if(e.target.closest("[data-sound]")){S.settings.sound=!S.settings.sound;LS.set("settings",S.settings);render();return}
 if(e.target.closest("[data-admin]")){if(S.gate)go("admin");else askGate(()=>go("admin"));return}
 const lv=e.target.closest("[data-level]");if(lv){S.level=S.level===lv.dataset.level?null:lv.dataset.level;LS.set("level",S.level);render();return}
 const sb=e.target.closest("[data-subject]");if(sb){S.subject=sb.dataset.subject||null;go("olys");return}
 const o=e.target.closest("[data-oly]");if(o){go("setup",{oly:o.dataset.oly,level:S.level||undefined,subject:S.subject||undefined});return}
 const sl=e.target.closest("[data-slevel]");if(sl){S.p.level=sl.dataset.slevel;S.p.paper=undefined;if(S.p.subject&&!count({olympiad:S.p.oly,level:S.p.level,subject:S.p.subject}))S.p.subject=undefined;render();return}
 const ss=e.target.closest("[data-ssubj]");if(ss){S.p.subject=ss.dataset.ssubj;S.p.paper=undefined;render();return}
 const md=e.target.closest("[data-mode]");if(md){S.p.mode=md.dataset.mode;render();return}
 const od=e.target.closest("[data-order]");if(od){S.p.order=od.dataset.order;render();return}
 if(e.target.closest("[data-keyed]")){S.p.keyed=!S.p.keyed;render();return}
 if(e.target.closest("[data-start]")){beginFromSetup();return}
 if(e.target.closest("[data-retrywrong]")){const lv2=S.p.level||S.level,sb2=S.p.subject||S.subject;const h=S.history.find(x=>x.olympiad===S.p.oly&&x.level===lv2&&x.subject===sb2&&x.wrong&&x.wrong.length);if(h)startQuiz(h.wrong.filter(QX),{olympiad:h.olympiad,level:h.level,subject:h.subject,title:h.title+" · ulangi yang salah",setup:Object.assign({},S.p)});return}
 if(e.target.closest("[data-resume]")){go("quiz");return}
 if(e.target.closest("[data-again]")){const s=S.session;S.p=Object.assign({},s.setup||{});if(s.setup&&s.setup.oly){beginFromSetup()}else startQuiz(shuffle(s.ids),{olympiad:s.olympiad,level:s.level,subject:s.subject,title:s.title});return}
 if(e.target.closest("[data-wrongonly]")){const s=S.session;startQuiz((s.result||grade(s)).wrongIds,{olympiad:s.olympiad,level:s.level,subject:s.subject,title:s.title+" · ulangi yang salah",setup:s.setup});return}});
document.addEventListener("keydown",e=>{if(S.view!=="quiz"||e.target.matches("input,select,textarea"))return;const s=S.session,id=s.ids[s.idx];if(/^[a-eA-E]$/.test(e.key)&&!s.sub[id]){const q=QX(id);const l=e.key.toUpperCase();if(q.options.some(o=>o.l===l)){s.ans[id]=l;LS.set("session",s);render()}}else if(e.key==="Enter"&&s.ans[id]&&!s.sub[id]){const b=$("[data-submit]");b&&b.click()}else if(e.key==="ArrowRight"&&s.idx<s.ids.length-1){s.idx++;render()}else if(e.key==="ArrowLeft"&&s.idx>0){s.idx--;render()}});

/* ---------- boot ---------- */
(async function(){try{const r=await fetch("bank.json");BANK=await r.json()}catch(e){app.innerHTML=`<div class="wrap"><div class="card"><h2>Bank soal tidak dapat dimuat</h2><p>Buka aplikasi lewat server (misalnya GitHub Pages), bukan dengan membuka file langsung.</p></div></div>`;return}
 BANK.papers.forEach(p=>PAPER[p.id]=p);S.custom=await idbAll();
 if(S.session&&S.session.ids.some(id=>!QX(id)))S.session=null;
 render()})();
