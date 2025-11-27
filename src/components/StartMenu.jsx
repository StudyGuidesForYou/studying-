import React, { useState } from 'react';

export default function StartMenu({ apps, onOpen }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="start-menu-container">
      <button className="start-button" onClick={() => setVisible(!visible)}>
        Start
      </button>
      {visible && (
        <div className="start-menu">
          {Object.keys(apps).map((appName) => (
            <div
              key={appName}
              className="start-menu-item"
              onClick={() => {
                onOpen(appName);
                setVisible(false);
              }}
            >
              {appName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
