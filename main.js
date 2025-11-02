// main.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import { applyMode, updateEnvironment, cleanup } from './environment.js';
import { getPresetByName, getPresetNames } from './graphicsPresets.js';

// renderer + scene + camera
const canvas = document.getElementById('renderCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);

// camera
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 8, 30);

// scene
const scene = new THREE.Scene();
scene.matrixAutoUpdate = true;

// lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.0);
dir.position.set(100, 200, 100); dir.castShadow = true; scene.add(dir);

// controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

// state (defaults)
let state = {
  detail: 1.0,
  viewDistance: 1800,
  renderScale: 1.0,
  nativePixel: false,
  framerateLimit: 0,
  preset: 'Smooth Gamer',
  worldMode: 'natural',
  dayNight: 'day',
  treeDensity: 1.0,
  cameraSmoothing: 0.06,
  fov: 70,
  fovEffects: true
};

// adaptive quality helpers
let lastFrameTimes = [];
const fpsWindow = 30; // sample frames
function recordFrameTime(dt) {
  lastFrameTimes.push(dt);
  if (lastFrameTimes.length > fpsWindow) lastFrameTimes.shift();
}
function getFPS() {
  if (!lastFrameTimes.length) return 60;
  const avg = lastFrameTimes.reduce((a, b) => a + b, 0) / lastFrameTimes.length;
  return 1 / Math.max(avg, 1e-6);
}

// apply settings
function applyGraphicsSettings(opts = {}) {
  Object.assign(state, opts);

  // clamp important values
  state.detail = Math.max(0.3, Math.min(4.0, state.detail));
  state.viewDistance = Math.max(300, Math.min(7000, state.viewDistance));
  state.renderScale = Math.max(0.5, Math.min(3.0, state.renderScale));

  // camera far
  camera.far = state.viewDistance; camera.updateProjectionMatrix();
  camera.fov = state.fov; camera.updateProjectionMatrix();

  // scene
  applyMode(scene, state.worldMode, { detail: state.detail, treeDensity: state.treeDensity, dayNight: state.dayNight });

  // pixel ratio / render scale: if nativePixel requested, use devicePixelRatio
  const devicePR = window.devicePixelRatio || 1;
  const targetPR = state.nativePixel ? devicePR : Math.min(devicePR * state.renderScale, 2.5);
  renderer.setPixelRatio(targetPR);
  // safety size update
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // store preset name if provided
  if (opts.preset) state.preset = opts.preset;

  // expose state for UI
  window.srState = state;
}

// save/load
function saveGraphicsSettings() {
  try {
    localStorage.setItem('sr_settings_v1', JSON.stringify(state));
  } catch (e) { console.warn('Failed to save settings', e); }
}
function loadSavedSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('sr_settings_v1'));
    if (s) Object.assign(state, s);
  } catch (e) {}
}

// quick preset loader
function loadPresetByName(name) {
  const p = getPresetByName(name);
  if (!p) return;
  applyGraphicsSettings({ detail: p.detail, viewDistance: p.viewDistance, renderScale: p.renderScale, preset: p.name });
}

// initial load
loadSavedSettings();
applyGraphicsSettings(state);

// expose API
window.sr = {
  applyGraphicsSettings,
  saveGraphicsSettings,
  loadPresetByName,
  state,
  scene,
  camera,
  renderer
};

// resize
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// animation loop with framerate cap and adaptive resolution
let last = performance.now();
let acc = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // framerate cap
  if (state.framerateLimit > 0) {
    const targetDt = 1 / state.framerateLimit;
    acc += dt;
    if (acc < targetDt) {
      requestAnimationFrame(loop);
      return;
    }
    acc = 0;
  }

  // update env & controls
  updateEnvironment(dt);
  controls.update();

  // adaptive quality: if FPS drops below threshold, lower renderScale automatically
  recordFrameTime(dt);
  const fps = getFPS();
  if (!state.nativePixel) {
    if (fps < 45 && state.renderScale > 0.75) {
      state.renderScale = Math.max(0.6, state.renderScale - 0.05);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * state.renderScale, 2.5));
    } else if (fps > 65 && state.renderScale < 1.6) {
      state.renderScale = Math.min(1.6, state.renderScale + 0.02);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * state.renderScale, 2.5));
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// small debug helpers
console.log('sr ready — api: window.sr');
