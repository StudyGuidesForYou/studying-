import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName } from './graphicPresets.js';
import { initSettingsUI } from './settings.js';

let scene, camera, renderer, world, car, lastTime=0, t=0;
let input = { forward:false, backward:false, left:false, right:false };

function getTerrainHeightAt(x,z){
    const g = world.scene.getObjectByName('sr_ground');
    if(!g) return 0;
    const pos = g.geometry.attributes.position;
    let closestY = -Infinity;
    for(let i=0;i<pos.count;i++){
        const vx=pos.getX(i)+g.position.x;
        const vz=pos.getZ(i)+g.position.z;
        if(Math.abs(vx-x)<2 && Math.abs(vz-z)<2){
            const vy=pos.getY(i)+g.position.y;
            if(vy>closestY) closestY=vy;
        }
    }
    return closestY===-Infinity?0:closestY;
}

class Car{
    constructor(scene){
        const geom = new THREE.BoxGeometry(2,1,4);
        const mat = new THREE.MeshStandardMaterial({color:0xff0000});
        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.position.set(0,1,0);
        this.speed=0; this.maxSpeed=80; this.acceleration=100; this.turnSpeed=1.5;
        scene.add(this.mesh);
    }
    update(dt){
        if(input.forward) this.speed+=this.acceleration*dt;
        if(input.backward) this.speed-=this.acceleration*dt;
        this.speed=Math.max(Math.min(this.speed,this.maxSpeed),-this.maxSpeed/2);
        if(input.left) this.mesh.rotation.y+=this.turnSpeed*dt*(this.speed/this.maxSpeed);
        if(input.right) this.mesh.rotation.y-=this.turnSpeed*dt*(this.speed/this.maxSpeed);
        const forward = new THREE.Vector3(0,0,1).applyEuler(this.mesh.rotation);
        this.mesh.position.add(forward.multiplyScalar(this.speed*dt));
        const terrainY = getTerrainHeightAt(this.mesh.position.x,this.mesh.position.z);
        this.mesh.position.y = terrainY+0.5;
    }
}

function setupInput(){
    window.addEventListener('keydown', e=>{
        if(e.code==='KeyW') input.forward=true;
        if(e.code==='KeyS') input.backward=true;
        if(e.code==='KeyA') input.left=true;
        if(e.code==='KeyD') input.right=true;
    });
    window.addEventListener('keyup', e=>{
        if(e.code==='KeyW') input.forward=false;
        if(e.code==='KeyS') input.backward=false;
        if(e.code==='KeyA') input.left=false;
        if(e.code==='KeyD') input.right=false;
    });
}

function init(){
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({canvas,antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);

    const light = new THREE.DirectionalLight(0xffffff,1);
    light.position.set(5,20,10);
    scene.add(light);

    world = new World(scene);
    car = new Car(scene);

    setupInput();
    initSettingsUI();

    // Apply default preset (Normal Human)
    applyPreset(GraphicsPresets[2]);

    // Progressive LOD upgrade
    setTimeout(()=>applyPreset(GraphicsPresets[3]),2000);
    setTimeout(()=>applyPreset(GraphicsPresets[5]),5000);

    window.addEventListener('resize', ()=>{
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth,window.innerHeight);
    });
}

function applyPreset(preset){
    if(!preset) return;
    renderer.setPixelRatio(preset.renderScale);
    camera.far = preset.viewDistance;
    camera.updateProjectionMatrix();
    applyMode(scene,'natural',preset);
}

function animate(time){
    const dt = (time-lastTime)/1000;
    lastTime = time;
    t+=dt;

    car.update(dt);
    updateEnvironment(dt,t);

    // Camera follows car
    const offset = new THREE.Vector3(0,5,-12);
    offset.applyEuler(car.mesh.rotation);
    camera.position.copy(car.mesh.position.clone().add(offset));
    camera.lookAt(car.mesh.position.clone().add(new THREE.Vector3(0,2,0)));

    renderer.render(scene,camera);
    requestAnimationFrame(animate);
}

init();
requestAnimationFrame(animate);
