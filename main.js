// main.js — Slow Roads Ultra Edition
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import World from './world.js';
import { applyMode, updateEnvironment, cleanup } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// --------------------
// Debug
// --------------------
const DEBUG=true;
const log=(...a)=>{if(DEBUG) console.log('[UR]',...a);};
const warn=(...a)=>{if(DEBUG) console.warn('[UR]',...a);};
const error=(...a)=>{if(DEBUG) console.error('[UR]',...a);};

// --------------------
// Global State
// --------------------
let renderer, scene, camera;
let worldVisual=null;
let physWorld=null;
let vehicle=null;
let chassisBody=null;
let threeCar=null;
let wheelBodies=[];
let lastTime=performance.now();
let t=0;
let overlayEl=null;
let cameraMode='third';
const input={forward:false, backward:false, left:false, right:false, handbrake:false};
window.__UR_DEBUG__={};

// --------------------
// Entry
// --------------------
document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await bootstrap();
    lastTime=performance.now();
    requestAnimationFrame(loop);
    log('app started');
  }catch(e){ error('bootstrap failed',e); }
});

// --------------------
// Bootstrap
// --------------------
async function bootstrap(){
  initRenderer();
  initScene();
  initLights();
  worldVisual=new World(scene);
  initPhysics();

  // apply default preset
  applyPresetByName('Normal Human');

  buildPhysicsHeightfieldFromVisualGround();
  createCarVisualAndVehicle();
  setupInput();
  initSettingsUI(p=>applyPresetByName(p.name));
  createOverlay();
  setupUI();
  startProgressiveLoad();
  loadSounds();

  window.addEventListener('resize', onResize);
}

// --------------------
// Renderer & Scene
// --------------------
function initRenderer(){
  const canvas=document.getElementById('gameCanvas');
  renderer=new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.2;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  log('renderer ready');
}

function initScene(){
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x111111);
  camera=new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,0.1,2000);
  camera.position.set(0,3.8,-8);
  window.camera=camera;
}

function initLights(){
  const sun=new THREE.DirectionalLight(0xffffff,1.5);
  sun.position.set(100,180,100);
  sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);
  sun.shadow.camera.near=0.5;
  sun.shadow.camera.far=1000;
  sun.shadow.bias=-0.001;
  scene.add(sun);

  const amb=new THREE.AmbientLight(0xffffff,0.3);
  scene.add(amb);

  const hemi=new THREE.HemisphereLight(0x88aaff,0x443322,0.25);
  scene.add(hemi);
  log('lights ready');
}

// --------------------
// Physics
// --------------------
function initPhysics(){
  physWorld=new CANNON.World();
  physWorld.gravity.set(0,-9.82,0);
  physWorld.broadphase=new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations=15;
  physWorld.defaultContactMaterial.friction=0.6;
  physWorld.defaultContactMaterial.restitution=0;

  const groundMat=new CANNON.Material('ground');
  const body=new CANNON.Body({mass:0, material:groundMat});
  body.addShape(new CANNON.Plane());
  body.quaternion.setFromEuler(-Math.PI/2,0,0);
  physWorld.addBody(body);

  log('physics ready');
}

// --------------------
// Heightfield
// --------------------
function buildPhysicsHeightfieldFromVisualGround(){
  const g=scene.getObjectByName('sr_ground');
  if(!g || !g.geometry) return setTimeout(buildPhysicsHeightfieldFromVisualGround,300);

  const pos=g.geometry.attributes.position;
  const total=pos.count;
  const seg=Math.sqrt(total)-1;
  const segX=Math.round(seg);

  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i), z=pos.getZ(i); minX=Math.min(minX,x); maxX=Math.max(maxX,x); minZ=Math.min(minZ,z); maxZ=Math.max(maxZ,z);}
  const width=maxX-minX;
  const dx=width/segX||1;

  const matrix=[];
  for(let xi=0;xi<=segX;xi++){
    const row=[];
    for(let zi=0;zi<=segX;zi++){
      const idx=zi*(segX+1)+xi;
      const y=pos.getY(idx)??0;
      row.push(y);
    }
    matrix.push(row);
  }

  const hfShape=new CANNON.Heightfield(matrix,{elementSize:dx});
  const hfBody=new CANNON.Body({mass:0});
  hfBody.addShape(hfShape);
  hfBody.position.set(minX,0,minZ);
  hfBody.quaternion.setFromEuler(-Math.PI/2,0,0);

  physWorld.bodies.filter(b=>b.shapes?.[0] instanceof CANNON.Heightfield).forEach(b=>physWorld.removeBody(b));
  physWorld.addBody(hfBody);
  log('heightfield created', {rows:matrix.length, dx});
}

// --------------------
// Vehicle
// --------------------
function createCarVisualAndVehicle(){
  threeCar=new THREE.Group();
  threeCar.name='threeCar';
  const chassis=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.45,3.0), new THREE.MeshStandardMaterial({color:0xff4444, metalness:0.2, roughness:0.5}));
  chassis.position.set(0,0.5,0);
  chassis.castShadow=true;
  threeCar.add(chassis);

  const wheelGeo=new THREE.CylinderGeometry(0.34,0.34,0.22,32);
  wheelGeo.rotateZ(Math.PI/2);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x111111, roughness:0.9});
  const wheelOffsets=[{x:-0.85,z:-1.2},{x:0.85,z:-1.2},{x:-0.85,z:1.2},{x:0.85,z:1.2}];
  threeCar.userData.wheels=[];
  for(const w of wheelOffsets){
    const pivot=new THREE.Object3D();
    pivot.position.set(w.x,0,w.z);
    const mesh=new THREE.Mesh(wheelGeo,wheelMat); mesh.position.y=0.34; mesh.castShadow=true;
    pivot.add(mesh); threeCar.add(pivot);
    threeCar.userData.wheels.push({pivot, mesh, offset:new THREE.Vector3(w.x,0,w.z)});
  }
  scene.add(threeCar);

  chassisBody=new CANNON.Body({mass:140});
  chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(0.8,0.225,1.5)));
  chassisBody.position.set(0,2,0);
  chassisBody.angularDamping=0.6;
  physWorld.addBody(chassisBody);

  vehicle=new CANNON.RaycastVehicle({chassisBody, indexRightAxis:0, indexUpAxis:1, indexForwardAxis:2});
  const wheelOptions={
    radius:0.34, directionLocal:new CANNON.Vec3(0,-1,0),
    suspensionStiffness:45, suspensionRestLength:0.35,
    frictionSlip:4.2, dampingRelaxation:2.5, dampingCompression:2.5,
    maxSuspensionForce:1e5, rollInfluence:0.01, axleLocal:new CANNON.Vec3(-1,0,0),
    chassisConnectionPointLocal:new CANNON.Vec3(), maxSuspensionTravel:0.45
  };
  const wheelConnectors=[
    new CANNON.Vec3(-0.85,0,-1.2),
    new CANNON.Vec3(0.85,0,-1.2),
    new CANNON.Vec3(-0.85,0,1.2),
    new CANNON.Vec3(0.85,0,1.2)
  ];
  for(let i=0;i<wheelConnectors.length;i++){ const opt=Object.assign({},wheelOptions); opt.chassisConnectionPointLocal=wheelConnectors[i]; vehicle.addWheel(opt);}
  vehicle.addToWorld(physWorld);

  wheelBodies=[];
  for(let i=0;i<vehicle.wheelInfos.length;i++){ const wb=new CANNON.Body({mass:0}); wheelBodies.push(wb); physWorld.addBody(wb); }

  log('vehicle ready');
}

// --------------------
// Input
// --------------------
function setupInput(){
  window.addEventListener('keydown',e=>{
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward=true;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward=true;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left=true;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right=true;
    if(e.code==='Space') input.handbrake=true;
    if(e.code==='KeyC') cameraMode=(cameraMode==='third'?'cockpit':'third');
  });
  window.addEventListener('keyup',e=>{
    if(['KeyW','ArrowUp'].includes(e.code)) input.forward=false;
    if(['KeyS','ArrowDown'].includes(e.code)) input.backward=false;
    if(['KeyA','ArrowLeft'].includes(e.code)) input.left=false;
    if(['KeyD','ArrowRight'].includes(e.code)) input.right=false;
    if(e.code==='Space') input.handbrake=false;
  });
  log('input ready');
}

// --------------------
// Driver Params
// --------------------
const driver={maxEngineForce:3200, maxBreakingForce:2000, maxSteerVal:0.55};

// --------------------
// Graphics Presets
// --------------------
function applyPresetByName(name){
  const preset=getPresetByName(name);
  if(!preset){ warn('preset not found',name); return; }
  renderer.setPixelRatio(Math.min(2.5,(window.devicePixelRatio||1)*(preset.renderScale||1)));
  camera.far=preset.viewDistance||1000; camera.updateProjectionMatrix();
  try{ applyMode(scene,preset); }catch(e){ error(e); }
  setTimeout(buildPhysicsHeightfieldFromVisualGround,300);
  localStorage.setItem('graphicsPreset',name);
}

function startProgressiveLoad(){
  applyPresetByName('Potato');
  setTimeout(()=>applyPresetByName('Normal Human'),1400);
  setTimeout(()=>applyPresetByName('GPU Killer'),4800);
}

// --------------------
// Overlay UI
// --------------------
function createOverlay(){
  overlayEl=document.createElement('div');
  overlayEl.style.cssText='position:fixed;left:10px;top:10px;padding:8px 12px;background:rgba(0,0,0,0.7);color:#fff;font:12px monospace;z-index:99999;border-radius:6px';
  document.body.appendChild(overlayEl);
}
function updateOverlay(){
  if(!overlayEl) return;
  const pos=chassisBody?chassisBody.position:{x:0,y:0,z:0};
  overlayEl.innerHTML=`<b>Position:</b> X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)} Z:${pos.z.toFixed(1)}<br>
    <b>Preset:</b> ${localStorage.getItem('graphicsPreset')||'None'}<br>
    <b>Camera:</b> ${cameraMode}`;
}

// --------------------
// Resize
// --------------------
function onResize(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}

// --------------------
// Loop
// --------------------
function loop(){
  const now=performance.now();
  const dt=(now-lastTime)/1000;
  lastTime=now;
  t+=dt;

  updatePhysics(dt);
  updateCarVisualFromPhysics();
  updateEnvironment(dt,t);
  updateCamera();
  updateOverlay();

  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}

// --------------------
// Physics Step
// --------------------
function updatePhysics(dt){
  if(!vehicle) return;
  const force=input.forward?-driver.maxEngineForce:input.backward?driver.maxEngineForce*0.5:0;
  const brake=input.handbrake?driver.maxBreakingForce:0;
  for(let i=0;i<vehicle.wheelInfos.length;i++){
    if(i<2){ vehicle.setSteeringValue(input.left?-driver.maxSteerVal:input.right?driver.maxSteerVal:0,i);}
    vehicle.applyEngineForce(force,i);
    vehicle.setBrake(brake,i);
  }
  physWorld.fixedStep(dt,1/60,5);
}

// --------------------
// Visual Sync
// --------------------
function updateCarVisualFromPhysics(){
  if(!threeCar||!chassisBody) return;
  threeCar.position.copy(chassisBody.position);
  threeCar.quaternion.copy(chassisBody.quaternion);

  vehicle.wheelInfos.forEach((wheel,i)=>{
    const body=wheelBodies[i];
    vehicle.updateWheelTransform(i);
    const t=wheel.worldTransform;
    body.position.copy(t.position);
    body.quaternion.copy(t.quaternion);
    const wMesh=threeCar.userData.wheels[i].mesh;
    wMesh.position.copy(body.position);
    wMesh.quaternion.copy(body.quaternion);
  });
}

// --------------------
// Camera
// --------------------
function updateCamera(){
  if(!chassisBody) return;
  if(cameraMode==='third'){
    const target=new THREE.Vector3().copy(chassisBody.position);
    const offset=new THREE.Vector3(0,3,-8);
    offset.applyQuaternion(chassisBody.quaternion);
    camera.position.lerp(target.clone().add(offset),0.12);
    camera.lookAt(target);
  }else{
    const target=new THREE.Vector3().copy(chassisBody.position);
    camera.position.lerp(target.clone().add(new THREE.Vector3(0.4,1.2,0)),0.16);
    camera.quaternion.slerp(chassisBody.quaternion,0.16);
  }
}

// --------------------
// Sounds (basic)
// --------------------
let audioCtx=null, engineGain=null;
function loadSounds(){
  audioCtx=new AudioContext();
  engineGain=audioCtx.createGain();
  engineGain.gain.value=0.4;
  engineGain.connect(audioCtx.destination);
}

// --------------------
// Settings UI
// --------------------
function setupUI(){}
