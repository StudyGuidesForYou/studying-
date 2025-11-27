import React, { useEffect, useRef, useState } from 'react'
import Window from './components/Window'
import Taskbar from './components/Taskbar'
import StartMenu from './components/StartMenu'
import Notepad from './apps/Notepad'
import Calculator from './apps/Calculator'
import PaintApp from './apps/Paint'
import FilesApp from './apps/Files'
import PhotosApp from './apps/Photos'
import MusicApp from './apps/Music'
import BrowserApp from './apps/Browser'
import SettingsApp from './apps/Settings'
import TerminalApp from './apps/Terminal'
import ClockApp from './apps/Clock'

const STORAGE_KEY = 'aurora_react_v1'
const uid = (p='id') => p + Math.random().toString(36).slice(2,9)

const DEFAULT_STATE = {
  z: 1000,
  pinned: ['files','photos','music','browser'],
  notes: { default: '' },
  calc: '',
  paint: null,
  files: [{ id:'f_readme', name:'Welcome.txt', type:'text', content:'Welcome to Aurora (React) — double-click a file to open.' }],
  photos: [],
  music: [],
  wallpaper: null,
  windows: []
}

function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_STATE }
  catch { return DEFAULT_STATE }
}
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

const APPS = [
  { id:'notepad', name:'Notepad', icon:'📝', comp: Notepad },
  { id:'calculator', name:'Calculator', icon:'🧮', comp: Calculator },
  { id:'paint', name:'Paint', icon:'🎨', comp: PaintApp },
  { id:'terminal', name:'Terminal', icon:'💻', comp: TerminalApp },
  { id:'files', name:'Files', icon:'📁', comp: FilesApp },
  { id:'photos', name:'Photos', icon:'🖼️', comp: PhotosApp },
  { id:'music', name:'Music', icon:'🎵', comp: MusicApp },
  { id:'browser', name:'Browser', icon:'🕸️', comp: BrowserApp },
  { id:'settings', name:'Settings', icon:'⚙️', comp: SettingsApp },
  { id:'clock', name:'Clock', icon:'🕒', comp: ClockApp }
]

export default function App(){
  const [state, setState] = useState(loadState)
  const [showStart, setShowStart] = useState(false)
  const [ctx, setCtx] = useState({ visible:false, x:0, y:0 })
  const [time, setTime] = useState(new Date())
  const rootRef = useRef()

  useEffect(()=> saveState(state), [state])
  useEffect(()=> {
    const t = setInterval(()=> setTime(new Date()), 1000)
    return ()=> clearInterval(t)
  }, [])

  useEffect(()=> {
    if(state.wallpaper){
      document.querySelector('.wallpaper').style.backgroundImage = `url(${state.wallpaper})`
    }
  }, [state.wallpaper])

  function findApp(id){ return APPS.find(a=>a.id===id) }

  function openWindow(appId, opts={}){
    const app = findApp(appId)
    if(!app) return
    // allow single-instance for some apps
    if(opts.single){
      const exists = state.windows.find(w=> w.appId === appId)
      if(exists){
        // focus existing
        setState(s => ({ ...s, z: s.z+1, windows: s.windows.map(w => w === exists ? {...w, z: s.z+1, minimized:false} : w) }))
        return
      }
    }
    const w = {
      winId: uid('win_'),
      appId: app.id,
      title: app.name,
      icon: app.icon,
      x: Math.max(20, (window.innerWidth - 800)/2 + Math.random()*20),
      y: Math.max(20, (window.innerHeight - 520)/2 + Math.random()*20),
      w: Math.min(900, window.innerWidth * 0.8),
      h: Math.min(600, window.innerHeight * 0.7),
      z: state.z + 1,
      minimized: false,
      maximized: false,
      props: opts.props || {}
    }
    setState(s => ({ ...s, z: s.z + 1, windows: [w, ...(s.windows || [])] }))
  }

  function updateWindow(winId, patch){
    setState(s => ({ ...s, windows: s.windows.map(w => w.winId === winId ? {...w, ...patch} : w) }))
  }
  function closeWindow(winId){ setState(s => ({ ...s, windows: s.windows.filter(w => w.winId !== winId) })) }
  function pinApp(id){ setState(s => ({ ...s, pinned: [id, ...s.pinned.filter(x=>x!==id)] })) }
  function unpinApp(id){ setState(s => ({ ...s, pinned: s.pinned.filter(x=>x!==id) })) }

  function handleDesktopContext(e){
    e.preventDefault()
    setCtx({ visible:true, x:e.clientX, y:e.clientY })
  }

  function handleFileUpload(files){
    const arr = Array.from(files || [])
    arr.forEach(async (f) => {
      const data = await fileToDataURL(f)
      const ext = (f.name.split('.').pop()||'').toLowerCase()
      if(['png','jpg','jpeg','gif','webp','bmp'].includes(ext)){
        const id = uid('img')
        setState(s => ({ ...s, photos: [...s.photos, { id, name: f.name, data }], files: [...s.files, { id, name: f.name, type:'image', content: data }] }))
      } else if(['mp3','wav','ogg','m4a'].includes(ext)){
        const id = uid('aud')
        setState(s => ({ ...s, music: [...s.music, { id, name: f.name, data }], files: [...s.files, { id, name: f.name, type:'audio', content: data }] }))
      } else if(f.type.startsWith('text') || ext==='txt' || ext==='json'){
        const txt = await f.text()
        setState(s => ({ ...s, files: [...s.files, { id: uid('txt'), name: f.name, type:'text', content: txt }] }))
      } else {
        const id = uid('bin')
        setState(s => ({ ...s, files: [...s.files, { id, name: f.name, type:'binary', content: data }] }))
      }
    })
  }

  function fileToDataURL(file){
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = ()=> res(r.result)
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  return (
    <div className="aurora-root" ref={rootRef} onContextMenu={handleDesktopContext}>
      <div className="wallpaper" aria-hidden="true" />
      <div className="desktop-shell">
        {/* Desktop icons */}
        <div className="desktop-icons">
          {APPS.map(a=> (
            <div key={a.id} className="desk-icon" title={a.name}
                 onDoubleClick={() => openWindow(a.id, { single:true })}>
              <div className="icon-emoji">{a.icon}</div>
              <div className="icon-label">{a.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Start menu */}
      <StartMenu
        visible={showStart}
        apps={APPS}
        pinned={state.pinned}
        onOpen={(id) => { openWindow(id, { single:true }); setShowStart(false) }}
        onPin={pinApp}
        onUnpin={unpinApp}
      />

      {/* Taskbar */}
      <Taskbar
        pinned={state.pinned}
        onLaunch={(id)=> openWindow(id)}
        time={time}
        onToggleStart={() => setShowStart(s=>!s)}
        onSettings={() => openWindow('settings', { single:true })}
      />

      {/* Context menu */}
      {ctx.visible && (
        <div className="context-menu" style={{ left: ctx.x, top: ctx.y }}>
          <button onClick={() => { setCtx({...ctx, visible:false}); openWindow('notepad', { single:true }) }}>New text file</button>
          <label className="ctx-upload">
            Upload file...
            <input type="file" multiple onChange={(e)=> { handleFileUpload(e.target.files); setCtx({...ctx, visible:false}) }} />
          </label>
          <button onClick={() => { setCtx({...ctx, visible:false}); setState(s => ({ ...s })) }}>Refresh</button>
          <button onClick={() => { setCtx({...ctx, visible:false}); openWindow('settings', { single:true }) }}>Change wallpaper</button>
        </div>
      )}

      {/* Windows */}
      {state.windows.map(win => {
        const AppComp = (APPS.find(a=>a.id===win.appId) || {}).comp
        return (
          <Window key={win.winId}
                  win={win}
                  onFocus={() => updateWindow(win.winId, { z: state.z + 1 })}
                  onClose={() => closeWindow(win.winId)}
                  onMinimize={() => updateWindow(win.winId, { minimized:true })}
                  onRestore={() => updateWindow(win.winId, { minimized:false, z: state.z + 1 })}
                  onToggleMax={() => updateWindow(win.winId, { maximized: !win.maximized })}
                  onMove={(x,y) => updateWindow(win.winId, { x,y })}
                  onResize={(w,h) => updateWindow(win.winId, { w,h })}
            >
            {AppComp ? <AppComp state={state} setState={setState} openWindow={openWindow} win={win} /> : <div>App not found</div>}
          </Window>
        )
      })}

    </div>
  )
}
