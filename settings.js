// settings.js — graphics + sound UI
export function setupUI({ renderer, camera, car, scene }) {
    const ui = document.createElement('div');
    ui.id = 'sr_ui';
    ui.innerHTML = `
        <button id="sr_toggleSettings">Settings</button>
        <div id="sr_settingsPanel">
            <label>Render Scale: <input type="range" id="sr_renderScale" min="0.5" max="2" step="0.1" value="1"></label>
            <label>Shadow Quality: <select id="sr_shadowQuality">
                <option value="0">Low</option>
                <option value="1" selected>Medium</option>
                <option value="2">High</option>
            </select></label>
            <label>Sound: <input type="checkbox" id="sr_sound" checked></label>
        </div>
    `;
    document.body.appendChild(ui);

    const panel = document.getElementById('sr_settingsPanel');
    panel.style.display = 'none';

    document.getElementById('sr_toggleSettings').addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('sr_renderScale').addEventListener('input', e => {
        renderer.setPixelRatio(window.devicePixelRatio * parseFloat(e.target.value));
    });

    document.getElementById('sr_shadowQuality').addEventListener('change', e => {
        const val = parseInt(e.target.value);
        renderer.shadowMap.enabled = val > 0;
    });

    document.getElementById('sr_sound').addEventListener('change', e => {
        if(e.target.checked) playEngineSound();
        else stopEngineSound();
    });
}

// Placeholder
function playEngineSound() { console.log('Engine sound ON'); }
function stopEngineSound() { console.log('Engine sound OFF'); }
