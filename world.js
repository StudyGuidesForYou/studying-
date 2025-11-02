import * as THREE from 'https://unpkg.com/three@0.154.0/build/three.module.js';

export class World {
    constructor(scene, opts={}) {
        this.scene = scene;
        this.segmentWidth = opts.segmentWidth || 50;
        this.segmentsAhead = opts.segmentsAhead || 40;
        this.terrainSegments = [];
        this.roadSegments = [];
        this.totalLength = 0;
        this.detail = opts.detail || 1;

        this.createInitialTerrain();
        this.createRoad();
    }

    createInitialTerrain() {
        const size = 2000;
        const seg = 64 * this.detail;
        const geom = new THREE.PlaneGeometry(size, size, seg, seg);
        geom.rotateX(-Math.PI / 2);

        // Random hills
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y = Math.sin(x*0.01)*20 + Math.cos(z*0.01)*15 + (Math.random()-0.5)*5;
            pos.setY(i, y);
        }
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x66804b,
            roughness: 1,
            flatShading: false
        });

        this.terrain = new THREE.Mesh(geom, mat);
        this.terrain.position.y = -2;
        this.scene.add(this.terrain);
    }

    createRoad() {
        const roadLength = 2000;
        const roadWidth = 10;
        const roadGeom = new THREE.PlaneGeometry(roadWidth, roadLength, 4, 200);
        roadGeom.rotateX(-Math.PI / 2);

        // Curved road (simple sine wave)
        const pos = roadGeom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const z = pos.getZ(i);
            const curve = Math.sin(z*0.005) * 20;
            pos.setX(i, pos.getX(i) + curve);
        }
        roadGeom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8
        });

        this.road = new THREE.Mesh(roadGeom, mat);
        this.road.position.set(0, -1, 0);
        this.scene.add(this.road);
    }

    update(playerZ) {
        // Move terrain slightly for animation
        const pos = this.terrain.geometry.attributes.position;
        const time = performance.now()*0.001;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const y = Math.sin(x*0.01 + time)*20 + Math.cos(z*0.01 + time*0.5)*15;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
        this.terrain.geometry.computeVertexNormals();

        // Move terrain and road to simulate player motion
        this.terrain.position.z = playerZ;
        this.road.position.z = playerZ;
    }
}
