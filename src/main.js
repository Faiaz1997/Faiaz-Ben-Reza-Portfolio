/* The portfolio world: a fixed WebGL scene whose camera and character follow the page scroll. */
import './ui.js';
import { INTRO_MIN_MS } from './intro.js';
import './world.css';
import * as THREE from 'three';
import { createAvatar } from './avatar.js';
import { createSets, SPACING } from './sets.js';

const root = document.documentElement;
const canvas = document.getElementById('world');
const bubble = document.getElementById('bubble');
const sections = [...document.querySelectorAll('[data-station]')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const NIGHT = { top: '#0b0720', horizon: '#3a2a6e', ground: '#0a1030', grid: '#2c43b8', sun: 0 };
const DAY = { top: '#5f95e8', horizon: '#ffe9c4', ground: '#c4dcf7', grid: '#7f9fdb', sun: 1 };
const QUIPS = [
  null, 'Here’s the work. Poke the board!', 'A bit about me…', 'Pick a step. I’ll hop to it.', 'Three stops so far.',
  'Open a card, or poke a gem!', 'Where it all started 📚', 'Club life = great teamwork.', 'Say hi. I’m friendly! 👋'
];

let paused = reduced.matches, bubbleTimer = 0, talkHook = () => {};
function say(text, ms = 3800) {
  bubble.textContent = text; bubble.classList.add('is-visible'); talkHook(Math.min(3200, text.length * 55));
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => bubble.classList.remove('is-visible'), ms);
}
function fail() { root.classList.add('no-world'); canvas.hidden = true; }

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) { fail(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x2c2160, 30, 150);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 260);
  const hemi = new THREE.HemisphereLight(0xcdd4ea, 0x0b1030, 1.5); scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xffffff, 1.1); scene.add(fill, fill.target);
  const key = new THREE.DirectionalLight(0xfff3e2, 3); key.target.position.set(0, 1.6, 0); scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8aa8ff, 2.2); scene.add(rim);
  const accentLight = new THREE.PointLight(0x3b63ff, 10, 14, 1.6); scene.add(accentLight);

  // Sky dome, stars, sun and fireflies follow the camera so they read as far away.
  const skyUniforms = { top: { value: new THREE.Color(NIGHT.top) }, bottom: { value: new THREE.Color(NIGHT.horizon) } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, pow(clamp(h*1.5,0.,1.),1.7)),1.); }'
  }));
  sky.renderOrder = -10; scene.add(sky);
  const far = new THREE.Group(); scene.add(far);
  const starCount = 520, starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) starPositions.set([(Math.random() - .5) * 150, 6 + Math.random() * 46, -30 - Math.random() * 60], i * 3);
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: .28, transparent: true, depthWrite: false, fog: false })); far.add(stars);
  const sunCanvas = document.createElement('canvas'); sunCanvas.width = sunCanvas.height = 128; const sg = sunCanvas.getContext('2d');
  const sunGradient = sg.createRadialGradient(64, 64, 4, 64, 64, 62); sunGradient.addColorStop(0, 'rgba(255,248,214,1)'); sunGradient.addColorStop(.25, 'rgba(255,226,150,.8)'); sunGradient.addColorStop(1, 'rgba(255,226,150,0)');
  sg.fillStyle = sunGradient; sg.fillRect(0, 0, 128, 128);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunCanvas), transparent: true, depthWrite: false, fog: false })); sun.scale.set(34, 34, 1); sun.position.set(22, 22, -80); far.add(sun);
  const flyCount = 0, flyData = Array.from({ length: flyCount }, () => ({ x: Math.random(), y: .5 + Math.random() * 5, z: -5 + Math.random() * 9, p: Math.random() * 6.28 }));
  const flyPositions = new Float32Array(flyCount * 3); const flyGeometry = new THREE.BufferGeometry(); flyGeometry.setAttribute('position', new THREE.BufferAttribute(flyPositions, 3));
  const flies = new THREE.Points(flyGeometry, new THREE.PointsMaterial({ color: 0xd8f55a, size: .09, transparent: true, opacity: .8, depthWrite: false })); flies.frustumCulled = false; scene.add(flies);

  // ---- Tech corporate headquarters: a glass-walled open-plan floor above a lit skyline ----
  const length = SPACING * (sections.length - 1), HQ_W = length + 140, HQ_H = 9, WALL_Z = -14, midX = length / 2;
  const hqMaterials = [];   // [material, nightColor, dayColor]
  const themedHQ = (material, night, day) => { hqMaterials.push([material, new THREE.Color(night), new THREE.Color(day)]); return material; };
  const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.repeat.set(...repeat); return t; };
  // Polished large-format floor tiles with faint veining
  const floorTexture = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d6d2cc'; g.fillRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, 'rgba(255,255,255,.35)'); grad.addColorStop(.5, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(60,50,80,.25)'); g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(110,100,130,.2)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, h * .3, Math.random() * w, h * .6, Math.random() * w, h); g.stroke(); }
    g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.strokeStyle = 'rgba(201,162,74,.5)'; g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
  }, [HQ_W / 4, 30 / 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HQ_W, 30), themedHQ(new THREE.MeshStandardMaterial({ map: floorTexture, roughness: .22, metalness: .18 }), 0x6c6478, 0xffffff));
  floor.rotation.x = -Math.PI / 2; floor.position.set(midX, 0, WALL_Z + 15); scene.add(floor);
  // outside ground, far below the glass
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(HQ_W + 200, 260), themedHQ(new THREE.MeshBasicMaterial({ color: 0x06101f }), 0x06101f, 0xaec3dc));
  outside.rotation.x = -Math.PI / 2; outside.position.set(midX, -14, -140); scene.add(outside);
  // wayfinding strip inlaid in the floor
  // glass curtain wall: panes, mullions and transoms
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(HQ_W, HQ_H), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: .07, depthWrite: false }));
  glass.position.set(midX, HQ_H / 2, WALL_Z); scene.add(glass);
  const steel = themedHQ(new THREE.MeshStandardMaterial({ roughness: .35, metalness: .7 }), 0x39435a, 0x8a96ab);
  const mullions = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, HQ_H, .18), steel, Math.ceil(HQ_W / 3.4)), m4 = new THREE.Matrix4();
  for (let i = 0; i < mullions.count; i++) { m4.setPosition(midX - HQ_W / 2 + i * 3.4, HQ_H / 2, WALL_Z); mullions.setMatrixAt(i, m4); } scene.add(mullions);
  for (const y of [.1, 3, 6, HQ_H]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(HQ_W, .14, .2), steel); bar.position.set(midX, y, WALL_Z); scene.add(bar); }
  // ceiling with linear light panels and perimeter cove
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(HQ_W, 30), themedHQ(new THREE.MeshStandardMaterial({ roughness: .8 }), 0x0d1220, 0xe9eef6));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(midX, HQ_H, WALL_Z + 15); scene.add(ceiling);
  const panelMaterial = new THREE.MeshBasicMaterial({ color: 0xf2f7ff }), panels = new THREE.InstancedMesh(new THREE.BoxGeometry(3.2, .06, .5), panelMaterial, Math.ceil(HQ_W / 5) * 3);
  for (let i = 0; i < panels.count; i++) { m4.setPosition(midX - HQ_W / 2 + (Math.floor(i / 3)) * 5, HQ_H - .05, -8 + (i % 3) * 7); panels.setMatrixAt(i, m4); } scene.add(panels);
  const cove = new THREE.Mesh(new THREE.BoxGeometry(HQ_W, .08, .16), new THREE.MeshBasicMaterial({ color: 0xe0b43a })); cove.position.set(midX, HQ_H - .6, WALL_Z + .5); scene.add(cove);
  // structural columns between stations, with a lit brand stripe
  const columnMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .5, metalness: .2 }), 0x3a3550, 0xd9d4ce);
  for (let i = 0; i <= sections.length; i++) {
    const x = (i - .5) * SPACING, col = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, HQ_H, 28), columnMaterial); col.position.set(x, HQ_H / 2, -9.5); scene.add(col);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .16, 28), steel); base.position.set(x, .08, -9.5); scene.add(base);
  }
  // open-plan workstations (desks, monitors, keyboards, task chairs), lounge seating and planters
  const deskMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .5, metalness: .05 }), 0x6a7388, 0xe6eaf1);
  const woodMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .6 }), 0x8a7258, 0xc9a97f);
  const bezel = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: .4 });
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x4a8fd8 }), keyMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: .6 });
  const chairMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .7 }), 0x2a3144, 0x3d4558);
  const plantPot = themedHQ(new THREE.MeshStandardMaterial({ roughness: .5 }), 0x8d96a8, 0xf3f5f9), leaf = new THREE.MeshStandardMaterial({ color: 0x2f9d62, roughness: .6 }), leafLight = new THREE.MeshStandardMaterial({ color: 0x57b878, roughness: .6 });
  const sofaMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .8 }), 0x3a4a6e, 0x4a6fb0);
  const screens = [];
  const add = (geometry, material, x, y, z, parent = scene) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); return m; };
  function workstation(x, z, facing) {
    add(new THREE.BoxGeometry(2.4, .06, 1.1), woodMaterial, x, .76, z);
    add(new THREE.BoxGeometry(2.4, .03, 1.1), deskMaterial, x, .73, z);
    for (const lx of [-1.12, 1.12]) add(new THREE.BoxGeometry(.05, .74, 1), steel, x + lx, .37, z);
    for (const mx of [-.55, .55]) {
      add(new THREE.BoxGeometry(.8, .48, .035), bezel, x + mx, 1.28, z - .28 * facing);
      const scr = add(new THREE.PlaneGeometry(.74, .42), screenMaterial, x + mx, 1.28, z - .28 * facing + .02 * facing); if (facing < 0) scr.rotation.y = Math.PI; screens.push(scr);
      add(new THREE.CylinderGeometry(.03, .03, .28, 8), steel, x + mx, .93, z - .28 * facing);
      add(new THREE.BoxGeometry(.28, .02, .18), steel, x + mx, .79, z - .28 * facing);
    }
    add(new THREE.BoxGeometry(.5, .02, .16), keyMaterial, x, .8, z + .2 * facing);
    add(new THREE.CylinderGeometry(.04, .04, .06, 12), keyMaterial, x + .75, .82, z + .1 * facing);
    const cz = z + .95 * facing;
    add(new THREE.CylinderGeometry(.27, .24, .08, 20), chairMaterial, x, .52, cz);
    add(new THREE.BoxGeometry(.5, .48, .07), chairMaterial, x, .84, cz + .22 * facing);
    add(new THREE.CylinderGeometry(.03, .03, .4, 8), steel, x, .27, cz);
    const star = add(new THREE.CylinderGeometry(.3, .3, .03, 5), steel, x, .06, cz);
  }
  function plant(x, z, big = 1) {
    add(new THREE.CylinderGeometry(.3 * big, .22 * big, .62 * big, 24), plantPot, x, .31 * big, z);
    for (let k = 0; k < 9; k++) {
      const blade = add(new THREE.ConeGeometry(.1 * big, 1.2 * big, 6), k % 2 ? leaf : leafLight, x + Math.sin(k * 2.1) * .12, .62 * big + .55 * big, z + Math.cos(k * 2.1) * .12);
      blade.rotation.set(Math.cos(k * 2.1) * .5, 0, -Math.sin(k * 2.1) * .5); blade.scale.set(1, 1, .3);
    }
  }
  function sofa(x, z) {
    add(new THREE.BoxGeometry(2.6, .4, .95), sofaMaterial, x, .38, z);
    add(new THREE.BoxGeometry(2.6, .7, .22), sofaMaterial, x, .75, z - .38);
    for (const sx of [-1.25, 1.25]) add(new THREE.BoxGeometry(.2, .55, .95), sofaMaterial, x + sx, .55, z);
    add(new THREE.BoxGeometry(.9, .34, .05), woodMaterial, x, .24, z + 1.0);
    add(new THREE.CylinderGeometry(.5, .5, .04, 24), woodMaterial, x + 2.2, .5, z + .1);
    add(new THREE.CylinderGeometry(.05, .05, .5, 8), steel, x + 2.2, .25, z + .1);
  }
  // Asgardian braziers, weapon racks and war-room banners instead of office furniture
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: .9, depthWrite: false }), flames = [];
  function brazier(x, z) {
    add(new THREE.CylinderGeometry(.34, .2, .1, 20), steel, x, .05, z); add(new THREE.CylinderGeometry(.08, .12, 1.1, 12), steel, x, .65, z);
    add(new THREE.CylinderGeometry(.38, .2, .3, 20, 1, true), GOLDM, x, 1.35, z); add(new THREE.TorusGeometry(.38, .04, 8, 24), GOLDM, x, 1.5, z).rotation.x = Math.PI / 2;
    for (let k = 0; k < 3; k++) { const fl = add(new THREE.ConeGeometry(.2 - k * .04, .7 + k * .12, 8), flameMaterial, x + (k - 1) * .09, 1.78 + k * .05, z); flames.push(fl); }
    const lamp = new THREE.PointLight(0xff9a3a, 5, 7, 1.8); lamp.position.set(x, 1.9, z + .4); scene.add(lamp); flames.push(lamp);
  }
  const GOLDM = new THREE.MeshStandardMaterial({ color: 0xe0b43a, metalness: .9, roughness: .25 });
  function weaponRack(x, z) {
    add(new THREE.BoxGeometry(2.2, .12, .5), woodMaterial, x, .06, z); add(new THREE.BoxGeometry(2.2, .12, .5), woodMaterial, x, 1.5, z - .15);
    for (const px of [-1.05, 1.05]) add(new THREE.BoxGeometry(.1, 1.55, .12), woodMaterial, x + px, .78, z - .15);
    for (let k = 0; k < 4; k++) { const shaft = add(new THREE.CylinderGeometry(.03, .03, 1.9, 8), woodMaterial, x - .75 + k * .5, .98, z - .05); shaft.rotation.z = (k - 1.5) * .05; add(new THREE.ConeGeometry(.08, .32, 6), steel, x - .75 + k * .5 + (k - 1.5) * -.09, 2.0, z - .05); }
  }
  for (let i = 0; i < sections.length; i++) {
    const bay = i * SPACING;
    brazier(bay - 8.8, -8.4); brazier(bay + 8.8, -8.4);
    if (i % 2 === 1) weaponRack(bay, -13.2);
  }

  // foreground: rugs, floor lettering, low benches, planters and floor lights so the front of the floor is not empty
  const rugMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .95 }), 0x7a2630, 0xc9818a);
  const names = ['WORK', 'ABOUT', 'APPROACH', 'JOURNEY', 'TOOLKIT', 'EDUCATION', 'BEYOND WORK', 'CONTACT'];
  const benchMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .8 }), 0x4a4658, 0xb8b2c4);
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xd8f55a });
  for (let i = 0; i < sections.length; i++) {
    const bay = i * SPACING;
    const rug = add(new THREE.PlaneGeometry(9, 4.4), rugMaterial, bay, .012, 4.6); rug.rotation.x = -Math.PI / 2;
    const rim = add(new THREE.PlaneGeometry(9.3, 4.7), new THREE.MeshBasicMaterial({ color: 0x35c8ff, transparent: true, opacity: .12 }), bay, .008, 4.6); rim.rotation.x = -Math.PI / 2;
    for (const dx of [-4.6, 4.6]) { const stone = add(new THREE.BoxGeometry(1.8, .3, .7), benchMaterial, bay + dx, .15, 6.6); stone.rotation.y = dx < 0 ? .1 : -.1; add(new THREE.BoxGeometry(1.8, .04, .7), new THREE.MeshBasicMaterial({ color: 0xe0b43a }), bay + dx, .31, 6.6).rotation.y = stone.rotation.y; }
    for (let k = -2; k <= 2; k++) { add(new THREE.CylinderGeometry(.07, .07, .34, 10), steel, bay + k * 2.2, .17, 7.4); add(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0x7fd4ff }), bay + k * 2.2, .38, 7.4); }
  }
  const plinthMaterial = themedHQ(new THREE.MeshStandardMaterial({ roughness: .35, metalness: .2 }), 0x2a2538, 0xdfe5ee);
  // ---- Avengers HQ: memorabilia alcoves along the back wall, floor emblem and banners ----
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .55, ...o });
  const B = color => new THREE.MeshBasicMaterial({ color });
  const RED = M(0xb3141f), GOLD = M(0xe0b43a, { metalness: .9, roughness: .25 }), BLUE = M(0x1f3fa8), WHITE = M(0xf2f2f2, { metalness: .2 }), BLACK = M(0x15171c, { metalness: .3 }), SILVER = M(0xc9d3e0, { metalness: .9, roughness: .2 });
  const part = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const spin = [], plates = [];
  function alcove(x, name, build, tint = 0x35c8ff) {
    const z = -11.6, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    part(new THREE.BoxGeometry(2.0, .22, 1.7), plinthMaterial, 0, .11, 0, g);
    part(new THREE.BoxGeometry(2.0, .04, 1.7), new THREE.MeshBasicMaterial({ color: tint }), 0, .02, 0, g);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xaad4ff, transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide });
    part(new THREE.BoxGeometry(2.0, 3.3, 1.7), glassMat, 0, 1.87, 0, g);
    for (const [px, pz] of [[-1, -.85], [1, -.85], [-1, .85], [1, .85]]) part(new THREE.BoxGeometry(.05, 3.3, .05), steel, px, 1.87, pz, g);
    part(new THREE.BoxGeometry(2.1, .06, 1.8), steel, 0, 3.55, 0, g);
    const spot = part(new THREE.ConeGeometry(.9, 3.3, 24, 1, true), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 0, 1.9, 0, g); spot.rotation.x = Math.PI;
    const tex = canvasTex(512, 96, (c, w, h) => { c.fillStyle = 'rgba(8,14,36,.92)'; c.beginPath(); c.roundRect(0, 0, w, h, 18); c.fill(); c.fillStyle = '#d8f55a'; c.font = "800 40px 'Plus Jakarta Sans', Inter, sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, w / 2, h / 2); });
    document.fonts?.ready.then(() => { tex.needsUpdate = true; });
    const plateMaterial = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); part(new THREE.PlaneGeometry(1.7, .32), plateMaterial, 0, .5, .9, g); plates.push({ material: plateMaterial, point: new THREE.Vector3(x, .5, z + .9) });
    const item = new THREE.Group(); item.position.set(0, .22, 0); g.add(item); build(item); spin.push(item);
    return g;
  }
  const suitTexture = (base, lines) => canvasTex(128, 128, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); if (lines) { c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(w / 2, h / 2, 14 + i * 16, 0, 7); c.stroke(); } for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(i * .52) * 100, h / 2 + Math.sin(i * .52) * 100); c.stroke(); } } });
  /** A posed humanoid built from capsules and spheres. Returns joints so each hero can add details. */
  function humanoid(item, o) {
    const g = new THREE.Group(); item.add(g);
    const cap = (r, len, mat, x, y, z, rx = 0, rz = 0) => { const m = part(new THREE.CapsuleGeometry(r, len, 8, 16), mat, x, y, z, g); m.rotation.set(rx, 0, rz); return m; };
    // legs: thigh + shin, feet
    for (const sx of [-1, 1]) {
      cap(.15, .5, o.legs, sx * .2, 1.0, 0, 0, sx * -.04); cap(.115, .5, o.legs, sx * .23, .42, .02, 0, sx * -.02);
      part(new THREE.SphereGeometry(.14, 16, 12), o.legs, sx * .21, .72, .02, g);
      const boot = part(new THREE.CapsuleGeometry(.11, .22, 6, 12), o.boots, sx * .24, .1, .12, g); boot.rotation.x = Math.PI / 2; boot.scale.set(1, 1, .8);
    }
    // pelvis and torso: waist taper into broad chest
    part(new THREE.CylinderGeometry(.27, .24, .26, 20), o.waist || o.body, 0, 1.4, 0, g);
    const torso = part(new THREE.CylinderGeometry(.42, .27, .72, 24), o.body, 0, 1.86, 0, g); torso.scale.set(1, 1, .72);
    part(new THREE.SphereGeometry(.42, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), o.body, 0, 2.2, 0, g).scale.set(1, .55, .72);
    // shoulders, arms (one relaxed, one raised in a heroic pose), hands
    for (const sx of [-1, 1]) {
      part(new THREE.SphereGeometry(.19, 18, 14), o.shoulder || o.body, sx * .5, 2.12, 0, g);
      const upper = cap(.1, .42, o.arms, sx * .6, 1.82, 0, 0, sx * .28);
      const raised = sx === 1;
      const fore = cap(.088, .4, o.arms, sx * (raised ? .78 : .74), raised ? 1.5 : 1.5, raised ? .22 : .04, raised ? -.9 : 0, sx * (raised ? .05 : .2));
      const hand = part(new THREE.SphereGeometry(.105, 14, 12), o.hands, sx * (raised ? .82 : .83), raised ? 1.4 : 1.22, raised ? .52 : .06, g);
      if (o.palm && raised) part(new THREE.CircleGeometry(.07, 16), B(o.palm), sx * .82, 1.38, .6, g);
      void upper; void fore; void hand;
    }
    part(new THREE.CylinderGeometry(.1, .12, .16, 14), o.body, 0, 2.34, 0, g);
    return g;
  }
  function ironMan(item) {
    const g = humanoid(item, { legs: RED, boots: GOLD, body: RED, shoulder: RED, arms: RED, hands: GOLD, waist: GOLD, palm: 0xaff4ff });
    // helmet: red dome, gold faceplate, glowing eyes
    const helmet = part(new THREE.SphereGeometry(.25, 28, 20), RED, 0, 2.6, 0, g); helmet.scale.set(.95, 1.08, 1);
    const face = part(new THREE.SphereGeometry(.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * .62), GOLD, 0, 2.58, .1, g); face.rotation.x = Math.PI / 2 - .25; face.scale.set(.95, 1, 1.05);
    part(new THREE.BoxGeometry(.14, .04, .02), B(0xaff4ff), -.075, 2.64, .26, g); part(new THREE.BoxGeometry(.14, .04, .02), B(0xaff4ff), .075, 2.64, .26, g);
    part(new THREE.BoxGeometry(.05, .12, .02), RED, 0, 2.52, .27, g);
    // chest: gold plating and arc reactor, gold shoulder caps, thigh and shin stripes
    part(new THREE.CircleGeometry(.1, 24), B(0xaff4ff), 0, 2.0, .31, g); part(new THREE.TorusGeometry(.115, .03, 10, 28), SILVER, 0, 2.0, .31, g);
    const plate = part(new THREE.SphereGeometry(.34, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), GOLD, 0, 2.18, 0, g); plate.scale.set(1.05, .45, .7);
    for (const sx of [-1, 1]) { part(new THREE.SphereGeometry(.12, 12, 10), GOLD, sx * .5, 2.2, .02, g); part(new THREE.BoxGeometry(.1, .4, .03), GOLD, sx * .2, 1.0, .15, g); part(new THREE.BoxGeometry(.08, .38, .03), GOLD, sx * .23, .42, .16, g); }
  }
  function spiderMan(item) {
    const web = new THREE.MeshStandardMaterial({ map: suitTexture('#c4151f', true), roughness: .55 }), blue = new THREE.MeshStandardMaterial({ map: suitTexture('#1b3f9e', true), roughness: .55 });
    const g = humanoid(item, { legs: blue, boots: web, body: web, shoulder: web, arms: web, hands: web, waist: blue });
    // masked head with large white lenses, spider emblem and blue sides
    part(new THREE.SphereGeometry(.24, 28, 20), web, 0, 2.6, 0, g).scale.set(.92, 1.08, 1);
    for (const sx of [-1, 1]) {
      const lens = part(new THREE.SphereGeometry(.085, 14, 10), WHITE, sx * .1, 2.62, .2, g); lens.scale.set(1.25, .8, .35); lens.rotation.z = sx * -.35;
      const rim = part(new THREE.TorusGeometry(.085, .012, 8, 18), BLACK, sx * .1, 2.62, .215, g); rim.scale.set(1.25, .8, 1); rim.rotation.z = sx * -.35;
    }
    const emblem = part(new THREE.CircleGeometry(.07, 12), BLACK, 0, 2.05, .31, g);
    for (let k = 0; k < 6; k++) { const leg = part(new THREE.BoxGeometry(.012, .13, .01), BLACK, Math.cos(k * 1.05) * .09, 2.05 + Math.sin(k * 1.05) * .07, .315, g); leg.rotation.z = k * 1.05; }
    part(new THREE.BoxGeometry(.28, .3, .06), blue, 0, 1.72, .2, g);
    void emblem;
  }
  function antMan(item) {
    const head = part(new THREE.SphereGeometry(.46, 28, 20), RED, 0, 1.55, 0, item); head.scale.set(1, 1.05, 1);
    for (const sx of [-1, 1]) {
      const lens = part(new THREE.SphereGeometry(.13, 14, 10), BLACK, sx * .18, 1.62, .38, item); lens.scale.set(1.2, 1, .5); part(new THREE.TorusGeometry(.13, .025, 8, 16), SILVER, sx * .18, 1.62, .4, item);
      part(new THREE.CylinderGeometry(.17, .17, .1, 18), SILVER, sx * .38, 1.48, .12, item).rotation.z = Math.PI / 2;
      const ant = part(new THREE.CylinderGeometry(.015, .015, .3, 6), SILVER, sx * .22, 2.0, .15, item); ant.rotation.z = sx * -.4;
    }
    part(new THREE.BoxGeometry(.3, .1, .06), SILVER, 0, 1.25, .42, item);
    part(new THREE.CylinderGeometry(.12, .2, .22, 16), SILVER, 0, 1.0, 0, item);
  }
  function captainShield(item) {
    const g = new THREE.Group(); g.position.y = 1.4; item.add(g);
    [[.8, RED], [.62, WHITE], [.45, RED], [.28, BLUE]].forEach(([r, m], k) => { const d = part(new THREE.CylinderGeometry(r, r, .06, 40), m, 0, 0, k * .012, g); d.rotation.x = Math.PI / 2; });
    const star = part(new THREE.CircleGeometry(.22, 5), B(0xf5f5f5), 0, 0, .1, g); star.rotation.z = Math.PI / 2;
  }
  function mjolnir(item) {
    const g = new THREE.Group(); g.position.y = 1.2; g.rotation.z = Math.PI / 2 - .5; item.add(g);
    part(new THREE.CylinderGeometry(.06, .06, 1.2, 12), M(0x6a5240, { metalness: .1 }), 0, -.2, 0, g);
    part(new THREE.BoxGeometry(.8, .42, .42), SILVER, 0, .5, 0, g);
    part(new THREE.BoxGeometry(.82, .06, .44), M(0x77828f), 0, .5, 0, g);
  }
  function gauntlet(item) {
    const g = new THREE.Group(); g.position.y = 1.2; item.add(g);
    part(new THREE.BoxGeometry(.5, .8, .3), GOLD, 0, 0, 0, g); part(new THREE.CylinderGeometry(.24, .28, .45, 16), BLUE, 0, -.6, 0, g);
    for (let k = 0; k < 4; k++) part(new THREE.CapsuleGeometry(.055, .32, 4, 8), GOLD, -.18 + k * .12, .55, 0, g);
    part(new THREE.CapsuleGeometry(.06, .3, 4, 8), GOLD, .36, .2, 0, g).rotation.z = -.7;
    [0xa066ff, 0x4aa3ff, 0xff4d4d, 0xffc928, 0x3fe08a, 0xff8a3d].forEach((c, k) => part(new THREE.OctahedronGeometry(.055), B(c), -.15 + (k % 3) * .15, .1 + Math.floor(k / 3) * .22, .17, g));
  }
  function hulkFist(item) {
    const green = M(0x3fa34d, { metalness: .05, roughness: .6 }), g = new THREE.Group(); g.position.y = 1.2; item.add(g);
    part(new THREE.BoxGeometry(.8, .6, .6), green, 0, 0, 0, g); for (let k = 0; k < 4; k++) part(new THREE.SphereGeometry(.17, 14, 12), green, -.27 + k * .18, .38, .2, g);
    part(new THREE.SphereGeometry(.15, 12, 10), green, .42, .1, .22, g); part(new THREE.CylinderGeometry(.3, .38, .6, 16), green, 0, -.55, 0, g);
    part(new THREE.CylinderGeometry(.32, .32, .12, 16), M(0x6b2f8a, { metalness: .1 }), 0, -.78, 0, g);
  }
  function pantherMask(item) {
    const head = part(new THREE.SphereGeometry(.45, 28, 20), BLACK, 0, 1.55, 0, item); head.scale.set(.9, 1.15, .9);
    for (const sx of [-1, 1]) { part(new THREE.ConeGeometry(.12, .3, 4), BLACK, sx * .3, 2.05, 0, item); const eye = part(new THREE.BoxGeometry(.16, .05, .02), B(0xffffff), sx * .15, 1.65, .36, item); eye.rotation.z = sx * .35; }
    for (let k = 0; k < 5; k++) part(new THREE.BoxGeometry(.28, .018, .02), SILVER, 0, 1.35 + k * .08, .4, item).rotation.z = 0;
    part(new THREE.BoxGeometry(.04, .55, .02), SILVER, 0, 1.55, .42, item);
  }
  function hawkeyeBow(item) {
    const g = new THREE.Group(); g.position.y = 1.4; item.add(g);
    part(new THREE.TorusGeometry(.7, .04, 8, 36, Math.PI), M(0x4a2f86), 0, 0, 0, g).rotation.z = -Math.PI / 2;
    part(new THREE.CylinderGeometry(.008, .008, 1.4, 4), B(0xdddddd), -.7, 0, 0, g).rotation.x = 0;
    part(new THREE.CylinderGeometry(.012, .012, 1.3, 6), M(0x777777), -.2, 0, 0, g).rotation.z = Math.PI / 2;
    part(new THREE.ConeGeometry(.05, .16, 6), M(0xc8252f), .45, 0, 0, g).rotation.z = -Math.PI / 2;
  }
  function reactor(item) {
    const g = new THREE.Group(); g.position.y = 1.4; item.add(g);
    part(new THREE.TorusGeometry(.55, .1, 16, 48), M(0x9aa6b8, { metalness: .9 }), 0, 0, 0, g);
    part(new THREE.CircleGeometry(.43, 40), B(0x8ff3ff), 0, 0, .01, g);
    for (let k = 0; k < 10; k++) { const an = k / 10 * Math.PI * 2, sp = part(new THREE.BoxGeometry(.04, .3, .02), B(0x1b6f8a), Math.cos(an) * .25, Math.sin(an) * .25, .02, g); sp.rotation.z = an - Math.PI / 2; }
  }
  const props = [['IRON MAN', ironMan, 0xff5a4a], ['SPIDER-MAN', spiderMan, 0xff5a4a], ['ANT-MAN', antMan, 0xff5a4a], ['CAPTAIN AMERICA', captainShield, 0x4a8cff], ['THOR', mjolnir, 0x9fd0ff], ['INFINITY GAUNTLET', gauntlet, 0xffc928], ['HULK', hulkFist, 0x5fe08a], ['BLACK PANTHER', pantherMask, 0xa066ff], ['HAWKEYE', hawkeyeBow, 0xa066ff], ['ARC REACTOR', reactor, 0x8ff3ff]];
  let propIndex = 0;
  for (let n = 0; n < sections.length; n++) for (const dx of [-6.2, -3.2, 3.2, 6.2]) { const [name, fn, tint] = props[propIndex++ % props.length]; alcove(n * SPACING + dx, name, fn, tint); }
  // Avengers emblem inlaid in the floor of every bay, and banners overhead
  const emblem = canvasTex(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, h / 2, 215, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = "800 330px 'Plus Jakarta Sans', Inter, sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('A', w / 2, h / 2 + 18);
    c.strokeStyle = 'rgba(53,200,255,.9)'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, 245, 0, 7); c.stroke();
  });
  document.fonts?.ready.then(() => { emblem.needsUpdate = true; });
  for (let n = 0; n < sections.length; n++) { const e = add(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshBasicMaterial({ map: emblem, transparent: true, opacity: .14, depthWrite: false }), n * SPACING, .022, 4.9); e.rotation.x = -Math.PI / 2; }
  const flagTexture = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#9d1822'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e0b43a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeStyle = 'rgba(224,180,58,.5)'; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
    g.save(); g.translate(w / 2, 190); g.rotate(-.5); g.fillStyle = '#e0b43a'; g.fillRect(-12, -10, 24, 150); g.fillStyle = '#f2d98a'; g.fillRect(-62, -70, 124, 70); g.strokeStyle = '#7a5a12'; g.lineWidth = 5; g.strokeRect(-62, -70, 124, 70); g.restore();
    g.fillStyle = '#e0b43a'; g.textAlign = 'center'; g.font = "800 40px 'Plus Jakarta Sans', Inter, sans-serif"; g.fillText('AVENGERS', w / 2, 380); g.fillStyle = '#f2d98a'; g.font = '600 24px Inter, sans-serif'; g.fillText('ASSEMBLE', w / 2, 420);
  });
  document.fonts?.ready.then(() => { flagTexture.needsUpdate = true; });
  const flagMaterial = new THREE.MeshBasicMaterial({ map: flagTexture, side: THREE.DoubleSide }), flags = [];
  for (let n = 0; n < sections.length; n++) for (const dx of [-8.5, 8.5]) { const flag = add(new THREE.PlaneGeometry(1.2, 2.4), flagMaterial, n * SPACING + dx, HQ_H - 1.5, -6); flag.userData.sway = n * 1.7 + dx; flags.push(flag); }
  const heroSpin = spin.map(o => [o, .5]);
  // brand sign above the final bay, clear of the text
  const sign = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = 'rgba(10,16,38,.92)'; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill(); g.fillStyle = '#d8f55a'; g.font = "800 62px 'Plus Jakarta Sans', Inter, sans-serif"; g.textBaseline = 'middle'; g.fillText('Brain Station 23', 56, 96); g.fillStyle = '#9db0ff'; g.font = "600 30px Inter, sans-serif"; g.fillText('Product · Technology · Delivery', 58, 178); g.fillStyle = '#35c8ff'; g.fillRect(56, 214, 140, 6); });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: sign, transparent: true })); signMesh.position.set((sections.length - 1) * SPACING + 2.2, 6.5, -9.2); scene.add(signMesh);
  document.fonts?.ready.then(() => { sign.needsUpdate = true; });

  // ---- The city skyline outside, seen through the glass ----
  const city = new THREE.Group(); scene.add(city);
  const cityMaterials = [];
  function windowTexture() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#060b1c'; g.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 32; row++) for (let col = 0; col < 8; col++) {
      if (Math.random() < .45) { g.fillStyle = ['#ffe3a8', '#ffffff', '#bcd8ff', '#ffd98a'][Math.floor(Math.random() * 4)]; g.globalAlpha = .5 + Math.random() * .5; g.fillRect(col * 16 + 3, row * 8 + 2, 10, 4); }
    }
    g.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(c); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  const towerTextures = [0, 1, 2].map(windowTexture);
  for (const [zMin, zRange, scale] of [[-160, 20, 3.4]]) {
    for (let x = -140; x < length + 150; x += 9 * scale / 2) {
      const w = (3 + Math.random() * 3) * scale, h = (14 + Math.random() * 40) * (scale > 3 ? 1.3 : 1), d = (3 + Math.random() * 3) * scale;
      const map = towerTextures[Math.floor(Math.random() * 3)].clone(); map.needsUpdate = true; map.repeat.set(Math.max(1, w / 3), Math.max(1, h / 6));
      const material = new THREE.MeshStandardMaterial({ color: 0x0b1530, map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .55, roughness: .5, metalness: .4 });
      cityMaterials.push(material);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); tower.position.set(x + Math.random() * 2, h / 2 - 12, zMin - Math.random() * zRange); city.add(tower);
    }
  }
  const rain = { material: { opacity: 0 } }, beams = [];
  // Bifrost: rainbow light columns in the distance
  const bifrostTexture = canvasTex(256, 64, (g, w, h) => { const grad = g.createLinearGradient(0, 0, w, 0); ['#ff4d6d', '#ffb347', '#ffe66d', '#6dff8c', '#4dd2ff', '#8a6dff', '#ff4d6d'].forEach((c, k, a) => grad.addColorStop(k / (a.length - 1), c)); g.fillStyle = grad; g.fillRect(0, 0, w, h); });
  bifrostTexture.wrapS = THREE.RepeatWrapping; bifrostTexture.repeat.set(2, 1);
  const bifrostMaterial = new THREE.MeshBasicMaterial({ map: bifrostTexture, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }), bifrosts = [];
  for (let k = 0; k < Math.ceil(length / 34) + 2; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 150, 24, 1, true), bifrostMaterial); b.position.set(-30 + k * 34 + (k % 2) * 8, 55, -50 - (k % 3) * 10); city.add(b); bifrosts.push(b); }
  // Asgardian golden spires and a tall Avengers Tower among the skyline
  const goldSpire = new THREE.MeshStandardMaterial({ color: 0xe0b43a, metalness: .9, roughness: .25, emissive: 0x6a4a08, emissiveIntensity: .5 });
  for (let x = -90; x < length + 100; x += 18) {
    const h = 30 + (Math.abs(Math.sin(x)) * 26), sp = new THREE.Group(); sp.position.set(x, -12, -62 - (Math.abs(Math.cos(x * .7)) * 22)); city.add(sp);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.4, h, 8), goldSpire); body.position.y = h / 2; sp.add(body);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 12, 8), goldSpire); cone.position.y = h + 6; sp.add(cone);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldSpire); dome.position.y = h * .55; sp.add(dome);
  }
  const towerFrame = new THREE.MeshStandardMaterial({ color: 0x1a2340, metalness: .6, roughness: .3, emissive: 0x16305f, emissiveIntensity: .6 });
  { const g = new THREE.Group(); g.position.set(midX, -12, -80); city.add(g);
    for (let k = 0; k < 6; k++) { const w = 12 - k * 1.4, p = new THREE.Mesh(new THREE.BoxGeometry(w, 15, w), towerFrame); p.position.y = k * 15 + 7.5; g.add(p); }
    const aTex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.strokeStyle = '#ffffff'; c.lineWidth = 16; c.beginPath(); c.arc(w / 2, h / 2, 100, 0, 7); c.stroke(); c.fillStyle = '#ffffff'; c.font = "800 190px 'Plus Jakarta Sans', Inter, sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('A', w / 2, h / 2 + 12); });
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: aTex, transparent: true, fog: false })); logo.position.set(0, 74, 7.5); g.add(logo); }
  // storm: low clouds that drift, plus occasional lightning that flashes the whole sky
  const cloudTexture = canvasTex(256, 128, (g, w, h) => { for (let k = 0; k < 26; k++) { const x = Math.random() * w, y = h / 2 + (Math.random() - .5) * 30, r = 18 + Math.random() * 28, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(210,200,255,.5)'); gr.addColorStop(1, 'rgba(210,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } });
  const clouds = [];
  for (let k = 0; k < 22; k++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(70, 30), new THREE.MeshBasicMaterial({ map: cloudTexture, transparent: true, opacity: .55, depthWrite: false, fog: false })); c.position.set(-60 + k * 14, 34 + (k % 4) * 6, -95 - (k % 3) * 12); city.add(c); clouds.push(c); }
  const boltGeometry = new THREE.BufferGeometry(), boltMaterial = new THREE.LineBasicMaterial({ color: 0xcfe8ff, fog: false });
  const bolt = new THREE.Line(boltGeometry, boltMaterial); bolt.visible = false; bolt.frustumCulled = false; scene.add(bolt);
  let flashAt = 4, flashUntil = 0;
  function strike(t, camX) {
    flashUntil = t + .22; const pts = [], x0 = camX + (Math.random() - .5) * 60, z = -70 - Math.random() * 20; let x = x0, y = 60;
    while (y > -4) { pts.push(x, y, z); x += (Math.random() - .5) * 5; y -= 4 + Math.random() * 5; } boltGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); bolt.visible = true;
  }

  const sets = createSets(THREE); scene.add(sets.root);
  const pickables = sets.pickables();
  const avatar = createAvatar(THREE, { say, invalidate: () => { dirty = true; } }); scene.add(avatar.group); talkHook = ms => avatar.talk(ms);

  // ---- layout and scroll ----------------------------------------------------------
  const DIST = 11.8;
  let mobile = false, tops = [], bottoms = [];
  function measure() {
    mobile = innerWidth < 860;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    tops = sections.map(s => s.getBoundingClientRect().top + scrollY);
    bottoms = sections.map((s, i) => tops[i] + s.offsetHeight);
    dirty = true;
  }
  const sideOf = i => (sections[i]?.dataset.side === 'right' ? -1 : 1); // +1: panel on the left, character on the right
  function stationParam() {
    const probe = scrollY + (mobile ? innerHeight * .72 : innerHeight * .5), window_ = innerHeight * .5;
    let value = 0;
    if (!bottoms.length) return 0;
    for (let k = 0; k < sections.length - 1; k++) value += smooth(clamp((probe - (bottoms[k] - window_ / 2)) / window_));
    return Number.isFinite(value) ? clamp(value, 0, sections.length - 1) : 0;
  }

  // ---- state ----------------------------------------------------------------------
  let dirty = true, u = 0, avU = 0, dir = 1, arrived = -1, dayK = 0, step = 0, skill = -1, lastInput = performance.now();
  const mouse = { x: 0, y: 0 }, avPos = { x: 0, y: .28 }, camPos = { x: 0 }, headPoint = new THREE.Vector3(), ndc = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3(), themeColor = new THREE.Color(), horizonColor = new THREE.Color(), tmp = new THREE.Color();
  const standState = () => ({ step, skill });
  function applyTheme(k) {
    skyUniforms.top.value.set(NIGHT.top).lerp(tmp.set(DAY.top), k); horizonColor.set(NIGHT.horizon).lerp(tmp.set(DAY.horizon), k);
    skyUniforms.bottom.value.copy(horizonColor); scene.fog.color.copy(horizonColor);
    hqMaterials.forEach(([m, n, d]) => m.color.copy(n).lerp(d, k));
    hemi.color.set(0xcdd4ea).lerp(tmp.set(0xffffff), k); hemi.groundColor.set(0x0b1030).lerp(tmp.set(0x9fb6d8), k); hemi.intensity = lerp(1.5, 1.9, k);
    key.intensity = lerp(3, 3.2, k); rim.intensity = lerp(2.2, 1.2, k); accentLight.intensity = lerp(10, 4, k); fill.intensity = lerp(1.1, .6, k);
    stars.material.opacity = 1 - k; sun.material.opacity = k; panelMaterial.color.set(0xf2f7ff).lerp(tmp.set(0xffffff), k); screenMaterial.color.set(0x4a8fd8).lerp(tmp.set(0x3b83ff), k); glass.material.opacity = .07 + k * .06;
    sets.applyTheme(k); avatar.setShades(k > .5);
    cityMaterials.forEach(m => { m.emissiveIntensity = lerp(.55, .06, k); m.color.set(0x1a1038).lerp(tmp.set(0xb6b0d8), k); }); bifrostMaterial.opacity = .5 * (1 - k * .6); clouds.forEach(c => { c.material.opacity = .55 * (1 - k * .4); }); void beams;
  }

  const perf = { frames: 0, sum: 0, level: 0 };
  let last = performance.now();
  function frame(time) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = time; return; }
    const dt = Math.min((time - last) / 1000 || .016, .4); last = time;
    const t = time * .001;
    perf.frames++; perf.sum += dt;
    if (perf.frames === 90) { const avg = perf.sum / 90; perf.frames = 0; perf.sum = 0; if (avg > .034 && perf.level < 2) { perf.level++; renderer.setPixelRatio(perf.level === 1 ? 1 : .75); measure(); if (perf.level === 2) flames.forEach(fl => { if (fl.isLight) fl.visible = false; }); } }
    u = stationParam();
    const prev = avU;
    if (!Number.isFinite(avU)) avU = u;
    avU = paused ? u : avU + clamp(u - avU, -1, 1) * (1 - Math.exp(-dt * 4.5));
    if (Math.abs(u - avU) < .004) avU = u;
    const speed = Math.abs(avU - prev) / dt, walking = !paused && speed > .06;
    if (Math.abs(u - avU) > .01) dir = Math.sign(u - avU) || dir;
    if (!paused && (walking || Math.abs(u - avU) > .004 || dirty === 'always')) dirty = true;
    if (paused && !dirty && Math.abs(dayK - targetDay()) < .001) return;

    const last_ = sets.stations.length - 1; if (!Number.isFinite(avU)) avU = 0;
    const i0 = Math.max(0, Math.min(Math.floor(avU), last_)), i1 = Math.min(i0 + 1, last_), f = clamp(avU - i0);
    const s0 = sets.stations[i0], s1 = sets.stations[i1], a = s0.stand(standState()), b = s1.stand(standState());
    const targetX = lerp(s0.x + a.x, s1.x + b.x, f), targetY = lerp(a.y, b.y, f), focusX = lerp(s0.x + (s0.focus || 0), s1.x + (s1.focus || 0), f);
    const follow = paused ? 1 : 1 - Math.exp(-dt * 9);
    avPos.x = lerp(avPos.x, targetX, follow); avPos.y = lerp(avPos.y, targetY, follow);
    if (Math.abs(avPos.x - targetX) < .01) avPos.x = targetX;

    // The character walks while the page scrolls, then settles into the station's pose.
    const near = sets.stations[Math.max(0, Math.min(Math.round(avU), last_))];
    const sideNow = mobile ? 0 : lerp(sideOf(i0), sideOf(i1), smooth(f));
    if (!walking && Math.abs(u - avU) < .02 && arrived !== near.index) {
      arrived = near.index; avatar.animatePose(near.rest, near.rest === 'wave' ? 3 : undefined);
      if (QUIPS[near.index] && performance.now() > 2500) say(QUIPS[near.index]);
    }
    avatar.group.position.set(avPos.x, avPos.y, 0);
    avatar.update(time, { dt, paused, walking, yaw: 0, face: walking ? dir : (sideNow > .2 ? -1 : sideNow < -.2 ? 1 : 1), rest: near.rest });

    // Camera: the character sits on the side opposite the text panel.
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * DIST * camera.aspect;
    const camX = focusX - sideNow * halfWidth * .44, parallax = paused ? 0 : 1;
    camera.position.set(camX + mouse.x * .45 * parallax, 2.8 + (avPos.y - .28) * .35 - mouse.y * .22 * parallax, DIST);
    camera.lookAt(camX + mouse.x * .2 * parallax, (mobile ? 1.85 : 1.6) + (avPos.y - .28) * .4, 0);
    fill.position.set(avPos.x, 3, 10); fill.target.position.set(avPos.x, 1.5, 0);
    key.position.set(avPos.x - 3.5, 6.5, 6); key.target.position.set(avPos.x, 1.6, 0); rim.position.set(avPos.x + 4, 4.5, -4);
    accentLight.position.set(avPos.x, 3.4, 3.2); accentLight.color.set(near.accent).lerp(tmp.set(0xffffff), .45);
    sky.position.copy(camera.position); far.position.set(camX * .9, camera.position.y, camera.position.z);

    const target = targetDay(); dayK += (target - dayK) * (paused ? 1 : 1 - Math.exp(-dt * 3));
    applyTheme(dayK);
    sets.stations.forEach(s => { s.group.visible = Math.abs(s.x - camX) < 34; if (s.group.visible) s.update(t, dt, { step, skill }); });
    sets.tick(t);
    plates.forEach(p => { tmpV.copy(p.point).project(camera); p.material.opacity = clamp((.74 - Math.abs(tmpV.x)) / .12); });
    clouds.forEach((c, i) => { c.position.x += dt * (.4 + (i % 3) * .2); if (c.position.x > length + 90) c.position.x = -90; });
    bifrostTexture.offset.x = t * .05; bifrostMaterial.opacity = (.42 + Math.sin(t * 1.3) * .08) * (1 - dayK * .6);
    flames.forEach((fl, i) => { if (fl.isLight) fl.intensity = 4.5 + Math.sin(t * 11 + i) * 1.2; else { fl.scale.y = 1 + Math.sin(t * 9 + i * 1.7) * .22; fl.scale.x = 1 + Math.sin(t * 7 + i) * .1; } });
    if (t > flashAt && dayK < .5 && !paused) { strike(t, camX); flashAt = t + 5 + Math.random() * 7; }
    const flashing = t < flashUntil; bolt.visible = flashing && dayK < .5; if (flashing) { hemi.intensity += (Math.sin(t * 60) > 0 ? 2.2 : .8); }
    heroSpin.forEach(([o, speed]) => { if (speed) o.rotation.y = Math.sin(t * speed + o.position.x) * .5; });
    flags.forEach(o => { o.rotation.y = Math.sin(t * .9 + o.userData.sway) * .12; });
    if (!paused) {
      for (let i = 0; i < flyCount; i++) { const d = flyData[i]; flyPositions.set([camX + (d.x - .5) * 34 + Math.sin(t * .5 + d.p) * .6, d.y + Math.sin(t * .8 + d.p) * .4, d.z + Math.cos(t * .4 + d.p) * .5], i * 3); }
      flyGeometry.attributes.position.needsUpdate = true; flies.visible = true;
    } else flies.visible = false;
    
    renderer.render(scene, camera); dirty = false;
    if (bubble.classList.contains('is-visible')) placeBubble();
    progress.style.transform = `scaleX(${clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight))})`;
  }
  const targetDay = () => (root.dataset.theme === 'light' ? 1 : 0);
  const progress = document.getElementById('progress');
  function placeBubble() {
    avatar.headWorld(headPoint); headPoint.project(camera);
    const rect = canvas.getBoundingClientRect();
    const hx = (headPoint.x * .5 + .5) * rect.width + rect.left, hy = (-headPoint.y * .5 + .5) * rect.height + rect.top;
    const barBottom = (parseFloat(getComputedStyle(root).getPropertyValue('--bar')) || 72) + 6;
    // Above the head if the whole bubble clears the header; otherwise beside the head, on whichever side has more room.
    bubble.classList.remove('side-left', 'side-right'); bubble.style.maxWidth = '';
    if (hy - 18 - bubble.offsetHeight >= barBottom) {
      bubble.style.transform = `translate(${clamp(hx, 110, innerWidth - 110)}px, ${hy - 18}px) translate(-50%, -100%)`;
      return;
    }
    const gap = 46, room = [hx - gap - 10, innerWidth - hx - gap - 10], left = room[0] >= room[1];
    bubble.style.maxWidth = `${Math.max(120, Math.min(250, room[left ? 0 : 1]))}px`;
    bubble.classList.add(left ? 'side-left' : 'side-right');
    const y = Math.max(barBottom + bubble.offsetHeight / 2, hy + 30), x = hx + (left ? -gap : gap);
    bubble.style.transform = `translate(${x}px, ${y}px) translate(${left ? '-100%' : '0'}, -50%)`;
  }

  // ---- interaction ------------------------------------------------------------------
  let clicks = [];
  function ndcOf(event) { const r = canvas.getBoundingClientRect(); ndc.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); }
  function pickAt(event) {
    ndcOf(event);
    const part = avatar.hit(raycaster); if (part) return { part };
    const hit = raycaster.intersectObjects(pickables, false)[0];
    for (let o = hit?.object; o; o = o.parent) if (o.userData.pick) return { pick: o.userData.pick };
    return null;
  }
  // Dragging across him turns him to face that way; a plain tap still pokes him.
  let dragFrom = null, dragged = false;
  canvas.addEventListener('pointerdown', event => { dragFrom = { x: event.clientX, id: event.pointerId }; dragged = false; });
  canvas.addEventListener('pointermove', event => {
    if (!dragFrom || event.pointerId !== dragFrom.id) return;
    const dx = event.clientX - dragFrom.x;
    if (Math.abs(dx) > 10) { dragged = true; avatar.turnTo(dx > 0 ? 1 : -1); dirty = true; }
  });
  const endDrag = () => { dragFrom = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('click', event => {
    if (dragged) { dragged = false; return; }
    lastInput = performance.now();
    const now = performance.now(); clicks = clicks.filter(c => now - c < 2200); clicks.push(now);
    if (clicks.length >= 5) { clicks = []; say('Okay, okay. I’m dizzy! 😵‍💫'); avatar.animatePose('spin'); return; }
    const found = pickAt(event); dirty = true;
    if (found?.pick) { const r = found.pick(); if (r) { say(r.say); avatar.animatePose(r.act); } return; }
    if (found?.part) avatar.react(found.part);
    else if (found) avatar.fun();
  });
  canvas.addEventListener('dblclick', event => { const found = pickAt(event); if (found?.part) avatar.play('jump'); });
  let hoverFrame = 0;
  window.addEventListener('pointermove', event => {
    lastInput = performance.now(); dirty = true;
    mouse.x = (event.clientX / innerWidth - .5) * 2; mouse.y = (event.clientY / innerHeight - .5) * 2;
    if (event.pointerType === 'touch' || paused) return;
    avatar.group.updateMatrixWorld(true); avatar.headWorld(headPoint); headPoint.project(camera);
    const rect = canvas.getBoundingClientRect(), hx = (headPoint.x * .5 + .5) * rect.width + rect.left, hy = (-headPoint.y * .5 + .5) * rect.height + rect.top;
    const ax = (event.clientX - hx) / (innerWidth * .4), ay = (event.clientY - hy) / (innerHeight * .4);
    if (Number.isFinite(ax) && Number.isFinite(ay)) avatar.aim(clamp(ax, -1, 1), clamp(ay, -1, 1));
    if (event.target === canvas && !hoverFrame) hoverFrame = requestAnimationFrame(() => { hoverFrame = 0; canvas.style.cursor = pickAt(event) ? 'pointer' : ''; });
    else if (event.target !== canvas) canvas.style.cursor = '';
  }, { passive: true });
  root.addEventListener('mouseleave', () => avatar.aim(0, 0));
  addEventListener('scroll', () => { lastInput = performance.now(); dirty = true; }, { passive: true });
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  document.fonts?.ready.then(measure);
  addEventListener('load', measure);

  // Quick-play tray and keyboard shortcuts.
  const SHORTCUTS = { d: 'dance', t: 'code', c: 'coffee', b: 'thunder', h: 'thunder', j: 'jump', f: 'flex', s: 'spin', w: 'wave', p: 'hero', a: 'clap', m: 'shrug', r: 'salute' };
  document.querySelectorAll('[data-activity]').forEach(button => button.addEventListener('click', () => { lastInput = performance.now(); avatar.play(button.dataset.activity); dirty = true; }));
  addEventListener('keydown', event => {
    lastInput = performance.now();
    const name = SHORTCUTS[event.key.toLowerCase()];
    if (!name || paused || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
    avatar.play(name);
  });
  function setPaused(value) {
    paused = value; dirty = true;
  }
  reduced.addEventListener('change', event => setPaused(event.matches));
  setPaused(paused);

  // The page talks to the world through events: tabs, filters, skill cards, copy button.
  addEventListener('faiaz:ui', event => {
    const { type, key: name, index } = event.detail; dirty = true;
    if (type === 'tab') { step = ['research', 'define', 'build'].indexOf(name); avatar.animatePose(['think','point','present'][step]); say(['Ask first. Build later.', 'Clear beats clever.', 'Ship it, together.'][step]); }
    if (type === 'filter') { avatar.animatePose('point', 2.2); say('Pulling those up…', 2400); }
    if (type === 'skill') skill = index;
    if (type === 'copied') { avatar.animatePose('celebrate'); say('Email copied. Talk soon? 💌'); dispatchEvent(new CustomEvent('faiaz:world', { detail: { type: 'copied' } })); }
    if (type === 'theme') say(root.dataset.theme === 'light' ? 'Good morning! Shades on. 😎' : 'Night mode. Lights down. 🌙');
  });
  const idle = ['stretch', 'coffee', 'dance', 'jump', 'flex', 'code', 'thunder', 'spin', 'hero', 'clap', 'shrug', 'salute'];
  // Things he says about the section he is standing in, once he has been left alone for a while.
  const CHATTER = [
    ['Psst… try the buttons below. ⚡', 'Tap me. Go on.', 'Scroll down. The good stuff is below.'],
    ['Pick a project. I’ll point at it.', 'Seven projects, zero boring ones.', 'SalesPro23 is my favourite child.'],
    ['Ask me anything. Well, scroll first.', 'Yes, the beard is real.', 'Fun fact: I like a good spreadsheet.'],
    ['Ask, define, build. In that order.', 'Skipping research is how scope creeps.', 'Tabs! Click one!'],
    ['Three gates, one story.', 'It all started with PHP and Laravel.', 'Click a gate and I’ll tell you more.'],
    ['Those chips are my toolkit.', 'Poke a chip. They’re friendly.', 'I use AI for the boring parts.'],
    ['Where it all started. 📚', 'Coffee fuelled most of those exams.', 'CSE taught me to read requirements both ways.'],
    ['Good teams ship good things.', 'Clubs taught me to organise a crowd.', 'Leadership is mostly listening.'],
    ['Say hi. I’m friendly!', 'Email me. I reply fast. Usually.', 'Copy my email, then say hello. 💌']
  ];
  const pickLine = list => list[Math.floor(Math.random() * list.length)];
  (function idleTick() {
    const now = performance.now();
    if (!paused && !document.hidden && now - lastInput > 7000 && !avatar.isBusy(now)) {
      if (Math.random() < .35 && CHATTER[arrived]) avatar.chatter(CHATTER[arrived]);
      else avatar.play(pickLine(idle));
    }
    setTimeout(idleTick, 9000 + Math.random() * 6000);
  })();
  // Little reactions to what the visitor does with the page.
  let lastScrollY = scrollY, lastScrollAt = performance.now(), lastRemark = 0, hiddenAt = 0;
  addEventListener('scroll', () => {
    const now = performance.now(), speed = Math.abs(scrollY - lastScrollY) / Math.max(16, now - lastScrollAt);
    lastScrollY = scrollY; lastScrollAt = now;
    if (speed > 6 && now - lastRemark > 14000 && !paused) { lastRemark = now; avatar.chatter(['Whoa, slow down! I can’t keep up!', 'Easy! I’m wearing a cape here.', 'Speed scrolling detected. 👀']); }
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now(); return; }
    if (hiddenAt && performance.now() - hiddenAt > 12000 && !paused) { avatar.play('wave', false); say(pickLine(['Oh, you’re back! 👀', 'Missed you! Welcome back. 👋', 'Back from the other tab? I waited!'])); }
  });
  if (!paused) setTimeout(() => { if (performance.now() - lastInput > 4000 && !avatar.isBusy(performance.now())) say('Tip: click me, double-click me, or try the buttons below. ⚡', 5200); }, 12000);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); });

  measure(); applyTheme(dayK = targetDay());
  const reveal = Math.max(0, INTRO_MIN_MS - performance.now());
  setTimeout(() => root.classList.add('world-ready'), reveal);
  setTimeout(() => say('Hi, I’m Faiaz! Scroll and I’ll show you around. 👋', 4800), reveal + 1400);
  requestAnimationFrame(frame);}

start();
