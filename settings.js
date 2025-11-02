import { getPresetNames, getPresetByName } from './graphicsPresets.js';

const $ = id => document.getElementById(id);

export function initSettingsUI(applyCallback) {
  const presetSelect = $('presetSelect');
  getPresetNames().forEach(name => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    presetSelect.appendChild(o);
  });

  $('applySettings').addEventListener('click', () => {
    const preset = getPresetByName(presetSelect.value);
    if (!preset) return;
    applyCallback(preset);
  });
}
