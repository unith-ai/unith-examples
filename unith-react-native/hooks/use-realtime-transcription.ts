import { useCallback, useState, useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
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
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const recorder = useAudioRecorder();
  const elevenlabsWS = useElevenlabsWebSocket({
    onCommittedTranscript: text => {
      // Clear inactivity timer — user spoke successfully
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      options.onCommittedTranscript(text);
    },
    onPartialTranscript: text => {
      // Also clear on partial — speech is being detected
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      options.onPartialTranscript(text);
    },
    onError: options.onError
  });

  const { sendAudio, connect, connectionStatus, disconnect } = elevenlabsWS;
  const { onError } = options;

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

    // On Android, explicitly request RECORD_AUDIO runtime permission
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          message:
            "This app needs access to your microphone for speech recognition.",
          buttonPositive: "Grant",
          buttonNegative: "Deny"
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus("idle");
        throw new Error(
          "Microphone permission denied. Please grant it in Settings."
        );
      }
    }

    try {
      // Step 1: Request permissions and prepare recorder
      await recorder.prepareRecording(getRecordingConfig());
    } catch (error) {
      setStatus("idle");
      console.error("Initialize microphone error: ", error);
      throw new Error(
        "Microphone unavailable. Please grant microphone permission in Settings."
      );
    }

    try {
      // Step 2: Establish Elevenlabs WebSocket connection
      await connect();
    } catch (error) {
      setStatus("idle");
      throw new Error("Failed to connect to transcription service: " + error);
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

      inactivityTimeoutRef.current = setTimeout(() => {
        onError?.("No speech detected for 10 seconds. Please try again.");
      }, 10000);
    } catch (error) {
      setStatus("idle");
      throw new Error("Failed to start recording: " + error);
    }
  }, [recorder, getRecordingConfig, connect, connectionStatus, onError]);

  const stopRecording = useCallback(async () => {
    // Step 0: Check if we're actually recording or paused
    if (!recorder.isRecording && !recorder.isPaused) return;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

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

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

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
