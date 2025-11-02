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

  // Progressive LOD steps
  const lodSteps = [
    { detail: 0.2, treeDensity: 0.05, delay: 0 },   // Step 1: Very low detail
    { detail: 0.5, treeDensity: 0.3, delay: 1000 }, // Step 2: Medium detail
    { detail: 1.0, treeDensity: 1.0, delay: 2500 }  // Step 3: Full detail
  ];

  lodSteps.forEach(step => {
    setTimeout(() => {
      // Clean previous world if exists
      if (world) world.scene.children.forEach(obj => { 
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });

      // Create new world at this detail
      world = new World(scene, { worldMode: 'natural', dayNight: 'day', detail: step.detail, treeDensity: step.treeDensity });
      applyMode(scene, 'natural', { detail: step.detail, treeDensity: step.treeDensity });
    }, step.delay);
  });

  // UI button
  const btn = document.getElementById('graphicsBtn');
  const panel = document.getElementById('graphicsPanel');
  btn.addEventListener('click', () => panel.classList.toggle('hidden'));
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime) / 1000 || 0.016;
  lastTime = time;

  playerZ += 50 * dt;
  if (world) world.update(playerZ, dt);
  updateEnvironment(dt);

  camera.position.z = playerZ - 10;
  camera.lookAt(0, 2, playerZ + 50);

  renderer.render(scene, camera);
}
