// environment.js
import {
    HemisphericLight,
    DirectionalLight,
    Vector3,
    Color3,
    MeshBuilder,
    StandardMaterial,
    ParticleSystem,
    Texture
} from "@babylonjs/core";

let snowSystem = null;

export function loadNaturalEnvironment(scene, isNight = false) {
    clearWinter(scene);

    scene.clearColor = new Color3(0.45, 0.70, 0.95); // blue sky
    scene.fogColor = scene.clearColor;
    scene.fogDensity = 0.005;

    const light = new HemisphericLight("naturalLight", new Vector3(0, 1, 0), scene);
    light.intensity = isNight ? 0.3 : 1.0;

    const sun = new DirectionalLight("sun", new Vector3(-1, -2, -1), scene);
    sun.position = new Vector3(50, 100, 50);
    sun.intensity = isNight ? 0.1 : 1.0;

    // Ground
    const ground = MeshBuilder.CreateGround("natGround", { width: 3000, height: 3000 }, scene);
    const groundMat = new StandardMaterial("natMat", scene);
    groundMat.diffuseColor = new Color3(0.15, 0.45, 0.15); // grass
    ground.material = groundMat;

    // Trees
    generateTrees(scene, {
        color: new Color3(0.05, 0.25, 0.05),
        count: 300,
        area: 2500
    });
}

export function loadWinterEnvironment(scene) {
    scene.clearColor = new Color3(0.90, 0.95, 1.0); // cold sky
    scene.fogColor = new Color3(0.8, 0.9, 1.0);
    scene.fogDensity = 0.008;

    const light = new HemisphericLight("winterLight", new Vector3(0, 1, 0), scene);
    light.intensity = 0.9;

    // Ground
    const ground = MeshBuilder.CreateGround("snowGround", { width: 3000, height: 3000 }, scene);
    const snowMat = new StandardMaterial("snowMat", scene);
    snowMat.diffuseColor = new Color3(1, 1, 1); // white snow
    ground.material = snowMat;

    // Trees — white frosty
    generateTrees(scene, {
        color: new Color3(0.9, 0.9, 1),
        count: 250,
        area: 2500
    });

    spawnSnow(scene);
}

function generateTrees(scene, { color, count, area }) {
    for (let i = 0; i < count; i++) {
        const x = Math.random() * area - area / 2;
        const z = Math.random() * area - area / 2;

        const trunk = MeshBuilder.CreateCylinder(`trunk${i}`, {
            height: 6,
            diameter: 0.7,
        }, scene);
        trunk.position.set(x, 3, z);

        const top = MeshBuilder.CreateSphere(`treetop${i}`, { diameter: 8 }, scene);
        top.position.set(x, 10, z);

        const trunkMat = new StandardMaterial(`matT${i}`, scene);
        trunkMat.diffuseColor = new Color3(0.4, 0.25, 0.1);
        trunk.material = trunkMat;

        const leavesMat = new StandardMaterial(`matL${i}`, scene);
        leavesMat.diffuseColor = color;
        top.material = leavesMat;
    }
}

// Snow weather system
function spawnSnow(scene) {
    snowSystem = new ParticleSystem("snow", 5000, scene);
    snowSystem.particleTexture = new Texture("/textures/snowflake.png", scene);
    snowSystem.minSize = 0.2;
    snowSystem.maxSize = 0.5;

    snowSystem.emitRate = 2000;

    snowSystem.minLifeTime = 2;
    snowSystem.maxLifeTime = 4;

    snowSystem.direction1 = new Vector3(0, -1, 0);
    snowSystem.direction2 = new Vector3(0, -1, 0);

    snowSystem.minEmitBox = new Vector3(-50, 30, -50);
    snowSystem.maxEmitBox = new Vector3(50, 40, 50);

    snowSystem.start();
}

function clearWinter(scene) {
    if (snowSystem) {
        snowSystem.stop();
        snowSystem.dispose();
        snowSystem = null;
    }

    const oldGround = scene.getMeshByName("snowGround");
    if (oldGround) oldGround.dispose();
}
