import React, { useEffect, useState } from 'react'
export default function Clock(){
  const [t, setT] = useState(new Date())
  useEffect(()=> { const id = setInterval(()=> setT(new Date()), 1000); return ()=> clearInterval(id) }, [])
  return <div style={{fontSize:36}}>{t.toLocaleTimeString()}</div>
}
