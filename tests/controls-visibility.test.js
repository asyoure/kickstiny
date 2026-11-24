import assert from "node:assert/strict";
import test from "node:test";
import React, { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useControlsVisibility } from "../src/controls/container/useControlsVisibility.js";

async function mountVisibility(t) {
  const dom = new JSDOM("<div id='root'></div>");
  const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map();
  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }

  const root = createRoot(document.getElementById("root"));
  let controls;
  function VisibilityProbe() {
    const containerRef = useRef(null);
    const barRef = useRef(null);
    controls = useControlsVisibility(containerRef, barRef);
    return React.createElement(
      "div",
      { ref: containerRef, id: "container" },
      React.createElement("div", { ref: barRef, id: "bar" }),
    );
  }
  await act(async () => root.render(React.createElement(VisibilityProbe)));

  t.after(async () => {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });

  const dispatch = async (id, type) => {
    const Event = type.startsWith("pointer")
      ? window.Event // jsdom has no PointerEvent; only the type matters here.
      : window.MouseEvent;
    await act(async () =>
      document
        .getElementById(id)
        .dispatchEvent(new Event(type, { bubbles: true })),
    );
  };
  return {
    shown: () => controls.shouldShow,
    showControls: () => act(async () => controls.showControls()),
    dispatch,
  };
}

test("a touch drag on the bar keeps it shown until the touch ends", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const view = await mountVisibility(t);

  // A tap on the video reveals the controls, as on a phone.
  await view.showControls();
  assert.equal(view.shown(), true);

  await view.dispatch("bar", "pointerdown");
  await act(async () => t.mock.timers.tick(10000));
  assert.equal(view.shown(), true, "bar hid during the drag");

  await view.dispatch("bar", "pointerup");
  await act(async () => t.mock.timers.tick(2900));
  assert.equal(view.shown(), true);
  await act(async () => t.mock.timers.tick(200));
  assert.equal(view.shown(), false, "bar did not hide after the drag");
});

test("a cancelled touch also lets the bar hide again", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const view = await mountVisibility(t);

  await view.showControls();
  await view.dispatch("bar", "pointerdown");
  await act(async () => t.mock.timers.tick(10000));
  assert.equal(view.shown(), true);
  await view.dispatch("bar", "pointercancel");
  await act(async () => t.mock.timers.tick(3100));
  assert.equal(view.shown(), false);
});
