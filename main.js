// ==================== physics.js ====================

// Assuming Three.js and Cannon.js are already imported

// Physics world setup
const world = new CANNON.World();
world.gravity.set(0, -9.81, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;
world.solver.tolerance = 0.1;

// Materials for traction
const wheelMat = new CANNON.Material("wheel");
const groundMat = new CANNON.Material("ground");
const wheelGroundContact = new CANNON.ContactMaterial(wheelMat, groundMat, {
    friction: 0.5,
    restitution: 0,
});
world.addContactMaterial(wheelGroundContact);

// Ground body (example plane)
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, material: groundMat });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// ==================== Vehicle Setup ====================
const chassisMass = 300;
const chassisSize = new CANNON.Vec3(1, 0.5, 2); // width, height, length

// Chassis body with offset shape to lower CoG
const chassisBody = new CANNON.Body({ mass: chassisMass });
chassisBody.addShape(chassisSize, new CANNON.Vec3(0, -0.5, 0));
chassisBody.angularDamping = 0.4; // resist flips
chassisBody.linearDamping = 0.1;

// RaycastVehicle
const vehicle = new CANNON.RaycastVehicle({
    chassisBody: chassisBody,
    indexRightAxis: 0,
    indexUpAxis: 1,
    indexForwardAxis: 2
});

// Wheel options
const wheelOptions = {
    radius: 0.4,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    axleLocal: new CANNON.Vec3(1, 0, 0),
    suspensionStiffness: 30,
    suspensionRestLength: 0.6,
    dampingCompression: 4,
    dampingRelaxation: 3,
    maxSuspensionForce: 1e5,
    rollInfluence: 0.01,
    frictionSlip: 5,
    maxSuspensionTravel: 0.5,
    customSlidingRotationalSpeed: -30
};

const axleWidth = 1;
wheelOptions.chassisConnectionPointLocal = new CANNON.Vec3(axleWidth, 0, -1.5);
vehicle.addWheel(wheelOptions);
wheelOptions.chassisConnectionPointLocal = new CANNON.Vec3(-axleWidth, 0, -1.5);
vehicle.addWheel(wheelOptions);
wheelOptions.chassisConnectionPointLocal = new CANNON.Vec3(axleWidth, 0, 1.5);
vehicle.addWheel(wheelOptions);
wheelOptions.chassisConnectionPointLocal = new CANNON.Vec3(-axleWidth, 0, 1.5);
vehicle.addWheel(wheelOptions);

// Add vehicle to world
vehicle.addToWorld(world);

// Kinematic wheel visuals
const wheelBodies = [];
vehicle.wheelInfos.forEach(wheel => {
    const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius * 0.5, 16);
    const wheelBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: wheelMat });
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
    wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
    wheelBodies.push(wheelBody);
    world.addBody(wheelBody);
});

// ==================== Vehicle Control & Update ====================

// Steering & Engine forces
let maxSteerVal = 0.5; // radians
let maxForce = 1500;
let brakeForce = 100;

const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

function updateVehicleControls() {
    // Steering
    let steer = 0;
    if (keys["ArrowLeft"]) steer = maxSteerVal;
    if (keys["ArrowRight"]) steer = -maxSteerVal;

    vehicle.setSteeringValue(steer, 0);
    vehicle.setSteeringValue(steer, 1);

    // Engine
    let force = 0;
    if (keys["ArrowUp"]) force = maxForce;
    if (keys["ArrowDown"]) force = -maxForce;

    vehicle.applyEngineForce(force, 2);
    vehicle.applyEngineForce(force, 3);

    // Brake
    if (keys["Space"]) {
        vehicle.setBrake(brakeForce, 0);
        vehicle.setBrake(brakeForce, 1);
        vehicle.setBrake(brakeForce, 2);
        vehicle.setBrake(brakeForce, 3);
    } else {
        vehicle.setBrake(0, 0);
        vehicle.setBrake(0, 1);
        vehicle.setBrake(0, 2);
        vehicle.setBrake(0, 3);
    }

    // Drift: rear wheels lower friction on key
    if (keys["KeyX"]) { // X = drift
        vehicle.wheelInfos[2].frictionSlip = 3.5;
        vehicle.wheelInfos[3].frictionSlip = 3.5;
    } else {
        vehicle.wheelInfos[2].frictionSlip = 1.5;
        vehicle.wheelInfos[3].frictionSlip = 1.5;
    }
}

// Sync wheels to chassis
world.addEventListener("postStep", () => {
    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
        vehicle.updateWheelTransform(i);
        const t = vehicle.wheelInfos[i].worldTransform;
        wheelBodies[i].position.copy(t.position);
        wheelBodies[i].quaternion.copy(t.quaternion);
    }
});

// ==================== Main Update Loop ====================
const fixedTimeStep = 1 / 60;
function animate() {
    requestAnimationFrame(animate);
    updateVehicleControls();
    world.step(fixedTimeStep);

    // Update your Three.js car mesh and wheels here based on chassisBody.position/quaternion and wheelBodies[i].position/quaternion
}
animate();
