import React, { useRef, useEffect } from 'react'

export default function Window({ win, children, onFocus, onClose, onMinimize, onRestore, onToggleMax, onMove, onResize }) {
  const ref = useRef()
  const dragging = useRef(false)
  const offset = useRef({ x:0, y:0 })

  useEffect(()=> {
    const onMoveWindow = (e) => {
      if(!dragging.current) return
      const nx = e.clientX - offset.current.x
      const ny = e.clientY - offset.current.y
      const w = ref.current?.offsetWidth || win.w
      const h = ref.current?.offsetHeight || win.h
      const cx = Math.min(Math.max(0, nx), window.innerWidth - w)
      const cy = Math.min(Math.max(0, ny), window.innerHeight - h)
      onMove(cx, cy)
    }
    const onUp = ()=> dragging.current = false
    window.addEventListener('mousemove', onMoveWindow)
    window.addEventListener('mouseup', onUp)
    return ()=> {
      window.removeEventListener('mousemove', onMoveWindow)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onMove, win.w, win.h])

  function startDrag(e){
    dragging.current = true
    const rect = ref.current.getBoundingClientRect()
    offset.current.x = e.clientX - rect.left
    offset.current.y = e.clientY - rect.top
  }

  const style = win.maximized ? { left:0, top:0, width:'100%', height:'100%', zIndex: win.z } : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }
  if(win.minimized) style.display = 'none'

  return (
    <div ref={ref} className="window" style={{ position:'absolute', ...style }} onMouseDown={onFocus}>
      <div className="win-header" onMouseDown={startDrag}>
        <div className="win-title">
          <div className="win-icon">{win.icon}</div>
          <div className="win-text">{win.title}</div>
        </div>
        <div className="win-controls">
          <button onClick={onMinimize} title="Minimize">—</button>
          <button onClick={onToggleMax} title={win.maximized ? 'Restore' : 'Maximize'}>{win.maximized ? '🗗' : '🗖'}</button>
          <button onClick={onClose} title="Close">✖</button>
        </div>
      </div>
      <div className="win-body">{children}</div>
    </div>
  )
}
