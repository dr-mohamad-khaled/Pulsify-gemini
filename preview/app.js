// Pulsify 5.9 browser preview: a JavaScript port of Pet3D + Pet3DScene + WorldScene + AstroScene.
// Same .pet models, same textures and the app's own GLSL shaders (pet.vert / pet.frag / imgworld / overlay).
'use strict';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false });
gl.getExtension('OES_standard_derivatives');
const U32 = gl.getExtension('OES_element_index_uint');
const hud = document.getElementById('hud'), loadEl = document.getElementById('load');

// ------------------------------------------------------------------ data
const BIRD_LIFE = [['LookAround',2.5],['HeadTilt',2],['HeadBob',1.6],['Preen',1.6],['PreenTail',1],['Scratch',1.2],['Fluff',1.4],['Shake',.8],['Stretch',1.2],['WingStretch',1.2],['Yawn',.8],['Peck',1.4],['Eat',1.3],['Chirp',1.6],['Talk',1.5],['Notice',1],['Mirror',.8],['Swing',.8],['Upside',.6],['ChaseButterfly',1]];
const BIRD_ALIAS = { JumpStart: 'TakeOff', JumpAir: 'Fly', JumpLand: 'Land', Spin: 'DanceSpin' };
const bird = (m, label) => ({ label, model: m, walk: 'Walk', walkSpeed: .45, life: BIRD_LIFE, greet: 'Chirp', tapThrice: 'Fluff', run: 'Run', runSpeed: 1.2,
  angry: 'Angry', alias: BIRD_ALIAS, big: .92, glide: true, tricks: ['Talk', 'Chirp', 'Preen', 'WingStretch', 'Upside', 'DanceHeadbang', 'Eat', 'Mirror'] });
const CAT_LIFE = [['LookAround',2.4],['HeadTilt',2],['Groom',1.4],['Stretch',1.2],['Sneeze',.7],['Pounce',1.2],['ChaseTail',.7],['RollOver',.9],['BatAir',.8],
  ['HeadBunt',1.2],['Wave',1],['Swat',.8],['Shake',.6],['Hop',.6],['SpinJump',.5],['Nap',1.3],['SitBreak',1.5],['LoafBreak',.9],['Zoomies',.6]];
const CAT_SEQ = {
  Nap: [['LieDown'], ['Loaf', 3], ['Sleep', 11], ['WakeUp'], ['GetUp']],
  SitBreak: [['SitDown'], ['SitIdle', 3], ['Biscuits', 3.5], ['SitIdle', 2], ['StandUp']],
  LoafBreak: [['LieDown'], ['Loaf', 6], ['GetUp']],
  Sit: [['SitDown'], ['SitIdle', 6], ['StandUp']], Loaf: [['LieDown'], ['Loaf', 8], ['GetUp']], Biscuits: [['SitDown'], ['Biscuits', 5], ['StandUp']],
  Groove: [['Groove', 8]], Headbang: [['Headbang', 6]], Gallop: [['Gallop', 3]],
};
const cat = (m, label, fur, furLen, furDen) => ({ cat: true, fur, furLen, furDen, label, model: m, walk: 'Walk', walkSpeed: .5, run: 'Gallop', runSpeed: 1.25,
  greet: 'Wave', tapThrice: 'Sneeze', angry: 'Hiss', angryPokes: 6, seq: CAT_SEQ,
  alias: { Poke: 'Flinch', Pet: 'PetPurr', Spin: 'SpinJump' }, life: CAT_LIFE,
  tricks: ['Wave', 'HeadBunt', 'Biscuits', 'Sneeze', 'BatAir', 'SpinJump', 'ChaseTail', 'RollOver', 'Nap', 'Sit', 'Loaf', 'Zoomies', 'Pounce', 'Stretch', 'Groom', 'Swat', 'Hiss', 'Groove', 'Headbang'] });
const SPECIES = {
  cat_snow: cat('cat_snow', 'Snow (cat)', false, 0, 0),
  cat_cream: cat('cat_cream', 'Cream (cat)', false, 0, 0),
  cat_grey: cat('cat_grey', 'Grey (cat)', false, 0, 0),
  husky: { fur: true, furLen: .05, furDen: 220, label: 'Husky', model: 'husky', walk: 'Walk', walkSpeed: .5, run: 'Run', runSpeed: 1.2, greet: 'Wag', tapThrice: 'Howl', angry: 'Bark',
    life: [['LookAround',2.5],['HeadTilt',2],['Wag',2.5],['Bark',1.6],['Howl',1],['PlayBow',1.5],['Shake',1.2],['Dig',1.2],['Fetch',1.5],['Eat',1.3],['ChewBone',1.3],['ChaseButterfly',1.3],['Spin',.8]],
    tricks: ['Fetch', 'PlayBow', 'Dig', 'Howl', 'ChewBone', 'Shake', 'Dance', 'Spin'] },
  lion: { fur: true, furLen: .045, furDen: 230, label: 'Leo (lion)', model: 'lion', walk: 'Walk', walkSpeed: .5, run: 'Run', runSpeed: 1.3, greet: 'TinyRoar', tapThrice: 'BigRoar', angry: 'Angry', alias: { Spin: 'DanceSpin', Shake: 'Sneeze' },
    life: [['LookAround',2.5],['HeadTilt',2],['Yawn',1],['Sneeze',.6],['Stretch',1.4],['Groom',1.6],['RollOver',1.2],['ChaseTail',.9],['Pounce',1.4],['TinyRoar',1.6],['Beg',.8],['PlayBall',1.6],['ChaseButterfly',1.2],['Sit',1]],
    tricks: ['TinyRoar', 'BigRoar', 'Pounce', 'PlayBall', 'RollOver', 'Groom', 'DanceStomp'] },
  nutmeg: { fur: true, furLen: .05, furDen: 230, label: 'Nutmeg (squirrel)', model: 'nutmeg', walk: 'Walk', walkSpeed: .6, run: 'Run', runSpeed: 1.5, greet: 'TailFlick', tapThrice: 'Spin', angry: 'Knockdown', angryPokes: 5, big: .9,
    life: [['LookAround',2.5],['Lookout',1.6],['Nibble',2],['Stash',1.4],['TailFlick',2],['Wash',1.4],['Scratch',1.2],['Sneeze',.6],['Zoomies',.8],['Drum',1],['HeadTilt',1.6],['ChaseButterfly',1]],
    tricks: ['Nibble', 'Stash', 'Lookout', 'Zoomies', 'Catch', 'Drum', 'DanceTail'] },
  snowy: { fur: true, furLen: .03, furDen: 260, label: 'Snowy (duck)', model: 'snowy', walk: 'Walk', walkSpeed: .45, run: 'Run', runSpeed: 1.15, greet: 'Quack', tapThrice: 'Tumble', angry: 'AngryKick',
    life: [['Quack',2.5],['HeadTilt',2],['LookAround',2],['Notice',1.5],['TryToFly',1.4],['Preen',1.4],['Peck',1.4],['Splash',1.3],['RubberDuck',1.3],['ChaseButterfly',1.2],['Shake',1],['Spin',.7]],
    tricks: ['Quack', 'TryToFly', 'Preen', 'Splash', 'RubberDuck', 'DanceHipHop', 'Spin'] },
  reaper: { label: 'Reaper', model: 'reaper', walk: 'Walk', walkSpeed: .42, run: 'Run', runSpeed: 1.3, greet: 'EvilLaugh', tapThrice: 'Tumble', angry: 'AngryKick',
    life: [['LookAround',2],['EvilLaugh',2.2],['SpellCast',1.4],['Boo',1.4],['CapeSwish',1.3],['HeadTilt',1.6],['TryToFly',1.2],['ChaseButterfly',1.2],['Shake',.8],['Spin',.8],['Scared',.8]],
    tricks: ['EvilLaugh', 'SpellCast', 'Boo', 'CapeSwish', 'TryToFly', 'Attack', 'Dance'] },
  budgie: bird('budgie', 'Budgie'), cockatiel: bird('cockatiel', 'Cockatiel'), ringneck: Object.assign(bird('ringneck', 'Ringneck'), { openModel: 'ringneck_open', swapBone: 20, refBone: 10 }),
  betta: { label: 'Betta (new)', fish: true, model: 'betta', tapThrice: 'Spin', angry: 'Angry', tricks: ['Flare', 'Bubble', 'Nest', 'Spin', 'Loop', 'Wiggle', 'Eat', 'DanceFlare'] },
  reaper2: { label: 'Reaper · home-screen orbit', orbit: true, model: 'reaper2', tricks: ['Charger', 'Notification', 'Walk around', 'SpellCast', 'Slash', 'Kick', 'Tumble', 'Stumble'] },
  astro: { label: 'Cosmo (astronaut)', astro: true, model: 'astro', tricks: ['Wave', 'LookAround', 'Reach', 'ThumbsUp', 'Stretch', 'Flail'] },
};
// worlds: id -> { name, ground (feet line, fraction of picture height from top), horizon, fx, sky, live, water }
let WORLDS = {};
async function loadWorldList() { try { WORLDS = await (await fetch('worlds/worlds.json')).json(); } catch (e) { WORLDS = {}; } }

// ------------------------------------------------------------------ GL helpers
function shader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.slice(0, 200)); return s; }
function program(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); const nm = a.name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, a.name); }
  const at = {}; const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) { const a = gl.getActiveAttrib(p, i); at[a.name] = gl.getAttribLocation(p, a.name); }
  return { p, u, at }; }
const imgCache = {};
function loadImage(src) { if (!imgCache[src]) imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); return imgCache[src]; }
function texture(img, mip = true) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  const pot = (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0;
  if (mip && pot) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t; }
const tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
function drawTri() { gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); }

// ------------------------------------------------------------------ math
const M4 = {
  id: () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  tr(x, y, z) { const m = M4.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
  ry(a) { const m = M4.id(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  rx(a) { const m = M4.id(), c = Math.cos(a), s = Math.sin(a); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  rz(a) { const m = M4.id(), c = Math.cos(a), s = Math.sin(a); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; },
  look(e, c, up) { const f = norm(sub(c, e)), s = norm(cross(f, up)), u = cross(s, f), m = M4.id();
    m[0] = s[0]; m[4] = s[1]; m[8] = s[2]; m[1] = u[0]; m[5] = u[1]; m[9] = u[2]; m[2] = -f[0]; m[6] = -f[1]; m[10] = -f[2];
    m[12] = -(s[0] * e[0] + s[1] * e[1] + s[2] * e[2]); m[13] = -(u[0] * e[0] + u[1] * e[1] + u[2] * e[2]); m[14] = f[0] * e[0] + f[1] * e[1] + f[2] * e[2]; return m; },
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), rnd = Math.random;
const half = (() => { const t = new Float32Array(65536); for (let h = 0; h < 65536; h++) { const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, m = h & 1023;
  t[h] = e === 0 ? s * m / 1024 * 6.1035156e-5 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * Math.pow(2, e - 15); } return t; })();

// keeps every bone's 3x3 a pure rotation after a linear blend (no shrinking / swelling between poses)
function rigidify(m, nb) {
  for (let b = 0; b < nb; b++) { const o = b * 12;
    // rows r0, r1, r2 of the 3x3 live at o+0..2, o+4..6, o+8..10 ; columns are bone axes
    let x0 = m[o], x1 = m[o + 4], x2 = m[o + 8], y0 = m[o + 1], y1 = m[o + 5], y2 = m[o + 9];
    let l = Math.hypot(x0, x1, x2) || 1; x0 /= l; x1 /= l; x2 /= l;
    const d = y0 * x0 + y1 * x1 + y2 * x2; y0 -= d * x0; y1 -= d * x1; y2 -= d * x2;
    l = Math.hypot(y0, y1, y2) || 1; y0 /= l; y1 /= l; y2 /= l;
    m[o] = x0; m[o + 4] = x1; m[o + 8] = x2; m[o + 1] = y0; m[o + 5] = y1; m[o + 9] = y2;
    m[o + 2] = x1 * y2 - x2 * y1; m[o + 6] = x2 * y0 - x0 * y2; m[o + 10] = x0 * y1 - x1 * y0; } }

// 3x4 rigid bone matrices -> dual quaternions (real xyzw, dual xyzw) for volume-preserving skinning
function toDQ(m, nb, out) {
  for (let b = 0; b < nb; b++) { const o = b * 12, a00 = m[o], a01 = m[o + 1], a02 = m[o + 2], a10 = m[o + 4], a11 = m[o + 5], a12 = m[o + 6], a20 = m[o + 8], a21 = m[o + 9], a22 = m[o + 10];
    const tx = m[o + 3], ty = m[o + 7], tz = m[o + 11]; let x, y, z, w; const tr = a00 + a11 + a22;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; w = .25 * s; x = (a21 - a12) / s; y = (a02 - a20) / s; z = (a10 - a01) / s; }
    else if (a00 > a11 && a00 > a22) { const s = Math.sqrt(1 + a00 - a11 - a22) * 2; w = (a21 - a12) / s; x = .25 * s; y = (a01 + a10) / s; z = (a02 + a20) / s; }
    else if (a11 > a22) { const s = Math.sqrt(1 + a11 - a00 - a22) * 2; w = (a02 - a20) / s; x = (a01 + a10) / s; y = .25 * s; z = (a12 + a21) / s; }
    else { const s = Math.sqrt(1 + a22 - a00 - a11) * 2; w = (a10 - a01) / s; x = (a02 + a20) / s; y = (a12 + a21) / s; z = .25 * s; }
    const l = Math.hypot(x, y, z, w) || 1; x /= l; y /= l; z /= l; w /= l; const q = b * 8;
    out[q] = x; out[q + 1] = y; out[q + 2] = z; out[q + 3] = w;
    // dual = 0.5 * (t, 0) * real
    out[q + 4] = .5 * (tx * w + ty * z - tz * y); out[q + 5] = .5 * (-tx * z + ty * w + tz * x); out[q + 6] = .5 * (tx * y - ty * x + tz * w); out[q + 7] = -.5 * (tx * x + ty * y + tz * z); } }

// ------------------------------------------------------------------ Pet3D
let petProg = null;
const MAX_BONES = 60;
class Pet3D {
  constructor() { this.loaded = ''; this.pose = new Float32Array(MAX_BONES * 12); this.eyeL = new Float32Array(4); this.eyeR = new Float32Array(4);
    this.mood = new Float32Array([0, 1]); this.bend = new Float32Array([0, 0, 1, 1]); this.squash = 0; this.yaw = 0; this.lean = 0; this.pivot = 0; this.face = 0; this.facePhase = 0; this.dim = 0;
    this.boxR = .9; this.boxCz = .62; }
  async load(name) {
    if (this.loaded === name) return;
    const b64 = await (await fetch(`pets/${name}.bin.txt`)).text(); const bin = atob(b64.trim()); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const buf = u8.buffer;
    const dv = new DataView(buf); const tag = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
    const ver = +tag[3]; let o = 4;
    const nv = dv.getUint32(o, true), ni = dv.getUint32(o + 4, true), nb = dv.getUint32(o + 8, true), nc = dv.getUint32(o + 12, true); o += 16;
    this.height = dv.getFloat32(o, true); const fps = dv.getFloat32(o + 4, true); this.eyeMode = dv.getUint32(o + 8, true); o += 12;
    this.nCtl = ver >= 2 ? dv.getUint32(o, true) : 8; if (ver >= 2) o += 4;
    const flags = ver >= 3 ? dv.getUint32(o, true) : 0; if (ver >= 3) o += 4;
    this.fur = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]; o += 12;
    this.lash = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]; o += 12;
    this.iris = [0, 0, 0, 0]; if (this.eyeMode === 3) { for (let i = 0; i < 4; i++) this.iris[i] = dv.getFloat32(o + i * 4, true); o += 16; }
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(buf, o, nv * 40), gl.STATIC_DRAW); o += nv * 40;
    const ib = flags & 1 ? 4 : 2;
    this.ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ib === 4 ? new Uint32Array(buf.slice(o, o + ni * 4)) : new Uint16Array(buf.slice(o, o + ni * 2)), gl.STATIC_DRAW);
    this.itype = ib === 4 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT; this.icount = ni; o += ni * ib;
    this.dq = !!(flags & 2); this.dqBuf = new Float32Array(MAX_BONES * 8);
    this.nBones = nb; this.clips = {};
    for (let c = 0; c < nc; c++) {
      const L = dv.getUint8(o); o += 1; let nm = ''; for (let i = 0; i < L; i++) nm += String.fromCharCode(dv.getUint8(o + i)); o += L;
      const fr = dv.getUint16(o, true), loop = dv.getUint8(o + 2) !== 0; o += 3;
      const mats = new Float32Array(fr * nb * 12); for (let i = 0; i < mats.length; i++) mats[i] = half[dv.getUint16(o + i * 2, true)]; o += mats.length * 2;
      const ctl = new Float32Array(fr * this.nCtl); for (let i = 0; i < ctl.length; i++) ctl[i] = half[dv.getUint16(o + i * 2, true)]; o += ctl.length * 2;
      this.clips[nm] = { name: nm, frames: fr, loop, mats, ctl, fps, nctl: this.nCtl, duration: (fr - 1) / fps };
    }
    this.tex = texture(await loadImage(`pets/${name}.jpg`));
    this.eyeTex = (this.eyeMode === 1 || this.eyeMode === 3) ? texture(await loadImage(`pets/${name}_eyes.png`)) : this.tex;
    try { this.nrmTex = texture(await loadImage(`pets/${name}_n.jpg`)); } catch (e) { this.nrmTex = null; }
    this.loaded = name;
  }
  sample(c, t, out, ctl) {
    const f = clamp(t * c.fps, 0, c.frames - 1), f0 = Math.min(Math.floor(f), c.frames - 1), f1 = Math.min(f0 + 1, c.frames - 1), a = f - f0, n = this.nBones * 12;
    for (let i = 0; i < n; i++) out[i] = c.mats[f0 * n + i] + (c.mats[f1 * n + i] - c.mats[f0 * n + i]) * a;
    if (this.rigid) rigidify(out, this.nBones);
    for (let i = 0; i < ctl.length; i++) ctl[i] = i < c.nctl ? c.ctl[f0 * c.nctl + i] + (c.ctl[f1 * c.nctl + i] - c.ctl[f0 * c.nctl + i]) * a : 0;
  }
  project(pt, cx, cy, half, rot) {   // model-space point (Blender z-up) -> screen pixels (GL, origin bottom-left), same transform as render()
    let model = M4.mul(M4.tr(0, this.pivot, 0), M4.mul(M4.ry(this.yaw), M4.mul(M4.rx(this.lean), M4.tr(0, -this.pivot, 0))));
    model = M4.mul(model, new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]));
    const dist = 9, view = M4.look([0, this.boxCz + dist * .12, dist], [0, this.boxCz, 0], [0, 1, 0]), proj = M4.persp(2 * Math.atan(this.boxR / dist), 1, dist - this.boxR * 3, dist + this.boxR * 3);
    const T = M4.mul(M4.mul(M4.rz(rot), M4.mul(proj, view)), model), x = pt[0], y = pt[1], z = pt[2];
    const X = T[0] * x + T[4] * y + T[8] * z + T[12], Y = T[1] * x + T[5] * y + T[9] * z + T[13], Wc = T[3] * x + T[7] * y + T[11] * z + T[15];
    return [cx + X / Wc * half, cy + Y / Wc * half]; }
  // Renders straight into the screen: a square viewport where the app stamps its sprite (same camera).
  render(cx, cy, half, rot, W, H) {
    const P = petProg, u = P.u;
    let model = M4.mul(M4.tr(0, this.pivot, 0), M4.mul(M4.ry(this.yaw), M4.mul(M4.rx(this.lean), M4.tr(0, -this.pivot, 0))));
    const conv = new Float32Array([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
    model = M4.mul(model, conv);
    const dist = 9, view = M4.look([0, this.boxCz + dist * .12, dist], [0, this.boxCz, 0], [0, 1, 0]);
    const proj = M4.persp(2 * Math.atan(this.boxR / dist), 1, dist - this.boxR * 3, dist + this.boxR * 3);
    const vp = M4.mul(M4.rz(rot), M4.mul(proj, view));
    gl.viewport(Math.round(cx - half), Math.round(cy - half), Math.round(half * 2), Math.round(half * 2));
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clear(gl.DEPTH_BUFFER_BIT); gl.disable(gl.BLEND);
    gl.useProgram(P.p);
    gl.uniformMatrix4fv(u.uVP, false, vp); gl.uniformMatrix4fv(u.uModel, false, model);
    if (this.dq) { toDQ(this.pose, this.nBones, this.dqBuf); gl.uniform4fv(u.uB, this.dqBuf.subarray(0, this.nBones * 8)); } else gl.uniform4fv(u.uB, this.pose.subarray(0, this.nBones * 12));
    if (u.uDQ) gl.uniform1f(u.uDQ, this.dq ? 1 : 0);
    gl.uniform1f(u.uEyeMode, this.eyeMode); gl.uniform4fv(u.uEyeL, this.eyeL); gl.uniform4fv(u.uEyeR, this.eyeR);
    gl.uniform2f(u.uMood, this.mood[0], this.mood[1]); gl.uniform2f(u.uFace, this.face, this.facePhase); gl.uniform4fv(u.uIris, this.iris);
    gl.uniform3fv(u.uFur, this.fur); gl.uniform3fv(u.uLash, this.lash); gl.uniform3f(u.uLightDir, .45, .65, .62);
    gl.uniform1f(u.uDim, this.dim); gl.uniform1f(u.uGlow, 0); gl.uniform3f(u.uScreenHalf, .244, .142, 0);
    if (u.uDither) gl.uniform2f(u.uDither, this.dither ? this.dither[0] : 0, this.dither ? this.dither[1] : 0); if (u.uBend) gl.uniform4fv(u.uBend, this.bend); if (u.uSquash) gl.uniform1f(u.uSquash, this.squash);
    if (u.uHasNrm) gl.uniform1f(u.uHasNrm, this.nrmTex ? 1 : 0);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.nrmTex || this.tex); if (u.uNrm) gl.uniform1i(u.uNrm, 2);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.eyeTex); gl.uniform1i(u.uEyes, 1);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.uniform1i(u.uTex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    const A = P.at, at = (n, k, t, nz, off) => { const l = A[n]; if (l === undefined || l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, t, nz, 40, off); };
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0);
    at('aNrm', 4, gl.BYTE, true, 12); at('aUv', 2, gl.UNSIGNED_SHORT, true, 16); at('aEye', 2, gl.SHORT, false, 20);
    at('aBone', 4, gl.UNSIGNED_BYTE, false, 24); at('aWeight', 4, gl.UNSIGNED_BYTE, true, 28); at('aCol', 4, gl.UNSIGNED_BYTE, true, 32); at('aEye2', 2, gl.SHORT, false, 36);
    if (u.uShell) gl.uniform3f(u.uShell, 0, 0, 0);
    gl.drawElements(gl.TRIANGLES, this.icount, this.itype, 0);
    if (this.furOn && u.uShell) {
      const N = this.furShells || 16, L = this.height * (this.furLen || 0.035);
      gl.uniform1f(u.uFurDen, this.furDen || 420);
      for (let i = 1; i <= N; i++) { gl.uniform3f(u.uShell, i / N, L, L * 0.35); gl.drawElements(gl.TRIANGLES, this.icount, this.itype, 0); }
    }
    for (const n of ['aNrm', 'aUv', 'aEye', 'aBone', 'aWeight', 'aCol', 'aEye2']) if (A[n] >= 0) gl.disableVertexAttribArray(A[n]);
    gl.disable(gl.DEPTH_TEST); gl.viewport(0, 0, W, H);
  }
}

// ------------------------------------------------------------------ shadow quad
let shadowProg;
const SHADOW_VS = 'attribute vec2 aPos; uniform vec4 uRect; varying vec2 vUv; void main(){ vUv = aPos; gl_Position = vec4(mix(uRect.xy, uRect.zw, aPos * 0.5 + 0.5), 0.0, 1.0); }';
const SHADOW_FS = 'precision mediump float; varying vec2 vUv; uniform float uA; void main(){ float d = dot(vUv, vUv); gl_FragColor = vec4(0.0, 0.0, 0.0, exp(-d * 2.6) * 0.55 * uA); }';
const quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
function shadow(x0, y0, x1, y1, a) { gl.useProgram(shadowProg.p); gl.uniform4f(shadowProg.u.uRect, x0, y0, x1, y1); gl.uniform1f(shadowProg.u.uA, a);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disable(gl.BLEND); }

// ------------------------------------------------------------------ world (photo + living overlay)
let imgProg, overlayProg, worldFbo = null, worldTex = null, fbW = 0, fbH = 0;
const world = { id: null, phase: 2, tex: {}, ready: false, time: 0 };
async function setWorld(id) {
  world.id = id; world.ready = false; world.tex = {};
  for (let k = 1; k <= 4; k++) world.tex[k] = texture(await loadImage(`worlds/p${id}_${k}.webp`), false);
  const img = await loadImage(`worlds/p${id}_1.webp`); world.iw = img.width; world.ih = img.height; world.ready = true; world.dirty = true;
}
function coverMap(W, H) { const ia = world.iw / world.ih, sa = W / H;
  return sa < ia ? [sa / ia, 1, (1 - sa / ia) / 2, 0] : [1, ia / sa, 0, (1 - ia / sa) * .25]; }
const ZOOM = .94;
function pyOf(frac, W, H) { const m = coverMap(W, H), v = ((1 - frac - m[3]) / m[1] - .5) / ZOOM + .5, hh = .5 * H / Math.min(W, H); return (v - .5) * 2 * hh; }
function drawWorld(W, H, t, input) {
  if (!world.ready) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
  if (!worldFbo || fbW !== W || fbH !== H) {
    worldTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, worldTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    worldFbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, worldFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, worldTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); fbW = W; fbH = H; world.dirty = true;
  }
  if (world.dirty) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, worldFbo); gl.viewport(0, 0, W, H); gl.useProgram(imgProg.p); const u = imgProg.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, world.tex[world.phase]); gl.uniform1i(u.uDay, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, world.tex[world.phase]); gl.uniform1i(u.uNight, 1); gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(u.uRes, W, H); gl.uniform4fv(u.uMap, coverMap(W, H)); gl.uniform1f(u.uNightK, 0); gl.uniform1f(u.uDusk, 0); gl.uniform1f(u.uHasNight, 1);
    drawTri(); gl.bindFramebuffer(gl.FRAMEBUFFER, null); world.dirty = false;
  }
  const spec = WORLDS[world.id] || { ground: .72, horizon: .55, fx: 4, sky: true, live: 0, water: [0, 0] };
  gl.viewport(0, 0, W, H); gl.useProgram(overlayProg.p); const u = overlayProg.u, m = Math.min(W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, worldTex); gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uHalf, .5 * W / m, .5 * H / m); gl.uniform1f(u.uFloor, 0); gl.uniform1f(u.uTime, t % 3600);
  gl.uniform1f(u.uWorld, world.id); gl.uniform1f(u.uNight, world.phase === 4 ? 1 : 0); gl.uniform1f(u.uBass, music.bass * .6); gl.uniform1f(u.uTreble, music.on ? .3 : 0); gl.uniform1f(u.uBeat, music.beatK);
  gl.uniform1f(u.uPar, 0); gl.uniform4fv(u.uBurst, input.bursts); gl.uniform1f(u.uBright, 1); gl.uniform1f(u.uDim, 0);
  gl.uniform1f(u.uFx, spec.fx); gl.uniform1f(u.uZoom, ZOOM); gl.uniform2f(u.uTilt, input.tiltX, input.tiltY); gl.uniform1f(u.uSky, spec.sky ? 1 : 0);
  gl.uniform1f(u.uRays, spec.sky && (world.phase === 1 || world.phase === 3) ? .8 : 0);
  gl.uniform1f(u.uHorizon, pyOf(spec.horizon, W, H));
  if (u.uLive) gl.uniform1f(u.uLive, spec.live || 0);
  if (u.uWater) gl.uniform2f(u.uWater, pyOf(spec.water ? spec.water[0] : 0, W, H), pyOf(spec.water ? spec.water[1] : 0, W, H));
  drawTri();
}

// ------------------------------------------------------------------ built-in beat (120 BPM) for the dance test
const music = {
  on: false, ctx: null, t0: 0, bpm: 120, next: 0, timer: null, bass: 0, beatK: 0,
  beats() { return this.on ? (this.ctx.currentTime - this.t0) * this.bpm / 60 : 0; },
  phase() { return this.on ? this.beats() % 1 : -1; },
  start() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume();
    this.on = true; this.t0 = this.ctx.currentTime + .05; this.next = 0; this.timer = setInterval(() => this.pump(), 50); this.pump(); },
  stop() { this.on = false; clearInterval(this.timer); },
  pump() { const c = this.ctx, spb = 60 / this.bpm;
    while (this.t0 + this.next * spb / 2 < c.currentTime + .25) { const t = this.t0 + this.next * spb / 2, i = this.next; this.next++;
      if (i % 2 === 0) this.kick(t); else this.hat(t); if (i % 4 === 2) this.snap(t); if (i % 16 === 14) this.hat(t + spb / 4); this.bassNote(t, i); } },
  env(g, t, a, d, v) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); },
  kick(t) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
    this.env(g, t, .004, .32, .9); o.connect(g).connect(c.destination); o.start(t); o.stop(t + .35); },
  noise(t, dur, hp, v) { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = hp; this.env(g, t, .002, dur, v); s.connect(f).connect(g).connect(c.destination); s.start(t); },
  hat(t) { this.noise(t, .05, 7000, .18); }, snap(t) { this.noise(t, .14, 1800, .35); },
  bassNote(t, i) { const c = this.ctx, notes = [55, 55, 65.4, 49], f = notes[Math.floor(i / 8) % 4]; if (i % 2) return; const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 380; this.env(g, t, .01, .4, .22); o.connect(lp).connect(g).connect(c.destination); o.start(t); o.stop(t + .45); },
  update() { if (!this.on) { this.bass *= .9; this.beatK *= .9; return; } const p = this.phase(); this.beatK = Math.exp(-p * 6); this.bass = Math.max(this.bass * .85, this.beatK); },
};

// ------------------------------------------------------------------ cute overlay effects (hearts, Zzz, dizzy stars, sneeze sparkles, notes)
const fxCanvas = document.getElementById('fx'), fx2 = fxCanvas ? fxCanvas.getContext('2d') : null;
const FX_HEAD = { Idle: .86, Sleep: .36, Loaf: .52, LieDown: .6, WakeUp: .5, SitIdle: .95, Biscuits: .95, BatAir: 1.15, Wave: .9, HeadBunt: .86, PetPurr: .86, ChaseTail: .8, Groove: .84, Headbang: .8, Sneeze: .86, Hiss: .92, Flinch: .82 };
const fx = { parts: [], acc: {}, lastBeat: -1, sneezed: false,
  heart(ctx, s) { ctx.beginPath(); ctx.moveTo(0, s * .3); ctx.bezierCurveTo(-s * 1.1, -s * .4, -s * .45, -s * 1.15, 0, -s * .45); ctx.bezierCurveTo(s * .45, -s * 1.15, s * 1.1, -s * .4, 0, s * .3); ctx.fill(); },
  star(ctx, s) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .32 : s, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); },
  add(p) { this.parts.push(Object.assign({ age: 0, rot: 0, vr: 0, vx: 0, vy: 0 }, p)); },
  every(key, dt, period) { this.acc[key] = (this.acc[key] || 0) + dt; if (this.acc[key] >= period) { this.acc[key] = 0; return true; } return false; },
  spawn(sc, dt) {
    if (!sc || !sc.sp || !sc.sp.cat || !sc.cur) return; const n = sc.curName, S = sc.size, T = sc.curT;
    const hx = sc.x + Math.sin(sc.yawNow || 0) * S * .5, hy = sc.y + S * (FX_HEAD[n] || .86);
    const love = n === 'HeadBunt' || n === 'PetPurr' || n === 'Biscuits' || (n === 'Wave' && T > .5);
    if (love && this.every('h', dt, .42)) this.add({ k: 'heart', x: hx + (rnd() - .5) * S * .4, y: hy + S * .28, vx: (rnd() - .5) * S * .15, vy: S * .4, life: 2, size: S * (.09 + rnd() * .05), col: rnd() < .5 ? '#CDB4FF' : '#FF8FB8', vr: (rnd() - .5) * 1.5 });
    if (n === 'Sleep' && this.every('z', dt, 1.15)) this.add({ k: 'z', x: hx + S * .15, y: hy + S * .2, vx: S * .12, vy: S * .22, life: 2.6, size: S * .1, col: '#CDB4FF' });
    if (n === 'ChaseTail' && T > 1.73 && this.every('d', dt, .12)) { for (let i = 0; i < 1; i++) this.add({ k: 'orbit', cx: hx, cy: hy + S * .12, a: rnd() * 6.28, r: S * .2, life: .9, size: S * .045, col: '#FFB36B' }); }
    if (n === 'Sneeze') { if (T > .82 && !this.sneezed) { this.sneezed = true; for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, v = S * (.4 + rnd() * .7);
        this.add({ k: 'spark', x: hx, y: hy - S * .08, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6 + S * .2, life: .7, size: S * (.02 + rnd() * .02), col: rnd() < .5 ? '#FFFFFF' : '#CDB4FF', vr: 4 }); } } }
    else this.sneezed = false;
    if ((n === 'Hiss' || n === 'Flinch') && T < .05) this.add({ k: 'bang', x: hx + S * .22, y: hy + S * .2, vy: S * .1, life: .9, size: S * .16, col: '#FFB36B' });
    if (music.on && (n === 'Groove' || n === 'Headbang' || n === 'SpinJump')) { const b = Math.floor(music.beats());
      if (b !== this.lastBeat) { this.lastBeat = b; this.add({ k: 'note', t: rnd() < .5 ? '♪' : '♫', x: hx + (rnd() < .5 ? -1 : 1) * S * .35, y: hy, vx: (rnd() - .5) * S * .2, vy: S * .4, life: 1.6, size: S * .11, col: b % 2 ? '#FFB36B' : '#9D4EDD', vr: (rnd() - .5) } ); } }
  },
  draw(sc, dt) {
    if (!fx2) return; const r = fxCanvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (fxCanvas.width !== Math.round(r.width * dpr)) { fxCanvas.width = Math.round(r.width * dpr); fxCanvas.height = Math.round(r.height * dpr); }
    const Wc = fxCanvas.width, Hc = fxCanvas.height;
    if (!(scene && scene.drawFx) && (!sc || !sc.halfW) && !this.parts.length) { if (this.dirty) { fx2.clearRect(0, 0, Wc, Hc); this.dirty = false; } return; }   // nothing to draw: leave the overlay alone
    fx2.clearRect(0, 0, Wc, Hc); this.dirty = true; if (scene && scene.drawFx) { scene.drawFx(fx2, Wc, Hc); return; } if (!sc || !sc.halfW) return;
    const px = (u, v) => [(u / (sc.halfW * 2) + .5) * Wc, (1 - (v / (sc.halfH * 2) + .5)) * Hc], sc2 = Hc / (sc.halfH * 2);
    this.spawn(sc, dt);
    this.parts = this.parts.filter(p => (p.age += dt) < p.life);
    for (const p of this.parts) {
      const u = p.age / p.life, a = u < .15 ? u / .15 : 1 - Math.max(0, (u - .6) / .4); p.rot += p.vr * dt;
      if (p.k === 'orbit') { p.a += dt * 7; p.x = p.cx + Math.cos(p.a) * p.r; p.y = p.cy + Math.sin(p.a) * p.r * .35; }
      else { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'spark') { p.vx *= .92; p.vy -= sc.size * 1.2 * dt; } }
      const [x, y] = px(p.x, p.y), s = p.size * sc2 * (p.k === 'z' ? .7 + u * .8 : p.k === 'bang' ? 1 + Math.sin(Math.min(1, u * 4) * Math.PI) * .3 : 1);
      fx2.save(); fx2.translate(x, y); fx2.rotate(p.rot + (p.k === 'heart' ? Math.sin(p.age * 5) * .25 : 0)); fx2.globalAlpha = Math.max(0, a);
      fx2.fillStyle = p.col; fx2.shadowColor = p.col; fx2.shadowBlur = s * .8;
      if (p.k === 'heart') this.heart(fx2, s); else if (p.k === 'orbit' || p.k === 'spark') this.star(fx2, s);
      else { fx2.font = `800 ${Math.round(s * 2)}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`; fx2.textAlign = 'center'; fx2.textBaseline = 'middle';
        fx2.fillText(p.k === 'z' ? 'z' : p.k === 'bang' ? '!' : p.t, 0, 0); }
      fx2.restore(); }
  } };

// ------------------------------------------------------------------ the pet scene (port of Pet3DScene)
const GRAV = 9;
const OPEN_CLIPS = new Set(['WingStretch', 'TakeOff', 'Fly', 'Hover', 'Glide', 'Land', 'DanceWings', 'JumpStart', 'JumpAir', 'JumpLand', 'Tumble', 'Dangle', 'Scared']);
class PetScene {
  constructor() { this.pet = new Pet3D(); this.sp = null; this.reset(); }
  reset() { Object.assign(this, { mode: 'FLOOR', x: 0, y: 0, vx: 0, vy: 0, grounded: true, cur: null, curT: 0, from: null, fromT: 0, fade: 1, nextLife: 3,
    lastLife: '', facing: 0, yawNow: 0, swing: 0, swingV: 0, carryVx: 0, fallTop: 0, bendX: 0, bendV: 0, lastX: NaN, lastY: NaN, bodyVx: 0, bodyVy: 0,
    sq: 0, sqV: 0, touching: false, downOnPet: false, held: false, path: 0, taps: 0, lastTap: -9, pokes: [], time: 0, targetX: 0, afterWalk: null, walkClip: '', walkSpd: .4, tX: 0, tY: 0, queue: [], qHold: 0, lastTouch: 0, fx: [], lookPt: null, lookUntil: -9, lkYaw: 0, lkPitch: 0, lkYawV: 0, lkPitchV: 0, lkW: 0 }); }
  async setSpecies(s) { this.loading = true; this.pet2 = null; this.sp = s; this.reset(); await this.pet.load(s.model); if (s.openModel) { const q = new Pet3D(); await q.load(s.openModel); this.pet2 = q; this.mat2 = new Float32Array(MAX_BONES * 12); this.ctl2 = new Float32Array(12); } this.pet.furOn = !!s.fur; this.pet.rigid = !!s.cat; this.look = null; if (s.cat) { try { this.look = await (await fetch(`pets/${s.model}.json`)).json(); } catch (e) {} } this.pet.furLen = s.furLen; this.pet.furDen = s.furDen; this.ctlA = new Float32Array(12); this.matA = new Float32Array(MAX_BONES * 12); this.matB = new Float32Array(MAX_BONES * 12); this.ctlB = new Float32Array(12); this.layout(); this.play('Idle'); this.loading = false; }
  layout() { const hw = this.halfW, hh = this.halfH; this.size = Math.min(.4 * hh, hw * .8) * (this.sp.big || 1);
    this.floorY = isNaN(this.ground) ? -hh + .3 : this.ground; if (this.grounded) this.y = this.floorY; }
  setScreen(W, H, ground) { this.W = W; this.H = H; this.halfW = .5 * W / Math.min(W, H); this.halfH = .5 * H / Math.min(W, H); this.ground = ground; if (this.sp) this.layout(); }
  clip(n) { const a = this.sp.alias && this.sp.alias[n]; return this.pet.clips[a || n]; }
  playSeq(name) { const q = this.sp.seq && this.sp.seq[name]; if (!q) return false; this.queue = q.map(x => x.slice()); this.nextQ(); return true; }
  nextQ() { const it = this.queue.shift(); if (!it) { this.play('Idle', false); return; } this.qHold = it[1] || 0; this.play(it[0]); }
  get posture() { const n = this.curName; return ['LieDown', 'Loaf', 'Sleep', 'WakeUp'].includes(n) ? 'loaf' : ['SitDown', 'SitIdle', 'Biscuits'].includes(n) ? 'sit' : 'stand'; }
  zoomies() { this.queue = []; const side = this.x > 0 ? -1 : 1; this.targetX = side * (this.halfW - this.size * .5); this.mode = 'WALK';
    this.walkClip = this.sp.run; this.walkSpd = this.sp.walkSpeed * this.sp.runSpeed * 3.2; this.play(this.walkClip, false); this.zoomBack = 1; }
  play(n, restart = true) { const c = this.clip(n); if (!c) return false; if (!restart && this.cur === c) return true;
    this.from = this.cur; this.fromT = this.curT; this.fade = this.cur ? 0 : 1; this.cur = c; this.curT = 0; return true; }
  get curName() { return this.cur ? this.cur.name : ''; }
  isIdle() { return this.curName === 'Idle'; }
  clipDone() { return !this.cur || (!this.cur.loop && this.curT >= this.cur.duration); }
  onPet(ux, uy) { const cx = (ux - this.x) / this.size, cy = (uy - this.y) / this.size; return cx * cx / .25 + (cy - .5) * (cy - .5) / (.62 * .62) < 1; }
  pickLife() { const o = this.sp.life.filter(([n]) => n !== this.lastLife && (this.pet.clips[n] || (this.sp.seq && this.sp.seq[n]) || n === 'Zoomies')); if (!o.length) return;
    let r = rnd() * o.reduce((a, b) => a + b[1], 0); for (const [n, w] of o) { r -= w; if (r <= 0) { this.lastLife = n; if (n === 'Zoomies') this.zoomies(); else if (!this.playSeq(n)) this.play(n); return; } } }
  poke() {
    if (this.sp.cat && this.posture !== 'stand') { const p = this.posture, n = this.curName;
      this.queue = p === 'loaf' ? (n === 'Sleep' ? [['WakeUp'], ['GetUp'], ['Sneeze']] : [['GetUp'], ['HeadTilt']]) : [['StandUp'], ['HeadBunt']]; this.nextQ(); return; }
    if (this.time - this.lastTap < .6) this.taps++; else this.taps = 1; this.lastTap = this.time;
    this.pokes.push(this.time); this.pokes = this.pokes.filter(t => this.time - t < 8);
    if (this.sp.angry && this.pokes.length >= (this.sp.angryPokes || 7)) { this.pokes = []; this.taps = 0; this.play(this.sp.angry); return; }
    if (this.taps >= 3) { this.taps = 0; this.play(this.sp.tapThrice); return; }
    this.play('Poke');
  }
  startWalk() { this.mode = 'WALK'; const far = Math.abs(this.targetX - this.x) > this.halfW * .9;
    const pick = far && this.sp.run ? this.sp.run : this.sp.walk; this.walkClip = pick;
    this.walkSpd = pick === this.sp.run ? this.sp.walkSpeed * this.sp.runSpeed * 2 : this.sp.walkSpeed; this.play(pick, false); }
  down(ux, uy) { if (this.sp && this.sp.cat && !this.onPet(ux, uy)) { this.lookPt = [ux, uy]; this.lookUntil = this.time + 3.5; } this.lastTouch = this.time; this.touching = true; this.held = false; this.downAt = this.time; this.path = 0; this.tX = ux; this.tY = uy; this.t0X = ux; this.t0Y = uy; this.lmx = ux; this.lmy = uy; this.downOnPet = this.onPet(ux, uy); }
  move(ux, uy) { if (!this.touching) return; this.path += Math.hypot(ux - this.lmx, uy - this.lmy); this.lmx = ux; this.lmy = uy; this.tX = ux; this.tY = uy;
    if (this.sp.cat && !this.downOnPet) { this.lookPt = [ux, uy]; this.lookUntil = this.time + 3.5; }
    if (this.downOnPet && this.mode !== 'CARRY' && Math.hypot(ux - this.t0X, uy - this.t0Y) > this.size * .35) { this.queue = []; this.mode = 'CARRY'; this.grounded = false; this.play('Dangle'); } }
  up() { if (!this.touching) return; this.touching = false;
    const tap = this.path < this.size * .08 && this.time - this.downAt < .35;
    if (this.mode === 'CARRY') { this.mode = 'AIR'; this.vx = this.carryVx * .4; this.vy = 0; this.fallTop = this.y; this.play('JumpAir'); }
    else if (tap) { if (this.downOnPet) this.poke(); else if (this.sp.cat && this.look) { this.lookPt = [this.tX, this.tY]; this.lookUntil = this.time + 3.5; } else { this.targetX = clamp(this.tX, -this.halfW + this.size * .45, this.halfW - this.size * .45); if (Math.abs(this.targetX - this.x) > this.size * .15) this.startWalk(); else this.play('HeadTilt'); } } }
  trick(n) { if (this.mode !== 'FLOOR' && !(this.mode === 'WALK' && this.sp.cat)) return; this.mode = 'FLOOR'; this.facing = 0; this.queue = [];
    if (n === 'Zoomies') return this.zoomies(); if (this.playSeq(n)) return; this.play(n); }
  land() { this.grounded = true; this.vy = 0; this.vx *= .2; const drop = (this.fallTop - this.y) / this.size; this.fallTop = this.y; this.facing = 0;
    this.sqV += Math.min(3.2, .9 + drop * .9);
    if (drop > 1.6 && !this.sp.glide && this.clip('Tumble')) this.play('Tumble'); else this.play('JumpLand'); this.mode = 'FLOOR'; }
  danceToBeat() { const ph = music.phase(); if (ph < 0) return; const bar = Math.floor(music.beats() / 4);
    const pick = bar % 8 === 7 ? 'SpinJump' : bar % 4 === 3 ? 'Headbang' : 'Groove';
    if (pick === 'SpinJump') { if (this.lastDrop !== bar) { this.lastDrop = bar; this.play('SpinJump'); } return; }
    const c = this.clip(pick); if (this.cur !== c) { this.play(pick); this.curT = (music.beats() * .5) % c.duration; this.fade = .4; } }
  update(dt) { if (this.loading) return;
    const s = this.sp; if (!s || !this.cur) return; this.time += dt;
    if (this.touching && this.downOnPet && !this.held && this.path < this.size * .08 && this.time - this.downAt > .5 && this.mode !== 'CARRY') { this.play('Pet'); this.held = true; }
    // behave
    if (this.mode === 'FLOOR') {
      if (this.held && this.touching) { if (this.clipDone()) this.play('Pet'); }
      else {
        const cq = this.cur;
        if (this.queue.length || this.qHold) { if ((cq.loop && this.qHold && this.curT >= this.qHold) || (!cq.loop && this.clipDone())) { this.qHold = 0; this.nextQ(); } }
        else if (this.clipDone()) { this.held = false; this.play('Idle', false); }
        if (this.sp.cat && !this.queue.length && !this.held) { const dancing = this.curName === 'Groove' || this.curName === 'Headbang';
          if (music.on && (this.isIdle() || dancing)) this.danceToBeat(); else if (!music.on && dancing) this.play('Idle'); }
        if (this.isIdle()) { this.nextLife -= dt; if (this.nextLife <= 0) { this.nextLife = 4 + rnd() * 4;
          if (rnd() < .3) { this.targetX = (rnd() - .5) * 2 * (this.halfW - this.size * .5); if (Math.abs(this.targetX - this.x) > this.size * .3) this.startWalk(); else this.pickLife(); } else this.pickLife(); } }
      }
    } else if (this.mode === 'WALK') {
      const d = this.targetX - this.x; this.facing = Math.sign(d);
      if (Math.abs(d) < .01) { this.x = this.targetX; if (this.zoomBack) { this.zoomBack--; this.targetX = -this.targetX * .2; return; }
        this.mode = 'FLOOR'; this.facing = 0; if (this.sp.cat && this.walkClip === this.sp.run) { this.play('Shake'); return; } this.play(rnd() < .5 ? 'HeadTilt' : 'LookAround') || this.play('Idle'); }
      else { this.x += Math.sign(d) * Math.min(Math.abs(d), this.walkSpd * this.size * dt); if (this.curName !== (this.clip(this.walkClip) || {}).name) this.play(this.walkClip, false); }
    } else if (this.mode === 'CARRY') {
      const tx = this.tX, ty = this.tY - this.size * 1.05, ox = this.x;
      this.x += (tx - this.x) * Math.min(1, dt * 14); this.y += (ty - this.y) * Math.min(1, dt * 14); this.facing = 0;
      const nvx = (this.x - ox) / Math.max(dt, .008), ax = (nvx - this.carryVx) / Math.max(dt, .008); this.carryVx = nvx;
      this.swingV += (-28 * Math.sin(this.swing) - 3.2 * this.swingV - ax / this.size * .09) * dt; this.swing = clamp(this.swing + this.swingV * dt, -1.1, 1.1); this.fallTop = this.y;
    }
    // physics
    if (this.mode !== 'CARRY' && !this.grounded) {
      this.vy -= GRAV * this.size * dt * (s.glide ? .3 : 1); if (s.glide) this.vy = Math.max(this.vy, -this.size * 1.6);
      this.fallTop = Math.max(this.fallTop, this.y); this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.y <= this.floorY) { this.y = this.floorY; this.land(); }
      this.x = clamp(this.x, -this.halfW + this.size * .42, this.halfW - this.size * .42);
    }
    // soft body (same as Pet3DScene.softBody)
    if (isNaN(this.lastX)) { this.lastX = this.x; this.lastY = this.y; }
    const vxNow = (this.x - this.lastX) / dt / this.size, vyNow = (this.y - this.lastY) / dt / this.size; this.lastX = this.x; this.lastY = this.y;
    const ax = (vxNow - this.bodyVx) / dt; this.bodyVx += (vxNow - this.bodyVx) * Math.min(1, dt * 20); this.bodyVy += (vyNow - this.bodyVy) * Math.min(1, dt * 20);
    const carry = this.mode === 'CARRY', drag = carry ? -this.bodyVx * .22 : 0, kick = (carry ? -.010 : -.006) * clamp(ax, -60, 60);
    const k = carry ? 70 : 110, d = carry ? 7 : 10;
    this.bendV += (k * (drag - this.bendX) - d * this.bendV + kick * k * .12) * dt; this.bendX = clamp(this.bendX + this.bendV * dt, -.55, .55);
    const stretch = carry ? clamp(-this.bodyVy * .05, -.12, .08) - .04 : (this.mode === 'AIR' && this.vy < 0 ? clamp(this.vy / this.size * .03, -.12, 0) : 0);
    this.sqV += (90 * (stretch - this.sq) - 9 * this.sqV) * dt; this.sq = clamp(this.sq + this.sqV * dt, -.2, .32);
    // clips
    const c = this.cur; this.curT += dt; if (c.loop && this.curT > c.duration) this.curT %= Math.max(.01, c.duration);
    const P = this.pet, n = P.nBones * 12; P.sample(c, Math.min(this.curT, c.duration), this.matA, this.ctlA);
    if (this.from && this.fade < 1) { this.fade = Math.min(1, this.fade + dt / .2); this.fromT += dt; const f = this.from;
      P.sample(f, f.loop ? this.fromT % Math.max(.01, f.duration) : Math.min(this.fromT, f.duration), this.matB, this.ctlB);
      const a = this.fade * this.fade * (3 - 2 * this.fade); for (let i = 0; i < n; i++) P.pose[i] = this.matB[i] + (this.matA[i] - this.matB[i]) * a;
      if (P.rigid) rigidify(P.pose, P.nBones);
      for (let i = 0; i < 12; i++) this.ctlA[i] = this.ctlB[i] + (this.ctlA[i] - this.ctlB[i]) * a;
    } else P.pose.set(this.matA.subarray(0, n));
    if (this.pet2 && this.sp.swapBone != null) { const Q = this.pet2, b = this.sp.swapBone * 12, M = P.pose;
      const d3 = (b) => M[b] * (M[b + 5] * M[b + 10] - M[b + 6] * M[b + 9]) - M[b + 1] * (M[b + 4] * M[b + 10] - M[b + 6] * M[b + 8]) + M[b + 2] * (M[b + 4] * M[b + 9] - M[b + 5] * M[b + 8]);
      const det = d3(b) / Math.max(1e-4, d3(this.sp.refBone * 12));   // wing scale relative to the chest: body squash cancels out
      this.swapDet = det; if (this.detClosed == null) this.detClosed = det;
      if (this.cur && this.cur.name === 'Idle') this.detClosed = Math.min(this.detClosed, det);
      const o = (det - this.detClosed) / Math.max(.05, 1 - this.detClosed), tgt = o > .06 ? 1 : 0;
      this.swapL = clamp((this.swapL || 0) + Math.sign(tgt - (this.swapL || 0)) * dt / .45, 0, 1);
      const L = this.swapL; this.swapF = L * L * (3 - 2 * L); this.openNow = this.swapF > 0.5; Q.pose.set(P.pose.subarray(0, Q.nBones * 12)); }
    else if (this.pet2) { const Q = this.pet2, oc = Q.clips[c.name]; this.openNow = OPEN_CLIPS.has(c.name) && !!oc;
      if (oc) { Q.sample(oc, Math.min(this.curT, oc.duration), this.mat2, this.ctl2); Q.pose.set(this.mat2.subarray(0, Q.nBones * 12)); } }
    if (this.look) { const L = this.look, active = this.lookPt && this.time < this.lookUntil && this.mode !== 'CARRY' && !['Sleep', 'Dangle', 'RollOver', 'SpinJump', 'ChaseTail'].includes(this.curName);
      let yT = 0, pT = 0;
      if (active) { const dx = this.lookPt[0] - this.x, dy = this.lookPt[1] - (this.y + this.size * .7);
        yT = clamp(Math.atan2(dx, this.size * 1.1) - this.yawNow, -1.1, 1.1); pT = clamp(-Math.atan2(dy, this.size * 1.4), -.55, .45); }
      this.lkW += ((active ? 1 : 0) - this.lkW) * Math.min(1, dt * 5);
      const k = 140, d = 2 * Math.sqrt(k) * .85;
      this.lkYawV += (k * (yT - this.lkYaw) - d * this.lkYawV) * dt; this.lkYaw += this.lkYawV * dt;
      this.lkPitchV += (k * (pT - this.lkPitch) - d * this.lkPitchV) * dt; this.lkPitch += this.lkPitchV * dt;
      const M = P.pose, w = this.lkW;
      if (w > .002) { rot3(M, L.neck, piv3(M, L.neckBone, L.neckPivot), [0, 0, 1], this.lkYaw * .4 * w); rot3(M, L.neck, piv3(M, L.neckBone, L.neckPivot), [1, 0, 0], this.lkPitch * .4 * w);
        rot3(M, L.head, piv3(M, L.headBone, L.headPivot), [0, 0, 1], this.lkYaw * .6 * w); rot3(M, L.head, piv3(M, L.headBone, L.headPivot), [1, 0, 0], this.lkPitch * .6 * w); } }
    P.face = this.ctlA[6]; P.facePhase = this.ctlA[7];
    const yawT = this.facing * .95 + (carry ? this.bendX * 1.2 : 0); this.yawNow += (yawT - this.yawNow) * Math.min(1, dt * 6); P.yaw = this.yawNow;
    const C = this.ctlA; P.eyeL.set([C[0], C[2], C[3], C[8]]); P.eyeR.set([C[1], C[4], C[5], C[8]]); P.mood[0] = C[9]; P.mood[1] = C[10] > .05 ? C[10] : 1;
  }
  draw() { if (this.loading) return;
    if (this.pet2) { const A = this.pet, B = this.pet2; B.yaw = A.yaw; B.lean = A.lean; B.pivot = A.pivot; B.bend.set(A.bend); B.squash = A.squash; B.boxR = A.boxR; B.boxCz = A.boxCz; }
    const P = this.pet2 && this.openNow ? this.pet2 : this.pet, W = this.W, H = this.H, m = Math.min(W, H), k = this.size / this.pet.height, boxHalf = P.boxR * k, hh = P.height;
    if (this.mode === 'CARRY' || (!this.grounded && Math.abs(this.bendX) > .01)) P.bend.set([this.bendX * hh, -Math.abs(this.bendX) * hh * .25, hh * 1.05, hh]);
    else P.bend.set([this.bendX * hh * .6, 0, 0, -hh]);
    if (this.sp.cat) { P.bend.set([0, 0, 0, -hh]); this.sq = 0; this.sqV = 0; this.bendX = 0; }
    P.squash = this.sq;
    const air = clamp((this.y - this.floorY) / this.size, 0, 2);
    const toPx = (u, v) => [(u / (this.halfW * 2) + .5) * W, (v / (this.halfH * 2) + .5) * H];
    const sw = this.size * .45 * (1 - air * .3), sh = this.size * .075;
    const toNdc = (u, v) => [u / this.halfW, v / this.halfH];
    const a0 = toNdc(this.x - sw, this.floorY - sh), a1 = toNdc(this.x + sw, this.floorY + sh); shadow(a0[0], a0[1], a1[0], a1[1], 1 - Math.min(.8, air * .6));
    if (this.mode !== 'CARRY') { this.swing *= .85; this.swingV = 0; }
    let cx = this.x, cy = this.y + P.boxCz * k;
    if (Math.abs(this.swing) > .002) { const px = this.tX, py = this.tY, dx = cx - px, dy = cy - py, cs = Math.cos(this.swing), sn = Math.sin(this.swing);
      cx = px + dx * cs - dy * sn; cy = py + dx * sn + dy * cs; }
    const [sx, sy] = toPx(cx, cy);
    const f = this.pet2 && this.sp.swapBone != null ? this.swapF : -1;
    if (f > 0.001 && f < 0.999) {
      const A = this.pet, B = this.pet2; B.bend.set(P.bend); B.squash = P.squash; A.bend.set(P.bend); A.squash = P.squash;
      A.dither = [f, 1]; A.render(sx, sy, boxHalf * m, this.swing, W, H); A.dither = null;
      B.dither = [f, -1]; B.render(sx, sy, boxHalf * m, this.swing, W, H); B.dither = null;
    } else P.render(sx, sy, boxHalf * m, this.swing, W, H);
  }
}

// ------------------------------------------------------------------ fish (simplified FishScene) and astro (AstroScene)
class FishScene extends PetScene {
  layout() { this.size = Math.min(.4 * this.halfH, this.halfW * .8); this.floorY = -this.halfH + this.size * .45; if (!this.inited) { this.y = 0; this.inited = true; } }
  async setSpecies(s) { this.inited = false; await super.setSpecies(s); this.grounded = true; this.dir = 1; this.tx = 0; this.ty = 0; this.nextMove = 2; this.play('Idle'); }
  up() { if (!this.touching) return; this.touching = false; const tap = this.path < this.size * .08;
    if (tap) { if (this.downOnPet) this.poke(); else { this.tx = this.tX; this.ty = this.tY - this.size * .5; this.play('Swim'); } } }
  move(ux, uy) { if (!this.touching) return; this.path += Math.hypot(ux - this.lmx, uy - this.lmy); this.lmx = ux; this.lmy = uy; this.tX = ux; this.tY = uy;
    if (this.sp.cat && !this.downOnPet) { this.lookPt = [ux, uy]; this.lookUntil = this.time + 3.5; }
    if (this.downOnPet && this.path > this.size * .2) { this.tx = ux; this.ty = uy - this.size * .5; if (this.curName !== 'Dangle') this.play('Dangle'); } }
  update(dt) {
    if (!this.cur) return; this.time += dt;
    const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
    if (d > .02) { const sp = (this.touching ? 2.5 : .35) * this.size; this.x += dx / d * Math.min(d, sp * dt * 2); this.y += dy / d * Math.min(d, sp * dt * 2); if (Math.abs(dx) > .02) this.dir = Math.sign(dx); }
    else if (this.curName === 'Swim') this.play('Idle');
    if (this.clipDone()) this.play('Idle', false);
    this.nextMove -= dt;
    if (this.nextMove < 0 && this.isIdle() && !this.touching) { this.nextMove = 3 + rnd() * 4;
      if (rnd() < .5) { this.tx = (rnd() - .5) * 2 * (this.halfW - this.size * .6); this.ty = (rnd() - .5) * 1.2 * this.halfH; this.play('Swim'); }
      else this.play(['Flare', 'Bubble', 'LookAround', 'Wiggle', 'Glide', 'Yawn', 'Eat', 'Spin'][Math.floor(rnd() * 8)]); }
    // clip advance with the real dt
    const c = this.cur; this.curT += dt; if (c.loop && this.curT > c.duration) this.curT %= c.duration;
    const P = this.pet, n = P.nBones * 12; P.sample(c, Math.min(this.curT, c.duration), this.matA, this.ctlA);
    if (this.from && this.fade < 1) { this.fade = Math.min(1, this.fade + dt / .25); this.fromT += dt; const f = this.from;
      P.sample(f, f.loop ? this.fromT % f.duration : Math.min(this.fromT, f.duration), this.matB, this.ctlB);
      const a = this.fade * this.fade * (3 - 2 * this.fade); for (let i = 0; i < n; i++) P.pose[i] = this.matB[i] + (this.matA[i] - this.matB[i]) * a; }
    else P.pose.set(this.matA.subarray(0, n));
    this.yawNow += ((this.dir > 0 ? -1.35 : 1.35) - this.yawNow) * Math.min(1, dt * 3); P.yaw = this.yawNow; P.bend.set([0, 0, 0, -1]); P.squash = 0;
  }
  draw() { const P = this.pet, W = this.W, H = this.H, m = Math.min(W, H), k = this.size / P.height, bh = P.boxR * k;
    const sx = (this.x / (this.halfW * 2) + .5) * W, sy = ((this.y + P.boxCz * k * .3) / (this.halfH * 2) + .5) * H; P.render(sx, sy, bh * m, 0, W, H); }
}

const STARS_FS = `precision highp float;
uniform vec2 uRes; uniform float uFall; uniform float uTime; uniform float uShake;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float n = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { n += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return n; }
vec3 stars(vec2 px, float cell, float dens, float rad, float seed, float tw){
  vec2 g = px / cell; vec2 id = floor(g); vec3 c = vec3(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 cid = id + vec2(float(i), float(j)); float r = h21(cid + seed); if (r > dens) continue;
    vec2 sp = (cid + vec2(h21(cid + seed + 3.1), h21(cid + seed + 7.7))) * cell; float d = length(px - sp);
    float m = h21(cid + seed + 11.3); float rr = rad * (0.6 + 0.9 * m * m);
    float a = clamp(rr + 0.5 - d, 0.0, 1.0); float glow = exp(-d * d / (rr * rr * 6.0)) * 0.25 * m;
    float t = 0.75 + 0.25 * sin(uTime * (0.6 + 2.0 * h21(cid + seed + 5.0)) * tw + r * 40.0);
    vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.86, 0.7), h21(cid + seed + 9.0));
    c += tint * (a + glow) * t * (0.35 + 0.65 * m); }
  return c; }
void main(){
  vec2 px = gl_FragCoord.xy; float s = min(uRes.x, uRes.y) / 1080.0; vec2 drift = vec2(0.0, uFall * 6.0);
  vec3 col = vec3(0.004, 0.004, 0.012); vec2 q = (px - 0.5 * uRes) / uRes.y;
  float band = exp(-pow((q.x * 0.6 + q.y * 0.9 + 0.05) * 3.2, 2.0)); float n = fbm(q * 3.0 + 3.0), dust = fbm(q * 7.0 + 11.0);
  col += band * (vec3(0.05, 0.045, 0.08) * smoothstep(0.35, 0.85, n) - vec3(0.03, 0.025, 0.04) * smoothstep(0.55, 0.8, dust) * 0.6);
  col += vec3(0.03, 0.012, 0.05) * smoothstep(0.55, 0.95, fbm(q * 1.6 + 30.0)) * 0.8;
  col += stars(px + drift * 0.25, 46.0 * s, 0.55, 0.75 * s, 1.0, 0.7) * 0.7;
  col += stars(px + drift * 0.5, 90.0 * s, 0.45, 1.05 * s, 17.0, 1.0);
  col += stars(px + drift * 1.0, 190.0 * s, 0.35, 1.5 * s, 41.0, 1.3) * 1.15;
  col += stars(px + drift * 0.2, 22.0 * s, 0.35 * band, 0.55 * s, 71.0, 0.5) * 0.6 * band;
  col += vec3(0.25, 0.35, 0.6) * uShake * 0.04; gl_FragColor = vec4(col, 1.0); }`;
let starsProg;
// Performance (5.9.2): the old background ran 4 star-cell searches (36 cells) + 3 fbm per pixel, every frame, at native resolution.
// Now: the Milky Way / dust is painted ONCE into a half-resolution texture, and the ~1,400 stars are GL point sprites (one draw call).
const NEB_FS = `precision highp float;
uniform vec2 uRes;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float n = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { n += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return n; }
void main(){
  vec2 px = gl_FragCoord.xy; vec3 col = vec3(0.004, 0.004, 0.012); vec2 q = (px - 0.5 * uRes) / uRes.y;
  float band = exp(-pow((q.x * 0.6 + q.y * 0.9 + 0.05) * 3.2, 2.0)); float n = fbm(q * 3.0 + 3.0), dust = fbm(q * 7.0 + 11.0);
  col += band * (vec3(0.05, 0.045, 0.08) * smoothstep(0.35, 0.85, n) - vec3(0.03, 0.025, 0.04) * smoothstep(0.55, 0.8, dust) * 0.6);
  col += vec3(0.03, 0.012, 0.05) * smoothstep(0.55, 0.95, fbm(q * 1.6 + 30.0)) * 0.8;
  gl_FragColor = vec4(col, 1.0); }`;
const BLIT_FS = `precision mediump float; uniform sampler2D uTex; uniform vec2 uRes; uniform float uShake;
void main(){ gl_FragColor = vec4(texture2D(uTex, gl_FragCoord.xy / uRes).rgb + vec3(0.25, 0.35, 0.6) * uShake * 0.04, 1.0); }`;
const STAR_VS = `attribute vec2 aPos; attribute vec4 aStar; attribute vec4 aLook;
uniform vec2 uRes; uniform float uFall; uniform float uTime; uniform float uS;
varying float vR; varying float vSize; varying vec3 vCol;
void main(){
  // aStar: parallax k, radius (px @1080), twinkle speed, phase ; aLook: tint, size jitter m, gain, -
  vec2 p = aPos * uRes - vec2(0.0, uFall * 6.0 * aStar.x);
  p = mod(p, uRes);
  float m = aLook.y, rr = aStar.y * uS * (0.6 + 0.9 * m * m);
  float t = 0.75 + 0.25 * sin(uTime * aStar.z + aStar.w);
  vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.86, 0.7), aLook.x);
  vCol = tint * t * (0.35 + 0.65 * m) * aLook.z; vR = rr; vSize = rr * 5.0 + 2.0;
  gl_PointSize = vSize; gl_Position = vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0); }`;
const STAR_FS = `precision mediump float; varying float vR; varying float vSize; varying vec3 vCol;
void main(){ float d = length(gl_PointCoord - 0.5) * vSize;
  float a = clamp(vR + 0.5 - d, 0.0, 1.0) + exp(-d * d / (vR * vR * 6.0)) * 0.25;
  gl_FragColor = vec4(vCol * a, 1.0); }`;
let nebProg, blitProg, starPtProg;
const starField = { vbo: null, n: 0, tex: null, fbo: null, w: 0, h: 0,
  build(W, H) {
    // same statistics as the old per-pixel cells: 3 parallax layers + fine stars inside the Milky Way band
    const s = Math.min(W, H) / 1080, area = W * H, out = [];
    const layer = (cell, dens, rad, k, tw, gain, bandOnly) => { const n = Math.round(area / (cell * s) ** 2 * dens * (bandOnly ? 1.6 : 1));
      for (let i = 0; i < n; i++) { const x = Math.random(), y = Math.random();
        if (bandOnly) { const qx = (x - .5) * W / H, qy = y - .5, b = Math.exp(-(((qx * .6 + qy * .9 + .05) * 3.2) ** 2)); if (Math.random() > b * .35 / .56) continue; }
        out.push(x, y, k, rad, (0.6 + 2 * Math.random()) * tw, Math.random() * 40, Math.random(), Math.random(), gain, 0); } };
    layer(46, .55, .75, .25, .7, .7, false); layer(90, .45, 1.05, .5, 1, 1, false); layer(190, .35, 1.5, 1, 1.3, 1.15, false); layer(22, .35, .55, .2, .5, .6, true);
    this.n = out.length / 10; if (!this.vbo) this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.STATIC_DRAW);
    // nebula: painted once at half resolution
    const w = Math.max(1, W >> 1), h = Math.max(1, H >> 1);
    if (!this.tex) { this.tex = gl.createTexture(); this.fbo = gl.createFramebuffer(); }
    gl.bindTexture(gl.TEXTURE_2D, this.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.viewport(0, 0, w, h); gl.useProgram(nebProg.p); gl.uniform2f(nebProg.u.uRes, w, h); drawTri(); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.w = W; this.h = H; },
  draw(W, H, fall, time, shake) {
    if (this.w !== W || this.h !== H) this.build(W, H);
    gl.viewport(0, 0, W, H); gl.useProgram(blitProg.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(blitProg.u.uTex, 0); gl.uniform2f(blitProg.u.uRes, W, H); gl.uniform1f(blitProg.u.uShake, shake); drawTri();
    const P = starPtProg, u = P.u, A = P.at; gl.useProgram(P.p); gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uFall, fall); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uS, Math.min(W, H) / 1080);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(A.aStar); gl.vertexAttribPointer(A.aStar, 4, gl.FLOAT, false, 40, 8);
    gl.enableVertexAttribArray(A.aLook); gl.vertexAttribPointer(A.aLook, 4, gl.FLOAT, false, 40, 24);
    gl.drawArrays(gl.POINTS, 0, this.n); gl.disableVertexAttribArray(A.aStar); gl.disableVertexAttribArray(A.aLook); gl.disable(gl.BLEND); } };
class AstroScene {
  constructor() { this.pet = new Pet3D(); }
  async setSpecies(s) { this.sp = s; await this.pet.load('astro'); Object.assign(this, { x: 0, y: 0, vx: .05, vy: .03, spin: 0, spinRate: .35, yawPh: 0, shake: 0, speed: 1, fall: 0, time: 0, cur: null, curT: 0, from: null, fromT: 0, fade: 1, nextLife: 4 });
    this.matA = new Float32Array(MAX_BONES * 12); this.matB = new Float32Array(MAX_BONES * 12); this.ctl = new Float32Array(12); this.play('Idle'); }
  setScreen(W, H) { this.W = W; this.H = H; this.halfW = .5 * W / Math.min(W, H); this.halfH = .5 * H / Math.min(W, H); }
  get size() { return Math.min(.4 * this.halfH, this.halfW * .8); }
  play(n) { const c = this.pet.clips[n]; if (!c || c === this.cur) return; this.from = this.cur; this.fromT = this.curT; this.fade = this.cur ? 0 : 1; this.cur = c; this.curT = 0; }
  boost(k) { this.speed = Math.min(9, this.speed + k); this.spinRate += (rnd() < .5 ? 1 : -1) * k * .9; this.shake = Math.min(1, this.shake + .25 * k); }
  down(ux, uy) { this.dn = [ux, uy, this.time]; }
  move() {}
  up(ux, uy) { const on = Math.hypot(ux - this.x, uy - this.y) < this.size * .6; this.boost(on ? 3.2 : 1.2); this.play(on ? 'Poke' : 'Flail');
    const dx = this.x - ux, dy = this.y - uy, d = Math.max(.05, Math.hypot(dx, dy)), k = (on ? 1.1 : .5) / (.4 + d); this.vx += dx / d * k; this.vy += dy / d * k; }
  trick(n) { if (n === 'Flail') this.boost(4); this.play(n); }
  update(dt) {
    if (!this.cur) return; this.time += dt; this.speed += (1 - this.speed) * Math.min(1, dt * .6); this.fall += this.speed * dt * .5; this.shake *= Math.exp(-dt * 3);
    this.spinRate += ((this.spinRate >= 0 ? .22 : -.22) - this.spinRate) * Math.min(1, dt * .4); this.spin += this.spinRate * dt; this.yawPh += dt * (.22 + this.speed * .04);
    this.vx += Math.sin(this.time * .31 + 1.3) * .02 * dt; this.vy += Math.cos(this.time * .27) * .02 * dt; this.vx *= Math.exp(-dt * .12); this.vy *= Math.exp(-dt * .12);
    const spd = Math.hypot(this.vx, this.vy); if (spd > 2.5) { this.vx *= 2.5 / spd; this.vy *= 2.5 / spd; }
    this.x += this.vx * dt; this.y += this.vy * dt; const r = this.size * .42;
    if (this.x < -this.halfW + r) { this.x = -this.halfW + r; this.vx = Math.abs(this.vx) * .75; } if (this.x > this.halfW - r) { this.x = this.halfW - r; this.vx = -Math.abs(this.vx) * .75; }
    if (this.y < -this.halfH + r) { this.y = -this.halfH + r; this.vy = Math.abs(this.vy) * .75; } if (this.y > this.halfH - r * 1.1) { this.y = this.halfH - r * 1.1; this.vy = -Math.abs(this.vy) * .75; }
    this.curT += dt; const c = this.cur;
    if (c.name === 'Flail' && this.speed < 1.6 && Math.hypot(this.vx, this.vy) < .4) this.play('Idle'); else if (!c.loop && this.curT > c.duration) this.play('Idle');
    this.nextLife -= dt; if (this.nextLife <= 0 && this.cur.name === 'Idle') { this.nextLife = 6 + rnd() * 6; this.play(['Wave', 'LookAround', 'Reach', 'ThumbsUp', 'Stretch', 'LookAround'][Math.floor(rnd() * 6)]); }
    const P = this.pet, n = P.nBones * 12, cc = this.cur; P.sample(cc, cc.loop ? this.curT % cc.duration : Math.min(this.curT, cc.duration), this.matA, this.ctl);
    if (this.from && this.fade < 1) { this.fade = Math.min(1, this.fade + dt / .3); this.fromT += dt; const f = this.from; P.sample(f, f.loop ? this.fromT % f.duration : Math.min(this.fromT, f.duration), this.matB, this.ctl);
      const a = this.fade * this.fade * (3 - 2 * this.fade); for (let i = 0; i < n; i++) P.pose[i] = this.matB[i] + (this.matA[i] - this.matB[i]) * a; } else P.pose.set(this.matA.subarray(0, n));
    P.pivot = P.boxCz; P.yaw = Math.sin(this.yawPh) * 1.1 + this.time * .15 * Math.sign(this.spinRate); P.lean = Math.sin(this.yawPh * .7 + 1) * .5; P.bend.set([0, 0, 0, -1]); P.squash = 0;
  }
  drawBg(W, H) { if (SLOW_BG) { gl.viewport(0, 0, W, H); gl.useProgram(starsProg.p); const u = starsProg.u; gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uFall, this.fall % 1000); gl.uniform1f(u.uTime, this.time % 1000); gl.uniform1f(u.uShake, this.shake); drawTri(); return; }
    starField.draw(W, H, this.fall % (H * 1000), this.time % 1000, this.shake); }
  draw() { const P = this.pet, W = this.W, H = this.H, m = Math.min(W, H), k = this.size / P.height, bh = P.boxR * k;
    const sx = (this.x / (this.halfW * 2) + .5) * W, sy = (this.y / (this.halfH * 2) + .5) * H; P.render(sx, sy, bh * m, this.spin, W, H); }
}

// ------------------------------------------------------------------ home-screen orbit (Reaper v2): swipe pages = the camera orbits 45° per page.
// Eyes snap to the camera, the head follows a beat later, and a second after the swipe ends the body turns to face you.
const ORBIT_FS = `precision highp float;
uniform vec2 uRes; uniform float uYaw; uniform float uTime; uniform vec3 uCam; uniform float uTanF; uniform float uPitch; uniform float uBass; uniform vec2 uTarget;
uniform float uEnv; uniform vec4 uFire;   // fire: xyz world position, w = radius (0 = none): lights the ground
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p){ return vec2(h21(p), h21(p + 17.17)); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float n = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { n += a * noise(p); p = p * 2.07 + 3.1; a *= 0.5; } return n; }
float fbm6(vec2 p){ float n = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { n += a * noise(p); p = p * 2.13 + 1.7; a *= 0.5; } return n; }
float crack(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = h22(i + g); float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return d2 - d1; }
void main(){
  vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y));
  float cy = cos(uYaw), sy = sin(uYaw);
  vec3 fw0 = vec3(-sy, 0.0, -cy), rt = vec3(cy, 0.0, -sy);
  float cp = cos(uPitch), sp = sin(uPitch);
  vec3 fw = fw0 * cp - vec3(0.0, sp, 0.0), up = fw0 * sp + vec3(0.0, cp, 0.0);
  vec3 rd = normalize(fw + (q.x * rt + q.y * up) * uTanF), ro = uCam;
  float az = atan(rd.x, rd.z), el = asin(clamp(rd.y, -1.0, 1.0));
  float pulse = 0.85 + 0.15 * sin(uTime * 0.9) + 0.25 * uBass;
  int E = int(uEnv + 0.5);
  vec3 HAZE = E == 0 ? vec3(0.10, 0.025, 0.012) : E == 1 ? vec3(0.05, 0.028, 0.075) : E == 2 ? vec3(0.02, 0.015, 0.05) : vec3(0.05, 0.09, 0.14);
  vec3 col;
  // ---------------- sky / far surroundings
  vec2 sg = vec2(az * 60.0, el * 60.0); vec2 si = floor(sg); float st = h21(si); float star = 0.0;
  if (st > 0.94) star = smoothstep(0.15, 0.0, length(sg - si - h22(si))) * (0.6 + 0.4 * sin(uTime * (1.0 + 3.0 * h21(si + 5.0)) + st * 50.0));
  if (E == 0) {          // volcano
    col = mix(vec3(0.30, 0.07, 0.025), vec3(0.012, 0.006, 0.01), smoothstep(-0.02, 0.45, el));
    float cl = fbm6(vec2(az * 2.5 + uTime * 0.01, el * 6.0 - uTime * 0.004));
    col += vec3(0.35, 0.09, 0.03) * smoothstep(0.45, 0.85, cl) * smoothstep(0.55, 0.05, el) * 0.8 + vec3(1.0, 0.9, 0.8) * star * smoothstep(0.15, 0.4, el) * 0.6;
    float da = atan(sin(az + 2.3), cos(az + 2.3));
    float cone = 0.22 - abs(da) * 0.42 + 0.01 * noise(vec2(az * 40.0, 1.0)), ridge = 0.04 + 0.05 * fbm(vec2(az * 3.0, 4.0)) + 0.015 * noise(vec2(az * 30.0, 2.0));
    if (el < max(cone, ridge)) { vec3 rc = vec3(0.025, 0.012, 0.012);
      if (cone > ridge) { float lava = smoothstep(0.03, 0.0, abs(da + 0.05 * sin(el * 40.0)) - 0.004) * smoothstep(0.0, 0.2, el);
        rc += vec3(1.0, 0.3, 0.04) * lava * pulse * 0.9 + vec3(1.0, 0.35, 0.05) * smoothstep(0.03, 0.0, cone - el) * smoothstep(0.08, 0.0, abs(da)) * 1.3; }
      col = rc; }
    col += vec3(1.0, 0.32, 0.06) * exp(-abs(da) * 9.0) * exp(-max(0.0, el - 0.2) * 9.0) * smoothstep(0.18, 0.24, el) * 0.5 * pulse;
  } else if (E == 1) {   // moonlit graveyard
    col = mix(vec3(0.075, 0.035, 0.11), vec3(0.004, 0.003, 0.012), smoothstep(-0.02, 0.55, el)) + vec3(0.85, 0.85, 1.0) * star * smoothstep(0.02, 0.2, el) * 0.8;
    vec3 md3 = normalize(vec3(-0.62, 0.2, -0.76)); float md = acos(clamp(dot(rd, md3), -1.0, 1.0));
    col += vec3(1.0, 0.86, 0.62) * smoothstep(0.046, 0.041, md) * (0.85 + 0.15 * fbm(vec2(az, el) * 40.0)) + vec3(0.55, 0.35, 0.8) * exp(-md * 9.0) * 0.22;
    float hill = 0.035 + 0.05 * fbm(vec2(az * 2.2, 1.0)) + 0.02 * sin(az * 3.0);
    float trees = 0.018 + 0.12 * pow(fbm(vec2(az * 9.0, 7.0)), 3.0) + 0.012 * step(0.82, noise(vec2(az * 40.0, 2.0))) * (1.0 + 2.0 * noise(vec2(az * 400.0, el * 80.0)));
    if (el < hill) col = mix(vec3(0.03, 0.018, 0.05), col, 0.15);
    if (el < trees) col = vec3(0.012, 0.008, 0.02);
  } else if (E == 2) {   // crystal cavern: no sky, a cave dome full of glowing veins
    float w = fbm6(vec2(az * 3.0, el * 5.0)); col = vec3(0.015, 0.012, 0.03) * (0.6 + w);
    float v = crack(vec2(az * 4.0, el * 6.0) + 2.0); col += vec3(0.5, 0.2, 1.0) * smoothstep(0.05, 0.0, v) * (0.35 + 0.35 * sin(uTime * 0.7 + az * 3.0)) * smoothstep(-0.05, 0.3, el);
    col += vec3(0.2, 0.9, 1.0) * star * 0.5 * smoothstep(0.1, 0.5, el);
    float stal = 0.5 - 0.3 * pow(noise(vec2(az * 22.0, 3.0)), 2.0); if (el > stal) col = vec3(0.01, 0.008, 0.02);   // stalactites
    float shards = 0.02 + 0.09 * pow(abs(sin(az * 7.0 + noise(vec2(az * 5.0, 1.0)) * 3.0)), 6.0);
    if (el < shards) col = vec3(0.12, 0.05, 0.3) * (0.6 + 0.6 * el / shards) + vec3(0.3, 0.8, 1.0) * smoothstep(0.004, 0.0, shards - el) * 0.6;
  } else {               // frozen soul lake under an aurora
    col = mix(vec3(0.05, 0.1, 0.16), vec3(0.003, 0.006, 0.02), smoothstep(-0.02, 0.6, el)) + vec3(0.9, 0.95, 1.0) * star * smoothstep(0.05, 0.3, el);
    float ab = sin(az * 2.0 + fbm(vec2(az * 3.0, uTime * 0.05)) * 4.0 + uTime * 0.1) * 0.06 + 0.3;
    float aur = exp(-pow((el - ab) * 9.0, 2.0)) * (0.5 + 0.5 * fbm(vec2(az * 14.0, uTime * 0.2)));
    col += mix(vec3(0.1, 1.0, 0.6), vec3(0.6, 0.2, 1.0), smoothstep(0.25, 0.4, el)) * aur * 0.45;
    float mnt = 0.05 + 0.1 * pow(fbm(vec2(az * 2.6, 9.0)), 1.6) + 0.02 * noise(vec2(az * 30.0, 1.0));
    if (el < mnt) { float snow = smoothstep(mnt - 0.03, mnt, el); col = mix(vec3(0.03, 0.05, 0.08), vec3(0.45, 0.55, 0.7), snow * 0.7); }
  }
  // ---------------- ground
  if (rd.y < 0.0) {
    float t = -ro.y / rd.y; vec3 p = ro + rd * t; float r = length(p.xz - uTarget);
    float g = fbm6(p.xz * 1.1), det = (noise(p.xz * 40.0) - 0.5) * smoothstep(8.0, 1.5, t) + (noise(p.xz * 120.0) - 0.5) * 0.6 * smoothstep(4.0, 1.0, t);
    vec3 gc;
    if (E == 0) {
      gc = mix(vec3(0.035, 0.028, 0.03), vec3(0.075, 0.058, 0.055), g) * (1.0 + det * 0.7);
      float c1 = crack(p.xz * 0.9 + 3.0), c2 = crack(p.xz * 2.6 + 11.0), w = 0.012 + 0.02 * smoothstep(1.0, 12.0, t), heat = smoothstep(0.55, 0.85, fbm(p.xz * 0.35 + 7.0));
      float lava = smoothstep(w * 3.0, 0.0, c1) * (0.6 + 0.8 * heat) + smoothstep(w * 1.6, 0.0, c2) * 0.45 * heat;
      float flow = 0.75 + 0.25 * sin(uTime * 1.4 + fbm(p.xz * 2.0) * 8.0);
      gc = mix(gc, mix(vec3(0.9, 0.12, 0.02), vec3(1.0, 0.62, 0.15), smoothstep(0.0, w * 0.8, w * 1.2 - c1)) * flow * pulse, clamp(lava, 0.0, 1.0));
      gc += vec3(0.7, 0.16, 0.03) * smoothstep(0.25, 0.0, c1) * 0.12 * (0.5 + heat);
    } else if (E == 1) {
      gc = mix(vec3(0.045, 0.04, 0.06), vec3(0.085, 0.07, 0.1), g) * (1.0 + det * 0.55);
      gc += vec3(1.0, 0.62, 0.3) * exp(-r * r * 0.35) * (0.22 + 0.08 * uBass);
      vec2 gcell = floor(p.xz * 6.0); if (h21(gcell) > 0.86) gc += vec3(0.07, 0.08, 0.1) * smoothstep(0.18, 0.0, length(fract(p.xz * 6.0) - 0.5)) * smoothstep(7.0, 2.0, t);
    } else if (E == 2) {
      gc = mix(vec3(0.02, 0.018, 0.04), vec3(0.05, 0.04, 0.09), g) * (1.0 + det * 0.6);
      float pool = smoothstep(0.62, 0.66, fbm(p.xz * 0.5 + 4.0));
      gc = mix(gc, vec3(0.05, 0.35, 0.45) * (0.7 + 0.3 * sin(uTime * 1.2 + p.x * 3.0)) + vec3(0.2, 0.7, 0.9) * pow(noise(p.xz * 6.0 + uTime * 0.3), 6.0), pool);
      gc += vec3(0.4, 0.15, 0.9) * smoothstep(0.03, 0.0, crack(p.xz * 1.4)) * 0.25;
      gc += vec3(0.5, 0.3, 1.0) * exp(-r * r * 0.4) * 0.08;
    } else {
      float c1 = crack(p.xz * 0.8 + 1.0);
      gc = mix(vec3(0.12, 0.2, 0.28), vec3(0.3, 0.42, 0.55), g) * (1.0 + det * 0.3);
      gc += vec3(0.4, 0.95, 1.0) * smoothstep(0.02, 0.0, c1) * 0.35 * smoothstep(10.0, 1.0, t);
      vec2 gl = p.xz * 0.35 + vec2(sin(uTime * 0.11), cos(uTime * 0.09)) * 2.0;    // drifting soul lights under the ice
      gc += vec3(0.3, 1.0, 0.85) * pow(smoothstep(0.55, 0.9, fbm(gl)), 2.0) * 0.5;
      gc += vec3(0.6, 0.75, 1.0) * pow(max(0.0, dot(reflect(rd, vec3(0.0, 1.0, 0.0)), normalize(vec3(0.3, 0.5, -1.0)))), 30.0) * 0.4; // sheen
    }
    if (uFire.w > 0.0) { float fd = length(p - uFire.xyz); gc += vec3(1.0, 0.45, 0.1) * uFire.w * 1.6 / (0.3 + fd * fd * 3.0); }
    float fog = 1.0 - exp(-t * 0.07);
    col = mix(gc, mix(HAZE * 1.6, HAZE, smoothstep(8.0, 40.0, t)), fog);
  }
  // ---------------- standing pieces: obsidian slabs / tombstones / crystals / ice shards (real parallax)
  for (int i = 0; i < 9; i++) {
    float fi = float(i); float a = fi * 0.698 + 0.4 + 0.25 * sin(fi * 7.3); float rr = 2.6 + 1.6 * fract(fi * 0.618 + 0.3);
    vec3 c = vec3(sin(a) * rr, 0.0, cos(a) * rr) * 1.6;
    if (dot(c.xz - uTarget, vec2(sin(uYaw), cos(uYaw))) > 0.6 && length(c.xz - uTarget) < 4.5) continue;
    if (length(c.xz - ro.xz) < 3.2) continue;
    vec3 n = normalize(vec3(ro.x - c.x, 0.0, ro.z - c.z)); float dn = dot(rd, n); if (abs(dn) < 1e-3) continue;
    float t = dot(c - ro, n) / dn; if (t <= 0.0) continue; vec3 p = ro + rd * t;
    float ground_t = rd.y < 0.0 ? -ro.y / rd.y : 1e9; if (t > ground_t) continue;
    vec3 side = vec3(n.z, 0.0, -n.x); float lx = dot(p - c, side), ly = p.y;
    float w = 0.3 + 0.2 * fract(fi * 3.7), hgt = 0.45 + 0.6 * fract(fi * 5.1); bool hit; float edge; vec3 sc;
    if (E == 1) { float tw_ = 0.28 + 0.12 * fract(fi * 3.7), th = 0.5 + 0.35 * fract(fi * 5.1); float lx2 = lx + ly * (fract(fi * 9.1) - 0.5) * 0.25;
      float d = ly < th - tw_ ? max(abs(lx2) - tw_, ly - (th - tw_)) : length(vec2(lx2, ly - (th - tw_))) - tw_; hit = ly > 0.0 && d < 0.0; edge = smoothstep(-0.015, 0.0, d);
      sc = vec3(0.34, 0.31, 0.4) * (0.62 + 0.5 * fbm(vec2(lx, ly) * 14.0)) + vec3(0.6, 0.55, 0.85) * edge * 0.3; sc *= 1.0 - 0.5 * smoothstep(0.15, 0.0, ly); }
    else { float prof = E == 0 ? hgt * (1.0 - pow(abs(lx) / w, 1.4)) + 0.08 * (noise(vec2(lx * 9.0, fi)) - 0.5) : (hgt * 1.5) * (1.0 - abs(lx) / (w * 0.7));
      hit = ly > 0.0 && abs(lx) < w && ly < prof; edge = smoothstep(0.05, 0.0, prof - ly) + smoothstep(0.04, 0.0, w - abs(lx));
      if (E == 0) { sc = vec3(0.03, 0.025, 0.03) * (0.7 + 0.6 * fbm(vec2(lx, ly) * 12.0)) + vec3(1.0, 0.3, 0.06) * smoothstep(0.35, 0.0, ly) * 0.22 * pulse + vec3(0.8, 0.35, 0.2) * edge * 0.12; }
      else if (E == 2) { float facet = step(0.0, lx); sc = mix(vec3(0.25, 0.08, 0.6), vec3(0.45, 0.2, 0.9), facet) * (0.5 + 0.7 * ly / (hgt * 1.5)) + vec3(0.6, 0.9, 1.0) * edge * 0.5; sc *= 0.8 + 0.3 * sin(uTime * 1.3 + fi); }
      else { float facet = step(0.0, lx); sc = mix(vec3(0.35, 0.55, 0.7), vec3(0.6, 0.8, 0.95), facet) * (0.55 + 0.4 * ly / (hgt * 1.5)) + vec3(0.9, 1.0, 1.0) * edge * 0.35; } }
    if (hit) { float fog = 1.0 - exp(-t * 0.07); col = mix(sc, HAZE, fog); }
  }
  // ---------------- air: smoke / mist and particles
  float mist = fbm(vec2(az * 3.0 + uTime * 0.03, el * 12.0 - uTime * 0.04)) * smoothstep(0.12, -0.1, el) * smoothstep(-0.5, -0.04, el);
  col += (E == 0 ? vec3(0.22, 0.08, 0.05) : E == 1 ? vec3(0.18, 0.13, 0.26) : E == 2 ? vec3(0.12, 0.1, 0.3) : vec3(0.25, 0.32, 0.4)) * mist * 0.35;
  for (int i = 0; i < 14; i++) { float fi = float(i); float life = fract(uTime * (0.08 + 0.05 * fract(fi * 0.37)) + fi * 0.173);
    float yy = E == 3 ? 2.6 * (1.0 - life) : E == 0 ? life * 2.4 : 0.3 + 0.6 * fract(fi * 0.71) + 0.15 * sin(uTime * 0.8 + fi);
    vec3 fp = vec3(uTarget.x + sin(fi * 2.1 + (E == 0 ? 0.0 : uTime * 0.15)) * (0.8 + fi * 0.25) + 0.3 * sin(uTime * 0.7 + fi), yy, uTarget.y + cos(fi * 1.3 + (E == 0 ? 0.0 : uTime * 0.12)) * (0.8 + fi * 0.22));
    vec3 v = fp - ro; float tt = dot(v, rd); if (tt < 0.0) continue; float dd = length(v - rd * tt) / tt * (E == 3 ? 420.0 : 300.0);
    vec3 pc = E == 0 ? vec3(1.0, 0.45, 0.1) : E == 1 ? vec3(1.0, 0.75, 0.35) : E == 2 ? vec3(0.3, 0.9, 1.0) : vec3(0.9, 0.95, 1.0);
    col += pc * exp(-dd * dd * 0.7) * (E == 0 ? 1.0 - life : 0.8) * (0.6 + 0.4 * sin(uTime * (E == 3 ? 1.0 : 9.0) + fi * 3.0)); }
  col += (h21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0); }`;
const FIRE_FS = `precision highp float; varying vec2 vUv; uniform float uTime; uniform float uHeat;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float n = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { n += a * noise(p); p = p * 2.1 + 1.3; a *= 0.5; } return n; }
void main(){
  vec2 p = vUv * 1.25;                            // -1.25..1.25, fire ball of radius ~0.5 with flames licking upwards
  float r = length(p * vec2(1.0, 0.9) + vec2(0.0, 0.08));
  float n = fbm(p * 2.6 + vec2(0.0, -uTime * 2.2)) + 0.5 * fbm(p * 5.0 + vec2(uTime * 0.7, -uTime * 3.5));
  float flame = clamp(1.0 - r * (1.55 - 0.65 * n) + max(0.0, p.y) * 0.35 * n, 0.0, 1.0);
  float core = smoothstep(0.35, 0.0, r);
  vec3 c = mix(vec3(0.9, 0.12, 0.02), vec3(1.0, 0.55, 0.08), smoothstep(0.1, 0.5, flame));
  c = mix(c, vec3(1.0, 0.95, 0.7), smoothstep(0.55, 0.95, flame) * (0.6 + 0.4 * uHeat));
  c += vec3(1.0, 0.9, 0.6) * core * 0.6;
  float a = smoothstep(0.0, 0.25, flame);
  float glow = exp(-r * r * 3.0) * 0.35;
  float fade = smoothstep(1.0, 0.75, length(p));
  gl_FragColor = vec4(c * (a + glow * vec3(1.0, 0.5, 0.15)) * fade, 1.0); }`;
let orbitProg, fireProg;
const ORBIT_ENVS = ['Volcano', 'Moonlit graveyard', 'Crystal cavern', 'Frozen soul lake'];
class OrbitScene {
  constructor() { this.pet = new Pet3D(); }
  async setSpecies(s) { this.sp = s; await this.pet.load(s.model); this.meta = await (await fetch(`pets/${s.model}.json`)).json();
    Object.assign(this, { time: 0, cur: null, curT: 0, from: null, fromT: 0, fade: 1, pages: 5, page: 2, off: 2, offV: 0, drag: false, lastSwipe: -9,
      camYaw: 0, bodyYaw: 0, bodyV: 0, headYaw: 0, headV: 0, eyeX: 0, nextLife: 6, taps: [], px: 0, pz: 0, camX: 0, camZ: 0, walkTo: null, seek: 'look', seekT: 0, hop: 0, lookW: 1, scan: 0, near: 0, knock: null, rings: [], shake: 0, env: this.env || 0, jaw: 0, jawT: 0, charging: false, battery: this.battery || .35, hold: 0, ball: 0, snicker: 3 });
    this.matA = new Float32Array(MAX_BONES * 12); this.matB = new Float32Array(MAX_BONES * 12); this.ctl = new Float32Array(12); this.ctlB = new Float32Array(12); this.play('Idle'); }
  setScreen(W, H) { this.W = W; this.H = H; this.halfW = .5 * W / Math.min(W, H); this.halfH = .5 * H / Math.min(W, H); }
  get size() { return Math.min(.7 * this.halfH, this.halfW * 1.25) * (1 + .85 * sm01(this.near || 0)); }
  get size0() { return Math.min(.7 * this.halfH, this.halfW * 1.25); }
  get floorY() { return -this.halfH * (.52 + .2 * sm01(this.near || 0)); }
  play(n, restart = true) { const c = this.pet.clips[n]; if (!c || (!restart && c === this.cur)) return; this.from = this.cur; this.fromT = this.curT; this.fade = this.cur ? 0 : 1; this.cur = c; this.curT = 0; }
  down(u, v) { this.drag = true; this.d0 = [u, v, this.time]; this.off0 = this.off; this.lastU = u; this.lastT = this.time; this.vel = 0; this.moved = 0; }
  move(u, v) { if (!this.drag) return; const du = u - this.d0[0]; this.moved = Math.max(this.moved, Math.abs(du));
    if (this.moved > .03 && (this.seek === 'look' || this.seek === 'found') && !this.knock) { this.seek = 'startled'; this.seekT = this.time; this.walkTo = null; if (!this.isIdle()) this.play('Idle'); }
    const nOff = clamp(this.off0 - du / (this.halfW * 2), -.35, this.pages - .65); const dt = Math.max(1e-3, this.time - this.lastT);
    this.vel = this.vel * .6 + ((nOff - this.off) / dt) * .4; this.off = nOff; this.lastT = this.time; this.lastSwipe = this.time; }
  up(u, v) { if (!this.drag) return; this.drag = false;
    if (this.moved < .03) { this.tap(u, v); return; }
    let tgt = Math.round(this.off + clamp(this.vel * .25, -.6, .6)); if (Math.abs(this.vel) > .8 && tgt === this.page) tgt += Math.sign(this.vel);
    this.page = clamp(tgt, 0, this.pages - 1); this.lastSwipe = this.time; }
  tap(u, v) { const S = this.size, onIt = Math.abs(u) < S * .35 && v > this.floorY && v < this.floorY + S;
    this.taps = this.taps.filter(t => this.time - t < .6); this.taps.push(this.time);
    if (!onIt) { this.wander(); return; }
    if (this.taps.length >= 3) { this.taps = []; this.play('Tumble'); return; }
    this.play(['SpellCast', 'Slash', 'Kick'][Math.floor(rnd() * 3)]); }
  trick(n) { if (n === 'Charger') { this.charging = !this.charging; if (this.charging) { this.walkTo = null; this.conjureT = this.time; } buildUi(); return; } if (n === 'Notification') return this.notify(); if (n === 'Walk around') return this.wander(); this.walkTo = null; this.play(n); }
  // rotate a set of bones about the vertical axis through a pivot (model space, z up), in place on the pose
  turnBones(M, list, piv, a) { if (Math.abs(a) < 1e-4) return; const c = Math.cos(a), s = Math.sin(a);
    for (const b of list) { const o = b * 12;
      for (let col = 0; col < 4; col++) { const x = M[o + col], y = M[o + 4 + col]; M[o + col] = c * x - s * y; M[o + 4 + col] = s * x + c * y; }
      const px = piv[0], py = piv[1]; M[o + 3] += px - (c * px - s * py); M[o + 7] += py - (s * px + c * py); } }
  pivotOf(M, b, rest) { const o = b * 12; return [M[o] * rest[0] + M[o + 1] * rest[1] + M[o + 2] * rest[2] + M[o + 3], M[o + 4] * rest[0] + M[o + 5] * rest[1] + M[o + 6] * rest[2] + M[o + 7]]; }
  update(dt) {
    if (!this.cur) return; this.time += dt; const t = this.time;
    // launcher-style page spring when the finger is up
    if (!this.drag) { const k = 90, d = 2 * Math.sqrt(k) * .95; this.offV += (k * (this.page - this.off) - d * this.offV) * dt; this.off += this.offV * dt;
      if (Math.abs(this.off - this.page) > .004) this.lastSwipe = t; } else this.offV = 0;
    this.camYaw = (this.off - (this.pages - 1) / 2) * Math.PI / 4;
    const settled = t - this.lastSwipe > 1.0;
    // walking really travels over the ground (the camera follows, so the world slides past); body faces where it goes
    let bodyGoal = this.camYaw, bodyK = 22;
    if (this.knock && this.knock.phase === 'come') bodyK = 60;
    if (this.walkTo) { const dx = this.walkTo[0] - this.px, dz = this.walkTo[1] - this.pz, d = Math.hypot(dx, dz);
      const hd = Math.atan2(dx, dz); bodyGoal = this.bodyYaw + Math.atan2(Math.sin(hd - this.bodyYaw), Math.cos(hd - this.bodyYaw)); bodyK = 40;
      const v = (this.meta.speed.Walk || .44) * Math.max(0, Math.cos(bodyGoal - this.bodyYaw));
      if (this.cur.name !== 'Walk') this.play('Walk', false);
      if (d < .05) { this.walkTo = null; this.play('Idle'); this.lastSwipe = Math.max(this.lastSwipe, t - .4); }
      else { const st = Math.min(d, v * dt); this.px += dx / d * st; this.pz += dz / d * st; } }
    // 1 s after a swipe settles the body turns back to face you (no stepping in place)
    const rel = bodyGoal - this.bodyYaw;
    const mayTurn = this.walkTo || this.knock || (settled && (this.seek === 'look' || (this.seek === 'found' && t - this.seekT > .55)));
    if (mayTurn && Math.abs(rel) > .01) { const dd = 2 * Math.sqrt(bodyK); this.bodyV += (bodyK * rel - dd * this.bodyV) * dt; }
    else this.bodyV *= Math.exp(-dt * 10);
    this.bodyYaw += this.bodyV * dt;
    this.camX += (this.px - this.camX) * Math.min(1, dt * 6); this.camZ += (this.pz - this.camZ) * Math.min(1, dt * 6);
    // startled -> searches for you (looks the wrong way first) -> finds you -> then turns the body
    const relC = Math.atan2(Math.sin(this.camYaw - this.bodyYaw), Math.cos(this.camYaw - this.bodyYaw)), st = t - this.seekT;
    if (this.seek === 'startled' && st > .45) { this.seek = 'search'; this.seekT = t; this.scanDir = relC > 0 ? -1 : 1; }
    if (this.seek === 'search' && settled && t - this.seekT > 1.4 && t - this.lastSwipe > .9) { this.seek = 'found'; this.seekT = t; }
    if (this.seek === 'found' && st > 1.4) this.seek = 'look';
    let want = relC, kh = 120, eyeT;
    if (this.seek === 'startled') { want = this.headYaw; kh = 40; this.hop = Math.sin(Math.PI * clamp(st / .3, 0, 1)); }
    else if (this.seek === 'search') { const s2 = t - this.seekT; want = this.scanDir * (.9 * Math.sin(s2 * 2.2) + .25) ; kh = 30; }
    else this.hop = 0;
    if (this.seek === 'found') kh = 220;
    want = clamp(want, -1.25, 1.25); const dh = 2 * Math.sqrt(kh) * .8;
    this.headV += (kh * (want - this.headYaw) - dh * this.headV) * dt; this.headYaw += this.headV * dt;
    eyeT = this.seek === 'search' ? clamp((want - this.headYaw) * 2 + this.scanDir * .6 * Math.sin((t - this.seekT) * 2.2 + .6), -1, 1) : clamp((relC - this.headYaw) * 1.6, -1, 1);
    if (this.seek === 'startled') eyeT = this.eyeX;
    this.eyeX += (eyeT - this.eyeX) * Math.min(1, dt * (this.seek === 'found' ? 30 : 12));
    this.pupil = this.seek === 'startled' ? .55 : this.seek === 'found' && st < .6 ? 1.3 : 1;
    // notification: walks up to the glass, knocks, tells you, hops back
    if (this.knock) { const k = this.knock, kt = t - k.t0;
      if (k.phase === 'come') { this.near = Math.min(1, this.near + dt / 1.3); if (this.cur.name !== 'Walk') this.play('Walk', false); if (this.near >= 1) { k.phase = 'knock'; k.t1 = t; this.play('Idle'); } }
      else if (k.phase === 'knock') { const u = t - k.t1; k.arm = sm01(u / .3) * (1 - sm01((u - 2.4) / .3));
        for (const kk of [.45, .7, .95, 1.5, 1.75]) if (u >= kk && !k.done[kk]) { k.done[kk] = 1; this.rings.push({ t: t }); this.shake = 1; knockSound(); }
        k.tap = Math.max(...[.45, .7, .95, 1.5, 1.75].map(kk => Math.exp(-Math.abs(u - kk) * 22) * (u > kk - .08 ? 1 : 0)));
        if (u > 3.0) { k.phase = 'back'; k.t2 = t; } }
      else { const u = t - k.t2; this.near = Math.max(0, 1 - u / .5); this.hop = Math.sin(Math.PI * clamp(u / .5, 0, 1)) * .8; if (u > .6) { this.knock = null; this.hop = 0; } } }
    this.shake *= Math.exp(-dt * 18);
    // clips: dances ONLY while music plays
    const c = this.cur; this.curT += dt;
    if (c.loop) this.curT %= Math.max(.01, c.duration); else if (this.curT >= c.duration) this.play(this.walkTo ? 'Walk' : 'Idle');
    const isDance = this.cur.name.startsWith('Dance');
    if (music.on && !this.walkTo && !this.knock && !this.charging && (this.isIdle() || (isDance && this.curT > this.cur.duration - .05))) this.play(['DanceHipHop', 'DanceHipHop2', 'DanceCardio', 'DancePop', 'DanceNight'][Math.floor(rnd() * 5)]);
    if (!music.on && isDance) this.play('Idle');
    this.nextLife -= dt; if (this.nextLife <= 0 && this.isIdle() && settled && !this.walkTo && !this.knock && !this.charging && this.seek === 'look') { this.nextLife = 7 + rnd() * 6;
      if (rnd() < .55) this.wander(); else this.play(['SpellCast', 'Slash', 'Kick'][Math.floor(rnd() * 3)]); }
    const P = this.pet, n = P.nBones * 12, cc = this.cur; P.sample(cc, cc.loop ? this.curT % cc.duration : Math.min(this.curT, cc.duration), this.matA, this.ctl);
    if (this.from && this.fade < 1) { this.fade = Math.min(1, this.fade + dt / .3); this.fromT += dt; const f = this.from;
      P.sample(f, f.loop ? this.fromT % f.duration : Math.min(this.fromT, f.duration), this.matB, this.ctlB);
      const a = this.fade * this.fade * (3 - 2 * this.fade); for (let i = 0; i < n; i++) P.pose[i] = this.matB[i] + (this.matA[i] - this.matB[i]) * a; }
    else P.pose.set(this.matA.subarray(0, n));
    // look-at: neck takes 40 %, head 60 % of the turn (about the vertical axis through each joint)
    const m = this.meta, M = P.pose;
    this.turnBones(M, m.neck, this.pivotOf(M, m.neckBone, m.neckPivot), this.headYaw * .4);
    this.turnBones(M, m.head, this.pivotOf(M, m.headBone, m.headPivot), this.headYaw * .6);
    // look UP at you (the camera sits above his eye line), neck 40 % / head 60 %
    rot3(M, m.neck, this.piv3(M, m.neckBone, m.neckPivot), [1, 0, 0], -.1);
    rot3(M, m.head, this.piv3(M, m.headBone, m.headPivot), [1, 0, 0], -.16);
    // charging: conjures a fireball and holds it in both hands; the ball grows with the battery
    this.hold += ((this.charging ? 1 : 0) - this.hold) * Math.min(1, dt * 4); this.ball += ((this.charging && this.hold > .6 ? 1 : 0) - this.ball) * Math.min(1, dt * (this.charging ? 2.5 : 6));
    if (this.charging && this.battery < 1) this.battery = Math.min(1, this.battery + dt / 90);
    if (this.hold > .01) { const a = this.hold, br = Math.sin(t * 2.2) * .04;
      rot3(M, m.armR, this.piv3(M, m.armRBone, m.armRPivot), [1, 0, 0], (-1.0 - .25 * this.battery + br) * a); rot3(M, m.armR, this.piv3(M, m.armRBone, m.armRPivot), [0, 0, 1], .55 * a);
      rot3(M, m.foreR, this.piv3(M, m.foreRBone, m.foreRPivot), [1, 0, 0], -.5 * a); rot3(M, m.foreR, this.piv3(M, m.foreRBone, m.foreRPivot), [0, 0, 1], (.35 - .3 * this.battery) * a);
      rot3(M, m.armL, this.piv3(M, m.armLBone, m.armLPivot), [1, 0, 0], (-1.0 - .25 * this.battery + br) * a); rot3(M, m.armL, this.piv3(M, m.armLBone, m.armLPivot), [0, 0, 1], -.55 * a);
      rot3(M, m.foreL, this.piv3(M, m.foreLBone, m.foreLPivot), [1, 0, 0], -.5 * a); rot3(M, m.foreL, this.piv3(M, m.foreLBone, m.foreLPivot), [0, 0, 1], (-.35 + .3 * this.battery) * a);
      const hl = this.piv3(M, m.handL, m.handLPivot), hr = this.piv3(M, m.handR, m.handRPivot); this.ballPos = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - .05, (hl[2] + hr[2]) / 2 - .05]; }
    // mouth: the jaw (rest = wide open) closes into a grin, opens to talk, gasp, laugh and sing along
    let open = 0; const st2 = t - this.seekT;
    if (this.seek === 'startled') open = .9;
    else if (this.seek === 'found' && st2 < 1.0) open = .45 * Math.abs(Math.sin(st2 * 14));
    else if (this.knock && this.knock.phase === 'knock') open = (t - this.knock.t1 > .3) ? .2 + .5 * Math.abs(Math.sin((t - this.knock.t1) * 11) * Math.sin((t - this.knock.t1) * 3.1)) : 0;
    else if (this.cur.name.startsWith('Dance')) open = clamp(music.bass * .9, 0, .8);
    else if (this.cur.name === 'SpellCast' || this.cur.name === 'Slash' || this.cur.name === 'Kick') open = .55;
    else if (this.charging && this.ball > .5) open = .12 + .1 * Math.sin(t * 1.3);
    else { this.snicker -= dt; if (this.snicker < 0) { this.snicker = 5 + rnd() * 6; this.jawT = t; } const u = t - this.jawT; if (u < 1.1) open = .35 * Math.abs(Math.sin(u * 13)) * (1 - u / 1.1); }
    this.jaw += (open - this.jaw) * Math.min(1, dt * 18);
    rot3(M, m.jaw, this.piv3(M, m.jawBone, m.jawPivot), [1, 0, 0], -.44 * (1 - this.jaw));
    if (this.knock && this.knock.arm > 0) { const k = this.knock, a = k.arm;
      rot3(M, m.armR, this.piv3(M, m.armRBone, m.armRPivot), [1, 0, 0], -1.45 * a); rot3(M, m.armR, this.piv3(M, m.armRBone, m.armRPivot), [0, 0, 1], .35 * a);
      rot3(M, m.foreR, this.piv3(M, m.foreRBone, m.foreRPivot), [1, 0, 0], (-.35 - .55 * (k.tap || 0)) * a);
      const hp = this.piv3(M, m.handR, m.handRPivot); k.hand = hp; }
    const C = this.ctl; P.eyeL.set([C[0], this.eyeX, .25, C[8]]); P.eyeR.set([C[1], this.eyeX, .25, C[8]]); P.mood[0] = this.seek === 'found' ? .35 : C[9]; P.mood[1] = this.pupil || 1;
    P.yaw = this.bodyYaw - this.camYaw; P.lean = 0; P.pivot = 0; P.bend.set([0, 0, 0, -1]); P.squash = 0;
  }
  isIdle() { return this.cur && this.cur.name === 'Idle'; }
  piv3(M, b, r) { const o = b * 12; return [0, 1, 2].map(i => M[o + i * 4] * r[0] + M[o + i * 4 + 1] * r[1] + M[o + i * 4 + 2] * r[2] + M[o + i * 4 + 3]); }
  notify() { this.walkTo = null; this.seek = 'look'; this.knock = { t0: this.time, phase: 'come', done: {}, arm: 0, tap: 0, msg: ['Knock knock! New message for you', 'Hey! Someone texted you', 'Psst... you have a notification'][Math.floor(rnd() * 3)] };
    this.banner = { t0: this.time, app: 'Messages', who: 'Sara', text: 'Are you still coming tonight?' }; }
  wander() { const a = rnd() * 6.283, r = .6 + rnd() * 1.2; let x = this.px + Math.sin(a) * r, z = this.pz + Math.cos(a) * r;
    const R = Math.hypot(x, z); if (R > 2.2) { x *= 2.2 / R; z *= 2.2 / R; } this.walkTo = [x, z]; }
  drawBg(W, H) { gl.viewport(0, 0, W, H); gl.useProgram(orbitProg.p); const u = orbitProg.u;
    // background camera matched to the creature: its feet line and its size on screen
    const D = 6, tf = (1 / D) / (this.size0), feetNdc = -this.halfH * .52, pitch = Math.atan(.12);
    const camH = D * Math.tan(pitch - Math.atan(feetNdc * tf));
    gl.uniform2f(u.uRes, W, H); gl.uniform1f(u.uYaw, this.camYaw); gl.uniform1f(u.uTime, this.time % 1000); gl.uniform1f(u.uTanF, tf); gl.uniform1f(u.uPitch, pitch);
    gl.uniform3f(u.uCam, this.camX + Math.sin(this.camYaw) * D, camH, this.camZ + Math.cos(this.camYaw) * D); gl.uniform2f(u.uTarget, this.camX, this.camZ); gl.uniform1f(u.uBass, music.bass); gl.uniform1f(u.uEnv, this.env);
    const fr = this.ball * (.06 + .2 * this.battery); gl.uniform4f(u.uFire, this.px, .55, this.pz - .25, this.ball > .01 ? fr : 0); drawTri(); }
  draw() { const P = this.pet, W = this.W, H = this.H, m = Math.min(W, H), k = this.size / P.height, bh = P.boxR * k;
    const toNdc = (uu, vv) => [uu / this.halfW, vv / this.halfH], sw = this.size * .32, sh = this.size * .05;
    const a0 = toNdc(-sw, this.floorY - sh), a1 = toNdc(sw, this.floorY + sh); shadow(a0[0], a0[1], a1[0], a1[1], .9);
    const ox = this.px - this.camX, oz = this.pz - this.camZ, lat = ox * Math.cos(this.camYaw) - oz * Math.sin(this.camYaw);
    const shx = (this.shake || 0) * .012 * Math.sin(this.time * 90), hopY = (this.hop || 0) * this.size * .12;
    const sx = (.5 + lat * this.size0 / (this.halfW * 2) + shx) * W, sy = ((this.floorY + hopY + P.boxCz * k) / (this.halfH * 2) + .5) * H; P.render(sx, sy, bh * m, 0, W, H);
    this.scr = { sx, sy, k, W, H };
    if (this.ball > .01 && this.ballPos) { const [fx_, fy_] = P.project(this.ballPos, sx, sy, bh * m, 0), r = this.ball * (.07 + .13 * this.battery) * this.size * m;
      const x0 = (fx_ - r) / W * 2 - 1, x1 = (fx_ + r) / W * 2 - 1, y0 = (fy_ - r) / H * 2 - 1, y1 = (fy_ + r) / H * 2 - 1;
      gl.useProgram(fireProg.p); gl.uniform4f(fireProg.u.uRect, x0, y0, x1, y1); gl.uniform1f(fireProg.u.uTime, this.time % 1000); gl.uniform1f(fireProg.u.uHeat, this.battery);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disable(gl.BLEND); this.fireScr = [fx_, fy_, r]; } else this.fireScr = null; }
  // home-screen chrome on the 2D overlay: clock, page dots and icon grids that slide with the pages
  drawFx(ctx, Wc, Hc) {
    const s = Hc / 900; ctx.save(); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.font = `300 ${Math.round(64 * s)}px "Plus Jakarta Sans", Inter, system-ui`;
    const d = new Date(); ctx.globalAlpha = .92; ctx.fillText(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, Wc / 2, 120 * s);
    ctx.font = `500 ${Math.round(15 * s)}px Inter, system-ui`; ctx.fillStyle = '#C9C2DA'; ctx.fillText('Swipe left / right like your home screen', Wc / 2, 150 * s);
    const cols = ['#9D4EDD', '#FFB36B', '#2DD4BF', '#CDB4FF', '#F472B6', '#60A5FA', '#4ADE80', '#FB923C'];
    for (let p = 0; p < this.pages; p++) { const x0 = (p - this.off) * Wc; if (x0 < -Wc || x0 > Wc) continue;
      for (let i = 0; i < 8; i++) { const cx = x0 + Wc * (.17 + .22 * (i % 4)), cy = (230 + 92 * Math.floor(i / 4)) * s, r = 26 * s, col = cols[(i + p * 3) % 8];
        ctx.globalAlpha = .9; const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r); g.addColorStop(0, col); g.addColorStop(1, '#1E192B');
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, r * .42); ctx.fill();
        ctx.globalAlpha = .55; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, r * .32, 0, 6.283); ctx.fill(); } }
    for (let i = 0; i < 4; i++) { const cx = Wc * (.17 + .22 * i), cy = Hc - 70 * s, r = 26 * s; ctx.globalAlpha = .85; ctx.fillStyle = cols[(i * 2 + 1) % 8];
      ctx.beginPath(); ctx.roundRect(cx - r, cy - r, 2 * r, 2 * r, r * .42); ctx.fill(); }
    for (let p = 0; p < this.pages; p++) { ctx.globalAlpha = Math.abs(p - this.off) < .5 ? 1 : .35; ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(Wc / 2 + (p - (this.pages - 1) / 2) * 16 * s, Hc - 125 * s, 3.5 * s, 0, 6.283); ctx.fill(); }
    // notification banner
    if (this.banner) { const u = this.time - this.banner.t0; if (u > 6) this.banner = null; else {
      const y = (-90 + 112 * sm01(u / .35) - 112 * sm01((u - 5.5) / .4)) * s, x0 = 16 * s, w = Wc - 32 * s, h = 76 * s; ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(30,25,43,0.92)'; ctx.beginPath(); ctx.roundRect(x0, y, w, h, 20 * s); ctx.fill(); ctx.strokeStyle = 'rgba(205,180,255,0.25)'; ctx.stroke();
      ctx.fillStyle = '#4ADE80'; ctx.beginPath(); ctx.roundRect(x0 + 14 * s, y + 16 * s, 44 * s, 44 * s, 11 * s); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = '#9E96B0'; ctx.font = `600 ${Math.round(12 * s)}px Inter, system-ui`; ctx.fillText(`${this.banner.app.toUpperCase()} · now`, x0 + 72 * s, y + 28 * s);
      ctx.fillStyle = '#FFFFFF'; ctx.font = `700 ${Math.round(15 * s)}px Inter, system-ui`; ctx.fillText(this.banner.who, x0 + 72 * s, y + 48 * s);
      ctx.fillStyle = '#C9C2DA'; ctx.font = `400 ${Math.round(14 * s)}px Inter, system-ui`; ctx.fillText(this.banner.text, x0 + 72 * s, y + 66 * s); } }
    if (this.charging || this.ball > .05) { ctx.globalAlpha = Math.min(1, this.ball + .2); ctx.textAlign = 'center'; ctx.fillStyle = '#FFB36B'; ctx.font = `800 ${Math.round(15 * s)}px Inter, system-ui`;
      ctx.fillText(`CHARGING · ${Math.round(this.battery * 100)}%`, Wc / 2, Hc - 160 * s); }
    const sc2 = this.scr; if (!sc2) { ctx.restore(); return; }
    const toC = (x, y) => [x / sc2.W * Wc, Hc - y / sc2.H * Hc];
    // knuckle marks on the glass
    this.rings = this.rings.filter(r => this.time - r.t < .7);
    for (const r of this.rings) { const u = (this.time - r.t) / .7, [hx, hy] = toC(sc2.sx - this.size * .16 / (this.halfW * 2) * sc2.W, sc2.sy + this.size * .05 / (this.halfH * 2) * sc2.H);
      ctx.globalAlpha = (1 - u) * .8; ctx.strokeStyle = '#FFE2B8'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.arc(hx, hy, (10 + 60 * u) * s, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = (1 - u) * .35; ctx.beginPath(); ctx.arc(hx, hy, (6 + 30 * u) * s, 0, 6.283); ctx.stroke(); }
    // speech bubble
    if (this.knock && this.knock.phase !== 'come') { const u = this.time - this.knock.t1, a = sm01(u / .25) * (1 - sm01((u - 3.2) / .3));
      if (a > 0) { const [bx, by] = toC(sc2.sx, sc2.sy + this.size * .62 / (this.halfH * 2) * sc2.H); ctx.globalAlpha = a; ctx.font = `700 ${Math.round(16 * s)}px "Plus Jakarta Sans", Inter, system-ui`;
        const tw = ctx.measureText(this.knock.msg).width + 32 * s, bh = 46 * s, x = clamp(bx - tw / 2, 10 * s, Wc - tw - 10 * s), y = by - bh;
        ctx.fillStyle = '#CDB4FF'; ctx.beginPath(); ctx.roundRect(x, y, tw, bh, 18 * s); ctx.fill(); ctx.beginPath(); ctx.moveTo(bx - 10 * s, y + bh - 1); ctx.lineTo(bx, y + bh + 12 * s); ctx.lineTo(bx + 10 * s, y + bh - 1); ctx.fill();
        ctx.fillStyle = '#0D0A14'; ctx.textAlign = 'center'; ctx.fillText(this.knock.msg, x + tw / 2, y + 29 * s); } }
    ctx.restore(); }
}
function piv3(M, b, r) { const o = b * 12; return [0, 1, 2].map(i => M[o + i * 4] * r[0] + M[o + i * 4 + 1] * r[1] + M[o + i * 4 + 2] * r[2] + M[o + i * 4 + 3]); }
function sm01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
// rotate a set of bones about an axis through a 3D pivot (model space), in place on the pose
function rot3(M, list, p, ax, a) { if (Math.abs(a) < 1e-4) return; const c = Math.cos(a), s = Math.sin(a), t = 1 - c, [x, y, z] = ax;
  const R = [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  for (const b of list) { const o = b * 12;
    for (let col = 0; col < 4; col++) { const v0 = M[o + col], v1 = M[o + 4 + col], v2 = M[o + 8 + col];
      M[o + col] = R[0] * v0 + R[1] * v1 + R[2] * v2; M[o + 4 + col] = R[3] * v0 + R[4] * v1 + R[5] * v2; M[o + 8 + col] = R[6] * v0 + R[7] * v1 + R[8] * v2; }
    for (let i = 0; i < 3; i++) M[o + i * 4 + 3] += p[i] - (R[i * 3] * p[0] + R[i * 3 + 1] * p[1] + R[i * 3 + 2] * p[2]); } }
function knockSound() { try { if (!music.ctx) music.ctx = new (window.AudioContext || window.webkitAudioContext)(); const c = music.ctx, t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(90, t + .08);
  f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
  o.connect(f).connect(g).connect(c.destination); o.start(t); o.stop(t + .14); } catch (e) {} }

// ------------------------------------------------------------------ app
let scene = null, curKey = 'cat_snow', W = 1, H = 1;
const input = { bursts: new Float32Array(12), tiltX: 0, tiltY: 0 };
function resize() { const dpr = Math.min(window.devicePixelRatio || 1, 3); W = Math.round(canvas.clientWidth * dpr); H = Math.round(canvas.clientHeight * dpr);
  canvas.width = W; canvas.height = H; if (scene) scene.setScreen(W, H, groundUv()); }
function groundUv() { const spec = WORLDS[world.id]; if (!spec || !world.ready) return NaN;
  const m = coverMap(W, H), v = ((1 - spec.ground - m[3]) / m[1] - .5) / ZOOM + .5, hh = .5 * H / Math.min(W, H); return (v - .5) * 2 * hh; }
const WORLD_FOR = { cat_snow: 60, cat_cream: 61, cat_grey: 63, husky: 61, lion: 63, nutmeg: 65, snowy: 69, reaper: 71, reaper2: null, budgie: 67, cockatiel: 68, ringneck: 63, betta: 75, astro: null };
async function choose(key) {
  curKey = key; const s = SPECIES[key]; loadEl.style.display = 'flex'; loadEl.textContent = `Loading ${s.label}…`;
  const sc = s.orbit ? new OrbitScene() : s.astro ? new AstroScene() : s.fish ? new FishScene() : new PetScene();
  const wid = WORLD_FOR[key]; if (wid && WORLDS[wid] && world.id !== wid) await setWorld(wid); else if (!wid) world.ready = world.ready;
  await sc.setSpecies(s); if (curKey !== key) return; scene = sc; resize(); loadEl.style.display = 'none'; buildUi(); if (s.cat) sc.play('Wave');
}
function buildUi() {
  const pets = document.getElementById('pets'); pets.innerHTML = '';
  for (const [k, s] of Object.entries(SPECIES)) { const b = document.createElement('button'); b.textContent = s.label; if (k === curKey) b.className = 'on'; b.onclick = () => choose(k); pets.appendChild(b); }
  const ws = document.getElementById('worlds'); ws.innerHTML = '';
  if (SPECIES[curKey].orbit) { ORBIT_ENVS.forEach((nm, i) => { const b = document.createElement('button'); b.textContent = nm; if (scene && scene.env === i) b.className = 'on';
    b.onclick = () => { scene.env = i; buildUi(); }; ws.appendChild(b); }); }
  else
  for (const [id, w] of Object.entries(WORLDS)) { const b = document.createElement('button'); b.textContent = w.name; if (+id === world.id) b.className = 'on';
    b.onclick = async () => { await setWorld(+id); resize(); buildUi(); }; ws.appendChild(b); }
  const ts = document.getElementById('times'); ts.innerHTML = '';
  ['Morning', 'Noon', 'Sunset', 'Night'].forEach((n, i) => { const b = document.createElement('button'); b.textContent = n; if (world.phase === i + 1) b.className = 'on';
    b.onclick = () => { world.phase = i + 1; world.dirty = true; buildUi(); }; ts.appendChild(b); });
  const tr = document.getElementById('tricks'); tr.innerHTML = '';
  if (SPECIES[curKey].fur) { const b = document.createElement('button'); b.textContent = scene.pet.furOn ? 'Fur: ON' : 'Fur: OFF'; b.className = scene.pet.furOn ? 'on' : '';
    b.onclick = () => { scene.pet.furOn = !scene.pet.furOn; buildUi(); }; tr.appendChild(b); }
  if (SPECIES[curKey].cat || SPECIES[curKey].orbit) { const b = document.createElement('button'); b.textContent = music.on ? '♫ Beat: ON' : '♫ Beat: OFF'; b.className = music.on ? 'on' : '';
    b.onclick = () => { music.on ? music.stop() : music.start(); buildUi(); }; tr.appendChild(b); }
  for (const t of SPECIES[curKey].tricks) { const b = document.createElement('button'); b.textContent = t === 'Charger' && scene && scene.charging ? 'Charger: ON' : t; if (t === 'Charger' && scene && scene.charging) b.className = 'on'; b.onclick = () => scene && scene.trick(t); tr.appendChild(b); }
  if (SPECIES[curKey].orbit && scene) { const l = document.createElement('label'); l.style.cssText = 'display:flex;align-items:center;gap:8px;color:#9E96B0;font-size:13px;width:100%';
    l.textContent = 'Battery'; const r = document.createElement('input'); r.type = 'range'; r.min = 5; r.max = 100; r.value = Math.round(scene.battery * 100); r.oninput = () => { scene.battery = r.value / 100; }; l.appendChild(r); tr.appendChild(l); }
}
function toUv(e) { const r = canvas.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
  return [(nx - .5) * 2 * (.5 * W / Math.min(W, H)), (.5 - ny) * 2 * (.5 * H / Math.min(W, H))]; }
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); const [u, v] = toUv(e); scene && scene.down(u, v);
  const i = (burstN++ % 3) * 4; input.bursts[i] = u; input.bursts[i + 1] = v; input.bursts[i + 2] = 0; input.bursts[i + 3] = 1; });
canvas.addEventListener('pointermove', e => { const [u, v] = toUv(e); scene && scene.move(u, v); });
canvas.addEventListener('pointerup', e => { const [u, v] = toUv(e); scene && scene.up(u, v); });
let burstN = 0, last = 0, fpsT = 0, fpsN = 0;
window.__scene = () => scene;
const SLOW_BG = new URLSearchParams(location.search).get('oldbg') === '1';
const SLOWMO = Math.max(1, +(new URLSearchParams(location.search).get('slow') || 1));
function frame(ts) {
  const dt = Math.min(.05, last ? (ts - last) / 1000 : .016) / SLOWMO; last = ts; world.time += dt;
  for (let b = 0; b < 3; b++) { const k = b * 4; if (input.bursts[k + 3] > 0) { input.bursts[k + 2] += dt; if (input.bursts[k + 2] > 1.6) input.bursts[k + 3] = 0; } }
  gl.viewport(0, 0, W, H);
  if (scene instanceof AstroScene || scene instanceof OrbitScene) scene.drawBg(W, H); else drawWorld(W, H, world.time, input);
  music.update();
  if (scene) { const g = groundUv(); if (scene.ground !== g && !(isNaN(g) && isNaN(scene.ground))) scene.setScreen(W, H, g); scene.update(dt); scene.draw(); }
  fx.draw(scene instanceof PetScene && !(scene instanceof FishScene) ? scene : null, dt);
  fpsN++; fpsT += dt; if (fpsT > 1) { hud.textContent = `${Math.round(fpsN / fpsT)} FPS · native ${W}×${H}`; fpsN = 0; fpsT = 0; }
  requestAnimationFrame(frame);
}
(async () => {
  try {
    const [pv, pf, iw, ov] = await Promise.all(['pet.vert', 'pet.frag', 'imgworld.frag', 'overlay.frag'].map(f => fetch('shaders/' + f + '.txt').then(r => r.text())));
    const VS = 'attribute vec2 aPos;\nvoid main(){ gl_Position = vec4(aPos, 0.0, 1.0); }\n';
    petProg = program(pv, pf); imgProg = program(VS, iw); overlayProg = program(VS, ov); starsProg = program(VS, STARS_FS); orbitProg = program(VS, ORBIT_FS); fireProg = program(SHADOW_VS, FIRE_FS); nebProg = program(VS, NEB_FS); blitProg = program(VS, BLIT_FS); starPtProg = program(STAR_VS, STAR_FS); shadowProg = program(SHADOW_VS, SHADOW_FS);
    await loadWorldList();
    const first = Object.keys(WORLDS)[0]; if (first) await setWorld(+first).catch(e => console.warn('world', e));
    resize(); window.addEventListener('resize', resize);
    await choose(location.hash === '#ringneck' ? 'ringneck' : location.hash && SPECIES[location.hash.slice(1)] ? location.hash.slice(1) : 'cat_snow'); requestAnimationFrame(frame);
  } catch (e) { loadEl.textContent = 'Error: ' + e.message; console.error(e); }
})();
