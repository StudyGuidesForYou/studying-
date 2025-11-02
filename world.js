// world.js
import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { sampleHeightAtXY } from './environment.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.road = null;
    this._createRoad();
  }

  _createRoad() {
    const ground = this.scene.getObjectByName('sr_ground');
    const curvePoints = [];

    const pts = [
      new THREE.Vector3(-30,0,0),
      new THREE.Vector3(0,0,200),
      new THREE.Vector3(30,0,420),
      new THREE.Vector3(-25,0,640),
      new THREE.Vector3(0,0,880)
    ];

    pts.forEach(p=>{
      if(ground && ground.geometry){
        const y = sampleHeightAtXY(p.x,p.z);
        curvePoints.push(new THREE.Vector3(p.x,y+0.05,p.z));
      } else curvePoints.push(p);
    });

    const curve = new THREE.CatmullRomCurve3(curvePoints);

    const shape = new THREE.Shape();
    shape.moveTo(-6,0); shape.lineTo(6,0);

    const geo = new THREE.ExtrudeGeometry(shape,{steps: 400, bevelEnabled:false, extrudePath:curve});
    const mat = new THREE.MeshStandardMaterial({color:0x333333, roughness:0.85, metalness:0.1});
    this.road = new THREE.Mesh(geo, mat);
    this.road.receiveShadow = true;
    this.road.name = 'sr_road';
    this.scene.add(this.road);
  }

  update(dt){}
}

export default World;
