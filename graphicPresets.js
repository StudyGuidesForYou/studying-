export const GraphicsPresets = [
  { name: "Potato", resolution: 0.5, viewDistance: 300, detail: 16 },
  { name: "Toaster Mode", resolution: 0.7, viewDistance: 450, detail: 32 },
  { name: "Normal Human", resolution: 1.0, viewDistance: 650, detail: 48 },
  { name: "Beast Mode", resolution: 1.25, viewDistance: 900, detail: 64 },
  { name: "GPU Killer", resolution: 1.5, viewDistance: 1200, detail: 96 },
  { name: "CPU Destroyer", resolution: 2.0, viewDistance: 2000, detail: 128 }
];

export function getPresetNames() {
  return GraphicsPresets.map(p => p.name);
}

export function getPresetByName(name) {
  return GraphicsPresets.find(p => p.name === name);
}
