# Unith Digital Human — React example

A small Vite + React + TypeScript app that embeds a **Unith digital human** using [`@unith-ai/react-components`](https://www.npmjs.com/package/@unith-ai/react-components) — the hooks-based React library.

It demonstrates the full conversation UI: the streaming avatar video, live turn state (thinking / speaking), a text transcript, message input, always-on microphone, mute, follow-up suggestions, and inactivity-timeout handling.

## What it shows

- **`<SessionProvider>`** wraps the app ([`src/App.tsx`](src/App.tsx)) so any component can read the session via hooks.
- **`useSession().connect(element, config)`** connects and renders the avatar into a `div` ([`src/Example.tsx`](src/Example.tsx)).
- State hooks drive the UI — no callbacks:
  | Hook | Used for |
  | --- | --- |
  | `useConnectionStatus()` | connection badge, "Start" button |
  | `useTurn()` | thinking / speaking indicators, enabling input |
  | `useMessages()` | transcript + `sendMessage` |
  | `useIsSessionStarted()` | showing the chat UI after start |
  | `useSuggestions()` | follow-up prompt buttons |
  | `useIsMuted()` | mute toggle |
  | `useMicrophoneAlwaysOn()` | mic enable/disable + status |
  | `useOnTimeout()` | the "session will time out" banner |

## Prerequisites

A [Unith AI](https://www.unith.ai/) account and a digital human. From your [dashboard](https://app.unith.ai) you'll need an **orgId**, **headId**, and **apiKey**.

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your `.env` from the template and fill in your credentials:

   ```sh
   cp .env.example .env
   ```

   ```env
   VITE_ORG_ID=your-org-id
   VITE_HEAD_ID=your-head-id
   VITE_API_KEY=your-api-key
   ```

3. Run the dev server:

   ```sh
   npm run dev
   ```

Open the app, click **Start Conversation** (audio needs a user gesture to begin), then talk or type.

## Notes

- This example uses the **ElevenLabs** speech-to-text provider in **always-on** mode with voice interruptions. Change the `microphone` config in [`src/Example.tsx`](src/Example.tsx) to use a different provider or manual mode.
- The avatar renders into a plain `div` — give it a width and height (the SDK sizes the video stream to that element).
- For the full API and every available hook, see the [`@unith-ai/react-components` docs](https://www.npmjs.com/package/@unith-ai/react-components).
