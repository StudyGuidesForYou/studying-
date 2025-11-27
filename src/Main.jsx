{"variant":"standard","title":"Rewritten Main.jsx for Vite React","id":"75104"}
import React from 'react';
import Apps from './Apps.jsx';
import StartMenu from './StartMenu.jsx';
import Taskbar from './Taskbar.jsx';

// Import all your individual app components
import Browser from './apps/Browser.jsx';
import Calculator from './apps/Calculator.jsx';
import Clock from './apps/Clock.jsx';
import Files from './apps/Files.jsx';
import Music from './apps/Music.jsx';
import Notepad from './apps/Notepad.jsx';
import Paint from './apps/Paint.jsx';
import Photos from './apps/Photos.jsx';
import Settings from './apps/Settings.jsx';
import Terminal from './apps/Terminal.jsx';

function Main() {
  // Define all apps here, with names and components
  const allApps = [
    { name: 'Browser', component: <Browser /> },
    { name: 'Calculator', component: <Calculator /> },
    { name: 'Clock', component: <Clock /> },
    { name: 'Files', component: <Files /> },
    { name: 'Music', component: <Music /> },
    { name: 'Notepad', component: <Notepad /> },
    { name: 'Paint', component: <Paint /> },
    { name: 'Photos', component: <Photos /> },
    { name: 'Settings', component: <Settings /> },
    { name: 'Terminal', component: <Terminal /> },
  ];

  return (
    <div className="aurora-web-os">
      {/* Start Menu */}
      <StartMenu apps={allApps} />

      {/* Main Apps Container */}
      <Apps apps={allApps} />

      {/* Taskbar */}
      <Taskbar apps={allApps} />
    </div>
  );
}

export default Main;
