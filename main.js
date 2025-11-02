// main.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import World from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

// -------------------- Globals --------------------
let renderer, scene, camera, clock=new THREE.Clock();
let physWorld, vehicle, chassisBody, threeCar;
let wheelBodies = [], t=0, overlayEl=null;
let worldVisual=null;
let cameraMode = 'third';
const input={forward:false,backward:false,left:false,right:false,handbrake:false};

// -------------------- Bootstrap --------------------
document.addEventListener('DOMContentLoaded', async()=>{
  initRenderer();
  initScene();
  initLights();
  worldVisual = new World(scene);
  initPhysics();
  applyMode(scene,getPresetByName('Normal Human')||GraphicsPresets[2]);
  buildPhysicsHeightfield();
  createCar();
  setupInput();
  initSettingsUI(p=>applyPresetByName(p.name));
  setupUI();
  createOverlay();
  requestAnimationFrame(loop);
});

// -------------------- Renderer --------------------
function initRenderer(){
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
}

// -------------------- Scene --------------------
function initScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(72,window.innerWidth/window.innerHeight,0.1,2000);
  camera.position.set(0,3.8,-8);
}

// -------------------- Lights --------------------
function initLights(){
  const sun = new THREE.DirectionalLight(0xffffff,1.2);
  sun.position.set(100,200,100);
  sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);
  sun.shadow.camera.far=500;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff,0.35));
}

// -------------------- Physics --------------------
function initPhysics(){
  physWorld = new CANNON.World();
  physWorld.gravity.set(0,-9.82,0);
  physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
  physWorld.solver.iterations = 10;
}

// -------------------- Build Heightfield --------------------
function buildPhysicsHeightfield(){
  const g = scene.getObjectByName('sr_ground');
  if(!g) return setTimeout(buildPhysicsHeightfield,200);
  const pos = g.geometry.attributes.position;
  const seg = Math.sqrt(pos.count)-1;
  const dx = 2000/seg;
  const matrix=[];
  for(let xi=0;xi<=seg;xi++){
    const row=[];
    for(let zi=0;zi<=seg;zi++){
      const idx=zi*(seg+1)+xi;
      row.push(pos.getY(idx)||0);
    }
    matrix.push(row);
  }
  const hfShape = new CANNON.Heightfield(matrix,{elementSize:dx});
  const hfBody = new CANNON.Body({mass:0});
  hfBody.addShape(hfShape);
  hfBody.quaternion.setFromEuler(-Math.PI/2,0,0);
  physWorld.addBody(hfBody);
}

// -------------------- Car --------------------
function createCar(){
  threeCar = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.45,3),new THREE.MeshStandardMaterial({color:0xff4444}));
  chassis.castShadow=true;
  chassis.position.set(0,0.5,0);
  threeCar.add(chassis);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34,0.34,0.22,20); wheelGeo.rotateZ(Math.PI/2);
  const wheelMat = new THREE.MeshStandardMaterial({color:0x111111});
  const wheelOffsets=[{x:-0.85,z:-1.2},{x:0.85,z:-1.2},{x:-0.85,z:1.2},{x:0.85,z:1.2}];
  threeCar.userData.wheels=[];
  wheelOffsets.forEach(w=>{
    const pivot = new THREE.Object3D(); pivot.position.set(w.x,0,w.z);
    const mesh = new THREE.Mesh(wheelGeo,wheelMat); mesh.position.y=0.34; mesh.castShadow=true;
    pivot.add(mesh); threeCar.add(pivot);
    threeCar.userData.wheels.push({pivot,mesh,offset:new THREE.Vector3(w.x,0,w.z)});
  });
  scene.add(threeCar);

  // Physics
  chassisBody = new CANNON.Body({mass:140});
  chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(0.8,0.225,1.5)));
  chassisBody.position.set(0,2,0);
  chassisBody.angularDamping=0.6;
  physWorld.addBody(chassisBody);

  vehicle = new CANNON.RaycastVehicle({chassisBody,indexRightAxis:0,indexUpAxis:1,indexForwardAxis:2});
  const wheelOptions = {
    radius:0.34,
    directionLocal:new CANNON.Vec3(0,-1,0),
    suspensionStiffness:30,
    suspensionRestLength:0.35,
    frictionSlip:4.2,
    dampingRelaxation:2.3,
    dampingCompression:2.4,
    maxSuspensionForce:1e5,
    rollInfluence:0.01,
    axleLocal:new CANNON.Vec3(-1,0,0),
    chassisConnectionPointLocal:new CANNON.Vec3(),
    maxSuspensionTravel:0.45
  };
  const wheelConnectors = [new CANNON.Vec3(-0.85,0,-1.2),new CANNON.Vec3(0.85,0,-1.2),
                          new CANNON.Vec3(-0.85,0,1.2),new CANNON.Vec3(0.85,0,1.2)];
  for(let i=0;i<4;i++){const opt={...wheelOptions}; opt.chassisConnectionPointLocal=wheelConnectors[i]; vehicle.addWheel(opt);}
  vehicle.addToWorld(physWorld);
}

// -------------------- Input --------------------
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
}

// -------------------- Camera --------------------
function updateCamera(dt){
  if(!chassisBody) return;
  const pos = chassisBody.position;
  const quat = chassisBody.quaternion;
  if(cameraMode==='third'){
    const offset=new THREE.Vector3(0,4,-10);
    const mat = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(quat.x,quat.y,quat.z,quat.w));
    offset.applyMatrix4(mat);
    camera.position.set(pos.x+offset.x,pos.y+offset.y,pos.z+offset.z);
    camera.lookAt(pos.x,pos.y+1.5,pos.z);
  } else {
    camera.position.set(pos.x,pos.y+1,pos.z-0.2);
    camera.lookAt(pos.x,pos.y+1,pos.z+5);
  }
}

// -------------------- Settings --------------------
function applyPresetByName(name){
  const p = getPresetByName(name);
  if(!p) return;
  applyMode(scene,p);
}

// -------------------- Overlay --------------------
function setupUI(){
  overlayEl = document.createElement('div');
  overlayEl.style.position='absolute'; overlayEl.style.top='10px';
  overlayEl.style.left='10px'; overlayEl.style.color='#fff'; overlayEl.style.fontFamily='monospace';
  overlayEl.style.zIndex='999'; overlayEl.style.background='rgba(0,0,0,0.3)'; overlayEl.style.padding='8px';
  document.body.appendChild(overlayEl);
}

function createOverlay(){overlayEl.innerHTML='Speed: 0 km/h<br>Mode: '+cameraMode;}

// -------------------- Main Loop --------------------
function loop(){
  const dt=clock.getDelta();
  t+=dt;
  physWorld.step(1/60,dt,3);

  // Update vehicle physics
  if(vehicle){
    vehicle.wheelInfos.forEach((w,i)=>{vehicle.updateWheelTransform(i);});
    threeCar.position.copy(chassisBody.position); threeCar.quaternion.copy(chassisBody.quaternion);
  }

  // Inputs
  if(vehicle){
    const maxForce=2500;
    vehicle.setBrake(input.handbrake?5000:0,0); vehicle.setBrake(input.handbrake?5000:0,1);
    const engineForce = input.forward? maxForce : input.backward? -maxForce:0;
    vehicle.applyEngineForce(engineForce,2); vehicle.applyEngineForce(engineForce,3);
    const steer = input.left? 0.5 : input.right? -0.5 : 0;
    vehicle.setSteeringValue(steer,0); vehicle.setSteeringValue(steer,1);
  }

  updateEnvironment(dt,t);
  updateCamera(dt);

  overlayEl.innerHTML='Speed: '+Math.round(chassisBody.velocity.length()*3.6)+' km/h<br>Mode: '+cameraMode;

  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
