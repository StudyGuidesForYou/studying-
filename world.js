// world.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.opts = opts;
    this.road = null;
    this.terrain = null;
    this._createBase();
    console.log('[world] constructed with opts', opts);
  }

  _createBase() {
    // basic terrain placeholder - World itself does *not* own environment; environment.js does ground.
    // create a visible road mesh (extruded along a curve)
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
    const extrudeSettings = { steps: 400, bevelEnabled: false, extrudePath: curve };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
    this.road = new THREE.Mesh(geo, mat);
    this.road.receiveShadow = true;
    this.road.name = 'sr_road';
    this.scene.add(this.road);
    console.log('[world] road created (extrude) points=', curve.points.length);
  }

  update(delta) {
    // road/terrain displacement or animation could be applied here; keep simple movement
    // Nothing moves here — main controls camera and car and environment module animates ground
  }
}

console.log('[world] module loaded');
export default World;
