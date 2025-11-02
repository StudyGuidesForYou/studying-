// settings.js
import { getPresetNames, getPresetByName } from './graphicsPresets.js';

// small helper
const $ = id => document.getElementById(id);
function setText(id, txt){ const el = $(id); if(el) el.textContent = txt; }

function initUI() {
  // open/close
  $('openSettings').addEventListener('click', () => $('settingsOverlay').classList.remove('hidden'));
  ['closeSettings','cancelSettings'].forEach(id => $(id).addEventListener('click', () => $('settingsOverlay').classList.add('hidden')));

  // populate presets
  const presetSelect = $('presetSelect');
  getPresetNames().forEach(n => {
    const o = document.createElement('option'); o.value = n; o.textContent = n; presetSelect.appendChild(o);
  });

  // wire elements to local values (from window.sr.state or defaults)
  const state = window.sr && window.sr.state ? window.sr.state : {
    detail:1, viewDistance:1800, renderScale:1, nativePixel:false, framerateLimit:0,
    worldMode:'natural', dayNight:'day', treeDensity:1, cameraSmoothing:0.06, fov:70, fovEffects:true
  };

  $('viewDistance').value = state.viewDistance;
  $('detail').value = state.detail;
  $('renderScale').value = state.renderScale;
  $('nativePixel').checked = state.nativePixel;
  $('framerateLimit').value = state.framerateLimit;
  $('worldMode').value = state.worldMode;
  $('dayNight').value = state.dayNight;
  $('treeDensity').value = state.treeDensity;
  $('cameraSmoothing').value = state.cameraSmoothing;
  $('fov').value = state.fov;
  $('fovEffects').checked = state.fovEffects;
  $('presetSelect').value = state.preset ?? 'Smooth Gamer';

  // output update
  function setOutputs(){
    setText('viewDistanceVal', $('viewDistance').value + 'm');
    setText('detailVal', parseFloat($('detail').value).toFixed(1));
    setText('renderScaleVal', Math.round($('renderScale').value * 100) + '%');
    setText('treeDensityVal', $('treeDensity').value);
    setText('cameraSmoothingVal', $('cameraSmoothing').value);
    setText('fovVal', $('fov').value);
  }
  setOutputs();

  // live preview of sliders (update outputs)
  ['viewDistance','detail','renderScale','treeDensity','cameraSmoothing','fov'].forEach(id => {
    $(id).addEventListener('input', setOutputs);
  });

  // preset change
  $('presetSelect').addEventListener('change', (e) => {
    const p = getPresetByName(e.target.value);
    if(!p) return;
    // update controls to reflect preset
    $('detail').value = p.detail;
    $('viewDistance').value = p.viewDistance;
    $('renderScale').value = p.renderScale;
    setOutputs();
  });

  // quick apply button
  $('applySettings').addEventListener('click', () => {
    const opts = {
      detail: parseFloat($('detail').value),
      viewDistance: parseInt($('viewDistance').value, 10),
      renderScale: parseFloat($('renderScale').value),
      nativePixel: $('nativePixel').checked,
      framerateLimit: parseInt($('framerateLimit').value, 10),
      worldMode: $('worldMode').value,
      dayNight: $('dayNight').value,
      treeDensity: parseFloat($('treeDensity').value),
      cameraSmoothing: parseFloat($('cameraSmoothing').value),
      fov: parseFloat($('fov').value),
      fovEffects: $('fovEffects').checked,
      preset: $('presetSelect').value
    };
    window.sr.applyGraphicsSettings(opts);
  });

  $('saveSettings').addEventListener('click', () => {
    $('applySettings').click();
    window.sr.saveGraphicsSettings();
    $('settingsOverlay').classList.add('hidden');
  });

  $('resetGeneral').addEventListener('click', () => {
    // restore defaults
    $('detail').value = 1; $('viewDistance').value = 1800; $('renderScale').value = 1; $('nativePixel').checked = false;
    setOutputs();
  });

  $('resetWorld').addEventListener('click', () => {
    $('worldMode').value = 'natural'; $('dayNight').value = 'day'; $('treeDensity').value = 1; setOutputs();
  });
}

window.addEventListener('DOMContentLoaded', initUI);
