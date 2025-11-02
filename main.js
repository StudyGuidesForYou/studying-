// main.js — Ultra-realistic SlowRoads singleplayer
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/postprocessing/UnrealBloomPass.js';

import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import { World as VisualWorld } from './world.js';
import { applyMode, updateEnvironment, sampleHeightAtXY, ensureMaterials, loadModels } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// --------------------
// Global
// --------------------
let renderer, scene, camera, composer;
let physWorld, vehicle, chassisBody, wheelBodies = [];
let threeCar = null, worldVisual = null;
let lastTime = performance.now(), t = 0;
let overlayEl = null;
let cameraMode = 'third';
const input = { forward:false, backward:false, left:false, right:false, handbrake:false };

// --------------------
// Entry
// --------------------
document.addEventListener('DOMContentLoaded', async () => {
  await bootstrap();
  lastTime = performance.now();
  requestAnimationFrame(loop);
  console.log('[MAIN] Game started');
});

// --------------------
// Bootstrap
// --------------------
async function bootstrap(){
  initRenderer();
  initScene();
  initLights();
  await ensureMaterials();
  await loadModels();

  worldVisual = new VisualWorld(scene);

  initPhysics();
  buildPhysicsHeightfieldFromVisualGround();

  createCar();
  setupInput();
  initSettingsUI(p => applyPresetByName(p.name));
  createOverlay();
  setupUI();
  setupPostProcessing();

  startProgressiveLoad();
  window.addEventListener('resize', onResize);
}

// --------------------
// Renderer / Scene
// --------------------
function initRenderer(){
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2.5, window.devicePixelRatio||1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

function initScene(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 3000);
  camera.position.set(0,3.8,-8);
}

// --------------------
// Lighting
// --------------------
function initLights(){
  const sun = new THREE.DirectionalLight(0xffffff,1.2);
  sun.position.set(100,200,100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096,4096);
  sun.shadow.camera.left=-500; sun.shadow.camera.right=500;
  sun.shadow.camera.top=500; sun.shadow.camera.bottom=-500;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x88aaff, 0x442222, 0.25);
  scene.add(hemi);

  const amb = new THREE.AmbientLight(0xffffff,0.3);
  scene.add(amb);
}

// --------------------
// Physics
// --------------------
function initPhysics(){
  physWorld = new CANNON.World();
  physWorld.gravity.set(0,-9.82,0);
  physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations = 15;
  physWorld.defaultContactMaterial.friction = 0.6;
  physWorld.defaultContactMaterial.restitution = 0;
}

// --------------------
// Car
// --------------------
function createCar(){
  // Chassis visual
  threeCar = new THREE.Group();
  const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.45,3.0), new THREE.MeshStandardMaterial({ color:0xff4444, metalness:0.2, roughness:0.5 }));
  chassisMesh.castShadow=true;
  threeCar.add(chassisMesh);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34,0.34,0.25,24);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.95 });
  const wheelOffsets = [{x:-0.85,z:-1.2},{x:0.85,z:-1.2},{x:-0.85,z:1.2},{x:0.85,z:1.2}];
  threeCar.userData.wheels = [];
  for(const w of wheelOffsets){
    const pivot = new THREE.Object3D();
    pivot.position.set(w.x,0,w.z);
    const mesh = new THREE.Mesh(wheelGeo,wheelMat);
    mesh.castShadow=true;
    mesh.position.y=0.34;
    pivot.add(mesh);
    threeCar.add(pivot);
    threeCar.userData.wheels.push({pivot,mesh});
  }
  scene.add(threeCar);

  // Chassis physics
  chassisBody = new CANNON.Body({ mass:140 });
  chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(0.8,0.225,1.5)));
  chassisBody.position.set(0,2,0);
  chassisBody.angularDamping=0.6;
  physWorld.addBody(chassisBody);

  // Vehicle
  vehicle = new CANNON.RaycastVehicle({ chassisBody, indexRightAxis:0, indexUpAxis:1, indexForwardAxis:2 });
  const wheelOptions = {
    radius:0.34, suspensionStiffness:35, suspensionRestLength:0.35, frictionSlip:4.2,
    dampingRelaxation:2.3,dampingCompression:2.4,maxSuspensionForce:1e5,rollInfluence:0.01,
    axleLocal:new CANNON.Vec3(-1,0,0), chassisConnectionPointLocal:new CANNON.Vec3(), maxSuspensionTravel:0.45
  };
  const wheelConnectors = [
    new CANNON.Vec3(-0.85,0,-1.2),
    new CANNON.Vec3(0.85,0,-1.2),
    new CANNON.Vec3(-0.85,0,1.2),
    new CANNON.Vec3(0.85,0,1.2)
  ];
  for(let i=0;i<wheelConnectors.length;i++){
    const opt = Object.assign({}, wheelOptions);
    opt.chassisConnectionPointLocal = wheelConnectors[i];
    vehicle.addWheel(opt);
  }
  vehicle.addToWorld(physWorld);

  // Wheel bodies for visuals
  wheelBodies = [];
  for(let i=0;i<vehicle.wheelInfos.length;i++){
    const wb = new CANNON.Body({ mass:0 });
    wheelBodies.push(wb);
    physWorld.addBody(wb);
  }
}

// --------------------
// Input
// --------------------
function setupInput(){
  window.addEventListener('keydown', e=>{
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward=true;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward=true;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left=true;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right=true;
    if(e.code==='Space') input.handbrake=true;
    if(e.code==='KeyC') cameraMode=cameraMode==='third'?'cockpit':'third';
  });
  window.addEventListener('keyup', e=>{
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward=false;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward=false;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left=false;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right=false;
    if(e.code==='Space') input.handbrake=false;
  });
}

// --------------------
// Graphics Presets
// --------------------
function applyPresetByName(name){
  const preset = getPresetByName(name);
  if(!preset) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset.renderScale||1));
  applyMode(scene,preset);
}

// --------------------
// Heightfield
// --------------------
function buildPhysicsHeightfieldFromVisualGround(){
  const plane = scene.getObjectByName('sr_ground');
  if(!plane) return;

  const size=2000;
  const seg=Math.sqrt(plane.geometry.attributes.position.count)-1;
  const hfMatrix = [];
  const positions = plane.geometry.attributes.position.array;
  for(let j=0;j<=seg;j++){
    const row=[];
    for(let i=0;i<=seg;i++){
      const idx=(j*(seg+1)+i)*3+1;
      row.push(positions[idx]);
    }
    hfMatrix.push(row);
  }
  const hf = new CANNON.Heightfield(hfMatrix,{elementSize:size/seg});
  const hfBody = new CANNON.Body({ mass:0 });
  hfBody.addShape(hf);
  hfBody.position.set(-size/2,0,-size/2);
  hfBody.quaternion.setFromEuler(-Math.PI/2,0,0);
  physWorld.addBody(hfBody);
}

// --------------------
// Overlay
// --------------------
function createOverlay(){
  overlayEl = document.createElement('div');
  overlayEl.style.position='absolute';
  overlayEl.style.top='10px';
  overlayEl.style.left='10px';
  overlayEl.style.color='white';
  overlayEl.style.fontFamily='monospace';
  overlayEl.style.fontSize='14px';
  overlayEl.style.background='rgba(0,0,0,0.3)';
  overlayEl.style.padding='6px';
  overlayEl.style.zIndex=100;
  overlayEl.innerHTML='FPS: 0';
  document.body.appendChild(overlayEl);
}

// --------------------
// Post-processing
// --------------------
function setupPostProcessing(){
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const ssao = new SSAOPass(scene,camera,window.innerWidth,window.innerHeight);
  ssao.kernelRadius=16;
  composer.addPass(ssao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth,window.innerHeight),0.3,0.5,0.8);
  composer.addPass(bloom);
}

// --------------------
// Loop
// --------------------
function loop(){
  const now = performance.now();
  const dt = (now-lastTime)/1000;
  lastTime = now;
  t += dt;

  // Update physics
  physStep(dt);

  // Update visuals
  updateEnvironment(dt);
  updateCarVisuals();
  updateCamera();

  // Render
  composer.render();

  // Overlay
  overlayEl.innerHTML=`FPS: ${Math.round(1/dt)}<br>Speed: ${Math.round(chassisBody.velocity.length())}`;

  requestAnimationFrame(loop);
}

// --------------------
// Physics step
// --------------------
function physStep(dt){
  // Vehicle input
  const maxForce=3500;
  const maxSteer=0.45;
  const brakeForce=0.5;
  for(let i=0;i<vehicle.wheelInfos.length;i++){
    vehicle.setBrake(0,i);
  }
  if(input.forward) vehicle.applyEngineForce(-maxForce,2), vehicle.applyEngineForce(-maxForce,3);
  if(input.backward) vehicle.applyEngineForce(maxForce,2), vehicle.applyEngineForce(maxForce,3);
  if(input.left) vehicle.setSteeringValue(maxSteer,0), vehicle.setSteeringValue(maxSteer,1);
  if(input.right) vehicle.setSteeringValue(-maxSteer,0), vehicle.setSteeringValue(-maxSteer,1);
  if(input.handbrake){
    vehicle.setBrake(3500,2);
    vehicle.setBrake(3500,3);
  }
  physWorld.step(1/60, dt, 3);
}

// --------------------
// Car visuals
// --------------------
function updateCarVisuals(){
  threeCar.position.copy(chassisBody.position);
  threeCar.quaternion.copy(chassisBody.quaternion);

  // Wheels
  for(let i=0;i<vehicle.wheelInfos.length;i++){
    vehicle.updateWheelTransform(i);
    const t = vehicle.wheelInfos[i].worldTransform;
    const w = threeCar.userData.wheels[i];
    w.pivot.position.copy(t.position);
    w.pivot.quaternion.copy(t.quaternion);
  }
}

// --------------------
// Camera
// --------------------
function updateCamera(){
  if(cameraMode==='third'){
    const offset=new THREE.Vector3(0,3.8,-8).applyQuaternion(threeCar.quaternion);
    const target = new THREE.Vector3().copy(threeCar.position).add(offset);
    camera.position.lerp(target,0.1);
    const lookAt = new THREE.Vector3().copy(threeCar.position).add(new THREE.Vector3(0,1.2,0));
    camera.lookAt(lookAt);
  } else {
    camera.position.copy(threeCar.position).add(new THREE.Vector3(0.1,1.2,0.25));
    const dir = new THREE.Vector3(0,0,1).applyQuaternion(threeCar.quaternion);
    camera.lookAt(camera.position.clone().add(dir));
  }
}

// --------------------
// Resize
// --------------------
function onResize(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  composer.setSize(window.innerWidth,window.innerHeight);
}

// --------------------
// Progressive Load
// --------------------
function startProgressiveLoad(){
  let presets=getPresetNames();
  let idx=0;
  const loadNext=()=>{
    if(idx>=presets.length) return;
    applyPresetByName(presets[idx]);
    idx++;
    setTimeout(loadNext,2000);
  };
  loadNext();
}

// --------------------
// UI hook
// --------------------
function setupUI(){
  const btn = document.createElement('button');
  btn.innerText='Toggle Settings';
  btn.style.position='absolute';
  btn.style.top='10px';
  btn.style.right='10px';
  btn.style.zIndex=999;
  btn.onclick=()=>document.getElementById('settingsOverlay').classList.toggle('hidden');
  document.body.appendChild(btn);
}
