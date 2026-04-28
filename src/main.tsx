import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

type RuntimeWindow = Window & {
  process?: {
    env?: Record<string, string>;
  };
};

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string>;
};

if (typeof window !== 'undefined') {
  const runtimeWindow = window as RuntimeWindow;
  const existingEnv = runtimeWindow.process?.env ?? {};
  runtimeWindow.process = {
    env: {
      ...existingEnv,
      ...((import.meta as ImportMetaWithEnv).env ?? {}),
    },
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
