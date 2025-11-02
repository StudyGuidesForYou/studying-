// main.js (diagnostic + fixed imports)
// --------------------------------------------------
// Full working main with verbose console diagnostics
// --------------------------------------------------

import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// Global debug helpers
window.__UR_DEBUG__ = window.__UR_DEBUG__ || {};
const DEBUG = true;

function safeLog(...args) { if (DEBUG) console.log('[UR]', ...args); }
function safeWarn(...args) { if (DEBUG) console.warn('[UR]', ...args); }
function safeError(...args) { if (DEBUG) console.error('[UR]', ...args); }

safeLog('main module loaded');

// Global state
let renderer, scene, camera;
let world, car;
let lastTime = performance.now();
let t = 0;
const input = { forward:false, backward:false, left:false, right:false };

// Install global error handlers so everything reports to console
window.addEventListener('error', (ev) => {
  safeError('window.error', ev.message, ev.filename, ev.lineno, ev.colno, ev.error);
});
window.addEventListener('unhandledrejection', (ev) => {
  safeError('unhandledrejection', ev.reason);
});

// Utility to show current objects counts
function reportSceneSummary() {
  if (!scene) return;
  const counts = { meshes:0, points:0, instanced:0, lights:0 };
  scene.traverse(obj => {
    if (obj.isMesh) counts.meshes++;
    if (obj.isPoints) counts.points++;
    if (obj.isInstancedMesh) counts.instanced++;
    if (obj.isLight) counts.lights++;
  });
  safeLog('scene summary', counts);
  return counts;
}

// Initialize renderer, scene, camera
function setupRenderer() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  safeLog('renderer created', { pixelRatio: renderer.getPixelRatio() });
}

function setupScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 4, -8);
  safeLog('scene & camera created');
}

function setupLights() {
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 200, 50);
  sun.castShadow = false;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  safeLog('lights added');
}

function createCar() {
  const geo = new THREE.BoxGeometry(1.6, 0.7, 3.2);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
  car = new THREE.Mesh(geo, mat);
  car.position.set(0, 1, 0);
  car.name = 'player_car';
  scene.add(car);
  safeLog('car created');
}

// Input handling
function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (['w','ArrowUp'].includes(e.key)) input.forward = true;
    if (['s','ArrowDown'].includes(e.key)) input.backward = true;
    if (['a','ArrowLeft'].includes(e.key)) input.left = true;
    if (['d','ArrowRight'].includes(e.key)) input.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (['w','ArrowUp'].includes(e.key)) input.forward = false;
    if (['s','ArrowDown'].includes(e.key)) input.backward = false;
    if (['a','ArrowLeft'].includes(e.key)) input.left = false;
    if (['d','ArrowRight'].includes(e.key)) input.right = false;
  });
  safeLog('input handlers set');
}

// Terrain height sample: nearest vertex approx
function getTerrainHeightAt(x, z) {
  try {
    const g = scene.getObjectByName('sr_ground');
    if (!g) return 0;
    const pos = g.geometry.attributes.position;
    let best = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + g.position.x;
      const vz = pos.getZ(i) + g.position.z;
      if (Math.abs(vx - x) < 4 && Math.abs(vz - z) < 4) {
        const vy = pos.getY(i) + g.position.y;
        if (vy > best) best = vy;
      }
    }
    if (best === -Infinity) return g.position.y;
    return best;
  } catch (err) {
    safeError('getTerrainHeightAt error', err);
    return 0;
  }
}

// Car simple dynamics / height lock
let carState = { speed: 0, heading: 0 };
function updateCar(dt) {
  // acceleration/brake
  if (input.forward) carState.speed += 18 * dt;
  if (input.backward) carState.speed -= 22 * dt;
  carState.speed *= 0.97; // drag
  carState.speed = THREE.MathUtils.clamp(carState.speed, -8, 32);

  // steering scaled by speed
  if (input.left) car.rotation.y += 1.2 * dt * (carState.speed / 8);
  if (input.right) car.rotation.y -= 1.2 * dt * (carState.speed / 8);

  // move
  const forward = new THREE.Vector3(0, 0, 1).applyEuler(car.rotation);
  car.position.add(forward.multiplyScalar(carState.speed * dt));

  // sample terrain & lock
  const terrainY = getTerrainHeightAt(car.position.x, car.position.z);
  car.position.y = terrainY + 0.5;

  // debug output each second
  if (Math.floor(t) % 1 === 0) {
    safeLog('car pos', car.position.toArray().map(v => v.toFixed(2)), 'speed', carState.speed.toFixed(2));
  }
}

// Smooth chase camera behind car
function updateCamera(dt) {
  const behind = new THREE.Vector3(0, 2.0, -6).applyEuler(car.rotation).add(car.position);
  camera.position.lerp(behind, 4 * dt);
  camera.lookAt(car.position.clone().add(new THREE.Vector3(0, 1.2, 6).applyEuler(car.rotation)));
}

// Apply a graphics preset (progressive friendly)
function applyPreset(preset) {
  safeLog('Applying preset', preset.name ?? preset);
  // pixel ratio (clamped)
  const targetPR = Math.min(2.5, (window.devicePixelRatio || 1) * (preset.renderScale || 1));
  renderer.setPixelRatio(targetPR);
  camera.far = preset.viewDistance || 1000;
  camera.updateProjectionMatrix();

  // tell environment to build using preset specifications
  try {
    applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' });
    safeLog('applyMode returned');
  } catch (err) {
    safeError('applyMode failed', err);
  }

  // scene summary
  reportSceneSummary();
}

// Progressive LOD sequence logic
function startProgressiveLoad() {
  safeLog('starting progressive LOD sequence');
  // immediate low preset
  applyPreset(GraphicsPresets[0]); // Potato
  setTimeout(() => { safeLog('upgrading to medium'); applyPreset(GraphicsPresets[2]); }, 1500);
  setTimeout(() => { safeLog('upgrading to high (CPU Destroyer)'); applyPreset(GraphicsPresets[5]); }, 4500);
}

// Setup UI hooks
function setupUI() {
  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn?.addEventListener('click', () => panel.classList.toggle('hidden'));

  // populate preset select
  const sel = document.getElementById('presetSelect');
  if (sel) {
    getPresetNames().forEach(name => {
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      sel.appendChild(o);
    });
    document.getElementById('applySettings')?.addEventListener('click', () => {
      const v = sel.value;
      const p = getPresetByName(v);
      if (p) applyPreset(p);
      safeLog('manual preset apply from UI', v);
    });
  }
}

// Main init
function init() {
  safeLog('init start');
  setupRenderer();
  setupScene();
  setupLights();
  setupInput();
  setupUI();

  // Create world and car
  world = new World(scene);
  createCar();

  // settings UI
  initSettingsUI((preset) => {
    safeLog('settings UI applied preset', preset.name);
    applyPreset(preset);
  });

  // progressive LOD
  startProgressiveLoad();

  // final log
  safeLog('init complete - entering loop');
}

function setupRenderer() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  safeLog('renderer initialized', { pixelRatio: renderer.getPixelRatio() });
}

function setupScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 4, -8);
}

function setupLights() {
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 200, 50);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
}

// Animation frame
function animate(now = performance.now()) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  t += dt;

  // Update systems
  try {
    updateCar(dt);
  } catch (err) {
    safeError('updateCar error', err);
  }
  try {
    updateCamera(dt);
  } catch (err) {
    safeError('updateCamera error', err);
  }
  try {
    updateEnvironment(dt, t);
  } catch (err) {
    safeError('updateEnvironment error', err);
  }
  try {
    world.update(dt);
  } catch (err) {
    safeError('world.update error', err);
  }

  renderer.render(scene, camera);

  // print some stats every 3 seconds
  if (Math.floor(t) % 3 === 0) {
    const mem = performance && performance.memory ? performance.memory : null;
    safeLog('tick', { t: t.toFixed(2), rendererInfo: renderer.info.render, memory: mem });
  }

  requestAnimationFrame(animate);
}

// On DOM ready (we are module loaded after index, but ensure)
document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
    requestAnimationFrame(animate);
  } catch (err) {
    safeError('init or animate top-level error', err);
  }
});

safeLog('main.js executed');
