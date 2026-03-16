# Testing Report

## Test Environment

| Field | Value |
|-------|-------|
| Date | |
| iOS Version | |
| Android Version | |
| Device(s) | |
| App Version | |
| ElevenLabs Model | scribe_v2_realtime |

---

## 1. Speech Recognition Latency

**Requirement:** Transcription latency ≤500ms from speech end to display.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Short phrase | Say "Hello world", measure time from silence to committed_transcript | ≤500ms | | |
| Long sentence | Say a 10+ word sentence, measure latency | ≤500ms | | |
| Rapid speech | Speak quickly without pauses | Partial transcripts appear in real-time | | |
| Whispered speech | Whisper a phrase | Transcript appears (may be delayed) | | |

**How to measure:** Add `console.log(Date.now())` in `onAudioStream` (last chunk) and `onCommittedTranscript`. Difference = end-to-end latency.

---

## 2. Audio Routing (iOS)

**Requirement:** No audio routing change when mic activates. Speaker remains active.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Speaker output | Start session → enable mic → AI speaks | Audio from speaker, NOT earpiece | | |
| AirPods | Connect AirPods → start session → enable mic → AI speaks | Audio from AirPods | | |
| Wired headphones | Connect headphones → start session → enable mic | Audio from headphones | | |
| Speaker after pause/resume | AI speaks → pauses mic → resumes → AI speaks again | Speaker stays active | | |
| Hot-swap Bluetooth | Start with speaker → connect AirPods mid-session | Audio routes to AirPods | | |

---

## 3. Turn-Based Constraint

**Requirement:** No concurrent messages. Mode strictly enforced.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Send while thinking | Send message → immediately tap send again | Alert: "Please wait for assistant" | | |
| Send while speaking | While AI is speaking, tap send | Alert: "Please wait for assistant" | | |
| Type while speaking | While AI is speaking, try typing | TextInput not editable | | |
| Suggestion while speaking | While AI is speaking, tap suggestion | Suggestion pill disabled | | |
| Mode pill accuracy | Observe mode pill during full cycle | listening → thinking → speaking → listening | | |

---

## 4. WebSocket Reconnection

**Requirement:** Auto-reconnect with exponential backoff after disconnect.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Network drop | Enable airplane mode briefly → disable | WS reconnects, recording resumes | | |
| Server disconnect | Wait for server to close connection | Auto-reconnect with backoff | | |
| Intentional disconnect | Tap "Disable Microphone" | No reconnection attempt | | |
| Multiple reconnects | Drop network 3 times | Backoff increases: ~1s, ~2s, ~4s | | |
| Backoff reset | Reconnect successfully → drop again | Backoff resets to 1s | | |

---

## 5. UI State Matches Mode

**Requirement:** All UI elements reflect current mode correctly.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Listening state | Mode = listening | Mic button enabled, send enabled, input editable | | |
| Thinking state | Send a message | Mic disabled, send disabled, input not editable, pill shows "thinking" | | |
| Speaking state | AI starts responding | Mic disabled, send disabled, pill shows "speaking" | | |
| Status message | Observe status pill through cycle | "Listening..." → "Thinking..." → "Speaking..." → "Listening..." | | |
| Mic status pill | Toggle mic on/off | OFF (slate) → PROCESSING (amber) → ON (green) → OFF (slate) | | |

---

## 6. Peripheral Audio Devices

**Requirement:** Works with speaker, headphones, and AirPods.

| Test | Device | Mic Input | Audio Output | Result | Pass? |
|------|--------|-----------|-------------|--------|-------|
| Built-in | iPhone speaker | Built-in mic | Speaker | | |
| AirPods | AirPods | AirPods mic | AirPods | | |
| AirPods Pro | AirPods Pro | AirPods Pro mic | AirPods Pro | | |
| Wired EarPods | EarPods | EarPods mic | EarPods | | |
| Bluetooth speaker | BT speaker (no mic) | Built-in mic | BT speaker | | |

---

## 7. Rapid Mic Button Taps

**Requirement:** Handle rapid taps gracefully, no crashes or duplicate recordings.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| Double tap ON | Tap mic button twice rapidly | Only one recording starts | | |
| Tap during PROCESSING | Tap while mic shows "Loading..." | No effect (button disabled or no-op) | | |
| ON → OFF rapid | Enable then immediately disable mic | Clean stop, no orphan WS | | |
| Toggle 10x | Toggle mic on/off 10 times quickly | No crash, final state consistent | | |

---

## 8. Network Timeouts

**Requirement:** Handle all timeout scenarios gracefully.

| Test | Steps | Expected | Result | Pass? |
|------|-------|----------|--------|-------|
| No speech 10s | Enable mic, stay silent for 10s | Alert: "No speech detected" | | |
| Response timeout 30s | Send message, backend doesn't respond | Alert with Cancel/Retry | | |
| Retry after timeout | Tap "Retry" on timeout alert | Message re-sent, new 30s timer | | |
| Cancel after timeout | Tap "Cancel" on timeout alert | Mode resets to listening | | |
| Token fetch failure | Invalid API key | Error alert shown | | |

---

## 9. Platform Compatibility

**Requirement:** iOS 13+ and Android 8+.

| Platform | Version | Device | Build | Runtime | Pass? |
|----------|---------|--------|-------|---------|-------|
| iOS 13 | | | | | |
| iOS 16 | | | | | |
| iOS 17 | | | | | |
| iOS 18 | | | | | |
| Android 8 (API 26) | | | | | |
| Android 12 (API 31) | | | | | |
| Android 14 (API 34) | | | | | |

---

## Performance Metrics

Fill in after device testing.

| Metric | Value | Target | Pass? |
|--------|-------|--------|-------|
| Speech-to-transcript latency | | ≤500ms | |
| Audio chunk size (per 100ms) | | ~3.2KB (16kHz × 16-bit × 100ms) | |
| WebSocket bandwidth (sending) | | ~32KB/s | |
| Memory usage (idle) | | | |
| Memory usage (recording) | | | |
| CPU usage (recording) | | <15% | |
| Battery drain (10min session) | | | |

---

## Issues Found

| # | Severity | Description | Steps to Reproduce | Status |
|---|----------|-------------|-------------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Sign-Off

| Role | Name | Date | Approved? |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
