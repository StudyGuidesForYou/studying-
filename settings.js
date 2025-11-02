// settings.js
import { getPresetNames, getPresetByName } from './graphicsPresets.js';

const $ = id => document.getElementById(id);

export function initSettingsUI(onApplyCallback = null) {
  console.log('[settings] initSettingsUI called');

  const presetSelect = $('presetSelect');
  if (!presetSelect) {
    console.warn('[settings] #presetSelect not found in DOM');
    return;
  }

  // populate
  getPresetNames().forEach(name => {
    const o = document.createElement('option');
    o.value = name; o.textContent = name;
    presetSelect.appendChild(o);
  });

  // hook apply button
  const applyBtn = $('applySettings');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const selected = presetSelect.value;
      console.log('[settings] apply clicked, preset:', selected);
      const preset = getPresetByName(selected);
      if (onApplyCallback && preset) onApplyCallback(preset);
    });
  } else {
    console.warn('[settings] applySettings button missing');
  }
}
