import React from 'react'

export default function Taskbar({ pinned = [], onLaunch = ()=>{}, time = new Date(), onToggleStart = ()=>{}, onSettings = ()=>{} }){
  return (
    <div className="taskbar" role="navigation" aria-label="Taskbar">
      <button className="start-btn" onClick={onToggleStart}>A</button>
      <div className="tb-pinned">
        {pinned.map(p => <button key={p} className="tb-btn" onClick={()=> onLaunch(p)} title={p}>{p[0].toUpperCase()}</button>)}
      </div>
      <div style={{ flex:1 }} />
      <div className="tray">
        <div className="tray-label">Aurora</div>
        <div className="tray-time">{time.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
        <button className="tb-btn" onClick={onSettings}>⚙</button>
      </div>
    </div>
  )
}
