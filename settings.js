// settings.js — UI for graphics and sound
import { getPresetNames, applyPresetByName } from './graphicsPresets.js';

export function initSettingsUI(onPresetSelect){
  const overlay = document.createElement('div');
  overlay.id='settingsOverlay';
  overlay.className='hidden';
  overlay.innerHTML=`
    <h2>Settings</h2>
    <div id="graphicsSettings"></div>
    <div id="soundSettings">
      <h3>Sound</h3>
      <label>Master Volume <input type="range" id="masterVol" min="0" max="1" step="0.01" value="0.8"/></label>
    </div>
  `;
  document.body.appendChild(overlay);

  // Graphics buttons
  const graphicsDiv = document.getElementById('graphicsSettings');
  const presets = getPresetNames();
  presets.forEach(p=>{
    const btn = document.createElement('button');
    btn.innerText=p;
    btn.onclick=()=>{ applyPresetByName(p); onPresetSelect({name:p}); };
    graphicsDiv.appendChild(btn);
  });

  // Sound control
  const masterVol = document.getElementById('masterVol');
  masterVol.addEventListener('input', e=>{
    const val=parseFloat(e.target.value);
    const audios=document.querySelectorAll('audio');
    audios.forEach(a=>a.volume=val);
  });
}
