# API Reference

## useElevenlabsWebSocket

Manages the WebSocket connection to ElevenLabs realtime STT endpoint.

**File:** `hooks/use-elevenlabs-ws.ts`

### Options

```ts
interface UseElevenlabsWebSocketOptions {
  onCommittedTranscript: (text: string) => void;  // Final transcript after VAD silence
  onPartialTranscript: (text: string) => void;     // Interim transcript as user speaks
  onError?: (error: string) => void;               // WebSocket or API errors
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `connect` | `() => Promise<void>` | Fetches a single-use token and opens the WebSocket |
| `disconnect` | `() => void` | Sends final commit, closes WebSocket, stops reconnection |
| `sendAudio` | `(base64AudioData: string) => void` | Sends a base64-encoded PCM chunk to ElevenLabs |
| `connectionStatus` | `ConnectionStatus` | `"disconnected" \| "connecting" \| "connected" \| "error"` |

### WebSocket Protocol

**Endpoint:** `wss://api.elevenlabs.io/v1/speech-to-text/realtime`

**Query Parameters:**

| Param | Value | Description |
|-------|-------|-------------|
| `token` | Single-use token | 15-minute expiry, fetched via REST API |
| `model_id` | `scribe_v2_realtime` | ElevenLabs realtime STT model |
| `audio_format` | `pcm_16000` | 16kHz 16-bit PCM |
| `commit_strategy` | `vad` | Server-side voice activity detection |
| `vad_silence_threshold_secs` | `0.4` | Silence duration before auto-commit |

**Send Messages:**

```ts
{
  message_type: "input_audio_chunk",
  audio_base_64: string,   // base64-encoded PCM data
  sample_rate: 16000,
  commit: boolean           // true = force commit, false = let VAD decide
}
```

**Receive Messages (discriminated on `message_type`):**

| Type | Key Fields | Description |
|------|------------|-------------|
| `session_started` | `session_id`, `config` | Handshake complete |
| `partial_transcript` | `text` | Interim result while speaking |
| `committed_transcript` | `text` | Final result after silence detected |
| `committed_transcript_with_timestamps` | `text`, `words[]` | Final result with word-level timestamps |
| Error types (13 variants) | `error` | See error handling section |

### Reconnection

On unexpected close, reconnects with exponential backoff:
- Initial delay: 1 second
- Multiplier: 2x
- Max delay: 60 seconds
- Reset on successful connection or manual disconnect
- No reconnection on intentional `disconnect()` call

---

## useRealtimeTranscription

Orchestrates audio capture and WebSocket streaming.

**File:** `hooks/use-realtime-transcription.ts`

### Options

```ts
interface UseRealtimeTranscriptionOptions {
  onCommittedTranscript: (text: string) => void;  // Called with final transcript text
  onPartialTranscript: (text: string) => void;     // Called with interim transcript text
  onError?: (error: string) => void;               // Called on any error
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `initializeMicrophone` | `() => Promise<void>` | Request permissions + connect WebSocket (no recording) |
| `startRecording` | `() => Promise<void>` | Begin audio capture and streaming |
| `stopRecording` | `() => Promise<void>` | Stop recording + disconnect WebSocket |
| `pauseRecording` | `() => Promise<void>` | Pause audio capture (used when AI is speaking) |
| `resumeRecording` | `() => Promise<void>` | Resume audio capture after pause |
| `status` | `TranscriptionStatus` | `"idle" \| "initializing" \| "recording" \| "paused"` |
| `isRecording` | `boolean` | Whether audio is currently being captured |
| `isPaused` | `boolean` | Whether recording is paused |

### Audio Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Sample rate | 16,000 Hz | Required by ElevenLabs `pcm_16000` format |
| Channels | 1 (mono) | |
| Encoding | `pcm_16bit` | 16-bit signed integer |
| Interval | 100ms | Chunk delivery interval |
| File output | Disabled | Streaming only, no file saved |

### Inactivity Timeout

A 10-second timer starts when `startRecording()` is called. If no `partial_transcript` or `committed_transcript` is received within 10 seconds, `onError` fires with "No speech detected for 10 seconds." The timer is cleared on any transcript event, pause, or stop.

---

## useConversationMode

Turn-based conversation state machine.

**File:** `hooks/use-conversation-mode.ts`

### Options

```ts
interface UseConversationModeOptions {
  sendMessage: (text: string) => void;  // Function to send message to backend
  responseTimeoutMs?: number;           // Default: 30000 (30 seconds)
}
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `Mode` | Current mode: `"listening" \| "thinking" \| "speaking" \| "stopping"` |
| `canRecord` | `boolean` | `true` only when `mode === "listening"` |
| `statusMessage` | `string` | Human-readable status: "Listening...", "Thinking...", etc. |
| `safeSendMessage` | `(text: string) => void` | Guarded send — checks mode, sets thinking, starts timeout |
| `onSpeakingStart` | `() => void` | Call when AI starts speaking |
| `onSpeakingEnd` | `() => void` | Call when AI finishes speaking |
| `onError` | `() => void` | Call on backend error — resets to listening |

### safeSendMessage Behavior

1. If `mode !== "listening"` → shows Alert, returns
2. If text is empty → shows Alert, returns
3. Stores text in `lastMessageRef` (for retry)
4. Sets `mode = "thinking"`
5. Calls `sendMessage(text)`
6. Starts 30-second response timeout

### Response Timeout

After 30 seconds without `onSpeakingStart()`:
- Shows Alert with "Cancel" and "Retry" buttons
- Sets mode back to `"listening"`
- "Retry" re-sends `lastMessageRef.current` and restarts timeout

---

## Error Handling Reference

### WebSocket Errors

| Error Type | Source | Handling |
|------------|--------|----------|
| `auth_error` | Invalid/expired token | `onError` callback |
| `quota_exceeded` | API quota limit | `onError` callback |
| `rate_limited` | Too many requests | `onError` callback |
| `input_error` | Invalid audio format | `onError` callback |
| `queue_overflow` | Server overloaded | `onError` callback |
| `chunk_size_exceeded` | Audio chunk too large | `onError` callback |
| `session_time_limit_exceeded` | 90s auto-commit limit | `onError` callback |
| Connection lost | Network failure | Auto-reconnect with backoff |

### Application Errors

| Error | Trigger | User Feedback |
|-------|---------|---------------|
| Mic unavailable | Permission denied | Alert: "Please grant microphone permission" |
| WS connect failed | Network/auth error | Alert: "Failed to connect to transcription service" |
| No speech 10s | Silence after mic enable | Alert: "No speech detected for 10 seconds" |
| Response timeout 30s | AI not responding | Alert with Cancel/Retry options |
| Send while not listening | Mode guard | Alert: "Please wait for assistant to finish" |
