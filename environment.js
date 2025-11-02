// environment.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

let ground = null;
let treeInstanced = null;
let snowPoints = null;
const cachedMaterials = {};

export function ensureMaterials() {
  if (cachedMaterials.groundNat) return;
  cachedMaterials.groundNat = new THREE.MeshStandardMaterial({ color: 0x2b6b32, roughness: 0.95 });
  cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x114411 });
  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
  console.log('[environment] materials cached');
}

// applyMode: preset is the object from GraphicsPresets; supports progressive updates
export function applyMode(scene, preset = { terrainDetail: 48, treeDensity: 1, snowParticles: 0 }, opts = {}) {
  // opts reserved for future flags; keep API simple
  console.log('[environment] applyMode called, preset:', preset.name ?? preset);
  ensureMaterials();

  // remove previous (keeps cachedMaterials)
  cleanup(scene);

  // background / fog
  const dayNight = opts.dayNight ?? 'day';
  const isWinter = opts.worldMode === 'winter' || preset.name?.toLowerCase().includes('snow') || false;
  scene.background = new THREE.Color(isWinter ? 0xEAF6FF : (dayNight === 'night' ? 0x07122a : 0x8FCFFF));
  scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter ? 0.0009 : 0.0006);

  // ground creation with segments derived from preset
  const size = 2000;
  const seg = Math.max(8, Math.floor(preset.terrainDetail || 48));
  const geom = new THREE.PlaneGeometry(size, size, seg, seg);
  geom.rotateX(-Math.PI/2);

  // initial (seeded) heights - we keep them deterministic-ish
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = Math.sin(x * 0.01) * 6 + Math.cos(z * 0.01) * 3 + (Math.random() - 0.5) * 1.5;
    pos.setY(i, y);
  }
  geom.computeVertexNormals();

  const mat = isWinter ? cachedMaterials.groundSnow : cachedMaterials.groundNat;
  ground = new THREE.Mesh(geom, mat);
  ground.receiveShadow = true;
  ground.name = 'sr_ground';
  scene.add(ground);

  // trees (instanced)
  const detail = 1.0;
  const treeCount = Math.min(3000, Math.floor(250 * (preset.treeDensity || 1)));
  const treeGeo = new THREE.ConeGeometry(3 * detail, 12 * detail, 8);
  const treeMat = isWinter ? cachedMaterials.treeWinter : cachedMaterials.tree;
  treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  treeInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();
  const spread = 800;
  for (let i = 0; i < treeCount; i++) {
    dummy.position.set((Math.random() - 0.5) * spread, 6, (Math.random() - 0.5) * spread);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.setScalar(0.6 + Math.random() * 1.0);
    dummy.updateMatrix();
    treeInstanced.setMatrixAt(i, dummy.matrix);
  }
  treeInstanced.name = 'sr_trees';
  scene.add(treeInstanced);

  // snow particles if requested
  const snowCount = Math.max(0, preset.snowParticles || 0);
  if (isWinter && snowCount > 0) spawnSnow(scene, snowCount);

  console.log(`[environment] created ground seg=${seg}, trees=${treeCount}, snow=${snowCount}`);
}

function spawnSnow(scene, count) {
  const pos = new Float32Array(count * 3);
  const spread = 1500;
  for (let i = 0; i < count; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * 400 + 20;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true });
  snowPoints = new THREE.Points(geo, mat);
  snowPoints.name = 'sr_snow';
  scene.add(snowPoints);
  console.log('[environment] spawnSnow count=', count);
}

export function updateEnvironment(dt, time = performance.now() * 0.001) {
  // snow animate
  if (snowPoints) {
    const arr = snowPoints.geometry.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= 80 * dt;
      if (arr[i] < 0) arr[i] = 400 + Math.random() * 40;
    }
    snowPoints.geometry.attributes.position.needsUpdate = true;
  }
  // animate ground a little bit (waviness)
  if (ground) {
    const pos = ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = Math.sin(x * 0.01 + time * 0.4) * 4 + Math.cos(z * 0.01 + time * 0.2) * 2;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
  }
}

export function cleanup(scene) {
  ['sr_trees', 'sr_snow', 'sr_ground'].forEach(name => {
    const o = scene.getObjectByName(name);
    if (!o) return;
    try {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        // instanced mesh material is shared — avoid disposing shared cachedMaterials
        if (!Object.values(cachedMaterials).includes(o.material)) o.material.dispose();
      }
    } catch (e) {
      console.warn('[environment] cleanup issue', e);
    }
    scene.remove(o);
  });
  console.log('[environment] cleanup done');
}

console.log('[environment] module loaded');
