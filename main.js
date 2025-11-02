// main.js — High-fidelity physics (cannon-es) + improved graphics
// Replace your existing main.js entirely with this file.

// ------------------ Imports ------------------
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// Cannon-es (physics) — module from CDN
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// ------------------ Debug helpers ------------------
const DEBUG = true;
const log = (...a) => { if (DEBUG) console.log('[UR]', ...a); };
const warn = (...a) => { if (DEBUG) console.warn('[UR]', ...a); };
const error = (...a) => { if (DEBUG) console.error('[UR]', ...a); };

window.addEventListener('error', e => error('window.error', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => error('unhandledrejection', e.reason));

// ------------------ Global state ------------------
let renderer, scene, camera;
let composer = null;
let worldVisual = null; // World object (visual)
let physWorld = null;   // Cannon world
let vehicle = null;     // Cannon RaycastVehicle
let chassisBody = null;
let wheelBodies = [];
let threeCar = null;    // Three.Group for car visuals
let lastTime = performance.now();
let t = 0;
let overlayEl = null;
let cameraMode = 'third'; // 'third' | 'cockpit'

// Inputs
const input = { forward:false, backward:false, left:false, right:false, handbrake:false };

// Expose few things for debug console
window.__UR_DEBUG__ = { physWorld: null, chassisBody: null, vehicle: null, scene: null };

// ------------------ Initialization ------------------
document.addEventListener('DOMContentLoaded', () => {
  (async () => {
    try {
      await initAll();
      lastTime = performance.now();
      requestAnimationFrame(loop);
      log('bootstrap finished');
    } catch (err) {
      error('initAll failed', err);
    }
  })();
});

async function initAll() {
  log('initAll start');

  initRenderer();
  initScene();
  initLights();

  // Visual world
  worldVisual = new World(scene);

  // Build physics world
  initPhysics();

  // Build environment visuals + heightfield (initial preset)
  applyMode(scene, getPresetByName('Normal Human') || GraphicsPresets[2]);
  // Now build physics heightfield from environment (async-safe)
  buildPhysicsHeightfieldFromVisualGround();

  // Car visuals and physics vehicle
  createCarVisualAndVehicle();

  // Input, UI, overlay
  setupInput();
  initSettingsUI(p => applyPresetByName(p.name));
  createOverlay();

  // Progressive LOD
  startProgressiveLOD();

  // expose for debug
  window.__UR_DEBUG__.physWorld = physWorld;
  window.__UR_DEBUG__.scene = scene;

  window.addEventListener('resize', onResize, { passive: true });

  log('initAll complete');
}

// ------------------ Renderer/Scene ------------------
function initRenderer() {
  const canvas = document.getElementById('gameCanvas') || document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; // new API
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // attach to document if not provided
  if (!document.getElementById('gameCanvas')) {
    renderer.domElement.id = 'gameCanvas';
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    document.body.appendChild(renderer.domElement);
  }
  log('renderer initialized');
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 4, -8);
  window.camera = camera;
}

// improved lighting: sun + fill + sky ambient via PMREM
function initLights() {
  // directional sun
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 200, 50);
  sun.castShadow = true;
  sun.shadow.camera.left = -500;
  sun.shadow.camera.right = 500;
  sun.shadow.camera.top = 500;
  sun.shadow.camera.bottom = -500;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  // ambient fill
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));

  // subtle hemisphere
  const hemi = new THREE.HemisphereLight(0xaaaaff, 0x444433, 0.2);
  scene.add(hemi);

  log('lights added');
}

// ------------------ Physics (cannon-es) ------------------
function initPhysics() {
  physWorld = new CANNON.World();
  physWorld.gravity.set(0, -9.82, 0);
  physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations = 10;
  physWorld.defaultContactMaterial.friction = 0.6;
  physWorld.defaultContactMaterial.restitution = 0.0;

  // ground plane fallback
  const groundMat = new CANNON.Material('groundMat');
  const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
  groundBody.addShape(new CANNON.Plane());
  groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  physWorld.addBody(groundBody);

  window.__UR_DEBUG__.physWorld = physWorld;
  log('physics world initialised');
}

// Build a cannon heightfield from the visual ground mesh
function buildPhysicsHeightfieldFromVisualGround() {
  try {
    const g = scene.getObjectByName('sr_ground');
    if (!g) {
      warn('No sr_ground found yet — trying again after small delay');
      setTimeout(buildPhysicsHeightfieldFromVisualGround, 500);
      return;
    }

    // sample ground geometry to a grid (reasonable resolution)
    const pos = g.geometry.attributes.position;
    const segX = Math.sqrt(pos.count) - 1;
    const segZ = segX;
    const sizeX = segX + 1;
    const sizeZ = segZ + 1;

    // compute bounds and grid step from geometry extents
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), z = pos.getZ(i);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const dx = width / segX;
    const dz = depth / segZ;

    // fill height rows (as cannon expects a matrix: rows along X)
    const matrix = [];
    for (let xi=0; xi<=segX; xi++){
      const row = [];
      for (let zi=0; zi<=segZ; zi++){
        // find index -> approximate
        const idx = zi*(segX+1) + xi;
        const y = pos.getY(idx) ?? 0;
        row.push(y);
      }
      matrix.push(row);
    }

    // create heightfield shape
    const hfShape = new CANNON.Heightfield(matrix, { elementSize: dx });
    const hfBody = new CANNON.Body({ mass: 0 });
    hfBody.addShape(hfShape);
    hfBody.position.set(minX, 0, minZ);
    hfBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
    physWorld.addBody(hfBody);

    log('physics heightfield created', { rows: matrix.length, cols: matrix[0].length, dx });
  } catch (e) {
    error('buildPhysicsHeightfieldFromVisualGround failed', e);
  }
}

// ------------------ Vehicle creation (raycast vehicle) ------------------
function createCarVisualAndVehicle() {
  // Create three.js visual car (chassis + wheels)
  threeCar = new THREE.Group();
  threeCar.name = 'threeCar';

  const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 3.0);
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xff3333, metalness:0.3, roughness:0.5 });
  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  chassisMesh.position.set(0, 0.5, 0);
  threeCar.add(chassisMesh);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.2, 20);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheelOffsets = [
    { name:'fl', x:-0.85, z:-1.2 },
    { name:'fr', x:0.85, z:-1.2 },
    { name:'bl', x:-0.85, z:1.2 },
    { name:'br', x:0.85, z:1.2 }
  ];

  threeCar.userData.wheels = [];
  for (const w of wheelOffsets) {
    const piv = new THREE.Object3D();
    piv.position.set(w.x, 0, w.z);
    const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
    wheelMesh.position.y = 0.34;
    wheelMesh.castShadow = true;
    piv.add(wheelMesh);
    threeCar.add(piv);
    threeCar.userData.wheels.push({ pivot: piv, mesh: wheelMesh, offset: new THREE.Vector3(w.x,0,w.z) });
  }

  scene.add(threeCar);

  // --- Cannon bodies
  // chassis body
  const chassisShape = new CANNON.Box(new CANNON.Vec3(0.8, 0.225, 1.5));
  chassisBody = new CANNON.Body({ mass: 150 });
  chassisBody.addShape(chassisShape);
  chassisBody.position.set(0, 2, 0);
  chassisBody.angularDamping = 0.5;
  physWorld.addBody(chassisBody);

  // vehicle options
  const options = {
    chassisBody: chassisBody,
    indexRightAxis: 0, // x
    indexUpAxis: 1, // y
    indexForwardAxis: 2 // z
  };

  // create RaycastVehicle
  vehicle = new CANNON.RaycastVehicle({
    chassisBody: chassisBody,
    indexRightAxis: 0,
    indexUpAxis: 1,
    indexForwardAxis: 2
  });

  // wheel options
  const wheelOptions = {
    radius: 0.34,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    suspensionStiffness: 50,
    suspensionRestLength: 0.25,
    frictionSlip: 4.5,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence: 0.01,
    axleLocal: new CANNON.Vec3(-1, 0, 0),
    chassisConnectionPointLocal: new CANNON.Vec3(), // filled per-wheel
    maxSuspensionTravel: 0.3
  };

  const wheelConnectors = [
    new CANNON.Vec3(-0.85, 0.0, -1.2), // fl
    new CANNON.Vec3(0.85, 0.0, -1.2),  // fr
    new CANNON.Vec3(-0.85, 0.0, 1.2),  // bl
    new CANNON.Vec3(0.85, 0.0, 1.2)    // br
  ];

  for (let i = 0; i < wheelConnectors.length; i++) {
    const opt = Object.assign({}, wheelOptions);
    opt.chassisConnectionPointLocal = wheelConnectors[i];
    vehicle.addWheel(opt);
  }

  vehicle.addToWorld(physWorld);

  // create wheel bodies for visual raycast hits (not full rigid wheels)
  wheelBodies = [];
  for (let i=0;i<vehicle.wheelInfos.length;i++){
    const sphere = new CANNON.Body({ mass: 1, collisionFilterGroup: 0, collisionFilterMask: 0 }); // ghost
    wheelBodies.push(sphere);
    physWorld.addBody(sphere);
  }

  // store global refs
  window.__UR_DEBUG__.vehicle = vehicle;
  window.__UR_DEBUG__.chassisBody = chassisBody;

  log('vehicle created (cannon raycast vehicle + visuals)');
}

// ------------------ Controls ------------------
function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (['KeyW','ArrowUp'].includes(e.code)) input.forward = true;
    if (['KeyS','ArrowDown'].includes(e.code)) input.backward = true;
    if (['KeyA','ArrowLeft'].includes(e.code)) input.left = true;
    if (['KeyD','ArrowRight'].includes(e.code)) input.right = true;
    if (e.code === 'Space') input.handbrake = true;
    if (e.code === 'KeyC') cameraMode = (cameraMode === 'third' ? 'cockpit' : 'third');
  });
  window.addEventListener('keyup', (e) => {
    if (['KeyW','ArrowUp'].includes(e.code)) input.forward = false;
    if (['KeyS','ArrowDown'].includes(e.code)) input.backward = false;
    if (['KeyA','ArrowLeft'].includes(e.code)) input.left = false;
    if (['KeyD','ArrowRight'].includes(e.code)) input.right = false;
    if (e.code === 'Space') input.handbrake = false;
  });
  log('input handlers installed');
}

// ------------------ Vehicle control params ------------------
const driver = {
  maxEngineForce: 4500,
  maxBreakingForce: 200,
  maxSteerVal: 0.5
};

// ------------------ Apply preset & LOD ------------------
function applyPresetByName(name) {
  const preset = getPresetByName(name);
  if (!preset) {
    warn('Preset not found:', name);
    return;
  }

  renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio||1) * (preset.renderScale || 1)));
  camera.far = preset.viewDistance || 1000;
  camera.updateProjectionMatrix();

  try {
    applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' });
  } catch (e) {
    error('applyMode failed', e);
  }

  // Rebuild heightfield physics to match new ground
  setTimeout(() => {
    buildPhysicsHeightfieldFromVisualGround();
  }, 300);

  reportSceneSummary(scene, worldVisual, { presetName: name });

  localStorage.setItem('graphicsPreset', name);
}

// progressive LOD
function startProgressiveLOD() {
  applyPresetByName('Potato');
  setTimeout(() => applyPresetByName('Normal Human'), 1200);
  setTimeout(() => applyPresetByName('CPU Destroyer'), 4200);
}

// ------------------ Overlay ------------------
function createOverlay() {
  overlayEl = document.createElement('div');
  overlayEl.style.cssText = 'position:fixed;left:10px;top:10px;padding:8px 10px;background:rgba(0,0,0,0.6);color:white;font:12px monospace;z-index:99999;border-radius:6px';
  document.body.appendChild(overlayEl);
}
function updateOverlay() {
  if (!overlayEl) return;
  const pos = chassisBody ? chassisBody.position : { x:0,y:0,z:0 };
  overlayEl.innerHTML = `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>` +
                        `spd: ${chassisBody ? chassisBody.velocity.length().toFixed(2) : '0'} m/s<br>` +
                        `cam: ${cameraMode}<br>` +
                        `preset: ${localStorage.getItem('graphicsPreset') || 'Normal Human'}`;
}

// ------------------ Synchronize visuals with physics ------------------
function syncVisualsFromPhysics() {
  if (!chassisBody || !threeCar && !threeCar) {
    // prefer threeCar if exists; fallback to threeCar created in createCarVisualAndVehicle
  }
  // sync chassis
  const threeChassis = scene.getObjectByName('threeCar') || scene.getObjectByName('carRoot') || null;
  if (threeChassis && chassisBody) {
    threeChassis.position.copy(chassisBody.position);
    threeChassis.quaternion.copy(chassisBody.quaternion);
  } else {
    // fallback: if threeCar exists, move it via chassisBody
    if (typeof threeCar !== 'undefined' && threeCar) {
      threeCar.position.copy(chassisBody.position);
      threeCar.quaternion.copy(chassisBody.quaternion);
    }
  }

  // wheels: get world transform for each wheel from vehicle
  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
    const wi = vehicle.wheelInfos[i];
    vehicle.updateWheelTransform(i);
    const t = wi.worldTransform;
    // update visual wheel pivot if exists
    const threeW = scene.getObjectByName('threeCar')?.userData?.wheels?.[i] ?? null;
    // generic attempt: find any wheel pivot in threeCar.userData
    const visWheels = scene.getObjectByName('threeCar')?.userData?.wheels || scene.getObjectByName('carRoot')?.userData?.wheels || null;
    if (visWheels && visWheels[i]) {
      visWheels[i].pivot.position.set(t.position.x, t.position.y, t.position.z);
      visWheels[i].pivot.quaternion.set(t.quaternion.x, t.quaternion.y, t.quaternion.z, t.quaternion.w);
      // rotate wheel mesh a bit to simulate rolling based on wheel angular velocity
      if (visWheels[i].mesh) {
        visWheels[i].mesh.rotation.x += wi.deltaRotation || 0;
      }
    }
  }
}

// ------------------ Loop ------------------
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 1/60);
  lastTime = now;
  t += dt;

  // physics driver inputs -> apply on vehicle
  try {
    // engine & braking
    let engineForce = 0;
    let brakingForce = 0;
    if (input.forward) engineForce = driver.maxEngineForce;
    if (input.backward) brakingForce = driver.maxBreakingForce;
    // steering
    let steer = 0;
    if (input.left) steer = driver.maxSteerVal;
    if (input.right) steer = -driver.maxSteerVal;

    // apply to wheels: wheel 0 & 1 are front, 2 & 3 are back
    vehicle.setSteeringValue(steer, 0);
    vehicle.setSteeringValue(steer, 1);

    // engine on rear wheels for our setup
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);

    // braking
    vehicle.setBrake(brakingForce, 0);
    vehicle.setBrake(brakingForce, 1);
    vehicle.setBrake(brakingForce, 2);
    vehicle.setBrake(brakingForce, 3);

    // handbrake reduces friction slip -> emulate by lowering frictionSlip
    for (let i=0;i<vehicle.wheelInfos.length;i++){
      const wi = vehicle.wheelInfos[i];
      wi.frictionSlip = input.handbrake ? 0.6 : 4.5;
    }
  } catch (e) {
    warn('vehicle control warning', e);
  }

  // step physics (fixed step)
  try {
    physWorld.step(1/60, dt, 3);
  } catch (e) {
    error('physWorld.step failed', e);
  }

  // sync visuals
  try {
    syncVisualsFromPhysics();
  } catch (e) {
    error('syncVisualsFromPhysics failed', e);
  }

  // camera update
  try {
    if (chassisBody) {
      updateCameraFromChassis(dt);
    }
  } catch (e) {
    error('updateCamera failed', e);
  }

  // environment time-based updates
  try { updateEnvironment(dt, t); } catch (e) { error('updateEnvironment', e); }

  // render
  try { renderer.render(scene, camera); } catch (e) { error('render failed', e); }

  // overlay
  try { updateOverlay(); } catch (e) { /* ignore */ }

  // occasional logging
  if (Math.floor(t) % 5 === 0 && Math.random() < 0.02) {
    log('tick', { t: t.toFixed(2) });
  }
}

// ------------------ Camera follow for physics chassis ------------------
function updateCameraFromChassis(dt) {
  if (!chassisBody) return;
  // position behind chassis
  const chassisPos = new THREE.Vector3(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
  const chassisQuat = new THREE.Quaternion(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w);

  // compute behind offset in world
  const behindLocal = new THREE.Vector3(0, 2.2, -6.5).applyQuaternion(chassisQuat);
  const desiredPos = chassisPos.clone().add(behindLocal);

  // lookahead based on linear velocity
  const vel = new THREE.Vector3(chassisBody.velocity.x, chassisBody.velocity.y, chassisBody.velocity.z);
  const forward = new THREE.Vector3(0,0,1).applyQuaternion(chassisQuat);
  const lookAhead = forward.clone().multiplyScalar(Math.min(8, vel.length() * 0.5));
  desiredPos.add(lookAhead);

  camera.position.lerp(desiredPos, THREE.MathUtils.clamp(dt * 6, 0, 1));
  camera.lookAt(chassisPos.clone().add(new THREE.Vector3(0, 1.4, 1.6).applyQuaternion(chassisQuat)));
}

// ------------------ Utilities and debug ------------------
function reportSceneSummary(sceneObj, worldObj, opts = {}) {
  try {
    console.group('[DEBUG] Scene Summary');
    if (renderer) {
      const pr = renderer.getPixelRatio();
      const size = renderer.getSize(new THREE.Vector2());
      console.log('Renderer pixelRatio:', pr, 'size:', size);
    } else console.log('Renderer missing');
    if (camera) console.log('Camera pos:', camera.position.clone(), 'far:', camera.far);
    if (sceneObj) {
      const counts = { meshes:0, points:0, instanced:0, lights:0, others:0};
      sceneObj.traverse(o => { if (o.isMesh) counts.meshes++; else if (o.isPoints) counts.points++; else if (o.isInstancedMesh) counts.instanced++; else if (o.isLight) counts.lights++; else counts.others++; });
      console.log('Scene counts:', counts, 'top:', sceneObj.children.map(c => c.name || c.type));
    }
    if (worldObj) console.log('World summary', { hasRoad: !!worldObj.road, opts: worldObj.opts || null });
    console.log('Applied preset:', opts.presetName || localStorage.getItem('graphicsPreset') || 'unknown');
    console.groupEnd();
  } catch (e) { error('reportSceneSummary failed', e); }
}

// ------------------ Build / Start helpers ------------------
function startProgressiveLOD() {
  startProgressiveLOD = null; // noop if called again
  startProgressive();
}
function startProgressive() {
  applyPresetByName('Potato');
  setTimeout(()=>applyPresetByName('Normal Human'), 1200);
  setTimeout(()=>applyPresetByName('CPU Destroyer'), 4200);
}

// Build physics heightfield (public wrapper)
function rebuildHeightfield() {
  buildPhysicsHeightfieldFromVisualGround();
}

// ------------------ Final wiring (call once after modules available) ------------------
function bootstrapFinish() {
  // create overlay
  createOverlay();

  // create car visual and vehicle
  createCarVisualAndVehicle();

  // setup input
  setupInput();

  // settings UI hook uses applyPresetByName
  initSettingsUI(p => applyPresetByName(p.name));

  // expose some things
  window.__UR_DEBUG__.applyPresetByName = applyPresetByName;
  window.__UR_DEBUG__.rebuildHeightfield = rebuildHeightfield;
}

// We started initAll which already called createCarVisualAndVehicle etc. ensure overlay exists:
createOverlay();

// ------------------ END OF FILE ------------------
log('main.js loaded - heavy physics build ready');
