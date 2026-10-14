/* One local 3D character, articulated at the shoulders, elbows, hips, knees and neck. */
const companion = document.getElementById('companion');
const home = document.getElementById('companion-home');
const canvas = document.getElementById('avatar-3d');
const view = document.getElementById('companion-view');
const panel = document.getElementById('companion-panel');
const toggle = document.getElementById('companion-toggle');
const label = document.getElementById('companion-label');
const nextLink = document.getElementById('guide-next');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const chapters = [
  { id: 'hero', name: 'START HERE', label: 'Meet your guide', message: 'A quick look around? I’ll show you the work, the background, and the person behind it.', next: 'Start with my work', pose: 'wave' },
  { id: 'work', name: '01 / THE WORK', label: 'The work', message: 'SalesPro23 is our MSFA product’s next chapter. The projects below cover client delivery, development, and marketing too.', next: 'A bit about me', pose: 'present', quip: 'Here’s the work. Take your time.' },
  { id: 'about', name: '02 / THE PERSON', label: 'A bit about me', message: 'I studied CSE and started in development. That background still shapes how I work with product and engineering teams.', next: 'How I approach a problem', pose: 'wave', quip: 'A little about me…' },
  { id: 'approach', name: 'HOW I WORK', label: 'How I work', message: 'Ask, define, build. Try the three tabs to see how I go from business questions to a clear next step.', next: 'Follow my journey', pose: 'think', quip: 'Go on, try the tabs!' },
  { id: 'experiences', name: '03 / THE JOURNEY', label: 'My journey', message: 'From a developer internship to product ownership. My latest chapter is Business Analyst I and Product Owner of SalesPro23.', next: 'Open my toolkit', pose: 'point', quip: 'This is where it gets fun.' },
  { id: 'skills', name: '04 / THE TOOLKIT', label: 'My toolkit', message: 'Open a category to explore the skills and tools I use for analysis, development, and product work.', next: 'Where I studied', pose: 'code', quip: 'Open a category to peek inside.' },
  { id: 'educational-background', name: '05 / EDUCATION', label: 'The learning years', message: 'My CSE degree gave me the technical starting point. Club life gave me plenty of practice working with people.', next: 'A few credentials', pose: 'read', quip: 'The learning years 📚' },
  { id: 'certifications', name: '06 / KEEP LEARNING', label: 'Still learning', message: 'Networking, Laravel, WordPress, and prompt engineering. A few things I’ve picked up along the way.', next: 'Beyond the day job', pose: 'celebrate', quip: 'Always learning.' },
  { id: 'leadership', name: '07 / BEYOND WORK', label: 'Beyond work', message: 'At AIUB Computer Club, I helped organize events and worked with a team of 40+ members. There’s a lot to learn outside a classroom.', next: 'Let’s talk', pose: 'dance', quip: 'Club life = great teamwork.' },
  { id: 'contact', name: '08 / SAY HELLO', label: 'Say hello', message: 'That’s my story so far. Have a product question, a project idea, or just want to say hello? My contact details are right here.', next: 'Back to the beginning', pose: 'wave', quip: 'Say hi, I’m friendly! 👋' }
];
const sectionNodes = chapters.map(chapter => document.getElementById(chapter.id));
let chapterIndex = -1, animatePose = () => {}, playActivity = () => {}, funActivity = () => {}, setShades = () => {}, aim = () => {}, wake = () => {}, resizeModel = () => {};
let paused = reducedMotion.matches, dismissed = false, scrollFrame = 0, walkingUntil = 0;
const bubble = document.getElementById('avatar-bubble');
let bubbleTimer = 0, quipTimer = 0, idleTimer = 0, lastInput = performance.now();
function say(text, ms = 3600) {
  if (!panel.hidden || dismissed) return;
  bubble.textContent = text; bubble.classList.add('is-visible');
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('is-visible'), ms);
}
function openGuide(open) {
  panel.hidden = !open;
  if (open) bubble.classList.remove('is-visible');
  toggle.setAttribute('aria-expanded', String(open));
  if (open) animatePose('wave', 1.8);
}
function updateChapter(index) {
  if (index === chapterIndex) return;
  chapterIndex = index;
  const chapter = chapters[index];
  companion.dataset.section = chapter.id;
  label.textContent = chapter.label;
  document.getElementById('guide-chapter').textContent = chapter.name;
  document.getElementById('guide-message').textContent = chapter.message;
  nextLink.href = `#${chapters[(index + 1) % chapters.length].id}`;
  nextLink.replaceChildren(document.createTextNode(`${chapter.next} `));
  const arrow = document.createElement('span'); arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '↗'; nextLink.append(arrow);
  animatePose(chapter.pose);
  clearTimeout(quipTimer);
  if (chapter.quip) quipTimer = setTimeout(() => { if (companion.classList.contains('is-docked')) say(chapter.quip); }, 900);
}
function onScroll() {
  scrollFrame = 0;
  const docked = home.getBoundingClientRect().bottom < Math.min(innerHeight * .45, 350);
  if (companion.classList.contains('is-docked') !== docked) {
    companion.classList.toggle('is-docked', docked);
    resizeModel();
  }
  let index = 0;
  sectionNodes.forEach((section, i) => { if (section.getBoundingClientRect().top < innerHeight * .48) index = i; });
  updateChapter(index);
  wake();
}
window.addEventListener('scroll', () => {
  walkingUntil = performance.now() + 420; lastInput = performance.now();
  if (!scrollFrame) scrollFrame = requestAnimationFrame(onScroll);
}, { passive: true });
window.addEventListener('resize', () => { onScroll(); resizeModel(); });
toggle.addEventListener('click', () => openGuide(panel.hidden));
document.getElementById('guide-close').addEventListener('click', () => { openGuide(false); toggle.focus(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { openGuide(false); toggle.focus(); } });
document.querySelector('.tour-start').addEventListener('click', () => {
  dismissed = false; companion.hidden = false; document.getElementById('guide-restore').hidden = true;
  openGuide(true); nextLink.focus(); resizeModel();
});
nextLink.addEventListener('click', () => { animatePose('point', 2); });
document.getElementById('avatar-wave').addEventListener('click', () => animatePose('wave', 3));
document.getElementById('avatar-hide').addEventListener('click', () => {
  dismissed = true; openGuide(false); companion.hidden = true;
  document.getElementById('guide-restore').hidden = false; document.getElementById('guide-restore').focus();
});
document.getElementById('guide-restore').addEventListener('click', event => {
  dismissed = false; companion.hidden = false; event.currentTarget.hidden = true; resizeModel(); wake(); toggle.focus();
});
const motionButton = document.getElementById('avatar-motion');
function updateMotion() {
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
  wake();
}
motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
reducedMotion.addEventListener('change', event => { paused = event.matches; updateMotion(); });
updateChapter(0); updateMotion(); onScroll();

// ---- Interaction layer: works on the page, independent of the 3D model ----
const clamp = value => Math.max(-1, Math.min(1, value));
document.querySelectorAll('[data-activity]').forEach(button => button.addEventListener('click', () => playActivity(button.dataset.activity)));
const SHORTCUTS = { d: 'dance', t: 'code', c: 'coffee', b: 'read', j: 'jump', f: 'flex', s: 'spin' };
document.addEventListener('keydown', event => {
  lastInput = performance.now();
  const activity = SHORTCUTS[event.key.toLowerCase()];
  if (!activity || paused || dismissed || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
  playActivity(activity);
});
document.addEventListener('pointerdown', () => { lastInput = performance.now(); });
window.addEventListener('pointermove', event => {
  lastInput = performance.now();
  if (paused || dismissed || event.pointerType === 'touch') return;
  const rect = canvas.getBoundingClientRect(); if (!rect.width) return;
  aim(clamp((event.clientX - rect.left - rect.width / 2) / (innerWidth * .45)), clamp((event.clientY - rect.top - rect.height * .2) / (innerHeight * .45)));
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => aim(0, 0));
const IDLE = ['stretch', 'coffee', 'dance', 'jump', 'flex', 'code', 'read', 'spin'];
function idleTick() {
  if (!paused && !dismissed && !document.hidden && panel.hidden && performance.now() - lastInput > 6000) playActivity(IDLE[Math.floor(Math.random() * IDLE.length)]);
  idleTimer = setTimeout(idleTick, 8000 + Math.random() * 6000);
}
idleTimer = setTimeout(idleTick, 9000);
// He also reacts to what you do elsewhere on the page.
new MutationObserver(() => {
  const dark = document.documentElement.dataset.theme === 'dark';
  setShades(dark); say(dark ? 'Lights off. Shades on. 😎' : 'Back to bright mode! ☀️');
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
const copyStatus = document.getElementById('copy-status');
if (copyStatus) new MutationObserver(() => {
  if (/copied/i.test(copyStatus.textContent)) { animatePose('celebrate'); say('Email copied. Talk soon? 💌'); }
}).observe(copyStatus, { childList: true, characterData: true, subtree: true });
document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { animatePose('point', 2.2); say('Pulling those up…', 2400); }));
const stepQuips = { research: 'Ask first. Build later.', define: 'Clear beats clever.', build: 'Ship it, together.' };
document.querySelectorAll('.approach-tabs [role="tab"]').forEach(tab => tab.addEventListener('click', () => { animatePose('think', 3); say(stepQuips[tab.dataset.step] || 'Hmm…'); }));
new IntersectionObserver((entries, observer) => {
  if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); animatePose('wave'); say('Thanks for scrolling this far! 👋', 4600); }
}, { threshold: .6 }).observe(document.querySelector('footer'));

async function createCharacter() {
  const THREE = await import('./vendor/three.module.min.js');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.7, 1.7, 2, -2, .1, 20);
  camera.position.set(0, 2.43, 7); camera.lookAt(0, 1.84, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6c766f, 2.6));
  const light = new THREE.DirectionalLight(0xfff3dd, 3.5); light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.DirectionalLight(0xbfcfff, 2.6); rim.position.set(3, 3, -3); scene.add(rim);
  const mat = (color, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
  const skin = mat('#b87e59'), skinWarm = mat('#ad704f'), hair = mat('#222321');
  const suit = mat('#666b68'), seam = mat('#414845'), shirt = mat('#f1f1e7');
  const shoe = mat('#252b27', .5), dark = mat('#2b3430'), beard = mat('#35322b');
  const cream = mat('#f8f5e7'), blue = mat('#315ced'), lime = mat('#d4ed80');
  function mesh(geometry, material, parent, position = [0,0,0]) {
    const object = new THREE.Mesh(geometry, material); object.position.set(...position); parent.add(object); return object;
  }
  const sphereGeometry = new THREE.SphereGeometry(1, 24, 18);
  const ball = (material, parent, position, scale) => { const object = mesh(sphereGeometry, material, parent, position); object.scale.set(...scale); return object; };
  const box = (material, parent, position, size) => mesh(new THREE.BoxGeometry(...size), material, parent, position);
  function shape(points, material, parent, z) {
    const outline = new THREE.Shape(); outline.moveTo(...points[0]); points.slice(1).forEach(p => outline.lineTo(...p)); outline.closePath();
    return mesh(new THREE.ExtrudeGeometry(outline, { depth: .025, bevelEnabled: false }), material, parent, [0,0,z]);
  }
  const root = new THREE.Group(); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  // Full-length grey suit, white shirt and striped tie, based on the portfolio photo.
  ball(suit, body, [0,1.47,0], [.32,.13,.21]);
  const jacketOutline = new THREE.Shape();
  jacketOutline.moveTo(-.31,1.46); jacketOutline.quadraticCurveTo(-.39,1.46,-.39,1.55);
  jacketOutline.lineTo(-.36,2.31); jacketOutline.quadraticCurveTo(-.35,2.44,-.20,2.45);
  jacketOutline.lineTo(.20,2.45); jacketOutline.quadraticCurveTo(.35,2.44,.36,2.31);
  jacketOutline.lineTo(.39,1.55); jacketOutline.quadraticCurveTo(.39,1.46,.31,1.46); jacketOutline.closePath();
  mesh(new THREE.ExtrudeGeometry(jacketOutline,{depth:.37,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:4,steps:1,curveSegments:12}),suit,body,[0,0,-.20]);
  shape([[-.17,2.46],[.17,2.46],[0,1.98]], shirt, body, .218);
  const lapel = mat('#777d77');
  shape([[-.13,2.46],[-.31,2.33],[-.18,2.19],[-.24,2.16],[0,1.94]], lapel, body, .234);
  shape([[.13,2.46],[.31,2.33],[.18,2.19],[.24,2.16],[0,1.94]], lapel, body, .238);
  shape([[-.12,2.44],[0,2.36],[-.065,2.25],[-.16,2.38]], shirt, body, .26);
  shape([[.12,2.44],[0,2.36],[.065,2.25],[.16,2.38]], shirt, body, .26);
  shape([[0,2.36],[-.052,2.28],[-.04,2.21],[.04,2.21],[.052,2.28]], dark, body, .29);
  shape([[-.025,2.22],[-.045,2.03],[0,1.98],[.045,2.03],[.025,2.22]], dark, body, .28);
  for (let i=0;i<4;i++) { const stripe=box(cream,body,[0,2.04+i*.04,.312],[.067,.009,.005]); stripe.rotation.z=-.5; }
  for (let i=0;i<2;i++) ball(dark,body,[.01,1.83-i*.17,.224],[.015,.015,.010]);
  box(seam, body, [.25,2.19,.224], [.13,.013,.01]);
  box(seam, body, [-.23,1.67,.222], [.17,.018,.01]);
  box(seam, body, [.23,1.67,.222], [.17,.018,.01]);
  ball(skin,body,[0,2.53,0],[.135,.22,.13]);

  const head = new THREE.Group(); head.position.set(0,2.91,.01); body.add(head);
  ball(skin,head,[0,0,0],[.34,.425,.305]);
  const beardShell=mesh(new THREE.SphereGeometry(1,28,20,0,Math.PI*2,1.53,1.58),beard,head);
  beardShell.scale.set(.344,.428,.309);
  ball(skin,head,[0,-.012,.145],[.279,.265,.176]);
  const eyes = [], gaze = [];
  for (const side of [-1,1]) {
    ball(skin,head,[side*.337,-.012,0],[.065,.105,.044]);
    ball(skinWarm,head,[side*.354,-.013,.022],[.025,.056,.018]);
    ball(beard,head,[side*.286,-.045,.058],[.035,.17,.12]);
    eyes.push([ball(cream,head,[side*.149,.058,.297],[.064,.028,.018]),.028]);
    const pupil=ball(dark,head,[side*.147,.058,.314],[.024,.027,.014]); eyes.push([pupil,.027]); gaze.push([pupil,side*.147,.058]);
    const glint=ball(cream,head,[side*.142,.066,.327],[.006,.007,.005]); eyes.push([glint,.007]); gaze.push([glint,side*.142,.066]);
    const eyebrow = ball(hair,head,[side*.145,.161,.285],[.083,.018,.018]); eyebrow.rotation.z=side*-.05;
  }
  ball(skin,head,[0,-.015,.299],[.066,.106,.07]);
  ball(skinWarm,head,[0,-.085,.347],[.071,.03,.027]);
  ball(beard,head,[0,-.16,.304],[.117,.027,.018]);
  ball(skinWarm,head,[0,-.209,.287],[.105,.052,.018]);
  const smile = ball(cream,head,[0,-.191,.304],[.091,.025,.016]);
  // Thin rectangular glasses instead of the old circular frames.
  function glassesFrame(center) {
    const w=.133,h=.085,r=.035;
    const path = new THREE.Shape(); path.moveTo(-w+r,-h);
    path.lineTo(w-r,-h); path.quadraticCurveTo(w,-h,w,-h+r); path.lineTo(w,h-r); path.quadraticCurveTo(w,h,w-r,h);
    path.lineTo(-w+r,h); path.quadraticCurveTo(-w,h,-w,h-r); path.lineTo(-w,-h+r); path.quadraticCurveTo(-w,-h,-w+r,-h);
    const points=path.getPoints(36).map(p=>new THREE.Vector3(p.x+center,p.y+.056,.337));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),60,.009,6,true),dark,head);
  }
  glassesFrame(-.15); glassesFrame(.15); box(dark,head,[0,.074,.34],[.054,.014,.016]);
  for(const side of [-1,1]) { box(dark,head,[side*.29,.078,.17],[.014,.014,.32]); }
  const cap=mesh(new THREE.SphereGeometry(1,28,18,0,Math.PI*2,0,1.7),hair,head,[0,.225,-.035]); cap.scale.set(.35,.23,.305);
  for(const side of [-1,1]) ball(hair,head,[side*.303,.17,-.018],[.05,.15,.18]);
  const sweep=ball(hair,head,[-.08,.355,.10],[.28,.10,.21]);sweep.rotation.set(-.15,0,-.19);
  const fringe=ball(hair,head,[-.17,.255,.23],[.19,.055,.105]);fringe.rotation.z=.35;
  for(let i=0;i<5;i++) { const strand=ball(mat(i%2?'#343831':'#30332c'),head,[-.25+i*.092,.378+i*.009,.08],[.008,.009,.145]); strand.rotation.set(-.18,-.38,-.16); }

  const arms=[], elbows=[], hands=[], legs=[], knees=[];
  for(const side of [-1,1]) {
    const shoulder=new THREE.Group(); shoulder.position.set(side*.40,2.34,0); body.add(shoulder); arms.push(shoulder);
    mesh(new THREE.CapsuleGeometry(.128,.29,8,20),suit,shoulder,[side*.016,-.22,0]);
    const elbow=new THREE.Group(); elbow.position.set(side*.02,-.46,0); shoulder.add(elbow); elbows.push(elbow);
    mesh(new THREE.CapsuleGeometry(.105,.24,8,20),suit,elbow,[0,-.17,.008]);
    box(shirt,elbow,[0,-.365,.015],[.17,.07,.16]);
    const hand=new THREE.Group(); hand.position.set(0,-.455,.02); elbow.add(hand); hands.push(hand);
    ball(skin,hand,[0,0,0],[.10,.13,.067]);
    for(let finger=0;finger<4;finger++) ball(skin,hand,[-.061+finger*.038,-.105,.002],[.022,.059,.04]);
    const thumb=ball(skin,hand,[-side*.085,-.008,.015],[.038,.077,.042]); thumb.rotation.z=-side*.4;
    const leg=new THREE.Group(); leg.position.set(side*.19,1.48,0); body.add(leg); legs.push(leg);
    mesh(new THREE.CylinderGeometry(.154,.137,.58,20),suit,leg,[0,-.31,0]);
    const knee=new THREE.Group(); knee.position.set(0,-.60,0); leg.add(knee); knees.push(knee);
    mesh(new THREE.CylinderGeometry(.137,.128,.59,20),suit,knee,[0,-.30,0]);
    box(seam,knee,[0,-.32,.138],[.005,.49,.003]);
    ball(shoe,knee,[0,-.70,.065],[.17,.11,.285]);
    box(dark,knee,[0,-.77,.06],[.30,.044,.43]);
  }
  // A small working prop appears only in the relevant chapters.
  const tablet=new THREE.Group(); tablet.position.set(.05,-.04,.10); hands[0].add(tablet);
  box(dark,tablet,[0,0,0],[.36,.48,.035]); box(blue,tablet,[0,.01,.025],[.31,.40,.009]);
  for(let i=0;i<3;i++) box(lime,tablet,[-.015,.1-i*.075,.035],[.19-i*.025,.015,.005]);
  tablet.rotation.set(-.15,0,-.17); tablet.visible=false;
  const idea=new THREE.Group(); idea.position.set(.6,2.48,.07); body.add(idea);
  mesh(new THREE.IcosahedronGeometry(.15,0),lime,idea); idea.visible=false;
  // Soft contact shadow follows the feet without an expensive shadow pass.
  const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=128; shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'); const gradient=ctx.createRadialGradient(64,64,5,64,64,62);
  gradient.addColorStop(0,'rgba(12,25,19,.24)'); gradient.addColorStop(1,'rgba(12,25,19,0)'); ctx.fillStyle=gradient; ctx.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(1.8,.75),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),scene,[0,.035,.02]); shadow.rotation.x=-Math.PI/2;

  // ---- Props for the activities ------------------------------------------------------------
  const glyphTexture=(text,color,font='700 84px sans-serif')=>{
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.font=font; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=color; g.fillText(text,64,68);
    const texture=new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace; return texture;
  };
  const floater=(texture,size)=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false})); s.scale.set(size,size,1); s.visible=false; scene.add(s); return s;
  };
  const shadeMat=new THREE.MeshStandardMaterial({color:'#0d1110',roughness:.25,metalness:.2});
  const sunglasses=new THREE.Group(); head.add(sunglasses); sunglasses.visible=false;
  for(const side of [-1,1]) box(shadeMat,sunglasses,[side*.15,.056,.347],[.29,.18,.014]);
  box(dark,sunglasses,[0,.08,.349],[.07,.03,.016]);
  const mug=new THREE.Group(); mug.visible=false; scene.add(mug);
  mesh(new THREE.CylinderGeometry(.062,.056,.125,20),cream,mug);
  mesh(new THREE.CylinderGeometry(.0635,.0635,.035,20),blue,mug,[0,-.012,0]);
  mesh(new THREE.CylinderGeometry(.05,.05,.01,20),mat('#4a2f22',.35),mug,[0,.056,0]);
  const handle=mesh(new THREE.TorusGeometry(.036,.011,8,16,Math.PI),cream,mug,[.062,0,0]); handle.rotation.z=-Math.PI/2;
  const puff=document.createElement('canvas'); puff.width=puff.height=64; const pg=puff.getContext('2d');
  const puffGradient=pg.createRadialGradient(32,32,2,32,32,30); puffGradient.addColorStop(0,'rgba(255,255,255,.85)'); puffGradient.addColorStop(1,'rgba(255,255,255,0)'); pg.fillStyle=puffGradient; pg.fillRect(0,0,64,64);
  const puffTexture=new THREE.CanvasTexture(puff);
  const steam=[0,1,2].map(()=>floater(puffTexture,.16));
  const notes=['♪','♫','♪','♫'].map((glyph,i)=>floater(glyphTexture(glyph,i%2?'#ffffff':'#dcf879'),.3));
  const book=new THREE.Group(); body.add(book); book.position.set(0,2.0,.5); book.visible=false;
  const pagesMat=mat('#fbf8ea',.9), coverMat=mat('#1c2f8f',.6);
  for(const side of [-1,1]) {
    const half=new THREE.Group(); half.position.set(0,0,0); half.rotation.y=side*.32; book.add(half);
    box(coverMat,half,[side*.17,0,-.012],[.34,.44,.02]); box(pagesMat,half,[side*.17,0,.004],[.31,.41,.018]);
    for(let i=0;i<4;i++) box(seam,half,[side*.17,.13-i*.07,.015],[.2,.01,.004]);
  }
  const CONFETTI=56, confettiPos=new Float32Array(CONFETTI*3), confettiColor=new Float32Array(CONFETTI*3), confettiVel=new Float32Array(CONFETTI*3);
  const confettiGeometry=new THREE.BufferGeometry();
  confettiGeometry.setAttribute('position',new THREE.BufferAttribute(confettiPos,3)); confettiGeometry.setAttribute('color',new THREE.BufferAttribute(confettiColor,3));
  const confetti=new THREE.Points(confettiGeometry,new THREE.PointsMaterial({size:7,sizeAttenuation:false,vertexColors:true,transparent:true,depthWrite:false}));
  confetti.frustumCulled=false; confetti.visible=false; scene.add(confetti);
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
  const holo=mesh(new THREE.PlaneGeometry(1,.667),new THREE.MeshBasicMaterial({map:codeTexture,transparent:true}),scene,[.86,3.02,.55]); holo.rotation.y=-.22; holo.visible=false;
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
  const REST={lz:-.1,rz:.1,lx:0,rx:0,le:0,re:0,lex:0,rex:0,y:0,roll:0,lean:0,spin:0,yawOff:0,hx:0,hy:0,hz:0,look:1,legL:0,legR:0,kneeL:0,kneeR:0,tablet:0,idea:0,mug:0,mugTilt:0,book:0,holo:0,notes:0};
  const smooth=(a,b,x)=>{const k=Math.min(1,Math.max(0,(x-a)/(b-a)));return k*k*(3-2*k);};
  const ACT={
    wave:{dur:3,pose(t,e,P){P.rz=2.35+Math.sin(t*9)*.16;P.re=.45+Math.sin(t*9)*.18;P.lz=-.13;P.hz=Math.sin(t*3)*.03;}},
    present:{persist:true,pose(t,e,P){P.lz=-.34;P.lx=-.6;P.le=-.45;P.rz=.72;P.rx=-.28;P.re=.3;P.tablet=1;}},
    build:{persist:true,pose(t,e,P){ACT.present.pose(t,e,P);P.idea=1;}},
    point:{persist:true,pose(t,e,P){P.lz=-1.15;P.le=-.2;P.rz=.14;}},
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
    read:{dur:6.5,pose(t,e,P){
      const k=smooth(0,.6,e)*smooth(6.5,5.9,e);
      P.lx=-.95*k;P.rx=-.95*k;P.lex=-1.2*k;P.rex=-1.2*k;P.lz=-.02*k-.1;P.rz=.02*k+.1;
      P.hx=.3*k;P.look=0;P.book=1;P.lean=.05*k;P.hy=Math.sin(t*1.2)*.04*k;
    }},
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
  const QUIPS={
    wave:['Hi there! 👋'],dance:['Friday-sprint energy! 🕺','Zero bugs, all vibes.'],code:['Refining the story…','Just one more commit…'],
    coffee:['Backlog grooming fuel ☕','Coffee first, roadmap later.'],read:['Reading the docs. Really.','Chapter 3: stakeholder management.'],
    jump:['Sprint goal achieved! 🙌','Up we go!'],flex:['Strong requirements. Stronger coffee.','Scope creep? Not today.'],spin:['Roadmap pivot! 🌀','Wheee!'],
    stretch:['Quick stretch between standups.'],celebrate:['Nice one! 🎉'],boop:['Hey! Mind the glasses 😄','That’s my head, friend.','Boop received. 👀']
  };
  const FUN=['dance','jump','flex','spin','coffee','code','read','wave'];

  let frame=0,last=0,act={name:'wave',start:performance.now(),until:performance.now()+3300};
  let targetYaw=-.12,yaw=-.12,headX=0,headY=0,gazeX=0,gazeY=0,shadesOn=false,lastFun='';
  let down=null,dragging=false,lastDocked=false,contextLost=false,clicks=[];
  const P={...REST}, handPoint=new THREE.Vector3(), lerp=(a,b,t)=>a+(b-a)*t, pick=list=>list[Math.floor(Math.random()*list.length)];
  function render(time) {
    frame=0;
    if(document.hidden||dismissed||contextLost) return;
    const dt=Math.min((time-last)/1000||.033,.05);
    if(time-last<30&&!paused) { schedule(); return; }
    last=time;
    const ease=paused?1:1-Math.exp(-dt*9), fast=paused?1:1-Math.exp(-dt*22);
    const docked=companion.classList.contains('is-docked');
    const moving=!paused&&docked&&time<walkingUntil;
    const live=!paused&&time<act.until;
    const name=live?act.name:chapters[chapterIndex]?.pose, def=ACT[name];
    const t=time*.001, e=live?(time-act.start)/1000:t;
    Object.assign(P,REST);
    if(!paused&&def&&(live||def.persist)) def.pose(t,e,P);
    if(paused) Object.assign(P,REST);
    if(moving) { Object.assign(P,REST); P.lx=Math.sin(t*9)*.40; P.rx=-P.lx; }
    yaw=lerp(yaw,targetYaw+P.yawOff,ease); root.rotation.y=yaw+P.spin;
    const look=paused?0:P.look;
    head.rotation.x=lerp(head.rotation.x,P.hx+headX*look,ease);
    head.rotation.y=lerp(head.rotation.y,P.hy+headY*look,ease);
    head.rotation.z=lerp(head.rotation.z,P.hz,ease);
    const bob=paused?0:(moving?Math.abs(Math.sin(t*9))*.035:Math.sin(t*2)*.009);
    body.position.y=lerp(body.position.y,bob+P.y,fast);
    body.rotation.z=lerp(body.rotation.z,moving?Math.sin(t*8)*.025:P.roll,ease);
    body.rotation.x=lerp(body.rotation.x,P.lean,ease);
    for(let i=0;i<2;i++) {
      arms[i].rotation.z=lerp(arms[i].rotation.z,i?P.rz:P.lz,ease);
      arms[i].rotation.x=lerp(arms[i].rotation.x,i?P.rx:P.lx,ease);
      elbows[i].rotation.z=lerp(elbows[i].rotation.z,i?P.re:P.le,ease);
      elbows[i].rotation.x=lerp(elbows[i].rotation.x,i?P.rex:P.lex,ease);
      const stride=Math.sin(t*9+i*Math.PI);
      legs[i].rotation.x=lerp(legs[i].rotation.x,moving?stride*.36:(i?P.legR:P.legL),ease);
      knees[i].rotation.x=lerp(knees[i].rotation.x,moving?Math.max(0,-stride)*.55:(i?P.kneeR:P.kneeL),ease);
    }
    for(const [eye,baseX,baseY] of gaze) { eye.position.x=lerp(eye.position.x,baseX+gazeX*look*.017,ease); eye.position.y=lerp(eye.position.y,baseY+gazeY*look*.009,ease); }
    // Props
    tablet.visible=!moving&&!!P.tablet; idea.visible=!moving&&!!P.idea;
    if(idea.visible) { idea.rotation.set(t*.5,t*.8,.2); idea.position.y=2.47+Math.sin(t*2)*.04; }
    sunglasses.visible=shadesOn;
    book.visible=!moving&&!!P.book;
    const showHolo=!moving&&!!P.holo; holo.visible=showHolo;
    if(showHolo) drawCode(Math.floor((e*20)%(codeLength+26)));
    const showMug=!moving&&!!P.mug; mug.visible=showMug;
    if(showMug) {
      root.updateMatrixWorld(true); hands[1].getWorldPosition(handPoint);
      mug.position.set(handPoint.x+.005,handPoint.y+.075,handPoint.z+.075); mug.rotation.x=-P.mugTilt*.8;
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
    const lift=Math.max(0,body.position.y); shadow.scale.setScalar(1-lift*.9); shadow.material.opacity=1-lift*1.4;
    // Blinking is brief, with the glasses staying still.
    const blink=!paused && time%4700<150 ? .12 : 1;
    eyes.forEach(([eye,height])=>{eye.scale.y=height*blink;});
    if(!paused) smile.scale.y=.025+(live&&(name==='wave'||name==='celebrate'||name==='dance')?.003*Math.sin(t*5):0);
    renderer.render(scene,camera);
    if(!paused||Math.abs(yaw-targetYaw)>.001||confetti.visible) schedule();
  }
  function schedule() { if(!frame&&!document.hidden&&!dismissed&&!contextLost) frame=requestAnimationFrame(render); }
  wake=schedule;
  animatePose=(name,seconds)=>{
    const now=performance.now(), def=ACT[name]; if(!def) return;
    act={name,start:now,until:now+(seconds??def.dur??3)*1000}; def.start?.(now); schedule();
  };
  playActivity=(name,quip=true)=>{
    if(!ACT[name]) return;
    if(name!=='boop'&&name!=='stretch'&&name!=='wave') lastFun=name;
    if(quip&&QUIPS[name]) say(pick(QUIPS[name]));
    animatePose(name);
  };
  funActivity=()=>{ const choices=FUN.filter(n=>n!==lastFun); playActivity(pick(choices)); };
  setShades=on=>{ shadesOn=on; schedule(); };
  aim=(x,y)=>{ headY=x*.55; headX=y*.28; gazeX=x; gazeY=-y; schedule(); };
  resizeModel=()=>{
    if(dismissed)return;
    const width=view.clientWidth,height=view.clientHeight;if(!width||!height)return;
    renderer.setSize(width,height,false);
    const halfHeight=2.08,halfWidth=halfHeight*width/height;
    camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
    const docked=companion.classList.contains('is-docked');
    if(docked!==lastDocked) {targetYaw=docked?-.20:-.12;lastDocked=docked;}
    schedule();
  };
  new ResizeObserver(resizeModel).observe(view);
  // Tapping the head, an arm or the body gets a different reaction; five quick taps make him dizzy.
  const ray=new THREE.Raycaster(), ndc=new THREE.Vector2();
  function hitPart(event) {
    const rect=canvas.getBoundingClientRect();
    ndc.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    ray.setFromCamera(ndc,camera);
    const hit=ray.intersectObject(root,true)[0]; if(!hit) return 'air';
    for(let o=hit.object;o;o=o.parent) { if(o===head) return 'head'; if(arms.includes(o)) return 'arm'; }
    return 'body';
  }
  function poke(event) {
    const now=performance.now(); clicks=clicks.filter(time=>now-time<2200); clicks.push(now);
    if(clicks.length>=5) { clicks=[]; say('Okay, okay. I’m dizzy! 😵‍💫'); animatePose('spin'); return; }
    const part=hitPart(event);
    if(part==='head') playActivity('boop');
    else if(part==='arm') { say('High five! ✋'); animatePose('wave'); }
    else funActivity();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;down={x:event.clientX,y:event.clientY,yaw:targetYaw,id:event.pointerId};dragging=false;canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(down) {const dx=event.clientX-down.x,dy=event.clientY-down.y;if(Math.abs(dx)>6&&(event.pointerType!=='touch'||Math.abs(dx)>Math.abs(dy)))dragging=true;if(dragging){targetYaw=down.yaw+dx*.012;schedule();}}
  });
  function finish(event) {
    if(!down)return;
    if(event.type==='pointerup'&&!dragging&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<7) poke(event);
    if(canvas.hasPointerCapture(down.id))canvas.releasePointerCapture(down.id);down=null;dragging=false;
  }
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  canvas.addEventListener('lostpointercapture',()=>{down=null;dragging=false;});
  canvas.addEventListener('keydown',event=>{
    if(['ArrowLeft','ArrowRight','Home','r','R','Enter',' '].includes(event.key))event.preventDefault();
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){targetYaw+=event.key==='ArrowLeft'?-.3:.3;schedule();}
    if(event.key==='Home'||event.key.toLowerCase()==='r'){targetYaw=-.12;schedule();}
    if(event.key==='Enter'||event.key===' '){animatePose('wave',3);openGuide(panel.hidden);if(!panel.hidden)nextLink.focus();}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;if(frame)cancelAnimationFrame(frame);frame=0;companion.classList.remove('is-ready');canvas.hidden=true;
    showFallback('YOUR GUIDE IS STILL HERE');
  });
  canvas.hidden=false;companion.classList.add('is-ready');resizeModel();animatePose(chapters[chapterIndex].pose,4);
  setShades(document.documentElement.dataset.theme==='dark');
}
function showFallback(message) {
  canvas.hidden=true; companion.classList.remove('is-ready');
  document.getElementById('avatar-hint').textContent=message;
  document.getElementById('avatar-wave').hidden=true; motionButton.hidden=true;
  document.querySelectorAll('[data-activity]').forEach(button => { button.hidden = true; });
}
createCharacter().catch(()=>showFallback('MEET YOUR GUIDE BELOW'));
