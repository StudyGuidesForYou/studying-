import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

let ground = null;
let treeInstanced = null;
let snowPoints = null;
let cachedMaterials = {};

function ensureMaterials() {
  if (cachedMaterials.groundNat) return;

  cachedMaterials.groundNat = new THREE.MeshStandardMaterial({ color: 0x2b6b32, roughness: 0.95, metalness: 0 });
  cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x114411 });
  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
}

export function applyMode(scene, mode = 'natural', opts = {}) {
  const detail = Math.max(0.3, opts.detail ?? 1.0);
  const treeDensity = Math.max(0, opts.treeDensity ?? 1.0);
  const dayNight = opts.dayNight ?? 'day';

  ensureMaterials();
  cleanup(scene);

  // Sky + fog
  if (mode === 'winter') {
    scene.background = new THREE.Color(0xEAF6FF);
    scene.fog = new THREE.FogExp2(0xDDEEFF, 0.0009 / Math.max(0.4, detail));
  } else {
    scene.background = new THREE.Color(dayNight === 'night' ? 0x07122a : 0x8FCFFF);
    scene.fog = new THREE.FogExp2(scene.background.getHex(), 0.0006 / Math.max(0.4, detail));
  }

  // Ground
  const size = 20000;
  const seg = Math.max(16, Math.floor(64 * detail));
  const groundGeo = new THREE.PlaneGeometry(size, size, seg, seg);
  const mat = mode === 'winter' ? cachedMaterials.groundSnow : cachedMaterials.groundNat;
  ground = new THREE.Mesh(groundGeo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'sr_ground';
  scene.add(ground);

  // Trees
  const baseTreeGeo = new THREE.ConeGeometry(3 * detail, 12 * detail, 8);
  const matTree = mode === 'winter' ? cachedMaterials.treeWinter : cachedMaterials.tree;
  const treeCount = Math.min(1200, Math.floor(250 * treeDensity * detail));
  treeInstanced = new THREE.InstancedMesh(baseTreeGeo, matTree, treeCount);
  treeInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const spread = 8000 * Math.max(0.4, detail);
  for (let i = 0; i < treeCount; i++) {
    dummy.position.set((Math.random() - 0.5) * spread, 6 * detail, (Math.random() - 0.5) * spread);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
    dummy.updateMatrix();
    treeInstanced.setMatrixAt(i, dummy.matrix);
  }
  treeInstanced.name = 'sr_trees';
  treeInstanced.castShadow = true;
  scene.add(treeInstanced);

  // Snow
  if (mode === 'winter') spawnSnow(scene, detail);
}

function spawnSnow(scene, detail) {
  const count = Math.floor(1500 * detail);
  const pos = new Float32Array(count * 3);
  const spread = 1500;
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * 400 + 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 1.5 * detail, color: 0xffffff, transparent: true, opacity: 0.95 });
  snowPoints = new THREE.Points(geo, mat);
  snowPoints.name = 'sr_snow';
  scene.add(snowPoints);
}

export function updateEnvironment(dt) {
  if (snowPoints) {
    const arr = snowPoints.geometry.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= 80 * dt;
      if (arr[i] < 0) arr[i] = 400 + Math.random() * 40;
    }
    snowPoints.geometry.attributes.position.needsUpdate = true;
  }
}

export function cleanup(scene) {
  ['sr_ground','sr_trees','sr_snow'].forEach(name => {
    const obj = scene.getObjectByName(name);
    if(obj) {
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material && name==='sr_snow') obj.material.dispose();
      scene.remove(obj);
    }
  });
}
