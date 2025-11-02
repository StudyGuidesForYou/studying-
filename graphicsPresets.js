export const GraphicsPresets = [
  {
    name: "Potato",
    renderScale: 0.5,
    viewDistance: 300,
    terrainDetail: 16,
    treeDensity: 0.1,
    snowParticles: 100
  },
  {
    name: "Toaster Mode",
    renderScale: 0.7,
    viewDistance: 450,
    terrainDetail: 32,
    treeDensity: 0.2,
    snowParticles: 200
  },
  {
    name: "Normal Human",
    renderScale: 1.0,
    viewDistance: 650,
    terrainDetail: 48,
    treeDensity: 0.5,
    snowParticles: 500
  },
  {
    name: "Beast Mode",
    renderScale: 1.25,
    viewDistance: 900,
    terrainDetail: 64,
    treeDensity: 0.8,
    snowParticles: 900
  },
  {
    name: "GPU Killer",
    renderScale: 1.5,
    viewDistance: 1200,
    terrainDetail: 96,
    treeDensity: 1.0,
    snowParticles: 1200
  },
  {
    name: "CPU Destroyer",
    renderScale: 2.0,
    viewDistance: 2000,
    terrainDetail: 128,
    treeDensity: 1.2,
    snowParticles: 2000
  }
];

export const getPresetByName = name => GraphicsPresets.find(p => p.name === name);
export const getPresetNames = () => GraphicsPresets.map(p => p.name);
