import React from 'react';
import ReactDOM from 'react-dom/client';
import { InfiniteCanvasProvider } from '@infinit-canvas/react';

import App from './App';

import './index.css';
import './xy-theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <InfiniteCanvasProvider>
      <App />
    </InfiniteCanvasProvider>
  </React.StrictMode>
);
