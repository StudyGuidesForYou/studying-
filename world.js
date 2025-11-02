import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { applyMode } from './environment.js';

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.opts = opts;
    this.segmentLength = 50;

    // Generate curved road
    this.createRoad();

    // Generate terrain
    this.createTerrain();

    // Apply environment (trees, snow)
    applyMode(this.scene, opts.worldMode || 'natural', opts);
  }

  createTerrain() {
    const geom = new THREE.PlaneGeometry(2000, 2000, 64, 64);
    geom.rotateX(-Math.PI / 2);

    // Random heights
    for (let i = 0; i < geom.attributes.position.count; i++) {
      geom.attributes.position.setY(i, Math.random() * 5);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color: 0x66804b, roughness: 1 });
    this.terrain = new THREE.Mesh(geom, mat);
    this.terrain.receiveShadow = true;
    this.terrain.position.z = 0;
    this.scene.add(this.terrain);
  }

  createRoad() {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-20, 0, 0),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(15, 0, 400),
      new THREE.Vector3(-10, 0, 600),
      new THREE.Vector3(0, 0, 800)
    ]);

    const shape = new THREE.Shape();
    shape.moveTo(-5, 0);
    shape.lineTo(5, 0);
    const extrudeSettings = { steps: 200, bevelEnabled: false, extrudePath: curve };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    this.road = new THREE.Mesh(geo, mat);
    this.road.receiveShadow = true;
    this.scene.add(this.road);
  }

  update(playerZ, dt) {
    // Move terrain forward for illusion
    this.terrain.position.z = playerZ;
  }
}

window.World = World;
