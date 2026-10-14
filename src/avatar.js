/* An articulated SVG cartoon in the portfolio world. */
const VECTORS = import.meta.glob(['./vector-png/*.png', '!./vector-png/head*.png'], { query: '?url', import: 'default', eager: true });
// The two faces are embedded in the script itself, so the head can never fail to load over the network.
const FACES = import.meta.glob('./vector-png/head*.png', { query: '?inline', import: 'default', eager: true });
export function createAvatar(THREE, hooks = {}) {
  const say = hooks.say || (() => {});
  const anchor = new THREE.Group();
  const mat = (color, roughness=.8, extra={}) => new THREE.MeshStandardMaterial({color,roughness,...extra});
  const cream=mat('#f8f5e7'), blue=mat('#315ced'), lime=mat('#d4ed80'), dark=mat('#243443');
  const seam=dark;
  function mesh(geometry,material,parent,position=[0,0,0]) {
    const object=new THREE.Mesh(geometry,material); object.position.set(...position); parent.add(object); return object;
  }
  const sphereGeometry=new THREE.SphereGeometry(1,24,18);
  const ball=(material,parent,position,scale)=>{const object=mesh(sphereGeometry,material,parent,position);object.scale.set(...scale);return object;};
  const box=(material,parent,position,size)=>mesh(new THREE.BoxGeometry(...size),material,parent,position);
  const root=new THREE.Group(); anchor.add(root);
  const body=new THREE.Group(); root.add(body);
  const unit=3.2/870;
  /** Pre-rendered PNG parts (made from the SVG sources in ./vector), loaded with retries so no part can stay missing. */
  const loader=new THREE.TextureLoader();
  function load(name) {
    const url=VECTORS[`./vector-png/${name}.png`]||FACES[`./vector-png/${name}.png`];
    const texture=new THREE.Texture(); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=4;
    const fetchPart=attempt=>{
      const img=new Image();
      img.onload=()=>{ texture.image=img; texture.needsUpdate=true; texture.userData.ready=true; hooks.invalidate?.(); };
      img.onerror=()=>{ if(attempt<5) setTimeout(()=>fetchPart(attempt+1),350*attempt); else console.warn('Could not load avatar part',name); };
      img.src=attempt?url+'?r='+attempt:url;
    };
    fetchPart(0); return texture;
  }
  function place(name,bounds,parent,pivot,z=0) {
    const [x,y,w,h]=bounds, texture=load(name);
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.02,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
    return mesh(new THREE.PlaneGeometry(w*unit,h*unit),material,parent,[(x+w/2-pivot[0])*unit,(pivot[1]-y-h/2)*unit,z]);
  }
  function joint(parent,point,origin) {
    const group=new THREE.Group();group.position.set((point[0]-origin[0])*unit,(origin[1]-point[1])*unit,0);parent.add(group);return group;
  }
  const origin=[230,890];
  // A god-of-thunder build: broader chest, wider cape, heavier arms and steel pauldrons.
  const BULK=1.16;
  const cape=joint(body,[230,322],origin); place('cape',[100,315,260,500],cape,[230,322],-.06).scale.x=1.18;
  place('torso',[130,275,200,342],body,origin,.05).scale.x=BULK;
  const head=joint(body,[230,283],origin);
  const headArt=place('head',[108,8,245,290],head,[230,283],.12);
  const headBlink=place('head-blink',[108,8,245,290],head,[230,283],.121); headBlink.visible=false; headBlink.renderOrder=6; headArt.renderOrder=5;
  // Layered steel shoulder plates, drawn in the same outlined style as the PNG parts (right side; mirrored for the left).
  const pauldronTexture=(()=>{
    const c=document.createElement('canvas'); c.width=256; c.height=200; const g=c.getContext('2d');
    g.lineJoin='round'; g.lineWidth=7; g.strokeStyle='#1b2232';
    const lame=(y,w,h,top,bottom)=>{
      const grad=g.createLinearGradient(0,y,0,y+h); grad.addColorStop(0,top); grad.addColorStop(1,bottom);
      g.fillStyle=grad; g.beginPath(); g.moveTo(128-w,y+h*.75); g.quadraticCurveTo(128-w*.9,y-h*.35,128,y); g.quadraticCurveTo(128+w*.9,y-h*.35,128+w,y+h*.75);
      g.quadraticCurveTo(128,y+h*1.15,128-w,y+h*.75); g.closePath(); g.fill(); g.stroke();
    };
    lame(118,104,64,'#5b6577','#2c3444'); lame(84,112,66,'#6f7a8d','#353e50'); lame(36,118,78,'#c9d2df','#6c7688');
    g.strokeStyle='rgba(255,255,255,.55)'; g.lineWidth=5; g.beginPath(); g.moveTo(58,64); g.quadraticCurveTo(120,26,196,60); g.stroke();
    for(const [x,y] of [[50,100],[206,100],[128,62]]) { g.fillStyle='#dfe6f0'; g.strokeStyle='#1b2232'; g.lineWidth=4; g.beginPath(); g.arc(x,y,9,0,7); g.fill(); g.stroke(); }
    const texture=new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace; return texture;
  })();
  const arms=[],elbows=[],hands=[],legs=[],knees=[];
  for(const side of [-1,1]) {
    const left=side<0, name=left?'left':'right';
    const shoulderPoint=[left?142:318,347], elbowPoint=[left?118:342,468], handPoint=[left?112:348,574];
    const shoulder=joint(body,shoulderPoint,origin);arms.push(shoulder);
    shoulder.position.x+=(shoulderPoint[0]-230)*(BULK-1)*unit;
    place(`${name}-upper`,[left?101:288,326,73,154],shoulder,shoulderPoint,.015).scale.x=1.28;
    const pauldron=mesh(new THREE.PlaneGeometry(.4,.3),new THREE.MeshBasicMaterial({map:pauldronTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}),shoulder,[side*.05,-.03,.032]);
    pauldron.rotation.z=-side*.3; pauldron.scale.x=side<0?-1:1;
    const elbow=joint(shoulder,elbowPoint,shoulderPoint);elbows.push(elbow);
    place(`${name}-forearm`,[left?92:313,452,59,131],elbow,elbowPoint,.022).scale.x=1.2;
    const hand=joint(elbow,handPoint,elbowPoint);hands.push(hand);
    place(`${name}-hand`,[left?81:323,566,56,73],hand,handPoint,.04).scale.setScalar(1.1);
    const hipPoint=[left?191:269,590], kneePoint=[left?191:269,722];
    const leg=joint(body,hipPoint,origin);legs.push(leg);
    place(`${name}-thigh`,[left?150:231,571,79,167],leg,hipPoint,0).scale.x=1.12;
    const knee=joint(leg,kneePoint,hipPoint);knees.push(knee);
    place(`${name}-shin`,[left?118:234,713,108,185],knee,kneePoint,.005);
  }

  // Mjolnir hangs from the right hand whenever the hand is free.
  const hammerArt=place('hammer',[298,584,100,170],hands[1],[348,574],.015);
  const hammerHead=joint(hands[1],[348,722],[348,574]), chest=joint(body,[230,430],origin);
  const HAMMER_AWAY=new Set(['wave','dance','jump','spin','stretch','celebrate','flex','code','coffee','think','hero','clap','shrug','salute','pointR']);
  const pokes={};
  // A small working prop appears only in the relevant chapters.
  const tablet = new THREE.Group(); tablet.position.set(-.02, .05, .03); hands[0].add(tablet);
  box(dark, tablet, [0, 0, 0], [.36, .48, .008]); box(new THREE.MeshBasicMaterial({ color: '#2a6cff' }), tablet, [0, .01, .005], [.31, .40, .004]);
  for (let i = 0; i < 3; i++) box(new THREE.MeshBasicMaterial({ color: '#4de6ff' }), tablet, [-.015, .1 - i * .075, .008], [.19 - i * .025, .015, .002]);
  tablet.rotation.set(0, 0, 2.9); tablet.visible = false;
  const idea = new THREE.Group(); idea.position.set(.6, 2.48, .07); body.add(idea);
  mesh(new THREE.IcosahedronGeometry(.15, 0), lime, idea); idea.visible = false;
  // Soft contact shadow follows the feet without an expensive shadow pass.
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d'); const gradient = ctx.createRadialGradient(64, 64, 5, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,4,20,.4)'); gradient.addColorStop(1, 'rgba(0,4,20,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const shadow = mesh(new THREE.PlaneGeometry(1.8, .75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }), anchor, [0, .035, .02]); shadow.rotation.x = -Math.PI / 2;

  // Travelling is a hoverboard glide: a front-facing drawing cannot walk sideways convincingly.
  const board=new THREE.Group(); anchor.add(board); board.visible=false;
  { const top=new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.05,40),new THREE.MeshBasicMaterial({color:'#101a33'})); top.position.y=.04; board.add(top);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.025,8,48),new THREE.MeshBasicMaterial({color:'#35e6ff'})); ring.rotation.x=Math.PI/2; ring.position.y=.07; board.add(ring);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.9,40),new THREE.MeshBasicMaterial({color:'#35e6ff',transparent:true,opacity:.25,depthWrite:false})); glow.rotation.x=-Math.PI/2; glow.position.y=.005; board.add(glow); board.userData={glow}; }
  // ---- Props for the activities ------------------------------------------------------------
  const glyphTexture=(text,color,font='700 84px sans-serif')=>{
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.font=font; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=color; g.fillText(text,64,68);
    const texture=new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace; return texture;
  };
  const floater=(texture,size)=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false})); s.scale.set(size,size,1); s.visible=false; anchor.add(s); return s;
  };
  const sunglasses=new THREE.Group(); head.add(sunglasses); sunglasses.visible=false;
  { const r=(w,h,k)=>{const sh=new THREE.Shape();sh.moveTo(-w+k,-h);sh.lineTo(w-k,-h);sh.quadraticCurveTo(w,-h,w,-h+k);sh.lineTo(w,h-k);sh.quadraticCurveTo(w,h,w-k,h);sh.lineTo(-w+k,h);sh.quadraticCurveTo(-w,h,-w,h-k);sh.lineTo(-w,-h+k);sh.quadraticCurveTo(-w,-h,-w+k,-h);return sh;};
    const lens=new THREE.ShapeGeometry(r(.112,.07,.03)), rim=new THREE.ShapeGeometry(r(.124,.082,.034));
    for(const side of [-1,1]){ const o=mesh(rim,new THREE.MeshBasicMaterial({color:'#0b1018'}),sunglasses,[side*.168,.395,.16]); const l=mesh(lens,new THREE.MeshBasicMaterial({color:'#1c2a44'}),sunglasses,[side*.168,.395,.165]); const sh=mesh(new THREE.PlaneGeometry(.08,.02),new THREE.MeshBasicMaterial({color:'#7fb5ff',transparent:true,opacity:.5}),sunglasses,[side*.168-.03,.42,.17]); sh.rotation.z=.4; void o; void l; }
    mesh(new THREE.PlaneGeometry(.1,.03),new THREE.MeshBasicMaterial({color:'#0b1018'}),sunglasses,[0,.42,.162]); }
  const mug=new THREE.Group(); mug.visible=false; anchor.add(mug);
  mesh(new THREE.CylinderGeometry(.062,.056,.125,20),cream,mug);
  mesh(new THREE.CylinderGeometry(.0635,.0635,.035,20),blue,mug,[0,-.012,0]);
  mesh(new THREE.CylinderGeometry(.05,.05,.01,20),mat('#4a2f22',.35),mug,[0,.056,0]);
  const handle=mesh(new THREE.TorusGeometry(.036,.011,8,16,Math.PI),cream,mug,[.062,0,0]); handle.rotation.z=-Math.PI/2;
  const puff=document.createElement('canvas'); puff.width=puff.height=64; const pg=puff.getContext('2d');
  const puffGradient=pg.createRadialGradient(32,32,2,32,32,30); puffGradient.addColorStop(0,'rgba(255,255,255,.85)'); puffGradient.addColorStop(1,'rgba(255,255,255,0)'); pg.fillStyle=puffGradient; pg.fillRect(0,0,64,64);
  const puffTexture=new THREE.CanvasTexture(puff);
  const steam=[0,1,2].map(()=>floater(puffTexture,.16));
  const notes=['♪','♫','♪','♫'].map((glyph,i)=>floater(glyphTexture(glyph,i%2?'#ffffff':'#dcf879'),.3));
  // ---- Lightning ---------------------------------------------------------------------------
  // Bolts are ribbons in the picture plane: a hot white core over a wide cyan glow, re-jagged many times a second.
  const BOLT_PTS=12, zap=new THREE.Group(); anchor.add(zap);
  const additive=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
  const coreMat=additive('#f4feff',1), glowMat=additive('#38c8ff',.35);
  const ribbon=(material,order)=>{
    const geometry=new THREE.BufferGeometry(), index=[];
    for(let p=0;p<BOLT_PTS-1;p++){ const a=p*2; index.push(a,a+1,a+2,a+1,a+3,a+2); }
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(BOLT_PTS*6),3)); geometry.setIndex(index);
    const m=new THREE.Mesh(geometry,material); m.frustumCulled=false; m.renderOrder=order; m.visible=false; zap.add(m); return m;
  };
  const bolts=Array.from({length:18},()=>({core:ribbon(coreMat,12),glow:ribbon(glowMat,11)}));
  const path=Array.from({length:BOLT_PTS},()=>new THREE.Vector2());
  /** Lay a jagged bolt from (ax,ay) to (bx,by); `jag` is the sideways wander as a share of its length. */
  function shapeBolt(bolt,ax,ay,bx,by,jag,width,z) {
    const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
    let off=0;
    for(let i=0;i<BOLT_PTS;i++) {
      const k=i/(BOLT_PTS-1); off=i===0?0:off*.4+(Math.random()-.5)*jag*len;
      path[i].set(ax+dx*k+nx*off,ay+dy*k+ny*off);
    }
    for(const [rib,w] of [[bolt.core,width],[bolt.glow,width*5]]) {
      const p=rib.geometry.attributes.position.array;
      for(let i=0;i<BOLT_PTS;i++) {
        const a=path[Math.max(0,i-1)], c=path[Math.min(BOLT_PTS-1,i+1)], tx=c.x-a.x, ty=c.y-a.y, tl=Math.hypot(tx,ty)||1;
        const half=w*.5*(1-i/(BOLT_PTS-1)*.8), ox=-ty/tl*half, oy=tx/tl*half;
        p[i*6]=path[i].x+ox; p[i*6+1]=path[i].y+oy; p[i*6+2]=z; p[i*6+3]=path[i].x-ox; p[i*6+4]=path[i].y-oy; p[i*6+5]=z;
      }
      rib.geometry.attributes.position.needsUpdate=true; rib.visible=true;
    }
  }
  const flareCanvas=document.createElement('canvas'); flareCanvas.width=flareCanvas.height=128;
  { const g=flareCanvas.getContext('2d'), r=g.createRadialGradient(64,64,0,64,64,64);
    r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.18,'rgba(170,240,255,.85)'); r.addColorStop(.5,'rgba(60,170,255,.25)'); r.addColorStop(1,'rgba(40,120,255,0)');
    g.fillStyle=r; g.fillRect(0,0,128,128); }
  const flareTexture=new THREE.CanvasTexture(flareCanvas);
  const flare=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTexture,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  flare.renderOrder=13; zap.add(flare);
  const zapLight=new THREE.PointLight(0x8fe4ff,0,10,1.3); zap.add(zapLight);
  // Eyes glow electric while the storm is up.
  const eyes=[-1,1].map(side=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:flareTexture,color:'#9ff0ff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    s.position.set(side*.152,.405,.2); s.scale.setScalar(.2); s.renderOrder=13; head.add(s); return s;
  });
  let burstAt=-1e9, nextBurst=Math.max(performance.now()+1800,4200), lastZap=0;
  const tipPoint=new THREE.Vector3(), chestPoint=new THREE.Vector3();
  const CONFETTI=56, confettiPos=new Float32Array(CONFETTI*3), confettiColor=new Float32Array(CONFETTI*3), confettiVel=new Float32Array(CONFETTI*3);
  const confettiGeometry=new THREE.BufferGeometry();
  confettiGeometry.setAttribute('position',new THREE.BufferAttribute(confettiPos,3)); confettiGeometry.setAttribute('color',new THREE.BufferAttribute(confettiColor,3));
  const confetti=new THREE.Points(confettiGeometry,new THREE.PointsMaterial({size:7,sizeAttenuation:false,vertexColors:true,transparent:true,depthWrite:false}));
  confetti.frustumCulled=false; confetti.visible=false; anchor.add(confetti);
  let confettiAt=-1e9;
  function burst(time) {
    confettiAt=time; confetti.visible=true;
    const colors=['#dcf879','#ffffff','#ff9d5c','#7da2ff','#ff7a9c'].map(c=>new THREE.Color(c));
    for(let i=0;i<CONFETTI;i++) {
      confettiPos.set([(Math.random()-.5)*.5,3.1,.45],i*3);
      confettiVel.set([(Math.random()-.5)*2.6,1.4+Math.random()*2,(Math.random()-.5)*.6],i*3);
      colors[i%colors.length].toArray(confettiColor,i*3);
    }
    confettiGeometry.attributes.color.needsUpdate=true;
  }
  // A floating code window beside the head, typed out character by character.
  const codeCanvas=document.createElement('canvas'); codeCanvas.width=360; codeCanvas.height=240; const cg=codeCanvas.getContext('2d');
  const codeTexture=new THREE.CanvasTexture(codeCanvas); codeTexture.colorSpace=THREE.SRGBColorSpace;
  const holo=mesh(new THREE.PlaneGeometry(1,.667),new THREE.MeshBasicMaterial({map:codeTexture,transparent:true}),anchor,[.86,3.02,.55]); holo.rotation.y=-.22; holo.visible=false;
  const codeLines=[
    [['function ','#ff9d5c'],['ship','#dcf879'],['(f) {','#e8edff']],
    [['  const ','#ff9d5c'],['s = ','#e8edff'],['refine','#dcf879'],['(f);','#e8edff']],
    [['  if ','#ff9d5c'],['(!s.ready) {','#e8edff']],
    [['    return ','#ff9d5c'],['ask','#dcf879'],['("why?");','#e8edff']],
    [['  }','#e8edff']],
    [['  return ','#ff9d5c'],['sprint.add(s);','#e8edff']],
    [['}','#e8edff']]
  ];
  const codeLength=codeLines.reduce((sum,line)=>sum+line.reduce((n,[text])=>n+text.length,0),0);
  let codeShown=-1;
  function drawCode(count) {
    if(count===codeShown) return; codeShown=count;
    cg.clearRect(0,0,360,240);
    cg.fillStyle='rgba(12,22,66,.94)'; cg.beginPath(); cg.roundRect(4,4,352,232,16); cg.fill();
    cg.strokeStyle='#dcf879'; cg.lineWidth=3; cg.stroke();
    ['#ff7a7a','#ffd36b','#7be08c'].forEach((c,i)=>{ cg.fillStyle=c; cg.beginPath(); cg.arc(24+i*18,24,5,0,7); cg.fill(); });
    cg.font='700 19px Consolas, "Courier New", monospace'; cg.textBaseline='alphabetic';
    let left=count, y=66;
    for(const line of codeLines) {
      let x=20;
      for(const [text,color] of line) {
        const part=text.slice(0,Math.max(0,left)); left-=text.length;
        cg.fillStyle=color; cg.fillText(part,x,y); x+=cg.measureText(text).width;
        if(left<0) break;
      }
      y+=25; if(left<0) { cg.fillStyle='#dcf879'; cg.fillRect(x+2,y-42,10,21); break; }
    }
    codeTexture.needsUpdate=true;
  }

  // ---- Activities --------------------------------------------------------------------------
  // Each activity writes the pose it wants into P; the render loop eases the rig towards it.
  // t = clock seconds, e = seconds since the activity started. `persist` activities hold for a whole chapter.
  const REST={reach:1,lz:-.06,rz:.06,lx:0,rx:0,le:.1,re:-.1,lex:0,rex:0,y:0,roll:0,lean:0,spin:0,yawOff:0,hx:0,hy:0,hz:0,look:1,legL:0,legR:0,kneeL:0,kneeR:0,tablet:0,idea:0,mug:0,mugTilt:0,holo:0,notes:0,thunder:0};
  const smooth=(a,b,x)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};
  const ACT={
    wave:{dur:3,pose(t,e,P){const k=smooth(0,.35,e);P.rz=(.1+1.95*k);P.rx=-.1;P.rex=0;P.re=(.35+Math.sin(t*8)*.42)*k;P.lz=-.12;P.hz=Math.sin(t*3)*.04*k;P.hy=.1*k;P.hx=-.04*k;}},
    present:{persist:true,pose(t,e,P){P.lz=-.34;P.lx=-.6;P.le=-.45;P.rz=.72;P.rx=-.28;P.re=.3;}},
    build:{persist:true,pose(t,e,P){ ACT.present.pose(t,e,P);P.idea=1;}},
    point:{persist:true,pose(t,e,P){P.lz=-1.05;P.lx=-.45;P.le=-.12;P.lex=-.15;P.rz=.14;P.hz=-.04;P.hy=-.12;}},
    think:{persist:true,pose(t,e,P){P.rz=.5;P.rx=-1;P.re=1.75;P.hx=-.07;P.hz=.12;}},
    celebrate:{dur:3,start:burst,pose(t,e,P){P.lz=-1-Math.sin(t*6)*.1;P.rz=1+Math.sin(t*6)*.1;P.y=Math.abs(Math.sin(t*6))*.05;}},
    dance:{dur:5.5,pose(t,e,P){
      const beat=t*6.2, s=Math.sin(beat), fade=smooth(0,.4,e)*smooth(5.5,5.1,e);
      P.y=Math.abs(s)*.075*fade;P.roll=s*.07*fade;P.yawOff=Math.sin(beat*.5)*.55*fade;
      P.lz=-1.15-s*.6*fade;P.rz=1.15-s*.6*fade;P.le=-.5*fade;P.re=.5*fade;
      P.legL=s*.22*fade;P.legR=-s*.22*fade;P.kneeL=Math.max(0,s)*.5*fade;P.kneeR=Math.max(0,-s)*.5*fade;
      P.hz=s*.12*fade;P.hx=Math.sin(beat*2)*.05*fade;P.look=.3;P.notes=1;
    }},
    code:{dur:6.5,pose(t,e,P){
      const k=smooth(0,.5,e)*smooth(6.5,6,e);
      P.lx=-.62*k+Math.sin(t*15)*.07*k;P.rx=-.62*k+Math.sin(t*15+2)*.07*k;P.lex=-1.0*k;P.rex=-1.0*k;P.lz=-.16;P.rz=.16;
      P.hy=.32*k;P.hx=.08*k;P.look=0;P.holo=1;P.lean=.04*k;
    }},
    coffee:{dur:6,pose(t,e,P){
      const up=smooth(0,.8,e)*smooth(6,5.2,e), sip=smooth(.9,1.5,e%2.6)*smooth(2.6,2.0,e%2.6)*up;
      P.rx=-1.2*up;P.rex=-1.7*up;P.rz=.14+.08*up;P.lz=-.5*up-.1;P.le=1.35*up;
      P.hx=-.1*sip;P.hz=.05*up;P.mug=1;P.mugTilt=1.0*sip;P.look=.4;
    }},
    hop:{dur:.9,pose(t,e,P){const air=Math.sin(Math.PI*Math.min(1,e/.8));P.y=air*.3;P.lz=-.4-air*1.6;P.rz=.4+air*1.6;P.kneeL=P.kneeR=(1-air)*.2;}},
    jump:{dur:3,pose(t,e,P){
      const cycle=e/.85, air=Math.sin(Math.PI*(cycle%1)), landing=Math.pow(1-air,3), on=cycle<3?1:0;
      P.y=(air*.32-landing*.1)*on;P.lz=-.3-air*2.4*on;P.rz=.3+air*2.4*on;
      P.kneeL=P.kneeR=landing*.55*on;P.legL=P.legR=-landing*.25*on;P.hz=Math.sin(cycle*6)*.02;
    }},
    flex:{dur:3.4,pose(t,e,P){
      const k=smooth(0,.35,e)*smooth(3.4,3,e), pulse=1+Math.sin(t*7)*.06;
      P.lz=-1.5*k-.1;P.rz=1.5*k+.1;P.le=-1.75*pulse*k;P.re=1.75*pulse*k;P.y=Math.abs(Math.sin(t*3.5))*.025*k;P.hz=Math.sin(t*3.5)*.06*k;P.look=.4;
    }},
    spin:{dur:2.2,pose(t,e,P){
      P.spin=smooth(0,1.1,e)*Math.PI*2;P.lz=-.9;P.rz=.9;P.y=Math.sin(Math.PI*Math.min(1,e/1.1))*.06;
      const wobble=smooth(1.1,1.2,e)*smooth(2.2,1.4,e);P.hz=Math.sin(t*11)*.14*wobble;P.roll=Math.sin(t*9)*.05*wobble;
    }},
    stretch:{dur:3.6,pose(t,e,P){
      const k=Math.sin(Math.min(1,e/3.6)*Math.PI);
      P.lz=-.1-2.7*k;P.rz=.1+2.7*k;P.lean=-.12*k;P.hx=-.25*k;P.look=0;
    }},
    boop:{dur:1.3,pose(t,e,P){
      const k=smooth(0,.1,e)*smooth(1.3,.5,e);
      P.hx=-.22*k;P.lz=-.55*k-.1;P.rz=.55*k+.1;P.le=-.6*k;P.re=.6*k;P.y=.04*k;P.look=.2;
    }}
  };
  // Flat-rig poses: shoulder (lz/rz) and elbow (le/re) rotate in the picture plane.
  // Left arm: negative lz swings out, positive le folds the forearm in. The right arm mirrors it.
  Object.assign(ACT,{
    present:{persist:true,pose(t,e,P){P.lz=-.85;P.le=-1.25;P.rz=.22;P.re=-.5;P.hz=.03;}},
    build:{persist:true,pose(t,e,P){ACT.present.pose(t,e,P);P.idea=1;}},
    point:{persist:true,pose(t,e,P){P.lz=-1.3;P.le=-.05;P.rz=.1;P.re=-.12;P.hz=-.04;P.hy=-.12;}},
    think:{persist:true,pose(t,e,P){P.lz=-.07;P.le=.12;P.rz=.55;P.re=-2.65;P.hz=.1;}},
    celebrate:{dur:3,start:burst,pose(t,e,P){P.lz=-2.5-Math.sin(t*6)*.15;P.rz=2.5+Math.sin(t*6)*.15;P.le=-.2;P.re=.2;P.y=Math.abs(Math.sin(t*6))*.05;}},
    dance:{dur:5.5,pose(t,e,P){
      const beat=t*6.2, s=Math.sin(beat), fade=smooth(0,.4,e)*smooth(5.5,5.1,e);
      P.y=Math.abs(s)*.075*fade;P.roll=s*.07*fade;
      P.lz=-1.6-s*.55*fade;P.rz=1.6-s*.55*fade;P.le=-.6*fade;P.re=.6*fade;
      P.legL=s*.22*fade;P.legR=-s*.22*fade;P.kneeL=Math.max(0,s)*.5*fade;P.kneeR=Math.max(0,-s)*.5*fade;
      P.hz=s*.12*fade;P.look=.3;P.notes=1;
    }},
    code:{dur:6.5,pose(t,e,P){
      const k=smooth(0,.5,e)*smooth(6.5,6,e), tap=Math.sin(t*16)*.07*k;
      P.lz=-.1;P.rz=.1;P.le=(1.75+tap)*k;P.re=(-1.75-Math.sin(t*16+2)*.07)*k;
      P.hy=.32*k;P.look=0;P.holo=1;P.hz=-.04*k;
    }},
    coffee:{dur:6,pose(t,e,P){
      const up=smooth(0,.8,e)*smooth(6,5.2,e), sip=smooth(.9,1.5,e%2.6)*smooth(2.6,2.0,e%2.6)*up;
      P.rz=.14+.4*up+.12*sip;P.re=-.1-1.9*up-.3*sip;P.lz=-.13;P.le=.22;
      P.hz=.05*sip;P.mug=1;P.mugTilt=.7*sip;P.look=.4;
    }},
    // Mjolnir raised overhead: lightning strikes down into it and explodes outwards.
    thunder:{dur:4,start:time=>{burstAt=time;},pose(t,e,P){
      const k=smooth(0,.35,e)*smooth(4,3.4,e), shake=Math.sin(t*38)*.02*k;
      P.rz=.1+2.95*k;P.re=-.12*k;P.lz=-.07-.55*k;P.le=-1.3*k;
      P.legL=-.35*k;P.legR=.35*k;P.y=Math.abs(shake);P.roll=shake;P.hz=-.05*k;P.look=0;P.thunder=k;
    }},
    flex:{dur:3.4,start:time=>{burstAt=time;},pose(t,e,P){
      const k=smooth(0,.35,e)*smooth(3.4,3,e), pulse=1+Math.sin(t*7)*.06;
      P.lz=-1.5*k-.07;P.rz=1.5*k+.07;P.le=-1.75*pulse*k;P.re=1.75*pulse*k;P.y=Math.abs(Math.sin(t*3.5))*.025*k;P.hz=Math.sin(t*3.5)*.06*k;P.look=.4;
    }},
    boop:{dur:1.3,pose(t,e,P){
      const k=smooth(0,.1,e)*smooth(1.3,.5,e);
      P.lz=-.9*k-.07;P.rz=.9*k+.07;P.le=-.5*k;P.re=.5*k;P.y=.04*k;P.hz=.12*Math.sin(t*20)*k;P.look=.2;
    }}
  });
  Object.assign(ACT,{
    // Hands on hips, chest out, feet planted wide.
    hero:{dur:4,pose(t,e,P){
      const k=smooth(0,.4,e)*smooth(4,3.5,e);
      P.lz=-.55*k-.07;P.le=1.5*k+.12*(1-k);P.rz=.55*k+.07;P.re=-1.5*k-.12*(1-k);
      P.legL=-.25*k;P.legR=.25*k;P.hz=-.04*k;P.look=.4;P.y=Math.sin(t*2)*.01*k;
    }},
    // Both hands meeting in front of the chest.
    clap:{dur:3.2,pose(t,e,P){
      const k=smooth(0,.3,e)*smooth(3.2,2.8,e), beat=Math.sin(t*15);
      P.lz=-.22;P.rz=.22;P.le=(1.55+beat*.32)*k;P.re=(-1.55-beat*.32)*k;P.y=Math.abs(Math.sin(t*7.5))*.03*k;P.look=.5;P.hz=Math.sin(t*7.5)*.03*k;
    }},
    // Arms out, palms up, a little head tilt: "no idea".
    shrug:{dur:2.6,pose(t,e,P){
      const k=smooth(0,.25,e)*smooth(2.6,2.2,e), pulse=.75+Math.sin(e*5)*.25;
      P.lz=-.5*k-.07;P.le=-.95*pulse*k;P.rz=.5*k+.07;P.re=.95*pulse*k;P.hz=.14*k;P.y=Math.abs(Math.sin(e*5))*.02*k;P.look=.3;
    }},
    // Pointing with the other arm, for stations whose set is on the side that arm faces.
    pointR:{persist:true,pose(t,e,P){P.rz=1.3;P.re=.05;P.lz=-.13;P.le=.22;P.hz=.04;P.hy=-.12;}},
    // A crisp salute with the free hand.
    salute:{dur:2.8,pose(t,e,P){
      const k=smooth(0,.3,e)*smooth(2.8,2.3,e);
      P.rz=.07+.9*k;P.re=-.12-3.65*k;P.reach=1+.25*k;P.lz=-.13;P.le=.22;P.hy=-.02*k;P.look=.2;P.y=.0;
    }}
  });
  const QUIPS={
    wave:['Hi there! 👋','Hello, hello! Welcome in.','Oh, a visitor! Hi! 👋'],
    dance:['Friday-sprint energy! 🕺','Zero bugs, all vibes.','Retro went well. Time to dance!','This one’s for the backlog. 🎶'],
    code:['Refining the story…','Just one more commit…','Works on my machine. 😅','Writing user stories… in code, apparently.'],
    coffee:['Backlog grooming fuel ☕','Coffee first, roadmap later.','Decaf? In this economy?','Fourth cup. Still estimating.'],
    thunder:['Bring the thunder! ⚡','Deadline? I am the storm.','Scope creep has been struck down.','Bugs fear the hammer. 🔨','By the power of Brain Station 23!'],
    jump:['Sprint goal achieved! 🙌','Up we go!','Velocity is up! 📈','Boing!'],
    flex:['Strong requirements. Stronger coffee.','Scope creep? Not today.','Those are well-groomed biceps.','Leg day? I do backlog day.'],
    spin:['Roadmap pivot! 🌀','Wheee!','Agile means I can turn on a dime.','Pivot, pivot, pivot!'],
    stretch:['Quick stretch between standups.','Hydrate. Stretch. Ship.','Standup: 15 minutes. Stretch: 3 seconds.'],
    celebrate:['Nice one! 🎉','Ship it! 🚀','Release day! 🎊'],
    boop:['Hey! Mind the glasses 😄','That’s my head, friend.','Boop received. 👀','Beard intact. Ego slightly bruised.'],
    hero:['Hands on hips. Ready for the sprint. 🦸','Assemble the requirements!','Stance: confident. Roadmap: clear.','Every product needs a hero. Hi!'],
    clap:['Well done! 👏','Applause for good requirements! 👏','Stakeholders approve. Clap clap!','Great question, by the way.'],
    shrug:['Not in the backlog… 🤷','Requirements unclear. Need more info.','Out of scope! Probably.','I’d have to check Jira. 🤷'],
    salute:['Aye aye, Product Owner! 🫡','Reporting for sprint duty.','Standup attendance: present.','At your service, visitor.']
  };
  // Reactions to being poked: each body part cycles through its own lines, and persistent poking escalates.
  const REACT={
    head:[['boop','Boop! 👀'],['boop','Hey, that’s my head.'],['shrug','Do I have something on my face?'],['spin','Okay okay, you win! 🌀'],['salute','Fine. Greetings, poker. 🫡']],
    arm:[['wave','High five! ✋'],['clap','Nice grip! 👏'],['flex','Feel that? Pure stakeholder management.'],['wave','Yes, I wave at everyone.']],
    body:[null,['hero','You can’t dent the armour. 🛡️'],['jump','Whoa! Tickles!'],['shrug','Was that a feature request?'],['dance','Fine, let’s dance. 🕺']],
    hammer:[['thunder','Only the worthy may lift Mjolnir… ⚡'],['thunder','Worthy! Okay, stand back!'],['flex','I can lift it. Can you?'],['thunder','You’ve got good taste in hammers. 🔨']]
  };
  const FUN=['dance','jump','flex','spin','coffee','code','thunder','wave','hero','clap','shrug','salute'];


  let act={name:'wave',start:performance.now(),until:performance.now()+3300};
  let turnAngle=0,narrow=1,manualFace=0,talkUntil=0,yaw=-.2,headX=0,headY=0,gazeX=0,gazeY=0,shadesOn=false,lastFun='';
  const P={...REST}, handPoint=new THREE.Vector3(), lerp=(a,b,t)=>a+(b-a)*t, pick=list=>list[Math.floor(Math.random()*list.length)];
  const api = {
    group: anchor, activities: Object.keys(ACT),
    /** Advance the rig. ctx: { dt, paused, walking, yaw, rest } */
    update(time, ctx) {
      const { dt, paused, walking } = ctx;
      const ease=paused?1:1-Math.exp(-dt*9), fast=paused?1:1-Math.exp(-dt*22);
      const moving=!paused&&walking;
      const live=!paused&&time<act.until;
      const name=live?act.name:ctx.rest, def=ACT[name];
      const t=time*.001, e=live?(time-act.start)/1000:t;
      Object.assign(P,REST);
      if(!paused&&def&&(live||def.persist)) def.pose(t,e,P);
      if(moving) { Object.assign(P,REST); P.look=.5; }
      else if(!paused&&!live&&!(def&&def.persist)&&time>=talkUntil) { P.lz=-.13; P.rz=.13; P.le=.22; P.re=-.22; }
      else if(!paused&&time<talkUntil&&!live) { P.lz=-.07; P.le=.12; P.rz=.55+Math.sin(t*3)*.06; P.re=-1.25+Math.sin(t*5.5)*.2; P.hz=Math.sin(t*2.4)*.03; }
      yaw=lerp(yaw,ctx.yaw+P.yawOff,ease); root.rotation.y=0;
      if(moving) manualFace=0;
      // Turning: the flat figure swings through an edge-on pose at a constant speed (angle 0 = facing right, PI = facing left),
      // so it never snaps, stalls or flips mid-frame.
      const faceTarget=manualFace||ctx.face||1, goal=faceTarget<0?Math.PI:0;
      if(paused) turnAngle=goal; else { const step=dt*Math.PI/.3; turnAngle+=Math.max(-step,Math.min(step,goal-turnAngle)); }
      narrow=lerp(narrow,moving?.92:1,paused?1:1-Math.exp(-dt*8));
      const spinScale=live&&name==='spin'?Math.max(.2,Math.abs(Math.cos(P.spin))):1;
      root.scale.x=(Math.cos(turnAngle)||.001)*narrow*spinScale;
      const look=paused?0:P.look;
      if(!Number.isFinite(head.rotation.z)) head.rotation.z=0; if(!Number.isFinite(head.position.x)||!Number.isFinite(head.position.y)) head.position.set(0,0,0);
      head.rotation.x=0;
      head.rotation.y=0;
      head.rotation.z=lerp(head.rotation.z,P.hz+headY*look*.18+(paused||moving?0:Math.sin(t*.6)*.02),ease);
      const calm=paused||moving?0:1;
      if(board.visible) body.position.y=Math.max(body.position.y,.08);
      const bob=paused?0:(moving?.1+Math.sin(t*5)*.02:Math.sin(t*2)*.009);
      body.position.y=lerp(body.position.y,bob+P.y,fast);
      body.position.x=lerp(body.position.x,calm*Math.sin(t*.45)*.012,ease);
      const breath=paused?0:Math.sin(t*1.7)*.008; body.scale.set(1+breath*.5,1+breath,1+breath*.5);
      body.rotation.y=0;
      body.rotation.z=lerp(body.rotation.z,moving?-.075:P.roll+calm*(.018+Math.sin(t*.45)*.01),ease);
      body.rotation.x=0;
      for(let i=0;i<2;i++) {
        arms[i].rotation.z=lerp(arms[i].rotation.z,(i?P.rz:P.lz)+(moving?(i?.55:-.55)*.4:0),ease);
        arms[i].rotation.x=0;
        { const reach=Math.abs((i?P.rz+P.re:P.lz+P.le)); arms[i].position.z=lerp(arms[i].position.z,reach>1.1?.13:0,ease); }
        elbows[i].rotation.z=lerp(elbows[i].rotation.z,i?P.re:P.le,ease);
        elbows[i].scale.y=lerp(elbows[i].scale.y,i?P.reach:1,ease);
        elbows[i].rotation.x=0;
        const stride=0;
        legs[i].rotation.x=0; legs[i].rotation.z=lerp(legs[i].rotation.z,moving?(i?.08:-.08):(i?P.legR:P.legL)*.45,ease);
        knees[i].rotation.x=0; knees[i].rotation.z=lerp(knees[i].rotation.z,moving?0:(i?P.kneeR:P.kneeL)*-.5,ease);
      }
      tablet.visible=!moving&&!!P.tablet; idea.visible=!moving&&!!P.idea;
      if(idea.visible) { idea.rotation.set(t*.5,t*.8,.2); idea.position.y=2.47+Math.sin(t*2)*.04; }
      sunglasses.visible=shadesOn;
      { const away=!moving&&HAMMER_AWAY.has(name)&&(live||(def&&def.persist)), raised=Math.abs(arms[1].rotation.z)+Math.abs(elbows[1].rotation.z); hammerArt.visible=!away&&raised<1.15; }
      cape.rotation.z=lerp(cape.rotation.z,paused?0:Math.sin(t*1.5)*.025+(moving?.22+Math.sin(t*5)*.04:0)+P.roll*.6,ease); cape.scale.x=paused?1:1+Math.sin(t*2.1)*.02+(moving?.05:0)+Math.max(0,body.position.y)*.4;
      // Lightning: a constant crackle on the hammer and over the body, a big burst every few seconds,
      // and during `thunder` bolts from the sky into the raised hammer.
      if(!paused&&!moving&&!live&&time>nextBurst) { burstAt=time; nextBurst=time+6500+Math.random()*5000; }
      const striking=!paused&&!moving&&P.thunder>.6;
      if(striking&&time-burstAt>1150) burstAt=time;
      const power=paused?0:Math.max(0,1-(time-burstAt)/750);
      if(time-lastZap>55||paused) {
        lastZap=time; let n=0;
        anchor.updateMatrixWorld(true);
        hammerHead.getWorldPosition(tipPoint); anchor.worldToLocal(tipPoint); chest.getWorldPosition(chestPoint); anchor.worldToLocal(chestPoint);
        const R=Math.random, hammerOn=hammerArt.visible, z=.3;
        if(!paused) {
          if(hammerOn) for(let i=0;i<3;i++) if(R()<.6) { const a=R()*Math.PI*2, L=.2+R()*.4; shapeBolt(bolts[n++],tipPoint.x,tipPoint.y,tipPoint.x+Math.cos(a)*L,tipPoint.y+Math.sin(a)*L,.45,.022,z); }
          if(R()<.45) { const x=(R()-.5)*1.3, y=.6+R()*2.2, a=R()*Math.PI*2, L=.25+R()*.35; shapeBolt(bolts[n++],x,y,x+Math.cos(a)*L,y+Math.sin(a)*L,.5,.016,z); }
          if(power>0||striking) {
            const src=striking&&hammerOn?tipPoint:chestPoint, count=striking?7:11, reach=striking?1.4:.7+power*1.9;
            for(let i=0;i<count&&n<bolts.length-2;i++) {
              const a=(i+R()*.7)/count*Math.PI*2, L=reach*(.55+R()*.6);
              shapeBolt(bolts[n++],src.x,src.y,src.x+Math.cos(a)*L*1.15,src.y+Math.sin(a)*L,.32,.036*(.6+Math.max(power,striking?.7:0)),z);
            }
          }
          if(striking&&hammerOn) for(let i=0;i<2;i++) shapeBolt(bolts[n++],tipPoint.x+(R()-.5)*2.4,tipPoint.y+5.5,tipPoint.x,tipPoint.y,.2,.055,z);
        }
        for(let i=n;i<bolts.length;i++) bolts[i].core.visible=bolts[i].glow.visible=false;
        const surge=Math.max(power,striking?.75+R()*.25:0), src=striking&&hammerOn?tipPoint:power>0?chestPoint:tipPoint;
        coreMat.opacity=.8+R()*.2; glowMat.opacity=.25+R()*.2+surge*.2;
        flare.position.set(src.x,src.y,z+.05); flare.scale.setScalar(surge>0?.7+surge*1.05+R()*.2:hammerOn?.5+R()*.25:0);
        flare.material.opacity=surge>0?.3+surge*.25:hammerOn?.3+R()*.2:0;
        zapLight.position.set(src.x,src.y,.8); zapLight.intensity=surge*(18+R()*10)+(hammerOn&&!paused?R()*1.5:0);
        eyes.forEach(eye=>{ eye.material.opacity=surge>0?Math.min(1,surge*1.4)*(.75+R()*.25):0; eye.scale.setScalar(.16+surge*.12); });
      }
      const showHolo=!moving&&!!P.holo; holo.visible=showHolo;
      if(showHolo) drawCode(Math.floor((e*20)%(codeLength+26)));
      const showMug=!moving&&!!P.mug; mug.visible=showMug;
      if(showMug) {
        anchor.updateMatrixWorld(true); hands[1].getWorldPosition(handPoint); anchor.worldToLocal(handPoint);
        mug.position.set(handPoint.x+.02,handPoint.y+.07,handPoint.z+.05); mug.rotation.z=P.mugTilt*.6;
        steam.forEach((puffSprite,i)=>{
          const phase=(t*.45+i/3)%1; puffSprite.visible=P.mugTilt<.3;
          puffSprite.position.set(mug.position.x+Math.sin(t*2+i*2)*.03,mug.position.y+.1+phase*.28,mug.position.z); puffSprite.material.opacity=Math.sin(phase*Math.PI)*.7;
        });
      } else steam.forEach(s=>{s.visible=false;});
      notes.forEach((note,i)=>{
        note.visible=!moving&&!!P.notes; if(!note.visible) return;
        const phase=(t*.42+i/notes.length)%1, side=i%2?1:-1;
        note.position.set(side*(.72+Math.sin(phase*6+i)*.1),2.1+phase*1.5,.6); note.material.opacity=Math.sin(phase*Math.PI);
      });
      const age=(time-confettiAt)/1000;
      if(confetti.visible) {
        if(age>2.6) confetti.visible=false;
        else {
          for(let i=0;i<CONFETTI;i++) { confettiVel[i*3+1]-=3.4*dt; confettiPos[i*3]+=confettiVel[i*3]*dt; confettiPos[i*3+1]+=confettiVel[i*3+1]*dt; confettiPos[i*3+2]+=confettiVel[i*3+2]*dt; }
          confettiGeometry.attributes.position.needsUpdate=true; confetti.material.opacity=Math.min(1,(2.6-age)*1.5);
        }
      }
      board.visible=moving; board.userData.glow.material.opacity=.2+Math.sin(t*6)*.06; board.scale.setScalar(moving?1+Math.sin(t*6)*.015:1); board.position.y=Math.max(0,body.position.y-.1)*0;
      const lift=Math.max(0,body.position.y); shadow.scale.setScalar(1-lift*.9); shadow.material.opacity=1-lift*1.4;
      const blink=!paused && time%4700<150 ? .12 : 1;
      const closed=blink<1&&headBlink.material.map.userData.ready&&headArt.material.map.userData.ready; headArt.visible=!closed; headBlink.visible=closed;
    },
    /** Start an activity immediately. */
    animatePose(name, seconds) {
      const now=performance.now(), def=ACT[name]; if(!def) return;
      act={name,start:now,until:now+(seconds??def.dur??3)*1000}; def.start?.(now);
    },
    /** Start an activity and show one of its quips. */
    play(name, quip=true) {
      if(!ACT[name]) return;
      if(!['boop','stretch','wave','hop','salute','shrug'].includes(name)) lastFun=name;
      if(quip&&QUIPS[name]) say(pick(QUIPS[name]));
      api.animatePose(name);
    },
    fun() { api.play(pick(FUN.filter(n=>n!==lastFun))); },
    setShades(on) { shadesOn=on; },
    /** Turn to face left (-1) or right (1) until he next walks. */
    turnTo(d) { manualFace=d; },
    aim(x,y) { if(!Number.isFinite(x)||!Number.isFinite(y)) return; headY=x*.55; headX=y*.28; gazeX=x; gazeY=-y; },
    headWorld(target) { head.getWorldPosition(target); return target.y+=1.05, target; },
    /** Which body part does this raycaster hit? */
    hit(raycaster) {
      const hits=raycaster.intersectObject(root,true), found=hits[0]; if(!found) return null;
      if(hammerArt.visible&&hits.some(h=>h.object===hammerArt)) return 'hammer';
      for(let o=found.object;o;o=o.parent) { if(o===head) return 'head'; if(arms.includes(o)) return 'arm'; }
      return 'body';
    },
    /** Poked on `part`: cycle that part's reactions; poking the same part again and again moves on to the cheekier ones. */
    react(part) {
      const list=REACT[part]; if(!list) return api.fun();
      const now=performance.now(), s=pokes[part]||(pokes[part]={n:0,at:0});
      s.n=now-s.at<6000?s.n+1:0; s.at=now;
      const entry=list[s.n%list.length];
      if(!entry) return api.fun();
      say(entry[1]); api.animatePose(entry[0]);
    },
    /** A random line for the current mood, shown without starting an activity. */
    chatter(lines) { say(pick(lines)); },
    isBusy(time) { return time<act.until; },
    talk(ms) { talkUntil=performance.now()+ms; },
    quips: QUIPS
  };
  return api;
}
