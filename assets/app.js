"use strict";
/* ÔN TẬP YCT — engine dùng chung cho mọi cấp, mọi bài.
   Dữ liệu bài học nằm ở data/manifest.json và data/yctN/baiM.json  */

const PY_BASE={"你":"nǐ","您":"nín","好":"hǎo","老":"lǎo","师":"shī","再":"zài","见":"jiàn","吗":"ma",
"我":"wǒ","很":"hěn","一":"yī","二":"èr","三":"sān","四":"sì","五":"wǔ","六":"liù","七":"qī","八":"bā",
"九":"jiǔ","十":"shí"};
let PY=Object.assign({},PY_BASE);

const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function ruby(t){let o="";for(const ch of String(t)){o+=PY[ch]?"<ruby>"+esc(ch)+"<rt>"+PY[ch]+"</rt></ruby>":esc(ch);}return o;}
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const other=(pool,right,n)=>shuffle(pool.filter(x=>x!==right)).slice(0,n);
const $=id=>document.getElementById(id);

/* ---------- lưu trữ ---------- */
const KEY="ontap-yct";
let S={stars:0,best:{},showPY:false};
function load(){try{const r=localStorage.getItem(KEY);if(r)S=Object.assign(S,JSON.parse(r));}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
let showPY=false;
function togglePY(){showPY=!showPY;S.showPY=showPY;save();applyPY();}
function applyPY(){document.querySelectorAll(".zh").forEach(e=>e.classList.toggle("nopy",!showPY));
 document.querySelectorAll(".pybtn").forEach(b=>b.textContent=showPY?"Ẩn phiên âm":"Hiện phiên âm");}
function addStar(n){S.stars+=n;save();$("starBox").textContent="⭐ "+S.stars;}

/* ---------- âm thanh ---------- */
let zhVoice=null,lastAudio=null,AUDIO={};
function pickVoice(){const vs=(window.speechSynthesis?speechSynthesis.getVoices():[])||[];
 zhVoice=vs.find(v=>/zh[-_]CN|zh[-_]Hans|Chinese/i.test(v.lang+" "+v.name))||null;}
if(window.speechSynthesis)speechSynthesis.onvoiceschanged=pickVoice;
function speak(text,rate){ if(!text)return; const r=rate||0.85;
 if(zhVoice&&window.speechSynthesis){speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang="zh-CN";u.rate=r;u.voice=zhVoice;
  u.onerror=()=>clip(text,r);speechSynthesis.speak(u);return;}
 clip(text,r);}
function clip(t,r){const d=AUDIO[t]||AUDIO[String(t).replace(/[！？。，]/g,"")];if(!d)return;
 if(lastAudio)lastAudio.pause();
 const a=new Audio("data:audio/mpeg;base64,"+d);a.playbackRate=Math.max(.5,Math.min(1.4,r/0.85));
 lastAudio=a;a.play().catch(()=>{});}

/* ---------- sinh hoạt động từ dữ liệu bài ---------- */
function buildActs(L){
 const acts={};
 const words=(L.words||[]).concat(L.phrases||[]);
 if(words.length){
  acts.flash={t:"Thẻ từ vựng",ico:"🃏",sub:words.length+" thẻ, lật xem nghĩa",
   make:()=>words.map(w=>({type:"flash",h:w.h,p:w.p,v:w.v,say:w.h}))};
  acts.meaning={t:"Chữ Hán → nghĩa",ico:"🀄",sub:"Chọn nghĩa đúng",
   make:()=>shuffle(words).map(w=>({type:"choice",show:w.h,big:true,ask:"Từ này nghĩa là gì?",say:w.h,
     right:w.v,opts:shuffle([w.v].concat(other(words.map(x=>x.v),w.v,3)))}))};
  acts.hanzi={t:"Nghĩa → chữ Hán",ico:"💡",sub:"Chọn chữ đúng",
   make:()=>shuffle(words).map(w=>({type:"choice",show:"“"+w.v+"”",ask:"Từ này viết bằng chữ Hán nào?",say:w.h,
     right:w.h,zhOpts:true,opts:shuffle([w.h].concat(other(words.map(x=>x.h),w.h,3)))}))};
 }
 const all=words.concat((L.sentences||[]).map(s=>({h:s.h,p:s.p,v:s.v})));
 if(all.length>3){
  acts.listen={t:"Nghe và chọn",ico:"🎧",sub:"Nghe rồi chọn chữ",
   make:()=>shuffle(all).slice(0,10).map(w=>({type:"choice",show:"🎧",ask:"Nghe rồi chọn chữ con vừa nghe.",
     say:w.h,auto:true,right:w.h,zhOpts:true,opts:shuffle([w.h].concat(other(all.map(x=>x.h),w.h,3)))}))};
 }
 if((L.talk||[]).length){
  acts.talk={t:"Con sẽ nói gì?",ico:"🗣️",sub:L.talk.length+" tình huống",
   make:()=>L.talk.map(t=>({type:"choice",show:t.show,big2:!!t.big2,ask:t.ask,say:t.say||t.right,
     right:t.right,also:t.also||[],note:t.note||"",zhOpts:true,opts:shuffle(t.opts)}))};
 }
 if((L.numbers||[]).length){
  acts.num={t:"Số đếm",ico:"🔢",sub:L.numbers.length+" số",
   make:()=>shuffle(L.numbers).map(([h,p,n])=>({type:"choice",show:h,big:true,ask:"Đây là số mấy?",say:h,
     right:String(n),opts:shuffle([String(n)].concat(other(L.numbers.map(x=>String(x[2])),String(n),3)))}))};
 }
 if((L.sentences||[]).length){
  acts.order={t:"Xếp câu",ico:"🧩",sub:L.sentences.length+" câu",
   make:()=>shuffle(L.sentences).map(s=>({type:"order",ask:"Xếp các thẻ thành câu: “"+s.v+"”",
     tok:s.tok||Array.from(s.h),right:s.h,say:s.h}))};
 }
 if((L.song||[]).length){
  acts.song={t:"Đọc / hát theo",ico:"🎵",sub:L.song.length+" câu",
   make:()=>L.song.map((l,i)=>({type:"read",h:l,say:String(l).replace(/[，。？！]/g,""),ask:"Đọc theo câu "+(i+1)}))};
 }
 return acts;
}
const PRAISE=["Giỏi quá! 真棒！","Chính xác! 对了！","Tuyệt vời! 太好了！","Con nhớ bài rồi đó!"];
const CHEER=["Chưa đúng, thử lại nhé!","Gần đúng rồi, con xem lại nào!","Không sao, mình nhớ lại nhé!"];

/* ---------- trạng thái chạy ---------- */
let MAN=null, LESSON=null, ACTS={}, actKey=null, list=[], i=0, right=0, wrong=0, answered=false, orderTok=[];
let curLevel=null;

/* ---------- định tuyến ---------- */
function go(hash){location.hash=hash;}
function route(){
 const h=(location.hash||"#/").replace(/^#/,"");
 const parts=h.split("/").filter(Boolean);           // ["yct1","bai1"]
 if(!parts.length)return viewHome();
 if(parts.length===1)return viewLevel(parts[0]);
 return viewLesson(parts[0],parts[1]);
}
window.addEventListener("hashchange",route);

function shell(html){$("app").innerHTML=html;applyPY();}
function crumb(items){return '<div class="crumb">'+items.map(([t,h])=>h?'<a onclick="go(\''+h+'\')">'+esc(t)+'</a>':esc(t)).join(" › ")+'</div>';}

/* ---------- màn hình ---------- */
function viewHome(){
 curLevel=null;
 let h='<div class="card" style="display:flex;gap:12px;align-items:center">'+
  '<div class="say">Chào con! Con chọn cấp YCT đang học, rồi chọn bài để ôn nhé.</div></div>'+
  '<div class="card"><h2>Chọn cấp</h2><p class="lead">YCT 标准教程 1 – 6</p><div class="lv">';
 MAN.levels.forEach(lv=>{
   const n=(lv.lessons||[]).length;
   h+='<button onclick="go(\'/'+lv.id+'\')"><span class="n">YCT '+lv.level+'</span>'+
      '<span class="'+(n?'sub':'soon')+'">'+(n? n+' bài đã có':'chưa có bài nào')+'</span></button>';
 });
 h+='</div></div>'+
  '<div class="card"><div class="row"><button class="btn-ghost pybtn" onclick="togglePY()"></button>'+
  '<button class="btn-ghost" onclick="resetAll()">Xoá sao, làm lại từ đầu</button></div></div>';
 shell(h);
}
function viewLevel(id){
 const lv=MAN.levels.find(x=>x.id===id);
 if(!lv)return viewHome();
 curLevel=lv;
 let h=crumb([["Trang chủ","/"],["YCT "+lv.level,null]])+
  '<div class="card"><h2>YCT '+lv.level+'</h2><p class="lead">'+esc(lv.note||"Chọn bài con muốn ôn")+'</p>';
 if(!(lv.lessons||[]).length){h+='<div class="warn">Cấp này chưa có bài nào. Cô sẽ thêm bài sau nhé.</div>';}
 else{h+='<div class="grid">';
  lv.lessons.forEach(ls=>{const best=S.best[lv.id+"/"+ls.id];
   h+='<button onclick="go(\'/'+lv.id+'/'+ls.id+'\')"><span class="ico">📘</span><span>Bài '+esc(ls.no)+
     ': <span class="zh">'+ruby(ls.title)+'</span><span class="sub">'+esc(ls.sub||"")+
     (best?' · <span class="done">đã ôn</span>':'')+'</span></span></button>';});
  h+='</div>';}
 h+='</div>';
 shell(h);
}
async function viewLesson(lvId,lsId){
 const lv=MAN.levels.find(x=>x.id===lvId);
 const ls=lv&&(lv.lessons||[]).find(x=>x.id===lsId);
 if(!ls)return viewLevel(lvId);
 curLevel=lv;
 shell('<div class="card">Đang tải bài…</div>');
 try{
  const r=await fetch("data/"+lvId+"/"+lsId+".json",{cache:"no-cache"});
  if(!r.ok)throw new Error(r.status);
  LESSON=await r.json();
 }catch(e){
  shell(crumb([["Trang chủ","/"],["YCT "+lv.level,"/"+lvId]])+
   '<div class="card"><h2>Chưa mở được bài này</h2>'+
   '<div class="warn">Nếu con đang mở file trực tiếp từ máy, trình duyệt sẽ chặn việc đọc dữ liệu bài học. '+
   'Hãy mở trang qua đường link web (GitHub Pages) hoặc nhờ cô gửi lại link.</div></div>');
  return;
 }
 PY=Object.assign({},PY_BASE,LESSON.pinyin||{});
 AUDIO=LESSON.audio||{};
 ACTS=buildActs(LESSON);
 let h=crumb([["Trang chủ","/"],["YCT "+lv.level,"/"+lvId],["Bài "+ls.no,null]])+
  '<div class="card"><h2>Bài '+esc(ls.no)+': <span class="zh">'+ruby(LESSON.title||ls.title)+'</span></h2>'+
  '<p class="lead">'+esc(LESSON.sub||ls.sub||"")+'</p><div class="grid" id="acts"></div>'+
  '<div class="row"><button class="btn-ghost pybtn" onclick="togglePY()"></button>'+
  '<button class="btn-ghost" onclick="go(\'/'+lvId+'\')">Chọn bài khác</button></div></div>';
 shell(h);
 const g=$("acts");
 Object.keys(ACTS).forEach(k=>{const a=ACTS[k],b=document.createElement("button");
  const best=S.best[lvId+"/"+lsId+"/"+k];
  b.innerHTML='<span class="ico">'+a.ico+'</span><span>'+a.t+'<span class="sub">'+a.sub+
    (best?' · <span class="done">'+best+'</span>':'')+'</span></span>';
  b.onclick=()=>openAct(k);g.appendChild(b);});
 applyPY();
}

/* ---------- vòng luyện tập ---------- */
function openAct(k){actKey=k;list=ACTS[k].make();i=0;right=0;wrong=0;renderQ();}
function backToLesson(){route();}
function renderQ(){
 const q=list[i];answered=false;orderTok=[];
 let ctrl="";
 let body="";
 if(q.type==="flash"){
   body='<div class="flash" id="fl" onclick="this.classList.toggle(\'flip\')"><div class="flash-in">'+
    '<div class="face"><div class="big zh">'+ruby(q.h)+'</div><div style="color:var(--muted);font-size:15px">Bấm để xem nghĩa</div></div>'+
    '<div class="face back"><div class="big2 zh">'+ruby(q.h)+'</div>'+
    '<div style="font-size:24px;color:#1d7a46;font-weight:700">'+esc(q.p)+'</div>'+
    '<div style="font-size:20px">'+esc(q.v)+'</div></div></div></div>';
   ctrl='<button class="btn-main" onclick="speak(list[i].say)">🔊 Nghe</button>'+
        '<button class="btn-ghost" onclick="speak(list[i].say,0.6)">🐢 Chậm</button>'+
        '<button class="btn-pink" onclick="nextQ(1)">Con đọc được rồi ▶</button>';
 }else if(q.type==="read"){
   body='<div class="big2 zh">'+ruby(q.h)+'</div><div class="ask">'+esc(q.ask)+'</div>';
   ctrl='<button class="btn-main" onclick="speak(list[i].say)">🔊 Nghe</button>'+
        '<button class="btn-ghost" onclick="speak(list[i].say,0.6)">🐢 Chậm</button>'+
        '<button class="btn-pink" onclick="nextQ(1)">Con đọc xong ▶</button>';
 }else if(q.type==="order"){
   body='<div class="ask">'+esc(q.ask)+'</div><div class="slot zh" id="slot"></div><div id="bank" class="zh"></div>';
   ctrl='<button class="btn-ghost" onclick="clearSlot()">Xoá hết</button>'+
        '<button class="btn-main" onclick="checkOrder()">Kiểm tra</button>';
 }else{
   body=(q.big?'<div class="big zh">'+ruby(q.show)+'</div>':
         q.big2?'<div class="big2 zh">'+ruby(q.show)+'</div>':
         '<div class="big2">'+esc(q.show)+'</div>')+
        '<div class="ask">'+esc(q.ask)+'</div><div class="opts" id="opts"></div>';
   ctrl='<button class="btn-main" onclick="speak(list[i].say)">🔊 Nghe lại</button>';
 }
 shell('<div class="card">'+
   '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
   '<h2 style="margin:0">'+esc(ACTS[actKey].t)+'</h2><span class="pill">Câu '+(i+1)+"/"+list.length+'</span>'+
   '<div style="margin-left:auto;display:flex;gap:8px">'+
   '<button class="btn-ghost pybtn" onclick="togglePY()"></button>'+
   '<button class="btn-ghost" onclick="backToLesson()">Thoát</button></div></div>'+
   '<div class="bar"><i style="width:'+(i/list.length*100)+'%"></i></div>'+
   '<div class="stage">'+body+'</div><div class="fb" id="fb"></div>'+
   '<div class="row" id="ctrl">'+ctrl+'</div></div>');
 if(q.type==="order"){
   const bank=$("bank");
   shuffle(q.tok.map((t,k)=>({t:t,k:k}))).forEach(o=>{const s=document.createElement("span");
     s.className="tok";s.innerHTML=ruby(o.t);
     s.onclick=()=>{if(answered)return;s.classList.add("used");orderTok.push(o.t);drawSlot();};bank.appendChild(s);});
   drawSlot();
 }
 if(q.type==="choice"){
   const o=$("opts");
   q.opts.forEach(v=>{const b=document.createElement("button");b.dataset.v=v;
    if(q.zhOpts){b.className="zh";b.innerHTML=ruby(v);}else b.textContent=v;
    b.onclick=()=>answer(b,v);o.appendChild(b);});
   if(q.auto)setTimeout(()=>speak(q.say),350);
 }
 applyPY();
}
function drawSlot(){const s=$("slot");if(s){s.innerHTML=orderTok.map(t=>'<span class="tok">'+ruby(t)+'</span>').join("");applyPY();}}
function clearSlot(){if(answered)return;orderTok=[];drawSlot();
 document.querySelectorAll("#bank .tok").forEach(e=>e.classList.remove("used"));}
function checkOrder(){
 if(answered)return;const q=list[i];
 if(orderTok.join("")===q.right){answered=true;right++;addStar(1);
  feedback(true,"⭐ "+PRAISE[Math.floor(Math.random()*PRAISE.length)]);speak(q.say);
  $("ctrl").innerHTML='<button class="btn-pink" onclick="nextQ(0)">Câu tiếp theo ▶</button>';}
 else{wrong++;feedback(false,CHEER[Math.floor(Math.random()*CHEER.length)]);setTimeout(clearSlot,700);}
}
function answer(btn,v){
 if(answered)return;answered=true;const q=list[i];
 const good=[q.right].concat(q.also||[]);
 document.querySelectorAll("#opts button").forEach(b=>{b.disabled=true;
   if(good.indexOf(b.dataset.v)>=0)b.classList.add("ok");});
 if(good.indexOf(v)>=0){right++;addStar(1);
   feedback(true,"⭐ "+PRAISE[Math.floor(Math.random()*PRAISE.length)]+(q.note?" "+q.note:""));}
 else{wrong++;btn.classList.add("bad");
   feedback(false,"Đáp án đúng: "+good.join(" hoặc ")+(q.note?" — "+q.note:""));}
 speak(q.say);
 $("ctrl").innerHTML='<button class="btn-ghost" onclick="speak(list[i].say)">🔊 Nghe lại</button>'+
   '<button class="btn-pink" onclick="nextQ(0)">Câu tiếp theo ▶</button>';
}
function feedback(ok,msg){const f=$("fb");f.className="fb "+(ok?"ok":"bad");f.textContent=(ok?"✅ ":"💪 ")+msg;}
function nextQ(star){if(star)addStar(1);i++;if(i>=list.length)finish();else renderQ();}
function finish(){
 const total=right+wrong, sc=total?Math.round(right/total*100):100;
 const key=location.hash.replace(/^#\//,"");
 S.best[key+"/"+actKey]= total? right+"/"+total : "xong";
 S.best[key]=true;save();
 shell('<div class="card" style="text-align:center">'+
  '<div style="font-size:62px">'+(sc>=80?"🌟":"💪")+'</div>'+
  '<h2>'+(total?(sc>=80?"Con làm rất tốt!":"Con cố thêm chút nữa nhé!"):"Con ôn xong rồi!")+'</h2>'+
  '<div class="sum">'+(total?
    '<div style="background:var(--green-l)"><b>'+right+'</b>Câu đúng</div>'+
    '<div style="background:#FFE4DC"><b>'+wrong+'</b>Câu chưa đúng</div>':'')+
   '<div style="background:var(--cream)"><b>⭐'+S.stars+'</b>Tổng số sao</div></div>'+
  '<div class="row"><button class="btn-main" onclick="openAct(\''+actKey+'\')">Làm lại</button>'+
  '<button class="btn-pink" onclick="backToLesson()">Hoạt động khác</button></div></div>');
}
function resetAll(){if(!confirm("Xoá hết sao và kết quả để làm lại từ đầu?"))return;
 S={stars:0,best:{},showPY:showPY};save();$("starBox").textContent="⭐ 0";route();}

/* ---------- khởi động ---------- */
(async function(){
 load();showPY=!!S.showPY;pickVoice();
 $("starBox").textContent="⭐ "+S.stars;
 try{
  const r=await fetch("data/manifest.json",{cache:"no-cache"});
  MAN=await r.json();
 }catch(e){
  $("app").innerHTML='<div class="card"><h2>Chưa đọc được danh sách bài</h2>'+
   '<div class="warn">Trang cần được mở qua đường link web (GitHub Pages) hoặc một máy chủ cục bộ. '+
   'Mở file trực tiếp bằng cách bấm đúp vào file sẽ bị trình duyệt chặn đọc dữ liệu.</div></div>';
  return;
 }
 route();
})();
