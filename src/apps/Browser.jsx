import React, { useState } from 'react'
export default function Browser(){
  const [url, setUrl] = useState('https://example.com')
  function open(){
    if(!url) return
    const u = url.startsWith('http') ? url : 'https://' + url
    // use new tab (iframe sometimes blocked)
    window.open(u, '_blank')
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', gap:8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} style={{ flex:1 }} />
        <button onClick={open}>Open</button>
      </div>
      <div style={{ flex:1, marginTop:8, borderRadius:8, background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div>Browser preview disabled for compatibility — opened in a new tab.</div>
      </div>
    </div>
  )
}
