import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

// in this example, we don't import the pro theme,
// because we would have to override too many styles
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
