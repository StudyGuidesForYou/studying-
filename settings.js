// settings.js (Refined)
import { getPresetNames } from './graphicsPresets.js';

const $ = id => document.getElementById(id);

/**
 * initSettingsUI(callback)
 * callback receives the chosen preset object when "Apply" is clicked.
 */
export function initSettingsUI(onApplyCallback = null) {
  console.log('[Settings] Initializing UI');
  const presetSelect = $('presetSelect');
  if (!presetSelect) {
    console.warn('[Settings] presetSelect element not found');
    return;
  }
  // Populate preset dropdown
  getPresetNames().forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    presetSelect.appendChild(option);
  });
  // Apply button handler
  const applyBtn = $('applySettings');
  applyBtn?.addEventListener('click', () => {
    const sel = presetSelect.value;
    console.log('[Settings] Applying preset:', sel);
    if (onApplyCallback) onApplyCallback(getPresetByName(sel));
  });
}
