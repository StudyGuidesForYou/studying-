// world.js — Visual environment + helpers
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.154.0/build/three.module.js';
import { sampleHeightAtXY } from './environment.js';

export class World {
  constructor(scene){
    this.scene = scene;
    this.terrain = null;
    this.trees = [];
    this.rocks = [];
    this.generate();
  }

  generate(){
    this.createGround();
    this.createTrees();
    this.createRocks();
  }

  createGround(){
    const size = 2000;
    const segments = 256;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI/2);

    const pos = geometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, sampleHeightAtXY(x, z));
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ color:0x2b6b32, roughness:0.9, metalness:0.05 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.name='sr_ground';
    this.scene.add(mesh);
    this.terrain = mesh;
  }

  createTrees(){
    const treeGeo = new THREE.ConeGeometry(2,10,12);
    const treeMat = new THREE.MeshStandardMaterial({ color:0x117711 });
    for(let i=0;i<200;i++){
      const mesh = new THREE.Mesh(treeGeo, treeMat);
      mesh.castShadow=true;
      const x=Math.random()*1800-900;
      const z=Math.random()*1800-900;
      mesh.position.set(x, sampleHeightAtXY(x,z), z);
      mesh.scale.setScalar(0.8+Math.random()*0.5);
      this.scene.add(mesh);
      this.trees.push(mesh);
    }
  }

  createRocks(){
    const rockGeo = new THREE.DodecahedronGeometry(1,0);
    const rockMat = new THREE.MeshStandardMaterial({ color:0x555555, roughness:1.0 });
    for(let i=0;i<100;i++){
      const mesh = new THREE.Mesh(rockGeo, rockMat);
      mesh.castShadow=true;
      const x=Math.random()*1800-900;
      const z=Math.random()*1800-900;
      mesh.position.set(x, sampleHeightAtXY(x,z), z);
      mesh.scale.setScalar(0.5+Math.random()*1.2);
      this.scene.add(mesh);
      this.rocks.push(mesh);
    }
  }

  heightAt(x,z){
    if(!this.terrain) return 0;
    return sampleHeightAtXY(x,z);
  }
}
