import { World } from './world.js';
import { GraphicsPresets } from './graphicsPresets.js';

let scene, camera, renderer;
let world;
let playerZ = 0;
let lastTime = 0;

init();
animate();

function init() {
  const canvas = document.getElementById("gameCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
  camera.position.set(0,4,-10);
  camera.lookAt(0,2,50);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5,20,10);
  scene.add(light);

  world = new World(scene, { worldMode:'natural', dayNight:'day', detail:1, treeDensity:1 });

  window.addEventListener("graphicsChanged", applyPreset);
  applyPreset();
}

function applyPreset() {
  const p = window.ActivePreset || GraphicsPresets[2];
  renderer.setPixelRatio(p.resolution);
  camera.far = p.viewDistance;
  camera.updateProjectionMatrix();
}

function animate(time=0) {
  requestAnimationFrame(animate);
  const dt = (time - lastTime)/1000 || 0.016;
  lastTime = time;

  playerZ += 0.5;
  world.update(playerZ, dt);

  renderer.render(scene, camera);
}
