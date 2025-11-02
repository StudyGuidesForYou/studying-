// main.js — full singleplayer driving simulation
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/controls/OrbitControls.js';
import { initEnvironment, updateEnvironment, sampleHeightAtXY } from './environment.js';
import { setupUI } from './settings.js';
import { World } from './world.js';

// Scene, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d0d);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Camera + Controls
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 15, 25);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 200, 100);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Environment
initEnvironment(scene, { terrainDetail: 256, treeDensity: 1, rockDensity: 0.4, snowParticles: 1000 });

// World wrapper for collisions
const world = new World(scene, camera);

// Car
const car = createCar();
scene.add(car.mesh);

// Input
const input = { forward: false, backward: false, left: false, right: false };
window.addEventListener('keydown', e => handleKey(e, true));
window.addEventListener('keyup', e => handleKey(e, false));

function handleKey(e, down) {
    switch(e.code) {
        case 'KeyW': input.forward = down; break;
        case 'KeyS': input.backward = down; break;
        case 'KeyA': input.left = down; break;
        case 'KeyD': input.right = down; break;
    }
}

// UI
setupUI({ renderer, camera, car, scene });

// Physics variables
const clock = new THREE.Clock();
const speed = 0.0;
let velocity = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Update environment (snow + terrain wiggle)
    updateEnvironment(dt);

    // Car physics
    updateCarPhysics(car, dt, input);

    // Camera collision
    world.updateCamera();

    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- Car Functions ---
function createCar() {
    const carGroup = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(4, 1.5, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const wheels = [];
    const positions = [
        [-1.5, -0.8, 3], [1.5, -0.8, 3],
        [-1.5, -0.8, -3], [1.5, -0.8, -3]
    ];
    positions.forEach(p => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI/2;
        wheel.position.set(...p);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        carGroup.add(wheel);
        wheels.push(wheel);
    });

    return { mesh: carGroup, body, wheels, velocity: new THREE.Vector3(), rotationSpeed: 0 };
}

function updateCarPhysics(car, dt, input) {
    const acc = 50;
    const rotSpeed = Math.PI * 0.8;
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(car.mesh.quaternion);
    const right = new THREE.Vector3(1,0,0).applyQuaternion(car.mesh.quaternion);

    if(input.forward) car.velocity.add(forward.clone().multiplyScalar(acc * dt));
    if(input.backward) car.velocity.add(forward.clone().multiplyScalar(-acc * dt));
    if(input.left) car.mesh.rotateY(rotSpeed*dt);
    if(input.right) car.mesh.rotateY(-rotSpeed*dt);

    // Simple friction
    car.velocity.multiplyScalar(0.96);

    // Move car
    car.mesh.position.add(car.velocity.clone().multiplyScalar(dt));

    // Collision with terrain
    const groundHeight = sampleHeightAtXY(car.mesh.position.x, car.mesh.position.z, scene.getObjectByName('sr_ground'));
    if(car.mesh.position.y < groundHeight + 0.75) car.mesh.position.y = groundHeight + 0.75;
}
