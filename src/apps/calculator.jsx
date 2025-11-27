import React, { useState } from 'react'
export default function Calculator({ state, setState }){
  const [expr, setExpr] = useState(state.calc || '')
  function safeEval(e){
    try {
      const s = e.replace(/\^/g, '**').replace(/\bPI\b/g, 'Math.PI').replace(/\bE\b/g,'Math.E')
      const fn = new Function('Math', 'return ' + s + ';')
      const r = fn(Math)
      return r
    } catch { return 'Error' }
  }
  function press(v){
    if(v === 'C'){ setExpr(''); setState(s=> ({ ...s, calc: '' })); return }
    if(v === '='){ const r = safeEval(expr); setExpr(String(r)); setState(s=> ({ ...s, calc: String(r) })); return }
    setExpr(x=> x + v); setState(s=> ({ ...s, calc: expr + v }))
  }
  const layout = ['7','8','9','/','sqrt(','4','5','6','*','pow(','1','2','3','+','-','0','.','%','=','C']
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <input value={expr} onChange={(e)=> setExpr(e.target.value)} className="input" style={{padding:12,fontSize:18,marginBottom:8}} />
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
        {layout.map(k => <button key={k} onClick={()=> press(k)}>{k}</button>)}
      </div>
    </div>
  )
}
