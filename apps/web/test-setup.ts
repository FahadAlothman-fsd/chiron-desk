import { afterAll, beforeAll } from "bun:test";
import { Window } from "happy-dom";

// Create a global window and document for React Testing Library
const window = new Window();
const document = window.document;

if (!document.documentElement) {
  const html = document.createElement("html");
  document.appendChild(html);
}

if (!document.body) {
  const body = document.createElement("body");
  document.documentElement?.appendChild(body);
}

document.body ??= document.createElement("body");

// @ts-expect-error
global.window = window;
// @ts-expect-error
global.document = document;
// @ts-expect-error
global.navigator = window.navigator;
// @ts-expect-error
global.HTMLElement = window.HTMLElement;
// @ts-expect-error
global.Element = window.Element;
// @ts-expect-error
globalThis.window = window;
// @ts-expect-error
globalThis.document = document;
// @ts-expect-error
globalThis.navigator = window.navigator;
// @ts-expect-error
globalThis.HTMLElement = window.HTMLElement;
// @ts-expect-error
globalThis.Element = window.Element;

await import("@testing-library/jest-dom");

beforeAll(() => {
  console.log("✅ DOM environment initialized with happy-dom");
});

afterAll(() => {
  // Cleanup
});
