import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/source-serif-4/700-italic.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/tokens.css';
import './styles/app.css';
import { StoreProvider, useStore } from './state/store.jsx';
import Login from './pages/Login.jsx';
import AppShell from './components/AppShell.jsx';
import Tour from './components/Tour.jsx';

function Root() {
  const { session } = useStore();
  return (
    <>
      {session ? <AppShell /> : <Login />}
      <Tour />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <Root />
    </StoreProvider>
  </React.StrictMode>,
);
