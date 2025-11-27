import React from 'react'

export default function StartMenu({ visible, apps, pinned, onOpen, onPin, onUnpin }){
  if(!visible) return null
  return (
    <div className="start-menu" role="dialog">
      <div className="start-left">
        <div className="brand"><div className="badge">A</div><div><div className="brand-title">Aurora</div><div className="muted">Modern web OS</div></div></div>
        <div className="section-title">Pinned</div>
        <div className="app-grid">
          {pinned.map(id => {
            const a = apps.find(x=>x.id===id)
            if(!a) return null
            return (
              <div className="app-card" key={id}>
                <div style={{display:'flex',alignItems:'center',gap:8}}><div>{a.icon}</div><div>{a.name}</div></div>
                <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                  <button className="tb-btn" onClick={()=> onOpen(a.id)}>Open</button>
                  <button className="tb-btn" onClick={()=> onUnpin(a.id)}>—</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="start-right">
        <div className="start-top"><div className="section-title">All apps</div></div>
        <div className="all-apps">
          {apps.map(a => (
            <div className="app-card" key={a.id}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{fontSize:20}}>{a.icon}</div><div>{a.name}</div></div>
              <div style={{display:'flex',gap:6}}>
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
