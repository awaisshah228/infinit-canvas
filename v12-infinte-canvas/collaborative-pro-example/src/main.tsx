import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import { store } from "./store/index";

import { App } from "./";
import { YjsSync } from "./store/yjs-provider";


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <YjsSync>
      <App store={store} title="yjs" />
    </YjsSync>
  </StrictMode>
);
