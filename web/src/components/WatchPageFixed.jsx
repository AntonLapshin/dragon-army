import React, { useState, useEffect, useRef, useCallback } from "react";
import { _reset, _collect } from "zepp-web-runner/shims/hmUI";
import { DEVICE_WIDTH, DEVICE_HEIGHT } from "zepp-web-runner/constants";

// ---------------------------------------------------------------------------
// Local copy of zepp-web-runner WidgetRenderer with dev-only fixes:
//  1. GESTURE supports mouse drag (pointer events), not just touch, so swipe
//     navigation can be tested with `npm run dev` on a desktop browser.
//  2. Fully transparent colors (alpha 0x00, e.g. 0x00000000) render as
//     transparent instead of opaque black.
//  3. IMG never scales (real Zepp OS device behavior): source PNG is drawn
//     1:1 at (x, y) inside an overflow:hidden w/h box. objectFit contain/fill
//     is forbidden — it hid asset/widget size mismatches.
// ---------------------------------------------------------------------------

function toCssColor(c, alphaProp) {
  const a = (c >>> 24) & 0xff;
  const r = (c >>> 16) & 0xff;
  const g = (c >>> 8) & 0xff;
  const b = c & 0xff;
  // FILL_RECT opacity comes from the separate `alpha` prop (API 3.0+,
  // 0-255) with color as 24-bit RGB. When present it wins; otherwise fall
  // back to packed 8-digit ARGB for compatibility.
  if (alphaProp !== undefined && alphaProp !== null) {
    const alpha = Math.max(0, Math.min(255, alphaProp)) / 255;
    if (alpha === 0) return "rgba(0,0,0,0)";
    if (alpha === 1) {
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
    return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
  }
  // 24-bit RGB literals (e.g. 0xffffff) carry no alpha byte (a === 0) and
  // must render opaque; only an explicit 0x00000000 is transparent.
  if (c === 0) return "rgba(0,0,0,0)";
  if (a === 0 || a === 255) {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
  return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
}

function alignToFlex(alignH, alignV) {
  const style = {};
  if (alignH === "center") style.justifyContent = "center";
  else if (alignH === "right") style.justifyContent = "flex-end";
  else style.justifyContent = "flex-start";

  if (alignV === "center") style.alignItems = "center";
  else if (alignV === "bottom") style.alignItems = "flex-end";
  else style.alignItems = "flex-start";
  return style;
}

function baseStyle(props) {
  return {
    position: "absolute",
    left: props.x + "px",
    top: props.y + "px",
    width: props.w + "px",
    height: props.h + "px",
    boxSizing: "border-box",
    margin: 0,
    padding: 0,
  };
}

function imageUrl(src) {
  return import.meta.env.BASE_URL + "images/" + src;
}

function renderIMG(widget) {
  const p = widget._props;
  // Real Zepp OS device does NOT scale IMG widgets: the source PNG is drawn
  // 1:1 at (x, y) and w/h only define the box (cropping when the source is
  // larger, empty space when it is smaller). Never use objectFit contain/fill
  // here — that hid size mismatches in desktop testing. This renderer keeps
  // the <img> at its natural size inside an overflow:hidden box so the web
  // preview shows exactly what the watch shows (top-left anchored, clipped).
  // Translucent surfaces use FILL_RECT color + alpha, not IMG assets.
  const clickable = Boolean(widget._events.click);
  return (
    <div
      key={widget._id}
      style={{
        ...baseStyle(p),
        overflow: "hidden",
        pointerEvents: clickable ? "auto" : "none",
        cursor: clickable ? "pointer" : "default",
        userSelect: "none",
      }}
      onClick={
        clickable
          ? () => {
              widget._events.click.forEach((fn) => fn());
            }
          : undefined
      }
    >
      <img
        src={imageUrl(p.src)}
        alt=""
        style={{
          display: "block",
          width: "auto",
          height: "auto",
          maxWidth: "none",
          maxHeight: "none",
          pointerEvents: "none",
          userSelect: "none",
          flexShrink: 0,
        }}
        draggable={false}
      />
    </div>
  );
}

function renderTEXT(widget) {
  const p = widget._props;
  return (
    <div
      key={widget._id}
      style={{
        ...baseStyle(p),
        display: "flex",
        ...alignToFlex(p.align_h, p.align_v),
        color: toCssColor(p.color),
        fontSize: (p.text_size || 16) + "px",
        fontFamily: "sans-serif",
        lineHeight: 1.2,
        textAlign: p.align_h || "left",
        overflow: "hidden",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {p.text}
    </div>
  );
}

function renderFILL_RECT(widget) {
  const p = widget._props;
  const hasClick = Boolean(widget._events.click);
  return (
    <div
      key={widget._id}
      style={{
        ...baseStyle(p),
        backgroundColor: toCssColor(p.color, p.alpha),
        borderRadius: (p.radius || 0) + "px",
        pointerEvents: hasClick ? "auto" : "none",
        cursor: hasClick ? "pointer" : "default",
        userSelect: "none",
      }}
      onClick={
        hasClick
          ? () => {
              widget._events.click.forEach((fn) => fn());
            }
          : undefined
      }
    />
  );
}

function renderBUTTON(widget) {
  const p = widget._props;
  return (
    <button
      key={widget._id}
      style={{
        ...baseStyle(p),
        backgroundColor: toCssColor(p.normal_color),
        color: toCssColor(p.color),
        fontSize: (p.text_size || 20) + "px",
        fontFamily: "sans-serif",
        borderRadius: (p.radius || 8) + "px",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        whiteSpace: "pre-line",
        lineHeight: 1.2,
        padding: "4px 8px",
      }}
      onClick={() => {
        if (widget._events.click) {
          widget._events.click.forEach((fn) => fn());
        }
      }}
    >
      {p.text}
    </button>
  );
}

function fireSwipe(widget, deltaX, deltaY, deltaTime) {
  if (deltaTime > 600) return;
  const absDx = Math.abs(deltaX);
  const absDy = Math.abs(deltaY);
  if (absDx < 40 || absDx < absDy) return;
  if (deltaX < 0 && widget._events.swipeLeft) {
    widget._events.swipeLeft.forEach((fn) => fn());
  } else if (deltaX > 0 && widget._events.swipeRight) {
    widget._events.swipeRight.forEach((fn) => fn());
  }
}

function GestureWidget({ widget }) {
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });
  const ptrRef = useRef(null);
  const p = widget._props;

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    touchRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      const t = e.changedTouches[0];
      const { startX, startY, startTime } = touchRef.current;
      fireSwipe(
        widget,
        t.clientX - startX,
        t.clientY - startY,
        Date.now() - startTime,
      );
    },
    [widget],
  );

  const handlePointerDown = useCallback((e) => {
    ptrRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
    };
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!ptrRef.current) return;
      const { startX, startY, startTime } = ptrRef.current;
      ptrRef.current = null;
      fireSwipe(
        widget,
        e.clientX - startX,
        e.clientY - startY,
        Date.now() - startTime,
      );
    },
    [widget],
  );

  return (
    <div
      key={widget._id}
      style={{
        ...baseStyle(p),
        touchAction: "pan-y",
        pointerEvents: "auto",
        cursor: "grab",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    />
  );
}

const renderers = {
  IMG: renderIMG,
  TEXT: renderTEXT,
  FILL_RECT: renderFILL_RECT,
  BUTTON: renderBUTTON,
  GESTURE: (w) => <GestureWidget key={w._id} widget={w} />,
};

function renderWidget(w) {
  const fn = renderers[w._type];
  if (!fn) return null;
  return fn(w);
}

// ---------------------------------------------------------------------------
// WatchPage copy wired to the fixed renderer. Same API as
// zepp-web-runner/components/WatchPage (plus re-exported triggerRender).
// ---------------------------------------------------------------------------

let _pageConfig = null;
let _triggerRender = null;

export function triggerRender() {
  if (_pageConfig) _pageConfig.render();
}

export function WatchPageFixed({ width, height }) {
  const [widgets, setWidgets] = useState([]);
  _triggerRender = setWidgets;

  const w = width ?? DEVICE_WIDTH;
  const h = height ?? DEVICE_HEIGHT;

  useEffect(() => {
    if (!_pageConfig) return;
    _pageConfig.build();
    return () => {
      _triggerRender = null;
      if (_pageConfig?.onDestroy) _pageConfig.onDestroy();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        overflow: "hidden",
        flexShrink: 0,
        borderRadius: 84,
        boxShadow: "0 0 0 4px #333, 0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {widgets.map((w) => renderWidget(w)).filter(Boolean)}
    </div>
  );
}

export function _setPageConfigFixed(config) {
  const originalBuild = config.build;
  const originalRender = config.render;

  config.build = function () {
    originalBuild.call(config);
  };

  config.render = function () {
    _reset();
    originalRender.call(config);
    const widgets = _collect();
    // Stable per-position keys: the page rebuilds every widget on each
    // render (every 120ms while the egg spins). The shim hands out ever
    // increasing _ids, so without this React remounts the DOM on every
    // frame and a click that spans a remount is lost — the user has to
    // tap Reveal several times. Index keys keep the button mounted.
    widgets.forEach((w, i) => {
      w._id = i;
    });
    if (_triggerRender) _triggerRender(widgets);
  };

  _pageConfig = config;
}

export function getPageConfig() {
  return _pageConfig;
}
