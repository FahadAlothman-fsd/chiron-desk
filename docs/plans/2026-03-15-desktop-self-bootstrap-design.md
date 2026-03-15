# Desktop Self-Bootstrap Design

## Goal

Make the packaged Chiron AppImage start successfully on a clean machine with no externally supplied server environment variables, while keeping the architecture compatible with a future remote-server or Turso-backed deployment mode.

## Decision

Use a zero-config-by-default bootstrap flow owned by `apps/desktop`, with runtime state stored under Electron's writable user-data directory. The packaged app will auto-create local config, secrets, logs, and a local file-backed database path on first run, then launch the bundled server with derived environment variables.

For packaged desktop mode, `apps/desktop` should also expose runtime backend metadata to the renderer through a narrow preload bridge. The renderer should prefer that runtime bridge over baked `VITE_SERVER_URL` values, so auth and RPC clients talk to the actual runtime-selected local backend URL.

This keeps the AppImage immutable, gives users a clean first-run experience, and leaves room for later switching to a remote server or Turso-backed configuration without redesigning the packaged app.

## Non-Goals

- No first-run setup wizard in this phase.
- No remote-server UX in this phase.
- No settings screen in this phase.
- No database migration/export UI in this phase.

## Runtime Ownership

### Desktop owns bootstrap

`apps/desktop` is responsible for:

- resolving writable runtime paths
- creating runtime directories and files on first run
- generating and persisting secrets
- selecting and persisting the local server port
- deriving the bundled server environment
- spawning the bundled server with that environment
- exposing packaged runtime metadata to the renderer through preload
- surfacing bootstrap failures to the user

### Server consumes env

`apps/server` should continue to read configuration from environment variables, but it should not become responsible for packaged-app first-run bootstrapping. The server process should trust the environment passed in by the desktop shell.

This avoids split ownership and prevents subtle bugs where both desktop and server try to create or repair runtime state independently.

### Renderer resolves backend at runtime

`apps/web` remains the single renderer source, but packaged desktop should stop treating the backend URL as a build-time web env concern. Instead:

- browser/web mode keeps using `VITE_SERVER_URL`
- packaged desktop mode reads runtime backend metadata from `window.desktop`
- auth and RPC clients derive their base URL from that runtime bridge when available

This keeps the renderer portable while letting packaged desktop use the true runtime backend URL chosen by the bootstrap layer.

## Runtime Layout

All writable state lives under `app.getPath("userData")`. The packaged AppImage and bundled resources stay read-only.

Proposed layout:

```text
<userData>/runtime/
  config.json
  secrets.json
  data/
    chiron.db
  logs/
```

Example Linux location:

```text
~/.config/Chiron/runtime/
```

## Runtime Config Model

`config.json` should be versioned from the start so later cloud/Turso support can evolve safely.

Initial shape:

```json
{
  "version": 1,
  "mode": "local",
  "server": {
    "kind": "bundled",
    "port": 43110
  },
  "database": {
    "kind": "local",
    "url": "file:/home/user/.config/Chiron/runtime/data/chiron.db"
  }
}
```

Future-compatible direction:

```json
{
  "version": 2,
  "mode": "remote",
  "server": {
    "kind": "remote",
    "url": "https://api.chiron.app"
  },
  "database": {
    "kind": "turso",
    "url": "libsql://example.turso.io",
    "authToken": "..."
  }
}
```

The important design choice is that `mode`, `server`, and `database` are explicit now, even though only `local` is implemented in this phase.

## Secrets Model

`secrets.json` persists generated secrets that must survive relaunches:

```json
{
  "betterAuthSecret": "<generated-once>"
}
```

Rules:

- generate once on first run
- reuse on every later run
- never overwrite silently
- support later rotation intentionally, not implicitly

## First-Run Bootstrap Sequence

1. Electron main process starts.
2. Desktop detects packaged runtime mode.
3. Desktop resolves packaged resource paths and user-data runtime paths.
4. Desktop ensures `runtime/`, `runtime/data/`, and `runtime/logs/` exist.
5. Desktop loads `config.json` if present; otherwise writes a default local config.
6. Desktop loads `secrets.json` if present; otherwise generates and persists a secret.
7. Desktop checks the configured local port, using it if free or selecting a new free port if necessary.
8. Desktop derives server environment variables from config + secrets + runtime paths.
9. Desktop launches the bundled server binary with that derived environment.
10. Desktop derives packaged renderer runtime metadata, including the actual backend URL.
11. Desktop waits for server health/readiness.
12. Desktop loads the packaged renderer.
13. Renderer reads runtime backend metadata from preload and initializes auth/RPC clients from that value.
14. Desktop surfaces bootstrap errors clearly if any step fails.

## Environment Derivation

The desktop shell should derive at least:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`

The desktop shell should also derive packaged renderer runtime metadata:

- `backendUrl`
- future bridge fields such as mode or capability flags if needed

Local-first defaults:

- `DATABASE_URL` -> local file-backed SQLite/libsql-compatible URL under user data
- `BETTER_AUTH_SECRET` -> generated persisted secret
- `BETTER_AUTH_URL` -> `http://127.0.0.1:<port>`
- `CORS_ORIGIN` -> URL-based trust origin expected by the shared auth/server stack

The packaged renderer may still have browser origin `null` because it loads from a file target, but the shared auth/CORS trust contract should remain URL-based. The runtime bridge is what lets the renderer discover the real backend URL without pretending the file renderer itself has a first-class HTTP origin.

If additional server env becomes mandatory later, the mapping should be extended in one central desktop bootstrap module instead of spread across `main.ts`.

## Port Strategy

Use a pragmatic local strategy:

- prefer a stable configured localhost port
- if occupied, choose a free localhost port
- persist the chosen port back into config

That gives stable URLs when possible while still allowing the app to recover from collisions.

## Local Database Strategy

For this phase, the database should be local and file-backed. The DB file lives under the runtime data directory, not inside the AppImage.

This remains compatible with a libsql-flavored stack so long as the configured local URL matches what the server expects for file-backed SQLite/libsql usage.

Later options remain open:

- `mode=local` with local file DB
- `mode=local` with bundled server talking to Turso
- `mode=remote` with desktop talking to hosted Chiron

Long term, `desktop -> remote server` is the cleaner hosted architecture, but the config shape should allow an intermediate Turso-backed mode without redesign.

## Failure Handling

Bootstrap failures should be user-visible and actionable.

Examples:

- directory/file creation failure -> show failing path and reason
- config parse failure -> back up corrupt file, regenerate defaults, and report what happened
- server startup failure -> show log path and a concise error summary
- readiness timeout -> explain that the local server failed to become healthy

Logs should be written to the runtime log directory so failures can be inspected outside the terminal.

## Module Split

Recommended desktop modules:

- `apps/desktop/src/runtime-paths.ts`
  - resolve `userData` runtime paths
- `apps/desktop/src/runtime-config.ts`
  - load, validate, create, and migrate config
- `apps/desktop/src/runtime-secrets.ts`
  - load/create persisted secrets
- `apps/desktop/src/runtime-env.ts`
  - derive server env from config + secrets + runtime paths
- `apps/desktop/src/runtime-bootstrap.ts`
  - orchestrate bootstrap and return launch-ready state
- `apps/desktop/preload.ts`
  - expose packaged runtime metadata to the renderer through a narrow bridge
- `apps/web/src/...`
  - resolve backend URL from desktop runtime metadata before falling back to web env

`apps/desktop/main.ts` should remain a thin orchestrator that delegates to these modules.

## Testing Strategy

Desktop tests should cover:

- first-run runtime directory creation
- default config creation
- secret generation and reuse
- local DB path derivation
- port reuse and collision fallback
- server env derivation
- runtime bridge payload derivation
- packaged renderer auth/RPC clients preferring runtime backend metadata over baked env
- corrupt config backup + regeneration behavior
- packaged launch with empty runtime state and no external env
- future parsing tolerance for a later `remote` mode

## Why This Design

This design gives Chiron the right short-term and long-term shape:

- short term: a real zero-config AppImage that starts on a clean machine
- medium term: editable runtime config without changing packaging architecture
- long term: compatibility with remote-server and Turso-backed deployments

The key principle is simple: desktop owns packaged bootstrap, server owns serving.
