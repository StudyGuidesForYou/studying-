import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { applyMode } from './environment.js';

export class World{
    constructor(scene, opts={}){
        this.scene = scene;
        this.opts = opts;
        this.createRoad();
        applyMode(scene, opts.worldMode||'natural', opts);
    }

    createRoad(){
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-20,0,0),
            new THREE.Vector3(0,0,200),
            new THREE.Vector3(15,0,400),
            new THREE.Vector3(-10,0,600),
            new THREE.Vector3(0,0,800)
        ]);
        const shape = new THREE.Shape();
        shape.moveTo(-5,0);
        shape.lineTo(5,0);
        const geo = new THREE.ExtrudeGeometry(shape,{steps:200, bevelEnabled:false, extrudePath:curve});
        const mat = new THREE.MeshStandardMaterial({color:0x333333, roughness:0.8});
        this.road = new THREE.Mesh(geo, mat);
        this.road.receiveShadow = true;
        this.scene.add(this.road);
    }

    update(carZ, dt){
        if(this.road) this.road.position.z = carZ;
    }
}

window.World=World;
