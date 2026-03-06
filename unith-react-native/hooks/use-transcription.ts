import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState
} from "expo-audio";

type TranscriptionStatus = "idle" | "recording" | "processing";

interface UseTranscriptionHookOptions {
  /** * Speech-to-text model to use for transcription. Default: "scribe_v2" */
  modelId?: "scribe_v1" | "scribe_v2";
  /** Metering level (dB) below which audio is considered silence. Default: -45 */
  silenceThreshold?: number;
  /** Milliseconds of continuous silence before auto-stopping. Default: 2000 */
  silenceDurationMs?: number;
  /** Called when silence auto-stop triggers with the transcript result. */
  onAutoStop?: (transcript: string) => void;
}

interface UseTranscriptionHookReturnValue {
  startRecording: () => Promise<void>;
  /** Stop recording, transcribe, and return the transcript. */
  stopRecording: () => Promise<string>;
  /** Stop recording immediately without transcribing. */
  cancelRecording: () => Promise<void>;
  /** Pause recording (e.g. while AI is speaking to avoid capturing its audio). */
  pauseRecording: () => void;
  /** Resume a paused recording. */
  resumeRecording: () => void;
  status: TranscriptionStatus;
  isRecording: boolean;
}

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true
};

/**
 * A React hook for voice recording and transcription with automatic silence detection.
 *
 * This hook manages the complete lifecycle of audio recording using the Expo Audio API,
 * automatically detects silence and stops recording when configured, and transcribes
 * the recorded audio using ElevenLabs Speech-to-Text API.
 *
 * Features:
 * - Start/stop/cancel/pause/resume recording controls
 * - Automatic silence detection with configurable thresholds
 * - Audio metering for detecting sound levels
 * - Transcription of recorded audio via ElevenLabs
 * - Callback triggered when auto-stop occurs due to silence
 *
 * @param options Configuration options for the transcription hook
 * @param options.modelId - ElevenLabs STT model to use (default: "scribe_v2")
 * @param options.silenceThreshold - Metering level (dB) below which audio is considered silence (default: -45)
 * @param options.silenceDurationMs - Milliseconds of continuous silence before auto-stopping (default: 2000)
 * @param options.onAutoStop - Callback invoked when silence auto-stop triggers, receives the transcript text
 *
 * @returns Object containing recording control functions and status
 * @returns startRecording - Async function to start recording with permissions
 * @returns stopRecording - Async function to stop recording and transcribe audio
 * @returns cancelRecording - Async function to stop recording without transcribing
 * @returns pauseRecording - Function to pause an active recording
 * @returns resumeRecording - Function to resume a paused recording
 * @returns status - Current recording status: "idle" | "recording" | "processing"
 * @returns isRecording - Boolean indicating if audio is currently being recorded
 *
 * @example
 * const { startRecording, stopRecording, status, isRecording } = useTranscription({
 *   modelId: "scribe_v1", // optional, defaults to "scribe_v2"
 *   silenceThreshold: -40, // defaults to -45 dB
 *   silenceDurationMs: 3000, // defaults to 2000 ms
 *   onAutoStop: (transcript) => console.log("Auto-stopped with:", transcript)
 * });
 *
 * await startRecording();
 * const transcript = await stopRecording();
 */
export function useTranscription(
  options: UseTranscriptionHookOptions
): UseTranscriptionHookReturnValue {
  const {
    modelId = "scribe_v2",
    silenceThreshold = -45,
    silenceDurationMs = 2000,
    onAutoStop
  } = options;

  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");

  // Track silence for auto-stop
  const silenceStartRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  // Stable refs for values used in the silence-detection effect
  const silenceThresholdRef = useRef(silenceThreshold);
  silenceThresholdRef.current = silenceThreshold;
  const silenceDurationMsRef = useRef(silenceDurationMs);
  silenceDurationMsRef.current = silenceDurationMs;
  const onAutoStopRef = useRef(onAutoStop);
  onAutoStopRef.current = onAutoStop;

  // We need a ref to stopRecording for the auto-silence effect
  const stopRecordingRef = useRef<(() => Promise<string>) | null>(null);

  const startRecording = useCallback(async (): Promise<void> => {
    // Step 1: Request permissions and prepare recorder
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Microphone permission denied");
    }

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true
    });

    // Step 2: Start recording
    await recorder.prepareToRecordAsync();
    recorder.record();
    isRecordingRef.current = true;
    silenceStartRef.current = null;
    // Step 3: Update status
    setStatus("recording");
  }, [recorder]);

  const stopRecording = useCallback(async (): Promise<string> => {
    // Step 0: Check if we're actually recording
    if (!isRecordingRef.current) {
      throw new Error("Not currently recording");
    }

    // Step 1: Stop recording and get URI
    await recorder.stop();
    isRecordingRef.current = false;
    setStatus("processing");

    const uri = recorder.uri;
    if (!uri) {
      setStatus("idle");
      throw new Error("No recording URI available");
    }

    // Step 2: Send to ElevenLabs for transcription
    try {
      const transcript = await transcribe(uri, { modelId });
      setStatus("idle");
      return transcript;
    } catch (err) {
      setStatus("idle");
      throw err;
    }
  }, [recorder, modelId]);

  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!isRecordingRef.current) return;
    await recorder.stop();
    isRecordingRef.current = false;
    silenceStartRef.current = null;
    setStatus("idle");
  }, [recorder]);

  const pauseRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    recorder.pause();
    silenceStartRef.current = null;
  }, [recorder]);

  const resumeRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    recorder.record();
    silenceStartRef.current = null;
  }, [recorder]);

  // Keep stopRecording ref in sync
  stopRecordingRef.current = stopRecording;

  // Silence detection: watch metering while recording
  useEffect(() => {
    if (!recorderState.isRecording || !isRecordingRef.current) {
      silenceStartRef.current = null;
      return;
    }

    const metering = recorderState.metering ?? -160;

    if (metering < silenceThresholdRef.current) {
      if (silenceStartRef.current === null) {
        silenceStartRef.current = Date.now();
      } else if (
        Date.now() - silenceStartRef.current >=
        silenceDurationMsRef.current
      ) {
        // Silence lasted long enough — auto-stop
        silenceStartRef.current = null;
        stopRecordingRef.current?.().then(transcript => {
          onAutoStopRef.current?.(transcript);
        });
      }
    } else {
      silenceStartRef.current = null;
    }
  }, [recorderState.metering, recorderState.isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        recorder.stop().catch(() => {});
      }
    };
  }, [recorder]);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    pauseRecording,
    resumeRecording,
    status,
    isRecording: recorderState.isRecording
  };
}

/** Send recorded audio to ElevenLabs STT and return the transcript text. */
async function transcribe(
  uri: string,
  opts: { modelId?: "scribe_v1" | "scribe_v2" }
) {
  // Step 1: Create multipart form data with the audio file and model ID
  const form = new FormData();
  form.append("file", {
    uri,
    name: "recording.m4a",
    type: "audio/m4a"
  } as any);
  form.append("model_id", opts.modelId || "scribe_v2");

  // Step 2: Call ElevenLabs STT API
  const endpoint =
    "https://api.elevenlabs.io/v1/speech-to-text?enable_logging=true";

  // ! TO FIX - create a backend proxy endpoint and store the API key securely on the server instead of exposing it in the client app
  const headers: Record<string, string> = {};
  headers["xi-api-key"] = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: form
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Transcription failed: ${resp.status} ${body}`);
    }

    const json = await resp.json();
    return json.text ?? json.transcript ?? "";
  } catch (error) {
    console.log("Transcription error:", error);

    throw new Error("Transcription failed");
  }
}
