# Module Implementation Workflow

This workflow defines how every module is designed, stubbed, and implemented in an Effect-first way.

## 1) Define the Contract
- Inputs, outputs, and events
- Error model
- Capability checklist

## 2) Create a Stub Matching the Contract
- Stub uses the final interface shape
- No internal shortcuts or ad-hoc signatures

## 3) Add Effect Wrapper Early
- Expose a `Tag` and `Layer`
- Ensure all public entry points are `Effect` values

## 4) Mock Dependencies by Interface
- Only mock interfaces, never internals
- Use deterministic fixtures

## 5) Add a Minimal Contract Test Harness
- Validate happy path and primary error paths
- Keep tests focused on the contract

## 6) Implement Fully Inside the Module
- Replace internals incrementally
- Keep the contract stable

## 7) Integrate Into Orchestrator
- `packages/api` composes modules via Layers
- No direct internal imports across modules

## Non-Negotiables
- No lift-and-shift of legacy code into new packages
- Modules are only moved when fully implemented
- Every module remains Effect-wrapped

## Effect Learning Guide
- Effect software guide: https://www.effect.solutions/
- Effect quick start: https://www.effect.solutions/quick-start
- Effect docs: https://effect.website/docs/
- Agent-guided setup instructions: https://www.effect.solutions/quick-start#agent-guided-setup
- Effect Solutions CLI:
  - Install: `bun add -g effect-solutions@latest`
  - Topics list: `effect-solutions list`
  - Show topics: `effect-solutions show project-setup tsconfig`
