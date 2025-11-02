// =========================================================
// main.js — FULL WORKING FILE
// =========================================================

// ----------------- IMPORTS -----------------
import * as THREE from "./three.module.js";
import { World } from "./world.js";
import { EnvironmentManager } from "./environment.js";
import { GRAPHICS_PRESETS, getPresetByName } from "./graphicsPresets.js";
import { initSettingsUI } from "./settings.js";

// ----------------- GLOBALS -----------------
let scene, camera, renderer, world, env;
let car = null;
let activePreset = "Potato";
let physicsEnabled = true;

// =========================================================
// SAFE FULL DEBUG REPORTING
// =========================================================
function reportSceneSummary(scene, world, opts = {}) {
    try {
        console.group("[DEBUG] Scene Summary");

        console.log("Renderer:", renderer ? {
            pixelRatio: window.devicePixelRatio,
            size: renderer.getSize(new THREE.Vector2())
        } : "NO RENDERER");

        console.log("Camera:", camera ? {
            position: camera.position.clone(),
            rotation: camera.rotation.clone(),
            fov: camera.fov,
            near: camera.near,
            far: camera.far
        } : "NO CAMERA");

        console.log("World:", world ? {
            roadPoints: world.points?.length,
            objectCount: world.group?.children?.length
        } : "NO WORLD");

        console.log("Scene Objects:", scene.children.map(o => o.type));

        console.log("Preset Applied:", opts.presetName || activePreset);

        console.groupEnd();
    } catch (err) {
        console.error("[DEBUG] Summary failed:", err);
    }
}

// =========================================================
// INITIAL SETUP
// =========================================================
function setupRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    camera.position.set(0, 5, -10);
}

function createCar() {
    const bodyGeo = new THREE.BoxGeometry(1.5, 0.6, 3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: "red" });
    const body = new THREE.Mesh(bodyGeo, bodyMat);

    car = new THREE.Object3D();
    car.add(body);

    scene.add(car);
}

// =========================================================
// APPLY GRAPHICS PRESET
// =========================================================
function applyPreset(name) {
    console.log("[UR] Applying preset", name);

    const preset = getPresetByName(name);
    if (!preset) {
        console.error("Preset not found:", name);
        return;
    }

    activePreset = name;

    if (env) {
        env.applyMode(name);
    }

    if (renderer) {
        renderer.setPixelRatio(window.devicePixelRatio * preset.renderScale);
    }

    reportSceneSummary(scene, world, { presetName: name });

    console.log("[UR] applyPreset finished");
}

// =========================================================
// MAIN INIT
// =========================================================
function init() {
    console.log("[UR] init start");

    scene = new THREE.Scene();

    setupRenderer();
    setupCamera();

    env = new EnvironmentManager(scene);
    world = new World(scene);

    createCar();
    setupControls();

    initSettingsUI(applyPreset);

    startProgressiveLoad();
}

// =========================================================
// CONTROLS
// =========================================================
let keys = {};
function setupControls() {
    window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
}

// =========================================================
// PROGRESSIVE LOAD
// =========================================================
function startProgressiveLoad() {
    applyPreset(activePreset);
    animate();
}

// =========================================================
// UPDATE LOOP
// =========================================================
function updatePhysics(delta) {
    if (!physicsEnabled || !car) return;

    if (keys["w"]) car.position.z += delta * 6;
    if (keys["s"]) car.position.z -= delta * 6;
    if (keys["a"]) car.position.x -= delta * 4;
    if (keys["d"]) car.position.x += delta * 4;

    // Very basic gravity stabilizer
    car.position.y = 0.3;
}

let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);

    let now = performance.now();
    let delta = (now - lastTime) / 1000;
    lastTime = now;

    updatePhysics(delta);
    updateCamera(delta);

    renderer.render(scene, camera);
}

function updateCamera() {
    if (!car || !camera) return;
    camera.position.lerp(
        new THREE.Vector3(
            car.position.x,
            car.position.y + 3,
            car.position.z - 8
        ),
        0.1
    );
    camera.lookAt(car.position);
}

// =========================================================
// RESIZE HANDLER
// =========================================================
window.addEventListener("resize", () => {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// =========================================================
// BOOTSTRAP
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    try {
        init();
    } catch (err) {
        console.error("[UR] init error", err);
    }
});
