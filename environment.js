// environment.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import SimplexNoise from 'https://cdn.jsdelivr.net/npm/simplex-noise@3.0.0/dist/esm/simplex-noise.js';

const noise = new SimplexNoise();
let ground = null;
let treeInstanced = null;
let snowPoints = null;
export const cachedMaterials = {};

export function ensureMaterials() {
  if (cachedMaterials.groundNat) return;
  cachedMaterials.groundNat = new THREE.MeshStandardMaterial({ color: 0x2b6b32, roughness: 0.95 });
  cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x114411 });
  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
}

export function sampleHeightAtXY(x, z) {
  return Math.sin(x * 0.01) * 6 + Math.cos(z * 0.01) * 3 + noise.noise2D(x/50, z/50)*2;
}

export function applyMode(scene, preset = { terrainDetail: 48, treeDensity: 1, snowParticles: 0 }, opts = {}) {
  ensureMaterials();
  cleanup(scene);

  const isWinter = preset.name?.toLowerCase().includes('snow') || false;
  const dayNight = opts.dayNight ?? 'day';
  scene.background = new THREE.Color(isWinter ? 0xEAF6FF : (dayNight==='night'?0x07122a:0x111111));
  scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter ? 0.0009 : 0.0006);

  // Ground
  const size = 2000;
  const seg = Math.max(8, Math.floor(preset.terrainDetail || 48));
  const geom = new THREE.PlaneGeometry(size, size, seg, seg);
  geom.rotateX(-Math.PI/2);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, sampleHeightAtXY(x, z));
  }
  geom.computeVertexNormals();
  const mat = isWinter ? cachedMaterials.groundSnow : cachedMaterials.groundNat;
  ground = new THREE.Mesh(geom, mat);
  ground.receiveShadow = true;
  ground.name = 'sr_ground';
  scene.add(ground);

  // Trees
  const treeCount = Math.min(3000, Math.floor(250 * (preset.treeDensity || 1)));
  const treeGeo = new THREE.ConeGeometry(3,12,8);
  const treeMat = isWinter ? cachedMaterials.treeWinter : cachedMaterials.tree;
  treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  const dummy = new THREE.Object3D();
  const spread = 800;
  for(let i=0;i<treeCount;i++){
    dummy.position.set((Math.random()-0.5)*spread, 6, (Math.random()-0.5)*spread);
    dummy.rotation.y = Math.random()*Math.PI*2;
    dummy.scale.setScalar(0.6+Math.random()*1.0);
    dummy.updateMatrix();
    treeInstanced.setMatrixAt(i,dummy.matrix);
  }
  treeInstanced.name='sr_trees';
  scene.add(treeInstanced);

  // Snow
  const snowCount = Math.max(0,preset.snowParticles||0);
  if(snowCount>0) spawnSnow(scene,snowCount);
}

function spawnSnow(scene,count){
  const posArr = new Float32Array(count*3);
  const spread = 1500;
  for(let i=0;i<count;i++){
    posArr[i*3+0]=(Math.random()-0.5)*spread;
    posArr[i*3+1]=Math.random()*400+20;
    posArr[i*3+2]=(Math.random()-0.5)*spread;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(posArr,3));
  const mat = new THREE.PointsMaterial({ size: 1.5, color:0xffffff, transparent:true });
  snowPoints = new THREE.Points(geo, mat);
  snowPoints.name='sr_snow';
  scene.add(snowPoints);
}

export function updateEnvironment(dt, t){
  if(snowPoints){
    const arr=snowPoints.geometry.attributes.position.array;
    for(let i=1;i<arr.length;i+=3){
      arr[i]-=80*dt;
      if(arr[i]<0) arr[i]=400+Math.random()*40;
    }
    snowPoints.geometry.attributes.position.needsUpdate=true;
  }
  if(ground){
    const pos=ground.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i), z=pos.getZ(i);
      pos.setY(i, sampleHeightAtXY(x,z)+Math.sin(t*0.4+x*0.01)*2);
    }
    pos.needsUpdate=true;
    ground.geometry.computeVertexNormals();
  }
}

export function cleanup(scene){
  ['sr_trees','sr_snow','sr_ground'].forEach(name=>{
    const obj=scene.getObjectByName(name);
    if(!obj) return;
    try{
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
    }catch(e){console.warn('[environment] cleanup error',e);}
    scene.remove(obj);
  });
}
