import React, { useState } from 'react';
import StartMenu from './StartMenu.jsx';
import Taskbar from './Taskbar.jsx';
import Browser from '../apps/Browser.jsx';
import Calculator from '../apps/Calculator.jsx';
import Clock from '../apps/Clock.jsx';
import Files from '../apps/Files.jsx';
import Music from '../apps/Music.jsx';
import Notepad from '../apps/Notepad.jsx';
import Paint from '../apps/Paint.jsx';
import Photos from '../apps/Photos.jsx';
import Settings from '../apps/Settings.jsx';
import Terminal from '../apps/Terminal.jsx';

const appsList = {
  Browser,
  Calculator,
  Clock,
  Files,
  Music,
  Notepad,
  Paint,
  Photos,
  Settings,
  Terminal
};

export default function Apps() {
  const [openApps, setOpenApps] = useState([]);

  const openApp = (name) => {
    if (!openApps.includes(name)) setOpenApps([...openApps, name]);
  };

  const closeApp = (name) => {
    setOpenApps(openApps.filter(app => app !== name));
  };

  return (
    <div className="desktop">
      <StartMenu apps={appsList} onOpen={openApp} />
      {openApps.map((appName) => {
        const AppComponent = appsList[appName];
        return (
          <div className="window" key={appName}>
            <div className="window-header">
              {appName}
              <button onClick={() => closeApp(appName)}>X</button>
            </div>
            <div className="window-body">
              <AppComponent />
            </div>
          </div>
        );
      })}
      <Taskbar openApps={openApps} onOpen={openApp} onClose={closeApp} />
    </div>
  );
}
