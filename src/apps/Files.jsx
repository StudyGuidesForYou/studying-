import React from 'react'
const uid = (p='id') => p + Math.random().toString(36).slice(2,9)
export default function Files({ state, setState, openWindow, handleFiles }) {
  function openFile(id){
    const it = state.files.find(f => f.id === id)
    if(!it) return
    if(it.type === 'text'){ openWindow('notepad', { single:true }) }
    else if(it.type === 'image'){ openWindow('photos', { single:true }) }
    else alert('Opened: ' + it.name)
  }
  function downloadFile(it){
    if(it.type === 'text'){
      const blob = new Blob([it.content || ''], { type:'text/plain' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = it.name; a.click(); URL.revokeObjectURL(a.href)
    } else if(it.content){
      const a = document.createElement('a'); a.href = it.content; a.download = it.name; a.click()
    }
  }
  function deleteFile(id){ if(!confirm('Delete file?')) return; setState(s=> ({ ...s, files: s.files.filter(f=>f.id !== id) })) }
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={()=> { const name = prompt('Filename','note.txt'); if(!name) return; setState(s=> ({ ...s, files:[...s.files, { id: uid('f'), name, type:'text', content:'' }] })) }}>New File</button>
        <label style={{ background:'rgba(255,255,255,0.02)', padding:'6px', borderRadius:6, cursor:'pointer' }}>
          Upload
          <input type="file" style={{ display:'none' }} onChange={(e)=> handleFiles(e.target.files)} />
        </label>
      </div>
      <div style={{ marginTop:8, overflow:'auto', flex:1 }}>
        {state.files.map(f => (
          <div key={f.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, borderRadius:8 }}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <div>{f.type === 'text' ? '📄' : f.type === 'image' ? '🖼️' : '📦'}</div>
              <div style={{ minWidth:220 }}>{f.name}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=> openFile(f.id)}>Open</button>
              <button onClick={()=> downloadFile(f)}>⇩</button>
              <button onClick={()=> deleteFile(f.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
