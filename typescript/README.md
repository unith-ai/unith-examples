# Unith Digital Human — TypeScript example

A framework-free **Vite + TypeScript** app that embeds a **Unith digital human** using [`@unith-ai/core-client`](https://www.npmjs.com/package/@unith-ai/core-client) directly — just the SDK and plain DOM.

It demonstrates the full conversation flow: the streaming avatar, live turn state, a text transcript, manual microphone control, mute, captions, follow-up suggestions, interruption, and inactivity-timeout handling — all driven by subscribing to the SDK's observables.

## How it works

The core-client SDK exposes conversation state as **observables** you subscribe to, and **methods** you call. Everything lives in [`src/main.ts`](src/main.ts):

```ts
const session = await Session.startDigitalHuman(avatarElement, config);

session.turn.subscribe((turn) => { /* idle | thinking | ai-speaking | interrupting */ });
session.messages.subscribe((messages) => renderTranscript(messages));
session.caption.subscribe((text) => showCaption(text));

startButton.onclick = () => session.startSession();   // must be a user gesture
session.sendMessage("Hello!");
```

| SDK observable | Drives |
| --- | --- |
| `session.session` | connection status |
| `session.isSessionStarted` | showing the chat UI after start |
| `session.turn` | thinking/speaking indicators, enabling input, the Stop button |
| `session.messages` | the transcript |
| `session.suggestions` | follow-up prompt chips |
| `session.microphone` | mic status badge/button |
| `session.isMuted` / `session.captionsEnabled` | the Mute / Captions buttons |
| `session.caption` | live captions |
| `session.errors` | error display |
| `session.timeout` | the "session will time out" banner |

## Prerequisites

A [Unith AI](https://www.unith.ai/) account and a digital human. From your [dashboard](https://app.unith.ai) you'll need an **orgId**, **headId**, and **apiKey**.

## Setup

```sh
npm install
cp .env.example .env    # then fill in your credentials
npm run dev
```

```env
VITE_ORG_ID=your-org-id
VITE_HEAD_ID=your-head-id
VITE_API_KEY=your-api-key
```

Open the app, click **Start conversation** (audio needs a user gesture to begin), then talk or type.

## Notes

- The avatar renders into a plain `<div id="avatar">` — it must have a width and height (the SDK sizes the video stream to that element; see [`src/style.css`](src/style.css)).
- This example uses the **ElevenLabs** speech-to-text provider in **manual** mode with voice interruptions. Change the `microphone` config in [`src/main.ts`](src/main.ts) for a different provider or mode. (For the `azure` provider, also `npm install microsoft-cognitiveservices-speech-sdk`.)
- Using React instead? See the [`../react`](../react) example, which wraps this SDK in hooks via `@unith-ai/react-components`.
- Full API reference: the [`@unith-ai/core-client` docs](https://www.npmjs.com/package/@unith-ai/core-client).
