# Unith React Native

A React Native app featuring AI-powered conversations with a digital human and interactive messaging.

## Prerequisites

Before running this app, you'll need to set up your credentials from [Unith](https://www.unith.ai/):

1. **ORG_ID** - Your organization ID
2. **HEAD_ID** - The ID of the digital human avatar to use
3. **API_KEY** - Your Unith API key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure credentials

Open `app/(tabs)/index.tsx` and update the constants at the top or add them to your .env file:

```typescript
const ORG_ID = "your-org-id";
const HEAD_ID = "your-head-id";
const API_KEY = "your-api-key";
```

```bash
EXPO_PUBLIC_ORG_ID=your_org_id_here
EXPO_PUBLIC_HEAD_ID=your_head_id_here
EXPO_PUBLIC_API_KEY=your_api_key_here
```

Setup your Elevenlabs API key by adding it to the .env file as well.

```bash
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Prebuild the app

This app uses native modules from the library (`@siteed/expo-audio-studio`) — Expo Go is not supported.

```bash
npx expo prebuild
```

### 4. Start the app

```bash
npx expo run:ios    # or npx expo run:android
```

In the output, you'll find options to open the app in:

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## How to Use

1. **Start a Conversation** - Tap "Start Conversation" to begin a session with the digital human
2. **Send Text Messages** - Type in the input field and tap "Send"
3. **Mute Audio** - Toggle mute to hear/disable AI voice responses
4. **End Session** - Tap "End Session" to close the conversation

## Microphone & Real-time Transcription

The app uses two layered hooks to capture microphone audio and transcribe it in real time.

### Architecture

```
Microphone (expo-audio-studio)
        │  PCM audio chunks (base64, 100ms intervals)
        ▼
useRealtimeTranscription
        │  streams chunks
        ▼
useElevenlabsWebSocket  ──── WebSocket ────▶ ElevenLabs STT API
                                                    │
                              partial_transcript ◀──┤
                           committed_transcript ◀───┘
        │
        ▼
onCommittedTranscript(text)
        │
        ▼
conversationMode.safeSendMessage(text)
        │
        ▼
conversation.sendMessage(text)  ──▶  Unith AI
```

### `useElevenlabsWebSocket`

Located in `hooks/use-elevenlabs-ws.ts`. Manages the WebSocket connection to the ElevenLabs real-time STT API.

**Key behaviours:**

- Fetches a single-use token from ElevenLabs before each connection, keeping your API key off the wire.
- Uses VAD (Voice Activity Detection) commit strategy — ElevenLabs decides when an utterance ends based on silence, rather than the client committing manually.
- Implements exponential backoff reconnection (starting at 1s, capped at 60s) on unexpected disconnects.
- Applies backpressure: audio chunks are dropped if the WebSocket send buffer exceeds 64KB to avoid memory build-up.

**Exposed API:**

| Name | Description |
|------|-------------|
| `connect()` | Fetches a token and opens the WebSocket. Resolves when the connection is open. |
| `disconnect()` | Flushes remaining audio, then closes the connection cleanly. Stops reconnection. |
| `sendAudio(base64)` | Sends a base64-encoded PCM chunk to ElevenLabs. No-ops if not connected or buffer is full. |
| `connectionStatus` | `"disconnected" \| "connecting" \| "connected" \| "error"` |

**Callbacks:**

| Name | Fires when |
|------|-----------|
| `onCommittedTranscript(text)` | ElevenLabs VAD has detected end of utterance and produced a final transcript |
| `onPartialTranscript(text)` | Intermediate transcript while the user is still speaking |
| `onError(message)` | WebSocket-level error (auth failure, quota exceeded, etc.) |

### `useRealtimeTranscription`

Located in `hooks/use-realtime-transcription.ts`. Orchestrates the microphone recorder (`@siteed/expo-audio-studio`) and `useElevenlabsWebSocket` together.

**Lifecycle:**

1. **`initializeMicrophone()`** — Call once when a session starts. Requests Android microphone permission (iOS is handled by the native layer), prepares the recorder, and opens the WebSocket. Must be called before `startRecording`.

2. **`startRecording()`** — Begins streaming audio. Reconnects the WebSocket if it dropped. Starts a 10-second inactivity timer that fires `onError` if no speech is detected.

3. **`pauseRecording()`** — Called when the AI begins speaking (`onSpeakingStart`). Immediately sets an internal mute flag to drop incoming chunks (since `pauseRecording` is async and takes time to settle), then pauses the recorder. Prevents the AI's own voice from being transcribed.

4. **`resumeRecording()`** — Called when the AI finishes speaking (`onSpeakingEnd`). Resumes the recorder, then clears the mute flag so chunks flow again.

5. **`stopRecording()`** — Stops the recorder and disconnects the WebSocket cleanly.

**Audio config:**

- 16kHz sample rate, mono, 16-bit PCM — matches ElevenLabs' `pcm_16000` format exactly.
- Chunks are emitted every 100ms.
- iOS audio session: `PlayAndRecord` / `DefaultToSpeaker` so recording and AI audio playback work simultaneously.
- Android: `communication` audio focus strategy.

**Exposed API:**

| Name | Description |
|------|-------------|
| `initializeMicrophone()` | Prepare recorder + open WebSocket |
| `startRecording()` | Start streaming audio to ElevenLabs |
| `stopRecording()` | Stop recording + close WebSocket |
| `pauseRecording()` | Mute + pause (called during AI speech) |
| `resumeRecording()` | Unmute + resume (called after AI speech) |
| `status` | `"idle" \| "initializing" \| "recording" \| "paused"` |
| `isRecording` | Boolean from the underlying recorder |
| `isPaused` | Boolean from the underlying recorder |

 
## Troubleshooting

### Digital human not loading

- Confirm your ORG_ID and HEAD_ID are correct
- Verify your Unith API_KEY is valid
- Check your internet connection
- Ensure permissions are set up properly if using microphone

## Support

For issues or questions, please refer to:

- [Unith Support](https://unith.io/support)
