// main.js — fully integrated SlowRoads-style demo
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import { initEnvironment, updateEnvironment, sampleHeightAtXY } from './environment.js';
import { initSettingsUI } from './settings.js';
import { setupCamera, preventCameraClip } from './world.js';

// --------------------
// Global State
// --------------------
let scene, renderer, camera, controls;
let physWorld, carBody, carVehicle;
let lastTime = performance.now();
let overlayEl;
let input = { forward: false, backward: false, left: false, right: false, handbrake: false };
let cameraMode = 'third';
let wheelBodies = [];
let settings = { graphics: 'high', sound: true };

// --------------------
// Entry
// --------------------
document.addEventListener('DOMContentLoaded', async () => {
    initRenderer();
    initScene();
    initLights();
    setupPhysics();
    initEnvironment(scene);
    setupCameraControls();
    initCar();
    initSettingsUI();

    createOverlay();

    setupInput();
    window.addEventListener('resize', onResize);

    lastTime = performance.now();
    requestAnimationFrame(loop);
});

// --------------------
// Renderer & Scene
// --------------------
function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
}

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
}

// --------------------
// Lights
// --------------------
function initLights() {
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(100, 300, 200);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x444466, 0x222222, 0.6);
    scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);
}

// --------------------
// Physics
// --------------------
function setupPhysics() {
    physWorld = new CANNON.World();
    physWorld.gravity.set(0, -9.82, 0);
    physWorld.broadphase = new CANNON.SAPBroadphase(physWorld);
    physWorld.solver.iterations = 10;

    // Ground plane
    const groundMat = new CANNON.Material('ground');
    const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physWorld.addBody(groundBody);
}

// --------------------
// Camera
// --------------------
function setupCameraControls() {
    const camSetup = setupCamera(scene, renderer);
    camera = camSetup.camera;
    controls = camSetup.controls;
}

// --------------------
// Car
// --------------------
function initCar() {
    // Car chassis
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
    carBody = new CANNON.Body({ mass: 200 });
    carBody.addShape(chassisShape);
    carBody.position.set(0, 5, 0);
    carBody.angularDamping = 0.5;
    physWorld.addBody(carBody);

    // Vehicle
    carVehicle = new CANNON.RaycastVehicle({
        chassisBody: carBody,
        indexForwardAxis: 2,
        indexUpAxis: 1,
        indexRightAxis: 0
    });

    const wheelOptions = {
        radius: 0.5,
        directionLocal: new CANNON.Vec3(0, -1, 0),
        axleLocal: new CANNON.Vec3(-1, 0, 0),
        suspensionStiffness: 40,
        suspensionRestLength: 0.35,
        frictionSlip: 4,
        dampingCompression: 2.5,
        dampingRelaxation: 2.3,
        maxSuspensionForce: 1e5,
        rollInfluence: 0.01,
        maxSuspensionTravel: 0.45,
        customSlidingRotationalSpeed: -30
    };

    const wheelPositions = [
        new CANNON.Vec3(-1, 0, 1.5),
        new CANNON.Vec3(1, 0, 1.5),
        new CANNON.Vec3(-1, 0, -1.5),
        new CANNON.Vec3(1, 0, -1.5)
    ];

    wheelPositions.forEach(pos => {
        const options = { ...wheelOptions, chassisConnectionPointLocal: pos.clone() };
        carVehicle.addWheel(options);
    });

    carVehicle.addToWorld(physWorld);

    // Wheel visuals
    wheelBodies = carVehicle.wheelInfos.map(wheel => {
        const body = new CANNON.Body({ mass: 1 });
        body.addShape(new CANNON.Sphere(wheel.radius));
        physWorld.addBody(body);
        return body;
    });

    // 3D visual chassis
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.3, roughness: 0.6 });
    const chassisGeo = new THREE.BoxGeometry(2, 1, 4);
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    carBody.threeMesh = chassisMesh;
    scene.add(chassisMesh);
}

// --------------------
// Input
// --------------------
function setupInput() {
    window.addEventListener('keydown', e => {
        if (['KeyW', 'ArrowUp'].includes(e.code)) input.forward = true;
        if (['KeyS', 'ArrowDown'].includes(e.code)) input.backward = true;
        if (['KeyA', 'ArrowLeft'].includes(e.code)) input.left = true;
        if (['KeyD', 'ArrowRight'].includes(e.code)) input.right = true;
        if (e.code === 'Space') input.handbrake = true;
        if (e.code === 'KeyC') cameraMode = cameraMode === 'third' ? 'cockpit' : 'third';
    });

    window.addEventListener('keyup', e => {
        if (['KeyW', 'ArrowUp'].includes(e.code)) input.forward = false;
        if (['KeyS', 'ArrowDown'].includes(e.code)) input.backward = false;
        if (['KeyA', 'ArrowLeft'].includes(e.code)) input.left = false;
        if (['KeyD', 'ArrowRight'].includes(e.code)) input.right = false;
        if (e.code === 'Space') input.handbrake = false;
    });
}

// --------------------
// Overlay
// --------------------
function createOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.style.position = 'fixed';
    overlayEl.style.top = '10px';
    overlayEl.style.left = '10px';
    overlayEl.style.padding = '6px 10px';
    overlayEl.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlayEl.style.color = 'white';
    overlayEl.style.fontFamily = 'monospace';
    overlayEl.style.fontSize = '12px';
    overlayEl.style.borderRadius = '6px';
    overlayEl.style.zIndex = 9999;
    document.body.appendChild(overlayEl);
}

// --------------------
// Loop
// --------------------
function loop(now = performance.now()) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Vehicle controls
    const engineForce = input.forward ? 3000 : 0;
    const brakeForce = input.backward ? 2000 : 0;
    const steer = input.left ? 0.5 : input.right ? -0.5 : 0;

    if (carVehicle) {
        carVehicle.applyEngineForce(engineForce, 2);
        carVehicle.applyEngineForce(engineForce, 3);
        carVehicle.setBrake(brakeForce, 0);
        carVehicle.setBrake(brakeForce, 1);
        carVehicle.setBrake(brakeForce, 2);
        carVehicle.setBrake(brakeForce, 3);
        carVehicle.setSteeringValue(steer, 0);
        carVehicle.setSteeringValue(steer, 1);
    }

    // Physics step
    physWorld.step(1 / 60, dt, 3);

    // Sync visuals
    if (carBody.threeMesh) {
        carBody.threeMesh.position.copy(carBody.position);
        carBody.threeMesh.quaternion.copy(carBody.quaternion);
    }

    // Update wheels
    carVehicle.wheelInfos.forEach((wheel, i) => {
        carVehicle.updateWheelTransform(i);
        wheelBodies[i].position.copy(wheel.worldTransform.position);
        wheelBodies[i].quaternion.copy(wheel.worldTransform.quaternion);
    });

    // Camera
    if (cameraMode === 'third') {
        const target = carBody.position.clone();
        const behind = new THREE.Vector3(0, 5, -12).applyQuaternion(carBody.quaternion).add(target);
        camera.position.lerp(behind, 0.1);
        camera.lookAt(target.clone().add(new THREE.Vector3(0, 1.5, 0)));
    } else {
        const pos = carBody.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        camera.position.lerp(pos, 0.2);
        camera.lookAt(carBody.position.clone().add(new THREE.Vector3(0, 1.5, 3)));
    }

    preventCameraClip(camera, null);

    // Environment update
    updateEnvironment(dt);

    // Overlay
    if (overlayEl) {
        overlayEl.innerHTML = `
            pos: ${carBody.position.x.toFixed(1)}, ${carBody.position.y.toFixed(1)}, ${carBody.position.z.toFixed(1)}<br/>
            spd: ${carBody.velocity.length().toFixed(2)} m/s<br/>
            cam: ${cameraMode}<br/>
            graphics: ${settings.graphics}<br/>
            sound: ${settings.sound ? 'on' : 'off'}
        `;
    }

    // Render
    renderer.render(scene, camera);
}

// --------------------
// Helpers
// --------------------
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --------------------
// Expose to Settings
// --------------------
window.applyGraphicsPreset = val => { settings.graphics = val; console.log('Graphics set to', val); };
window.toggleSound = val => { settings.sound = val; console.log('Sound set to', val); };
