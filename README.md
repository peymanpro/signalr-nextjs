# SignalR Chat Client — Next.js

A real-time chat client built with Next.js App Router, React, and Microsoft's SignalR JavaScript client. The project focuses on connection lifecycle behavior, defensive event handling, and an accessible UI that reflects the actual connection state.

## Demonstrated behavior

- A bounded reconnect policy with explicit connecting, connected, reconnecting, disconnected, and failed states.
- Rejoining the room after SignalR reconnects.
- A single client workspace boundary; SignalR lifecycle logic is separated from presentation and reducer logic.
- Runtime validation for display names, messages, presence lists, timestamps, and message identifiers.
- Message de-duplication and bounded client history (the latest 1,000 messages are retained).
- Typing notifications with timer cleanup and disabled sending while disconnected.
- Responsive participant list, visible focus, live status announcements, and reduced-motion support.

## Architecture

```text
app/page.js
  └── components/chat/ChatWorkspace.jsx
        └── lib/chat/use-chat-connection.mjs
              ├── lib/chat/signalr-client.mjs
              ├── lib/chat/protocol.mjs
              ├── lib/chat/reducer.mjs
              └── lib/chat/config.mjs
```

The hook owns a single `HubConnection`, registers event handlers, stops the connection during teardown, clears typing timers, and re-invokes `UserJoin` after reconnecting so the new server connection is associated with the display name again.

## Technology

- Next.js App Router and React
- `@microsoft/signalr`
- JavaScript modules and CSS modules
- Node's built-in test runner

## Requirements and setup

- Node.js 20.9 or newer
- npm
- A running SignalR backend that implements the contract below and allows the frontend origin through CORS

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The default hub URL is `http://localhost:5000/chat`.

### Configuration

`NEXT_PUBLIC_SIGNALR_HUB_URL` is read in the browser and is intentionally public. Do not put secrets in this variable. For a deployed environment, configure the correct HTTPS hub URL at build time and configure the server's CORS allow-list to match the frontend origin.

## Backend contract

The hub must provide these methods:

- `UserJoin(username)`
- `SendMessage(message)`
- `TypingStart()`
- `TypingStop()`

The client listens for `welcome`, `user-joined`, `user-left`, `new-message`, `online-users`, and `user-typing`. Message payloads include `username`, `message`, and a unique `id`; `time` is expected to be a parseable timestamp when supplied. Welcome payloads may include `message` and `users`.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The typecheck script performs syntax checks because the project intentionally remains JavaScript. The domain tests cover validation boundaries, message de-duplication, presence normalization, state transitions, and the retained-history limit. GitHub Actions runs lint, syntax checks, tests, and a production build.

## Why JavaScript instead of TypeScript?

The client has a small runtime-defined protocol and no generated server contract. A partial TypeScript migration would not provide end-to-end safety at the SignalR boundary. Runtime normalization and a narrow state model provide explicit protections without introducing a second source of truth. A shared/generated contract would be a good reason to migrate.

## LNASF: outcome-aware reconnect policy

`lib/chat/lnasf-retry-policy.ts` is a native TypeScript learning component used by the SignalR reconnect policy. It records success/failure outcomes for each bounded delay, predicts success probability and confidence using Laplace-smoothed online counts, and calculates a simple utility that penalizes longer delays. The decision policy is separate from the prediction and selects a learned delay only when there is enough evidence and a material utility gain over the deterministic schedule.

Configure `NEXT_PUBLIC_LNASF_MODE=passive` (default), `advisory`, or `adaptive`. Passive learns without changing the retry schedule. Advisory exposes the recommended delay but uses the baseline schedule. Adaptive may select only from the fixed delay candidates `[0, 2000, 5000, 10000]`, with at most four retries and a 30-second elapsed-time cap. Insufficient evidence or a weak utility comparison falls back to the baseline; leaving the page is not counted as a failed attempt. The UI exposes mode, observed outcome count, and the latest policy decision. Model state is in memory and resets on page reload.

The LNASF tests use a deterministic clock and synthetic success/failure observations to cover online updates, confidence, prediction/decision separation, mode behavior, feedback, and retry bounds. They are not a real-network performance benchmark; no improvement in recovery latency is claimed.



Framework context: [LNASF concept and architecture](https://github.com/peymanpro/learning-native-adaptive-software-framework) · [Technical specification](https://github.com/peymanpro/learning-native-adaptive-software-framework/blob/main/SPECIFICATION.md). This repository implements only the specific LNASF subset documented above; it is not a complete framework implementation.

## Limitations

This repository is a frontend client, not a complete chat service. It does not provide authentication, authorization, persistence, historical message retrieval, optimistic delivery acknowledgements, or integration tests against a live hub. The server remains responsible for authorization, rate limiting, and authoritative validation.
