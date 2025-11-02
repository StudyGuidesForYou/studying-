// main.js — Fully integrated Slow Roads clone
import * as THREE from './three.module.js'; // make sure you have three.module.js locally or relative path
import * as CANNON from './cannon-es.js';   // local or relative path
import World from './world.js';
import { applyMode, updateEnvironment, cleanup } from './environment.js';
import { GraphicsPresets, getPresetByName, getPresetNames } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';
import { DebugConsole } from './console.js'; // full logging/reporting

// --------------------
// Debug
// --------------------
const DEBUG = true;
const log = (...a) => { if (DEBUG) DebugConsole.log(...a); };
const warn = (...a) => { if (DEBUG) DebugConsole.warn(...a); };
const error = (...a) => { if (DEBUG) DebugConsole.error(...a); };

// --------------------
// Global State
// --------------------
let renderer, scene, camera;
let worldVisual = null;
let physWorld = null;
let vehicle = null;
let chassisBody = null;
let threeCar = null;
let wheelBodies = [];
let lastTime = performance.now();
let t = 0;
let overlayEl = null;
let cameraMode = 'third';

const input = { forward:false, backward:false, left:false, right:false, handbrake:false };

// Driver params
const driver = { maxEngineForce: 2200, maxBreakingForce: 1200, maxSteerVal: 0.55 };

// --------------------
// Entry
// --------------------
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await bootstrap();
        lastTime = performance.now();
        requestAnimationFrame(loop);
        log('Application started');
    } catch(e) {
        error('Bootstrap failed', e);
    }
});

// --------------------
// Bootstrap
// --------------------
async function bootstrap() {
    initRenderer();
    initScene();
    initLights();

    worldVisual = new World(scene);

    initPhysics();
    buildPhysicsHeightfieldFromVisualGround();

    createCarVisualAndVehicle();
    setupInput();

    initSettingsUI(p => applyPresetByName(p.name));
    createOverlay();
    setupUI();

    startProgressiveLoad();

    DebugConsole.attachGlobals({scene, physWorld, vehicle, chassisBody});
    window.addEventListener('resize', onResize);
}

// --------------------
// Renderer & Scene
// --------------------
function initRenderer() {
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    log('Renderer initialized');
}

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    camera = new THREE.PerspectiveCamera(72, window.innerWidth/window.innerHeight, 0.1, 2000);
    camera.position.set(0, 3.8, -8);
    log('Scene and camera initialized');
}

function initLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(50, 180, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    scene.add(sun);

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(amb);

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x443322, 0.25);
    scene.add(hemi);

    log('Lights added');
}

// --------------------
// Physics
// --------------------
function initPhysics() {
    physWorld = new CANNON.World();
    physWorld.gravity.set(0, -9.82, 0);
    physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
    physWorld.solver.iterations = 10;
    physWorld.defaultContactMaterial.friction = 0.6;
    physWorld.defaultContactMaterial.restitution = 0;

    const groundMat = new CANNON.Material('ground');
    const body = new CANNON.Body({ mass: 0, material: groundMat });
    body.addShape(new CANNON.Plane());
    body.quaternion.setFromEuler(-Math.PI/2, 0, 0);
    physWorld.addBody(body);

    log('Physics initialized');
}

// --------------------
// Build heightfield
// --------------------
function buildPhysicsHeightfieldFromVisualGround() {
    try {
        const g = scene.getObjectByName('sr_ground');
        if(!g || !g.geometry) return setTimeout(buildPhysicsHeightfieldFromVisualGround, 300);

        const pos = g.geometry.attributes.position;
        const total = pos.count;
        const seg = Math.sqrt(total) -1;
        const segX = Math.round(seg);

        let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
        for(let i=0;i<pos.count;i++){ 
            const x=pos.getX(i), z=pos.getZ(i);
            minX=Math.min(minX,x); maxX=Math.max(maxX,x);
            minZ=Math.min(minZ,z); maxZ=Math.max(maxZ,z);
        }

        const width = maxX-minX;
        const dx = width/segX || 1;

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

        physWorld.bodies.filter(b=>b && b.shapes && b.shapes[0] instanceof CANNON.Heightfield).forEach(b=>physWorld.removeBody(b));
        physWorld.addBody(hfBody);
        log('Heightfield created', {rows: matrix.length, dx});
    } catch(e){ error('buildHF failed', e); }
}

// --------------------
// Car visuals + vehicle
// --------------------
function createCarVisualAndVehicle() {
    threeCar = new THREE.Group();
    threeCar.name = 'threeCar';

    // chassis
    const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(1.6,0.45,3.0),
        new THREE.MeshStandardMaterial({color:0xff4444, metalness:0.5, roughness:0.3})
    );
    chassis.castShadow = true;
    chassis.position.set(0,0.5,0);
    threeCar.add(chassis);

    // wheels
    const wheelGeo = new THREE.CylinderGeometry(0.34,0.34,0.22,32);
    wheelGeo.rotateZ(Math.PI/2);
    const wheelMat = new THREE.MeshStandardMaterial({color:0x111111, roughness:0.9, metalness:0.1});
    const wheelOffsets = [{x:-0.85,z:-1.2},{x:0.85,z:-1.2},{x:-0.85,z:1.2},{x:0.85,z:1.2}];
    threeCar.userData.wheels = [];
    for(const w of wheelOffsets){
        const pivot = new THREE.Object3D(); pivot.position.set(w.x,0,w.z);
        const mesh = new THREE.Mesh(wheelGeo, wheelMat); mesh.position.y = 0.34; mesh.castShadow=true;
        pivot.add(mesh); threeCar.add(pivot);
        threeCar.userData.wheels.push({pivot, mesh, offset: new THREE.Vector3(w.x,0,w.z)});
    }

    scene.add(threeCar);

    // physics chassis
    chassisBody = new CANNON.Body({ mass: 140 });
    chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(0.8,0.225,1.5)));
    chassisBody.position.set(0,2,0);
    chassisBody.angularDamping = 0.6;
    physWorld.addBody(chassisBody);

    // vehicle
    vehicle = new CANNON.RaycastVehicle({ chassisBody, indexRightAxis:0, indexUpAxis:1, indexForwardAxis:2 });
    const wheelOptions = {
        radius: 0.34,
        directionLocal: new CANNON.Vec3(0,-1,0),
        suspensionStiffness: 30,
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

    wheelBodies = [];
    for(let i=0;i<vehicle.wheelInfos.length;i++){ const wb = new CANNON.Body({ mass:0 }); wheelBodies.push(wb); physWorld.addBody(wb); }

    log('Vehicle and car visuals ready');
}

// --------------------
// Input
// --------------------
function setupInput() {
    window.addEventListener('keydown', e=>{
        if(['KeyW','ArrowUp'].includes(e.code)) input.forward = true;
        if(['KeyS','ArrowDown'].includes(e.code)) input.backward = true;
        if(['KeyA','ArrowLeft'].includes(e.code)) input.left = true;
        if(['KeyD','ArrowRight'].includes(e.code)) input.right = true;
        if(e.code==='Space') input.handbrake = true;
        if(e.code==='KeyC') cameraMode = (cameraMode==='third'?'cockpit':'third');
    });
    window.addEventListener('keyup', e=>{
        if(['KeyW','ArrowUp'].includes(e.code)) input.forward = false;
        if(['KeyS','ArrowDown'].includes(e.code)) input.backward = false;
        if(['KeyA','ArrowLeft'].includes(e.code)) input.left = false;
        if(['KeyD','ArrowRight'].includes(e.code)) input.right = false;
        if(e.code==='Space') input.handbrake = false;
    });
    log('Input ready');
}

// --------------------
// Overlay / UI
// --------------------
function createOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
        position:fixed;left:10px;top:10px;
        padding:8px 12px;
        background:rgba(0,0,0,0.6);
        color:white;
        font:12px monospace;
        z-index:99999;
        border-radius:6px;
    `;
    document.body.appendChild(overlayEl);
}

function updateOverlay() {
    if(!overlayEl) return;
    const pos = chassisBody ? chassisBody.position : {x:0,y:0,z:0};
    overlayEl.innerHTML = `
        pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>
        spd: ${chassisBody ? chassisBody.velocity.length().toFixed(2) : '0'} m/s<br>
        cam: ${cameraMode}<br>
        preset: ${localStorage.getItem('graphicsPreset')||'Normal Human'}
    `;
}

function setupUI() {
    const btn = document.getElementById('graphicsBtn');
    const panel = document.getElementById('graphicsPanel');
    btn?.addEventListener('click', ()=>panel.classList.toggle('hidden'));

    const sel = document.getElementById('presetSelect');
    if(sel){
        getPresetNames().forEach(n=>{
            const o = document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o);
        });
        document.getElementById('applySettings')?.addEventListener('click', ()=>{
            const p=getPresetByName(sel.value);
            if(p) applyPresetByName(p.name);
        });
    }
}

// --------------------
// Graphics presets
// --------------------
function applyPresetByName(name){
    const preset = getPresetByName(name);
    if(!preset){ warn('Preset not found', name); return; }
    renderer.setPixelRatio(Math.min(2.5, (window.devicePixelRatio||1) * (preset.renderScale||1)));
    camera.far = preset.viewDistance||1000; camera.updateProjectionMatrix();
    try { applyMode(scene, preset, { worldMode: preset.worldMode??'natural' }); } catch(e){ error(e); }
    setTimeout(buildPhysicsHeightfieldFromVisualGround, 300);
    localStorage.setItem('graphicsPreset', name);
    log('Applied preset', name);
}

function startProgressiveLoad() {
    applyPresetByName('Potato');
    setTimeout(()=>applyPresetByName('Normal Human'), 1400);
    setTimeout(()=>applyPresetByName('CPU Destroyer'), 4800);
}

// --------------------
// Visual sync
// --------------------
function syncVisualsFromPhysics() {
    const threeChassis = scene.getObjectByName('threeCar');
    if(threeChassis && chassisBody){
        threeChassis.position.copy(chassisBody.position);
        threeChassis.quaternion.copy(chassisBody.quaternion);
    }

    for(let i=0;i<vehicle.wheelInfos.length;i++){
        vehicle.updateWheelTransform(i);
        const wt = vehicle.wheelInfos[i].worldTransform;
        const visWheel = threeChassis?.userData?.wheels?.[i];
        if(visWheel){
            visWheel.pivot.position.set(wt.position.x, wt.position.y, wt.position.z);
            visWheel.pivot.quaternion.set(wt.quaternion.x, wt.quaternion.y, wt.quaternion.z, wt.quaternion.w);
        }
    }
}

// --------------------
// Camera
// --------------------
function updateCamera() {
    if(!chassisBody) return;
    if(cameraMode==='third'){
        const target = new THREE.Vector3().copy(chassisBody.position);
        const behind = new THREE.Vector3(0,3,-8).applyQuaternion(chassisBody.quaternion);
        camera.position.lerp(target.add(behind), 0.1);
        camera.lookAt(chassisBody.position);
    } else {
        camera.position.copy(chassisBody.position);
        camera.position.y += 1.2;
        const forward = new THREE.Vector3(0,0,1).applyQuaternion(chassisBody.quaternion);
        camera.lookAt(chassisBody.position.clone().add(forward));
    }
}

// --------------------
// Main loop
// --------------------
function loop() {
    const now = performance.now();
    const dt = (now - lastTime)/1000;
    lastTime = now;
    t+=dt;

    // vehicle control
    if(vehicle){
        const engineForce = driver.maxEngineForce*(input.forward?1:(input.backward?-1:0));
        const brakeForce = input.handbrake ? driver.maxBreakingForce : 0;
        const steer = input.left?-driver.maxSteerVal:(input.right?driver.maxSteerVal:0);

        vehicle.setSteeringValue(steer,0);
        vehicle.setSteeringValue(steer,1);
        vehicle.applyEngineForce(engineForce,2);
        vehicle.applyEngineForce(engineForce,3);
        vehicle.setBrake(brakeForce,0);
        vehicle.setBrake(brakeForce,1);
        vehicle.setBrake(brakeForce,2);
        vehicle.setBrake(brakeForce,3);
    }

    // physics
    physWorld.step(1/60, dt, 3);

    syncVisualsFromPhysics();
    updateCamera();
    updateOverlay();
    renderer.render(scene,camera);

    DebugConsole.fullStatus({t, chassisBody, vehicle, camera, scene});
    requestAnimationFrame(loop);
}

// --------------------
// Resize
// --------------------
function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
