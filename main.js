// main.js
import { Engine, Scene, ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { loadNaturalEnvironment, loadWinterEnvironment } from "./environment.js";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

const camera = new ArcRotateCamera("cam", Math.PI / 2, 1.2, 60, new Vector3(0, 0, 0), scene);
camera.attachControl(canvas, true);

// DEFAULT MODE: Natural Day
loadNaturalEnvironment(scene, false);

// BUTTON HANDLERS
document.getElementById("btnNaturalDay").onclick = () => {
    loadNaturalEnvironment(scene, false);
};

document.getElementById("btnNaturalNight").onclick = () => {
    loadNaturalEnvironment(scene, true);
};

document.getElementById("btnWinter").onclick = () => {
    loadWinterEnvironment(scene);
};

engine.runRenderLoop(() => scene.render());
