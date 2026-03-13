import { useCallback, useState } from "react";
import {
  useAudioRecorder,
  type RecordingConfig
} from "@siteed/expo-audio-studio";
import { useElevenlabsWebSocket } from "./use-elevenlabs-ws";

type TranscriptionStatus = "idle" | "initializing" | "recording" | "paused";

interface UseRealtimeTranscriptionOptions {
  onCommittedTranscript: (text: string) => void;
  onPartialTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export function useRealtimeTranscription(
  options: UseRealtimeTranscriptionOptions
) {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");

  const recorder = useAudioRecorder();
  const elevenlabsWS = useElevenlabsWebSocket(options);
  const { sendAudio, connect, connectionStatus, disconnect } = elevenlabsWS;

  const getRecordingConfig = useCallback((): RecordingConfig => {
    return {
      sampleRate: 16000,
      channels: 1,
      encoding: "pcm_16bit",
      interval: 100,
      output: { primary: { enabled: false } },
      onAudioStream: async event => {
        // event.data is base64 string on native
        if (typeof event.data === "string") {
          sendAudio(event.data);
        }
      },
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
      },
      android: {
        audioFocusStrategy: "communication"
      }
    };
  }, [sendAudio]);

  const initializeMicrophone = useCallback(async () => {
    setStatus("initializing");

    try {
      // Step 1: Request permissions and prepare recorder
      await recorder.prepareRecording(getRecordingConfig());

      // Step 2: Establish Elevenlabs WebSocket connection
      await connect();
    } catch (error) {
      throw new Error("Failed to initialize microphone: " + error);
    } finally {
      setStatus("idle");
    }
  }, [recorder, getRecordingConfig, connect]);

  const startRecording = useCallback(async () => {
    // Step 0: Check if we're already recording
    if (recorder.isRecording) return;

    try {
      // Step 1: Connect to Elevenlabs WebSocket if not already connected
      if (connectionStatus !== "connected") {
        await connect();
      }

      // Step 2: Start recording audio and streaming to Elevenlabs
      await recorder.startRecording(getRecordingConfig());

      setStatus("recording");
    } catch (error) {
      setStatus("idle");
      throw new Error("Failed to start recording: " + error);
    }
  }, [recorder, getRecordingConfig, connect, connectionStatus]);

  const stopRecording = useCallback(async () => {
    // Step 0: Check if we're actually recording or paused
    if (!recorder.isRecording && !recorder.isPaused) return;

    try {
      // Step 1: Stop recording
      await recorder.stopRecording();

      // Step 2: Close Elevenlabs WebSocket connection
      disconnect();
    } catch (error) {
      throw new Error("Failed to stop recording: " + error);
    } finally {
      setStatus("idle");
    }
  }, [recorder, disconnect]);

  const pauseRecording = useCallback(async () => {
    // Step 0: Check if we're currently recording
    if (!recorder.isRecording) return;

    try {
      // Step 1: Pause recording
      await recorder.pauseRecording();

      // Step 2: Pause Elevenlabs WebSocket stream
      // TODO : do we need this?

      setStatus("paused");
    } catch (error) {
      throw new Error("Failed to pause recording: " + error);
    }
  }, [recorder]);

  const resumeRecording = useCallback(async () => {
    // Step 0: Check if we're currently paused
    if (!recorder.isPaused) return;

    try {
      // Step 1: Resume recording
      await recorder.resumeRecording();

      // Step 2: Resume Elevenlabs WebSocket stream
      // TODO : do we need this?

      setStatus("recording");
    } catch (error) {
      throw new Error("Failed to resume recording: " + error);
    }
  }, [recorder]);

  return {
    initializeMicrophone,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    status,
    isRecording: recorder.isRecording,
    isPaused: recorder.isPaused
  };
}
