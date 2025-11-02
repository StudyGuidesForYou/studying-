// settings.js
import { getPresetNames, getPresetByName } from './graphicsPresets.js';

const $ = id => document.getElementById(id);
function setText(id, txt){ const el = $(id); if(el) el.textContent = txt; }

export function initSettingsUI() {
  const presetSelect = $('presetSelect');
  getPresetNames().forEach(n => {
    const o = document.createElement('option');
    o.value = n; o.textContent = n;
    presetSelect.appendChild(o);
  });

  const state = window.sr && window.sr.state ? window.sr.state : {
    detail:1, viewDistance:1800, renderScale:1, nativePixel:false, framerateLimit:0,
    worldMode:'natural', dayNight:'day', treeDensity:1, cameraSmoothing:0.06, fov:70, fovEffects:true,
    preset:'Normal Human'
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
  $('presetSelect').value = state.preset ?? 'Normal Human';

  function setOutputs(){
    setText('viewDistanceVal', $('viewDistance').value + 'm');
    setText('detailVal', parseFloat($('detail').value).toFixed(1));
    setText('renderScaleVal', Math.round($('renderScale').value*100)+'%');
    setText('treeDensityVal', $('treeDensity').value);
    setText('cameraSmoothingVal', $('cameraSmoothing').value);
    setText('fovVal', $('fov').value);
  }
  setOutputs();
  ['viewDistance','detail','renderScale','treeDensity','cameraSmoothing','fov'].forEach(id=>{
    $(id).addEventListener('input', setOutputs);
  });

  $('presetSelect').addEventListener('change', (e)=>{
    const p = getPresetByName(e.target.value);
    if(!p) return;
    $('detail').value = p.terrainDetail;
    $('viewDistance').value = p.viewDistance;
    $('renderScale').value = p.renderScale;
    $('treeDensity').value = p.treeDensity;
    setOutputs();
  });

  $('applySettings').addEventListener('click', ()=>{
    const opts = {
      detail: parseFloat($('detail').value),
      viewDistance: parseInt($('viewDistance').value,10),
      renderScale: parseFloat($('renderScale').value),
      nativePixel: $('nativePixel').checked,
      framerateLimit: parseInt($('framerateLimit').value,10),
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

  $('saveSettings').addEventListener('click', ()=>{
    $('applySettings').click();
    window.sr.saveGraphicsSettings();
    $('settingsOverlay').classList.add('hidden');
  });
}
