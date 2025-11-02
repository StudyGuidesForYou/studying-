import { getPresetNames, getPresetByName } from './graphicsPresets.js';

export function initSettingsUI(callback){
  const container=document.createElement('div');
  container.style.position='absolute';
  container.style.top='10px';
  container.style.left='10px';
  container.style.background='rgba(0,0,0,0.7)';
  container.style.padding='6px 10px';
  container.style.borderRadius='6px';
  container.style.zIndex='10000';
  container.style.fontFamily='monospace';
  container.style.color='#fff';

  const label=document.createElement('label');
  label.innerText='Graphics: ';
  container.appendChild(label);

  const sel=document.createElement('select');
  getPresetNames().forEach(n=>{
    const opt=document.createElement('option');
    opt.value=n;
    opt.innerText=n;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', e=>{
    const p=getPresetByName(e.target.value);
    if(p) callback(p);
  });
  container.appendChild(sel);
  document.body.appendChild(container);
}
