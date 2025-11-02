// main.js — FULL REPLACEMENT
// Robust, defensive, diagnostic-heavy, single-file entrypoint
// Works with: world.js, environment.js, graphicsPresets.js, settings.js

import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// -------------------- DEBUG HELPERS --------------------
const DEBUG = true;
const log = (...a) => { if (DEBUG) console.log('[UR]', ...a); };
const warn = (...a) => { if (DEBUG) console.warn('[UR]', ...a); };
const error = (...a) => { if (DEBUG) console.error('[UR]', ...a); };

window.addEventListener('error', e => error('window.error', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => error('unhandledrejection', e.reason));

/**
 * reportSceneSummary
 * Safe diagnostic output used by applyPreset and startup.
 * Must be defined before any code calls it.
 */
function reportSceneSummary(sceneObj, worldObj = null, opts = {}) {
  try {
    console.group('[DEBUG] Scene Summary');
    // Renderer info (if present)
    if (window.renderer) {
      try {
        const pr = window.renderer.getPixelRatio ? window.renderer.getPixelRatio() : 'n/a';
        const size = window.renderer.getSize ? window.renderer.getSize(new THREE.Vector2()) : 'n/a';
        console.log('Renderer pixelRatio:', pr, 'size:', size);
      } catch (e) {
        console.log('Renderer: (not available in global)');
      }
    } else {
      console.log('Renderer: not attached to window');
    }

    // Camera info
    if (window.camera) {
      console.log('Camera pos:', window.camera.position.clone(), 'fov:', window.camera.fov, 'near/far:', window.camera.near, window.camera.far);
    } else {
      console.log('Camera: not initialised');
    }

    // Scene objects list summary
    if (sceneObj) {
      const counts = { meshes: 0, points: 0, instanced: 0, lights: 0, others: 0 };
      sceneObj.traverse(o => {
        if (o.isMesh) counts.meshes++;
        else if (o.isPoints) counts.points++;
        else if (o.isInstancedMesh) counts.instanced++;
        else if (o.isLight) counts.lights++;
        else counts.others++;
      });
      console.log('Scene children:', sceneObj.children.length, 'counts:', counts);
      console.log('Top level objects:', sceneObj.children.map(c => `${c.name || c.type}:${c.type}`));
    } else {
      console.log('Scene: not initialised');
    }

    // World summary if passed
    if (worldObj) {
      console.log('World summary (if available):', {
        hasRoad: !!worldObj.road,
        worldOpts: worldObj.opts ?? null
      });
    }

    console.log('Applied preset:', opts.presetName ?? 'unknown');
    console.groupEnd();
  } catch (err) {
    console.error('[DEBUG] reportSceneSummary failed:', err);
  }
}

// -------------------- GLOBAL STATE --------------------
let renderer = null;
let scene = null;
let camera = null;
let world = null;
let carRoot = null; // group containing chassis/wheels
let lastTime = performance.now();
let t = 0;
let cameraMode = 'third'; // 'third' or 'cockpit'

const input = {
  forward: false, backward: false, left: false, right: false, handbrake: false
};

// expose a couple things globally for the debug reporter to read if needed
window.renderer = renderer;
window.camera = camera;

// -------------------- INITIALIZATION --------------------
function initRendererAndScene() {
  // Canvas if present
  const canvas = document.getElementById('gameCanvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
  renderer.outputEncoding = THREE.sRGBEncoding;

  // attach to global for reporting helper
  window.renderer = renderer;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fcfff);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 4, -10);

  // attach global camera
  window.camera = camera;

  // lights
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 200, 50);
  sun.castShadow = false;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  log('renderer/scene/camera initialised');
}

function createCarVisuals() {
  carRoot = new THREE.Group();
  carRoot.name = 'carRoot';

  // chassis
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 3.0);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xff3333, metalness: 0.2, roughness: 0.6 });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.set(0, 0.5, 0);
  chassis.castShadow = true;
  carRoot.add(chassis);

  // simple wheels: 4 cylinders
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.2, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

  const wheelPositions = [
    { name: 'fl', x: -0.85, z: -1.2 }, // front-left
    { name: 'fr', x: 0.85, z: -1.2 },  // front-right
    { name: 'bl', x: -0.85, z: 1.1 },  // back-left
    { name: 'br', x: 0.85, z: 1.1 }    // back-right
  ];

  carRoot.userData.wheels = [];
  wheelPositions.forEach(w => {
    const pivot = new THREE.Object3D();
    pivot.position.set(w.x, 0, w.z);

    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(0, 0.34, 0);
    wheel.castShadow = true;

    pivot.add(wheel);
    carRoot.add(pivot);

    carRoot.userData.wheels.push({ name: w.name, mesh: wheel, pivot: pivot, offset: new THREE.Vector3(w.x, 0, w.z) });
  });

  scene.add(carRoot);
  log('car visuals created, wheels:', carRoot.userData.wheels.length);
}

// -------------------- INPUT --------------------
function setupInput() {
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyW') input.forward = true;
    if (e.code === 'KeyS') input.backward = true;
    if (e.code === 'KeyA') input.left = true;
    if (e.code === 'KeyD') input.right = true;
    if (e.code === 'Space') input.handbrake = true;
    if (e.code === 'KeyC') cameraMode = (cameraMode === 'third') ? 'cockpit' : 'third';
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') input.forward = false;
    if (e.code === 'KeyS') input.backward = false;
    if (e.code === 'KeyA') input.left = false;
    if (e.code === 'KeyD') input.right = false;
    if (e.code === 'Space') input.handbrake = false;
  });
  log('input set (WASD, Space, C)');
}

// -------------------- TERRAIN HELPERS --------------------
function getTerrainHeightAt(x, z) {
  try {
    const g = scene.getObjectByName('sr_ground');
    if (!g) return 0;
    const pos = g.geometry.attributes.position;
    let best = -Infinity;
    // coarse iteration step for performance
    const step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      const vx = pos.getX(i) + g.position.x;
      const vz = pos.getZ(i) + g.position.z;
      if (Math.abs(vx - x) < 6 && Math.abs(vz - z) < 6) {
        const vy = pos.getY(i) + g.position.y;
        if (vy > best) best = vy;
      }
    }
    return best === -Infinity ? g.position.y : best;
  } catch (err) {
    error('getTerrainHeightAt error', err);
    return 0;
  }
}

// approximate normal via finite differences
function approxNormal(x, z) {
  const eps = 2.5;
  const h = getTerrainHeightAt(x, z);
  const hx = getTerrainHeightAt(x + eps, z);
  const hz = getTerrainHeightAt(x, z + eps);
  const v1 = new THREE.Vector3(eps, hx - h, 0);
  const v2 = new THREE.Vector3(0, hz - h, eps);
  return new THREE.Vector3().crossVectors(v1, v2).normalize();
}

// -------------------- CAR PSEUDO-PHYSICS --------------------
const vehicle = {
  speed: 0,
  maxSpeed: 26,
  accel: 28,
  brakeForce: 48,
  dragBase: 6
};

function updateVehicle(dt) {
  if (!carRoot) return;

  // throttle/brake
  if (input.forward) vehicle.speed += vehicle.accel * dt;
  if (input.backward) vehicle.speed -= vehicle.brakeForce * dt;

  // drag & clamp
  const drag = vehicle.dragBase + Math.abs(vehicle.speed) * 0.6;
  vehicle.speed -= Math.sign(vehicle.speed) * drag * dt * 0.6;
  vehicle.speed = THREE.MathUtils.clamp(vehicle.speed, -12, vehicle.maxSpeed);

  // steering scaled by speed
  const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const steerScale = THREE.MathUtils.clamp(1.4 * (1 - Math.abs(vehicle.speed) / vehicle.maxSpeed), 0.18, 1.4);
  carRoot.rotation.y += steerInput * steerScale * dt * (Math.abs(vehicle.speed) / 8 + 0.2);

  // move forward in local z
  const forward = new THREE.Vector3(0, 0, 1).applyEuler(carRoot.rotation);
  carRoot.position.add(forward.multiplyScalar(vehicle.speed * dt));

  // wheel rotation visuals
  carRoot.userData.wheels.forEach(w => {
    w.mesh.rotation.x += vehicle.speed * dt * 4;
  });

  // suspension: sample wheel positions (approx)
  const wheelWorld = carRoot.userData.wheels.map(w => {
    const local = w.offset.clone();
    // world pos = rotate local by carRoot.rotation and add carRoot.position
    const world = local.clone().applyEuler(carRoot.rotation).add(carRoot.position);
    return { w, world };
  });

  // sample heights at wheel world positions
  const wheelHeights = wheelWorld.map(o => getTerrainHeightAt(o.world.x, o.world.z) + 0.34);

  // average wheel height -> chassis Y
  const avgH = wheelHeights.reduce((a, b) => a + b, 0) / wheelHeights.length;
  const desiredY = avgH + 0.15; // small clearance
  carRoot.position.y = THREE.MathUtils.lerp(carRoot.position.y ?? desiredY + 0.5, desiredY, THREE.MathUtils.clamp(dt * 6, 0, 1));

  // compute pitch and roll from wheel heights
  const frontAvg = (wheelHeights[0] + wheelHeights[1]) / 2;
  const backAvg = (wheelHeights[2] + wheelHeights[3]) / 2;
  const leftAvg = (wheelHeights[0] + wheelHeights[2]) / 2;
  const rightAvg = (wheelHeights[1] + wheelHeights[3]) / 2;

  const wheelbase = 2.4; // approximate
  const track = 1.7; // approximate

  const pitch = Math.atan2(frontAvg - backAvg, wheelbase);
  const roll = Math.atan2(rightAvg - leftAvg, track);

  carRoot.rotation.x = THREE.MathUtils.lerp(carRoot.rotation.x, pitch, THREE.MathUtils.clamp(dt * 6, 0, 1));
  carRoot.rotation.z = THREE.MathUtils.lerp(carRoot.rotation.z, -roll, THREE.MathUtils.clamp(dt * 6, 0, 1));

  // handbrake slide (visual)
  if (input.handbrake) {
    vehicle.speed *= 0.985;
  }
}

// -------------------- CAMERA --------------------
function updateCamera(dt) {
  if (!carRoot) return;
  if (cameraMode === 'third') {
    const behind = new THREE.Vector3(0, 2.2, -6.5).applyEuler(carRoot.rotation).add(carRoot.position);
    // lookahead
    const forward = new THREE.Vector3(0, 0, 1).applyEuler(carRoot.rotation).multiplyScalar(Math.min(8, Math.abs(vehicle.speed) * 0.6));
    const target = behind.add(forward);
    camera.position.lerp(target, THREE.MathUtils.clamp(dt * 4, 0, 1));
    camera.lookAt(carRoot.position.clone().add(new THREE.Vector3(0, 1.2, 1.6).applyEuler(carRoot.rotation)));
  } else {
    const cockpit = carRoot.position.clone().add(new THREE.Vector3(0, 1.0, 0.6).applyEuler(carRoot.rotation));
    camera.position.lerp(cockpit, THREE.MathUtils.clamp(dt * 8, 0, 1));
    camera.lookAt(carRoot.position.clone().add(new THREE.Vector3(0, 1.2, 10).applyEuler(carRoot.rotation)));
  }
}

// -------------------- PRESET APPLICATION --------------------
function applyPresetByName(name) {
  const preset = getPresetByName(name);
  if (!preset) {
    warn('Preset not found:', name);
    return;
  }

  // renderer scale + camera far
  renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio || 1) * (preset.renderScale || 1)));
  camera.far = preset.viewDistance || 1000;
  camera.updateProjectionMatrix();

  // call environment to rebuild ground/trees/snow based on preset
  try {
    applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' });
    log('applyMode returned for preset', name);
  } catch (err) {
    error('applyMode error', err);
  }

  // safe summary
  reportSceneSummary(scene, world, { presetName: name });

  // store applied preset
  localStorage.setItem('graphicsPreset', name);
}

// Progressive LOD sequence
function startProgressiveLOD() {
  applyPresetByName('Potato'); // cheap start
  setTimeout(() => applyPresetByName('Normal Human'), 1200);
  setTimeout(() => applyPresetByName('CPU Destroyer'), 4200);
}

// -------------------- DEBUG OVERLAY --------------------
let overlayEl;
function createOverlay() {
  overlayEl = document.createElement('div');
  overlayEl.style.position = 'fixed';
  overlayEl.style.left = '10px';
  overlayEl.style.top = '10px';
  overlayEl.style.padding = '8px 10px';
  overlayEl.style.background = 'rgba(0,0,0,0.6)';
  overlayEl.style.color = 'white';
  overlayEl.style.fontFamily = 'monospace';
  overlayEl.style.fontSize = '12px';
  overlayEl.style.zIndex = 99999;
  overlayEl.style.borderRadius = '6px';
  document.body.appendChild(overlayEl);
}
function updateOverlay() {
  const pos = carRoot ? carRoot.position : { x:0,y:0,z:0 };
  const preset = localStorage.getItem('graphicsPreset') || 'Normal Human';
  overlayEl.innerHTML =
    `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>` +
    `spd: ${vehicle.speed.toFixed(2)} m/s<br>` +
    `cam: ${cameraMode} | preset: ${preset}`;
}

// -------------------- BOOTSTRAP / MAIN LOOP --------------------
function setupAll() {
  try {
    initRendererAndScene();
  } catch (e) {
    error('initRendererAndScene failed', e);
    throw e;
  }

  // create world & env
  try {
    world = new World(scene);
  } catch (e) {
    error('World construction failed', e);
  }

  // apply base environment (safe)
  try {
    applyMode(scene, getPresetByName('Normal Human') || GraphicsPresets[2], { worldMode: 'natural' });
  } catch (e) {
    error('initial applyMode failed', e);
  }

  // car visuals
  try {
    createCarVisuals();
  } catch (e) {
    error('createCarVisuals failed', e);
  }

  // input, UI, overlay
  setupInput();
  createOverlay();
  initSettingsUI(preset => {
    if (preset && preset.name) applyPresetByName(preset.name);
  });

  // progressive LOD
  startProgressiveLOD();

  // bind resize
  window.addEventListener('resize', onResize);

  log('setupAll complete');
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function frame(now = performance.now()) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  t += dt;

  // update systems
  try { updateVehicle(dt); } catch (e) { error('updateVehicle', e); }
  try { updateCamera(dt); } catch (e) { error('updateCamera', e); }

  try { updateEnvironment(dt, t); } catch (e) { error('updateEnvironment', e); }
  try { if (world && typeof world.update === 'function') world.update(dt); } catch (e) { error('world.update', e); }

  try { renderer.render(scene, camera); } catch (e) { error('render error', e); }

  if (overlayEl) updateOverlay();

  // periodic verbose logging
  if (Math.floor(t) % 5 === 0 && Math.random() < 0.02) {
    log('tick', { t: t.toFixed(2), speed: vehicle.speed.toFixed(2) });
  }
}

// run bootstrap
document.addEventListener('DOMContentLoaded', () => {
  try {
    setupAll();
    lastTime = performance.now();
    frame();
    log('bootstrap success');
  } catch (err) {
    error('bootstrap failed', err);
  }
});

// -------------------- UTILITY: show script tags (if debugging still needed) --------------------
window._listLoadedScripts = () => [...document.querySelectorAll('script')].map(s => s.src).filter(Boolean);

log('main.js loaded');
