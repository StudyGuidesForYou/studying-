// environment.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

// Inline Simplex Noise (lightweight)
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    this.p = [];
    for(let i=0;i<256;i++) this.p[i] = Math.floor(seed*256);
    this.perm = [];
    for(let i=0;i<512;i++) this.perm[i] = this.p[i & 255];
  }
  dot(g,x,y) { return g[0]*x+g[1]*y; }
  noise(xin,yin){
    const F2 = 0.5*(Math.sqrt(3)-1), G2=(3-Math.sqrt(3))/6;
    let n0,n1,n2;
    const s = (xin+yin)*F2;
    const i = Math.floor(xin+s);
    const j = Math.floor(yin+s);
    const t = (i+j)*G2;
    const X0=i-t, Y0=j-t, x0=xin-X0, y0=yin-Y0;
    let i1,j1;
    if(x0>y0){i1=1;j1=0;}else{i1=0;j1=1;}
    const x1=x0-i1+G2, y1=y0-j1+G2;
    const x2=x0-1+2*G2, y2=y0-1+2*G2;
    const ii=i & 255, jj=j & 255;
    const gi0=this.perm[ii+this.perm[jj]] % 12;
    const gi1=this.perm[ii+i1+this.perm[jj+j1]] % 12;
    const gi2=this.perm[ii+1+this.perm[jj+1]] % 12;
    let t0=0.5-x0*x0-y0*y0;
    n0=t0<0?0:Math.pow(t0,4)*this.dot(this.grad3[gi0],x0,y0);
    let t1=0.5-x1*x1-y1*y1;
    n1=t1<0?0:Math.pow(t1,4)*this.dot(this.grad3[gi1],x1,y1);
    let t2=0.5-x2*x2-y2*y2;
    n2=t2<0?0:Math.pow(t2,4)*this.dot(this.grad3[gi2],x2,y2);
    return 70*(n0+n1+n2);
  }
}

let ground = null, treeInstanced=null, snowPoints=null;
const cachedMaterials = {};
const noise = new SimplexNoise();

export function ensureMaterials(){
  if(cachedMaterials.groundNat) return;
  cachedMaterials.groundNat = new THREE.MeshStandardMaterial({ color: 0x2b6b32, roughness: 0.95 });
  cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x114411 });
  cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
  cachedMaterials.road = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
  console.log('[environment] materials cached');
}

export function applyMode(scene, preset={terrainDetail:64,treeDensity:1,snowParticles:0}, opts={}){
  ensureMaterials();
  cleanup(scene);

  const isWinter = preset.name?.toLowerCase().includes('snow') || false;
  const dayNight = opts.dayNight ?? 'day';
  scene.background = new THREE.Color(isWinter ? 0xEAF6FF : (dayNight==='night'?0x07122a:0x8FCFFF));
  scene.fog = new THREE.FogExp2(scene.background.getHex(), isWinter?0.0009:0.0006);

  // Ground
  const size = 2000, seg = Math.max(8, preset.terrainDetail||64);
  const geom = new THREE.PlaneGeometry(size,size,seg,seg);
  geom.rotateX(-Math.PI/2);
  const pos = geom.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i), z=pos.getZ(i);
    const y = noise.noise(x*0.005, z*0.005)*5 + Math.random();
    pos.setY(i,y);
  }
  geom.computeVertexNormals();
  const mat = isWinter?cachedMaterials.groundSnow:cachedMaterials.groundNat;
  ground = new THREE.Mesh(geom, mat);
  ground.receiveShadow = true; ground.name='sr_ground';
  scene.add(ground);

  // Trees
  const treeCount = Math.min(5000, Math.floor(300*(preset.treeDensity||1)));
  const treeGeo = new THREE.ConeGeometry(3,12,12);
  const treeMat = isWinter?cachedMaterials.treeWinter:cachedMaterials.tree;
  treeInstanced = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
  const dummy = new THREE.Object3D();
  for(let i=0;i<treeCount;i++){
    dummy.position.set((Math.random()-0.5)*1000,0,(Math.random()-0.5)*1000);
    dummy.position.y = sampleHeightAtXY(dummy.position.x,dummy.position.z);
    dummy.rotation.y=Math.random()*Math.PI*2;
    dummy.scale.setScalar(0.6+Math.random());
    dummy.updateMatrix();
    treeInstanced.setMatrixAt(i,dummy.matrix);
  }
  treeInstanced.name='sr_trees'; scene.add(treeInstanced);

  // Snow
  const snowCount = Math.max(0,preset.snowParticles||0);
  if(snowCount>0) spawnSnow(scene,snowCount);

  console.log(`[environment] ground seg=${seg}, trees=${treeCount}, snow=${snowCount}`);
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
  geo.setAttribute('position', new THREE.BufferAttribute(posArr,3));
  const mat = new THREE.PointsMaterial({ size:1.5, color:0xffffff, transparent:true });
  snowPoints = new THREE.Points(geo, mat);
  snowPoints.name='sr_snow'; scene.add(snowPoints);
}

export function updateEnvironment(dt,t=performance.now()*0.001){
  if(snowPoints){
    const arr = snowPoints.geometry.attributes.position.array;
    for(let i=1;i<arr.length;i+=3){
      arr[i]-=80*dt;
      if(arr[i]<0) arr[i]=400+Math.random()*40;
    }
    snowPoints.geometry.attributes.position.needsUpdate=true;
  }
  if(ground){
    const pos = ground.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i), z=pos.getZ(i);
      const y = noise.noise(x*0.005+ t*0.4, z*0.005+t*0.2)*4;
      pos.setY(i,y);
    }
    pos.needsUpdate=true; ground.geometry.computeVertexNormals();
  }
}

export function cleanup(scene){
  ['sr_trees','sr_snow','sr_ground'].forEach(name=>{
    const obj=scene.getObjectByName(name); if(!obj) return;
    try{
      if(obj.geometry) obj.geometry.dispose();
      if(obj.material && !Object.values(cachedMaterials).includes(obj.material)) obj.material.dispose();
    }catch(e){console.warn('[environment] cleanup',e);}
    scene.remove(obj);
  });
}

// helper to sample tree height
function sampleHeightAtXY(x,z){
  if(!ground) return 0;
  const pos = ground.geometry.attributes.position;
  const seg = Math.sqrt(pos.count)-1;
  const size=2000; const half=size/2; const dx=size/seg;
  const i=Math.floor((x+half)/dx); const j=Math.floor((z+half)/dx);
  const idx = j*(seg+1)+i; if(idx>=0 && idx<pos.count) return pos.getY(idx);
  return 0;
}
