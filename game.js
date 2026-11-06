(()=>{
const T=THREE,$=id=>document.getElementById(id);
const LANES=[-2.4,0,2.4],L=48,N=8,rnd=a=>a[Math.random()*a.length|0];
let best=0;try{best=+localStorage.getItem('nr_best')||0}catch(e){}
$('best').textContent=$('best2').textContent=best;
const R=new T.WebGLRenderer({canvas:$('c'),antialias:true,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,/iPhone|iPad|Android/.test(navigator.userAgent)?1.75:2));
R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.25;R.outputColorSpace=T.SRGBColorSpace;
R.shadowMap.enabled=true;R.shadowMap.type=T.PCFShadowMap;
const scene=new T.Scene();scene.background=new T.Color(0x1a0836);scene.fog=new T.FogExp2(0x1a0836,.017);
const cam=new T.PerspectiveCamera(66,1,.1,400);
function resize(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.userData.f=cam.aspect<1?78:64}
addEventListener('resize',resize);resize();

// ---------- texturas procedurais ----------
function cv(w,h,f){const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
const NEON=['#ff2fb3','#35e0ff','#9b5cff','#ffd9f5'];
const winTex=cv(128,256,(g,w,h)=>{g.fillStyle='#05050c';g.fillRect(0,0,w,h);for(let y=6;y<h;y+=12)for(let x=6;x<w;x+=12)if(Math.random()<.45){g.fillStyle=rnd(NEON);g.globalAlpha=.5+Math.random()*.5;g.fillRect(x,y,6,7)}});
winTex.wrapS=winTex.wrapT=T.RepeatWrapping;
const roadTex=cv(256,512,(g,w,h)=>{g.fillStyle='#0a0a14';g.fillRect(0,0,w,h);for(let i=0;i<2500;i++){g.fillStyle='rgba(120,110,170,'+Math.random()*.12+')';g.fillRect(Math.random()*w,Math.random()*h,2,2)}for(let i=0;i<9;i++){const x=Math.random()*w,y=Math.random()*h,gr=g.createRadialGradient(x,y,0,x,y,50);gr.addColorStop(0,rnd(['rgba(255,47,179,.35)','rgba(53,224,255,.35)','rgba(155,92,255,.35)']));gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(x-60,y-60,120,120)}});
const BB=['SYNTH BAR','NOVA CORP','CYBER RAMEN','HOLO-NET'].map((s,i)=>cv(256,128,(g,w,h)=>{const c=NEON[i%3];g.fillStyle='rgba(8,4,24,.92)';g.fillRect(0,0,w,h);g.strokeStyle=c;g.lineWidth=5;g.shadowColor=c;g.shadowBlur=16;g.strokeRect(8,8,w-16,h-16);g.fillStyle='#fff';g.font='800 30px Orbitron,Arial Black,sans-serif';g.textAlign='center';g.fillText(s,w/2,h/2+10)}));
const glow=cv(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,120,220,1)');r.addColorStop(.4,'rgba(155,60,255,.5)');r.addColorStop(1,'transparent');g.fillStyle=r;g.fillRect(0,0,128,128)});
const sun=new T.Sprite(new T.SpriteMaterial({map:glow,fog:false,depthWrite:false}));sun.scale.set(300,300,1);sun.position.set(0,45,-340);scene.add(sun);

// ---------- luzes ----------
scene.add(new T.HemisphereLight(0x7a5cff,0x1a0836,.7));
const sunL=new T.DirectionalLight(0xffa0e0,1.1);sunL.castShadow=true;sunL.shadow.mapSize.set(1024,1024);
Object.assign(sunL.shadow.camera,{left:-6,right:6,top:10,bottom:-10,near:1,far:40});scene.add(sunL,sunL.target);
const pc=new T.PointLight(0x35e0ff,90,32,2);pc.position.set(-5,4,-4);const pp=new T.PointLight(0xff2fb3,90,32,2);pp.position.set(5,4,-8);scene.add(pc,pp);

// ---------- cenário (segmentos reciclados) ----------
const roadMat=new T.MeshStandardMaterial({map:roadTex,roughness:.28,metalness:.35});
const gRoad=new T.PlaneGeometry(9,L),gSide=new T.PlaneGeometry(40,L),gLine=new T.PlaneGeometry(.08,L),gEdge=new T.BoxGeometry(.16,.16,L),gGlow=new T.PlaneGeometry(2.4,L),gBB=new T.PlaneGeometry(5,2.5);
const sideMat=new T.MeshStandardMaterial({color:0x0b0818,roughness:.5,metalness:.2});
const mBasic=c=>new T.MeshBasicMaterial({color:c,toneMapped:false});
const mCy=mBasic(0x35e0ff),mPk=mBasic(0xff2fb3);
const glowMat=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false});
const bGeos=[16,24,32,44,58].map(h=>{const g=new T.BoxGeometry(7,h,7),u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*2,u.getY(i)*h/16);g.userData.h=h;return g});
const bMats=[0xffffff,0xaab8ff,0xffaaee].map(c=>new T.MeshStandardMaterial({color:c,map:winTex,emissiveMap:winTex,emissive:0xffffff,emissiveIntensity:1.15,roughness:.6,metalness:.2}));
const gPost=new T.BoxGeometry(.4,6.5,.4),gBeam=new T.BoxGeometry(10,.4,.6),gStrip=new T.BoxGeometry(10,.12,.12);
const obsMat=new T.MeshStandardMaterial({color:0x1b1030,roughness:.4,metalness:.7,emissive:0xff2fb3,emissiveIntensity:.7});
const wallMat=new T.MeshStandardMaterial({color:0x101830,roughness:.4,metalness:.7,emissive:0x35e0ff,emissiveIntensity:.8});
const gCoin=new T.CylinderGeometry(.4,.4,.12,16).rotateX(Math.PI/2),coinMat=new T.MeshStandardMaterial({color:0xffc933,emissive:0xffa000,emissiveIntensity:1.2,metalness:.9,roughness:.25});
function mesh(g,m,x,y,z,sh){const o=new T.Mesh(g,m);o.position.set(x,y,z);if(sh)o.castShadow=true;return o}
function mkSeg(){const s=new T.Group();s.obs=[];s.coins=[];s.bl=[];s.bb=[];
 const r=mesh(gRoad,roadMat,0,0,-L/2);r.rotation.x=-Math.PI/2;r.receiveShadow=true;s.add(r);
 const sd=mesh(gSide,sideMat,0,-.05,-L/2);sd.rotation.x=-Math.PI/2;s.add(sd);
 [-1.2,1.2].forEach(x=>{const l=mesh(gLine,mCy,x,.02,-L/2);l.rotation.x=-Math.PI/2;s.add(l)});
 [-1,1].forEach((k,i)=>{s.add(mesh(gEdge,i?mCy:mPk,k*4.5,.08,-L/2));const gl=mesh(gGlow,glowMat(i?0x35e0ff:0xff2fb3),k*5.6,.03,-L/2);gl.rotation.x=-Math.PI/2;s.add(gl);
  for(let j=0;j<4;j++){const b=mesh(bGeos[0],bMats[0],k*11,0,-6-j*12);s.add(b);s.bl.push(b)}
  const m=new T.MeshBasicMaterial({map:BB[0],toneMapped:false,side:T.DoubleSide}),bb=mesh(gBB,m,k*5.9,7.5,-24);bb.rotation.y=-k*.5;s.add(bb);s.bb.push(bb)});
 s.tunnel=new T.Group();[-8,-24,-40].forEach(z=>{const f=new T.Group();f.position.z=z;f.add(mesh(gPost,obsMat,-4.8,3.25,0),mesh(gPost,obsMat,4.8,3.25,0),mesh(gBeam,obsMat,0,6.5,0),mesh(gStrip,mPk,0,6.2,0),mesh(gStrip,mCy,0,6.7,.2));s.tunnel.add(f)});s.add(s.tunnel);
 return s}
function mkObs(t){const g=new T.Group();g.userData.t=t;
 if(t==='low')g.add(mesh(new T.BoxGeometry(2.1,1,.8),obsMat,0,.5,0,1),mesh(new T.BoxGeometry(2.14,.08,.84),mPk,0,.98,0));
 else if(t==='high'){g.add(mesh(new T.BoxGeometry(2.2,.8,.6),obsMat,0,1.7,0,1),mesh(new T.BoxGeometry(.2,1.3,.2),wallMat,-1.05,.65,0,1),mesh(new T.BoxGeometry(.2,1.3,.2),wallMat,1.05,.65,0,1),mesh(new T.BoxGeometry(2.2,.06,.62),mCy,0,1.28,0))}
 else g.add(mesh(new T.BoxGeometry(2.2,3.4,1),wallMat,0,1.7,0,1),mesh(new T.BoxGeometry(2.24,.1,1.04),mCy,0,3.4,0));
 return g}
const getObs=(s,t)=>{let o=s.obs.find(o=>!o.visible&&o.userData.t===t);if(!o){o=mkObs(t);s.obs.push(o);s.add(o)}o.visible=true;return o};
const getCoin=s=>{let c=s.coins.find(c=>!c.visible);if(!c){c=new T.Mesh(gCoin,coinMat);s.coins.push(c);s.add(c)}c.visible=true;return c};
function fill(s,safe){s.obs.forEach(o=>o.visible=false);s.coins.forEach(c=>c.visible=false);
 s.tunnel.visible=!safe&&Math.random()<.25;
 s.bl.forEach(b=>{const g=rnd(bGeos);b.geometry=g;b.material=rnd(bMats);b.position.y=g.userData.h/2;b.position.x=Math.sign(b.position.x||1)*(10+Math.random()*2.5)});
 s.bb.forEach(b=>{b.visible=Math.random()<.55;b.material.map=rnd(BB)});
 if(safe)return;
 for(let k=0;k<4;k++){const z=-6-k*12;if(Math.random()<.2)continue;const free=[0,1,2],n=Math.random()<.35?2:1;
  for(let j=0;j<n;j++){const li=free.splice(Math.random()*free.length|0,1)[0];getObs(s,rnd(['low','high','wall'])).position.set(LANES[li],0,z)}
  if(Math.random()<.7){const li=rnd(free);for(let c=0;c<5;c++)getCoin(s).position.set(LANES[li],1.2,z-3-c*1.5)}}}
const segs=[];for(let i=0;i<N;i++){const s=mkSeg();scene.add(s);segs.push(s)}

// ---------- personagem humanoide ----------
const std=(c,e)=>new T.MeshStandardMaterial({color:c,roughness:.45,metalness:.5,emissive:e||0,emissiveIntensity:1.2});
const hero=new T.Group(),model=new T.Group();hero.add(model);
const part=(w,h,d,c,e,x,y,z,p)=>{const m=mesh(new T.BoxGeometry(w,h,d),std(c,e),x,y,z,1);(p||model).add(m);return m};
part(.7,.85,.4,0x1a1530,0,0,1.35,0);part(.14,.7,.05,0,0xff2fb3,0,1.35,.22);part(.74,.08,.44,0,0x35e0ff,0,.93,0);
const head=mesh(new T.SphereGeometry(.26,16,12),std(0x12101f),0,1.95,0,1);model.add(head);part(.08,.3,.05,0,0x35e0ff,0,1.97,.25);
const mk=(x,y,w,h,c,e,sy,sc)=>{const p=new T.Group();p.position.set(x,y,0);part(w,h,w+.04,c,0,0,-h/2,0,p);part(w+.02,.06,w+.06,0,sc,0,sy,0,p);model.add(p);return p};
const legL=mk(-.2,.95,.25,.9,0x15122a,0,-.88,0x35e0ff),legR=mk(.2,.95,.25,.9,0x15122a,0,-.88,0x35e0ff),armL=mk(-.47,1.7,.2,.7,0x1a1530,0,-.66,0xff2fb3),armR=mk(.47,1.7,.2,.7,0x1a1530,0,-.66,0xff2fb3);
scene.add(hero);

// ---------- partículas de velocidade ----------
const NL=140,lp=new Float32Array(NL*6),lg=new T.BufferGeometry();
const rl=i=>{const x=(Math.random()-.5)*26,y=Math.random()*9,z=-Math.random()*110+6;lp.set([x,y,z,x,y,z-1],i*6)};
for(let i=0;i<NL;i++)rl(i);lg.setAttribute('position',new T.BufferAttribute(lp,3));
scene.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0x9be8ff,transparent:true,opacity:.5,blending:T.AdditiveBlending,fog:false})));

// ---------- estado do jogo ----------
let state='menu',speed=12,dist=0,coins=0,score=0,last=0,shake=0,ph=0;
const p={lane:1,x:0,y:0,vy:0,slide:0};
function reset(){segs.forEach((s,i)=>{s.position.z=L-i*L;fill(s,i<3)});Object.assign(p,{lane:1,x:0,y:0,vy:0,slide:0});speed=16;dist=coins=score=0}
function start(){reset();state='play';$('menu').classList.add('hidden');$('over').classList.add('hidden');$('hud').classList.remove('hidden')}
function die(){if(state!=='play')return;state='over';shake=.6;if(score>best){best=score;try{localStorage.setItem('nr_best',best)}catch(e){}$('newrec').classList.remove('hidden')}else $('newrec').classList.add('hidden');
 $('best').textContent=$('best2').textContent=best;$('fs').textContent=score;$('fd').textContent=(dist|0)+' m';$('fc').textContent=coins;
 setTimeout(()=>{$('over').classList.remove('hidden');$('hud').classList.add('hidden')},700)}
$('play').onclick=start;$('retry').onclick=start;
function act(a){if(state!=='play')return;
 if(a==='l')p.lane=Math.max(0,p.lane-1);else if(a==='r')p.lane=Math.min(2,p.lane+1);
 else if(a==='u'&&p.y<.05){p.vy=11.5;p.slide=0}
 else if(a==='d'){if(p.y>.05)p.vy=-22;else p.slide=.75}}
let sx,sy,done=true;
addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;done=false},{passive:true});
addEventListener('touchmove',e=>{e.preventDefault();if(done)return;const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
 if(Math.hypot(dx,dy)<26)return;done=true;act(Math.abs(dx)>Math.abs(dy)?(dx<0?'l':'r'):(dy<0?'u':'d'))},{passive:false});
addEventListener('keydown',e=>{const m={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'u',w:'u',' ':'u',ArrowDown:'d',s:'d'}[e.key];if(m){act(m);e.preventDefault()}});

function update(dt){
 const play=state==='play';
 if(state==='over')speed=Math.max(0,speed-60*dt);else if(play)speed=Math.min(40,speed+.4*dt);else speed=12;
 const d=speed*dt;
 for(const s of segs){s.position.z+=d;if(s.position.z>L+8){s.position.z-=N*L;fill(s,false)}
  for(const c of s.coins)c.rotation.y+=dt*4}
 // jogador
 const tx=LANES[p.lane];p.x+=(tx-p.x)*Math.min(1,dt*14);
 if(p.y>0||p.vy>0){p.vy-=34*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0}}
 if(p.slide>0)p.slide-=dt;
 hero.position.set(p.x,p.y,0);
 if(state!=='over')ph+=dt*(6+speed*.28);
 const air=p.y>.05,sl=p.slide>0,sw=Math.sin(ph)*(air?.2:1);
 legL.rotation.x=air?-.6:sw;legR.rotation.x=air?.5:-sw;armL.rotation.x=air?-2.4:-sw;armR.rotation.x=air?-2.4:sw;
 const lean=(tx-p.x)*.12;model.rotation.z=lean;
 model.rotation.x+=((sl?1.25:.12)-model.rotation.x)*Math.min(1,dt*16);
 model.position.y=(sl?.35:Math.abs(Math.sin(ph))*.07);
 if(state==='over')model.rotation.x=.9;
 // colisões e moedas
 if(play){dist+=d;score=(dist|0)+coins*50;
  const top=p.y+(sl?.9:1.8);
  for(const s of segs){if(s.position.z<-4||s.position.z>L+8)continue;
   for(const o of s.obs){if(!o.visible)continue;const wz=s.position.z+o.position.z;if(Math.abs(wz)>.8||Math.abs(o.position.x-p.x)>1.05)continue;
    const t=o.userData.t;if(t==='low'?p.y<1:t==='high'?(top>1.3&&p.y<2.1):p.y<3.4)die()}
   for(const c of s.coins){if(!c.visible)continue;const wz=s.position.z+c.position.z;if(Math.abs(wz)<1&&Math.abs(c.position.x-p.x)<1.1&&Math.abs(c.position.y-(p.y+(sl?.5:1)))<1.3){c.visible=false;coins++}}}
  $('score').textContent=score;$('dist').textContent=dist|0;$('coins').textContent=coins}
 // câmera
 cam.position.x+=(p.x*.65-cam.position.x)*Math.min(1,dt*6);
 cam.position.y+=((3.5+p.y*.35)-cam.position.y)*Math.min(1,dt*5);cam.position.z=7.5;
 if(shake>0){shake-=dt;cam.position.x+=(Math.random()-.5)*shake*.8;cam.position.y+=(Math.random()-.5)*shake*.8}
 cam.lookAt(p.x*.45,1.7+p.y*.3,-12);cam.rotation.z+=(p.x-tx)*.04;
 const f=cam.userData.f+(speed-14)*.22;if(Math.abs(cam.fov-f)>.05){cam.fov=f;cam.updateProjectionMatrix()}
 sunL.position.set(p.x+6,14,6);sunL.target.position.set(p.x,0,-2);
 // linhas de velocidade
 const len=Math.max(.5,speed*.06);
 for(let i=0;i<NL;i++){const k=i*6;lp[k+2]+=d*1.2;lp[k+5]=lp[k+2]-len;if(lp[k+2]>8)rl(i),lp[k+2]=-110;lp[k+3]=lp[k];lp[k+4]=lp[k+1]}
 lg.attributes.position.needsUpdate=true;
}
function loop(t){const dt=Math.min((t-last)/1000||.016,.05);last=t;update(dt);R.render(scene,cam);requestAnimationFrame(loop)}
reset();state='menu';requestAnimationFrame(loop);
})();
