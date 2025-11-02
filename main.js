// main.js — Slow Roads style: relaxed driving + smooth suspension + improved graphics
// Full drop-in replacement for your repo's main.js

import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// --------------------------------------------------
// SlowRoads-style config: smooth, floaty, infinite-ish
// --------------------------------------------------
const DEBUG = true;
const log = (...a) => { if (DEBUG) console.log('[UR]', ...a); };
const warn = (...a) => { if (DEBUG) console.warn('[UR]', ...a); };
const error = (...a) => { if (DEBUG) console.error('[UR]', ...a); };

// Global state
let renderer, scene, camera;
let worldVisual = null;     // World (visual)
let physWorld = null;       // CANNON world
let vehicle = null;         // RaycastVehicle
let chassisBody = null;
let threeCar = null;        // three.js visuals group (car)
let wheelBodies = [];       // ghost bodies (used as placeholders for wheel hits)
let lastTime = performance.now();
let t = 0;
let overlayEl = null;
let cameraMode = 'third';   // 'third' | 'cockpit'

const input = { forward:false, backward:false, left:false, right:false, handbrake:false };

window.__UR_DEBUG__ = {};

// ---------- Entry ----------
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await bootstrap();
    lastTime = performance.now();
    requestAnimationFrame(loop);
    log('app started');
  } catch (e) {
    error('bootstrap failed', e);
  }
});

// ---------- Bootstrap ----------
async function bootstrap() {
  initRenderer();
  initScene();
  initLights();

  worldVisual = new World(scene);

  initPhysics();

  // default preset
  applyMode(scene, getPresetByName('Normal Human') || GraphicsPresets[2]);
  buildPhysicsHeightfieldFromVisualGround();

  createCarVisualAndVehicle();

  setupInput();
  initSettingsUI(p => applyPresetByName(p.name));
  createOverlay();
  setupUI();

  startProgressiveLoad();

  window.__UR_DEBUG__.physWorld = physWorld;
  window.__UR_DEBUG__.scene = scene;
  window.addEventListener('resize', onResize);
}

// ---------- Renderer & Scene ----------
function initRenderer(){
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  try { renderer.outputColorSpace = THREE.SRGBColorSpace; } catch(e) {} // older three poly
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  log('renderer ready');
}

function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 2000);
  camera.position.set(0, 3.8, -8);
  window.camera = camera;
}

function initLights(){
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(50, 180, 50);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x88aaff, 0x443322, 0.25);
  scene.add(hemi);
  log('lights added');
}

// ---------- Physics (Cannon-es) ----------
function initPhysics(){
  physWorld = new CANNON.World();
  physWorld.gravity.set(0, -9.82, 0);
  physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations = 10;
  physWorld.defaultContactMaterial.friction = 0.6;
  physWorld.defaultContactMaterial.restitution = 0;

  // fallback ground plane (in case heightfield not ready)
  const groundMat = new CANNON.Material('ground');
  const body = new CANNON.Body({ mass: 0, material: groundMat });
  body.addShape(new CANNON.Plane());
  body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
  physWorld.addBody(body);

  window.__UR_DEBUG__.physWorld = physWorld;
  log('physics ready');
}

// Build heightfield from visual ground (best-effort)
function buildPhysicsHeightfieldFromVisualGround(){
  try {
    const g = scene.getObjectByName('sr_ground');
    if(!g || !g.geometry) return setTimeout(buildPhysicsHeightfieldFromVisualGround, 300);

    const pos = g.geometry.attributes.position;
    const total = pos.count;
    const seg = Math.sqrt(total) - 1;
    if (!isFinite(seg)) return;
    const segX = Math.round(seg);

    // bounds
    let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); minX=Math.min(minX,x); maxX=Math.max(maxX,x); minZ=Math.min(minZ,z); maxZ=Math.max(maxZ,z);}
    const width = maxX-minX;
    const dx = width/segX || 1;

    // matrix rows along X
    const matrix = [];
    for(let xi=0; xi<=segX; xi++){
      const row = [];
      for(let zi=0; zi<=segX; zi++){
        const idx = zi*(segX+1)+xi;
        const y = pos.getY(idx) ?? 0;
        row.push(y);
      }
      matrix.push(row);
    }

    const hfShape = new CANNON.Heightfield(matrix, { elementSize: dx });
    const hfBody = new CANNON.Body({ mass: 0 });
    hfBody.addShape(hfShape);
    hfBody.position.set(minX, 0, minZ);
    hfBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
    // remove previous heightfields (if any)
    physWorld.bodies.filter(b=>b && b.shapes && b.shapes[0] instanceof CANNON.Heightfield).forEach(b=>physWorld.removeBody(b));
    physWorld.addBody(hfBody);
    log('heightfield created', {rows: matrix.length, dx});

  } catch(e){ error('buildHF failed', e); }
}

// ---------- Car visuals + physics vehicle (SlowRoads tune) ----------
function createCarVisualAndVehicle(){
  // three.js visual
  threeCar = new THREE.Group();
  threeCar.name = 'threeCar';
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.45,3.0), new THREE.MeshStandardMaterial({color:0xff4444, metalness:0.2, roughness:0.5}));
  chassis.position.set(0,0.5,0);
  chassis.castShadow = true;
  threeCar.add(chassis);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34,0.34,0.22,20);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshStandardMaterial({color:0x111111, roughness:0.9});
  const wheelOffsets = [{x:-0.85,z:-1.2},{x:0.85,z:-1.2},{x:-0.85,z:1.2},{x:0.85,z:1.2}];
  threeCar.userData.wheels = [];
  for(const w of wheelOffsets){
    const pivot = new THREE.Object3D(); pivot.position.set(w.x,0,w.z);
    const mesh = new THREE.Mesh(wheelGeo, wheelMat); mesh.position.y = 0.34; mesh.castShadow=true;
    pivot.add(mesh); threeCar.add(pivot);
    threeCar.userData.wheels.push({pivot, mesh, offset: new THREE.Vector3(w.x,0,w.z)});
  }
  scene.add(threeCar);

  // cannon chassis body
  const chassisShape = new CANNON.Box(new CANNON.Vec3(0.8,0.225,1.5));
  chassisBody = new CANNON.Body({ mass: 140 });
  chassisBody.addShape(chassisShape);
  chassisBody.position.set(0,2,0);
  chassisBody.angularDamping = 0.6; // SlowRoads floaty
  physWorld.addBody(chassisBody);

  // raycast vehicle
  vehicle = new CANNON.RaycastVehicle({ chassisBody, indexRightAxis:0, indexUpAxis:1, indexForwardAxis:2 });

  const wheelOptions = {
    radius: 0.34,
    directionLocal: new CANNON.Vec3(0,-1,0),
    suspensionStiffness: 30,   // softer for floaty
    suspensionRestLength: 0.35,
    frictionSlip: 4.2,
    dampingRelaxation: 2.3,
    dampingCompression: 2.4,
    maxSuspensionForce: 1e5,
    rollInfluence: 0.01,
    axleLocal: new CANNON.Vec3(-1,0,0),
    chassisConnectionPointLocal: new CANNON.Vec3(),
    maxSuspensionTravel: 0.45
  };

  const wheelConnectors = [
    new CANNON.Vec3(-0.85,0,-1.2),
    new CANNON.Vec3(0.85,0,-1.2),
    new CANNON.Vec3(-0.85,0,1.2),
    new CANNON.Vec3(0.85,0,1.2)
  ];

  for(let i=0;i<wheelConnectors.length;i++){ const opt = Object.assign({}, wheelOptions); opt.chassisConnectionPointLocal = wheelConnectors[i]; vehicle.addWheel(opt);}  
  vehicle.addToWorld(physWorld);

  // ghost wheel bodies for rayhits (if needed)
  wheelBodies = [];
  for(let i=0;i<vehicle.wheelInfos.length;i++){ const wb = new CANNON.Body({ mass:0 }); wheelBodies.push(wb); physWorld.addBody(wb); }

  window.__UR_DEBUG__.vehicle = vehicle; window.__UR_DEBUG__.chassisBody = chassisBody;
  log('vehicle ready (SlowRoads-tuned)');
}

// ---------- Input ----------
function setupInput(){
  window.addEventListener('keydown', e => {
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward = true;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward = true;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left = true;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right = true;
    if(e.code === 'Space') input.handbrake = true;
    if(e.code === 'KeyC') cameraMode = (cameraMode === 'third' ? 'cockpit' : 'third');
  });
  window.addEventListener('keyup', e => {
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward = false;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward = false;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left = false;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right = false;
    if(e.code === 'Space') input.handbrake = false;
  });
  log('input ready');
}

// ---------- Car driver params (SlowRoads feel) ----------
const driver = { maxEngineForce: 2200, maxBreakingForce: 1200, maxSteerVal: 0.55 };

// ---------- Apply presets and progressive load ----------
function applyPresetByName(name){
  const preset = getPresetByName(name);
  if(!preset){ warn('preset not found', name); return; }
  renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio||1) * (preset.renderScale||1)));
  camera.far = preset.viewDistance || 1000; camera.updateProjectionMatrix();
  try { applyMode(scene, preset, { worldMode: preset.worldMode ?? 'natural' }); } catch(e){ error(e); }
  setTimeout(buildPhysicsHeightfieldFromVisualGround, 300);
  reportSceneSummary(scene, worldVisual, { presetName: name });
  localStorage.setItem('graphicsPreset', name);
}

function startProgressiveLoad(){
  applyPresetByName('Potato');
  setTimeout(()=>applyPresetByName('Normal Human'), 1400);
  setTimeout(()=>applyPresetByName('CPU Destroyer'), 4800);
}

// ---------- Overlay & UI ----------
function createOverlay(){ overlayEl = document.createElement('div'); overlayEl.style.cssText = 'position:fixed;left:10px;top:10px;padding:8px 10px;background:rgba(0,0,0,0.6);color:white;font:12px monospace;z-index:99999;border-radius:6px'; document.body.appendChild(overlayEl); }
function updateOverlay(){ if(!overlayEl) return; const pos = chassisBody ? chassisBody.position : {x:0,y:0,z:0}; overlayEl.innerHTML = `pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>spd: ${chassisBody?chassisBody.velocity.length().toFixed(2):'0'} m/s<br>cam: ${cameraMode}<br>preset: ${localStorage.getItem('graphicsPreset')||'Normal Human'}`; }

function setupUI(){ const btn = document.getElementById('graphicsBtn'); const panel = document.getElementById('graphicsPanel'); btn?.addEventListener('click', ()=>panel.classList.toggle('hidden')); const sel = document.getElementById('presetSelect'); if(sel){ getPresetNames().forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); }); document.getElementById('applySettings')?.addEventListener('click', ()=>{ const p=getPresetByName(sel.value); if(p) applyPresetByName(p.name); }); } }

// ---------- Visual sync ----------
function syncVisualsFromPhysics(){
  // chassis
  const threeChassis = scene.getObjectByName('threeCar');
  if(threeChassis && chassisBody){ threeChassis.position.copy(chassisBody.position); threeChassis.quaternion.copy(chassisBody.quaternion); }

  // wheels
  for(let i=0;i<vehicle.wheelInfos.length;i++){
    vehicle.updateWheelTransform(i);
    const wt = vehicle.wheelInfos[i].worldTransform;
    const visWheel = threeChassis?.userData?.wheels?.[i];
    if(visWheel){ visWheel.pivot.position.set(wt.position.x, wt.position.y, wt.position.z); visWheel.pivot.quaternion.set(wt.quaternion.x, wt.quaternion.y, wt.quaternion.z, wt.quaternion.w); }
  }
}

// ---------- Camera ----------
function updateCamera(dt){
  if(!chassisBody) return;
  const pos = new THREE.Vector3(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z);
  const quat = new THREE.Quaternion(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w);
  if(cameraMode==='third'){
    const behind = new THREE.Vector3(0,2.2,-6.5).applyQuaternion(quat).add(pos);
    const forward = new THREE.Vector3(0,0,1).applyQuaternion(quat).multiplyScalar(Math.min(8, chassisBody.velocity.length()*0.5));
    const target = behind.add(forward);
    camera.position.lerp(target, Math.min(1, dt*4));
    camera.lookAt(pos.clone().add(new THREE.Vector3(0,1.2,1.6).applyQuaternion(quat)));
  } else {
    const cockpit = pos.clone().add(new THREE.Vector3(0,1.0,0.6).applyQuaternion(quat));
    camera.position.lerp(cockpit, Math.min(1, dt*8));
    camera.lookAt(pos.clone().add(new THREE.Vector3(0,1.2,10).applyQuaternion(quat)));
  }
}

// ---------- Loop ----------
function loop(now = performance.now()){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now; t += dt;

  // controls -> vehicle
  try {
    const engine = input.forward ? driver.maxEngineForce : 0;
    const brake = input.backward ? driver.maxBreakingForce : 0;
    let steer = 0; if(input.left) steer = driver.maxSteerVal; if(input.right) steer = -driver.maxSteerVal;
    if(vehicle){ vehicle.setSteeringValue(steer, 0); vehicle.setSteeringValue(steer, 1); vehicle.applyEngineForce(engine, 2); vehicle.applyEngineForce(engine, 3); vehicle.setBrake(brake,0); vehicle.setBrake(brake,1); vehicle.setBrake(brake,2); vehicle.setBrake(brake,3); for(let i=0;i<vehicle.wheelInfos.length;i++){ vehicle.wheelInfos[i].frictionSlip = input.handbrake ? 0.8 : 4.2; } }
  } catch(e){ warn('vehicle control', e); }

  // physics step
  try { physWorld.step(1/60, dt, 3); } catch(e){ error('phys step', e); }

  // sync visuals
  try { syncVisualsFromPhysics(); } catch(e){ error('sync visuals', e); }

  // camera
  try { updateCamera(dt); } catch(e){ error('camera', e); }

  // world updates
  try { updateEnvironment(dt, t); } catch(e){ error('env', e); }

  // render
  try { renderer.render(scene, camera); } catch(e){ error('render', e); }

  // overlay
  try { updateOverlay(); } catch(e){}
}

// ---------- Utilities & debug ----------
function reportSceneSummary(sceneObj, worldObj, opts={}){
  try{
    console.group('[DEBUG] Scene Summary');
    if(renderer){ const pr = renderer.getPixelRatio(); const size = renderer.getSize(new THREE.Vector2()); console.log('Renderer pixelRatio:', pr, 'size:', size); } else console.log('no renderer');
    if(camera) console.log('Camera', camera.position.clone(), 'far', camera.far);
    if(sceneObj){ const counts = {meshes:0,points:0,instanced:0,lights:0,others:0}; sceneObj.traverse(o=>{ if(o.isMesh) counts.meshes++; else if(o.isPoints) counts.points++; else if(o.isInstancedMesh) counts.instanced++; else if(o.isLight) counts.lights++; else counts.others++; }); console.log('Scene counts', counts); console.log('Top level', sceneObj.children.map(c=>c.name||c.type)); }
    if(worldObj) console.log('World summary', {hasRoad:!!worldObj.road, opts: worldObj.opts||null});
    console.log('Preset', opts.presetName||localStorage.getItem('graphicsPreset')||'unknown');
    console.groupEnd();
  } catch(e){ error('report failed', e); }
}

function onResize(){ if(!camera||!renderer) return; camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

function rebuildHeightfield(){ buildPhysicsHeightfieldFromVisualGround(); }

// ---------- Expose helpful globals ----------
window.__UR_DEBUG__.applyPresetByName = applyPresetByName;
window.__UR_DEBUG__.rebuildHeightfield = rebuildHeightfield;

log('main.js (SlowRoads-mode) ready');
