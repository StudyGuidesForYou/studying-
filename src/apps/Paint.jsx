import React, { useEffect, useRef } from 'react'
export default function Paint({ state, setState }) {
  const canvasRef = useRef()
  useEffect(()=>{
    const c = canvasRef.current; if(!c) return
    const ctx = c.getContext('2d')
    function resize(){
      c.width = c.clientWidth; c.height = c.clientHeight
      if(state.paint){
        const img = new Image(); img.src = state.paint; img.onload = ()=> ctx.drawImage(img,0,0,c.width,c.height)
      }
    }
    window.addEventListener('resize', resize); resize()
    return ()=> window.removeEventListener('resize', resize)
  },[state.paint])
  useEffect(()=>{
    const c = canvasRef.current; if(!c) return
    const ctx = c.getContext('2d'); ctx.lineCap='round'; ctx.lineJoin='round'; let drawing=false
    function md(e){ drawing=true; ctx.beginPath(); const r=c.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top) }
    function mm(e){ if(!drawing) return; const r=c.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top) }
    function mu(){ drawing=false; ctx.beginPath(); setState(s=> ({ ...s, paint: c.toDataURL() })) }
    c.addEventListener('mousedown', md); window.addEventListener('mousemove', mm); window.addEventListener('mouseup', mu)
    return ()=> { c.removeEventListener('mousedown', md); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu) }
  },[setState])
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div className="toolbar">
        <input type="color" defaultValue="#ffffff" onChange={(e)=> canvasRef.current.getContext('2d').strokeStyle = e.target.value} />
        <input type="range" min="1" max="40" defaultValue="3" onChange={(e)=> canvasRef.current.getContext('2d').lineWidth = Number(e.target.value)} />
        <button onClick={()=> { const c=canvasRef.current; c.getContext('2d').clearRect(0,0,c.width,c.height); setState(s=> ({ ...s, paint:null })) }}>Clear</button>
      </div>
      <div style={{ flex:1, position:'relative', marginTop:8 }}>
        <canvas ref={canvasRef} style={{ width:'100%', height:'100%', borderRadius:8, background:'transparent' }} />
      </div>
    </div>
  )
}
