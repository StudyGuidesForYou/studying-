// console.js — full system debug logger
export const DebugConsole = (() => {
    const logs = [];

    // -----------------------------
    // Basic logging
    // -----------------------------
    function log(...args) { console.log('[DEBUG]', ...args); logs.push({ type:'log', time:Date.now(), args }); }
    function warn(...args) { console.warn('[DEBUG WARNING]', ...args); logs.push({ type:'warn', time:Date.now(), args }); }
    function error(...args) { console.error('[DEBUG ERROR]', ...args); logs.push({ type:'error', time:Date.now(), args }); }

    // -----------------------------
    // Scene / Object Monitoring
    // -----------------------------
    function reportScene(scene) {
        if(!scene){ warn('Scene not defined'); return; }
        log('Scene top-level objects:', scene.children.map(c => c.name || c.type));
        scene.traverse(obj => {
            const type = obj.type || 'Unknown';
            const name = obj.name || 'Unnamed';
            log(`Object: ${name} | Type: ${type}`);
        });
    }

    function hookThreeObject(obj) {
        if(!obj) return;
        const origAdd = obj.add;
        obj.add = function(...args){
            log(`Adding objects to ${obj.name||obj.type}:`, args.map(a=>a.name||a.type));
            return origAdd.apply(this, args);
        }
    }

    // -----------------------------
    // Camera Monitoring
    // -----------------------------
    function monitorCamera(camera) {
        if(!camera){ warn('Camera missing'); return; }
        log('Camera pos:', camera.position.toArray(), 'rot:', camera.rotation.toArray());
    }

    // -----------------------------
    // Vehicle / Car Monitoring
    // -----------------------------
    function monitorVehicle(vehicle, chassisBody, threeCar) {
        if(!vehicle){ warn('Vehicle not initialized'); return; }
        if(chassisBody && threeCar){
            log('Vehicle chassis pos:', chassisBody.position.toArray(), 'velocity:', chassisBody.velocity.toArray());
            threeCar.userData.wheels?.forEach((w,i)=>{
                log(`Wheel ${i} pos:`, w.pivot.position.toArray());
            });
        }
    }

    // -----------------------------
    // Input Monitoring
    // -----------------------------
    function monitorInput(input) {
        log('Input state:', JSON.parse(JSON.stringify(input)));
    }

    // -----------------------------
    // Physics Monitoring
    // -----------------------------
    function monitorPhysics(world) {
        if(!world){ warn('Physics world not initialized'); return; }
        log(`Physics bodies: ${world.bodies.length}`);
        world.bodies.forEach((b,i)=>{
            log(`Body[${i}]: pos=${b.position.toArray()}, vel=${b.velocity.toArray()}`);
        });
    }

    // -----------------------------
    // Environment Monitoring
    // -----------------------------
    function monitorEnvironment(scene) {
        const envObjs = ['sr_ground','sr_trees','sr_snow','sr_road'];
        envObjs.forEach(name=>{
            const obj = scene.getObjectByName(name);
            if(obj) log(`Environment object loaded: ${name}`);
            else warn(`Environment object missing: ${name}`);
        });
    }

    // -----------------------------
    // Graphics / Presets Monitoring
    // -----------------------------
    function monitorPreset(preset) {
        if(!preset){ warn('No preset applied'); return; }
        log('Graphics preset applied:', preset);
    }

    // -----------------------------
    // Errors & Unhandled Rejections
    // -----------------------------
    function catchErrors() {
        window.addEventListener('error', e=>{
            error('Window error caught:', e.message, e.filename, e.lineno, e.colno, e.error);
        });
        window.addEventListener('unhandledrejection', e=>{
            error('Unhandled promise rejection:', e.reason);
        });
    }

    // -----------------------------
    // Full status report
    // -----------------------------
    function fullStatus(scene, camera, vehicle, chassisBody, threeCar, input, physWorld, preset){
        reportScene(scene);
        monitorCamera(camera);
        monitorVehicle(vehicle, chassisBody, threeCar);
        monitorInput(input);
        monitorPhysics(physWorld);
        monitorEnvironment(scene);
        monitorPreset(preset);
    }

    return {
        log, warn, error,
        reportScene, hookThreeObject,
        monitorCamera, monitorVehicle,
        monitorInput, monitorPhysics,
        monitorEnvironment, monitorPreset,
        catchErrors,
        fullStatus
    };
})();
