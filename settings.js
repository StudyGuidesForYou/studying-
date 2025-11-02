// settings.js
export function initSettingsUI() {
  const panel = document.createElement('div');
  panel.id = 'settings-panel';

  panel.innerHTML = `
    <h3>Settings</h3>
    <label>Graphics Quality:
      <select id="graphics-quality">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high" selected>High</option>
        <option value="ultra">Ultra</option>
      </select>
    </label>
    <br/>
    <label>Sound:
      <input type="checkbox" id="sound-toggle" checked>
    </label>
    <br/>
    <button id="close-settings">Close</button>
  `;

  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('graphics-quality').addEventListener('change', e => {
    const val = e.target.value;
    console.log('[Settings] Graphics:', val);
    window.applyGraphicsPreset(val); // You’ll define this in main.js
  });

  document.getElementById('sound-toggle').addEventListener('change', e => {
    const enabled = e.target.checked;
    console.log('[Settings] Sound enabled:', enabled);
    window.toggleSound(enabled); // You’ll define this in main.js
  });

  document.getElementById('close-settings').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  console.log('[Settings] UI initialized');
}
