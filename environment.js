// environment.js — AAA-level terrain, vegetation, weather, and physics
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import SimplexNoise from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/dist/esm/simplex-noise.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

let groundMesh = null;
let treeMeshes = [];
let rockMeshes = [];
let snowPoints = null;
let waterMesh = null;
let sunLight = null;
let ambientLight = null;

const cachedMaterials = {};
const simplex = new SimplexNoise(Math.random);

export function ensureMaterials() {
  if (cachedMaterials.ground) return;

  // Ultra-realistic ground
  cachedMaterials.ground = new THREE.MeshStandardMaterial({
    color: 0x2b6b32,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: false,
  });

  cachedMaterials.rock = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 1.0,
    metalness: 0.0,
  });

  cachedMaterials.tree = new THREE.MeshStandardMaterial({
    color: 0x114411,
    roughness: 0.85,
    metalness: 0.1,
  });

  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({
    color: 0xeeeeff,
    roughness: 0.9,
    metalness: 0.05,
  });

  cachedMaterials.snow = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    transparent: true,
    opacity: 0.85,
  });

  cachedMaterials.water = new THREE.MeshStandardMaterial({
    color: 0x3f76e4,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });

  console.log('[environment] cached materials initialized');
}

// -----------------------------
// Apply full environment mode
// -----------------------------
export function applyMode(scene, preset = {}, opts = {}) {
  ensureMaterials();
  cleanup(scene);

  const isWinter = preset.name?.toLowerCase().includes('snow') || false;
  const dayNight = opts.dayNight ?? 'day';
  const terrainDetail = preset.terrainDetail || 128;
  const treeDensity = preset.treeDensity || 1;
  const snowCount = preset.snowParticles || 0;

  // Scene background + fog
  scene.background = new THREE.Color(isWinter ? 0xeaf6ff : dayNight === 'night' ? 0x07122a : 0x8fcfff);
  scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter ? 0.0009 : 0.0006);

  // Ground mesh
  createGround(scene, terrainDetail, isWinter);

  // Trees + rocks
  createTrees(scene, treeDensity, isWinter);
  createRocks(scene, terrainDetail);

  // Snow
  if (snowCount > 0) spawnSnow(scene, snowCount);

  // Water
  createWater(scene);

  // Lights
  createLights(scene, dayNight);

  console.log(`[environment] applied: terrain=${terrainDetail}, trees=${treeDensity}, snow=${snowCount}`);
}

// -----------------------------
// Create procedural ground
// -----------------------------
function createGround(scene, segments=128, isWinter=false) {
  const size = 2000;
  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI/2);

  const pos = geom.attributes.position;
  for(let i=0; i<pos.count; i++){
    const x = pos.getX(i);
    const z = pos.getZ(i);
    let y = sampleHeightAtXY(x,z);
    pos.setY(i, y);
  }
  geom.computeVertexNormals();

  const mat = cachedMaterials.ground;
  groundMesh = new THREE.Mesh(geom, mat);
  groundMesh.receiveShadow = true;
  groundMesh.name = 'groundMesh';
  scene.add(groundMesh);
}

// -----------------------------
// Sample terrain height
// -----------------------------
export function sampleHeightAtXY(x, z){
  const scale = 0.003;
  const y = simplex.noise2D(x*scale, z*scale)*15 + simplex.noise2D(x*scale*2, z*scale*2)*5;
  return y;
}

// -----------------------------
// Trees
// -----------------------------
function createTrees(scene, density=1, isWinter=false){
  const count = Math.floor(300 * density);
  const treeGeo = new THREE.ConeGeometry(3, 12, 16);
  const treeMat = isWinter ? cachedMaterials.treeWinter : cachedMaterials.tree;

  for(let i=0; i<count; i++){
    const mesh = new THREE.Mesh(treeGeo, treeMat);
    mesh.castShadow=true;

    const x = (Math.random()-0.5)*1600;
    const z = (Math.random()-0.5)*1600;
    const y = sampleHeightAtXY(x,z);

    mesh.position.set(x,y,z);
    mesh.rotation.y = Math.random()*Math.PI*2;
    mesh.scale.setScalar(0.7+Math.random()*1.2);
    scene.add(mesh);
    treeMeshes.push(mesh);
  }
}

// -----------------------------
// Rocks
// -----------------------------
function createRocks(scene, terrainDetail){
  const count = 100;
  const geo = new THREE.DodecahedronGeometry(1,0);
  const mat = cachedMaterials.rock;

  for(let i=0;i<count;i++){
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow=true;
    const x = (Math.random()-0.5)*1600;
    const z = (Math.random()-0.5)*1600;
    const y = sampleHeightAtXY(x,z);
    mesh.position.set(x,y,z);
    mesh.scale.setScalar(0.5+Math.random()*1.5);
    scene.add(mesh);
    rockMeshes.push(mesh);
  }
}

// -----------------------------
// Snow particles
// -----------------------------
function spawnSnow(scene, count){
  const posArr = new Float32Array(count*3);
  const spread = 1500;
  for(let i=0;i<count;i++){
    posArr[i*3+0] = (Math.random()-0.5)*spread;
    posArr[i*3+1] = Math.random()*400+20;
    posArr[i*3+2] = (Math.random()-0.5)*spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr,3));
  snowPoints = new THREE.Points(geo, cachedMaterials.snow);
  snowPoints.name='snowPoints';
  scene.add(snowPoints);
}

// -----------------------------
// Water
// -----------------------------
function createWater(scene){
  const size=2000;
  const geom = new THREE.PlaneGeometry(size, size, 1, 1);
  geom.rotateX(-Math.PI/2);
  const mesh = new THREE.Mesh(geom, cachedMaterials.water);
  mesh.position.y=-2; // water level
  mesh.name='waterMesh';
  mesh.receiveShadow=true;
  scene.add(mesh);
  waterMesh = mesh;
}

// -----------------------------
// Lights
// -----------------------------
function createLights(scene, dayNight){
  sunLight = new THREE.DirectionalLight(dayNight==='night'?0x8899ff:0xffffff, 1.0);
  sunLight.position.set(150,200,150);
  sunLight.castShadow=true;
  sunLight.shadow.mapSize.set(2048,2048);
  scene.add(sunLight);

  ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0x88aaff,0x443322,0.25);
  scene.add(hemi);
}

// -----------------------------
// Environment update (snow + animated ground)
// -----------------------------
export function updateEnvironment(dt, time=performance.now()*0.001){
  // Snow
  if(snowPoints){
    const arr = snowPoints.geometry.attributes.position.array;
    for(let i=1;i<arr.length;i+=3){
      arr[i]-=50*dt;
      if(arr[i]<0) arr[i]=400+Math.random()*40;
    }
    snowPoints.geometry.attributes.position.needsUpdate=true;
  }

  // Wavy terrain animation
  if(groundMesh){
    const pos = groundMesh.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, sampleHeightAtXY(x,z)+Math.sin(x*0.01+time*0.4)*2 + Math.cos(z*0.01+time*0.2)*1);
    }
    pos.needsUpdate=true;
    groundMesh.geometry.computeVertexNormals();
  }
}

// -----------------------------
// Cleanup
// -----------------------------
export function cleanup(scene){
  [groundMesh, waterMesh, snowPoints, ...treeMeshes, ...rockMeshes].forEach(obj=>{
    if(!obj) return;
    try{
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
    }catch(e){}
    if(scene) scene.remove(obj);
  });
  groundMesh=null; waterMesh=null; snowPoints=null; treeMeshes=[]; rockMeshes=[];
}
