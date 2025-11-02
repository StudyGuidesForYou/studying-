// world.js — camera collision wrapper
import { sampleHeightAtXY } from './environment.js';

export class World {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.offset = 15;
    }

    updateCamera() {
        const car = this.scene.getObjectByName('sr_car') || { position: { x:0, y:0, z:0 } };
        const desired = new THREE.Vector3(car.position.x, car.position.y + this.offset, car.position.z + this.offset);
        const groundHeight = sampleHeightAtXY(desired.x, desired.z, this.scene.getObjectByName('sr_ground'));
        if(desired.y < groundHeight + 2) desired.y = groundHeight + 2;
        this.camera.position.lerp(desired, 0.1);
        this.camera.lookAt(car.position);
    }
}
