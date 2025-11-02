import { getPresetNames, getPresetByName } from './graphicsPresets.js';

const $ = id => document.getElementById(id);
function setText(id, txt){ const el = $(id); if(el) el.textContent = txt; }

function initUI(){
  const presetSelect = $('presetSelect');
  getPresetNames().forEach(n=>{
    const o=document.createElement('option');
    o.value=n; o.textContent=n;
    presetSelect.appendChild(o);
  });
}
window.addEventListener('DOMContentLoaded', initUI);
