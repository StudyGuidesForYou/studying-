// environment.js — ultimate environment, procedural terrain, trees, rocks, snow
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { SimplexNoise } from 'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.0/dist/esm/simplex-noise.js';

let ground, treeInstanced, rockInstanced, snowPoints;
const cachedMaterials = {};

export function ensureMaterials() {
    if (cachedMaterials.ground) return;
    cachedMaterials.ground = new THREE.MeshStandardMaterial({ color: 0x4a3f2b, roughness: 0.8 });
    cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xf0f0ff, roughness: 0.9 });
    cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x115511, roughness: 0.7 });
    cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    cachedMaterials.rock = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    cachedMaterials.rockSnow = new THREE.MeshStandardMaterial({ color: 0xddddff, roughness: 0.95 });
}

export function initEnvironment(scene, preset = { terrainDetail: 128, treeDensity: 1, rockDensity: 0.3, snowParticles: 500 }) {
    ensureMaterials();
    cleanup(scene);

    const noise = new SimplexNoise();
    const isWinter = preset.snowParticles > 0;
    const size = 2000;
    const seg = Math.max(8, Math.floor(preset.terrainDetail));
    const geom = new THREE.PlaneGeometry(size, size, seg, seg);
    geom.rotateX(-Math.PI / 2);

    // Procedural terrain heights
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = (noise.noise2D(x * 0.002, z * 0.002) * 25) +
                  (noise.noise2D(x * 0.01, z * 0.01) * 10);
        pos.setY(i, y);
    }
    geom.computeVertexNormals();
    ground = new THREE.Mesh(geom, isWinter ? cachedMaterials.groundSnow : cachedMaterials.ground);
    ground.receiveShadow = true;
    ground.name = 'sr_ground';
    scene.add(ground);

    // Trees
    const treeCount = Math.min(5000, Math.floor(300 * preset.treeDensity));
    const treeGeo = new THREE.ConeGeometry(2 + Math.random() * 1, 8 + Math.random() * 4, 8);
    const treeMat = isWinter ? cachedMaterials.treeWinter : cachedMaterials.tree;
    treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
        const x = (Math.random() - 0.5) * size * 0.9;
        const z = (Math.random() - 0.5) * size * 0.9;
        const y = sampleHeightAtXY(x, z, ground) || 0;
        dummy.position.set(x, y, z);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.scale.setScalar(0.5 + Math.random() * 1.2);
        dummy.updateMatrix();
        treeInstanced.setMatrixAt(i, dummy.matrix);
    }
    treeInstanced.castShadow = true;
    treeInstanced.name = 'sr_trees';
    scene.add(treeInstanced);

    // Rocks
    const rockCount = Math.min(1000, Math.floor(200 * (preset.rockDensity || 0.3)));
    const rockGeo = new THREE.DodecahedronGeometry(1 + Math.random(), 0);
    const rockMat = isWinter ? cachedMaterials.rockSnow : cachedMaterials.rock;
    rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    for (let i = 0; i < rockCount; i++) {
        const x = (Math.random() - 0.5) * size * 0.9;
        const z = (Math.random() - 0.5) * size * 0.9;
        const y = sampleHeightAtXY(x, z, ground) || 0;
        dummy.position.set(x, y, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        dummy.scale.setScalar(0.3 + Math.random() * 1.2);
        dummy.updateMatrix();
        rockInstanced.setMatrixAt(i, dummy.matrix);
    }
    rockInstanced.castShadow = true;
    rockInstanced.name = 'sr_rocks';
    scene.add(rockInstanced);

    // Snow
    const snowCount = preset.snowParticles || 0;
    if (snowCount > 0) spawnSnow(scene, snowCount);
}

function spawnSnow(scene, count) {
    const positions = new Float32Array(count * 3);
    const spread = 1500;
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * spread;
        positions[i * 3 + 1] = Math.random() * 400 + 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true });
    snowPoints = new THREE.Points(geo, mat);
    snowPoints.name = 'sr_snow';
    scene.add(snowPoints);
}

export function updateEnvironment(dt) {
    // Snow fall
    if (snowPoints) {
        const arr = snowPoints.geometry.attributes.position.array;
        for (let i = 1; i < arr.length; i += 3) {
            arr[i] -= 60 * dt;
            if (arr[i] < 0) arr[i] = 400 + Math.random() * 50;
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
    }

    // Animate terrain subtly
    if (ground) {
        const pos = ground.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            pos.setY(i, pos.getY(i) + Math.sin(Date.now() * 0.0001 + x * 0.01) * 0.01);
        }
        pos.needsUpdate = true;
        ground.geometry.computeVertexNormals();
    }
}

export function cleanup(scene) {
    ['sr_trees', 'sr_rocks', 'sr_ground', 'sr_snow'].forEach(name => {
        const obj = scene.getObjectByName(name);
        if (!obj) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
        scene.remove(obj);
    });
}

export function sampleHeightAtXY(x, z, groundMesh) {
    if (!groundMesh) return 0;
    const pos = groundMesh.geometry.attributes.position;
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
