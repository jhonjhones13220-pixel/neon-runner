(()=>{
const T=THREE,$=id=>document.getElementById(id);
const LANES=[-2.4,0,2.4],L=48,N=8,rnd=a=>a[Math.random()*a.length|0];
let best=0;try{best=+localStorage.getItem('nr_best')||0}catch(e){}
$('best').textContent=$('best2').textContent=best;
const R=new T.WebGLRenderer({canvas:$('c'),antialias:false,powerPreference:'high-performance'});
R.setPixelRatio(Math.min(devicePixelRatio,/iPhone|iPad|Android/.test(navigator.userAgent)?1.5:2));
R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.25;R.outputColorSpace=T.SRGBColorSpace;
R.shadowMap.enabled=true;R.shadowMap.type=T.PCFShadowMap;
// ---------- pós-processamento HDR: bloom multinível + efeitos de lente ----------
const MOB=/iPhone|iPad|Android/.test(navigator.userAgent);
let POST=R.capabilities.isWebGL2&&(R.extensions.has('EXT_color_buffer_float')||R.extensions.has('EXT_color_buffer_half_float')),pscale=MOB?.85:1;
R.toneMapping=POST?T.NoToneMapping:T.ACESFilmicToneMapping;
const LV=5,rtO={type:T.HalfFloatType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false,stencilBuffer:false};
let rtS=null;const mips=[];
if(POST){rtS=new T.WebGLRenderTarget(4,4,{...rtO,depthBuffer:true,samples:MOB?2:4});for(let i=0;i<LV;i++)mips.push(new T.WebGLRenderTarget(4,4,rtO))}
const qc=new T.OrthographicCamera(-1,1,1,-1,0,1),qs=new T.Scene(),VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const quad=new T.Mesh(new T.PlaneGeometry(2,2),null);quad.frustumCulled=false;qs.add(quad);
const sm=(fs,u,x)=>new T.ShaderMaterial(Object.assign({vertexShader:VS,fragmentShader:fs,uniforms:u,depthTest:false,depthWrite:false},x||{}));
const mDown=sm(`uniform sampler2D tex;uniform vec2 tx;uniform float thr;varying vec2 vUv;
vec3 pf(vec3 c){c=min(c,vec3(12.));if(thr<0.)return c;float b=max(c.r,max(c.g,c.b));return c*max(b-thr,0.)/max(b,1e-4);}
void main(){vec3 c=pf(texture2D(tex,vUv+tx*vec2(-1.,-1.)).rgb)+pf(texture2D(tex,vUv+tx*vec2(1.,-1.)).rgb)+pf(texture2D(tex,vUv+tx*vec2(-1.,1.)).rgb)+pf(texture2D(tex,vUv+tx*vec2(1.,1.)).rgb);gl_FragColor=vec4(c*.25,1.);}`,{tex:{value:null},tx:{value:new T.Vector2()},thr:{value:.85}});
const mUp=sm(`uniform sampler2D tex;uniform vec2 tx;varying vec2 vUv;
void main(){vec3 c=texture2D(tex,vUv+tx*vec2(-1.,-1.)).rgb+2.*texture2D(tex,vUv+tx*vec2(0.,-1.)).rgb+texture2D(tex,vUv+tx*vec2(1.,-1.)).rgb+2.*texture2D(tex,vUv+tx*vec2(-1.,0.)).rgb+4.*texture2D(tex,vUv).rgb+2.*texture2D(tex,vUv+tx*vec2(1.,0.)).rgb+texture2D(tex,vUv+tx*vec2(-1.,1.)).rgb+2.*texture2D(tex,vUv+tx*vec2(0.,1.)).rgb+texture2D(tex,vUv+tx*vec2(1.,1.)).rgb;gl_FragColor=vec4(c/16.,1.);}`,{tex:{value:null},tx:{value:new T.Vector2()}},{blending:T.AdditiveBlending});
const mComp=sm(`uniform sampler2D tS,tB;uniform float uT,uSp,uBl;uniform vec2 uRes;varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 d=vUv-.5;float r2=dot(d,d);vec2 ca=d*r2*(.03+.05*uSp),dir=d*(.015+.07*uSp);vec3 c=vec3(0.);
for(int i=0;i<4;i++){vec2 o=vUv-dir*float(i)/3.;c+=vec3(texture2D(tS,o-ca).r,texture2D(tS,o).g,texture2D(tS,o+ca).b);}
c=c*.25+texture2D(tB,vUv).rgb*uBl;c=aces(c*1.25);
float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,1.18);
c*=mix(vec3(.92,.96,1.12),vec3(1.08,1.,.96),smoothstep(.1,.7,l));
c*=1.-smoothstep(.2,.8,r2*2.4)*.6;
c+=(hs(vUv*uRes+fract(uT)*40.)-.5)*.03;
gl_FragColor=vec4(pow(max(c,0.),vec3(1./2.2)),1.);}`,{tS:{value:null},tB:{value:null},uT:{value:0},uSp:{value:0},uBl:{value:.42},uRes:{value:new T.Vector2(1,1)}});
function sizePost(){if(!POST)return;const v=R.getDrawingBufferSize(new T.Vector2()),w=Math.max(8,v.x*pscale|0),h=Math.max(8,v.y*pscale|0);rtS.setSize(w,h);let mw=w,mh=h;mips.forEach(m=>{mw=Math.max(2,mw>>1);mh=Math.max(2,mh>>1);m.setSize(mw,mh)});mComp.uniforms.uRes.value.set(v.x,v.y)}
function pass(m,tg){quad.material=m;R.setRenderTarget(tg);R.render(qs,qc)}
function renderPost(t){
 R.setRenderTarget(rtS);R.render(scene,cam);
 let src=rtS.texture,sw=rtS.width,sh=rtS.height;
 for(let i=0;i<LV;i++){mDown.uniforms.tex.value=src;mDown.uniforms.tx.value.set(1/sw,1/sh);mDown.uniforms.thr.value=i?-1:.85;pass(mDown,mips[i]);src=mips[i].texture;sw=mips[i].width;sh=mips[i].height}
 R.autoClear=false;
 for(let i=LV-1;i>0;i--){const s=mips[i];mUp.uniforms.tex.value=s.texture;mUp.uniforms.tx.value.set(1/s.width,1/s.height);pass(mUp,mips[i-1])}
 R.autoClear=true;
 const u=mComp.uniforms;u.tS.value=rtS.texture;u.tB.value=mips[0].texture;u.uT.value=t*.001;u.uSp.value=Math.min(1,Math.max(0,(speed-12)/28));u.uBl.value=.42+Math.max(0,shake)*.9;
 pass(mComp,null)}
let fa=0,fc=0;
function adapt(dt){if(!POST)return;fa+=dt;if(++fc<45)return;const av=fa/fc;fa=fc=0;let n=pscale;if(av>.026)n=Math.max(.55,pscale-.12);else if(av<.0185&&pscale<1)n=Math.min(1,pscale+.06);if(n!==pscale){pscale=n;sizePost()}}
function draw(t){if(POST){try{renderPost(t);return}catch(e){POST=false;R.setRenderTarget(null);R.autoClear=true;R.toneMapping=T.ACESFilmicToneMapping;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true})}}R.render(scene,cam)}

const scene=new T.Scene();scene.background=new T.Color(0x1a0836);scene.fog=new T.FogExp2(0x1a0836,.017);
const cam=new T.PerspectiveCamera(66,1,.1,400);
function resize(){R.setSize(innerWidth,innerHeight);sizePost();cam.aspect=innerWidth/innerHeight;cam.userData.f=cam.aspect<1?78:64}
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
[mCy,mPk].forEach(m=>m.color.multiplyScalar(POST?3:1));
const glowMat=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false});
const bGeos=[16,24,32,44,58].map(h=>{const g=new T.BoxGeometry(7,h,7),u=g.attributes.uv;for(let i=0;i<u.count;i++)u.setXY(i,u.getX(i)*2,u.getY(i)*h/16);g.userData.h=h;return g});
const bMats=[0xffffff,0xaab8ff,0xffaaee].map(c=>new T.MeshStandardMaterial({color:c,map:winTex,emissiveMap:winTex,emissive:0xffffff,emissiveIntensity:1.15,roughness:.6,metalness:.2}));
const gPost=new T.BoxGeometry(.4,6.5,.4),gBeam=new T.BoxGeometry(10,.4,.6),gStrip=new T.BoxGeometry(10,.12,.12);
const obsMat=new T.MeshStandardMaterial({color:0x1b1030,roughness:.4,metalness:.7,emissive:0xff2fb3,emissiveIntensity:.7});
const wallMat=new T.MeshStandardMaterial({color:0x101830,roughness:.4,metalness:.7,emissive:0x35e0ff,emissiveIntensity:.8});
const gPu=new T.IcosahedronGeometry(.55,0),puMat={shield:new T.MeshStandardMaterial({color:0x35e0ff,emissive:0x35e0ff,emissiveIntensity:1.5,flatShading:true}),magnet:new T.MeshStandardMaterial({color:0xff2fb3,emissive:0xff2fb3,emissiveIntensity:1.5,flatShading:true})};
const gCoin=new T.CylinderGeometry(.4,.4,.12,16).rotateX(Math.PI/2),coinMat=new T.MeshStandardMaterial({color:0xffc933,emissive:0xffa000,emissiveIntensity:1.2,metalness:.9,roughness:.25});
[obsMat,wallMat,coinMat].forEach(m=>m.emissiveIntensity*=POST?2:1);bMats.forEach(m=>m.emissiveIntensity=POST?1.7:1.15);
function mesh(g,m,x,y,z,sh){const o=new T.Mesh(g,m);o.position.set(x,y,z);if(sh)o.castShadow=true;return o}
function mkSeg(){const s=new T.Group();s.obs=[];s.coins=[];s.bl=[];s.bb=[];
 const r=mesh(gRoad,roadMat,0,0,-L/2);r.rotation.x=-Math.PI/2;r.receiveShadow=true;s.add(r);
 const sd=mesh(gSide,sideMat,0,-.05,-L/2);sd.rotation.x=-Math.PI/2;s.add(sd);
 [-1.2,1.2].forEach(x=>{const l=mesh(gLine,mCy,x,.02,-L/2);l.rotation.x=-Math.PI/2;s.add(l)});
 [-1,1].forEach((k,i)=>{s.add(mesh(gEdge,i?mCy:mPk,k*4.5,.08,-L/2));const gl=mesh(gGlow,glowMat(i?0x35e0ff:0xff2fb3),k*5.6,.03,-L/2);gl.rotation.x=-Math.PI/2;s.add(gl);
  for(let j=0;j<4;j++){const b=mesh(bGeos[0],bMats[0],k*11,0,-6-j*12);s.add(b);s.bl.push(b)}
  const m=new T.MeshBasicMaterial({map:BB[0],color:new T.Color().setScalar(POST?1.8:1),toneMapped:false,side:T.DoubleSide}),bb=mesh(gBB,m,k*5.9,7.5,-24);bb.rotation.y=-k*.5;s.add(bb);s.bb.push(bb)});
 s.tunnel=new T.Group();[-8,-24,-40].forEach(z=>{const f=new T.Group();f.position.z=z;f.add(mesh(gPost,obsMat,-4.8,3.25,0),mesh(gPost,obsMat,4.8,3.25,0),mesh(gBeam,obsMat,0,6.5,0),mesh(gStrip,mPk,0,6.2,0),mesh(gStrip,mCy,0,6.7,.2));s.tunnel.add(f)});s.add(s.tunnel);
 s.pu=new T.Mesh(gPu,puMat.shield);s.pu.visible=false;s.add(s.pu);
 return s}
function mkObs(t){const g=new T.Group();g.userData.t=t;
 if(t==='low')g.add(mesh(new T.BoxGeometry(2.1,1,.8),obsMat,0,.5,0,1),mesh(new T.BoxGeometry(2.14,.08,.84),mPk,0,.98,0));
 else if(t==='high'){g.add(mesh(new T.BoxGeometry(2.2,.8,.6),obsMat,0,1.7,0,1),mesh(new T.BoxGeometry(.2,1.3,.2),wallMat,-1.05,.65,0,1),mesh(new T.BoxGeometry(.2,1.3,.2),wallMat,1.05,.65,0,1),mesh(new T.BoxGeometry(2.2,.06,.62),mCy,0,1.28,0))}
 else if(t==='train'){g.userData.d=3.5;g.add(mesh(new T.BoxGeometry(2.2,3.2,7),wallMat,0,1.6,0,1),mesh(new T.BoxGeometry(2.24,.12,7.04),mPk,0,3.2,0),mesh(new T.BoxGeometry(1.6,.5,.05),mCy,0,2.3,3.52))}
 else g.add(mesh(new T.BoxGeometry(2.2,3.4,1),wallMat,0,1.7,0,1),mesh(new T.BoxGeometry(2.24,.1,1.04),mCy,0,3.4,0));
 return g}
const getObs=(s,t)=>{let o=s.obs.find(o=>!o.visible&&o.userData.t===t);if(!o){o=mkObs(t);s.obs.push(o);s.add(o)}o.visible=true;return o};
const getCoin=s=>{let c=s.coins.find(c=>!c.visible);if(!c){c=new T.Mesh(gCoin,coinMat);s.coins.push(c);s.add(c)}c.visible=true;return c};
function fill(s,safe){s.pu.visible=false;s.obs.forEach(o=>o.visible=false);s.coins.forEach(c=>c.visible=false);
 s.tunnel.visible=!safe&&Math.random()<.25;
 s.bl.forEach(b=>{const g=rnd(bGeos);b.geometry=g;b.material=rnd(bMats);b.position.y=g.userData.h/2;b.position.x=Math.sign(b.position.x||1)*(10+Math.random()*2.5)});
 s.bb.forEach(b=>{b.visible=Math.random()<.55;b.material.map=rnd(BB)});
 if(safe)return;
 for(let k=0;k<4;k++){const z=-6-k*12;if(Math.random()<Math.max(.05,.25-(speed-16)*.008))continue;const free=[0,1,2],n=Math.random()<.3+(speed-16)*.01?2:1;
  for(let j=0;j<n;j++){const li=free.splice(Math.random()*free.length|0,1)[0];getObs(s,rnd(['low','high','wall','train'])).position.set(LANES[li],0,z)}
  if(Math.random()<.7){const li=rnd(free);for(let c=0;c<5;c++)getCoin(s).position.set(LANES[li],1.2,z-3-c*1.5)}}
 if(Math.random()<.14){const t=Math.random()<.5?'shield':'magnet';s.pu.visible=true;s.pu.userData.t=t;s.pu.material=puMat[t];s.pu.position.set(rnd(LANES),1.3,-24)}}
const segs=[];for(let i=0;i<N;i++){const s=mkSeg();scene.add(s);segs.push(s)}

// ---------- personagem humanoide ----------
const std=(c,e)=>new T.MeshStandardMaterial({color:c,roughness:.45,metalness:.5,emissive:e||0,emissiveIntensity:POST?2.4:1.2});
const hero=new T.Group(),model=new T.Group();hero.add(model);
const part=(w,h,d,c,e,x,y,z,p)=>{const m=mesh(new T.BoxGeometry(w,h,d),std(c,e),x,y,z,1);(p||model).add(m);return m};
part(.7,.85,.4,0x1a1530,0,0,1.35,0);part(.14,.7,.05,0,0xff2fb3,0,1.35,.22);part(.74,.08,.44,0,0x35e0ff,0,.93,0);
const head=mesh(new T.SphereGeometry(.26,16,12),std(0x12101f),0,1.95,0,1);model.add(head);part(.08,.3,.05,0,0x35e0ff,0,1.97,.25);
const mk=(x,y,w,h,c,e,sy,sc)=>{const p=new T.Group();p.position.set(x,y,0);part(w,h,w+.04,c,0,0,-h/2,0,p);part(w+.02,.06,w+.06,0,sc,0,sy,0,p);model.add(p);return p};
const legL=mk(-.2,.95,.25,.9,0x15122a,0,-.88,0x35e0ff),legR=mk(.2,.95,.25,.9,0x15122a,0,-.88,0x35e0ff),armL=mk(-.47,1.7,.2,.7,0x1a1530,0,-.66,0xff2fb3),armR=mk(.47,1.7,.2,.7,0x1a1530,0,-.66,0xff2fb3);
scene.add(hero);
const shM=new T.Mesh(new T.SphereGeometry(1.15,16,12),new T.MeshBasicMaterial({color:0x35e0ff,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false}));shM.position.y=1.2;shM.visible=false;hero.add(shM);

// ---------- partículas de velocidade ----------
const NL=140,lp=new Float32Array(NL*6),lg=new T.BufferGeometry();
const rl=i=>{const x=(Math.random()-.5)*26,y=Math.random()*9,z=-Math.random()*110+6;lp.set([x,y,z,x,y,z-1],i*6)};
for(let i=0;i<NL;i++)rl(i);lg.setAttribute('position',new T.BufferAttribute(lp,3));
scene.add(new T.LineSegments(lg,new T.LineBasicMaterial({color:0x9be8ff,transparent:true,opacity:.5,blending:T.AdditiveBlending,fog:false})));

// ---------- partículas: explosões e chuva ----------
const BN=90,bp=new Float32Array(BN*3).fill(-100),bv=new Float32Array(BN*3),bc=new Float32Array(BN*3),bl=new Float32Array(BN),bg=new T.BufferGeometry();
bg.setAttribute('position',new T.BufferAttribute(bp,3));bg.setAttribute('color',new T.BufferAttribute(bc,3));
const bpts=new T.Points(bg,new T.PointsMaterial({size:.3,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false}));bpts.frustumCulled=false;scene.add(bpts);
function burst(x,y,z,n,r,g,b){for(let i=0,k=0;i<BN&&k<n;i++){if(bl[i]>0)continue;k++;bl[i]=.7;bp.set([x,y,z],i*3);bv.set([(Math.random()-.5)*8,Math.random()*6,(Math.random()-.5)*8],i*3);bc.set([r,g,b],i*3)}}
const RN=160,rp=new Float32Array(RN*6),rg=new T.BufferGeometry();
for(let i=0;i<RN;i++){const x=(Math.random()-.5)*30,y=Math.random()*14,z=-Math.random()*80;rp.set([x,y,z,x,y+.9,z],i*6)}
rg.setAttribute('position',new T.BufferAttribute(rp,3));
const rain=new T.LineSegments(rg,new T.LineBasicMaterial({color:0x8fb8ff,transparent:true,opacity:.28}));rain.frustumCulled=false;scene.add(rain);

// ---------- áudio sintetizado (WebAudio) ----------
let AC,mg,muted=false,paused=false,pwT='';
function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.gain.value=muted?0:.5;mg.connect(AC.destination);music()}catch(e){AC=null}}
function tone(f,t,d,ty,v,sl){const o=AC.createOscillator(),g=AC.createGain();o.type=ty;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(sl,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(mg);o.start(t);o.stop(t+d)}
const sfx={coin(){const t=AC.currentTime;tone(988,t,.07,'square',.1);tone(1480,t+.06,.12,'square',.1)},jump(){tone(260,AC.currentTime,.18,'sine',.25,620)},slide(){tone(500,AC.currentTime,.25,'sawtooth',.08,120)},hit(){const t=AC.currentTime;tone(160,t,.5,'sawtooth',.35,30);tone(90,t,.6,'square',.25,25)},power(){const t=AC.currentTime;[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.07,.15,'triangle',.18))}};
const S=n=>{if(AC&&!muted)sfx[n]()};
const BASS=[55,55,65.4,49,55,55,73.4,65.4],ARP=[220,262,330,392,330,262,294,349];let stp=0,nt=0;
function music(){nt=AC.currentTime+.1;setInterval(()=>{if(AC.state!=='running'||paused)return;const sd=60/(108+Math.max(0,speed-12)*1.6)/4;if(nt<AC.currentTime)nt=AC.currentTime;
 while(nt<AC.currentTime+.25){const i=stp%16,bar=(stp>>4)%4;
  if(i%4===0)tone(130,nt,.18,'sine',.55,38);
  if(i%2===0)tone(BASS[(stp>>1)%8]*(bar>1?1.12:1),nt,sd*1.8,'sawtooth',.13);
  if(state!=='over')tone(ARP[stp%8]*(bar%2?1.5:1),nt,sd*.9,'triangle',.07);
  if(i%4===2)tone(7000,nt,.04,'square',.025);
  nt+=sd;stp++}},80)}
function hit(o){if(p.inv>0)return;if(p.shield){p.shield=false;p.inv=1;o.visible=false;S('hit');shake=.3;burst(p.x,1.2,0,25,.3,.9,1)}else die()}

// ---------- estado do jogo ----------
let state='menu',speed=12,dist=0,coins=0,score=0,last=0,shake=0,ph=0;
const p={lane:1,x:0,y:0,vy:0,slide:0,shield:false,mag:0,inv:0};
function reset(){segs.forEach((s,i)=>{s.position.z=L-i*L;fill(s,i<3)});Object.assign(p,{lane:1,x:0,y:0,vy:0,slide:0,shield:false,mag:0,inv:0});speed=16;dist=coins=score=0}
function start(){initAudio();if(AC&&AC.state!=='running')AC.resume();if(mg)mg.gain.value=muted?0:.5;reset();paused=false;$('pausep').classList.add('hidden');state='play';$('menu').classList.add('hidden');$('over').classList.add('hidden');$('hud').classList.remove('hidden')}
function die(){if(state!=='play')return;state='over';shake=.6;burst(p.x,1.2,0,40,1,.2,.7);S('hit');try{navigator.vibrate(80)}catch(e){}if(mg)mg.gain.value=muted?0:.15;$('pw').textContent='';pwT='';if(score>best){best=score;try{localStorage.setItem('nr_best',best)}catch(e){}$('newrec').classList.remove('hidden')}else $('newrec').classList.add('hidden');
 $('best').textContent=$('best2').textContent=best;$('fs').textContent=score;$('fd').textContent=(dist|0)+' m';$('fc').textContent=coins;
 setTimeout(()=>{$('over').classList.remove('hidden');$('hud').classList.add('hidden')},700)}
$('play').onclick=start;$('retry').onclick=start;
function act(a){if(state!=='play'||paused)return;
 if(a==='l')p.lane=Math.max(0,p.lane-1);else if(a==='r')p.lane=Math.min(2,p.lane+1);
 else if(a==='u'&&p.y<.05){p.vy=11.5;p.slide=0;S('jump')}
 else if(a==='d'){if(p.y>.05)p.vy=-22;else{p.slide=.75;S('slide')}}}
let sx,sy,done=true;
addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;done=false},{passive:true});
addEventListener('touchmove',e=>{e.preventDefault();if(done)return;const dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;
 if(Math.hypot(dx,dy)<26)return;done=true;act(Math.abs(dx)>Math.abs(dy)?(dx<0?'l':'r'):(dy<0?'u':'d'))},{passive:false});
addEventListener('keydown',e=>{const m={ArrowLeft:'l',a:'l',ArrowRight:'r',d:'r',ArrowUp:'u',w:'u',' ':'u',ArrowDown:'d',s:'d'}[e.key];if(m){act(m);e.preventDefault()}});

function update(dt){
 if(paused)return;
 const play=state==='play';
 if(state==='over')speed=Math.max(0,speed-60*dt);else if(play)speed=Math.min(40,speed+.4*dt);else speed=12;
 const d=speed*dt;
 for(const s of segs){s.position.z+=d;if(s.position.z>L+8){s.position.z-=N*L;fill(s,false)}
  for(const c of s.coins){c.rotation.y+=dt*4;if(p.mag>0&&c.visible){const wz=s.position.z+c.position.z;if(wz<2&&wz>-14){const k=Math.min(1,dt*8);c.position.x+=(p.x-c.position.x)*k;c.position.y+=(p.y+1-c.position.y)*k}}}
  if(s.pu.visible){s.pu.rotation.y+=dt*3;s.pu.position.y=1.3+Math.sin(ph*.7)*.2}}
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
   for(const o of s.obs){if(!o.visible)continue;const wz=s.position.z+o.position.z;if(Math.abs(wz)>(o.userData.d||.5)+.3||Math.abs(o.position.x-p.x)>1.05)continue;
    const t=o.userData.t;if(t==='low'?p.y<1:t==='high'?(top>1.3&&p.y<2.1):p.y<3.4)hit(o)}
   for(const c of s.coins){if(!c.visible)continue;const wz=s.position.z+c.position.z;if(Math.abs(wz)<1&&Math.abs(c.position.x-p.x)<1.1&&Math.abs(c.position.y-(p.y+(sl?.5:1)))<1.3){c.visible=false;coins++;S('coin');burst(c.position.x,c.position.y,wz,6,1,.8,.2)}}}
  for(const s of segs){const u=s.pu;if(u.visible&&Math.abs(s.position.z+u.position.z)<1.2&&Math.abs(u.position.x-p.x)<1.2&&p.y<2.4){u.visible=false;S('power');burst(u.position.x,1.3,s.position.z+u.position.z,14,.5,.9,1);if(u.userData.t==='shield')p.shield=true;else p.mag=8}}
  p.mag=Math.max(0,p.mag-dt);p.inv=Math.max(0,p.inv-dt);shM.visible=p.shield;if(p.shield)shM.rotation.y+=dt*2;
  const pw=(p.shield?'ESCUDO  ':'')+(p.mag>0?'ÍMÃ '+Math.ceil(p.mag)+'s':'');if(pw!==pwT){pwT=pw;$('pw').textContent=pw}
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
 for(let i=0;i<BN;i++){if(bl[i]<=0)continue;bl[i]-=dt;const k=i*3;bp[k]+=bv[k]*dt;bp[k+1]+=bv[k+1]*dt;bp[k+2]+=bv[k+2]*dt+d;bv[k+1]-=12*dt;if(bl[i]<=0)bp[k+1]=-100}
 bg.attributes.position.needsUpdate=true;bg.attributes.color.needsUpdate=true;
 for(let i=0;i<RN;i++){const k=i*6;rp[k+1]-=40*dt;rp[k+2]+=d;if(rp[k+1]<0||rp[k+2]>8){rp[k]=(Math.random()-.5)*30;rp[k+1]=6+Math.random()*10;rp[k+2]=-Math.random()*80}rp[k+3]=rp[k];rp[k+4]=rp[k+1]+.9;rp[k+5]=rp[k+2]}
 rg.attributes.position.needsUpdate=true;
}
function loop(t){const dt=Math.min((t-last)/1000||.016,.05);last=t;update(dt);adapt(dt);draw(t);requestAnimationFrame(loop)}
function setPause(v){if(state!=='play')return;paused=v;$('pausep').classList.toggle('hidden',!v);if(AC)v?AC.suspend():AC.resume()}
$('bp').onclick=()=>setPause(!paused);$('resume').onclick=()=>setPause(false);
$('bm').onclick=()=>{muted=!muted;if(mg)mg.gain.value=muted?0:.5;$('bm').textContent=muted?'SOM OFF':'SOM ON'};
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true)});
addEventListener('keydown',e=>{if(e.key==='p'||e.key==='Escape')setPause(!paused)});
reset();state='menu';requestAnimationFrame(loop);
})();
