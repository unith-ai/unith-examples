# iOS Audio Session Configuration

## Problem

When a React Native app activates the microphone on iOS, the system defaults to routing audio output through the earpiece (receiver) instead of the speaker. This causes the digital human's voice to become inaudible during a conversation.

## Solution

Configure the `AVAudioSession` via `@siteed/expo-audio-studio`'s recording config to maintain speaker output while the microphone is active.

## Configuration

```ts
// In use-realtime-transcription.ts → getRecordingConfig()
ios: {
  audioSession: {
    category: "PlayAndRecord",
    mode: "Default",
    categoryOptions: [
      "DefaultToSpeaker",
      "AllowBluetooth",
      "AllowBluetoothA2DP"
    ]
  }
}
```

## Settings Explained

### Category: `PlayAndRecord`

Maps to `AVAudioSession.Category.playAndRecord`. This is the only category that allows simultaneous audio input (microphone) and output (speaker/headphones). Other categories like `playback` or `record` only support one direction.

### Mode: `Default`

Maps to `AVAudioSession.Mode.default`. Using `Default` instead of `VoiceChat` is intentional:

| Mode | Behavior | Why not |
|------|----------|---------|
| `Default` | No special processing | Correct for our use case |
| `VoiceChat` | Enables echo cancellation, AGC, routes to earpiece | Would force earpiece routing |
| `VideoChat` | Similar to VoiceChat + camera hints | Not applicable |
| `Measurement` | Disables all processing | Would affect audio quality |

### Category Options

| Option | AVAudioSession Equivalent | Purpose |
|--------|--------------------------|---------|
| `DefaultToSpeaker` | `.defaultToSpeaker` | Routes audio output to the speaker instead of earpiece when no other output route (headphones, Bluetooth) is connected |
| `AllowBluetooth` | `.allowBluetooth` | Allows audio input/output via Bluetooth HFP devices (AirPods mic, Bluetooth headsets) |
| `AllowBluetoothA2DP` | `.allowBluetoothA2DP` | Allows high-quality Bluetooth audio output via A2DP profile (AirPods speakers, Bluetooth speakers) |

## Audio Routing Behavior

### With speaker (no peripherals)

```
Mic activates → PlayAndRecord + DefaultToSpeaker
  → Input: Built-in microphone
  → Output: Built-in speaker (NOT earpiece)
```

### With wired headphones

```
Mic activates → PlayAndRecord + DefaultToSpeaker
  → Input: Headphone microphone (if available) or built-in mic
  → Output: Headphone speakers
  → DefaultToSpeaker has no effect (headphones take priority)
```

### With AirPods / Bluetooth

```
Mic activates → PlayAndRecord + AllowBluetooth + AllowBluetoothA2DP
  → Input: AirPods microphone (via HFP)
  → Output: AirPods speakers (via A2DP when not using mic, HFP when using mic)
```

**Note:** When Bluetooth is used for both input and output, iOS may switch from A2DP (high quality, output only) to HFP (lower quality, bidirectional). This is an iOS system limitation and results in slightly lower audio quality through Bluetooth during active recording.

## How It's Applied

The `@siteed/expo-audio-studio` library reads the `ios.audioSession` config and calls the native iOS APIs:

```swift
// What expo-audio-studio does internally:
let session = AVAudioSession.sharedInstance()
try session.setCategory(
  .playAndRecord,
  mode: .default,
  options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
)
try session.setActive(true)
```

This is set when `prepareRecording()` or `startRecording()` is called, and remains active for the duration of the recording session.

## Lifecycle

```
initializeMicrophone()
  → prepareRecording(config)
  → AVAudioSession configured with PlayAndRecord + DefaultToSpeaker
  → Microphone permissions requested
  → Audio session active (speaker route maintained)

startRecording()
  → Recording begins
  → Audio session already configured (no routing change)

pauseRecording()  (when AI is speaking)
  → Recording paused
  → Audio session stays active (speaker continues working)

resumeRecording() (when AI finishes)
  → Recording resumes
  → No audio routing change

stopRecording()
  → Recording stops
  → Audio session deactivated
```

## Testing Checklist

- [ ] Start session → enable mic → AI speaks → verify audio comes from speaker (not earpiece)
- [ ] Connect AirPods → start session → enable mic → verify audio routes to AirPods
- [ ] Connect wired headphones → start session → enable mic → verify audio routes to headphones
- [ ] Enable mic → AI speaks → AI finishes → verify mic resumes without audio routing change
- [ ] Play background music → start session → verify music doesn't interfere (or gracefully ducks)
