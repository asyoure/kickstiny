import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useRewind } from "../src/controls/rewind/useRewind.js";

async function mountRewind(t) {
  const dom = new JSDOM("<div id='root'></div>", {
    url: "https://player.kick.com/lonerbox",
  });
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

  const emitter = new EventEmitter();
  const core = {
    emitter: { emitter },
    isSeeking: () => false,
    getDuration: () => Infinity,
    getPosition: () => 0,
  };
  const root = createRoot(document.getElementById("root"));
  function RewindProbe() {
    useRewind(core, 42);
    return null;
  }
  await act(async () => root.render(React.createElement(RewindProbe)));

  let mounted = true;
  const unmount = async () => {
    if (!mounted) return;
    await act(async () => root.unmount());
    mounted = false;
  };
  t.after(async () => {
    await unmount();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { unmount };
}

test("recording discovery backs off when no recording appears, up to 15 minutes", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://kick.com/api/v2/channels/lonerbox/videos");
    requests++;
    return { ok: true, json: async () => [] };
  });

  const view = await mountRewind(t);
  assert.equal(requests, 1);
  for (const delay of [60, 120, 240, 480, 900, 900]) {
    const before = requests;
    await act(async () => t.mock.timers.tick(delay * 1000 - 1));
    assert.equal(requests, before, `retried before ${delay}s`);
    await act(async () => t.mock.timers.tick(1));
    assert.equal(requests, before + 1, `no retry at ${delay}s`);
  }

  await view.unmount();
  await act(async () => t.mock.timers.tick(900000));
  assert.equal(requests, 7);
});

test("recording discovery failures back off the same way", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "setInterval"] });
  t.mock.method(console, "warn", () => {});
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return { ok: false, status: 503 };
  });

  await mountRewind(t);
  await act(async () => t.mock.timers.tick(60000));
  assert.equal(requests, 2);
  await act(async () => t.mock.timers.tick(60000));
  assert.equal(requests, 2, "retried again after only 60s");
  await act(async () => t.mock.timers.tick(60000));
  assert.equal(requests, 3);
});
