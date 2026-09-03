# SignalR Chat

A deliberately small, production-minded realtime chat client built with Next.js and the Microsoft SignalR JavaScript client. It is a portfolio project for connection lifecycle design—not a mock dashboard.

## What it demonstrates

- **Resilient realtime lifecycle:** a finite reconnect policy (immediate, 2s, 5s, 10s), explicit `connecting`, `connected`, `reconnecting`, `disconnected`, and `failed` UI states, and safe teardown.
- **Defensive chat state:** incoming events are normalized, invalid messages are ignored, message identifiers are deduplicated, and presence data is cleaned before rendering.
- **Intentional frontend boundaries:** the route and metadata remain server-rendered; the interactive workspace is the single client entry point. SignalR mechanics live in `lib/chat`, not presentation components.
- **Responsive accessible UX:** semantic forms and buttons, visible keyboard focus, live connection updates, reduced-motion support, a mobile participant drawer, and layouts that handle long names and messages.

## Architecture

```text
app/page.js (server route)
  └─ components/chat/ChatWorkspace.jsx (interactive UI)
       └─ lib/chat/use-chat-connection.mjs (lifecycle + event subscriptions)
            ├─ lib/chat/signalr-client.mjs (connection factory / finite retry policy)
            ├─ lib/chat/reducer.mjs (state transitions and payload normalization)
            └─ lib/chat/config.mjs (public browser configuration)
```

The hook owns a single `HubConnection` ref. It registers handlers once per connection, removes handlers and stops it during leaving/unmount, and uses refs for the current username and typing timer so event callbacks do not capture stale state. On reconnection it re-invokes `UserJoin`, because the reference backend uses that hub method to restore room membership.

## Technology stack

- Next.js 16 App Router and React 19
- `@microsoft/signalr` 10 for browser hub connectivity
- Native CSS modules and global design tokens
- Node's built-in test runner for focused domain tests

## Project structure

- `app/` — server route, root metadata, and global CSS tokens.
- `components/chat/` — the client workspace and its responsive styles.
- `lib/chat/` — configuration, state reducer, SignalR factory, and lifecycle hook.
- `test/` — dependency-free domain tests.

## Backend contract

Set up a SignalR hub at the configured URL that supports these hub methods:

- `UserJoin(username)`
- `SendMessage(message)`
- `TypingStart()` and `TypingStop()`

The client listens for `welcome`, `user-joined`, `user-left`, `new-message`, `online-users`, and `user-typing`. Message payloads are expected to include `username`, `message`, and optionally `time` / `id`; welcome payloads can include `message` and `users`. This matches the companion ASP.NET Core sample’s public-chat protocol, but any backend following this contract can be used.

## Configuration

Copy the example file and set the public browser URL for your backend:

```bash
cp .env.example .env.local
# edit NEXT_PUBLIC_SIGNALR_HUB_URL if your hub is not localhost:5000/chat
```

`NEXT_PUBLIC_SIGNALR_HUB_URL` is intentionally public—it is consumed in the browser. Do not place secrets in it. The built-in development fallback is `http://localhost:5000/chat` to support the companion local backend.

## Development

Requirements: Node.js 20.9+ and a running SignalR backend with permissive CORS for the Next.js origin.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, enter a display name, and join the room.

## Validation

```bash
npm run lint       # ESLint / Next core web-vitals rules
npm run test       # focused reducer and payload behavior tests
npm run typecheck  # syntax checks; this project intentionally remains JavaScript
npm run build      # production Next.js build
```

### Why JavaScript instead of TypeScript?

The original project is JavaScript and has a very small public protocol with no generated server contract. Adding a partial TypeScript migration would introduce type dependencies and an `any`-heavy SignalR boundary without delivering end-to-end safety. Instead, the domain boundary is kept narrow, validated defensively at runtime, and covered by focused tests. A generated/shared backend contract is the appropriate trigger for a TypeScript migration.

## Design, reliability, and accessibility decisions

- The visual system uses CSS tokens, modest elevation, semantic status colors, and no UI framework.
- Reconnects are visible but non-disruptive; terminal failures provide a retry action and do not expose raw transport errors to users.
- Sending is disabled whenever the actual connection is not live. A failed send creates a clear system message.
- The message list uses stable normalized IDs when supplied, preserves wrapped long content, and respects reduced-motion settings.
- The mobile layout becomes a dedicated full-height chat with a participant drawer instead of a compressed desktop sidebar.

## Production build

```bash
npm run build
npm run start
```

## Deployment considerations

Configure `NEXT_PUBLIC_SIGNALR_HUB_URL` at build time for the deployed hub, use HTTPS/WSS in production, and configure backend CORS for the deployed frontend origin. The backend remains responsible for authentication, authorization, rate limiting, persistence, message history, and server-side validation.

## Known limitations and future work

This client has no authentication, persistence, message history, optimistic delivery state, virtualized history, or generated backend types. The next meaningful improvements would be a documented versioned server event contract, authenticated room membership, message acknowledgements/idempotency keys, and integration tests against a real hub.
