import React from 'react'

export default function StartMenu({ visible=false, apps = [], pinned = [], onOpen = ()=>{}, onPin = ()=>{}, onUnpin = ()=>{} }){
  if(!visible) return null
  return (
    <div className="start-menu" role="dialog">
      <div className="start-left">
        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:6 }}>
          <div className="badge">A</div>
          <div>
            <div className="brand-title">Aurora</div>
            <div className="muted">Modern Web OS</div>
          </div>
        </div>

        <div className="section-title">Pinned</div>
        <div className="app-grid">
          {pinned.map(pid => {
            const app = apps.find(a => a.id === pid)
            if(!app) return null
            return (
              <div className="app-card" key={pid}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}><div>{app.icon}</div><div>{app.name}</div></div>
                <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                  <button className="tb-btn" onClick={()=> onOpen(app.id)}>Open</button>
                  <button className="tb-btn" onClick={()=> onUnpin(app.id)}>—</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="start-right">
        <div className="start-top">
          <div className="section-title">All apps</div>
        </div>
        <div className="all-apps" style={{ marginTop:8, overflow:'auto' }}>
          {apps.map(a => (
            <div className="app-card" key={a.id}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}><div style={{ fontSize:20 }}>{a.icon}</div><div>{a.name}</div></div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="tb-btn" onClick={()=> onOpen(a.id)}>Open</button>
                <button className="tb-btn" onClick={()=> onPin(a.id)}>📌</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
