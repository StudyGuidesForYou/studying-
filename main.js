// =============================================================
// MAIN.JS — FULL WORKING VERSION
// Camera fixed, car fixed, imports fixed,
// progressive LOD, everything stabilized
// =============================================================

// ✅ IMPORTS
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { updateEnvironment } from './environment.js';
import { getPresetByName } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';


// =============================================================
// GLOBALS
// =============================================================
let renderer, scene, camera;
let world;
let car;
let velocity = 0;
let steering = 0;

const keys = { w:false, s:false, a:false, d:false };


// =============================================================
// INIT
// =============================================================
export function init() {

    // Canvas
    const canvas = document.getElementById('gameCanvas');

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(
        70, 
        window.innerWidth / window.innerHeight,
        0.1, 
        2000
    );
    camera.position.set(0, 3, 6);

    // World
    world = new World(scene);

    // Car
    const carGeo = new THREE.BoxGeometry(1, 0.5, 2);
    const carMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
    car = new THREE.Mesh(carGeo, carMat);
    car.position.set(0, 0.5, 0);
    scene.add(car);

    // Lighting
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(50, 200, 50);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));


    // Load default preset FIRST in ultra-low quality
    applyGraphicsPreset("Potato");

    // After load, smoothly upgrade to saved / real preset
    setTimeout(() => {
        const saved = localStorage.getItem("graphicsPreset") || "Normal Human";
        applyGraphicsPreset(saved);
    }, 1500);


    // Setup UI
    initSettingsUI();


    // Key listeners
    window.addEventListener('keydown', e => {
        if (keys[e.key] !== undefined) keys[e.key] = true;
    });
    window.addEventListener('keyup', e => {
        if (keys[e.key] !== undefined) keys[e.key] = false;
    });

    // Resize
    window.addEventListener('resize', onResize);

    animate();
}


// =============================================================
// APPLY PRESET
// =============================================================
export function applyGraphicsPreset(name) {
    const preset = getPresetByName(name);
    if (!preset) return;

    // Save for settings menu
    localStorage.setItem("graphicsPreset", name);

    // Render scale
    renderer.setPixelRatio(window.devicePixelRatio * preset.renderScale);

    // Camera far plane for long view distances
    camera.far = preset.viewDistance;
    camera.updateProjectionMatrix();

    // Environment tells world & effects to scale quality
    updateEnvironment(preset);

    console.log("✅ Graphics preset applied:", preset.name);
}


// =============================================================
// RESIZE HANDLING
// =============================================================
function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// =============================================================
// CAR PHYSICS + CAMERA FOLLOW
// =============================================================
function updateCar(delta) {

    // Acceleration / braking
    if (keys.w) velocity += 12 * delta;
    if (keys.s) velocity -= 12 * delta;

    // Drag
    velocity *= 0.99;

    // Limit speed
    velocity = THREE.MathUtils.clamp(velocity, -6, 19);

    // Steering
    if (keys.a) steering += 2 * delta;
    if (keys.d) steering -= 2 * delta;
    steering *= 0.92;

    // Move car
    car.rotation.y += steering;
    car.position.x += Math.sin(car.rotation.y) * velocity * delta;
    car.position.z += Math.cos(car.rotation.y) * velocity * delta;

    // Terrain height lock (simple)
    car.position.y = 0.5;
}


// =============================================================
// CAMERA FOLLOW SYSTEM
// =============================================================
function updateCamera(delta) {
    const targetPos = new THREE.Vector3(
        car.position.x - Math.sin(car.rotation.y) * 6,
        car.position.y + 3,
        car.position.z - Math.cos(car.rotation.y) * 6
    );

    camera.position.lerp(targetPos, 4 * delta);
    camera.lookAt(car.position);
}


// =============================================================
// ANIMATION LOOP
// =============================================================
function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(0.05, renderer.info.render.frame * 0.001 + 0.016);

    updateCar(delta);
    updateCamera(delta);

    world.update(delta);

    renderer.render(scene, camera);
}


// =============================================================
// START
// =============================================================
init();

