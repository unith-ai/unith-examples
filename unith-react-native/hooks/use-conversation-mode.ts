import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Mode } from "@unith-ai/react-native";

interface UseConversationModeOptions {
  sendMessage: (text: string) => void;
  responseTimeoutMs?: number;
}

const STATUS_MESSAGES: Record<Mode, string> = {
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  stopping: "Stopping...",
};

export function useConversationMode(options: UseConversationModeOptions) {
  const { sendMessage, responseTimeoutMs = 30000 } = options;
  const [mode, setMode] = useState<Mode>("listening");
  const modeRef = useRef<Mode>("listening");
  const timeoutRef = useRef<number | null>(null);
  const lastMessageRef = useRef<string>("");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const canRecord: boolean = useMemo(() => mode === "listening", [mode]);
  const statusMessage = STATUS_MESSAGES[mode];

  const clearResponseTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startResponseTimeout = useCallback(() => {
    clearResponseTimeout();

    timeoutRef.current = setTimeout(() => {
      console.error(
        "Response timed out. The assistant took too long to respond. Please try again.",
      ); 

      setMode("listening");
    }, responseTimeoutMs);
  }, [responseTimeoutMs, clearResponseTimeout]);

  const safeSendMessage = useCallback(
    (text: string) => {
      if (modeRef.current !== "listening") {
        console.warn(
          "Cannot send message. Please wait for the assistant to finish responding before sending another message.",
        );
        return;
      }

      if (!text.trim()) {
        console.warn(
          "Cannot send empty message. Please enter a message before sending.",
        );
        return;
      }
      modeRef.current = "thinking";
      lastMessageRef.current = text;
      setMode("thinking");
      sendMessage(text);
      startResponseTimeout();
    },
    [startResponseTimeout, sendMessage],
  );

  const onSpeakingStart = useCallback(() => {
    clearResponseTimeout();
    setMode("speaking");
  }, [clearResponseTimeout]);

  const onSpeakingEnd = useCallback(() => {
    clearResponseTimeout();
    setMode("listening");
  }, [clearResponseTimeout]);

  const onError = useCallback(() => {
    clearResponseTimeout();
    setMode("listening");
  }, [clearResponseTimeout]);

  useEffect(() => {
    return () => clearResponseTimeout();
  }, [clearResponseTimeout]);

  return {
    mode,
    canRecord,
    statusMessage,
    safeSendMessage,
    onSpeakingStart,
    onSpeakingEnd,
    onError,
  };
}
