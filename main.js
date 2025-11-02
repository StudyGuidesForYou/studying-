let scene, camera, renderer;
let world;
let playerZ = 0;

init();
animate();

function init() {
  const canvas = document.getElementById("gameCanvas");

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(0, 4, -10);
  camera.lookAt(0, 2, 50);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 20, 10);
  scene.add(light);

  world = new World(scene);

  window.addEventListener("graphicsChanged", applyPreset);
  applyPreset();
}

function applyPreset() {
  const p = window.ActivePreset || GraphicsPresets[2]; // default Normal
  renderer.setPixelRatio(p.resolution);
  camera.far = p.viewDistance;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);

  playerZ += 0.5;
  world.update(playerZ);

  renderer.render(scene, camera);
}
