import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

let treeInstanced, snowPoints, ground;
const cachedMaterials = {};

export function ensureMaterials() {
    if(cachedMaterials.groundNat) return;
    cachedMaterials.groundNat = new THREE.MeshStandardMaterial({ color: 0x2b6b32, roughness:0.95 });
    cachedMaterials.groundSnow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness:0.95 });
    cachedMaterials.tree = new THREE.MeshStandardMaterial({ color: 0x114411 });
    cachedMaterials.treeWinter = new THREE.MeshStandardMaterial({ color: 0xddddff });
}

export function applyMode(scene, mode='natural', opts={}) {
    const detail = opts.detail ?? 1;
    const treeDensity = opts.treeDensity ?? 1;
    const snowCount = opts.snowParticles ?? 500;
    const dayNight = opts.dayNight ?? 'day';

    ensureMaterials();
    cleanup(scene);

    scene.background = new THREE.Color(mode==='winter'?0xEAF6FF:(dayNight==='night'?0x07122a:0x8FCFFF));
    scene.fog = new THREE.FogExp2(scene.background.getHex(), mode==='winter'?0.0009:0.0006);

    // Ground
    const size = 2000;
    const seg = Math.max(16, Math.floor(opts.terrainDetail ?? 64));
    const geom = new THREE.PlaneGeometry(size, size, seg, seg);
    geom.rotateX(-Math.PI/2);
    const mat = mode==='winter'?cachedMaterials.groundSnow:cachedMaterials.groundNat;
    ground = new THREE.Mesh(geom, mat);
    ground.receiveShadow=true;
    ground.name='sr_ground';
    scene.add(ground);

    // Trees
    const baseTreeGeo = new THREE.ConeGeometry(3*detail,12*detail,8);
    const matTree = mode==='winter'?cachedMaterials.treeWinter:cachedMaterials.tree;
    const treeCount = Math.min(1200, Math.floor(250*treeDensity*detail));
    treeInstanced = new THREE.InstancedMesh(baseTreeGeo, matTree, treeCount);
    const dummy = new THREE.Object3D();
    const spread = 800;
    for(let i=0;i<treeCount;i++){
        dummy.position.set((Math.random()-0.5)*spread,6,(Math.random()-0.5)*spread);
        dummy.rotation.y=Math.random()*Math.PI*2;
        dummy.scale.setScalar(0.7+Math.random()*0.6);
        dummy.updateMatrix();
        treeInstanced.setMatrixAt(i,dummy.matrix);
    }
    treeInstanced.castShadow=true;
    treeInstanced.name='sr_trees';
    scene.add(treeInstanced);

    // Snow
    if(mode==='winter') spawnSnow(scene, snowCount);
}

function spawnSnow(scene,count){
    const pos = new Float32Array(count*3);
    for(let i=0;i<count;i++){
        pos[i*3+0]=(Math.random()-0.5)*1500;
        pos[i*3+1]=Math.random()*400+20;
        pos[i*3+2]=(Math.random()-0.5)*1500;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({size:1.5, color:0xffffff, transparent:true});
    snowPoints=new THREE.Points(geo, mat);
    snowPoints.name='sr_snow';
    scene.add(snowPoints);
}

export function updateEnvironment(dt,t=0){
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
            const x=pos.getX(i);
            const z=pos.getZ(i);
            const y=Math.sin(x*0.01+t*0.5)*5 + Math.cos(z*0.01+t*0.3)*3;
            pos.setY(i,y);
        }
        pos.needsUpdate=true;
        ground.geometry.computeVertexNormals();
    }
}

export function cleanup(scene){
    ['sr_trees','sr_snow','sr_ground'].forEach(name=>{
        const obj=scene.getObjectByName(name);
        if(!obj) return;
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
        scene.remove(obj);
    });
}
