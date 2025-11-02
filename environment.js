// environment.js (Improved)
// Uses Simplex noise for terrain, better materials, and optional sky.

import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { SimplexNoise } from 'https://unpkg.com/simplex-noise@3.0.0/simplex-noise.js';

let ground = null, treeInstanced = null, snowPoints = null;
const cachedMaterials = {};

export function ensureMaterials() {
  if (cachedMaterials.groundSand) return;
  // Ground textures (you can add normal/roughness maps here)
  cachedMaterials.groundSand = new THREE.MeshStandardMaterial({ color: 0x886633, metalness: 0.1, roughness: 0.9 });
  cachedMaterials.groundGrass = new THREE.MeshStandardMaterial({ color: 0x2b8a3e, metalness: 0.0, roughness: 0.8 });
  cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xeeeeff, metalness: 0.0, roughness: 0.9 });
  // Tree materials: bark and leaf (winter/summer)
  cachedMaterials.treeBark = new THREE.MeshStandardMaterial({ color: 0x554422 });
  cachedMaterials.treeLeaf = new THREE.MeshStandardMaterial({ color: 0x227722 });
  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
  console.log('[Environment] Materials initialized');
}

export function applyMode(scene, preset = { terrainDetail:48, treeDensity:1, snowParticles:0, name:'' }, opts = {}) {
  ensureMaterials();
  cleanup(scene);

  const isWinter = preset.name.toLowerCase().includes('snow');
  const dayNight = opts.dayNight ?? 'day';
  // Background: use gradient or sky shader (here just color/fog as example)
  scene.background = new THREE.Color(isWinter ? 0xEAF6FF : (dayNight === 'night' ? 0x07122a : 0x87ceeb));
  scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter ? 0.0009 : 0.0006);

  // Ground: generate plane geometry
  const size = 2000;
  const seg = Math.max(16, Math.floor(preset.terrainDetail || 48));
  const geom = new THREE.PlaneGeometry(size, size, seg, seg);
  geom.rotateX(-Math.PI / 2);

  // Apply Perlin/simplex noise for heightmap
  const noise = new SimplexNoise();
  const positions = geom.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    // Combine large-scale and fine noise
    const hillHeight = noise.noise2D(x * 0.005, z * 0.005) * 20;
    const smallNoise = noise.noise2D(x * 0.05, z * 0.05) * 4;
    positions.setY(i, hillHeight + smallNoise);
  }
  geom.computeVertexNormals();
  // Use seasonal material
  const groundMat = isWinter ? cachedMaterials.groundSnow : (dayNight === 'night' ? cachedMaterials.groundGrass : cachedMaterials.groundGrass);
  ground = new THREE.Mesh(geom, groundMat);
  ground.receiveShadow = true;
  ground.name = 'sr_ground';
  scene.add(ground);

  // Trees: instanced cones or loaded model
  const treeCount = Math.min(5000, Math.floor(300 * (preset.treeDensity || 1)));
  const treeGeo = new THREE.ConeGeometry(3, 12, 8);
  const treeMat = isWinter ? cachedMaterials.treeWinter : cachedMaterials.treeLeaf;
  treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  const dummy = new THREE.Object3D();
  const spread = 900;
  for (let i = 0; i < treeCount; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * spread,
      0,
      (Math.random() - 0.5) * spread
    );
    // sample terrain height for tree base
    const idx = Math.floor((dummy.position.x + size/2) / size * seg);
    const jdx = Math.floor((dummy.position.z + size/2) / size * seg);
    if (ground && idx>=0 && idx<=seg && jdx>=0 && jdx<=seg) {
      const hi = jdx * (seg+1) + idx;
      const hy = positions.getY(hi);
      dummy.position.y = hy + 6; // 6 is half-height of tree
    }
    dummy.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.5 + Math.random() * 1.0;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    treeInstanced.setMatrixAt(i, dummy.matrix);
  }
  treeInstanced.name = 'sr_trees';
  scene.add(treeInstanced);

  // Snow Particles
  const snowCount = Math.max(0, preset.snowParticles || 0);
  if (snowCount > 0) {
    spawnSnow(scene, snowCount);
  }
  console.log(`[Environment] Terraindetail=${seg}, Trees=${treeCount}, Snow=${snowCount}`);
}

function spawnSnow(scene, count) {
  const vertices = new Float32Array(count * 3);
  const spread = 1500;
  for (let i = 0; i < count; i++) {
    vertices[i*3]   = (Math.random() - 0.5) * spread;
    vertices[i*3+1] = Math.random() * 400 + 20;
    vertices[i*3+2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const mat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.8 });
  snowPoints = new THREE.Points(geo, mat);
  snowPoints.name = 'sr_snow';
  scene.add(snowPoints);
}

export function updateEnvironment(dt, elapsedTime = performance.now() * 0.001) {
  if (snowPoints) {
    const pos = snowPoints.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i+=3) {
      pos[i] -= 80 * dt;
      if (pos[i] < 0) pos[i] = 400 + Math.random() * 40;
    }
    snowPoints.geometry.attributes.position.needsUpdate = true;
  }
  // Optional dynamic ground movement (e.g. waves or animate fog)
  if (ground) {
    // Example: slowly change vertex heights for gentle movement
    const positions = ground.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const offset = Math.sin(elapsedTime * 0.1 + x * 0.01) * 0.5;
      positions.setY(i, positions.getY(i) + offset * dt);
    }
    positions.needsUpdate = true;
    ground.geometry.computeVertexNormals();
  }
}

export function cleanup(scene) {
  ['sr_trees', 'sr_snow', 'sr_ground'].forEach(name => {
    const obj = scene.getObjectByName(name);
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
    scene.remove(obj);
  });
}
