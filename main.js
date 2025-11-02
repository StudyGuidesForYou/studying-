// main.js (Refactored & Enhanced)

import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// Debug flags
const DEBUG = true;
const log = (...args) => { if (DEBUG) console.log('[Game]', ...args); };

let renderer, scene, camera;
let physWorld, vehicle, chassisBody, wheelBodies = [], threeCar;
let lastTime = performance.now();
let overlayEl;

// Input state
const input = { forward:false, backward:false, left:false, right:false, handbrake:false };
let cameraMode = 'third';

// Audio
let listener, engineSound, ambientSound;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await init();
    lastTime = performance.now();
    requestAnimationFrame(animate);
    log('Game initialized');
  } catch(err) {
    console.error('Initialization failed:', err);
  }
});

async function init() {
  initRenderer();
  initScene();
  initLights();
  worldVisual = new World(scene);
  initPhysics();

  // Default graphics preset
  applyPresetByName(localStorage.getItem('graphicsPreset') || 'Normal');

  buildPhysicsHeightfield();

  createCar();
  setupInput();
  initSettingsUI(p => applyPresetByName(p.name));
  createHUD();
  createAudio();

  window.addEventListener('resize', onResize);
}

// Renderer and Scene
function initRenderer() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  log('Renderer initialized');
}

function initScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 3, -8);
  window.camera = camera;
}

// Lights
function initLights() {
  // Directional sun light with shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(100, 200, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -200;
  sun.shadow.camera.right = sun.shadow.camera.top = 200;
  scene.add(sun);
  // Ambient and hemisphere light
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const hemi = new THREE.HemisphereLight(0x8a9eff, 0x4d2f00, 0.6);
  scene.add(hemi);
  log('Lights added');
}

// Physics world
function initPhysics() {
  physWorld = new CANNON.World();
  physWorld.gravity.set(0, -9.82, 0);
  physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations = 10;
  physWorld.defaultContactMaterial.friction = 0.5;
  physWorld.defaultContactMaterial.restitution = 0.0;
  // Ground plane for fallback
  const groundMat = new CANNON.Material();
  const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  physWorld.addBody(groundBody);
  window.debugPhys = physWorld;
  log('Physics initialized');
}

// Build physics heightfield from visual ground
function buildPhysicsHeightfield() {
  const mesh = scene.getObjectByName('sr_ground');
  if (!mesh || !mesh.geometry) {
    setTimeout(buildPhysicsHeightfield, 200); // wait if not ready
    return;
  }
  const pos = mesh.geometry.attributes.position;
  const segPlus = Math.sqrt(pos.count) - 1;
  if (!Number.isFinite(segPlus)) return;
  const seg = Math.round(segPlus);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const width = maxX - minX;
  const elementSize = width / seg;
  // Build height matrix
  const matrix = [];
  for (let xi = 0; xi <= seg; xi++) {
    const row = [];
    for (let zi = 0; zi <= seg; zi++) {
      const idx = zi*(seg+1) + xi;
      row.push(pos.getY(idx) || 0);
    }
    matrix.push(row);
  }
  // Remove old heightfields
  physWorld.bodies.forEach(b => {
    if (b.shapes[0] instanceof CANNON.Heightfield) {
      physWorld.removeBody(b);
    }
  });
  const hfShape = new CANNON.Heightfield(matrix, { elementSize });
  const hfBody = new CANNON.Body({ mass: 0 });
  hfBody.addShape(hfShape);
  hfBody.position.set(minX, 0, minZ);
  hfBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  physWorld.addBody(hfBody);
  log('Physics Heightfield created');
}

// Car visuals and physics
function createCar() {
  // THREE.js car group
  threeCar = new THREE.Group();
  threeCar.name = 'threeCar';
  // Chassis mesh (load a model or use a box)
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 3.0);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xff4444, metalness: 0.2, roughness: 0.4 });
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  threeCar.add(chassisMesh);
  // Wheels (cylinders)
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 20);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const wheelPositions = [
    { x: -0.85, z: -1.2 },
    { x:  0.85, z: -1.2 },
    { x: -0.85, z:  1.2 },
    { x:  0.85, z:  1.2 }
  ];
  threeCar.userData.wheels = [];
  wheelPositions.forEach(pos => {
    const pivot = new THREE.Object3D();
    pivot.position.set(pos.x, 0, pos.z);
    const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
    wheelMesh.position.y = 0.34;
    wheelMesh.castShadow = true;
    pivot.add(wheelMesh);
    threeCar.add(pivot);
    threeCar.userData.wheels.push({ pivot, mesh: wheelMesh, offset: new THREE.Vector3(pos.x, 0, pos.z) });
  });
  scene.add(threeCar);

  // Cannon-es chassis body
  chassisBody = new CANNON.Body({ mass: 150 });
  const chassisShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.225, 1.5));
  chassisBody.addShape(chassisShape);
  chassisBody.position.set(0, 2, 0);
  chassisBody.angularDamping = 0.6;
  physWorld.addBody(chassisBody);

  // RaycastVehicle setup
  vehicle = new CANNON.RaycastVehicle({
    chassisBody: chassisBody,
    indexRightAxis: 0, // x-axis
    indexUpAxis: 1,    // y-axis
    indexForwardAxis: 2 // z-axis
  });

  // Wheel options
  const wheelOptions = {
    radius: 0.34,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    suspensionStiffness: 80, // stiffer suspension
    suspensionRestLength: 0.35,
    frictionSlip: 4,
    dampingRelaxation: 2.3,
    dampingCompression: 2.4,
    maxSuspensionForce: 1e5,
    rollInfluence: 0.01,
    axleLocal: new CANNON.Vec3(-1, 0, 0),
    chassisConnectionPointLocal: new CANNON.Vec3(), 
    maxSuspensionTravel: 0.5
  };
  const wheelConnectors = [
    new CANNON.Vec3(-0.85, 0, -1.2),
    new CANNON.Vec3( 0.85, 0, -1.2),
    new CANNON.Vec3(-0.85, 0,  1.2),
    new CANNON.Vec3( 0.85, 0,  1.2)
  ];
  wheelConnectors.forEach(connector => {
    const opt = Object.assign({}, wheelOptions);
    opt.chassisConnectionPointLocal = connector;
    vehicle.addWheel(opt);
  });
  vehicle.addToWorld(physWorld);

  // Create bodies for wheels (for debugging if needed)
  vehicle.wheelInfos.forEach(() => {
    const wb = new CANNON.Body({ mass: 0 });
    wheelBodies.push(wb);
    physWorld.addBody(wb);
  });

  window.debugCar = vehicle;
  log('Car created');
}

// Input handling
function setupInput() {
  window.addEventListener('keydown', e => {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = true; break;
      case 'KeyS': case 'ArrowDown':  input.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  input.left = true; break;
      case 'KeyD': case 'ArrowRight': input.right = true; break;
      case 'Space': input.handbrake = true; break;
      case 'KeyC': cameraMode = (cameraMode === 'third' ? 'cockpit' : 'third'); break;
    }
  });
  window.addEventListener('keyup', e => {
    switch(e.code) {
      case 'KeyW': case 'ArrowUp':    input.forward = false; break;
      case 'KeyS': case 'ArrowDown':  input.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  input.left = false; break;
      case 'KeyD': case 'ArrowRight': input.right = false; break;
      case 'Space': input.handbrake = false; break;
    }
  });
}

// Settings UI and Presets
function applyPresetByName(name) {
  const preset = getPresetByName(name);
  if (!preset) { console.warn('Preset not found:', name); return; }
  renderer.setPixelRatio(Math.min(2.5, window.devicePixelRatio * (preset.renderScale || 1)));
  camera.far = preset.viewDistance;
  camera.updateProjectionMatrix();
  try {
    applyMode(scene, preset, { dayNight: 'day' });
  } catch(e) { console.error('Failed to apply mode:', e); }
  setTimeout(buildPhysicsHeightfield, 200);
  localStorage.setItem('graphicsPreset', name);
  log('Applied preset:', name);
}
function startAutoPresets() {
  applyPresetByName('Potato');
  setTimeout(() => applyPresetByName('Normal'), 1200);
  setTimeout(() => applyPresetByName('Extreme'), 3600);
}

// Audio setup (Positional 3D audio)
function createAudio() {
  listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();

  // Engine sound (looping)
  engineSound = new THREE.PositionalAudio(listener);
  audioLoader.load('audio/engine.ogg', buffer => {
    engineSound.setBuffer(buffer);
    engineSound.setLoop(true);
    engineSound.setVolume(0.6);
    engineSound.setRefDistance(5);
    engineSound.play();
  });
  // Attach to chassis mesh
  const carMesh = threeCar.children.find(c => c.isMesh);
  if (carMesh) carMesh.add(engineSound);

  // Ambient wind sound
  ambientSound = new THREE.Audio(listener);
  audioLoader.load('audio/wind.ogg', buffer => {
    ambientSound.setBuffer(buffer);
    ambientSound.setLoop(true);
    ambientSound.setVolume(0.3);
    ambientSound.play();
  });

  log('Audio initialized');
}

// HUD / Overlay (using HTML overlay for simplicity)
// We use a fixed-position div for stats (speed, camera mode, preset)
function createHUD() {
  overlayEl = document.createElement('div');
  overlayEl.style.cssText = `
    position: fixed; right: 10px; top: 10px; padding: 8px;
    background: rgba(0,0,0,0.5); color: #0f0; font-family: monospace;
    font-size: 12px; z-index: 9999; border-radius: 4px;
  `;
  document.body.appendChild(overlayEl);
}

// Graphics settings button
function setupSettingsButton() {
  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn?.addEventListener('click', () => panel.classList.toggle('hidden'));
  const select = document.getElementById('presetSelect');
  if (select) {
    getPresetNames().forEach(n => {
      const option = document.createElement('option');
      option.value = n;
      option.textContent = n;
      select.appendChild(option);
    });
    document.getElementById('applySettings').addEventListener('click', () => {
      const sel = select.value;
      if (getPresetByName(sel)) applyPresetByName(sel);
    });
  }
}

// Animation loop
function animate(now = performance.now()) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Vehicle controls
  const force = input.forward ? 2000 : (input.backward ? -500 : 0);
  const steer = input.left ? 0.5 : (input.right ? -0.5 : 0);
  if (vehicle) {
    vehicle.applyEngineForce(-force, 2);
    vehicle.applyEngineForce(-force, 3);
    vehicle.setSteeringValue(steer, 0);
    vehicle.setSteeringValue(steer, 1);
    vehicle.setBrake(input.handbrake ? 1000 : 0, 2);
    vehicle.setBrake(input.handbrake ? 1000 : 0, 3);
    // Modulate engine sound pitch by speed
    if (engineSound.isPlaying) {
      const speed = chassisBody.velocity.length();
      engineSound.playbackRate = 0.5 + Math.min(speed / 30, 1.5);
    }
  }

  // Step physics
  physWorld.step(1/60, dt, 3);

  // Sync visuals
  syncVehicleVisual();

  // Update camera
  updateCamera(dt);

  // Update environment (snow, animate ground)
  updateEnvironment(dt, (now*0.001));

  // Render scene
  renderer.render(scene, camera);

  // Update HUD info
  updateHUD();
}

// Sync Three.js car with Cannon
function syncVehicleVisual() {
  if (!threeCar || !chassisBody) return;
  threeCar.position.copy(chassisBody.position);
  threeCar.quaternion.copy(chassisBody.quaternion);
  // Update wheels
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    vehicle.updateWheelTransform(i);
    const t = vehicle.wheelInfos[i].worldTransform;
    const wheel = threeCar.userData.wheels[i];
    if (wheel) {
      wheel.pivot.position.set(t.position.x, t.position.y, t.position.z);
      wheel.pivot.quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
    }
  }
}

// Camera follow (third-person or cockpit)
function updateCamera(dt) {
  if (!chassisBody) return;
  const pos = chassisBody.position.clone();
  const quat = new THREE.Quaternion(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w);

  if (cameraMode === 'third') {
    const offset = new THREE.Vector3(0, 2.2, -6.5).applyQuaternion(quat);
    const targetPos = pos.clone().add(offset);
    camera.position.lerp(targetPos, 1 - Math.pow(0.05, dt));
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1.2, 2.0).applyQuaternion(quat)));
  } else { // cockpit
    const cockpitPos = pos.clone().add(new THREE.Vector3(0, 1.0, 0.6).applyQuaternion(quat));
    camera.position.lerp(cockpitPos, 1 - Math.pow(0.02, dt));
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 1.2, 10).applyQuaternion(quat)));
  }
}

function updateHUD() {
  if (!overlayEl || !chassisBody) return;
  const pos = chassisBody.position;
  const speed = chassisBody.velocity.length();
  const preset = localStorage.getItem('graphicsPreset') || 'Normal';
  overlayEl.innerHTML = `
    <b>Pos:</b> ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>
    <b>Speed:</b> ${speed.toFixed(1)} m/s<br>
    <b>Cam:</b> ${cameraMode} | <b>Preset:</b> ${preset}
  `;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Expose for debugging
window.game = {
  applyPresetByName,
  rebuildHeightfield: buildPhysicsHeightfield
};

log('Main script ready');
