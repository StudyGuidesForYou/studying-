import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets } from './graphicsPresets.js';

let scene, camera, renderer;
let world;
let playerZ = 0;
let lastTime = 0;

init();
animate();

function init() {
  const canvas = document.getElementById("gameCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, GraphicsPresets[2].viewDistance);
  camera.position.set(0, 4, -10);
  camera.lookAt(0, 2, 50);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 50, 20);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  // 1️⃣ Load world with low detail first
  const lowDetailOpts = { worldMode: 'natural', dayNight: 'day', detail: 0.3, treeDensity: 0.1 };
  world = new World(scene, lowDetailOpts);

  applyMode(scene, 'natural', lowDetailOpts);

  // 2️⃣ After 2 seconds, upgrade to default
  setTimeout(() => {
    const defaultOpts = { worldMode: 'natural', dayNight: 'day', detail: 1, treeDensity: 1 };
    world = new World(scene, defaultOpts);
    applyMode(scene, 'natural', defaultOpts);

    // Update camera far plane based on preset
    camera.far = GraphicsPresets[2].viewDistance;
    camera.updateProjectionMatrix();
  }, 2000); // 2 seconds delay, you can increase if needed

  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn.addEventListener('click', () => panel.classList.toggle('hidden'));
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime) / 1000 || 0.016;
  lastTime = time;

  playerZ += 50 * dt;
  world.update(playerZ, dt);
  updateEnvironment(dt);

  camera.position.z = playerZ - 10;
  camera.lookAt(0, 2, playerZ + 50);

  renderer.render(scene, camera);
}
