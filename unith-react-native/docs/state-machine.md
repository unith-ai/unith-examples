# State Machine: Turn-Based Conversation

## Mode Transitions

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
             ┌────────────┐                                │
             │  LISTENING  │◄──────────────────────┐       │
             │             │                       │       │
             │ canRecord:  │  onSpeakingEnd()      │       │
             │   true      │                       │       │
             └──────┬──────┘                       │       │
                    │                              │       │
          safeSendMessage(text)              onError()     │
          committed_transcript              30s timeout    │
                    │                              │       │
                    ▼                              │       │
             ┌────────────┐                        │       │
             │  THINKING   │────────────────────────┘       │
             │             │                               │
             │ canRecord:  │   30s timeout → Alert         │
             │   false     │   with "Retry" option ────────┘
             └──────┬──────┘        (re-sends last message)
                    │
           onSpeakingStart()
           (AI response begins)
                    │
                    ▼
             ┌────────────┐
             │  SPEAKING   │
             │             │
             │ canRecord:  │
             │   false     │
             │ mic: paused │
             └──────┬──────┘
                    │
           onSpeakingEnd()
           (AI response ends)
                    │
                    ▼
             ┌────────────┐
             │  LISTENING  │  (cycle repeats)
             └────────────┘
```

## State Definitions

| Mode | Description | canRecord | Mic State | UI Input |
|------|-------------|-----------|-----------|----------|
| `listening` | Waiting for user input | `true` | Active (recording) | Enabled |
| `thinking` | Message sent, awaiting AI response | `false` | Active (recording) | Disabled |
| `speaking` | AI is speaking | `false` | Paused | Disabled |
| `stopping` | Session ending | `false` | Stopped | Disabled |

## Transition Triggers

| From | To | Trigger | Action |
|------|-----|---------|--------|
| listening | thinking | `safeSendMessage(text)` | Sends message, starts 30s timeout |
| thinking | speaking | `onSpeakingStart()` | Clears timeout, pauses mic recording |
| speaking | listening | `onSpeakingEnd()` | Resumes mic recording |
| thinking | listening | 30s timeout | Shows retry Alert |
| thinking | listening | `onError()` | Clears timeout, shows error Alert |
| any | listening | Backend error | `onError()` resets to listening |

## Guards

- `safeSendMessage()` rejects with Alert if `mode !== "listening"`
- `safeSendMessage()` rejects with Alert if text is empty
- Mic toggle button disabled when `mode !== "listening"`
- Send button disabled when `mode !== "listening"`
- Text input not editable when `mode !== "listening"`
- Suggestion pills disabled when `mode !== "listening"`

## Timeout & Retry Flow

```
safeSendMessage("hello")
  → mode = "thinking"
  → startResponseTimeout(30s)
  │
  ├─ Happy path: onSpeakingStart() within 30s
  │    → clearTimeout
  │    → mode = "speaking"
  │
  └─ Timeout path: 30s elapsed
       → Alert("Response timed out", [Cancel, Retry])
       → mode = "listening"
       │
       └─ User taps "Retry"
            → mode = "thinking"
            → sendMessage(lastMessageRef.current)
            → startResponseTimeout(30s)  (cycle repeats)
```

## Microphone State During Mode Changes

```
Session starts → initializeMicrophone() (permissions + WS connect)
User taps mic  → startRecording() → mic ON
                                      │
committed_transcript → safeSendMessage → mode: thinking (mic stays recording)
                                      │
onSpeakingStart  → pauseRecording()  → mic PAUSED (AI speaking)
                                      │
onSpeakingEnd    → resumeRecording() → mic RECORDING (back to listening)
                                      │
User taps mic  → stopRecording()     → mic OFF + WS disconnected
Session ends   → stopRecording()     → mic OFF + WS disconnected
```
