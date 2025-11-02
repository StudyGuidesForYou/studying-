// settings.js
import { getPresetNames } from './graphicsPresets.js';
export function initSettingsUI(callback){
  const sel = document.createElement('select');
  sel.style.position='absolute'; sel.style.top='10px'; sel.style.right='10px'; sel.style.zIndex='999';
  getPresetNames().forEach(n=>{ const opt=document.createElement('option'); opt.value=n; opt.innerText=n; sel.appendChild(opt); });
  sel.addEventListener('change',e=>callback({name:e.target.value}));
  document.body.appendChild(sel);
}
