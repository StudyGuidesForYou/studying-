import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';
import { World } from './world.js';
import { applyMode, updateEnvironment } from './environment.js';
import { GraphicsPresets, getPresetByName } from './graphicsPresets.js';
import { initSettingsUI } from './settings.js';

let scene, camera, renderer;
let world;
let playerZ=0;
let lastTime=0;
let activePreset=GraphicsPresets[2];

init();
animate();

function init(){
  const canvas=document.getElementById("gameCanvas");
  renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(activePreset.resolution);

  scene=new THREE.Scene();

  camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,activePreset.viewDistance);
  camera.position.set(0,4,-10);
  camera.lookAt(0,2,50);

  const light=new THREE.DirectionalLight(0xffffff,1);
  light.position.set(10,50,20);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff,0.4));

  // Progressive LOD
  const lodSteps=[
    {detail:0.2, treeDensity:0.05, delay:0},
    {detail:0.5, treeDensity:0.3, delay:800},
    {detail:1.0, treeDensity:1.0, delay:2000}
  ];

  lodSteps.forEach(step=>{
    setTimeout(()=>{
      if(world) world.scene.children.forEach(obj=>{
        if(obj.geometry)obj.geometry.dispose();
        if(obj.material)obj.material.dispose();
      });
      world=new World(scene,{worldMode:'natural',dayNight:'day',detail:step.detail,treeDensity:step.treeDensity});
      applyMode(scene,'natural',{detail:step.detail,treeDensity:step.treeDensity});
      camera.far=activePreset.viewDistance;
      camera.updateProjectionMatrix();
    },step.delay);
  });

  // UI
  const btn=document.getElementById('graphicsBtn');
  const panel=document.getElementById('graphicsPanel');
  btn.addEventListener('click',()=>panel.classList.toggle('hidden'));

  initSettingsUI(preset=>{
    activePreset=preset;
    renderer.setPixelRatio(preset.resolution);
    camera.far=preset.viewDistance;
    camera.updateProjectionMatrix();
  });
}

function animate(time=0){
  requestAnimationFrame(animate);
  const dt=(time-lastTime)/1000||0.016;
  lastTime=time;

  playerZ+=50*dt;
  if(world) world.update(playerZ,dt);
  updateEnvironment(dt);

  camera.position.z=playerZ-10;
  camera.lookAt(0,2,playerZ+50);

  renderer.render(scene,camera);
}
