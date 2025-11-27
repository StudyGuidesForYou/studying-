import React from 'react'
export default function Photos({ state, setState }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
      {state.photos.length === 0 ? <div className="empty">No photos yet.</div> : state.photos.map(p => (
        <div key={p.id} style={{ backgroundImage:`url(${p.data})`, backgroundSize:'cover', backgroundPosition:'center', height:140, borderRadius:8 }} />
      ))}
    </div>
  )
}
