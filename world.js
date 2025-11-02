import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { applyMode, updateEnvironment } from './environment.js';

export class World {
  constructor(scene, opts={}) {
    this.scene = scene;
    this.opts = opts;
    this.segments = [];
    this.roadSpline = this.generateRoadCurve();
    this.segmentLength = 50;

    this.createInitialTerrain();
    this.createRoad();
    applyMode(this.scene, opts.worldMode || 'natural', opts);
  }

  generateRoadCurve() {
    const points = [];
    let z = 0;
    for(let i=0; i<50; i++){
      const x = Math.sin(i*0.5) * 20;
      const y = 0;
      points.push(new THREE.Vector3(x, y, z));
      z += 100;
    }
    return new THREE.CatmullRomCurve3(points);
  }

  createInitialTerrain() {
    const geom = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    geom.rotateX(-Math.PI/2);
    for (let i=0; i<geom.attributes.position.count; i++){
      geom.attributes.position.setY(i, Math.random()*5);
    }
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: 0x66804b, roughness: 1 });
    this.terrain = new THREE.Mesh(geom, mat);
    this.terrain.position.y = -2;
    this.scene.add(this.terrain);
  }

  createRoad() {
    const roadPoints = this.roadSpline.getPoints(200);
    const roadShape = new THREE.Shape();
    roadShape.moveTo(-5,0);
    roadShape.lineTo(5,0);
    const extrudeSettings = { steps: 200, bevelEnabled:false, extrudePath:this.roadSpline };
    const geo = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness:0.8 });
    this.road = new THREE.Mesh(geo, mat);
    this.road.receiveShadow = true;
    this.scene.add(this.road);
  }

  update(playerZ, dt) {
    // move terrain & environment (placeholder)
    this.terrain.position.z = playerZ;
    updateEnvironment(dt);
  }
}

window.World = World;
