// environment.js - Ultra-Maximal Environment v1.0
import * as THREE from 'three';
import { SimplexNoise } from './libs/simplex-noise.js';

let ground = null;
let treeGroup = null;
let propsGroup = null;
let snowPoints = null;
const cachedMaterials = {};
const objectPool = { trees: [], props: [] };
const simplex = new SimplexNoise();

export function ensureMaterials() {
    if (cachedMaterials.groundGrass) return;

    cachedMaterials.groundGrass = new THREE.MeshStandardMaterial({
        color: 0x4c8b3b,
        roughness: 0.9,
        metalness: 0,
        flatShading: false
    });

    cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
    });

    cachedMaterials.treeBark = new THREE.MeshStandardMaterial({
        color: 0x5a3b2b,
        roughness: 0.8,
    });

    cachedMaterials.treeLeaves = new THREE.MeshStandardMaterial({
        color: 0x1c5a1c,
        roughness: 0.7,
        metalness: 0,
    });

    cachedMaterials.rock = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.85,
    });

    cachedMaterials.bush = new THREE.MeshStandardMaterial({
        color: 0x2c6a2c,
        roughness: 0.9,
    });

    cachedMaterials.snowParticle = new THREE.PointsMaterial({
        size: 2.0,
        color: 0xffffff,
        transparent: true
    });

    console.log('[environment] materials cached');
}

// ------------------------
// Apply Environment Mode
// ------------------------
export function applyMode(scene, preset = { terrainDetail: 128, treeDensity: 1, snowParticles: 0, propDensity: 0.5 }, opts = {}) {
    ensureMaterials();
    cleanup(scene);

    const isWinter = preset.name?.toLowerCase().includes('snow') || false;
    const dayNight = opts.dayNight ?? 'day';
    scene.background = new THREE.Color(isWinter ? 0xEAF6FF : dayNight === 'night' ? 0x07122a : 0x87ceeb);
    scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter ? 0.0008 : 0.0005);

    // ---- Ground ----
    const size = 3000;
    const seg = Math.max(64, preset.terrainDetail || 128);
    const geom = new THREE.PlaneGeometry(size, size, seg, seg);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        // Multi-layered noise for hills, valleys, craters
        const y = simplex.noise2D(x * 0.002, z * 0.002) * 35 +
                  simplex.noise2D(x * 0.01, z * 0.01) * 12 +
                  Math.sin(x * 0.005) * 5 +
                  Math.cos(z * 0.005) * 5;
        pos.setY(i, y);
    }
    geom.computeVertexNormals();
    const mat = isWinter ? cachedMaterials.groundSnow : cachedMaterials.groundGrass;
    ground = new THREE.Mesh(geom, mat);
    ground.receiveShadow = true;
    ground.name = 'env_ground';
    scene.add(ground);

    // ---- Trees ----
    const treeCount = Math.min(5000, Math.floor(500 * (preset.treeDensity || 1)));
    treeGroup = new THREE.Group();
    treeGroup.name = 'env_trees';

    for (let i = 0; i < treeCount; i++) {
        let tree = objectPool.trees.pop();
        if (!tree) {
            tree = createTree();
        }

        const spread = size / 2 - 20;
        tree.position.set(
            (Math.random() - 0.5) * spread,
            0,
            (Math.random() - 0.5) * spread
        );
        tree.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.7 + Math.random() * 1.3;
        tree.scale.set(scale, scale, scale);
        treeGroup.add(tree);
    }
    scene.add(treeGroup);

    // ---- Props: rocks and bushes ----
    const propCount = Math.floor(400 * (preset.propDensity || 0.5));
    propsGroup = new THREE.Group();
    propsGroup.name = 'env_props';

    for (let i = 0; i < propCount; i++) {
        let prop = objectPool.props.pop();
        if (!prop) prop = createProp();

        const spread = size / 2 - 20;
        prop.position.set(
            (Math.random() - 0.5) * spread,
            0,
            (Math.random() - 0.5) * spread
        );
        prop.rotation.y = Math.random() * Math.PI * 2;
        const scale = 0.5 + Math.random() * 1.5;
        prop.scale.set(scale, scale, scale);
        propsGroup.add(prop);
    }
    scene.add(propsGroup);

    // ---- Snow ----
    const snowCount = Math.max(0, preset.snowParticles || 0);
    if (snowCount > 0) spawnSnow(scene, snowCount);

    console.log(`[environment] terrain seg=${seg}, trees=${treeCount}, props=${propCount}, snow=${snowCount}`);
}

// ------------------------
// Create a detailed tree
// ------------------------
function createTree() {
    const tree = new THREE.Group();

    // trunk
    const trunkGeo = new THREE.CylinderGeometry(0.5, 0.5, 6, 12);
    const trunkMesh = new THREE.Mesh(trunkGeo, cachedMaterials.treeBark);
    trunkMesh.position.y = 3;
    trunkMesh.castShadow = true;
    tree.add(trunkMesh);

    // leaves (LOD)
    const leavesGeo = new THREE.ConeGeometry(2, 6, 12);
    const leavesMesh = new THREE.Mesh(leavesGeo, cachedMaterials.treeLeaves);
    leavesMesh.position.y = 6;
    leavesMesh.castShadow = true;
    tree.add(leavesMesh);

    return tree;
}

// ------------------------
// Create rocks/bush props
// ------------------------
function createProp() {
    const type = Math.random() < 0.6 ? 'rock' : 'bush';
    let mesh;
    if (type === 'rock') {
        const geo = new THREE.DodecahedronGeometry(1 + Math.random() * 1.5);
        mesh = new THREE.Mesh(geo, cachedMaterials.rock);
    } else {
        const geo = new THREE.IcosahedronGeometry(1 + Math.random(), 1);
        mesh = new THREE.Mesh(geo, cachedMaterials.bush);
    }
    mesh.castShadow = true;
    return mesh;
}

// ------------------------
// Snow particle system
// ------------------------
function spawnSnow(scene, count) {
    const posArr = new Float32Array(count * 3);
    const spread = 2000;
    for (let i = 0; i < count; i++) {
        posArr[i * 3 + 0] = (Math.random() - 0.5) * spread;
        posArr[i * 3 + 1] = Math.random() * 400 + 20;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    snowPoints = new THREE.Points(geo, cachedMaterials.snowParticle);
    snowPoints.name = 'env_snow';
    scene.add(snowPoints);
}

// ------------------------
// Animate environment
// ------------------------
export function updateEnvironment(dt, time = performance.now() * 0.001) {
    // sway trees and props
    if (treeGroup) {
        treeGroup.children.forEach(tree => {
            tree.rotation.y += Math.sin(time + tree.position.x * 0.01) * 0.001;
        });
    }

    if (propsGroup) {
        propsGroup.children.forEach(prop => {
            prop.rotation.y += Math.sin(time + prop.position.x * 0.01) * 0.0005;
        });
    }

    // snow
    if (snowPoints) {
        const arr = snowPoints.geometry.attributes.position.array;
        for (let i = 1; i < arr.length; i += 3) {
            arr[i] -= 100 * dt;
            if (arr[i] < 0) arr[i] = 400 + Math.random() * 40;
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
    }
}

// ------------------------
// Cleanup and pooling
// ------------------------
export function cleanup(scene) {
    ['env_trees', 'env_props', 'env_ground', 'env_snow'].forEach(name => {
        const obj = scene.getObjectByName(name);
        if (!obj) return;
        try {
            // pool trees and props
            if (name === 'env_trees') obj.children.forEach(child => objectPool.trees.push(child));
            if (name === 'env_props') obj.children.forEach(child => objectPool.props.push(child));

            if (obj.geometry) obj.geometry.dispose();
            if (obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
        } catch (e) {
            console.warn('[environment] cleanup error', e);
        }
        scene.remove(obj);
    });
}
