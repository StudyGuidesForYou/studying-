class World {
  constructor(scene) {
    this.scene = scene;

    this.segmentWidth = 50;
    this.terrainSegments = [];

    this.createInitialTerrain();
    this.createRoad();
  }

  createInitialTerrain() {
    const geom = new THREE.PlaneGeometry(4000, 4000, 64, 64);
    geom.rotateX(-Math.PI / 2);

    for (let i = 0; i < geom.attributes.position.count; i++) {
      const y = Math.sin(i * 0.2) * 10 + Math.random() * 5;
      geom.attributes.position.setY(i, y);
    }

    geom.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x66804b,
      roughness: 1
    });

    this.terrain = new THREE.Mesh(geom, material);
    this.terrain.position.y = -2;
    this.scene.add(this.terrain);
  }

  createRoad() {
    const roadGeom = new THREE.PlaneGeometry(10, 4000, 1, 200);
    roadGeom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8
    });

    this.road = new THREE.Mesh(roadGeom, mat);
    this.road.position.set(0, -1, 0);

    this.scene.add(this.road);
  }

  update(playerZ) {
    this.terrain.position.z = playerZ;
    this.road.position.z = playerZ;
  }
}

window.World = World;
