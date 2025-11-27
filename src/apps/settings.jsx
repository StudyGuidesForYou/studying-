import React from 'react'
const STORAGE_KEY = 'aurora_state_v1'
export default function Settings({ state, setState }) {
  function onWallpaper(e){
    const f = e.target.files[0]; if(!f) return
    const r = new FileReader()
    r.onload = () => setState(s=> ({ ...s, wallpaper: r.result }))
    r.readAsDataURL(f)
  }
  function exportState(){
    const dump = JSON.stringify(state)
    const blob = new Blob([dump], { type:'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'aurora-export.json'; a.click(); URL.revokeObjectURL(a.href)
  }
  function clearAll(){ if(confirm('Clear all Aurora data?')){ localStorage.removeItem(STORAGE_KEY); location.reload() } }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ fontWeight:800 }}>Wallpaper</div>
        <input type="file" accept="image/*" onChange={onWallpaper} />
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={exportState}>Export</button>
        <button onClick={clearAll}>Clear all data</button>
      </div>
      <div className="small">Everything is saved in your browser.</div>
    </div>
  )
}
