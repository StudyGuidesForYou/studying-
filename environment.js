// environment.js — Fully-featured terrain, trees, snow, rocks, physics-ready
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { SimplexNoise } from 'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.0/dist/esm/simplex-noise.js';

let ground = null;
let treeInstanced = null;
let rockInstanced = null;
let snowPoints = null;
const cachedMaterials = {};
const simplex = new SimplexNoise();

export function ensureMaterials() {
    if (cachedMaterials.ground) return;

    cachedMaterials.ground = new THREE.MeshStandardMaterial({
        color: 0x556B2F,
        roughness: 0.9,
        metalness: 0.1
    });

    cachedMaterials.rock = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.95,
        metalness: 0.05
    });

    cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x1E4D2B, roughness: 0.8 });
    cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff, roughness: 0.85 });
    cachedMaterials.snow = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true });
    console.log('[environment] materials cached');
}

export function initEnvironment(scene, preset = { terrainDetail: 128, treeDensity: 1, rockDensity: 0.3, snowParticles: 500 }) {
    ensureMaterials();
    cleanup(scene);

    // --- Scene Background & Fog ---
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(scene.background.getHex(), 0.0006);

    // --- Terrain ---
    const size = 2000;
    const seg = Math.max(16, preset.terrainDetail || 128);
    const geom = new THREE.PlaneGeometry(size, size, seg, seg);
    geom.rotateX(-Math.PI / 2);
    const pos = geom.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y =
            simplex.noise2D(x * 0.005, z * 0.005) * 20 +
            simplex.noise2D(x * 0.02, z * 0.02) * 6 +
            Math.random() * 2;
        pos.setY(i, y);
    }
    geom.computeVertexNormals();

    ground = new THREE.Mesh(geom, cachedMaterials.ground);
    ground.receiveShadow = true;
    ground.name = 'sr_ground';
    scene.add(ground);

    // --- Trees ---
    const treeCount = Math.floor(500 * (preset.treeDensity || 1));
    const treeGeo = new THREE.ConeGeometry(3, 12, 12);
    treeInstanced = new THREE.InstancedMesh(treeGeo, cachedMaterials.tree, treeCount);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCount; i++) {
        dummy.position.set(
            (Math.random() - 0.5) * size,
            0,
            (Math.random() - 0.5) * size
        );
        dummy.position.y = sampleHeightAtXY(dummy.position.x, dummy.position.z);
        dummy.scale.setScalar(0.6 + Math.random() * 1.2);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.updateMatrix();
        treeInstanced.setMatrixAt(i, dummy.matrix);
    }
    treeInstanced.castShadow = true;
    treeInstanced.name = 'sr_trees';
    scene.add(treeInstanced);

    // --- Rocks ---
    const rockCount = Math.floor(300 * (preset.rockDensity || 0.3));
    const rockGeo = new THREE.DodecahedronGeometry(2, 0);
    rockInstanced = new THREE.InstancedMesh(rockGeo, cachedMaterials.rock, rockCount);
    for (let i = 0; i < rockCount; i++) {
        dummy.position.set(
            (Math.random() - 0.5) * size,
            0,
            (Math.random() - 0.5) * size
        );
        dummy.position.y = sampleHeightAtXY(dummy.position.x, dummy.position.z);
        const s = 0.5 + Math.random() * 2.0;
        dummy.scale.set(s, s, s);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.updateMatrix();
        rockInstanced.setMatrixAt(i, dummy.matrix);
    }
    rockInstanced.castShadow = true;
    rockInstanced.name = 'sr_rocks';
    scene.add(rockInstanced);

    // --- Snow ---
    if (preset.snowParticles > 0) spawnSnow(scene, preset.snowParticles);

    console.log(`[environment] terrain ${seg}x${seg}, trees ${treeCount}, rocks ${rockCount}, snow ${preset.snowParticles}`);
}

function spawnSnow(scene, count) {
    const posArr = new Float32Array(count * 3);
    const spread = 1500;
    for (let i = 0; i < count; i++) {
        posArr[i * 3 + 0] = (Math.random() - 0.5) * spread;
        posArr[i * 3 + 1] = Math.random() * 400 + 20;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    snowPoints = new THREE.Points(geo, cachedMaterials.snow);
    snowPoints.name = 'sr_snow';
    scene.add(snowPoints);
}

export function updateEnvironment(dt) {
    // animate snow
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
    ['sr_trees', 'sr_rocks', 'sr_snow', 'sr_ground'].forEach(name => {
        const obj = scene.getObjectByName(name);
        if (!obj) return;
        try {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        } catch (e) { console.warn('[environment] cleanup error', e); }
        scene.remove(obj);
    });
}

// --- Physics helper: return terrain height ---
export function sampleHeightAtXY(x, z) {
    if (!ground) return 0;
    const geom = ground.geometry;
    const pos = geom.attributes.position;
    const seg = Math.sqrt(pos.count) - 1;
    const size = 2000;
    const half = size / 2;
    const dx = size / seg;

    const i = Math.floor((x + half) / dx);
    const j = Math.floor((z + half) / dx);
    const idx = j * (seg + 1) + i;
    if (idx >= 0 && idx < pos.count) return pos.getY(idx);
    return 0;
}
