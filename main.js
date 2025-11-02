import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

let scene, camera, renderer, world, car;
let lastTime=0;
let activePreset = GraphicsPresets[2];
let t = 0;
const input = { forward:false, backward:false, left:false, right:false };

// --- Car class ---
class Car {
    constructor(scene){
        const geom = new THREE.BoxGeometry(2,1,4);
        const mat = new THREE.MeshStandardMaterial({color:0xff0000});
        this.mesh = new THREE.Mesh(geom, mat);
        this.mesh.position.set(0,1,0);
        this.speed = 0;
        this.maxSpeed = 80;
        this.acceleration = 100;
        this.turnSpeed = 1.5;
        scene.add(this.mesh);
    }
    update(dt,input){
        if(input.forward) this.speed += this.acceleration*dt;
        if(input.backward) this.speed -= this.acceleration*dt;
        this.speed = Math.max(Math.min(this.speed,this.maxSpeed), -this.maxSpeed/2);
        if(input.left) this.mesh.rotation.y += this.turnSpeed*dt*(this.speed/this.maxSpeed);
        if(input.right) this.mesh.rotation.y -= this.turnSpeed*dt*(this.speed/this.maxSpeed);
        const fwd = new THREE.Vector3(0,0,1).applyEuler(this.mesh.rotation);
        this.mesh.position.add(fwd.multiplyScalar(this.speed*dt));
    }
}

// --- Input ---
function setupInput(){
    window.addEventListener('keydown',e=>{
        if(e.code==='KeyW') input.forward=true;
        if(e.code==='KeyS') input.backward=true;
        if(e.code==='KeyA') input.left=true;
        if(e.code==='KeyD') input.right=true;
    });
    window.addEventListener('keyup',e=>{
        if(e.code==='KeyW') input.forward=false;
        if(e.code==='KeyS') input.backward=false;
        if(e.code==='KeyA') input.left=false;
        if(e.code==='KeyD') input.right=false;
    });
}

// --- Init ---
function init(){
    const canvas=document.getElementById('gameCanvas');
    renderer=new THREE.WebGLRenderer({canvas,antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setPixelRatio(activePreset.resolution);

    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,activePreset.viewDistance);

    const light=new THREE.DirectionalLight(0xffffff,1);
    light.position.set(10,50,20);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff,0.4));

    car=new Car(scene);

    world = new World(scene, {worldMode:'natural', dayNight:'day', detail:0.2, treeDensity:0.05});
    applyMode(scene,'natural',{detail:0.2,treeDensity:0.05});

    setTimeout(()=>upgradeGraphics(0.5,0.3),1000);
    setTimeout(()=>upgradeGraphics(1.0,1.0),3000);

    document.getElementById('graphicsBtn').addEventListener('click',()=>{
        document.getElementById('graphicsPanel').classList.toggle('hidden');
    });

    initSettingsUI(preset=>{
        activePreset=preset;
        renderer.setPixelRatio(preset.resolution);
        camera.far=preset.viewDistance;
        camera.updateProjectionMatrix();
    });

    setupInput();
}

// --- Upgrade LOD ---
function upgradeGraphics(detail,treeDensity){
    if(world){
        world.scene.children.forEach(obj=>{
            if(obj.geometry)obj.geometry.dispose();
            if(obj.material)obj.material.dispose();
        });
    }
    world = new World(scene,{worldMode:'natural',dayNight:'day',detail,treeDensity});
    applyMode(scene,'natural',{detail,treeDensity});
}

// --- Animate ---
function animate(time=0){
    requestAnimationFrame(animate);
    const dt=(time-lastTime)/1000||0.016;
    lastTime=time;
    t+=dt;

    car.update(dt,input);
    if(world) world.update(car.mesh.position.z, dt);
    updateEnvironment(dt,t);

    const camOffset = new THREE.Vector3(0,1.5,-5).applyEuler(car.mesh.rotation);
    camera.position.copy(car.mesh.position).add(camOffset);
    const lookAtPos = car.mesh.position.clone().add(new THREE.Vector3(0,1,10).applyEuler(car.mesh.rotation));
    camera.lookAt(lookAtPos);

    renderer.render(scene,camera);
}

init();
animate();
