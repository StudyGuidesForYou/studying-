import React, { useRef, useState, useEffect } from 'react'
export default function Music({ state, setState }){
  const audio = useRef(new Audio())
  const [idx, setIdx] = useState(0)
  useEffect(()=> {
    audio.current.onended = () => {
      if(idx < state.music.length - 1) setIdx(i => i + 1)
    }
  }, [state.music, idx])
  useEffect(()=> {
    if(state.music[idx]) { audio.current.src = state.music[idx].data }
  }, [idx, state.music])
  function play(i){ if(!state.music[i]) return; audio.current.src = state.music[i].data; audio.current.play(); setIdx(i) }
  return (
    <div style={{display:'flex',gap:12}}>
      <div style={{flex:1}}>
        {state.music.length === 0 ? <div className="empty">No tracks.</div> : state.music.map((m,i)=> (
          <div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:8}}>
            <div>{m.name}</div>
            <div><button onClick={()=> play(i)}>Play</button></div>
          </div>
        ))}
      </div>
      <div style={{width:300,background:'rgba(255,255,255,0.01)',padding:8,borderRadius:8}}>
        <div className="small">Now: {state.music[idx]?.name || 'No track'}</div>
      </div>
    </div>
  )
}
