// world.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.opts = opts;
    this.road = null;
    this._createRoad();
    console.log('[world] constructed with opts', opts);
  }
  _createRoad() {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-30, 0, 0),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(30, 0, 420),
      new THREE.Vector3(-25, 0, 640),
      new THREE.Vector3(0, 0, 880)
    ]);
    const shape = new THREE.Shape();
    shape.moveTo(-6, 0);
    shape.lineTo(6, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { steps: 400, bevelEnabled: false, extrudePath: curve });
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
    this.road = new THREE.Mesh(geo, mat);
    this.road.receiveShadow = true;
    this.road.name = 'sr_road';
    this.scene.add(this.road);
    console.log('[world] road created (extrude) points=', curve.points.length);
  }
  update(dt) {
    // optional: road animation could be done here
  }
}

export default World;
console.log('[world] module loaded');
