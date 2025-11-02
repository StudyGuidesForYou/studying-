// world.js (Enhanced road generation)
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.road = null;
    this.createRoad();
  }

  createRoad() {
    const ground = this.scene.getObjectByName('sr_ground');
    const pts = [
      new THREE.Vector3(-30, 0, 0),
      new THREE.Vector3(0, 0, 200),
      new THREE.Vector3(30, 0, 420),
      new THREE.Vector3(-25, 0, 640),
      new THREE.Vector3(0, 0, 880)
    ];
    // Sample height from terrain for each waypoint
    const curvePoints = pts.map(p => {
      if (ground && ground.geometry) {
        // Sample height by finding nearest vertex (simple approach)
        const y = sampleHeight(ground.geometry, p.x, p.z);
        return new THREE.Vector3(p.x, y + 0.05, p.z);
      }
      return p.clone();
    });
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    // Road cross-section shape (12 wide road)
    const shape = new THREE.Shape();
    shape.moveTo(-6, 0); shape.lineTo(6, 0);

    const roadGeo = new THREE.ExtrudeGeometry(shape, {
      steps: 100,
      bevelEnabled: false,
      extrudePath: curve
    });
    // Apply a road texture (assuming you have one)
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.9,
      metalness: 0.0
      // map: new THREE.TextureLoader().load('textures/asphalt.jpg') // optional
    });
    this.road = new THREE.Mesh(roadGeo, roadMat);
    this.road.receiveShadow = true;
    this.road.name = 'sr_road';
    this.scene.add(this.road);

    // (Optional) Add lane markings using dashed lines:
    const linePoints = new THREE.Path();
    const points = curve.getPoints(50);
    points.forEach((pt, i) => {
      if (i % 10 === 0) linePoints.lineTo(pt.x, pt.z);
    });
    // The above is a conceptual step; actual implementation requires mapping to road.
  }
}

// Helper: sample height from geometry by nearest vertex (approximate)
function sampleHeight(geometry, x, z) {
  const pos = geometry.attributes.position;
  const seg = Math.sqrt(pos.count) - 1;
  const size = 2000;
  const half = size / 2;
  const dx = size / seg;
  const xi = Math.floor((x + half) / dx);
  const zi = Math.floor((z + half) / dx);
  const idx = zi * (seg + 1) + xi;
  if (idx >= 0 && idx < pos.count) {
    return pos.getY(idx);
  }
  return 0;
}

export default World;
