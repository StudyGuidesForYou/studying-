// main.js — improved car visuals & pseudo-physics + diagnostics
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// DEBUG helpers
const DEBUG = true;
const log = (...a) => { if (DEBUG) console.log('[UR]', ...a); };
const warn = (...a) => { if (DEBUG) console.warn('[UR]', ...a); };
const error = (...a) => { if (DEBUG) console.error('[UR]', ...a); };

window.addEventListener('error', e => error('window.error', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => error('unhandledrejection', e.reason));

// Globals
let renderer, scene, camera;
let world, carRoot;
let lastTime = performance.now();
let t = 0;
const input = { forward:false, backward:false, left:false, right:false, handbrake:false };
let carState = { speed: 0, maxSpeed: 26, accel: 28, brake: 48, handbrakeSlide: 0.0 };
let cameraMode = 'third'; // 'third' or 'cockpit'
let debugOverlayEl = null;

// init
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
    requestAnimationFrame(loop);
  } catch (err) {
    error('init error', err);
  }
});

// --------------------------- Setup ---------------------------
function init(){
  log('init start');

  // renderer
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  // scene + camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 3, -8);

  // lights
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50,200,50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  // world + environment
  world = new World(scene);
  applyMode(scene, getPresetByName('Normal Human') || GraphicsPresets[2]);

  // create car (chassis + wheels)
  createCarVisual();

  // input
  setupInput();

  // UI + debug overlay
  setupUI();
  createDebugOverlay();

  // settings UI hooks
  initSettingsUI(preset => {
    log('settings UI applied preset', preset.name);
    applyPreset(preset);
  });

  // progressive LOD
  startProgressiveLoad();

  // resize
  window.addEventListener('resize', onResize);

  log('init complete');
}

// --------------------------- Car visuals & wheel config ---------------------------
const wheelParams = {
  radius: 0.35,
  width: 0.2,
  axleOffsetX: 0.9,   // half track
  axleOffsetZ: 1.1    // half wheelbase forward/back
};

function createCarVisual(){
  carRoot = new THREE.Group();
  carRoot.name = 'carRoot';

  // chassis
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 3.0);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xff3333, metalness:0.2, roughness:0.6 });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, 0.5, 0);
  chassis.castShadow = true;
  carRoot.add(chassis);

  // wheels (front-left, front-right, back-left, back-right)
  const wheelGeo = new THREE.CylinderGeometry(wheelParams.radius, wheelParams.radius, wheelParams.width, 16);
  wheelGeo.rotateZ(Math.PI / 2); // cylinders along X axis
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness:0.1, roughness:0.9 });

  const wheelOffsets = [
    {name:'fl', x: -wheelParams.axleOffsetX, z: -wheelParams.axleOffsetZ},
    {name:'fr', x: wheelParams.axleOffsetX, z: -wheelParams.axleOffsetZ},
    {name:'bl', x: -wheelParams.axleOffsetX, z: wheelParams.axleOffsetZ},
    {name:'br', x: wheelParams.axleOffsetX, z: wheelParams.axleOffsetZ},
  ];

  carRoot.userData.wheels = [];

  wheelOffsets.forEach(w => {
    const mw = new THREE.Mesh(wheelGeo, wheelMat);
    mw.position.set(w.x, wheelParams.radius, w.z);
    mw.name = 'wheel_' + w.name;
    mw.castShadow = true;

    // create a pivot for steering (for front wheels)
    const pivot = new THREE.Object3D();
    pivot.position.set(w.x, 0, w.z);
    pivot.add(mw);
    carRoot.add(pivot);

    carRoot.userData.wheels.push({ mesh: mw, pivot: pivot, offset: new THREE.Vector3(w.x, 0, w.z) });
  });

  // small visual: steering wheel inside (optional)
  scene.add(carRoot);
  log('car visuals created, wheels:', carRoot.userData.wheels.length);
}

// --------------------------- Input ---------------------------
function setupInput(){
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyW') input.forward = true;
    if (e.code === 'KeyS') input.backward = true;
    if (e.code === 'KeyA') input.left = true;
    if (e.code === 'KeyD') input.right = true;
    if (e.code === 'Space') input.handbrake = true;
    if (e.code === 'KeyC') { cameraMode = (cameraMode === 'third') ? 'cockpit' : 'third'; }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') input.forward = false;
    if (e.code === 'KeyS') input.backward = false;
    if (e.code === 'KeyA') input.left = false;
    if (e.code === 'KeyD') input.right = false;
    if (e.code === 'Space') input.handbrake = false;
  });
  log('input set (WASD, Space=handbrake, C=camera toggle)');
}

// --------------------------- Terrain sampling ---------------------------
function getTerrainHeightAt(x,z){
  const g = scene.getObjectByName('sr_ground');
  if (!g) return 0;
  const pos = g.geometry.attributes.position;
  let best = -Infinity;
  // coarse search optimisation: sample every N vertices if large
  const step = 4; // keep modest
  for (let i = 0; i < pos.count; i += step) {
    const vx = pos.getX(i) + g.position.x;
    const vz = pos.getZ(i) + g.position.z;
    if (Math.abs(vx - x) < 6 && Math.abs(vz - z) < 6) {
      const vy = pos.getY(i) + g.position.y;
      if (vy > best) best = vy;
    }
  }
  if (best === -Infinity) return g.position.y;
  return best;
}

// get approximate normal at a point — used for chassis orientation smoothing
function estimateNormalAt(x,z){
  const eps = 2.5;
  const hC = getTerrainHeightAt(x,z);
  const hx = getTerrainHeightAt(x+eps, z);
  const hz = getTerrainHeightAt(x, z+eps);
  const nx = new THREE.Vector3(eps, hx - hC, 0).normalize();
  const nz = new THREE.Vector3(0, hz - hC, eps).normalize();
  const n = new THREE.Vector3().crossVectors(nx, nz).normalize();
  return n;
}

// --------------------------- Car physics (pseudo) ---------------------------
function updateCar(dt){
  // acceleration/brake influences speed
  const forward = input.forward ? 1 : 0;
  const backward = input.backward ? 1 : 0;
  const handbrake = input.handbrake ? 1 : 0;

  // apply throttle/brake
  if (forward) carState.speed += carState.accel * dt;
  if (backward) carState.speed -= carState.brake * dt * 0.6;

  // natural drag
  const drag = 6 + Math.abs(carState.speed) * 0.6;
  carState.speed -= Math.sign(carState.speed) * drag * dt * 0.6;

  // clamp speed
  carState.speed = THREE.MathUtils.clamp(carState.speed, -12, carState.maxSpeed);

  // steering - speed-dependent
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerStrength = THREE.MathUtils.clamp(1.4 * (1 - Math.abs(carState.speed) / carState.maxSpeed), 0.18, 1.4);
  carRoot.rotation.y += steerInput * steerStrength * dt * (Math.abs(carState.speed) / 8 + 0.2);

  // compute forward vector and move
  const localForward = new THREE.Vector3(0,0,1).applyEuler(carRoot.rotation);
  carRoot.position.add(localForward.multiplyScalar(carState.speed * dt));

  // wheel visuals: rotate wheels by speed
  carRoot.userData.wheels.forEach(w => {
    w.mesh.rotation.x += carState.speed * dt * 4;
  });

  // Suspension: sample each wheel's world position to compute wheel heights
  const wheelWorldPositions = carRoot.userData.wheels.map(w => {
    const local = w.offset.clone();
    local.y = 0;
    const worldPos = local.clone().applyEuler(carRoot.rotation).add(carRoot.position);
    return { w, worldPos };
  });

  // get heights for each wheel
  const wheelHeights = wheelWorldPositions.map(o => {
    const h = getTerrainHeightAt(o.worldPos.x, o.worldPos.z);
    return h + wheelParams.radius; // wheel touches top
  });

  // compute desired chassis Y as average of wheel heights + small suspension offset
  const avgWheelY = wheelHeights.reduce((a,b)=>a+b,0) / wheelHeights.length;
  // smooth chassis Y
  const currentY = carRoot.position.y;
  const desiredY = avgWheelY + 0.15; // small clearance
  carRoot.position.y = THREE.MathUtils.lerp(currentY, desiredY, THREE.MathUtils.clamp(dt * 6, 0, 1));

  // compute approximate pitch and roll from wheel heights:
  // front wheels index 0,1; back wheels 2,3
  const frontAvg = (wheelHeights[0] + wheelHeights[1]) / 2;
  const backAvg = (wheelHeights[2] + wheelHeights[3]) / 2;
  const leftAvg = (wheelHeights[0] + wheelHeights[2]) / 2;
  const rightAvg = (wheelHeights[1] + wheelHeights[3]) / 2;
  const wheelbase = (wheelParams.axleOffsetZ*2);
  const track = (wheelParams.axleOffsetX*2);

  const pitch = Math.atan2(frontAvg - backAvg, wheelbase);
  const roll = Math.atan2(rightAvg - leftAvg, track);

  // smoothly lerp current rotation.x/z to match pitch/roll (so chassis tilts)
  carRoot.rotation.x = THREE.MathUtils.lerp(carRoot.rotation.x, pitch, THREE.MathUtils.clamp(dt*6,0,1));
  carRoot.rotation.z = THREE.MathUtils.lerp(carRoot.rotation.z, -roll, THREE.MathUtils.clamp(dt*6,0,1));

  // optionally simulate a bit of slide when handbrake applied
  if (handbrake) {
    carState.speed *= 0.985;
    carState.handbrakeSlide = Math.min(1, (carState.handbrakeSlide || 0) + dt * 2.5);
  } else {
    carState.handbrakeSlide = Math.max(0, (carState.handbrakeSlide || 0) - dt * 2.0);
  }
}

// --------------------------- Camera ---------------------------
function updateCamera(dt){
  if (!carRoot) return;
  if (cameraMode === 'third') {
    const behindLocal = new THREE.Vector3(0, 2.2, -6.5);
    behindLocal.applyEuler(carRoot.rotation);
    const target = carRoot.position.clone().add(behindLocal);
    // add a bit of lookahead depending on speed
    const forward = new THREE.Vector3(0,0,1).applyEuler(carRoot.rotation);
    target.add(forward.multiplyScalar(Math.min(8, Math.abs(carState.speed) * 0.6)));
    camera.position.lerp(target, THREE.MathUtils.clamp(dt * 4, 0, 1));
    const lookAt = carRoot.position.clone().add(new THREE.Vector3(0, 1.2, 1.6).applyEuler(carRoot.rotation));
    camera.lookAt(lookAt);
  } else {
    // cockpit: slightly above chassis and forward
    const cockpitLocal = new THREE.Vector3(0, 1.0, 0.6).applyEuler(carRoot.rotation);
    const target = carRoot.position.clone().add(cockpitLocal);
    camera.position.lerp(target, THREE.MathUtils.clamp(dt * 8,0,1));
    const lookAt = carRoot.position.clone().add(new THREE.Vector3(0, 1.2, 10).applyEuler(carRoot.rotation));
    camera.lookAt(lookAt);
  }
}

// --------------------------- Presets / LOD ---------------------------
function applyPreset(preset){
  log('Applying preset', preset.name);
  const targetPR = Math.min(2.5, (window.devicePixelRatio || 1) * (preset.renderScale || 1));
  renderer.setPixelRatio(targetPR);
  camera.far = preset.viewDistance || 1000;
  camera.updateProjectionMatrix();

  // environment will use preset fields to build ground/trees/snow
  try {
    applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' });
    log('applyMode finished for preset', preset.name);
  } catch (err) {
    error('applyMode error', err);
  }

  // debug scene
  reportSceneSummary();
}

function startProgressiveLoad(){
  applyPreset(GraphicsPresets[0]);
  setTimeout(()=>applyPreset(GraphicsPresets[2]), 1200);
  setTimeout(()=>applyPreset(GraphicsPresets[5]), 4200);
}

// --------------------------- UI + overlay ---------------------------
function setupUI(){
  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn?.addEventListener('click', ()=>panel.classList.toggle('hidden'));

  const sel = document.getElementById('presetSelect');
  if (sel) {
    getPresetNames().forEach(name => {
      const o = document.createElement('option'); o.value = name; o.textContent = name; sel.appendChild(o);
    });
    document.getElementById('applySettings')?.addEventListener('click', ()=>{
      const p = getPresetByName(sel.value);
      if (p) applyPreset(p);
    });
  }
}

function createDebugOverlay(){
  debugOverlayEl = document.createElement('div');
  debugOverlayEl.style.position = 'fixed';
  debugOverlayEl.style.right = '10px';
  debugOverlayEl.style.top = '10px';
  debugOverlayEl.style.padding = '8px 10px';
  debugOverlayEl.style.background = 'rgba(0,0,0,0.55)';
  debugOverlayEl.style.color = 'white';
  debugOverlayEl.style.fontFamily = 'monospace';
  debugOverlayEl.style.fontSize = '12px';
  debugOverlayEl.style.zIndex = 9999;
  debugOverlayEl.style.borderRadius = '6px';
  debugOverlayEl.innerHTML = 'debug overlay';
  document.body.appendChild(debugOverlayEl);
}

function updateDebugOverlay(){
  if (!debugOverlayEl || !carRoot) return;
  const pos = carRoot.position;
  debugOverlayEl.innerHTML =
    `spd: ${carState.speed.toFixed(2)} m/s<br>` +
    `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>` +
    `cam: ${cameraMode}<br>` +
    `preset: ${localStorage.getItem('graphicsPreset') || 'Normal Human'}`;
}

// --------------------------- Resize ---------------------------
function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------------- Main loop ---------------------------
function loop(now = performance.now()){
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  t += dt;

  // update systems
  try { updateCar(dt); } catch (e) { error('updateCar:', e); }
  try { updateCamera(dt); } catch (e) { error('updateCamera:', e); }
  try { updateEnvironment(dt, t); } catch (e) { error('updateEnvironment:', e); }
  try { if (world && typeof world.update === 'function') world.update(dt); } catch (e) { error('world.update:', e); }

  // update wheels steering hinge visuals (front wheels)
  // front wheel steering angle:
  const steerAngle = (input.left ? 0.45 : 0) - (input.right ? 0.45 : 0);
  carRoot.userData.wheels.forEach((w, i) => {
    if (i === 0 || i === 1) { // front wheels pivot rotation.y for steering
      w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle, Math.min(1, dt * 8));
    } else {
      w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, 0, Math.min(1, dt * 8));
    }
  });

  // render + overlay update
  renderer.render(scene, camera);
  updateDebugOverlay();

  requestAnimationFrame(loop);
}

// --------------------------- Start everything ---------------------------
(function bootstrap(){
  init(); // builds scene + car + UI
  startProgressiveLoad();
})();

log('main.js loaded and bootstrap executed');
