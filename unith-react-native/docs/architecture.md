# Architecture: Real-Time Speech-to-Text Pipeline

## Overview

The app captures raw PCM audio from the device microphone, streams it over a WebSocket to ElevenLabs' realtime STT API, and feeds committed transcripts into a turn-based conversation with a digital human.

## Pipeline Diagram

```
┌────────────-─┐     PCM 16kHz/16-bit/mono       ┌────────────────────┐
│  Microphone  │ ──────────────────────────────▶ │  expo-audio-studio │
│  (Hardware)  │   onAudioStream (100ms chunks)  │  useAudioRecorder  │
└───────────-──┘                                 └────────┬───────────┘
                                                          │
                                                  base64 string
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  sendAudio()    │
                                                 │  (JSON wrapper) │
                                                 └────────┬────────┘
                                                          │
                                          { message_type: "input_audio_chunk",
                                            audio_base_64: "...",
                                            sample_rate: 16000 }
                                                          │
                                                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     WebSocket (persistent)                           │
│  wss://api.elevenlabs.io/v1/speech-to-text/realtime                  │
│                                                                      │
│  Auth: single-use token (15min expiry)                               │
│  Model: scribe_v2_realtime                                           │
│  Commit strategy: VAD (0.4s silence threshold)                       │
│  Audio format: pcm_16000                                             │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            partial_transcript  committed    session_started
            (interim text)     _transcript   (handshake)
                    │              │
                    ▼              ▼
            ┌────────────────────────-──┐
            │  useRealtimeTranscription │
            │  (orchestrator hook)      │
            └────────────┬────────────-─┘
                         │
                  onCommittedTranscript
                         │
                         ▼
            ┌──────────────────────────┐
            │  useConversationMode     │
            │  safeSendMessage(text)   │
            │  mode: listening →       │
            │        thinking →        │
            │        speaking →        │
            │        listening         │
            └────────────┬─────────────┘
                         │
                  sendMessage(text)
                         │
                         ▼
            ┌──────────────────────────┐
            │  useConversation         │
            │  (@unith-ai/react-native)│
            │  Digital Human backend   │
            └──────────────────────────┘
```

## Hook Dependency Graph

```
index.tsx (HomeScreen)
  ├── useConversationMode     → state machine (mode, safeSendMessage)
  ├── useRealtimeTranscription → audio capture + transcript orchestration
  │     ├── useAudioRecorder  → @siteed/expo-audio-studio (PCM capture)
  │     └── useElevenlabsWebSocket → WebSocket to ElevenLabs STT
  │           └── fetchSingleUseToken → POST /v1/single-use-token
  └── useConversation         → @unith-ai/react-native (digital human)
```

## Data Flow Summary

| Step | Component                               | Data             | Format                           |
| ---- | --------------------------------------- | ---------------- | -------------------------------- |
| 1    | Microphone → expo-audio-studio          | Raw PCM audio    | 16kHz, 16-bit, mono              |
| 2    | onAudioStream callback                  | Audio chunk      | base64 string                    |
| 3    | sendAudio() → WebSocket                 | JSON message     | `{ audio_base_64, sample_rate }` |
| 4    | ElevenLabs → onmessage                  | Transcript event | `{ message_type, text }`         |
| 5    | onCommittedTranscript → safeSendMessage | Final text       | string                           |
| 6    | sendMessage → Unith backend             | User message     | string                           |
| 7    | onSpeakingStart/End                     | Mode transition  | listening/thinking/speaking      |

## Network Connections

| Connection    | Protocol   | Endpoint                                                | Lifecycle                   |
| ------------- | ---------- | ------------------------------------------------------- | --------------------------- |
| Token fetch   | HTTPS POST | `api.elevenlabs.io/v1/single-use-token/realtime_scribe` | Per WS connect              |
| STT stream    | WSS        | `api.elevenlabs.io/v1/speech-to-text/realtime`          | Persistent during recording |
| Digital human | WebView    | Unith AI platform                                       | Session lifetime            |
