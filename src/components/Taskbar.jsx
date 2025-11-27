import React from 'react';

export default function Taskbar({ openApps, onOpen, onClose }) {
  return (
    <div className="taskbar">
      {openApps.map((appName) => (
        <div key={appName} className="taskbar-item">
          <button onClick={() => onOpen(appName)}>{appName}</button>
          <button onClick={() => onClose(appName)}>X</button>
        </div>
      ))}
    </div>
  );
}
