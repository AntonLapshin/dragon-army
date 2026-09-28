import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
  _setPageConfigFixed as _setPageConfig,
  WatchPageFixed as WatchPage,
  triggerRender,
} from "./components/WatchPageFixed.jsx";
import DebugPanel from "./components/DebugPanel.jsx";
import {
  deviceAdapter,
  setDeviceOverride,
  BIP6_INFO,
  ROUND480_INFO,
} from "./adapters/deviceAdapter.js";
import { refreshLayout } from "../../page/layouts.js";

globalThis.Page = _setPageConfig;

const DEVICES = {
  bip6: { info: BIP6_INFO, width: 390, height: 450, shape: "rect" },
  round: { info: ROUND480_INFO, width: 480, height: 480, shape: "round" },
};

async function init() {
  await import("../../page/index.js");

  function App() {
    const [deviceId, setDeviceId] = useState("bip6");
    const device = DEVICES[deviceId] || DEVICES.bip6;

    function handleDeviceChange(id) {
      if (!DEVICES[id]) return;
      // Same data-driven switch the watch does at startup: report new
      // device numbers, reload the matching layout table, re-render.
      setDeviceOverride(DEVICES[id].info);
      refreshLayout(deviceAdapter.getInfo());
      setDeviceId(id);
      triggerRender();
    }

    return (
      <div
        style={{
          display: "flex",
          gap: 24,
          paddingTop: 20,
          justifyContent: "center",
        }}
      >
        <WatchPage
          width={device.width}
          height={device.height}
          shape={device.shape}
        />
        <DebugPanel
          onRender={triggerRender}
          deviceId={deviceId}
          onDeviceChange={handleDeviceChange}
        />
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
