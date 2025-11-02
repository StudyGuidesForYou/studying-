// main.js — consolidated final (replace fully)
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// debug helpers
const DEBUG = true;
const log = (...a) => { if (DEBUG) console.log('[UR]', ...a); };
const err = (...a) => { if (DEBUG) console.error('[UR]', ...a); };

let renderer, scene, camera, world;
let carRoot;
let lastTime = performance.now();
let t = 0;
const input = { forward:false, backward:false, left:false, right:false, handbrake:false };

window.addEventListener('error', e => err('window.error', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => err('unhandledrejection', e.reason));

// helper: report scene summary (safe)
function reportSceneSummary(sceneObj, worldObj, opts={}) {
  try {
    console.group('[DEBUG] Scene Summary');
    console.log('Camera', camera ? camera.position.clone() : 'no camera');
    console.log('Renderer pixelRatio', renderer ? renderer.getPixelRatio() : 'no renderer');
    console.log('Scene children count', sceneObj ? sceneObj.children.length : 0);
    console.log('Active preset', opts.presetName || 'unknown');
    console.groupEnd();
  } catch (e) { err('reportSceneSummary failed', e); }
}

// setup
function setupRendererAndScene() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 4, -8);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 200, 50);
  scene.add(sun);
  log('renderer/scene/camera initialized');
}

function createCar() {
  carRoot = new THREE.Group();
  carRoot.name = 'carRoot';
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.5,3.0), new THREE.MeshStandardMaterial({color:0xff3333}));
  chassis.position.set(0,0.5,0);
  carRoot.add(chassis);
  scene.add(carRoot);
  log('car created');
}

function setupInput() {
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyW') input.forward = true;
    if (e.code === 'KeyS') input.backward = true;
    if (e.code === 'KeyA') input.left = true;
    if (e.code === 'KeyD') input.right = true;
    if (e.code === 'Space') input.handbrake = true;
    if (e.code === 'KeyC') cameraMode = cameraMode === 'third' ? 'cockpit' : 'third';
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') input.forward = false;
    if (e.code === 'KeyS') input.backward = false;
    if (e.code === 'KeyA') input.left = false;
    if (e.code === 'KeyD') input.right = false;
    if (e.code === 'Space') input.handbrake = false;
  });
  log('input set');
}

// apply preset: name or preset object
function applyPreset(presetOrName) {
  const preset = typeof presetOrName === 'string' ? getPresetByName(presetOrName) : presetOrName;
  if (!preset) {
    err('applyPreset: preset not found', presetOrName);
    return;
  }
  log('Applying preset', preset.name);
  renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio||1) * (preset.renderScale || 1)));
  camera.far = preset.viewDistance || 1000;
  camera.updateProjectionMatrix();
  try {
    applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' });
  } catch (e) { err('applyMode error', e); }
  reportSceneSummary(scene, world, { presetName: preset.name });
}

// progressive LOD
function startProgressiveLoad() {
  applyPreset('Potato');
  setTimeout(()=> applyPreset('Normal Human'), 1200);
  setTimeout(()=> applyPreset('CPU Destroyer'), 4200);
}

// simple terrain height helper (nearest vertex)
function getTerrainHeightAt(x,z) {
  const g = scene.getObjectByName('sr_ground');
  if (!g) return 0;
  const pos = g.geometry.attributes.position;
  let best = -Infinity;
  for (let i=0;i<pos.count;i+=4) {
    const vx = pos.getX(i) + g.position.x;
    const vz = pos.getZ(i) + g.position.z;
    if (Math.abs(vx-x) < 6 && Math.abs(vz-z) < 6) {
      const vy = pos.getY(i) + g.position.y;
      if (vy > best) best = vy;
    }
  }
  return best === -Infinity ? g.position.y : best;
}

// basic pseudo-physics for car (keep light)
let speed = 0;
function updateCar(dt) {
  if (!carRoot) return;
  if (input.forward) speed += 12 * dt;
  if (input.backward) speed -= 18 * dt;
  speed *= 0.98;
  speed = THREE.MathUtils.clamp(speed, -8, 26);

  // steering
  if (input.left) carRoot.rotation.y += 1.2 * dt * (speed/8 + 0.2);
  if (input.right) carRoot.rotation.y -= 1.2 * dt * (speed/8 + 0.2);

  // move
  const forward = new THREE.Vector3(0,0,1).applyEuler(carRoot.rotation);
  carRoot.position.add(forward.multiplyScalar(speed * dt));

  // lock to terrain
  const ty = getTerrainHeightAt(carRoot.position.x, carRoot.position.z);
  carRoot.position.y = THREE.MathUtils.lerp(carRoot.position.y, ty + 0.5, Math.min(1, dt*6));
}

let cameraMode = 'third';
function updateCamera(dt) {
  if (!carRoot) return;
  if (cameraMode === 'third') {
    const behind = new THREE.Vector3(0, 2.2, -6.5).applyEuler(carRoot.rotation).add(carRoot.position);
    camera.position.lerp(behind, Math.min(1, dt*4));
    camera.lookAt(carRoot.position.clone().add(new THREE.Vector3(0,1.2,2.0)));
  } else {
    const cockpit = carRoot.position.clone().add(new THREE.Vector3(0,1.2,0.6).applyEuler(carRoot.rotation));
    camera.position.lerp(cockpit, Math.min(1, dt*8));
    camera.lookAt(carRoot.position.clone().add(new THREE.Vector3(0,1.2,10).applyEuler(carRoot.rotation)));
  }
}

// main loop
function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;
  t += dt;

  try { updateCar(dt); } catch (e) { err('updateCar error', e); }
  try { updateCamera(dt); } catch (e) { err('updateCamera error', e); }
  try { updateEnvironment(dt, t); } catch (e) { err('updateEnvironment error', e); }
  try { if (world && typeof world.update === 'function') world.update(dt); } catch (e) { err('world.update error', e); }

  renderer.render(scene, camera);
}

// bootstrap
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupRendererAndScene();
    world = new World(scene);
    createCar();
    setupInput();
    setupUI();
    initSettingsUI(preset => applyPreset(preset));
    startProgressiveLoad();
    animate();
    log('bootstrap complete');
  } catch (e) {
    err('bootstrap error', e);
  }
});

function setupUI(){
  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn?.addEventListener('click', ()=> panel.classList.toggle('hidden'));

  const sel = document.getElementById('presetSelect');
  if (sel) {
    getPresetNames().forEach(n => {
      const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o);
    });
    document.getElementById('applySettings')?.addEventListener('click', ()=>{
      const p = getPresetByName(sel.value);
      if (p) applyPreset(p);
    });
  }
}
