---
name: testing
description: Use when adding, running, or editing unit tests for this Chrome extension — Jest + ts-jest tests under test/unit/ that import functions from views/common/*. Covers the test commands, the ts-jest/setupFiles config, and this repo's test conventions.
---

# Testing (Jest + ts-jest)

This repo tests pure logic extracted from the extension's content/popup scripts. Tests are
**TypeScript** run through **Jest** with the `ts-jest` preset. There is no browser/DOM
environment — `testEnvironment` is `node`, so only framework-agnostic functions are tested
(e.g. `debounce`, `asyncForEach`, `sleep` from `views/common/utilities.js`), not Chrome APIs,
the `chrome.scripting` popup bridge, or DOM behavior.

## Run

```bash
npm test            # or: yarn test   → runs `jest` once
npm run watch-test  # → `jest --watch`, re-runs on change (use while iterating)
```

Run a single file with `npx jest test/unit/<feature>.test.ts`, or a single case with
`-t "<name pattern>"`.

## Config (lives in `package.json`)

```jsonc
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "setupFiles": [
    "<rootDir>/views/common/utilities.js"
  ]
}
```

The `setupFiles` are loaded **before** the test framework. The extension's source files are
plain browser scripts that attach functions to the global scope, so loading them in setup
makes those helpers available as globals during tests. If a test or the code under test calls
a helper that isn't a global yet, assign it explicitly (see conventions below).

## Location & naming

- Unit tests: `test/unit/<feature>.test.ts` — these are what `jest` picks up.
- There is **no `test/` directory yet** — create `test/unit/` when adding the first test.
- To temporarily disable a test without deleting it, rename it so it no longer matches Jest's
  `*.test.*` pattern (e.g. `<feature>.te_st._js`), and rename it back when it's ready.

## Conventions

- **Import the unit under test** from the source with a relative path:
  ```ts
  import { debounce, asyncForEach } from "../../views/common/utilities";
  ```
- Group with `describe(...)`; write cases with `test(...)` or `it(...)`.
- Prefer **`test.each([...])`** for table-driven cases:
  ```ts
  test.each([
    [0, false],
    [3, true]
  ])("dot is open when %i tabs are open: %s", (count, expected) => {
    expect(count > 0).toBe(expected);
  });
  ```
- **When the code under test expects a helper as a global**, assign it onto `global[...]`
  inside the `describe` before the cases run:
  ```ts
  global["sleep"] = sleep;
  ```
- For time-based helpers (`debounce`, `sleep`), use Jest fake timers
  (`jest.useFakeTimers()` / `jest.advanceTimersByTime(...)`) so tests stay fast and
  deterministic.
- Assertions: `toBe` for primitives/string output, `toEqual` for arrays/objects.

## Add or edit a test

1. Create `test/unit/<feature>.test.ts`.
2. Import the target function(s) from `views/common/` (or the relevant source file).
3. If the function references other helpers as globals at runtime, wire them via
   `global["<name>"] = <imported>` first.
4. Follow the `describe` + `test.each` + `expect(...).toBe/.toEqual` style above.
5. Run `npm run watch-test` while iterating, then `npm test` once to confirm the full suite
   is green before committing.
