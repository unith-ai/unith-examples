import { useCallback, useEffect, useRef, useState } from "react";
import { type WebSocketMessage } from "@elevenlabs/client";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

/**
 * Message sent from client to ElevenLabs realtime STT WebSocket.
 * Audio is base64-encoded inside a JSON wrapper (not raw binary frames).
 */
interface ElevenlabsWSSendMessage {
  message_type: "input_audio_chunk";
  audio_base_64: string;
  commit: boolean;
  sample_rate: number;
  previous_text?: string;
}

interface UseElevenlabsWebSocketOptions {
  onCommittedTranscript: (text: string) => void;
  onPartialTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

/**
 * Union of all possible messages received from the ElevenLabs realtime STT WebSocket.
 *
 * Discriminated on `message_type`. Re-exported from @elevenlabs/client as WebSocketMessage.
 *
 * Transcript messages:
 * - "session_started"                       → { session_id, config }
 * - "partial_transcript"                    → { text }
 * - "committed_transcript"                  → { text }
 * - "committed_transcript_with_timestamps"  → { text, language_code?, words? }
 *
 * Error messages (all have { message_type, error: string }):
 * - "error" | "auth_error" | "quota_exceeded" | "commit_throttled"
 * - "transcriber_error" | "unaccepted_terms" | "rate_limited" | "input_error"
 * - "queue_overflow" | "resource_exhausted" | "session_time_limit_exceeded"
 * - "chunk_size_exceeded" | "insufficient_audio_activity"
 */
type ElevenlabsWSReceiveMessage = WebSocketMessage;

const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime";
const MAX_BACKOFF = 60000; // 1 minute

export function useElevenlabsWebSocket(options: UseElevenlabsWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(1000); // Start with 1 second
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstChunkRef = useRef<boolean>(true);
  const intentionalCloseRef = useRef<boolean>(false);

  const fetchSingleUseToken = useCallback(async (): Promise<string> => {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail?.message || `Failed to get token: ${response.status}`
      );
    }

    const data = await response.json();
    return data.token;
  }, []);

  const connect = useCallback(async () => {
    intentionalCloseRef.current = false;

    // Clean up existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus("connecting");

    const token = await fetchSingleUseToken();

    const params = new URLSearchParams({
      token: token,
      model_id: "scribe_v2_realtime",
      audio_format: "pcm_16000",
      commit_strategy: "vad",
      vad_silence_threshold_secs: "0.4"
    });

    const URL = `${ELEVENLABS_WS_URL}?${params.toString()}`;

    const ws = new WebSocket(URL);

    ws.onopen = () => {
      setConnectionStatus("connected");
      backoffRef.current = 1000; // Reset backoff on successful connection
      isFirstChunkRef.current = true; // Reset for new connection
    };

    ws.onmessage = event => {
      try {
        const message: ElevenlabsWSReceiveMessage = JSON.parse(event.data);

        switch (message.message_type) {
          case "session_started":
            // Connection established, ready to send audio
            break;
          case "partial_transcript":
            if (message.text) {
              options.onPartialTranscript(message.text.trim());
            }
            break;
          case "committed_transcript":
            if (message.text.trim()) {
              options.onCommittedTranscript(message.text.trim());
            }
            break;
          case "committed_transcript_with_timestamps":
            // Received committed transcript along with timestamps and words array
            break;
          default:
            console.log("Received message", message);
            if (message.error) {
              options.onError?.(message.error);
            }
        }
      } catch (error) {
        console.log("Error while parsing JSON data", error);
      }
    };

    ws.onerror = event => {
      setConnectionStatus("error");
    };

    ws.onclose = event => {
      setConnectionStatus("disconnected");

      wsRef.current = null;

      if (intentionalCloseRef.current) return;

      // Reconnection with exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        connect();
      }, backoffRef.current);
    };

    wsRef.current = ws;
  }, [fetchSingleUseToken, options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      try {
        const message: ElevenlabsWSSendMessage = {
          message_type: "input_audio_chunk",
          audio_base_64: "", // Send an empty chunk to signal end of stream
          commit: true,
          sample_rate: 16000
        };
        wsRef.current.send(JSON.stringify(message));
      } finally {
        wsRef.current.close(1000, "Client disconnecting");
        wsRef.current = null;
        intentionalCloseRef.current = true;
      }
    }

    backoffRef.current = 1000; // Reset backoff on manual disconnect
    setConnectionStatus("disconnected");
  }, []);

  const sendAudio = useCallback((base64AudioData: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket is not open. Cannot send audio data.");
      return;
    }

    const message: ElevenlabsWSSendMessage = {
      message_type: "input_audio_chunk",
      audio_base_64: base64AudioData,
      sample_rate: 16000,
      commit: false // TODO: check
    };

    wsRef.current.send(JSON.stringify(message));
    isFirstChunkRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendAudio,
    connectionStatus
  };
}
