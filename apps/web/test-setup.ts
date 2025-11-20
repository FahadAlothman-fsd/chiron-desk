import { afterAll, beforeAll } from "bun:test";
import { Window } from "happy-dom";
import "@testing-library/jest-dom";

// Create a global window and document for React Testing Library
const window = new Window();
const document = window.document;

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

beforeAll(() => {
	console.log("✅ DOM environment initialized with happy-dom");
});

afterAll(() => {
	// Cleanup
});
