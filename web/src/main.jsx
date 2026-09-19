import React from "react";
import ReactDOM from "react-dom/client";
import {
  _setPageConfig,
  WatchPage,
  triggerRender,
} from "zepp-web-runner/components/WatchPage";
import DebugPanel from "./components/DebugPanel.jsx";

globalThis.Page = _setPageConfig;

async function init() {
  await import("../../page/index.js");

  function App() {
    return (
      <div
        style={{
          display: "flex",
          gap: 24,
          paddingTop: 20,
          justifyContent: "center",
        }}
      >
        <WatchPage />
        <DebugPanel onRender={triggerRender} />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

init();
