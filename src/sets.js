import portraitUrl from './portrait.jpg?url';
import reliefUrl from './warrior_portrait_relief.glb?url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
/* The set pieces of the portfolio world: one station per section, laid out along the x axis. */
export const SPACING = 17;
const C = { blue: '#3b63ff', lime: '#d8f55a', coral: '#ff8a5c', violet: '#8b6bff', white: '#f4f6ff', navy: '#141b3f', ink: '#0c1233', teal: '#3fd6c4', cyan: '#35e6ff' };

export function createSets(THREE) {
  const themed = [];
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .08, ...o });
  const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
  /** A material whose colour follows the night/day switch. */
  const themedStd = (night, day, o = {}) => { const m = std(night, o); themed.push({ m, night: new THREE.Color(night), day: new THREE.Color(day) }); return m; };
  const add = (geometry, material, parent, pos = [0, 0, 0], rot) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...pos); if (rot) mesh.rotation.set(...rot); parent.add(mesh); return mesh;
  };
  const canvasTexture = (w, h, draw) => {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'); draw(ctx, w, h);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    return { canvas, ctx, texture, redraw: () => { ctx.clearRect(0, 0, w, h); draw(ctx, w, h); texture.needsUpdate = true; } };
  };
  const labels = [];
  /** A text plate floating in the scene. Redrawn once the web fonts have loaded. */
  function label(lines, { w = 512, h = 160, scale = 1.6, bg = 'rgba(8,12,36,.82)', border = C.lime, color = '#fff' } = {}) {
    const draw = (ctx) => {
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, 28); ctx.fill();
      ctx.strokeStyle = border; ctx.lineWidth = 4; ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
      lines.forEach(([text, size, weight, fill], i) => {
        ctx.font = `${weight || 700} ${size}px 'Plus Jakarta Sans', Inter, sans-serif`; ctx.fillStyle = fill || color;
        ctx.fillText(text, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (lines[0][1] + 14));
      });
    };
    const tex = canvasTexture(w, h, draw); labels.push(tex);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.texture, transparent: true, depthWrite: false }));
    sprite.scale.set(scale, scale * h / w, 1); return sprite;
  }
  const emoji = (char, size = .8) => {
    const tex = canvasTexture(128, 128, (ctx) => { ctx.font = '84px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(char, 64, 70); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.texture, transparent: true, depthWrite: false })); s.scale.set(size, size, 1); return s;
  };
  const pads = [];
  function platform(accent, radius = 2.4) {
    const g = new THREE.Group();
    add(new THREE.CylinderGeometry(radius, radius + .14, .28, 56), themedStd('#161d45', '#eef3ff', { roughness: .85, metalness: 0 }), g, [0, .14, 0]);
    add(new THREE.TorusGeometry(radius, .05, 10, 72), glow(accent), g, [0, .285, 0], [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(radius - .3, radius - .3, .02, 56), glow(accent, { transparent: true, opacity: .13 }), g, [0, .29, 0]);
    const pulse = add(new THREE.TorusGeometry(radius - .1, .03, 8, 72), glow(C.cyan, { transparent: true, opacity: .3, depthWrite: false }), g, [0, .3, 0], [Math.PI / 2, 0, 0]);
    const arc = add(new THREE.TorusGeometry(radius + .3, .022, 8, 64, Math.PI * 1.15), glow(C.cyan, { transparent: true, opacity: .8 }), g, [0, .33, 0], [Math.PI / 2, 0, 0]);
    const arc2 = add(new THREE.TorusGeometry(radius + .5, .02, 8, 64, Math.PI * .6), glow(accent), g, [0, .33, 0], [Math.PI / 2, 0, 0]);
    pads.push({ pulse, arc, arc2 });
    return g;
  }
  const towerTexture = (seed) => canvasTexture(128, 256, (ctx, W, H) => {
    ctx.fillStyle = '#0c1634'; ctx.fillRect(0, 0, W, H);
    for (let r = 0; r < 30; r++) for (let c = 0; c < 7; c++) if (((r * 7 + c) * 37 + seed * 11) % 5 > 1) { ctx.fillStyle = ['#bcd8ff', '#ffe3a8', '#ffffff'][(r + c + seed) % 3]; ctx.globalAlpha = .6 + ((r * c + seed) % 4) * .1; ctx.fillRect(c * 18 + 6, r * 8 + 2, 12, 4); }
    ctx.globalAlpha = 1;
  }).texture;
  /** An Asgardian golden spire: tiered gold shaft, rune-lit band, dome and a tall pointed crown. */
  function miniTower(w, h, d, seed, accent) {
    const t = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: 0xd9ad3a, metalness: .9, roughness: .28, emissive: 0x5a3c06, emissiveIntensity: .45 });
    const rune = canvasTexture(64, 256, (ctx, W, H) => { ctx.fillStyle = '#e9c869'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = '#7a5410'; ctx.lineWidth = 3; for (let r = 0; r < 8; r++) { const y = 10 + r * 31, k = (r + seed) % 3; ctx.beginPath(); if (k === 0) { ctx.moveTo(18, y); ctx.lineTo(18, y + 22); ctx.lineTo(44, y + 6); } else if (k === 1) { ctx.moveTo(14, y + 22); ctx.lineTo(32, y); ctx.lineTo(50, y + 22); } else { ctx.moveTo(18, y); ctx.lineTo(46, y + 22); ctx.moveTo(46, y); ctx.lineTo(18, y + 22); } ctx.stroke(); } }).texture;
    rune.repeat.set(2, 1);
    add(new THREE.CylinderGeometry(w * .46, w * .62, h, 8), new THREE.MeshStandardMaterial({ map: rune, color: 0xffffff, metalness: .8, roughness: .3, emissive: 0x4a3205, emissiveIntensity: .5 }), t, [0, h / 2, 0]);
    add(new THREE.CylinderGeometry(w * .66, w * .7, .1, 8), gold, t, [0, .05, 0]);
    add(new THREE.CylinderGeometry(w * .5, w * .5, .08, 8), glow(accent), t, [0, h + .02, 0]);
    add(new THREE.SphereGeometry(w * .42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold, t, [0, h + .04, 0]);
    add(new THREE.ConeGeometry(w * .16, .55, 8), gold, t, [0, h + w * .42 + .27, 0]);
    add(new THREE.SphereGeometry(.07, 10, 8), glow('#7fd4ff'), t, [0, h + w * .42 + .58, 0]);
    return t;
  }
  const pick = (mesh, action) => { mesh.userData.pick = action; return mesh; };
  const stations = [];
  const station = (def) => { stations.push(def); return def; };

  // 0 — Welcome: a holographic globe inside a portal, with floating data cards.
  {
    const g = new THREE.Group(); g.add(platform(C.blue, 2.6));
    const ringA = add(new THREE.TorusGeometry(3.3, .07, 16, 110), glow(C.blue), g, [.4, 3.2, -2.8]);
    const ringB = add(new THREE.TorusGeometry(2.75, .035, 12, 110), glow(C.cyan), g, [.4, 3.2, -2.75]);
    add(new THREE.CircleGeometry(3.25, 64), glow('#0d2a8a', { transparent: true, opacity: .3, depthWrite: false }), g, [.4, 3.2, -2.9]);
    const globe = add(new THREE.IcosahedronGeometry(1.25, 2), new THREE.MeshBasicMaterial({ color: C.cyan, wireframe: true, transparent: true, opacity: .32, depthWrite: false }), g, [.4, 3.2, -2.5]);
    const core = add(new THREE.IcosahedronGeometry(.5, 1), glow(C.cyan, { transparent: true, opacity: .55, depthWrite: false }), g, [.4, 3.2, -2.5]);
    const orbits = [[1.7, .5, 0], [1.7, -.6, 1.1], [1.9, 1.4, .4]].map(([r, rx, rz], i) => { const o = add(new THREE.TorusGeometry(r, .012, 6, 90), glow([C.cyan, C.lime, C.violet][i], { transparent: true, opacity: .75, depthWrite: false }), g, [.4, 3.2, -2.5]); o.rotation.set(rx, 0, rz); return o; });
    const card = (draw, x, y, z, w = 1.25, h = .8) => {
      const tex = canvasTexture(320, 200, (ctx, W, H) => {
        ctx.fillStyle = 'rgba(6,16,50,.82)'; ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 18); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke(); draw(ctx, W, H);
      });
      const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false }), g, [x, y, z]); m.userData.y = y; return m;
    };
    const cards = [
      card((ctx) => { ctx.fillStyle = C.cyan; ctx.font = '700 44px Consolas, monospace'; ctx.fillText('</>', 28, 70); ctx.fillStyle = '#6c85d6'; [0, 1, 2].forEach(i => ctx.fillRect(28, 100 + i * 28, 160 - i * 30, 10)); ctx.fillStyle = C.lime; ctx.fillRect(28, 100, 60, 10); }, -1.9, 4.5, -1.0),
      card((ctx) => { [60, 105, 80, 140, 110].forEach((hh, i) => { ctx.fillStyle = [C.cyan, C.lime, C.violet, C.coral, C.blue][i]; ctx.fillRect(30 + i * 52, 170 - hh, 34, hh); }); ctx.fillStyle = '#9db0ff'; ctx.font = '700 18px Inter, sans-serif'; ctx.fillText('SALES · LIVE', 30, 36); }, 2.9, 1.8, -1.2),
      card((ctx) => { ctx.strokeStyle = '#6c85d6'; ctx.lineWidth = 2; const pts = [[60, 60], [60, 110], [60, 160], [160, 80], [160, 140], [260, 100]]; pts.slice(0, 3).forEach(a => pts.slice(3, 5).forEach(b => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); })); pts.slice(3, 5).forEach(a => { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...pts[5]); ctx.stroke(); }); pts.forEach(([x, y], i) => { ctx.fillStyle = i > 4 ? C.lime : C.cyan; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); }); }, 2.6, 4.3, -1.6, 1.1, .7)
    ];
    const geos = [new THREE.BoxGeometry(.4, .4, .4), new THREE.OctahedronGeometry(.34), new THREE.TorusKnotGeometry(.2, .07, 64, 8), new THREE.TetrahedronGeometry(.36)];
    const colors = [C.blue, C.lime, C.violet, C.cyan];
    const shapes = geos.map((geo, i) => {
      const m = add(geo, std(colors[i], { emissive: colors[i], emissiveIntensity: .45, roughness: .3, metalness: .3 }), g);
      m.userData.o = { r: 2.9 + (i % 2) * .6, speed: .38 + i * .05, phase: i * 1.6, y: 1.5 + (i % 3) * .9, spin: 0 };
      return pick(m, () => { m.userData.o.spin = 8; return { say: 'Careful, those are load-bearing ideas. 💡', act: 'think' }; });
    });
    station({
      id: 'hero', panel: 'left', group: g, accent: C.blue, stand: () => ({ x: 0, y: .28 }), rest: 'wave', picks: shapes,
      update(t, dt) {
        ringA.rotation.z += dt * .12; ringB.rotation.z -= dt * .25; globe.rotation.y += dt * .22; globe.rotation.x += dt * .05; core.scale.setScalar(1 + Math.sin(t * 2.4) * .1);
        orbits.forEach((o, i) => { o.rotation.z += dt * (.3 + i * .12); });
        cards.forEach((c, i) => { c.position.y = c.userData.y + Math.sin(t * 1.1 + i * 2) * .07; });
        shapes.forEach(m => { const o = m.userData.o, a = t * o.speed + o.phase; o.spin = Math.max(0, o.spin - dt * 4);
          m.position.set(.4 + Math.cos(a) * o.r, o.y + Math.sin(a * 2) * .25, -1.2 + Math.sin(a) * o.r * .55 - .6);
          m.rotation.x += dt * (.6 + o.spin); m.rotation.y += dt * (.8 + o.spin); });
      }
    });
  }

  // 1 — Work: a live product board.
  {
    const g = new THREE.Group(); g.add(platform(C.blue));
    const columns = [['RESEARCH', C.teal], ['PRODUCT', C.blue], ['DELIVERY', C.lime]];
    const cards = [['Market needs', 0], ['Competitors', 0], ['Feature calls', 1], ['Prototype', 1], ['Team sync', 2], ['GTM plan', 2]].map(([text, col], i) => ({ text, col, tint: [C.teal, C.blue, C.lime, C.coral, C.violet, C.teal][i] }));
    const board = canvasTexture(640, 400, (ctx, w, h) => {
      ctx.fillStyle = '#0b1235'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 26); ctx.fill();
      ctx.fillStyle = '#ff7a7a'; [0, 1, 2].forEach(i => { ctx.fillStyle = ['#ff7a7a', '#ffd36b', '#7be08c'][i]; ctx.beginPath(); ctx.arc(34 + i * 22, 30, 7, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#9db0ff'; ctx.font = '700 15px Inter, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('MSFA  →  SALESPRO23', w - 28, 36); ctx.textAlign = 'left';
      columns.forEach(([name, color], c) => {
        const x = 28 + c * 196; ctx.fillStyle = color; ctx.font = '800 15px "Plus Jakarta Sans", Inter, sans-serif'; ctx.fillText(name, x, 82);
        ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.roundRect(x - 8, 98, 184, 280, 14); ctx.fill();
        cards.filter(card => card.col === c).forEach((card, row) => {
          ctx.fillStyle = '#18224f'; ctx.beginPath(); ctx.roundRect(x, 110 + row * 76, 168, 64, 12); ctx.fill();
          ctx.fillStyle = card.tint; ctx.fillRect(x, 124 + row * 76, 5, 36);
          ctx.fillStyle = '#eef1ff'; ctx.font = '700 15px Inter, sans-serif'; ctx.fillText(card.text, x + 18, 148 + row * 76);
        });
      });
    });
    const frame = add(new THREE.BoxGeometry(4.7, 3.0, .14), glow('#1b2a7a'), g, [-.8, 3.3, -2.8]);
    const screen = add(new THREE.PlaneGeometry(4.5, 2.81), new THREE.MeshBasicMaterial({ map: board.texture, transparent: true }), g, [-.8, 3.3, -2.72]);
    add(new THREE.BoxGeometry(.18, 1.7, .18), std('#1b2147'), g, [-.8, 1.0, -2.85]);
    let moveAt = 0;
    const advance = () => {
      const card = cards[Math.floor(Math.random() * cards.length)]; card.col = (card.col + 1) % 3; board.redraw();
    };
    const chart = canvasTexture(320, 200, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(6,16,50,.85)'; ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 18); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#9db0ff'; ctx.font = '700 18px Inter, sans-serif'; ctx.fillText('DISTRIBUTION · LIVE', 24, 36);
      ctx.strokeStyle = C.lime; ctx.lineWidth = 4; ctx.beginPath(); [150, 120, 135, 90, 105, 60, 75, 45].forEach((y, i) => i ? ctx.lineTo(24 + i * 38, y + 20) : ctx.moveTo(24, y + 20)); ctx.stroke();
    });
    const chartCard = add(new THREE.PlaneGeometry(1.5, .94), new THREE.MeshBasicMaterial({ map: chart.texture, transparent: true, depthWrite: false }), g, [1.8, 2.5, -1.3]);
    pick(screen, () => { advance(); return { say: ['Moved a card to Done ✅', 'Reprioritised. You’re welcome.'][Math.random() > .5 ? 0 : 1], act: 'point' }; });
    station({
      id: 'work', panel: 'right', group: g, accent: C.blue, stand: () => ({ x: 0, y: .28 }), rest: 'present', picks: [screen],
      update(t) { chartCard.position.y = 2.5 + Math.sin(t * 1.2) * .06; if (t > moveAt) { moveAt = t + 2.4; advance(); } frame.position.y = 3.3 + Math.sin(t * .8) * .04; screen.position.y = frame.position.y; }
    });
  }

  // 2 — About: a photo frame, string lights and a mug on a table.
  {
    const g = new THREE.Group(); g.add(platform(C.coral));
    const photo = new THREE.Group(); photo.position.set(2.3, 3.0, -1.2); g.add(photo);
    add(new THREE.BoxGeometry(2.0, 2.9, .12), std('#fdf6ea', { roughness: .8 }), photo);
    const photoMat = new THREE.MeshBasicMaterial({ color: '#c9a98a' });
    const picture = add(new THREE.PlaneGeometry(1.7, 2.35), photoMat, photo, [0, .12, .07]);
    add(new THREE.BoxGeometry(.7, .22, .02), glow('#ffd36b', { transparent: true, opacity: .85 }), photo, [0, 1.5, .08], [0, 0, .1]);
    const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'); c.width = 480; c.height = 660; const ctx = c.getContext('2d');
      const k = Math.max(480 / img.width, 660 / img.height); ctx.drawImage(img, (480 - img.width * k) / 2, 0, img.width * k, img.height * k);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; photoMat.map = t; photoMat.color.set('#ffffff'); photoMat.needsUpdate = true;
    }; img.src = portraitUrl;
    // The 3D relief of the portrait replaces the flat photo once it has loaded; the flat plane stays as the click target and the fallback.
    const relief = new THREE.Group(); relief.position.set(0, .12, .07); photo.add(relief);
    new GLTFLoader().load(reliefUrl, (gltf) => {
      const model = gltf.scene; model.scale.set(.0157, .0157, .0105); relief.add(model);
      model.traverse((o) => { if (o.isMesh) { const m = o.material; m.emissiveMap = m.map; m.emissive = new THREE.Color('#ffffff'); m.emissiveIntensity = .5; m.roughness = .7; m.metalness = .05; } });
      photoMat.transparent = true; photoMat.opacity = 0; photoMat.depthWrite = false; photoMat.needsUpdate = true;
      dispatchEvent(new CustomEvent('faiaz:ui', { detail: { type: 'model' } }));
    }, undefined, (error) => console.warn('Could not load the portrait relief', error));
    const scan = add(new THREE.PlaneGeometry(1.75, .07), glow(C.cyan, { transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }), photo, [0, 0, .26]);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => { add(new THREE.BoxGeometry(.3, .035, .02), glow(C.cyan), photo, [sx * .8, .12 + sy * 1.2, .26]); add(new THREE.BoxGeometry(.035, .3, .02), glow(C.cyan), photo, [sx * .86, .12 + sy * 1.1, .26]); });
    const bulbs = []; const n = 15;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x = -3.6 + u * 7.4, y = 4.7 - Math.sin(u * Math.PI) * .9;
      bulbs.push(add(new THREE.SphereGeometry(.1, 12, 10), glow([C.lime, C.coral, '#ffd36b', C.blue][i % 4]), g, [x, y, -1.6]));
    }
    // a small table with a mug
    const table = new THREE.Group(); table.position.set(-2.3, 0, .2); g.add(table);
    add(new THREE.CylinderGeometry(.75, .75, .08, 28), std('#2a2f66'), table, [0, 1.0, 0]);
    add(new THREE.CylinderGeometry(.07, .07, 1.0, 12), std('#2a2f66'), table, [0, .5, 0]);
    add(new THREE.CylinderGeometry(.14, .12, .26, 20), std('#f8f5e7'), table, [.1, 1.17, 0]);
    add(new THREE.TorusGeometry(.08, .025, 8, 14, Math.PI), std('#f8f5e7'), table, [.24, 1.17, 0], [0, 0, -Math.PI / 2]);
    const steam = [0, 1, 2].map(i => add(new THREE.SphereGeometry(.06, 10, 8), glow('#ffffff', { transparent: true, opacity: .5 }), table, [.1, 1.4, 0]));
    pick(picture, () => ({ say: 'Yes, that’s me. The suit is real. 😄', act: 'flex' }));
    station({
      id: 'about', panel: 'left', group: g, accent: C.coral, stand: () => ({ x: 0, y: .28 }), rest: 'wave', picks: [picture],
      update(t) {
        scan.position.y = .12 + Math.sin(t * 1.4) * 1.1; photo.rotation.z = Math.sin(t * .7) * .03 + .06; photo.rotation.y = -.25 + Math.sin(t * .5) * .05; photo.position.y = 3.0 + Math.sin(t * .9) * .06;
        bulbs.forEach((b, i) => { b.scale.setScalar(.8 + (Math.sin(t * 3 + i * 1.3) + 1) * .25); });
        steam.forEach((s, i) => { const p = (t * .4 + i / 3) % 1; s.position.y = 1.35 + p * .6; s.material.opacity = Math.sin(p * Math.PI) * .5; });
      }
    });
  }

  // 3 — How I work: three holographic step panels (Ask, Define, Build) float on a ring around the avatar.
  {
    const g = new THREE.Group(); g.add(platform(C.lime));
    const names = ['01 Ask', '02 Define', '03 Build'], notes = ['Market research · Requirements', 'User stories · Prototypes', 'Backlog · Sprint delivery'], icons = ['❓', '✏️', '⚙️'];
    const slots = [[-3, 2.2, -.6], [-.7, 3.9, -1.3], [1.7, 2.2, -.6]], cards = [];
    slots.forEach(([x, y, z], i) => {
      const card = new THREE.Group(); card.position.set(x, y, z); g.add(card);
      const tex = canvasTexture(420, 300, (ctx, W, H) => {
        ctx.fillStyle = 'rgba(8,16,48,.88)'; ctx.beginPath(); ctx.roundRect(4, 4, W - 8, H - 8, 28); ctx.fill(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = C.lime; ctx.font = "800 54px 'Plus Jakarta Sans', Inter, sans-serif"; ctx.textBaseline = 'middle'; ctx.fillText(names[i], 34, 92);
        ctx.fillStyle = '#b9c6ff'; ctx.font = '600 24px Inter, sans-serif'; ctx.fillText(notes[i], 34, 168);
        ctx.fillStyle = C.cyan; ctx.fillRect(34, 220, 120, 6);
      }); labels.push(tex);
      const plate = add(new THREE.PlaneGeometry(2.1, 1.5), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, depthWrite: false }), card);
      const haloTex = canvasTexture(420, 300, (ctx, W, H) => { ctx.strokeStyle = C.lime; ctx.lineWidth = 10; ctx.shadowColor = C.lime; ctx.shadowBlur = 24; ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 30); ctx.stroke(); });
      const halo = add(new THREE.PlaneGeometry(2.25, 1.6), new THREE.MeshBasicMaterial({ map: haloTex.texture, transparent: true, opacity: 0, depthWrite: false }), card, [0, 0, -.02]);
      const ic = emoji(icons[i], .7); ic.position.set(.72, .45, .05); card.add(ic);
      const beam = { material: { opacity: 0 } };
      card.userData = { halo, plate, base: y, beam }; cards.push(card);
      pick(plate, () => { window.dispatchEvent(new CustomEvent('faiaz:world', { detail: { type: 'step', index: i } })); return { say: `${names[i].slice(3)} first. Always.`, act: i === 0 ? 'think' : i === 1 ? 'point' : 'present' }; });
    });
    station({
      id: 'approach', panel: 'right', group: g, accent: C.lime, stand: () => ({ x: 0, y: .28 }), rest: 'think', picks: cards.map(c => c.userData.plate),
      update(t, dt, state) {
        const sel = state.step ?? 0;
        cards.forEach((c, i) => { const u = c.userData, on = i === sel ? 1 : 0; u.k = (u.k ?? 0) + (on - (u.k ?? 0)) * Math.min(1, dt * 6); c.position.y = u.base + Math.sin(t * 1.2 + i * 2) * .06 + u.k * .15; c.scale.setScalar(1 + u.k * .14); u.halo.material.opacity = u.k * .35; u.beam.material.opacity = .2 + u.k * .5; });
      }
    });
  }

  // 4 — The journey: a floating stair of three career plates climbing past-to-now, with the avatar standing at its top step.
  {
    const g = new THREE.Group(); g.add(platform(C.violet));
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b43a, metalness: .9, roughness: .3, emissive: 0x5a3c06, emissiveIntensity: .45 });
    const stone = themedStd('#1a2150', '#d6defa', { roughness: .6, metalness: .2 });
    const bifrost = canvasTexture(256, 16, (ctx, W, H) => { const gr = ctx.createLinearGradient(0, 0, W, 0); ['#ff4d6d', '#ffb347', '#ffe66d', '#6dff8c', '#4dd2ff', '#8a6dff', '#ff4d6d'].forEach((c, k, arr) => gr.addColorStop(k / (arr.length - 1), c)); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); });
    bifrost.texture.wrapS = THREE.RepeatWrapping; bifrost.texture.repeat.set(2, 1);
    // [year, company, role, where, x, y, accent, tint]
    const stops = [
      ['2024', 'Smart Software', 'Laravel Intern', 'PHP · Laravel · MySQL', -1.25, 1.0, 0x8b6bff],
      ['2025', 'Rain71', 'Marketing Business Analyst', 'Remote · Michigan, USA', -.75, 2.15, 0x35e6ff],
      ['NOW', 'Brain Station 23', 'BA · Product Owner', 'SalesPro23 · Dhaka', -.25, 3.3, 0xd8f55a]
    ];
    const W = 1.85, plates = [], hits = [], gems = [], glows = [];
    stops.forEach(([year, company, role, where, x, y, color], i) => {
      const hex = '#' + color.toString(16).padStart(6, '0'), s = new THREE.Group(); s.position.set(x, y, -.5 - (2 - i) * .1); g.add(s);
      // The plate: a clear card with the accent colour down its edge, readable at a glance.
      const plate = label([[year, 24, 800, hex], [company, 38, 800, '#ffffff'], [role, 23, 600, '#d6defa'], [where, 20, 600, '#8fa0e0']], { w: 480, h: 230, scale: W, bg: 'rgba(8,12,38,.9)', border: hex });
      plate.position.set(0, .06, .12); s.add(plate);
      // The step it rests on: a floating stone slab with a gold edge and a rainbow underside.
      add(new THREE.BoxGeometry(W * .98, .09, .75), stone, s, [0, -.49, 0]);
      add(new THREE.BoxGeometry(W * 1.0, .035, .78), gold, s, [0, -.425, 0]);
      add(new THREE.BoxGeometry(W * .94, .02, .7), new THREE.MeshBasicMaterial({ map: bifrost.texture }), s, [0, -.55, 0]);
      const gem = add(new THREE.OctahedronGeometry(.1, 0), gold, s, [W * .5 - .02, .5, .1]); gems.push(gem);
      const lamp = add(new THREE.SphereGeometry(.05, 12, 8), glow(hex), s, [-W * .5 + .03, -.425, .3]); glows.push(lamp);
      const hit = add(new THREE.PlaneGeometry(W, .98), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), s, [0, 0, .14]); hits.push(hit);
      plates.push(s);
    });
    // Light rises with the steps, and a bright "NOW" pulse sits on the last one.
    const stair = new THREE.PointLight(0x9fb4ff, 7, 7, 1.7); stair.position.set(-.8, 2.2, 1.6); g.add(stair);
    station({
      id: 'experiences', panel: 'left', group: g, accent: C.violet, stand: () => ({ x: 1.55, y: .28 }), rest: 'pointR', picks: hits,
      update(t) {
        bifrost.texture.offset.x = -t * .1;
        plates.forEach((s, i) => { s.position.y = stops[i][5] + Math.sin(t * 1.1 + i * 1.7) * .05; });
        gems.forEach((m, i) => { m.rotation.y = t * 1.2 + i; m.rotation.x = Math.sin(t + i) * .3; });
        glows.forEach((m, i) => { m.scale.setScalar(1 + (i === 2 ? .45 : .15) * (Math.sin(t * 3 + i) + 1) / 2); });
        stair.intensity = 6 + Math.sin(t * 1.4) * 1.2;
      }
    });
    hits.forEach((c, i) => pick(c, () => ({ say: ['Where it started: Laravel & PHP.', 'Where marketing met product.', 'Where I am now. Come along!'][i], act: i === 2 ? 'celebrate' : 'point' })));
  }

  // 5 — Toolkit: four CPU chips orbiting the avatar, one per skill group.
  const gemSpecs = [['📈', C.blue, 'Business & analytical'], ['🤖', C.lime, 'AI & automation'], ['🧰', C.coral, 'Tools & platforms'], ['💻', C.violet, 'Technical']];
  {
    const g = new THREE.Group(); g.add(platform(C.blue)); const gems = [];
    gemSpecs.forEach(([icon, color], i) => {
      const gem = new THREE.Group(); g.add(gem); const spin = new THREE.Group(); gem.add(spin);
      const base = add(new THREE.BoxGeometry(1, 1, .14), std('#161b2c', { metalness: .65, roughness: .3 }), spin);
      add(new THREE.BoxGeometry(.58, .58, .16), std(color, { emissive: color, emissiveIntensity: .55, metalness: .4, roughness: .25 }), spin, [0, 0, .02]);
      for (let k = 0; k < 7; k++) { const o = -.36 + k * .12; for (const [px, py, w, h] of [[o, .56, .05, .14], [o, -.56, .05, .14], [.56, o, .14, .05], [-.56, o, .14, .05]]) add(new THREE.BoxGeometry(w, h, .04), std('#e0b64a', { metalness: .9, roughness: .25 }), spin, [px, py, -.02]); }
      const ic = emoji(icon, .5); ic.position.z = .2; spin.add(ic);
      gem.userData = { body: base, spin, base: i / 4 * Math.PI * 2, boost: 0 };
      pick(base, () => { window.dispatchEvent(new CustomEvent('faiaz:world', { detail: { type: 'skill', index: i } })); return { say: `${gemSpecs[i][2]}. Open the card!`, act: 'present' }; });
      gems.push(gem);
    });
    station({
      id: 'skills', panel: 'right', group: g, accent: C.blue, stand: () => ({ x: 0, y: .28 }), rest: 'code', picks: gems.map(gem => gem.userData.body),
      update(t, dt, state) {
        gems.forEach((gem, i) => {
          const u = gem.userData; u.boost += ((state.skill === i ? 1 : 0) - u.boost) * Math.min(1, dt * 6);
          const a = t * .35 + u.base, r = 2.35 - u.boost * .25;
          gem.position.set(Math.cos(a) * r - .3, 2.9 + Math.sin(t + i) * .2 + u.boost * .5, -1.7 + Math.sin(a) * .5);
          u.spin.rotation.y = Math.sin(t * .8 + i) * .5 + u.boost * Math.sin(t * 4) * .4; u.spin.rotation.x = Math.sin(t * .6 + i) * .15; gem.scale.setScalar(1 + u.boost * .45);
        });
      }
    });
  }

  // 6 — Learning: a bookshelf wall, a framed diploma and four credential badges.
  {
    const g = new THREE.Group(); g.add(platform(C.lime));
    const shelf = new THREE.Group(); shelf.position.set(2.5, .28, -1.4); g.add(shelf);
    const wood = themedStd('#3a2c24', '#b08a63', { roughness: .7 });
    add(new THREE.BoxGeometry(2.4, 3.2, .1), wood, shelf, [0, 1.6, -.25]);
    for (const x of [-1.2, 1.2]) add(new THREE.BoxGeometry(.1, 3.2, .6), wood, shelf, [x, 1.6, 0]);
    const spineColors = ['#3b63ff', '#ff8a5c', '#d8f55a', '#8b6bff', '#3fd6c4', '#e0394c', '#f4f6ff'];
    for (let row = 0; row < 4; row++) {
      add(new THREE.BoxGeometry(2.4, .06, .6), wood, shelf, [0, .05 + row * .8, 0]);
      let x = -1.05; let k = row * 3;
      while (x < 1.0) { const w = .1 + ((k * 7) % 4) * .035, h = .5 + ((k * 5) % 4) * .08; add(new THREE.BoxGeometry(w, h, .4), std(spineColors[k % spineColors.length], { roughness: .6 }), shelf, [x + w / 2, .08 + row * .8 + h / 2, 0]); x += w + .015; k++; }
    }
    const diploma = new THREE.Group(); diploma.position.set(-2.8, 3.1, -2); g.add(diploma);
    const dTex = canvasTexture(420, 300, (ctx, W, H) => {
      ctx.fillStyle = '#f7f1e1'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 14); ctx.fill(); ctx.strokeStyle = '#b08a46'; ctx.lineWidth = 6; ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.fillStyle = '#1b2b55'; ctx.textAlign = 'center'; ctx.font = "800 30px 'Plus Jakarta Sans', Inter, sans-serif"; ctx.fillText('BSc in Computer Science', W / 2, 108); ctx.fillText('& Engineering', W / 2, 150);
      ctx.font = '600 22px Inter, sans-serif'; ctx.fillStyle = '#5b6678'; ctx.fillText('AIUB · 2018 – 2023', W / 2, 200); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(W / 2, 246, 16, 0, 7); ctx.fill();
    }); labels.push(dTex);
    add(new THREE.BoxGeometry(2.25, 1.65, .08), themedStd('#3a2c24', '#b08a63'), diploma);
    const dPlane = add(new THREE.PlaneGeometry(2.05, 1.45), new THREE.MeshBasicMaterial({ map: dTex.texture }), diploma, [0, 0, .05]);
    const cap = new THREE.Group(); cap.position.set(-.2, 4.9, -1.9); g.add(cap);
    add(new THREE.BoxGeometry(1.1, .07, 1.1), std('#101534'), cap, [0, .22, 0], [0, Math.PI / 4, 0]);
    add(new THREE.CylinderGeometry(.36, .42, .28, 20), std('#101534'), cap);
    add(new THREE.CylinderGeometry(.02, .02, .5, 6), glow(C.lime), cap, [.46, .1, .46], [.3, 0, -.4]);
    const medals = [['🌐', C.blue], ['🐘', C.coral], ['📝', C.lime], ['🤖', C.violet]].map(([icon, color], i) => {
      const m = new THREE.Group(); g.add(m);
      const disc = add(new THREE.CylinderGeometry(.42, .42, .09, 28), std(color, { metalness: .5, roughness: .25, emissive: color, emissiveIntensity: .2 }), m, [0, 0, 0], [Math.PI / 2, 0, 0]);
      const ic = emoji(icon, .5); ic.position.z = .1; m.add(ic); m.userData = { i, disc };
      return pick(disc, () => ({ say: ['IT Essentials, Cisco / AIUB.', 'PHP + Laravel, BITM / SEIP.', 'WordPress, picked up on Udemy.', 'Prompt engineering. Still learning!'][i], act: 'celebrate' })) && m;
    });
    pick(dPlane, () => ({ say: 'CGPA 3.30 and a scholarship for club work. 🎓', act: 'celebrate' }));
    station({
      id: 'educational-background', panel: 'left', group: g, accent: C.lime, stand: () => ({ x: 0, y: .28 }), rest: 'wave', picks: medals.map(m => m.userData.disc).concat([dPlane]),
      update(t) {
        cap.rotation.y = t * .6; cap.position.y = 4.9 + Math.sin(t * 1.4) * .1;
        medals.forEach((m, i) => { const x = [-2.6, -1.3, 0, 1.3][i], y = [1.0, 2.1, 1.0, 2.1][i] + 1.1; m.position.set(x - .1, y + Math.sin(t * 1.3 + i) * .07, .4); m.rotation.y = Math.sin(t * .8 + i) * .5; });
      }
    });
  }

  // 7 — Beyond work: a conference stage with a lectern, an event banner and rows of audience chairs.
  {
    const g = new THREE.Group(); g.add(platform(C.coral, 3.2));
    const stageMat = themedStd('#3a3550', '#b8b2c4');
    add(new THREE.BoxGeometry(5.6, .22, 2.4), stageMat, g, [-.4, .39, -1.9]);
    const screenTex = canvasTexture(960, 270, (ctx, W, H) => {
      ctx.fillStyle = '#0b1235'; ctx.fillRect(0, 0, W, H);
      const grad = ctx.createLinearGradient(0, 0, W, H); grad.addColorStop(0, 'rgba(59,99,255,.5)'); grad.addColorStop(1, 'rgba(255,138,92,.4)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      const panel = (x, w, title, lines, tint) => {
        ctx.fillStyle = 'rgba(8,14,40,.55)'; ctx.beginPath(); ctx.roundRect(x, 24, w, H - 48, 22); ctx.fill(); ctx.strokeStyle = tint; ctx.lineWidth = 4; ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillStyle = tint; ctx.font = "800 34px 'Plus Jakarta Sans', Inter, sans-serif"; title.forEach((t, i) => ctx.fillText(t, x + w / 2, 80 + i * 38));
        ctx.fillStyle = '#ffffff'; ctx.font = '600 24px Inter, sans-serif'; lines.forEach((t, i) => ctx.fillText(t, x + w / 2, 80 + title.length * 38 + 14 + i * 32));
      };
      panel(16, 300, ['AIUB', 'COMPUTER CLUB'], ['Asst. General Secretary', 'Led a 40+ member team'], '#d8f55a');
      panel(330, 300, ['ICCA 2022', ''], ['Inter-Club Competition', 'of AIUB · Prestigious', 'flagship event'], '#7da2ff');
      panel(644, 300, ['BLOCKCHAIN', 'OLYMPIAD 2022'], ['National-level hackathon', 'Co-organizer'], '#ffb08a');
    }); labels.push(screenTex);
    const screen = add(new THREE.PlaneGeometry(5.6, 1.575), new THREE.MeshBasicMaterial({ map: screenTex.texture }), g, [.4, 4.35, -3.05]);
    add(new THREE.BoxGeometry(5.75, 1.725, .1), std('#10152e', { metalness: .5 }), g, [.4, 4.35, -3.12]);
    const lectern = new THREE.Group(); lectern.position.set(-2.6, .5, -1.6); g.add(lectern);
    add(new THREE.BoxGeometry(.7, 1.0, .5), themedStd('#4d475c', '#bdb6c9'), lectern, [0, .5, 0]);
    const top = add(new THREE.BoxGeometry(.8, .06, .55), new THREE.MeshStandardMaterial({ color: 0xe0b43a, metalness: .9, roughness: .25 }), lectern, [0, 1.02, 0]); top.rotation.x = -.25;
    add(new THREE.CylinderGeometry(.012, .012, .4, 6), std('#c8ccd6', { metalness: .8 }), lectern, [.1, 1.25, .05]);
    add(new THREE.SphereGeometry(.04, 10, 8), std('#222', { metalness: .6 }), lectern, [.1, 1.46, .05]);
    const stoneMat = themedStd('#4d475c', '#bdb6c9', { roughness: .85 }), trimMat = new THREE.MeshStandardMaterial({ color: 0xe0b43a, metalness: .9, roughness: .25 }), chairs = [];
    for (let row = 0; row < 2; row++) { const bench = new THREE.Group(); bench.position.set(row ? 3.9 : -4.3, .28, .2); bench.rotation.y = Math.PI / 2; bench.scale.x = .45; g.add(bench); chairs.push(bench);
      add(new THREE.BoxGeometry(5.0, .42, .7), stoneMat, bench, [0, .21, 0]); add(new THREE.BoxGeometry(5.1, .06, .78), trimMat, bench, [0, .45, 0]);
      for (const x of [-2.3, -.8, .8, 2.3]) add(new THREE.BoxGeometry(.08, .36, .72), trimMat, bench, [x, .2, 0]); }
    for (const x of [-3.1, 2.3]) { add(new THREE.CylinderGeometry(.16, .2, 1.4, 12), stoneMat, g, [x, .98, -.6]); add(new THREE.CylinderGeometry(.24, .24, .08, 12), trimMat, g, [x, 1.7, -.6]); add(new THREE.ConeGeometry(.17, .5, 8), new THREE.MeshBasicMaterial({ color: 0xffa23a }), g, [x, 1.98, -.6]); }
    const beams = [[-2.9, C.blue], [2.0, C.coral]].map(([x, color]) => { const cone = add(new THREE.ConeGeometry(1.1, 6.2, 28, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), g, [x, 3.5, -1.4]); cone.rotation.z = x < 0 ? -.18 : .18; return cone; });
    const stagePick = [screen, lectern.children[0]];
    stagePick.forEach(p => pick(p, () => ({ say: 'The club, ICCA and the Blockchain Olympiad: three different stages. 🎤', act: 'dance' })));
    station({
      id: 'leadership', panel: 'right', group: g, accent: C.coral, stand: () => ({ x: -.4, y: .5 }), rest: 'dance', picks: stagePick,
      update(t) { beams.forEach((b, i) => { b.material.opacity = .045 + (Math.sin(t * 1.5 + i * 2) + 1) * .02; }); chairs.forEach((c, i) => { c.rotation.y = Math.sin(t * .8 + i) * .04; }); }
    });
  }

  // 8 — Contact: a reception desk with a phone, a laptop and a floating mail hologram.
  {
    const g = new THREE.Group(); g.add(platform(C.lime));
    const deskMat = themedStd('#2a3050', '#e6eaf1'), woodMat = themedStd('#6a5240', '#c9a97f');
    const desk = new THREE.Group(); desk.position.set(2.3, .28, -1.5); g.add(desk);
    add(new THREE.BoxGeometry(3.0, 1.1, 1.0), deskMat, desk, [0, .55, 0]);
    add(new THREE.BoxGeometry(3.1, .08, 1.1), woodMat, desk, [0, 1.14, 0]);
    add(new THREE.BoxGeometry(3.0, .08, .08), glow(C.lime), desk, [0, .9, .52]);
    const laptopBase = add(new THREE.BoxGeometry(.7, .03, .5), std('#2a2f3a', { metalness: .6 }), desk, [.4, 1.2, .0]);
    const lid = add(new THREE.BoxGeometry(.7, .46, .02), std('#161a22', { metalness: .6 }), desk, [.4, 1.43, -.24]); lid.rotation.x = -.2;
    add(new THREE.PlaneGeometry(.62, .38), glow('#5fb0ff'), desk, [.4, 1.44, -.22]).rotation.x = -.2;
    add(new THREE.BoxGeometry(.22, .1, .3), std('#e8ecf5', { roughness: .4 }), desk, [-.8, 1.23, .1]);
    add(new THREE.BoxGeometry(.1, .14, .1), std('#e8ecf5', { roughness: .4 }), desk, [-.8, 1.3, -.05]);
    const mailTex = canvasTexture(512, 320, (ctx, W, H) => {
      ctx.fillStyle = 'rgba(8,16,48,.9)'; ctx.beginPath(); ctx.roundRect(4, 4, W - 8, H - 8, 30); ctx.fill(); ctx.strokeStyle = C.lime; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = C.lime; ctx.beginPath(); ctx.roundRect(70, 80, 372, 160, 14); ctx.fill(); ctx.strokeStyle = '#14202a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(70, 90); ctx.lineTo(256, 190); ctx.lineTo(442, 90); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = "800 28px 'Plus Jakarta Sans', Inter, sans-serif"; ctx.textAlign = 'center'; ctx.fillText('Say hello', W / 2, 282);
    }); labels.push(mailTex);
    const mail = add(new THREE.PlaneGeometry(1.8, 1.12), new THREE.MeshBasicMaterial({ map: mailTex.texture, transparent: true, depthWrite: false }), g, [2.3, 3.1, -1.4]);
    const ring = add(new THREE.TorusGeometry(1.15, .02, 8, 64), glow(C.cyan, { transparent: true, opacity: .7 }), g, [2.3, 3.1, -1.45]);
    const mails = Array.from({ length: 6 }, (_, i) => { const m = emoji('✉️', .5); m.userData = { i, boost: 0 }; g.add(m); return m; });
    pick(mail, () => { mails.forEach(m => { m.userData.boost = 1; }); return { say: 'Signal sent! Now send me an email 😉', act: 'wave' }; });
    window.addEventListener('faiaz:world', (event) => { if (event.detail.type === 'copied') mails.forEach(m => { m.userData.boost = 1; }); });
    station({
      id: 'contact', panel: 'left', group: g, accent: C.lime, stand: () => ({ x: 0, y: .28 }), rest: 'wave', picks: [mail, desk.children[0]],
      update(t, dt) {
        mail.position.y = 3.1 + Math.sin(t * 1.4) * .08; ring.rotation.z = t * .5; ring.position.y = mail.position.y;
        mails.forEach((m, i) => { const u = m.userData; u.boost = Math.max(0, u.boost - dt * .45); const a = t * .5 + i * 1.05; m.position.set(2.3 + Math.cos(a) * (1.4 + u.boost * 1.6), 3.1 + Math.sin(a * 1.3) * .5 + u.boost * 1.0, -1.4 + Math.sin(a) * .7); });
      }
    });
    desk.children[0].userData.pick = mail.userData.pick;
  }

  stations.forEach((s, i) => { s.index = i; s.x = i * SPACING; s.group.position.x = s.x; });
  const root = new THREE.Group(); stations.forEach(s => root.add(s.group));
  if (document.fonts?.ready) document.fonts.ready.then(() => labels.forEach(l => l.redraw()));
  return {
    stations, root,
    applyTheme(k) { themed.forEach(({ m, night, day }) => m.color.copy(night).lerp(day, k)); },
    /** Every mesh that reacts to the pointer, flattened. */
    pickables() { return stations.flatMap(s => s.picks); },
    /** Ambient animation shared by every pad. */
    tick(t) { pads.forEach((p, i) => { const k = (t * .45 + i * .27) % 1; p.pulse.scale.setScalar(1 + k * .5); p.pulse.material.opacity = .3 * (1 - k); p.arc.rotation.z = t * .7 + i; p.arc2.rotation.z = -t * .5 + i * 2; }); }
  };
}
