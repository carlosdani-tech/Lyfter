import { afterEach } from "node:test";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

// Minimal host for provider-only trees: Probe renders null, never application DOM.
// Real React owns hook state, batching, effects, StrictMode and unmount cleanup.
const document = {
  nodeType: 9, nodeName: "#document", activeElement: null,
  addEventListener() {}, removeEventListener() {},
  createElement(name) { return element(name); },
};
function element(name) {
  return { nodeType: 1, nodeName: name.toUpperCase(), tagName: name.toUpperCase(),
    namespaceURI: "http://www.w3.org/1999/xhtml", ownerDocument: document,
    childNodes: [], style: {}, addEventListener() {}, removeEventListener() {},
    get firstChild() { return this.childNodes[0] || null; },
    appendChild(child) { this.childNodes.push(child); child.parentNode = this; },
    removeChild(child) { this.childNodes.splice(this.childNodes.indexOf(child), 1); },
    setAttribute() {}, removeAttribute() {},
  };
}
const window = { document, HTMLIFrameElement: class {}, HTMLElement: class {},
  addEventListener() {}, removeEventListener() {} };
document.defaultView = window;
document.documentElement = element("html");
document.body = element("body");

const mounted = new Set();
afterEach(() => { for (const host of [...mounted]) host.unmount(); });

export function mountProvider(tree, { strict = false } = {}) {
  globalThis.window = window;
  globalThis.document = document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  const root = createRoot(element("div"));
  const commit = (operation) => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try { return act(operation); }
    finally { globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
  };
  const render = () => commit(() => root.render(strict ? React.createElement(React.StrictMode, null, tree()) : tree()));
  render();
  const host = {
    render,
    unmount: () => { if (!mounted.delete(host)) return; commit(() => root.unmount()); },
    async run(operation) {
      let result;
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      try { await act(async () => { result = await operation(); }); }
      finally { globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
      return result;
    },
    start(operation) { let result; commit(() => { result = operation(); }); return result; },
    async flush() {
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      try { await act(async () => { await Promise.resolve(); }); }
      finally { globalThis.IS_REACT_ACT_ENVIRONMENT = false; }
    },
  };
  mounted.add(host);
  return host;
}
