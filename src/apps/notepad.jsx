import React from 'react'
export default function Notepad({ state, setState }){
  const value = state.notes.default || ''
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div className="toolbar">
        <button onClick={()=> alert('Saved')}>Save</button>
        <button onClick={()=> { if(confirm('Clear?')) setState(s=> ({ ...s, notes:{...s.notes, default:''} })) }}>Clear</button>
        <div style={{marginLeft:'auto'}} className="small">Auto-saves</div>
      </div>
      <textarea value={value} onChange={(e)=> setState(s=> ({ ...s, notes:{...s.notes, default: e.target.value} })) } style={{flex:1,padding:10,borderRadius:8}} />
    </div>
  )
}
