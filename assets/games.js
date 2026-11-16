"use strict";
/* ÔN TẬP YCT — trò chơi cho từng bài.
   Dùng chung bộ máy của app.js (LESSON, speak, addStar, shell…).
   Dữ liệu lấy ở mục "games" trong file bài:
     games.pool  : các từ đem ra chơi  [{h,p,v,e}]   (e = hình minh hoạ)
     games.cloze : câu điền từ         [{q,a,o,v,hint,say}]   (q có một chỗ trống ＿＿)
   Bài chưa có mục "games" thì trò chơi tự lấy từ words + phrases. */
(function(){
const BLANK="＿＿";
let G=null;                 // trò đang chạy; đổi G là mọi vòng lặp, hẹn giờ cũ tự dừng
const lessonKey=()=>location.hash.replace(/^#\//,"");
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const later=(g,fn,ms)=>setTimeout(()=>{if(G===g)fn();},ms);

function pool(L){
 L=L||LESSON;const g=(L&&L.games)||{};
 if(g.pool&&g.pool.length)return g.pool;
 return ((L&&L.words)||[]).concat((L&&L.phrases)||[]).map(w=>({h:w.h,p:w.p,v:w.v,e:""}));
}
function cloze(){return (LESSON.games&&LESSON.games.cloze)||[];}
function canSay(t){return !!((zhVoice&&window.speechSynthesis)||AUDIO[t]);}
function label(w){return (w.e?w.e+" ":"")+w.v;}

/* ---------- tiếng động nhỏ ---------- */
let AC=null;
function sfx(ok){
 try{
  AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const t=AC.currentTime;
  (ok?[660,880]:[220]).forEach((f,k)=>{
   const o=AC.createOscillator(),v=AC.createGain();
   o.type=ok?"sine":"triangle";o.frequency.value=f;
   v.gain.setValueAtTime(.0001,t+k*.1);v.gain.exponentialRampToValueAtTime(.09,t+k*.1+.02);
   v.gain.exponentialRampToValueAtTime(.0001,t+k*.1+.22);
   o.connect(v);v.connect(AC.destination);o.start(t+k*.1);o.stop(t+k*.1+.25);});
 }catch(e){}
}

/* ---------- hình (assets/img — gói hình CC0 của Kenney, xem NGUON-HINH.txt) ---------- */
const IMG="assets/img/";
const pic=(name,cls)=>'<img class="'+(cls||"")+'" src="'+IMG+name+'" alt="" draggable="false">';
const FISHES=[["fish_orange.svg",1.72],["fish_pink.svg",1.48],["fish_green.svg",1.34],["fish_red.svg",1.26],["fish_blue.svg",1.68]];  // [file, rộng/cao]
// gấu trúc ngồi câu: thân vẽ thêm, đầu là hình panda.png
const ANGLER='<div class="angler"><svg viewBox="0 0 96 104" aria-hidden="true">'+
 '<ellipse cx="30" cy="97" rx="12" ry="7" fill="#4A4A4A"/><ellipse cx="60" cy="97" rx="12" ry="7" fill="#4A4A4A"/>'+
 '<ellipse cx="45" cy="82" rx="27" ry="20" fill="#fff" stroke="#8C8C8C" stroke-width="2.5"/>'+
 '<path d="M22 70 Q14 80 24 88" stroke="#4A4A4A" stroke-width="11" fill="none" stroke-linecap="round"/>'+
 '<path d="M62 70 Q74 72 78 82" stroke="#4A4A4A" stroke-width="11" fill="none" stroke-linecap="round"/></svg>'+
 pic("panda.png","angler-head")+'</div>';
// đáy hồ: cát, đá, rong, san hô, bong bóng
const POND_BG='<div class="deco">'+
 [["bg_seaweed_a.svg",7,96,"far"],["bg_seaweed_g.svg",38,110,"far"],["bg_seaweed_a.svg",70,84,"far"],["bg_seaweed_g.svg",90,100,"far"],
  ["rock_a.svg",20,40,""],["rock_b.svg",78,36,""],
  ["seaweed_green_a.svg",3,92,"sway"],["seaweed_pink_c.svg",14,56,"sway"],["coral_orange.svg",31,40,""],
  ["seaweed_green_c.svg",47,62,"sway"],["seaweed_pink_a.svg",61,88,"sway"],["coral_orange.svg",72,34,""],
  ["seaweed_green_a.svg",88,78,"sway"]].map(([f,x,h,c],k)=>
   '<img class="weed '+c+'" src="'+IMG+f+'" alt="" style="left:'+x+'%;height:'+h+'px;animation-delay:-'+(k*.7)+'s">').join("")+
 '<svg class="sand" viewBox="0 0 600 40" preserveAspectRatio="none" aria-hidden="true">'+
 '<path d="M0 14 Q70 0 150 10 T300 9 T450 13 T600 6 V40 H0Z" fill="#F6EDCB"/>'+
 '<path d="M0 19 Q70 5 150 15 T300 14 T450 18 T600 11 V40 H0Z" fill="#EBDDAE"/></svg>'+
 [12,27,44,58,73,91].map((x,k)=>'<i class="bub" style="left:'+x+'%;width:'+(8+k%3*5)+'px;height:'+(8+k%3*5)+
   'px;animation-duration:'+(6+k%4*1.7)+'s;animation-delay:-'+(k*1.9)+'s"></i>').join("")+'</div>';
const GOAL='<svg class="goal" viewBox="0 0 40 52" aria-hidden="true">'+
 [[9,6],[20,0],[31,9]].map(([x,y])=>'<rect x="'+(x-4)+'" y="'+y+'" width="8" height="'+(52-y)+'" rx="3.5" fill="#63C98D"/>'+
   [16,32].map(d=>'<rect x="'+(x-5)+'" y="'+(y+d)+'" width="10" height="3" rx="1.5" fill="#3FA56B"/>').join("")).join("")+
 '<path d="M24 10 q12 -9 15 2 q-9 2 -15 -2z M16 18 q-12 -8 -15 3 q9 1 15 -3z" fill="#8FDCA9"/></svg>';
const BUSH='<svg viewBox="0 0 220 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
 [28,54,170,196].map((x,k)=>'<rect x="'+(x-6)+'" y="'+(k%2?6:-6)+'" width="12" height="160" rx="5" fill="#63C98D"/>'+
   [34,74,114].map(y=>'<rect x="'+(x-7)+'" y="'+(y+(k%2?8:0))+'" width="14" height="4" rx="2" fill="#3FA56B"/>').join("")+
   '<path d="M'+(x+6)+' '+(40+k*9)+' q22 -14 30 2 q-18 2 -30 -2z" fill="#8FDCA9"/>').join("")+
 '<image href="'+IMG+'panda.png" x="66" y="38" width="88" height="66"/>'+
 '<path d="M40 150 q10 -62 70 -58 q62 -4 70 58z" fill="#63C98D"/>'+
 '<path d="M62 150 q4 -40 28 -46 M110 150 v-52 M158 150 q-4 -40 -28 -46" stroke="#3FA56B" stroke-width="4" fill="none" stroke-linecap="round"/>'+
 '<text x="166" y="50" font-size="40" font-weight="800" fill="#F79B5B" font-family="system-ui,sans-serif">?</text></svg>';

/* ---------- khung chung ---------- */
function head(title,tools){
 return '<div class="g-head"><h2>'+title+'</h2><span class="pill" id="gPill"></span>'+
  '<div class="g-tools">'+(tools||"")+'<button class="btn-ghost" onclick="Games.exit()">Thoát</button></div></div>';}
function modeBtn(txt,on,call){return '<button class="btn-ghost'+(on?" on":"")+'" onclick="'+call+'">'+txt+'</button>';}
function done(g,emoji,title,stat,extra){
 const key=lessonKey();S.best[key+"/g-"+g.key]=stat;S.best[key]=true;save();G=null;
 shell('<div class="card" style="text-align:center"><div style="font-size:62px">'+emoji+'</div><h2>'+title+'</h2>'+
  '<div class="sum">'+(extra||"")+
  '<div style="background:var(--green-l)"><b>'+g.right+'</b>Câu đúng</div>'+
  '<div style="background:#FFE4DC"><b>'+g.wrong+'</b>Câu chưa đúng</div>'+
  '<div style="background:var(--cream)"><b>⭐'+S.stars+'</b>Tổng số sao</div></div>'+
  '<div class="row"><button class="btn-main" onclick="Games.open(\''+g.key+'\','+JSON.stringify(g.mode||null).replace(/"/g,"&quot;")+')">Chơi lại</button>'+
  '<button class="btn-pink" onclick="Games.exit()">Trò chơi khác</button></div></div>');
}
function wordLine(w){return w.h+" · "+w.p+" · "+w.v;}

/* =====================================================================
   1. GẤU TRÚC CÂU CÁ — nghe (hoặc xem nghĩa) rồi bấm đúng con cá mang chữ
   ===================================================================== */
const WATER=100;
function fish(mode){
 const P=pool(),R=Math.min(10,P.length);
 const g=G={key:"fish",mode:mode==="mean"?"mean":"listen",items:shuffle(P).slice(0,R),r:0,right:0,wrong:0,fish:[],busy:false,t:0};
 shell('<div class="card game">'+head("🎣 Gấu trúc câu cá",
   modeBtn("🎧 Nghe",g.mode==="listen","Games.open('fish','listen')")+
   modeBtn("💬 Nghĩa",g.mode==="mean","Games.open('fish','mean')"))+
  '<p class="g-lead">'+(g.mode==="listen"?"Nghe từ, rồi bấm đúng con cá đang bơi để câu lên.":
     "Xem nghĩa, rồi bấm đúng con cá mang chữ đó để câu lên.")+'</p>'+
  '<div class="g-prompt"><div class="what" id="gWhat"></div><div id="gBtns" class="g-pbtn"></div><div class="dots" id="gDots"></div></div>'+
  '<div class="pond" id="pond">'+POND_BG+'<div class="bank"></div>'+ANGLER+
   '<svg class="pond-svg" aria-hidden="true"><line class="rod" id="rod"/><line class="fline" id="fline"/><circle id="bob" r="5"/></svg></div>'+
  '<div class="fb" id="fb"></div></div>');
 fishRound(g);
 requestAnimationFrame(ts=>fishLoop(g,ts));
}
function fishRound(g){
 const pond=$("pond");if(!pond)return;
 pond.querySelectorAll(".fish").forEach(e=>e.remove());
 g.busy=false;g.miss=0;
 const it=g.cur=g.items[g.r],P=pool();
 const opts=shuffle([it].concat(other(P,it,3)));
 const W=pond.clientWidth,H=pond.clientHeight,sm=W<430;
 pond.classList.toggle("sm",sm);
 g.tip=sm?{x:108,y:14}:{x:146,y:16};
 const rod=$("rod");rod.setAttribute("x1",sm?66:88);rod.setAttribute("y1",sm?68:90);
 rod.setAttribute("x2",g.tip.x);rod.setAttribute("y2",g.tip.y);
 $("fline").setAttribute("x1",g.tip.x);$("fline").setAttribute("y1",g.tip.y);
 g.fh=sm?46:58;
 const kinds=shuffle(FISHES);
 const top=WATER+36,gap=opts.length>1?(H-top-g.fh-12)/(opts.length-1):0;
 const lanes=shuffle(opts.map((_,k)=>k));
 g.fish=opts.map((o,k)=>{
  const el=document.createElement("button");el.className="fish";el.type="button";
  const kind=kinds[k%kinds.length];el.style.height=g.fh+"px";
  el.setAttribute("aria-label",o.h);
  // con cá kéo theo tấm biển chữ; đầu cá ở phía bơi tới
  el.innerHTML='<span class="flabel zh" style="font-size:'+(sm?21:27)+'px">'+esc(o.h)+'</span>'+
    '<img class="fimg" src="'+IMG+kind[0]+'" alt="" draggable="false" width="'+Math.round(g.fh*kind[1])+'" height="'+g.fh+'">';
  pond.appendChild(el);const w=el.offsetWidth;
  const f={el:el,it:o,w:w,x:rnd(6,Math.max(8,W-w-6)),y:top+gap*lanes[k],dir:Math.random()<.5?-1:1,sp:rnd(24,44),ph:rnd(0,6.28),state:"swim"};
  el.onclick=()=>fishClick(g,f);return f;});
 $("gPill").textContent="Lượt "+(g.r+1)+"/"+g.items.length;
 $("gDots").innerHTML=g.items.map((_,k)=>'<i class="'+(k<g.r?"done":k===g.r?"cur":"")+'"></i>').join("");
 const what=$("gWhat"),btns=$("gBtns");btns.innerHTML="";
 if(g.mode==="listen"){
  what.textContent=canSay(it.h)?"🎧 Con nghe rồi câu đúng con cá":"Câu con cá mang chữ: "+label(it);
  [["🔊 Nghe lại",.85,"btn-main"],["🐢 Chậm",.6,"btn-ghost"]].forEach(([t,r,c])=>{
   const b=document.createElement("button");b.className=c;b.textContent=t;b.onclick=()=>speak(g.cur.h,r);btns.appendChild(b);});
  later(g,()=>speak(it.h),450);
 }else what.textContent=label(it);
 const fb=$("fb");fb.className="fb";fb.textContent="";
}
function fishLoop(g,ts){
 const pond=$("pond");if(G!==g||!pond)return;
 const dt=Math.min(.05,(ts-(g.last||ts))/1000);g.last=ts;g.t+=dt;
 const W=pond.clientWidth;let hook=null;
 g.fish.forEach(f=>{
  if(f.state==="swim"){
   f.x+=f.dir*f.sp*dt;
   if(f.x<4){f.x=4;f.dir=1;}
   if(f.x>W-f.w-4){f.x=W-f.w-4;f.dir=-1;}
  }else if(f.state==="pull"){
   f.k=Math.min(1,f.k+dt/.9);const e=1-Math.pow(1-f.k,3);
   f.x=f.x0+(f.tx-f.x0)*e;f.y=f.y0+(f.ty-f.y0)*e;
   if(f.k>=1){f.state="held";fishCaught(g,f);}
  }
  const bob=f.state==="swim"?Math.sin(g.t*2+f.ph)*4:0;
  f.el.style.left=f.x+"px";f.el.style.top=(f.y+bob)+"px";
  f.el.classList.toggle("left",f.dir<0);
  if(f.state!=="swim")hook={x:f.x+(f.dir<0?8:f.w-8),y:f.y+g.fh/2};
 });
 const ln=$("fline"),b=$("bob");
 const ex=hook?hook.x:g.tip.x,ey=hook?hook.y:WATER+20+Math.sin(g.t*2.4)*3;
 ln.setAttribute("x2",ex);ln.setAttribute("y2",ey);
 b.setAttribute("cx",ex);b.setAttribute("cy",ey);b.style.display=hook?"none":"";
 requestAnimationFrame(t=>fishLoop(g,t));
}
function fishClick(g,f){
 if(g.busy||f.dead||f.state!=="swim")return;
 if(f.it===g.cur){
  g.busy=true;sfx(true);
  f.state="pull";f.k=0;f.x0=f.x;f.y0=f.y;f.dir=-1;       // quay đầu về phía cần câu
  f.tx=g.tip.x-8;f.ty=WATER-18-g.fh/2;
  f.el.classList.add("got");
 }else{
  f.dead=true;f.el.classList.add("no");f.el.disabled=true;sfx(false);
  if(++g.miss===1)g.wrong++;
  feedback(false,"Chưa đúng, con "+(g.mode==="listen"?"nghe lại":"xem lại")+" nhé!");
  if(g.mode==="listen")later(g,()=>speak(g.cur.h),500);
 }
}
function fishCaught(g,f){
 if(!g.miss){g.right++;addStar(1);}
 feedback(true,(g.miss?"":"⭐ ")+wordLine(g.cur));
 speak(g.cur.h);
 later(g,()=>{g.r++;
  if(g.r>=g.items.length)done(g,g.right>=g.items.length*.8?"🌟":"💪",
    g.right>=g.items.length*.8?"Con câu cá giỏi quá!":"Con câu thêm lần nữa nhé!",g.right+"/"+g.items.length);
  else fishRound(g);},1600);
}

/* =====================================================================
   2. ĐƯỜNG ĐUA RỪNG TRÚC — trả lời đúng thì tiến 1 bước
   ===================================================================== */
function raceQs(){
 const P=pool(),hs=P.map(x=>x.h);
 const a=shuffle(cloze()).map(c=>{const full=c.q.replace(BLANK,c.a);return {
   type:"Điền từ còn thiếu",
   html:'<div class="qtext zh">'+(c.hint?'<span class="qhint">'+esc(c.hint)+'</span> ':"")+
        ruby(c.q).replace(BLANK,'<span class="blank" id="gBlank">?</span>')+'</div>',
   sub:c.v,right:c.a,opts:shuffle([c.a].concat(c.o)),say:c.say||full};});
 const b=shuffle(P).map(w=>({type:"Từ nào có nghĩa là…",html:'<div class="qmean">'+esc(label(w))+'</div>',
   sub:"",right:w.h,opts:shuffle([w.h].concat(other(hs,w.h,3))),say:w.h,line:wordLine(w)}));
 const out=[];while(a.length||b.length){if(a.length)out.push(a.shift());if(b.length)out.push(b.shift());}
 return out;
}
function race(mode){
 const two=mode===2||mode==="2";
 const g=G={key:"race",mode:two?2:1,N:two?6:8,pos:[0,0],turn:0,right:0,wrong:0,q:[],busy:false};
 g.names=two?["Đội Gấu Trúc","Đội Thỏ"]:["Con","Bạn Thỏ"];
 g.icons=[pic("panda.png"),pic("rabbit.png")];
 shell('<div class="card game">'+head("🏁 Đường đua rừng trúc",
   modeBtn("👤 1 bạn",!two,"Games.open('race',1)")+modeBtn("👥 2 đội",two,"Games.open('race',2)"))+
  '<p class="g-lead">'+(two?"Hai đội lần lượt trả lời. Đúng thì tiến 1 bước. Đội nào về rừng trúc trước?":
     "Đúng thì con tiến 1 bước. Sai thì bạn Thỏ nhảy 2 bước. Ai về rừng trúc trước?")+'</p>'+
  '<div class="track">'+[0,1].map(k=>'<div class="lane" id="lane'+k+'"><div class="who">'+g.names[k]+
    ' <span id="step'+k+'"></span></div><div class="road"><i class="runner" id="run'+k+'">'+g.icons[k]+
    '</i>'+GOAL+'</div></div>').join("")+'</div>'+
  '<div class="qbox" id="qbox"></div><div class="opts race-opts" id="opts"></div>'+
  '<div class="fb" id="fb"></div><div class="row" id="ctrl"></div></div>');
 raceDraw(g);raceQ(g);
}
function raceDraw(g){
 [0,1].forEach(k=>{const p=Math.min(g.N,g.pos[k]);
  $("run"+k).style.left="calc((100% - 100px) * "+(p/g.N)+")";
  $("step"+k).textContent=p+"/"+g.N;
  $("lane"+k).classList.toggle("on",g.mode===2&&g.turn===k);});
}
function raceQ(g){
 if(!$("qbox"))return;
 if(!g.q.length)g.q=raceQs();
 const q=g.cur=g.q.shift();g.busy=false;
 $("gPill").textContent=g.mode===2?"Lượt của "+g.names[g.turn]:"Câu "+(g.right+g.wrong+1);
 $("qbox").innerHTML='<div class="qtype">'+esc(q.type)+'</div>'+q.html+(q.sub?'<div class="qsub">'+esc(q.sub)+'</div>':"");
 const o=$("opts");o.innerHTML="";
 q.opts.forEach(v=>{const b=document.createElement("button");b.className="zh";b.dataset.v=v;b.innerHTML=ruby(v);
  b.onclick=()=>raceAnswer(g,b,v);o.appendChild(b);});
 const fb=$("fb");fb.className="fb";fb.textContent="";$("ctrl").innerHTML="";
 raceDraw(g);applyPY();
}
function raceAnswer(g,btn,v){
 if(g.busy)return;g.busy=true;
 const q=g.cur,ok=v===q.right;
 document.querySelectorAll("#opts button").forEach(b=>{b.disabled=true;if(b.dataset.v===q.right)b.classList.add("ok");});
 const bl=$("gBlank");if(bl){bl.innerHTML=ruby(q.right);bl.classList.add("fill");applyPY();}
 if(ok){g.right++;addStar(1);sfx(true);g.pos[g.turn]++;
  feedback(true,"⭐ "+pick(PRAISE)+(q.line?" "+q.line:""));}
 else{g.wrong++;sfx(false);btn.classList.add("bad");
  if(g.mode===1)g.pos[1]=Math.min(g.N,g.pos[1]+2);
  feedback(false,"Đáp án đúng: "+(q.line||q.right)+(g.mode===1?" — bạn Thỏ nhảy 2 bước!":""));}
 speak(q.say);raceDraw(g);
 const win=g.pos[0]>=g.N?0:g.pos[1]>=g.N?1:-1;
 if(win>=0){later(g,()=>raceEnd(g,win),1700);return;}
 if(g.mode===2)g.turn=1-g.turn;
 if(ok)later(g,()=>raceQ(g),1500);
 else{const b=document.createElement("button");b.className="btn-pink";b.textContent="Câu tiếp theo ▶";
  b.onclick=()=>raceQ(g);$("ctrl").appendChild(b);}
}
function raceEnd(g,win){
 const tot=g.right+g.wrong;
 if(g.mode===2)done(g,"🏆",g.names[win]+" về đích trước!","xong");
 else if(win===0)done(g,"🏆","Con về rừng trúc trước rồi!","thắng · "+g.right+"/"+tot);
 else done(g,"💪","Bạn Thỏ về đích trước. Con đua lại nhé!",g.right+"/"+tot);
}

/* =====================================================================
   3. AI TRỐN SAU BỤI TRÚC? — nhớ các thẻ từ, đoán thẻ vừa trốn mất
   ===================================================================== */
function hide(){
 const g=G={key:"hide",r:0,R:6,right:0,wrong:0,phase:"look",set:[],used:[]};
 hideSet(g);
 shell('<div class="card game">'+head("🎋 Ai trốn sau bụi trúc?")+
  '<p class="g-lead" id="gLead"></p><div class="hgrid" id="hgrid"></div>'+
  '<div class="opts race-opts hide-opts" id="opts"></div><div class="fb" id="fb"></div><div class="row" id="ctrl"></div></div>');
 hideDraw(g);
}
function hideSet(g){const P=pool();g.set=shuffle(P).slice(0,Math.min(6,P.length));g.used=[];}
function card(w){
 const b=document.createElement("button");b.className="hcard";b.type="button";
 b.innerHTML='<span class="hp">'+esc(w.p)+'</span><span class="hh zh">'+esc(w.h)+'</span><span class="hv">'+esc(label(w))+'</span>';
 b.onclick=()=>speak(w.h);return b;}
function btn(cls,txt,fn){const b=document.createElement("button");b.className=cls;b.textContent=txt;b.onclick=fn;return b;}
function hideDraw(g){
 const grid=$("hgrid");if(!grid)return;
 grid.innerHTML="";$("opts").innerHTML="";const ctrl=$("ctrl");ctrl.innerHTML="";
 $("gPill").textContent="Lượt "+(g.r+1)+"/"+g.R;
 g.set.forEach(w=>{
  if(g.phase==="hide"&&w===g.gone){const d=document.createElement("div");d.className="hcard bush";d.id="gBush";d.innerHTML=BUSH;grid.appendChild(d);}
  else{const c=card(w);if(g.phase==="show"&&w===g.gone)c.classList.add("found");grid.appendChild(c);}});
 if(g.phase==="look"){
  const fb=$("fb");fb.className="fb";fb.textContent="";
  $("gLead").textContent="Con nhớ kỹ "+g.set.length+" từ này (bấm vào thẻ để nghe), rồi bấm “Trốn đi!”.";
  ctrl.appendChild(btn("btn-main","🙈 Trốn đi!",()=>hideGo(g)));
  if(pool().length>g.set.length)ctrl.appendChild(btn("btn-ghost","🔀 Bộ từ mới",()=>{hideSet(g);hideDraw(g);}));
 }else if(g.phase==="hide"){
  $("gLead").textContent="Ai trốn sau bụi trúc? Con nói to bằng tiếng Trung, rồi chọn chữ đúng nhé!";
  const o=$("opts");
  g.opts.forEach(w=>{const b=document.createElement("button");b.className="zh";b.dataset.h=w.h;b.textContent=w.h;
   b.onclick=()=>hideAnswer(g,b,w);o.appendChild(b);});
  ctrl.appendChild(btn("btn-ghost","💡 Gợi ý",()=>{const f=$("fb");f.className="fb";f.textContent="Gợi ý: "+label(g.gone);}));
 }else{
  $("gLead").textContent="Con đọc to từ vừa tìm được nhé!";
  ctrl.appendChild(btn("btn-ghost","🔊 Nghe lại",()=>speak(g.gone.h)));
  ctrl.appendChild(btn("btn-pink",g.r+1>=g.R?"Xem kết quả ▶":"Chơi tiếp ▶",()=>hideNext(g)));
 }
}
function hideGo(g){
 if(g.phase!=="look")return;
 let left=g.set.filter(w=>g.used.indexOf(w)<0);if(!left.length){g.used=[];left=g.set;}
 g.gone=pick(left);g.used.push(g.gone);
 const P=pool(),outside=shuffle(P.filter(w=>g.set.indexOf(w)<0)),inside=shuffle(g.set.filter(w=>w!==g.gone));
 g.opts=shuffle([g.gone].concat(outside.concat(inside).slice(0,2)));
 const grid=$("hgrid");grid.classList.add("out");g.phase="wait";
 later(g,()=>{g.set=shuffle(g.set);g.phase="hide";hideDraw(g);
  later(g,()=>{const gr=$("hgrid");if(gr)gr.classList.remove("out");},40);},320);
}
function hideAnswer(g,b,w){
 if(g.phase!=="hide")return;
 const ok=w===g.gone;
 if(ok){g.right++;addStar(1);sfx(true);}else{g.wrong++;sfx(false);}
 g.phase="show";hideDraw(g);
 feedback(ok,(ok?"⭐ Đúng rồi! ":"Bạn trốn là ")+wordLine(g.gone));
 speak(g.gone.h);
}
function hideNext(g){
 g.r++;
 if(g.r>=g.R){done(g,g.right>=g.R*.8?"🌟":"💪",g.right>=g.R*.8?"Con nhớ từ rất giỏi!":"Con chơi thêm lần nữa nhé!",g.right+"/"+g.R);return;}
 if(g.r%3===0&&pool().length>g.set.length)hideSet(g);
 g.phase="look";hideDraw(g);
}

/* ---------- cổng vào ---------- */
window.Games={
 list(L){
  const n=pool(L).length;if(n<4)return [];
  const a=[{key:"fish",t:"Gấu trúc câu cá",ico:"🎣",sub:"Nghe rồi câu đúng con cá"},
           {key:"race",t:"Đường đua rừng trúc",ico:"🏁",sub:"Đúng thì tiến 1 bước"}];
  if(n>=5)a.push({key:"hide",t:"Ai trốn sau bụi trúc?",ico:"🎋",sub:"Nhớ từ, đoán bạn trốn mất"});
  return a;},
 open(key,mode){if(!LESSON)return;window.scrollTo(0,0);
  if(key==="fish")fish(mode);else if(key==="race")race(mode);else if(key==="hide")hide();},
 exit(){G=null;route();},
 stop(){G=null;}
};
})();
