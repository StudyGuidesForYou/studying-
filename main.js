// File: main.js
// Basic ultra-realistic SlowRoads-style setup using Three.js
// Includes: Natural/Winter modes, detail + viewDistance settings

import * as THREE from 'three';

// SETTINGS (you will connect sliders/buttons to these later)
let WORLD_MODE = 'natural'; // 'natural' or 'winter'
let DETAIL = 1.0; // 0.5 low, 1 medium, 2 high
let VIEW_DISTANCE = 2000; // how far the world renders

// SCENE BASICS
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, VIEW_DISTANCE);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// LIGHTING
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(100, 200, 100);
sun.castShadow = true;
scene.add(sun);

// GROUND
let groundMesh;
function createGround() {
  const size = 20000;
  const geometry = new THREE.PlaneGeometry(size, size, 256 * DETAIL, 256 * DETAIL);
  const material = new THREE.MeshStandardMaterial({
    color: WORLD_MODE === 'winter' ? 0xffffff : 0x88cc66,
    roughness: 1,
    metalness: 0
  });
  groundMesh = new THREE.Mesh(geometry, material);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
}

// TREES
let treeGroup;
function createTrees() {
  treeGroup = new THREE.Group();
  const treeCount = 300 * DETAIL;

  for (let i = 0; i < treeCount; i++) {
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(5 * DETAIL, 20 * DETAIL, 8),
      new THREE.MeshStandardMaterial({ color: WORLD_MODE === 'winter' ? 0xe0e0e0 : 0x336633 })
    );
    tree.castShadow = true;
    tree.position.set(
      (Math.random() - 0.5) * 5000,
      10 * DETAIL,
      (Math.random() - 0.5) * 5000
    );
    treeGroup.add(tree);
  }

  scene.add(treeGroup);
}

// SNOW PARTICLES (for winter)
let snowParticles;
function createSnow() {
  if (WORLD_MODE !== 'winter') return;

  const count = 2000 * DETAIL;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 2000;
    positions[i * 3 + 1] = Math.random() * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  snowParticles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 2 * DETAIL })
  );

  scene.add(snowParticles);
}

// SWITCH WORLD MODE
export function setWorldMode(mode) {
  WORLD_MODE = mode;
  resetWorld();
}

// UPDATE DETAIL
export function setDetail(value) {
  DETAIL = value;
  resetWorld();
}

// UPDATE VIEW DISTANCE
export function setViewDistance(value) {
  VIEW_DISTANCE = value;
  camera.far = VIEW_DISTANCE;
  camera.updateProjectionMatrix();
}

// RESET WORLD (rebuild environment)
function resetWorld() {
  if (groundMesh) scene.remove(groundMesh);
  if (treeGroup) scene.remove(treeGroup);
  if (snowParticles) scene.remove(snowParticles);

  createGround();
  createTrees();
  createSnow();
}

// INITIAL BUILD
tresetWorld();

// ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);

  // animate snow falling
  if (snowParticles) {
    const arr = snowParticles.geometry.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= 1;
      if (arr[i] < 0) arr[i] = 400;
    }
    snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  camera.position.z -= 0.5 * DETAIL;

  renderer.render(scene, camera);
}

animate();
