// settings.js
import { getPresetNames, getPresetByName } from './graphicsPresets.js';

const $ = id => document.getElementById(id);

/**
 * initSettingsUI(callback)
 * callback receives the chosen preset object when "Apply" clicked
 */
export function initSettingsUI(onApplyCallback = null) {
  console.log('[settings] initSettingsUI called');
  const presetSelect = $('presetSelect');
  if (!presetSelect) {
    console.warn('[settings] presetSelect not found');
    return;
  }

  // populate presets
  getPresetNames().forEach(name => {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name;
    presetSelect.appendChild(o);
  });

  // apply button
  const applyBtn = $('applySettings');
  applyBtn?.addEventListener('click', () => {
    const sel = presetSelect.value;
    const p = getPresetByName(sel);
    console.log('[settings] apply clicked ->', sel);
    if (onApplyCallback && p) onApplyCallback(p);
  });
}
